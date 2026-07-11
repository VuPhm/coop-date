import { 
    formatRemainingText, 
    formatLocalDate, 
    showAppleConfirm, 
    showAppleToast, 
    loadExcelJS,
    parseLocalDate,
    MS_PER_DAY
} from './helpers.js';
import { 
    getAllHistoryLogs, 
    addHistoryLog, 
    deleteHistoryLog, 
    clearAllHistoryLogs 
} from './db.js';

export const historyData = [];
export const activeFilters = new Set(['all']);
export let isPrioritySort = false;

export function setFilter(filterType) { 
    if (filterType === 'all') {
        activeFilters.clear();
        activeFilters.add('all');
    } else {
        activeFilters.delete('all');
        if (activeFilters.has(filterType)) {
            activeFilters.delete(filterType);
        } else {
            activeFilters.add(filterType);
        }
        if (activeFilters.size === 0) {
            activeFilters.add('all');
        }
    }
    
    // Cập nhật class active cho các thẻ tag bộ lọc
    document.querySelectorAll('.filter-tags .tag').forEach(tag => {
        tag.classList.remove('active');
    });
    
    activeFilters.forEach(f => {
        const tagElement = document.querySelector(`.tag--${f}`);
        if (tagElement) tagElement.classList.add('active');
    });
    
    updateHistoryUI(); 
} 

export function togglePrioritySort() { 
    isPrioritySort = !isPrioritySort; 
    const btn = document.getElementById('sortToggleBtn'); 
    const txt = document.getElementById('sortToggleText'); 
    if (btn) btn.classList.toggle('active', isPrioritySort); 
    if (txt) txt.innerText = isPrioritySort ? "Sắp xếp: Ưu tiên hạn lùi" : "Sắp xếp: Mặc định"; 
    updateHistoryUI(); 
} 

