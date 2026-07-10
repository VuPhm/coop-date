import { playBeep } from './helpers.js';

// --- BỘ QUÉT MÃ BARCODE QUA CAMERA (HTML5-QRCODE) ---
export let html5QrCode = null;
export let currentCameraId = null;
export let isTorchOn = false;
export let isTorchSupported = false;
export let scannerTargetInputId = 'barcode';

export function setScannerTargetInputId(id) {
    scannerTargetInputId = id;
}

// Trả về danh sách chuẩn quét được chọn
export function getSelectedBarcodeFormats() {
    const activeFormats = [];
    const formats = window.Html5QrcodeSupportedFormats || (typeof Html5QrcodeSupportedFormats !== 'undefined' ? Html5QrcodeSupportedFormats : {});
    
    document.querySelectorAll('.format-tag.active').forEach(tag => {
        const formatName = tag.getAttribute('data-format');
        if (formats[formatName] !== undefined) {
            activeFormats.push(formats[formatName]);
        }
    });
    
    return activeFormats;
}

// Mở modal quét camera
export async function openScanner() {
    const modal = document.getElementById('scannerModal');
    if (!modal) return;
    
    modal.classList.add('active');
    
    const formatsToSupport = getSelectedBarcodeFormats();
    
    try {
        const configObj = { verbose: false };
        if (formatsToSupport.length > 0) {
            configObj.formatsToSupport = formatsToSupport;
        }
        
        html5QrCode = new Html5Qrcode("scanner-preview", configObj);
        
        const cameras = await Html5Qrcode.getCameras();
        const select = document.getElementById('cameraSelect');
        select.innerHTML = '';
        
        if (cameras && cameras.length > 0) {
            cameras.forEach((cam, idx) => {
                const opt = document.createElement('option');
                opt.value = cam.id;
                const camLabel = cam.label.toLowerCase();
                if (camLabel.includes('back') || camLabel.includes('sau') || camLabel.includes('environment')) {
                    opt.selected = true;
                    currentCameraId = cam.id;
                }
                opt.innerText = cam.label || `Camera ${idx + 1}`;
                select.appendChild(opt);
            });
            
            if (!currentCameraId) {
                currentCameraId = cameras[cameras.length - 1].id;
                select.value = currentCameraId;
            }
            
            await startScanning(currentCameraId);
        } else {
            select.innerHTML = '<option value="">Không tìm thấy camera</option>';
            alert("Thiết bị không có máy ảnh hoặc chưa cấp quyền truy cập máy ảnh.");
        }
    } catch (err) {
        console.error("Scanner setup failed:", err);
        alert("Không thể khởi động camera. Hãy kiểm tra lại quyền truy cập máy ảnh.");
        closeScanner();
    }
}

// Bắt đầu luồng camera
export async function startScanning(cameraId) {
    if (!html5QrCode) return;
    
    const config = {
        fps: 10,
        qrbox: (width, height) => {
            const widthBox = Math.round(width * 0.85);
            const heightBox = Math.round(height * 0.45);
            return { width: widthBox, height: heightBox };
        }
    };
    
    try {
        await html5QrCode.start(
            cameraId,
            config,
            (decodedText, decodedResult) => {
                playBeep();
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
                
                document.getElementById(scannerTargetInputId).value = decodedText;
                closeScanner();
            },
            (errorMessage) => {
                // Lọc bỏ log để tối ưu hiệu năng
            }
        );
        
        setTimeout(() => {
            try {
                const capabilities = html5QrCode.getRunningTrackCapabilities();
                const torchBtn = document.getElementById('btnTorch');
                if (capabilities && capabilities.torch) {
                    isTorchSupported = true;
                    isTorchOn = false;
                    if (torchBtn) {
                        torchBtn.style.display = 'flex';
                        torchBtn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                              <path d="M15 17h6M15 12h6M15 7h6M4 5v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"></path>
                            </svg> Bật Đèn Pin
                        `;
                    }
                } else {
                    isTorchSupported = false;
                    if (torchBtn) torchBtn.style.display = 'none';
                }
            } catch (e) {
                console.warn("Could not retrieve track capabilities:", e);
                const torchBtn = document.getElementById('btnTorch');
                if (torchBtn) torchBtn.style.display = 'none';
            }
        }, 500);
        
    } catch (err) {
        console.error("Start scanning error:", err);
    }
}

// Tắt camera và đóng modal
export function closeScanner() {
    const modal = document.getElementById('scannerModal');
    if (modal) modal.classList.remove('active');
    
    const torchBtn = document.getElementById('btnTorch');
    if (torchBtn) torchBtn.style.display = 'none';
    
    isTorchOn = false;
    isTorchSupported = false;
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode = null;
        }).catch(err => {
            console.error("Stop scanning failed:", err);
            html5QrCode = null;
        });
    }
}

// Chuyển đổi camera
export async function switchCamera(cameraId) {
    if (!cameraId || cameraId === currentCameraId) return;
    currentCameraId = cameraId;
    
    if (html5QrCode) {
        await html5QrCode.stop();
        await startScanning(currentCameraId);
    }
}

// Bật tắt đèn pin
export function toggleTorch() {
    if (!html5QrCode || !isTorchSupported) return;
    isTorchOn = !isTorchOn;
    
    html5QrCode.applyVideoConstraints({
        advanced: [{ torch: isTorchOn }]
    }).then(() => {
        const btn = document.getElementById('btnTorch');
        if (btn) {
            btn.innerHTML = isTorchOn ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                  <path d="M15 17h6M15 12h6M15 7h6M4 5v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"></path>
                </svg> Tắt Đèn Pin
            ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
                  <path d="M15 17h6M15 12h6M15 7h6M4 5v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"></path>
                </svg> Bật Đèn Pin
            `;
        }
    }).catch(err => {
        console.error("Toggle torch error:", err);
        isTorchOn = !isTorchOn;
    });
}
