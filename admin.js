document.addEventListener('DOMContentLoaded', () => {
    // Initialize Clock & Weather
    initClockAndWeather();

    // Global Data Cache (Replaces localStorage)
    window.allComplaints = [];
    window.allContractors = [];
    window.allAdmins = [];

    // 0. SAFETY: Force hide loading overlay after 3 seconds (failsafe)
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
            console.warn("Safety trigger: Forced overlay removal (3s)");
        }
    }, 3000);

    // 1. INITIALIZE SETTINGS (FONT SIZE)
    const savedFontSize = localStorage.getItem('setting-font-size') || '14';
    document.documentElement.style.setProperty('--base-font-size', savedFontSize + 'px');

    // Update Slider in UI if it exists
    const fontSizeSlider = document.getElementById('setting-font-size');
    const fontSizeValDisplay = document.getElementById('font-size-value');
    if (fontSizeSlider) {
        fontSizeSlider.value = savedFontSize;
        if (fontSizeValDisplay) fontSizeValDisplay.textContent = savedFontSize + 'px';

        // Live change listener
        fontSizeSlider.addEventListener('input', function () {
            const val = this.value;
            if (fontSizeValDisplay) fontSizeValDisplay.textContent = val + 'px';
            document.documentElement.style.setProperty('--base-font-size', val + 'px');
        });
    }

    // Handle Settings Form Submission
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newSize = document.getElementById('setting-font-size').value;
            const systemName = document.getElementById('setting-system-name').value;

            localStorage.setItem('setting-font-size', newSize);
            // You could also save system name here if needed

            alert("Tetapan berjaya disimpan.");
        });
    }

    // Check Authentication
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    if (!userRole) {
        window.location.href = 'index.html'; // Redirect to login if not authenticated
        return;
    }

    // Update Profile Info
    const profileName = document.querySelector('.user-profile');
    if (profileName) {
        let roleIcon = '<i class="fas fa-user-circle"></i>';
        if (userRole === 'admin') roleIcon = '<i class="fas fa-user-shield"></i>';
        if (userRole === 'contractor') roleIcon = '<i class="fas fa-hard-hat"></i>';

        profileName.innerHTML = `${roleIcon} <span style="margin-left: 10px;">${userName || 'Pengguna'}</span>`;
    } else {
        console.warn("Profile name element not found");
    }

    // --- REFRESH LOGIN CONTEXT ---
    const myName = (localStorage.getItem('userName') || '').toLowerCase().trim();
    const myEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
    console.log("Current Login Context:", { myName, myEmail });

    // SESSION RECOVERY: Ensure userEmail exists for protection logic
    let userEmail = localStorage.getItem('userEmail');
    async function recoverSessionEmail() {
        if (!userEmail && userRole === 'admin') {
            try {
                const data = await API.getAll();
                const admins = data.admins || [];
                const me = admins.find(a =>
                    (a.name || '').toLowerCase().trim() === (userName || '').toLowerCase().trim()
                );
                if (me) {
                    userEmail = me.email;
                    localStorage.setItem('userEmail', me.email);
                    console.log("Session Email Recovered:", me.email);
                    // Re-render if we were already loading
                    renderAdminList();
                }
            } catch (e) {
                console.error("Session Recovery Error:", e);
            }
        }
    }
    recoverSessionEmail();

    // Optional: Hide/Show sections based on role
    if (userRole === 'contractor') {
        const adminLinks = document.querySelectorAll('a[href="#laporan-admin"], a[href="#senarai-syarikat"], a[href="#tetapan"]');
        adminLinks.forEach(link => {
            if (link.parentElement) link.parentElement.style.display = 'none';
        });

        const adminSections = document.querySelectorAll('#laporan-admin, #senarai-syarikat, #tetapan');
        adminSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        const headerTitle = document.querySelector('.sidebar-header h2');
        if (headerTitle) headerTitle.textContent = "Panel Syarikat";
    }

    // --- BRANDING SYNC ---
    (function applyBranding() {
        // 1. Logo
        const savedLogo = localStorage.getItem('appLogo');
        if (savedLogo) {
            const logoEl = document.querySelector('.sidebar-header .logo');
            if (logoEl) {
                const img = document.createElement('img');
                img.src = savedLogo;
                img.alt = 'Logo';
                img.style.cssText = 'width: 100%; height: 100%; object-fit: contain;';
                logoEl.replaceWith(img);
            }
        }

        // 2. System Name
        const systemName = localStorage.getItem('systemName');
        const sidebarTitle = document.getElementById('sidebar-system-name');
        if (systemName && sidebarTitle) {
            sidebarTitle.textContent = systemName;
        }

        // 3. Background (Main Body Only)
        const savedBg = localStorage.getItem('appBackground');
        if (savedBg) {
            document.body.style.backgroundImage = `linear-gradient(rgba(244,247,246,0.94), rgba(244,247,246,0.94)), url('${savedBg}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundAttachment = 'fixed';
        }
    })();

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

    // DOM Elements
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.querySelector('.burger-menu');
    const overlay = document.querySelector('.overlay');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.section');

    // Toggle Sidebar
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth > 768) {
                // Desktop: Toggle Collapse Mode
                sidebar.classList.toggle('collapsed');
                // Optional: Adjust main content margin if needed, but flex handles it usually
            } else {
                // Mobile: Toggle Off-canvas
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            }
        });
    }

    // Close Sidebar when clicking outside (overlay)
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // Navigation and Link Activation
    // Navigation and Link Activation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Update Active State
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // 2. Hide specific page sections
            const href = link.getAttribute('href');
            if (!href.startsWith('#')) return; // Ignore external links (like logout)

            const targetId = href.substring(1);

            // Security check for contractors
            if (userRole === 'contractor' && ['laporan-admin', 'senarai-syarikat', 'daftar-pengguna', 'tetapan'].includes(targetId)) {
                return; // Do nothing if unauthorised
            }

            // Save to LocalStorage
            localStorage.setItem('activeAdminSection', targetId);

            sections.forEach(sec => {
                if (sec.id === targetId) {
                    sec.classList.add('active');
                    // Render lists when section is activated
                    if (targetId === 'senarai-syarikat') {
                        if (typeof renderContractorList === 'function') renderContractorList();
                    }
                    if (targetId === 'senarai-admin') {
                        if (typeof renderAdminList === 'function') renderAdminList();
                    }
                    if (targetId === 'laporan-admin') {
                        if (typeof renderReportTable === 'function') renderReportTable();
                    }
                } else {
                    sec.classList.remove('active');
                }
            });

            // 3. Close sidebar on mobile after clicking
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    });

    // Restore Active Tab from LocalStorage or Set Default
    const savedSectionId = localStorage.getItem('activeAdminSection');
    let restored = false;

    if (savedSectionId) {
        // Validate access for contractor
        const restricted = userRole === 'contractor' && ['laporan-admin', 'senarai-syarikat', 'daftar-pengguna', 'tetapan'].includes(savedSectionId);

        if (!restricted) {
            const targetSection = document.getElementById(savedSectionId);
            const targetLink = document.querySelector(`.nav-links a[href="#${savedSectionId}"]`);

            if (targetSection && targetLink) {
                // Deactivate all
                sections.forEach(s => s.classList.remove('active'));
                navLinks.forEach(l => l.classList.remove('active'));

                // Activate saved
                targetSection.classList.add('active');
                targetLink.classList.add('active');
                restored = true;

                // Render if specific section
                if (savedSectionId === 'laporan-admin' && typeof renderReportTable === 'function') renderReportTable();
                if (savedSectionId === 'senarai-syarikat' && typeof renderContractorList === 'function') renderContractorList();
            }
        }
    }

    // Default Fallback (Dashboard)
    if (!restored && sections.length > 0) {
        sections[0].classList.add('active');
        navLinks[0].classList.add('active');
    }

    // Render Complaint Table
    window.renderComplaintTable = async function (dataToRender = null) {
        const tableBody = document.querySelector('#complaint-table tbody');
        if (!tableBody) return;

        // Show Loading State only if we ARE fetching
        if (!dataToRender) {
            tableBody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 20px;">Memuatkan data...</td></tr>';
        }

        try {
            let complaints = [];

            if (dataToRender) {
                complaints = dataToRender;
            } else {
                const data = await API.getAll();
                complaints = data.complaints || [];

                // Update Global Cache
                window.allComplaints = complaints;
                window.allContractors = data.contractors || [];
                window.allAdmins = data.admins || [];
            }

            tableBody.innerHTML = '';

            if (complaints.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 20px;">Tiada aduan direkodkan.</td></tr>';
                return;
            }

            // Sort by timestamp if available, else reverse order
            complaints.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            complaints.forEach((c) => {
                let statusColor = '#f1c40f'; // Default warning/pending
                let statusBg = 'bg-warning';

                if (c.status === 'Selesai') { statusColor = '#27ae60'; statusBg = 'bg-success'; }
                if (c.status === 'Ditolak') { statusColor = '#e74c3c'; statusBg = 'bg-danger'; }
                if (c.status === 'Baru') { statusColor = '#3498db'; statusBg = 'bg-info'; }
                if (c.status === 'Aduan Diterima') { statusColor = '#f39c12'; statusBg = 'bg-warning'; }
                if (c.status === 'Tindakan Kontraktor') { statusColor = '#9b59b6'; statusBg = 'bg-purple'; }
                if (c.status === 'Sedang Dibaiki Oleh Kontraktor') { statusColor = '#2980b9'; statusBg = 'bg-primary'; }

                const hasProgress = c.progress && (
                    (c.progress.before && (c.progress.before.notes || (c.progress.before.images && c.progress.before.images.length > 0))) ||
                    (c.progress.during && (c.progress.during.notes || (c.progress.during.images && c.progress.during.images.length > 0))) ||
                    (c.progress.after && (c.progress.after.notes || (c.progress.after.images && c.progress.after.images.length > 0)))
                );

                // 1. MAIN DATA ROW
                const trData = document.createElement('tr');
                trData.style.borderTop = '1px solid #eee';
                trData.innerHTML = `
                <td data-label="No. Aduan" style="padding: 12px 10px;"><strong>${c.id}</strong></td>
                <td data-label="Nama" style="padding: 12px 10px;">${c.name}</td>
                <td data-label="No. Telefon" style="padding: 12px 10px;">${c.phone || '-'}</td>
                <td data-label="Jabatan" style="padding: 12px 10px;">${c.dept}</td>
                <td data-label="Keterangan" style="padding: 12px 10px; min-width: 150px; font-size: 0.9rem;" title="${c.description || ''}">${c.description || '-'}</td>
                <td data-label="Tarikh Aduan" style="padding: 12px 10px;">${formatDisplayDate(c.date)}</td>
                <td data-label="Catatan Admin" style="padding: 12px 10px; min-width: 120px; font-size: 0.9rem;">${c.adminNotes || '-'}</td>
                <td data-label="Status" style="padding: 12px 10px;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">${c.status}</span>
                </td>
                <td data-label="Kontraktor" style="padding: 12px 10px;">${c.contractor || '-'}</td>
                <td data-label="No. Rujukan" style="padding: 12px 10px;">
                    ${c.contractorRefNo ? `<span style="background:#fffde7; border:1px solid #f39c12; color:#b7791f; padding:3px 10px; border-radius:20px; font-weight:700; font-size:11px; letter-spacing:0.5px;">${c.contractorRefNo}</span>` : '<span style="color:#ccc;">-</span>'}
                </td>
                <td data-label="Tarikh Lantikan" style="padding: 12px 10px; font-size: 11px; color: #666;">
                    ${formatDisplayDate(c['tarikh lantikan'] || c.assignedDate)}
                </td>
                <td data-label="Catatan Kontraktor" style="padding: 12px 10px; min-width: 120px;">${c.contractorNotes || '-'}</td>
                <td data-label="Terima" style="padding: 12px 10px; font-size: 11px; color: #666;">
                    ${c.dateReceived ? formatDisplayDate(c.dateReceived) : '-'}
                </td>
                <td data-label="Siap" style="padding: 12px 10px; font-size: 11px; color: #666;">
                    ${c.dateCompleted ? formatDisplayDate(c.dateCompleted) : '-'}
                </td>
                <td data-label="Tempoh" style="padding: 12px 10px; font-weight: 600; color: #34495e;">${c.duration || '-'}</td>
            `;
                tableBody.appendChild(trData);

                // 2. ACTION ROW (Below data row)
                const trAction = document.createElement('tr');
                trAction.style.borderBottom = '2px solid #dfe6e9';
                trAction.style.backgroundColor = '#fafbfc';
                trAction.innerHTML = `
                <td colspan="15" style="padding: 10px 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        
                        <!-- LEFT SIDE: Main Actions -->
                        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                            <span style="font-size: 10px; font-weight: 800; color: #95a5a6; text-transform: uppercase;">Aksi:</span>
                            <button onclick="event.stopPropagation(); editComplaint('${c.id}')" style="padding: 6px 10px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            ${hasProgress ? `
                                <button onclick="event.stopPropagation(); viewProgress('${c.id}')" style="padding: 6px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                                    <i class="fas fa-tasks"></i> Progress
                                </button>
                            ` : ''}
                            <button onclick="event.stopPropagation(); deleteComplaint('${c.id}')" style="padding: 6px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
                                <i class="fas fa-trash"></i> Padam
                            </button>
                        </div>

                        <!-- RIGHT SIDE: Status Badge Only if Verified -->
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            ${c.isVerified ? `
                                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                                    <div style="background: #2ecc71; color: #000; padding: 6px 12px; border-radius: 4px; font-weight: 800; font-size: 11px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                        <i class="fas fa-check-circle" style="font-size: 14px;"></i> TELAH DISAHKAN OLEH ADMIN
                                    </div>
                                    <div style="font-size: 10px; color: #7f8c8d; margin-top: 4px; font-weight: 600;">
                                        Disahkan pada: ${new Date(c.verifiedDate).toLocaleString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </td>
            `;
                tableBody.appendChild(trAction);
            });
        } catch (e) {
            console.error("Error loading complaints:", e);
            tableBody.innerHTML = '<tr><td colspan="15" style="text-align:center; padding: 20px; color: #e74c3c;">Gagal memuatkan senarai aduan: ' + e.message + '</td></tr>';
        }
    };

    // Initial Render
    // Centralized Data Refresh
    window.refreshAllData = async function () {
        try {
            console.log("Refreshing all data...");
            // If overlay is hidden, we might want to show it for manual refresh too
            // But usually refreshAllData is called by showLoadingWithProgress initially
            const data = await API.getAll();

            // Update Global Cache
            window.allComplaints = data.complaints || [];
            window.allContractors = data.contractors || [];
            window.allAdmins = data.admins || [];
            window.allSettings = data.settings || {}; // Sync settings too

            // Render all components with pre-fetched data
            renderDashboardStats();
            renderNotifications();
            renderComplaintTable(window.allComplaints);

            // Also render other lists if they are active
            // renderContractorList(); // Optional, only if tab active

        } catch (e) {
            console.error("Refresh Error:", e);
            // Fallback to local rendering if API fails, just to show something?
            // renderComplaintTable(); 
        }
    };

    // Initial Render
    showLoadingWithProgress(refreshAllData());

    // Expose functions globally for onclick events
    window.openContractorModal = async function () {
        const id = document.getElementById('edit-id').value;
        const statusValue = document.getElementById('edit-status').value;
        const notesValue = document.getElementById('edit-notes').value;

        // 1. Show processing state on button
        const assignBtn = document.getElementById('btn-assign-contractor');
        const originalBtnHtml = assignBtn.innerHTML;
        assignBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        assignBtn.disabled = true;

        try {
            // 2. Fetch current complaint to get the latest object (with mapping keys)
            const data = await API.getAll();
            const complaints = data.complaints || [];
            const index = complaints.findIndex(c => c.id == id);

            if (index !== -1) {
                // Update local object with current form values
                complaints[index].status = statusValue;
                complaints[index].adminNotes = notesValue;

                // 3. Save Status & Notes to server IMMEDIATELY
                await API.updateRecord('Aduan', 'id', id, complaints[index]);
                console.log("Admin notes & status saved before assignment modal.");

                // Update GLOBAL cache so the table refresh sees it
                window.allComplaints = complaints;

                // 4. Populate Contractor Modal from the updated list
                const contractorSelect = document.getElementById('modal-contractor-select');
                if (contractorSelect) {
                    const contractors = window.allContractors || [];
                    contractorSelect.innerHTML = '<option value="">-- Sila Pilih Syarikat --</option>';
                    contractors.forEach(c => {
                        const opt = document.createElement('option');
                        opt.value = c.name;
                        opt.textContent = c.name;
                        contractorSelect.appendChild(opt);
                    });
                    contractorSelect.value = complaints[index].contractor || '';
                }

                document.getElementById('modal-task-desc').value = complaints[index].taskDescription || '';

                // ✅ AUTO-GENERATE NO. RUJUKAN (CMD-XXXX/YEAR)
                const refInput = document.getElementById('modal-contractor-ref');
                if (refInput) {
                    if (complaints[index].contractorRefNo) {
                        // Jika sudah ada, kekalkan yang lama
                        refInput.value = complaints[index].contractorRefNo;
                    } else {
                        // Jana baru berurutan bagi tahun semasa
                        const year = new Date().getFullYear();
                        const allComplaints = window.allComplaints || [];
                        const existingRefs = allComplaints.filter(c =>
                            c.contractorRefNo && c.contractorRefNo.includes(`/${year}`)
                        ).length;
                        const nextNum = (existingRefs + 1).toString().padStart(4, '0');
                        refInput.value = `CMD-${nextNum}/${year}`;
                    }
                    // Jadikan readonly supaya tidak perlu isi manual
                    refInput.readOnly = true;
                    refInput.style.backgroundColor = '#f8f9fa';
                    refInput.style.cursor = 'not-allowed';
                }

                document.getElementById('assign-contractor-modal').style.display = 'flex';

                // Refresh main table to show "Aduan Diterima" etc
                renderComplaintTable(window.allComplaints);
            }
        } catch (e) {
            console.error("Error saving notes before assignment:", e);
            alert("Ralat: Tidak dapat menyimpan catatan. Sila cuba lagi.");
        } finally {
            assignBtn.innerHTML = originalBtnHtml;
            assignBtn.disabled = false;
        }
    }

    window.closeContractorModal = function () {
        document.getElementById('assign-contractor-modal').style.display = 'none';
    }

    window.confirmAssignment = async function () {
        // Collect Data
        const id = document.getElementById('edit-id').value;
        const contractor = document.getElementById('modal-contractor-select').value;
        const taskDesc = document.getElementById('modal-task-desc').value;
        const contractorRefNo = (document.getElementById('modal-contractor-ref')?.value || '').trim();

        if (!contractor) {
            alert("Sila pilih syarikat kontraktor.");
            return;
        }

        // Show Loading
        const sendBtn = document.querySelector('#assign-contractor-modal button[onclick="confirmAssignment()"]');
        const originalText = sendBtn ? sendBtn.textContent : "Hantar";
        if (sendBtn) {
            sendBtn.textContent = "Menghantar...";
            sendBtn.disabled = true;
        }

        try {
            const data = await API.getAll();
            const complaints = data.complaints || [];
            // Use loose check for ID to handle string/number mismatch
            const index = complaints.findIndex(c => c.id == id);

            if (index !== -1) {
                // Find full profile of current admin who is assigning
                const currentAdminName = localStorage.getItem('userName') || 'Admin';
                const adminList = data.admins || [];
                const currentAdmin = adminList.find(a => (a.name || '').toLowerCase().trim() === (currentAdminName || '').toLowerCase().trim());

                complaints[index].assignedBy = {
                    name: currentAdmin ? currentAdmin.name : currentAdminName,
                    email: currentAdmin ? currentAdmin.email : (localStorage.getItem('userEmail') || '-'),
                    position: currentAdmin ? (currentAdmin.position || '-') : '-',
                    phone: currentAdmin ? (currentAdmin.mobile || currentAdmin.offphone || '-') : (localStorage.getItem('userPhone') || '-')
                };

                // Sync with main edit form in case notes were updated
                const mainNotes = document.getElementById('edit-notes');
                if (mainNotes) {
                    complaints[index].adminNotes = mainNotes.value;
                }

                complaints[index].contractor = contractor;
                complaints[index].taskDescription = taskDesc;
                complaints[index].contractorRefNo = contractorRefNo; // ✅ SAVE CONTRACTOR REF NO
                complaints[index].status = 'Tindakan Kontraktor'; // Update Status

                // Record Assignment Date & Time
                const now = new Date();
                const d = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
                const t = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const assignedTimestamp = `${d} ${t}`;

                complaints[index].assignedDate = assignedTimestamp;
                complaints[index]['tarikh lantikan'] = assignedTimestamp; // Map to GS Header

                // Save back to API (Using updateRecord for efficiency)
                await API.updateRecord('Aduan', 'id', id, complaints[index]);
                console.log(`Complaint ${id} assigned to ${contractor} by ${complaints[index].assignedBy.name}`);

                // Send Notifications
                // 1. To Contractor
                await API.sendNotification('assigned', {
                    complaintId: id,
                    contractorName: contractor,
                    location: complaints[index].location,
                    description: complaints[index].description,
                    taskDescription: taskDesc
                });

                // 2. To User (Pengadu)
                await API.sendNotification('status_update', {
                    complaintId: id,
                    userName: complaints[index].name,
                    userEmail: complaints[index].email,
                    newStatus: 'Tindakan Kontraktor',
                    updateBy: 'Admin'
                });

                // Close Modals
                closeContractorModal();
                closeEditModal();

                // Refresh Table
                await refreshAllData();

                // ✅ Show Success Animation
                showSuccessModal(
                    'Berjaya Dihantar!',
                    `Aduan <strong>${id}</strong> telah berjaya dihantar kepada <strong>${contractor}</strong>.`,
                    contractorRefNo
                );

            } else {
                alert("Aduan tidak dijumpai.");
            }
        } catch (e) {
            console.error("Assignment Error:", e);
            alert("Ralat semasa menyimpan data penugasan.");
        } finally {
            // Re-enable button
            if (sendBtn) {
                sendBtn.textContent = originalText;
                sendBtn.disabled = false;
            }
        }
    };

    window.editComplaint = function (id) {
        const complaints = window.allComplaints || [];
        const complaint = complaints.find(c => c.id === id);

        if (complaint) {
            document.getElementById('edit-id').value = complaint.id;

            // Populate Details (Read-Only)
            document.getElementById('display-id').textContent = complaint.id;
            document.getElementById('display-name').textContent = complaint.name || '-';
            document.getElementById('display-empid').textContent = complaint.empId || '-';
            document.getElementById('display-dept').textContent = complaint.dept || '-';
            document.getElementById('display-phone').textContent = complaint.phone || '-';
            document.getElementById('display-email').textContent = complaint.email || '-';
            document.getElementById('display-location').textContent = complaint.location || '-';
            document.getElementById('display-date').textContent = `${complaint.date || ''} ${complaint.time || ''}`;
            document.getElementById('display-desc').textContent = complaint.description || 'Tiada keterangan.';

            // Handle Image Display (Support Multiple)
            const galleryContainer = document.getElementById('image-gallery-container');
            const noImgText = document.getElementById('no-image-text');

            // Clear previous images but keep noImgText
            const images = galleryContainer.querySelectorAll('img');
            images.forEach(img => img.remove());

            if (complaint.image) {
                if (noImgText) noImgText.style.display = 'none';

                // image could be a string (legacy) or an array
                const imageList = Array.isArray(complaint.image) ? complaint.image : [complaint.image];

                imageList.forEach(src => {
                    const img = document.createElement('img');
                    img.src = src;
                    img.style.maxWidth = '150px';
                    img.style.maxHeight = '150px';
                    img.style.borderRadius = '4px';
                    img.style.border = '1px solid #ddd';
                    img.style.cursor = 'pointer';
                    img.onclick = () => window.open(src, '_blank');
                    galleryContainer.appendChild(img);
                });
            } else {
                if (noImgText) noImgText.style.display = 'inline';
            }

            // Populate Action Fields
            const fieldStatus = document.getElementById('edit-status');
            const fieldNotes = document.getElementById('edit-notes');
            const assignBtn = document.getElementById('btn-assign-contractor');
            const submitBtn = document.querySelector('#edit-complaint-modal button[type="submit"]');
            const modalTitle = document.querySelector('#edit-complaint-modal h2');

            fieldStatus.value = complaint.status || 'Baru';
            fieldNotes.value = complaint.adminNotes || '';

            // RESET LOCKS
            fieldStatus.disabled = false;
            fieldNotes.disabled = false;
            assignBtn.disabled = false;
            assignBtn.style.opacity = '1';
            assignBtn.style.cursor = 'pointer';
            if (submitBtn) submitBtn.style.display = 'inline-block';
            if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-edit"></i> Tindakan Aduan';

            // APPLY LOCK IF VERIFIED
            if (complaint.isVerified) {
                fieldStatus.disabled = true;
                fieldNotes.disabled = true;
                assignBtn.disabled = true;
                assignBtn.style.opacity = '0.5';
                assignBtn.style.cursor = 'not-allowed';
                if (submitBtn) submitBtn.style.display = 'none';
                if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-check-double" style="color:#27ae60;"></i> Aduan Telah Disahkan (Selesai)';
            } else {
                // Update Assign Button Text if not verified
                if (complaint.contractor) {
                    assignBtn.innerHTML = '<i class="fas fa-edit"></i> Edit Kontraktor';
                    assignBtn.style.backgroundColor = '#f39c12';
                } else {
                    assignBtn.innerHTML = '<i class="fas fa-hard-hat"></i> Lantik Kontraktor';
                    assignBtn.style.backgroundColor = '#3498db';
                }

                // Disable 'Lantik/Edit Kontraktor' if already started by contractor
                if (complaint.status === 'Sedang Dibaiki Oleh Kontraktor') {
                    assignBtn.disabled = true;
                    assignBtn.style.opacity = '0.5';
                    assignBtn.style.cursor = 'not-allowed';
                    assignBtn.title = "Kontraktor sedang membaiki kerosakan. Tidak boleh diubah.";
                }
            }

            document.getElementById('edit-complaint-modal').style.display = 'flex';
        }
    }

    window.closeEditModal = function () {
        document.getElementById('edit-complaint-modal').style.display = 'none';
    }

    window.saveComplaintChanges = async function (e) {
        e.preventDefault();

        const id = document.getElementById('edit-id').value;
        const newStatus = document.getElementById('edit-status').value;
        const newNotes = document.getElementById('edit-notes').value;

        // Fetch fresh data to ensure we don't overwrite others
        try {
            const data = await API.getAll();
            let complaints = data.complaints || [];
            const index = complaints.findIndex(c => c.id === id);

            if (index !== -1) {
                const oldStatus = complaints[index].status;
                complaints[index].status = newStatus;
                complaints[index].adminNotes = newNotes;

                // Save back to API (Using updateRecord for efficiency)
                await API.updateRecord('Aduan', 'id', id, complaints[index]);

                // Send Notification to User if status changed
                if (oldStatus !== newStatus) {
                    await API.sendNotification('status_update', {
                        complaintId: id,
                        userName: complaints[index].name,
                        userEmail: complaints[index].email,
                        contractorName: complaints[index].contractor,
                        newStatus: newStatus,
                        updateBy: 'Admin'
                    });
                }

                // Update local cache
                window.allComplaints = complaints;

                closeEditModal();
                await refreshAllData();

                // ✅ Show Success Animation
                showSuccessModal(
                    'Berjaya Dikemaskini!',
                    `Aduan <strong>${id}</strong> telah berjaya dikemaskini.<br><small style="color:#9ca3af;">Status: ${newStatus}</small>`
                );
            }
        } catch (err) {
            console.error(err);
            alert("Gagal mengemaskini aduan.");
        }
    }

    window.viewComplaint = function (id) {
        alert("Lihat butiran aduan: " + id);
        // Future: Open modal with details
    }

    // 4. Delete Complaint
    window.deleteComplaint = async function (id) {
        if (!id) return;

        if (confirm("Adakah anda pasti mahu memadam aduan ini?")) {
            try {
                const success = await API.deleteRecord('Aduan', 'id', id);

                if (success) {
                    await refreshAllData();
                    // ✅ Show Premium Success Animation
                    showSuccessModal(
                        'Aduan Dipadam!',
                        `Aduan <strong>${id}</strong> telah berjaya dipadam daripada sistem.`
                    );
                }
            } catch (e) {
                console.error("Delete Aduan Error:", e);
                alert("Ralat memadam aduan: " + e.message);
            }
        }
    };

    // Register User Form - Modal Control
    window.openRegisterContractorModal = function () {
        document.getElementById('modal-register-contractor').style.display = 'flex';
    }
    window.closeRegisterContractorModal = function () {
        document.getElementById('modal-register-contractor').style.display = 'none';
        document.getElementById('form-register-contractor').reset();
    }
    window.openRegisterAdminModal = function () {
        document.getElementById('modal-register-admin').style.display = 'flex';
    }
    window.closeRegisterAdminModal = function () {
        document.getElementById('modal-register-admin').style.display = 'none';
        document.getElementById('form-register-admin').reset();
    }

    // Handle Registration Submission
    // CONTRACTOR MANAGEMENT LOGIC

    // Function to render the contractor list
    window.renderContractorList = async function () {
        const companyList = document.querySelector('#company-list');
        if (!companyList) return;

        companyList.innerHTML = '<li style="padding:20px; text-align:center;">Memuatkan senarai...</li>';

        try {
            const data = await API.getAll();
            const contractors = data.contractors || [];

            // Sync
            // Cache and Sync (removed localStorage)
            window.allContractors = contractors;
            // localStorage.setItem('contractors', JSON.stringify(contractors));

            companyList.innerHTML = '';
            if (contractors.length === 0) {
                companyList.innerHTML = '<li style=\"padding: 20px; text-align: center; color: #95a5a6; background: #fff; border-radius: 8px;\">Tiada syarikat berdaftar. Sila daftar syarikat baru di menu \"Daftar Pengguna Baru\".</li>';
                return;
            }

            contractors.forEach(c => {
                const li = document.createElement('li');
                li.style.cssText = "background: #fff; margin-bottom: 20px; border-left: 5px solid #3498db; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden;";

                li.innerHTML = `
                <div style="padding: 20px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
                    <div style="flex: 2; min-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                            <strong style="color: #2c3e50; font-size: 1.2rem;">${c.name}</strong>
                            <span style="font-size: 0.8rem; background: #ebf5fb; color: #3498db; padding: 2px 8px; border-radius: 12px; font-weight: 600;">@${c.username || 'n/a'}</span>
                        </div>
                        <span style="color: #e67e22; font-weight: bold; font-size: 0.85rem; text-transform: uppercase;">
                            <i class="fas fa-hard-hat" style="margin-right: 5px;"></i> ${c.scope || 'KONTRAKTOR'}
                        </span>
                        <div style="font-size: 0.9rem; color: #7f8c8d; margin-top: 10px; display: flex; flex-direction: column; gap: 5px;">
                            <span><i class="fas fa-envelope" style="width: 20px;"></i> ${c.email || 'N/A'}</span>
                            <span><i class="fas fa-phone-alt" style="width: 20px;"></i> ${c.offphone || '-'} (Pejabat)</span>
                            <span><i class="fas fa-mobile-alt" style="width: 20px;"></i> ${c.mobile || '-'} (Bimbit)</span>
                        </div>
                    </div>
                    <div style="flex: 2; min-width: 200px; border-left: 1px solid #eee; padding-left: 20px;">
                        <div style="margin-bottom: 6px; font-size: 0.9rem;">
                            <span style="font-weight: bold; color: #555;">No. Daftar:</span> 
                            <span>${c.regNo || '-'}</span>
                        </div>
                        <div style="margin-bottom: 6px; font-size: 0.9rem;">
                            <span style="font-weight: bold; color: #555;">Tempoh:</span> 
                            <span>${c.startDate || '-'} hingga <span style="color: #e74c3c; font-weight: 600;">${c.endDate || '-'}</span></span>
                        </div>
                        <div style="margin-top: 15px; font-size: 0.8rem; color: #95a5a6; font-style: italic;">
                            <i class="fas fa-user-edit"></i> Dijana oleh: <span style="color: #2c3e50; font-weight: 600;">${c.createdBy || 'Sistem'}</span>
                        </div>
                    </div>
                </div>
                <!-- Action Buttons at the Bottom -->
                <div style="background: #f8f9fa; padding: 12px 20px; display: flex; justify-content: flex-end; gap: 15px; border-top: 1px solid #eee;">
                    <button onclick="editContractor('${c.regNo}')" style="background: #3498db; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-edit"></i> Edit Syarikat
                    </button>
                    <button onclick="deleteContractor('${c.regNo}')" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-trash"></i> Padam
                    </button>
                </div>
            `;
                companyList.appendChild(li);
            });
        } catch (e) {
            console.error(e);
            companyList.innerHTML = '<li style="color:red; text-align:center;">Gagal memuatkan senarai.</li>';
        }
    };

    // Function to render the admin list
    window.renderAdminList = async function () {
        const adminListContainer = document.querySelector('#admin-list');
        if (!adminListContainer) return;

        adminListContainer.innerHTML = '<li style="padding:20px; text-align:center;">Memuatkan senarai...</li>';

        try {
            const data = await API.getAll();
            const admins = data.admins || [];

            // Sync
            // Cache and Sync (removed localStorage)
            window.allAdmins = admins;
            // localStorage.setItem('admins', JSON.stringify(admins));

            adminListContainer.innerHTML = '';
            if (admins.length === 0) {
                adminListContainer.innerHTML = '<li style=\"padding: 20px; text-align: center; color: #95a5a6; background: #fff; border-radius: 8px;\">Tiada admin berdaftar. Sila daftar admin baru di menu \"Daftar Pengguna Baru\".</li>';
                return;
            }

            admins.forEach(a => {
                const sessionEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
                const sessionName = (localStorage.getItem('userName') || '').toLowerCase().trim();

                const adminEmail = (a.email || '').toLowerCase().trim();
                const adminName = (a.name || '').toLowerCase().trim();

                // Broad Match: If email matches OR name matches, it is ME
                const isMe = (sessionEmail && adminEmail === sessionEmail) ||
                    (sessionName && adminName === sessionName);

                const li = document.createElement('li');
                li.style.cssText = `background: #fff; margin-bottom: 15px; border-left: 5px solid ${isMe ? '#3498db' : '#27ae60'}; display: flex; flex-direction: column; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border-radius: 8px; overflow: hidden; position: relative;`;

                li.innerHTML = `
                <div style="padding: 15px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: #2c3e50; font-size: 1.1rem;">${a.name}</strong>
                            <span style="font-size: 0.75rem; color: #7f8c8d; font-weight: 600;">@${a.username || 'n/a'}</span>
                            ${isMe ? '<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: 800;">SAYA</span>' : ''}
                        </div>
                        <span style="color: ${isMe ? '#3498db' : '#27ae60'}; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; display: block; margin-top: 2px;">
                            <i class="fas fa-user-shield" style="margin-right: 5px;"></i> ${a.position || 'ADMIN JKR'}
                        </span>
                        <div style="font-size: 0.85rem; color: #7f8c8d; margin-top: 10px; display: flex; flex-direction: column; gap: 3px;">
                            <span><i class="fas fa-envelope" style="width: 18px;"></i> ${a.email}</span>
                            <span><i class="fas fa-phone-alt" style="width: 18px;"></i> ${a.offphone || '-'}</span>
                        </div>
                    </div>
                </div>
                <!-- Action Buttons at the Bottom -->
                <div style="background: #f8f9fa; padding: 10px 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #eee;">
                    <button onclick="editAdmin('${a.email}')" style="background: #3498db; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-edit"></i> Edit Info
                    </button>
                    ${!isMe ? `
                    <button onclick="deleteAdmin('${a.email}')" style="background: #e74c3c; color: white; border: none; padding: 6px 15px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-trash"></i> Padam Akaun Admin
                    </button>` : ''}
                </div>
                `;
                adminListContainer.appendChild(li);
            });
        } catch (e) {
            console.error(e);
            adminListContainer.innerHTML = '<li style="color:red; text-align:center;">Gagal memuatkan senarai.</li>';
        }
    };

    // 1. Handle Contractor Registration
    const regContractorForm = document.getElementById('form-register-contractor');
    if (regContractorForm) {
        regContractorForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('reg-company-name').value;
            const username = document.getElementById('reg-company-username').value;
            const email = document.getElementById('reg-company-email').value;
            const offphone = document.getElementById('reg-company-offphone').value;
            const mobile = document.getElementById('reg-company-mobile').value;
            const regNo = document.getElementById('reg-company-ssm').value;
            const scope = document.getElementById('reg-company-scope').value;
            const startDate = document.getElementById('reg-company-start').value;
            const endDate = document.getElementById('reg-company-end').value;
            const password = document.getElementById('reg-company-password').value;
            const createdBy = localStorage.getItem('userName') || 'Admin';

            // Format phone numbers
            const formatPhone = (p) => {
                p = p.trim();
                if (p && !p.startsWith('0') && !p.startsWith('+') && !p.startsWith('6')) return '0' + p;
                return p;
            };

            const fOffPhone = formatPhone(offphone);
            const fMobile = formatPhone(mobile);

            if (!name || !username || !email || !offphone || !mobile || !regNo || !startDate || !endDate || !password) {
                alert("Sila isi semua maklumat mandatori.");
                return;
            }

            try {
                const data = await API.getAll();
                let contractors = data.contractors || [];

                if (contractors.some(c => c.regNo === regNo)) {
                    alert("Ralat: No. Pendaftaran syarikat ini telah wujud.");
                    return;
                }

                contractors.push({
                    name, username, email, offphone: fOffPhone, mobile: fMobile, role: 'contractor', regNo, scope, startDate, endDate, password, createdBy
                });

                data.contractors = contractors;
                await API.saveAll(data);

                alert(`Pendaftaran Syarikat Berjaya!\nSyarikat: ${name} `);
                closeRegisterContractorModal();
                renderContractorList();

            } catch (err) {
                console.error("Contractor Registration Error:", err);
                alert("Gagal mendaftar syarikat baru.");
            }
        });
    }

    // 2. Handle Admin Registration
    const regAdminForm = document.getElementById('form-register-admin');
    if (regAdminForm) {
        regAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('reg-admin-name').value;
            const username = document.getElementById('reg-admin-username').value;
            const email = document.getElementById('reg-admin-email').value;
            const position = document.getElementById('reg-admin-position').value;
            const offphone = document.getElementById('reg-admin-offphone').value;
            const mobile = document.getElementById('reg-admin-mobile').value;
            const password = document.getElementById('reg-admin-password').value;

            if (!name || !username || !email || !position || !offphone || !password) {
                alert("Sila isi semua maklumat mandatori.");
                return;
            }

            // Format phone numbers
            const formatPhone = (p) => {
                p = p.trim();
                if (p && !p.startsWith('0') && !p.startsWith('+') && !p.startsWith('6')) return '0' + p;
                return p;
            };

            const fOffPhone = formatPhone(offphone);
            const fMobile = formatPhone(mobile);



            try {
                const data = await API.getAll();
                let admins = data.admins || [];

                if (admins.some(a => a.email === email)) {
                    alert("Ralat: Emel admin ini telah berdaftar.");
                    return;
                }

                admins.push({ name, username, email, position, offphone: fOffPhone, mobile: fMobile, role: 'admin', password });

                data.admins = admins;
                await API.saveAll(data);

                alert(`Pendaftaran Admin berjaya!\nID: ${email} `);
                closeRegisterAdminModal();
                renderAdminList();

            } catch (err) {
                console.error("Admin Registration Error:", err);
                alert("Gagal mendaftar admin baru.");
            }
        });
    }

    // HELPER GLOBAL FUNCTIONS
    // 5. Delete Admin
    window.deleteAdmin = async function (email) {
        if (!email) return;

        // Broad Safety check: Cannot delete self
        const myEmail = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
        const myName = (localStorage.getItem('userName') || '').toLowerCase().trim();

        const targetEmail = (email || '').toLowerCase().trim();
        const admins = window.allAdmins || [];
        const targetAdmin = admins.find(a => (a.email || '').toLowerCase().trim() === targetEmail);
        const targetName = targetAdmin ? (targetAdmin.name || '').toLowerCase().trim() : '';

        // If either email or name matches the active session, BLOCK IT
        const isSelf = (myEmail && targetEmail === myEmail) || (myName && targetName === myName);

        if (isSelf) {
            alert("Ralat: Anda tidak boleh memadam akaun anda sendiri semasa log masuk.");
            return;
        }

        if (!confirm("Adakah anda pasti mahu memadam akaun admin " + email + "?")) return;

        try {
            console.log("Memadam admin:", email);
            const success = await API.deleteRecord('Admin', 'email', email);

            if (success) {
                // Refresh list
                renderAdminList();
                alert("Akaun admin telah dipadam.");
            }
        } catch (e) {
            console.error("Delete Admin Error:", e);
            alert("Ralat memadam admin: " + e.message);
        }
    };

    // --- EDIT CONTRACTOR LOGIC ---
    window.editContractor = function (regNo) {
        const contractors = window.allContractors || [];
        const contractor = contractors.find(c => c.regNo === regNo);

        if (contractor) {
            document.getElementById('edit-company-old-reg').value = contractor.regNo;
            document.getElementById('edit-company-name').value = contractor.name;
            document.getElementById('edit-company-username').value = contractor.username;
            document.getElementById('edit-company-email').value = contractor.email;
            document.getElementById('edit-company-offphone').value = contractor.offphone;
            document.getElementById('edit-company-mobile').value = contractor.mobile || '';
            document.getElementById('edit-company-ssm').value = contractor.regNo;
            document.getElementById('edit-company-scope').value = contractor.scope || 'Penyelenggaraan Am';
            document.getElementById('edit-company-start').value = contractor.startDate || '';
            document.getElementById('edit-company-end').value = contractor.endDate || '';

            document.getElementById('modal-edit-contractor').style.display = 'flex';
        }
    };

    window.closeEditContractorModal = function () {
        document.getElementById('modal-edit-contractor').style.display = 'none';
    };

    const editContractorForm = document.getElementById('form-edit-contractor');
    if (editContractorForm) {
        editContractorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldReg = document.getElementById('edit-company-old-reg').value;

            try {
                const data = await API.getAll();
                let contractors = data.contractors || [];
                const index = contractors.findIndex(c => c.regNo === oldReg);

                if (index !== -1) {
                    contractors[index].name = document.getElementById('edit-company-name').value;
                    contractors[index].username = document.getElementById('edit-company-username').value;
                    contractors[index].email = document.getElementById('edit-company-email').value;
                    contractors[index].offphone = document.getElementById('edit-company-offphone').value;
                    contractors[index].mobile = document.getElementById('edit-company-mobile').value;
                    contractors[index].regNo = document.getElementById('edit-company-ssm').value;
                    contractors[index].scope = document.getElementById('edit-company-scope').value;
                    contractors[index].startDate = document.getElementById('edit-company-start').value;
                    contractors[index].endDate = document.getElementById('edit-company-end').value;

                    data.contractors = contractors;
                    await API.saveAll(data);

                    alert("Maklumat syarikat telah dikemaskini.");
                    closeEditContractorModal();
                    renderContractorList();
                }
            } catch (err) {
                console.error("Save Contractor Error:", err);
                alert("Gagal menyimpan perubahan.");
            }
        });
    }

    // --- EDIT ADMIN LOGIC ---
    window.editAdmin = function (email) {
        const admins = window.allAdmins || [];
        const admin = admins.find(a => a.email === email);

        if (admin) {
            document.getElementById('edit-admin-old-email').value = admin.email;
            document.getElementById('edit-admin-name').value = admin.name;
            document.getElementById('edit-admin-username').value = admin.username;
            document.getElementById('edit-admin-email').value = admin.email;
            document.getElementById('edit-admin-position').value = admin.position || '';
            document.getElementById('edit-admin-offphone').value = admin.offphone || '';
            document.getElementById('edit-admin-mobile').value = admin.mobile || '';

            document.getElementById('modal-edit-admin').style.display = 'flex';
        }
    };

    window.closeEditAdminModal = function () {
        document.getElementById('modal-edit-admin').style.display = 'none';
    };

    const editAdminForm = document.getElementById('form-edit-admin');
    if (editAdminForm) {
        editAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldEmail = document.getElementById('edit-admin-old-email').value;

            try {
                const data = await API.getAll();
                let admins = data.admins || [];
                const index = admins.findIndex(a => a.email === oldEmail);

                if (index !== -1) {
                    admins[index].name = document.getElementById('edit-admin-name').value;
                    admins[index].username = document.getElementById('edit-admin-username').value;
                    admins[index].email = document.getElementById('edit-admin-email').value;
                    admins[index].position = document.getElementById('edit-admin-position').value;
                    admins[index].offphone = document.getElementById('edit-admin-offphone').value;
                    admins[index].mobile = document.getElementById('edit-admin-mobile').value;

                    data.admins = admins;
                    await API.saveAll(data);

                    alert("Maklumat admin telah dikemaskini.");
                    closeEditAdminModal();
                    renderAdminList();
                }
            } catch (err) {
                console.error("Save Admin Error:", err);
                alert("Gagal menyimpan perubahan.");
            }
        });
    }

    // Initial Rendering (Calls)
    renderContractorList();
    renderAdminList();
    if (typeof renderNotifications === 'function') renderNotifications();
    if (typeof renderDashboardStats === 'function') renderDashboardStats();

    // Global delete function
    // Global delete function
    window.deleteContractor = async function (regNo) {
        if (confirm("Adakah anda pasti mahu memadam kontraktor ini dari senarai?")) {
            try {
                const success = await API.deleteRecord('Kontraktor', 'regNo', regNo);

                if (success) {
                    renderContractorList();
                    alert("Kontraktor berjaya dipadam.");
                }
            } catch (e) {
                console.error(e);
                alert("Ralat memadam kontraktor.");
            }
        }
    };
}); // End DOMContentLoaded

