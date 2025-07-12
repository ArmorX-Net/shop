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
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('order-section').style.display = 'block';
    addWindowEntry();
  }
});

function login() {
  let phone = document.getElementById('retailer-phone').value.trim();
  if (!/^\d{10}$/.test(phone)) { alert('Enter valid 10-digit mobile.'); return; }
  localStorage.setItem('retailUser', phone);
  loggedRetailer = phone;
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('order-section').style.display = 'block';
  addWindowEntry();
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
    <div class="price-link">
      <span class="price-label">Deal Price: ₹<span class="price-value" id="p${idx}">0</span></span>
      <a id="a${idx}" href="#" class="amz-link" target="_blank" style="display:none;">Amazon</a>
    </div>
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
  if (best) {
    let dealPrice = (best['Deal Price'] || best['Selling Price'] || 0) * qty;
    document.getElementById('p' + idx).innerText = dealPrice;
    let a = document.getElementById('a' + idx);
    a.href = best['Amazon Link'];
    a.style.display = '';
  } else {
    document.getElementById('p' + idx).innerText = '0';
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
  if (!name || !/^\d{10}$/.test(phone)) { alert('Enter customer details correctly!'); return; }
  let msg = `ArmorX Order (Retailer: ${loggedRetailer})\nCustomer: ${name} (${phone})\nDelivery: ${delivery}\n\nWindows:\n`;
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
      msg += `#${i+1}: ${h}x${w} ${u} | ${colorName} | Qty: ${qty} | ₹${price}\n`;
      total += parseFloat(price);
      hasAny = true;
    }
  });
  if (!hasAny) { alert('Please enter at least one window net details.'); return; }
  msg += `\nTotal: ₹${total}`;
  let url = `https://wa.me/917304692553?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}
