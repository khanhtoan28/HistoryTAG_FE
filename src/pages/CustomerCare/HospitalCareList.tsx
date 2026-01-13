import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
import AddHospitalToCareForm, { AddHospitalToCareFormData } from "./Form/AddHospitalToCareForm";
import HospitalDetailView from "./View/HospitalDetailView";
import { 
  FiSearch, 
  FiDownload, 
  FiPlus, 
  FiEye, 
  FiFileText, 
  FiChevronRight,
  FiChevronDown,
  FiInfo,
  FiEdit3,
  FiCalendar,
  FiUser,
  FiTrash2,
  FiX
} from "react-icons/fi";
import { 
  getAllCustomerCares, 
  deleteCustomerCare, 
  getCustomerCareById,
  CustomerCareResponseDTO 
} from "../../api/customerCare.api";
import { getMaintainContracts } from "../../api/maintain.api";

// ===================== TYPES =====================
interface Contract {
  id: string;
  code: string;
  type: "Bảo trì (Maintenance)" | "Bảo hành (Warranty)";
  year: number;
  value: string;
  status: "SAP_HET_HAN" | "DA_GIA_HAN" | "HET_HAN" | "DANG_HOAT_DONG";
  expiryDate?: string;
  daysLeft?: number;
}

interface Hospital {
  id: number;
  careId: number; // ID của care task
  name: string;
  status: "sap_het_han" | "qua_han" | "da_gia_han" | "dang_hoat_dong" | "dang_bao_tri" | "mat_khach";
  priority: "HIGH" | "MEDIUM" | "LOW";
  expiryDate: string;
  daysLeft: number;
  kioskCount: number;
  tickets: { pending: number; open: number };
  pic: { name: string; avatar: string; id?: number };
  contractValue: number;
  lastContactDate: string | null;
  lastContactRelative: string | null;
  createdDate?: string; // Ngày thêm
  createdBy?: string; // Người thêm
  createdById?: number; // ID người thêm
  targetDate?: string; // Ngày mục tiêu
  contracts?: Contract[]; // Thêm contracts để tính trạng thái tự động
  isMaintenance?: boolean; // Flag cho trạng thái "Đang bảo trì"
  isLostCustomer?: boolean; // Flag cho trạng thái "Mất khách"
  careType?: string; // Loại chăm sóc
  reason?: string; // Lý do
  notes?: string; // Ghi chú
  tags?: string[]; // Tags
}

// Helper function để convert API response sang Hospital format
function convertApiResponseToHospital(apiData: CustomerCareResponseDTO): Hospital {
  // Tính relative time cho last contact
  let lastContactRelative: string | null = null;
  if (apiData.lastContactDate) {
    const lastContact = new Date(apiData.lastContactDate);
    const now = new Date();
    const diffMs = now.getTime() - lastContact.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) {
      lastContactRelative = "Vừa xong";
    } else if (diffMins < 60) {
      lastContactRelative = `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      lastContactRelative = `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      lastContactRelative = `${diffDays} ngày trước`;
    } else {
      lastContactRelative = lastContact.toLocaleDateString("vi-VN");
    }
  }

  // Tính contract value - sẽ được tính sau khi fetch contracts
  const contractValue = 0; // Sẽ được cập nhật sau khi fetch contracts

  // Tính kiosk count
  const kioskCount = apiData.kioskCount || 0;

  // Map priority từ API (có thể là HIGH/MEDIUM/LOW hoặc P0-P4)
  let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  if (apiData.priority === "HIGH" || apiData.priority === "P0" || apiData.priority === "P1") {
    priority = "HIGH";
  } else if (apiData.priority === "LOW" || apiData.priority === "P4") {
    priority = "LOW";
  } else {
    priority = "MEDIUM";
  }

  return {
    id: apiData.hospitalId,
    careId: apiData.careId,
    name: apiData.hospitalName || `Hospital #${apiData.hospitalId}`,
    status: "dang_hoat_dong", // Default, sẽ được tính từ contracts nếu có
    priority,
    expiryDate: apiData.latestContract?.endDate || "",
    daysLeft: apiData.latestContract?.daysUntilExpiry || 0,
    kioskCount,
    tickets: { pending: 0, open: 0 }, // TODO: Get from tickets API if available
    pic: {
      name: apiData.assignedUser?.fullname || "Chưa phân công",
      avatar: apiData.assignedUser?.avatar || "",
      id: apiData.assignedUser?.id,
    },
    contractValue,
    lastContactDate: apiData.lastContactDate || null,
    lastContactRelative,
    createdDate: apiData.createdAt || undefined,
    createdBy: apiData.createdBy?.fullname || undefined,
    createdById: apiData.createdBy?.id,
    targetDate: apiData.targetDate || undefined,
    careType: apiData.careType,
    reason: apiData.reason,
    notes: apiData.notes,
    tags: apiData.tags,
  };
}

