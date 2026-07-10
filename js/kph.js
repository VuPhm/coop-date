import { isValidDateStr, parseLocalDate, formatLocalDate } from './helpers.js';

export let activeTab = 'tracuu';
export const kphLogs = [];
export let kphImageBase64 = null;
export let kphNgayPicker, kphNgayXuLyPicker;
export let kphFilterTuNgayPicker, kphFilterDenNgayPicker;

// Cấu hình lọc và sắp xếp bảng KPH
export let kphSortField = null;
export let kphSortDirection = 'desc'; // 'asc' hoặc 'desc'
export let kphFilterTuNgay = '';
export let kphFilterDenNgay = '';
export const kphSelectedIds = new Set();

export function setKphImageBase64(val) {
    kphImageBase64 = val;
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

// Khởi tạo lịch cho tab KPH (form và filter)
export function initKphFlatpickrs() {
    if (!kphNgayPicker) {
        kphNgayPicker = flatpickr("#kphNgayPhatHienHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            positionElement: document.getElementById('kphNgayPhatHien'),
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphNgayPhatHien').value = dateStr;
            }
        });
        if (!document.getElementById('kphNgayPhatHien').value) {
            document.getElementById('kphNgayPhatHien').value = formatLocalDate(new Date());
            kphNgayPicker.setDate(new Date(), false);
        }
        document.getElementById('kphNgayPhatHien').addEventListener('input', () => {
            const val = document.getElementById('kphNgayPhatHien').value.trim();
            if (isValidDateStr(val)) {
                kphNgayPicker.setDate(parseLocalDate(val), false);
            }
        });
    }
    if (!kphNgayXuLyPicker) {
        kphNgayXuLyPicker = flatpickr("#kphNgayXuLyHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            positionElement: document.getElementById('kphNgayXuLy'),
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
            positionElement: document.getElementById('kphFilterTuNgay'),
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphFilterTuNgay').value = dateStr;
            }
        });
        document.getElementById('kphFilterTuNgay').addEventListener('input', () => {
            const val = document.getElementById('kphFilterTuNgay').value.trim();
            if (isValidDateStr(val)) {
                kphFilterTuNgayPicker.setDate(parseLocalDate(val), false);
            } else if (val === '') {
                kphFilterTuNgayPicker.clear();
            }
        });
    }
    if (!kphFilterDenNgayPicker) {
        kphFilterDenNgayPicker = flatpickr("#kphFilterDenNgayHidden", {
            dateFormat: "d/m/Y",
            position: "below",
            positionElement: document.getElementById('kphFilterDenNgay'),
            onChange: function (selectedDates, dateStr) {
                document.getElementById('kphFilterDenNgay').value = dateStr;
            }
        });
        document.getElementById('kphFilterDenNgay').addEventListener('input', () => {
            const val = document.getElementById('kphFilterDenNgay').value.trim();
            if (isValidDateStr(val)) {
                kphFilterDenNgayPicker.setDate(parseLocalDate(val), false);
            } else if (val === '') {
                kphFilterDenNgayPicker.clear();
            }
        });
    }
}

export function openKphNgayPicker() { if (kphNgayPicker) kphNgayPicker.open(); }
export function openKphNgayXuLyPicker() { if (kphNgayXuLyPicker) kphNgayXuLyPicker.open(); }
export function openFilterTuNgayPicker() { if (kphFilterTuNgayPicker) kphFilterTuNgayPicker.open(); }
export function openFilterDenNgayPicker() { if (kphFilterDenNgayPicker) kphFilterDenNgayPicker.open(); }

// Đóng mở trường nhập "Khác"
export function toggleTinhTrangKhac(val) {
    const col = document.getElementById('colTinhTrangKhac');
    if (col) {
        col.style.display = (val === 'Khác') ? 'block' : 'none';
    }
}

export function toggleBienPhapKhac(val) {
    const col = document.getElementById('colBienPhapKhac');
    if (col) {
        col.style.display = (val === 'KHÁC') ? 'block' : 'none';
    }
}

// Quản lý cấu hình cửa hàng
export function saveStoreSettings() {
    const cf = document.getElementById('kphCoopFood').value.trim();
    const store = document.getElementById('kphStore').value.trim();
    localStorage.setItem('kph_coop_food', cf);
    localStorage.setItem('kph_store', store);
}

export function saveNguoiPhatHien() {
    const name = document.getElementById('kphNguoiPhatHien').value.trim();
    localStorage.setItem('kph_nguoi_phat_hien', name);
}

// Hàm tải thiết lập cửa hàng khi khởi động tab KPH
export function loadStoreSettings() {
    const cf = localStorage.getItem('kph_coop_food') || '';
    const store = localStorage.getItem('kph_store') || '';
    const name = localStorage.getItem('kph_nguoi_phat_hien') || '';
    
    document.getElementById('kphCoopFood').value = cf;
    document.getElementById('kphStore').value = store;
    document.getElementById('kphNguoiPhatHien').value = name;
}

