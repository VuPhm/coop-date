// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN VÀ GIAO THỨC CHUYỂN GIAO PWA ---
export const APP_VERSION_CONFIG = { 
    currentVersion: "2.17.1",       
    lastUpdated: "11/07/2026"     
};

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

export function parseLocalDate(dateString) { 
    const [day, month, year] = dateString.split('/'); 
    return new Date(year, month - 1, day, 0, 0, 0, 0); 
} 

export function formatLocalDate(dateObj) { 
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
export function showAppleConfirm({ title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', isDanger = false, isPrimary = false }) {
    return new Promise((resolve) => {
        // Create elements
        const overlay = document.createElement('div');
        overlay.className = 'apple-confirm-overlay';
        
        const box = document.createElement('div');
        box.className = 'apple-confirm-box';
        
        const body = document.createElement('div');
        body.className = 'apple-confirm-body';
        
        const titleEl = document.createElement('h4');
        titleEl.className = 'apple-confirm-title';
        titleEl.textContent = title;
        
        const messageEl = document.createElement('p');
        messageEl.className = 'apple-confirm-message';
        messageEl.textContent = message;
        
        body.appendChild(titleEl);
        body.appendChild(messageEl);
        
        const actions = document.createElement('div');
        actions.className = 'apple-confirm-actions';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'apple-confirm-btn';
        cancelBtn.textContent = cancelText;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'apple-confirm-btn';
        if (isDanger) {
            confirmBtn.classList.add('apple-confirm-btn--danger');
        } else if (isPrimary) {
            confirmBtn.classList.add('apple-confirm-btn--primary');
        }
        confirmBtn.textContent = confirmText;
        
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        
        box.appendChild(body);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // Trigger reflow for transition
        overlay.offsetHeight;
        overlay.classList.add('active');
        
        const cleanUp = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }, 300);
        };
        
        cancelBtn.addEventListener('click', () => {
            cleanUp();
            resolve(false);
        });
        
        confirmBtn.addEventListener('click', () => {
            cleanUp();
            resolve(true);
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
