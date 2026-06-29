const MS_PER_DAY = 1000 * 60 * 60 * 24;
const historyData = [];
let currentFilter = 'all';
let isPrioritySort = false;
let nsxFlatpickr, hsdFlatpickr;
let isSyncing = false; // Cờ hiệu ngăn vòng lặp đồng bộ vô hạn

// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN NỘI BỘ (CLIENT-SIDE ONLY) ---
const APP_VERSION_CONFIG = {
    currentVersion: "2.0.0",       // Thay đổi số này thủ công khi bạn cập nhật code
    lastUpdated: "30/06/2026"     // Ngày cập nhật tương ứng
};

let isFirstCalculation = true;

function checkAppVersionLocal() {
    // Đọc phiên bản đã lưu ở lần truy cập trước từ LocalStorage
    const savedVersion = localStorage.getItem('app_local_version');

    // Nếu không có mạng, hiển thị trạng thái ngoại tuyến dựa trên thông số cấu hình cứng
    if (!navigator.onLine) {
        updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, "Ngoại tuyến");
        return;
    }

    // Trường hợp phát hiện phiên bản cấu hình trong app.js mới hơn bản lưu ở máy người dùng
    if (savedVersion && savedVersion !== APP_VERSION_CONFIG.currentVersion) {
        updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, "Đang làm mới...");

        // Cập nhật dấu vết phiên bản mới vào bộ nhớ
        localStorage.setItem('app_local_version', APP_VERSION_CONFIG.currentVersion);

        // Thực hiện Hard Reload cưỡng bức trình duyệt xóa cache cũ của GitHub Pages
        setTimeout(() => {
            window.location.reload();
        }, 500);
        return;
    }

    // Nếu là lần đầu tiên truy cập hoặc phiên bản trùng khớp
    if (!savedVersion) {
        localStorage.setItem('app_local_version', APP_VERSION_CONFIG.currentVersion);
    }

    updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, "Mới nhất");
}

function updateVersionUI(version, date, status) {
    const noteEl = document.getElementById('appVersionNote');
    if (noteEl) {
        noteEl.innerText = `v${version} (${date}) | ${status}`;
    }
}

// Lắng nghe sự kiện khởi chạy ứng dụng
window.addEventListener('DOMContentLoaded', () => {
    checkAppVersionLocal();
});

// Can thiệp ngầm vào nút bấm Tra cứu lần đầu
const originalExecuteCalculation = executeCalculation;
executeCalculation = function (...args) {
    if (isFirstCalculation) {
        isFirstCalculation = false;
        checkAppVersionLocal();
    }
    return originalExecuteCalculation.apply(this, args);
};
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
        // Tính trọn gói: cộng 1 ngày đầu tiên
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

    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdDaysVal = document.getElementById('hsdDays').value.trim();
    const hsdDateInput = document.getElementById('hsdDate');

    document.getElementById('hsdMonths').value = "";

    if (isValidDateStr(nsxVal) && hsdDaysVal !== "" && !isNaN(hsdDaysVal)) {
        const nsxDate = parseLocalDate(nsxVal);
        const days = parseInt(hsdDaysVal, 10);
        if (days > 0) {
            // Ngược lại, ngày kết thúc bằng ngày sản xuất + số ngày - 1
            const computedHsdDate = new Date(nsxDate.getTime() + (days - 1) * MS_PER_DAY);
            const formatted = formatLocalDate(computedHsdDate);
            hsdDateInput.value = formatted;
            if (hsdFlatpickr) hsdFlatpickr.setDate(computedHsdDate, false);
        } else {
            hsdDateInput.value = "";
            if (hsdFlatpickr) hsdFlatpickr.clear();
        }
    } else {
        hsdDateInput.value = "";
        if (hsdFlatpickr) hsdFlatpickr.clear();
    }

    isSyncing = false;
}

// Đăng ký sự kiện đồng bộ trực tiếp từ hành vi người dùng gõ tay
document.getElementById('hsdDate').addEventListener('input', () => {
    const hsdDateVal = document.getElementById('hsdDate').value.trim();
    
    // XÓA SỐ THÁNG: Thay đổi ngày trực tiếp bằng tay -> xóa ô số tháng
    document.getElementById('hsdMonths').value = "";
    
    if (isValidDateStr(hsdDateVal) && hsdFlatpickr) {
        hsdFlatpickr.setDate(parseLocalDate(hsdDateVal), false);
    }
    syncFromDateToDays();
});

