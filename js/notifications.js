import { kphLogs, switchTab, switchKphSubTab } from './kph.js';
import { historyData, loadHistoryItem } from './history.js';
import { formatRemainingText } from './helpers.js';

export function updateNotificationStats() {
    // 1. Calculate KPH pending counts
    const pendingTpcn = kphLogs.filter(item => 
        (item.loaiKph === 'TPCN' || !item.loaiKph) && 
        (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet'
    ).length;
    const pendingTpts = kphLogs.filter(item => 
        item.loaiKph === 'TPTS' && 
        (item.trangThaiDuyet || 'cho_duyet') === 'cho_duyet'
    ).length;
    
    // 2. Calculate History warning/danger/expired counts
    const warningItems = historyData.filter(item => item.alertType === 'warning');
    const dangerItems = historyData.filter(item => item.alertType === 'danger');
    const expiredItems = historyData.filter(item => item.alertType === 'expired');
    
    const warningCount = warningItems.length;
    const dangerCount = dangerItems.length;
    const expiredCount = expiredItems.length;
    
    const totalPendingKph = pendingTpcn + pendingTpts;
    const totalHistoryNotif = warningCount + dangerCount + expiredCount;
    const totalBadgeCount = totalPendingKph + totalHistoryNotif;
    
    // 3. Update Notification Badge in header
    const badge = document.querySelector('#btnNotification .notification-badge');
    if (badge) {
        badge.innerText = totalBadgeCount;
        if (totalBadgeCount > 0) {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // 4. Update Sidebar Statistics counts
    const valKphTpcn = document.querySelector('.val-kph-tpcn');
    const valKphTpts = document.querySelector('.val-kph-tpts');
    const valTracuuWarning = document.querySelector('.val-tracuu-warning');
    const valTracuuDanger = document.querySelector('.val-tracuu-danger');
    const valTracuuExpired = document.querySelector('.val-tracuu-expired');
    
    if (valKphTpcn) valKphTpcn.innerText = pendingTpcn;
    if (valKphTpts) valKphTpts.innerText = pendingTpts;
    if (valTracuuWarning) valTracuuWarning.innerText = warningCount;
    if (valTracuuDanger) valTracuuDanger.innerText = dangerCount;
    if (valTracuuExpired) valTracuuExpired.innerText = expiredCount;
    
    // 5. Update Notification Modal Content if active
    const modal = document.getElementById('notificationModal');
    if (modal && modal.classList.contains('active')) {
        updateNotificationContent(
            pendingTpcn, 
            pendingTpts, 
            warningCount, 
            dangerCount, 
            expiredCount, 
            [...warningItems, ...dangerItems, ...expiredItems]
        );
    }
}

export function openNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.add('active');
        // Force update to get the latest data when opening
        updateNotificationStats();
    }
}

export function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

export function handleNotificationHistoryClick(nsx, hsdDate, hsdDays, barcode, quantity, dvt, tenHang, id) {
    closeNotificationModal();
    switchTab('tracuu');
    loadHistoryItem(nsx, hsdDate, hsdDays, barcode, quantity, dvt, tenHang, id);
    
    // Tự động cuộn đến phần tử trong danh sách lịch sử sau khi DOM render xong
    setTimeout(() => {
        const targetEl = document.getElementById(`history-item-${id}`);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 120);
}

export function handleNotificationKphClick(subTabId) {
    closeNotificationModal();
    switchTab('kph');
    switchKphSubTab(subTabId);
}

function updateNotificationContent(pendingTpcn, pendingTpts, warningCount, dangerCount, expiredCount, urgentHistoryItems) {
    const body = document.getElementById('notificationModalBody');
    if (!body) return;
    
    // Sắp xếp items khẩn cấp: expired (hết hạn) -> danger (quá hạn lùi) -> warning (sắp đến hạn)
    const alertOrder = { 'expired': 0, 'danger': 1, 'warning': 2 };
    urgentHistoryItems.sort((a, b) => (alertOrder[a.alertType] ?? 3) - (alertOrder[b.alertType] ?? 3));
    
    let historyListHtml = '<div class="history-empty" style="text-align: center; color: var(--text-sub); padding: 12px; font-size: 13px;">Không có việc cần xử lý</div>';
    
    if (urgentHistoryItems.length > 0) {
        historyListHtml = urgentHistoryItems.map(item => {
            const labelPrefix = item.isShortProduct ? 'HSD' : 'Ngày lùi';
            const remainingText = item.isExpiredProduct ? 'Đã hết HSD' : formatRemainingText(item.daysRemaining);
            const alertLabelText = item.isExpiredProduct ? 'Đã qua hạn lùi' : item.alertLabel;
            const dvtLabel = item.dvt || 'EA';
            const qtyLabel = (item.quantity !== undefined && item.quantity !== "") ? item.quantity : "";
            const displayBarcode = item.barcode || 'Tra cứu không mã';
            const displayQty = qtyLabel !== "" ? `x${qtyLabel} ${dvtLabel}` : "";
            
            // Ưu tiên hiển thị tên hàng nếu có, nếu không thì hiển thị mã vạch
            const primaryText = item.tenHang || displayBarcode;
            
            // Rút gọn năm yyyy thành yy khi hiển thị (ví dụ 12/07/2026 -> 12/07/26)
            const shortNsx = item.nsx ? item.nsx.replace(/\/20(\d{2})$/, '/$1') : '';
            const shortHsd = item.formattedHsd ? item.formattedHsd.replace(/\/20(\d{2})$/, '/$1') : '';
            
            return `
                <div class="notif-item ${item.alertClass}" 
                     onclick="window.handleNotificationHistoryClick('${item.nsx}', '${item.formattedHsd}', '${item.rawHsdDays}', '${item.barcode || ''}', '${qtyLabel}', '${dvtLabel}', '${(item.tenHang || '').replace(/'/g, "\\'")}', '${item.id}')">
                    <div class="notif-item__indicator"></div>
                    <div class="notif-item__main">
                        <div class="notif-item__title-row" style="font-family: inherit; font-size: 12.5px; font-weight: 600; text-align: left;">
                            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; display: inline-block; vertical-align: middle;">${primaryText}</span>
                            ${displayQty ? `<span class="history-item__qty-badge" style="margin: 0 0 0 4px; padding: 1px 4px; font-size: 9px; vertical-align: middle; font-family: sans-serif; display: inline-block;">${displayQty}</span>` : ''}
                        </div>
                        <div class="notif-item__date-info" style="text-align: left;">
                            <span>NSX: <strong>${shortNsx}</strong></span> | <span>HSD: <strong>${shortHsd}</strong></span>
                        </div>
                    </div>
                    <div class="notif-item__side">
                        <div class="notif-item__countdown">${remainingText}</div>
                        <div class="notif-item__badge">${alertLabelText}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    body.innerHTML = `
        <!-- KPH Section -->
        <div class="notif-section">
            <h4 class="notif-section-title">Hàng Không Phù Hợp (KPH) chờ duyệt</h4>
            <div class="kph-notif-stats-grid">
                <div class="notif-stat-card kph" onclick="window.handleNotificationKphClick('TPCN')">
                    <div class="notif-stat-card__val">${pendingTpcn}</div>
                    <div class="notif-stat-card__label">Phiếu TPCN</div>
                </div>
                <div class="notif-stat-card kph" onclick="window.handleNotificationKphClick('TPTS')">
                    <div class="notif-stat-card__val">${pendingTpts}</div>
                    <div class="notif-stat-card__label">Phiếu TPTS</div>
                </div>
            </div>
        </div>
        
        <!-- Tra Cứu Section -->
        <div class="notif-section" style="margin-top: 20px;">
            <h4 class="notif-section-title">Tra cứu đã lưu (Hạn lùi)</h4>
            <div class="tracuu-notif-stats-grid">
                <div class="notif-stat-card warning" onclick="window.closeNotificationModal(); window.switchTab('tracuu'); window.setFilter('warning');">
                    <div class="notif-stat-card__val">${warningCount}</div>
                    <div class="notif-stat-card__label">Sắp đến hạn</div>
                </div>
                <div class="notif-stat-card danger" onclick="window.closeNotificationModal(); window.switchTab('tracuu'); window.setFilter('danger');">
                    <div class="notif-stat-card__val">${dangerCount}</div>
                    <div class="notif-stat-card__label">Quá hạn lùi</div>
                </div>
                <div class="notif-stat-card expired" onclick="window.closeNotificationModal(); window.switchTab('tracuu'); window.setFilter('expired');">
                    <div class="notif-stat-card__val">${expiredCount}</div>
                    <div class="notif-stat-card__label">Quá hạn SD</div>
                </div>
            </div>
            
            <div class="tracuu-notif-list" style="margin-top: 12px;">
                ${historyListHtml}
            </div>
        </div>
    `;
}

// Expose to window scope for HTML onclick bindings
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.handleNotificationHistoryClick = handleNotificationHistoryClick;
window.handleNotificationKphClick = handleNotificationKphClick;
window.updateNotificationStats = updateNotificationStats;
window.closeSidebar = () => {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
};
