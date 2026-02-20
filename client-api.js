// REPLACE THIS URL WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const API_URL = 'https://script.google.com/macros/s/AKfycbyAzdOl0frUfG2htZs4segFFvb9gvwYTeH_i8-uCeal6j1YKWAOcjz6ZP1Kw0zhjY8c/exec';

// --- TOKEN KESELAMATAN (Mesti sama dengan di Google Apps Script) ---
const AUTH_TOKEN = "RAHSIA_JKR_2026_SECURE";

const API = {
    async getAll() {
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
                return json;
            } catch (e) {
                console.error("JSON Parse Error. Server returned:", text);
                throw new Error("Respons bukan JSON (Sila semak Deployment Google Script)");
            }
        } catch (e) {
            console.error("Connection Failed (Background Sync):", e);
            // We return safe defaults instead of alerting the user on every refresh
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
            const body = JSON.stringify(fullData);
            const sizeInMB = (encodeURI(body).split(/%..|./).length - 1) / (1024 * 1024);
            console.log(`Sending data: ${sizeInMB.toFixed(2)} MB`);

            if (sizeInMB > 15) {
                alert(`AMARAN: Saiz data sangat besar (${sizeInMB.toFixed(2)} MB). Sila kurangkan jumlah imej.`);
            }

            const res = await fetch(`${API_URL}?token=${AUTH_TOKEN}`, {
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
                body: JSON.stringify(data)
            });
            const result = await res.json();
            return result.status === 'success';
        } catch (e) {
            console.error("Append Record Error:", e);
            return false;
        }
    }
};

// --- GLOBAL UTILITY: Fix existing phone data for UI ---
const fixPhoneData = (data) => {
    if (!data) return data;
    const fix = (list) => {
        if (!list || !Array.isArray(list)) return;
        list.forEach(item => {
            if (item.phone) {
                let p = item.phone.toString().trim();
                // Strip the single quote if it was added for DB
                if (p.startsWith("'")) p = p.substring(1);
                // Add leading zero if missing and not international
                if (p && !p.startsWith('0') && !p.startsWith('+') && !p.startsWith('6')) {
                    p = '0' + p;
                }
                item.phone = p;
            }
        });
    };
    fix(data.complaints);
    fix(data.contractors);
    fix(data.admins);
    return data;
};

// Wrap getAll to apply the fix
const originalGetAll = API.getAll;
API.getAll = async function () {
    const data = await originalGetAll.apply(this, arguments);
    return fixPhoneData(data);
};

// Expose globally
window.API = API;
