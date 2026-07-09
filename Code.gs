/**
 * ============================================================
 * IT Man Dashboard - Backend (Google Apps Script)
 * เสิร์ฟหน้าเว็บ (โหมดเดิม) + ให้บริการ JSON API สำหรับเว็บภายนอกบน Vercel
 * ============================================================
 *
 * มีการเปลี่ยนแปลงจากไฟล์เดิม:
 *  - doGet(e) ตอนนี้รับ query string แล้ว ถ้ามี ?page=api&action=getDashboardData
 *    จะคืนค่าเป็น JSON แทนที่จะคืนหน้า HTML เหมือนเดิม
 *  - เพิ่มฟังก์ชัน handleApiRequest() เป็นตัวจัดการ route ของ API
 *  - ฟังก์ชัน getDashboardData() ไม่ได้ถูกแก้ไขเลย (โครงสร้างข้อมูลเหมือนเดิมทุกประการ)
 *
 * วิธี deploy หลังแก้ไข:
 *  1. บันทึกไฟล์นี้ทับ Code.gs เดิมใน Apps Script editor
 *  2. Deploy > Manage deployments > แก้ไข deployment เดิม (เวอร์ชันใหม่) แล้ว Deploy
 *     (สำคัญ: ต้อง deploy "New version" ไม่งั้น /exec URL จะยังใช้โค้ดเก่าอยู่)
 *  3. ทดสอบเปิดลิงก์นี้ในเบราว์เซอร์เพื่อเช็คว่าได้ JSON กลับมา:
 *     https://script.google.com/macros/s/AKfycbwLy37e2OKv1nRdEPFuIfbmJyOxs3ZTSIZ7fBJ1KYtJfTkn0gmlBVee89zLTcIRuJt1/exec?page=api&action=getDashboardData
 */

const CONFIG = {
  SHEET_NAME: "สถานะการแก้ไขงานงวด",

  COL_CODE: 0,      // A : รหัสอำเภอ
  COL_NAME: 2,      // C : ชื่ออำเภอ
  COL_PROVINCE: 3,  // D : จังหวัด

  SUB_START: 10,    // K : สถานะการส่งงาน งวดแรก (K..V = 12 งวด)
  EVAL_START: 23,   // X : ผลการพิจารณา สดช. งวดแรก (X..AI = 12 งวด, มี W คั่น)

  PERIOD_COUNT: 12, // จำนวนงวดทั้งหมด (งวดที่ 12 = รอบพิเศษ)

  // แถว 880 เป็นต้นไป = อำเภอที่เข้าร่วม "เฉพาะรอบพิเศษ" เท่านั้น
  SPECIAL_ONLY_START_ROW: 880
};

const MONTH_LABELS = ["ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.",
                      "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "รอบพิเศษ"];


// 1) Entry point เดียวสำหรับทุก request (ทั้งหน้าเว็บเดิม และ JSON API ใหม่)
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};

  // ----- โหมด API: คืน JSON ให้เว็บภายนอก (เช่นบน Vercel) เรียกใช้ -----
  if (params.page === 'api') {
    return handleApiRequest(params.action, params);
  }

  // ----- โหมดเดิม: เสิร์ฟหน้า Index.html เหมือนก่อนหน้านี้ทุกประการ -----
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('IT Man Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL) // ป้องกันปัญหา iframe ถูกบล็อก
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}


// 2) ตัวจัดการ route ของ API (เผื่ออนาคตจะเพิ่ม action อื่นๆ ได้ง่าย)
function handleApiRequest(action, params) {
  let result;

  switch (action) {
    case 'getDashboardData':
      result = getDashboardData();
      break;
    default:
      result = { error: "ไม่รู้จัก action: '" + action + "'" };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// helper: อ่านค่าจากเซลล์แบบปลอดภัย
function readCell(row, idx) {
  var v = row[idx];
  if (v === undefined || v === null) return "-";
  v = v.toString().trim();
  return v === "" ? "-" : v;
}


// 3) ดึงและจัดรูปข้อมูลจาก Google Sheets ให้ Frontend (ไม่แก้ไขจากไฟล์เดิม)
function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    return { error: "ไม่พบแผ่นงานที่ชื่อ '" + CONFIG.SHEET_NAME + "' กรุณาตรวจสอบการสะกดชื่อชีต" };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return { error: "ไม่มีข้อมูลในชีต" };

  const data = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();

  const result = [];
  const provinces = new Set();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    const code = (row[CONFIG.COL_CODE] || "").toString().trim();
    if (!code && !(row[CONFIG.COL_NAME] || "").toString().trim()) {
      continue;
    }
    if (!code) continue;

    const districtName = (row[CONFIG.COL_NAME] || "").toString().trim();
    const provinceName = (row[CONFIG.COL_PROVINCE] || "").toString().trim();

    if (provinceName) provinces.add(provinceName);

    const isSpecialOnly = (rowNum >= CONFIG.SPECIAL_ONLY_START_ROW);
    const lastPeriodIndex = CONFIG.PERIOD_COUNT - 1;

    const periods = [];
    for (let m = 0; m < CONFIG.PERIOD_COUNT; m++) {
      let subStatus = "-";
      let evalStatus = "-";

      if (!isSpecialOnly || m === lastPeriodIndex) {
        subStatus = readCell(row, CONFIG.SUB_START + m);
        evalStatus = readCell(row, CONFIG.EVAL_START + m);
      }

      periods.push({
        monthName: MONTH_LABELS[m],
        subStatus: subStatus,
        evalStatus: evalStatus
      });
    }

    result.push({
      code: code,
      name: districtName,
      province: provinceName,
      periods: periods
    });
  }

  return {
    records: result,
    provinces: Array.from(provinces).sort()
  };
}
