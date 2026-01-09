import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { 
  FiSearch, 
  FiDownload, 
  FiPlus, 
  FiEye, 
  FiFileText, 
  FiMoreHorizontal,
  FiChevronRight,
  FiChevronDown,
  FiInfo
} from "react-icons/fi";

// ===================== MOCK DATA =====================
interface Hospital {
  id: number;
  name: string;
  status: "sap_het_han" | "qua_han" | "da_gia_han" | "dang_hoat_dong" | "dang_bao_tri" | "mat_khach";
  expiryDate: string;
  daysLeft: number;
  kioskCount: number;
  tickets: { pending: number; open: number };
  pic: { name: string; avatar: string };
  contractValue: number;
}

const hospitals: Hospital[] = [
  {
    id: 1,
    name: "Bệnh viện Đa Khoa Tâm Anh",
    status: "sap_het_han",
    expiryDate: "22/01/2026",
    daysLeft: 15,
    kioskCount: 12,
    tickets: { pending: 5, open: 2 },
    pic: { name: "Nguyễn Văn A", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    contractValue: 450000000,
  },
  {
    id: 2,
    name: "Bệnh viện Chợ Rẫy",
    status: "qua_han",
    expiryDate: "03/12/2025",
    daysLeft: -34,
    kioskCount: 25,
    tickets: { pending: 8, open: 3 },
    pic: { name: "Trần Thị B", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    contractValue: 820000000,
  },
  {
    id: 3,
    name: "Bệnh viện Nhi Đồng 1",
    status: "da_gia_han",
    expiryDate: "18/08/2026",
    daysLeft: 224,
    kioskCount: 8,
    tickets: { pending: 0, open: 1 },
    pic: { name: "Lê Văn C", avatar: "https://randomuser.me/api/portraits/men/67.jpg" },
    contractValue: 320000000,
  },
  {
    id: 4,
    name: "Bệnh viện Việt Pháp",
    status: "dang_hoat_dong",
    expiryDate: "14/06/2026",
    daysLeft: 158,
    kioskCount: 15,
    tickets: { pending: 2, open: 0 },
    pic: { name: "Phạm Thị D", avatar: "https://randomuser.me/api/portraits/women/28.jpg" },
    contractValue: 580000000,
  },
  {
    id: 5,
    name: "Bệnh viện 115",
    status: "dang_bao_tri",
    expiryDate: "30/03/2026",
    daysLeft: 82,
    kioskCount: 10,
    tickets: { pending: 1, open: 4 },
    pic: { name: "Hoàng Văn E", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
    contractValue: 290000000,
  },
];

// ===================== HELPER FUNCTIONS =====================
const statusConfig: Record<Hospital["status"], { label: string; bgColor: string; textColor: string }> = {
  sap_het_han: { label: "Sắp hết hạn", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  qua_han: { label: "Quá hạn", bgColor: "bg-red-100", textColor: "text-red-700" },
  da_gia_han: { label: "Đã gia hạn", bgColor: "bg-green-100", textColor: "text-green-700" },
  dang_hoat_dong: { label: "Đang hoạt động", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  dang_bao_tri: { label: "Đang bảo trì", bgColor: "bg-purple-100", textColor: "text-purple-700" },
  mat_khach: { label: "Mất khách", bgColor: "bg-gray-100", textColor: "text-gray-700" },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ===================== TAB CONFIG =====================
type TabKey = "all" | "dang_bao_tri" | "sap_het_han" | "qua_han" | "da_gia_han" | "mat_khach";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "all", label: "Tất cả" },
  { key: "dang_bao_tri", label: "Đang bảo trì" },
  { key: "sap_het_han", label: "Sắp hết hạn" },
  { key: "qua_han", label: "Quá hạn" },
  { key: "da_gia_han", label: "Đã gia hạn" },
  { key: "mat_khach", label: "Mất khách" },
];

// ===================== COMPONENT =====================
export default function HospitalCareList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [picFilter, setPicFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  // Count hospitals per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: hospitals.length,
      dang_bao_tri: 0,
      sap_het_han: 0,
      qua_han: 0,
      da_gia_han: 0,
      mat_khach: 0,
    };
    hospitals.forEach((h) => {
      counts[h.status] = (counts[h.status] || 0) + 1;
    });
    return counts;
  }, []);

  // Filter hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      // Tab filter
      if (activeTab !== "all" && h.status !== activeTab) return false;
      // Search filter
      if (searchTerm && !h.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      // Status dropdown filter
      if (statusFilter && h.status !== statusFilter) return false;
      // PIC filter
      if (picFilter && !h.pic.name.toLowerCase().includes(picFilter.toLowerCase())) return false;
      return true;
    });
  }, [activeTab, searchTerm, statusFilter, picFilter]);

  // Get row background based on status
  const getRowBg = (status: Hospital["status"]): string => {
    switch (status) {
      case "sap_het_han":
        return "bg-amber-50";
      case "qua_han":
        return "bg-red-50";
      default:
        return "bg-white";
    }
  };

  return (
    <>
      <PageMeta title="Chăm sóc khách hàng | Bệnh viện" description="Quản lý chăm sóc khách hàng bệnh viện" />
      
      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">Danh sách các bệnh viện cần chăm sóc</h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <FiInfo className="h-4 w-4 shrink-0" />
                Theo dõi tình trạng hợp đồng, bảo trì và gia hạn của từng bệnh viện
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                <FiDownload className="h-4 w-4" />
                Tải danh sách
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700">
                <FiPlus className="h-4 w-4" />
                Thêm bệnh viện
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative w-full lg:max-w-sm">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên bệnh viện, SĐT, mã HĐ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>

            {/* Dropdowns Container */}
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
              {/* Trạng thái dịch vụ */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  <option value="">Trạng thái dịch vụ</option>
                  {Object.entries(statusConfig).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Nhân viên phụ trách */}
              <div className="relative">
                <select
                  value={picFilter}
                  onChange={(e) => setPicFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  <option value="">Nhân viên phụ trách</option>
                  {[...new Set(hospitals.map((h) => h.pic.name))].map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              {/* Nhóm bệnh viện */}
              
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {statusCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Data Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Tên bệnh viện
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Trạng thái
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngày hết hạn
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Còn lại
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Số Kiosk
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Tickets
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Phụ trách
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Giá trị HĐ
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-gray-500 dark:text-gray-400">
                      Không tìm thấy bệnh viện nào
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((hospital) => {
                    const { label, bgColor, textColor } = statusConfig[hospital.status];
                    return (
                      <tr key={hospital.id} className={`${getRowBg(hospital.status)} transition hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                        {/* Tên bệnh viện */}
                        <td className="min-w-[180px] px-3 py-3">
                          <button 
                            onClick={() => {
                              const basePath = location.pathname.includes('/superadmin') ? '/superadmin' : '/admin';
                              navigate(`${basePath}/hospital-care/${hospital.id}`);
                            }}
                            className="flex items-center gap-1 text-left text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                          >
                            {hospital.name}
                            <FiChevronRight className="h-4 w-4 shrink-0" />
                          </button>
                        </td>

                        {/* Trạng thái */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgColor} ${textColor}`}
                          >
                            {label}
                          </span>
                        </td>

                        {/* Ngày hết hạn */}
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {hospital.expiryDate}
                        </td>

                        {/* Còn lại */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={`text-sm font-semibold ${
                              hospital.daysLeft < 0 ? "text-red-600" : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {hospital.daysLeft < 0 ? hospital.daysLeft : `${hospital.daysLeft}`} ngày
                          </span>
                        </td>

                        {/* Số Kiosk */}
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {hospital.kioskCount}
                        </td>

                        {/* Tickets */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-1">
                            {hospital.tickets.pending > 0 && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                {hospital.tickets.pending} treo
                              </span>
                            )}
                            {hospital.tickets.open > 0 && (
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {hospital.tickets.open} mở
                              </span>
                            )}
                            {hospital.tickets.pending === 0 && hospital.tickets.open === 0 && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>

                        {/* Phụ trách */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={hospital.pic.avatar}
                              alt={hospital.pic.name}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{hospital.pic.name}</span>
                          </div>
                        </td>

                        {/* Giá trị HĐ */}
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(hospital.contractValue)}
                        </td>

                        {/* Thao tác */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              title="Xem chi tiết"
                              onClick={() => {
                                const basePath = location.pathname.includes('/superadmin') ? '/superadmin' : '/admin';
                                navigate(`${basePath}/hospital-care/${hospital.id}`);
                              }}
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-blue-100 hover:text-blue-600"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button
                              title="Hợp đồng"
                              onClick={() => {
                                const basePath = location.pathname.includes('/superadmin') ? '/superadmin' : '/admin';
                                navigate(`${basePath}/hospital-care/${hospital.id}`);
                              }}
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-green-100 hover:text-green-600"
                            >
                              <FiFileText className="h-4 w-4" />
                            </button>
                            <button
                              title="Thêm"
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-200"
                            >
                              <FiMoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50 sm:flex-row">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Hiển thị <span className="font-medium">{filteredHospitals.length}</span> trong tổng số{" "}
              <span className="font-medium">{hospitals.length}</span> bệnh viện
            </p>
            <div className="flex items-center gap-1">
              <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Trước
              </button>
              <button className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white">1</button>
              <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                2
              </button>
              <button className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
