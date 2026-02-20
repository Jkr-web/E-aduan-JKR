// CLOCK & WEATHER FUNCTION
// CLOCK & WEATHER FUNCTION
function initClockAndWeather() {
    const clockEl = document.getElementById('digital-clock');
    const dateEl = document.getElementById('current-date');
    const weatherInfoContainer = document.getElementById('weather-info');
    const weatherSpan = weatherInfoContainer ? weatherInfoContainer.querySelector('span') : null;
    const weatherIcon = document.getElementById('weather-icon');

    // 1. Clock & Date
    if (clockEl) {
        const updateTime = () => {
            const now = new Date();

            // Time: 12-hour format
            clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            // Date: Full format (e.g. Wednesday, 19 February 2026)
            if (dateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                // Using Malay locale for consistency
                dateEl.textContent = now.toLocaleDateString('ms-MY', options);
            }
        };
        setInterval(updateTime, 1000);
        updateTime(); // Initial call
    }

    // 2. Weather (Location Detect)
    if (weatherSpan && weatherIcon) {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Using Open-Meteo Free API
                    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                    const data = await response.json();

                    if (data.current_weather) {
                        const temp = data.current_weather.temperature;
                        const code = data.current_weather.weathercode;

                        // Get Location Name
                        let locationName = 'Lokasi Semasa';
                        try {
                            // Using a more lenient geocoding approach or just skipping if it fails
                            const locationRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`, {
                                headers: { 'Accept-Language': 'ms' }
                            });
                            if (locationRes.ok) {
                                const locationData = await locationRes.json();
                                locationName = locationData.address.city ||
                                    locationData.address.town ||
                                    locationData.address.village ||
                                    locationData.address.suburb ||
                                    locationName;
                            }
                        } catch (e) {
                            console.log("Location geocode skipped or failed.");
                        }

                        weatherSpan.textContent = `${locationName}: ${temp}°C`;

                        // Map WMO Weather Codes to Icons
                        // 0: Clear sky
                        // 1, 2, 3: Mainly clear, partly cloudy, and overcast
                        // 45, 48: Fog
                        // 51-55: Drizzle
                        // 61-65: Rain
                        // 71-77: Snow
                        // 95-99: Thunderstorm

                        weatherIcon.className = "fas"; // Reset base class
                        let iconClass = "fa-cloud-sun";
                        let iconColor = "#f39c12";

                        if (code === 0) { iconClass = "fa-sun"; iconColor = "#f1c40f"; }
                        else if (code >= 1 && code <= 3) { iconClass = "fa-cloud-sun"; iconColor = "#f39c12"; }
                        else if (code >= 45 && code <= 48) { iconClass = "fa-smog"; iconColor = "#bdc3c7"; }
                        else if (code >= 51 && code <= 67) { iconClass = "fa-cloud-rain"; iconColor = "#3498db"; }
                        else if (code >= 71 && code <= 77) { iconClass = "fa-snowflake"; iconColor = "#ecf0f1"; }
                        else if (code >= 95 && code <= 99) { iconClass = "fa-bolt"; iconColor = "#e74c3c"; }

                        weatherIcon.classList.add(iconClass);
                        weatherIcon.style.color = iconColor;

                        // Add animation class if available in CSS, otherwise just icon update is fine
                        weatherIcon.style.animation = "pulse 2s infinite";

                    } else {
                        weatherSpan.textContent = "N/A";
                    }
                } catch (error) {
                    console.error("Weather Error:", error);
                    weatherSpan.textContent = "Err";
                }
            }, (error) => {
                console.warn("Geolocation denied or error:", error);
                weatherSpan.textContent = "-";
            });
        } else {
            weatherSpan.textContent = "-";
        }
    }
}

// Image State Management
let currentTaskImages = {
    before: [],
    during: [],
    after: []
};

document.addEventListener('DOMContentLoaded', function () {
    // Initialize Clock and Weather
    initClockAndWeather();

    // Check Authentication
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    if (!userRole || userRole !== 'contractor') {
        // Allow if it's the specific test login case though usually userRole should be correct
        if (!(userRole === 'admin' && userName === 'Super Admin')) {
            window.location.href = 'index.html';
            return;
        }
    }

    // Update Profile Info in Sidebar
    const profileDiv = document.querySelector('.user-profile');
    if (profileDiv) {
        let roleIcon = '<i class="fas fa-hard-hat"></i>';
        if (userRole === 'admin') roleIcon = '<i class="fas fa-user-shield"></i>';

        profileDiv.innerHTML = `${roleIcon} <span style="margin-left: 10px;">${userName || 'Kontraktor'}</span>`;
    }

    // Default logged in from Login session
    showLoadingWithProgress(loadContractorDashboard(userName));

    // Sidebar navigation

    window.switchTab = function (tabId) {
        // Hide all sections
        const sections = document.querySelectorAll('.section');
        sections.forEach(s => s.style.display = 'none');

        // Show target section
        const target = document.getElementById(tabId);
        if (target) target.style.display = 'block';

        // Update active link
        const links = document.querySelectorAll('.sidebar .nav-links a');
        links.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.sidebar .nav-links a[href="#${tabId}"]`);
        if (activeLink) activeLink.classList.add('active');

        // Close sidebar on mobile selection
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');

        if (window.innerWidth <= 768 && sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }

        // Save state
        localStorage.setItem('activeContractorTab', tabId);

        // Auto-refresh data when viewing history or dashboard
        if (tabId === 'history' || tabId === 'dashboard') {
            loadContractorDashboard(localStorage.getItem('userName'));
        }
    }

    // Restore saved tab on load
    const savedTab = localStorage.getItem('activeContractorTab');
    if (savedTab) {
        // Use timeout to ensure elements are ready if needed, identifying that logic is synchronous usually
        window.switchTab(savedTab);
    } else {
        // Ensure default is shown (usually dashboard is default in HTML, but let's be explicit)
        window.switchTab('dashboard');
    }

    // Sidebar Toggle Logic
    const toggleBtn = document.querySelector('.burger-menu');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.toggle('collapsed');
            } else {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            }
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // Logout Functionality
    const logoutBtn = document.querySelector('.logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            window.location.href = 'index.html';
        });
    }


    // HD UPLOAD SETTINGS (Optimized for 15GB Storage)
    const MAX_IMG_WIDTH = 1200; // Sharp HD but efficient
    const MAX_IMG_HEIGHT = 1200;
    const IMG_QUALITY = 0.6; // Set to 60% for even better storage efficiency

    // Live Preview Listeners (Updated for HD Drive Upload)
    const setupLivePreview = (inputId, stage, previewId, completeBtnId = null) => {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('change', async function () {
            if (this.files && this.files.length > 0) {
                // Show Global Loading Overlay
                const overlay = document.getElementById('loading-overlay');
                const percentEl = document.getElementById('loading-percentage');
                const textEl = document.getElementById('loading-text');
                const progressContainer = document.getElementById('upload-progress-container');
                const progressBar = document.getElementById('upload-progress-bar');

                if (overlay) {
                    overlay.style.display = 'flex';
                    if (percentEl) percentEl.textContent = '0%';
                    if (textEl) textEl.textContent = 'Menyediakan Imej...';
                    if (progressContainer) progressContainer.style.display = 'block';
                    if (progressBar) progressBar.style.width = '0%';
                }

                try {
                    const newImages = [];
                    const totalFiles = this.files.length;
                    for (let i = 0; i < totalFiles; i++) {
                        const file = this.files[i];

                        // Update UI to compression phase
                        const basePercent = Math.round((i / totalFiles) * 100);
                        if (percentEl) percentEl.textContent = `${basePercent}%`;
                        if (textEl) textEl.textContent = `Memproses Imej ${i + 1}/${totalFiles}...`;
                        if (progressBar) progressBar.style.width = `${basePercent}%`;

                        // 1. Compress to HD
                        const compressedBase64 = await compressImage(file, MAX_IMG_WIDTH, MAX_IMG_HEIGHT, IMG_QUALITY);

                        // Progress halfway through this file
                        const midPercent = Math.round(((i + 0.5) / totalFiles) * 100);
                        if (percentEl) percentEl.textContent = `${midPercent}%`;
                        if (progressBar) progressBar.style.width = `${midPercent}%`;
                        if (textEl) textEl.textContent = `Mengunggah Imej ${i + 1}/${totalFiles}...`;

                        // 2. Upload straight to Drive
                        const fileName = `${stage}_${Date.now()}_${i}.jpg`;
                        const driveUrl = await API.uploadFile(fileName, compressedBase64);

                        newImages.push(driveUrl);
                    }

                    if (percentEl) percentEl.textContent = '100%';
                    if (progressBar) progressBar.style.width = '100%';
                    setTimeout(() => {
                        if (progressContainer) progressContainer.style.display = 'none';
                        if (progressBar) progressBar.style.width = '0%';
                    }, 500);

                    // Append new images to state (Store URLs, not Base64)
                    if (!currentTaskImages[stage]) currentTaskImages[stage] = [];
                    currentTaskImages[stage] = [...currentTaskImages[stage], ...newImages];

                    renderPreview(previewId, currentTaskImages[stage], stage);
                    if (completeBtnId || stage === 'after') {
                        const hasAfter = currentTaskImages.after.length > 0;
                        const btn = document.getElementById('btn-complete-task');
                        if (btn) btn.style.display = hasAfter ? 'inline-block' : 'none';
                        const completionContainer = document.getElementById('completion-time-container');
                        if (completionContainer) completionContainer.style.display = hasAfter ? 'block' : 'none';
                    }
                } catch (err) {
                    console.error("HD Upload Error:", err);
                    alert("Ralat memuat naik gambar HD ke Drive: " + err.message);
                } finally {
                    if (overlay) {
                        setTimeout(() => { overlay.style.display = 'none'; }, 500);
                    }
                    this.value = '';
                }
            }
        });
    };

    setupLivePreview('file-before', 'before', 'preview-before');
    setupLivePreview('camera-before', 'before', 'preview-before');

    setupLivePreview('file-during', 'during', 'preview-during');
    setupLivePreview('camera-during', 'during', 'preview-during');

    setupLivePreview('file-after', 'after', 'preview-after', 'btn-complete-task');
    setupLivePreview('camera-after', 'after', 'preview-after', 'btn-complete-task');
});


