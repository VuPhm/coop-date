// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN VÀ GIAO THỨC CHUYỂN GIAO PWA ---
export const APP_VERSION_CONFIG = { 
    currentVersion: "2.12.0",       
    lastUpdated: "10/07/2026"     
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
