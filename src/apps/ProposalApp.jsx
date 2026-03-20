import { useState, useRef, useEffect } from "react";

const B = {
  bg: "#F5EFE7", orange: "#F5A623", green: "#2ECC71", pink: "#E84C88",
  cyan: "#2DD4BF", purple: "#7C5CFC", dark: "#1A1A1A", card: "#FFF",
  gray: "#8E8E93", light: "#E8E2D9", muted: "#C8C2B9"
};

const CUR = ["USD", "IDR", "PHP", "VND", "THB"];
const SYM = { USD: "$", IDR: "Rp", PHP: "₱", VND: "₫", THB: "฿" };

const DP = {
  monthly: { USD: { r: 60, b: 49 }, IDR: { r: 830000, b: 830000 }, PHP: { r: 2850, b: 2850 }, VND: { r: 1300000, b: 1300000 }, THB: { r: 1600, b: 2100 } },
  impl: { USD: { r: 150, b: 150 }, IDR: { r: 2540700, b: 2540700 }, PHP: { r: 8700, b: 8700 }, VND: { r: 3900000, b: 3900000 }, THB: { r: 5200, b: 5200 } },
  pos: { USD: { r: 16, b: 16 }, IDR: { r: 271000, b: 271000 }, PHP: { r: 1000, b: 1000 }, VND: { r: 420000, b: 420000 }, THB: { r: 500, b: 500 } },
  sms: { USD: { r: 0.08, b: 0.08 }, IDR: { r: 1356, b: 1356 }, PHP: { r: 5, b: 5 }, VND: { r: 2000, b: 2000 }, THB: { r: 3, b: 3 } },
  kiosk: { USD: { r: 120, b: 120 }, IDR: { r: 170000000, b: 170000000 }, PHP: { r: 7300, b: 7300 }, VND: { r: 3210000, b: 3210000 }, THB: { r: 4000, b: 4000 } }
};

const PCATS = [
  { k: "monthly", l: "Monthly Admin & Hosting" }, { k: "impl", l: "Implementation" },
  { k: "pos", l: "POS" }, { k: "sms", l: "SMS" }, { k: "kiosk", l: "Kiosk" }
];

const ITEMS = [
  { id: "api", name: "API Convenience Fee", desc: "Charged per actual API usage", inv: "Monthly", pk: null, mode: "flex", cat: "lic", clr: B.orange },
  { id: "offline", name: "Offline Convenience Fee", desc: "Charged per actual offline usage", inv: "Monthly", pk: null, mode: "flex", cat: "lic", clr: B.pink },
  { id: "flat", name: "Flat Rate Convenience Fee", desc: "Fixed monthly (estimation)", inv: "Monthly", pk: null, mode: "flat", cat: "lic", clr: B.purple },
  { id: "admin", name: "Monthly Admin, Maintenance & Hosting", inv: "Monthly", pk: "monthly", cat: "lic", clr: B.green },
  { id: "implementation", name: "Implementation", inv: "One-time", pk: "impl", cat: "svc", clr: B.cyan },
  { id: "config", name: "Configuration", inv: "", pk: null, cat: "svc", clr: B.purple },
  { id: "help", name: "Help Desk Support", inv: "", pk: null, cat: "svc", clr: B.green },
  { id: "pos", name: "POS (Monthly)", desc: "Point of Sale terminal", inv: "Monthly", pk: "pos", cat: "anc", clr: B.pink },
  { id: "sms", name: "SMS Notification", desc: "Per SMS charge", inv: "Monthly", pk: "sms", cat: "anc", clr: B.orange },
  { id: "kiosk", name: "Kiosk", desc: "Self-service kiosk", inv: "Monthly", pk: "kiosk", cat: "anc", clr: B.cyan }
];

