const CACHE_NAME = 'app-cache-v2.1.5';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './styles.css' // Đổi tên file CSS thực tế của bạn nếu cần
];

// Cài đặt và khóa cứng tài nguyên thiết yếu vào bộ nhớ đệm
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Kích hoạt luồng mới và dọn dẹp các thùng rác Cache cũ
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

// Chiến lược kiểm tra: Ưu tiên bộ nhớ đệm, cập nhật ngầm từ máy chủ
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Giữ trạng thái an toàn khi mất kết nối mạng hoàn toàn
            });
            return cachedResponse || fetchPromise;
        })
    );
});