import { Health, Language } from '../../domain/workspace/entities/workspace.entities';
import { FeatureKey } from '../../domain/workspace/services/playbook.rules';

export interface LanguagePhrases {
  readonly warm: string;
  readonly warmSign: string;
  readonly signs: readonly [string, string, string];
  readonly meet: string;
  readonly directMeet: string;
  readonly recoHead: string;
  readonly close: string;
  readonly direct: string;
}

export interface GenericTemplate {
  readonly subject: string;
  readonly greet: (name: string) => string;
  readonly intro: string;
  readonly points: Readonly<Record<Health, readonly string[]>>;
  readonly sign: string;
}

export const PHRASES: Readonly<Record<Language, LanguagePhrases>> = {
  en: {
    warm: 'I hope your week is going well.',
    warmSign: 'Warm regards,\nChris',
    signs: ['Best regards,\nChris', 'Best,\nChris', 'Thanks,\nChris'],
    meet: "Because this is a priority for us, we'd like to book a 20-minute call this week to go through your data together and agree a recovery plan. You can switch on the features above from your account settings before we speak.",
    directMeet: 'Please reply with a time that works this week for a 20-minute call.',
    recoHead: 'Features we recommend switching on:',
    close: "You can switch these on from your account settings, or just reply to this email and we'll enable them for you.",
    direct: "Reply “yes” and we'll switch these on for you.",
  },
  th: {
    warm: 'หวังว่าสัปดาห์นี้ของคุณเป็นไปได้ด้วยดี',
    warmSign: 'ด้วยความปรารถนาดี\nChris',
    signs: ['ขอแสดงความนับถือ\nChris', 'ด้วยความเคารพ\nChris', 'ขอบคุณ\nChris'],
    meet: 'เนื่องจากเป็นเรื่องที่เราให้ความสำคัญ เราอยากนัดคุยประมาณ 20 นาทีในสัปดาห์นี้ เพื่อดูข้อมูลร่วมกันและวางแผนแก้ไข ระหว่างนี้คุณสามารถเปิดใช้ฟีเจอร์ข้างต้นได้จากการตั้งค่าบัญชี',
    directMeet: 'รบกวนแจ้งเวลาที่สะดวกในสัปดาห์นี้สำหรับการคุยประมาณ 20 นาที',
    recoHead: 'ฟีเจอร์ที่เราแนะนำให้เปิดใช้:',
    close: 'คุณสามารถเปิดใช้งานได้จากการตั้งค่าบัญชี หรือตอบกลับอีเมลนี้ แล้วเราจะเปิดให้',
    direct: 'ตอบกลับว่า “ตกลง” แล้วเราจะเปิดให้',
  },
  vi: {
    warm: 'Chúc bạn một tuần làm việc thuận lợi.',
    warmSign: 'Thân mến,\nChris',
    signs: ['Trân trọng,\nChris', 'Kính chào,\nChris', 'Cảm ơn bạn,\nChris'],
    meet: 'Vì đây là ưu tiên của chúng tôi, chúng tôi muốn hẹn một buổi trao đổi 20 phút trong tuần này để cùng xem dữ liệu và thống nhất kế hoạch khắc phục. Bạn có thể bật các tính năng trên trong phần cài đặt tài khoản trước buổi trao đổi.',
    directMeet: 'Xin bạn cho biết thời gian phù hợp trong tuần này cho buổi trao đổi 20 phút.',
    recoHead: 'Các tính năng chúng tôi khuyến nghị bật:',
    close: 'Bạn có thể bật các tính năng này trong phần cài đặt tài khoản, hoặc chỉ cần trả lời email này và chúng tôi sẽ bật giúp bạn.',
    direct: 'Chỉ cần trả lời “đồng ý”, chúng tôi sẽ bật giúp bạn.',
  },
  id: {
    warm: 'Semoga minggu Anda berjalan lancar.',
    warmSign: 'Salam hangat,\nChris',
    signs: ['Hormat kami,\nChris', 'Salam,\nChris', 'Terima kasih,\nChris'],
    meet: 'Karena ini menjadi prioritas kami, kami ingin menjadwalkan sesi 20 menit minggu ini untuk meninjau data bersama dan menyepakati rencana pemulihan. Fitur di atas dapat diaktifkan dari pengaturan akun sebelum kita berbicara.',
    directMeet: 'Mohon informasikan waktu yang sesuai minggu ini untuk sesi 20 menit.',
    recoHead: 'Fitur yang kami sarankan untuk diaktifkan:',
    close: 'Anda dapat mengaktifkannya dari pengaturan akun, atau cukup balas email ini dan kami akan mengaktifkannya untuk Anda.',
    direct: 'Cukup balas “ya” dan kami akan mengaktifkannya.',
  },
};