// Global Function for Sharing Link (defined outside so it's accessible via onclick)
function shareComplaintLink() {
    // Construct the absolute URL for the formuser.html
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));

    // Check if we are at root or need to append
    let formUrl = `${baseUrl}/formuser.html`;

    // Handle edge case if baseUrl ends with '/'
    if (baseUrl.endsWith('/')) {
        formUrl = `${baseUrl}formuser.html`;
    }

    // Elements
    const btn = document.getElementById('share-link-btn');
    const toast = document.getElementById('toast-notification');

    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(formUrl).then(() => {
            // Success Animation & Toast & Text Change
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Pautan disalin';
                btn.classList.add('btn-animate');

                // Revert after 5 seconds
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-share-alt"></i> Kongsi Pautan Aduan';
                    btn.classList.remove('btn-animate');
                }, 5000);
            }

            if (toast) {
                toast.textContent = `Pautan disalin: ${formUrl}`;
                toast.classList.add('show');

                setTimeout(() => {
                    toast.classList.remove('show');
                }, 5000);
            }

        }).catch(err => {
            console.error('Gagal menyalin: ', err);
            // Fallback
            prompt("Sila salin pautan ini secara manual:", formUrl);
        });
    } else {
        // Fallback for older browsers
        prompt("Sila salin pautan ini secara manual:", formUrl);
    }
}

