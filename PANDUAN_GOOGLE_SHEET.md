
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
  
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Wait up to 30s for lock

    let postData = {};
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback if not JSON (e.g. from standard form)
        postData = e.parameter;
      }
    } else {
      postData = e.parameter;
    }
    
    // DETECT ACTION (Check URL first, then Body) - Case Insensitive
    let action = (e.parameter.action || postData.action || "").toString().toLowerCase().trim();
    
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
      const sheetName = e.parameter.sheet || postData.sheet;
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return createJsonResponse({ status: 'error', message: 'Sheet tidak dijumpai: ' + sheetName });
      
      // AUTO-SYNC HEADERS
      syncHeaders(sheet, postData);
      
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

    // 6. SAVE ALL (BULK OVERWRITE)
    if (action === 'save_all' || action === 'saveall') {
      const sheetsToSave = ['Aduan', 'Admin', 'Kontraktor'];
      sheetsToSave.forEach(sName => {
        const sheet = ss.getSheetByName(sName);
        const dataArr = postData[sName.toLowerCase() + 's'] || postData[sName];
        if (sheet && dataArr && Array.isArray(dataArr)) {
          
          // AUTO-SYNC HEADERS (Check first item in array to update headers)
          if (dataArr.length > 0) syncHeaders(sheet, dataArr[0]);

          const lastCol = sheet.getLastColumn();
          const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          
          // Clear only data rows
          if (sheet.getLastRow() > 1) {
            sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).clearContent();
          }
          
          if (dataArr.length > 0) {
            const rows = dataArr.map(item => {
              return headers.map(h => {
                let hClean = h.toString().toLowerCase().trim();
                let val = item[h] !== undefined ? item[h] : item[hClean];
                if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                return (val === undefined || val === null) ? "" : val;
              });
            });
            sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
          }
        }
      });
      return createJsonResponse({ status: 'success' });
    }

    // 7. UPDATE SETTINGS
    if (action === 'updatesettings' || action === 'update_settings') {
      const sheet = ss.getSheetByName('Tetapan');
      const settings = postData.settings || postData;
      if (sheet && settings) {
        Object.keys(settings).forEach(key => {
          let found = false;
          const data = sheet.getDataRange().getValues();
          for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
              sheet.getRange(i + 1, 2).setValue(settings[key]);
              found = true;
              break;
            }
          }
          if (!found) sheet.appendRow([key, settings[key]]);
        });
        return createJsonResponse({ status: 'success' });
      }
    }

    // 8. SENT NOTIFICATION (EMAIL)
    if (action === 'notify') {
      const success = sendEmailNotification(ss, postData);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    // 9. SUBMIT RATING (FROM USER)
    if (action === 'submit_rating') {
      const complaintId = e.parameter.id || postData.id;
      if (!complaintId) return createJsonResponse({ status: 'error', message: 'ID Aduan diperlukan' });
      
      const success = updateSingleRecord(ss, 'Aduan', complaintId, 'no. aduan', postData);
      return createJsonResponse({ status: success ? 'success' : 'error' });
    }

    return createJsonResponse({ status: 'error', message: 'Aksi tidak sah: ' + action });
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

// --- FUNGSI DINAMIK HEADER (AUTO-ADD COLUMNS) ---

/**
 * Memastikan semua kunci dalam dataObject wujud sebagai header dalam Sheet.
 * Jika tiada, kolum baru akan ditambah secara automatik.
 */
function syncHeaders(sheet, dataObject) {
  if (!sheet) return;
  if (!dataObject || typeof dataObject !== 'object' || Array.isArray(dataObject)) return;

  const lastCol = Math.max(1, sheet.getLastColumn());
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let headersLower = headers.map(h => h.toString().toLowerCase().trim());
  
  const keys = Object.keys(dataObject);
  let added = false;

  keys.forEach(key => {
    // Abaikan kunci teknikal
    if (['action', 'sheet', 'token', 'notificationtype', 'key', 'id'].includes(key.toLowerCase())) return;
    
    if (!headersLower.includes(key.toLowerCase().trim())) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue(key)
           .setBackground('#1e293b')
           .setFontColor('#ffffff')
           .setFontWeight('bold')
           .setHorizontalAlignment('center');
      added = true;
    }
  });
  
  if (added) {
    SpreadsheetApp.flush(); // Pastikan perubahan disimpan sebelum baca semula
  }
}

