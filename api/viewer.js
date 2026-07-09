export default async function handler(req, res) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec';
  const { month, code = '', prov = '', action = 'search' } = req.query;

  if (!month) {
    return res.status(400).json({ success: false, message: 'ต้องระบุ month' });
  }

  const url = `${GAS_URL}?page=viewer&format=json&action=${encodeURIComponent(action)}` +
              `&month=${encodeURIComponent(month)}&code=${encodeURIComponent(code)}&prov=${encodeURIComponent(prov)}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}