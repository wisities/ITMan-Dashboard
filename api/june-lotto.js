export default async function handler(req, res) {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec';
  try {
    const r = await fetch(`${GAS_URL}?page=june_lotto&format=json`);
    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}