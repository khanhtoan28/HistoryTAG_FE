import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { 
  FiUser, 
  FiPhone, 
  FiMapPin, 
  FiMail, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiClock, 
  FiFileText, 
  FiSettings, 
  FiPlus, 
  FiPhoneCall, 
  FiSend,
  FiArrowLeft,
  FiCalendar,
  FiShield,
  FiTool,
  FiRefreshCw,
  FiExternalLink
} from "react-icons/fi";

// ===================== MOCK DATA =====================
interface Contact {
  id: number;
  name: string;
  role: string;
  roleType: "it" | "accountant" | "nurse";
  phone?: string;
  email?: string;
}

interface Contract {
  id: string;
  code: string;
  type: "Bảo trì (Maintenance)" | "Bảo hành (Warranty)";
  year: number;
  value: string;
  status: "SAP_HET_HAN" | "DA_GIA_HAN" | "HET_HAN" | "DANG_HOAT_DONG";
  linkedContract?: string;
}

interface Ticket {
  id: string;
  issue: string;
  priority: "Cao" | "Trung bình" | "Thấp";
  slaLeft: string;
  pic: string;
  status: "DANG_XU_LY" | "QUA_SLA" | "HOAN_THANH";
}

interface CareHistory {
  id: number;
  date: string;
  timeAgo: string;
  type: "call" | "email" | "visit";
  title: string;
  description: string;
}

interface HospitalDetail {
  id: number;
  name: string;
  code: string;
  address: string;
  contacts: Contact[];
  servicePack: string;
  revenue: string;
  yearsOfService: number;
  kioskCount: number;
  status: "DANG_BAO_HANH" | "SAP_HET_HAN" | "HET_HAN" | "DA_GIA_HAN";
  expiryDate: string;
  daysLeft: number;
  contracts: Contract[];
  tickets: Ticket[];
  careHistory: CareHistory[];
  timeline: {
    warranty: { year: number; completed: boolean };
    maintenance: { year: number; completed: boolean };
    renewal: { year: number; completed: boolean };
  };
  dashboardStats: {
    hospitalsExpiringSoon: number;
    renewalProgress: number;
  };
}

// Mock data theo đúng ảnh
const hospitalDetail: HospitalDetail = {
  id: 1,
  name: "Bệnh Viện Đa Khoa Tâm Anh",
  code: "TA-HCM-2024",
  address: "2B, Phổ Quang, P. 2, Q. Tân Bình, TP.HCM",
  contacts: [
    { id: 1, name: "Dương Minh (IT)", role: "IT Manager", roleType: "it", phone: "0901234567" },
    { id: 2, name: "Trần Thu (Kế toán)", role: "Accountant", roleType: "accountant", phone: "0901234568" },
    { id: 3, name: "Lê Hồng (Điều dưỡng trưởng)", role: "Head Nurse", roleType: "nurse", phone: "0901234569" }
  ],
  servicePack: "PREMIUM PLAN",
  revenue: "2.4 tỷ VNĐ",
  yearsOfService: 5,
  kioskCount: 24,
  status: "DANG_BAO_HANH",
  expiryDate: "15/10/2025",
  daysLeft: 29,
  contracts: [
    {
      id: "1",
      code: "HD-2025-001",
      type: "Bảo trì (Maintenance)",
      year: 2025,
      value: "450.000.000đ",
      status: "SAP_HET_HAN",
      linkedContract: "HD-2024-002"
    },
    {
      id: "2", 
      code: "HD-2024-002",
      type: "Bảo trì (Maintenance)",
      year: 2024,
      value: "420.000.000đ",
      status: "DA_GIA_HAN",
      linkedContract: "HD-2025-001"
    },
    {
      id: "3",
      code: "HD-2025-001",
      type: "Bảo hành (Warranty)",
      year: 2025,
      value: "Đã (Kèm máy)",
      status: "HET_HAN"
    }
  ],
  tickets: [
    {
      id: "#TK-8821",
      issue: "Kiosk #04 mất kết nối máy in",
      priority: "Cao",
      slaLeft: "45p",
      pic: "Nguyễn Văn A",
      status: "DANG_XU_LY"
    },
    {
      id: "#TK-8810",
      issue: "Màn hình cảm ứng bị đơ",
      priority: "Trung bình",
      slaLeft: "Quá hạn",
      pic: "Trần Thị B",
      status: "QUA_SLA"
    }
  ],
  careHistory: [
    {
      id: 1,
      date: "09:00, 18/09/2025",
      timeAgo: "Vừa xong",
      type: "call",
      title: "Gọi điện chăm sóc định kỳ",
      description: "Khách hàng yêu cầu báo giá nâng cấp thêm 5 Kiosk mới cho khu vực tầng 4. Nhân viên kinh doanh đã ghi nhận."
    },
    {
      id: 2,
      date: "09:30, 17/09/2025",
      timeAgo: "Hôm qua",
      type: "email",
      title: "Gửi email nhắc gia hạn",
      description: "Đã gửi thư mời gia hạn kèm bảng giá ưu đãi năm 2025. Chờ phản hồi từ phòng tài toán."
    }
  ],
  timeline: {
    warranty: { year: 2023, completed: true },
    maintenance: { year: 2024, completed: true },
    renewal: { year: 2025, completed: false }
  },
  dashboardStats: {
    hospitalsExpiringSoon: 3,
    renewalProgress: 70
  }
};