// Dashboard Stats Rendering
function renderDashboardStats() {
    const welcomeEl = document.getElementById('welcome-msg');
    if (welcomeEl) {
        const userName = localStorage.getItem('userName') || 'Admin JKR';
        welcomeEl.textContent = `Selamat Datang , ${userName}`;
    }

    let complaints = window.allComplaints || [];
    // Fallback if empty but maybe not initialized? 
    // Usually renderDashboardStats is called after data load. 
    // If empty, try localStorage just in case, but prefer window variable.
    if (complaints.length === 0) {
        complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    }
    const now = new Date();

    const total = complaints.length;
    const completed = complaints.filter(c => c.status === 'Selesai').length;
    const rejected = complaints.filter(c => c.status === 'Ditolak').length;

    // "Dalam Proses" includes all active statuses
    const inProcess = complaints.filter(c =>
        ['Baru', 'Aduan Diterima', 'Tindakan Kontraktor', 'Dalam Proses', 'Sedang Dibaiki Oleh Kontraktor'].includes(c.status)
    ).length;

    // "Lewat" (Late): > 3 days and not finished
    const late = complaints.filter(c => {
        if (c.status === 'Selesai' || c.status === 'Ditolak') return false;
        const createDate = new Date(c.timestamp || c.date);
        const diffDays = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
        return diffDays > 3;
    }).length;

    // Update UI elements if they exist
    const elTotal = document.getElementById('total-complaints');
    const elCompleted = document.getElementById('total-completed');
    const elProcess = document.getElementById('total-process');
    const elLate = document.getElementById('total-late');
    const elRejected = document.getElementById('total-rejected');

    if (elTotal) elTotal.textContent = total;
    if (elCompleted) elCompleted.textContent = completed;
    if (elProcess) elProcess.textContent = inProcess;
    if (elLate) elLate.textContent = late;
    if (elRejected) elRejected.textContent = rejected;
}

