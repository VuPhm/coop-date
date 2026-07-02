// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN VÀ GIAO THỨC CHUYỂN GIAO PWA ---
const APP_VERSION_CONFIG = { 
    currentVersion: "2.1.9",       
    lastUpdated: "02/07/2026"     
};

let isFirstCalculation = true; 
const MS_PER_DAY = 1000 * 60 * 60 * 24; 
const historyData = []; 
let currentFilter = 'all'; 
let isPrioritySort = false; 
let nsxFlatpickr, hsdFlatpickr; 
let isSyncing = false; 
let calcMode = 'forward'; 

function getCleanToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function updateVersionUI(version, date, status) {
    const noteEl = document.getElementById('appVersionNote');
    if (noteEl) { 
        noteEl.innerText = `v${version} (${date}) | ${status}`; 
    }
}

function checkAppVersionLocal() {
    const localSaved = localStorage.getItem('app_local_version');
    
    if (!navigator.onLine) {
        // Nếu mất mạng, hiển thị phiên bản lưu trong máy hoặc bản cứng config nếu chưa có
        const displayVer = localSaved || APP_VERSION_CONFIG.currentVersion;
        updateVersionUI(displayVer, APP_VERSION_CONFIG.lastUpdated, "Ngoại tuyến");
        return;
    }

    // Trường hợp 1: Người dùng mới hoặc lần đầu tiếp cận hệ thống mới
    if (!localSaved) {
        localStorage.setItem('app_local_version', APP_VERSION_CONFIG.currentVersion);
        updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, "Mới nhất");
        registerServiceWorker();
        return;
    }

    // Trường hợp 2: PHÁT HIỆN LỆCH PHIÊN BẢN (Hiển thị bản cũ + thông báo)
    if (localSaved !== APP_VERSION_CONFIG.currentVersion) {
        // ĐÃ SỬA: Hiển thị đúng số phiên bản thực tế máy đang chạy (localSaved) để tránh loạn thông tin
        updateVersionUI(localSaved, APP_VERSION_CONFIG.lastUpdated, "Có bản cập nhật mới");
        showUpdateModal();
        return;
    }

    // Trường hợp 3: Trạng thái bình thường, tiếp tục duy trì đăng ký SW
    updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, "Mới nhất");
    registerServiceWorker();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => {
                // Đón đầu luồng cập nhật ngầm của phiên bản kế tiếp trong tương lai
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdateModal();
                        }
                    });
                });
            })
            .catch((err) => console.error("SW Register Error:", err));
    }
}

function showUpdateModal() {
    if (document.getElementById('updateVersionModal')) return;

    const modal = document.createElement('div');
    modal.id = 'updateVersionModal';
    modal.className = 'apple-update-modal'; // Gọi trực tiếp class CSS ngoại vi
    
    modal.innerHTML = `
        <div class="apple-update-modal__title">Hiệu năng được tối ưu</div>
        <div class="apple-update-modal__desc">Phiên bản mới v${APP_VERSION_CONFIG.currentVersion} đã sẵn sàng hoạt động ổn định.</div>
        <div class="apple-update-modal__actions">
            <button class="apple-update-btn apple-update-btn--cancel" onclick="document.getElementById('updateVersionModal').remove()">Để sau</button>
            <button class="apple-update-btn apple-update-btn--confirm" onclick="forceRefreshApp()">Làm mới ngay</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function forceRefreshApp() {
    localStorage.setItem('app_local_version', APP_VERSION_CONFIG.currentVersion);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                }
            }
        });
    }
    // Bẻ gãy cache bằng chuỗi thời gian, ép trình duyệt nạp tài nguyên thực tế
    window.location.href = window.location.origin + window.location.pathname + '?v=' + new Date().getTime();
}

// Lắng nghe duy nhất tại thời điểm cấu trúc DOM đã sẵn sàng
window.addEventListener('DOMContentLoaded', checkAppVersionLocal);

// --- MASK ĐỊNH DẠNG TEXT INPUT CHO DI ĐỘNG --- 
document.querySelectorAll('.auto-date').forEach(input => { 
    input.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); return; } 
        if (['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(e.key)) return; 
        if (!/[0-9]/.test(e.key)) e.preventDefault(); 
    }); 
    input.addEventListener('input', () => { 
        let value = input.value.replace(/\D/g, ''); 
        if (value.length > 2 && value.length <= 4) { 
            value = `${value.slice(0, 2)}/${value.slice(2)}`; 
        } else if (value.length > 4) { 
            value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4, 8)}`; 
        } 
        input.value = value; 
    }); 
}); 

