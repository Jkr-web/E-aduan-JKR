/*
=================================================================
  PANDUAN GOOGLE APPS SCRIPT - SISTEM E-ADUAN JKR (VERSI BM)
=================================================================

  ⚠️  PENTING: STRUKTUR HEADER SHEET "Aduan" (IKUT URUTAN BM):
  no. aduan | tarikh aduan | masa aduan | nama | no. pekerja | 
  no. telefon | emel | jabatan | lokasi kerosakan | keterangan aduan | 
  gambar | status | timestamp | kontraktor dilantik | tarikh lantikan | 
  catatan admin | catatan kontraktor | keterangan tugasan | 
  tarikh terima | tarikh siap | tempoh siap | isVerified | 
  verifiedDate | assignedBy | progress | contractorRefNo

=================================================================
*/

// --- KONFIGURASI KESELAMATAN ---
const AUTH_TOKEN = "https://github.com/Jkr-web/E-aduan-JKR";
const ALLOWED_ORIGINS = ["https://webmaker.github.io", "http://127.0.0.1", "http://localhost"];
const FOLDER_ID = "1UqG08-eXQ2_au3gwarKm88IQTOCsG0W8";

/**
 * MENGAMBIL DATA (READ)
 */
function doGet(e) {
  if (!isValidRequest(e)) return createJsonResponse({ status: 'error', message: 'Akses Ditolak: Token Tidak Sah' });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return createJsonResponse({
      complaints: getSheetData(ss, 'Aduan'),
      admins: getSheetData(ss, 'Admin'),
      contractors: getSheetData(ss, 'Kontraktor'),
      settings: getSettingsData(ss, 'Tetapan')
    });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: "Ralat Server: " + err.toString() });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

/**
 * MENGHANTAR DATA (WRITE / UPDATE / DELETE)
 */