export async function loadHistoryFromStorage() {
    try {
        // Tự động di chuyển dữ liệu cũ từ localStorage sang IndexedDB
        const stored = localStorage.getItem('coop_date_history');
        if (stored) {
            console.log("Tìm thấy dữ liệu lịch sử cũ trong localStorage, tiến hành migration sang IndexedDB...");
            try {
                const parsed = JSON.parse(stored);
                for (const item of parsed) {
                    if (!item.id) {
                        item.id = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    // Migrate legacy 'short' type to 'other'
                    if (item.alertType === 'short') {
                        item.alertType = 'other';
                    }
                    await addHistoryLog(item);
                }
                localStorage.removeItem('coop_date_history');
                console.log("Migration dữ liệu lịch sử thành công!");
            } catch (migrationErr) {
                console.error("Lỗi trong quá trình migration dữ liệu lịch sử:", migrationErr);
            }
        }
        
        const logs = await getAllHistoryLogs();
        historyData.length = 0;
        historyData.push(...logs);
        // Sắp xếp theo thứ tự thời gian tra cứu giảm dần (mới nhất lên trên)
        historyData.sort((a, b) => {
            const timeA = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
            const timeB = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
            return timeB - timeA;
        });
        updateHistoryUI();
    } catch (e) {
        console.error("Failed to load history from IndexedDB", e);
    }
}

export async function saveHistoryToStorage(item) {
    try {
        if (item) {
            await addHistoryLog(item);
        }
    } catch (e) {
        console.error("Failed to save history to IndexedDB", e);
    }
}

export function removeHistoryItem(id) {
    const idx = historyData.findIndex(item => item.id === id);
    if (idx !== -1) {
        historyData.splice(idx, 1);
        deleteHistoryLog(id).catch(err => console.error("Lỗi khi xóa khỏi DB:", err));
        updateHistoryUI();
    }
}

export function removeHistoryItemFromDB(id) {
    deleteHistoryLog(id).catch(err => console.error("Lỗi khi xóa khỏi DB:", err));
}

export function clearAllHistory() {
    if (historyData.length === 0) return;
    showAppleConfirm({
        title: "Xóa toàn bộ lịch sử",
        message: "Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu?",
        confirmText: "Xóa sạch",
        cancelText: "Hủy",
        isDanger: true
    }).then(confirmed => {
        if (confirmed) {
            historyData.length = 0;
            clearAllHistoryLogs().catch(err => console.error("Lỗi khi dọn dẹp DB:", err));
            updateHistoryUI();
        }
    });
}

export function updateFilterCounts() {
    const total = historyData.length;
    const safe = historyData.filter(item => item.alertType === 'safe').length;
    const warning = historyData.filter(item => item.alertType === 'warning').length;
    const danger = historyData.filter(item => item.alertType === 'danger').length;
    const other = historyData.filter(item => item.alertType === 'other').length;
    const expired = historyData.filter(item => item.alertType === 'expired').length;
    
    const tagAll = document.querySelector('.tag--all');
    const tagSafe = document.querySelector('.tag--safe');
    const tagWarning = document.querySelector('.tag--warning');
    const tagDanger = document.querySelector('.tag--danger');
    const tagOther = document.querySelector('.tag--other');
    const tagExpired = document.querySelector('.tag--expired');
    
    if (tagAll) tagAll.innerText = `Tất cả (${total})`;
    if (tagSafe) tagSafe.innerText = `An toàn (${safe})`;
    if (tagWarning) tagWarning.innerText = `Sắp tới hạn (${warning})`;
    if (tagDanger) tagDanger.innerText = `Quá hạn lùi (${danger})`;
    if (tagOther) tagOther.innerText = `Khác (${other})`;
    if (tagExpired) tagExpired.innerText = `Đã hết HSD (${expired})`;
}

export function updateHistoryUI() {
    updateFilterCounts();
    
    const container = document.getElementById('historyList');
    if (!container) return;
    
    const clearBtn = document.getElementById('btnClearHistory');
    const exportBtn = document.getElementById('btnExportHistoryExcel');
    const hasHistory = historyData.length > 0;
    
    let displayData = [...historyData];
    if (!activeFilters.has('all')) {
        displayData = displayData.filter(item => activeFilters.has(item.alertType));
    }
    if (isPrioritySort) displayData.sort((a, b) => a.alertWeight - b.alertWeight);
    
    if (clearBtn) clearBtn.disabled = !hasHistory;
    
    if (exportBtn) {
        exportBtn.disabled = displayData.length === 0;
        exportBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
              stroke-linejoin="round" style="width: 14px; height: 14px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Xuất Excel (${displayData.length})</span>
        `;
    }
    
    if (displayData.length === 0) {
        container.innerHTML = '<li class="history-empty">Không có dữ liệu phù hợp</li>';
        return;
    }
    
    container.innerHTML = displayData.map(item => {
        const labelPrefix = item.isShortProduct ? 'HSD' : 'Ngày lùi';
        const remainingText = item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
        const alertLabelText = item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel;
        const dvtLabel = item.dvt || 'EA';
        const qtyLabel = item.quantity !== undefined ? item.quantity : 1;
        const displayBarcode = item.barcode || 'Tra cứu không mã';
        
        return `
            <li class="history-item ${item.alertClass}" onclick="window.loadHistoryItem('${item.nsx}', '${item.formattedHsd}', '${item.rawHsdDays}', '${item.barcode || ''}', ${qtyLabel}, '${dvtLabel}', '${(item.tenHang || '').replace(/'/g, "\\'")}')">
                <div class="history-item__indicator"></div>
                <div class="history-item__content">
                    <div class="history-item__header-row">
                        <span class="history-item__barcode">${displayBarcode}</span>
                        <span class="history-item__qty-badge">x${qtyLabel} ${dvtLabel}</span>
                    </div>
                    ${item.tenHang ? `<div class="history-item__name-row" style="font-size: 13px; font-weight: 600; color: var(--text-main); margin-top: 4px; margin-bottom: 2px; text-align: left;">${item.tenHang}</div>` : ''}
                    <div class="history-item__detail-row">
                        <div class="history-item__dates-col">
                            <span class="history-item__date-label">NSX: <strong>${item.nsx}</strong></span>
                            <span class="history-item__date-label">HSD: <strong>${item.formattedHsd}</strong></span>
                        </div>
                        <div class="history-item__result-col">
                            <span class="history-item__result-label">${labelPrefix}</span>
                            <span class="history-item__result-value">${item.result}</span>
                        </div>
                    </div>
                    <div class="history-item__footer-row">
                        <span class="history-item__status-badge">${alertLabelText}</span>
                        <span class="history-item__countdown">${remainingText}</span>
                    </div>
                </div>
                <button class="history-item__delete-btn" onclick="event.stopPropagation(); window.removeHistoryItem('${item.id}')" aria-label="Xóa">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </li>
        `;
    }).join('');
} 

export function loadHistoryItem(nsx, hsdDate, hsdDays, barcode = "", quantity = 1, dvt = "EA", tenHang = "") { 
    const toggleSwitch = document.getElementById('calcModeToggle');
    if (toggleSwitch && toggleSwitch.checked) {
        toggleSwitch.checked = false;
        import('./main.js').then(module => {
            module.handleToggleMode(toggleSwitch);
            proceedLoading();
        });
    } else {
        proceedLoading();
    }

    function proceedLoading() {
        import('./main.js').then(module => {
            document.getElementById('nsx').value = nsx; 
            if (module.nsxFlatpickr) module.nsxFlatpickr.setDate(nsx, false); 
            document.getElementById('hsdDate').value = hsdDate; 
            if (module.hsdFlatpickr) module.hsdFlatpickr.setDate(hsdDate, false); 
            document.getElementById('hsdDays').value = hsdDays; 
            document.getElementById('barcode').value = barcode;
            
            const tenHangInput = document.getElementById('tenHang');
            if (tenHangInput) tenHangInput.value = tenHang;
            
            const calcDvtRadio = document.querySelector(`input[name="calcDvt"][value="${dvt}"]`);
            if (calcDvtRadio) calcDvtRadio.checked = true;
            
            document.getElementById('quantity').value = quantity;
            module.executeCalculation(false); 
        });
    }
}

// Xuất lịch sử tra cứu ra file Excel theo đúng định dạng mẫu
export async function exportHistoryToExcel() {
    let displayData = [...historyData];
    if (!activeFilters.has('all')) {
        displayData = displayData.filter(item => activeFilters.has(item.alertType));
    }
    
    if (displayData.length === 0) {
        showAppleToast("⚠️ Không có dữ liệu phù hợp với bộ lọc hiện tại để xuất Excel.", "warning");
        return;
    }
    
    const filterNames = {
        'safe': 'An toàn',
        'warning': 'Sắp tới hạn',
        'danger': 'Quá hạn lùi',
        'other': 'Khác',
        'expired': 'Đã hết HSD'
    };
    
    let groupText = '';
    if (activeFilters.has('all')) {
        groupText = 'Tất cả';
    } else {
        groupText = Array.from(activeFilters).map(f => filterNames[f] || f).join(', ');
    }
    
    const count = displayData.length;
    const confirmExport = await showAppleConfirm({
        title: "Xác nhận xuất Excel",
        message: `Bạn có chắc chắn muốn xuất file Excel cho nhóm lọc "${groupText}" gồm ${count} dòng?`,
        confirmText: "Xuất file",
        cancelText: "Hủy",
        isPrimary: true
    });
    if (!confirmExport) return;
    
    try {
        let sortedLogs = [...displayData];
        
        if (isPrioritySort) {
            sortedLogs.sort((a, b) => a.alertWeight - b.alertWeight);
        } else {
            // Sắp xếp theo thứ tự thời gian tra cứu giảm dần (mới nhất lên trên)
            sortedLogs.sort((a, b) => {
                const timeA = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
                const timeB = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
                return timeB - timeA;
            });
        }
        
        await loadExcelJS();
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Lịch sử tra cứu', {
            views: [{ showGridLines: true }]
        });
        
        // Thiết lập trang in và footer của Excel
        worksheet.pageSetup = {
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0
        };
        worksheet.headerFooter = {
            oddFooter: '&L&IBM-......CF&C&ILần ban hành: 01&R&ITrang &P / &N'
        };
        
        worksheet.columns = [
            { key: 'stt', width: 6 },
            { key: 'ngayKiemTra', width: 14 },
            { key: 'sku', width: 18 },
            { key: 'tenHang', width: 28 },
            { key: 'soLuong', width: 10 },
            { key: 'moc40', width: 18 },
            { key: 'moc20', width: 18 },
            { key: 'ketQua', width: 24 }
        ];
        
        // Tiêu đề đơn vị
        worksheet.getCell('A1').value = 'CÔNG TY TNHH MTV THỰC PHẨM SAIGON CO.OP';
        worksheet.getCell('A1').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A1').alignment = { horizontal: 'left', wrapText: false };
        
        const coopFoodVal = localStorage.getItem('kph_coop_food') || '';
        const storeVal = localStorage.getItem('kph_store') || '';
        
        worksheet.getCell('A2').value = `CO.OP FOOD: ${coopFoodVal || '................................'}`;
        worksheet.getCell('A2').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A2').alignment = { horizontal: 'left', wrapText: false };
        
        worksheet.getCell('A3').value = `STORE: ${storeVal || '................................'}`;
        worksheet.getCell('A3').font = { name: 'Times New Roman', bold: true, size: 9 };
        worksheet.getCell('A3').alignment = { horizontal: 'left', wrapText: false };
        
        worksheet.mergeCells('A5:H5');
        worksheet.getCell('A5').value = 'PHIẾU KIỂM TRA CHẤT LƯỢNG, HSD HÀNG HOÁ';
        worksheet.getCell('A5').font = { name: 'Times New Roman', bold: true, size: 15 };
        worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(5).height = 25;
        
        // Gộp hàng 7 và 8 theo chiều dọc cho từng cột tiêu đề
        worksheet.mergeCells('A7:A8');
        worksheet.mergeCells('B7:B8');
        worksheet.mergeCells('C7:C8');
        worksheet.mergeCells('D7:D8');
        worksheet.mergeCells('E7:E8');
        worksheet.mergeCells('F7:F8');
        worksheet.mergeCells('G7:G8');
        worksheet.mergeCells('H7:H8');
        
        worksheet.getCell('A7').value = 'STT';
        worksheet.getCell('B7').value = 'NGÀY\nKIỂM TRA';
        worksheet.getCell('C7').value = 'SKU';
        worksheet.getCell('D7').value = 'TÊN HÀNG HÓA';
        worksheet.getCell('E7').value = 'SỐ\nLƯỢNG';
        worksheet.getCell('F7').value = 'MỐC CẢNH BÁO\n40%';
        worksheet.getCell('G7').value = 'HẠN LÙI HÀNG\n20%';
        worksheet.getCell('H7').value = 'KẾT QUẢ KIỂM TRA';
        
        const headerCells = ['A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7'];
        headerCells.forEach(cellId => {
            const cell = worksheet.getCell(cellId);
            cell.font = { name: 'Times New Roman', bold: true, size: 9 };
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
        worksheet.getRow(7).height = 20;
        worksheet.getRow(8).height = 20;
        
        // Xuất dòng dữ liệu
        const startRow = 9;
        for (let idx = 0; idx < sortedLogs.length; idx++) {
            const item = sortedLogs[idx];
            const currentRow = startRow + idx;
            const row = worksheet.getRow(currentRow);
            row.height = 22;
            
            worksheet.getCell(`A${currentRow}`).value = idx + 1;
            
            let inspectionDate = '';
            if (item.checkedAt) {
                try {
                    inspectionDate = formatLocalDate(new Date(item.checkedAt));
                } catch(e) {
                    inspectionDate = item.nsx;
                }
            } else {
                inspectionDate = item.nsx;
            }
            worksheet.getCell(`B${currentRow}`).value = inspectionDate;
            worksheet.getCell(`C${currentRow}`).value = item.barcode || '';
            worksheet.getCell(`D${currentRow}`).value = item.tenHang || '';
            worksheet.getCell(`E${currentRow}`).value = item.quantity || 1;
            
            // Tính toán Mốc 40% và Hạn lùi 20%
            let date40Str = '-';
            let date20Str = '-';
            
            try {
                const nsxDate = parseLocalDate(item.nsx);
                const hsdDate = parseLocalDate(item.formattedHsd);
                const shelfLife = parseInt(item.rawHsdDays, 10);
                
                if (!isNaN(shelfLife) && shelfLife >= 10) {
                    const dayThreshold40 = Math.round(shelfLife * 0.4);
                    const dayThreshold20 = Math.round(shelfLife * 0.2);
                    
                    const mốc_40 = shelfLife - dayThreshold40;
                    const date40Obj = new Date(nsxDate.getTime() + (mốc_40 - 1) * MS_PER_DAY);
                    date40Str = formatLocalDate(date40Obj);
                    
                    const mốc_20 = shelfLife - dayThreshold20;
                    const date20Obj = new Date(nsxDate.getTime() + (mốc_20 - 1) * MS_PER_DAY);
                    date20Str = formatLocalDate(date20Obj);
                }
            } catch(e) {
                console.error("Error calculating milestones", e);
            }
            
            worksheet.getCell(`F${currentRow}`).value = date40Str;
            worksheet.getCell(`G${currentRow}`).value = date20Str;
            
            const alertType = item.alertType;
            const labelMap = {
                'safe': 'An toàn',
                'warning': 'Sắp tới hạn',
                'danger': 'Quá hạn lùi',
                'expired': 'Đã hết HSD',
                'other': 'Khác'
            };
            worksheet.getCell(`H${currentRow}`).value = labelMap[alertType] || item.alertLabel || 'Khác';
            
            const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            columns.forEach(col => {
                const cell = worksheet.getCell(`${col}${currentRow}`);
                cell.font = { name: 'Times New Roman', size: 10 };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                
                const isCentered = ['A', 'B', 'C', 'E', 'F', 'G', 'H'].includes(col);
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: isCentered ? 'center' : 'left',
                    wrapText: true
                };
            });
        }
        
        const buffer = await workbook.xlsx.writeBuffer();
        const dateStr = formatLocalDate(new Date()).replace(/\//g, '-');
        const fileBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const downloadUrl = URL.createObjectURL(fileBlob);
        
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = downloadUrl;
        downloadAnchor.download = `Phieu_Kiem_Tra_Chat_Luong_HSD_${dateStr}.xlsx`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        
        document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(downloadUrl);
        
        showAppleToast("Đã xuất file Excel thành công!", "success");
    } catch (err) {
        console.error("Export history to Excel error:", err);
        showAppleToast("⚠️ Đã xảy ra lỗi khi tạo file Excel. Hãy thử lại.", "error");
    }
}