// Notification System
function renderNotifications() {
    const list = document.getElementById('notification-list');
    if (!list) return;

    let complaints = window.allComplaints || [];
    if (complaints.length === 0) {
        complaints = JSON.parse(localStorage.getItem('complaints') || '[]');
    }
    let notifications = [];
    const now = new Date();

    complaints.forEach(c => {
        const createDate = new Date(c.timestamp || c.date); // Fallback to date status
        const diffDays = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));

        // 1. Lewat (More than 3 days and not closed)
        if (diffDays > 3 && c.status !== 'Selesai' && c.status !== 'Ditolak') {
            notifications.push({
                id: c.id,
                message: `<strong>Aduan ${c.id}</strong> telah melebihi tempoh ${diffDays} hari (Lewat).`,
                details: `${diffDays} hari lepas`,
                color: '#e67e22', // Orange
                sortTime: createDate.getTime() // Oldest first? Or usually alerts show recent alerts. 
                // Actually "Lewat" alerts are ongoing. Let's start with creation time.
            });
        }

        // 2. Ditolak
        if (c.status === 'Ditolak') {
            notifications.push({
                id: c.id,
                message: `<strong>Aduan ${c.id}</strong> telah ditolak.`,
                details: timeAgo(createDate), // Use creation or rejection time if available
                color: '#c0392b', // Red
                sortTime: createDate.getTime()
            });
        }

        // 3. Baru received (Last 7 days logic?)
        if (c.status === 'Baru') {
            notifications.push({
                id: c.id,
                message: `<strong>Aduan ${c.id}</strong> baru diterima daripada ${c.name}.`,
                details: timeAgo(createDate),
                color: '#2ecc71', // Green
                sortTime: createDate.getTime()
            });
        }
    });

    // Sort by sortTime descending (Newest first)
    // For 'Lewat' it might stem from old dates, but the notification is current. 
    // Let's just sort by the event date (createDate) for consistent timeline.
    notifications.sort((a, b) => b.sortTime - a.sortTime);

    // Limit to 5
    const topNotifications = notifications.slice(0, 5);

    list.innerHTML = '';

    if (topNotifications.length === 0) {
        list.innerHTML = '<li style="padding: 10px; color: #777;">Tiada notifikasi terkini.</li>';
        return;
    }

    topNotifications.forEach(n => {
        const li = document.createElement('li');
        li.style.cssText = "padding: 10px; border-bottom: 1px solid #eee; display: flex; align-items: center;";
        li.innerHTML = `
            <span style="width: 10px; height: 10px; background: ${n.color}; border-radius: 50%; margin-right: 10px; flex-shrink: 0;"></span>
            <span style="font-size: 0.95em; color: #34495e;">${n.message}</span>
            <small style="margin-left: auto; color: #999; white-space: nowrap; padding-left: 10px;">${n.details}</small>
        `;
        list.appendChild(li);
    });

    // Update Badge Count (Total derived notifications)
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = notifications.length;
        badge.style.display = notifications.length > 0 ? 'block' : 'none';
    }
}

function timeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + " tahun lepas";

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + " bulan lepas";

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + " hari lepas";
    if (interval === 1) return "1 hari lepas";

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + " jam lepas";
    if (interval === 1) return "1 jam lepas";

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + " minit lepas";

    return "Baru sebentar tadi";
}
// QRCode Generation
function generateQRCode() {
    const qrContainer = document.getElementById('qr-code-container');
    const qrcodeDiv = document.getElementById('qrcode');

    // Construct the absolute URL for the formuser.html
    const currentUrl = window.location.href;
    const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));

    let formUrl = `${baseUrl}/formuser.html`;

    // Handle edge case if baseUrl ends with '/'
    if (baseUrl.endsWith('/')) {
        formUrl = `${baseUrl}formuser.html`;
    }

    if (qrcodeDiv) {
        qrContainer.style.display = 'block';
        qrcodeDiv.innerHTML = ""; // Clear existing QR

        // Dynamically load QRCode library if not present
        if (typeof QRCode === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
            script.onload = () => {
                new QRCode(qrcodeDiv, {
                    text: formUrl,
                    width: 128,
                    height: 128
                });
            };
            document.body.appendChild(script);
        } else {
            new QRCode(qrcodeDiv, {
                text: formUrl,
                width: 128,
                height: 128
            });
        }
    }
}

