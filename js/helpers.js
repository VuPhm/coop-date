// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN VÀ GIAO THỨC CHUYỂN GIAO PWA ---
export const APP_VERSION_CONFIG = { 
    currentVersion: "2.18.5",
    lastUpdated: "14/07/2026"
};

const APP_VERSION_STORAGE_KEY = 'coopfood:last-seen-app-version';

export const MS_PER_DAY = 1000 * 60 * 60 * 24; 

// Bíp bíp giả lập phần cứng
export function playBeep() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(950, ctx.currentTime); // Âm bíp tần số 950Hz
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.08); // Kéo dài 80ms
    } catch (e) {
        console.error("Audio beep error:", e);
    }
}

export function getCleanToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function updateVersionUI(version, date, status) {
    const noteEl = document.getElementById('appVersionNote');
    if (noteEl) { 
        noteEl.innerText = `v${version} (${date}) | ${status}`; 
    }
}

export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .catch((err) => console.error("SW Register Error:", err));
    }
}

export function initAppVersion() {
    const updateUI = () => {
        const status = navigator.onLine ? "Trực tuyến" : "Ngoại tuyến";
        updateVersionUI(APP_VERSION_CONFIG.currentVersion, APP_VERSION_CONFIG.lastUpdated, status);
    };
    
    updateUI();
    registerServiceWorker();
    
    window.addEventListener('online', updateUI);
    window.addEventListener('offline', updateUI);
}

/**
 * Hiển thị thông báo một lần khi phiên bản hiện tại khác với phiên bản
 * người dùng đã mở gần nhất. Lần dùng ứng dụng đầu tiên chỉ ghi nhận phiên bản.
 */
export function notifyAppVersionUpdate() {
    const modal = document.getElementById('appUpdateModal');
    const versionEl = document.getElementById('appUpdateVersion');
    const timeEl = document.getElementById('appUpdateTime');
    const { currentVersion, lastUpdated } = APP_VERSION_CONFIG;
    let previousVersion = null;

    if (versionEl) versionEl.textContent = `v${currentVersion}`;
    if (timeEl) timeEl.textContent = lastUpdated;

    try {
        previousVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);
        localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion);
    } catch (error) {
        console.warn('Không thể lưu trạng thái phiên bản ứng dụng.', error);
    }

    if (!previousVersion || previousVersion === currentVersion || !modal) return;

    requestAnimationFrame(() => modal.classList.add('active'));
}

export function closeAppUpdateModal() {
    const modal = document.getElementById('appUpdateModal');
    if (modal) modal.classList.remove('active');
}

export function parseLocalDate(dateString) { 
    if (!dateString) return new Date(NaN);
    const parts = dateString.split('/'); 
    if (parts.length !== 3) return new Date(NaN); 
    const d = parseInt(parts[0], 10); 
    const m = parseInt(parts[1], 10); 
    const y = parseInt(parts[2], 10); 
    if (isNaN(d) || isNaN(m) || isNaN(y)) return new Date(NaN); 
    return new Date(y, m - 1, d, 0, 0, 0, 0); 
} 

export function formatLocalDate(dateObj) { 
    if (!dateObj || isNaN(dateObj.getTime())) return ""; 
    const d = String(dateObj.getDate()).padStart(2, '0'); 
    const m = String(dateObj.getMonth() + 1).padStart(2, '0'); 
    const y = dateObj.getFullYear(); 
    return `${d}/${m}/${y}`; 
} 

export function formatRemainingText(days) { 
    if (days < 0) return `Đã trễ ${Math.abs(days)} ngày`; 
    if (days === 0) return `Hết hạn hôm nay`; 
    return `HSD còn ${days} ngày`; 
} 

