const DB_NAME = 'coop_kph_db';
const DB_VERSION = 1;
const STORE_NAME = 'kph_logs';

let db = null;

/**
 * Khởi tạo cơ sở dữ liệu IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export function initDB() {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB open error:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Lấy toàn bộ danh sách phiếu KPH từ IndexedDB
 * @returns {Promise<Array>}
 */
export function getAllLogs() {
    return initDB().then((database) => {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

/**
 * Lưu hoặc cập nhật một phiếu KPH vào IndexedDB
 * @param {Object} log 
 * @returns {Promise<void>}
 */
export function addLog(log) {
    return initDB().then((database) => {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(log);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

/**
 * Xóa một phiếu KPH khỏi IndexedDB
 * @param {string} id 
 * @returns {Promise<void>}
 */
export function deleteLog(id) {
    return initDB().then((database) => {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}

/**
 * Xóa toàn bộ danh sách phiếu KPH trong IndexedDB
 * @returns {Promise<void>}
 */
export function clearAllLogs() {
    return initDB().then((database) => {
        return new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    });
}