// Download QRCode
function downloadQRCode() {
    const qrcodeDiv = document.getElementById('qrcode');
    const img = qrcodeDiv.querySelector('img');

    if (img) {
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'jkr-aduan-qrcode.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert("Sila jana QR Code dahulu.");
    }
}

function closeQRCode() {
    const qrContainer = document.getElementById('qr-code-container');
    if (qrContainer) {
        qrContainer.style.display = 'none';
        document.getElementById('qrcode').innerHTML = "";
    }
}

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
                        let locationName = '';
                        try {
                            const locationRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                            const locationData = await locationRes.json();
                            // Try differnt fields for best name
                            locationName = locationData.address.city || locationData.address.town || locationData.address.village || locationData.address.county || 'Lokasi';
                        } catch (e) {
                            console.warn("Location name fetch failed", e);
                        }

                        weatherSpan.textContent = `${locationName}: ${temp}°C`;

                        // Map WMO Weather Codes to Icons
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

                        // Add animation class if available in CSS
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

// Live Sync Simulation: Listen for changes in other tabs (Contractor updates)
window.addEventListener('storage', function (e) {
    if (e.key === 'complaints') {
        console.log('Admin Board: Data update detected from Contractor. Refreshing...');
        if (typeof renderComplaintTable === 'function') {
            renderComplaintTable();
        }
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
        if (typeof renderNotifications === 'function') renderNotifications();
    }
});

// Progress & Verification Functions
// Progress & Verification Functions
window.viewProgress = async function (id) {
    console.log("viewProgress called for ID:", id);
    let complaints = window.allComplaints || [];

    // Check cache first
    let complaint = complaints.find(c => c.id == id);

    // If not found in cache, fetch from API (just in case)
    if (!complaint) {
        try {
            const data = await API.getAll();
            complaints = data.complaints || [];
            window.allComplaints = complaints; // Update cache
            complaint = complaints.find(c => c.id == id);
        } catch (e) { console.error(e); }
    }

    if (!complaint) {
        alert("Data aduan tidak dijumpai.");
        return;
    }

    const modal = document.getElementById('view-progress-modal');
    const content = document.getElementById('progress-content');

    if (!modal || !content) {
        console.error("Modal elements not found!");
        alert("Ralat Sistem: Modal paparan tidak dijumpai.");
        return;
    }

    try {
        const progress = complaint.progress || {};

        // Build HTML for progress
        let html = `
            <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3498db; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                        <h4 style="margin: 0; color: #2c3e50;">Aduan #${complaint.id}</h4>
                        <p style="margin: 5px 0; font-size: 13px; color: #7f8c8d;"><i class="fas fa-hard-hat"></i> Kontraktor: <strong>${complaint.contractor || '-'}</strong></p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 12px; color: #7f8c8d;"><i class="fas fa-calendar"></i> Dimulakan: ${complaint.dateReceived ? new Date(complaint.dateReceived).toLocaleString('ms-MY') : '-'}</span><br>
                        <span style="font-size: 12px; color: #7f8c8d;"><i class="fas fa-clock"></i> Tempoh: ${complaint.duration || '-'}</span>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr; gap: 20px;">
        `;

        // Section Helper
        const renderSection = (title, data, color) => {
            let sectionHtml = `
                <div style="background: white; border-radius: 8px; border-top: 5px solid ${color}; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column;">
                    <div style="padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; margin-bottom: 10px;">
                        <h5 style="margin: 0; color: ${color}; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">${title}</h5>
                    </div>
                    <div style="padding: 15px; flex: 1;">
                        <p style="margin: 0 0 15px 0; font-size: 13px; color: #34495e; line-height: 1.5; font-style: italic; background: #fffaf0; padding: 10px; border-radius: 4px; border: 1px solid #ffeaa7;">
                            "${(data && data.notes) ? data.notes : 'Tiada catatan dimasukkan.'}"
                        </p>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            `;

            if (data && data.images && Array.isArray(data.images) && data.images.length > 0) {
                data.images.forEach(src => {
                    sectionHtml += `
                        <div style="width: 120px; height: 120px; border: 1px solid #eee; border-radius: 4px; overflow: hidden; background: #eee;">
                            <img src="${src}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" onclick="window.open('${src}', '_blank')">
                        </div>
                    `;
                });
            } else {
                sectionHtml += `<div style="color: #95a5a6; font-size: 12px;"><i class="fas fa-image"></i> Tiada gambar</div>`;
            }

            sectionHtml += `
                        </div>
                    </div>
                </div>
            `;
            return sectionHtml;
        };

        html += renderSection('1. Sebelum Pembaikan', progress.before, '#e74c3c');
        html += renderSection('2. Semasa Pembaikan', progress.during, '#3498db');
        html += renderSection('3. Selepas Pembaikan', progress.after, '#2ecc71');

        html += `</div>`;

        // --- NEW: ADMIN VERIFICATION SECTION ---
        html += `
            <div style="margin-top: 30px; padding: 25px; background: #f0f7f4; border: 2px dashed #27ae60; border-radius: 12px; text-align: center;">
                <h4 style="margin: 0 0 10px 0; color: #27ae60; text-transform: uppercase; letter-spacing: 1px;">Pengesahan Admin</h4>
                
                ${complaint.isVerified ? `
                    <div style="background: #27ae60; color: white; padding: 15px; border-radius: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 10px;">
                        <i class="fas fa-check-double" style="font-size: 1.5em;"></i> TUGASAN INI TELAH DISAHKAN PADA ${new Date(complaint.verifiedDate).toLocaleString('ms-MY')}
                    </div>
                ` : (complaint.status === 'Selesai' || (progress && progress.after && progress.after.images && progress.after.images.length > 0)) ? `
                    <p style="color: #2c3e50; font-size: 15px; margin-bottom: 20px; font-weight: 500;">
                        "Saya mengesahkan bahawa semua kerja-kerja dilakukan telah siap dilaksanakan"
                    </p>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; background: white; padding: 10px 20px; border-radius: 25px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #d4efdf;">
                            <input type="checkbox" id="verify-check-${complaint.id}" style="width: 18px; height: 18px; cursor: pointer;"> 
                            <span style="font-size: 14px; color: #27ae60; font-weight: 600;">Klik untuk setuju dengan pengesahan ini</span>
                        </label>
                        <button onclick="verifyTask('${complaint.id}')" style="padding: 12px 40px; background: #27ae60; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 700; box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3); transition: all 0.2s;">
                            <i class="fas fa-check-circle"></i> SAHKAN SEKARANG
                        </button>
                    </div>
                ` : `
                    <div style="color: #95a5a6; font-style: italic; background: #fff5e6; padding: 10px; border-radius: 6px; border: 1px dashed #f39c12;">
                        <i class="fas fa-hourglass-half"></i> Menunggu Laporan Akhir & Gambar Selesai daripada Kontraktor sebelum pengesahan boleh dibuat.
                    </div>
                `}
            </div>
        `;
        content.innerHTML = html;
        modal.style.display = 'flex';
        console.log("Modal should be visible now.");

    } catch (err) {
        console.error("Error in viewProgress:", err);
        alert("Ralat memaparkan maklumat perkembangan: " + err.message);
    }
}

window.closeProgressModal = function () {
    const modal = document.getElementById('view-progress-modal');
    if (modal) modal.style.display = 'none';
}

