import { 
    isValidDateStr, 
    parseLocalDate, 
    formatLocalDate, 
    getCleanToday, 
    MS_PER_DAY, 
    initAppVersion 
} from './helpers.js';

import { 
    openScanner, 
    closeScanner, 
    switchCamera, 
    toggleTorch, 
    setScannerTargetInputId 
} from './scanner.js';

import { 
    processReturnBusinessLogic 
} from './business.js';

import { 
    drawTimelineDiagram 
} from './timeline.js';

import { 
    historyData, 
    loadHistoryFromStorage, 
    saveHistoryToStorage, 
    removeHistoryItem, 
    clearAllHistory, 
    updateHistoryUI, 
    setFilter, 
    togglePrioritySort, 
    loadHistoryItem 
} from './history.js';

import { 
    switchTab, 
    openKphNgayPicker, 
    openKphNgayXuLyPicker, 
    openFilterTuNgayPicker, 
    openFilterDenNgayPicker, 
    toggleTinhTrangKhac, 
    toggleBienPhapKhac, 
    saveStoreSettings, 
    saveNguoiPhatHien, 
    handleKphImageUpload, 
    clearKphImage, 
    loadKphLogs, 
    addKphLog, 
    removeKphLog, 
    clearAllKphLogs, 
    clearKphForm, 
    applyKphDateFilter, 
    clearKphDateFilter, 
    toggleKphSort, 
    toggleSelectAllKph, 
    toggleSelectRowKph, 
    zoomImage, 
    closeImageModal, 
    exportKphToExcel 
} from './kph.js';

// State của màn hình chính
export let nsxFlatpickr = null;
export let hsdFlatpickr = null;
export let isFirstCalculation = true; 
export let isSyncing = false; 
export let calcMode = 'forward'; 

export function openScannerForCalc() {
    setScannerTargetInputId('barcode');
    openScanner();
}

export function openScannerForKPH() {
    setScannerTargetInputId('kphSku');
    openScanner();
}

export function openNsxPicker() { 
    if (nsxFlatpickr) nsxFlatpickr.open(); 
} 

export function openHsdPicker() { 
    if (hsdFlatpickr) hsdFlatpickr.open(); 
} 