// ===================== HELPER FUNCTIONS =====================
const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor?: string }> = {
  SAP_HET_HAN: { label: "Sắp hết hạn", bgColor: "bg-amber-100", textColor: "text-amber-700", borderColor: "border-amber-300" },
  DA_GIA_HAN: { label: "Đã gia hạn", bgColor: "bg-green-100", textColor: "text-green-700", borderColor: "border-green-300" },
  HET_HAN: { label: "Hết hạn", bgColor: "bg-gray-100", textColor: "text-gray-600", borderColor: "border-gray-300" },
  DANG_HOAT_DONG: { label: "Đang hoạt động", bgColor: "bg-blue-100", textColor: "text-blue-700", borderColor: "border-blue-300" },
  DANG_BAO_HANH: { label: "Đang bảo hành", bgColor: "bg-green-100", textColor: "text-green-700", borderColor: "border-green-300" },
  DANG_XU_LY: { label: "Đang xử lý", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  QUA_SLA: { label: "Quá SLA", bgColor: "bg-red-100", textColor: "text-red-700" },
  HOAN_THANH: { label: "Hoàn thành", bgColor: "bg-green-100", textColor: "text-green-700" }
};

const priorityConfig: Record<string, { bgColor: string; textColor: string }> = {
  "Cao": { bgColor: "bg-red-100", textColor: "text-red-700" },
  "Trung bình": { bgColor: "bg-amber-100", textColor: "text-amber-700" },
  "Thấp": { bgColor: "bg-green-100", textColor: "text-green-700" }
};

const getRoleIcon = (roleType: Contact["roleType"]) => {
  switch (roleType) {
    case "it": return <FiSettings className="h-4 w-4 text-blue-500" />;
    case "accountant": return <FiFileText className="h-4 w-4 text-gray-500" />;
    case "nurse": return <FiUser className="h-4 w-4 text-gray-500" />;
    default: return <FiUser className="h-4 w-4 text-gray-500" />;
  }
};

// ===================== TABS CONFIG =====================
type TabKey = "lich_su_cham_soc" | "hop_dong" | "gia_han" | "ticket" | "co_hoi_ban_them";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "lich_su_cham_soc", label: "Lịch sử chăm sóc" },
  { key: "hop_dong", label: "Hợp đồng" },
  { key: "gia_han", label: "Gia hạn" },
  { key: "ticket", label: "Ticket (Sự cố)" },
  { key: "co_hoi_ban_them", label: "Cơ hội bán thêm" }
];