export function isValidDateStr(str) { 
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

// Custom Apple-style Confirmation Dialog
export function showAppleConfirm({ title, message, htmlContent = null, confirmText = 'Xác nhận', cancelText = 'Hủy', isDanger = false, isPrimary = false }) {
    return new Promise((resolve) => {
        // Create elements using the standard Apple Modal System
        const overlay = document.createElement('div');
        overlay.className = 'apple-modal';
        
        const box = document.createElement('div');
        box.className = 'apple-modal-content';
        box.style.maxWidth = '420px';
        box.style.maxHeight = '90vh';
        box.style.overflowY = 'auto';
        box.style.transform = 'translateY(30px) scale(0.95)';
        box.style.transition = 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)';
        
        // Header
        const header = document.createElement('div');
        header.className = 'apple-modal-header';
        header.style.position = 'sticky';
        header.style.top = '0';
        header.style.zIndex = '100';
        header.style.backgroundColor = 'var(--surface)';
        
        const titleEl = document.createElement('h3');
        titleEl.className = 'apple-modal-title';
        titleEl.textContent = title;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'apple-modal-close-btn';
        closeBtn.innerHTML = '&times;';
        
        header.appendChild(titleEl);
        header.appendChild(closeBtn);
        box.appendChild(header);
        
        // Body
        const body = document.createElement('div');
        body.style.padding = '20px';
        
        const messageEl = document.createElement('div');
        messageEl.style.fontSize = '14px';
        messageEl.style.lineHeight = '1.5';
        messageEl.style.color = 'var(--text-main)';
        
        if (htmlContent) {
            messageEl.innerHTML = htmlContent;
        } else {
            messageEl.textContent = message;
        }
        body.appendChild(messageEl);
        
        // Actions
        const actions = document.createElement('div');
        actions.className = 'kph-form-actions';
        actions.style.marginTop = '24px';
        actions.style.paddingTop = '16px';
        actions.style.borderTop = '1px solid #f2f2f7';
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn-action';
        if (isDanger) {
            confirmBtn.classList.add('btn-danger');
        }
        confirmBtn.textContent = confirmText;
        confirmBtn.type = 'button';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.type = 'button';
        
        actions.appendChild(confirmBtn);
        actions.appendChild(cancelBtn);
        body.appendChild(actions);
        
        box.appendChild(body);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Trigger reflow for transition
        overlay.offsetHeight;
        overlay.classList.add('active');
        // Trigger scale up
        setTimeout(() => {
            box.style.transform = 'translateY(0) scale(1)';
        }, 10);
        
        const cleanUp = () => {
            box.style.transform = 'translateY(30px) scale(0.95)';
            overlay.classList.remove('active');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 350);
        };
        
        closeBtn.addEventListener('click', () => {
            cleanUp();
            resolve(false);
        });
        
        cancelBtn.addEventListener('click', () => {
            cleanUp();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            cleanUp();
            resolve(true);
        });
        
        // Close modal when clicking on overlay background (outside box)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanUp();
                resolve(false);
            }
        });
    });
}

// Custom Apple-style Toast Notification
export function showAppleToast(message, type = 'info', duration = 3000) {
    let container = document.querySelector('.apple-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'apple-toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `apple-toast apple-toast--${type}`;
    
    const icon = document.createElement('div');
    icon.className = 'apple-toast-icon';
    
    let iconStr = 'ℹ️';
    if (type === 'success') iconStr = '✅';
    else if (type === 'warning') iconStr = '⚠️';
    else if (type === 'error') iconStr = '❌';
    icon.textContent = iconStr;
    
    const messageEl = document.createElement('div');
    messageEl.className = 'apple-toast-message';
    messageEl.textContent = message;
    
    toast.appendChild(icon);
    toast.appendChild(messageEl);
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-fadeout');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            if (container.children.length === 0 && container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, 300);
    }, duration);
}

// Hàm tải động thư viện ExcelJS từ CDN nếu chưa được định nghĩa
export async function loadExcelJS() {
    if (window.ExcelJS) return window.ExcelJS;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js';
        script.onload = () => resolve(window.ExcelJS);
        script.onerror = () => reject(new Error('Không thể tải thư viện ExcelJS. Vui lòng kiểm tra kết nối mạng.'));
        document.head.appendChild(script);
    });
}