document.getElementById('hsdDays').addEventListener('input', syncFromDaysToDate);
document.getElementById('hsdDays').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); }
});

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
// --- BỔ SUNG TRÌNH LẮNG NGHE CHO Ô SỐ THÁNG ---
document.getElementById('hsdMonths').addEventListener('input', syncFromMonthsToDate);
document.getElementById('hsdMonths').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); }
});

function syncFromMonthsToDate() {
    if (isSyncing) return;
    isSyncing = true;

    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim();
    const hsdDateInput = document.getElementById('hsdDate');
    const hsdDaysInput = document.getElementById('hsdDays');

    if (isValidDateStr(nsxVal) && hsdMonthsVal !== "" && !isNaN(hsdMonthsVal)) {
        const nsxDate = parseLocalDate(nsxVal);
        const months = parseInt(hsdMonthsVal, 10);

        if (months > 0) {
            // Tính toán logic: "Ngày này X tháng sau"
            const computedHsdDate = new Date(nsxDate.getFullYear(), nsxDate.getMonth() + months, nsxDate.getDate(), 0, 0, 0, 0);

            // Xử lý lỗi tràn ngày của tháng (Ví dụ: 31/8 tịnh tiến 1 tháng thành 31/9 -> bị đẩy thành 1/10)
            // Apple HIG quy chuẩn ép về ngày cuối cùng của tháng đó nếu bị tràn biên
            const testDate = new Date(nsxDate.getFullYear(), nsxDate.getMonth() + months + 1, 0);
            let finalHsdDate = computedHsdDate;
            if (computedHsdDate.getMonth() !== (nsxDate.getMonth() + months) % 12) {
                finalHsdDate = testDate;
            }

            const formatted = formatLocalDate(finalHsdDate);
            hsdDateInput.value = formatted;
            if (hsdFlatpickr) hsdFlatpickr.setDate(finalHsdDate, false);

            // Đồng bộ luôn sang ô Số ngày (Bao gồm cả ngày đầu và cuối +1)
            const diffDays = Math.round((finalHsdDate - nsxDate) / MS_PER_DAY) + 1;
            hsdDaysInput.value = diffDays > 0 ? diffDays : "";
        } else {
            hsdDateInput.value = "";
            hsdDaysInput.value = "";
            if (hsdFlatpickr) hsdFlatpickr.clear();
        }
    } else {
        hsdDateInput.value = "";
        hsdDaysInput.value = "";
        if (hsdFlatpickr) hsdFlatpickr.clear();
    }

    isSyncing = false;
}

// CẬP NHẬT: Xóa sạch ô Số tháng nếu người dùng chủ động gõ tay vào ô Số ngày
const originalSyncFromDaysToDate = syncFromDaysToDate;
syncFromDaysToDate = function () {
    if (!isSyncing) {
        document.getElementById('hsdMonths').value = ""; // Ngắt liên kết cũ để ưu tiên số ngày vừa nhập
    }
    return originalSyncFromDaysToDate();
};

