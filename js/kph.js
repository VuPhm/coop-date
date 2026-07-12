import { isValidDateStr, parseLocalDate, formatLocalDate, showAppleConfirm, showAppleToast, loadExcelJS } from './helpers.js';
import { addLog, deleteLog, clearAllLogs, getAllLogs } from './db.js';

export let activeTab = 'tracuu';
export let kphActiveSubTab = 'TPCN';
export let kphCurrentType = 'TPCN';
export const kphLogs = [];
export let kphImageBlob = null;
export let kphImagePreviewUrl = null;
export let kphNgayPicker, kphNgayXuLyPicker, kphApproveNgayXuLyPicker;
export let kphFilterTuNgayPicker, kphFilterDenNgayPicker;

// Định dạng ngày giờ dạng dd/mm/yyyy hh:mm:ss
export function formatLocalDateTime(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    const h = String(dateObj.getHours()).padStart(2, '0');
    const mi = String(dateObj.getMinutes()).padStart(2, '0');
    const s = String(dateObj.getSeconds()).padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${mi}:${s}`;
}

// Cấu hình lọc và sắp xếp bảng KPH
export let kphSortField = null;
export let kphSortDirection = 'desc'; // 'asc' hoặc 'desc'
export let kphFilterTuNgay = '';
export let kphFilterDenNgay = '';
export const kphSelectedIds = new Set();

export function setKphImageBlob(val) {
    kphImageBlob = val;
}

// Điều hướng Tab
export function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active-tab'));

    if (tabId === 'tracuu') {
        const btnTraCuu = document.getElementById('tab-btn-tracuu');
        const tabTraCuu = document.getElementById('tab-tracuu');
        if (btnTraCuu) btnTraCuu.classList.add('active');
        if (tabTraCuu) tabTraCuu.classList.add('active-tab');
    } else if (tabId === 'kph') {
        const btnKph = document.getElementById('tab-btn-kph');
        const tabKph = document.getElementById('tab-kph');
        if (btnKph) btnKph.classList.add('active');
        if (tabKph) tabKph.classList.add('active-tab');
        initKphFlatpickrs();
        loadStoreSettings();
        updateKphLogsUI();
    }
}

// Điều hướng Sub-Tab của KPH
export function switchKphSubTab(subTabId) {
    kphActiveSubTab = subTabId;
    document.querySelectorAll('.kph-sub-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`sub-tab-btn-${subTabId.toLowerCase()}`);
    if (activeBtn) activeBtn.classList.add('active');

    kphSelectedIds.clear();
    const selectAllCheckbox = document.getElementById('kphSelectAll');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
    if (selectAllCheckboxMobile) selectAllCheckboxMobile.checked = false;

    updateKphLogsUI();
}

// Khởi tạo lịch cho tab KPH (form và filter)
export function initKphFlatpickrs() {
    if (!kphNgayPicker) {
        kphNgayPicker = flatpickr("#kphNgayPhatHienHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            disableMobile: true,
            appendTo: document.getElementById('kphNgayPhatHien').parentNode,
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphNgayPhatHien').value = dateStr;
                if (kphCurrentType === 'TPTS') {
                    const dateXuLyInput = document.getElementById('kphNgayXuLy');
                    if (dateXuLyInput) {
                        dateXuLyInput.value = dateStr;
                        if (kphNgayXuLyPicker) kphNgayXuLyPicker.setDate(selectedDates[0], false);
                    }
                }
            }
        });
        if (!document.getElementById('kphNgayPhatHien').value) {
            document.getElementById('kphNgayPhatHien').value = formatLocalDate(new Date());
            kphNgayPicker.setDate(new Date(), false);
        }
        document.getElementById('kphNgayPhatHien').addEventListener('input', () => {
            const val = document.getElementById('kphNgayPhatHien').value.trim();
            if (isValidDateStr(val)) {
                const parsedDate = parseLocalDate(val);
                kphNgayPicker.setDate(parsedDate, false);
                if (kphCurrentType === 'TPTS') {
                    const dateXuLyInput = document.getElementById('kphNgayXuLy');
                    if (dateXuLyInput) {
                        dateXuLyInput.value = val;
                        if (kphNgayXuLyPicker) kphNgayXuLyPicker.setDate(parsedDate, false);
                    }
                }
            } else if (val === '') {
                kphNgayPicker.clear();
                if (kphCurrentType === 'TPTS') {
                    const dateXuLyInput = document.getElementById('kphNgayXuLy');
                    if (dateXuLyInput) {
                        dateXuLyInput.value = '';
                        if (kphNgayXuLyPicker) kphNgayXuLyPicker.clear();
                    }
                }
            }
        });
    }
    if (!kphNgayXuLyPicker) {
        kphNgayXuLyPicker = flatpickr("#kphNgayXuLyHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            disableMobile: true,
            appendTo: document.getElementById('kphNgayXuLy').parentNode,
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphNgayXuLy').value = dateStr;
            }
        });
        document.getElementById('kphNgayXuLy').addEventListener('input', () => {
            const val = document.getElementById('kphNgayXuLy').value.trim();
            if (isValidDateStr(val)) {
                kphNgayXuLyPicker.setDate(parseLocalDate(val), false);
            } else if (val === '') {
                kphNgayXuLyPicker.clear();
            }
        });
    }
    if (!kphFilterTuNgayPicker) {
        kphFilterTuNgayPicker = flatpickr("#kphFilterTuNgayHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            disableMobile: true,
            appendTo: document.getElementById('kphFilterTuNgay').parentNode,
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphFilterTuNgay').value = dateStr;
                applyKphDateFilter();
            }
        });
        document.getElementById('kphFilterTuNgay').addEventListener('input', () => {
            const val = document.getElementById('kphFilterTuNgay').value.trim();
            if (isValidDateStr(val)) {
                kphFilterTuNgayPicker.setDate(parseLocalDate(val), false);
                applyKphDateFilter();
            } else if (val === '') {
                kphFilterTuNgayPicker.clear();
                applyKphDateFilter();
            }
        });
    }
    if (!kphFilterDenNgayPicker) {
        kphFilterDenNgayPicker = flatpickr("#kphFilterDenNgayHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            disableMobile: true,
            appendTo: document.getElementById('kphFilterDenNgay').parentNode,
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphFilterDenNgay').value = dateStr;
                applyKphDateFilter();
            }
        });
        document.getElementById('kphFilterDenNgay').addEventListener('input', () => {
            const val = document.getElementById('kphFilterDenNgay').value.trim();
            if (isValidDateStr(val)) {
                kphFilterDenNgayPicker.setDate(parseLocalDate(val), false);
                applyKphDateFilter();
            } else if (val === '') {
                kphFilterDenNgayPicker.clear();
                applyKphDateFilter();
            }
        });
    }
    if (!kphApproveNgayXuLyPicker) {
        kphApproveNgayXuLyPicker = flatpickr("#kphApproveNgayXuLyHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            disableMobile: true,
            appendTo: document.getElementById('kphApproveNgayXuLy').parentNode,
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphApproveNgayXuLy').value = dateStr;
            }
        });
        document.getElementById('kphApproveNgayXuLy').addEventListener('input', () => {
            const val = document.getElementById('kphApproveNgayXuLy').value.trim();
            if (isValidDateStr(val)) {
                kphApproveNgayXuLyPicker.setDate(parseLocalDate(val), false);
            } else if (val === '') {
                kphApproveNgayXuLyPicker.clear();
            }
        });
    }
}

export function openKphNgayPicker() { if (kphNgayPicker) kphNgayPicker.open(); }
export function openKphNgayXuLyPicker() { if (kphNgayXuLyPicker) kphNgayXuLyPicker.open(); }
export function openKphApproveNgayXuLyPicker() { if (kphApproveNgayXuLyPicker) kphApproveNgayXuLyPicker.open(); }
export function openFilterTuNgayPicker() { if (kphFilterTuNgayPicker) kphFilterTuNgayPicker.open(); }
export function openFilterDenNgayPicker() { if (kphFilterDenNgayPicker) kphFilterDenNgayPicker.open(); }

// Đóng mở trường nhập "Khác"
export function toggleTinhTrangKhac(val) {
    toggleTinhTrangRadio(val);
}

export function toggleBienPhapKhac(val) {
    toggleBienPhapRadio(val);
}

export function toggleTinhTrangRadio(val) {
    const col = document.getElementById('colTinhTrangKhac');
    if (col) {
        col.style.display = (val === 'Khác') ? '' : 'none';
    }
}

export function toggleBienPhapRadio(val) {
    const col = document.getElementById('colBienPhapKhac');
    if (col) {
        col.style.display = (val === 'KHÁC') ? '' : 'none';
    }
}

export function updateCharCount(inputId, countId) {
    const input = document.getElementById(inputId);
    const count = document.getElementById(countId);
    if (input && count) {
        count.textContent = input.value.length;
    }
}

// Quản lý cấu hình cửa hàng
export function saveStoreSettings() {
    const cf = document.getElementById('kphCoopFood').value.trim();
    const store = document.getElementById('kphStore').value.trim();
    const cht = document.getElementById('kphCht') ? document.getElementById('kphCht').value.trim() : '';
    localStorage.setItem('kph_coop_food', cf);
    localStorage.setItem('kph_store', store);
    localStorage.setItem('kph_cht', cht);
    updateStoreSettingsLabels(cf, store, cht);

    // Đồng bộ ngược lại sidebar
    const sidebarCf = document.getElementById('sidebarCoopFood');
    const sidebarStore = document.getElementById('sidebarStore');
    const sidebarCht = document.getElementById('sidebarCht');
    if (sidebarCf) sidebarCf.value = cf;
    if (sidebarStore) sidebarStore.value = store;
    if (sidebarCht) sidebarCht.value = cht;
}

export function saveNguoiPhatHien() {
    const name = document.getElementById('kphNguoiPhatHien').value.trim();
    localStorage.setItem('kph_nguoi_phat_hien', name);
}

// Hàm tải thiết lập cửa hàng khi khởi động tab KPH hoặc app
export function loadStoreSettings() {
    const cf = localStorage.getItem('kph_coop_food') || '';
    const store = localStorage.getItem('kph_store') || '';
    const cht = localStorage.getItem('kph_cht') || '';
    const name = localStorage.getItem('kph_nguoi_phat_hien') || '';

    const kphCf = document.getElementById('kphCoopFood');
    const kphStore = document.getElementById('kphStore');
    const kphCht = document.getElementById('kphCht');
    const kphName = document.getElementById('kphNguoiPhatHien');

    if (kphCf) kphCf.value = cf;
    if (kphStore) kphStore.value = store;
    if (kphCht) kphCht.value = cht;
    if (kphName) kphName.value = name;

    // Prefill sidebar inputs
    const sidebarCf = document.getElementById('sidebarCoopFood');
    const sidebarStore = document.getElementById('sidebarStore');
    const sidebarCht = document.getElementById('sidebarCht');
    if (sidebarCf) sidebarCf.value = cf;
    if (sidebarStore) sidebarStore.value = store;
    if (sidebarCht) sidebarCht.value = cht;

    updateStoreSettingsLabels(cf, store, cht);
}

// Lưu thiết lập cửa hàng từ Sidebar và đồng bộ ngược về tab KPH
export function saveSidebarSettings() {
    const sidebarCf = document.getElementById('sidebarCoopFood');
    const sidebarStore = document.getElementById('sidebarStore');
    const sidebarCht = document.getElementById('sidebarCht');

    const cf = sidebarCf ? sidebarCf.value.trim() : '';
    const store = sidebarStore ? sidebarStore.value.trim() : '';
    const cht = sidebarCht ? sidebarCht.value.trim() : '';

    localStorage.setItem('kph_coop_food', cf);
    localStorage.setItem('kph_store', store);
    localStorage.setItem('kph_cht', cht);

    // Đồng bộ về tab KPH
    const kphCf = document.getElementById('kphCoopFood');
    const kphStore = document.getElementById('kphStore');
    const kphCht = document.getElementById('kphCht');

    if (kphCf) kphCf.value = cf;
    if (kphStore) kphStore.value = store;
    if (kphCht) kphCht.value = cht;

    updateStoreSettingsLabels(cf, store, cht);
}

// Xử lý nén ảnh minh chứng trên Canvas
export function handleKphImageUpload(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const MAX_WIDTH = 1024;
            const MAX_HEIGHT = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            // Nén JPEG chất lượng 0.7 để bảo vệ bộ nhớ IndexedDB
            canvas.toBlob(function (blob) {
                if (kphImagePreviewUrl) {
                    URL.revokeObjectURL(kphImagePreviewUrl);
                }
                kphImageBlob = blob;
                kphImagePreviewUrl = URL.createObjectURL(blob);

                const previewImg = document.getElementById('kphImagePreview');
                const previewContainer = document.getElementById('kphPreviewContainer');
                if (previewImg) previewImg.src = kphImagePreviewUrl;
                if (previewContainer) previewContainer.style.display = 'block';
            }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export function clearKphImage() {
    if (kphImagePreviewUrl) {
        URL.revokeObjectURL(kphImagePreviewUrl);
        kphImagePreviewUrl = null;
    }
    kphImageBlob = null;
    const kphImageInput = document.getElementById('kphImageInput');
    if (kphImageInput) kphImageInput.value = '';
    const kphCameraInput = document.getElementById('kphCameraInput');
    if (kphCameraInput) kphCameraInput.value = '';
    const kphLibraryInput = document.getElementById('kphLibraryInput');
    if (kphLibraryInput) kphLibraryInput.value = '';
    const previewContainer = document.getElementById('kphPreviewContainer');
    const previewImg = document.getElementById('kphImagePreview');
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
}

// CRUD Phiếu khai báo KPH
export async function loadKphLogs() {
    try {
        // Tự động di chuyển dữ liệu cũ từ localStorage sang IndexedDB
        const stored = localStorage.getItem('coop_kph_logs');
        if (stored) {
            console.log("Tìm thấy dữ liệu KPH cũ trong localStorage, tiến hành migration sang IndexedDB...");
            try {
                const oldLogs = JSON.parse(stored);
                for (const log of oldLogs) {
                    if (log.image && typeof log.image === 'string' && log.image.startsWith('data:')) {
                        try {
                            const parts = log.image.split(',');
                            const mime = parts[0].match(/:(.*?);/)[1] || 'image/jpeg';
                            const binStr = atob(parts[1]);
                            const len = binStr.length;
                            const arr = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                arr[i] = binStr.charCodeAt(i);
                            }
                            log.image = new Blob([arr], { type: mime });
                        } catch (err) {
                            console.error("Lỗi chuyển đổi ảnh cũ sang Blob:", err);
                        }
                    }
                    await addLog(log);
                }
                localStorage.removeItem('coop_kph_logs');
                console.log("Migration dữ liệu KPH sang IndexedDB thành công!");
            } catch (err) {
                console.error("Lỗi trong quá trình migration dữ liệu KPH:", err);
            }
        }

        const logs = await getAllLogs();
        kphLogs.length = 0;
        kphLogs.push(...logs.map(log => {
            if (!log.loaiKph) {
                log.loaiKph = 'TPCN';
            }
            return log;
        }));
        updateKphLogsUI();
    } catch (e) {
        console.error("Failed to load KPH logs from IndexedDB", e);
    }
}

// Hàm lưu log (để tương thích ngược nếu cần, thực tế lưu trực tiếp khi CRUD)
export async function saveKphLogs() {
    try {
        for (const log of kphLogs) {
            await addLog(log);
        }
    } catch (e) {
        console.error("Failed to save KPH logs to IndexedDB", e);
    }
}

export async function addKphLog() {
    const ngayPhatHien = document.getElementById('kphNgayPhatHien').value.trim();
    const nguoiPhatHien = document.getElementById('kphNguoiPhatHien').value.trim();
    const sku = document.getElementById('kphSku').value.trim();
    const tenHang = document.getElementById('kphTenHang').value.trim();
    const ncc = document.getElementById('kphNcc').value.trim();
    const dvt = document.querySelector('input[name="kphDvt"]:checked').value;
    const soLuong = parseFloat(document.getElementById('kphSoLuong').value.trim() || '1');

    const tinhTrangRadio = document.querySelector('input[name="kphTinhTrangRadio"]:checked');
    let tinhTrang = tinhTrangRadio ? tinhTrangRadio.value : 'Hư Hỏng';
    if (tinhTrang === 'Khác') {
        tinhTrang = document.getElementById('kphTinhTrangKhacInput').value.trim();
        if (!tinhTrang) tinhTrang = 'Khác';
    }

    const bienPhapRadio = document.querySelector('input[name="kphBienPhapRadio"]:checked');
    let bienPhap = bienPhapRadio ? bienPhapRadio.value : 'HỦY';
    let bienPhapText = bienPhap;
    if (bienPhap === 'KHÁC') {
        bienPhapText = document.getElementById('kphBienPhapKhacInput').value.trim();
        if (!bienPhapText) bienPhapText = 'KHÁC';
    }

    const ngayXuLy = document.getElementById('kphNgayXuLy').value.trim();
    const ghiChu = document.getElementById('kphGhiChu').value.trim();

    // Kiểm tra các trường bắt buộc
    if (!ngayPhatHien || isNaN(soLuong) || !nguoiPhatHien) {
        showAppleToast("⚠️ Vui lòng điền đầy đủ các thông tin: Ngày phát hiện, Số lượng, Người phát hiện.", "warning");
        return;
    }

    if (!sku && !tenHang) {
        showAppleToast("⚠️ Vui lòng điền ít nhất Mã SKU/UPC hoặc Tên hàng hóa.", "warning");
        return;
    }

    if (!kphImageBlob) {
        showAppleToast("⚠️ Ảnh minh chứng là bắt buộc. Vui lòng chụp hoặc chọn ảnh từ thư viện.", "warning");
        return;
    }

    const logEntry = {
        id: 'kph_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ngayPhatHien,
        nguoiPhatHien,
        sku,
        tenHang,
        ncc,
        dvt,
        soLuong,
        tinhTrang,
        bienPhap,
        bienPhapText,
        ngayXuLy,
        ghiChu,
        trangThaiDuyet: 'cho_duyet',
        thoiGianDuyet: '',
        loaiKph: kphCurrentType,
        image: kphImageBlob // Lưu trữ binary Blob trực tiếp
    };

    try {
        await addLog(logEntry);
        kphLogs.unshift(logEntry);
        // Tự động tích chọn dòng mới thêm
        kphSelectedIds.add(logEntry.id);

        showAppleToast("Đã lưu phiếu khai báo KPH thành công.", "success");
        updateKphLogsUI();
        clearKphForm();
        closeKphCreateModal();
    } catch (e) {
        console.error("Failed to add log to IndexedDB", e);
        showAppleToast("⚠️ Có lỗi xảy ra khi lưu dữ liệu vào IndexedDB.", "error");
    }
}

export async function removeKphLog(id) {
    const idx = kphLogs.findIndex(item => item.id === id);
    if (idx !== -1) {
        const item = kphLogs[idx];
        const confirmDelete = await showAppleConfirm({
            title: "Xác nhận xóa phiếu",
            htmlContent: `
                <div style="text-align: center; padding: 10px 0;">
                    <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-red-bg); color: var(--brand-accent-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </div>
                    <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Bạn có chắc chắn muốn xóa phiếu khai báo này?</p>
                    <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Hành động này không thể hoàn tác.</p>
                    
                    <div style="background-color: var(--bg-base); border-radius: 12px; padding: 14px 16px; text-align: left; border: 1px solid var(--status-red-border); font-size: 13px; line-height: 1.6;">
                        <div style="margin-bottom: 6px; display: flex;"><span style="color: var(--text-sub); width: 110px; flex-shrink: 0; font-weight: 500;">Tên sản phẩm:</span><span style="color: var(--text-main); font-weight: 600; word-break: break-word;">${item.tenHang}</span></div>
                        <div style="margin-bottom: 6px; display: flex;"><span style="color: var(--text-sub); width: 110px; flex-shrink: 0; font-weight: 500;">Mã SKU/UPC:</span><span style="color: var(--text-main); font-family: monospace; font-weight: 600;">${item.sku}</span></div>
                        <div style="margin-bottom: 6px; display: flex;"><span style="color: var(--text-sub); width: 110px; flex-shrink: 0; font-weight: 500;">Số lượng:</span><span style="color: var(--brand-accent-red); font-weight: 700;">${item.soLuong} ${item.dvt || 'Cái'}</span></div>
                        <div style="display: flex;"><span style="color: var(--text-sub); width: 110px; flex-shrink: 0; font-weight: 500;">Ngày phát hiện:</span><span style="color: var(--text-main); font-weight: 600;">${item.ngayPhatHien}</span></div>
                    </div>
                </div>
            `,
            confirmText: "Xóa phiếu",
            cancelText: "Hủy",
            isDanger: true
        });
        if (confirmDelete) {
            try {
                await deleteLog(id);
                kphLogs.splice(idx, 1);
                kphSelectedIds.delete(id);
                showAppleToast("Đã xóa bản ghi thành công.", "success");
                updateKphLogsUI();
            } catch (e) {
                console.error("Failed to delete log from IndexedDB", e);
                showAppleToast("⚠️ Có lỗi xảy ra khi xóa dữ liệu khỏi IndexedDB.", "error");
            }
        }
    }
}

export async function clearAllKphLogs() {
    const logsInTab = kphLogs.filter(item => (item.loaiKph || 'TPCN') === kphActiveSubTab);
    if (logsInTab.length === 0) return;
    const tabNameText = kphActiveSubTab === 'TPTS' ? 'TP Tươi sống (TPTS)' : 'TP Công nghệ (TPCN)';
    const confirmClear = await showAppleConfirm({
        title: "Xóa toàn bộ danh sách phiếu",
        htmlContent: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-red-bg); color: var(--brand-accent-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Cảnh báo: Xóa toàn bộ phiếu ${tabNameText} đã khai báo?</p>
                <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Tất cả dữ liệu trong danh sách ${tabNameText} sẽ bị xóa sạch hoàn toàn.</p>
                
                <div style="background-color: var(--bg-base); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid var(--status-red-border);">
                    <div style="font-size: 28px; font-weight: 800; color: var(--brand-accent-red);">${logsInTab.length}</div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Phiếu ${kphActiveSubTab} sẽ bị xóa vĩnh viễn</div>
                </div>
            </div>
        `,
        confirmText: "Xóa sạch tất cả",
        cancelText: "Hủy",
        isDanger: true
    });
    if (confirmClear) {
        try {
            for (const item of logsInTab) {
                await deleteLog(item.id);
                kphSelectedIds.delete(item.id);
                const idx = kphLogs.findIndex(l => l.id === item.id);
                if (idx !== -1) kphLogs.splice(idx, 1);
            }
            showAppleToast(`Đã xóa toàn bộ danh sách phiếu ${kphActiveSubTab} thành công.`, "success");
            updateKphLogsUI();
        } catch (e) {
            console.error("Failed to clear logs for sub-tab", e);
            showAppleToast("⚠️ Có lỗi xảy ra khi xóa dữ liệu.", "error");
        }
    }
}