window.verifyTask = async function (id) {
    const check = document.getElementById(`verify-check-${id}`);
    if (!check) return;

    if (!check.checked) {
        alert("Sila klik pada petak pengesahan ('checkbox') sebelum menekan butang Sahkan.");
        return;
    }

    if (!confirm("Adakah anda pasti mahu mengesahkan tugasan ini sebagai Selesai Sepenuhnya?")) {
        return;
    }

    try {
        // Show loading state on button
        const btn = document.querySelector(`button[onclick="verifyTask('${id}')"]`);
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        }

        const verifiedDate = new Date().toISOString();
        const complaints = window.allComplaints || [];
        const index = complaints.findIndex(c => c.id == id);

        if (index === -1) throw new Error("Aduan tidak dijumpai dalam senarai.");

        // Get the current complaint data
        const currentComplaint = { ...complaints[index] };
        currentComplaint.isVerified = true;
        currentComplaint.verifiedDate = verifiedDate;

        // Ensure status is also updated to 'Selesai' if not already
        if (currentComplaint.status !== 'Selesai') {
            currentComplaint.status = 'Selesai';
        }

        // 1. Update Server
        const success = await API.updateRecord('Aduan', 'id', id, currentComplaint);

        if (!success) throw new Error("Gagal mengemaskini data di pelayan.");

        // 2. Update Local Cache
        complaints[index] = currentComplaint;
        window.allComplaints = complaints;

        alert("Tugasan telah berjaya disahkan.");

        // 3. Refresh UI
        // We use a small trick: renderComplaintTable will usually fetch from API.
        // To avoid race conditions, we can wait a bit or just call render with cache if we had that option.
        // For now, let's just refresh the table and progress view.
        renderComplaintTable(window.allComplaints);

        // Re-open progress to show the "TELAH DISAHKAN" state
        viewProgress(id);

    } catch (err) {
        console.error("Verification Error:", err);
        alert("Ralat: " + err.message);

        // Reset button
        const btn = document.querySelector(`button[onclick="verifyTask('${id}')"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> SAHKAN SEKARANG';
        }
    }
}

// ========================================================================
// BRANDING APP (Logo & Background)
// ========================================================================
window.applyGlobalBranding = function () {
    const savedLogo = localStorage.getItem('appLogo');
    const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const header = document.querySelector('.sidebar-header');

    // 1. Apply System Name
    if (header && savedSettings.systemName) {
        const h2 = header.querySelector('h2');
        if (h2) h2.textContent = savedSettings.systemName.toUpperCase();
    }

    // 2. Apply Logo to Sidebar Header
    if (header) {
        let brandingImg = header.querySelector('.branding-logo');

        if (savedLogo) {
            if (!brandingImg) {
                brandingImg = document.createElement('img');
                brandingImg.className = 'branding-logo';
                brandingImg.style.cssText = 'width: 40px; height: 40px; object-fit: contain; margin-right: 10px; vertical-align: middle; background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;';
                // Insert before h2
                const h2 = header.querySelector('h2');
                if (h2) {
                    header.insertBefore(brandingImg, h2);
                    // Adjust h2 to display inline if needed, or flex
                    header.style.display = 'flex';
                    header.style.alignItems = 'center';
                    header.style.justifyContent = 'center';
                    h2.style.fontSize = '1.2rem'; // slightly smaller to fit
                }
            } else {
                brandingImg.src = savedLogo;
                brandingImg.style.display = 'block';
            }
            if (brandingImg.src !== savedLogo) brandingImg.src = savedLogo;
        } else {
            if (brandingImg) brandingImg.style.display = 'none';
        }
    }
};

// Call branding on load
applyGlobalBranding();

// ========================================================================
// SETTINGS MANAGEMENT
// ========================================================================
(function initSettings() {
    // --- Load saved settings from API or Cache ---
    // Note: We cannot easily make the IIFE async without potential race conditions, 
    // but we can call an async function inside.

    // Elements
    const systemNameInput = document.getElementById('setting-system-name');
    const fontSizeInput = document.getElementById('setting-font-size');
    const fontSizeValue = document.getElementById('font-size-value');
    const notifSoundSelect = document.getElementById('setting-notif-sound');
    const notifVolumeInput = document.getElementById('setting-notif-volume');
    const volumeValue = document.getElementById('volume-value');
    const logoUpload = document.getElementById('setting-logo-upload');
    const logoPreview = document.getElementById('logo-preview');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    const btnRemoveLogo = document.getElementById('btn-remove-logo');
    const bgUpload = document.getElementById('setting-bg-upload');
    const bgPreview = document.getElementById('bg-preview');
    const bgPlaceholder = document.getElementById('bg-placeholder');
    const btnRemoveBg = document.getElementById('btn-remove-bg');
    const btnSave = document.getElementById('btn-save-settings');
    const btnPreviewSound = document.getElementById('btn-preview-sound');

    // Helper to populate form
    function populateSettingsForm(settings) {
        if (!settings) return;

        if (systemNameInput && settings.systemName) systemNameInput.value = settings.systemName;
        if (fontSizeInput && settings.fontSize) {
            fontSizeInput.value = settings.fontSize;
            if (fontSizeValue) fontSizeValue.textContent = settings.fontSize + 'px';
        }
        if (notifSoundSelect && settings.notifSound) notifSoundSelect.value = settings.notifSound;
        if (notifVolumeInput && settings.notifVolume !== undefined) {
            notifVolumeInput.value = settings.notifVolume;
            if (volumeValue) volumeValue.textContent = settings.notifVolume + '%';
        }

        // Logo
        if (settings.appLogo && logoPreview && logoPlaceholder && btnRemoveLogo) {
            logoPreview.src = settings.appLogo;
            logoPreview.style.display = 'block';
            logoPlaceholder.style.display = 'none';
            btnRemoveLogo.style.display = 'inline-block';
        }

        // Background
        if (settings.appBackground && bgPreview && bgPlaceholder && btnRemoveBg) {
            bgPreview.src = settings.appBackground;
            bgPreview.style.display = 'block';
            bgPlaceholder.style.display = 'none';
            btnRemoveBg.style.display = 'inline-block';
        }
    }

    // Attempt to load from cache or fetch
    if (window.allSettings) {
        populateSettingsForm(window.allSettings);
    } else {
        (async () => {
            try {
                const data = await API.getAll();
                window.allSettings = data.settings || {};
                populateSettingsForm(window.allSettings);
            } catch (e) { console.error(e); }
        })();
    }

    // --- Font Size Slider ---
    if (fontSizeInput && fontSizeValue) {
        fontSizeInput.addEventListener('input', function () {
            fontSizeValue.textContent = this.value + 'px';
        });
    }

    // --- Volume Slider ---
    if (notifVolumeInput && volumeValue) {
        notifVolumeInput.addEventListener('input', function () {
            volumeValue.textContent = this.value + '%';
        });
    }

    // --- Sound Preview using Web Audio API ---
    if (btnPreviewSound) {
        btnPreviewSound.addEventListener('click', async function () {
            const soundType = notifSoundSelect ? notifSoundSelect.value : 'none';
            const volume = notifVolumeInput ? parseInt(notifVolumeInput.value) / 100 : 0.7;

            if (soundType === 'none') {
                alert('Bunyi notifikasi dimatikan.');
                return;
            }

            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioCtx();

                // Resume context if suspended (browser autoplay policy)
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                const gainNode = ctx.createGain();
                gainNode.gain.value = volume;
                gainNode.connect(ctx.destination);

                // Different tones for each sound type
                const soundMap = {
                    chime: [523.25, 659.25, 783.99],  // C5, E5, G5
                    bell: [880],                       // A5
                    ding: [1046.50],                   // C6
                    alert: [440, 554.37],               // A4, C#5
                    soft: [392, 493.88]                 // G4, B4
                };

                const frequencies = soundMap[soundType] || [440];
                const duration = 0.25;

                frequencies.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    osc.type = soundType === 'bell' ? 'sine' : (soundType === 'alert' ? 'square' : 'triangle');
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * duration));

                    const envGain = ctx.createGain();
                    envGain.gain.setValueAtTime(0, ctx.currentTime + (i * duration));
                    envGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + (i * duration) + 0.05);
                    envGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (i * duration) + duration);

                    osc.connect(envGain);
                    envGain.connect(ctx.destination);
                    osc.start(ctx.currentTime + (i * duration));
                    osc.stop(ctx.currentTime + (i * duration) + duration);
                });
            } catch (e) {
                console.error('Audio preview error:', e);
                alert('Tidak dapat memainkan bunyi. Pastikan pelayar menyokong Web Audio API.');
            }
        });
    }

    // --- Logo Upload Handler ---
    if (logoUpload) {
        logoUpload.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Saiz logo terlalu besar. Maksimum 5MB.');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                if (logoPreview) {
                    logoPreview.src = e.target.result;
                    logoPreview.style.display = 'block';
                }
                if (logoPlaceholder) logoPlaceholder.style.display = 'none';
                if (btnRemoveLogo) btnRemoveLogo.style.display = 'inline-block';
                // Temporarily store in memory, save on btn click
                logoUpload.dataset.base64 = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // --- Remove Logo ---
    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', function () {
            if (logoPreview) { logoPreview.src = ''; logoPreview.style.display = 'none'; }
            if (logoPlaceholder) logoPlaceholder.style.display = 'block';
            if (logoUpload) { logoUpload.value = ''; delete logoUpload.dataset.base64; }
            this.style.display = 'none';
            // Mark for deletion in object
            if (window.allSettings) window.allSettings.appLogo = '';
        });
    }

    // --- Background Upload Handler ---
    if (bgUpload) {
        bgUpload.addEventListener('change', function () {
            const file = this.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Saiz imej latar belakang terlalu besar. Maksimum 5MB.');
                this.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function (e) {
                if (bgPreview) {
                    bgPreview.src = e.target.result;
                    bgPreview.style.display = 'block';
                }
                if (bgPlaceholder) bgPlaceholder.style.display = 'none';
                if (btnRemoveBg) btnRemoveBg.style.display = 'inline-block';
                bgUpload.dataset.base64 = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // --- Remove Background ---
    if (btnRemoveBg) {
        btnRemoveBg.addEventListener('click', function () {
            if (bgPreview) { bgPreview.src = ''; bgPreview.style.display = 'none'; }
            if (bgPlaceholder) bgPlaceholder.style.display = 'block';
            if (bgUpload) { bgUpload.value = ''; delete bgUpload.dataset.base64; }
            this.style.display = 'none';
            // Mark for deletion in object
            if (window.allSettings) window.allSettings.appBackground = '';
        });
    }

    // --- Save All Settings ---
    if (btnSave) {
        btnSave.addEventListener('click', async function () {
            // UI Feedback
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            this.disabled = true;

            const settings = {
                systemName: systemNameInput ? systemNameInput.value : 'Sistem Aduan Kerosakan JKR',
                fontSize: fontSizeInput ? fontSizeInput.value : '14',
                notifSound: notifSoundSelect ? notifSoundSelect.value : 'chime',
                notifVolume: notifVolumeInput ? notifVolumeInput.value : '70'
            };

            try {
                // Initialize window.allSettings if needed
                if (!window.allSettings) window.allSettings = {};

                // Handle Logo
                const logoUploadEl = document.getElementById('setting-logo-upload');
                if (logoUploadEl && logoUploadEl.dataset.base64) {
                    settings.appLogo = logoUploadEl.dataset.base64;
                } else if (window.allSettings.appLogo) {
                    settings.appLogo = window.allSettings.appLogo;
                }

                // Handle Background
                const bgUploadEl = document.getElementById('setting-bg-upload');
                if (bgUploadEl && bgUploadEl.dataset.base64) {
                    settings.appBackground = bgUploadEl.dataset.base64;
                } else if (window.allSettings.appBackground) {
                    settings.appBackground = window.allSettings.appBackground;
                }

                // Save via API specifically
                const success = await API.updateSettings(settings);

                if (!success) throw new Error("Gagal simpan ke pelayan.");

                // Optimistic update for cache
                window.allSettings = settings;

                // Apply font size
                document.body.style.fontSize = settings.fontSize + 'px';

                // Apply branding
                applyGlobalBranding();

                // Success feedback
                this.innerHTML = '<i class="fas fa-check-circle"></i> Tetapan Berjaya Disimpan!';
                this.style.background = 'linear-gradient(135deg, #27ae60, #2ecc71)';

                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.background = 'linear-gradient(135deg, #2c3e50, #3498db)';
                    this.disabled = false;
                }, 2000);

            } catch (e) {
                console.error("Storage Error:", e);
                alert("Ralat menyimpan tetapan ke Google Sheet.");
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal Disimpan';
                this.style.background = '#e74c3c';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.style.background = 'linear-gradient(135deg, #2c3e50, #3498db)';
                    this.disabled = false;
                }, 3000);
            }
        });
    }
})();
// --- REPORT FUNCTIONS ---

window.renderReportTable = async function () {
    console.log("Rendering Report Table...");
    const tbody = document.getElementById('report-table-body');
    const dateSpan = document.getElementById('report-date');

    if (!tbody) return;

    // Update Date
    if (dateSpan) dateSpan.textContent = new Date().toLocaleString('ms-MY');

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Memuatkan data...</td></tr>';

    try {
        // Ensure data is loaded
        let complaints = window.allComplaints;
        if (!complaints || complaints.length === 0) {
            const data = await API.getAll();
            complaints = data.complaints || [];
            window.allComplaints = complaints;
        }

        tbody.innerHTML = '';

        if (complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Tiada rekod aduan.</td></tr>';
            return;
        }

        // Sort by date descending
        complaints.sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));

        // Render Chart
        if (typeof renderStatusChart === 'function') renderStatusChart(complaints);

        complaints.forEach(c => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            // Status Styling
            let statusColor = '#95a5a6';
            if (c.status === 'Baru') statusColor = '#f1c40f'; // Yellow
            if (c.status === 'Selesai') statusColor = '#2ecc71'; // Green
            if (c.status === 'Ditolak') statusColor = '#e74c3c'; // Red
            if (c.status === 'Dalam Proses' || c.status === 'Sedang Dibaiki Oleh Kontraktor') statusColor = '#3498db'; // Blue

            tr.innerHTML = `
                <td style="padding: 10px;">${c.id}</td>
                <td style="padding: 10px;">${c.date || '-'}</td>
                <td style="padding: 10px;">${c.name || '-'}</td>
                <td style="padding: 10px;">${c.location || '-'}</td>
                <td style="padding: 10px;">${c.description || '-'}</td>
                <td style="padding: 10px;"><span style="background:${statusColor}; color:white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${c.status}</span></td>
                <td style="padding: 10px;">${c.contractor || '-'}</td>
                <td style="padding: 10px;">${c.duration || '-'}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (e) {
        console.error("Report Render Error:", e);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Ralat memuatkan data report.</td></tr>';
    }
};

window.downloadReportPDF = function () {
    const btnPdf = document.getElementById('btn-download-pdf');
    const complaints = window.allComplaints || [];

    if (complaints.length === 0) {
        alert("Tiada data untuk dijana.");
        return;
    }

    // Create a temporary container for the PDF - Calibrated for A4
    const reportDiv = document.createElement('div');
    reportDiv.id = 'pdf-render-container';
    // 720px width fits perfectly in A4 with 15mm margins
    reportDiv.style.cssText = 'width: 720px; padding: 0; background: white; font-family: "Helvetica", "Arial", sans-serif; color: #333; margin: 0 auto;';

    const dateStr = new Date().toLocaleDateString('ms-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const logoUrl = localStorage.getItem('appLogo') || '';

    // 1. OFFICIAL HEADER (Centered)
    let headerHtml = `
        <div style="padding: 50px 40px 20px 40px; border-bottom: 3px double #2c3e50; margin-bottom: 30px; text-align: center;">
            <div style="display: inline-block; width: 100%;">
    `;

    if (logoUrl) {
        headerHtml += `<img src="${logoUrl}" style="height: 75px; margin-bottom: 15px; object-fit: contain;">`;
    } else {
        headerHtml += `<div style="font-size: 30px; font-weight: 900; color: #2c3e50; margin-bottom: 15px; letter-spacing: 2px;">JKR</div>`;
    }

    headerHtml += `
                <h1 style="margin: 0; font-size: 20px; color: #1a1a1a; letter-spacing: 0.5px; text-transform: uppercase; font-weight: 800;">Jabatan Kerja Raya Malaysia</h1>
                <h2 style="margin: 5px 0 0 0; font-size: 15px; color: #2c3e50; font-weight: 600;">PORTAL PENGURUSAN ADUAN KEROSAKAN (JKR ADUAN)</h2>
                <div style="margin: 15px auto; width: 80px; height: 3px; background: #3498db;"></div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #7f8c8d; font-weight: 600; text-transform: uppercase;">LAPORAN ANALISIS STATUS ADUAN • ${dateStr}</p>
            </div>
        </div>
    `;

    // 2. SUMMARY STATISTICS (Properly Centered)
    let chartHtml = '';
    const canvas = document.getElementById('statusChart');
    if (canvas) {
        try {
            const chartImgUrl = canvas.toDataURL('image/png', 1.0);
            chartHtml = `
                <div style="padding: 0 40px; margin-bottom: 35px; page-break-inside: avoid;">
                    <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; border: 1px solid #e9ecef; text-align: center;">
                        <h4 style="margin: 0 0 15px 0; font-size: 14px; color: #2c3e50; text-transform: uppercase; border-left: 4px solid #3498db; padding-left: 12px; font-weight: 700; text-align: left;">Ringkasan Visual Statistik</h4>
                        <img src="${chartImgUrl}" style="max-width: 450px; height: auto; display: inline-block;">
                    </div>
                </div>
            `;
        } catch (e) {
            console.warn("Chart conversion failed", e);
        }
    }

    // 3. DATA TABLE (Balanced width)
    let tableHtml = '';
    const tableSource = document.getElementById('report-table');
    if (tableSource) {
        const tableClone = tableSource.cloneNode(true);
        tableClone.style.cssText = 'width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; margin-bottom: 30px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden;';

        const ths = tableClone.querySelectorAll('th');
        ths.forEach(th => {
            th.style.cssText = 'background-color: #2c3e50; color: #ffffff; padding: 12px 8px; text-align: left; font-weight: 700; border-bottom: 2px solid #1a1a1a;';
        });

        const trs = tableClone.querySelectorAll('tbody tr');
        trs.forEach((tr, index) => {
            tr.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
            tr.style.pageBreakInside = 'avoid';

            const tds = tr.querySelectorAll('td');
            tds.forEach(td => {
                td.style.cssText = 'padding: 8px; border-bottom: 1px solid #dee2e6; vertical-align: top; color: #444; line-height: 1.4;';
            });
        });

        tableHtml = `
            <div style="padding: 0 40px;">
                <h4 style="margin: 0 0 15px 0; font-size: 14px; color: #2c3e50; text-transform: uppercase; border-left: 4px solid #2ecc71; padding-left: 12px; font-weight: 700;">Butiran Transaksi Aduan</h4>
                <div style="width: 100%; overflow: hidden;">
                    ${tableClone.outerHTML}
                </div>
            </div>
        `;
    }

    // 4. FOOTER
    const footerHtml = `
        <div style="padding: 15px 40px 40px 40px; margin-top: 10px; border-top: 1px solid #dee2e6; font-size: 10px; color: #95a5a6; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: 600;">
                <span style="color: #2c3e50;">SISTEM JKR ADUAN</span> • Jana Laporan Automatik
            </div>
            <div style="text-align: right;">
                Tarikh Cetakan: ${new Date().toLocaleString('ms-MY')}<br>
                Halaman 1
            </div>
        </div>
    `;

    // Combine all sections
    reportDiv.innerHTML = headerHtml + chartHtml + tableHtml + footerHtml;
    // Add to body temporarily to ensure correct calculation in some browsers
    reportDiv.style.position = 'absolute';
    reportDiv.style.left = '-9999px';
    reportDiv.style.top = '0';
    document.body.appendChild(reportDiv);

    const opt = {
        margin: 15, // 15mm margin all around
        filename: `Laporan_Aduan_JKR_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 720 // Match our reportDiv width
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (window.html2pdf) {
        btnPdf.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menjana...';
        btnPdf.disabled = true;

        html2pdf().set(opt).from(reportDiv).save().then(() => {
            btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i> Muat Turun PDF';
            btnPdf.disabled = false;
            document.body.removeChild(reportDiv);
        }).catch(err => {
            console.error("PDF Final Error:", err);
            alert("Ralat menjana PDF.");
            btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i> Muat Turun PDF';
            btnPdf.disabled = false;
            if (document.getElementById('pdf-render-container')) document.body.removeChild(reportDiv);
        });
    } else {
        alert("Library PDF gagal dimuatkan.");
        document.body.removeChild(reportDiv);
    }
};

window.exportReportExcel = function () {
    const complaints = window.allComplaints || [];
    if (complaints.length === 0) {
        alert("Tiada data untuk dieksport.");
        return;
    }

    // Define CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Aduan,Tarikh,Nama Pengadu,Jabatan,No Telefon,Lokasi,Kerosakan,Status,Kontraktor,Tempoh Siap,Catatan Admin\r\n";

    complaints.forEach(c => {
        // Escape commas in fields
        const escape = (text) => {
            if (!text) return "";
            return `"${text.toString().replace(/"/g, '""')}"`; // Escape double quotes
        };

        const row = [
            c.id,
            c.date,
            escape(c.name),
            escape(c.dept),
            escape(c.phone),
            escape(c.location),
            escape(c.description),
            escape(c.status),
            escape(c.contractor),
            escape(c.duration),
            escape(c.adminNotes)
        ];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Aduan_JKR_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// Chart Rendering Function
window.statusChartInstance = null; // Global variable to store chart instance

window.renderStatusChart = function (complaints) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    // Wait for Chart.js if not ready
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, retrying...');
        setTimeout(() => window.renderStatusChart(complaints), 500);
        return;
    }

    // Destroy previous chart if exists
    if (window.statusChartInstance) {
        window.statusChartInstance.destroy();
    }

    // Process Data
    const stats = {
        'Baru': 0,
        'Dalam Proses': 0,
        'Selesai': 0,
        'Ditolak': 0
    };

    complaints.forEach(c => {
        let status = c.status || 'Baru';
        // Normalize statuses
        if (status === 'Baru') {
            stats['Baru']++;
        } else if (status === 'Selesai') {
            stats['Selesai']++;
        } else if (status === 'Ditolak') {
            stats['Ditolak']++;
        } else {
            // Assume everything else is 'Dalam Proses'
            stats['Dalam Proses']++;
        }
    });

    // Create Chart
    window.statusChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Baru', 'Dalam Proses', 'Selesai', 'Ditolak'],
            datasets: [{
                data: [stats['Baru'], stats['Dalam Proses'], stats['Selesai'], stats['Ditolak']],
                backgroundColor: [
                    '#f1c40f', // Yellow - Baru
                    '#3498db', // Blue - Dalam Proses
                    '#2ecc71', // Green - Selesai
                    '#e74c3c'  // Red - Ditolak
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            family: "'Segoe UI', sans-serif"
                        },
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Taburan Status Aduan',
                    font: {
                        size: 16
                    }
                },
                datalabels: {
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 16
                    },
                    formatter: function (value, context) {
                        return value > 0 ? value : ''; // Only show if > 0
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        },
        plugins: [ChartDataLabels]
    });
};

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

// ===== SUCCESS ANIMATION HELPERS =====
/**
 * Show the animated success modal
 * @param {string} title - Title text
 * @param {string} message - HTML message body
 * @param {string} refNo - Optional contractor reference number to highlight
 */
function showSuccessModal(title, message, refNo = '') {
    const modal = document.getElementById('success-animate-modal');
    const titleEl = document.getElementById('success-title');
    const msgEl = document.getElementById('success-message');
    const badge = document.getElementById('success-badge');
    const refEl = document.getElementById('success-ref-no');
    const card = document.getElementById('success-animate-card');

    if (!modal) return;

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;

    // Show or hide ref number badge
    if (refNo && badge && refEl) {
        refEl.textContent = refNo;
        badge.style.display = 'block';
    } else if (badge) {
        badge.style.display = 'none';
    }

    // Re-trigger animation by cloning card
    if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // force reflow
        card.style.animation = 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)';
    }

    modal.style.display = 'flex';
    // Auto-close after 6s
    setTimeout(() => closeSuccessModal(), 6000);
}

/**
 * Close the success animation modal
 */
function closeSuccessModal() {
    const modal = document.getElementById('success-animate-modal');
    if (modal) modal.style.display = 'none';
}
