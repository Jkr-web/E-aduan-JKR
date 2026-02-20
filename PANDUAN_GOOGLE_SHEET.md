/*
=================================================================
  PANDUAN GOOGLE APPS SCRIPT - SISTEM E-ADUAN JKR
=================================================================

  ⚠️  PENTING: STRUKTUR HEADER SHEET "Aduan" MESTI MENGIKUT URUTAN:
  id | name | empId | phone | email | dept | location | date | time |
  description | image | adminNotes | status | contractor |
  contractorRefNo | tarikh lantikan | assignedDate | assignedBy |
  taskDescription | contractorNotes | dateReceived | dateCompleted |
  duration | progress | isVerified | verifiedDate | timestamp

  ➡️  Pastikan kolum "contractorRefNo" wujud dalam Sheet "Aduan"
      untuk menyimpan No. Aduan / Rujukan dari pihak Kontraktor.

=================================================================
*/

// --- KONFIGURASI KESELAMATAN ---
const AUTH_TOKEN = "https://github.com/Jkr-web/E-aduan-JKR"; // Mesti sama dengan di client-api.js
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

    // 2. UPDATE RECORD (Termasuk Automatik Cleanup Fail)
    if (action === 'update_record') {
      const success = updateSingleRecord(ss, e.parameter.sheet, e.parameter.id, e.parameter.key, postData);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 3. DELETE RECORD (Termasuk Automatik Cleanup Fail)
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
        let val = postData[h.toLowerCase().trim()] || postData[h];
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

/**
 * Memadam fail tunggal berdasarkan URL Drive
 */
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
  } catch (e) {
    console.warn("Delete Error: " + e.toString());
  }
  return false;
}

/**
 * Membersihkan fail Drive apabila sesuatu rekod dipadam
 */
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
        // Cari kolum yang mengandungi imej
        if (h.includes('gambar') || h.includes('image') || h.includes('progress')) {
          const val = row[hIdx];
          processAndCleanupFiles(val); // Padam semua fail dalam kolum ini
        }
      });
      break;
    }
  }
}

/**
 * Bandingkan senarai URL lama dan baru, padam fail yang telah dibuang
 */
function processAndCleanupFiles(oldValue, newValue) {
  const extractUrls = (val) => {
    if (!val) return [];
    let urls = [];
    if (typeof val === 'string') {
      if (val.startsWith('[') || val.startsWith('{')) {
        try {
          const p = JSON.parse(val);
          if (Array.isArray(p)) urls = p;
          else if (typeof p === 'object') findUrlsInObject(p, urls);
        } catch(e){}
      } else if (val.includes('drive.google.com')) {
        urls = [val];
      }
    } else if (Array.isArray(val)) {
      urls = val;
    } else if (typeof val === 'object' && val !== null) {
      findUrlsInObject(val, urls);
    }
    return urls.filter(u => typeof u === 'string' && u.includes('drive.google.com'));
  };

  const oldUrls = extractUrls(oldValue);
  const newUrls = newValue ? extractUrls(newValue) : [];

  // Padam hanya URL yang ada dalam rekod lama tetapi TIADA dalam rekod baru
  oldUrls.forEach(u => {
    if (!newUrls.includes(u)) {
      deleteFileFromDrive(u);
    }
  });
}

function findUrlsInObject(obj, urls) {
  for (let k in obj) {
    let v = obj[k];
    if (typeof v === 'string' && v.includes('drive.google.com')) {
      urls.push(v);
    } else if (typeof v === 'object' && v !== null) {
      findUrlsInObject(v, urls);
    }
  }
}

// --- FUNGSI TERAS LAIN ---

function updateSingleRecord(ss, sheetName, idValue, keyName, updatedData) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const idIndex = headers.indexOf(keyName.toLowerCase().trim());
  if (idIndex === -1) return false;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex].toString().trim() === idValue.toString().trim()) {
      const originalHeaders = data[0];
      const newRow = originalHeaders.map((h, idx) => {
        const hLow = h.toLowerCase().trim();
        const key = Object.keys(updatedData).find(k => k.toLowerCase().trim() === hLow);
        let val = (key !== undefined) ? updatedData[key] : data[i][idx];
        
        // PENTING: Jika kolum imej dikemaskini, lakukan pembersihan Drive
        if (key !== undefined && (hLow.includes('gambar') || hLow.includes('image') || hLow.includes('progress'))) {
           processAndCleanupFiles(data[i][idx], val);
        }

        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return (val === null) ? '' : val;
      });
      sheet.getRange(i + 1, 1, 1, originalHeaders.length).setValues([newRow]);
      return true;
    }
  }
  return false;
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

// =====================================================================
// 🔧 FUNGSI PERSEDIAAN SHEET (Jalankan SEKALI dari Apps Script Editor)
// =====================================================================
//
//  Cara Guna:
//  1. Buka Google Apps Script Editor
//  2. Pilih fungsi "setupSheetHeaders" dari dropdown
//  3. Tekan butang ▶ Run
//  4. Semua kolum yang diperlukan akan ditambah secara automatik
//     (data sedia ada TIDAK akan dipadam)
//
// =====================================================================

/**
 * Pastikan semua kolum yang diperlukan wujud dalam Sheet "Aduan".
 * Kolum "contractorRefNo" akan ditambah jika belum wujud.
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Aduan');
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Sheet "Aduan" tidak dijumpai!');
    return;
  }

  // Senarai penuh kolum yang diperlukan (mengikut urutan)
  const REQUIRED_HEADERS = [
    'id', 'name', 'empId', 'phone', 'email', 'dept', 'location',
    'date', 'time', 'description', 'image', 'adminNotes', 'status',
    'contractor', 'contractorRefNo',          // ← KOLUM BARU
    'tarikh lantikan', 'assignedDate', 'assignedBy',
    'taskDescription', 'contractorNotes',
    'dateReceived', 'dateCompleted', 'duration',
    'progress', 'isVerified', 'verifiedDate', 'timestamp'
  ];

  const lastCol = sheet.getLastColumn();
  const existingHeaders = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().toLowerCase().trim())
    : [];

  let added = [];

  REQUIRED_HEADERS.forEach(header => {
    const lowerH = header.toLowerCase().trim();
    if (!existingHeaders.includes(lowerH)) {
      // Tambah kolum baru di hujung
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, newCol).setValue(header);
      // Style header baru
      sheet.getRange(1, newCol).setBackground('#fff9c4').setFontWeight('bold');
      existingHeaders.push(lowerH);
      added.push(header);
    }
  });

  if (added.length > 0) {
    SpreadsheetApp.getUi().alert('✅ Berjaya! Kolum baru ditambah:\n' + added.join(', '));
    Logger.log('Kolum ditambah: ' + added.join(', '));
  } else {
    SpreadsheetApp.getUi().alert('✅ Semua kolum sudah wujud. Tiada perubahan diperlukan.');
  }
}
