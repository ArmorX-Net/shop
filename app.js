let windowCount = 0;
let netSizes = [];
let loggedRetailer = null;

document.addEventListener("DOMContentLoaded", () => {
  fetch('MQ_Sizes_Unit_Color_and_Links.json')
    .then(r => r.json())
    .then(data => { netSizes = data; })
    .catch(e => alert("Could not load net size database!"));

  if (localStorage.getItem('retailUser')) {
    loggedRetailer = localStorage.getItem('retailUser');
    showAfterLogin();
    addWindowEntry();
  }
});

function login() {
  let phone = document.getElementById('retailer-phone').value.trim();
  if (!/^\d{10}$/.test(phone)) { alert('Enter valid 10-digit mobile.'); return; }
  localStorage.setItem('retailUser', phone);
  loggedRetailer = phone;
  showAfterLogin();
  addWindowEntry();
}

function showAfterLogin() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('order-section').style.display = 'block';
  document.getElementById('main-title').style.display = 'block';
  document.getElementById('app-title').style.display = 'none';
}

function handleDeliveryChange() {
  const val = document.getElementById('delivery-mode').value;
  const addr = document.getElementById('cust-address');
  if (val === "Home Delivery") {
    addr.style.display = "";
    addr.required = true;
  } else {
    addr.style.display = "none";
    addr.value = "";
    addr.required = false;
  }
}

function addWindowEntry() {
  const idx = ++windowCount;
  const wBox = document.createElement('div');
  wBox.className = 'window-box';
  wBox.id = 'window-box-' + idx;
  wBox.innerHTML = `
    <button class="remove-btn" onclick="removeWindowEntry(${idx})" title="Remove">×</button>
    <div class="details-row">
      <input type="number" min="1" id="h${idx}" placeholder="Height" oninput="calcPrice(${idx})"/>
      <input type="number" min="1" id="w${idx}" placeholder="Width" oninput="calcPrice(${idx})"/>
    </div>
    <div class="details-row">
      <select id="u${idx}" onchange="calcPrice(${idx})">
        <option value="Cm">cm</option>
        <option value="Inch">in</option>
        <option value="Feet">ft</option>
      </select>
      <select id="c${idx}" onchange="calcPrice(${idx})">
        <option value="BK">Black</option>
        <option value="CR">Cream</option>
        <option value="GR">Grey</option>
        <option value="WH">White</option>
      </select>
      <input type="number" min="1" value="1" id="qty${idx}" placeholder="Qty" oninput="calcPrice(${idx})"/>
    </div>
    <div class="price-link" id="priceblock${idx}">
      <span class="price-label">Deal Price: ₹<span class="price-value" id="p${idx}">0</span></span>
    </div>
    <a id="a${idx}" href="#" class="amz-link" target="_blank" style="display:none;">Amazon</a>
  `;
  document.getElementById('windows-list').appendChild(wBox);
}

function removeWindowEntry(idx) {
  const box = document.getElementById('window-box-' + idx);
  if (box) box.remove();
  updateTotal();
}

function calcPrice(idx) {
  let h = parseFloat(document.getElementById('h' + idx).value || 0);
  let w = parseFloat(document.getElementById('w' + idx).value || 0);
  let u = document.getElementById('u' + idx).value;
  let c = document.getElementById('c' + idx).value;
  let qty = parseInt(document.getElementById('qty' + idx).value || 1);

  if (!h || !w || !qty) {
    document.getElementById('p' + idx).innerText = '0';
    document.getElementById('a' + idx).style.display = 'none';
    updateTotal();
    return;
  }

  // Convert all entered values to cm for searching
  let h_cm = u === "Cm" ? h : (u === "Inch" ? h * 2.54 : h * 30.48);
  let w_cm = u === "Cm" ? w : (u === "Inch" ? w * 2.54 : w * 30.48);

  let best = findClosestSize(h_cm, w_cm, c);
  let priceblock = document.getElementById('priceblock' + idx);
  if (best) {
    let dealPrice = (best['Deal Price'] || 0);
    let totalPrice = dealPrice * qty;
    document.getElementById('p' + idx).innerText = totalPrice;

    // Show per unit + total if qty > 1
    let html = '';
    if (qty > 1) {
      html += `<span class="per-unit">Per Net: ₹${dealPrice}</span> `;
    }
    html += `<span class="deal-break">Deal Price: ₹<span class="price-value">${totalPrice}</span></span>`;
    priceblock.innerHTML = html;

    // Add Amazon link
    let a = document.getElementById('a' + idx);
    a.href = best['Amazon Link'];
    a.style.display = '';
  } else {
    document.getElementById('p' + idx).innerText = '0';
    priceblock.innerHTML = '<span class="deal-break">Deal Price: ₹<span class="price-value">0</span></span>';
    document.getElementById('a' + idx).style.display = 'none';
  }
  updateTotal();
}

function findClosestSize(h_cm, w_cm, c) {
  // Find available net in cm, same color, minimize abs diff (height+width)
  let filtered = netSizes.filter(x => x.Color === c && x.Unit === "Cm");
  if (filtered.length === 0) return null;
  let best = filtered[0],
      bestDist = Math.abs(filtered[0]['Height(H)'] - h_cm) + Math.abs(filtered[0]['Width(W)'] - w_cm);
  for (let item of filtered) {
    let dist = Math.abs(item['Height(H)'] - h_cm) + Math.abs(item['Width(W)'] - w_cm);
    if (dist < bestDist) { best = item; bestDist = dist; }
  }
  return best;
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('[id^=p]').forEach(span => {
    total += parseFloat(span.innerText || 0);
  });
  document.getElementById('total-price').innerText = total;
}

function sendOnWhatsApp() {
  let name = document.getElementById('cust-name').value.trim();
  let phone = document.getElementById('cust-phone').value.trim();
  let delivery = document.getElementById('delivery-mode').value;
  let address = '';
  if (!name || !/^\d{10}$/.test(phone)) { alert('Enter customer details correctly!'); return; }
  if (delivery === "Home Delivery") {
    address = document.getElementById('cust-address').value.trim();
    if (!address) { alert('Please enter customer address for Home Delivery.'); return; }
  }
  let msg = `ArmorX Order (Retailer: ${loggedRetailer})\nCustomer: ${name} (${phone})\nDelivery: ${delivery}`;
  if (address) msg += `\nAddress: ${address}`;
  msg += `\n\nWindows:\n`;
  let total = 0;
  let hasAny = false;
  document.querySelectorAll('.window-box').forEach((box, i) => {
    let idx = box.id.split('-')[2];
    let h = document.getElementById('h'+idx).value;
    let w = document.getElementById('w'+idx).value;
    let u = document.getElementById('u'+idx).value;
    let c = document.getElementById('c'+idx).value;
    let qty = document.getElementById('qty'+idx).value;
    let price = document.getElementById('p'+idx).innerText;
    let colorName = { BK: 'Black', CR: 'Cream', GR: 'Grey', WH: 'White' }[c] || c;
    if (h && w && price && qty > 0) {
      let perNet = parseInt(price)/parseInt(qty);
      let priceStr = qty > 1
        ? `Per Net: ₹${perNet} | Deal Price: ₹${price}`
        : `Deal Price: ₹${price}`;
      msg += `#${i+1}: ${h}x${w} ${u} | ${colorName} | Qty: ${qty} | ${priceStr}\n`;
      total += parseFloat(price);
      hasAny = true;
    }
  });
  if (!hasAny) { alert('Please enter at least one window net details.'); return; }
  msg += `\nTotal: ₹${total}`;
  let url = `https://wa.me/917304692553?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