const DEFAULT_CHALLENGES = [
  { id: "CH001", title: "Manual Booking Process", description: "Operators still rely on phone calls, paper logs, or spreadsheets to manage reservations — causing delays and human error.",
    features: ["Online Booking Engine", "Bookings Management", "Agent Portal"],
    feature_mapping: [{ feature: "Online Booking Engine", how: "Self-service booking 24/7 — eliminates phone/email dependency" }, { feature: "Bookings Management", how: "Centralized dashboard for all reservations with real-time status" }, { feature: "Agent Portal", how: "Enables travel agents to book directly without operator intervention" }],
    business_impact: ["Reduce manual workload by up to 70%", "Faster booking turnaround time", "Lower labor cost per booking"],
    i18n: {
      th: { title: "กระบวนการจองแบบแมนนวล", description: "ผู้ประกอบการยังพึ่งพาโทรศัพท์ กระดาษ หรือสเปรดชีตในการจัดการการจอง — ทำให้เกิดความล่าช้าและข้อผิดพลาด", feature_mapping_how: ["บริการจองด้วยตนเอง 24/7 — ไม่ต้องพึ่งโทรศัพท์/อีเมล", "แดชบอร์ดรวมศูนย์สำหรับการจองทั้งหมดพร้อมสถานะเรียลไทม์", "ช่วยให้ตัวแทนท่องเที่ยวจองได้โดยตรง"], business_impact: ["ลดภาระงานแมนนวลถึง 70%", "เวลาจองเร็วขึ้น", "ต้นทุนแรงงานต่อการจองลดลง"] },
      vi: { title: "Quy trình đặt chỗ thủ công", description: "Nhà vận hành vẫn dựa vào điện thoại, sổ giấy hoặc bảng tính để quản lý đặt chỗ — gây chậm trễ và lỗi.", feature_mapping_how: ["Đặt chỗ tự phục vụ 24/7 — loại bỏ phụ thuộc điện thoại/email", "Bảng điều khiển tập trung cho tất cả đặt chỗ với trạng thái thời gian thực", "Cho phép đại lý du lịch đặt trực tiếp"], business_impact: ["Giảm khối lượng công việc thủ công lên đến 70%", "Thời gian đặt chỗ nhanh hơn", "Chi phí nhân công mỗi lượt đặt thấp hơn"] },
      id: { title: "Proses Pemesanan Manual", description: "Operator masih mengandalkan telepon, catatan kertas, atau spreadsheet untuk mengelola reservasi — menyebabkan keterlambatan dan kesalahan.", feature_mapping_how: ["Pemesanan mandiri 24/7 — menghilangkan ketergantungan telepon/email", "Dasbor terpusat untuk semua reservasi dengan status real-time", "Memungkinkan agen perjalanan memesan langsung"], business_impact: ["Kurangi beban kerja manual hingga 70%", "Waktu pemesanan lebih cepat", "Biaya tenaga kerja per pemesanan lebih rendah"] }
    } },
  { id: "CH002", title: "No Real-Time Availability", description: "Seat/trip availability is not visible in real time, leading to double bookings and lost revenue.",
    features: ["Trip List", "Real-Time Inventory", "Bookings Management"],
    feature_mapping: [{ feature: "Trip List", how: "Live seat map with real-time capacity across all trips" }, { feature: "Real-Time Inventory", how: "Instant sync across all sales channels" }, { feature: "Bookings Management", how: "Automatic status updates — no manual reconciliation" }],
    business_impact: ["Eliminate double-booking incidents", "Maximize seat utilization", "Improve customer trust and satisfaction"],
    i18n: {
      th: { title: "ไม่มีข้อมูลที่นั่งว่างแบบเรียลไทม์", description: "จำนวนที่นั่ง/ทริปที่ว่างไม่แสดงแบบเรียลไทม์ ทำให้เกิดการจองซ้ำและสูญเสียรายได้", feature_mapping_how: ["แผนที่ที่นั่งแบบเรียลไทม์พร้อมความจุทุกทริป", "ซิงค์ทันทีทุกช่องทางขาย", "อัปเดตสถานะอัตโนมัติ — ไม่ต้องกระทบยอดเอง"], business_impact: ["ขจัดปัญหาจองซ้ำ", "ใช้ที่นั่งได้เต็มประสิทธิภาพ", "เพิ่มความเชื่อมั่นของลูกค้า"] },
      vi: { title: "Không có tình trạng chỗ thời gian thực", description: "Tình trạng ghế/chuyến không hiển thị thời gian thực, dẫn đến đặt trùng và mất doanh thu.", feature_mapping_how: ["Bản đồ ghế thời gian thực với sức chứa mọi chuyến", "Đồng bộ tức thì trên tất cả kênh bán", "Cập nhật trạng thái tự động — không cần đối chiếu thủ công"], business_impact: ["Loại bỏ sự cố đặt trùng", "Tối đa hóa sử dụng ghế", "Cải thiện niềm tin khách hàng"] },
      id: { title: "Tidak Ada Ketersediaan Real-Time", description: "Ketersediaan kursi/perjalanan tidak terlihat secara real-time, menyebabkan pemesanan ganda dan kehilangan pendapatan.", feature_mapping_how: ["Peta kursi real-time dengan kapasitas semua perjalanan", "Sinkronisasi instan di semua saluran penjualan", "Pembaruan status otomatis — tanpa rekonsiliasi manual"], business_impact: ["Hilangkan insiden pemesanan ganda", "Maksimalkan pemanfaatan kursi", "Tingkatkan kepercayaan pelanggan"] }
    } },
  { id: "CH003", title: "Multi-Channel Inconsistency", description: "Selling through OTAs, website, counter, and agents — but inventory is not synchronized across channels.",
    features: ["Channel Manager", "API Integration", "Real-Time Inventory"],
    feature_mapping: [{ feature: "Channel Manager", how: "Single control panel to manage all distribution channels" }, { feature: "API Integration", how: "Automated sync with OTAs (Bookaway, 12Go, GetYourGuide, etc.)" }, { feature: "Real-Time Inventory", how: "One source of truth for availability across all touchpoints" }],
    business_impact: ["Prevent overselling across channels", "Expand distribution without operational overhead", "Increase revenue from online channels"],
    i18n: {
      th: { title: "ช่องทางขายไม่ซิงค์กัน", description: "ขายผ่าน OTA, เว็บไซต์, เคาน์เตอร์ และตัวแทน — แต่สต็อกไม่ซิงค์", feature_mapping_how: ["แผงควบคุมเดียวจัดการทุกช่องทาง", "ซิงค์อัตโนมัติกับ OTA", "แหล่งข้อมูลเดียวสำหรับที่ว่างทุกจุดขาย"], business_impact: ["ป้องกันการขายเกินทุกช่องทาง", "ขยายการจัดจำหน่ายโดยไม่เพิ่มภาระงาน", "เพิ่มรายได้จากช่องทางออนไลน์"] },
      vi: { title: "Kênh bán không đồng bộ", description: "Bán qua OTA, website, quầy và đại lý — nhưng tồn kho không đồng bộ.", feature_mapping_how: ["Bảng điều khiển duy nhất quản lý tất cả kênh", "Đồng bộ tự động với OTA", "Một nguồn dữ liệu duy nhất cho tình trạng chỗ"], business_impact: ["Ngăn bán quá số lượng trên các kênh", "Mở rộng phân phối không tăng chi phí vận hành", "Tăng doanh thu từ kênh trực tuyến"] },
      id: { title: "Ketidakkonsistenan Multi-Kanal", description: "Menjual melalui OTA, website, konter, dan agen — tetapi inventaris tidak tersinkronisasi.", feature_mapping_how: ["Satu panel kontrol untuk mengelola semua saluran", "Sinkronisasi otomatis dengan OTA", "Satu sumber kebenaran untuk ketersediaan"], business_impact: ["Cegah penjualan berlebihan di semua saluran", "Perluas distribusi tanpa beban operasional", "Tingkatkan pendapatan dari saluran online"] }
    } },
  { id: "CH004", title: "Overbooking & Revenue Leakage", description: "Lack of real-time inventory sync leads to overbooking, refunds, and compensation costs.",
    features: ["Trip List", "Bookings Management", "Real-Time Inventory"],
    feature_mapping: [{ feature: "Trip List", how: "Real-time seat availability visibility per departure" }, { feature: "Bookings Management", how: "Automatic conflict detection and alerts" }, { feature: "Real-Time Inventory", how: "Centralized capacity management prevents overselling" }],
    business_impact: ["Reduce overbooking incidents by 90%+", "Lower compensation and refund costs", "Improve brand reputation"],
    i18n: { th: { title: "จองเกิน 0026 รายได้รั่วไหล", description: "สต็อกไม่ซิงค์แบบเรียลไทม์ทำให้จองเกินและต้องจ่ายค่าชดเชย", feature_mapping_how: ["มองเห็นที่นั่งว่างแบบเรียลไทม์ต่อเที่ยว","ตรวจจับความขัดแย้งอัตโนมัติ","จัดการความจุรวมศูนย์ป้องกันขายเกิน"], business_impact: ["ลดการจองเกิน 90%+","ลดค่าชดเชยและคืนเงิน","เพิ่มชื่อเสียงแบรนด์"] }, vi: { title: "Đặt quá chỗ 0026 Thất thoát doanh thu", description: "Thiếu đồng bộ tồn kho thời gian thực dẫn đến đặt quá chỗ và chi phí bồi thường.", feature_mapping_how: ["Hiển thị ghế trống thời gian thực mỗi chuyến","Phát hiện xung đột tự động","Quản lý sức chứa tập trung ngăn bán quá"], business_impact: ["Giảm 90%+ sự cố đặt quá chỗ","Giảm chi phí bồi thường và hoàn tiền","Cải thiện uy tín thương hiệu"] }, id: { title: "Overbooking 0026 Kebocoran Pendapatan", description: "Kurangnya sinkronisasi inventaris real-time menyebabkan overbooking dan biaya kompensasi.", feature_mapping_how: ["Visibilitas kursi real-time per keberangkatan","Deteksi konflik otomatis","Manajemen kapasitas terpusat mencegah overselling"], business_impact: ["Kurangi insiden overbooking 90%+","Turunkan biaya kompensasi dan refund","Tingkatkan reputasi merek"] } } },
  { id: "CH005", title: "No Online Presence", description: "No website or booking engine — losing direct customers to OTAs with high commission fees.",
    features: ["Online Booking Engine", "White-Label Website", "Payment Gateway"],
    feature_mapping: [{ feature: "Online Booking Engine", how: "Branded booking widget embeddable on any website" }, { feature: "White-Label Website", how: "Ready-to-use operator website with booking capability" }, { feature: "Payment Gateway", how: "Accept online payments (cards, e-wallets, bank transfer)" }],
    business_impact: ["Increase direct bookings (reduce OTA dependency)", "Save 15-25% on OTA commissions", "Own the customer relationship and data"],
    i18n: { th: { title: "ไม่มีช่องทางออนไลน์", description: "ไม่มีเว็บไซต์หรือระบบจอง — สูญเสียลูกค้าตรงให้ OTA ที่คิดค่าคอมมิชชั่นสูง", feature_mapping_how: ["วิดเจ็ตจองแบรนด์ฝังได้ทุกเว็บไซต์","เว็บไซต์สำเร็จรูปพร้อมระบบจอง","รับชำระเงินออนไลน์ (บัตร, อีวอลเล็ต, โอน)"], business_impact: ["เพิ่มการจองตรง (ลดการพึ่ง OTA)","ประหยัดค่าคอมมิชชั่น OTA 15-25%","เป็นเจ้าของข้อมูลลูกค้า"] }, vi: { title: "Không có kênh trực tuyến", description: "Không có website hoặc hệ thống đặt chỗ — mất khách hàng trực tiếp cho OTA.", feature_mapping_how: ["Widget đặt chỗ có thương hiệu nhúng trên website","Website có sẵn với khả năng đặt chỗ","Chấp nhận thanh toán trực tuyến"], business_impact: ["Tăng đặt chỗ trực tiếp","Tiết kiệm 15-25% hoa hồng OTA","Sở hữu mối quan hệ khách hàng"] }, id: { title: "Tidak Ada Kehadiran Online", description: "Tidak ada website atau booking engine — kehilangan pelanggan langsung ke OTA.", feature_mapping_how: ["Widget pemesanan bermerek yang bisa ditanamkan","Website siap pakai dengan kemampuan booking","Terima pembayaran online"], business_impact: ["Tingkatkan pemesanan langsung","Hemat 15-25% komisi OTA","Miliki hubungan pelanggan"] } } },
  { id: "CH006", title: "Paper-Based Operations", description: "Manifests, boarding passes, and reports still handled on paper — slow, error-prone, and not scalable.",
    features: ["E-Ticket / QR Code", "Digital Manifest", "Reporting Dashboard"],
    feature_mapping: [{ feature: "E-Ticket / QR Code", how: "Digital tickets with QR scan for boarding" }, { feature: "Digital Manifest", how: "Auto-generated passenger list per trip" }, { feature: "Reporting Dashboard", how: "Real-time analytics replacing manual reports" }],
    business_impact: ["Go paperless — reduce printing costs", "Faster boarding and check-in process", "Accurate data for decision making"],
    i18n: { th: { title: "การดำเนินงานแบบกระดาษ", description: "รายชื่อผู้โดยสาร บอร์ดดิ้งพาส และรายงานยังใช้กระดาษ — ช้า ผิดพลาด และขยายตัวยาก", feature_mapping_how: ["ตั๋วดิจิทัลพร้อม QR สำหรับขึ้นรถ","รายชื่อผู้โดยสารสร้างอัตโนมัติ","วิเคราะห์เรียลไทม์แทนรายงานแมนนวล"], business_impact: ["ไร้กระดาษ — ลดต้นทุนพิมพ์","ขึ้นรถเร็วขึ้น","ข้อมูลแม่นยำสำหรับตัดสินใจ"] }, vi: { title: "Vận hành giấy tờ", description: "Danh sách khách, vé và báo cáo vẫn dùng giấy — chậm, dễ sai và khó mở rộng.", feature_mapping_how: ["Vé điện tử QR cho lên xe","Danh sách khách tự động","Phân tích thời gian thực thay báo cáo thủ công"], business_impact: ["Không giấy tờ — giảm chi phí in","Lên xe nhanh hơn","Dữ liệu chính xác cho quyết định"] }, id: { title: "Operasi Berbasis Kertas", description: "Manifes, boarding pass, dan laporan masih pakai kertas — lambat dan sulit berkembang.", feature_mapping_how: ["E-tiket QR untuk boarding","Manifes penumpang otomatis","Analitik real-time menggantikan laporan manual"], business_impact: ["Tanpa kertas — kurangi biaya cetak","Boarding lebih cepat","Data akurat untuk keputusan"] } } },
  { id: "CH007", title: "Poor Financial Visibility", description: "No clear view of revenue, commissions, or agent settlements — relying on end-of-month reconciliation.",
    features: ["Reporting Dashboard", "Agent Settlement", "Payment Reconciliation"],
    feature_mapping: [{ feature: "Reporting Dashboard", how: "Real-time revenue, bookings, and performance metrics" }, { feature: "Agent Settlement", how: "Automated commission calculation and payout tracking" }, { feature: "Payment Reconciliation", how: "Match payments to bookings automatically" }],
    business_impact: ["Real-time financial visibility", "Reduce reconciliation time from days to minutes", "Prevent commission disputes with agents"],
    i18n: { th: { title: "มองไม่เห็นสถานะการเงิน", description: "ไม่มีภาพรวมรายได้ คอมมิชชั่น หรือการชำระเงิน — พึ่งพาการกระทบยอดสิ้นเดือน", feature_mapping_how: ["ดูรายได้ การจอง และประสิทธิภาพแบบเรียลไทม์","คำนวณคอมมิชชั่นและติดตามการจ่ายอัตโนมัติ","จับคู่การชำระเงินกับการจองอัตโนมัติ"], business_impact: ["มองเห็นการเงินแบบเรียลไทม์","ลดเวลากระทบยอดจากวันเหลือนาที","ป้องกันข้อพิพาทคอมมิชชั่น"] }, vi: { title: "Thiếu tầm nhìn tài chính", description: "Không có cái nhìn rõ ràng về doanh thu, hoa hồng hoặc thanh toán.", feature_mapping_how: ["Chỉ số doanh thu và hiệu suất thời gian thực","Tính hoa hồng và theo dõi thanh toán tự động","Đối chiếu thanh toán với đặt chỗ tự động"], business_impact: ["Tầm nhìn tài chính thời gian thực","Giảm thời gian đối chiếu từ ngày xuống phút","Ngăn tranh chấp hoa hồng"] }, id: { title: "Visibilitas Keuangan Buruk", description: "Tidak ada pandangan jelas tentang pendapatan, komisi, atau penyelesaian agen.", feature_mapping_how: ["Metrik pendapatan dan kinerja real-time","Perhitungan komisi dan pelacakan pembayaran otomatis","Cocokkan pembayaran dengan pemesanan otomatis"], business_impact: ["Visibilitas keuangan real-time","Kurangi waktu rekonsiliasi dari hari jadi menit","Cegah sengketa komisi"] } } },
  { id: "CH008", title: "Scaling Difficulties", description: "Adding new routes, vehicles, or seasons requires manual setup and cannot be done quickly.",
    features: ["Trip Management", "Fleet Management", "Season & Pricing Rules"],
    feature_mapping: [{ feature: "Trip Management", how: "Create and clone trips/routes in minutes" }, { feature: "Fleet Management", how: "Assign vehicles to trips with capacity management" }, { feature: "Season & Pricing Rules", how: "Dynamic pricing by season, day, or demand" }],
    business_impact: ["Launch new routes in hours, not weeks", "Scale operations without proportional staff increase", "Optimize pricing for revenue maximization"],
    i18n: { th: { title: "ยากต่อการขยายตัว", description: "การเพิ่มเส้นทาง รถ หรือฤดูกาลใหม่ต้องตั้งค่าเอง ทำได้ช้า", feature_mapping_how: ["สร้างและโคลนทริป/เส้นทางในไม่กี่นาที","กำหนดรถให้ทริปพร้อมจัดการความจุ","ราคาไดนามิกตามฤดูกาล วัน หรืออุปสงค์"], business_impact: ["เปิดเส้นทางใหม่ในชั่วโมง ไม่ใช่สัปดาห์","ขยายงานไม่ต้องเพิ่มพนักงานตามสัดส่วน","ปรับราคาเพื่อเพิ่มรายได้สูงสุด"] }, vi: { title: "Khó mở rộng", description: "Thêm tuyến, xe hoặc mùa mới cần thiết lập thủ công và không thể làm nhanh.", feature_mapping_how: ["Tạo và nhân bản chuyến/tuyến trong vài phút","Phân xe cho chuyến với quản lý sức chứa","Giá linh hoạt theo mùa, ngày hoặc nhu cầu"], business_impact: ["Ra mắt tuyến mới trong giờ, không phải tuần","Mở rộng vận hành không tăng nhân sự tương ứng","Tối ưu giá để tối đa doanh thu"] }, id: { title: "Kesulitan Penskalaan", description: "Menambah rute, kendaraan, atau musim baru memerlukan setup manual dan lambat.", feature_mapping_how: ["Buat dan klon trip/rute dalam menit","Tetapkan kendaraan ke trip dengan manajemen kapasitas","Harga dinamis berdasarkan musim, hari, atau permintaan"], business_impact: ["Luncurkan rute baru dalam jam, bukan minggu","Skalakan operasi tanpa penambahan staf proporsional","Optimalkan harga untuk maksimalisasi pendapatan"] } } },
  { id: "CH009", title: "Customer Communication Gaps", description: "No automated confirmations, reminders, or updates — leading to no-shows and support overhead.",
    features: ["SMS Notification", "Email Automation", "Passenger App"],
    feature_mapping: [{ feature: "SMS Notification", how: "Automated booking confirmation and trip reminders" }, { feature: "Email Automation", how: "Triggered emails for confirmation, changes, and promotions" }, { feature: "Passenger App", how: "Self-service trip info, e-ticket, and real-time updates" }],
    business_impact: ["Reduce no-show rate by 30-50%", "Lower customer support volume", "Improve passenger experience and reviews"],
    i18n: { th: { title: "ช่องว่างการสื่อสารกับลูกค้า", description: "ไม่มีการยืนยัน แจ้งเตือน หรืออัปเดตอัตโนมัติ — ทำให้ลูกค้าไม่มาและภาระงานซัพพอร์ต", feature_mapping_how: ["ยืนยันการจองและแจ้งเตือนทริปอัตโนมัติ","อีเมลอัตโนมัติสำหรับยืนยัน เปลี่ยนแปลง โปรโมชั่น","ข้อมูลทริป ตั๋ว และอัปเดตเรียลไทม์"], business_impact: ["ลดอัตราไม่มา 30-50%","ลดปริมาณงานซัพพอร์ต","ปรับปรุงประสบการณ์ผู้โดยสาร"] }, vi: { title: "Thiếu giao tiếp khách hàng", description: "Không có xác nhận, nhắc nhở hay cập nhật tự động — dẫn đến vắng mặt.", feature_mapping_how: ["Xác nhận đặt chỗ và nhắc chuyến tự động","Email tự động cho xác nhận, thay đổi, khuyến mãi","Thông tin chuyến, vé và cập nhật thời gian thực"], business_impact: ["Giảm tỷ lệ vắng mặt 30-50%","Giảm khối lượng hỗ trợ khách hàng","Cải thiện trải nghiệm hành khách"] }, id: { title: "Kesenjangan Komunikasi Pelanggan", description: "Tidak ada konfirmasi, pengingat, atau pembaruan otomatis — menyebabkan no-show.", feature_mapping_how: ["Konfirmasi pemesanan dan pengingat perjalanan otomatis","Email otomatis untuk konfirmasi, perubahan, promosi","Info perjalanan, e-tiket, dan pembaruan real-time"], business_impact: ["Kurangi tingkat no-show 30-50%","Kurangi volume dukungan pelanggan","Tingkatkan pengalaman penumpang"] } } },
  { id: "CH010", title: "Lack of Data-Driven Decisions", description: "No analytics on route performance, peak times, or customer behavior — operating on gut feeling.",
    features: ["Reporting Dashboard", "Analytics & BI", "Demand Forecasting"],
    feature_mapping: [{ feature: "Reporting Dashboard", how: "Comprehensive KPIs: load factor, revenue per seat, booking trends" }, { feature: "Analytics & BI", how: "Deep-dive analysis by route, channel, and time period" }, { feature: "Demand Forecasting", how: "Predict demand patterns for capacity planning" }],
    business_impact: ["Data-driven route and pricing decisions", "Identify underperforming routes early", "Optimize fleet allocation based on demand"],
    i18n: { th: { title: "ขาดการตัดสินใจจากข้อมูล", description: "ไม่มีการวิเคราะห์ประสิทธิภาพเส้นทาง ช่วงพีค หรือพฤติกรรมลูกค้า — ตัดสินใจจากสัญชาตญาณ", feature_mapping_how: ["KPI ครอบคลุม: load factor, รายได้ต่อที่นั่ง, แนวโน้มการจอง","วิเคราะห์เชิงลึกตามเส้นทาง ช่องทาง และช่วงเวลา","คาดการณ์ความต้องการเพื่อวางแผนความจุ"], business_impact: ["ตัดสินใจเส้นทางและราคาจากข้อมูล","ค้นพบเส้นทางที่ทำผลงานต่ำได้เร็ว","จัดสรรรถตามอุปสงค์"] }, vi: { title: "Thiếu quyết định dựa trên dữ liệu", description: "Không có phân tích hiệu suất tuyến, giờ cao điểm hay hành vi khách — vận hành theo cảm tính.", feature_mapping_how: ["KPI toàn diện: hệ số tải, doanh thu/ghế, xu hướng đặt chỗ","Phân tích sâu theo tuyến, kênh và khoảng thời gian","Dự báo nhu cầu để lập kế hoạch sức chứa"], business_impact: ["Quyết định tuyến và giá dựa trên dữ liệu","Phát hiện tuyến kém hiệu quả sớm","Tối ưu phân bổ đội xe theo nhu cầu"] }, id: { title: "Kurang Keputusan Berbasis Data", description: "Tidak ada analitik performa rute, waktu puncak, atau perilaku pelanggan — operasi berdasarkan firasat.", feature_mapping_how: ["KPI komprehensif: load factor, pendapatan/kursi, tren booking","Analisis mendalam per rute, saluran, dan periode","Prakiraan permintaan untuk perencanaan kapasitas"], business_impact: ["Keputusan rute dan harga berbasis data","Identifikasi rute berkinerja rendah lebih awal","Optimasi alokasi armada berdasarkan permintaan"] } } }
];