// --- HỆ THỐNG ĐỒNG BỘ CÓ TƯỜNG NGĂN (GUARDED SYNCHRONIZATION) --- 
function isValidDateStr(str) { 
    if (!str || str.length !== 10) return false; 
    const parts = str.split('/'); 
    if (parts.length !== 3) return false; 
    const d = parseInt(parts[0], 10); 
    const m = parseInt(parts[1], 10); 
    const y = parseInt(parts[2], 10); 
    if (isNaN(d) || isNaN(m) || isNaN(y)) return false; 
    if (m < 1 || m > 12 || d < 1 || d > 31) return false; 
    return true; 
} 

function syncFromDateToDays() { 
    if (isSyncing) return; 
    isSyncing = true; 
    const nsxVal = document.getElementById('nsx').value.trim(); 
    const hsdDateVal = document.getElementById('hsdDate').value.trim(); 
    const hsdDaysInput = document.getElementById('hsdDays'); 
    if (isValidDateStr(nsxVal) && isValidDateStr(hsdDateVal)) { 
        const nsxDate = parseLocalDate(nsxVal); 
        const hsdDate = parseLocalDate(hsdDateVal); 
        const diffDays = Math.round((hsdDate - nsxDate) / MS_PER_DAY) + 1; 
        hsdDaysInput.value = diffDays > 0 ? diffDays : ""; 
    } else { 
        hsdDaysInput.value = ""; 
    } 
    isSyncing = false; 
} 

function syncFromDaysToDate() { 
    if (isSyncing) return; 
    isSyncing = true; 
    const nsxInput = document.getElementById('nsx'); 
    const hsdDateInput = document.getElementById('hsdDate'); 
    const hsdDaysVal = document.getElementById('hsdDays').value.trim(); 
    document.getElementById('hsdMonths').value = ""; 
    const days = parseInt(hsdDaysVal, 10); 

    if (calcMode === 'forward') { 
        const nsxVal = nsxInput.value.trim(); 
        if (isValidDateStr(nsxVal) && days > 0) { 
            const computedHsdDate = new Date(parseLocalDate(nsxVal).getTime() + (days - 1) * MS_PER_DAY); 
            hsdDateInput.value = formatLocalDate(computedHsdDate); 
            if (hsdFlatpickr) hsdFlatpickr.setDate(computedHsdDate, false); 
        } else { hsdDateInput.value = ""; if (hsdFlatpickr) hsdFlatpickr.clear(); } 
    } else { 
        const hsdDateVal = hsdDateInput.value.trim(); 
        if (isValidDateStr(hsdDateVal) && days > 0) { 
            const computedNsxDate = new Date(parseLocalDate(hsdDateVal).getTime() - (days - 1) * MS_PER_DAY); 
            nsxInput.value = formatLocalDate(computedNsxDate); 
            if (nsxFlatpickr) nsxFlatpickr.setDate(computedNsxDate, false); 
        } else { nsxInput.value = ""; if (nsxFlatpickr) nsxFlatpickr.clear(); } 
    } 
    isSyncing = false; 
} 

