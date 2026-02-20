# Panduan Pemasangan Google Apps Script (Backend)

Sila ikuti langkah di bawah untuk mendeploy sistem backend anda.

## Langkah-langkah:
1. Buka [Google Sheets](https://sheets.google.com).
2. Cipta **Spreadsheet Baru** dan beri nama (cth: `DB_JKR_ADUAN`).
3. Cipta 4 sheet di bawah: `Aduan`, `Admin`, `Kontraktor`, `Tetapan`.
4. Pergi ke menu **Extensions > Apps Script**.
5. Padam semua kod lama dan **Tampal (Paste)** kod di bawah.
6. Klik **Save** (ikon disket).
7. Pilih fungsi **`paksaKebenaran`** dalam menu atas dan klik butang **▷ Run**.
8. Berikan semua kebenaran (**Authorize Access**) yang diminta oleh Google.
9. Klik **Deploy > New Deployment**.
10. Pilih type **Web App**.
11. Set **Execute as:** `Me` (Sangat Penting).
12. Set **Who has access:** `Anyone`.
13. Klik **Deploy**.
14. Salin **Web App URL** dan simpan ke dalam fail `client-api.js` dalam projek anda.

---

## Kod Google Apps Script (Versi Terkini - Robust):

```javascript
// --- KONFIGURASI KESELAMATAN ---
const AUTH_TOKEN = "RAHSIA_JKR_2026_SECURE"; // Mesti sama dengan di client-api.js
const FOLDER_ID = "1UqG08-eXQ2_au3gwarKm88IQTOCsG0W8"; // ID Folder Drive anda

/**
 * MENGAMBIL DATA (READ)
 */
function doGet(e) {
  if (!e.parameter.token || e.parameter.token !== AUTH_TOKEN) {
    return createJsonResponse({ status: 'error', message: 'Akses Ditolak: Token Tidak Sah' });
  }

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
    return createJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * MENGHANTAR DATA (WRITE / UPLOAD / NOTIFY)
 */
function doPost(e) {
  if (!e.postData || !e.postData.contents) {
    return createJsonResponse({ status: 'error', message: 'Tiada data dihantar' });
  }

  if (!e.parameter.token || e.parameter.token !== AUTH_TOKEN) {
    return createJsonResponse({ status: 'error', message: 'Akses Ditolak' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const postData = JSON.parse(e.postData.contents);
    const action = e.parameter.action || postData.action;

    // 1. UPLOAD FAIL KE DRIVE (UNTUK GAMBAR HD)
    if (action === 'upload_file') {
      const url = uploadToDrive(e.parameter.filename, postData.image);
      return createJsonResponse({ status: 'success', url: url });
    }

    // 2. KEMASKINI REKOD TUNGGAL (UNTUK STATUS/PROGRESS)
    if (action === 'update_record') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const success = updateSingleRecord(ss, e.parameter.sheet, e.parameter.id, e.parameter.key, postData);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 3. TAMBAH REKOD BARU (APPEND) - Sangat Efisien untuk Aduan Baru
    if (action === 'append_record') {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const sheet = ss.getSheetByName(e.parameter.sheet);
      if (!sheet) return createJsonResponse({ status: 'error', message: 'Sheet tidak dijumpai' });
      
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const newRow = headers.map(h => {
        let val = postData[h];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return (val === undefined || val === null) ? "" : val;
      });
      sheet.appendRow(newRow);
      return createJsonResponse({ status: 'success' });
    }

    // 4. NOTIFIKASI EMEL
    if (action === 'notify') return handleNotification(postData);

    // 5. SIMPAN SEMUA (OVERWRITE)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (postData.complaints) saveSheetData(ss, 'Aduan', postData.complaints);
    if (postData.admins) saveSheetData(ss, 'Admin', postData.admins);
    if (postData.contractors) saveSheetData(ss, 'Kontraktor', postData.contractors);
    if (postData.settings) saveSettingsData(ss, 'Tetapan', postData.settings);
    
    return createJsonResponse({ status: 'success' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: "Ralat Server: " + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- FUNGSI DRIVE ---

function uploadToDrive(fileName, base64Data) {
  try {
    // Semak jika data gambar wujud (Pencegahan ralat manual run)
    if (!base64Data || typeof base64Data !== 'string') {
      throw new Error("Data gambar tidak diterima. Sila pastikan fungsi ini dipanggil dari laman web.");
    }

    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const semiColonIndex = base64Data.indexOf(';');
    if (semiColonIndex === -1) throw new Error("Format imej tidak sah.");
    
    const contentType = base64Data.substring(5, semiColonIndex);
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Mengembalikan link thumbnail pautan terus
    return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
  } catch (e) {
    throw new Error("Gagal simpan ke Drive: " + e.message);
  }
}

// --- FUNGSI PENGURUSAN EMEL ---

function handleNotification(data) {
  try {
    const type = data.notificationType;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const admins = getSheetData(ss, 'Admin');
    const contractors = getSheetData(ss, 'Kontraktor');

    const getEmail = (obj) => {
      if (!obj) return null;
      const key = Object.keys(obj).find(k => k.toLowerCase().trim() === 'email');
      return key ? obj[key] : null;
    };

    const adminEmails = admins.map(a => getEmail(a)).filter(e => e).join(',');

    let recipient = "", subject = "", body = "";

    if (type === 'new_complaint') {
      recipient = adminEmails;
      subject = "🔔 Aduan Baru: " + (data.complaintId || "");
      body = "Aduan Baru.\n\nNo. Aduan: " + data.complaintId + "\nLokasi: " + data.location;
    } 
    else if (type === 'assigned') {
      const c = contractors.find(item => item.name === data.contractorName);
      recipient = c ? getEmail(c) : "";
      subject = "🛠️ Tugasan Baru: " + data.complaintId;
      body = "Tugasan: " + data.complaintId + "\nLokasi: " + data.location + "\nArahan: " + data.taskDescription;
    } 
    else if (type === 'status_update') {
      recipient = data.userEmail;
      subject = "📢 Status Aduan: " + data.complaintId;
      body = "Status: " + data.newStatus + "\nOleh: " + data.updateBy;
    }

    if (recipient) {
      MailApp.sendEmail(recipient, subject, body);
      return createJsonResponse({ status: 'success', sentTo: recipient });
    }
    return createJsonResponse({ status: 'skipped' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// --- FUNGSI HELPER ---

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
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

function updateSingleRecord(ss, sheetName, idValue, keyName, updatedData) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const idIndex = headers.indexOf(keyName.toLowerCase().trim());
  if (idIndex === -1) return false;
  const searchId = idValue.toString().trim();
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex].toString().trim() === searchId) {
      const originalHeaders = data[0];
      const newRowValues = originalHeaders.map((h, idx) => {
        const matchingKey = Object.keys(updatedData).find(k => k.toLowerCase() === h.toLowerCase().trim());
        let val = (matchingKey) ? updatedData[matchingKey] : undefined;
        if (val === undefined) return data[i][idx];
        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
        return (val === null) ? '' : val;
      });
      sheet.getRange(i + 1, 1, 1, originalHeaders.length).setValues([newRowValues]);
      return true;
    }
  }
  return false;
}

function saveSheetData(ss, sheetName, dataArray) {
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  if (!dataArray || dataArray.length === 0) return;
  const allKeys = new Set();
  dataArray.forEach(item => Object.keys(item).forEach(k => allKeys.add(k)));
  const headers = Array.from(allKeys);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const rows = dataArray.map(item => headers.map(h => {
    let v = item[h];
    if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    return (v === undefined || v === null) ? '' : v;
  }));
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    sheet.getRange(i + 2, 1, chunk.length, headers.length).setValues(chunk);
  }
}

function getSettingsData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const rows = sheet.getDataRange().getValues();
  const settings = {};
  rows.slice(1).forEach(row => { settings[row[0]] = row[1]; });
  return settings;
}

function saveSettingsData(ss, sheetName, settingsObj) {
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  const rows = Object.keys(settingsObj).map(k => {
    let v = settingsObj[k];
    if (typeof v === 'object' && v !== null) v = JSON.stringify(v);
    return [k, v];
  });
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 2).setValues(rows);
}

function testSistem() {
  console.log("--- Memulakan Ujian Diagnostik ---");
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    console.log("✅ Drive OK: Folder '" + folder.getName() + "' ditemui.");
  } catch(e) { console.error("❌ RALAT DRIVE: " + e.message); }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    console.log("✅ Sheet OK: Berhubung dengan '" + ss.getName() + "'.");
  } catch(e) { console.error("❌ RALAT SHEET: Fail Spreadsheet tidak dapat dicapai."); }
  
  try {
     const quota = MailApp.getRemainingDailyQuota();
     console.log("✅ Emel OK: Kuota harian berbaki " + quota);
  } catch(e) { console.error("❌ RALAT EMEL: " + e.message); }
}

function paksaKebenaran() {
   testSistem();
   console.log("AUTHORIZATION SELESAI. Sila Deploy.");
}
```
