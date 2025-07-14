// api/proxy.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Only POST allowed');
    return;
  }
  try {
    // Forward the request to your Google Apps Script endpoint
    const googleResp = await fetch(
      'https://script.google.com/macros/s/AKfycbxIb3-J4n4Kt1sXBxcttdgcyQFSq7EZF_2eZ7H0r3ktRSXKSfkyRtWW7mr_DapkVh3nRA/exec',
      {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const result = await googleResp.text(); // or .json()
    res.status(200).send(result);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
}