function syncFromMonthsToDate() { 
    if (isSyncing) return; 
    isSyncing = true; 
    const nsxInput = document.getElementById('nsx'); 
    const hsdDateInput = document.getElementById('hsdDate'); 
    const hsdDaysInput = document.getElementById('hsdDays'); 
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim(); 
    const months = parseInt(hsdMonthsVal, 10); 

    if (calcMode === 'forward') { 
        const nsxVal = nsxInput.value.trim(); 
        if (isValidDateStr(nsxVal) && months > 0) { 
            const nsxDate = parseLocalDate(nsxVal); 
            let finalHsdDate = new Date(nsxDate.getFullYear(), nsxDate.getMonth() + months, nsxDate.getDate()); 
            if (finalHsdDate.getMonth() !== (nsxDate.getMonth() + months) % 12) { 
                finalHsdDate = new Date(nsxDate.getFullYear(), nsxDate.getMonth() + months + 1, 0); 
            } 
            hsdDateInput.value = formatLocalDate(finalHsdDate); 
            if (hsdFlatpickr) hsdFlatpickr.setDate(finalHsdDate, false); 
            hsdDaysInput.value = Math.round((finalHsdDate - nsxDate) / MS_PER_DAY) + 1; 
        } else { hsdDateInput.value = ""; hsdDaysInput.value = ""; } 
    } else { 
        const hsdDateVal = hsdDateInput.value.trim(); 
        if (isValidDateStr(hsdDateVal) && months > 0) { 
            const hsdDate = parseLocalDate(hsdDateVal); 
            let finalNsxDate = new Date(hsdDate.getFullYear(), hsdDate.getMonth() - months, hsdDate.getDate()); 
            if (finalNsxDate.getDate() !== hsdDate.getDate()) { 
                finalNsxDate = new Date(hsdDate.getFullYear(), hsdDate.getMonth() - months + 1, 0); 
            } 
            nsxInput.value = formatLocalDate(finalNsxDate); 
            if (nsxFlatpickr) nsxFlatpickr.setDate(finalNsxDate, false); 
            hsdDaysInput.value = Math.round((hsdDate - finalNsxDate) / MS_PER_DAY) + 1; 
        } else { nsxInput.value = ""; hsdDaysInput.value = ""; } 
    } 
    isSyncing = false; 
} 

// Đăng ký sự kiện trực tiếp
document.getElementById('hsdDate').addEventListener('input', () => { 
    document.getElementById('hsdMonths').value = ""; 
    const hsdDateVal = document.getElementById('hsdDate').value.trim(); 
    if (isValidDateStr(hsdDateVal) && hsdFlatpickr) { 
        hsdFlatpickr.setDate(parseLocalDate(hsdDateVal), false); 
    } 
    if (calcMode === 'forward') { 
        syncFromDateToDays(); 
    } else { 
        const hsdDaysVal = document.getElementById('hsdDays').value.trim(); 
        if (hsdDaysVal !== "") { isSyncing = false; syncFromDaysToDate(); } 
    } 
}); 

document.getElementById('hsdDays').addEventListener('input', syncFromDaysToDate); 
document.getElementById('hsdDays').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); } 
}); 

document.getElementById('hsdMonths').addEventListener('input', syncFromMonthsToDate); 
document.getElementById('hsdMonths').addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); } 
}); 

// --- KHỞI TẠO FLATPICKR NEO DƯỚI KHỐI ĐIỀU HƯỚNG --- 
window.addEventListener('DOMContentLoaded', () => { 
    nsxFlatpickr = flatpickr("#nsxHidden", { 
        dateFormat: "d/m/Y", 
        position: "below", 
        appendTo: document.getElementById('nsxGroup'), 
        onChange: function (selectedDates, dateStr) { 
            document.getElementById('nsx').value = dateStr; 
            document.getElementById('hsdMonths').value = ""; 
            const hsdDaysVal = document.getElementById('hsdDays').value.trim(); 
            if (hsdDaysVal !== "") { syncFromDaysToDate(); } else { syncFromDateToDays(); } 
        } 
    }); 
    hsdFlatpickr = flatpickr("#hsdHidden", { 
        dateFormat: "d/m/Y", 
        position: "below", 
        appendTo: document.getElementById('hsdGroup'), 
        onChange: function (selectedDates, dateStr) { 
            document.getElementById('hsdDate').value = dateStr; 
            document.getElementById('hsdMonths').value = ""; 
            if (calcMode === 'forward') { syncFromDateToDays(); } else { 
                const hsdDaysVal = document.getElementById('hsdDays').value.trim(); 
                if (hsdDaysVal !== "") syncFromDaysToDate(); 
            } 
        } 
    }); 

    (function initAppleChronometer() { 
        const now = new Date(); 
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']; 
        const dayOfWeekStr = daysOfWeek[now.getDay()]; 
        const dayOfMonthStr = String(now.getDate()).padStart(2, '0'); 
        const monthStr = String(now.getMonth() + 1).padStart(2, '0'); 
        const yearStr = now.getFullYear(); 
        const fullContainer = document.getElementById('widgetFullDate'); 
        if (fullContainer) { fullContainer.innerText = `${dayOfWeekStr}, Ngày ${dayOfMonthStr}/${monthStr}/${yearStr}`; } 
    })(); 
}); 