window.loadContractorDashboard = async function (contractorName) {
    const welcomeEl = document.getElementById('welcome-msg');
    if (welcomeEl) welcomeEl.textContent = `Selamat Datang, ${contractorName}`;

    try {
        const data = await API.getAll();
        // Update global cache
        window.allComplaints = data.complaints || [];

        const allComplaints = data.complaints || [];

        // Sync for consistency
        // localStorage.setItem('complaints', JSON.stringify(allComplaints));

        // FILTER: Only show complaints assigned to this contractor
        // Using flexible matching for both key name (contractor/Kontraktor) and value (casing/spaces)
        const myTasks = allComplaints.filter(c => {
            const assignedContractor = (c.contractor || c.Kontraktor || "").toString().toLowerCase().trim();
            const targetName = (contractorName || "").toString().toLowerCase().trim();
            return assignedContractor === targetName;
        });

        // Calculate Stats
        const newTasks = myTasks.filter(c => c.status === 'Tindakan Kontraktor' || c.status === 'Aduan Diterima').length;
        const completed = myTasks.filter(c => c.status === 'Selesai').length;
        const inProgress = myTasks.filter(c => c.status === 'Sedang Dibaiki Oleh Kontraktor' || c.status === 'Dalam Proses').length; // Support legacy 'Dalam Proses' just in case

        document.getElementById('stat-new').textContent = newTasks;
        document.getElementById('stat-progress').textContent = inProgress;
        document.getElementById('stat-completed').textContent = completed;

        // Update Notification Badge
        const badge = document.getElementById('notif-badge');
        if (badge) {
            if (newTasks > 0) {
                badge.textContent = newTasks;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

        // Render Tables
        renderTaskTable(myTasks);
        renderHistoryTable(myTasks);

        // Render Notifications
        renderContractorNotifications(myTasks);

    } catch (err) {
        console.error("Error loading dashboard:", err);
    }
};

function renderContractorNotifications(tasks) {
    const list = document.getElementById('notification-list');
    if (!list) return;

    // Filter tasks that are new (Tindakan Kontraktor)
    const newTasks = tasks.filter(t => t.status === 'Tindakan Kontraktor');

    // Sort by timestamp newest first
    newTasks.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    if (newTasks.length === 0) {
        list.innerHTML = '<li style="padding: 15px; text-align: center; color: #999;">Tiada notifikasi terkini.</li>';
        return;
    }

    list.innerHTML = '';

    // Show top 3 notifications
    newTasks.slice(0, 3).forEach(task => {
        const timeAgo = getTimeAgo(task.timestamp);

        // Generate a display ID (same logic as table for consistency)
        const contractorStr = task.contractor || 'SYK';
        const initials = (contractorStr.match(/\b\w/g) || ['S', 'Y', 'K']).slice(0, 3).join('').toUpperCase();
        const year = task.timestamp ? new Date(task.timestamp).getFullYear() : new Date().getFullYear();
        // Since we don't have the sequence index here easily, we'll use the ID or a short hash
        const shortId = (task.id || '0000').toString().slice(-4);
        const displayId = `${initials}-${shortId}/${year}`;

        const li = document.createElement('li');
        li.style.cssText = "padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 15px; animation: fadeIn 0.5s ease;";
        li.innerHTML = `
            <span style="width: 10px; height: 10px; background: #e67e22; border-radius: 50%; flex-shrink: 0;"></span>
            <div style="flex: 1;">
                <div style="font-size: 0.95em; color: #333;">
                    Tugasan <strong>${displayId}</strong> baru diterima.
                    <div style="font-size: 0.8em; color: #e67e22; margin-top: 2px;">
                       Diberi pada: ${formatDisplayDate(task['tarikh lantikan'] || task.assignedDate)}
                    </div>
                </div>
                <div style="font-size: 0.8em; color: #7f8c8d; margin-top: 2px;">
                    <i class="far fa-clock"></i> ${timeAgo}
                </div>
            </div>
        `;
        list.appendChild(li);
    });
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'Baru sahaja';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Baru sahaja';
    if (diffMins < 60) return `${diffMins} minit lepas`;
    if (diffHours < 24) return `${diffHours} jam lepas`;

    return past.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit' });
}

function renderTaskTable(tasks) {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #95a5a6; background: #fff; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <i class="fas fa-folder-open" style="font-size: 3em; margin-bottom: 15px; display: block;"></i>
                Tiada tugasan aktif untuk syarikat anda buat masa ini.
            </div>`;
        return;
    }

    // Sort by date (newest first)
    tasks.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    tasks.forEach((task, index) => {
        let statusColor = '#95a5a6';
        let statusLabel = task.status;

        if (task.status === 'Tindakan Kontraktor') {
            statusColor = '#e67e22';
            statusLabel = 'Tindakan Diperlukan';
        } else if (task.status === 'Sedang Dibaiki Oleh Kontraktor' || task.status === 'Dalam Proses') {
            statusColor = '#3498db';
            statusLabel = 'Dalam Proses';
        } else if (task.status === 'Selesai') {
            statusColor = '#27ae60';
            statusLabel = 'Selesai';
        }

        const dateObj = task.timestamp ? new Date(task.timestamp) : new Date();
        const year = dateObj.getFullYear();
        const contractorStr = task.contractor || 'SYK';
        const initials = (contractorStr.match(/\b\w/g) || ['S', 'Y', 'K']).slice(0, 3).join('').toUpperCase();
        const seqNum = String(tasks.length - index).padStart(4, '0');
        const displayId = `${initials}-${seqNum}/${year}`;

        const card = document.createElement('div');
        card.style.cssText = "background: #fff; border-left: 5px solid " + statusColor + "; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.08); overflow: hidden; display: flex; flex-direction: column; margin-bottom: 20px;";

        card.innerHTML = `
            <!-- Card Header -->
            <div style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fafafa;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 800; color: #2c3e50; font-size: 1.1rem;"># ${displayId}</span>
                    ${task.isVerified ? `<i class="fas fa-check-circle" style="color: #27ae60; font-size: 1.2rem;" title="Telah Diperiksa & Disahkan"></i>` : ''}
                </div>
                <span style="background: ${statusColor}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    ${statusLabel}
                </span>
            </div>

            <!-- Card Body -->
            <div style="padding: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <small style="color: #95a5a6; text-transform: uppercase; font-weight: 700; font-size: 10px;">Butiran Aduan</small>
                        <p style="margin: 5px 0 0 0; color: #333; font-weight: 500;">${task.description || '-'}</p>
                    </div>
                    <div>
                        <small style="color: #95a5a6; text-transform: uppercase; font-weight: 700; font-size: 10px;">Lokasi</small>
                        <p style="margin: 5px 0 0 0; color: #333; font-weight: 500;"><i class="fas fa-map-marker-alt" style="color: #e74c3c; margin-right: 5px;"></i> ${task.location || '-'}</p>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #eee; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div>
                        <small style="color: #95a5a6; text-transform: uppercase; font-weight: 700; font-size: 10px;">Arahan JKR Admin</small>
                        <p style="margin: 5px 0 0 0; color: #555; font-style: italic; background: #fdfaf5; padding: 10px; border-radius: 6px; border-left: 3px solid #f39c12;">
                            ${task.taskDescription || 'Tiada arahan khusus disediakan.'}
                        </p>
                    </div>
                    <div>
                        <small style="color: #95a5a6; text-transform: uppercase; font-weight: 700; font-size: 10px;">Pegawai & Tarikh Tugas</small>
                        <p style="margin: 5px 0 0 0; color: #d35400; font-weight: 600; font-size: 0.9rem;">
                            <i class="fas fa-user-tie"></i> ${task.assignedBy ? task.assignedBy.name : (task.adminName || 'Admin JKR')}
                        </p>
                        <p style="margin: 2px 0 0 0; color: #2c3e50; font-weight: 700; font-size: 0.85rem;">
                            <i class="far fa-calendar-alt"></i> Diberi: ${formatDisplayDate(task['tarikh lantikan'] || task.assignedDate)}
                        </p>
                        ${task.assignedBy ? `<small style="color: #666;">${task.assignedBy.position} | ${task.assignedBy.phone}</small>` : '<small style="color: #666;">Maklumat tambahan tidak tersedia</small>'}
                    </div>
                </div>
            </div>

            <!-- Card Footer / Action Buttons -->
            <div style="padding: 15px 20px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
                ${task.status === 'Tindakan Kontraktor' ? `
                    <button onclick="clockIn('${task.id}')" 
                        style="flex: 1; min-width: 120px; max-width: 180px; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: background 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-clock"></i> Clock In
                    </button>
                    <button disabled 
                        style="flex: 1; min-width: 120px; max-width: 180px; padding: 10px; background: #bdc3c7; color: white; border: none; border-radius: 6px; cursor: not-allowed; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;"
                        title="Sila Clock In dahulu">
                        <i class="fas fa-edit"></i> Kemaskini
                    </button>
                ` : `
                    <button onclick="openUpdateModal('${task.id}')" 
                        style="flex: 1; min-width: 150px; max-width: 250px; padding: 10px; background: #3498db; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: background 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-edit"></i> Kemaskini Tugasan
                    </button>
                `}
            </div>
        `;
        container.appendChild(card);
    });
}

// Clock In Function
// Clock In Function
window.clockIn = async function (id) {
    if (!confirm("Adakah anda pasti mahu memulakan tugasan ini (Clock In)?")) return;

    try {
        const data = await API.getAll();
        const complaints = data.complaints || [];
        // Loose check for ID
        const index = complaints.findIndex(c => c.id == id);

        if (index !== -1) {
            complaints[index].status = 'Sedang Dibaiki Oleh Kontraktor';

            // Format to Human Readable: YYYY-MM-DD HH:MM
            const now = new Date();
            const d = now.toLocaleDateString('en-CA');
            const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            complaints[index].dateReceived = `${d} ${t}`; // Record Start Date-Time

            await API.saveAll(data);

            // Show success
            alert(`Clock In Berjaya: Tugasan ${id} kini Sedang Dibaiki Oleh Kontraktor.`);
            loadContractorDashboard(localStorage.getItem('userName'));
        } else {
            alert("Tugasan tidak dijumpai.");
        }
    } catch (e) {
        console.error("Clock In API Error:", e);
        alert("Gagal mengemaskini status. Sila cuba lagi.");
    }
}

// Modal Functions
// Modal Functions
// Modal Functions
window.openUpdateModal = async function (id) {
    // 0. RESET MODAL STATE (Enable all, show all)
    const modal = document.getElementById('update-task-modal');
    if (modal) {
        modal.querySelectorAll('textarea').forEach(t => t.disabled = false);
        modal.querySelectorAll('button[type="button"]').forEach(b => b.style.display = ''); // Reset to default
        const title = modal.querySelector('h3');
        if (title) title.innerHTML = 'Kemaskini Tugasan';

        // Ensure buttons that are logic-dependent are hidden initially
        const btnComplete = document.getElementById('btn-complete-task');
        const btnClockIn = document.getElementById('btn-clock-in');
        if (btnComplete) btnComplete.style.display = 'none';
        if (btnClockIn) btnClockIn.style.display = 'none';
    }

    let complaint = null;

    // 1. Try Global Cache First
    if (window.allComplaints && Array.isArray(window.allComplaints)) {
        complaint = window.allComplaints.find(c => c.id == id);
    }

    // 2. Fetch if not found
    if (!complaint) {
        try {
            const data = await API.getAll();
            window.allComplaints = data.complaints || []; // Update Cache
            complaint = window.allComplaints.find(c => c.id == id);
        } catch (e) {
            console.error("Fetch Error:", e);
            alert("Ralat sambungan. Sila periksa internet anda.");
            return;
        }
    }

    if (complaint) {
        document.getElementById('task-id').value = complaint.id;

        // Populate Read-Only Details
        const safeText = (text) => text || '-';
        document.getElementById('modal-display-id').textContent = safeText(complaint.id);

        // Fix Date & Time Format
        const fullDate = `${complaint.date || ''} ${complaint.time || ''}`.trim();
        document.getElementById('modal-display-date').textContent = formatDisplayDate(fullDate);

        document.getElementById('modal-display-name').textContent = safeText(complaint.name);
        document.getElementById('modal-display-phone').textContent = safeText(complaint.phone);
        document.getElementById('modal-display-location').textContent = safeText(complaint.location);
        document.getElementById('modal-display-desc').textContent = complaint.description || 'Tiada keterangan.';

        // Image Handling (Main Complaint Image)
        const imgContainer = document.getElementById('modal-image-container');
        const imgEl = document.getElementById('modal-display-image');
        if (complaint.image) {
            imgEl.src = complaint.image;
            imgContainer.style.display = 'block';
        } else {
            imgContainer.style.display = 'none';
        }

        // --- POPULATE OFFICER INFO ---
        const officerContainer = document.getElementById('modal-officer-container');
        if (complaint.assignedBy) {
            officerContainer.style.display = 'block';
            document.getElementById('modal-officer-name').textContent = complaint.assignedBy.name || '-';
            document.getElementById('modal-officer-position').textContent = complaint.assignedBy.position || '-';
            document.getElementById('modal-officer-phone').textContent = complaint.assignedBy.phone || '-';
            document.getElementById('modal-officer-email').textContent = complaint.assignedBy.email || '-';

            const assignedDateEl = document.getElementById('modal-assigned-date');
            if (assignedDateEl) assignedDateEl.textContent = complaint.assignedDate || '-';
        } else {
            const assignedDateEl = document.getElementById('modal-assigned-date');
            if (assignedDateEl) assignedDateEl.textContent = formatDisplayDate(complaint['tarikh lantikan'] || complaint.assignedDate);
            officerContainer.style.display = 'block'; // Show anyway if we have assignedDate
            if (!complaint.assignedBy) {
                document.getElementById('modal-officer-name').textContent = 'Admin JKR';
            }
        }

        // Initialize Manual Completion Date/Time
        const now = new Date();
        document.getElementById('complete-date-manual').value = now.toISOString().split('T')[0];
        document.getElementById('complete-time-manual').value = now.toTimeString().split(' ')[0].substring(0, 5);

        // --- POPULATE PROGRESS FIELDS ---
        const progress = complaint.progress || {};

        // Initialize local state
        currentTaskImages = {
            before: progress.before?.images || [],
            during: progress.during?.images || [],
            after: progress.after?.images || []
        };

        // Before
        document.getElementById('notes-before').value = progress.before?.notes || '';
        renderPreview('preview-before', currentTaskImages.before, 'before');

        // During
        document.getElementById('notes-during').value = progress.during?.notes || '';
        renderPreview('preview-during', currentTaskImages.during, 'during');

        // After
        document.getElementById('notes-after').value = progress.after?.notes || '';
        renderPreview('preview-after', currentTaskImages.after, 'after');

        // Visibility of Complete Button
        const btnComplete = document.getElementById('btn-complete-task');
        const btnClockIn = document.getElementById('btn-clock-in');

        if (btnComplete) {
            const hasAfter = currentTaskImages.after.length > 0;
            btnComplete.style.display = hasAfter ? 'inline-block' : 'none';
            const completionContainer = document.getElementById('completion-time-container');
            if (completionContainer) completionContainer.style.display = hasAfter ? 'block' : 'none';
        }

        if (btnClockIn) {
            // Only show clock-in if status is 'Tindakan Kontraktor'
            btnClockIn.style.display = (complaint.status === 'Tindakan Kontraktor') ? 'inline-block' : 'none';
        }

        document.getElementById('update-task-modal').style.display = 'flex';
    } else {
        alert("Tugasan tidak dijumpai.");
    }
};

// Updated Render Preview with Delete Button
function renderPreview(containerId, images, stage) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (images && Array.isArray(images)) {
        images.forEach((src, index) => {
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; display: inline-block; margin: 5px;';

            const img = document.createElement('img');
            img.src = src;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            img.style.border = '1px solid #ddd';

            // Delete Button
            const btnDelete = document.createElement('button');
            btnDelete.className = 'delete-btn'; // Added class for easy hiding
            btnDelete.innerHTML = '&times;';
            btnDelete.style.cssText = 'position: absolute; top: -5px; right: -5px; background: red; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
            btnDelete.onclick = function () { deleteImage(stage, index, containerId); };

            wrapper.appendChild(img);
            wrapper.appendChild(btnDelete);
            container.appendChild(wrapper);
        });
    }
}

// Delete Image Function
window.deleteImage = function (stage, index, containerId) {
    if (confirm("Adakah anda pasti mahu memadam imej ini?")) {
        currentTaskImages[stage].splice(index, 1);
        renderPreview(containerId, currentTaskImages[stage], stage);

        // Check for complete button visibility
        // Check for complete button visibility and manual time container
        if (stage === 'after') {
            const hasAfter = currentTaskImages.after.length > 0;
            const btnComplete = document.getElementById('btn-complete-task');
            if (btnComplete) btnComplete.style.display = hasAfter ? 'inline-block' : 'none';

            const completionContainer = document.getElementById('completion-time-container');
            if (completionContainer) completionContainer.style.display = hasAfter ? 'block' : 'none';
        }
    }
};

window.closeUpdateModal = function () {
    document.getElementById('update-task-modal').style.display = 'none';
    // Reset complete button
    document.getElementById('btn-complete-task').style.display = 'none';
}

// Handle Form Submission (Update vs Complete)
window.submitProgress = async function (action) {
    const id = document.getElementById('task-id').value;

    // Get Text Notes
    const notesBefore = document.getElementById('notes-before').value;
    const notesDuring = document.getElementById('notes-during').value;
    const notesAfter = document.getElementById('notes-after').value;

    // Get File Inputs
    const fileBefore = document.getElementById('file-before').files;
    const fileDuring = document.getElementById('file-during').files;
    const fileAfter = document.getElementById('file-after').files;

    // Validate File Sizes (limit 10MB per file)
    const validateFiles = (files) => {
        for (let i = 0; i < files.length; i++) {
            if (files[i].size > 10 * 1024 * 1024) return false;
        }
        return true;
    };

    if (!validateFiles(fileBefore) || !validateFiles(fileDuring) || !validateFiles(fileAfter)) {
        alert("Saiz fail terlalu besar. Sila pastikan setiap imej di bawah 10MB.");
        return;
    }

    const btnUpdate = document.getElementById('btn-update-task');
    const btnComplete = document.getElementById('btn-complete-task');
    const btnClockIn = document.getElementById('btn-clock-in');

    const originalTextUpdate = btnUpdate ? btnUpdate.textContent : 'Simpan Kemaskini';
    const originalTextComplete = btnComplete ? btnComplete.textContent : 'Tugasan Selesai';
    const originalTextClockIn = btnClockIn ? btnClockIn.textContent : 'Mula Kerja';

    if (btnUpdate) { btnUpdate.textContent = 'Menghantar...'; btnUpdate.disabled = true; }
    if (btnComplete) { btnComplete.textContent = 'Menghantar...'; btnComplete.disabled = true; }
    if (btnClockIn) { btnClockIn.textContent = 'Menghantar...'; btnClockIn.disabled = true; }

    try {
        // Use cached data if available to avoid heavy API.getAll() call
        let complaints = window.allComplaints || [];

        // If cache empty, try to fetch once, but if it fails here, we know its a download size issue
        if (complaints.length === 0) {
            const data = await API.getAll();
            complaints = data.complaints || [];
            window.allComplaints = complaints;
        }

        const index = complaints.findIndex(c => c.id == id);

        if (index !== -1) {
            // Shallow clone to avoid modifying cache until save success
            let complaint = { ...complaints[index] };

            // Ensure progress object and its sub-objects exist
            if (!complaint.progress) complaint.progress = {};
            if (!complaint.progress.before) complaint.progress.before = {};
            if (!complaint.progress.during) complaint.progress.during = {};
            if (!complaint.progress.after) complaint.progress.after = {};

            let progress = complaint.progress;

            // Update Notes
            progress.before.notes = notesBefore;
            progress.during.notes = notesDuring;
            progress.after.notes = notesAfter;

            // Use local state for images (which allowed additions/deletions)
            progress.before.images = currentTaskImages.before;
            progress.during.images = currentTaskImages.during;
            progress.after.images = currentTaskImages.after;

            complaint.progress = progress;
            complaint.contractorNotes = notesDuring || notesAfter || notesBefore; // Legacy fallback

            // STATUS LOGIC
            let statusChanged = false;
            let finalStatus = action === 'complete' ? 'Selesai' : (action === 'clock-in' ? 'Sedang Dibaiki Oleh Kontraktor' : complaint.status);

            if (complaint.status !== finalStatus) {
                complaint.status = finalStatus;
                statusChanged = true;
            }

            if (action === 'clock-in') {
                complaint.dateReceived = new Date().toISOString(); // Record when work actually started
            }

            if (action === 'complete') {
                // Check Validation: Must have After Images
                const hasAfterImages = (progress.after.images && progress.after.images.length > 0);

                if (!hasAfterImages) {
                    alert("Sila muat naik 'Gambar Selesai' sebelum menanda tugasan sebagai selesai.");
                    return;
                }

                // complaint.status = 'Selesai'; (Handled by finalStatus)
                const manualDate = document.getElementById('complete-date-manual').value;
                const manualTime = document.getElementById('complete-time-manual').value;

                if (manualDate && manualTime) {
                    complaint.dateCompleted = `${manualDate} ${manualTime}`;
                } else {
                    const now = new Date();
                    const d = now.toLocaleDateString('en-CA');
                    const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    complaint.dateCompleted = `${d} ${t}`;
                }

                // Recalculate duration
                if (complaint.dateReceived) {
                    const start = new Date(complaint.dateReceived);
                    const end = new Date(complaint.dateCompleted);
                    const diffMs = end - start;
                    const diffHours = diffMs / (1000 * 60 * 60);

                    if (diffHours < 24) {
                        const hours = Math.floor(diffHours);
                        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        complaint.duration = `${hours} Jam ${minutes} Minit`;
                    } else {
                        const days = Math.floor(diffHours / 24);
                        const remainingHours = Math.floor(diffHours % 24);
                        complaint.duration = `${days} Hari ${remainingHours} Jam`;
                    }
                }
            }

            try {
                // Show Loading Overlay
                const overlay = document.getElementById('loading-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                    document.getElementById('loading-percentage').textContent = '90%';
                    document.querySelector('.loading-text').textContent = 'Menyimpan Rekod...';
                }

                // EXTREMELY IMPORTANT: We use updateRecord to only send THIS complaint
                // This prevents "Failed to Fetch" by not sending the entire database
                const success = await API.updateRecord('Aduan', 'id', id, complaint);

                if (!success) throw new Error("Gagal mengemaskini rekod di server.");

                // NOTIFICATIONS
                if (action === 'clock-in') {
                    // Notify Admin
                    await API.sendNotification('clock_in', {
                        complaintId: id,
                        contractorName: complaint.contractor
                    });
                    // Notify User
                    await API.sendNotification('status_update', {
                        complaintId: id,
                        userName: complaint.name,
                        userEmail: complaint.email,
                        newStatus: 'Sedang Dibaiki Oleh Kontraktor',
                        updateBy: complaint.contractor
                    });
                } else if (action === 'complete') {
                    // Notify User
                    await API.sendNotification('status_update', {
                        complaintId: id,
                        userName: complaint.name,
                        userEmail: complaint.email,
                        newStatus: 'Selesai (Menunggu Pengesahan)',
                        updateBy: complaint.contractor
                    });
                }

                alert(action === 'complete' ? `Tahniah! Tugasan ${id} telah diselesaikan.` : (action === 'clock-in' ? `Tugasan ${id} telah bermula (Clock-in).` : `Perkembangan tugasan ${id} dikemaskini.`));
            } catch (e) {
                console.error("API Update Error:", e);
                alert("RALAT SIMPAN: " + e.message);
                return;
            }
        } else {
            alert("Ralat: Tugasan tidak dijumpai di dalam pangkalan data. Sila muat semula halaman.");
        }

        closeUpdateModal();
        // Refresh View
        loadContractorDashboard(localStorage.getItem('userName'));

    } catch (e) {
        console.error("Submit Progress Error:", e);
        alert("Ralat memproses data: " + e.message);
    } finally {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            document.getElementById('loading-percentage').textContent = '100%';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }

        // Restore Buttons
        if (btnUpdate) { btnUpdate.textContent = originalTextUpdate; btnUpdate.disabled = false; }
        if (btnComplete) { btnComplete.textContent = originalTextComplete; btnComplete.disabled = false; }
        if (btnClockIn) { btnClockIn.textContent = originalTextClockIn; btnClockIn.disabled = false; }
    }
};
// Helper for refresh
window.updateContractorView = function () {
    loadContractorDashboard(localStorage.getItem('userName'));
};

// Image Compression Function is now inside the closure or defined previously
// Removing duplicate processFiles to avoid conflict if any

/**
 * Image Compression Function
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Max width of resized image
 * @param {number} maxHeight - Max height of resized image
 * @param {number} quality - JPEG quality (0 to 1)
 */
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

                // Calculate aspect ratio and new dimensions
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

                // Export as compressed JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Live Sync Simulation: Listen for changes in other tabs (Admin updates)
window.addEventListener('storage', function (e) {
    if (e.key === 'complaints') {
        console.log('Contractor Board: Data update detected from Admin. Refreshing...');
        // Wait a small moment to ensure write complete if needed, then reload
        setTimeout(() => updateContractorView(), 100);
    }
});

/**
 * Loading Animation with Percentage
 * @param {Promise} promise - The API call promise
 */
async function showLoadingWithProgress(promise) {
    const overlay = document.getElementById('loading-overlay');
    const percentEl = document.getElementById('loading-percentage');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressContainer = document.getElementById('upload-progress-container');

    if (!overlay || !percentEl) return await promise;

    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    overlay.style.visibility = 'visible';
    if (progressContainer) progressContainer.style.display = 'block';

    let progress = 0;
    const interval = setInterval(() => {
        if (progress < 90) {
            progress += Math.random() * 15; // Fast start
            if (progress > 90) progress = 90;
            const p = Math.round(progress);
            percentEl.textContent = p + '%';
            if (progressBar) progressBar.style.width = p + '%';
        }
    }, 150);

    try {
        const result = await promise;
        clearInterval(interval);
        percentEl.textContent = '100%';
        if (progressBar) progressBar.style.width = '100%';

        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => {
                overlay.style.display = 'none';
                if (progressContainer) progressContainer.style.display = 'none';
                if (progressBar) progressBar.style.width = '0%';
            }, 500);
        }, 300);

        return result;
    } catch (error) {
        clearInterval(interval);
        overlay.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        console.error("Loading error:", error);
        throw error;
    }
}
// --- HISTORY FUNCTIONS ---

let historyData = []; // Store current filtered history

window.renderHistoryTable = function (tasks) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    // Filter for completed/history tasks (Selesai status)
    const completedTasks = tasks.filter(t => t.status === 'Selesai');
    historyData = [...completedTasks]; // Update local state for filtering

    displayHistory(historyData);
};

function displayHistory(tasks) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: #95a5a6;">Tiada rekod sejarah dijumpai.</td></tr>';
        return;
    }

    // Sort by completion date if available, otherwise by timestamp
    tasks.sort((a, b) => new Date(b.progress?.after?.timestamp || b.timestamp) - new Date(a.progress?.after?.timestamp || a.timestamp));

    tasks.forEach(task => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #eee';

        const completionDate = task.progress?.after?.timestamp ? new Date(task.progress.after.timestamp).toLocaleDateString('ms-MY') : '-';
        const duration = task.duration || '-';

        // Generate Display ID (Initials-Seq/Year)
        const contractorStr = task.contractor || 'SYK';
        const initials = (contractorStr.match(/\b\w/g) || ['S', 'Y', 'K']).slice(0, 3).join('').toUpperCase();
        const year = task.timestamp ? new Date(task.timestamp).getFullYear() : new Date().getFullYear();
        const shortId = (task.id || '0000').toString().slice(-4);
        const displayId = `${initials}-${shortId}/${year}`;

        tr.innerHTML = `
            <td style="padding: 15px; font-weight: 600; color: #34495e;">${displayId}</td>
            <td style="padding: 15px;">
                <div style="font-weight: 500; color: #2c3e50;">${task.name}</div>
                <div style="font-size: 0.85em; color: #7f8c8d;"><i class="fas fa-map-marker-alt"></i> ${task.location}</div>
            </td>
            <td style="padding: 15px; color: #2c3e50;">${formatDisplayDate(task.dateCompleted || task.progress?.after?.timestamp)}</td>
            <td style="padding: 15px; color: #2c3e50;">${duration}</td>
            <td style="padding: 15px;">
                <span style="padding: 4px 10px; background: #e8f5e9; color: #2e7d32; border-radius: 20px; font-size: 0.8em; font-weight: 600;">SIAP</span>
                ${task.isVerified ? '<br><span style="font-size: 0.7em; color: #3498db; font-weight: 600;"><i class="fas fa-check-double"></i> DISAHKAN</span>' : ''}
            </td>
            <td style="padding: 15px; text-align: center;">
                <button onclick="viewHistoryDetail('${task.id}')" style="background: none; border: none; color: #3498db; cursor: pointer; font-weight: 600; font-size: 0.9em;">
                    <i class="fas fa-eye"></i> Lihat
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterHistory = function () {
    const start = document.getElementById('filter-date-start').value;
    const end = document.getElementById('filter-date-end').value;

    if (!start && !end) {
        alert("Sila pilih tarikh.");
        return;
    }

    let filtered = historyData;

    if (start) {
        filtered = filtered.filter(t => {
            const date = new Date(t.progress?.after?.timestamp || t.timestamp);
            return date >= new Date(start);
        });
    }

    if (end) {
        // Add one day to end date to include the whole day
        const endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1);
        filtered = filtered.filter(t => {
            const date = new Date(t.progress?.after?.timestamp || t.timestamp);
            return date < endDate;
        });
    }

    displayHistory(filtered);
};

window.resetHistoryFilter = function () {
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    displayHistory(historyData);
};

window.viewHistoryDetail = function (id) {
    // We can reuse the existing update modal but set it to READ-ONLY mode
    openUpdateModal(id).then(() => {
        const modal = document.getElementById('update-task-modal');
        if (!modal) return;

        // 1. Disable all textareas
        modal.querySelectorAll('textarea').forEach(t => t.disabled = true);

        // 2. Hide all buttons EXCEPT the "Batal" (used as Close)
        modal.querySelectorAll('button[type="button"]').forEach(btn => {
            const oc = btn.getAttribute('onclick') || '';
            if (oc.includes('closeUpdateModal')) {
                btn.innerHTML = 'Tutup'; // Change Cancel to Close
                btn.style.display = 'inline-block';
            } else {
                btn.style.display = 'none'; // Hide Camera, Gallery, and Save buttons
            }
        });

        // 3. Update Title to Info Mode
        const title = modal.querySelector('h3');
        if (title) title.innerHTML = '<i class="fas fa-info-circle" style="color:#3498db;"></i> Butiran Sejarah Tugasan (Paparan Sahaja)';

        // 4. Hide delete icons on previews
        modal.querySelectorAll('.delete-btn').forEach(d => d.style.display = 'none');

        // 5. Hide the Upload Action Buttons (Gallery/Camera) containers
        modal.querySelectorAll('div[style*="display: flex; gap: 10px; margin-bottom: 10px;"]').forEach(div => {
            div.style.display = 'none';
        });

        // 6. Ensure inputs are hidden (just in case)
        modal.querySelectorAll('input[type="file"]').forEach(i => i.style.display = 'none');
    });
};

window.printHistory = function () {
    const printContainer = document.getElementById('print-container');
    if (!printContainer) return;

    const initials = (localStorage.getItem('userName') || 'SYK').match(/\b\w/g).slice(0, 3).join('').toUpperCase();
    const now = new Date().toLocaleDateString('ms-MY');

    let tableRows = '';
    const visibleTasks = historyData.filter(t => {
        // Re-apply current visible filters
        const start = document.getElementById('filter-date-start').value;
        const end = document.getElementById('filter-date-end').value;
        const date = new Date(t.progress?.after?.timestamp || t.timestamp);
        let ok = true;
        if (start && date < new Date(start)) ok = false;
        if (end) {
            const eDate = new Date(end); eDate.setDate(eDate.getDate() + 1);
            if (date >= eDate) ok = false;
        }
        return ok;
    });

    visibleTasks.forEach((t, i) => {
        const date = t.progress?.after?.timestamp ? new Date(t.progress.after.timestamp).toLocaleDateString('ms-MY') : '-';
        tableRows += `
            <tr>
                <td>${i + 1}</td>
                <td>${t.id}</td>
                <td>${t.name}</td>
                <td>${t.location}</td>
                <td>${date}</td>
                <td>${t.duration || '-'}</td>
                <td>${t.isVerified ? 'DISAHKAN' : 'SIAP'}</td>
            </tr>
        `;
    });

    printContainer.innerHTML = `
        <div style="padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; color: #333;">
            <div style="text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="margin: 0; color: #2c3e50; text-transform: uppercase;">LAPORAN SEJARAH TUGASAN</h1>
                <h3 style="margin: 5px 0 0 0; color: #7f8c8d;">${localStorage.getItem('userName')}</h3>
                <p style="margin: 10px 0 0 0; font-size: 0.9em;">Tarikh Laporan: ${now}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #f1f2f6;">
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">No.</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">ID Aduan</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Pengadu</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Lokasi</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Tarikh Siap</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Tempoh</th>
                        <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>

            <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                <div style="text-align: center; width: 200px;">
                    <div style="border-bottom: 1px solid #333; height: 60px; margin-bottom: 5px;"></div>
                    <p style="margin: 0; font-weight: 600;">Disediakan Oleh</p>
                    <p style="margin: 0; font-size: 0.8em; color: #666;">(Pihak Kontraktor)</p>
                </div>
                <div style="text-align: center; width: 200px;">
                    <div style="border-bottom: 1px solid #333; height: 60px; margin-bottom: 5px;"></div>
                    <p style="margin: 0; font-weight: 600;">Disahkan Oleh</p>
                    <p style="margin: 0; font-size: 0.8em; color: #666;">(Pihak Admin JKR)</p>
                </div>
            </div>
        </div>
    `;

    // Print Logic
    const originalContent = document.body.innerHTML;
    const printContent = printContainer.innerHTML;

    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore event listeners
};

window.downloadHistoryPDF = function () {
    // Since we don't have jspdf, we'll use the same print container 
    // but tell the user to "Save as PDF" which is standard in browsers.
    alert("Sila pilih 'Semat sebagai PDF' (Save as PDF) pada destinasi pencetak anda.");
    printHistory();
};

/**
 * HELPER: Format Date and Time for display (Robust version)
 */
function formatDisplayDate(dateStr) {
    if (!dateStr || dateStr === '-') return '-';

    // Handle concatenated ISO strings (e.g., "ISO1 ISO2")
    if (typeof dateStr === 'string' && dateStr.includes('T') && dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
            try {
                const datePart = new Date(parts[0]);
                const timePart = new Date(parts[1]);
                if (!isNaN(datePart.getTime()) && !isNaN(timePart.getTime())) {
                    const d = datePart.toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    const t = timePart.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: true });
                    return `${d}, ${t}`;
                }
            } catch (e) { }
        }
    }

    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;

        if (dateStr.toString().includes('T') || dateStr.toString().includes('Z') || dateStr.toString().includes(':')) {
            return date.toLocaleString('ms-MY', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        }
        return dateStr;
    } catch (e) {
        return dateStr;
    }
}
