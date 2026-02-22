// REPLACE THIS URL WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbzlmcR6XK3QGWXaCzlV8O7OoBSE_2-2pWBVImmW_AT6tioxA-Pd9a29EYFUl3MQQA39/exec';

// --- TOKEN KESELAMATAN (Mesti sama dengan di Google Apps Script) ---
const AUTH_TOKEN = "https://github.com/Jkr-web/E-aduan-JKR";

// --- TELEGRAM BOT CONFIGURATION ---
// Sila masukkan Token Bot dan Chat ID setiap Admin di dalam kurungan (Array)
const TELEGRAM_BOT_TOKEN = "8388825695:AAFeMMNXRCG08Cso69D36uUt_MISzbwh0J4";
const TELEGRAM_ADMIN_CHAT_IDS = [
    "YOUR_CHAT_ID_ADMIN_1",
    // "YOUR_CHAT_ID_ADMIN_2" // Boleh tambah beratus Chat ID di bawah ini jika mahu
];

const API = {
    async getAll(useCache = false) {
        // 1. Return cache if requested (for instant load)
        if (useCache) {
            const cached = localStorage.getItem('db_cache');
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch (e) {
                    console.error("Cache Parse Error", e);
                }
            }
        }

        try {
            // Google Apps Script requires redirect: 'follow'
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&_t=${new Date().getTime()}`, {
                method: 'GET',
                redirect: 'follow',
                mode: 'cors'
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const text = await res.text();
            try {
                const json = JSON.parse(text);
                if (json.status === 'error') throw new Error(json.message);

                // ✅ Save success to cache for "Fast Loading"
                localStorage.setItem('db_cache', text);

                return json;
            } catch (e) {
                console.error("JSON Parse Error. Server returned:", text);
                throw new Error("Respons bukan JSON (Sila semak Deployment Google Script)");
            }
        } catch (e) {
            console.error("Connection Failed (Background Sync):", e);
            // If offline, return cache if available
            const cached = localStorage.getItem('db_cache');
            if (cached) return JSON.parse(cached);

            return { complaints: [], contractors: [], admins: [], settings: {} };
        }
    },

    async saveComplaint(complaint) {
        // 1. Get current data
        const data = await this.getAll();

        // 2. Add new complaint
        if (!data.complaints) data.complaints = [];
        data.complaints.push(complaint);

        // 3. Save back
        await this.saveAll(data);
        return true;
    },

    async updateComplaint(updatedComplaint) {
        const data = await this.getAll();
        const index = data.complaints.findIndex(c => c.id === updatedComplaint.id);
        if (index !== -1) {
            data.complaints[index] = updatedComplaint;
            await this.saveAll(data);
            return true;
        }
        return false;
    },

    async saveAll(fullData) {
        try {
            // Include action in body for redundancy
            const body = JSON.stringify({ action: 'save_all', ...fullData });
            const sizeInMB = (encodeURI(body).split(/%..|./).length - 1) / (1024 * 1024);
            console.log(`Sending data: ${sizeInMB.toFixed(2)} MB`);

            if (sizeInMB > 15) {
                alert(`AMARAN: Saiz data sangat besar (${sizeInMB.toFixed(2)} MB). Sila kurangkan jumlah imej.`);
            }

            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=save_all`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                mode: 'cors',
                body: body
            });

            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error("Server non-JSON response:", text);
                throw new Error("Server tidak mengembalikan JSON (Mungkin ralat Google Script)");
            }

            if (result.status === 'error') {
                throw new Error(result.message || "Server returned error status");
            }

            return true;
        } catch (e) {
            console.error("Save Error:", e);
            alert("Gagal menyimpan data: " + e.message);
            return false;
        }
    },

    /**
     * Update Settings specifically
     */
    async updateSettings(settings) {
        try {
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=update_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                mode: 'cors',
                body: JSON.stringify({ action: 'update_settings', settings: settings })
            });

            const result = await res.json();
            if (result.status === 'success') return true;
            throw new Error(result.message || "Gagal simpan tetapan.");
        } catch (e) {
            console.error("Update Settings Error:", e);
            return false;
        }
    },

    /**
     * @param {string} type - 'new_complaint', 'assigned', 'clock_in', 'status_update'
     * @param {object} payload - Data relevant to notification
     */
    async sendNotification(type, payload) {
        try {
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                body: JSON.stringify({
                    notificationType: type,
                    ...payload
                })
            });
            const result = await res.json();
            return result.status === 'success';
        } catch (e) {
            console.error("Notification Error:", e);
            return false;
        }
    },

    /**
     * @param {string} message - Message to send to the Individual Admins
     */
    async sendTelegramToAdmin(message) {
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes('YOUR_BOT_TOKEN')) {
            console.warn("Telegram Token belum ditetapkan.");
            return false;
        }

        let chatIds = [...TELEGRAM_ADMIN_CHAT_IDS].filter(id => id && !id.includes('YOUR_CHAT_ID'));

        // Ambil data admin dari server untuk dapatkan Chat ID masing-masing
        try {
            const data = await this.getAll(false); // Ambil data fresh untuk notifikasi
            const admins = data.admins || [];

            admins.forEach(admin => {
                if (admin.telegramId) {
                    const tid = admin.telegramId.toString().trim();
                    if (tid !== '') {
                        // Masukkan ke dalam senarai jika belum ada
                        if (!chatIds.includes(tid)) {
                            chatIds.push(tid);
                        }
                    }
                }
            });
        } catch (e) {
            console.warn("Gagal mengekstrak Chat ID Admin dari pangkalan data:", e);
        }

        if (chatIds.length === 0) {
            console.warn("Tiada Chat ID Telegram Admin dijumpai untuk dihantar notifikasi.");
            return false;
        }

        let allSuccess = true;

        for (const chatId of chatIds) {
            try {
                const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
                const payload = {
                    chat_id: chatId.toString().trim(),
                    text: message,
                    parse_mode: 'Markdown'
                };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    console.error(`Gagal hantar Telegram ke Chat ID: ${chatId}`);
                    allSuccess = false;
                }
            } catch (error) {
                console.error(`Error sending Telegram to Chat ID ${chatId}:`, error);
                allSuccess = false;
            }
        }
        return allSuccess;
    },

    /**
     * Update SINGLE record (Efficient)
     */
    async updateRecord(sheet, key, id, data) {
        try {
            const body = JSON.stringify(data);
            const sizeInMB = (encodeURI(body).split(/%..|./).length - 1) / (1024 * 1024);
            console.log(`Updating ${sheet} [${id}]: ${sizeInMB.toFixed(2)} MB`);

            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=update_record&sheet=${sheet}&key=${key}&id=${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                mode: 'cors',
                body: body
            });

            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error("Server non-JSON response:", text);
                throw new Error("Server tidak mengembalikan JSON");
            }

            if (result.status === 'error') {
                throw new Error(result.message || "Gagal mengemaskini.");
            }

            return true;
        } catch (e) {
            console.error("Update Record Error:", e);
            throw e; // Throw to be caught by caller for detailed alert
        }
    },
    /**
     * Delete Single Record from a specific sheet
     */
    async deleteRecord(sheet, key, id) {
        try {
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=delete_record&sheet=${encodeURIComponent(sheet)}&key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                mode: 'cors',
                body: JSON.stringify({ action: 'delete_record', id: id }) // Pastikan body tidak kosong
            });

            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                console.error("Server non-JSON response:", text);
                throw new Error("Server tidak mengembalikan JSON");
            }

            if (result.status === 'error') {
                throw new Error(result.message || "Gagal memadam rekod.");
            }

            return true;
        } catch (e) {
            console.error("Delete Record Error:", e);
            throw e;
        }
    },

    /**
     * Upload File direct to Google Drive (HD Support)
     */
    async uploadFile(filename, base64Image) {
        try {
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=upload_file&filename=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                body: JSON.stringify({ image: base64Image })
            });
            const result = await res.json();
            if (result.status === 'success') return result.url;
            throw new Error(result.message || "Gagal upload fail.");
        } catch (e) {
            console.error("Upload Error:", e);
            throw e;
        }
    },

    /**
     * Delete File from Google Drive
     */
    async deleteFile(url) {
        try {
            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=delete_file`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                body: JSON.stringify({ url: url })
            });
            const result = await res.json();
            return result.status === 'success';
        } catch (e) {
            console.error("Delete File Error:", e);
            return false;
        }
    },

    /**
     * Efficiently append a new record to a sheet
     */
    async appendRecord(sheet, data) {
        try {
            // FIX: Ensure phone number starts with '0' and force string format for Google Sheets
            if (data.phone) {
                let p = data.phone.toString().trim();
                if (p && !p.startsWith('0') && !p.startsWith('+') && !p.startsWith('6')) {
                    p = '0' + p;
                }
                // Prepend single quote to force Google Sheets to treat as plain text
                data.phone = "'" + p;
            }

            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}&action=append_record&sheet=${sheet}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                redirect: 'follow',
                mode: 'cors',
                body: JSON.stringify({ action: 'append_record', sheet: sheet, ...data })
            });

            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
                if (result.status === 'success') return true;
                throw new Error(result.message || "Server returned error status");
            } catch (e) {
                console.error("Append Record Response Error. Server returned:", text);
                throw new Error("Gagal menyimpan rekod. Sila semak Deployment Google Script.");
            }
        } catch (e) {
            console.error("Append Record Error:", e);
            throw e;
        }
    }
};

// --- GLOBAL UTILITY: Fix data from API (Casing, Mapping & Phone) ---
const normalizeData = (data) => {
    if (!data) return data;

    const normalizeList = (list) => {
        if (!list || !Array.isArray(list)) return;
        list.forEach((item, index) => {
            const normalizedItem = {};
            // Record original keys to map back during save
            normalizedItem._originalKeys = {};

            for (const key in item) {
                if (key === '_originalKeys') continue;

                let k = key.toLowerCase().trim();
                normalizedItem._originalKeys[k] = key; // Store original header

                // Map Malay/Various headers to consistent JS keys
                let jsKey = k;
                if (k === 'no. aduan' || k === 'id aduan') jsKey = 'id';
                if (k === 'nama' || k === 'nama pengadu') jsKey = 'name';
                if (k === 'no. pekerja' || k === 'no pekerja') jsKey = 'empId';
                if (k === 'no. telefon' || k === 'no telefon') jsKey = 'phone';
                if (k === 'emel' || k === 'emel pengadu') jsKey = 'email';
                if (k === 'jabatan') jsKey = 'dept';
                if (k === 'lokasi' || k === 'lokasi kerosakan') jsKey = 'location';
                if (k === 'keterangan' || k === 'keterangan aduan') jsKey = 'description';
                if (k === 'gambar') jsKey = 'image';
                if (k === 'tarikh aduan') jsKey = 'date';
                if (k === 'masa aduan') jsKey = 'time';
                if (k === 'status') jsKey = 'status';
                if (k === 'kontraktor' || k === 'kontraktor dilantik' || k === 'syarikat') jsKey = 'contractor';
                if (k === 'tarikh lantikan' || k === 'masa lantikan') jsKey = 'assignedDate';
                if (k === 'catatan admin' || k === 'nota admin') jsKey = 'adminNotes';
                if (k === 'catatan kontraktor') jsKey = 'contractorNotes';
                if (k === 'keterangan tugasan' || k === 'arahan tugasan') jsKey = 'taskDescription';
                if (k === 'tarikh terima' || k === 'masa terima') jsKey = 'dateReceived';
                if (k === 'tarikh siap' || k === 'masa siap') jsKey = 'dateCompleted';
                if (k === 'tempoh' || k === 'tempoh siap') jsKey = 'duration';
                if (k === 'assignedby' || k === 'ditetapkan oleh' || k === 'pegawai') jsKey = 'assignedBy';

                // Contractor Specific Fields
                if (k === 'no. daftar' || k === 'no. pendaftaran' || k === 'regno' || k === 'ssm') jsKey = 'regNo';
                if (k === 'tarikh mula' || k === 'mula kontrak' || k === 'startdate') jsKey = 'startDate';
                if (k === 'tarikh tamat' || k === 'tamat kontrak' || k === 'enddate') jsKey = 'endDate';
                if (k === 'no. tel pejabat' || k === 'tel pejabat') jsKey = 'offphone';
                if (k === 'no. tel bimbit' || k === 'tel bimbit' || k === 'no telefon bimbit') jsKey = 'mobile';
                if (k === 'bidang' || k === 'skop') jsKey = 'scope';
                if (k === 'dijana oleh' || k === 'createdby') jsKey = 'createdBy';
                if (k === 'telegramid' || k === 'telegram id' || k === 'telegram_id') jsKey = 'telegramId';

                let val = item[key];
                // Normalize dates for HTML date inputs (YYYY-MM-DD)
                if (jsKey === 'startDate' || jsKey === 'endDate') {
                    if (val) {
                        try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                                val = d.toISOString().split('T')[0];
                            }
                        } catch (e) { }
                    }
                }

                // Handle stringified objects from Sheets (Check both forms due to mapping)
                if ((jsKey === 'assignedBy' || jsKey === 'assignedby') && typeof val === 'string' && val.trim().startsWith('{')) {
                    try {
                        val = JSON.parse(val);
                    } catch (e) {
                        console.warn('Failed to parse assignedBy JSON:', e);
                    }
                }

                normalizedItem[jsKey] = val;
            }
            list[index] = normalizedItem;

            // Fix Phone Data formatting for all phone-related fields
            const currentItem = list[index];
            const phoneFields = ['phone', 'offphone', 'mobile'];

            phoneFields.forEach(field => {
                if (currentItem[field]) {
                    let p = currentItem[field].toString().trim();
                    if (p.startsWith("'")) p = p.substring(1);
                    if (p && !p.startsWith('0') && !p.startsWith('+') && !p.startsWith('6')) p = '0' + p;
                    currentItem[field] = p;
                }
            });
        });
    };

    normalizeList(data.complaints);
    normalizeList(data.contractors);
    normalizeList(data.admins);
    return data;
};

// Shared mapping for JS keys to Sheet headers
const REVERSE_MAP = {
    'id': 'no. aduan',
    'name': 'nama',
    'empId': 'no. pekerja',
    'phone': 'no. telefon',
    'email': 'emel',
    'dept': 'jabatan',
    'location': 'lokasi kerosakan',
    'description': 'keterangan aduan',
    'image': 'gambar',
    'date': 'tarikh aduan',
    'time': 'masa aduan',
    'status': 'status',
    'timestamp': 'timestamp',
    'contractor': 'kontraktor dilantik',
    'assignedDate': 'tarikh lantikan',
    'adminNotes': 'catatan admin',
    'contractorNotes': 'catatan kontraktor',
    'taskDescription': 'keterangan tugasan',
    'dateReceived': 'tarikh terima',
    'dateCompleted': 'tarikh siap',
    'duration': 'tempoh siap',
    'isVerified': 'isVerified',
    'verifiedDate': 'verifiedDate',
    'assignedBy': 'assignedBy',
    'progress': 'progress',
    'regNo': 'no. daftar',
    'startDate': 'tarikh mula',
    'endDate': 'tarikh tamat',
    'offphone': 'no. tel pejabat',
    'mobile': 'no. tel bimbit',
    'scope': 'bidang',
    'createdBy': 'dijana oleh'
};

/**
 * Prepares a JS object to be sent back to Google Sheets by mapping JS keys back to Sheet headers
 */
const prepareDataForSave = (jsData) => {
    if (!jsData || typeof jsData !== 'object') return jsData;

    const originalKeys = jsData._originalKeys || {};
    const result = { ...jsData };
    delete result._originalKeys;

    // We create a new object that uses the "Spreadsheet" headers
    const spreadsheetData = {};

    // Map each JS key to its corresponding Sheet header
    for (const jsKey in result) {
        let sheetHeader = null;

        // 1. Try to find the exact original header used when fetching
        for (const lowHeader in originalKeys) {
            if (REVERSE_MAP[jsKey] && REVERSE_MAP[jsKey].toLowerCase() === lowHeader) {
                sheetHeader = originalKeys[lowHeader];
                break;
            }
        }

        // 2. Fallback to predefined mapping or the key itself
        const header = sheetHeader || REVERSE_MAP[jsKey] || jsKey;

        // Ensure objects like 'assignedBy' are stringified before saving to Google Sheets
        if (jsKey === 'assignedBy' && typeof result[jsKey] === 'object' && result[jsKey] !== null) {
            spreadsheetData[header] = JSON.stringify(result[jsKey]);
        } else {
            spreadsheetData[header] = result[jsKey];
        }
    }

    return spreadsheetData;
};

// Wrap API methods to handle data transformation
const originalGetAll = API.getAll;
API.getAll = async function () {
    const data = await originalGetAll.apply(this, arguments);
    return normalizeData(data);
};

const originalUpdateRecord = API.updateRecord;
API.updateRecord = async function (sheet, key, id, data) {
    const preparedData = prepareDataForSave(data);
    // Map JS key (e.g., 'id') to Sheet header (e.g., 'no. aduan') for the lookup key
    const sheetKey = REVERSE_MAP[key] || key;
    return originalUpdateRecord.call(this, sheet, sheetKey, id, preparedData);
};

const originalDeleteRecord = API.deleteRecord;
API.deleteRecord = async function (sheet, key, id) {
    // Map JS key (e.g., 'id') to Sheet header (e.g., 'no. aduan') for the lookup key
    const sheetKey = REVERSE_MAP[key] || key;
    return originalDeleteRecord.call(this, sheet, sheetKey, id);
};

const originalAppendRecord = API.appendRecord;
API.appendRecord = async function (sheet, data) {
    const preparedData = prepareDataForSave(data);
    return originalAppendRecord.call(this, sheet, preparedData);
};

const originalSaveAll = API.saveAll;
API.saveAll = async function (fullData) {
    const preparedFullData = { ...fullData };
    if (preparedFullData.complaints && Array.isArray(preparedFullData.complaints)) {
        preparedFullData.complaints = preparedFullData.complaints.map(item => prepareDataForSave(item));
    }
    if (preparedFullData.contractors && Array.isArray(preparedFullData.contractors)) {
        preparedFullData.contractors = preparedFullData.contractors.map(item => prepareDataForSave(item));
    }
    if (preparedFullData.admins && Array.isArray(preparedFullData.admins)) {
        preparedFullData.admins = preparedFullData.admins.map(item => prepareDataForSave(item));
    }
    return originalSaveAll.call(this, preparedFullData);
};

// Expose globally
window.API = API;