function openNsxPicker() { if (nsxFlatpickr) nsxFlatpickr.open(); } 
function openHsdPicker() { if (hsdFlatpickr) hsdFlatpickr.open(); } 

// --- LOGIC NGHIỆP VỤ HẠN LÙI --- 
function parseLocalDate(dateString) { 
    const [day, month, year] = dateString.split('/'); 
    return new Date(year, month - 1, day, 0, 0, 0, 0); 
} 

function formatLocalDate(dateObj) { 
    const d = String(dateObj.getDate()).padStart(2, '0'); 
    const m = String(dateObj.getMonth() + 1).padStart(2, '0'); 
    const y = dateObj.getFullYear(); 
    return `${d}/${m}/${y}`; 
} 

function formatRemainingText(days) { 
    if (days < 0) return `Đã trễ ${Math.abs(days)} ngày`; 
    if (days === 0) return `Hết hạn hôm nay`; 
    return `HSD còn ${days} ngày`; 
} 

function processReturnBusinessLogic(nsxStr, hsdDateStr) {
    const nsxDate = parseLocalDate(nsxStr);
    const hsdDate = parseLocalDate(hsdDateStr);
    const shelfLifeDays = Math.round((hsdDate - nsxDate) / MS_PER_DAY) + 1;
    if (shelfLifeDays <= 0) throw new Error("Hạn sử dụng không thể nhỏ hơn ngày sản xuất.");
    
    // ĐÃ SỬA: Ép WebView quét thời gian thực tế của thiết bị phần cứng
    const today = getCleanToday(); 
    const daysRemainingShelfLife = Math.round((hsdDate - today) / MS_PER_DAY) + 1;
    
    if (daysRemainingShelfLife <= 0) {
        const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
        let returnDate = shelfLifeDays < 10 ? hsdDate : new Date(hsdDate.getTime() - (dayThreshold20 - 1) * MS_PER_DAY - 1 * MS_PER_DAY);
        return {
            isExpiredProduct: true,
            isShortProduct: shelfLifeDays < 10,
            formattedHsd: formatLocalDate(hsdDate),
            dateStr: formatLocalDate(returnDate),
            daysRemaining: daysRemainingShelfLife,
            alert: { class: 'state-expired', label: 'Đã hết HSD', weight: 0, type: 'expired' }
        };
    }
    
    if (shelfLifeDays < 10) {
        return {
            isExpiredProduct: false,
            isShortProduct: true,
            formattedHsd: formatLocalDate(hsdDate),
            dateStr: formatLocalDate(hsdDate),
            daysRemaining: daysRemainingShelfLife,
            alert: { class: 'state-safe', label: 'An toàn', weight: 3, type: 'safe' }
        };
    }
    
    const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
    const dayThreshold40 = Math.round(shelfLifeDays * 0.4);
    let returnDate = new Date(hsdDate.getTime() - (dayThreshold20 - 1) * MS_PER_DAY - 1 * MS_PER_DAY);
    const daysToReturnDate = Math.round((returnDate - today) / MS_PER_DAY);
    
    let alertState;
    if (daysToReturnDate < 0) {
        alertState = { class: 'state-danger', label: 'Đã qua hạn lùi', weight: 1, type: 'danger' };
    } else if (daysToReturnDate === 0) {
        alertState = { class: 'state-danger', label: 'Đến hạn lùi hàng', weight: 1, type: 'danger' };
    } else if (daysToReturnDate <= (dayThreshold40 - dayThreshold20)) {
        alertState = { class: 'state-warning', label: 'Sắp tới hạn lùi', weight: 2, type: 'warning' };
    } else {
        alertState = { class: 'state-safe', label: 'An toàn', weight: 3, type: 'safe' };
    }
    return {
        isExpiredProduct: false,
        isShortProduct: false,
        formattedHsd: formatLocalDate(hsdDate),
        dateStr: formatLocalDate(returnDate),
        daysRemaining: daysRemainingShelfLife,
        alert: alertState
    };
} 

