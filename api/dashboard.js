// /api/dashboard
//
// Serverless function (Node.js runtime) that Vercel deploys automatically
// from anything inside the /api folder.
//
// Purpose: fetch the JSON data from the Google Apps Script Web App
// *server-side*, so the browser never has to talk to script.google.com
// directly (which avoids CORS problems entirely).
//
// Required setup on Vercel:
//   Project Settings > Environment Variables > add
//     APPS_SCRIPT_URL = https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec
//   (same base URL already used for the tab1/tab3/tab4 iframes, without any ?page=... on it)

export default async function handler(req, res) {
  const baseUrl = process.env.APPS_SCRIPT_URL;

  if (!baseUrl) {
    res.status(500).json({
      error: "ยังไม่ได้ตั้งค่า APPS_SCRIPT_URL ใน Environment Variables ของ Vercel"
    });
    return;
  }

  try {
    const url = `${baseUrl}?page=api&action=getDashboardData`;
    const upstream = await fetch(url, { method: 'GET', redirect: 'follow' });

    const rawText = await upstream.text();

    if (!upstream.ok) {
      res.status(502).json({
        error: `Apps Script ตอบกลับผิดพลาด (HTTP ${upstream.status})`,
        preview: rawText.slice(0, 300)
      });
      return;
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      // ไม่ใช่ JSON — น่าจะเป็นหน้า HTML ของ Google (login / consent / error page)
      // ส่งตัวอย่างเนื้อหากลับไปเพื่อวินิจฉัยสาเหตุที่แท้จริง
      res.status(502).json({
        error: "Apps Script ไม่ได้คืนค่าเป็น JSON (อาจติดหน้า login/consent ของ Google)",
        preview: rawText.slice(0, 300)
      });
      return;
    }

    // cache สั้นๆ ที่ edge เพื่อลดการยิงไป Apps Script ถี่เกินไป (ปรับได้ตามต้องการ)
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({
      error: "เรียกข้อมูลจาก Apps Script ไม่สำเร็จ",
      detail: String(err && err.message ? err.message : err)
    });
  }
}