// --- HỆ THỐNG ĐỒNG BỘ CÓ TƯỜNG NGĂN (GUARDED SYNCHRONIZATION) --- 
export function syncFromDateToDays() { 
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

export function syncFromDaysToDate() { 
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

export function syncFromMonthsToDate() { 
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

// --- ĐIỀU HƯỚNG CHẾ ĐỘ QUA CÔNG TẮC GẠT TRƯỢT APPLE ---
export function handleToggleMode(toggleElement) {
    calcMode = toggleElement.checked ? 'forward' : 'backward';
    
    document.getElementById('nsx').value = "";
    document.getElementById('hsdDate').value = "";
    document.getElementById('hsdDays').value = "";
    document.getElementById('hsdMonths').value = "";
    if (nsxFlatpickr) nsxFlatpickr.clear();
    if (hsdFlatpickr) hsdFlatpickr.clear();
    
    const nsxInput = document.getElementById('nsx');
    const btnNsx = document.getElementById('btnNsxPicker');
    
    if (calcMode === 'backward') {
        nsxInput.setAttribute('readonly', 'true');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'none';
            btnNsx.style.opacity = '0.4';
        }
    } else {
        nsxInput.removeAttribute('readonly');
        if (btnNsx) {
            btnNsx.style.pointerEvents = 'auto';
            btnNsx.style.opacity = '1';
        }
    }
}

export function executeCalculation(saveToHistory = true) {
    const nsxVal = document.getElementById('nsx').value.trim();
    const hsdDateVal = document.getElementById('hsdDate').value.trim();
    const hsdDaysVal = document.getElementById('hsdDays').value.trim();
    const hsdMonthsVal = document.getElementById('hsdMonths').value.trim();
    const barcodeVal = document.getElementById('barcode').value.trim();
    const quantityVal = parseInt(document.getElementById('quantity').value.trim() || "1", 10);
    
    const wrapper = document.getElementById('resultWrapper');
    const text = document.getElementById('resultText');
    
    text.classList.remove('calc-board__result-text--visible');

    setTimeout(() => {
        try {
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

            const output = processReturnBusinessLogic(nsxVal, hsdDateVal);
            drawTimelineDiagram(nsxVal, hsdDateVal, output.dateStr);

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
                const existingIndex = historyData.findIndex(h => h.nsx === nsxVal && h.formattedHsd === output.formattedHsd && h.barcode === barcodeVal);
                if (existingIndex !== -1) historyData.splice(existingIndex, 1);
                
                historyData.unshift({ 
                    id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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
                    isExpiredProduct: output.isExpiredProduct,
                    barcode: barcodeVal,
                    quantity: quantityVal,
                    checkedAt: new Date().toISOString()
                });
                saveHistoryToStorage();
                updateHistoryUI();
            }
        } catch (error) {
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
        
        text.offsetHeight; 
        text.classList.add('calc-board__result-text--visible');
    }, 150);
}

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // 1. Khởi tạo Flatpickr cho Tra cứu
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

    // 2. Định dạng hồ sơ Apple Chronometer
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

    // 3. Nạp lịch sử & KPH
    loadHistoryFromStorage();
    loadKphLogs();

    // Fallback cho header compact khi cuộn trang (nếu trình duyệt không hỗ trợ scroll-driven animations)
    if (!CSS.supports('(animation-timeline: scroll()) and (animation-range: 0% 100%)')) {
        const header = document.querySelector('.app-header');
        if (header) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 40) {
                    header.classList.add('app-header--compact');
                } else {
                    header.classList.remove('app-header--compact');
                }
            }, { passive: true });
        }
    }

    // 4. Lắng nghe mask tự động date nhập tay
    document.querySelectorAll('.auto-date').forEach(input => { 
        input.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { 
                e.preventDefault(); 
                const form = input.closest('form');
                if (form && form.id === 'kphForm') {
                    addKphLog();
                } else {
                    executeCalculation(); 
                }
                return; 
            } 
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

    // 5. Đồng bộ input listeners
    const hsdDateInput = document.getElementById('hsdDate');
    if (hsdDateInput) {
        hsdDateInput.addEventListener('input', () => { 
            document.getElementById('hsdMonths').value = ""; 
            const hsdDateVal = hsdDateInput.value.trim(); 
            if (isValidDateStr(hsdDateVal) && hsdFlatpickr) { 
                hsdFlatpickr.setDate(parseLocalDate(hsdDateVal), false); 
            } 
            if (calcMode === 'forward') { 
                syncFromDateToDays(); 
            } else { 
                const hsdDaysVal = document.getElementById('hsdDays').value.trim(); 
                if (hsdDaysVal !== "") { syncFromDaysToDate(); } 
            } 
        });
    }

    const hsdDaysInput = document.getElementById('hsdDays');
    if (hsdDaysInput) {
        hsdDaysInput.addEventListener('input', syncFromDaysToDate); 
        hsdDaysInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); } 
        });
    }

    const hsdMonthsInput = document.getElementById('hsdMonths');
    if (hsdMonthsInput) {
        hsdMonthsInput.addEventListener('input', syncFromMonthsToDate); 
        hsdMonthsInput.addEventListener('keydown', (e) => { 
            if (e.key === 'Enter') { e.preventDefault(); executeCalculation(); } 
        });
    }

    // 6. Định dạng tag EAN
    document.querySelectorAll('.format-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            const active = document.querySelectorAll('.format-tag.active');
            if (active.length === 0) {
                tag.classList.add('active');
            }
        });
    });

    // Khởi tạo app versioning & offline
    initAppVersion();
});

// --- EXPOSE HANDLERS TO GLOBAL WINDOW SCOPE ---
// Điều này cực kỳ quan trọng để giữ index.html hoạt động không bị lỗi ReferenceError
window.switchTab = switchTab;
window.handleToggleMode = handleToggleMode;
window.openScannerForCalc = openScannerForCalc;
window.openNsxPicker = openNsxPicker;
window.openHsdPicker = openHsdPicker;
window.executeCalculation = executeCalculation;
window.clearAllHistory = clearAllHistory;
window.setFilter = setFilter;
window.togglePrioritySort = togglePrioritySort;
window.saveStoreSettings = saveStoreSettings;
window.openKphNgayPicker = openKphNgayPicker;
window.openFilterTuNgayPicker = openFilterTuNgayPicker;
window.openFilterDenNgayPicker = openFilterDenNgayPicker;
window.saveNguoiPhatHien = saveNguoiPhatHien;
window.openScannerForKPH = openScannerForKPH;
window.toggleTinhTrangKhac = toggleTinhTrangKhac;
window.toggleBienPhapKhac = toggleBienPhapKhac;
window.openKphNgayXuLyPicker = openKphNgayXuLyPicker;
window.handleKphImageUpload = handleKphImageUpload;
window.clearKphImage = clearKphImage;
window.addKphLog = addKphLog;
window.clearKphForm = clearKphForm;
window.exportKphToExcel = exportKphToExcel;
window.clearAllKphLogs = clearAllKphLogs;
window.applyKphDateFilter = applyKphDateFilter;
window.clearKphDateFilter = clearKphDateFilter;
window.toggleSelectAllKph = toggleSelectAllKph;
window.closeImageModal = closeImageModal;
window.closeScanner = closeScanner;
window.switchCamera = switchCamera;
window.toggleTorch = toggleTorch;
window.loadHistoryItem = loadHistoryItem;
window.removeHistoryItem = removeHistoryItem;
window.toggleSelectRowKph = toggleSelectRowKph;
window.removeKphLog = removeKphLog;
window.zoomImage = zoomImage;