// --- ĐIỀU HƯỚNG CHẾ ĐỘ QUA CÔNG TẮC GẠT TRƯỢT APPLE ---
function handleToggleMode(toggleElement) {
    // Nếu checked = true -> forward (Tra xuôi), ngược lại -> backward (Tra ngược)
    calcMode = toggleElement.checked ? 'forward' : 'backward';
    
    // Reset toàn bộ trường dữ liệu đầu vào để tránh nhiễm độc dữ liệu chéo giữa 2 luồng
    document.getElementById('nsx').value = "";
    document.getElementById('hsdDate').value = "";
    document.getElementById('hsdDays').value = "";
    document.getElementById('hsdMonths').value = "";
    if (nsxFlatpickr) nsxFlatpickr.clear();
    if (hsdFlatpickr) hsdFlatpickr.clear();
    
    const nsxInput = document.getElementById('nsx');
    const btnNsx = document.getElementById('btnNsxPicker');
    
    if (calcMode === 'backward') {
        // Chế độ TRA NGƯỢC: Khóa cứng ô NSX chỉ cho xem
        nsxInput.setAttribute('readonly', 'true');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'none';
            btnNsx.style.opacity = '0.4';
        }
    } else {
        // Chế độ TRA XUÔI: Mở khóa ô NSX bình thường
        nsxInput.removeAttribute('readonly');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'auto';
            btnNsx.style.opacity = '1';
        }
    }
}

// Đồng bộ trạng thái nạp dữ liệu từ Lịch sử (history-item click) lên công tắc gạt
const originalLoadHistoryItem = loadHistoryItem;
loadHistoryItem = function(nsx, hsdDate, hsdDays) {
    // Khi gọi lại phần tử lịch sử, hệ thống mặc định ép công tắc về trạng thái Tra Xuôi (forward)
    const toggleSwitch = document.getElementById('calcModeToggle');
    if (toggleSwitch && !toggleSwitch.checked) {
        toggleSwitch.checked = true;
        handleToggleMode(toggleSwitch);
    }
    return originalLoadHistoryItem(nsx, hsdDate, hsdDays);
};

function setFilter(filterType) { 
    currentFilter = filterType; 
    document.querySelectorAll('.filter-tags .tag').forEach(tag => tag.classList.remove('active')); 
    document.querySelector(`.tag--${filterType}`).classList.add('active'); 
    updateHistoryUI(); 
} 

function togglePrioritySort() { 
    isPrioritySort = !isPrioritySort; 
    const btn = document.getElementById('sortToggleBtn'); 
    const txt = document.getElementById('sortToggleText'); 
    btn.classList.toggle('active', isPrioritySort); 
    txt.innerText = isPrioritySort ? "Sắp xếp: Ưu tiên hạn lùi" : "Sắp xếp: Mặc định"; 
    updateHistoryUI(); 
} 

function updateHistoryUI() {
    const container = document.getElementById('historyList');
    let displayData = [...historyData];
    if (currentFilter !== 'all') displayData = displayData.filter(item => item.alertType === currentFilter);
    if (isPrioritySort) displayData.sort((a, b) => a.alertWeight - b.alertWeight);
    if (displayData.length === 0) {
        container.innerHTML = '<li class="history-empty">Không có dữ liệu phù hợp</li>';
        return;
    }
    container.innerHTML = displayData.map(item => {
        const labelPrefix = item.isShortProduct ? 'HSD' : 'Ngày lùi';
        const remainingText = item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
        const alertLabelText = item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel;
        
        // ĐÃ SỬA: Loại bỏ dấu '|', bọc phần chuỗi phía sau thành một dòng độc lập xuống dưới
        return `
            <li class="history-item ${item.alertClass}" onclick="loadHistoryItem('${item.nsx}', '${item.formattedHsd}', '${item.rawHsdDays}')">
                <div class="history-item__meta">NSX: ${item.nsx} &bull; HSD: ${item.formattedHsd}</div>
                <div class="history-item__result">
                    ${labelPrefix}: ${item.result} (${alertLabelText})
                    <span class="history-item__status-line">${remainingText}</span>
                </div>
            </li>
        `;
    }).join('');
} 

function loadHistoryItem(nsx, hsdDate, hsdDays) { 
    document.getElementById('nsx').value = nsx; 
    if (nsxFlatpickr) nsxFlatpickr.setDate(nsx, false); 
    document.getElementById('hsdDate').value = hsdDate; 
    if (hsdFlatpickr) hsdFlatpickr.setDate(hsdDate, false); 
    document.getElementById('hsdDays').value = hsdDays; 
    executeCalculation(false); 
} 

