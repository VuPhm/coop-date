const CACHE_NAME = 'app-cache-v2.18.5';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './assets/fonts/montserrat-latin-700-normal.woff2',
    './js/helpers.js',
    './js/scanner.js',
    './js/business.js',
    './js/timeline.js',
    './js/history.js',
    './js/db.js',
    './js/kph.js',
    './js/notifications.js',
    './js/main.js',
    './manifest.json',
    './coopfood-logo.png',
    './favicon_io/android-chrome-192x192.png',
    './favicon_io/android-chrome-512x512.png',
    './favicon_io/favicon-32x32.png',
    './favicon_io/favicon-16x16.png',
    './favicon_io/apple-touch-icon.png',
    'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
    'https://cdn.jsdelivr.net/npm/flatpickr',
    'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js'
];

// Cài đặt: Lưu trữ cứng tài nguyên
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting()) // Ép nhảy vào trạng thái chờ kích hoạt
    );
});

// Kích hoạt: Quét sạch bộ nhớ đệm lỗi thời
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Đánh chặn yêu cầu: Network-First cho HTML/JS để luôn kiểm tra bản mới, fallback về Cache khi mất mạng
self.addEventListener('fetch', (e) => {
    // Chỉ xử lý các yêu cầu GET thông thường
    if (e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request).then((networkResponse) => {
            // Nếu có mạng ổn định, cập nhật ngay vào kho lưu trữ
            if (networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, responseClone);
                });
            }
            return networkResponse;
        }).catch(() => {
            // Khi mất kết nối mạng hoàn toàn (Offline), lấy từ Cache ra cứu trợ
            return caches.match(e.request);
        })
    );
});

// ĐÓN ĐẦU TÍN HIỆU GIẢI PHÓNG TỪ GIAO DIỆN
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
