// --- HỆ THỐNG KIỂM SOÁT PHIÊN BẢN VÀ GIAO THỨC CHUYỂN GIAO PWA ---
export const APP_VERSION_CONFIG = { 
    currentVersion: "2.18.7",
    lastUpdated: "15/07/2026"
};

const APP_VERSION_STORAGE_KEY = 'coopfood:last-seen-app-version';
let deferredInstallPrompt = null;

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

function isAppRunningStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getIOSInstallSteps() {
    return [
        {
            icon: '🧭',
            title: 'Mở bằng Safari',
            detail: 'Nếu đang ở Zalo, Facebook hoặc trình duyệt khác, hãy chọn Mở bằng Safari.'
        },
        {
            icon: '⇧',
            title: 'Nhấn nút Chia sẻ',
            detail: 'Tìm biểu tượng hình vuông có mũi tên hướng lên trên thanh công cụ Safari.'
        },
        {
            icon: '+',
            title: 'Thêm vào Màn hình chính',
            detail: 'Cuộn danh sách hành động xuống và chọn “Thêm vào Màn hình chính”.'
        },
        {
            icon: '✓',
            title: 'Xác nhận Thêm',
            detail: 'Giữ “Mở dưới dạng ứng dụng web”, sau đó nhấn “Thêm” ở góc trên.'
        }
    ];
}

function setInstallStatus(message, isInstalled = false) {
    const statusEl = document.getElementById('appInstallStatus');
    const button = document.getElementById('btnInstallApp');
    if (statusEl) statusEl.textContent = message;
    if (button && isInstalled) {
        button.disabled = true;
        button.textContent = 'Đã cài đặt';
    }
}

function getInstallHelp() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isInAppBrowser = /; wv\)|\bFBAN\b|\bFBAV\b|Instagram|Zalo/i.test(navigator.userAgent);

    if (isAppRunningStandalone()) {
        return {
            title: 'Ứng dụng đã được cài đặt',
            message: 'Bạn đang dùng phiên bản đã thêm vào màn hình chính.'
        };
    }

    if (!window.isSecureContext && location.hostname !== 'localhost') {
        return {
            title: 'Cần kết nối an toàn',
            message: 'Không thể cài ứng dụng từ địa chỉ HTTP. Hãy mở ứng dụng bằng đường dẫn HTTPS.'
        };
    }

    if (isInAppBrowser) {
        if (isIOS()) {
            return {
                title: 'Cài ứng dụng trên iPhone/iPad',
                platformLabel: 'iPhone/iPad • Cần mở Safari',
                message: 'Bạn đang mở ứng dụng trong trình duyệt tích hợp. Hãy chuyển sang Safari rồi làm theo 4 bước sau:',
                steps: getIOSInstallSteps(),
                tip: 'Không thấy “Mở bằng Safari”? Hãy sao chép liên kết này, mở Safari và dán vào thanh địa chỉ.'
            };
        }
        return {
            title: 'Mở bằng trình duyệt',
            message: 'Trình duyệt bên trong Zalo, Facebook hoặc Instagram thường không hỗ trợ cài đặt. Hãy chọn “Mở bằng Chrome” rồi thử lại.'
        };
    }

    if (isIOS()) {
        return {
            title: 'Cài ứng dụng trên iPhone/iPad',
            platformLabel: 'iPhone/iPad • Safari',
            message: 'iOS cần thêm ứng dụng thủ công từ Safari. Chỉ mất khoảng 15 giây:',
            steps: getIOSInstallSteps(),
            tip: 'Không thấy “Thêm vào Màn hình chính”? Cuộn xuống cuối danh sách, chọn “Sửa tác vụ” rồi thêm mục này.'
        };
    }

    if (isAndroid) {
        return {
            title: 'Thêm vào màn hình chính',
            message: 'Mở menu ⋮ của trình duyệt, chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”. Nếu chưa thấy, hãy tải lại trang khi có Internet rồi thử lại.'
        };
    }

    return {
        title: 'Cài đặt ứng dụng',
        message: 'Trình duyệt hiện tại chưa cung cấp nút cài đặt trực tiếp. Hãy dùng Chrome hoặc Edge phiên bản mới và mở ứng dụng qua HTTPS.'
    };
}

export function openInstallHelpModal() {
    const modal = document.getElementById('appInstallHelpModal');
    const titleEl = document.getElementById('appInstallHelpTitle');
    const messageEl = document.getElementById('appInstallHelpMessage');
    const help = getInstallHelp();

    if (titleEl) titleEl.textContent = help.title;
    if (messageEl) {
        messageEl.replaceChildren();

        if (help.platformLabel) {
            const platform = document.createElement('div');
            platform.className = 'app-install-platform';
            platform.textContent = help.platformLabel;
            messageEl.appendChild(platform);
        }

        const message = document.createElement('p');
        message.className = 'app-install-help-intro';
        message.textContent = help.message;
        messageEl.appendChild(message);

        if (help.steps) {
            const steps = document.createElement('div');
            steps.className = 'app-install-help-steps';
            help.steps.forEach((step, index) => {
                const item = document.createElement('div');
                item.className = 'app-install-help-step';

                const icon = document.createElement('div');
                icon.className = 'app-install-help-step__icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = step.icon;

                const content = document.createElement('div');
                content.className = 'app-install-help-step__content';

                const title = document.createElement('strong');
                title.textContent = `${index + 1}. ${step.title}`;

                const detail = document.createElement('span');
                detail.textContent = step.detail;

                content.append(title, detail);
                item.append(icon, content);
                steps.appendChild(item);
            });
            messageEl.appendChild(steps);
        }

        if (help.tip) {
            const tip = document.createElement('div');
            tip.className = 'app-install-help-tip';
            tip.textContent = `Mẹo: ${help.tip}`;
            messageEl.appendChild(tip);
        }
    }
    if (modal) modal.classList.add('active');
}

export function closeInstallHelpModal() {
    const modal = document.getElementById('appInstallHelpModal');
    if (modal) modal.classList.remove('active');
}

/** Thiết lập nút cài PWA; lời gọi prompt phải bắt nguồn từ thao tác bấm của người dùng. */
export function initPwaInstall() {
    const installButton = document.getElementById('btnInstallApp');
    if (!installButton) return;

    if (isAppRunningStandalone()) {
        setInstallStatus('Ứng dụng đã ở trên màn hình chính.', true);
        return;
    }

    if (isIOS()) {
        setInstallStatus('Trên iPhone/iPad, ứng dụng được thêm thủ công qua Safari.');
        installButton.textContent = 'Xem hướng dẫn trên iPhone/iPad';
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        setInstallStatus('Sẵn sàng cài đặt trên thiết bị này.');
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        setInstallStatus('Đã cài đặt vào màn hình chính.', true);
        closeInstallHelpModal();
    });

    installButton.addEventListener('click', async () => {
        if (!deferredInstallPrompt) {
            openInstallHelpModal();
            return;
        }

        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;

        if (outcome === 'accepted') {
            setInstallStatus('Đang hoàn tất cài đặt…');
        } else {
            setInstallStatus('Bạn có thể cài đặt lại bất cứ lúc nào.');
        }
    });
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
