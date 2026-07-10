# Check Date CoopFood - Hệ thống Tra Cứu Thời Hạn Lùi Hàng

Ứng dụng Progressive Web App (PWA) gọn nhẹ, hoạt động độc lập và tối ưu cho thiết bị di động, giúp nhân viên/quản lý tại các cửa hàng bán lẻ (CoopFood) tra cứu nhanh thời hạn lùi hàng (ngày phải thu hồi hoặc giảm giá sản phẩm) dựa trên Ngày Sản Xuất (NSX) và Hạn Sử Dụng (HSD).

* **Bản chạy trực tuyến (Production Build):** [vuphm.github.io/coop-date](https://vuphm.github.io/coop-date/)
* **Nền tảng phát triển:** HTML5, Vanilla CSS (Apple HIG Design), Vanilla JavaScript (ES6), Flatpickr.

---

## 1. Yêu Cầu Chức Năng (Functional Requirements)

Hệ thống hỗ trợ các tính năng nghiệp vụ cốt lõi sau:

### A. Tra Cứu Thời Hạn Lùi Hàng
* **Chế độ Tra Xuôi (Đã biết NSX):**
  * Nhập Ngày Sản Xuất (NSX).
  * Nhập Hạn Sử Dụng (HSD) dưới một trong ba hình thức:
    * Chọn ngày cụ thể (HSD Date).
    * Nhập số ngày (HSD Days).
    * Nhập số tháng (HSD Months).
  * Kết quả hiển thị: **Ngày lùi hàng** cụ thể kèm trạng thái cảnh báo và số ngày HSD còn lại của sản phẩm.
* **Chế độ Tra Ngược (Chưa biết NSX):**
  * Hữu ích khi chỉ có HSD trên bao bì và số ngày/tháng sử dụng tiêu chuẩn của sản phẩm.
  * Khi gạt công tắc chuyển chế độ, ô nhập NSX sẽ bị khóa cứng (`readonly`).
  * Nhập ngày HSD cùng số ngày/tháng sử dụng tiêu chuẩn, hệ thống tự động suy ngược ra NSX và tính toán ngày lùi hàng tương ứng.

### B. Đồng Bộ Hóa Dữ Liệu Hai Chiều (Guarded Bi-directional Sync)
* Nhập/Thay đổi ngày HSD sẽ tự động tính toán ra số ngày HSD tương ứng (dựa vào NSX đã có).
* Nhập/Thay đổi số ngày HSD sẽ tự động cộng dồn từ NSX ra ngày HSD mới (ở chế độ tra xuôi) hoặc trừ lùi từ ngày HSD ra NSX mới (ở chế độ tra ngược).
* Nhập số tháng HSD sẽ tự động tính ra ngày HSD tương ứng theo lịch tháng và quy đổi ra số ngày thực tế.

### C. Trực Quan Hóa Bằng Sơ Đồ Trục Thời Gian (Interactive SVG Timeline)
* Hiển thị trực quan trục thời gian thực tế của sản phẩm từ lúc sản xuất đến khi hết hạn.
* Đánh dấu rõ ràng vị trí của: **NSX**, **Hôm nay**, **Mốc cảnh báo (40%)**, **Hạn lùi hàng (20%)** và **HSD**.
* Phối màu động cho các đoạn trục (Xanh: An toàn, Vàng: Sắp tới hạn, Đỏ: Đã quá hạn lùi) giúp người dùng nhận diện tức thì trạng thái của lô hàng.

### D. Lịch Sử Tra Cứu (Search History)
* Lưu trữ danh sách các phiên tra cứu gần nhất trong bộ nhớ tạm (In-memory) và đồng bộ tự động xuống `localStorage` dưới khóa `coop_date_history`.
* Hỗ trợ **Bộ lọc trạng thái (Filter tags):** Tất cả, An toàn, Sắp tới hạn, Quá hạn lùi, Hàng ngắn ngày, Đã hết HSD.
* Hỗ trợ **Sắp xếp ưu tiên (Priority Sort):** Sắp xếp danh sách lịch sử theo mức độ khẩn cấp của hạn lùi hàng (Danger -> Warning -> Safe).
* Cho phép click vào một mục trong lịch sử để nạp nhanh (load) lại toàn bộ dữ liệu lên các trường nhập liệu.

### E. Khai Báo và Quản Lý Hàng Không Phù Hợp (KPH)
* **Khai báo thông tin chi tiết:** Hỗ trợ nhập liệu Đơn vị (CO.OP FOOD), Cửa hàng (STORE), Người phát hiện, Ngày phát hiện (mặc định hôm nay), SKU/UPC (hỗ trợ quét camera), Tên hàng, Nhà cung cấp (NCC), Đơn vị tính (DVT), Số lượng, Tình trạng (Hư hỏng, Móp méo, Cận hạn, Hết hạn, Khác), Biện pháp xử lý (Hủy, Trả NCC, Giảm giá, Khác), Ngày xử lý thực tế và Ảnh minh chứng.
* **Nén ảnh tự động (Client-side Compression):** Đọc tệp tin ảnh tải lên, vẽ lại bằng Canvas để giới hạn kích thước tối đa `400x400` pixel và nén định dạng JPEG chất lượng `0.7` trước khi chuyển sang chuỗi Base64. Cơ chế này giúp tối ưu hóa dung lượng lưu trữ trên LocalStorage tránh bị tràn hạn mức (quota) của trình duyệt.
* **Quản lý danh sách phiếu KPH:**
  * Đồng bộ tự động offline xuống `localStorage` dưới khóa `coop_kph_logs`.
  * Bộ lọc thông minh theo khoảng thời gian phát hiện hàng KPH (Từ ngày - Đến ngày).
  * Sắp xếp danh sách linh hoạt theo các cột dữ liệu chính: Ngày phát hiện, Số lượng, Ngày xử lý.
  * Chọn dòng hàng loạt (Select All / Single check) để thực hiện các thao tác nhóm.
  * Xem ảnh minh chứng phóng to sắc nét thông qua Modal giao diện tối giản.
  * Xóa từng phiếu khai báo lỗi hoặc xóa toàn bộ lịch sử khai báo KPH.
* **Xuất báo cáo Excel (Excel Export):** Sử dụng các thư viện `exceljs` và `FileSaver.js` để kết xuất danh sách phiếu KPH được chọn (hoặc tất cả nếu không chọn) ra file Excel định dạng chuẩn chỉ với 1 click.

---

## 2. Quy Tắc Nghiệp Vụ Tính Ngày Lùi (Business Rules)

Thuật toán tính toán hạn lùi hàng tuân thủ quy tắc sau:

1. **Tổng số ngày HSD (Shelf Life Days):** 
   $$\text{Shelf Life} = \text{HSD} - \text{NSX} + 1 \text{ ngày}$$
2. **Phân loại sản phẩm:**
   * **Hàng ngắn ngày (Shelf Life < 10 ngày):**
     * Không áp dụng tỷ lệ lùi hàng.
     * **Hạn lùi hàng** trùng khớp với **Hạn Sử Dụng (HSD)**.
     * Trạng thái mặc định: **An toàn** (Trừ trường hợp ngày hiện tại vượt quá HSD -> **Đã hết HSD**).
   * **Hàng dài ngày (Shelf Life $\ge$ 10 ngày):**
     * **Mốc lùi hàng (20%):** $\text{dayThreshold20} = \text{round}(\text{Shelf Life} \times 0.2)$
     * **Mốc cảnh báo (40%):** $\text{dayThreshold40} = \text{round}(\text{Shelf Life} \times 0.4)$
     * **Ngày lùi hàng (Hạn lùi):** 
       $$\text{Ngày lùi} = \text{HSD} - \text{dayThreshold20} \text{ ngày}$$
3. **Phân loại trạng thái cảnh báo:**
   * Gọi $T$ là số ngày chênh lệch từ ngày hôm nay đến **Ngày lùi hàng**:
     * $T < 0$: **Đã qua hạn lùi** (`state-danger` - Màu đỏ)
     * $T = 0$: **Đến hạn lùi hàng** (`state-danger` - Màu đỏ)
     * $0 < T \le (\text{dayThreshold40} - \text{dayThreshold20})$: **Sắp tới hạn lùi** (`state-warning` - Màu vàng)
     * $T > (\text{dayThreshold40} - \text{dayThreshold20})$: **An toàn** (`state-safe` - Màu xanh)
   * Nếu ngày hôm nay vượt quá HSD thực tế: **Đã hết HSD** (`state-expired` - Màu xám tối)

---

## 3. Yêu Cầu Phi Chức Năng (Non-functional Requirements)

### A. Tương Thích PWA Hoạt Động Ngoại Tuyến (Offline Compatibility)
* **Pre-caching tài nguyên:** Tệp Service Worker (`sw.js`) thực hiện đăng ký và lưu trữ cứng (cache) toàn bộ tài nguyên cốt lõi (`index.html`, `style.css`, các tệp tin trong thư mục `js/`, `manifest.json` và các biểu tượng favicon).
* **Chiến lược Caching (Network-First với Cache Fallback):**
  * Đối với các yêu cầu `GET` tải tài nguyên, hệ thống ưu tiên gửi yêu cầu lên Network trước nhằm bảo đảm người dùng nhận được phiên bản logic mới nhất khi có kết nối mạng ổn định.
  * Nếu kết nối mạng thất bại (ngoại tuyến), Service Worker lập tức chặn và trả về tài nguyên trong Cache giúp ứng dụng hoạt động mượt mà không bị gián đoạn.
* **Cơ chế cập nhật ngầm không gián đoạn (Silent Updates on Relaunch):**
  * Hệ thống tối giản hóa luồng cập nhật bằng cách loại bỏ các hộp thoại thông báo phiền hà và so khớp LocalStorage.
  * Nhờ chiến lược Network-First, khi thiết bị có mạng, trình duyệt luôn tải trực tiếp các tệp HTML/JS/CSS mới nhất từ máy chủ để hiển thị tức thì cho người dùng.
  * Đồng thời, Service Worker mới sẽ âm thầm cài đặt dưới nền. Khi người dùng tắt hoàn toàn ứng dụng PWA (hoặc đóng toàn bộ các tab liên quan) và mở lại, Service Worker mới sẽ lập tức kích hoạt, thay thế phiên bản cũ và kích hoạt dọn dẹp cache cũ một cách êm ái mà không gây xung đột hay gián đoạn trải nghiệm của người dùng.

### B. Khả Năng Tương Thích Đa Hệ Điều Hành (Multi-OS Compatibility)
* **Giao diện chuẩn Apple HIG:** Thiết kế theo ngôn ngữ tối giản, hiện đại của iOS/macOS (nền xám nhẹ, các thẻ bo góc lớn `20px` màu trắng, bóng đổ mịn màng, font chữ hệ thống không chân).
* **Thiết kế Responsive linh hoạt (CSS Grid & Flexbox):**
  * Trên màn hình di động nhỏ: Giao diện xếp dọc theo 1 cột độc nhất (`calc` -> `diagram` -> `history`).
  * Trên máy tính bảng và màn hình desktop ($\ge 768\text{px}$): Tự động chuyển sang bố cục 2 cột song song (`calc` và `history` đặt cạnh nhau, sơ đồ `diagram` nằm rộng bên dưới).
* **Hỗ trợ tối đa cho trải nghiệm chạm cảm ứng (Mobile-first UX):**
  * Tích hợp bộ chọn ngày Flatpickr tối ưu hóa cho màn hình di động, neo hiển thị ngay dưới trường nhập liệu giúp tránh trôi layout.
  * Tích hợp công tắc gạt trượt (Apple Switch Toggle) và nút bấm lớn để thao tác bằng ngón cái dễ dàng.
  * Lắng nghe sự kiện bàn phím, tự động thêm dấu phân cách `/` khi gõ ngày tháng (`dd/mm/yyyy`) trên bàn phím số di động (`inputmode="numeric"`).

### C. Dễ Dàng Bảo Trì & Nâng Cấp (Maintainability)
* **Kiến trúc tối giản, không phụ thuộc thư viện nặng:** Không sử dụng các framework cồng kềnh như React/Vue hay CSS utility như Tailwind. Toàn bộ mã nguồn nằm gọn trong các tệp vanilla thuần túy giúp ứng dụng tải cực nhanh và an toàn.
* **Tách biệt rõ rệt trách nhiệm (Separation of Concerns):**
  * Tệp `index.html` chỉ định nghĩa cấu trúc khung.
  * Tệp `style.css` quản lý toàn bộ hệ thống biến CSS màu sắc thương hiệu (Brand Palette 5-3-1-1) và hiệu ứng chuyển động.
  * Thư mục `js/` chứa mã nguồn JavaScript chia theo mô-đun chức năng riêng biệt.
* **Triển khai tự động (CI/CD):** Tích hợp sẵn luồng GitHub Actions (`.github/workflows/static.yml`) tự động deploy ứng dụng lên GitHub Pages mỗi khi nhánh `main` được cập nhật.

---

## 4. Hướng Dẫn Dành Cho Developer & AI Agent

Khi tiếp cận mã nguồn để bảo trì hoặc nâng cấp các tính năng mới, hãy lưu ý cấu trúc và cơ chế điều phối sau:

### Cấu Trúc Thư Mục Dự Án
```bash
coop-date/
├── .github/workflows/
│   └── static.yml          # GitHub Actions tự động deploy lên Github Pages
├── favicon_io/             # Chứa bộ tài nguyên Icon đa nền tảng
├── js/                     # Thư mục mã nguồn Javascript modular
│   ├── business.js         # Xử lý logic nghiệp vụ tính toán hạn lùi
│   ├── helpers.js          # Các hàm phụ trợ định dạng ngày, playBeep, cấu hình phiên bản
│   ├── history.js          # Quản lý lưu trữ/hiển thị danh sách lịch sử tra cứu
│   ├── kph.js              # Nghiệp vụ và giao diện Khai Báo Hàng Không Phù Hợp (KPH)
│   ├── main.js             # Điểm khởi chạy ứng dụng, lắng nghe DOM, điều hướng tổng
│   ├── scanner.js          # Điều khiển camera và tích hợp html5-qrcode
│   └── timeline.js         # Vẽ sơ đồ trực quan SVG động
├── index.html              # Layout cấu trúc của PWA
├── style.css               # Hệ thống CSS stylesheet (Apple Design Concept)
├── sw.js                   # Service Worker phục vụ chế độ offline
├── manifest.json           # Cấu hình PWA cài đặt ứng dụng trên màn hình chính
└── version.json            # Tệp lưu vết phiên bản deploy
```

### Các tệp logic và hàm quan trọng
* **`js/main.js`**: Điểm khởi chạy ứng dụng (`DOMContentLoaded`), cấu hình Flatpickr, thiết lập lắng nghe sự kiện nhập liệu tự động thêm dấu gạch chéo cho ô ngày tháng (`auto-date` mask), điều phối cơ chế đồng bộ có tường ngăn giữa các ô ngày HSD, số ngày HSD, và số tháng HSD.
* **`js/helpers.js`**: Chứa hằng số cấu hình phiên bản `APP_VERSION_CONFIG` và các hàm phụ trợ dùng chung:
  * `parseLocalDate(str)` / `formatLocalDate(date)`: Chuyển đổi qua lại giữa chuỗi ngày tháng và đối tượng `Date` múi giờ địa phương.
  * `isValidDateStr(str)`: Kiểm tra chuỗi định dạng ngày có hợp lệ hay không.
  * `playBeep()`: Phát âm thanh bíp giả làm từ phần cứng khi quét mã vạch thành công.
  * `initAppVersion()`: Đăng ký Service Worker và theo dõi trạng thái mạng (online/offline).
* **`js/business.js`**: Chứa hàm `processReturnBusinessLogic(nsxStr, hsdDateStr)` thực thi thuật toán phân loại hàng ngắn ngày/dài ngày, tính ngày lùi hàng theo quy tắc 20%-40% và trả về trạng thái cảnh báo tương ứng. **Tuyệt đối không thao túng DOM trong tệp này.**
* **`js/timeline.js`**: Chứa hàm `drawTimelineDiagram(nsxStr, hsdStr, returnStr)` tính toán vị trí hiển thị và xuất chuỗi template SVG vẽ sơ đồ trục thời gian trực quan.
* **`js/history.js`**: Quản lý mảng dữ liệu lịch sử tra cứu, lưu trữ vào localStorage dưới khóa `coop_date_history`, áp dụng bộ lọc trạng thái (filter) và sắp xếp ưu tiên (sort), cập nhật giao diện danh sách lịch sử tra cứu.
* **`js/scanner.js`**: Điều khiển camera qua thư viện `Html5Qrcode`, xử lý bật/tắt đèn pin (flash/torch) nếu thiết bị hỗ trợ, định vị luồng nhận diện mã EAN-13, EAN-8, Code 128, Code 39, UPC-A, tự động điền mã vạch quét được vào ô input tương ứng.
* **`js/kph.js`**: Quản lý nghiệp vụ Khai Báo Hàng Không Phù Hợp (KPH):
  * Lưu trữ dữ liệu offline dưới khóa `coop_kph_logs`.
  * Nén ảnh minh chứng bằng Canvas & JPEG 0.7 chất lượng trước khi chuyển sang Base64 để chống tràn hạn mức lưu trữ.
  * Lọc tìm kiếm theo khoảng ngày phát hiện, sắp xếp danh sách phiếu KPH theo các cột thông tin.
  * Xuất báo cáo ra định dạng file Excel (.xlsx) thông qua thư viện `exceljs` và `FileSaver.js`.

### Điểm cần lưu ý khi nâng cấp hệ thống (Dành cho AI Agent)
1. **Thay đổi phiên bản:** Khi cập nhật bất kỳ tính năng hoặc sửa đổi mã nguồn trong thư mục `js/` hoặc tệp `style.css`, bạn bắt buộc phải đồng bộ chuỗi phiên bản (ví dụ: `2.16.0`) tại 3 nơi:
   * Hằng số `currentVersion` và `lastUpdated` tại [helpers.js](file:///Users/vup/coop-date/js/helpers.js) (dòng 3).
   * Hằng số `CACHE_NAME` tại [sw.js](file:///Users/vup/coop-date/sw.js) (dòng 1).
   * Trường `version` và `lastUpdated` tại [version.json](file:///Users/vup/coop-date/version.json) (dòng 2).
   * Điều này đảm bảo cơ chế Version Mismatch Guard hoạt động chính xác và người dùng cuối nhận được bản cập nhật ngay lập tức.
2. **Giới hạn Thư viện Ngoại vi:** Hạn chế tối đa việc thêm các tệp CDN mới nhằm giữ vững tiêu chí tải trang tức thì dưới 1 giây và tương thích offline tuyệt đối của PWA.
3. **Màu sắc trạng thái:** Khi thay đổi giao diện cảnh báo, hãy chỉnh sửa các biến CSS tương ứng (`--status-green-bg`, `--status-yellow-bg`, `--status-red-bg`) trong tệp [style.css](file:///Users/vup/coop-date/style.css) để duy trì tính đồng nhất của hệ thống giao diện.