// --- FUNGSI TERAS REKOD (VERSI ROBUST BM) ---

function updateSingleRecord(ss, sheetName, idValue, keyName, data) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;
  
  // Auto-sync headers sebelum update
  syncHeaders(sheet, data);
  
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
 * FUNGSI PENGHANTARAN EMEL (NOTIFIKASI - DESIGN PREMIUM)
 */
function sendEmailNotification(ss, data) {
  const type = data.notificationType;
  const settings = getSettingsData(ss, 'Tetapan');
  const adminEmail = settings.adminEmail || "admin_jkr@email.com";
  const systemName = settings.systemName || "Sistem E-Aduan JKR";
  const appLogo = settings.appLogo || ""; // URL Logo dari tetapan

  // Base Template Design
  const getHtmlTemplate = (title, content, actionText, actionUrl) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc; }
        .wrapper { width: 100%; padding: 40px 20px; box-sizing: border-box; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; color: #ffffff; }
        .logo { max-width: 80px; margin-bottom: 15px; border-radius: 8px; }
        .content { padding: 40px 30px; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 20px; }
        .badge-success { background-color: #dcfce7; color: #166534; }
        .badge-warning { background-color: #fef9c3; color: #854d0e; }
        .badge-info { background-color: #e0f2fe; color: #075985; }
        .title { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 10px; margin-top: 0; }
        .description { font-size: 16px; color: #64748b; margin-bottom: 30px; }
        .data-box { background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
        .data-item { margin-bottom: 15px; }
        .data-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .data-value { font-size: 15px; font-weight: 600; color: #1e293b; }
        .footer { padding: 30px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer-text { font-size: 13px; color: #94a3b8; }
        .button { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; transition: all 0.3s ease; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            ${appLogo ? `<img src="${appLogo}" class="logo" alt="Logo">` : ''}
            <div style="font-size: 18px; font-weight: 700; letter-spacing: 1px;">${systemName}</div>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <div class="footer-text">Copyright &copy; ${new Date().getFullYear()} ${systemName}.<br>Emel ini dihasilkan secara automatik, sila jangan balas.</div>
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  };

  try {
    let subject = "";
    let htmlBody = "";
    let recipient = "";

    if (type === 'new_complaint') {
      recipient = adminEmail;
      subject = `[BARU] Notifikasi Aduan: ${data.complaintId}`;
      htmlBody = getHtmlTemplate(
        "Aduan Baru",
        `
        <span class="badge badge-warning">Tindakan Diperlukan</span>
        <h1 class="title">Aduan Baru Diterima</h1>
        <p class="description">Makluman, terdapat satu aduan kerosakan baru telah dihantar oleh kakitangan/pengguna.</p>
        <div class="data-box">
          <div class="data-item"><div class="data-label">No. Aduan</div><div class="data-value">${data.complaintId}</div></div>
          <div class="data-item"><div class="data-label">Pengadu</div><div class="data-value">${data.name}</div></div>
          <div class="data-item"><div class="data-label">Lokasi</div><div class="data-value">${data.location}</div></div>
          <div class="data-item"><div class="data-label">Kerosakan</div><div class="data-value">${data.description}</div></div>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Semak Portal Admin</a>
        </div>
        `
      );
    } 
    else if (type === 'assigned') {
      recipient = data.contractorEmail;
      subject = `[TUGASAN] Lantikan Kontraktor: ${data.complaintId}`;
      htmlBody = getHtmlTemplate(
        "Lantikan Tugasan",
        `
        <span class="badge badge-info">Tugasan Baru</span>
        <h1 class="title">Anda Telah Dilantik</h1>
        <p class="description">Syarikat <strong>${data.contractorName}</strong> Sila Log-In ke portal untuk mengambil tugasan berikut:</p>
        <div class="data-box">
          <div class="data-item"><div class="data-label">No. Aduan</div><div class="data-value">${data.complaintId}</div></div>
          <div class="data-item"><div class="data-label">Lokasi Kerosakan</div><div class="data-value">${data.location}</div></div>
          <div class="data-item"><div class="data-label">Keterangan Asal</div><div class="data-value">${data.description}</div></div>
          <div class="data-item"><div class="data-label">Arahan Tugas</div><div class="data-value" style="color: #2563eb;">${data.taskDescription}</div></div>
        </div>
        <p style="font-size: 14px; color: #ef4444; font-weight: 600;">Sila muat turun aplikasi atau log masuk ke portal untuk mulakan tugasan.</p>
        `
      );
    }
    else if (type === 'status_update') {
      recipient = data.userEmail;
      subject = `[KEMASKINI] Status Aduan: ${data.complaintId}`;
      
      let badgeClass = "badge-info";
      if(data.newStatus.includes("Selesai")) badgeClass = "badge-success";
      if(data.newStatus.includes("Dilantik")) badgeClass = "badge-warning";

      htmlBody = getHtmlTemplate(
        "Status Aduan",
        `
        <span class="badge ${badgeClass}">${data.newStatus}</span>
        <h1 class="title">Status Aduan Kini Berubah</h1>
        <p class="description">Tuan/Puan, maklum balas terkini bagi aduan anda adalah seperti berikut:</p>
        <div class="data-box">
          <div class="data-item"><div class="data-label">No. Aduan</div><div class="data-value">${data.complaintId}</div></div>
          <div class="data-item"><div class="data-label">Status Terkini</div><div class="data-value" style="font-size: 18px;">${data.newStatus}</div></div>
          <div class="data-item"><div class="data-label">Dikemaskini Oleh</div><div class="data-value">${data.updateBy}</div></div>
        </div>
        <p class="description">Terima kasih atas kesabaran anda kakitangan kami sedang berusaha membantu anda.</p>
        `
      );
    }
    else if (type === 'clock_in') {
      recipient = adminEmail;
      subject = `[AMBIL TINDAKAN] Kontraktor Mula Kerja: ${data.complaintId}`;
      htmlBody = getHtmlTemplate(
        "Tindakan Telah Diambil",
        `
        <span class="badge badge-success">On-Site Now</span>
        <h1 class="title">Kontraktor Telah Bertindak</h1>
        <p class="description">Makluman, syarikat kontraktor telah tiba di tapak dan memulakan kerja kerosakan.</p>
        <div class="data-box">
          <div class="data-item"><div class="data-label">No. Aduan</div><div class="data-value">${data.complaintId}</div></div>
          <div class="data-item"><div class="data-label">Nama Kontraktor</div><div class="data-value">${data.contractorName}</div></div>
          <div class="data-item"><div class="data-label">Waktu Bertindak</div><div class="data-value">${new Date().toLocaleString('ms-MY')}</div></div>
        </div>
        `
      );
    }
    else if (type === 'task_completed') {
      recipient = adminEmail;
      subject = `[SIAP] Tugasan Selesai: ${data.complaintId}`;
      htmlBody = getHtmlTemplate(
        "Tugasan Selesai",
        `
        <span class="badge badge-success">Selesai</span>
        <h1 class="title">Kerja-kerja Pembaikan Selesai</h1>
        <p class="description">Makluman, kontraktor <strong>${data.contractorName}</strong> telah menyelesaikan tugasan bagi aduan <strong>${data.complaintId}</strong>.</p>
        <div class="data-box">
          <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">
            Sila Login ke <strong>Portal Admin</strong>, pergi ke <strong>Senarai Aduan</strong> dan klik pada butang <strong>"Progress"</strong> untuk melihat hasil kerja-kerja kontraktor tersebut.
          </p>
        </div>
        <div style="text-align: center;">
          <a href="#" class="button">Log Masuk Portal</a>
        </div>
        `
      );
    }
    else if (type === 'task_verified') {
      recipient = data.userEmail;
      subject = `[DISAHKAN] Aduan Selesai Sepenuhnya: ${data.complaintId}`;
      
      // PAUTAN RATING (Dihantar secara dinamik dari frontend)
      const ratingLink = data.ratingUrl || `https://jkr-web.github.io/E-aduan-JKR/Rating.html?id=${data.complaintId}`;

      htmlBody = getHtmlTemplate(
        "Tugasan Disahkan",
        `
        <span class="badge badge-success">Selesai Sepenuhnya</span>
        <h1 class="title">Kerja Pembaikpulihan Selesai</h1>
        <p class="description">Tuan/Puan, kerja-kerja pembaikan bagi aduan <strong>${data.complaintId}</strong> telah disahkan selesai sepenuhnya oleh Admin JKR.</p>
        
        <div class="data-box">
          <div class="data-item"><div class="data-label">No. Aduan</div><div class="data-value">${data.complaintId}</div></div>
          <div class="data-item"><div class="data-label">Tarikh Pengesahan</div><div class="data-value">${data.verifiedDate}</div></div>
        </div>
        
        <div style="background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 25px; text-align: center; margin-top: 20px;">
          <div style="font-size: 14px; font-weight: 700; color: #64748b; margin-bottom: 10px; text-transform: uppercase;">Penilaian Servis</div>
          <div style="font-size: 32px; margin-bottom: 15px;">⭐⭐⭐⭐⭐</div>
          <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">Pandangan anda amat berharga bagi kami untuk meningkatkan mutu perkhidmatan JKR.</p>
          <a href="${ratingLink}" class="button" style="background: #10b981;">Klik Di Sini Untuk Rating & Komen</a>
        </div>

        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 25px;">
          Terima kasih kerana menggunakan Sistem Aduan JKR.
        </p>
        `
      );
    }

    if (recipient && htmlBody) {
      MailApp.sendEmail({
        to: recipient,
        subject: subject,
        htmlBody: htmlBody
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error("Email Error: " + e.toString());
    return false;
  }
}

/**
 * Pastikan semua kolum yang diperlukan wujud (Jalankan Sekali)
 */
/**
 * FUNGSI SETUP UTAMA (Jalankan Sekali)
 * Fungsi ini akan mewujudkan Sheet & Kolum secara automatik jika belum ada.
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. STRUKTUR DATA (Align dengan client-api.js mapping)
  const SCHEMA = {
    'Aduan': ['no. aduan', 'tarikh aduan', 'masa aduan', 'nama', 'no. pekerja', 'no. telefon', 'emel', 'jabatan', 'lokasi kerosakan', 'keterangan aduan', 'gambar', 'status', 'timestamp', 'kontraktor dilantik', 'tarikh lantikan', 'catatan admin', 'catatan kontraktor', 'keterangan tugasan', 'tarikh terima', 'tarikh siap', 'tempoh siap', 'isVerified', 'verifiedDate', 'assignedBy', 'progress', 'contractorRefNo', 'rating', 'feedback'],
    
    'Admin': ['nama', 'emel', 'password', 'position', 'username', 'no. tel pejabat', 'no. tel bimbit', 'dijana oleh'],
    
    'Kontraktor': ['nama', 'username', 'emel', 'no. tel pejabat', 'no. tel bimbit', 'no. daftar', 'bidang', 'tarikh mula', 'tarikh tamat', 'password', 'dijana oleh'],
    
    'Tetapan': ['Setting', 'Value']
  };

  Object.keys(SCHEMA).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    
    // Wujudkan Sheet jika tiada
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    const requiredHeaders = SCHEMA[sheetName];
    const lastCol = sheet.getLastColumn();
    let existingHeaders = [];
    
    if (lastCol > 0) {
      existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().toLowerCase().trim());
    }

    // Tambah Header yang hilang
    requiredHeaders.forEach(header => {
      if (!existingHeaders.includes(header.toLowerCase().trim())) {
        const nextCol = sheet.getLastColumn() + 1;
        sheet.getRange(1, nextCol).setValue(header)
             .setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
      }
    });

    // Bekukan baris pertama (Freeze Row)
    if (sheet.getFrozenRows() === 0) sheet.setFrozenRows(1);
  });

  // Contoh data permulaan untuk Tetapan (Jika kosong)
  const tetapanSheet = ss.getSheetByName('Tetapan');
  if (tetapanSheet.getLastRow() < 2) {
    tetapanSheet.appendRow(['adminEmail', 'admin@jkr.gov.my']);
    tetapanSheet.appendRow(['systemName', 'Sistem E-Aduan JKR']);
  }

  SpreadsheetApp.getUi().alert('✅ TAHNIAH! Pangkalan data (Sheets & Headers) telah berjaya disediakan secara automatik.');
}
