// Make the function available globally so it can be called from other scripts (e.g., admin)
window.renderComplaintForm = function (containerId) {
    const appContainer = document.getElementById(containerId);
    if (!appContainer) {
        console.error(`Container with ID '${containerId}' not found.`);
        return;
    }

    // Create the form HTML Structure
    const formHTML = `
        <header>
            <div class="logo-container">
                <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="45" fill="#0056b3" />
                    <text x="50" y="55" font-size="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="bold">JKR</text>
                </svg>
            </div>
            <h1>JABATAN KERJA RAYA</h1>
            <p class="note">Sila isi borang aduan di bawah dengan lengkap.</p>
        </header>

        <form enctype="multipart/form-data">
            <!-- Hidden Fields -->
            <input type="hidden" name="_idbackened" id="_idbackened">
            <input type="hidden" name="timestamp" id="timestamp">

            <!-- Complainant Name -->
            <div class="form-group">
                <label for="nama-pengadu">Nama Pengadu</label>
                <input type="text" id="nama-pengadu" name="Nama Pengadu" required placeholder="Contoh: Ahmad Bin Ali">
            </div>

            <!-- Employee ID -->
            <div class="form-group">
                <label for="no-pekerja">No. Pekerja</label>
                <input type="text" id="no-pekerja" name="No Perkerja" required placeholder="Contoh: 12345">
            </div>

            <!-- Phone Number -->
            <div class="form-group">
                <label for="no-telefon">No. Telefon</label>
                <input type="tel" id="no-telefon" name="No Telefon" required placeholder="Contoh: 012-3456789">
            </div>

            <!-- Email Address -->
            <div class="form-group">
                <label for="emel-pengadu">Emel Pengadu</label>
                <input type="email" id="emel-pengadu" name="Emel Pengadu" required placeholder="Contoh: pengadu@gmail.com">
                <small class="note">*Notifikasi status akan dihantar ke emel ini.</small>
            </div>

            <!-- Department -->
            <div class="form-group">
                <label for="jabatan">Jabatan</label>
                <input type="text" id="jabatan" name="Jabatan" required placeholder="Contoh: Unit IT">
            </div>

            <!-- Damage Location -->
            <div class="form-group">
                <label for="lokasi-kerosakan">Lokasi Kerosakan</label>
                <input type="text" id="lokasi-kerosakan" name="Lokasi Kerosakan" required placeholder="Contoh: Tingkat 1, Bilik Server">
            </div>

            <!-- Complaint Description -->
            <div class="form-group">
                <label for="keterangan-aduan">Keterangan Aduan</label>
                <textarea id="keterangan-aduan" name="Keterangan Aduan" rows="4" required placeholder="Sila nyatakan butiran kerosakan..."></textarea>
            </div>

            <!-- Image Upload -->
            <div class="form-group">
                <label for="gambar">Gambar Lokasi / Item Rosak (Max 10MB)</label>
                <input type="file" id="gambar" name="Gambar" accept="image/*" multiple required>
                <small class="note">Anda boleh memuat naik lebih daripada 1 gambar.</small>
            </div>

            <!-- Complaint Date & Time -->
            <div class="form-row">
                <div class="form-group">
                    <label for="tarikh-aduan">Tarikh Aduan</label>
                    <input type="date" id="tarikh-aduan" name="Tarikh Aduan" required>
                </div>
                <div class="form-group">
                    <label for="masa-aduan">Masa Aduan</label>
                    <input type="time" id="masa-aduan" name="Masa Aduan" required>
                </div>
            </div>


            <!-- Buttons -->
            <div class="button-group">
                <button type="submit" id="submit-btn" class="loading-btn">
                    <span class="spinner"></span>
                    <span class="btn-text">Hantar Aduan</span>
                </button>
                <button type="reset" id="reset-btn" class="loading-btn">
                    <span class="spinner"></span>
                    <span class="btn-text">Tetapkan Semula</span>
                </button>
            </div>
            <p class="note" style="text-align: center; margin-top: 10px;">Nota: Sila pastikan semua maklumat adalah benar.</p>
        </form>

        <!-- Success Modal (Premium) -->
        <div id="success-modal" class="modal" style="display: none; position: fixed; z-index: 5000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); justify-content: center; align-items: center;">
            <div class="modal-content" style="background: white; width: 90%; max-width: 400px; padding: 40px 25px; border-radius: 20px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.15); animation: fadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #2ecc71, #27ae60); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 8px 25px rgba(46,204,113,0.4);">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2 style="margin: 0 0 10px 0; color: #1a202c; font-size: 1.6rem; font-weight: 800;">Aduan Berjaya!</h2>
                <p style="color: #636e72; line-height: 1.5; margin: 0 0 20px 0; font-size: 0.95rem;">Terima kasih. Aduan anda telah berjaya direkodkan.</p>
                <div style="background: #ebf8f2; border: 1px dashed #a7f3d0; border-radius: 12px; padding: 15px; margin-bottom: 25px;">
                    <div style="font-size: 0.75rem; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">No. Rujukan Aduan</div>
                    <div id="complaint-id" style="font-size: 1.3rem; font-weight: 900; color: #065f46; margin-top: 5px; letter-spacing: 1px;">-</div>
                </div>
                <button id="close-modal-btn" style="background: linear-gradient(135deg, #3498db, #2980b9); color: white; border: none; padding: 14px 30px; border-radius: 50px; cursor: pointer; font-weight: 700; width: 100%; font-size: 1rem; box-shadow: 0 4px 15px rgba(52,152,219,0.4); transition: transform 0.2s;">Tutup & Kembali</button>
            </div>
        </div>
    `;

    // Inject HTML into container
    appContainer.innerHTML = formHTML;

    // --- FAST BRANDING SYNC ---
    async function syncBranding(useCacheOnly = false) {
        try {
            const data = await API.getAll(useCacheOnly);
            if (!data) return;
            const settings = data.settings || {};

            // 1. Update Logo
            if (settings.appLogo) {
                const logoEl = appContainer.querySelector('svg.logo');
                if (logoEl) {
                    const img = document.createElement('img');
                    img.src = settings.appLogo;
                    img.alt = 'Logo';
                    img.style.cssText = 'width: 80px; height: 80px; object-fit: contain; margin-bottom: 10px; display: block; margin: 0 auto 10px auto;';
                    logoEl.replaceWith(img);
                }
            }

            // 2. Update System Name
            if (settings.systemName) {
                const h1 = appContainer.querySelector('h1');
                if (h1) h1.textContent = settings.systemName;
            }

            // 3. Update Background
            if (settings.appBackground) {
                document.body.style.backgroundImage = `linear-gradient(rgba(245,247,250,0.9), rgba(245,247,250,0.9)), url('${settings.appBackground}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundAttachment = 'fixed';
            }

            // 4. Update Copyright
            if (settings.footerCopyright) {
                const copyEl = document.getElementById('footer-copyright-text');
                if (copyEl) copyEl.innerHTML = settings.footerCopyright;
            }

            // Sync to LocalStorage for offline/fast load next time
            if (settings.appLogo) localStorage.setItem('appLogo', settings.appLogo);
            if (settings.appBackground) localStorage.setItem('appBackground', settings.appBackground);
            if (settings.systemName) localStorage.setItem('systemName', settings.systemName);
            if (settings.footerCopyright) localStorage.setItem('footerCopyright', settings.footerCopyright);

        } catch (e) {
            console.warn("Branding sync failed.", e);
        }
    }

    // Run sync in two stages: immediate cache, then server update
    (async () => {
        await syncBranding(true);  // Cache
        syncBranding(false);       // Server (Background)
    })();

    // --- JavaScript Logic starts here ---
    // We scope queries to "appContainer" to ensure we're targeting elements inside this specific form instance.

    const form = appContainer.querySelector('form');
    const submitBtn = appContainer.querySelector('#submit-btn');
    const resetBtn = appContainer.querySelector('#reset-btn');
    const successModal = appContainer.querySelector('#success-modal');
    const closeModalBtn = appContainer.querySelector('#close-modal-btn');
    const complaintIdDisplay = appContainer.querySelector('#complaint-id');

    // Toast should probably be global or outside the form container to avoid being cleared on re-render, 
    // but here we can check if it exists or create it.
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    // Generate hidden fields
    const idBackend = appContainer.querySelector('#_idbackened');
    const timestamp = appContainer.querySelector('#timestamp');

    // Auto-generate ID and Timestamp on load
    if (idBackend) idBackend.value = generateUUID();
    if (timestamp) timestamp.value = new Date().toISOString();

    // Set default date and time to now
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const timeNow = now.toTimeString().split(' ')[0].substring(0, 5);

    const dateInput = appContainer.querySelector('#tarikh-aduan');
    const timeInput = appContainer.querySelector('#masa-aduan');

    if (dateInput) dateInput.value = today;
    if (timeInput) timeInput.value = timeNow;


    // File input validation (10MB limit per image)
    const fileInput = appContainer.querySelector('#gambar');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                for (let i = 0; i < this.files.length; i++) {
                    if (this.files[i].size > 10 * 1024 * 1024) {
                        alert(`Imej "${this.files[i].name}" melebihi had 10MB. Sila pilih imej yang lebih kecil.`);
                        this.value = ''; // Clear input
                        return;
                    }
                }
            }
        });
    }

    // Submit Handler
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Show loading state
            setLoading(submitBtn, true);

            try {
                const year = new Date().getFullYear();

                // 1. Get current data from Server
                const data = await API.getAll();
                const complaints = data.complaints || [];

                // 2. Generate ID
                const count = complaints.length + 1;
                const paddedCount = count.toString().padStart(4, '0');
                const newId = `ADUAN-${paddedCount}/${year}`;

                // 3. Handle Image Processing (Multiple + Upload to Drive)
                const fileInput = document.getElementById('gambar');
                let imageLinks = [];

                const overlay = document.getElementById('loading-overlay');
                const percentEl = document.getElementById('loading-percentage');
                const textEl = document.getElementById('loading-text');

                // ONLY show the intrusive full screen loading if there are files to upload
                const hasFiles = fileInput && fileInput.files.length > 0;

                if (hasFiles) {
                    if (overlay) overlay.style.display = 'flex';

                    const totalFiles = fileInput.files.length;
                    const progressContainer = document.getElementById('upload-progress-container');
                    const progressBar = document.getElementById('upload-progress-bar');

                    if (progressContainer) progressContainer.style.display = 'block';

                    for (let i = 0; i < totalFiles; i++) {
                        const file = fileInput.files[i];

                        // Update UI to compression phase
                        const baseProgress = Math.round((i / totalFiles) * 100);
                        if (textEl) textEl.textContent = `Memproses Imej ${i + 1}/${totalFiles}...`;
                        if (percentEl) percentEl.textContent = `${baseProgress}%`;
                        if (progressBar) progressBar.style.width = `${baseProgress}%`;

                        // Compress a bit more for faster upload and to stay within GAS limits
                        const compressedBase64 = await compressImage(file, 1200, 1200, 0.6);

                        // Halfway through this file
                        const midProgress = Math.round(((i + 0.5) / totalFiles) * 100);
                        if (percentEl) percentEl.textContent = `${midProgress}%`;
                        if (progressBar) progressBar.style.width = `${midProgress}%`;

                        // Update UI to uploading
                        if (textEl) textEl.textContent = `Mengunggah Imej ${i + 1}/${totalFiles}...`;

                        // Upload directly to Drive
                        try {
                            const driveUrl = await API.uploadFile(`Complaint_${newId}_${i}.jpg`, compressedBase64);
                            imageLinks.push(driveUrl);
                        } catch (uploadErr) {
                            console.error("Upload error for file " + i, uploadErr);
                            throw new Error(`Gagal memuat naik imej ke- ${i + 1}: ${uploadErr.message}`);
                        }
                    }
                    if (percentEl) percentEl.textContent = `100%`;
                    if (progressBar) progressBar.style.width = `100%`;
                    setTimeout(() => { if (progressContainer) progressContainer.style.display = 'none'; }, 500);
                    if (textEl) textEl.textContent = "Menghantar Aduan...";
                }

                let rawPhone = document.getElementById('no-telefon').value.trim();
                rawPhone = rawPhone.replace(/^'/, ''); // remove existing quote if any
                if (rawPhone && !rawPhone.startsWith('0') && !rawPhone.startsWith('+') && !rawPhone.startsWith('6')) {
                    rawPhone = '0' + rawPhone;
                }
                // Prepend quote to avoid Sheets dropping leading zero
                rawPhone = "'" + rawPhone;

                // 4. Create Complaint Object
                const newComplaint = {
                    "no. aduan": newId,
                    "nama": document.getElementById('nama-pengadu').value,
                    "no. pekerja": document.getElementById('no-pekerja').value,
                    "no. telefon": rawPhone,
                    "emel": document.getElementById('emel-pengadu').value,
                    "jabatan": document.getElementById('jabatan').value,
                    "lokasi kerosakan": document.getElementById('lokasi-kerosakan').value,
                    "keterangan aduan": document.getElementById('keterangan-aduan').value,
                    "gambar": imageLinks.length > 1 ? imageLinks : (imageLinks[0] || ""),
                    "tarikh aduan": document.getElementById('tarikh-aduan').value,
                    "masa aduan": document.getElementById('masa-aduan').value,
                    "status": 'Baru',
                    "timestamp": `${new Date().toLocaleDateString('en-CA')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
                };

                // 5. Save to Server
                const success = await API.appendRecord('Aduan', newComplaint);

                if (success) {
                    // Send Notification to Admins (don't await to avoid blocking UI)
                    API.sendNotification('new_complaint', {
                        complaintId: newId,
                        name: newComplaint["nama"],
                        location: newComplaint["lokasi kerosakan"],
                        description: newComplaint["keterangan aduan"]
                    });

                    // Send Telegram Alert to Admin Group
                    const loginLink = "https://jkr-web.github.io/E-aduan-JKR/index.html";
                    const telegramMsg = `🚨 *ADUAN BARU DITERIMA*\n\n*ID Aduan:* ${newId}\n*Pengadu:* ${newComplaint["nama"]}\n*No. Tel:* ${newComplaint["no. telefon"].replace(/'/g, '')}\n*Lokasi:* ${newComplaint["lokasi kerosakan"]}\n*Kerosakan:* ${newComplaint["keterangan aduan"]}\n\n👉 [Log Masuk Admin](${loginLink})`;
                    API.sendTelegramToAdmin(telegramMsg);

                    // Hide overlay if it was shown
                    if (hasFiles && overlay) {
                        overlay.style.opacity = '0';
                        setTimeout(() => {
                            overlay.style.display = 'none';
                            overlay.style.opacity = '1';
                        }, 300);
                    }

                    // Reset button
                    setLoading(submitBtn, false);

                    // Update Modal Content & Show Success
                    if (complaintIdDisplay) complaintIdDisplay.textContent = newId;
                    if (successModal) {
                        successModal.style.display = 'flex';
                        // Add pop animation effect
                        const content = successModal.querySelector('.modal-content');
                        if (content) {
                            content.style.animation = 'none';
                            content.offsetHeight; // trigger reflow
                            content.style.animation = 'fadeUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        }
                    }

                    resetForm();
                } else {
                    throw new Error("Gagal menyimpan rekod ke Google Sheets.");
                }

            } catch (err) {
                console.error("Submission failed: ", err);
                const overlay = document.getElementById('loading-overlay');
                if (overlay) {
                    overlay.style.display = 'none';
                    overlay.style.opacity = '1';
                }

                alert("Ralat: " + err.message + "\n\nSila pastikan sambungan internet stabil dan saiz gambar tidak terlalu besar.");
                setLoading(submitBtn, false);
            }
        });
    }

    // Reset Handler
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();

            setLoading(resetBtn, true);

            setTimeout(() => {
                resetForm();
                setLoading(resetBtn, false);
                showToast("Borang telah dikosongkan.");
            }, 1000);
        });
    }

    // Close Modal Button Handler
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (successModal) successModal.style.display = "none";
        });
    }


    // Helper Functions
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function setLoading(btn, isLoading) {
        if (!btn) return;
        const spinner = btn.querySelector('.spinner');
        const text = btn.querySelector('.btn-text');

        if (isLoading) {
            if (spinner) spinner.style.display = 'inline-block';
            if (text) text.textContent = btn.id === 'submit-btn' ? 'Menghantar...' : 'Memproses...';
            btn.disabled = true;
        } else {
            if (spinner) spinner.style.display = 'none';
            if (text) text.textContent = btn.id === 'submit-btn' ? 'Hantar Aduan' : 'Tetapkan Semula';
            btn.disabled = false;
        }
    }

    function showSuccessModal(newId) {
        if (complaintIdDisplay) complaintIdDisplay.textContent = newId;
        if (successModal) successModal.style.display = 'flex';
    }

    function resetForm() {
        if (form) form.reset();
        if (idBackend) idBackend.value = generateUUID();
        if (timestamp) timestamp.value = new Date().toISOString();

        const rNow = new Date();
        if (dateInput) dateInput.value = rNow.toISOString().split('T')[0];
        if (timeInput) timeInput.value = rNow.toTimeString().split(' ')[0].substring(0, 5);
    }

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.className = "toast show";
        setTimeout(function () { toast.className = toast.className.replace("show", ""); }, 3000);
    }

    // Close modal on click outside (Scope to window is fine, but maybe specific to modal)
    window.onclick = function (event) {
        if (successModal && event.target == successModal) {
            successModal.style.display = "none";
        }
    }
    // IMAGE COMPRESSION HELPER
    function compressImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    }
};

// Auto-initialize if the default container exists (for formuser.html usage)
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-container')) {
        window.renderComplaintForm('app-container');
    }
});
