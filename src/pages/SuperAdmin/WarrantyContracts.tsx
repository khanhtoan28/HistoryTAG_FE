import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { FiUser, FiClock, FiCalendar, FiDollarSign, FiFileText } from "react-icons/fi";
import { FaHospitalAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  createWarrantyContract,
  updateWarrantyContract,
  deleteWarrantyContract,
  getWarrantyContractById,
  getWarrantyContracts,
  getWarrantyPicOptions,
  type WarrantyContractResponseDTO,
  type WarrantyContractRequestDTO,
} from "../../api/warranty.api";
import { searchHospitals } from "../../api/business.api";
import { PlusIcon } from "../../icons";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    }
    : { Accept: "application/json", "Content-Type": "application/json" };
}

// Format số tiền VND
function formatCurrency(amount?: number | null): string {
  if (!amount && amount !== 0) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date time: HH:mm-dd/MM/yyyy
// Parse directly from ISO string to avoid timezone conversion issues
function fmt(dt?: string | null) {
  if (!dt) return "—";
  try {
    // Backend trả về LocalDateTime dạng "yyyy-MM-ddTHH:mm:ss" hoặc "yyyy-MM-ddTHH:mm:ss.SSS"
    // Parse trực tiếp từ string để tránh timezone conversion
    const match = dt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/);
    if (match) {
      const [, year, month, day, hours, minutes] = match;
      return `${hours}:${minutes}-${day}/${month}/${year}`;
    }
    // Fallback: thử parse bằng Date nếu format khác
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "—";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes}-${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

// Format date only
function fmtDate(dt?: string | null) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

// Format filter date label
function formatFilterDateLabel(value?: string | null) {
  if (!value) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("vi-VN");
  }
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

// Normalize date for start
function normalizeDateForStart(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  if (value.length === 10) return `${value}T00:00:00`;
  if (value.length === 16) return `${value}:00`;
  if (value.length >= 19) return value.substring(0, 19);
  return value;
}

// Normalize date for end
function normalizeDateForEnd(value?: string | null) {
  if (!value || value.trim() === "") return undefined;
  if (value.length === 10) return `${value}T23:59:59`;
  if (value.length === 16) return `${value}:59`;
  if (value.length >= 19) return value.substring(0, 19);
  return value;
}

export type WarrantyContract = WarrantyContractResponseDTO;

export type WarrantyContractForm = {
  contractCode: string;
  picUserId?: number;
  hospitalId?: number;
  durationYears: string; // Người dùng nhập dạng chuỗi (ví dụ: "1 năm 6 tháng")
  yearlyPrice: number | "";
  totalPrice: number | ""; // Tổng tiền người dùng nhập
  startDate?: string | null;
  endDate?: string | null;
};

type PicUserOption = {
  id: number;
  label: string;
  subLabel?: string;
  phone?: string | null;
};

type HospitalOption = {
  id: number;
  label: string;
};

const DURATION_OPTIONS = [
  { value: 1, label: "1 năm" },
  { value: 2, label: "2 năm" },
  { value: 3, label: "3 năm" },
  { value: 4, label: "4 năm" },
  { value: 5, label: "5 năm" },
  { value: 7, label: "7 năm" },
];

export default function WarrantyContractsPage() {
  // Determine if current user can perform write actions
  // Allow SUPERADMIN or team CUSTOMER_SERVICE
  const canEdit = (() => {
    try {
      // Check SUPERADMIN role
      const rolesStr = localStorage.getItem("roles") || sessionStorage.getItem("roles");
      if (rolesStr) {
        const roles = JSON.parse(rolesStr);
        const isSuperAdmin = Array.isArray(roles) && roles.some((r: string) => 
          r === "SUPERADMIN" || r === "SUPER_ADMIN" || r === "Super Admin"
        );
        if (isSuperAdmin) return true;
      }

      // Check CUSTOMER_SERVICE team from user object
      const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userTeam = user?.team ? String(user.team).toUpperCase() : null;
        if (userTeam === "CUSTOMER_SERVICE") return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  })();

  const [items, setItems] = useState<WarrantyContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [qSearch, setQSearch] = useState("");
  const [debouncedQSearch, setDebouncedQSearch] = useState(""); // Debounced version for API calls
  const [qPicUserId, setQPicUserId] = useState("");
  const [filterStartFrom, setFilterStartFrom] = useState<string>("");
  const [filterStartTo, setFilterStartTo] = useState<string>("");
  const [dateFilterOpen, setDateFilterOpen] = useState<boolean>(false);
  const [pendingFilterStart, setPendingFilterStart] = useState<string>("");
  const [pendingFilterEnd, setPendingFilterEnd] = useState<string>("");
  const dateFilterRef = useRef<HTMLDivElement | null>(null);
  const pendingStartInputRef = useRef<HTMLInputElement | null>(null);
  const pendingEndInputRef = useRef<HTMLInputElement | null>(null);
  const searchDebounceTimeoutRef = useRef<number | null>(null);

  // Debounce search input: update debouncedQSearch after 300ms of no typing
  useEffect(() => {
    if (searchDebounceTimeoutRef.current) {
      window.clearTimeout(searchDebounceTimeoutRef.current);
    }
    searchDebounceTimeoutRef.current = window.setTimeout(() => {
      setDebouncedQSearch(qSearch);
    }, 300);
    return () => {
      if (searchDebounceTimeoutRef.current) {
        window.clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, [qSearch]);

  useEffect(() => {
    setPage(0);
  }, [debouncedQSearch, qPicUserId, filterStartFrom, filterStartTo]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WarrantyContract | null>(null);
  const [viewing, setViewing] = useState<WarrantyContract | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<{
    payload: WarrantyContractRequestDTO;
    isEditing: boolean;
  } | null>(null);
  const [hospitalNameForConfirm, setHospitalNameForConfirm] = useState<string>("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const [form, setForm] = useState<WarrantyContractForm>({
    contractCode: "",
    picUserId: undefined,
    hospitalId: undefined,
    durationYears: "",
    yearlyPrice: "",
    totalPrice: "",
    startDate: null,
    endDate: null,
  });
  const [yearlyPriceDisplay, setYearlyPriceDisplay] = useState<string>("");

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
    setYearlyPriceDisplay("");
  }

  function fillForm(item: WarrantyContract) {
    const yearlyPrice = typeof item.yearlyPrice === 'number' ? item.yearlyPrice : (item.yearlyPrice ? Number(item.yearlyPrice) : "");
    
    // Parse startDate trực tiếp từ ISO string để tránh timezone conversion
    let startDateForInput: string | null = null;
    if (item.startDate) {
      try {
        // Backend trả về LocalDateTime dạng "yyyy-MM-ddTHH:mm:ss" hoặc "yyyy-MM-ddTHH:mm:ss.SSS"
        // Parse trực tiếp để tránh timezone conversion
        const match = item.startDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/);
        if (match) {
          const [, year, month, day, hours, minutes] = match;
          // Format cho datetime-local input: "yyyy-MM-ddTHH:mm"
          startDateForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
          // Fallback: thử parse bằng Date nếu format khác
          const d = new Date(item.startDate);
          if (!Number.isNaN(d.getTime())) {
            // Lấy local time để hiển thị đúng
            const year = String(d.getFullYear());
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            startDateForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
      } catch {
        startDateForInput = null;
      }
    }
    
    // Parse endDate tương tự startDate
    let endDateForInput: string | null = null;
    if (item.endDate) {
      try {
        const match = item.endDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/);
        if (match) {
          const [, year, month, day, hours, minutes] = match;
          endDateForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
        } else {
          const d = new Date(item.endDate);
          if (!Number.isNaN(d.getTime())) {
            const year = String(d.getFullYear());
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            endDateForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
      } catch {
        endDateForInput = null;
      }
    }

    // Parse totalPrice
    const totalPrice = typeof item.totalPrice === 'number' ? item.totalPrice : (item.totalPrice ? Number(item.totalPrice) : "");
    
    setForm({
      contractCode: item.contractCode || "",
      picUserId: item.picUser?.id,
      hospitalId: item.hospital?.id,
      durationYears: item.durationYears ? String(item.durationYears) : "",
      yearlyPrice: yearlyPrice,
      totalPrice: totalPrice,
      startDate: startDateForInput,
      endDate: endDateForInput,
    });
    // Set display values
    if (yearlyPrice !== '') {
      setYearlyPriceDisplay(formatNumber(yearlyPrice));
    } else {
      setYearlyPriceDisplay('');
    }
    if (totalPrice !== '') {
      setTotalPriceDisplay(formatNumber(totalPrice));
    } else {
      setTotalPriceDisplay('');
    }
  }

  // Pic User và Hospital options
  const [picOptions, setPicOptions] = useState<PicUserOption[]>([]);
  const [hospitalOptions, setHospitalOptions] = useState<HospitalOption[]>([]);
  const [selectedPic, setSelectedPic] = useState<PicUserOption | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<HospitalOption | null>(null);

  // Load pic options
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const options = await getWarrantyPicOptions();
        if (alive) setPicOptions(options);
      } catch (e) {
        console.error("Failed to load pic options:", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Load hospital options khi mở modal hoặc khi cần cho filter
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const options = await searchHospitals("");
        if (alive) {
          const mapped = Array.isArray(options) ? options.map((h: any) => ({
            id: Number(h.id),
            label: String(h.label || h.name || h.id),
          })) : [];
          setHospitalOptions(mapped);
        }
      } catch (e) {
        console.error("Failed to load hospitals:", e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Set selected values khi mở modal với dữ liệu
  useEffect(() => {
    if (!open) {
      setSelectedPic(null);
      setSelectedHospital(null);
      return;
    }
    if (form.picUserId) {
      const pic = picOptions.find((p) => p.id === form.picUserId);
      setSelectedPic(pic || null);
    }
    if (form.hospitalId) {
      const hospital = hospitalOptions.find((h) => h.id === form.hospitalId);
      setSelectedHospital(hospital || null);
    }
  }, [open, form.picUserId, form.hospitalId, picOptions, hospitalOptions]);

  // State cho totalPrice display
  const [totalPriceDisplay, setTotalPriceDisplay] = useState<string>("");


  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        size,
        sortBy: "id",
        sortDir: "desc",
      };
      if (debouncedQSearch.trim()) params.search = debouncedQSearch.trim();
      if (qPicUserId) params.picUserId = Number(qPicUserId);
      
      // Note: Date filtering will be implemented in backend later
      // For now, date filter UI is shown but filtering is done client-side if needed

      const data = await getWarrantyContracts(params);
      setItems(data.content || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (e: any) {
      setError(e.message || "Lỗi tải danh sách");
      toast.error(e?.message || "Lỗi tải danh sách");
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [page, size, debouncedQSearch, qPicUserId, filterStartFrom, filterStartTo]);

  // Handle click outside date filter
  useEffect(() => {
    if (!dateFilterOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setDateFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dateFilterOpen]);

  async function fetchDetail(id: number): Promise<WarrantyContract | null> {
    setIsModalLoading(true);
    setError(null);
    try {
      const data = await getWarrantyContractById(id);
      return data;
    } catch (e: any) {
      setError(e.message || "Lỗi tải chi tiết");
      console.error("❌ FETCH DETAIL ERROR:", e);
      return null;
    } finally {
      setIsModalLoading(false);
    }
  }

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({
      contractCode: "",
      picUserId: undefined,
      hospitalId: undefined,
      durationYears: "",
      yearlyPrice: "",
      totalPrice: "",
      startDate: null,
      endDate: null,
    });
    setYearlyPriceDisplay("");
    setTotalPriceDisplay("");
    setOpen(true);
  }

  async function onView(item: WarrantyContract) {
    setEditing(null);
    setViewing(null);
    setOpen(true);

    const details = await fetchDetail(item.id);
    if (details) {
      setViewing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onEdit(item: WarrantyContract) {
    setViewing(null);
    setEditing(null);
    setOpen(true);

    const details = await fetchDetail(item.id);
    if (details) {
      setEditing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  function onDelete(id: number) {
    if (!canEdit) {
      toast.error("Bạn không có quyền xóa hợp đồng bảo trì");
      return;
    }
    setPendingDeleteId(id);
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    setConfirmDeleteOpen(false);
    setPendingDeleteId(null);
    setLoading(true);
    try {
      await deleteWarrantyContract(idToDelete, canEdit);
      await fetchList();
      if (isViewing && viewing?.id === idToDelete) closeModal();
      toast.success("Xóa thành công");
    } catch (e: any) {
      toast.error(e?.message || "Xóa thất bại");
    } finally {
      setLoading(false);
    }
  }

  function cancelDelete() {
    setConfirmDeleteOpen(false);
    setPendingDeleteId(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contractCode.trim()) {
      setError("Mã hợp đồng không được để trống");
      return;
    }
    if (!form.picUserId) {
      setError("Người phụ trách không được để trống");
      return;
    }
    if (!form.hospitalId) {
      setError("Bệnh viện không được để trống");
      return;
    }
    if (!form.durationYears || form.durationYears.trim() === "") {
      setError("Thời hạn hợp đồng không được để trống");
      return;
    }
    if (!form.yearlyPrice || (typeof form.yearlyPrice === "number" && form.yearlyPrice <= 0)) {
      setError("Giá hợp đồng phải lớn hơn 0");
      return;
    }
    if (!form.totalPrice || (typeof form.totalPrice === "number" && form.totalPrice <= 0)) {
      setError("Tổng tiền phải lớn hơn 0");
      return;
    }
    if (isViewing) return;
    if (!canEdit) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    // Convert startDate từ format "yyyy-MM-ddTHH:mm" sang ISO string mà không bị timezone conversion
    let startDateForPayload: string | null = null;
    if (form.startDate) {
      try {
        // Parse trực tiếp từ format "yyyy-MM-ddTHH:mm" để tránh timezone conversion
        const match = form.startDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (match) {
          const [, year, month, day, hours, minutes] = match;
          // Format thành ISO string "yyyy-MM-ddTHH:mm:ss" (không có timezone, backend sẽ parse như LocalDateTime)
          startDateForPayload = `${year}-${month}-${day}T${hours}:${minutes}:00`;
        } else {
          // Fallback: nếu format khác, thử parse bằng Date nhưng giữ nguyên local time
          const d = new Date(form.startDate);
          if (!Number.isNaN(d.getTime())) {
            const year = String(d.getFullYear());
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            startDateForPayload = `${year}-${month}-${day}T${hours}:${minutes}:00`;
          }
        }
      } catch {
        startDateForPayload = null;
      }
    }

    // Convert endDate tương tự startDate
    let endDateForPayload: string | null = null;
    if (form.endDate) {
      try {
        const match = form.endDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
        if (match) {
          const [, year, month, day, hours, minutes] = match;
          endDateForPayload = `${year}-${month}-${day}T${hours}:${minutes}:00`;
        } else {
          const d = new Date(form.endDate);
          if (!Number.isNaN(d.getTime())) {
            const year = String(d.getFullYear());
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            endDateForPayload = `${year}-${month}-${day}T${hours}:${minutes}:00`;
          }
        }
      } catch {
        endDateForPayload = null;
      }
    }

    const payload: WarrantyContractRequestDTO = {
      contractCode: form.contractCode.trim(),
      picUserId: form.picUserId!,
      hospitalId: form.hospitalId!,
      durationYears: form.durationYears.trim(), // Gửi dạng string
      yearlyPrice: typeof form.yearlyPrice === "number" ? form.yearlyPrice : 0,
      totalPrice: typeof form.totalPrice === "number" ? form.totalPrice : 0,
      startDate: startDateForPayload,
      endDate: endDateForPayload,
    };

    // Check nếu đang tạo mới (không phải edit) và bệnh viện đã có hợp đồng
    if (!isEditing && form.hospitalId) {
      try {
        setLoading(true);
        const existingContracts = await getWarrantyContracts({ hospitalId: form.hospitalId, page: 0, size: 1 });
        setLoading(false);
        const hasExisting = (existingContracts.content && existingContracts.content.length > 0) || 
                           (Array.isArray(existingContracts) && existingContracts.length > 0);
        
        if (hasExisting) {
          const hospitalName = selectedHospital?.label || 
                              hospitalOptions.find(h => h.id === form.hospitalId)?.label || 
                              items.find(h => h.hospital?.id === form.hospitalId)?.hospital?.label ||
                              "bệnh viện này";
          setHospitalNameForConfirm(hospitalName);
          setPendingSubmit({ payload, isEditing: false });
          setConfirmCreateOpen(true);
          return;
        }
      } catch (e) {
        setLoading(false);
        // console.warn("Failed to check existing warranty contracts, proceeding anyway", e);
      }
    }

    // Tiếp tục submit
    setLoading(true);
    setError(null);
    try {
      // Kiểm tra token trước khi gửi request
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      if (!token) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }

      if (isEditing) {
        await updateWarrantyContract(editing!.id, payload, canEdit);
      } else {
        await createWarrantyContract(payload, canEdit);
      }

      closeModal();
      setPage(0);
      await fetchList();
      toast.success(isEditing ? "Cập nhật thành công" : "Tạo thành công");
    } catch (e: any) {
      console.error("Error saving warranty contract:", e);
      const errorMessage = e?.response?.data?.message || e?.message || "Lưu thất bại";
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        const msg = e?.response?.status === 401 
          ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
          : "Bạn không có quyền thực hiện thao tác này.";
        setError(msg);
        toast.error(msg);
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function confirmCreate() {
    if (!pendingSubmit) return;
    setConfirmCreateOpen(false);
    setLoading(true);
    setError(null);
    
    try {
      // Kiểm tra token trước khi gửi request
      const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
      if (!token) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      if (pendingSubmit.isEditing) {
        await updateWarrantyContract(editing!.id, pendingSubmit.payload, canEdit);
      } else {
        await createWarrantyContract(pendingSubmit.payload, canEdit);
      }
      closeModal();
      setPage(0);
      await fetchList();
      toast.success(pendingSubmit.isEditing ? "Cập nhật thành công" : "Tạo thành công");
      setPendingSubmit(null);
      setHospitalNameForConfirm("");
    } catch (e: any) {
      console.error("Error saving warranty contract:", e);
      const errorMessage = e?.response?.data?.message || e?.message || "Lưu thất bại";
      if (e?.response?.status === 401) {
        setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  function cancelCreate() {
    setConfirmCreateOpen(false);
    setPendingSubmit(null);
    setHospitalNameForConfirm("");
  }

  // Component RemoteSelect cho Pic User
  function RemoteSelectPic({
    label,
    placeholder,
    options,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    placeholder?: string;
    options: PicUserOption[];
    value: PicUserOption | null;
    onChange: (v: PicUserOption | null) => void;
    disabled?: boolean;
  }) {
    const [openBox, setOpenBox] = useState(false);
    const [q, setQ] = useState("");
    const [highlight, setHighlight] = useState(-1);
    const inputRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
      if (!q.trim()) return options;
      const searchLower = q.toLowerCase().trim();
      return options.filter((opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.subLabel?.toLowerCase().includes(searchLower) ||
        opt.phone?.includes(q)
      );
    }, [options, q]);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setOpenBox(false);
          setQ("");
        }
      };
      if (openBox) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [openBox]);

    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{label}</label>
        <div className="relative">
          <div
            ref={inputRef}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer focus-within:ring-1 focus-within:ring-[#4693FF] focus-within:border-[#4693FF]"
            onClick={() => {
              if (!disabled) setOpenBox(!openBox);
            }}
          >
            {openBox ? (
              <input
                type="text"
                className="w-full outline-none bg-transparent"
                placeholder={placeholder || "Tìm kiếm..."}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHighlight(-1);
                }}
                onKeyDown={(e) => {
                  if (!openBox) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, filteredOptions.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (highlight >= 0 && filteredOptions[highlight]) {
                      onChange(filteredOptions[highlight]);
                      setOpenBox(false);
                    }
                  } else if (e.key === "Escape") {
                    setOpenBox(false);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                disabled={disabled}
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className={value ? "text-gray-900" : "text-gray-500"}>
                  {value ? value.label : placeholder || "Chọn..."}
                </span>
                {!value && (
                  <svg className={`w-4 h-4 transition-transform ${openBox ? 'rotate-180' : ''} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            )}
          </div>
          {value && !openBox && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          {openBox && !disabled && (
            <div
              ref={dropdownRef}
              className="absolute z-[110] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
              ) : (
                filteredOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      idx === highlight ? "bg-gray-100" : ""
                    }`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt);
                      setOpenBox(false);
                      setQ("");
                    }}
                  >
                    <div className="font-medium text-gray-800">{opt.label}</div>
                    {opt.subLabel && (
                      <div className="text-xs text-gray-500">{opt.subLabel}</div>
                    )}
                    {opt.phone && (
                      <div className="text-xs text-gray-500">{opt.phone}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Component RemoteSelect cho Hospital
  function RemoteSelectHospital({
    label,
    placeholder,
    fetchOptions,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    placeholder?: string;
    fetchOptions: (q: string) => Promise<HospitalOption[]>;
    value: HospitalOption | null;
    onChange: (v: HospitalOption | null) => void;
    disabled?: boolean;
  }) {
    const [openBox, setOpenBox] = useState(false);
    const [q, setQ] = useState("");
    const [loadingBox, setLoadingBox] = useState(false);
    const [options, setOptions] = useState<HospitalOption[]>([]);
    const [highlight, setHighlight] = useState(-1);

    useEffect(() => {
      if (!q.trim()) return;
      let alive = true;
      const t = setTimeout(async () => {
        setLoadingBox(true);
        try {
          const res = await fetchOptions(q.trim());
          if (alive) setOptions(res);
        } finally {
          if (alive) setLoadingBox(false);
        }
      }, 250);
      return () => {
        alive = false;
        clearTimeout(t);
      };
    }, [q, fetchOptions]);

    useEffect(() => {
      let alive = true;
      if (openBox && options.length === 0 && !q.trim()) {
        (async () => {
          setLoadingBox(true);
          try {
            const res = await fetchOptions("");
            if (alive) setOptions(res);
          } finally {
            if (alive) setLoadingBox(false);
          }
        })();
      }
      return () => { alive = false; };
    }, [openBox, fetchOptions]);

    const searchHospitalsWrapped = useMemo(
      () => async (term: string) => {
        try {
          const list = await searchHospitals(term);
          const mapped = Array.isArray(list) ? list.map((h: any) => ({
            id: Number(h.id),
            label: String(h.label || h.name || h.id),
          })) : [];
          return mapped.filter((h) => Number.isFinite(h.id) && h.label);
        } catch (e) {
          return [];
        }
      },
      []
    );

    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{label}</label>
        <div className="relative">
          <div
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer focus-within:ring-1 focus-within:ring-[#4693FF] focus-within:border-[#4693FF]"
            onClick={() => {
              if (!disabled) setOpenBox(!openBox);
            }}
          >
            {openBox ? (
              <input
                type="text"
                className="w-full outline-none bg-transparent"
                placeholder={placeholder || "Nhập để tìm bệnh viện..."}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  if (!openBox) setOpenBox(true);
                }}
                onFocus={() => setOpenBox(true)}
                onKeyDown={(e) => {
                  if (!openBox) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight((h) => Math.min(h + 1, options.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight((h) => Math.max(h - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (highlight >= 0 && options[highlight]) {
                      onChange(options[highlight]);
                      setOpenBox(false);
                    }
                  } else if (e.key === "Escape") {
                    setOpenBox(false);
                  }
                }}
                disabled={disabled}
              />
            ) : (
              <div className="flex items-center justify-between">
                <span className={value ? "text-gray-900" : "text-gray-500"}>
                  {value ? value.label : placeholder || "Chọn bệnh viện..."}
                </span>
                {!value && (
                  <svg className={`w-4 h-4 transition-transform ${openBox ? 'rotate-180' : ''} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            )}
          </div>
          {value && !openBox && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          {openBox && !disabled && (
            <div className="absolute z-[110] mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {loadingBox && <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>}
              {!loadingBox && options.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
              )}
              {!loadingBox &&
                options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`px-3 py-2 text-sm cursor-pointer ${
                      idx === highlight ? "bg-gray-100" : ""
                    }`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt);
                      setOpenBox(false);
                    }}
                  >
                    {opt.label}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Helper functions để format số với dấu chấm phân cách hàng nghìn
  function formatNumber(value: number | ''): string {
    if (value === '' || value === null || value === undefined) return '';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function parseFormattedNumber(value: string): number | '' {
    // Loại bỏ dấu chấm phân cách hàng nghìn (chỉ giữ lại số)
    // Ví dụ: "1.000.000" -> "1000000", "7.000.000.000" -> "7000000000"
    const cleaned = value.replace(/\./g, '').replace(/[^\d]/g, '');
    if (cleaned === '' || cleaned === '0') return '';
    // Sử dụng parseInt thay vì parseFloat để tránh mất độ chính xác với số nguyên lớn
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? '' : num;
  }

  // Format input giá tiền
  function handlePriceChange(value: string) {
    // Lưu giá trị hiển thị ngay (cho phép user nhập tự do)
    setYearlyPriceDisplay(value);
    // Parse giá trị số từ input (loại bỏ dấu chấm và ký tự không phải số)
    const parsed = parseFormattedNumber(value);
    // Lưu giá trị số
    setForm((s) => ({ ...s, yearlyPrice: parsed }));
  }
  
  function handlePriceBlur() {
    // Format lại khi blur
    if (form.yearlyPrice !== '' && typeof form.yearlyPrice === 'number') {
      setYearlyPriceDisplay(formatNumber(form.yearlyPrice));
    } else {
      setYearlyPriceDisplay('');
    }
  }
  
  function handlePriceFocus() {
    // Khi focus, hiển thị giá trị đã format
    if (form.yearlyPrice !== '' && typeof form.yearlyPrice === 'number') {
      setYearlyPriceDisplay(formatNumber(form.yearlyPrice));
    } else {
      setYearlyPriceDisplay('');
    }
  }

  // Handler cho totalPrice tương tự yearlyPrice
  function handleTotalPriceChange(value: string) {
    setTotalPriceDisplay(value);
    const parsed = parseFormattedNumber(value);
    setForm((s) => ({ ...s, totalPrice: parsed }));
  }

  function handleTotalPriceBlur() {
    if (form.totalPrice !== '' && typeof form.totalPrice === 'number') {
      setTotalPriceDisplay(formatNumber(form.totalPrice));
    } else {
      setTotalPriceDisplay('');
    }
  }

  function handleTotalPriceFocus() {
    if (typeof form.totalPrice === "number") {
      setTotalPriceDisplay(formatNumber(form.totalPrice));
    }
  }

  // Filter Components
  type ITUserOption = { id: number; name: string; phone?: string | null };

  function FilterPersonInChargeSelect({
    value,
    onChange,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    options: ITUserOption[];
  }) {
    const [openBox, setOpenBox] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlight, setHighlight] = useState(-1);
    const inputRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
      if (!searchQuery.trim()) return options;
      const q = searchQuery.toLowerCase().trim();
      return options.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.phone?.includes(q)
      );
    }, [options, searchQuery]);

    const displayOptions = filteredOptions.slice(0, 7);
    const hasMore = filteredOptions.length > 7;
    const selectedUser = options.find((u) => String(u.id) === value);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(e.target as Node)
        ) {
          setOpenBox(false);
          setSearchQuery("");
        }
      };
      if (openBox) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [openBox]);

    return (
      <div className="relative min-w-[200px]">
        <div
          ref={inputRef}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm cursor-pointer focus-within:ring-1 focus-within:ring-[#4693FF] focus-within:border-[#4693FF]"
          onClick={() => {
            setOpenBox(!openBox);
          }}
        >
          {openBox ? (
            <input
              type="text"
              className="w-full outline-none bg-transparent"
              placeholder="Tìm kiếm người phụ trách..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlight(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => Math.min(h + 1, displayOptions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (highlight >= 0 && displayOptions[highlight]) {
                    onChange(String(displayOptions[highlight].id));
                    setOpenBox(false);
                    setSearchQuery("");
                  }
                } else if (e.key === "Escape") {
                  setOpenBox(false);
                  setSearchQuery("");
                }
              }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <div className="flex items-center justify-between">
              <span className={value ? "text-gray-900" : "text-gray-500"}>
                {selectedUser ? selectedUser.name : "Tất cả người phụ trách"}
              </span>
              <svg className={`w-4 h-4 transition-transform ${openBox ? 'rotate-180' : ''} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
        {openBox && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg"
            style={{ maxHeight: "200px", overflowY: "auto" }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
            ) : (
              <>
                <div
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 border-b border-gray-100 ${
                    !value ? "bg-blue-50" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange("");
                    setOpenBox(false);
                    setSearchQuery("");
                  }}
                >
                  <div className="font-medium text-gray-800">Tất cả người phụ trách</div>
                </div>
                {displayOptions.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      idx === highlight ? "bg-gray-100" : ""
                    } ${String(opt.id) === value ? "bg-blue-50" : ""}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(String(opt.id));
                      setOpenBox(false);
                      setSearchQuery("");
                    }}
                  >
                    <div className="font-medium text-gray-800">{opt.name}</div>
                    {opt.phone && (
                      <div className="text-xs text-gray-500">{opt.phone}</div>
                    )}
                  </div>
                ))}
                {hasMore && (
                  <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
                    Và {filteredOptions.length - 7} kết quả khác... (cuộn để xem)
                  </div>
                )}
                {filteredOptions.length > 7 &&
                  filteredOptions.slice(7).map((opt, idx) => (
                    <div
                      key={opt.id}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                        idx + 7 === highlight ? "bg-gray-100" : ""
                      } ${String(opt.id) === value ? "bg-blue-50" : ""}`}
                      onMouseEnter={() => setHighlight(idx + 7)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onChange(String(opt.id));
                        setOpenBox(false);
                        setSearchQuery("");
                      }}
                    >
                      <div className="font-medium text-gray-800">{opt.name}</div>
                      {opt.phone && (
                        <div className="text-xs text-gray-500">{opt.phone}</div>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Hợp đồng bảo trì | TAGTECH"
        description="Quản lý hợp đồng bảo trì: danh sách, tìm kiếm, tạo, sửa, xóa"
      />

      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold mb-0">Hợp đồng bảo trì</h1>
          {canEdit && (
            <button
              className="rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md flex items-center gap-2"
              onClick={onCreate}
            >
            <PlusIcon style={{ width: 18, height: 18, fill: 'white' }} />
            <span>Thêm mới</span>
            </button>
          )}
        </div>

        {/* Filters & Actions */}
        <ComponentCard title="Tìm kiếm & Lọc">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Tìm theo mã hợp đồng / bệnh viện"
              value={qSearch}
              onChange={(e) => setQSearch(e.target.value)}
              className="rounded-full border border-gray-200 px-4 py-2.5 text-sm shadow-sm min-w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition"
            />
            <div className="relative" ref={dateFilterRef}>
              <button
                type="button"
                onClick={() => {
                  setPendingFilterStart(filterStartFrom);
                  setPendingFilterEnd(filterStartTo);
                  setDateFilterOpen((prev) => !prev);
                }}
                className="rounded-full border border-gray-200 px-4 py-2.5 text-sm shadow-sm hover:bg-gray-50 transition flex items-center gap-2"
              >
                <span>📅</span>
                <span>Lọc theo thời gian</span>
              </button>
              {dateFilterOpen && (
                <div className="absolute z-40 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Bắt đầu từ</label>
                    <input
                      type="date"
                      value={pendingFilterStart}
                      onChange={(e) => setPendingFilterStart(e.target.value)}
                      ref={pendingStartInputRef}
                      onFocus={(e) => {
                        if (typeof e.currentTarget.showPicker === "function") {
                          e.currentTarget.showPicker();
                        }
                      }}
                      onClick={(e) => {
                        if (typeof e.currentTarget.showPicker === "function") {
                          e.currentTarget.showPicker();
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Đến</label>
                    <input
                      type="date"
                      value={pendingFilterEnd}
                      onChange={(e) => setPendingFilterEnd(e.target.value)}
                      ref={pendingEndInputRef}
                      onFocus={(e) => {
                        if (typeof e.currentTarget.showPicker === "function") {
                          e.currentTarget.showPicker();
                        }
                      }}
                      onClick={(e) => {
                        if (typeof e.currentTarget.showPicker === "function") {
                          e.currentTarget.showPicker();
                        }
                      }}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingFilterStart("");
                        setPendingFilterEnd("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Xóa chọn
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDateFilterOpen(false)}
                        className="px-3 py-1.5 text-sm rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilterOpen(false);
                          setFilterStartFrom(pendingFilterStart);
                          setFilterStartTo(pendingFilterEnd);
                        }}
                        className="px-3 py-1.5 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Lọc
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Người phụ trách</span>
              <FilterPersonInChargeSelect
                value={qPicUserId ? String(qPicUserId) : ""}
                onChange={(v) => setQPicUserId(v)}
                options={picOptions.map(opt => ({
                  id: opt.id,
                  name: opt.label,
                  phone: opt.phone || null,
                }))}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFilterStartFrom(pendingFilterStart);
                  setFilterStartTo(pendingFilterEnd);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 transition"
              >
                <span>Lọc</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setQSearch("");
                  setQPicUserId("");
                  setFilterStartFrom("");
                  setFilterStartTo("");
                  setPendingFilterStart("");
                  setPendingFilterEnd("");
                }}
                className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <span>Xóa</span>
              </button>
            </div>
          </div>
          <div className="mt-4 text-sm font-semibold text-gray-700">
            Tổng hợp đồng:
            <span className="ml-1 text-gray-900">{totalElements}</span>
          </div>
          {(filterStartFrom || filterStartTo) && (
            <div className="mt-2 text-xs text-gray-500">
              Đang lọc từ{" "}
              <span className="font-semibold text-blue-600">
                {formatFilterDateLabel(filterStartFrom)}
              </span>{" "}
              đến{" "}
              <span className="font-semibold text-blue-600">
                {formatFilterDateLabel(filterStartTo)}
              </span>
            </div>
          )}
        </ComponentCard>

        {/* Card list */}
        <ComponentCard title="Danh sách hợp đồng bảo trì">
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-lg shadow-sm transition-all duration-150 ${hoveredId === item.id ? 'shadow-lg scale-101 bg-indigo-50 border-green-400' : 'hover:shadow hover:border-green-300'}`}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-gray-50 text-sm font-semibold text-gray-700">
                    BH{item.id}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{item.hospital?.label ?? '—'}</div>
                      <div className="text-sm">
                        <span className="text-gray-500">Mã hợp đồng: </span>
                        <span className="font-medium text-blue-600">{item.contractCode ?? '—'}</span>
                      </div>
                    </div>
                  </div>

                    <div className="mt-2 grid grid-cols-2 md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div>Người phụ trách:
                        <div className="font-medium text-gray-800">
                          {item.picUser?.label ?? '—'}
                          {item.picUser?.subLabel ? <span className="ml-2 text-xs text-gray-500">{item.picUser?.subLabel}</span> : null}
                        </div>
                      </div>
                      <div>Thời hạn hợp đồng: <div className="font-medium text-gray-800">{item.durationYears} </div></div>
                      <div>Thời gian bắt đầu hợp đồng: <div className="font-medium text-gray-800">{fmtDate(item.startDate) || '—'}</div></div>
                      <div>Ngày kết thúc hợp đồng: <div className="font-medium text-gray-800">{fmtDate(item.endDate) || '—'}</div></div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm text-gray-700">
                      <div className="flex items-center gap-6">
                        <div>Giá hợp đồng (1 năm): <span className="font-medium whitespace-nowrap">{formatCurrency(item.yearlyPrice)}</span></div>
                        <div>Tổng tiền: <span className="font-semibold whitespace-nowrap">{formatCurrency(item.totalPrice)}</span></div>
                      </div>
                      <div />
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => onView(item)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-100 text-blue-600 bg-white hover:bg-blue-50"
                    >
                      <AiOutlineEye className="w-4 h-4" />
                      <span className="text-sm">Xem</span>
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => onEdit(item)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-yellow-100 text-orange-600 bg-yellow-50 hover:bg-yellow-100"
                        >
                          <AiOutlineEdit className="w-4 h-4" />
                          <span className="text-sm">Sửa</span>
                        </button>
                        <button
                          onClick={() => onDelete(item.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-100 text-red-600 bg-red-50 hover:bg-red-100"
                        >
                          <AiOutlineDelete className="w-4 h-4" />
                          <span className="text-sm">Xóa</span>
                        </button>
                      </>
                    )}
                </div>
              </div>
            ))}

            {!loading && items.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <div className="flex flex-col items-center">
                  <svg
                    className="mb-3 h-12 w-12 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <span className="text-sm">Không có dữ liệu</span>
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalElements}
            itemsPerPage={size}
            onPageChange={setPage}
            onItemsPerPageChange={(newSize) => {
              setSize(newSize);
              setPage(0);
            }}
            itemsPerPageOptions={[10, 20, 50]}
          />

          {loading && <div className="mt-3 text-sm text-gray-500">Đang tải...</div>}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </ComponentCard>
      </div>

      {/* View Modal */}
      <AnimatePresence>
        {open && isViewing && viewing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    📋 Chi tiết hợp đồng bảo trì
                  </h2>
                </div>
              </div>

              <div
                className="overflow-y-auto px-6 py-6 space-y-6 text-sm text-gray-800 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {isModalLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <svg
                      className="mb-4 h-12 w-12 animate-spin text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Đang tải chi tiết...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiFileText className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Mã hợp đồng:</span>
                      </div>
                      <div className="flex-1 text-gray-700">{viewing.contractCode}</div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FaHospitalAlt className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Bệnh viện:</span>
                      </div>
                      <div className="flex-1 text-gray-700">{viewing.hospital?.label || "—"}</div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiUser className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Người phụ trách:</span>
                      </div>
                      <div className="flex-1 text-gray-700">
                        {viewing.picUser?.label || "—"}
                        {viewing.picUser?.subLabel && (
                          <div className="text-xs text-gray-500 mt-1">{viewing.picUser.subLabel}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiClock className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Thời hạn:</span>
                      </div>
                      <div className="flex-1 text-gray-700">{viewing.durationYears}</div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiDollarSign className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Giá/năm:</span>
                      </div>
                      <div className="flex-1 text-gray-700 font-medium text-green-600 whitespace-nowrap">
                        {formatCurrency(viewing.yearlyPrice)}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiDollarSign className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Tổng tiền:</span>
                      </div>
                      <div className="flex-1 text-gray-700 font-medium text-blue-600 whitespace-nowrap">
                        {formatCurrency(viewing.totalPrice)}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiCalendar className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Bắt đầu:</span>
                      </div>
                      <div className="flex-1 text-gray-700">{fmt(viewing.startDate)}</div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="min-w-[150px] flex items-center gap-3">
                        <FiCalendar className="text-gray-500 text-lg" />
                        <span className="font-semibold text-gray-900">Ngày kết thúc:</span>
                      </div>
                      <div className="flex-1 text-gray-700">{fmt(viewing.endDate)}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-10">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 bg-white border border-gray-300 hover:bg-gray-100 transition"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Form Modal */}
      {open && !isViewing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-[1] w-full max-w-4xl rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="sticky top-0 z-20 bg-white rounded-t-3xl px-8 pt-8 pb-4 border-b border-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {isEditing ? "Cập nhật hợp đồng bảo trì" : "Thêm hợp đồng bảo trì"}
                </h3>
              </div>
            </div>

            <div
              className="overflow-y-auto px-8 pb-8 [&::-webkit-scrollbar]:hidden mt-6"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {isModalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <svg
                    className="mb-4 h-12 w-12 animate-spin text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Đang tải chi tiết...</span>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* LEFT */}
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Mã hợp đồng*
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={form.contractCode}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, contractCode: e.target.value }))
                        }
                        disabled={isViewing || !canEdit}
                        placeholder="VD: HD-BH-001"
                      />
                    </div>

                    <RemoteSelectHospital
                      label="Bệnh viện*"
                      placeholder="Chọn bệnh viện..."
                      fetchOptions={searchHospitals}
                      value={selectedHospital}
                      onChange={(v) => {
                        setSelectedHospital(v);
                        setForm((s) => ({ ...s, hospitalId: v ? v.id : undefined }));
                      }}
                      disabled={isViewing || !canEdit}
                    />

                    <RemoteSelectPic
                      label="Người phụ trách*"
                      placeholder="Chọn người phụ trách..."
                      options={picOptions}
                      value={selectedPic}
                      onChange={(v) => {
                        setSelectedPic(v);
                        setForm((s) => ({ ...s, picUserId: v ? v.id : undefined }));
                      }}
                      disabled={isViewing || !canEdit}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Thời hạn hợp đồng*
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={form.durationYears}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, durationYears: e.target.value }))
                        }
                        disabled={isViewing || !canEdit}
                        placeholder="Ví dụ: 1 năm 6 tháng, 2 năm 3 tháng..."
                      />
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Giá hợp đồng (1 năm)*
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={yearlyPriceDisplay || formatNumber(form.yearlyPrice)}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        onBlur={handlePriceBlur}
                        onFocus={handlePriceFocus}
                        disabled={isViewing || !canEdit}
                        placeholder="Nhập số tiền..."
                      />
                      
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Tổng tiền*
                      </label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={totalPriceDisplay || formatNumber(form.totalPrice)}
                        onChange={(e) => handleTotalPriceChange(e.target.value)}
                        onBlur={handleTotalPriceBlur}
                        onFocus={handleTotalPriceFocus}
                        disabled={isViewing || !canEdit}
                        placeholder="Nhập tổng tiền..."
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Thời gian bắt đầu hợp đồng
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={form.startDate || ""}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, startDate: e.target.value || null }))
                        }
                        disabled={isViewing || !canEdit}
                      />
                      {form.startDate && (
                        <div className="mt-2 text-sm text-gray-700 font-medium">
                          {(() => {
                            // Parse từ format "yyyy-MM-ddTHH:mm" và format thành "HH:mm-dd/MM/yyyy"
                            const match = form.startDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
                            if (match) {
                              const [, year, month, day, hours, minutes] = match;
                              return `${hours}:${minutes}-${day}/${month}/${year}`;
                            }
                            // Fallback: dùng hàm fmt
                            return fmt(form.startDate);
                          })()}
                        </div>
                      )}
                      
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Ngày kết thúc hợp đồng
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                        value={form.endDate || ""}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, endDate: e.target.value || null }))
                        }
                        disabled={isViewing || !canEdit}
                      />
                      {form.endDate && (
                        <div className="mt-2 text-sm text-gray-700 font-medium">
                          {(() => {
                            // Parse từ format "yyyy-MM-ddTHH:mm" và format thành "HH:mm-dd/MM/yyyy"
                            const match = form.endDate.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
                            if (match) {
                              const [, year, month, day, hours, minutes] = match;
                              return `${hours}:${minutes}-${day}/${month}/${year}`;
                            }
                            // Fallback: dùng hàm fmt
                            return fmt(form.endDate);
                          })()}
                        </div>
                      )}
                      
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="col-span-1 md:col-span-2 mt-4 flex items-center justify-between border-t border-gray-200 pt-6">
                    {error && (
                      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400"
                        onClick={closeModal}
                      >
                        Huỷ
                      </button>
                      {canEdit && (
                        <button
                          type="submit"
                          className="rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          {loading ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo mới"}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Create Modal */}
      <AnimatePresence>
        {confirmCreateOpen && pendingSubmit && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50" onClick={cancelCreate} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative z-[111] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-orange-100">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Xác nhận tạo hợp đồng mới
                    </h3>
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700">
                        Bệnh viện <span className="font-bold">"{hospitalNameForConfirm}"</span> đã có hợp đồng bảo trì. Bạn có muốn tạo thêm hợp đồng mới không?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmCreate}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang tạo..." : "Tạo mới"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {confirmDeleteOpen && pendingDeleteId !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50" onClick={cancelDelete} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative z-[111] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200"
            >
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Xác nhận xóa hợp đồng bảo trì
                    </h3>
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        Bạn có chắc chắn muốn xóa hợp đồng bảo trì này? Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={cancelDelete}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition"
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