// Mock data - chỉ dùng khi không có API data
const mockHospitals: Hospital[] = [
  {
    id: 1,
    name: "Bệnh viện Đa Khoa Tâm Anh",
    status: "sap_het_han", // Sẽ được tính tự động từ contracts
    priority: "HIGH",
    expiryDate: "22/01/2026",
    daysLeft: 15,
    kioskCount: 12,
    tickets: { pending: 5, open: 2 },
    pic: { name: "Nguyễn Văn A", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
    contractValue: 450000000,
    lastContactDate: "2025-01-15T09:00:00",
    lastContactRelative: "2 giờ trước",
    createdDate: "2024-01-15T10:00:00",
    createdBy: "Nguyễn Văn A",
    contracts: [
      {
        id: "1",
        code: "HD-2025-001",
        type: "Bảo trì (Maintenance)",
        year: 2025,
        value: "450.000.000đ",
        status: "SAP_HET_HAN",
        expiryDate: "22/01/2026",
        daysLeft: 15
      },
      {
        id: "2",
        code: "HD-2024-002",
        type: "Bảo trì (Maintenance)",
        year: 2024,
        value: "420.000.000đ",
        status: "DANG_HOAT_DONG",
        expiryDate: "20/12/2026",
        daysLeft: 348
      }
    ]
  },
  {
    id: 2,
    name: "Bệnh viện Chợ Rẫy",
    status: "qua_han", // Sẽ được tính tự động từ contracts
    priority: "HIGH",
    expiryDate: "03/12/2025",
    daysLeft: -34,
    kioskCount: 25,
    tickets: { pending: 8, open: 3 },
    pic: { name: "Trần Thị B", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    contractValue: 820000000,
    lastContactDate: "2025-01-10T14:30:00",
    lastContactRelative: "3 ngày trước",
    createdDate: "2023-12-10T14:00:00",
    createdBy: "Trần Thị B",
    contracts: [
      {
        id: "1",
        code: "HD-2024-001",
        type: "Bảo trì (Maintenance)",
        year: 2024,
        value: "820.000.000đ",
        status: "HET_HAN",
        expiryDate: "03/12/2025",
        daysLeft: -34
      }
    ]
  },
  {
    id: 3,
    name: "Bệnh viện Nhi Đồng 1",
    status: "da_gia_han", // Sẽ được tính tự động từ contracts
    priority: "LOW",
    expiryDate: "18/08/2026",
    daysLeft: 224,
    kioskCount: 8,
    tickets: { pending: 0, open: 1 },
    pic: { name: "Lê Văn C", avatar: "https://randomuser.me/api/portraits/men/67.jpg" },
    contractValue: 320000000,
    lastContactDate: "2025-01-18T10:15:00",
    lastContactRelative: "Vừa xong",
    createdDate: "2024-08-18T09:00:00",
    createdBy: "Lê Văn C",
    contracts: [
      {
        id: "1",
        code: "HD-2026-001",
        type: "Bảo trì (Maintenance)",
        year: 2026,
        value: "320.000.000đ",
        status: "DA_GIA_HAN",
        expiryDate: "18/08/2026",
        daysLeft: 224
      }
    ]
  },
  {
    id: 4,
    name: "Bệnh viện Việt Pháp",
    status: "dang_hoat_dong", // Sẽ được tính tự động từ contracts
    priority: "MEDIUM",
    expiryDate: "14/06/2026",
    daysLeft: 158,
    kioskCount: 15,
    tickets: { pending: 2, open: 0 },
    pic: { name: "Phạm Thị D", avatar: "https://randomuser.me/api/portraits/women/28.jpg" },
    contractValue: 580000000,
    lastContactDate: "2025-01-12T16:45:00",
    lastContactRelative: "1 ngày trước",
    createdDate: "2024-06-12T08:00:00",
    createdBy: "Phạm Thị D",
    contracts: [
      {
        id: "1",
        code: "HD-2026-001",
        type: "Bảo trì (Maintenance)",
        year: 2026,
        value: "580.000.000đ",
        status: "DANG_HOAT_DONG",
        expiryDate: "14/06/2026",
        daysLeft: 158
      }
    ]
  },
  {
    id: 5,
    name: "Bệnh viện 115",
    status: "dang_bao_tri", // Set thủ công qua flag isMaintenance
    priority: "MEDIUM",
    expiryDate: "30/03/2026",
    daysLeft: 82,
    kioskCount: 10,
    tickets: { pending: 1, open: 4 },
    pic: { name: "Hoàng Văn E", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
    contractValue: 290000000,
    lastContactDate: null,
    lastContactRelative: null,
    createdDate: "2024-03-30T10:30:00",
    createdBy: "Hoàng Văn E",
    isMaintenance: true, // Flag cho trạng thái đặc biệt
    contracts: [
      {
        id: "1",
        code: "HD-2026-001",
        type: "Bảo trì (Maintenance)",
        year: 2026,
        value: "290.000.000đ",
        status: "DANG_HOAT_DONG",
        expiryDate: "30/03/2026",
        daysLeft: 82
      }
    ]
  },
];

// ===================== HELPER FUNCTIONS =====================

/**
 * Tính trạng thái dịch vụ của bệnh viện dựa trên hợp đồng
 * Logic: Ưu tiên hiển thị vấn đề cần xử lý gấp nhất
 */
function calculateHospitalStatus(hospital: Hospital): Hospital["status"] {
  // 1. Trạng thái đặc biệt (set thủ công)
  if (hospital.isLostCustomer) return "mat_khach";
  if (hospital.isMaintenance) return "dang_bao_tri";
  
  // 2. Nếu không có contracts, dùng status hiện tại (fallback)
  if (!hospital.contracts || hospital.contracts.length === 0) {
    return hospital.status;
  }
  
  // 3. Lọc hợp đồng đang active
  const activeContracts = hospital.contracts.filter(
    contract => contract.status === "DANG_HOAT_DONG" || contract.status === "SAP_HET_HAN"
  );
  
  if (activeContracts.length === 0) {
    // Không có hợp đồng active, kiểm tra hợp đồng đã hết hạn
    const expiredContracts = hospital.contracts.filter(
      contract => contract.status === "HET_HAN" || (contract.daysLeft !== undefined && contract.daysLeft < 0)
    );
    if (expiredContracts.length > 0) return "qua_han";
    
    // Kiểm tra hợp đồng đã gia hạn
    const renewedContracts = hospital.contracts.filter(
      contract => contract.status === "DA_GIA_HAN"
    );
    if (renewedContracts.length > 0) return "da_gia_han";
    
    return "dang_hoat_dong";
  }
  
  // 4. Lấy hợp đồng sắp hết hạn gần nhất
  const sorted = [...activeContracts].sort((a, b) => {
    const daysA = a.daysLeft ?? Infinity;
    const daysB = b.daysLeft ?? Infinity;
    return daysA - daysB;
  });
  
  const nextExpiring = sorted[0];
  
  // 5. Xác định trạng thái dựa trên hợp đồng sắp hết hạn
  if (nextExpiring.daysLeft !== undefined) {
    if (nextExpiring.daysLeft < 0) return "qua_han";
    if (nextExpiring.daysLeft <= 30) return "sap_het_han";
  }
  
  if (nextExpiring.status === "DA_GIA_HAN") return "da_gia_han";
  if (nextExpiring.status === "SAP_HET_HAN") return "sap_het_han";
  if (nextExpiring.status === "DANG_HOAT_DONG") return "dang_hoat_dong";
  
  return "dang_hoat_dong";
}

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

const priorityConfig: Record<"HIGH" | "MEDIUM" | "LOW", { label: string; bgColor: string; textColor: string; icon: string }> = {
  HIGH: { label: "Cao", bgColor: "bg-red-100", textColor: "text-red-700", icon: "🔴" },
  MEDIUM: { label: "TB", bgColor: "bg-amber-100", textColor: "text-amber-700", icon: "🟡" },
  LOW: { label: "Thấp", bgColor: "bg-green-100", textColor: "text-green-700", icon: "🟢" },
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
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [picFilter, setPicFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(null);
  const [editingHospital, setEditingHospital] = useState<AddHospitalToCareFormData & { id: number } | null>(null);
  
  // API states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: any = {
          page: currentPage,
          size: itemsPerPage,
          sortBy: "createdAt",
          sortDir: "desc",
        };

        // Apply filters
        if (searchTerm) params.search = searchTerm;
        if (priorityFilter) params.priority = priorityFilter;
        if (picFilter) {
          // Find user ID from name (simplified - in real app, you'd have a user lookup)
          // For now, we'll filter on frontend
        }

        const response = await getAllCustomerCares(params);
        
        // Handle paginated response
        const data = response.content || response.data || (Array.isArray(response) ? response : []);
        const total = response.totalElements || response.total || data.length;
        const pages = response.totalPages || Math.ceil(total / itemsPerPage);

        const convertedHospitals = Array.isArray(data) 
          ? data.map(convertApiResponseToHospital)
          : [];

        // Fetch contracts cho tất cả hospitals để tính tổng giá trị
        const hospitalsWithContracts = await Promise.all(
          convertedHospitals.map(async (hospital) => {
            try {
              const contractsRes = await getMaintainContracts({
                careId: hospital.careId,
                page: 0,
                size: 1000, // Lấy tất cả contracts
              });
              
              const contractsData = Array.isArray(contractsRes?.content) 
                ? contractsRes.content 
                : Array.isArray(contractsRes?.data?.content)
                ? contractsRes.data.content
                : Array.isArray(contractsRes?.data)
                ? contractsRes.data
                : Array.isArray(contractsRes)
                ? contractsRes
                : [];
              
              // Tính tổng giá trị từ totalPrice của tất cả contracts
              const totalValue = contractsData.reduce((sum: number, c: any) => {
                const price = Number(c.totalPrice) || 0;
                return sum + price;
              }, 0);
              
              return {
                ...hospital,
                contractValue: totalValue,
              };
            } catch (err) {
              console.warn(`Could not fetch contracts for hospital ${hospital.careId}:`, err);
              return hospital; // Giữ nguyên nếu không fetch được
            }
          })
        );

        setHospitals(hospitalsWithContracts);
        setTotalItems(total);
        setTotalPages(pages);
      } catch (err: any) {
        console.error("Error loading customer care list:", err);
        setError(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi tải dữ liệu");
        setHospitals([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentPage, itemsPerPage, searchTerm, priorityFilter, activeTab]);

  // Count hospitals per status (tính với trạng thái tự động)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: totalItems,
      dang_bao_tri: 0,
      sap_het_han: 0,
      qua_han: 0,
      da_gia_han: 0,
      mat_khach: 0,
    };
    hospitals.forEach((h) => {
      const calculatedStatus = calculateHospitalStatus(h);
      counts[calculatedStatus] = (counts[calculatedStatus] || 0) + 1;
    });
    return counts;
  }, [hospitals, totalItems]);

  // Filter hospitals với trạng thái được tính tự động (client-side filtering for tabs)
  const filteredHospitals = useMemo(() => {
    return hospitals.map(h => ({
      ...h,
      status: calculateHospitalStatus(h) // Tính trạng thái tự động từ contracts
    })).filter((h) => {
      // Tab filter (client-side)
      if (activeTab !== "all" && h.status !== activeTab) return false;
      // PIC filter (client-side)
      if (picFilter && !h.pic.name.toLowerCase().includes(picFilter.toLowerCase())) return false;
      // Date filter (client-side)
      if (dateFromFilter || dateToFilter) {
        if (!h.createdDate) return false;
        const createdDate = new Date(h.createdDate);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          fromDate.setHours(0, 0, 0, 0);
          if (createdDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999);
          if (createdDate > toDate) return false;
        }
      }
      return true;
    });
  }, [hospitals, activeTab, picFilter, dateFromFilter, dateToFilter]);

  // Pagination - API đã handle pagination, nhưng vẫn filter client-side cho tabs
  const paginatedHospitals = filteredHospitals;

  // Reset to page 0 when filters change (except currentPage and itemsPerPage which are handled in loadData)
  useEffect(() => {
    if (currentPage !== 0) {
    setCurrentPage(0);
    }
  }, [searchTerm, priorityFilter, dateFromFilter, dateToFilter, picFilter, activeTab]);

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

  // Quick actions handlers
  const handleDeleteHospital = async (careId: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bệnh viện này khỏi danh sách chăm sóc?")) {
      try {
        await deleteCustomerCare(careId);
        // Refresh list
        const params: any = {
          page: currentPage,
          size: itemsPerPage,
          sortBy: "createdAt",
          sortDir: "desc",
        };
        if (searchTerm) params.search = searchTerm;
        if (priorityFilter) params.priority = priorityFilter;
        
        const response = await getAllCustomerCares(params);
        const data = response.content || response.data || (Array.isArray(response) ? response : []);
        const total = response.totalElements || response.total || data.length;
        const pages = response.totalPages || Math.ceil(total / itemsPerPage);
        
        const convertedHospitals = Array.isArray(data) 
          ? data.map(convertApiResponseToHospital)
          : [];
        
        setHospitals(convertedHospitals);
        setTotalItems(total);
        setTotalPages(pages);
      } catch (err: any) {
        console.error("Error deleting customer care:", err);
        alert(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi xóa");
      }
    }
  };

  const handleAddHospitalToCare = async (data: AddHospitalToCareFormData) => {
    // Form đã handle API call, chỉ cần refresh list
    setShowAddHospitalModal(false);
    setEditingHospital(null);
    
    // Refresh list
    try {
      const params: any = {
        page: currentPage,
        size: itemsPerPage,
        sortBy: "createdAt",
        sortDir: "desc",
      };
      if (searchTerm) params.search = searchTerm;
      if (priorityFilter) params.priority = priorityFilter;
      
      const response = await getAllCustomerCares(params);
      const data = response.content || response.data || (Array.isArray(response) ? response : []);
      const total = response.totalElements || response.total || data.length;
      const pages = response.totalPages || Math.ceil(total / itemsPerPage);
      
      const convertedHospitals = Array.isArray(data) 
        ? data.map(convertApiResponseToHospital)
        : [];
      
      setHospitals(convertedHospitals);
      setTotalItems(total);
      setTotalPages(pages);
    } catch (err) {
      console.error("Error refreshing list:", err);
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
              <button 
                onClick={() => setShowAddHospitalModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
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
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FiSearch className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm theo tên bệnh viện."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              />
            </div>

            {/* Dropdowns Container */}
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
              {/* Trạng thái dịch vụ */}
              

              {/* Ưu tiên */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  <option value="">Ưu tiên</option>
                  <option value="HIGH">🔴 Cao</option>
                  <option value="MEDIUM">🟡 Trung bình</option>
                  <option value="LOW">🟢 Thấp</option>
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

              {/* Ngày thêm */}
              <div className="flex gap-2 items-center">
                <label className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Ngày thêm:</label>
                <div className="relative flex-1 min-w-[140px]">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiCalendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                <div className="relative flex-1 min-w-[140px]">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiCalendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    min={dateFromFilter || undefined}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  />
                </div>
                {(dateFromFilter || dateToFilter) && (
                  <button
                    onClick={() => {
                      setDateFromFilter("");
                      setDateToFilter("");
                    }}
                    className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    title="Xóa bộ lọc"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>
              
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
                    Ưu tiên
                  </th>
                
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Liên hệ cuối
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Số Kiosk
                  </th>
                  
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Phụ trách
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Tổng giá trị HĐ
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngày thêm
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Ngày mục tiêu
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Người thêm
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                        <span>Đang tải dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-red-500 dark:text-red-400">
                      {error}
                    </td>
                  </tr>
                ) : paginatedHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-3 py-12 text-center text-gray-500 dark:text-gray-400">
                      Không tìm thấy bệnh viện nào
                    </td>
                  </tr>
                ) : (
                  paginatedHospitals.map((hospital) => {
                    const { label, bgColor, textColor } = statusConfig[hospital.status];
                    return (
                      <tr key={hospital.id} className={`${getRowBg(hospital.status)} transition hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                        {/* Tên bệnh viện */}
                        <td className="min-w-[180px] px-3 py-3">
                          <button 
                            onClick={() => {
                              const basePath = location.pathname.includes('/superadmin') ? '/superadmin' : '/admin';
                              navigate(`${basePath}/hospital-care/${hospital.careId}`); // Dùng careId, không phải hospital.id
                            }}
                            className="flex items-center gap-1 text-left text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400"
                          >
                            {hospital.name}
                            <FiChevronRight className="h-4 w-4 shrink-0" />
                          </button>
                        </td>

                        {/* Trạng thái */}
                        

                        {/* Ưu tiên */}
                        <td className="whitespace-nowrap px-3 py-3">
                          {hospital.priority && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityConfig[hospital.priority].bgColor} ${priorityConfig[hospital.priority].textColor}`}
                            >
                              <span>{priorityConfig[hospital.priority].icon}</span>
                              {priorityConfig[hospital.priority].label}
                            </span>
                          )}
                        </td>

                        {/* Ngày hết hạn */}
                        

                        {/* Còn lại */}
                        

                        {/* Liên hệ cuối */}
                        <td className="whitespace-nowrap px-3 py-3">
                          {hospital.lastContactRelative ? (
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <div className="font-medium">{hospital.lastContactRelative}</div>
                              {hospital.lastContactDate && (
                                <div className="text-xs text-gray-400">
                                  {new Date(hospital.lastContactDate).toLocaleDateString("vi-VN")}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-red-600 font-medium">Chưa liên hệ</span>
                          )}
                        </td>

                        {/* Số Kiosk */}
                        <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {hospital.kioskCount}
                        </td>

                        {/* Tickets */}
                        

                        {/* Phụ trách */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center gap-2">
                            {hospital.pic.avatar ? (
                            <img
                              src={hospital.pic.avatar}
                              alt={hospital.pic.name}
                              className="h-7 w-7 rounded-full object-cover"
                            />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {hospital.pic.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-sm text-gray-700 dark:text-gray-300">{hospital.pic.name}</span>
                          </div>
                        </td>

                        {/* Giá trị HĐ */}
                        <td className="whitespace-nowrap px-3 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(hospital.contractValue)}
                        </td>

                        {/* Ngày thêm */}
                        <td className="whitespace-nowrap px-3 py-3">
                          {hospital.createdDate ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                              <FiCalendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(hospital.createdDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Ngày mục tiêu */}
                        <td className="whitespace-nowrap px-3 py-3">
                          {hospital.targetDate ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                              <FiCalendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(hospital.targetDate).toLocaleDateString("vi-VN")}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Người thêm */}
                        <td className="whitespace-nowrap px-3 py-3">
                          {hospital.createdBy ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                              <FiUser className="h-4 w-4 text-gray-400" />
                              <span>{hospital.createdBy}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center justify-center gap-1 relative">
                            <button
                              title="Xem chi tiết"
                              onClick={() => {
                                setSelectedHospitalId(hospital.careId); // Pass careId, not hospital.id
                                setShowDetailModal(true);
                              }}
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-blue-100 hover:text-blue-600"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                            <button
                              title="Sửa"
                              onClick={async () => {
                                try {
                                  // Load full details from API
                                  const careDetail = await getCustomerCareById(hospital.careId);
                                  
                                  // Helper function to format date for date input (YYYY-MM-DD)
                                  // API trả về LocalDateTime string (không có timezone), parse như local time
                                  const formatDateForInput = (dateString?: string): string => {
                                    if (!dateString) return "";
                                    try {
                                      // API trả về: "2026-01-14T00:00:00" (LocalDateTime)
                                      // Parse như local date, không dùng new Date() vì nó parse như UTC
                                      const [datePart] = dateString.split('T');
                                      return datePart || "";
                                    } catch {
                                      return "";
                                    }
                                  };
                                  
                                  // Helper function to format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
                                  // API trả về LocalDateTime string (không có timezone), parse như local time
                                  const formatDateTimeForInput = (dateString?: string): string => {
                                    if (!dateString) return "";
                                    try {
                                      // API trả về: "2026-01-14T10:30:00" (LocalDateTime)
                                      // Extract date và time, bỏ seconds
                                      const [datePart, timePart] = dateString.split('T');
                                      if (!datePart || !timePart) return "";
                                      
                                      const timeWithoutSeconds = timePart.split(':').slice(0, 2).join(':');
                                      return `${datePart}T${timeWithoutSeconds}`;
                                    } catch {
                                      return "";
                                    }
                                  };
                                  
                                  // Convert API response to form data format
                                const editData: AddHospitalToCareFormData & { id: number } = {
                                    id: hospital.careId,
                                    hospitalId: careDetail.hospitalId,
                                    hospitalName: careDetail.hospitalName || hospital.name,
                                    careType: careDetail.careType || "",
                                    priority: (careDetail.priority as "HIGH" | "MEDIUM" | "LOW") || hospital.priority,
                                    reason: careDetail.reason || "",
                                    assignedUserId: careDetail.assignedUser?.id || null,
                                    assignedUserName: careDetail.assignedUser?.fullname || hospital.pic.name,
                                    targetDate: formatDateForInput(careDetail.targetDate),
                                    nextFollowUpDate: formatDateTimeForInput(careDetail.nextFollowUpDate),
                                    notes: careDetail.notes || "",
                                    tags: Array.isArray(careDetail.tags) ? careDetail.tags : [],
                                };
                                setEditingHospital(editData);
                                setShowAddHospitalModal(true);
                                } catch (error) {
                                  console.error("Error loading care details:", error);
                                  alert("Không thể tải chi tiết. Vui lòng thử lại.");
                                }
                              }}
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-blue-100 hover:text-blue-600"
                            >
                              <FiEdit3 className="h-4 w-4" />
                            </button>
                            <button
                              title="Xóa"
                              onClick={() => handleDeleteHospital(hospital.careId)}
                              className="rounded-lg p-1.5 text-gray-500 transition hover:bg-red-100 hover:text-red-600"
                            >
                              <FiTrash2 className="h-4 w-4" />
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
          {!loading && totalItems > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newSize) => {
                setItemsPerPage(newSize);
                setCurrentPage(0);
              }}
              itemsPerPageOptions={[10, 20, 50]}
              showItemsPerPage={true}
            />
          )}
        </div>

        {/* Add/Edit Hospital to Care Modal */}
        <AddHospitalToCareForm
          isOpen={showAddHospitalModal}
          onClose={() => {
            setShowAddHospitalModal(false);
            setEditingHospital(null);
          }}
          onSubmit={handleAddHospitalToCare}
          editingData={editingHospital}
        />

        {/* Hospital Detail Modal */}
        {selectedHospitalId && (
          <HospitalDetailView
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedHospitalId(null);
            }}
            hospitalId={selectedHospitalId}
          />
        )}
      </div>
    </>
  );
}