// CẬP NHẬT: Tự động tính toán lại ô Số tháng nếu người dùng chọn ngày qua lịch hoặc gõ ô Date
const originalSyncFromDateToDays = syncFromDateToDays;
syncFromDateToDays = function () {
    if (isSyncing) return;
    originalSyncFromDateToDays(); // Chạy hàm tính số ngày gốc trước

    // Xóa ô số tháng vì khoảng cách ngày tùy biến không phải lúc nào cũng quy đổi chẵn ra tháng
    document.getElementById('hsdMonths').value = "";
};
// --- KHỞI TẠO FLATPICKR NEO DƯỚI KHỐI ĐIỀU HƯỚNG ---
window.addEventListener('DOMContentLoaded', () => {
nsxFlatpickr = flatpickr("#nsxHidden", {
        dateFormat: "d/m/Y",
        position: "below",
        appendTo: document.getElementById('nsxGroup'),
        onChange: function(selectedDates, dateStr) {
            document.getElementById('nsx').value = dateStr;
            
            // XÓA SỐ THÁNG: Khi đổi NSX, làm sạch trường số tháng ngay lập tức để tính toán lại
            document.getElementById('hsdMonths').value = "";
            
            const hsdDaysVal = document.getElementById('hsdDays').value.trim();
            if (hsdDaysVal !== "") {
                syncFromDaysToDate();
            } else {
                syncFromDateToDays();
            }
        }
    });
    
    hsdFlatpickr = flatpickr("#hsdHidden", {
        dateFormat: "d/m/Y",
        position: "below",
        appendTo: document.getElementById('hsdGroup'),
        onChange: function(selectedDates, dateStr) {
            document.getElementById('hsdDate').value = dateStr;
            
            // XÓA SỐ THÁNG: Khi chọn ngày HSD mới từ lịch, số tháng cũ không còn giá trị
            document.getElementById('hsdMonths').value = "";
            
            syncFromDateToDays();
        }
    });
    (function initAppleChronometer() {
        const now = new Date();
        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

        const dayOfWeekStr = daysOfWeek[now.getDay()];
        const dayOfMonthStr = String(now.getDate()).padStart(2, '0');
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearStr = now.getFullYear();

        // Gán chuỗi kết hợp gọn gàng vào một node duy nhất
        const fullContainer = document.getElementById('widgetFullDate');
        if (fullContainer) {
            fullContainer.innerText = `${dayOfWeekStr}, Ngày ${dayOfMonthStr}/${monthStr}/${yearStr}`;
        }
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

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysRemainingShelfLife = Math.round((hsdDate - today) / MS_PER_DAY) + 1;

    // TRẠNG THÁI TỐI THƯỢNG: Kiểm tra Quá hạn sử dụng trước tiên cho TẤT CẢ các loại sản phẩm
    if (daysRemainingShelfLife <= 0) {
        // Cách tính ngày lùi vẫn giữ nguyên như cũ không đổi
        const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
        let returnDate = shelfLifeDays < 10 ? hsdDate : new Date(hsdDate.getTime() - (dayThreshold20 - 1) * MS_PER_DAY - 1 * MS_PER_DAY);

        return {
            isExpiredProduct: true, // Cờ hiệu quá hạn sử dụng
            isShortProduct: shelfLifeDays < 10,
            formattedHsd: formatLocalDate(hsdDate),
            dateStr: formatLocalDate(returnDate),
            daysRemaining: daysRemainingShelfLife,
            alert: { class: 'state-expired', label: 'Đã hết HSD', weight: 0, type: 'expired' }
        };
    }

    // Luồng hàng ngắn ngày (< 10 ngày) còn hạn
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

    // Luồng hàng dài ngày (>= 10 ngày) còn hạn
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

// --- PIPELINE HIỂN THỊ ---
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

        // NỘI DUNG BOX HISTORY: Kiểm tra nếu đã hết HSD thì gán chuỗi đặc biệt theo yêu cầu
        const remainingText = item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
        const alertLabelText = item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel;

        return `
            <li class="history-item ${item.alertClass}" onclick="loadHistoryItem('${item.nsx}', '${item.formattedHsd}', '${item.rawHsdDays}')">
                <div class="history-item__meta">NSX: ${item.nsx} | HSD: ${item.formattedHsd}</div>
                <div class="history-item__result">${labelPrefix}: ${item.result} (${alertLabelText}) | ${remainingText}</div>
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
    const wrapper = document.getElementById('resultWrapper');
    const text = document.getElementById('resultText');

    text.classList.remove('calc-board__result-text--visible');
    setTimeout(() => {
        try {
            if (!nsxVal) throw new Error("Chưa nhập ngày sản xuất.");
            if (!hsdDateVal) throw new Error("Chưa xác định được ngày hạn sử dụng.");

            const output = processReturnBusinessLogic(nsxVal, hsdDateVal);
            drawTimelineDiagram(nsxVal, hsdDateVal, output.dateStr);

            wrapper.className = `calc-board__result-wrapper ${output.alert.class}`;

            // NỘI DUNG BOX KẾT QUẢ CHÍNH
            if (output.isExpiredProduct) {
                const labelTitle = output.isShortProduct ? 'Hạn sử dụng' : 'Ngày lùi hàng';
                text.innerHTML = `${labelTitle}: ${output.dateStr}<br>
                                  <small style="font-weight:700; color:#555555;">[${output.alert.label}]</small>`;
            } else if (output.isShortProduct) {
                text.innerHTML = `Hạn sử dụng: ${output.dateStr}<br>
                                  <small style="font-weight:500; opacity:0.9;">[${output.alert.label}] — Sử dụng đến hết ngày ${output.dateStr}</small>`;
            } else {
                text.innerHTML = `Ngày lùi hàng: ${output.dateStr}<br>
                                  <small style="font-weight:500; opacity:0.9;">[${output.alert.label}] — HSD còn ${output.daysRemaining} ngày</small>`;
            }

            if (saveToHistory) {
                const existingIndex = historyData.findIndex(h => h.nsx === nsxVal && h.formattedHsd === output.formattedHsd);
                if (existingIndex !== -1) historyData.splice(existingIndex, 1);

                historyData.unshift({
                    nsx: nsxVal,
                    rawHsdDate: hsdDateVal,
                    rawHsdDays: hsdDaysVal || Math.round((parseLocalDate(hsdDateVal) - parseLocalDate(nsxVal)) / MS_PER_DAY),
                    formattedHsd: output.formattedHsd,
                    result: output.dateStr,
                    daysRemaining: output.daysRemaining,
                    alertClass: output.alert.class,
                    alertLabel: output.alert.label,
                    alertType: output.alert.type, // Bộ lọc 'expired' sẽ ăn theo loại này
                    alertWeight: output.alert.weight,
                    isShortProduct: output.isShortProduct,
                    isExpiredProduct: output.isExpiredProduct // Lưu trữ cờ hiệu quá hạn vào mảng lịch sử
                });
                updateHistoryUI();
            }
        } catch (error) {
            wrapper.className = 'calc-board__result-wrapper state-danger';
            text.innerHTML = error.message;
        }
        text.classList.add('calc-board__result-text--visible');
    }, 150);
}
function drawTimelineDiagram(nsxStr, hsdStr, returnStr) {
    const board = document.getElementById('diagramBoard');
    const container = document.getElementById('svgContainer');
    board.style.display = 'block';

    const nsx = parseLocalDate(nsxStr);
    const hsd = parseLocalDate(hsdStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const totalDays = Math.round((hsd - nsx) / MS_PER_DAY) + 1;
    const todayIndex = Math.round((today - nsx) / MS_PER_DAY) + 1;

    // Tọa độ biên biên phẳng
    const startX = 40;
    const endX = 560;
    const widthX = endX - startX;

    // Nâng trục Y xuống tâm thấp hơn để nhường không gian cho chữ cỡ lớn phía trên
    const y = 55;

    const getX = (dayIndex) => {
        if (totalDays <= 0) return startX;
        const pct = dayIndex / totalDays;
        const clamped = Math.max(0, Math.min(1, pct));
        return startX + clamped * widthX;
    };

    const todayX = getX(todayIndex);
    const colorSafe = '#006633';
    const colorDanger = '#e20514';
    const colorPast = '#86868b';

    // NHÁNH 1: Sản phẩm ngắn ngày (< 10 ngày)
    if (totalDays < 10) {
        const isExpired = (totalDays - todayIndex) < 0;
        const mainColor = isExpired ? colorDanger : colorSafe;

        container.innerHTML = `
            <svg class="timeline-svg" viewBox="0 0 600 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${mainColor}" stroke-width="8" stroke-linecap="round"/>
                
                ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-opacity="0.85"/>` : ''}
                
                <text x="${(startX + endX) / 2}" y="${y - 16}" style="font-size: 14px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">Tổng HSD: ${totalDays} ngày</text>

                <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
                <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
                <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0, 5)}</text>

                <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="${mainColor}" stroke-width="3.5" />
                <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 800;" fill="${mainColor}" text-anchor="middle">HSD</text>
                <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0, 5)}</text>

                ${todayIndex >= 0 && todayIndex <= totalDays ? `
                    <g>
                        <line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>
                        <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                        <text x="${todayX}" y="${y - 28}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                    </g>
                ` : ''}
            </svg>
        `;
        return;
    }

    // NHÁNH 2: Sản phẩm dài ngày (>= 10 ngày)
    const dayThreshold20 = Math.round(totalDays * 0.2);
    const dayThreshold40 = Math.round(totalDays * 0.4);
    const mốc_40 = totalDays - dayThreshold40;
    const mốc_20 = totalDays - dayThreshold20;

    const x_40 = getX(mốc_40);
    const x_20 = getX(mốc_20);
    const colorWarning = '#f29200';

    container.innerHTML = `
        <svg class="timeline-svg" viewBox="0 0 600 130" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            
            <line x1="${startX}" y1="${y}" x2="${x_40}" y2="${y}" stroke="${colorSafe}" stroke-width="8" stroke-linecap="butt"/>
            <line x1="${x_40}" y1="${y}" x2="${x_20}" y2="${y}" stroke="${colorWarning}" stroke-width="14" stroke-linecap="butt"/>
            <line x1="${x_20}" y1="${y}" x2="${endX}" y2="${y}" stroke="${colorDanger}" stroke-width="14" stroke-linecap="butt"/>
            
            ${todayIndex > 0 ? `<line x1="${startX}" y1="${y}" x2="${Math.min(x_40, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="8" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_40 ? `<line x1="${x_40}" y1="${y}" x2="${Math.min(x_20, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}
            ${todayIndex > mốc_20 ? `<line x1="${x_20}" y1="${y}" x2="${Math.min(endX, todayX)}" y2="${y}" stroke="${colorPast}" stroke-width="14" stroke-opacity="0.85"/>` : ''}

            <text x="${(startX + x_40) / 2}" y="${y - 16}" style="font-size: 13px; font-weight: 800;" fill="${colorSafe}" text-anchor="middle">${mốc_40} ngày</text>
            <text x="${(x_40 + x_20) / 2}" y="${y - 18}" style="font-size: 13px; font-weight: 800;" fill="${colorWarning}" text-anchor="middle">${dayThreshold40 - dayThreshold20} ngày</text>
            <text x="${(x_20 + endX) / 2}" y="${y - 18}" style="font-size: 13px; font-weight: 800;" fill="${colorDanger}" text-anchor="middle">${dayThreshold20} ngày</text>

            <circle cx="${startX}" cy="${y}" r="7" fill="#ffffff" stroke="${colorSafe}" stroke-width="3.5" />
            <text x="${startX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">NSX</text>
            <text x="${startX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${nsxStr.slice(0, 5)}</text>

            <circle cx="${x_40}" cy="${y}" r="5" fill="#ffffff" stroke="${colorWarning}" stroke-width="2.5" />
            <text x="${x_40}" y="${y + 26}" style="font-size: 12px; font-weight: 700;" fill="${colorWarning}" text-anchor="middle">Mốc 40%</text>

            <circle cx="${x_20}" cy="${y}" r="7" fill="#ffffff" stroke="${colorDanger}" stroke-width="3.5" />
            <text x="${x_20}" y="${y + 26}" style="font-size: 14px; font-weight: 800;" fill="${colorDanger}" text-anchor="middle">Hạn lùi</text>
            <text x="${x_20}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${returnStr.slice(0, 5)}</text>

            <circle cx="${endX}" cy="${y}" r="7" fill="#ffffff" stroke="#667366" stroke-width="3.5" />
            <text x="${endX}" y="${y + 26}" style="font-size: 13px; font-weight: 600;" fill="#1c261c" text-anchor="middle">HSD</text>
            <text x="${endX}" y="${y + 42}" style="font-size: 13px; font-weight: 700;" fill="#667366" text-anchor="middle">${hsdStr.slice(0, 5)}</text>

            ${todayIndex >= 0 && todayIndex <= totalDays ? `
                <g>
                    <line x1="${todayX}" y1="${y - 22}" x2="${todayX}" y2="${y + 22}" stroke="#1c261c" stroke-width="2" stroke-dasharray="3,3"/>
                    <circle cx="${todayX}" cy="${y}" r="5" fill="#1c261c"/>
                    <text x="${todayX}" y="${y - 28}" style="font-size: 13px; font-weight: 800;" text-anchor="middle" fill="#1c261c">Hôm nay (${today.getDate()}/${today.getMonth() + 1})</text>
                </g>
            ` : ''}
        </svg>
    `;
}