export async function deleteSelectedKphLogs() {
    const filteredLogs = getFilteredKphLogs();
    const selectedIds = filteredLogs.filter(item => kphSelectedIds.has(item.id)).map(item => item.id);

    if (selectedIds.length === 0) {
        showAppleToast("⚠️ Vui lòng chọn ít nhất 1 dòng để xóa.", "warning");
        return;
    }

    const confirmDelete = await showAppleConfirm({
        title: "Xác nhận xóa các dòng đã chọn",
        htmlContent: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-red-bg); color: var(--brand-accent-red); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Xác nhận xóa các bản ghi được chọn?</p>
                <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Hành động này không thể hoàn tác.</p>
                
                <div style="background-color: var(--bg-base); border-radius: 12px; padding: 16px; text-align: center; border: 1px solid var(--status-red-border);">
                    <div style="font-size: 28px; font-weight: 800; color: var(--brand-accent-red);">${selectedIds.length}</div>
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Số lượng dòng phiếu KPH sẽ xóa</div>
                </div>
            </div>
        `,
        confirmText: "Xóa đã chọn",
        cancelText: "Hủy",
        isDanger: true
    });

    if (confirmDelete) {
        try {
            for (const id of selectedIds) {
                await deleteLog(id);
                const idx = kphLogs.findIndex(item => item.id === id);
                if (idx !== -1) {
                    kphLogs.splice(idx, 1);
                }
                kphSelectedIds.delete(id);
            }
            showAppleToast(`Đã xóa thành công ${selectedIds.length} dòng đã chọn.`, "success");
            updateKphLogsUI();
        } catch (e) {
            console.error("Failed to delete selected logs", e);
            showAppleToast("⚠️ Có lỗi xảy ra khi xóa dữ liệu.", "error");
        }
    }
}

export function clearKphForm() {
    document.getElementById('kphSku').value = '';
    document.getElementById('kphTenHang').value = '';
    document.getElementById('kphNcc').value = '';
    document.getElementById('kphSoLuong').value = '1';

    // Reset radios
    const radHuHong = document.getElementById('kphTinhTrangHuHong');
    if (radHuHong) radHuHong.checked = true;
    const kphTinhTrangKhacInput = document.getElementById('kphTinhTrangKhacInput');
    if (kphTinhTrangKhacInput) kphTinhTrangKhacInput.value = '';

    const radHuy = document.getElementById('kphBienPhapHuy');
    if (radHuy) radHuy.checked = true;
    const kphBienPhapKhacInput = document.getElementById('kphBienPhapKhacInput');
    if (kphBienPhapKhacInput) kphBienPhapKhacInput.value = '';

    const kphDvtEA = document.getElementById('kphDvtEA');
    if (kphDvtEA) kphDvtEA.checked = true;

    toggleTinhTrangRadio('Hư Hỏng');
    toggleBienPhapRadio('HỦY');
    clearKphImage();

    // Clear Ngày xử lý
    document.getElementById('kphNgayXuLy').value = '';
    if (kphNgayXuLyPicker) kphNgayXuLyPicker.clear();

    // Clear Ghi chú
    const kphGhiChu = document.getElementById('kphGhiChu');
    if (kphGhiChu) kphGhiChu.value = '';

    // Reset character counts
    const bpKhacCharCount = document.getElementById('bpKhacCharCount');
    if (bpKhacCharCount) bpKhacCharCount.textContent = '0';
    const gcCharCount = document.getElementById('gcCharCount');
    if (gcCharCount) gcCharCount.textContent = '0';
}

// BỘ LỌC KHOẢNG NGÀY & SẮP XẾP CỘT
export function getFilteredKphLogs() {
    const tuStr = document.getElementById('kphFilterTuNgay').value.trim();
    const denStr = document.getElementById('kphFilterDenNgay').value.trim();

    return kphLogs.filter(item => {
        // Phân loại sub-tab: mặc định cũ là TPCN
        const itemType = item.loaiKph || 'TPCN';
        if (itemType !== kphActiveSubTab) return false;

        if (tuStr && isValidDateStr(tuStr)) {
            const itemDate = parseLocalDate(item.ngayPhatHien);
            const tuDate = parseLocalDate(tuStr);
            if (itemDate < tuDate) return false;
        }
        if (denStr && isValidDateStr(denStr)) {
            const itemDate = parseLocalDate(item.ngayPhatHien);
            const denDate = parseLocalDate(denStr);
            if (itemDate > denDate) return false;
        }
        return true;
    });
}

export function applyKphDateFilter() {
    kphSelectedIds.clear();
    const selectAllCheckbox = document.getElementById('kphSelectAll');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
    if (selectAllCheckboxMobile) selectAllCheckboxMobile.checked = false;

    updateKphLogsUI();
}

export function clearKphDateFilter() {
    document.getElementById('kphFilterTuNgay').value = '';
    document.getElementById('kphFilterDenNgay').value = '';
    if (kphFilterTuNgayPicker) kphFilterTuNgayPicker.clear();
    if (kphFilterDenNgayPicker) kphFilterDenNgayPicker.clear();

    kphSelectedIds.clear();
    const selectAllCheckbox = document.getElementById('kphSelectAll');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
    if (selectAllCheckboxMobile) selectAllCheckboxMobile.checked = false;

    updateKphLogsUI();
}

export function toggleKphSort(field) {
    if (kphSortField === field) {
        kphSortDirection = (kphSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        kphSortField = field;
        kphSortDirection = 'desc';
    }

    const fields = ['ngayPhatHien', 'soLuong', 'ngayXuLy'];
    fields.forEach(f => {
        const icon = document.getElementById(`sort-icon-${f}`);
        if (icon) {
            if (f === field) {
                icon.innerText = (kphSortDirection === 'asc') ? '▲' : '▼';
                icon.classList.add('active-sort');
            } else {
                icon.innerText = '↕';
                icon.classList.remove('active-sort');
            }
        }
    });

    updateKphLogsUI();
}

export function sortKphLogs(logs) {
    if (!kphSortField) return logs;

    return [...logs].sort((a, b) => {
        let valA, valB;

        if (kphSortField === 'ngayPhatHien' || kphSortField === 'ngayXuLy') {
            const dateStrA = a[kphSortField];
            const dateStrB = b[kphSortField];

            if (!dateStrA) return 1;
            if (!dateStrB) return -1;

            valA = parseLocalDate(dateStrA).getTime();
            valB = parseLocalDate(dateStrB).getTime();
        } else if (kphSortField === 'soLuong') {
            valA = parseFloat(a.soLuong) || 0;
            valB = parseFloat(b.soLuong) || 0;
        } else {
            valA = a[kphSortField] || '';
            valB = b[kphSortField] || '';
        }

        if (valA < valB) return (kphSortDirection === 'asc') ? -1 : 1;
        if (valA > valB) return (kphSortDirection === 'asc') ? 1 : -1;
        return 0;
    });
}

// LỰA CHỌN HÀNG XUẤT EXCEL
export function toggleSelectAllKph(selectAllCheckbox) {
    const filteredLogs = getFilteredKphLogs();
    if (selectAllCheckbox.checked) {
        filteredLogs.forEach(item => kphSelectedIds.add(item.id));
    } else {
        filteredLogs.forEach(item => kphSelectedIds.delete(item.id));
    }
    updateKphLogsUI();
}

export function toggleSelectRowKph(id) {
    if (kphSelectedIds.has(id)) {
        kphSelectedIds.delete(id);
    } else {
        kphSelectedIds.add(id);
    }

    const filteredLogs = getFilteredKphLogs();
    const allSelected = filteredLogs.length > 0 && filteredLogs.every(item => kphSelectedIds.has(item.id));

    const selectAllCheckbox = document.getElementById('kphSelectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allSelected;
    }
    const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
    if (selectAllCheckboxMobile) {
        selectAllCheckboxMobile.checked = allSelected;
    }

    updateKphLogsUI();
}

let activeImageUrls = [];

export function clearActiveImageUrls() {
    activeImageUrls.forEach(url => URL.revokeObjectURL(url));
    activeImageUrls = [];
}

// Cập nhật render bảng giao diện
export function updateKphLogsUI() {
    // Thu hồi toàn bộ Object URL cũ để giải phóng RAM lập tức
    clearActiveImageUrls();

    const filteredLogs = getFilteredKphLogs();

    // Cập nhật số lượng phiếu của từng sub-tab phụ thuộc bộ lọc ngày
    const tuStr = document.getElementById('kphFilterTuNgay') ? document.getElementById('kphFilterTuNgay').value.trim() : '';
    const denStr = document.getElementById('kphFilterDenNgay') ? document.getElementById('kphFilterDenNgay').value.trim() : '';
    
    const getSubTabCount = (subTabId) => {
        return kphLogs.filter(item => {
            const itemType = item.loaiKph || 'TPCN';
            if (itemType !== subTabId) return false;

            if (tuStr && isValidDateStr(tuStr)) {
                const itemDate = parseLocalDate(item.ngayPhatHien);
                const tuDate = parseLocalDate(tuStr);
                if (itemDate < tuDate) return false;
            }
            if (denStr && isValidDateStr(denStr)) {
                const itemDate = parseLocalDate(item.ngayPhatHien);
                const denDate = parseLocalDate(denStr);
                if (itemDate > denDate) return false;
            }
            return true;
        }).length;
    };

    const tpcnCount = getSubTabCount('TPCN');
    const tptsCount = getSubTabCount('TPTS');

    const btnTpcn = document.getElementById('sub-tab-btn-tpcn');
    const btnTpts = document.getElementById('sub-tab-btn-tpts');
    if (btnTpcn) btnTpcn.innerText = `TPCN (${tpcnCount})`;
    if (btnTpts) btnTpts.innerText = `TPTS (${tptsCount})`;

    // Cập nhật số lượng hiển thị bộ lọc
    const countText = document.getElementById('kphCountText');
    if (countText) countText.innerText = filteredLogs.length;

    // Cập nhật số lượng đang chọn và trạng thái các nút thao tác chọn dòng
    const selectedCount = filteredLogs.filter(item => kphSelectedIds.has(item.id)).length;
    const selectedCountEl = document.getElementById('kphSelectedCount');
    if (selectedCountEl) selectedCountEl.innerText = selectedCount;

    const btnExport = document.getElementById('btnExportExcel');
    const btnExportText = document.getElementById('btnExportExcelText');
    const btnDelete = document.getElementById('btnDeleteSelected');
    const btnDeleteText = document.getElementById('btnDeleteSelectedText');

    if (btnExportText) btnExportText.innerText = selectedCount > 0 ? `Xuất ${selectedCount} dòng` : "Xuất Excel";
    if (btnDeleteText) btnDeleteText.innerText = selectedCount > 0 ? `Xóa ${selectedCount} dòng` : "Xóa";

    if (selectedCount === 0) {
        if (btnExport) btnExport.setAttribute('disabled', 'true');
        if (btnDelete) btnDelete.setAttribute('disabled', 'true');
    } else {
        if (btnExport) btnExport.removeAttribute('disabled');
        if (btnDelete) btnDelete.removeAttribute('disabled');
    }

    const listContainer = document.getElementById('kphLogsList');
    const mobileContainer = document.getElementById('kphLogsMobileList');

    if (filteredLogs.length === 0) {
        if (listContainer) {
            listContainer.innerHTML = `
                <tr>
                    <td colspan="13" class="kph-empty-row">Chưa có dữ liệu khai báo hoặc không khớp bộ lọc</td>
                </tr>
            `;
        }
        if (mobileContainer) {
            mobileContainer.innerHTML = `
                <div class="kph-empty-mobile">Chưa có dữ liệu khai báo hoặc không khớp bộ lọc</div>
            `;
        }
        const selectAllCheckbox = document.getElementById('kphSelectAll');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
        if (selectAllCheckboxMobile) selectAllCheckboxMobile.checked = false;
        return;
    }

    const sortedLogs = sortKphLogs(filteredLogs);

    const allSelected = sortedLogs.every(item => kphSelectedIds.has(item.id));
    const selectAllCheckbox = document.getElementById('kphSelectAll');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = allSelected;
    }
    const selectAllCheckboxMobile = document.getElementById('kphSelectAllMobile');
    if (selectAllCheckboxMobile) {
        selectAllCheckboxMobile.checked = allSelected;
    }

    // Tạo Object URL cho các ảnh hiển thị để tối ưu hóa bộ nhớ
    const sortedLogsWithUrls = sortedLogs.map(item => {
        let imgUrl = '';
        if (item.image) {
            if (item.image instanceof Blob) {
                imgUrl = URL.createObjectURL(item.image);
                activeImageUrls.push(imgUrl);
            } else if (typeof item.image === 'string') {
                imgUrl = item.image; // fallback cho Base64 nếu có
            }
        }
        return { ...item, imgUrl };
    });

    // 1. Render giao diện Bảng (Desktop)
    if (listContainer) {
        listContainer.innerHTML = sortedLogsWithUrls.map((item, index) => {
            const isChecked = kphSelectedIds.has(item.id) ? 'checked' : '';
            const isSelectedClass = kphSelectedIds.has(item.id) ? 'class="selected-row"' : '';

            const imgHtml = item.imgUrl ?
                `<img class="kph-thumbnail" src="${item.imgUrl}" alt="Evidence" onclick="window.zoomImage('${item.imgUrl}')">` :
                `<span style="color: var(--text-sub); font-size: 11px; font-style: italic;">Không có</span>`;

            let bienPhapBadge = '';
            if (item.bienPhap === 'HỦY') {
                bienPhapBadge = `<span class="badge badge-danger">HỦY</span>`;
            } else if (item.bienPhap === 'ĐỔI') {
                bienPhapBadge = `<span class="badge badge-warning">ĐỔI</span>`;
            } else if (item.bienPhap === 'XUẤT TRẢ') {
                bienPhapBadge = `<span class="badge badge-info">XUẤT TRẢ</span>`;
            } else {
                bienPhapBadge = `<span class="badge badge-secondary" title="Biện pháp xử lý khác">${item.bienPhapText || 'KHÁC'}</span>`;
            }

            const xlText = `<div class="xl-badge-wrapper">${bienPhapBadge}</div>`;
            const ngayXlText = item.ngayXuLy ? 
                item.ngayXuLy : 
                `<span class="badge badge-unprocessed">Chưa xử lý</span>`;

            const status = item.trangThaiDuyet || 'cho_duyet';
            let approvalBtnHtml = '';
            if (status === 'da_duyet') {
                approvalBtnHtml = `<button class="btn-approval btn-approved" onclick="window.openKphApproveModal('${item.id}')">Đã duyệt</button>`;
            } else if (status === 'khong_duyet') {
                approvalBtnHtml = `<button class="btn-approval btn-rejected" onclick="window.openKphApproveModal('${item.id}')">Không duyệt</button>`;
            } else {
                approvalBtnHtml = `<button class="btn-approval btn-pending" onclick="window.openKphApproveModal('${item.id}')">Chờ duyệt</button>`;
            }

            const approvalTimeHtml = (status === 'cho_duyet') ? 
                `<span class="thoi-gian-duyet-val cho-duyet">chưa duyệt</span>` : 
                `<div class="thoi-gian-duyet-val">${item.thoiGianDuyet || '-'}</div>`;

            return `
                <tr ${isSelectedClass}>
                    <td data-label="" style="text-align: center;">
                        <input type="checkbox" class="kph-checkbox" ${isChecked} onchange="window.toggleSelectRowKph('${item.id}')">
                    </td>
                    <td data-label="Ngày PH" style="text-align: center;">${item.ngayPhatHien}</td>
                    <td data-label="Duyệt" style="text-align: center;">${approvalBtnHtml}</td>
                    <td data-label="SKU" style="font-weight: 600; font-family: monospace; text-align: center;">${item.sku}</td>
                    <td data-label="Tên hàng" style="font-weight: 500;">
                        ${item.tenHang}
                        ${item.ghiChu ? `<div style="font-size: 11px; color: var(--text-sub); font-style: italic; margin-top: 4px;">💬 ${item.ghiChu}</div>` : ''}
                    </td>
                    <td data-label="NCC">${item.ncc || '-'}</td>
                    <td data-label="ĐVT" style="text-align: center;">${item.dvt}</td>
                    <td data-label="Số lượng" style="text-align: center; font-weight: 600;">${item.soLuong}</td>
                    <td data-label="Tình trạng">${item.tinhTrang}</td>
                    <td data-label="Biện pháp" style="font-weight: 500;">${xlText}</td>
                    <td data-label="Ngày XL" style="text-align: center;">${ngayXlText}</td>
                    <td data-label="Thời gian duyệt" style="text-align: center;">${approvalTimeHtml}</td>
                    <td data-label="Người PH">${item.nguoiPhatHien || '-'}</td>
                    <td data-label="Ảnh" style="text-align: center;">${imgHtml}</td>
                    <td data-label="">
                        <button class="kph-cell-btn-delete" onclick="window.removeKphLog('${item.id}')" aria-label="Xóa">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // 2. Render giao diện Card (Mobile)
    if (mobileContainer) {
        mobileContainer.innerHTML = sortedLogsWithUrls.map((item, index) => {
            const isChecked = kphSelectedIds.has(item.id) ? 'checked' : '';
            const isSelectedClass = kphSelectedIds.has(item.id) ? 'selected-card' : '';

            const imgHtml = item.imgUrl ?
                `<div class="kph-card-img-wrapper" onclick="window.zoomImage('${item.imgUrl}')">
                    <img src="${item.imgUrl}" alt="Evidence">
                 </div>` : '';

            let bienPhapBadge = '';
            if (item.bienPhap === 'HỦY') {
                bienPhapBadge = `<span class="badge badge-danger">Hủy</span>`;
            } else if (item.bienPhap === 'ĐỔI') {
                bienPhapBadge = `<span class="badge badge-warning">Đổi</span>`;
            } else if (item.bienPhap === 'XUẤT TRẢ') {
                bienPhapBadge = `<span class="badge badge-info">Xuất trả</span>`;
            } else {
                bienPhapBadge = `<span class="badge badge-secondary">${item.bienPhapText || 'Khác'}</span>`;
            }

            const mobileXlPlanHtml = `
                <div class="kph-card-detail-row">
                    <span class="detail-label">Biện pháp:</span>
                    <span class="detail-val">${bienPhapBadge}</span>
                </div>
            `;
            const mobileXlDateHtml = `
                <div class="kph-card-detail-row">
                    <span class="detail-label">Ngày xử lý:</span>
                    <span class="detail-val">${item.ngayXuLy ? `<span style="font-weight:600;">${item.ngayXuLy}</span>` : `<span class="badge badge-unprocessed">Chưa xử lý</span>`}</span>
                </div>
            `;

            const status = item.trangThaiDuyet || 'cho_duyet';

            const mobileApprovalTimeHtml = (status !== 'cho_duyet') ? 
                `<div class="kph-card-detail-row">
                    <span class="detail-label">Thời gian duyệt:</span>
                    <span class="detail-val" style="font-size: 11px;">
                        <div>${item.thoiGianDuyet || '-'}</div>
                    </span>
                 </div>` : '';

            let mobileActionBtn = '';
            if (status === 'da_duyet') {
                mobileActionBtn = `<button type="button" class="btn-approval btn-approved" onclick="window.openKphApproveModal('${item.id}')">Đã duyệt</button>`;
            } else if (status === 'khong_duyet') {
                mobileActionBtn = `<button type="button" class="btn-approval btn-rejected" onclick="window.openKphApproveModal('${item.id}')">Không duyệt</button>`;
            } else {
                mobileActionBtn = `<button type="button" class="btn-approval btn-pending" onclick="window.openKphApproveModal('${item.id}')">Chờ duyệt</button>`;
            }

            return `
                <div class="kph-mobile-card ${isSelectedClass}">
                    <div class="kph-card-header">
                        <div class="kph-card-header-left">
                            <input type="checkbox" class="kph-checkbox" ${isChecked} onchange="window.toggleSelectRowKph('${item.id}')">
                            <span class="kph-card-date">${item.ngayPhatHien}</span>
                        </div>
                        <span class="kph-card-sku">${item.sku}</span>
                    </div>
                    
                    <div class="kph-card-body">
                        <div class="kph-card-main-info">
                            <h4 class="kph-card-title">${item.tenHang}</h4>
                            <div class="kph-card-qty">${item.soLuong} <span class="qty-unit">${item.dvt}</span></div>
                        </div>
                        
                        <div class="kph-card-details">
                            <div class="kph-card-detail-row">
                                <span class="detail-label">NCC:</span>
                                <span class="detail-val">${item.ncc || '-'}</span>
                            </div>
                            <div class="kph-card-detail-row">
                                <span class="detail-label">Tình trạng:</span>
                                <span class="detail-val" style="color: var(--brand-accent-orange); font-weight: 500;">${item.tinhTrang}</span>
                            </div>
                            ${mobileXlPlanHtml}
                            ${mobileXlDateHtml}
                            ${mobileApprovalTimeHtml}
                            <div class="kph-card-detail-row">
                                <span class="detail-label font-light">Người PH:</span>
                                <span class="detail-val font-light">${item.nguoiPhatHien || '-'}</span>
                            </div>
                            ${item.ghiChu ? `
                            <div class="kph-card-detail-row">
                                <span class="detail-label">Ghi chú:</span>
                                <span class="detail-val" style="font-style: italic; font-size: 12px; color: var(--text-sub);">💬 ${item.ghiChu}</span>
                            </div>
                            ` : ''}
                        </div>
                        
                        ${imgHtml}
                    </div>
                    
                    <div class="kph-card-actions">
                        ${mobileActionBtn}
                        <button type="button" class="kph-card-btn-delete" onclick="window.removeKphLog('${item.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; margin-right: 4px;">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Xóa bản ghi
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}


export function zoomImage(src) {
    const modal = document.getElementById('imageModal');
    const img = document.getElementById('modalImg');
    if (modal && img) {
        img.src = src;
        modal.classList.add('active');
    }
}

export function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// XUẤT FILE EXCEL ĐÚNG MẪU BM-331.CF CỦA SAIGON CO.OP

export async function exportKphToExcel() {
    const selectedLogs = kphLogs.filter(item => kphSelectedIds.has(item.id));

    if (selectedLogs.length === 0) {
        showAppleToast("⚠️ Vui lòng tích chọn ít nhất 1 hàng dữ liệu trước khi xuất Excel.", "warning");
        return;
    }

    // 1. Kiểm soát số lượng hàng chứa ảnh (tối đa 200 dòng có ảnh)
    const logsWithImages = selectedLogs.filter(item => item.image);
    if (logsWithImages.length > 200) {
        showAppleToast("⚠️ Để đảm bảo bộ nhớ, bạn chỉ được chọn tối đa 200 dòng có ảnh minh chứng cho mỗi file Excel.", "warning");
        return;
    }

    const confirmExport = await showAppleConfirm({
        title: "Xác nhận xuất Excel",
        htmlContent: `
            <div style="text-align: center; padding: 10px 0;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background-color: var(--status-green-bg); color: var(--brand-primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                </div>
                <p style="font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Bạn có chắc chắn muốn xuất dữ liệu ra file Excel?</p>
                <p style="font-size: 13px; color: var(--text-sub); margin-bottom: 16px;">Tệp Excel (.xlsx) sẽ được tự động tạo và tải xuống thiết bị của bạn.</p>
                
                <div style="background-color: var(--bg-base); border-radius: 12px; padding: 12px 16px; text-align: left; border: 1px solid var(--status-green-border); font-size: 13px; line-height: 1.6;">
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Số lượng bản ghi:</span><span style="color: var(--brand-primary); font-weight: 700;">${selectedLogs.length} dòng</span></div>
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Có ảnh đính kèm:</span><span style="color: var(--text-main); font-weight: 600;">${logsWithImages.length} dòng</span></div>
                    <div style="margin-bottom: 4px; display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Định dạng file:</span><span style="color: var(--text-main); font-weight: 600;">Microsoft Excel (.xlsx)</span></div>
                    <div style="display: flex;"><span style="color: var(--text-sub); width: 125px; flex-shrink: 0; font-weight: 500;">Nội dung xuất:</span><span style="color: var(--text-main); font-weight: 600;">Phiếu khai báo KPH</span></div>
                </div>
            </div>
        `,
        confirmText: "Xuất Excel",
        cancelText: "Hủy",
        isPrimary: true
    });
    if (!confirmExport) return;

    const sortedSelectedLogs = sortKphLogs(selectedLogs);

    try {
        // Tải động ExcelJS
        await loadExcelJS();

        const isTpts = kphActiveSubTab === 'TPTS';
        const sheetTitle = isTpts ? 'Khai báo KPH TPTS' : 'Khai báo KPH TPCN';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetTitle, {
            views: [{ showGridLines: true }]
        });

        // Thiết lập trang in và footer của Excel
        worksheet.pageSetup = {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        };
        worksheet.headerFooter = {
            oddFooter: '&L&IBM-331.CF&C&ILần ban hành: 01&R&ITrang &P / &N'
        };

        worksheet.columns = [
            { key: 'stt', width: 6 },
            { key: 'ngayPhatHien', width: 14 },
            { key: 'sku', width: 16 },
            { key: 'tenHang', width: 28 },
            { key: 'ncc', width: 18 },
            { key: 'dvt', width: 8 },
            { key: 'soLuong', width: 10 },
            { key: 'tinhTrang', width: 24 },
            { key: 'nguoiPhatHien', width: 18 },
            { key: 'huy', width: 7 },
            { key: 'doi', width: 7 },
            { key: 'xuatTra', width: 11 },
            { key: 'khac', width: 24 },
            { key: 'ngayXuLy', width: 14 },
            { key: 'image', width: 20 },
            { key: 'nguoiDuyet', width: 20 }
        ];

        worksheet.getCell('A1').value = 'CÔNG TY TNHH MTV THỰC PHẨM SAIGON CO.OP';
        worksheet.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A1').alignment = { horizontal: 'left', wrapText: false };

        const coopFoodVal = document.getElementById('kphCoopFood').value.trim();
        const storeVal = document.getElementById('kphStore').value.trim();

        worksheet.getCell('A2').value = `CO.OP FOOD: ${coopFoodVal || '................................'}`;
        worksheet.getCell('A2').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A2').alignment = { horizontal: 'left', wrapText: false };

        worksheet.getCell('A3').value = `STORE: ${storeVal || '................................'}`;
        worksheet.getCell('A3').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A3').alignment = { horizontal: 'left', wrapText: false };

        worksheet.mergeCells('A5:P5');
        worksheet.getCell('A5').value = `PHIẾU THEO DÕI HÀNG KHÔNG PHÙ HỢP (${isTpts ? 'TPTS' : 'TPCN'})`;
        worksheet.getCell('A5').font = { name: 'Times New Roman', bold: true, size: 15 };
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(5).height = 25;

        worksheet.mergeCells('A7:A8');
        worksheet.mergeCells('B7:B8');
        worksheet.mergeCells('C7:C8');
        worksheet.mergeCells('D7:D8');
        worksheet.mergeCells('E7:E8');
        worksheet.mergeCells('F7:F8');
        worksheet.mergeCells('G7:G8');
        worksheet.mergeCells('H7:H8');
        worksheet.mergeCells('I7:I8');
        worksheet.mergeCells('J7:M7');
        worksheet.mergeCells('N7:N8');
        worksheet.mergeCells('O7:O8');
        worksheet.mergeCells('P7:P8');

        worksheet.getCell('A7').value = 'STT';
        worksheet.getCell('B7').value = 'NGÀY\nPHÁT\nHIỆN';
        worksheet.getCell('C7').value = 'SKU/UPC';
        worksheet.getCell('D7').value = 'TÊN HÀNG HÓA';
        worksheet.getCell('E7').value = 'NCC';
        worksheet.getCell('F7').value = 'ĐƠN\nVỊ\nTÍNH';
        worksheet.getCell('G7').value = 'SỐ\nLƯỢNG';
        worksheet.getCell('H7').value = 'MÔ TẢ TÌNH\nTRẠNG\nHÀNG KPH';
        worksheet.getCell('I7').value = 'NGƯỜI\nPHÁT HIỆN\nSP KPH\n(ký và ghi rõ\nhọ tên)';
        worksheet.getCell('J7').value = 'BIỆN PHÁP XỬ LÝ\n(đánh dấu "X")';
        worksheet.getCell('J8').value = 'HỦY';
        worksheet.getCell('K8').value = 'ĐỔI';
        worksheet.getCell('L8').value = 'XUẤT\nTRẢ';
        worksheet.getCell('M8').value = 'KHÁC (ghi rõ\nnội dung xử lý)';
        worksheet.getCell('N7').value = 'Ghi ngày\nxử lý';
        worksheet.getCell('O7').value = 'ẢNH MINH\nCHỨNG';
        worksheet.getCell('P7').value = 'BĐH THEO DÕI\nXỬ LÝ\n(ký và ghi rõ họ tên)';

        const headerCells = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7', 'J7', 'N7', 'O7', 'P7', 'J8', 'K8', 'L8', 'M8'];
        headerCells.forEach(cellId => {
            const cell = worksheet.getCell(cellId);
            cell.font = { name: 'Times New Roman', bold: true, size: 8.5, color: { argb: '000000' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'EBEBEB' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });
        worksheet.getRow(7).height = 25;
        worksheet.getRow(8).height = 25;

        const startRow = 9;

        // Vòng lặp tuần tự (Async Loop) xử lý từng hàng dữ liệu để tối ưu RAM
        for (let idx = 0; idx < sortedSelectedLogs.length; idx++) {
            const item = sortedSelectedLogs[idx];
            const currentRow = startRow + idx;
            const row = worksheet.getRow(currentRow);
            row.height = 70;

            worksheet.getCell(`A${currentRow}`).value = idx + 1;
            worksheet.getCell(`B${currentRow}`).value = item.ngayPhatHien;
            worksheet.getCell(`C${currentRow}`).value = item.sku;
            worksheet.getCell(`D${currentRow}`).value = item.tenHang;
            worksheet.getCell(`E${currentRow}`).value = item.ncc || '';
            worksheet.getCell(`F${currentRow}`).value = item.dvt;
            worksheet.getCell(`G${currentRow}`).value = item.soLuong;
            worksheet.getCell(`H${currentRow}`).value = item.tinhTrang;
            worksheet.getCell(`I${currentRow}`).value = item.nguoiPhatHien || '';

            worksheet.getCell(`J${currentRow}`).value = (item.bienPhap === 'HỦY') ? 'X' : '';
            worksheet.getCell(`K${currentRow}`).value = (item.bienPhap === 'ĐỔI') ? 'X' : '';
            worksheet.getCell(`L${currentRow}`).value = (item.bienPhap === 'XUẤT TRẢ') ? 'X' : '';
            worksheet.getCell(`M${currentRow}`).value = (item.bienPhap === 'KHÁC') ? item.bienPhapText : '';

            worksheet.getCell(`N${currentRow}`).value = item.ngayXuLy;

            if (item.image) {
                try {
                    let arrayBuffer;
                    if (item.image instanceof Blob) {
                        // Đọc ảnh dạng Blob -> Chuyển thành ArrayBuffer
                        arrayBuffer = await item.image.arrayBuffer();
                    } else if (typeof item.image === 'string' && item.image.startsWith('data:')) {
                        // Hỗ trợ ảnh Base64 cũ
                        const base64Data = item.image.split(',')[1];
                        const binStr = atob(base64Data);
                        const len = binStr.length;
                        const arr = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            arr[i] = binStr.charCodeAt(i);
                        }
                        arrayBuffer = arr.buffer;
                    }

                    if (arrayBuffer) {
                        // Nạp ArrayBuffer trực tiếp vào ExcelJS
                        const imageId = workbook.addImage({
                            buffer: arrayBuffer,
                            extension: 'jpeg',
                        });
                        worksheet.addImage(imageId, {
                            tl: { col: 14, row: currentRow - 1 },
                            ext: { width: 85, height: 85 },
                            editAs: 'oneCell'
                        });
                        worksheet.getCell(`O${currentRow}`).value = '';
                    } else {
                        worksheet.getCell(`O${currentRow}`).value = '[Lỗi ảnh]';
                    }
                } catch (err) {
                    console.error("Error inserting image to Excel cell", err);
                    worksheet.getCell(`O${currentRow}`).value = '[Lỗi tải ảnh]';
                }
            } else {
                worksheet.getCell(`O${currentRow}`).value = '';
            }

            worksheet.getCell(`P${currentRow}`).value = item.nguoiDuyet || '';

            const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
            columns.forEach(col => {
                const cell = worksheet.getCell(`${col}${currentRow}`);
                cell.font = { name: 'Times New Roman', size: 9 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                const isCentered = ['A', 'B', 'C', 'F', 'G', 'J', 'K', 'L', 'N', 'O', 'P'].includes(col);
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: isCentered ? 'center' : 'left',
                    wrapText: true
                };
            });
        }

        // Viết Buffer và xuất file thông qua thẻ download bản địa để giải phóng bộ nhớ
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = formatLocalDate(new Date()).replace(/\//g, '-');
        const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = URL.createObjectURL(fileBlob);

        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = `Phieu_Theo_Doi_Hang_KPH_${isTpts ? 'TPTS' : 'TPCN'}_${dateStr}.xlsx`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();

        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadUrl);

        showAppleToast("Đã xuất file Excel thành công!", "success");
    } catch (err) {
        console.error("Export to Excel error:", err);
        showAppleToast("⚠️ Đã xảy ra lỗi khi tạo file Excel. Hãy thử lại.", "error");
    }
}

// --- HÀM TIỆN ÍCH CHO DIALOG TẠO PHIẾU & CẤU HÌNH CỬA HÀNG COMPACT ---

export function openKphCreateModal(type = 'TPCN') {
    kphCurrentType = type;

    // Cập nhật tiêu đề modal theo loại hàng
    const titleEl = document.querySelector('#kphCreateModal .apple-modal-title');
    if (titleEl) {
        titleEl.innerText = type === 'TPTS' ? 'Tạo Phiếu KPH Mới (TPTS)' : 'Tạo Phiếu KPH Mới (TPCN)';
    }

    // Thêm nhẹ màu chủ đề cho header modal
    const headerEl = document.querySelector('#kphCreateModal .apple-modal-header');
    if (headerEl) {
        if (type === 'TPTS') {
            headerEl.style.borderBottom = '3px solid var(--brand-accent-orange)';
            headerEl.style.background = 'linear-gradient(to bottom, #fdf8f0, var(--surface))';
        } else {
            headerEl.style.borderBottom = '3px solid var(--brand-primary)';
            headerEl.style.background = 'linear-gradient(to bottom, #eff7f2, var(--surface))';
        }
    }

    // Ẩn/hiện biện pháp xử lý đối với Thực phẩm tươi sống (TPTS)
    const doiRadio = document.getElementById('kphBienPhapDoi');
    const xuatTraRadio = document.getElementById('kphBienPhapXuatTra');
    const doiLabel = document.querySelector('label[for="kphBienPhapDoi"]');
    const xuatTraLabel = document.querySelector('label[for="kphBienPhapXuatTra"]');

    if (type === 'TPTS') {
        if (doiRadio) doiRadio.style.display = 'none';
        if (xuatTraRadio) xuatTraRadio.style.display = 'none';
        if (doiLabel) doiLabel.style.display = 'none';
        if (xuatTraLabel) xuatTraLabel.style.display = 'none';

        // Nếu đang chọn "Đổi" hoặc "Xuất trả" thì reset về "Hủy"
        const currentSelected = document.querySelector('input[name="kphBienPhapRadio"]:checked');
        if (currentSelected && (currentSelected.value === 'ĐỔI' || currentSelected.value === 'XUẤT TRẢ')) {
            const huyRadio = document.getElementById('kphBienPhapHuy');
            if (huyRadio) {
                huyRadio.checked = true;
                if (typeof window.toggleBienPhapRadio === 'function') {
                    window.toggleBienPhapRadio('HỦY');
                } else if (typeof toggleBienPhapRadio === 'function') {
                    toggleBienPhapRadio('HỦY');
                }
            }
        }
    } else {
        if (doiRadio) doiRadio.style.display = '';
        if (xuatTraRadio) xuatTraRadio.style.display = '';
        if (doiLabel) doiLabel.style.display = '';
        if (xuatTraLabel) xuatTraLabel.style.display = '';
    }

    const modal = document.getElementById('kphCreateModal');
    if (modal) {
        modal.classList.add('active');
        // Tự động cập nhật ngày phát hiện mặc định là hôm nay nếu chưa nhập
        const dateInput = document.getElementById('kphNgayPhatHien');
        if (dateInput && !dateInput.value) {
            dateInput.value = formatLocalDate(new Date());
            if (kphNgayPicker) kphNgayPicker.setDate(new Date(), false);
        }

        const dateXuLyInput = document.getElementById('kphNgayXuLy');
        if (type === 'TPTS' && dateInput && dateXuLyInput) {
            dateXuLyInput.value = dateInput.value;
            if (kphNgayXuLyPicker && dateInput.value) {
                kphNgayXuLyPicker.setDate(parseLocalDate(dateInput.value), false);
            }
        } else if (type === 'TPCN' && dateXuLyInput) {
            dateXuLyInput.value = '';
            if (kphNgayXuLyPicker) kphNgayXuLyPicker.clear();
        }

        // Reset scroll position and remove sticky classes
        const modalContent = modal.querySelector('.apple-modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
        const actions = modal.querySelector('.kph-form-actions');
        if (actions) {
            actions.classList.remove('sticky-compact', 'sticky-hidden');
        }
    }
}

export function closeKphCreateModal() {
    const modal = document.getElementById('kphCreateModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function toggleStoreSettingsEdit(editMode) {
    const compact = document.getElementById('kphStoreSettingsCompact');
    const expanded = document.getElementById('kphStoreSettingsExpanded');
    if (compact && expanded) {
        if (editMode) {
            compact.classList.add('hidden');
            expanded.classList.remove('hidden');
        } else {
            compact.classList.remove('hidden');
            expanded.classList.add('hidden');
        }
    }
}

export function updateStoreSettingsLabels(cf, store, cht) {
    const lblCf = document.getElementById('lblCoopFood');
    const lblStore = document.getElementById('lblStore');
    const lblCht = document.getElementById('lblCht');
    if (lblCf) lblCf.textContent = cf || 'Chưa thiết lập';
    if (lblStore) lblStore.textContent = store || 'Chưa thiết lập';
    if (lblCht) lblCht.textContent = cht || 'Chưa thiết lập';
}

export function openKphApproveModal(id) {
    const log = kphLogs.find(item => item.id === id);
    if (!log) return;

    document.getElementById('kphApproveId').value = id;

    // Thêm nhẹ màu chủ đề cho header modal duyệt
    const isTpts = log.loaiKph === 'TPTS';
    const approveHeaderEl = document.querySelector('#kphApproveModal .apple-modal-header');
    if (approveHeaderEl) {
        if (isTpts) {
            approveHeaderEl.style.borderBottom = '3px solid var(--brand-accent-orange)';
            approveHeaderEl.style.background = 'linear-gradient(to bottom, #fdf8f0, var(--surface))';
        } else {
            approveHeaderEl.style.borderBottom = '3px solid var(--brand-primary)';
            approveHeaderEl.style.background = 'linear-gradient(to bottom, #eff7f2, var(--surface))';
        }
    }

    // Set approval status radio
    const status = log.trangThaiDuyet || 'cho_duyet';
    const statusRadio = document.getElementById(`kphApproveStatus${status === 'cho_duyet' ? 'Cho' : status === 'da_duyet' ? 'Da' : 'Khong'}`);
    if (statusRadio) statusRadio.checked = true;

    // Set biện pháp xử lý radio
    let bienPhap = log.bienPhap || 'HỦY';

    const appDoiRadio = document.getElementById('kphApproveBienPhapDoi');
    const appXuatTraRadio = document.getElementById('kphApproveBienPhapXuatTra');
    const appDoiLabel = document.querySelector('label[for="kphApproveBienPhapDoi"]');
    const appXuatTraLabel = document.querySelector('label[for="kphApproveBienPhapXuatTra"]');

    if (isTpts) {
        if (appDoiRadio) appDoiRadio.style.display = 'none';
        if (appXuatTraRadio) appXuatTraRadio.style.display = 'none';
        if (appDoiLabel) appDoiLabel.style.display = 'none';
        if (appXuatTraLabel) appXuatTraLabel.style.display = 'none';

        if (bienPhap === 'ĐỔI' || bienPhap === 'XUẤT TRẢ') {
            bienPhap = 'HỦY';
        }
    } else {
        if (appDoiRadio) appDoiRadio.style.display = '';
        if (appXuatTraRadio) appXuatTraRadio.style.display = '';
        if (appDoiLabel) appDoiLabel.style.display = '';
        if (appXuatTraLabel) appXuatTraLabel.style.display = '';
    }

    let bpRadioId = 'kphApproveBienPhapHuy';
    if (bienPhap === 'ĐỔI') bpRadioId = 'kphApproveBienPhapDoi';
    else if (bienPhap === 'XUẤT TRẢ') bpRadioId = 'kphApproveBienPhapXuatTra';
    else if (bienPhap === 'KHÁC') bpRadioId = 'kphApproveBienPhapKhac';
    
    const bpRadio = document.getElementById(bpRadioId);
    if (bpRadio) bpRadio.checked = true;

    // If KHÁC, show textarea and fill content
    const colKhac = document.getElementById('colApproveBienPhapKhac');
    if (colKhac) {
        colKhac.style.display = (bienPhap === 'KHÁC') ? '' : 'none';
    }
    const khacInput = document.getElementById('kphApproveBienPhapKhacInput');
    if (khacInput) {
        khacInput.value = (bienPhap === 'KHÁC') ? (log.bienPhapText || '') : '';
        updateCharCount('kphApproveBienPhapKhacInput', 'bpApproveKhacCharCount');
    }

    // Set ngày xử lý
    const ngayXuLy = log.ngayXuLy || '';
    document.getElementById('kphApproveNgayXuLy').value = ngayXuLy;
    if (kphApproveNgayXuLyPicker) {
        if (isValidDateStr(ngayXuLy)) {
            kphApproveNgayXuLyPicker.setDate(parseLocalDate(ngayXuLy), false);
        } else {
            kphApproveNgayXuLyPicker.clear();
        }
    }

    // Set người duyệt
    const nguoiDuyet = log.nguoiDuyet !== undefined ? log.nguoiDuyet : (localStorage.getItem('kph_cht') || '');
    const nguoiDuyetInput = document.getElementById('kphApproveNguoiDuyet');
    if (nguoiDuyetInput) {
        nguoiDuyetInput.value = nguoiDuyet;
    }
    const nguoiDuyetText = document.getElementById('kphApproveNguoiDuyetText');
    if (nguoiDuyetText) {
        nguoiDuyetText.textContent = nguoiDuyet || 'Chưa thiết lập';
    }
    toggleApproveNguoiDuyetEdit(false);

    // Open modal
    const modal = document.getElementById('kphApproveModal');
    if (modal) {
        modal.classList.add('active');
        const modalContent = modal.querySelector('.apple-modal-content');
        if (modalContent) modalContent.scrollTop = 0;
    }
}

export function closeKphApproveModal() {
    const modal = document.getElementById('kphApproveModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function toggleApproveNguoiDuyetEdit(editable) {
    const displayDiv = document.getElementById('kphApproveNguoiDuyetDisplay');
    const editDiv = document.getElementById('kphApproveNguoiDuyetEdit');
    const inputField = document.getElementById('kphApproveNguoiDuyet');
    const textLabel = document.getElementById('kphApproveNguoiDuyetText');

    if (displayDiv && editDiv) {
        if (editable) {
            displayDiv.classList.add('hidden');
            editDiv.classList.remove('hidden');
            if (inputField) inputField.focus();
        } else {
            displayDiv.classList.remove('hidden');
            editDiv.classList.add('hidden');
            if (textLabel && inputField) {
                textLabel.textContent = inputField.value.trim() || 'Chưa thiết lập';
            }
        }
    }
}

export function toggleApproveBienPhapRadio(val) {
    const col = document.getElementById('colApproveBienPhapKhac');
    if (col) {
        col.style.display = (val === 'KHÁC') ? '' : 'none';
    }
}

export async function saveKphApproval() {
    const id = document.getElementById('kphApproveId').value;
    const logIdx = kphLogs.findIndex(item => item.id === id);
    if (logIdx === -1) return;

    const currentLog = kphLogs[logIdx];

    const statusRadio = document.querySelector('input[name="kphApproveStatusRadio"]:checked');
    const newStatus = statusRadio ? statusRadio.value : 'cho_duyet';

    const bpRadio = document.querySelector('input[name="kphApproveBienPhapRadio"]:checked');
    const newBienPhap = bpRadio ? bpRadio.value : 'HỦY';
    let newBienPhapText = newBienPhap;
    if (newBienPhap === 'KHÁC') {
        newBienPhapText = document.getElementById('kphApproveBienPhapKhacInput').value.trim();
        if (!newBienPhapText) newBienPhapText = 'KHÁC';
    }

    const newNgayXuLy = document.getElementById('kphApproveNgayXuLy').value.trim();
    const newNguoiDuyet = document.getElementById('kphApproveNguoiDuyet') ? document.getElementById('kphApproveNguoiDuyet').value.trim() : '';

    // Determine thoiGianDuyet
    let thoiGianDuyet = currentLog.thoiGianDuyet || '';
    if (newStatus !== currentLog.trangThaiDuyet) {
        if (newStatus === 'cho_duyet') {
            thoiGianDuyet = '';
        } else {
            thoiGianDuyet = formatLocalDateTime(new Date());
        }
    } else if ((newStatus === 'da_duyet' || newStatus === 'khong_duyet') && !thoiGianDuyet) {
        thoiGianDuyet = formatLocalDateTime(new Date());
    }

    const updatedLog = {
        ...currentLog,
        trangThaiDuyet: newStatus,
        thoiGianDuyet: thoiGianDuyet,
        nguoiDuyet: newNguoiDuyet,
        bienPhap: newBienPhap,
        bienPhapText: newBienPhapText,
        ngayXuLy: newNgayXuLy
    };

    try {
        await addLog(updatedLog); // IndexedDB put
        kphLogs[logIdx] = updatedLog;
        showAppleToast("Đã cập nhật duyệt phiếu thành công.", "success");
        updateKphLogsUI();
        closeKphApproveModal();
    } catch (e) {
        console.error("Failed to update approval in IndexedDB", e);
        showAppleToast("⚠️ Lỗi xảy ra khi lưu trạng thái duyệt.", "error");
    }
}