function fmt(n, c) {
  if (n == null || isNaN(n)) return "—";
  if (c === "VND" || c === "IDR") return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtp(n, c) {
  if (n == null || isNaN(n)) return "—";
  return SYM[c] + fmt(n, c) + " " + c;
}

const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAMgCAYAAADbcAZoAADFD0lEQVR42uzdd3hc1bU28Hftc840NRsXMBgDpttgeklIruWEDiEJQQJCQkIKTiC9J9xEUr6b3JuQSgKJgQAhEEBDB9u4SnLBuFe5F7nbki2rSzNzzl7fHzNjBKF7JMvw/p5Hj7GNVfY5Z5+1dlkbICIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAh/n/cqH3YpfMRQgAAAAASUVORK5CYII=";
function SeatLogo({ h }) {
  return <img src={LOGO_B64} alt="seatOS" style={{ height: h, objectFit: "contain" }} />;
}

const sBtn = { borderRadius: 50, fontWeight: 700, border: "none", cursor: "pointer" };
const _sCard = { background: B.card, borderRadius: 20, marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,.04)" };
const sInp = { width: "100%", padding: "11px 16px", border: "2px solid " + B.light, borderRadius: 14, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: "inherit" };

const COUNTRIES = [
  "Thailand","Indonesia","Vietnam","Philippines","Malaysia","Singapore","Cambodia","Laos","Myanmar",
  "Japan","South Korea","Taiwan","Hong Kong","China","India","Sri Lanka","Bangladesh","Nepal",
  "Australia","New Zealand","United States","United Kingdom","Canada","Germany","France","Italy",
  "Spain","Netherlands","Switzerland","Sweden","Norway","Denmark","Finland","Belgium","Austria",
  "Portugal","Ireland","Poland","Czech Republic","Greece","Turkey","Russia","Brazil","Mexico",
  "Argentina","Colombia","Chile","Peru","South Africa","Nigeria","Kenya","Egypt","Saudi Arabia",
  "United Arab Emirates","Qatar","Kuwait","Bahrain","Oman","Israel","Jordan","Other"
];

const DEFAULT_TRANSLATIONS = {
  en: {
    // UI
    settings: "Settings", builder: "← Builder", salesTeam: "Sales Team", pricing: "Pricing",
    save: "Save", reset: "Reset", remove: "Remove", edit: "Edit", del: "Del", cancel: "Cancel",
    challengeModules: "Challenge Modules", newChallenge: "New Challenge", editChallenge: "Edit Challenge",
    title: "Title", description: "Description", features: "Features", featureMapping: "Feature Mapping (Feature | How)",
    businessImpact: "Business Impact", saveChanges: "Save Changes", addChallenge: "+ Add Challenge",
    resetDefaults: "Reset to Defaults", translations: "Translations",
    // Doc Type
    docType: "Document Type", proposal: "Proposal", quotation: "Quotation",
    proposalDesc: "Challenge-based consulting", quotationDesc: "Pricing & subscription",
    // Builder
    docBuilder: "SeatOS Document Builder", docBuilderSub: "Generate Proposals & Quotations",
    salesPerson: "Sales Person", customer: "Customer", customerName: "Customer Name",
    address: "Address", email: "Email", country: "Country", incorporation: "Incorporation",
    startDate: "Start Date", endDate: "End Date", selectChallenges: "Select Challenges",
    suggested: "Suggested", challenges: "Challenges", impacts: "Impacts",
    licensesComm: "Licenses & Commission", services: "Services", ancillary: "Ancillary",
    billDiscount: "Bill Discount", discountBill: "Discount on Entire Bill",
    specialTerms: "Special Terms", discount: "Discount", waiver: "Waiver",
    oneTime: "One-Time", monthly: "Monthly", grand: "Grand",
    regular: "Regular", bundle: "Bundle",
    perAmount: "Per Amount", perPercent: "Per % of Ticket",
    noSales: "None yet.", addInSettings: "Add in Settings",
    // Preview
    editor: "← Editor", download: "⬇ Download / Print", copyText: "Copy Text",
    preparedFor: "Prepared For", preparedBy: "Prepared By",
    operatedBy: "Operated by Bookaway Ltd.",
    sec1: "Section 1 — Identified Challenges", sec2: "Section 2 — Solution Mapping",
    sec2desc: "How SeatOS features address each identified challenge:",
    feature: "Feature", addresses: "Addresses", howItSolves: "How It Solves",
    sec3: "Section 3 — Expected Business Impact",
    addFeature: "+ Add Feature", add: "+ Add",
    pricingBreakdown: "Pricing Breakdown", billing: "Billing", fee: "Fee",
    subtotal: "Subtotal", grandTotal: "Grand Total",
    discountsWaivers: "Discounts & Waivers",
    item: "Item", original: "Original", final: "Final",
    notes: "Notes", acceptance: "Acceptance",
    nameTitle: "Name & Title", date: "Date",
    allFees: "All fees in", valid30: "Valid 30 days.",
    proposalBtn: "Preview Proposal →", quotationBtn: "Quotation →",
    previewProposal: "Preview Proposal", previewQuotation: "Preview Quotation",
    search: "Search...", noResults: "No results", select: "Select...",
  },
  th: {
    settings: "ตั้งค่า", builder: "← กลับ", salesTeam: "ทีมขาย", pricing: "ราคา",
    save: "บันทึก", reset: "รีเซ็ต", remove: "ลบ", edit: "แก้ไข", del: "ลบ", cancel: "ยกเลิก",
    challengeModules: "โมดูลความท้าทาย", newChallenge: "เพิ่มความท้าทาย", editChallenge: "แก้ไขความท้าทาย",
    title: "หัวข้อ", description: "คำอธิบาย", features: "ฟีเจอร์", featureMapping: "การแมปฟีเจอร์ (ฟีเจอร์ | วิธีแก้)",
    businessImpact: "ผลกระทบทางธุรกิจ", saveChanges: "บันทึกการเปลี่ยนแปลง", addChallenge: "+ เพิ่มความท้าทาย",
    resetDefaults: "รีเซ็ตค่าเริ่มต้น", translations: "แปลภาษา",
    docType: "ประเภทเอกสาร", proposal: "ข้อเสนอ", quotation: "ใบเสนอราคา",
    proposalDesc: "เอกสารเชิงที่ปรึกษา", quotationDesc: "ใบเสนอราคาสมาชิก",
    docBuilder: "SeatOS สร้างเอกสาร", docBuilderSub: "สร้างข้อเสนอ & ใบเสนอราคา",
    salesPerson: "พนักงานขาย", customer: "ลูกค้า", customerName: "ชื่อลูกค้า",
    address: "ที่อยู่", email: "อีเมล", country: "ประเทศ", incorporation: "จดทะเบียน",
    startDate: "วันเริ่มต้น", endDate: "วันสิ้นสุด", selectChallenges: "เลือกความท้าทาย",
    suggested: "แนะนำ", challenges: "ความท้าทาย", impacts: "ผลกระทบ",
    licensesComm: "ไลเซนส์ & คอมมิชชั่น", services: "บริการ", ancillary: "รายการเสริม",
    billDiscount: "ส่วนลดรวม", discountBill: "ส่วนลดทั้งบิล",
    specialTerms: "เงื่อนไขพิเศษ", discount: "ส่วนลด", waiver: "การยกเว้น",
    oneTime: "ครั้งเดียว", monthly: "รายเดือน", grand: "รวม",
    regular: "ปกติ", bundle: "แพ็กเกจ",
    perAmount: "ต่อจำนวน", perPercent: "ต่อ % ของตั๋ว",
    noSales: "ยังไม่มี", addInSettings: "เพิ่มในตั้งค่า",
    editor: "← แก้ไข", download: "⬇ ดาวน์โหลด / พิมพ์", copyText: "คัดลอก",
    preparedFor: "จัดทำให้", preparedBy: "จัดทำโดย",
    operatedBy: "ดำเนินงานโดย Bookaway Ltd.",
    sec1: "ส่วนที่ 1 — ความท้าทายที่พบ", sec2: "ส่วนที่ 2 — การแมปโซลูชัน",
    sec2desc: "ฟีเจอร์ SeatOS แก้ไขความท้าทายแต่ละข้ออย่างไร:",
    feature: "ฟีเจอร์", addresses: "แก้ไขปัญหา", howItSolves: "วิธีแก้ไข",
    sec3: "ส่วนที่ 3 — ผลกระทบทางธุรกิจที่คาดหวัง",
    addFeature: "+ เพิ่มฟีเจอร์", add: "+ เพิ่ม",
    pricingBreakdown: "รายละเอียดราคา", billing: "การเรียกเก็บ", fee: "ค่าธรรมเนียม",
    subtotal: "รวมย่อย", grandTotal: "รวมทั้งหมด",
    discountsWaivers: "ส่วนลด & การยกเว้น",
    item: "รายการ", original: "ราคาเดิม", final: "ราคาสุดท้าย",
    notes: "หมายเหตุ", acceptance: "การยอมรับ",
    nameTitle: "ชื่อ & ตำแหน่ง", date: "วันที่",
    allFees: "ค่าธรรมเนียมทั้งหมดเป็น", valid30: "มีผล 30 วัน",
    proposalBtn: "ดูข้อเสนอ →", quotationBtn: "ใบเสนอราคา →",
    previewProposal: "ดูข้อเสนอ", previewQuotation: "ดูใบเสนอราคา",
    search: "ค้นหา...", noResults: "ไม่พบผลลัพธ์", select: "เลือก...",
  },
  vi: {
    settings: "Cài đặt", builder: "← Quay lại", salesTeam: "Đội bán hàng", pricing: "Bảng giá",
    save: "Lưu", reset: "Đặt lại", remove: "Xóa", edit: "Sửa", del: "Xóa", cancel: "Hủy",
    challengeModules: "Mô-đun thách thức", newChallenge: "Thêm thách thức", editChallenge: "Sửa thách thức",
    title: "Tiêu đề", description: "Mô tả", features: "Tính năng", featureMapping: "Ánh xạ tính năng (Tính năng | Cách giải quyết)",
    businessImpact: "Tác động kinh doanh", saveChanges: "Lưu thay đổi", addChallenge: "+ Thêm thách thức",
    resetDefaults: "Đặt lại mặc định", translations: "Ngôn ngữ",
    docType: "Loại tài liệu", proposal: "Đề xuất", quotation: "Báo giá",
    proposalDesc: "Tài liệu tư vấn", quotationDesc: "Báo giá đăng ký",
    docBuilder: "SeatOS Tạo tài liệu", docBuilderSub: "Tạo Đề xuất & Báo giá",
    salesPerson: "Nhân viên bán hàng", customer: "Khách hàng", customerName: "Tên khách hàng",
    address: "Địa chỉ", email: "Email", country: "Quốc gia", incorporation: "Đăng ký kinh doanh",
    startDate: "Ngày bắt đầu", endDate: "Ngày kết thúc", selectChallenges: "Chọn thách thức",
    suggested: "Gợi ý", challenges: "Thách thức", impacts: "Tác động",
    licensesComm: "Giấy phép & Hoa hồng", services: "Dịch vụ", ancillary: "Phụ trợ",
    billDiscount: "Giảm giá hóa đơn", discountBill: "Giảm giá toàn bộ hóa đơn",
    specialTerms: "Điều khoản đặc biệt", discount: "Giảm giá", waiver: "Miễn trừ",
    oneTime: "Một lần", monthly: "Hàng tháng", grand: "Tổng",
    regular: "Thường", bundle: "Gói",
    perAmount: "Theo số tiền", perPercent: "Theo % vé",
    noSales: "Chưa có.", addInSettings: "Thêm trong Cài đặt",
    editor: "← Chỉnh sửa", download: "⬇ Tải / In", copyText: "Sao chép",
    preparedFor: "Chuẩn bị cho", preparedBy: "Chuẩn bị bởi",
    operatedBy: "Vận hành bởi Bookaway Ltd.",
    sec1: "Phần 1 — Thách thức đã xác định", sec2: "Phần 2 — Ánh xạ giải pháp",
    sec2desc: "Tính năng SeatOS giải quyết từng thách thức như thế nào:",
    feature: "Tính năng", addresses: "Giải quyết", howItSolves: "Cách giải quyết",
    sec3: "Phần 3 — Tác động kinh doanh dự kiến",
    addFeature: "+ Thêm tính năng", add: "+ Thêm",
    pricingBreakdown: "Chi tiết giá", billing: "Thanh toán", fee: "Phí",
    subtotal: "Tổng phụ", grandTotal: "Tổng cộng",
    discountsWaivers: "Giảm giá & Miễn trừ",
    item: "Hạng mục", original: "Giá gốc", final: "Giá cuối",
    notes: "Ghi chú", acceptance: "Chấp nhận",
    nameTitle: "Tên & Chức danh", date: "Ngày",
    allFees: "Tất cả phí bằng", valid30: "Có hiệu lực 30 ngày.",
    proposalBtn: "Xem đề xuất →", quotationBtn: "Báo giá →",
    previewProposal: "Xem đề xuất", previewQuotation: "Xem báo giá",
    search: "Tìm kiếm...", noResults: "Không có kết quả", select: "Chọn...",
  },
  id: {
    settings: "Pengaturan", builder: "← Kembali", salesTeam: "Tim Penjualan", pricing: "Harga",
    save: "Simpan", reset: "Reset", remove: "Hapus", edit: "Edit", del: "Hapus", cancel: "Batal",
    challengeModules: "Modul Tantangan", newChallenge: "Tambah Tantangan", editChallenge: "Edit Tantangan",
    title: "Judul", description: "Deskripsi", features: "Fitur", featureMapping: "Pemetaan Fitur (Fitur | Cara mengatasi)",
    businessImpact: "Dampak Bisnis", saveChanges: "Simpan Perubahan", addChallenge: "+ Tambah Tantangan",
    resetDefaults: "Reset ke Default", translations: "Bahasa",
    docType: "Jenis Dokumen", proposal: "Proposal", quotation: "Penawaran",
    proposalDesc: "Dokumen konsultasi", quotationDesc: "Penawaran langganan",
    docBuilder: "SeatOS Pembuat Dokumen", docBuilderSub: "Buat Proposal & Penawaran",
    salesPerson: "Staf Penjualan", customer: "Pelanggan", customerName: "Nama Pelanggan",
    address: "Alamat", email: "Email", country: "Negara", incorporation: "Pendirian",
    startDate: "Tanggal Mulai", endDate: "Tanggal Berakhir", selectChallenges: "Pilih Tantangan",
    suggested: "Disarankan", challenges: "Tantangan", impacts: "Dampak",
    licensesComm: "Lisensi & Komisi", services: "Layanan", ancillary: "Tambahan",
    billDiscount: "Diskon Tagihan", discountBill: "Diskon Seluruh Tagihan",
    specialTerms: "Ketentuan Khusus", discount: "Diskon", waiver: "Pengabaian",
    oneTime: "Satu Kali", monthly: "Bulanan", grand: "Total",
    regular: "Reguler", bundle: "Bundel",
    perAmount: "Per Jumlah", perPercent: "Per % Tiket",
    noSales: "Belum ada.", addInSettings: "Tambah di Pengaturan",
    editor: "← Editor", download: "⬇ Unduh / Cetak", copyText: "Salin",
    preparedFor: "Disiapkan Untuk", preparedBy: "Disiapkan Oleh",
    operatedBy: "Dioperasikan oleh Bookaway Ltd.",
    sec1: "Bagian 1 — Tantangan yang Teridentifikasi", sec2: "Bagian 2 — Pemetaan Solusi",
    sec2desc: "Bagaimana fitur SeatOS mengatasi setiap tantangan:",
    feature: "Fitur", addresses: "Mengatasi", howItSolves: "Cara Mengatasi",
    sec3: "Bagian 3 — Dampak Bisnis yang Diharapkan",
    addFeature: "+ Tambah Fitur", add: "+ Tambah",
    pricingBreakdown: "Rincian Harga", billing: "Penagihan", fee: "Biaya",
    subtotal: "Subtotal", grandTotal: "Total Keseluruhan",
    discountsWaivers: "Diskon & Pengabaian",
    item: "Item", original: "Harga Asli", final: "Harga Akhir",
    notes: "Catatan", acceptance: "Persetujuan",
    nameTitle: "Nama & Jabatan", date: "Tanggal",
    allFees: "Semua biaya dalam", valid30: "Berlaku 30 hari.",
    proposalBtn: "Lihat Proposal →", quotationBtn: "Penawaran →",
    previewProposal: "Lihat Proposal", previewQuotation: "Lihat Penawaran",
    search: "Cari...", noResults: "Tidak ada hasil", select: "Pilih...",
  }
};


function SearchDrop({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div style={{ flex: 1, position: "relative" }} ref={ref}>
      <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
      <div onClick={() => { setOpen(!open); setQ(""); }} style={{ ...sInp, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{value || "Select..."}</span>
        <span style={{ fontSize: 10, color: B.gray }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "2px solid " + B.light, borderRadius: 14, marginTop: 4, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,.12)", maxHeight: 240, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid " + B.light }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search..." style={{ ...sInp, padding: "8px 12px", border: "1.5px solid " + B.light, borderRadius: 10, fontSize: 13 }} />
          </div>
          <div style={{ overflow: "auto", flex: 1 }}>
            {filtered.length === 0 && <div style={{ padding: "12px 16px", color: B.gray, fontSize: 13 }}>No results</div>}
            {filtered.map(c => (
              <div key={c} onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, background: c === value ? B.orange + "15" : "transparent", fontWeight: c === value ? 700 : 400, color: c === value ? B.orange : B.dark, borderBottom: "1px solid " + B.light + "80" }}
                onMouseEnter={e => e.target.style.background = B.orange + "10"}
                onMouseLeave={e => e.target.style.background = c === value ? B.orange + "15" : "transparent"}>
                {c}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tog({ on, set }) {
  return (
    <button onClick={e => { e.stopPropagation(); set(!on); }}
      style={{ width: 50, height: 28, borderRadius: 14, border: "none", background: on ? B.green : B.light, cursor: "pointer", position: "relative" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 25 : 3, width: 22, height: 22, borderRadius: 11, background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,.12)" }} />
    </button>
  );
}

function Sec({ label, n, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 6, height: 26, borderRadius: 3, background: color || B.orange }} />
      <span style={{ fontWeight: 800, fontSize: 16, color: B.dark }}>{label}</span>
      {n > 0 && <span style={{ background: color || B.orange, color: "#fff", borderRadius: 12, padding: "2px 10px", fontSize: 12, fontWeight: 800 }}>{n}</span>}
    </div>
  );
}

function Chk({ label, on, set, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={e => { e.stopPropagation(); set(!on); }}>
      <div style={{ width: 18, height: 18, borderRadius: 6, border: on ? "none" : "2px solid " + B.light, background: on ? (color || B.orange) : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {on && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: on ? B.dark : B.gray }}>{label}</span>
    </div>
  );
}

export default function App() {
  /* ── Existing State (UNCHANGED) ── */
  const [pg, setPg] = useState("build");
  const [ld, setLd] = useState(true);
  const [ppl, setPpl] = useState([]);
  const [pr, setPr] = useState(DP);
  const [cur, setCur] = useState("USD");
  const [ft, setFt] = useState("r");
  const [spId, setSpId] = useState(null);
  const [cu, setCu] = useState({ name: "", inc: "Thailand", addr: "", email: "", s: "", e: "", country: "Thailand" });
  const [sel, setSel] = useState({});
  const [stOn, setStOn] = useState(false);
  const [stTxt, setStTxt] = useState("Customer undertakes to process all ticket bookings using seatOS.");
  const [bd, setBd] = useState({ on: false, pct: "", amt: "" });
  const [nP, setNP] = useState({ name: "", email: "", phone: "" });
  const [tP, setTP] = useState(DP);
  const ref = useRef();

  /* ── NEW: Document Type + Challenge State ── */
  const [docType, setDocType] = useState("proposal"); // "proposal" | "quotation"
  const [outLang, setOutLang] = useState("en"); // output language: en, th, vi, id
  const setOutLangSave = async (v) => { setOutLang(v); try { await window.storage.set("ol", v); flash("Language saved!"); } catch(e){ flash("Error saving"); } };
  const [challenges, setChallenges] = useState(DEFAULT_CHALLENGES);
  const [selCh, setSelCh] = useState([]); // selected challenge IDs
  const [editCh, setEditCh] = useState(null); // challenge being edited (full object or null)
  const [edtCh, setEdtCh] = useState(null);   // editable challenge list for preview
  const [edtFt, setEdtFt] = useState(null);    // editable feature mappings for preview
  const [edtImp, setEdtImp] = useState(null);  // editable impacts for preview

  /* ── Language & Translations (editable via Settings) ── */
  const [lang, setLang] = useState("en");
  const [translations, setTranslations] = useState(DEFAULT_TRANSLATIONS);
  const [editLang, setEditLang] = useState(null); // lang key being edited, or null
  const t = (translations[lang] || translations.en || DEFAULT_TRANSLATIONS.en);

  /* ── Storage Loading (EXTENDED with challenges) ── */
  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("sp"); if (r) setPpl(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("pr"); if (r) { const p = JSON.parse(r.value); setPr(p); setTP(p); } } catch (e) {}
      try { const r = await window.storage.get("ch"); if (r) setChallenges(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("tr"); if (r) setTranslations(JSON.parse(r.value)); } catch (e) {}
      try { const r = await window.storage.get("ol"); if (r) setOutLang(r.value); } catch (e) {}
      try { const r = await window.storage.get("si"); if (r) setSpId(r.value); } catch (e) {}
      setLd(false);
    })();
  }, []);

  /* ── Existing Save Functions — with feedback ── */
  const [saved, setSaved] = useState("");
  const flash = (msg) => { setSaved(msg); setTimeout(() => setSaved(""), 2000); };
  const svP = async (p) => { setPpl(p); try { await window.storage.set("sp", JSON.stringify(p)); flash("Sales team saved!"); } catch (e) { flash("Error saving"); } };
  const svPr = async (p) => { setPr(p); setTP(p); try { await window.storage.set("pr", JSON.stringify(p)); flash("Pricing saved!"); } catch (e) { flash("Error saving"); } };

  /* ── NEW: Save Challenges ── */
  const svCh = async (c) => { setChallenges(c); try { await window.storage.set("ch", JSON.stringify(c)); flash("Challenges saved!"); } catch (e) { flash("Error saving"); } };
  const svTr = async (tr) => { setTranslations(tr); try { await window.storage.set("tr", JSON.stringify(tr)); flash("Translations saved!"); } catch (e) { flash("Error saving"); } };

  /* ── Existing Pricing Logic (UNCHANGED) ── */
  const ap = (pk) => pk && pr[pk]?.[cur] ? pr[pk][cur][ft] : null;
  const bf = (id) => {
    const d = sel[id]; if (!d) return 0;
    const m = parseFloat(d.fee); if (!isNaN(m) && d.fee !== "") return m;
    const it = ITEMS.find(i => i.id === id); if (it?.pk) return ap(it.pk) || 0; return 0;
  };
  const ff = (id) => { const b = bf(id), d = sel[id]; if (!d?.hd) return b; return Math.max(0, b - (parseFloat(d.da) || 0)); };

  const ids = Object.keys(sel);
  const tots = (() => {
    let ot = 0, mo = 0;
    ids.forEach(id => { const it = ITEMS.find(i => i.id === id); if (!it) return; const f = ff(id); if (it.inv === "One-time") ot += f; else mo += f; });
    return { ot, mo };
  })();
  const sub = tots.ot + tots.mo;
  const bda = bd.on ? (parseFloat(bd.amt) || 0) : 0;
  const bdp = bd.on ? (parseFloat(bd.pct) || 0) : 0;
  const grand = Math.max(0, sub - bda);
  const sp = ppl.find(p => p.id === spId);
  const cnt = ids.length;

  const hBP = (v) => { const p = parseFloat(v); setBd(x => ({ ...x, pct: v, amt: (!isNaN(p) && sub > 0) ? String(Math.round(p / 100 * sub * 100) / 100) : "" })); };
  const hBA = (v) => { const a = parseFloat(v); setBd(x => ({ ...x, amt: v, pct: (!isNaN(a) && sub > 0) ? String(Math.round(a / sub * 10000) / 100) : "" })); };

  /* ── NEW: Proposal Generation Logic ── */
  const selectedChallenges = challenges.filter(c => selCh.includes(c.id));

  /* ── Output Translation Helpers ── */
  // ot = output translate label (from translations), otc = output translate challenge content
  const ot = (key) => {
    const tr = translations[outLang] || translations.en || DEFAULT_TRANSLATIONS.en;
    return tr[key] || (DEFAULT_TRANSLATIONS.en || {})[key] || key;
  };
  const otcTitle = (ch) => (outLang !== "en" && ch.i18n?.[outLang]?.title) || ch.title;
  const otcDesc = (ch) => (outLang !== "en" && ch.i18n?.[outLang]?.description) || ch.description;
  const otcHow = (ch, idx) => (outLang !== "en" && ch.i18n?.[outLang]?.feature_mapping_how?.[idx]) || ch.feature_mapping?.[idx]?.how || "";
  const otcImpacts = (ch) => (outLang !== "en" && ch.i18n?.[outLang]?.business_impact) || ch.business_impact || [];

  const proposalFeatures = (() => {
    const map = {};
    selectedChallenges.forEach(ch => {
      (ch.feature_mapping || []).forEach((fm, idx) => {
        if (!map[fm.feature]) map[fm.feature] = [];
        map[fm.feature].push({ challenge: otcTitle(ch), how: otcHow(ch, idx) });
      });
    });
    return Object.entries(map).map(([feature, mappings]) => ({ feature, mappings }));
  })();
  const proposalImpacts = [...new Set(selectedChallenges.flatMap(ch => otcImpacts(ch)))];

  /* ── NEW: Smart Suggest — related challenges ── */
  const suggestedIds = (() => {
    if (selCh.length === 0) return [];
    const selFeatures = new Set(selectedChallenges.flatMap(c => c.features || []));
    return challenges.filter(c => !selCh.includes(c.id) && (c.features || []).some(f => selFeatures.has(f))).map(c => c.id);
  })();

  /* ── Responsive ── */
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const isMobile = winW < 640;
  const isTablet = winW >= 640 && winW < 1024;
  const px = isMobile ? "12px 14px" : "24px 16px";
  const hPx = isMobile ? "10px 14px" : "14px 24px";
  const prevPx = isMobile ? "16px 16px" : isTablet ? "24px 28px" : "28px 48px";
  const prevBPx = isMobile ? "12px 16px" : "20px 40px";
  const sCard = { ..._sCard, padding: isMobile ? 16 : 24 };

  if (ld) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: B.bg }}><span style={{ fontSize: 16, color: B.gray }}>Loading...</span></div>;

  /* ═══ SETTINGS (EXTENDED with Challenge Admin) ═══ */
  if (pg === "set") return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: B.bg }}>
      <div style={{ background: B.card, borderBottom: "4px solid " + B.orange, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <b style={{ fontSize: 16 }}>{t.settings}</b>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid " + B.light }}>
            {Object.keys(translations).map(k => <button key={k} onClick={() => setLang(k)} style={{ padding: "3px 10px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: lang === k ? B.dark : "#fff", color: lang === k ? "#fff" : B.gray }}>{k.toUpperCase()}</button>)}
          </div>
        </div>
        <button onClick={() => setPg("build")} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "8px 22px", fontSize: 13 }}>{t.builder}</button>
        {saved && <div style={{ position: "fixed", top: 60, right: 20, background: B.green, color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>{saved}</div>}
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
        {/* ── Sales Team (UNCHANGED) ── */}
        <Sec label={t.salesTeam} n={ppl.length} color={B.green} />
        <div style={sCard}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <input placeholder="Name" value={nP.name} onChange={e => setNP(p => ({ ...p, name: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 100 }} />
            <input placeholder="Email" value={nP.email} onChange={e => setNP(p => ({ ...p, email: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 120 }} />
            <input placeholder="Phone" value={nP.phone} onChange={e => setNP(p => ({ ...p, phone: e.target.value }))} style={{ ...sInp, flex: 1, minWidth: 100 }} />
            <button onClick={() => { if (!nP.name.trim()) return; svP([...ppl, { id: String(Date.now()), ...nP }]); setNP({ name: "", email: "", phone: "" }); }} style={{ ...sBtn, background: B.green, color: "#fff", padding: "10px 20px", fontSize: 14 }}>{t.add}</button>
          </div>
          {ppl.length === 0 && <p style={{ color: B.gray, textAlign: "center" }}>{t.noSales}</p>}
          {ppl.map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: B.bg, borderRadius: 14, marginBottom: 8 }}>
              <div><b>{p.name}</b><div style={{ fontSize: 12, color: B.gray }}>{p.email}{p.phone ? " · " + p.phone : ""}</div></div>
              <button onClick={() => svP(ppl.filter(x => x.id !== p.id))} style={{ ...sBtn, background: "#FEE2E2", color: B.pink, padding: "5px 14px", fontSize: 12 }}>{t.remove}</button>
            </div>
          ))}
          {ppl.length > 0 && <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><button onClick={() => svP(ppl)} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "8px 22px", fontSize: 13 }}>{t.save}</button></div>}
        </div>

        {/* ── Pricing ── */}
        <Sec label={t.pricing} n={0} color={B.purple} />
        <div style={sCard}>
          {PCATS.map(cat => (
            <div key={cat.k} style={{ marginBottom: 20 }}>
              <b style={{ display: "block", marginBottom: 8, paddingBottom: 6, borderBottom: "2px solid " + B.light }}>{cat.l}</b>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr><th style={{ textAlign: "left", padding: "4px 6px", color: B.gray, fontSize: 11 }}>Cur</th><th style={{ textAlign: "center", padding: "4px 6px", color: B.gray, fontSize: 11 }}>Regular</th><th style={{ textAlign: "center", padding: "4px 6px", color: B.gray, fontSize: 11 }}>Bundle</th></tr></thead>
                <tbody>{CUR.map(c => (
                  <tr key={c}>
                    <td style={{ padding: "3px 6px", fontWeight: 700 }}>{SYM[c]} {c}</td>
                    {["r", "b"].map(t => (
                      <td key={t} style={{ padding: "3px 3px" }}>
                        <input type="number" step="0.01" value={tP[cat.k]?.[c]?.[t] ?? ""} onChange={e => { const v = parseFloat(e.target.value); setTP(p => ({ ...p, [cat.k]: { ...p[cat.k], [c]: { ...p[cat.k]?.[c], [t]: isNaN(v) ? 0 : v } } })); }} style={{ ...sInp, padding: "5px 8px", fontSize: 13, textAlign: "center", borderRadius: 10 }} />
                      </td>
                    ))}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setTP(DP)} style={{ ...sBtn, background: B.light, color: B.gray, padding: "8px 18px", fontSize: 13 }}>{t.reset}</button>
            <button onClick={() => svPr(tP)} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "8px 22px", fontSize: 13 }}>{t.save}</button>
          </div>
        </div>

        {/* ── NEW: Challenge Modules Admin ── */}
        <Sec label={t.challengeModules} n={challenges.length} color={B.cyan} />
        <div style={sCard}>
          {editCh ? (
            /* ── Edit/Add Challenge Form ── */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <b style={{ fontSize: 15, color: B.cyan }}>{editCh.id ? "Edit Challenge" : "New Challenge"}</b>
                <button onClick={() => setEditCh(null)} style={{ ...sBtn, background: B.light, color: B.gray, padding: "5px 14px", fontSize: 12 }}>{t.cancel}</button>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>Title</label>
                <input value={editCh.title || ""} onChange={e => setEditCh(p => ({ ...p, title: e.target.value }))} style={sInp} placeholder="e.g. Overbooking" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
                <textarea value={editCh.description || ""} onChange={e => setEditCh(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...sInp, resize: "vertical" }} placeholder="Describe the business challenge..." />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>Features (comma-separated)</label>
                <input value={(editCh.features || []).join(", ")} onChange={e => setEditCh(p => ({ ...p, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} style={sInp} placeholder="Trip List, Bookings Management" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>Feature Mapping (one per line: Feature | How it solves)</label>
                <textarea value={(editCh.feature_mapping || []).map(m => m.feature + " | " + m.how).join("\n")} onChange={e => setEditCh(p => ({ ...p, feature_mapping: e.target.value.split("\n").filter(l => l.includes("|")).map(l => { const [f, ...h] = l.split("|"); return { feature: f.trim(), how: h.join("|").trim() }; }) }))} rows={3} style={{ ...sInp, resize: "vertical", fontSize: 12, fontFamily: "monospace" }} placeholder={"Trip List | Real-time seat availability\nBookings Management | Automatic conflict detection"} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>Business Impact (one per line)</label>
                <textarea value={(editCh.business_impact || []).join("\n")} onChange={e => setEditCh(p => ({ ...p, business_impact: e.target.value.split("\n").filter(Boolean) }))} rows={3} style={{ ...sInp, resize: "vertical" }} placeholder={"Reduce overbooking incidents\nLower compensation cost"} />
              </div>

              {/* ── i18n Translations per language ── */}
              <div style={{ borderTop: "2px solid " + B.light, paddingTop: 14, marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: B.purple, fontWeight: 800, display: "block", marginBottom: 10 }}>Translations</label>
                {[{ k: "th", l: "🇹🇭 Thai", fl: "ไทย" }, { k: "vi", l: "🇻🇳 Vietnamese", fl: "Tiếng Việt" }, { k: "id", l: "🇮🇩 Indonesian", fl: "Bahasa" }].map(lg => {
                  const ldata = editCh.i18n?.[lg.k] || {};
                  const setI18n = (field, val) => setEditCh(p => ({ ...p, i18n: { ...(p.i18n || {}), [lg.k]: { ...(p.i18n?.[lg.k] || {}), [field]: val } } }));
                  return (
                    <div key={lg.k} style={{ background: B.bg, borderRadius: 14, padding: 14, marginBottom: 10 }}>
                      <b style={{ fontSize: 12, color: B.dark, display: "block", marginBottom: 8 }}>{lg.l}</b>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: B.gray }}>Title</label>
                        <input value={ldata.title || ""} onChange={e => setI18n("title", e.target.value)} style={{ ...sInp, padding: "7px 12px", fontSize: 12 }} placeholder={editCh.title || "Title..."} />
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: B.gray }}>Description</label>
                        <textarea value={ldata.description || ""} onChange={e => setI18n("description", e.target.value)} rows={2} style={{ ...sInp, padding: "7px 12px", fontSize: 12, resize: "vertical" }} placeholder={editCh.description || "Description..."} />
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: B.gray }}>Feature How (one per line, same order as English)</label>
                        <textarea value={(ldata.feature_mapping_how || []).join("\n")} onChange={e => setI18n("feature_mapping_how", e.target.value.split("\n"))} rows={2} style={{ ...sInp, padding: "7px 12px", fontSize: 11, resize: "vertical", fontFamily: "monospace" }} placeholder={(editCh.feature_mapping || []).map(m => m.how).join("\n")} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: B.gray }}>Business Impact (one per line)</label>
                        <textarea value={(ldata.business_impact || []).join("\n")} onChange={e => setI18n("business_impact", e.target.value.split("\n").filter(Boolean))} rows={2} style={{ ...sInp, padding: "7px 12px", fontSize: 11, resize: "vertical" }} placeholder={(editCh.business_impact || []).join("\n")} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => {
                if (!editCh.title?.trim()) return;
                const isNew = !challenges.find(c => c.id === editCh.id);
                const ch = isNew ? { ...editCh, id: "CH" + String(Date.now()).slice(-6) } : editCh;
                const next = isNew ? [...challenges, ch] : challenges.map(c => c.id === ch.id ? ch : c);
                svCh(next); setEditCh(null);
              }} style={{ ...sBtn, background: B.cyan, color: "#fff", padding: "10px 24px", fontSize: 14 }}>
                {editCh.id && challenges.find(c => c.id === editCh.id) ? t.saveChanges : t.addChallenge}
              </button>
            </div>
          ) : (
            /* ── Challenge List ── */
            <div>
              <button onClick={() => setEditCh({ title: "", description: "", features: [], feature_mapping: [], business_impact: [] })} style={{ ...sBtn, background: B.cyan, color: "#fff", padding: "8px 20px", fontSize: 13, marginBottom: 16 }}>{t.addChallenge}</button>
              {challenges.length === 0 && <p style={{ color: B.gray, textAlign: "center" }}>{t.noResults}</p>}
              {challenges.map(ch => (
                <div key={ch.id} style={{ background: B.bg, borderRadius: 14, padding: "12px 16px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <b style={{ fontSize: 13 }}>{ch.title}</b>
                      <div style={{ fontSize: 11, color: B.gray, marginTop: 2 }}>{ch.description}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                        {(ch.features || []).map(f => <span key={f} style={{ fontSize: 10, background: B.cyan + "18", color: B.cyan, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{f}</span>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setEditCh({ ...ch })} style={{ ...sBtn, background: B.card, border: "1.5px solid " + B.light, color: B.dark, padding: "4px 12px", fontSize: 11 }}>{t.edit}</button>
                      <button onClick={() => { if (confirm("Delete '" + ch.title + "'?")) svCh(challenges.filter(c => c.id !== ch.id)); }} style={{ ...sBtn, background: "#FEE2E2", color: B.pink, padding: "4px 12px", fontSize: 11 }}>{t.del}</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                <button onClick={() => svCh(DEFAULT_CHALLENGES)} style={{ ...sBtn, background: B.light, color: B.gray, padding: "8px 18px", fontSize: 13 }}>{t.resetDefaults}</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Translation Editor ── */}
        <Sec label={t.translations} n={Object.keys(translations).length} color={B.orange} />
        <div style={sCard}>
          {editLang ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <b style={{ fontSize: 15, color: B.orange }}>Editing: {editLang.toUpperCase()}</b>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setEditLang(null)} style={{ ...sBtn, background: B.light, color: B.gray, padding: "5px 14px", fontSize: 12 }}>{t.cancel}</button>
                  <button onClick={() => { svTr(translations); setEditLang(null); }} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "5px 14px", fontSize: 12 }}>{t.save}</button>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflow: "auto" }}>
                {Object.keys(translations[editLang] || {}).map(key => (
                  <div key={key} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: B.gray, fontWeight: 600, minWidth: 110, fontFamily: "monospace" }}>{key}</span>
                    <input value={translations[editLang]?.[key] || ""} onChange={e => setTranslations(prev => ({ ...prev, [editLang]: { ...prev[editLang], [key]: e.target.value } }))}
                      style={{ ...sInp, padding: "5px 10px", fontSize: 12 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                {Object.keys(translations).map(k => (
                  <button key={k} onClick={() => setEditLang(k)} style={{ ...sBtn, padding: "10px 20px", borderRadius: 14, border: "2px solid " + B.light, background: lang === k ? B.orange + "10" : "#fff", cursor: "pointer" }}>
                    <b style={{ fontSize: 14, color: lang === k ? B.orange : B.dark, display: "block" }}>{k.toUpperCase()}</b>
                    <span style={{ fontSize: 11, color: B.gray }}>{Object.keys(translations[k] || {}).length} keys</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { const name = prompt("Language code (e.g. id, ja, ko):"); if (name && !translations[name]) { const copy = { ...DEFAULT_TRANSLATIONS.en }; svTr({ ...translations, [name]: copy }); } }} style={{ ...sBtn, background: B.orange + "15", color: B.orange, padding: "8px 16px", fontSize: 12 }}>+ Add Language</button>
                <button onClick={() => svTr(DEFAULT_TRANSLATIONS)} style={{ ...sBtn, background: B.light, color: B.gray, padding: "8px 16px", fontSize: 12 }}>{t.resetDefaults}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /* ═══ BUILDER (EXTENDED with Document Type Selector) ═══ */
  if (pg === "build") {
    /* ── Existing Quotation toggle/update logic (UNCHANGED) ── */
    const toggle = (id) => setSel(p => {
      if (p[id]) { const n = { ...p }; delete n[id]; return n; }
      return { ...p, [id]: { fee: "", qty: 1, ct: "amount", fp: "", hd: false, dp: "", da: "", hw: false, wt: "" } };
    });
    const upd = (id, f) => setSel(p => ({ ...p, [id]: { ...p[id], ...f } }));

    /* ── Existing RI (Render Item) function — UNCHANGED ── */
    const RI = (it) => {
      const on = !!sel[it.id], d = sel[it.id] || {}, base = bf(it.id), aP = ap(it.pk);
      const dA = parseFloat(d.da) || 0, dP = parseFloat(d.dp) || 0, fin = d.hd ? Math.max(0, base - dA) : base;
      const hDP = v => { const pp = parseFloat(v); upd(it.id, { dp: v, da: (!isNaN(pp) && base > 0) ? String(Math.round(pp / 100 * base * 100) / 100) : "" }); };
      const hDA = v => { const a = parseFloat(v); upd(it.id, { da: v, dp: (!isNaN(a) && base > 0) ? String(Math.round(a / base * 10000) / 100) : "" }); };
      return (
        <div key={it.id} onClick={() => toggle(it.id)} style={{ border: on ? "2px solid " + it.clr : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 14, background: on ? it.clr + "08" : B.card, cursor: "pointer", position: "relative", overflow: "hidden" }}>
          {on && <div style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", background: it.clr }} />}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, paddingLeft: on ? 8 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 15 }}>{it.name}</b>
                {it.inv && <span style={{ fontSize: 11, background: it.clr + "18", color: it.clr, padding: "3px 12px", borderRadius: 20, fontWeight: 700 }}>{it.inv}</span>}
              </div>
              {it.desc && <div style={{ fontSize: 12, color: B.gray, marginTop: 4 }}>{it.desc}</div>}
              {on && aP != null && <div style={{ marginTop: 6, fontSize: 13, color: it.clr, fontWeight: 700 }}>{ft === "b" ? t.bundle : t.regular}: {fmtp(aP, cur)}</div>}
            </div>
            <Tog on={on} set={() => toggle(it.id)} />
          </div>
          {on && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px solid " + B.light }} onClick={e => e.stopPropagation()}>
              {it.mode === "flex" ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    {[{ k: "amount", l: "Per Amount" }, { k: "percent", l: "Per % of Ticket" }].map(c => (
                      <button key={c.k} onClick={() => upd(it.id, { ct: c.k })} style={{ ...sBtn, padding: "6px 16px", fontSize: 12, border: (d.ct || "amount") === c.k ? "2px solid " + it.clr : "2px solid " + B.light, background: (d.ct || "amount") === c.k ? it.clr + "10" : "#fff", color: (d.ct || "amount") === c.k ? it.clr : B.gray }}>{c.l}</button>
                    ))}
                  </div>
                  {(d.ct || "amount") === "amount"
                    ? <input placeholder={"Amount per ticket (" + cur + ")"} value={d.fee || ""} onChange={e => upd(it.id, { fee: e.target.value })} style={sInp} />
                    : <input type="number" min="0" max="100" step="0.01" placeholder="% per ticket" value={d.fp || ""} onChange={e => upd(it.id, { fp: e.target.value })} style={sInp} />}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: 11, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>
                      {it.mode === "flat" ? "Monthly Flat Rate (" + cur + ")" : "Fee (" + cur + ")"}
                      {aP != null && <span style={{ fontWeight: 400 }}> — blank=rate card</span>}
                    </label>
                    <input placeholder={aP != null ? fmt(aP, cur) : "0.00"} value={d.fee || ""} onChange={e => upd(it.id, { fee: e.target.value })} style={sInp} />
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 16, marginBottom: (d.hd || d.hw) ? 12 : 0 }}>
                <Chk label={t.discount} on={!!d.hd} set={v => upd(it.id, { hd: v })} color={B.purple} />
                <Chk label={t.waiver} on={!!d.hw} set={v => upd(it.id, { hw: v })} color={B.pink} />
              </div>
              {d.hd && (
                <div style={{ background: B.purple + "10", border: "1px solid " + B.purple + "30", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 90 }}><label style={{ fontSize: 10, color: B.gray, fontWeight: 600 }}>%</label><input type="number" min="0" max="100" step="0.01" value={d.dp || ""} onChange={e => hDP(e.target.value)} style={{ ...sInp, padding: "6px 10px" }} /></div>
                    <span style={{ color: B.muted, fontWeight: 800, paddingBottom: 6 }}>=</span>
                    <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: 10, color: B.gray, fontWeight: 600 }}>Amt ({cur})</label><input type="number" min="0" step="0.01" value={d.da || ""} onChange={e => hDA(e.target.value)} style={{ ...sInp, padding: "6px 10px" }} /></div>
                  </div>
                  {base > 0 && dA > 0 && (
                    <div style={{ marginTop: 8, padding: "8px 12px", background: B.purple + "15", borderRadius: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ textDecoration: "line-through", color: B.gray, fontSize: 12 }}>{fmtp(base, cur)}</span>
                      <b style={{ color: B.purple, fontSize: 14 }}>→ {fmtp(fin, cur)}</b>
                      <span style={{ color: B.purple, fontSize: 11 }}>(-{fmt(dP, cur)}%)</span>
                    </div>
                  )}
                </div>
              )}
              {d.hw && (
                <div style={{ background: B.pink + "10", border: "1px solid " + B.pink + "30", borderRadius: 14, padding: 12 }}>
                  <input placeholder="e.g. Waived for 6 months" value={d.wt || ""} onChange={e => upd(it.id, { wt: e.target.value })} style={sInp} />
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    /* ── Determine preview readiness ── */
    const canPreview = docType === "proposal" ? selCh.length > 0 : cnt > 0;
    const previewLabel = docType === "proposal" ? `${t.previewProposal} (${selCh.length})` : `${t.previewQuotation} (${cnt})`;
    const goPreview = () => {
      if (docType === "proposal") {
        setEdtCh(selectedChallenges.map(c => ({ id: c.id, title: otcTitle(c), description: otcDesc(c) })));
        setEdtFt(proposalFeatures.map(pf => ({ feature: pf.feature, mappings: pf.mappings.map(m => ({ ...m })) })));
        setEdtImp([...proposalImpacts]);
      }
      setPg("preview");
    };

    return (
      <div style={{ fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: B.bg }}>
        {/* ── Header Bar ── */}
        <div style={{ background: B.card, borderBottom: "4px solid " + B.orange, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div><b style={{ fontSize: 16, display: "block" }}>SeatOS Document Builder</b><span style={{ fontSize: 11, color: B.gray }}>Generate Proposals & Quotations</span></div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setPg("set")} style={{ ...sBtn, background: B.bg, color: B.dark, padding: "8px 18px", fontSize: 13 }}>⚙ Settings</button>
            <button onClick={goPreview} disabled={!canPreview} style={{ ...sBtn, background: canPreview ? B.orange : B.light, color: "#fff", padding: "8px 24px", fontSize: 13, opacity: canPreview ? 1 : 0.5 }}>{previewLabel}</button>
          </div>
        </div>
        {saved && <div style={{ position: "fixed", top: 60, right: 20, background: B.green, color: "#fff", padding: "10px 24px", borderRadius: 12, fontWeight: 700, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}>{saved}</div>}

        <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>

          {/* ═══ NEW: Document Type Selector ═══ */}
          <Sec label={t.docType} n={0} color={B.dark} />
          <div style={sCard}>
            <div style={{ display: "flex", gap: 0, borderRadius: 14, overflow: "hidden", border: "2px solid " + B.light }}>
              {[{ k: "proposal", l: t.proposal, desc: t.proposalDesc, clr: B.cyan },
                { k: "quotation", l: t.quotation, desc: t.quotationDesc, clr: B.orange }
              ].map(dt => (
                <button key={dt.k} onClick={() => setDocType(dt.k)} style={{
                  flex: 1, padding: "16px 12px", border: "none", cursor: "pointer", textAlign: "center",
                  background: docType === dt.k ? dt.clr : "#fff", color: docType === dt.k ? "#fff" : B.gray,
                  transition: "all .2s"
                }}>
                  <b style={{ fontSize: 15, display: "block" }}>{dt.l}</b>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>{dt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ═══ Output Language Toggle ═══ */}
          <Sec label="Output Language" n={0} color={B.purple} />
          <div style={sCard}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[{ k: "en", l: "English", flag: "🇬🇧" }, { k: "th", l: "ไทย", flag: "🇹🇭" }, { k: "vi", l: "Tiếng Việt", flag: "🇻🇳" }, { k: "id", l: "Bahasa", flag: "🇮🇩" }].map(lg => (
                <button key={lg.k} onClick={() => setOutLangSave(lg.k)} style={{
                  ...sBtn, padding: isMobile ? "8px 14px" : "10px 20px", borderRadius: 14,
                  border: outLang === lg.k ? "2px solid " + B.purple : "2px solid " + B.light,
                  background: outLang === lg.k ? B.purple + "10" : "#fff",
                  color: outLang === lg.k ? B.purple : B.gray
                }}>
                  <span style={{ fontSize: 16, marginRight: 6 }}>{lg.flag}</span>
                  <span style={{ fontSize: 13 }}>{lg.l}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: B.muted, marginTop: 8 }}>
              {outLang === "en" ? "Output will be generated in English" : outLang === "th" ? "ผลลัพธ์จะถูกสร้างเป็นภาษาไทย" : outLang === "vi" ? "Kết quả sẽ được tạo bằng tiếng Việt" : "Output akan dibuat dalam Bahasa Indonesia"}
            </div>
          </div>

          {/* ═══ Common: Sales Person ═══ */}
          <Sec label={t.salesPerson} n={sp ? 1 : 0} color={B.cyan} />
          <div style={sCard}>
            {ppl.length === 0
              ? <p style={{ color: B.gray, textAlign: "center" }}>{t.noSales} <button onClick={() => setPg("set")} style={{ background: "none", border: "none", color: B.orange, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>{t.addInSettings}</button></p>
              : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{ppl.map(p => (
                <button key={p.id} onClick={() => { setSpId(p.id); try { window.storage.set("si", p.id); } catch(e){} }} style={{ ...sBtn, padding: "12px 18px", borderRadius: 16, border: spId === p.id ? "2px solid " + B.cyan : "2px solid " + B.light, background: spId === p.id ? B.cyan + "10" : "#fff", textAlign: "left", cursor: "pointer" }}>
                  <b style={{ fontSize: 13, color: spId === p.id ? B.cyan : B.dark, display: "block" }}>{p.name}</b>
                  <span style={{ fontSize: 11, color: B.gray }}>{p.email}</span>
                </button>
              ))}</div>}
          </div>

          {/* ═══ Common: Customer Info ═══ */}
          <Sec label={t.customer} n={0} color={B.pink} />
          <div style={sCard}>
            {[{ k: "name", l: t.customerName, p: "Acme Co." }, { k: "addr", l: t.address, p: "123 Sukhumvit" }, { k: "email", l: t.email, p: "hi@acme.com" }].map(f => (
              <div key={f.k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.l}</label>
                <input value={cu[f.k]} onChange={e => setCu(p => ({ ...p, [f.k]: e.target.value }))} placeholder={f.p} style={sInp} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <SearchDrop label={t.country} value={cu.country} onChange={v => setCu(p => ({ ...p, country: v, inc: (p.inc === "" || p.inc === p.country) ? v : p.inc }))} />
              <SearchDrop label={t.incorporation} value={cu.inc || cu.country} onChange={v => setCu(p => ({ ...p, inc: v }))} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {[{ k: "s", l: t.startDate }, { k: "e", l: t.endDate }].map(f => (
                <div key={f.k} style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: B.gray, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.l}</label>
                  <input type="date" value={cu[f.k]} onChange={e => setCu(p => ({ ...p, [f.k]: e.target.value }))} style={sInp} />
                </div>
              ))}
            </div>
          </div>

          {/* ═══ CONDITIONAL: Proposal Mode → Challenge Selection ═══ */}
          {docType === "proposal" && (
            <>
              <Sec label={t.selectChallenges} n={selCh.length} color={B.cyan} />
              {challenges.map(ch => {
                const on = selCh.includes(ch.id);
                const isSuggested = suggestedIds.includes(ch.id);
                return (
                  <div key={ch.id} onClick={() => setSelCh(p => on ? p.filter(x => x !== ch.id) : [...p, ch.id])}
                    style={{ border: on ? "2px solid " + B.cyan : isSuggested ? "2px dashed " + B.orange : "2px solid " + B.light, borderRadius: 20, padding: "16px 20px", marginBottom: 10, background: on ? B.cyan + "08" : B.card, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                    {on && <div style={{ position: "absolute", left: 0, top: 0, width: 5, height: "100%", background: B.cyan }} />}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingLeft: on ? 8 : 0 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <b style={{ fontSize: 14 }}>{ch.title}</b>
                          {isSuggested && !on && <span style={{ fontSize: 10, background: B.orange + "20", color: B.orange, padding: "2px 10px", borderRadius: 10, fontWeight: 700 }}>{t.suggested}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: B.gray, marginTop: 3 }}>{ch.description}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {(ch.features || []).map(f => <span key={f} style={{ fontSize: 10, background: B.cyan + "15", color: B.cyan, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{f}</span>)}
                        </div>
                      </div>
                      <Tog on={on} set={() => setSelCh(p => on ? p.filter(x => x !== ch.id) : [...p, ch.id])} />
                    </div>
                  </div>
                );
              })}

              {/* Proposal summary bar */}
              <div style={{ background: B.dark, borderRadius: 20, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginBottom: 40, flexWrap: "wrap", gap: 16, marginTop: 16 }}>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.challenges}</div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{selCh.length}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.features}</div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{proposalFeatures.length}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.impacts}</div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{proposalImpacts.length}</div></div>
                </div>
                <button onClick={goPreview} disabled={selCh.length === 0} style={{ ...sBtn, background: B.cyan, color: "#fff", padding: "14px 32px", fontSize: 15, opacity: selCh.length > 0 ? 1 : 0.5 }}>{t.proposalBtn}</button>
              </div>
            </>
          )}

          {/* ═══ CONDITIONAL: Quotation Mode → Existing Item Selection (RENAMED) ═══ */}
          {docType === "quotation" && (
            <>
              <Sec label={t.pricing} />
              <div style={sCard}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {CUR.map(c => <button key={c} onClick={() => setCur(c)} style={{ ...sBtn, padding: "8px 16px", fontSize: 13, background: cur === c ? B.orange : "#fff", color: cur === c ? "#fff" : B.gray, border: cur === c ? "none" : "2px solid " + B.light }}>{SYM[c]} {c}</button>)}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[{ k: "r", l: t.regular }, { k: "b", l: t.bundle }].map(x => <button key={x.k} onClick={() => setFt(x.k)} style={{ ...sBtn, padding: "8px 18px", fontSize: 13, background: ft === x.k ? B.green : "#fff", color: ft === x.k ? "#fff" : B.gray, border: ft === x.k ? "none" : "2px solid " + B.light }}>{x.l}</button>)}
                </div>
              </div>

              <Sec label={t.licensesComm} n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "lic").length} color={B.orange} />
              {ITEMS.filter(i => i.cat === "lic").map(RI)}
              <Sec label={t.services} n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "svc").length} color={B.cyan} />
              {ITEMS.filter(i => i.cat === "svc").map(RI)}
              <Sec label={t.ancillary} n={ids.filter(id => ITEMS.find(i => i.id === id)?.cat === "anc").length} color={B.pink} />
              {ITEMS.filter(i => i.cat === "anc").map(RI)}

              <div style={{ height: 16 }} />
              <Sec label={t.billDiscount} n={bd.on ? 1 : 0} color={B.purple} />
              <div onClick={() => setBd(p => ({ ...p, on: !p.on }))} style={{ border: bd.on ? "2px solid " + B.purple : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 20, background: bd.on ? B.purple + "08" : B.card, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 15 }}>{t.discountBill}</b><Tog on={bd.on} set={v => setBd(p => ({ ...p, on: v }))} /></div>
                {bd.on && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid " + B.light }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 90 }}><label style={{ fontSize: 10, color: B.gray, fontWeight: 600 }}>%</label><input type="number" min="0" max="100" step="0.01" value={bd.pct || ""} onChange={e => hBP(e.target.value)} style={{ ...sInp, padding: "6px 10px" }} /></div>
                      <span style={{ color: B.muted, fontWeight: 800, paddingBottom: 6 }}>=</span>
                      <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: 10, color: B.gray, fontWeight: 600 }}>Amt ({cur})</label><input type="number" min="0" step="0.01" value={bd.amt || ""} onChange={e => hBA(e.target.value)} style={{ ...sInp, padding: "6px 10px" }} /></div>
                    </div>
                    {sub > 0 && bda > 0 && <div style={{ marginTop: 8, padding: "8px 12px", background: B.purple + "15", borderRadius: 10, display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: B.gray }}>Sub: {fmtp(sub, cur)}</span><b style={{ color: B.purple }}>→ {fmtp(grand, cur)}</b></div>}
                  </div>
                )}
              </div>

              <Sec label={t.specialTerms} n={stOn ? 1 : 0} color={B.green} />
              <div onClick={() => setStOn(!stOn)} style={{ border: stOn ? "2px solid " + B.green : "2px solid " + B.light, borderRadius: 20, padding: 20, marginBottom: 24, background: stOn ? B.green + "08" : B.card, cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontSize: 15 }}>{t.specialTerms}</b><Tog on={stOn} set={setStOn} /></div>
                {stOn && <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px solid " + B.light }} onClick={e => e.stopPropagation()}><textarea value={stTxt} onChange={e => setStTxt(e.target.value)} rows={3} style={{ ...sInp, resize: "vertical" }} /></div>}
              </div>

              {/* Quotation summary bar (RENAMED from "Proposal") */}
              <div style={{ background: B.dark, borderRadius: 20, padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.oneTime}</div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{fmtp(tots.ot, cur)}</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.monthly}</div><div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{fmtp(tots.mo, cur)}</div></div>
                  {bda > 0 && <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{t.discount}</div><div style={{ fontSize: 18, fontWeight: 700, color: B.cyan, lineHeight: 1 }}>-{fmtp(bda, cur)}</div></div>}
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: B.orange, marginBottom: 4 }}>{t.grand}</div><div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{fmtp(grand, cur)}</div></div>
                </div>
                <button onClick={() => setPg("preview")} disabled={cnt === 0} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "14px 32px", fontSize: 15, opacity: cnt > 0 ? 1 : 0.5 }}>Quotation →</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ═══ PREVIEW — ROUTES TO PROPOSAL OR QUOTATION ═══ */
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Shared download function — cleans edit buttons and converts inputs to text for PDF
  const dlPrint = (title) => {
    const el = ref.current;
    if (!el) return;
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".np").forEach(e => e.remove());
    clone.querySelectorAll("input, textarea").forEach(e => {
      const span = document.createElement("span");
      span.style.cssText = e.style.cssText;
      span.textContent = e.value;
      e.replaceWith(span);
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SeatOS ${title} – ${cu.name || "Customer"}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI','Helvetica Neue',sans-serif;background:#fff}
@page{size:A4;margin:0}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>${clone.outerHTML}<script>window.onload=function(){setTimeout(function(){window.print()},500)}<\/script></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  };

  const A4W = 794;
  const secLabel = { fontSize: 8, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 6 };

  /* ═══════════════════════════════════════════════════════
     PROPOSAL PREVIEW (NEW — Challenge-based)
     ═══════════════════════════════════════════════════════ */
  if (docType === "proposal") {
    return (
      <div style={{ fontFamily: "'Segoe UI',sans-serif", background: B.bg, minHeight: "100vh" }}>
        <div className="np" style={{ background: B.card, borderBottom: "4px solid " + B.cyan, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99 }}>
          <button onClick={() => setPg("build")} style={{ ...sBtn, background: B.bg, color: B.dark, padding: "8px 18px", fontSize: 13 }}>{t.editor}</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { const el = ref.current; if (el) { navigator.clipboard.writeText(el.innerText).then(() => alert("Copied to clipboard!")); } }} style={{ ...sBtn, background: B.bg, color: B.dark, padding: "8px 16px", fontSize: 12 }}>{t.copyText}</button>
            <button onClick={() => dlPrint(t.proposal)} style={{ ...sBtn, background: B.cyan, color: "#fff", padding: "8px 24px", fontSize: 13 }}>{t.download}</button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px", overflow: "auto" }}>
          <div ref={ref} style={{ width: "100%", maxWidth: A4W, background: "#fff", boxShadow: "0 4px 30px rgba(0,0,0,.12)", overflow: "hidden" }}>

            {/* ── Header — same style as Quotation ── */}
            <div style={{ background: "#F5F0EB", padding: prevPx, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: isMobile ? 80 : 140, height: isMobile ? 80 : 140, borderRadius: "50%", background: B.cyan + "22" }} />
              <div style={{ position: "absolute", bottom: -24, right: 60, width: isMobile ? 50 : 90, height: isMobile ? 50 : 90, borderRadius: "50%", background: B.orange + "15" }} />
              <div style={{ position: "absolute", top: 10, right: isMobile ? 100 : 180, width: 48, height: 48, borderRadius: 24, background: B.pink + "18" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                <div><SeatLogo h={isMobile ? 48 : 156} /></div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: B.cyan, fontSize: isMobile ? 18 : 28, fontWeight: 800, fontFamily: "Georgia,serif", letterSpacing: 1 }}>{ot("proposal").toUpperCase()}</div>
                  <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>{today} · {cur} · {ft === "b" ? t.bundle : t.regular}</div>
                  <div style={{ color: "#c8c2b9", fontSize: 10, marginTop: 2 }}>{ot("operatedBy")}</div>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: prevBPx }}>

              {/* Prepared For / By */}
              <div style={{ display: "flex", gap: isMobile ? 12 : 24, marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #eee", flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...secLabel, color: B.cyan }}>{ot("preparedFor")}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: B.dark }}>{cu.name || "—"}</div>
                  <div style={{ fontSize: 8, color: "#777", lineHeight: 1.5 }}>
                    {cu.addr && <div>{cu.addr}</div>}
                    {cu.country && <div>{cu.country}</div>}
                    {cu.email && <div>{cu.email}</div>}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...secLabel, color: B.cyan }}>{ot("preparedBy")}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: B.dark }}>SeatOS (Bookaway Ltd.)</div>
                  <div style={{ fontSize: 8, color: "#777", lineHeight: 1.5 }}>
                    {sp && <div style={{ fontWeight: 700, color: B.dark }}>{sp.name}</div>}
                    {sp?.email && <div>{sp.email}</div>}
                  </div>
                </div>
              </div>

              {/* Section 1: Challenges — EDITABLE */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ ...secLabel, color: B.cyan, fontSize: 10, marginBottom: 0 }}>{ot("sec1")}</div>
                <button className="np" onClick={() => setEdtCh(p => [...(p||[]), { id: "NEW" + Date.now(), title: "", description: "" }])} style={{ ...sBtn, background: B.cyan + "15", color: B.cyan, padding: "3px 12px", fontSize: 10 }}>+ Add</button>
              </div>
              {(edtCh || []).map((ch, i) => (
                <div key={ch.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < (edtCh||[]).length - 1 ? "1px solid #eee" : "none" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: B.cyan, minWidth: 20, paddingTop: 4 }}>{i + 1}.</span>
                    <div style={{ flex: 1 }}>
                      <input value={ch.title} onChange={e => setEdtCh(p => p.map((c, j) => j === i ? { ...c, title: e.target.value } : c))} placeholder="Challenge title..." style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 800, color: B.dark, width: "100%", background: "transparent", padding: "2px 0" }} />
                      <textarea value={ch.description} onChange={e => setEdtCh(p => p.map((c, j) => j === i ? { ...c, description: e.target.value } : c))} placeholder="Description..." rows={2} style={{ border: "none", outline: "none", fontSize: 10, color: "#333", fontWeight: 500, width: "100%", background: "transparent", resize: "vertical", lineHeight: 1.5, padding: "2px 0", fontFamily: "inherit" }} />
                    </div>
                    <button className="np" onClick={() => setEdtCh(p => p.filter((_, j) => j !== i))} style={{ ...sBtn, background: "none", color: "#ccc", fontSize: 14, padding: "0 4px", lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}

              {/* Section 2: Solution Mapping — EDITABLE */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, marginBottom: 8 }}>
                <div style={{ ...secLabel, color: B.orange, fontSize: 10, marginBottom: 0 }}>{ot("sec2")}</div>
                <button className="np" onClick={() => setEdtFt(p => [...(p||[]), { feature: "", mappings: [{ challenge: "", how: "" }] }])} style={{ ...sBtn, background: B.orange + "15", color: B.orange, padding: "3px 12px", fontSize: 10 }}>+ Add</button>
              </div>
              <div style={{ fontSize: 8, color: "#888", marginBottom: 8 }}>{ot("sec2desc")}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 8, padding: "6px 8px", textAlign: "left", fontWeight: 800, color: "#666", borderBottom: "2px solid " + B.orange, textTransform: "uppercase", width: "22%" }}>{ot("feature")}</th>
                    <th style={{ fontSize: 8, padding: "6px 8px", textAlign: "left", fontWeight: 800, color: "#666", borderBottom: "2px solid " + B.orange, textTransform: "uppercase", width: "22%" }}>{ot("addresses")}</th>
                    <th style={{ fontSize: 8, padding: "6px 8px", textAlign: "left", fontWeight: 800, color: "#666", borderBottom: "2px solid " + B.orange, textTransform: "uppercase" }}>{ot("howItSolves")}</th>
                    <th className="np" style={{ fontSize: 7, padding: "5px 4px", borderBottom: "2px solid " + B.orange, width: 20 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(edtFt || []).map((pf, i) => (
                    pf.mappings.map((m, j) => (
                      <tr key={i + "-" + j}>
                        {j === 0 && <td rowSpan={pf.mappings.length} style={{ padding: "4px 8px", borderBottom: "1px solid #eee", verticalAlign: "top", background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                          <input value={pf.feature} onChange={e => setEdtFt(p => p.map((f, fi) => fi === i ? { ...f, feature: e.target.value } : f))} style={{ border: "none", outline: "none", fontSize: 10, fontWeight: 800, color: B.dark, width: "100%", background: "transparent" }} placeholder="Feature" />
                        </td>}
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #eee" }}>
                          <input value={m.challenge} onChange={e => setEdtFt(p => p.map((f, fi) => fi === i ? { ...f, mappings: f.mappings.map((mm, mj) => mj === j ? { ...mm, challenge: e.target.value } : mm) } : f))} style={{ border: "none", outline: "none", fontSize: 9, color: B.dark, fontWeight: 700, width: "100%", background: "transparent" }} placeholder="Challenge" />
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #eee" }}>
                          <input value={m.how} onChange={e => setEdtFt(p => p.map((f, fi) => fi === i ? { ...f, mappings: f.mappings.map((mm, mj) => mj === j ? { ...mm, how: e.target.value } : mm) } : f))} style={{ border: "none", outline: "none", fontSize: 9, color: "#333", fontWeight: 500, width: "100%", background: "transparent" }} placeholder="How it solves..." />
                        </td>
                        {j === 0 && <td rowSpan={pf.mappings.length} className="np" style={{ padding: "2px", borderBottom: "1px solid #eee", verticalAlign: "top", textAlign: "center" }}>
                          <button onClick={() => setEdtFt(p => p.map((f, fi) => fi === i ? { ...f, mappings: [...f.mappings, { challenge: "", how: "" }] } : f))} style={{ border: "none", background: "none", color: B.orange, cursor: "pointer", fontSize: 10, fontWeight: 800 }}>+</button>
                          <button onClick={() => setEdtFt(p => p.filter((_, fi) => fi !== i))} style={{ border: "none", background: "none", color: "#ccc", cursor: "pointer", fontSize: 12 }}>×</button>
                        </td>}
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>

              {/* Section 3: Business Impact — EDITABLE */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 8 }}>
                <div style={{ ...secLabel, color: B.green, fontSize: 10, marginBottom: 0 }}>{ot("sec3")}</div>
                <button className="np" onClick={() => setEdtImp(p => [...(p||[]), ""])} style={{ ...sBtn, background: B.green + "15", color: B.green, padding: "3px 12px", fontSize: 10 }}>+ Add</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 5 }}>
                {(edtImp || []).map((imp, i) => (
                  <div key={i} style={{ display: "flex", gap: 5, alignItems: "flex-start", padding: "4px 8px", background: i % 2 === 0 ? B.green + "08" : "#fff", borderRadius: 6 }}>
                    <span style={{ color: B.green, fontWeight: 800, fontSize: 10, marginTop: 2 }}>✓</span>
                    <input value={imp} onChange={e => setEdtImp(p => p.map((v, j) => j === i ? e.target.value : v))} style={{ border: "none", outline: "none", fontSize: 9, color: "#333", fontWeight: 500, flex: 1, background: "transparent", lineHeight: 1.5 }} placeholder="Impact..." />
                    <button className="np" onClick={() => setEdtImp(p => p.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: "#ccc", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div style={{ marginTop: 24, borderTop: "1.5px solid " + B.dark, paddingTop: 12, textAlign: "center", fontSize: 7, color: "#bbb" }}>
                SeatOS · Bookaway Ltd. · 6 HaTa'as St., Ramat Gan{sp?.email ? " · " + sp.email : ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     QUOTATION PREVIEW (EXISTING — renamed from "Proposal")
     All logic UNCHANGED, only label "PROPOSAL" → "QUOTATION"
     + fixed fmtn bug (was undefined, now uses fmt)
     ═══════════════════════════════════════════════════════ */
  const thS = { background: B.bg, padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase", color: B.gray, borderBottom: "2px solid " + B.light };
  const tdS = { padding: "10px 14px", borderBottom: "1px solid " + B.light, color: B.dark, verticalAlign: "top" };
  const active = (() => {
    const raw = ids.map(id => ITEMS.find(i => i.id === id)).filter(Boolean);
    const order = (it) => {
      if (it.inv === "One-time") return 0;
      if (it.id === "admin") return 1;
      if (it.cat === "lic") return 2;
      if (it.cat === "svc") return 3;
      return 4;
    };
    return [...raw].sort((a, b) => order(a) - order(b));
  })();
  let num = 0;

  const bdg = (d) => {
    if (!d) return null;
    const p = parseFloat(d.dp) || 0, a = parseFloat(d.da) || 0;
    return (
      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
        {d.hd && a > 0 && <span style={{ fontSize: 11, background: B.purple + "15", color: B.purple, padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>-{p}% ({fmtp(a, cur)})</span>}
        {d.hw && d.wt && <span style={{ fontSize: 11, background: B.pink + "15", color: B.pink, padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>Waiver: {d.wt}</span>}
      </div>
    );
  };

  const fc = (it) => {
    const d = sel[it.id], b = bf(it.id), f = ff(it.id);
    if (it.mode === "flex" && d && (d.ct || "amount") === "percent" && d.fp) return <b>{d.fp}% / ticket</b>;
    if (!b && it.mode === "flex") return <span style={{ color: B.gray }}>Per usage</span>;
    if (!b) return "—";
    const hd = d?.hd && (parseFloat(d.da) || 0) > 0;
    if (hd) return <div><div style={{ textDecoration: "line-through", color: B.gray, fontSize: 11 }}>{fmtp(b, cur)}</div><b style={{ color: B.purple }}>{fmtp(f, cur)}</b></div>;
    return <b>{fmtp(b, cur)}</b>;
  };

  const anyDW = active.some(it => { const d = sel[it.id]; return d && ((d.hd && (parseFloat(d.da)||0) > 0) || (d.hw && d.wt)); });

  return (
    <div style={{ fontFamily: "'Segoe UI',sans-serif", background: B.bg, minHeight: "100vh" }}>
      <div className="np" style={{ background: B.card, borderBottom: "4px solid " + B.orange, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 99 }}>
        <button onClick={() => setPg("build")} style={{ ...sBtn, background: B.bg, color: B.dark, padding: "8px 18px", fontSize: 13 }}>{t.editor}</button>
        <button onClick={() => dlPrint(t.quotation)} style={{ ...sBtn, background: B.orange, color: "#fff", padding: "8px 24px", fontSize: 13 }}>{t.download}</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px", overflow: "auto" }}>
        <div ref={ref} style={{ width: "100%", maxWidth: A4W, background: "#fff", boxShadow: "0 4px 30px rgba(0,0,0,.12)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

          {/* Header — same style as Proposal */}
          <div style={{ background: "#F5F0EB", padding: prevPx, position: "relative", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: -30, right: -30, width: isMobile ? 80 : 140, height: isMobile ? 80 : 140, borderRadius: "50%", background: B.orange + "22" }} />
            <div style={{ position: "absolute", bottom: -24, right: 60, width: isMobile ? 50 : 90, height: isMobile ? 50 : 90, borderRadius: "50%", background: B.green + "15" }} />
            <div style={{ position: "absolute", top: 10, right: isMobile ? 100 : 180, width: 48, height: 48, borderRadius: 24, background: B.pink + "18" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
              <div><SeatLogo h={isMobile ? 48 : 156} /></div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: B.orange, fontSize: isMobile ? 18 : 28, fontWeight: 800, fontFamily: "Georgia,serif", letterSpacing: 1 }}>{ot("quotation").toUpperCase()}</div>
                <div style={{ color: "#aaa", fontSize: 11, marginTop: 4 }}>{today} · {cur} · {ft === "b" ? t.bundle : t.regular}</div>
                <div style={{ color: "#c8c2b9", fontSize: 10, marginTop: 2 }}>{ot("operatedBy")}</div>
              </div>
            </div>
          </div>

          {/* Body — ALL EXISTING LOGIC UNCHANGED except fmtn→fmt fix */}
          <div style={{ padding: "14px 36px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 24, marginBottom: 10, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 3 }}>{ot("preparedFor")}</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 1 }}>{cu.name || "—"}</div>
                <div style={{ fontSize: 8, color: "#777", lineHeight: 1.4 }}>
                  {cu.addr && <div>{cu.addr}</div>}
                  {cu.country && <div>{cu.country}</div>}
                  {cu.inc && cu.inc !== cu.country && <div>Inc. {cu.inc}</div>}
                  {cu.email && <div>{cu.email}</div>}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 3 }}>{ot("preparedBy")}</div>
                <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 1 }}>SeatOS (Bookaway Ltd.)</div>
                <div style={{ fontSize: 8, color: "#777", lineHeight: 1.4 }}>
                  <div>6 HaTa'as St., Ramat Gan, 5251247</div>
                  {sp && <div style={{ fontWeight: 700, color: "#333" }}>{sp.name}</div>}
                  {sp?.email && <div>{sp.email}</div>}
                  {sp?.phone && <div>{sp.phone}</div>}
                </div>
              </div>
            </div>

            {(cu.s || cu.e) && (
              <div style={{ background: "#F5F0EB", borderRadius: 6, padding: "6px 12px", marginBottom: 8, display: "flex", gap: 20, flexShrink: 0 }}>
                <div><span style={{ fontSize: 7, color: "#999" }}>Start</span><div style={{ fontSize: 9, fontWeight: 700 }}>{cu.s || "—"}</div></div>
                <div><span style={{ fontSize: 7, color: "#999" }}>End</span><div style={{ fontSize: 9, fontWeight: 700 }}>{cu.e || "—"}</div></div>
                <div><span style={{ fontSize: 7, color: "#999" }}>Software</span><div style={{ fontSize: 9, fontWeight: 700 }}>SeatOS TMS</div></div>
              </div>
            )}

            <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 4, flexShrink: 0 }}>{ot("pricingBreakdown")}</div>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, flexShrink: 0 }}>
              <thead><tr>
                <th style={{ ...thS, fontSize: 7, padding: "4px 6px", width: 18 }}>#</th>
                <th style={{ ...thS, fontSize: 7, padding: "4px 6px" }}>Item</th>
                <th style={{ ...thS, fontSize: 7, padding: "4px 6px" }}>{ot("billing")}</th>
                <th style={{ ...thS, fontSize: 7, padding: "4px 6px", textAlign: "right" }}>Fee ({cur})</th>
              </tr></thead>
              <tbody>
                {active.map(it => { num++; const d = sel[it.id]; const ct = it.mode === "flex" && d ? ((d.ct || "amount") === "percent" ? "Per %" : "Per amount") : null; return (
                  <tr key={it.id}>
                    <td style={{ padding: "3px 6px", borderBottom: "1px solid #eee", color: "#aaa", fontSize: 8 }}>{num}</td>
                    <td style={{ padding: "3px 6px", borderBottom: "1px solid #eee" }}>
                      <span style={{ fontSize: 8, fontWeight: 700 }}>{it.name}</span>
                      {it.desc && <span style={{ fontSize: 7, color: "#999", marginLeft: 4 }}>{it.desc}</span>}
                      {ct && <span style={{ fontSize: 7, color: it.clr, fontWeight: 700, marginLeft: 4 }}>{ct}</span>}
                      {d?.qty > 1 && <span style={{ fontSize: 7, color: "#999", marginLeft: 4 }}>×{d.qty}</span>}
                      {bdg(d)}
                    </td>
                    <td style={{ padding: "3px 6px", borderBottom: "1px solid #eee", fontSize: 8 }}>{it.inv || "—"}</td>
                    <td style={{ padding: "3px 6px", borderBottom: "1px solid #eee", textAlign: "right", fontSize: 8 }}>{fc(it)}</td>
                  </tr>
                ); })}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, flexShrink: 0 }}>
              <div style={{ minWidth: 220, borderRadius: 6, overflow: "hidden", border: "1.5px solid #222" }}>
                {tots.ot > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", borderBottom: "1px solid #eee", fontSize: 9 }}><span style={{ color: "#888" }}>One-Time</span><b>{fmtp(tots.ot, cur)}</b></div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", borderBottom: "1px solid #eee", fontSize: 9 }}><span style={{ color: "#888" }}>Monthly</span><b>{fmtp(tots.mo, cur)}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", borderBottom: "1px solid #eee", fontSize: 9 }}><span style={{ color: "#888" }}>{ot("subtotal")}</span><b>{fmtp(sub, cur)}</b></div>
                {bda > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px", borderBottom: "1px solid #eee", fontSize: 9, background: B.purple + "0d" }}><span style={{ color: B.purple }}>Discount ({fmt(bdp, cur)}%)</span><b style={{ color: B.purple }}>-{fmtp(bda, cur)}</b></div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: B.orange }}><b style={{ color: "#fff", fontSize: 9 }}>{ot("grandTotal")}</b><b style={{ color: "#fff", fontSize: 11 }}>{fmtp(grand, cur)}</b></div>
              </div>
            </div>

            {anyDW && (
              <div style={{ marginBottom: 6, flexShrink: 0 }}>
                <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 3 }}>{ot("discountsWaivers")}</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{[t.item,t.original,t.discount,t.final,t.waiver].map(h => <th key={h} style={{ fontSize: 6, padding: "2px 4px", textAlign: "left", color: "#999", borderBottom: "1px solid #ddd" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {active.map(it => { const d = sel[it.id]; if (!d || (!(d.hd && (parseFloat(d.da)||0) > 0) && !(d.hw && d.wt))) return null; const b = bf(it.id), f = ff(it.id), p = parseFloat(d.dp)||0, a = parseFloat(d.da)||0; return (
                      <tr key={it.id}>{[
                        <td key="n" style={{ padding: "2px 4px", fontSize: 7, fontWeight: 600, borderBottom: "1px solid #eee" }}>{it.name}</td>,
                        <td key="o" style={{ padding: "2px 4px", fontSize: 7, borderBottom: "1px solid #eee" }}>{fmtp(b, cur)}</td>,
                        <td key="d" style={{ padding: "2px 4px", fontSize: 7, borderBottom: "1px solid #eee", color: B.purple }}>{d.hd && a > 0 ? `${p}% = ${fmtp(a, cur)}` : "—"}</td>,
                        <td key="f" style={{ padding: "2px 4px", fontSize: 7, fontWeight: 700, borderBottom: "1px solid #eee" }}>{d.hd && a > 0 ? fmtp(f, cur) : fmtp(b, cur)}</td>,
                        <td key="w" style={{ padding: "2px 4px", fontSize: 7, borderBottom: "1px solid #eee", color: B.pink }}>{d.hw && d.wt ? d.wt : "—"}</td>
                      ]}</tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ fontSize: 7, color: "#aaa", lineHeight: 1.4, borderTop: "1px solid #eee", paddingTop: 6, marginBottom: 6, flexShrink: 0 }}>{ot("allFees")} {cur}. {ot("valid30")} {ft === "b" ? t.bundle : t.regular} pricing.</div>

            {stOn && stTxt && (
              <div style={{ marginBottom: 6, flexShrink: 0 }}>
                <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 3 }}>{ot("notes")}</div>
                <div style={{ background: "#F5F0EB", borderRadius: 6, padding: "6px 12px", fontSize: 7, lineHeight: 1.5, color: "#555" }}>{stTxt}</div>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <div style={{ borderTop: "1.5px solid #222", paddingTop: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 7, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: B.orange, marginBottom: 8 }}>{ot("acceptance")}</div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: "#888", marginBottom: 14 }}>Customer</div>
                  <div style={{ borderBottom: "1px solid #222", height: 14, marginBottom: 2 }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 7, color: "#aaa" }}>{ot("nameTitle")}</span><span style={{ fontSize: 7, color: "#aaa" }}>{ot("date")}</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 8, color: "#888", marginBottom: 14 }}>SeatOS</div>
                  <div style={{ borderBottom: "1px solid #222", height: 14, marginBottom: 2 }} />
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 7, color: "#aaa" }}>{sp ? sp.name : "—"}</span><span style={{ fontSize: 7, color: "#aaa" }}>{ot("date")}</span></div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8, textAlign: "center", fontSize: 6, color: "#ccc", flexShrink: 0 }}>
              SeatOS · Bookaway Ltd. · 6 HaTa'as St., Ramat Gan{sp?.email ? " · " + sp.email : ""}{sp?.phone ? " · " + sp.phone : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