// Xử lý nén ảnh minh chứng trên Canvas
export function handleKphImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
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
            
            // Nén JPEG chất lượng 0.7 để bảo vệ LocalStorage
            kphImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            const previewImg = document.getElementById('kphImagePreview');
            const previewContainer = document.getElementById('kphPreviewContainer');
            if (previewImg) previewImg.src = kphImageBase64;
            if (previewContainer) previewContainer.style.display = 'block';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

export function clearKphImage() {
    kphImageBase64 = null;
    document.getElementById('kphImageInput').value = '';
    const previewContainer = document.getElementById('kphPreviewContainer');
    const previewImg = document.getElementById('kphImagePreview');
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
}

// CRUD Phiếu khai báo KPH
export function loadKphLogs() {
    try {
        const stored = localStorage.getItem('coop_kph_logs');
        if (stored) {
            kphLogs.length = 0;
            kphLogs.push(...JSON.parse(stored));
        }
    } catch (e) {
        console.error("Failed to load KPH logs", e);
    }
}

// Lưu log
export function saveKphLogs() {
    try {
        localStorage.setItem('coop_kph_logs', JSON.stringify(kphLogs));
    } catch (e) {
        console.error("Failed to save KPH logs", e);
    }
}

export function addKphLog() {
    const ngayPhatHien = document.getElementById('kphNgayPhatHien').value.trim();
    const nguoiPhatHien = document.getElementById('kphNguoiPhatHien').value.trim();
    const sku = document.getElementById('kphSku').value.trim();
    const tenHang = document.getElementById('kphTenHang').value.trim();
    const ncc = document.getElementById('kphNcc').value.trim();
    const dvt = document.getElementById('kphDvt').value;
    const soLuong = parseFloat(document.getElementById('kphSoLuong').value.trim() || '1');
    
    let tinhTrang = document.getElementById('kphTinhTrang').value;
    if (tinhTrang === 'Khác') {
        tinhTrang = document.getElementById('kphTinhTrangKhac').value.trim();
        if (!tinhTrang) tinhTrang = 'Khác';
    }
    
    let bienPhap = document.getElementById('kphBienPhap').value;
    let bienPhapText = bienPhap;
    if (bienPhap === 'KHÁC') {
        bienPhapText = document.getElementById('kphBienPhapKhac').value.trim();
        if (!bienPhapText) bienPhapText = 'KHÁC';
    }
    
    const ngayXuLy = document.getElementById('kphNgayXuLy').value.trim();
    
    if (!ngayPhatHien || !sku || !tenHang || isNaN(soLuong)) {
        alert("⚠️ Vui lòng điền các trường bắt buộc: Ngày phát hiện, Mã SKU/UPC, Tên hàng hóa, Số lượng.");
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
        image: kphImageBase64
    };
    
    kphLogs.unshift(logEntry);
    saveKphLogs();
    
    // Tự động tích chọn dòng mới thêm
    kphSelectedIds.add(logEntry.id);
    
    updateKphLogsUI();
    clearKphForm();
}

export function removeKphLog(id) {
    const idx = kphLogs.findIndex(item => item.id === id);
    if (idx !== -1) {
        if (confirm("Bạn có chắc chắn muốn xóa bản ghi này?")) {
            kphLogs.splice(idx, 1);
            kphSelectedIds.delete(id);
            saveKphLogs();
            updateKphLogsUI();
        }
    }
}

export function clearAllKphLogs() {
    if (kphLogs.length === 0) return;
    if (confirm("⚠️ Bạn có chắc chắn muốn xóa toàn bộ danh sách phiếu đã khai báo?")) {
        kphLogs.length = 0;
        kphSelectedIds.clear();
        localStorage.removeItem('coop_kph_logs');
        updateKphLogsUI();
    }
}

export function clearKphForm() {
    document.getElementById('kphSku').value = '';
    document.getElementById('kphTenHang').value = '';
    document.getElementById('kphNcc').value = '';
    document.getElementById('kphSoLuong').value = '1';
    document.getElementById('kphTinhTrang').value = 'Hư Hỏng';
    document.getElementById('kphTinhTrangKhac').value = '';
    document.getElementById('kphBienPhap').value = 'HỦY';
    document.getElementById('kphBienPhapKhac').value = '';
    toggleTinhTrangKhac('Hư Hỏng');
    toggleBienPhapKhac('HỦY');
    clearKphImage();
    
    // Clear Ngày xử lý
    document.getElementById('kphNgayXuLy').value = '';
    if (kphNgayXuLyPicker) kphNgayXuLyPicker.clear();
}