export const GENERIC: Readonly<Record<Language, GenericTemplate>> = {
  en: {
    subject: 'Getting more from seatOS',
    greet: (n) => `Hello ${n} team,`,
    intro: 'We reviewed your seatOS account as part of our weekly customer review.',
    points: {
      Unhealthy: ['Weekly usage across your team looks lower than we would like to see.', 'A few features that fit how you work are not switched on yet.'],
      Adopted: ['Your team uses seatOS regularly, and there is room to get more from it.', 'A few features that fit how you work are not switched on yet.'],
      Healthy: ['Your team is getting strong value from seatOS.'],
    },
    sign: 'Best regards,\nChris',
  },
  th: {
    subject: 'ใช้ประโยชน์จาก seatOS ให้มากขึ้น',
    greet: (n) => `เรียนทีมงาน ${n},`,
    intro: 'ทีม seatOS ได้ตรวจสอบบัญชีของคุณตามรอบทบทวนลูกค้าประจำสัปดาห์',
    points: {
      Unhealthy: ['การใช้งานรายสัปดาห์ของทีมคุณดูต่ำกว่าที่เราอยากเห็น', 'ยังมีฟีเจอร์ที่เหมาะกับการทำงานของคุณซึ่งยังไม่ได้เปิดใช้'],
      Adopted: ['ทีมของคุณใช้ seatOS อย่างสม่ำเสมอ และยังมีโอกาสใช้ประโยชน์ได้มากขึ้น', 'ยังมีฟีเจอร์ที่เหมาะกับการทำงานของคุณซึ่งยังไม่ได้เปิดใช้'],
      Healthy: ['ทีมของคุณได้รับประโยชน์จาก seatOS เป็นอย่างดี'],
    },
    sign: 'ขอแสดงความนับถือ\nChris',
  },
  vi: {
    subject: 'Khai thác seatOS hiệu quả hơn',
    greet: (n) => `Kính gửi đội ngũ ${n},`,
    intro: 'Đội ngũ seatOS đã xem xét tài khoản của bạn trong đợt rà soát khách hàng hằng tuần.',
    points: {
      Unhealthy: ['Mức sử dụng hằng tuần của đội ngũ bạn có vẻ thấp hơn mức chúng tôi mong muốn.', 'Vẫn còn một số tính năng phù hợp với cách bạn làm việc nhưng chưa được bật.'],
      Adopted: ['Đội ngũ của bạn sử dụng seatOS đều đặn và vẫn còn dư địa để khai thác thêm.', 'Vẫn còn một số tính năng phù hợp với cách bạn làm việc nhưng chưa được bật.'],
      Healthy: ['Đội ngũ của bạn đang nhận được nhiều giá trị từ seatOS.'],
    },
    sign: 'Trân trọng,\nChris',
  },
  id: {
    subject: 'Manfaatkan seatOS lebih optimal',
    greet: (n) => `Yth. Tim ${n},`,
    intro: 'Tim seatOS telah meninjau akun Anda dalam tinjauan pelanggan mingguan kami.',
    points: {
      Unhealthy: ['Penggunaan mingguan tim Anda tampak lebih rendah dari yang kami harapkan.', 'Masih ada beberapa fitur yang sesuai dengan cara kerja Anda tetapi belum diaktifkan.'],
      Adopted: ['Tim Anda menggunakan seatOS secara rutin dan masih ada ruang untuk memanfaatkannya lebih jauh.', 'Masih ada beberapa fitur yang sesuai dengan cara kerja Anda tetapi belum diaktifkan.'],
      Healthy: ['Tim Anda mendapatkan nilai yang kuat dari seatOS.'],
    },
    sign: 'Hormat kami,\nChris',
  },
};

