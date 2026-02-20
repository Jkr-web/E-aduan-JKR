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

        <!-- Success Modal -->
        <div id="success-modal" class="modal">
            <div class="modal-content">
                <!-- Smile Animation SVG -->
                <svg class="smile-anim" viewBox="0 0 100 100">
                    <circle class="circle" cx="50" cy="50" r="45" />
                    <path class="smile" d="M30 60 Q50 80 70 60" />
                </svg>
                <h2>Berjaya!</h2>
                <p>Aduan telah dihantar.</p>
                <div id="complaint-id" style="font-weight: bold; font-size: 1.2em; color: #28a745; margin-top: 10px; margin-bottom: 20px;"></div>
                <button id="close-modal-btn" style="width: 100%; padding: 10px; background-color: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer;">Tutup</button>
            </div>
        </div>
    `;

    // Inject HTML into container
    appContainer.innerHTML = formHTML;

    // --- LIVE BRANDING SYNC ---
    (async function syncBranding() {
        try {
            const data = await API.getAll();
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

            // Sync to LocalStorage for offline/fast load next time
            if (settings.appLogo) localStorage.setItem('appLogo', settings.appLogo);
            if (settings.appBackground) localStorage.setItem('appBackground', settings.appBackground);
            if (settings.systemName) localStorage.setItem('systemName', settings.systemName);

        } catch (e) {
            console.warn("Branding sync failed, using defaults or cache.", e);
        }
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

                // Show Loading Overlay
                const overlay = document.getElementById('loading-overlay');
                const percentEl = document.getElementById('loading-percentage');
                const textEl = document.getElementById('loading-text');

                if (overlay) overlay.style.display = 'flex';

                if (fileInput && fileInput.files.length > 0) {
                    const totalFiles = fileInput.files.length;
                    for (let i = 0; i < totalFiles; i++) {
                        const file = fileInput.files[i];

                        // Update UI
                        if (textEl) textEl.textContent = `Memproses Imej ${i + 1}/${totalFiles}...`;
                        if (percentEl) percentEl.textContent = `${Math.round((i / (totalFiles + 1)) * 100)}%`;

                        // Compress a bit more for faster upload and to stay within GAS limits
                        const compressedBase64 = await compressImage(file, 1200, 1200, 0.6);

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
                }

                if (textEl) textEl.textContent = "Menghantar Aduan...";
                if (percentEl) percentEl.textContent = "95%";

                let rawPhone = document.getElementById('no-telefon').value.trim();
                if (rawPhone && !rawPhone.startsWith('0') && !rawPhone.startsWith('+') && !rawPhone.startsWith('6')) {
                    rawPhone = '0' + rawPhone;
                }

                // 4. Create Complaint Object
                const newComplaint = {
                    id: newId,
                    name: document.getElementById('nama-pengadu').value,
                    empId: document.getElementById('no-pekerja').value,
                    phone: rawPhone,
                    email: document.getElementById('emel-pengadu').value,
                    dept: document.getElementById('jabatan').value,
                    location: document.getElementById('lokasi-kerosakan').value,
                    description: document.getElementById('keterangan-aduan').value,
                    image: imageLinks.length > 1 ? imageLinks : (imageLinks[0] || ""),
                    date: document.getElementById('tarikh-aduan').value,
                    time: document.getElementById('masa-aduan').value,
                    status: 'Baru',
                    timestamp: new Date().toISOString()
                };

                // 5. Save to Server (Using appendRecord for efficiency)
                const success = await API.appendRecord('Aduan', newComplaint);

                if (success) {
                    // Send Notification to Admins
                    await API.sendNotification('new_complaint', {
                        complaintId: newId,
                        name: newComplaint.name,
                        location: newComplaint.location,
                        description: newComplaint.description
                    });

                    if (percentEl) percentEl.textContent = "100%";
                    if (overlay) setTimeout(() => { overlay.style.display = 'none'; }, 500);

                    // Update Modal Content with correct ID
                    if (complaintIdDisplay) complaintIdDisplay.textContent = newId;
                    if (successModal) successModal.style.display = 'flex';

                    resetForm();
                } else {
                    throw new Error("Gagal menyimpan rekod ke Google Sheets.");
                }

            } catch (err) {
                console.error("Submission failed: ", err);
                const overlay = document.getElementById('loading-overlay');
                if (overlay) overlay.style.display = 'none';

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