// BỘ LỌC KHOẢNG NGÀY & SẮP XẾP CỘT
export function getFilteredKphLogs() {
    const tuStr = document.getElementById('kphFilterTuNgay').value.trim();
    const denStr = document.getElementById('kphFilterDenNgay').value.trim();
    
    return kphLogs.filter(item => {
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

// Cập nhật render bảng giao diện
export function updateKphLogsUI() {
    const filteredLogs = getFilteredKphLogs();
    const countText = document.getElementById('kphCountText');
    if (countText) countText.innerText = filteredLogs.length;
    
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
    
    // 1. Render giao diện Bảng (Desktop)
    if (listContainer) {
        listContainer.innerHTML = sortedLogs.map((item, index) => {
            const isChecked = kphSelectedIds.has(item.id) ? 'checked' : '';
            const isSelectedClass = kphSelectedIds.has(item.id) ? 'class="selected-row"' : '';
            
            const imgHtml = item.image ? 
                `<img class="kph-thumbnail" src="${item.image}" alt="Evidence" onclick="window.zoomImage('${item.image}')">` : 
                `<span style="color: var(--text-sub); font-size: 11px; font-style: italic;">Không có</span>`;
            
            let bienPhapBadge = '';
            if (item.bienPhap === 'HỦY') {
                bienPhapBadge = `<span class="badge badge-danger">HỦY</span>`;
            } else if (item.bienPhap === 'ĐỔI') {
                bienPhapBadge = `<span class="badge badge-warning">ĐỔI</span>`;
            } else if (item.bienPhap === 'XUẤT TRẢ') {
                bienPhapBadge = `<span class="badge badge-info">XUẤT TRẢ</span>`;
            } else {
                bienPhapBadge = `<span class="badge badge-secondary" title="${item.bienPhapText}">KHÁC</span>`;
            }
            
            const xlText = item.ngayXuLy ? 
                `<div class="xl-badge-wrapper">${bienPhapBadge} <span class="xl-desc">${item.bienPhapText === item.bienPhap ? '' : item.bienPhapText}</span></div>` : 
                `<span class="badge badge-unprocessed">Chưa xử lý</span>`;
            
            return `
                <tr ${isSelectedClass}>
                    <td data-label="" style="text-align: center;">
                        <input type="checkbox" class="kph-checkbox" ${isChecked} onchange="window.toggleSelectRowKph('${item.id}')">
                    </td>
                    <td data-label="Ngày PH" style="text-align: center;">${item.ngayPhatHien}</td>
                    <td data-label="SKU" style="font-weight: 600; font-family: monospace; text-align: center;">${item.sku}</td>
                    <td data-label="Tên hàng" style="font-weight: 500;">${item.tenHang}</td>
                    <td data-label="NCC">${item.ncc || '-'}</td>
                    <td data-label="ĐVT" style="text-align: center;">${item.dvt}</td>
                    <td data-label="Số lượng" style="text-align: center; font-weight: 600;">${item.soLuong}</td>
                    <td data-label="Tình trạng">${item.tinhTrang}</td>
                    <td data-label="Biện pháp" style="font-weight: 500;">${xlText}</td>
                    <td data-label="Ngày XL" style="text-align: center;">${item.ngayXuLy || '-'}</td>
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
        mobileContainer.innerHTML = sortedLogs.map((item, index) => {
            const isChecked = kphSelectedIds.has(item.id) ? 'checked' : '';
            const isSelectedClass = kphSelectedIds.has(item.id) ? 'selected-card' : '';
            
            const imgHtml = item.image ? 
                `<div class="kph-card-img-wrapper" onclick="window.zoomImage('${item.image}')">
                    <img src="${item.image}" alt="Evidence">
                 </div>` : '';
            
            let bienPhapBadge = '';
            if (item.bienPhap === 'HỦY') {
                bienPhapBadge = `<span class="badge badge-danger">Hủy</span>`;
            } else if (item.bienPhap === 'ĐỔI') {
                bienPhapBadge = `<span class="badge badge-warning">Đổi</span>`;
            } else if (item.bienPhap === 'XUẤT TRẢ') {
                bienPhapBadge = `<span class="badge badge-info">Xuất trả</span>`;
            } else {
                bienPhapBadge = `<span class="badge badge-secondary">Khác</span>`;
            }
            
            const xlHtml = item.ngayXuLy ? 
                `<div class="kph-card-detail-row">
                    <span class="detail-label">Xử lý:</span>
                    <span class="detail-val">${bienPhapBadge} <span class="xl-text">${item.bienPhapText}</span> vào <span style="font-weight:600;">${item.ngayXuLy}</span></span>
                 </div>` : 
                `<div class="kph-card-detail-row">
                    <span class="detail-label">Xử lý:</span>
                    <span class="detail-val"><span class="badge badge-unprocessed">Chưa xử lý</span></span>
                 </div>`;
            
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
                            ${xlHtml}
                            <div class="kph-card-detail-row">
                                <span class="detail-label font-light">Người PH:</span>
                                <span class="detail-val font-light">${item.nguoiPhatHien || '-'}</span>
                            </div>
                        </div>
                        
                        ${imgHtml}
                    </div>
                    
                    <div class="kph-card-actions">
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
        alert("⚠️ Vui lòng tích chọn ít nhất 1 hàng dữ liệu ở cột ngoài cùng bên trái bảng trước khi xuất Excel.");
        return;
    }

    const sortedSelectedLogs = sortKphLogs(selectedLogs);

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Khai báo KPH', {
            views: [{ showGridLines: true }]
        });

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
            { key: 'image', width: 20 }
        ];

        worksheet.getCell('A1').value = 'CÔNG TY TNHH MTV THỰC PHẨM SAIGON CO.OP';
        worksheet.getCell('A1').font = { name: 'Arial', bold: true, size: 9 };
        worksheet.getCell('A1').alignment = { horizontal: 'left' };

        const coopFoodVal = document.getElementById('kphCoopFood').value.trim();
        const storeVal = document.getElementById('kphStore').value.trim();

        worksheet.getCell('J1').value = `CO.OP FOOD: ${coopFoodVal || '................................'}`;
        worksheet.getCell('J1').font = { name: 'Arial', bold: true, size: 9 };
        worksheet.getCell('J1').alignment = { horizontal: 'left' };

        worksheet.getCell('J2').value = `STORE: ${storeVal || '................................'}`;
        worksheet.getCell('J2').font = { name: 'Arial', bold: true, size: 9 };
        worksheet.getCell('J2').alignment = { horizontal: 'left' };

        worksheet.mergeCells('A5:O5');
        worksheet.getCell('A5').value = 'PHIẾU THEO DÕI HÀNG KHÔNG PHÙ HỢP';
        worksheet.getCell('A5').font = { name: 'Arial', bold: true, size: 15 };
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

        const headerCells = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7', 'J7', 'N7', 'O7', 'J8', 'K8', 'L8', 'M8'];
        headerCells.forEach(cellId => {
            const cell = worksheet.getCell(cellId);
            cell.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: '000000' } };
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
        sortedSelectedLogs.forEach((item, idx) => {
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
                    const base64Data = item.image.split(',')[1];
                    const imageId = workbook.addImage({
                        base64: base64Data,
                        extension: 'jpeg',
                    });
                    worksheet.addImage(imageId, {
                        tl: { col: 14, row: currentRow - 1 },
                        ext: { width: 85, height: 85 },
                        editAs: 'oneCell'
                    });
                    worksheet.getCell(`O${currentRow}`).value = '';
                } catch (err) {
                    console.error("Error inserting image to Excel cell", err);
                    worksheet.getCell(`O${currentRow}`).value = '[Lỗi tải ảnh]';
                }
            } else {
                worksheet.getCell(`O${currentRow}`).value = '';
            }

            const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];
            columns.forEach(col => {
                const cell = worksheet.getCell(`${col}${currentRow}`);
                cell.font = { name: 'Arial', size: 9 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                const isCentered = ['A', 'B', 'C', 'F', 'G', 'J', 'K', 'L', 'N', 'O'].includes(col);
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: isCentered ? 'center' : 'left',
                    wrapText: true
                };
            });
        });

        const footerRow = startRow + sortedSelectedLogs.length + 1;
        worksheet.getRow(footerRow).height = 20;

        worksheet.getCell(`A${footerRow}`).value = 'BM-331.CF';
        worksheet.getCell(`A${footerRow}`).font = { name: 'Arial', italic: true, size: 8.5 };
        worksheet.getCell(`A${footerRow}`).alignment = { vertical: 'middle', horizontal: 'left' };

        worksheet.getCell(`G${footerRow}`).value = 'Lần ban hành: 01';
        worksheet.getCell(`G${footerRow}`).font = { name: 'Arial', italic: true, size: 8.5 };
        worksheet.getCell(`G${footerRow}`).alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.getCell(`N${footerRow}`).value = 'Trang 1 / 1';
        worksheet.getCell(`N${footerRow}`).font = { name: 'Arial', italic: true, size: 8.5 };
        worksheet.getCell(`N${footerRow}`).alignment = { vertical: 'middle', horizontal: 'right' };

        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = formatLocalDate(new Date()).replace(/\//g, '-');
        saveAs(new Blob([buffer]), `Phieu_Theo_Doi_Hang_KPH_${dateStr}.xlsx`);
    } catch (err) {
        console.error("Export to Excel error:", err);
        alert("⚠️ Đã xảy ra lỗi khi tạo file Excel. Hãy thử lại.");
    }
}