function executeCalculation(saveToHistory = true) {
    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdDateVal = document.getElementById('hsdDate').value.trim();
    const hsdDaysVal = document.getElementById('hsdDays').value.trim();
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim();
    
    const wrapper = document.getElementById('resultWrapper');
    const text = document.getElementById('resultText');
    
    // 1. KHỞI ĐỘNG MƯỢT MÀ: Hạ opacity ruột chữ về 0 trước, giữ nguyên hộp nền để không bị sụt lún giao diện
    text.classList.remove('calc-board__result-text--visible');

    setTimeout(() => {
        try {
            // --- HỆ THỐNG VALIDATE THEO TỪNG CHẾ ĐỘ ---
            if (calcMode === 'forward') {
                if (!nsxVal) throw new Error("Vui lòng nhập Ngày sản xuất (NSX).");
                if (!isValidDateStr(nsxVal)) throw new Error("Ngày sản xuất không đúng định dạng (dd/mm/yyyy).");
                if (!hsdDateVal && !hsdDaysVal && !hsdMonthsVal) throw new Error("Vui lòng nhập Hạn sử dụng (chọn Ngày, điền Số ngày hoặc Số tháng).");
                if (hsdDateVal && !isValidDateStr(hsdDateVal)) throw new Error("Hạn sử dụng không đúng định dạng ngày (dd/mm/yyyy).");
            } else {
                if (!hsdDateVal && !hsdDaysVal && !hsdMonthsVal) throw new Error("Vui lòng nhập dữ liệu Hạn sử dụng để tra ngược về NSX.");
                if (hsdDateVal && !isValidDateStr(hsdDateVal)) throw new Error("Hạn sử dụng đã nhập không đúng định dạng ngày (dd/mm/yyyy).");
                if (!nsxVal) throw new Error("Hệ thống chưa thể tính ngược ra Ngày sản xuất. Vui lòng kiểm tra lại số liệu.");
            }

            if (isValidDateStr(nsxVal) && isValidDateStr(hsdDateVal)) {
                const d1 = parseLocalDate(nsxVal);
                const d2 = parseLocalDate(hsdDateVal);
                if (d2 <= d1) throw new Error("Hạn sử dụng phải lớn hơn Ngày sản xuất ít nhất 1 ngày.");
            }

            // --- THỰC THI LOGIC NGHIỆP VỤ ---
            const output = processReturnBusinessLogic(nsxVal, hsdDateVal);
            drawTimelineDiagram(nsxVal, hsdDateVal, output.dateStr);

            // Cập nhật class màu nền cho hộp bảo vệ
            wrapper.className = `calc-board__result-wrapper ${output.alert.class}`;
            
            if (output.isExpiredProduct) {
                const labelTitle = output.isShortProduct ? 'Hạn sử dụng' : 'Ngày lùi hàng';
                text.innerHTML = `<span style="font-size: 15px; font-weight: 700;">${labelTitle}: ${output.dateStr}</span><br>
                                  <small style="font-weight: 800; color: #555555; display: inline-block; margin-top: 4px;">[${output.alert.label}]</small>`;
            } else if (output.isShortProduct) {
                text.innerHTML = `<span style="font-size: 15px; font-weight: 700;">Hạn sử dụng: ${output.dateStr}</span><br>
                                  <small style="font-weight: 600; display: inline-block; margin-top: 4px; opacity: 0.9;">[${output.alert.label}] — Sử dụng đến hết ngày ${output.dateStr}</small>`;
            } else {
                text.innerHTML = `<span style="font-size: 15px; font-weight: 700;">Ngày lùi hàng: ${output.dateStr}</span><br>
                                  <small style="font-weight: 600; display: inline-block; margin-top: 4px; opacity: 0.9;">[${output.alert.label}] — HSD còn ${output.daysRemaining} ngày</small>`;
            }
            
            if (saveToHistory) {
                const existingIndex = historyData.findIndex(h => h.nsx === nsxVal && h.formattedHsd === output.formattedHsd);
                if (existingIndex !== -1) historyData.splice(existingIndex, 1);
                
                historyData.unshift({ 
                    nsx: nsxVal, 
                    rawHsdDate: hsdDateVal,
                    rawHsdDays: hsdDaysVal || Math.round((parseLocalDate(hsdDateVal) - parseLocalDate(nsxVal)) / MS_PER_DAY) + 1,
                    formattedHsd: output.formattedHsd,
                    result: output.dateStr,
                    daysRemaining: output.daysRemaining,
                    alertClass: output.alert.class,
                    alertLabel: output.alert.label,
                    alertType: output.isShortProduct ? 'short' : output.alert.type,
                    alertWeight: output.alert.weight,
                    isShortProduct: output.isShortProduct,
                    isExpiredProduct: output.isExpiredProduct
                });
                updateHistoryUI();
            }
        } catch (error) {
            // Cập nhật class đỏ nhạt cho hộp nền lỗi
            wrapper.className = 'calc-board__result-wrapper state-danger';
            
            let userFriendlyMessage = error.message;
            if (error.message.includes("Vui lòng nhập Ngày sản xuất")) {
                userFriendlyMessage = "⚠️ <b>Thiếu Ngày sản xuất:</b> Vui lòng điền ngày in trên bao bì (hoặc bật lịch chọn) trước khi tra cứu.";
            } else if (error.message.includes("Ngày sản xuất không đúng định dạng")) {
                userFriendlyMessage = "⚠️ <b>Sai Ngày sản xuất:</b> Định dạng chuẩn là Ngày/Tháng/Năm (Ví dụ: 10/06/2026).";
            } else if (error.message.includes("Vui lòng nhập Hạn sử dụng")) {
                userFriendlyMessage = "⚠️ <b>Thiếu Hạn sử dụng:</b> Hãy nhập 1 trong 3 ô: Chọn Ngày cụ thể, điền Số ngày, hoặc điền Số tháng.";
            } else if (error.message.includes("Hạn sử dụng không đúng định dạng")) {
                userFriendlyMessage = "⚠️ <b>Sai định dạng Ngày HSD:</b> Vui lòng kiểm tra lại ô Ngày HSD (Ví dụ: 25/06/2026).";
            } else if (error.message.includes("Hạn sử dụng phải lớn hơn")) {
                userFriendlyMessage = "⚠️ <b>Lỗi biên ngày:</b> Hạn sử dụng bắt buộc phải nằm sau Ngày sản xuất. Vui lòng kiểm tra lại năm hoặc tháng.";
            } else if (error.message.includes("chưa thể tính ngược")) {
                userFriendlyMessage = "⚠️ <b>Thiếu dữ liệu tra ngược:</b> Hãy nhập Ngày HSD kèm theo Số ngày (hoặc Số tháng) để hệ thống tìm ra Ngày sản xuất.";
            }

            text.innerHTML = `<div style="line-height: 1.6; font-size: 13px; color: #e20514; font-weight: 600;">${userFriendlyMessage}</div>`;
            
            const container = document.getElementById('svgContainer');
            if (container) container.innerHTML = '';
            const board = document.getElementById('diagramBoard');
            if (board) board.style.display = 'none';
        }
        
        // 2. PHỤC HỒI HIỆU ỨNG MƯỢT: Ép trình duyệt kích hoạt Reflow giải phóng trạng thái kẹt chữ
        text.offsetHeight; 
        
        // Đẩy class visible lên để thực hiện hiệu ứng transition cự ly từ tệp CSS độc lập
        text.classList.add('calc-board__result-text--visible');
    }, 150);
} 