// ===================== COMPONENT =====================
export default function HospitalDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("hop_dong");

  // In real app, fetch hospital by id
  const hospital = hospitalDetail;

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <>
      <PageMeta title={`Chi tiết ${hospital.name}`} description="Chi tiết bệnh viện chăm sóc khách hàng" />
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* ========== FULL WIDTH TOP HEADER ========== */}
        <div className="px-4 lg:px-6 py-4">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="mb-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <FiArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách</span>
          </button>
          
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Left: Name & Badge */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold">
                  H
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{hospital.name}</h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-300">
                      <FiAlertTriangle className="h-3 w-3" />
                      SẮP HẾT HẠN ({hospital.daysLeft} NGÀY)
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Mã khách hàng: {hospital.code}</p>
                </div>
              </div>

              {/* Right: Quick Stats + Action Button */}
              <div className="flex flex-wrap items-center gap-6">
                {/* Số Kiosk */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider dark:text-gray-400">Số Kiosk</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{hospital.kioskCount} Thiết bị</p>
                </div>

                {/* Trạng thái */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider dark:text-gray-400">Trạng thái</p>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[hospital.status]?.bgColor} ${statusConfig[hospital.status]?.textColor}`}>
                    {statusConfig[hospital.status]?.label}
                  </span>
                </div>

                {/* Ngày hết hạn */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wider dark:text-gray-400">Ngày hết hạn</p>
                  <p className="text-lg font-bold text-red-600">{hospital.expiryDate}</p>
                </div>

                {/* Action Button */}
                <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition shrink-0">
                  <FiRefreshCw className="h-4 w-4" />
                  Gia hạn Hợp đồng
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========== TWO COLUMN LAYOUT ========== */}
        <div className="px-4 pb-6 lg:px-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* ========== LEFT SIDEBAR (30%) ========== */}
            <div className="w-full lg:w-[20%] space-y-3">
              
              {/* Profile Card */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Top Banner with Gradient */}
                <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
                
                {/* Content Area */}
                <div className="relative px-4 pb-4">
                  {/* Logo - Overlapping Banner and Content */}
                  <div className="flex justify-center -mt-12 mb-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-600 text-2xl font-bold shadow-md">
                      H
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-center text-base font-bold text-gray-900 mb-3">Hồ sơ Bệnh viện</h2>

                  {/* Address */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Địa chỉ</p>
                    <p className="flex items-start gap-1.5 text-sm text-gray-700 leading-relaxed">
                      <FiMapPin className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                      <span>{hospital.address}</span>
                    </p>
                  </div>
                  <hr className="my-4 border-gray-200 dark:border-gray-700" />

                  {/* Key Contacts */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Nhân sự phụ trách (Key Contact)
                    </h3>
                    <div className="space-y-2">
                      {hospital.contacts.map((contact) => (
                        <div key={contact.id} className="flex items-center gap-2 text-sm">
                          <div className="shrink-0">{getRoleIcon(contact.roleType)}</div>
                          <span className="text-gray-700">{contact.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <hr className="my-4 border-gray-200 dark:border-gray-700" />
                  {/* Service Pack */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Gói dịch vụ
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-600">
                      {hospital.servicePack}
                    </span>
                  </div>

                  {/* Revenue Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Doanh thu</p>
                      <p className="text-base font-bold text-emerald-500">{hospital.revenue}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Thâm niên</p>
                      <p className="text-base font-bold text-gray-900">{hospital.yearsOfService} năm</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard CSKH Widget */}
              
            </div>

            {/* ========== RIGHT MAIN CONTENT (70%) ========== */}
            <div className="w-full lg:w-[80%]">
              
              {/* Navigation Tabs Card */}
              <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {/* Tab Headers */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`shrink-0 px-5 py-3.5 text-sm font-medium transition border-b-2 ${
                          activeTab === tab.key
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="p-5">
                  {activeTab === "hop_dong" && (
                    <div className="space-y-6">
                      
                      {/* Section A: Contracts Table */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            Danh sách hợp đồng & Timeline dịch vụ
                          </h3>
                          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition">
                            <FiPlus className="h-3.5 w-3.5" />
                            Tạo hợp đồng mới
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Mã Hợp Đồng</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Loại Hợp Đồng</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Năm</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Giá Trị</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Trạng Thái</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Liên Kết</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {hospital.contracts.map((contract) => (
                                <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="py-3 px-3">
                                    <span className="text-sm font-medium text-blue-600">{contract.code}</span>
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                                    {contract.type}
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                                    {contract.year}
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                                    {contract.value}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[contract.status]?.bgColor} ${statusConfig[contract.status]?.textColor}`}>
                                      {statusConfig[contract.status]?.label}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    {contract.linkedContract ? (
                                      <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                        <FiExternalLink className="h-3.5 w-3.5" />
                                        {contract.linkedContract}
                                      </button>
                                    ) : (
                                      <span className="text-sm text-gray-400">Gốc</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section B: Lifecycle Timeline */}
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
                          Quy trình vòng đời (Timeline)
                        </h3>
                        
                        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                          {/* Line connecting steps */}
                          <div className="absolute top-6 left-[15%] right-[15%] h-0.5 bg-blue-200 dark:bg-blue-800 z-0"></div>
                          
                          {/* Warranty Step */}
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                              hospital.timeline.warranty.completed 
                                ? "bg-green-500 border-green-500 text-white" 
                                : "bg-white border-gray-300 text-gray-400 dark:bg-gray-800"
                            }`}>
                              {hospital.timeline.warranty.completed ? (
                                <FiCheckCircle className="h-6 w-6" />
                              ) : (
                                <FiShield className="h-5 w-5" />
                              )}
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Warranty</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{hospital.timeline.warranty.year}</p>
                          </div>

                          {/* Maintenance Step */}
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                              hospital.timeline.maintenance.completed 
                                ? "bg-blue-500 border-blue-500 text-white" 
                                : "bg-white border-gray-300 text-gray-400 dark:bg-gray-800"
                            }`}>
                              {hospital.timeline.maintenance.completed ? (
                                <FiTool className="h-5 w-5" />
                              ) : (
                                <FiTool className="h-5 w-5" />
                              )}
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Maintenance</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{hospital.timeline.maintenance.year}</p>
                          </div>

                          {/* Renewal Step */}
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                              hospital.timeline.renewal.completed 
                                ? "bg-green-500 border-green-500 text-white" 
                                : "bg-white border-blue-400 text-blue-500 dark:bg-gray-800"
                            }`}>
                              <FiRefreshCw className="h-5 w-5" />
                            </div>
                            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Renewal</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{hospital.timeline.renewal.year}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section C: Recent Incidents */}
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                          Sự cố Kiosk gần đây
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Ticket ID</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Vấn đề</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Ưu tiên</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">SLA còn lại</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Phụ trách</th>
                                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {hospital.tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                  <td className="py-3 px-3">
                                    <span className="text-sm font-medium text-blue-600">{ticket.id}</span>
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                                    {ticket.issue}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityConfig[ticket.priority]?.bgColor} ${priorityConfig[ticket.priority]?.textColor}`}>
                                      {ticket.priority}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                                      <FiClock className="h-4 w-4 text-gray-400" />
                                      {ticket.slaLeft}
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                                    {ticket.pic}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[ticket.status]?.bgColor} ${statusConfig[ticket.status]?.textColor}`}>
                                      {statusConfig[ticket.status]?.label}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section D: Care History (Vertical Timeline) */}
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                          Lịch sử Chăm sóc
                        </h3>

                        <div className="relative">
                          {/* Vertical Line */}
                          <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-blue-200 dark:bg-blue-800"></div>
                          
                          <div className="space-y-6">
                            {hospital.careHistory.map((item, index) => (
                              <div key={item.id} className="relative flex gap-4">
                                {/* Icon */}
                                <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                                  index === 0 
                                    ? "bg-blue-500 border-blue-500 text-white" 
                                    : "bg-white border-gray-300 text-gray-500 dark:bg-gray-800"
                                }`}>
                                  {item.type === "call" ? (
                                    <FiPhoneCall className="h-4 w-4" />
                                  ) : item.type === "email" ? (
                                    <FiSend className="h-4 w-4" />
                                  ) : (
                                    <FiUser className="h-4 w-4" />
                                  )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      index === 0 
                                        ? "bg-green-100 text-green-700" 
                                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                    }`}>
                                      {item.timeAgo}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">- {item.date}</span>
                                  </div>
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                    {item.type === "call" && <FiPhoneCall className="h-4 w-4 inline-block mr-1.5 text-blue-600" />}
                                    {item.type === "email" && <FiMail className="h-4 w-4 inline-block mr-1.5 text-purple-600" />}
                                    {item.title}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "lich_su_cham_soc" && (
                    <div className="text-center py-12">
                      <FiClock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nội dung tab Lịch sử chăm sóc</p>
                    </div>
                  )}

                  {activeTab === "gia_han" && (
                    <div className="text-center py-12">
                      <FiRefreshCw className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nội dung tab Gia hạn</p>
                    </div>
                  )}

                  {activeTab === "ticket" && (
                    <div className="text-center py-12">
                      <FiAlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nội dung tab Ticket (Sự cố)</p>
                    </div>
                  )}

                  {activeTab === "co_hoi_ban_them" && (
                    <div className="text-center py-12">
                      <FiPlus className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Nội dung tab Cơ hội bán thêm</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
