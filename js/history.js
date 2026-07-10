import { formatRemainingText } from './helpers.js';

export const historyData = [];
export let currentFilter = 'all';
export let isPrioritySort = false;

export function setFilter(filterType) { 
    currentFilter = filterType; 
    document.querySelectorAll('.filter-tags .tag').forEach(tag => tag.classList.remove('active')); 
    const tagElement = document.querySelector(`.tag--${filterType}`);
    if (tagElement) tagElement.classList.add('active'); 
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

export function loadHistoryFromStorage() {
    try {
        const stored = localStorage.getItem('coop_date_history');
        if (stored) {
            const parsed = JSON.parse(stored);
            historyData.length = 0;
            parsed.forEach(item => {
                if (!item.id) {
                    item.id = 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                }
            });
            historyData.push(...parsed);
            updateHistoryUI();
        }
    } catch (e) {
        console.error("Failed to load history from localStorage", e);
    }
}

export function saveHistoryToStorage() {
    try {
        localStorage.setItem('coop_date_history', JSON.stringify(historyData));
    } catch (e) {
        console.error("Failed to save history to localStorage", e);
    }
}

export function removeHistoryItem(id) {
    const idx = historyData.findIndex(item => item.id === id);
    if (idx !== -1) {
        historyData.splice(idx, 1);
        saveHistoryToStorage();
        updateHistoryUI();
    }
}

export function clearAllHistory() {
    if (historyData.length === 0) return;
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu?")) {
        historyData.length = 0;
        localStorage.removeItem('coop_date_history');
        updateHistoryUI();
    }
}

export function updateFilterCounts() {
    const total = historyData.length;
    const safe = historyData.filter(item => item.alertType === 'safe').length;
    const warning = historyData.filter(item => item.alertType === 'warning').length;
    const danger = historyData.filter(item => item.alertType === 'danger').length;
    const short = historyData.filter(item => item.alertType === 'short').length;
    const expired = historyData.filter(item => item.alertType === 'expired').length;
    
    const tagAll = document.querySelector('.tag--all');
    const tagSafe = document.querySelector('.tag--safe');
    const tagWarning = document.querySelector('.tag--warning');
    const tagDanger = document.querySelector('.tag--danger');
    const tagShort = document.querySelector('.tag--short');
    const tagExpired = document.querySelector('.tag--expired');
    
    if (tagAll) tagAll.innerText = `Tất cả (${total})`;
    if (tagSafe) tagSafe.innerText = `An toàn (${safe})`;
    if (tagWarning) tagWarning.innerText = `Sắp tới hạn (${warning})`;
    if (tagDanger) tagDanger.innerText = `Quá hạn lùi (${danger})`;
    if (tagShort) tagShort.innerText = `Hàng ngắn ngày (${short})`;
    if (tagExpired) tagExpired.innerText = `Đã hết HSD (${expired})`;
}

export function updateHistoryUI() {
    updateFilterCounts();
    
    const container = document.getElementById('historyList');
    if (!container) return;
    
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
        
        return `
            <li class="history-item ${item.alertClass}" onclick="window.loadHistoryItem('${item.nsx}', '${item.formattedHsd}', '${item.rawHsdDays}', '${item.barcode || ''}', ${item.quantity || 1})">
                <div class="history-item__indicator"></div>
                <div class="history-item__content">
                    <div class="history-item__main-row">
                        <span class="history-item__title">${item.barcode ? `${item.barcode} (x${item.quantity})` : 'Tra cứu'}</span>
                        <span class="history-item__result-val">${labelPrefix}: ${item.result}</span>
                    </div>
                    <div class="history-item__sub-row">
                        <span class="history-item__dates">
                            <div>NSX: ${item.nsx}</div>
                            <div style="margin-top: 1px;">HSD: ${item.formattedHsd}</div>
                        </span>
                        <span class="history-item__status-desc">
                            <div>${alertLabelText}</div>
                            <div style="margin-top: 1px; font-weight: 600;">${remainingText}</div>
                        </span>
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

export function loadHistoryItem(nsx, hsdDate, hsdDays, barcode = "", quantity = 1) { 
    const toggleSwitch = document.getElementById('calcModeToggle');
    if (toggleSwitch && !toggleSwitch.checked) {
        toggleSwitch.checked = true;
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
            document.getElementById('quantity').value = quantity;
            module.executeCalculation(false); 
        });
    }
}