function drawTimelineDiagram(nsxStr, hsdStr, returnStr) {
    const board = document.getElementById('diagramBoard');
    const container = document.getElementById('svgContainer');
    board.style.display = 'block';

    const nsx = parseLocalDate(nsxStr);
    const hsd = parseLocalDate(hsdStr);
    const today = getCleanToday(); 

    const totalDays = Math.round((hsd - nsx) / MS_PER_DAY) + 1;
    const todayIndex = Math.round((today - nsx) / MS_PER_DAY) + 1;
    
    const startX = 35; 
    const endX = 565;
    const widthX = endX - startX;
    const y = 65; 

    const getX = (dayIndex) => {
        if (totalDays <= 0) return startX;
        const pct = dayIndex / totalDays;
        return startX + Math.max(0, Math.min(1, pct)) * widthX;
    };

    const todayX = getX(todayIndex);
    const colorSafe = '#006633';
    const colorDanger = '#e20514';
    const colorPast = '#86868b';

    // NHÁNH 1: Sản phẩm ngắn ngày (< 10 ngày) - Giữ nguyên logic tối giản
    if (totalDays < 10) {
        const isExpired = (totalDays - todayIndex) < 0;
        const mainColor = isExpired ? colorDanger : colorSafe;

        container.innerHTML = `
            <svg class="timeline-svg" viewBox="0 0 600 145" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${mainColor}" stroke-width="8" stroke-linecap="round"/>
                ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.85"/>` : ''}
                ${todayIndex >= 0 && todayIndex <= totalDays ? `<line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>` : ''}
                
                <text x="${(startX + endX) / 2}" y="${y - 18}" style="font-size: 14px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">Tổng HSD: ${totalDays} ngày</text>
                
                <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
                <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
                <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0,5)}</text>
                
                <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="${mainColor}" stroke-width="3.5" />
                <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">HSD</text>
                <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0,5)}</text>
                
                ${todayIndex >= 0 && todayIndex <= totalDays ? `
                    <g>
                        <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                        <text x="${todayX}" y="${y - 30}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                    </g>
                ` : ''}
            </svg>
        `;
        return;
    }

    // NHÁNH 2: Sản phẩm dài ngày (>= 10 ngày) - ĐÃ CẬP NHẬT THEO YÊU CẦU
    const dayThreshold20 = Math.round(totalDays * 0.2);
    const dayThreshold40 = Math.round(totalDays * 0.4);
    const mốc_40 = totalDays - dayThreshold40;
    const mốc_20 = totalDays - dayThreshold20;
    const x_40 = getX(mốc_40);
    const x_20 = getX(mốc_20);
    const colorWarning = '#f29200';

    // ĐÃ THÊM: Tính toán chuỗi ngày cụ thể cho mốc 40% để in ra nhãn
    const date40Obj = new Date(nsx.getTime() + (mốc_40 - 1) * MS_PER_DAY);
    const date40Str = formatLocalDate(date40Obj);

container.innerHTML = `
        <svg class="timeline-svg" viewBox="0 0 600 145" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <line x1="${startX}" y1="${y}" x2="${x_40}" y2="${y}" stroke="${colorSafe}" stroke-width="8" stroke-linecap="butt"/>
            <line x1="${x_40}" y1="${y}" x2="${x_20}" y2="${y}" stroke="${colorWarning}" stroke-width="14" stroke-linecap="butt"/>
            <line x1="${x_20}" y1="${y}" x2="${endX}" y2="${y}" stroke="${colorDanger}" stroke-width="14" stroke-linecap="butt"/>
            
            ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(x_40, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_40 ? `<line x1="${x_40}" y1="${y}" x2="${Math.min(x_20, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_20 ? `<line x1="${x_20}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}
            ${todayIndex >= 0 && todayIndex <= totalDays ? `<line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>` : ''}

            <text x="${(x_40 + x_20) / 2}" y="${y - 10}" style="font-size: 11px; font-weight: 600;" fill="${colorWarning}" fill-opacity="0.75" text-anchor="middle">${dayThreshold40 - dayThreshold20} ngày</text>
            <text x="${(x_20 + endX) / 2}" y="${y - 10}" style="font-size: 11px; font-weight: 600;" fill="${colorDanger}" fill-opacity="0.75" text-anchor="middle">${dayThreshold20} ngày</text>
            
            <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
            <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
            <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0,5)}</text>
            
            <circle cx="${x_40}" cy="${y}" r="5" fill="#ffffff" stroke="${colorWarning}" stroke-width="3.5" />
            <text x="${x_40}" y="${y + 26}" style="font-size: 12px; font-weight: 700;" fill="${colorWarning}" text-anchor="middle">Mốc 40%</text>
            <text x="${x_40}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${date40Str.slice(0,5)}</text>
            
            <circle cx="${x_20}" cy="${y}" r="7" fill="#ffffff" stroke="${colorDanger}" stroke-width="3.5" />
            <text x="${x_20}" y="${y + 26}" style="font-size: 14px; font-weight: 800;" fill="${colorDanger}" text-anchor="middle">Hạn lùi</text>
            <text x="${x_20}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${returnStr.slice(0,5)}</text>
            
            <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="#667366" stroke-width="3.5" />
            <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">HSD</text>
            <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0,5)}</text>
            
            ${todayIndex >= 0 && todayIndex <= totalDays ? `
                <g>
                    <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                    <text x="${todayX}" y="${y - 30}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                </g>
            ` : ''}
        </svg>
    `;
}