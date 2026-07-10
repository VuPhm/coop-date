import { parseLocalDate, formatLocalDate, getCleanToday, MS_PER_DAY } from './helpers.js';

// --- LOGIC NGHIỆP VỤ HẠN LÙI --- 
export function processReturnBusinessLogic(nsxStr, hsdDateStr) {
    const nsx = parseLocalDate(nsxStr);
    const hsd = parseLocalDate(hsdDateStr);
    const shelfLifeDays = Math.round((hsd - nsx) / MS_PER_DAY) + 1;
    if (shelfLifeDays <= 0) throw new Error("Hạn sử dụng không thể nhỏ hơn ngày sản xuất.");
    
    // ĐÃ SỬA: Ép WebView quét thời gian thực tế của thiết bị phần cứng
    const today = getCleanToday(); 
    const daysRemainingShelfLife = Math.round((hsd - today) / MS_PER_DAY) + 1;
    
    if (daysRemainingShelfLife <= 0) {
        const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
        let returnDate = shelfLifeDays < 10 ? hsd : new Date(hsd.getTime() - (dayThreshold20 - 1) * MS_PER_DAY - 1 * MS_PER_DAY);
        return {
            isExpiredProduct: true,
            isShortProduct: shelfLifeDays < 10,
            formattedHsd: formatLocalDate(hsd),
            dateStr: formatLocalDate(returnDate),
            daysRemaining: daysRemainingShelfLife,
            alert: { class: 'state-expired', label: 'Đã hết HSD', weight: 0, type: 'expired' }
        };
    }
    
    if (shelfLifeDays < 10) {
        return {
            isExpiredProduct: false,
            isShortProduct: true,
            formattedHsd: formatLocalDate(hsd),
            dateStr: formatLocalDate(hsd),
            daysRemaining: daysRemainingShelfLife,
            alert: { class: 'state-safe', label: 'An toàn', weight: 3, type: 'safe' }
        };
    }
    
    const dayThreshold20 = Math.round(shelfLifeDays * 0.2);
    const dayThreshold40 = Math.round(shelfLifeDays * 0.4);
    let returnDate = new Date(hsd.getTime() - (dayThreshold20 - 1) * MS_PER_DAY - 1 * MS_PER_DAY);
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
        formattedHsd: formatLocalDate(hsd),
        dateStr: formatLocalDate(returnDate),
        daysRemaining: daysRemainingShelfLife,
        alert: alertState
    };
}