export const FEATURE_DESCRIPTIONS: Readonly<Record<Language, Readonly<Record<FeatureKey, string>>>> = {
  en: {
    RouteAlerts: 'Flags a route as soon as bookings fall against the market, so you can act within the week.',
    RoutePeer: 'Compares each route with the market to show exactly where you are losing ground.',
    AgentActivity: 'Shows which agents stopped booking, so you can re-engage them first.',
    FareIndex: 'Tracks your fares against the peer median by fare class, so you can see where any premium sits.',
    FarePricingTest: 'Lets you trial a fare change on a single fare class before rolling it out.',
    FareAlerts: 'Notifies you when your fare index moves above the level you set.',
    Bundling: 'Packages baggage, seat and meal offers into one purchase; teams using it typically see a higher attach rate.',
    Invitations: 'Invites inactive agents in bulk, the fastest way to lift weekly agent activity.',
    WeeklyReport: 'Shows which agents are active each week, so you can track adoption.',
    VolumeTrend: 'Warns you early if a dip carries into the following week.',
    ScheduledReports: 'Sends the weekly summary to your inbox automatically.',
  },
  th: {
    RouteAlerts: 'แจ้งเตือนทันทีเมื่อยอดจองบนเส้นทางใดลดลงเมื่อเทียบกับตลาด เพื่อให้คุณแก้ไขได้ภายในสัปดาห์เดียวกัน',
    RoutePeer: 'เปรียบเทียบแต่ละเส้นทางกับตลาด เพื่อดูว่าคุณเสียเปรียบตรงจุดใด',
    AgentActivity: 'แสดงเอเจนต์ที่หยุดจอง เพื่อให้คุณติดต่อกระตุ้นกลุ่มนี้ก่อน',
    FareIndex: 'ติดตามราคาของคุณเทียบกับค่ามัธยฐานของคู่เทียบแยกตามชั้นราคา เพื่อดูว่าส่วนต่างอยู่ที่ใด',
    FarePricingTest: 'ทดลองปรับราคาในชั้นราคาเดียวก่อนนำไปใช้จริงทั้งหมด',
    FareAlerts: 'แจ้งเตือนเมื่อดัชนีราคาของคุณสูงกว่าระดับที่ตั้งไว้',
    Bundling: 'รวมบริการสัมภาระ ที่นั่ง และอาหารเป็นชุดเดียว ทีมที่ใช้มักมีอัตราการขายพ่วงเพิ่มขึ้น',
    Invitations: 'เชิญเอเจนต์ที่ยังไม่ใช้งานได้ทีละหลายคน เป็นวิธีที่เร็วที่สุดในการเพิ่มการใช้งานรายสัปดาห์',
    WeeklyReport: 'แสดงเอเจนต์ที่ใช้งานในแต่ละสัปดาห์ เพื่อติดตามการนำไปใช้',
    VolumeTrend: 'เตือนล่วงหน้าหากยอดที่ลดลงต่อเนื่องไปยังสัปดาห์ถัดไป',
    ScheduledReports: 'ส่งสรุปประจำสัปดาห์ไปยังอีเมลของคุณโดยอัตโนมัติ',
  },
  vi: {
    RouteAlerts: 'Cảnh báo ngay khi lượt đặt chỗ của một đường bay giảm so với thị trường, giúp bạn xử lý ngay trong tuần.',
    RoutePeer: 'So sánh từng đường bay với thị trường để thấy chính xác bạn đang mất lợi thế ở đâu.',
    AgentActivity: 'Cho biết những đại lý đã ngừng đặt chỗ để bạn ưu tiên kích hoạt lại họ.',
    FareIndex: 'Theo dõi giá của bạn so với trung vị của các hãng cùng nhóm theo từng hạng vé để thấy mức chênh nằm ở đâu.',
    FarePricingTest: 'Cho phép thử thay đổi giá ở một hạng vé trước khi áp dụng rộng rãi.',
    FareAlerts: 'Thông báo khi chỉ số giá của bạn vượt mức đã đặt.',
    Bundling: 'Gộp dịch vụ hành lý, chỗ ngồi và suất ăn thành một gói mua; các đội sử dụng thường có tỷ lệ bán kèm cao hơn.',
    Invitations: 'Mời hàng loạt đại lý chưa hoạt động, cách nhanh nhất để tăng mức độ hoạt động hằng tuần.',
    WeeklyReport: 'Cho biết đại lý nào hoạt động mỗi tuần để bạn theo dõi mức độ áp dụng.',
    VolumeTrend: 'Cảnh báo sớm nếu mức giảm kéo dài sang tuần sau.',
    ScheduledReports: 'Tự động gửi bản tóm tắt hằng tuần vào hộp thư của bạn.',
  },
  id: {
    RouteAlerts: 'Memberi tanda begitu pemesanan di suatu rute turun dibandingkan pasar, sehingga Anda dapat bertindak dalam minggu yang sama.',
    RoutePeer: 'Membandingkan setiap rute dengan pasar untuk menunjukkan di mana persisnya Anda tertinggal.',
    AgentActivity: 'Menunjukkan agen yang berhenti memesan, sehingga Anda dapat mengaktifkan mereka kembali terlebih dahulu.',
    FareIndex: 'Melacak tarif Anda terhadap median pesaing per kelas tarif agar terlihat di mana selisihnya berada.',
    FarePricingTest: 'Memungkinkan uji coba perubahan tarif pada satu kelas tarif sebelum diterapkan menyeluruh.',
    FareAlerts: 'Memberi tahu Anda saat indeks tarif melampaui batas yang Anda tetapkan.',
    Bundling: 'Menggabungkan layanan bagasi, kursi, dan makanan dalam satu pembelian; tim yang memakainya umumnya memiliki attach rate lebih tinggi.',
    Invitations: 'Mengundang agen yang belum aktif secara massal, cara tercepat untuk meningkatkan aktivitas mingguan.',
    WeeklyReport: 'Menunjukkan agen yang aktif setiap minggu agar Anda dapat memantau adopsi.',
    VolumeTrend: 'Memperingatkan sejak dini jika penurunan berlanjut ke minggu berikutnya.',
    ScheduledReports: 'Mengirim ringkasan mingguan ke kotak masuk Anda secara otomatis.',
  },
};