function doPost(e) {
  if (!isValidRequest(e)) return createJsonResponse({ status: 'error', message: 'Akses Ditolak: Tiada Kebenaran' });
  if (!e.postData || !e.postData.contents) return createJsonResponse({ status: 'error', message: 'Tiada data dihantar' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const postData = JSON.parse(e.postData.contents);
    const action = e.parameter.action || postData.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. UPLOAD IMAGE
    if (action === 'upload_file') {
      const url = uploadToDrive(e.parameter.filename, postData.image);
      return createJsonResponse({ status: 'success', url: url });
    }

    // 2. UPDATE RECORD
    if (action === 'update_record') {
      const success = updateSingleRecord(ss, e.parameter.sheet, e.parameter.id, e.parameter.key, postData);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 3. DELETE RECORD
    if (action === 'delete_record') {
      cleanupFilesByRecord(ss, e.parameter.sheet, e.parameter.id, e.parameter.key);
      const success = deleteSingleRecord(ss, e.parameter.sheet, e.parameter.id, e.parameter.key);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 4. MANUAL DELETE IMAGE FROM DRIVE
    if (action === 'delete_file') {
      const success = deleteFileFromDrive(postData.url);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 5. APPEND RECORD
    if (action === 'append_record') {
      const sheet = ss.getSheetByName(e.parameter.sheet);
      if (!sheet) return createJsonResponse({ status: 'error', message: 'Sheet tidak dijumpai' });
      const lastCol = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const newRow = headers.map(h => {
        let hClean = h.toString().toLowerCase().trim();
        let val = postData[h] !== undefined ? postData[h] : postData[hClean];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return (val === undefined || val === null) ? "" : val;
      });
      sheet.appendRow(newRow);
      return createJsonResponse({ status: 'success' });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak sah' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: "Ralat Server: " + err.toString() });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

// --- FUNGSI DRIVE COMMANDS (CLEANUP LOGIC) ---

function deleteFileFromDrive(url) {
  if (!url || typeof url !== 'string' || !url.includes('drive.google.com')) return false;
  try {
    let fileId = "";
    if (url.includes("id=")) {
      fileId = url.split("id=")[1].split("&")[0];
    } else if (url.includes("/d/")) {
      fileId = url.split("/d/")[1].split("/")[0];
    }
    if (fileId) {
      DriveApp.getFileById(fileId).setTrashed(true);
      return true;
    }
  } catch (e) { console.warn("Delete Error: " + e.toString()); }
  return false;
}

function cleanupFilesByRecord(ss, sheetName, idValue, keyName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const idx = headers.indexOf(keyName.toLowerCase().trim());
  if (idx === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx].toString().trim() === idValue.toString().trim()) {
      const row = data[i];
      headers.forEach((h, hIdx) => {
        if (h.includes('gambar') || h.includes('image') || h.includes('progress')) {
          processAndCleanupFiles(row[hIdx]); 
        }
      });
      break;
    }
  }
}

function processAndCleanupFiles(oldValue, newValue) {
  const extractUrls = (val) => {
    if (!val) return [];
    let urls = [];
    if (typeof val === 'string') {
      if (val.startsWith('[') || val.startsWith('{')) {
        try {
          const p = JSON.parse(val);
          if (Array.isArray(p)) urls = p;
        } catch(e){}
      } else if (val.includes('drive.google.com')) { urls = [val]; }
    } else if (Array.isArray(val)) { urls = val; }
    return urls.filter(u => typeof u === 'string' && u.includes('drive.google.com'));
  };

  const oldUrls = extractUrls(oldValue);
  const newUrls = newValue ? extractUrls(newValue) : [];
  oldUrls.forEach(u => { if (!newUrls.includes(u)) deleteFileFromDrive(u); });
}

// --- FUNGSI TERAS REKOD (VERSI ROBUST BM) ---

function updateSingleRecord(ss, sheetName, idValue, keyName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const headersLower = headers.map(h => h.toString().toLowerCase().trim());
  const keyIdx = headersLower.indexOf(keyName.toLowerCase().trim());
  if (keyIdx === -1) return false;

  for (let i = 1; i < values.length; i++) {
    if (values[i][keyIdx].toString().trim() === idValue.toString().trim()) {
      headers.forEach((h, j) => {
        const hLow = h.toString().toLowerCase().trim();
        let val = data[h] !== undefined ? data[h] : data[hLow];
        if (val !== undefined) {
          if (hLow.includes('gambar') || hLow.includes('image') || hLow.includes('progress')) {
            processAndCleanupFiles(values[i][j], val);
          }
          if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
          sheet.getRange(i + 1, j + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteSingleRecord(ss, sheetName, idValue, keyName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const idx = headers.indexOf(keyName.toLowerCase().trim());
  if (idx === -1) return false;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx].toString().trim() === idValue.toString().trim()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}

function uploadToDrive(fileName, base64Data) {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const contentType = base64Data.substring(5, base64Data.indexOf(';'));
  const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
  const blob = Utilities.newBlob(bytes, contentType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
}

function isValidRequest(e) { return (e.parameter.token && e.parameter.token === AUTH_TOKEN); }
function createJsonResponse(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
function getSettingsData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const settings = {};
  if (sheet && sheet.getLastRow() >= 2) {
    sheet.getDataRange().getValues().slice(1).forEach(row => { settings[row[0]] = row[1]; });
  }
  return settings;
}

/**
 * Pastikan semua kolum yang diperlukan wujud (Jalankan Sekali)
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Aduan');
  const REQUIRED = ['no. aduan', 'tarikh aduan', 'masa aduan', 'nama', 'no. pekerja', 'no. telefon', 'emel', 'jabatan', 'lokasi kerosakan', 'keterangan aduan', 'gambar', 'status', 'timestamp', 'kontraktor dilantik', 'tarikh lantikan', 'catatan admin', 'catatan kontraktor', 'keterangan tugasan', 'tarikh terima', 'tarikh siap', 'tempoh siap', 'isVerified', 'verifiedDate', 'assignedBy', 'progress', 'contractorRefNo'];
  
  const existing = sheet.getLastColumn() > 0 ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().toLowerCase().trim()) : [];
  REQUIRED.forEach(h => {
    if (!existing.includes(h)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h).setBackground('#fff9c4').setFontWeight('bold');
    }
  });
  SpreadsheetApp.getUi().alert('✅ Selesai mengemaskini tajuk kolum!');
}
