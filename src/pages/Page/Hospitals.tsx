import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
// removed unused icons import (use react-icons instead)
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { FiMapPin, FiPhone, FiUser, FiClock, FiTag, FiImage, FiMap } from "react-icons/fi";
import { FaHospitalAlt } from "react-icons/fa";
import toast from "react-hot-toast";

export type Hospital = {
  id: number;
  hospitalCode?: string | null;
  name: string;
  address?: string | null;
  contactEmail?: string | null;
  contactNumber?: string | null;
  // taxCode, contactPosition, and IT contact fields removed from this page model
  hisSystemId?: number | null;
  hisSystemName?: string | null;
  province?: string | null;
  projectStatus?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  priority?: string | null;
  updatedAt?: string | null;
  assignedUserIds?: number[];
  hardwareId?: number | null;
  hardwareName?: string | null;
  personInChargeId?: number | null;
  personInChargeName?: string | null;
  personInChargeEmail?: string | null;
  personInChargePhone?: string | null;
};

export type HospitalForm = {
  hospitalCode?: string;
  name: string;
  address?: string;
  contactEmail?: string;
  contactNumber?: string;
  province?: string;
  hisSystemId?: number;
  hardwareId?: number;
  hardwareName?: string;
  projectStatus: string;
  notes?: string;
  imageFile?: File | null;
  imageUrl?: string | null;
  priority: string;
  // assignedUserIds removed from Hospital form UI; assignment managed elsewhere
  personInChargeId?: number;
  personInChargeName?: string;
};

type ITUserOption = {
  id: number;
  name: string;
  username?: string;
  email?: string | null;
  phone?: string | null;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_BASE}/api/v1/auth/hospitals`; // GET, Search endpoints
const SUPERADMIN_BASE = `${API_BASE}/api/v1/superadmin/hospitals`; // CREATE, UPDATE, DELETE

const MIN_LOADING_MS = 800;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? {
      Authorization: `Bearer ${token}`,
      Accept: "application/json"
    }
    : { Accept: "application/json" };
}

function toFormData(payload: Record<string, any>) {
  const fd = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) {
      v.forEach((item) => fd.append(k, String(item)));
    } else {
      fd.append(k, v instanceof File ? v : String(v));
    }
  });
  return fd;
}

type EnumOption = { name: string; displayName: string };

const PRIORITY_FALLBACK: EnumOption[] = [
  { name: "P0", displayName: "Rất Khẩn cấp" },
  { name: "P1", displayName: "Khẩn cấp" },
  { name: "P2", displayName: "Quan trọng" },
  { name: "P3", displayName: "Thường xuyên" },
  { name: "P4", displayName: "Thấp" },
];

const STATUS_FALLBACK: EnumOption[] = [
  { name: "IN_PROGRESS", displayName: "Đang thực hiện" },
  { name: "COMPLETED", displayName: "Hoàn thành" },
  { name: "ISSUE", displayName: "Gặp sự cố" },
];

function disp(map: Record<string, string>, key?: string | null) {
  if (!key) return "—";
  return map[key] ?? key;
}

// Hàm lấy màu cho trạng thái
function getStatusColor(status?: string | null): string {
  switch (status) {
    case "IN_PROGRESS":
      return "text-orange-600";
    case "COMPLETED":
      return "text-green-600";
    case "ISSUE":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

// Hàm lấy màu cho độ ưu tiên
function getPriorityColor(priority?: string | null): string {
  switch (priority) {
    case "P0": // Rất Khẩn cấp
      return "text-red-700 ";
    case "P1": // Khẩn cấp
      return "text-orange-700 ";
    case "P2": // Quan trọng
      return "text-yellow-700 ";
    case "P3": // Thường xuyên
      return "text-blue-700 ";
    case "P4": // Thấp
      return "text-gray-700 ";
    default:
      return "text-gray-600 ";
  }
}

// Background color helpers for small status/priority indicators
function getStatusBg(status?: string | null): string {
  switch (status) {
    case "IN_PROGRESS":
      return "bg-orange-500";
    case "COMPLETED":
      return "bg-green-500";
    case "ISSUE":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

function getPriorityBg(priority?: string | null): string {
  switch (priority) {
    case "P0":
      return "bg-red-700";
    case "P1":
      return "bg-orange-600";
    case "P2":
      return "bg-yellow-500";
    case "P3":
      return "bg-blue-600";
    case "P4":
      return "bg-gray-500";
    default:
      return "bg-gray-300";
  }
}



// Date helpers removed or consolidated; Hospital UI uses fmt() for display

// Helper function để format date time
function fmt(dt?: string | null) {
  if (!dt) return "";
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Helper component để hiển thị thông tin
function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-[150px] flex items-center gap-3">
        {icon && <span className="text-gray-500 dark:text-gray-400 text-lg">{icon}</span>}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{label}:</span>
      </div>
      <div className="flex-1 text-gray-700 dark:text-gray-300 break-words">{value ?? "—"}</div>
    </div>
  );
}

// DetailModal component tương tự implementation-tasks.tsx
function DetailModal({
  open,
  onClose,
  item,
  statusMap,
  priorityMap,
}: {
  open: boolean;
  onClose: () => void;
  item: Hospital | null;
  statusMap: Record<string, string>;
  priorityMap: Record<string, string>;
}) {
  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 250, damping: 25 }}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header - Sticky */}
        <div className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              📋 Chi tiết bệnh viện
            </h2>
            {/* <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition"
            >
              ✕
            </button> */}
          </div>
        </div>

        {/* Content - Scrollable with hidden scrollbar */}
        <div 
          className="overflow-y-auto px-6 py-6 space-y-6 text-sm text-gray-800 dark:text-gray-200 [&::-webkit-scrollbar]:hidden" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Grid Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
            <Info label="Mã bệnh viện" icon={<FiTag />} value={item.hospitalCode || "—"} />
            <Info label="Tên bệnh viện" icon={<FaHospitalAlt />} value={item.name} />
            <Info label="Địa chỉ" icon={<FiMapPin />} value={item.address || "—"} />
            <Info label="Tỉnh/Thành" icon={<FiMap />} value={item.province || "—"} />

            <Info
              label="Trạng thái"
              icon={<FiClock />}
              value={
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusBg(item.projectStatus)} text-white`}>
                  {disp(statusMap, item.projectStatus)}
                </span>
              }
            />

            <Info
              label="Độ ưu tiên"
              icon={<FiTag />}
              value={
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getPriorityBg(item.priority)} text-white`}>
                  {disp(priorityMap, item.priority)}
                </span>
              }
            />

            <Info
              label="Người phụ trách chính (IT)"
              icon={<FiUser />}
              value={
                item.personInChargeName ? (
                  <span className="font-medium text-gray-900 dark:text-gray-100">{item.personInChargeName}</span>
                ) : (
                  "—"
                )
              }
            />
            <Info label="SĐT liên hệ viện" icon={<FiPhone />} value={item.contactNumber || "—"} />
            <Info label="Đơn vị HIS" icon={<FiMapPin />} value={item.hisSystemName || item.hisSystemId || "—"} />
            <Info label="Phần cứng" icon={<FiImage />} value={item.hardwareName || item.hardwareId || "—"} />
            {/* Project dates are managed by BusinessProject (master) and are not shown here */}
            {/* Removed: Mã số thuế, Vị trí liên hệ, Phòng IT contact, and Tạo lúc per request */}
            <Info label="Cập nhật lúc" icon={<FiClock />} value={fmt(item.updatedAt)} />
          </div>

          {/* Image */}
          {item.imageUrl && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Ảnh bệnh viện:</p>
              <div className="rounded-xl overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt="Ảnh bệnh viện"
                  className="max-w-full h-auto object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Ghi chú:</p>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3 text-gray-800 dark:text-gray-300 min-h-[60px]">
                {item.notes}
              </div>
            </div>
          )}

          {/* Assigned user info removed from Hospital detail view; assignment is managed elsewhere */}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-10 dark:bg-gray-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HospitalsPage() {
  // Determine if current user can perform write actions (SUPERADMIN)
  const canEdit = (() => {
    try {
      const rolesStr = localStorage.getItem("roles") || sessionStorage.getItem("roles");
      if (!rolesStr) return false;
      const roles = JSON.parse(rolesStr);
      return Array.isArray(roles) && roles.some((r: string) => r === "SUPERADMIN" || r === "SUPER_ADMIN" || r === "Super Admin");
    } catch (e) {
      return false;
    }
  })();
  const [items, setItems] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [enableItemAnimation, setEnableItemAnimation] = useState(true);
  const animationTimer = useRef<number | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters (server-side)
  const [qName, setQName] = useState("");
  const [qProvince, setQProvince] = useState("");
  const [qStatus, setQStatus] = useState("");
  
  // Reset về trang đầu khi filter thay đổi
  useEffect(() => {
    setPage(0);
  }, [qName, qProvince, qStatus]);

  const [priorityOptions] = useState<EnumOption[]>(PRIORITY_FALLBACK);
  const [statusOptions] = useState<EnumOption[]>(STATUS_FALLBACK);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hospital | null>(null);
  const [viewing, setViewing] = useState<Hospital | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false); // Thêm state loading cho modal

  const priorityMap = useMemo(
    () => Object.fromEntries(priorityOptions.map(o => [o.name, o.displayName])),
    [priorityOptions]
  );
  const statusMap = useMemo(
    () => Object.fromEntries(statusOptions.map(o => [o.name, o.displayName])),
    [statusOptions]
  );

  const [form, setForm] = useState<HospitalForm>({
    hospitalCode: "",
    name: "",
    address: "",
    contactEmail: "",
    contactNumber: "",
    province: "",
    hisSystemId: undefined,
    hardwareId: undefined,
    hardwareName: "",
    projectStatus: "IN_PROGRESS",
  // Project dates are now managed by BusinessProject (master)
    notes: "",
    imageFile: null,
    imageUrl: null,
  priority: "P2",
    personInChargeId: undefined,
    personInChargeName: "",
  });

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  // Hàm đóng modal chung
  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
  }

  // Hàm điền dữ liệu vào form từ object Hospital
  function fillForm(h: Hospital) {
    setForm({
      hospitalCode: h.hospitalCode ?? "",
      name: h.name ?? "",
      address: h.address ?? "",
      contactEmail: h.contactEmail ?? "",
      contactNumber: h.contactNumber ?? "",
      province: h.province ?? "",
      hisSystemId: h.hisSystemId ?? undefined,
      hardwareId: h.hardwareId ?? undefined,
      hardwareName: h.hardwareName ?? "",
      projectStatus: h.projectStatus ?? "IN_PROGRESS",
  // project dates are managed by BusinessProject
      notes: h.notes ?? "",
      imageFile: null,
      imageUrl: (h.imageUrl && h.imageUrl.trim()) ? h.imageUrl : null,
      priority: h.priority ?? "P2",
      // assignedUserIds removed from form; we don't populate it here
      personInChargeId: h.personInChargeId ?? undefined,
      personInChargeName: h.personInChargeName ?? "",
    });
  }

  // Hardware search for RemoteSelect
  const searchHardwares = useMemo(
    () => async (term: string) => {
      try {
        const url = `${API_BASE}/api/v1/superadmin/hardware/search?search=${encodeURIComponent(term)}`;
        const res = await fetch(url, { headers: { ...authHeader() }, credentials: "include" } as any);
        if (!res.ok) return [];
        const list = await res.json();
        const mapped = Array.isArray(list) ? list.map((x: any) => ({ id: Number(x.id), name: String(x.label ?? x.name ?? x.id) })) : [];
        return mapped.filter((x: any) => Number.isFinite(x.id) && x.name);
      } catch (e) {
        return [];
      }
    },
    []
  );

  const searchItUsers = useMemo(
    () => async (term: string) => {
      try {
        const params = new URLSearchParams({
          department: "IT",
          status: "true",
        });
        if (term && term.trim()) {
          params.set("fullName", term.trim());
        }
        const res = await fetch(`${API_BASE}/api/v1/superadmin/users/filter?${params.toString()}`, {
          headers: { ...authHeader() },
          credentials: "include",
        } as any);
        if (!res.ok) return [];
        const list = await res.json();
        const array = Array.isArray(list) ? list : [];
        return array
          .map((u: any) => ({
            id: Number(u.id),
            name: String(u.fullname ?? u.username ?? u.email ?? u.id),
            username: u.username ?? undefined,
            email: u.email ?? null,
            phone: u.phone ?? null,
          }))
          .filter((u: ITUserOption) => Number.isFinite(u.id) && u.name);
      } catch (e) {
        return [];
      }
    },
    []
  );

  // Simple RemoteSelect for hardware (local component)
  function RemoteSelectHardware({
    label,
    placeholder,
    fetchOptions,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    placeholder?: string;
    fetchOptions: (q: string) => Promise<Array<{ id: number; name: string }>>;
    value: { id: number; name: string } | null;
    onChange: (v: { id: number; name: string } | null) => void;
    disabled?: boolean;
  }) {
    const [openBox, setOpenBox] = useState(false);
    const [q, setQ] = useState("");
    const [loadingBox, setLoadingBox] = useState(false);
    const [options, setOptions] = useState<Array<{ id: number; name: string }>>([]);
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
    }, [openBox]);

    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{label}</label>
        <div className="relative">
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            placeholder={placeholder || "Nhập để tìm phần cứng..."}
            value={openBox ? q : value?.name || ""}
            onChange={(e) => { setQ(e.target.value); if (!openBox) setOpenBox(true); }}
            onFocus={() => setOpenBox(true)}
            onKeyDown={(e) => {
              if (!openBox) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, options.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); if (highlight >= 0 && options[highlight]) { onChange(options[highlight]); setOpenBox(false); } }
              else if (e.key === "Escape") { setOpenBox(false); }
            }}
            disabled={disabled}
          />
          {value && !openBox && (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" onClick={() => onChange(null)} aria-label="Clear">✕</button>
          )}
          {openBox && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {loadingBox && <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>}
              {!loadingBox && options.length === 0 && (<div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>)}
              {!loadingBox && options.map((opt, idx) => (
                <div key={opt.id} className={`px-3 py-2 text-sm cursor-pointer ${idx === highlight ? 'bg-gray-100' : ''}`} onMouseEnter={() => setHighlight(idx)} onMouseDown={(e) => { e.preventDefault(); onChange(opt); setOpenBox(false); }}>
                  {opt.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function RemoteSelectPersonInCharge({
    label,
    placeholder,
    fetchOptions,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    placeholder?: string;
    fetchOptions: (q: string) => Promise<ITUserOption[]>;
    value: ITUserOption | null;
    onChange: (v: ITUserOption | null) => void;
    disabled?: boolean;
  }) {
    const [openBox, setOpenBox] = useState(false);
    const [q, setQ] = useState("");
    const [loadingBox, setLoadingBox] = useState(false);
    const [options, setOptions] = useState<ITUserOption[]>([]);
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
      return () => {
        alive = false;
      };
    }, [openBox, fetchOptions, options.length, q]);

    return (
      <div>
        <label className="mb-1 block text-sm font-medium">{label}</label>
        <div className="relative">
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
            placeholder={placeholder || "Chọn người phụ trách..."}
            value={openBox ? q : value?.name || ""}
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
          {value && !openBox && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              onClick={() => onChange(null)}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
          {openBox && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
              {loadingBox && <div className="px-3 py-2 text-sm text-gray-500">Đang tải...</div>}
              {!loadingBox && options.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">Không có kết quả</div>
              )}
              {!loadingBox &&
                options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`px-3 py-2 text-sm cursor-pointer ${idx === highlight ? "bg-gray-100" : ""}`}
                    onMouseEnter={() => setHighlight(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(opt);
                      setOpenBox(false);
                    }}
                  >
                    <div className="font-medium text-gray-800">{opt.name}</div>
                    {(opt.username || opt.email || opt.phone) && (
                      <div className="text-xs text-gray-500">
                        {[opt.username, opt.email, opt.phone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const [hardwareOpt, setHardwareOpt] = useState<{ id: number; name: string } | null>(null);
  const [personInChargeOpt, setPersonInChargeOpt] = useState<ITUserOption | null>(null);

  const [hisOptions, setHisOptions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const url = `${API_BASE}/api/v1/superadmin/his?page=0&size=200`;
        const res = await fetch(url, { headers: { ...authHeader() } });
        if (!res.ok) return;
        const data = await res.json();
        // data may be a Spring page or an array
        const list = Array.isArray(data) ? data : (Array.isArray(data.content) ? data.content : []);
        const mapped = list.map((x: any) => ({ id: Number(x.id), name: String(x.name ?? x.label ?? x.id) }));
        if (alive) setHisOptions(mapped.filter((x) => Number.isFinite(x.id)));
      } catch (e) {
        // ignore
      }
    })();
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    // when opening modal populate hardwareOpt from form or viewing/editing metadata
    if (!open) return;
    if (form.hardwareId) {
      const name = viewing?.hardwareName ?? editing?.hardwareName ?? form.hardwareName ?? String(form.hardwareId);
      setHardwareOpt({ id: form.hardwareId, name });
    } else {
      setHardwareOpt(null);
    }
  }, [open, form.hardwareId, viewing, editing]);

  useEffect(() => {
    if (!open) {
      setPersonInChargeOpt(null);
      return;
    }
    if (form.personInChargeId) {
      const name =
        viewing?.personInChargeName ??
        editing?.personInChargeName ??
        form.personInChargeName ??
        `#${form.personInChargeId}`;
      const email = viewing?.personInChargeEmail ?? editing?.personInChargeEmail ?? null;
      const phone = viewing?.personInChargePhone ?? editing?.personInChargePhone ?? null;
      setPersonInChargeOpt({
        id: form.personInChargeId,
        name,
        email: email ?? null,
        phone: phone ?? null,
      });
    } else {
      setPersonInChargeOpt(null);
    }
  }, [open, form.personInChargeId, form.personInChargeName, viewing, editing]);

  // ✅ HÀM GỌI API GET CHI TIẾT
  async function fetchHospitalDetails(id: number): Promise<Hospital | null> {
    setIsModalLoading(true);
    setError(null);
    try {
      // API call: GET /api/v1/auth/hospitals/{hospitalId}
      const res = await fetch(`${BASE}/${id}`, { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET detail failed ${res.status}`);
      const data = await res.json();
      return data as Hospital;
    } catch (e: any) {
      setError(e.message || "Lỗi tải chi tiết bệnh viện");
      console.error("❌ FETCH DETAIL ERROR:", e);
      return null;
    } finally {
      setIsModalLoading(false);
    }
  }

  // ✅ fetchList() - Pagination đúng
  async function fetchList() {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
      const url = new URL(BASE);
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(size));
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortDir", sortDir);
      
      // Thêm filter params
      if (qName.trim()) url.searchParams.set("name", qName.trim());
      if (qProvince.trim()) url.searchParams.set("province", qProvince.trim());
      if (qStatus.trim()) url.searchParams.set("status", qStatus.trim());
      
      const res = await fetch(url.toString(), { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET failed ${res.status}`);
      const data = await res.json();
      setItems(data.content ?? data);
      setTotalElements(data.totalElements ?? data.length ?? 0);
      setTotalPages(data.totalPages ?? Math.ceil((data.totalElements ?? data.length ?? 0) / size));

      // schedule disabling item animation after stagger finishes
      if (enableItemAnimation) {
        const itemCount = (data.content ?? data)?.length ?? (Array.isArray(data) ? data.length : 0);
        const maxDelay = itemCount > 1 ? 2000 + ((itemCount - 2) * 80) : 0;
        const animationDuration = 220;
        const buffer = 120;
        if (animationTimer.current) window.clearTimeout(animationTimer.current);
        animationTimer.current = window.setTimeout(() => setEnableItemAnimation(false), maxDelay + animationDuration + buffer) as unknown as number;
      }

    } catch (e: any) {
      setError(e.message || "Lỗi tải danh sách");
    } finally {
      const elapsed = Date.now() - start;
      if (isInitialLoad) {
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      }
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [page, size, sortBy, sortDir, qName, qProvince, qStatus]);

  // Server đã filter rồi, dùng trực tiếp items
  const filtered = items;

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({
      hospitalCode: "",
      name: "",
      address: "",
      contactEmail: "",
      contactNumber: "",
      province: "",
      hisSystemId: undefined,
      hardwareId: undefined,
      hardwareName: "",
      projectStatus: "IN_PROGRESS",
  // project dates are managed by BusinessProject
      notes: "",
      imageFile: null,
      imageUrl: null,
      priority: "P2",
      // assignedUserIds removed from form
      personInChargeId: undefined,
      personInChargeName: "",
    });
    setOpen(true);
  }

  async function onView(h: Hospital) {
    setEditing(null);
    setViewing(null);
    setOpen(true);

    const details = await fetchHospitalDetails(h.id);
    if (details) {
      setViewing(details);
      fillForm(details);
    } else {
      setOpen(false); // Đóng modal nếu tải thất bại
    }
  }

  async function onEdit(h: Hospital) {
    setViewing(null);
    setEditing(null);
    setOpen(true);

    const details = await fetchHospitalDetails(h.id);
    if (details) {
      setEditing(details);
      fillForm(details);
    } else {
      setOpen(false); // Đóng modal nếu tải thất bại
    }
  }



  async function onDelete(id: number) {
    if (!canEdit) {
      toast.error("Bạn không có quyền xóa bệnh viện");
      return;
    }
    if (!confirm("Xóa bệnh viện này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${SUPERADMIN_BASE}/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `DELETE failed ${res.status}`);
      }
      await fetchList();
      // close modal if currently viewing the deleted item
      if (isViewing) closeModal();
      toast.success("Xóa thành công");
    } catch (e: any) {
      toast.error(e?.message || "Xóa thất bại");
    } finally {
      setLoading(false);
    }
  }

  // ✅ onSubmit() - Dùng PUT khi isEditing là true
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Tên bệnh viện không được để trống");
      return;
    }
    if (isViewing) return;
    if (!canEdit) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }

    setLoading(true);
    setError(null);

    try {
  const payload: any = {
    hospitalCode: form.hospitalCode?.trim() || undefined,
    name: form.name.trim(),
    address: form.address?.trim() || undefined,
    contactEmail: form.contactEmail?.trim() || undefined,
    contactNumber: form.contactNumber?.trim() || undefined,
    province: form.province?.trim() || undefined,
    hisSystemId: form.hisSystemId ?? undefined,
    hardwareId: form.hardwareId ?? undefined,
    projectStatus: form.projectStatus,
  // project dates are handled by BusinessProject; do not send from Hospital
    notes: form.notes?.trim() || undefined,
    imageFile: form.imageFile || undefined,
    priority: form.priority,
    personInChargeId: form.personInChargeId ?? undefined,
    // assignedUserIds intentionally not sent from Hospital form
  };

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${SUPERADMIN_BASE}/${editing!.id}` : SUPERADMIN_BASE;

      const res = await fetch(url, {
        method,
        headers: { ...authHeader() },
        body: toFormData(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${method} failed ${res.status}: ${txt}`);
      }

      closeModal();
      setPage(0); // Reset trang 1
      await fetchList();
      toast.success(isEditing ? "Cập nhật thành công" : "Tạo thành công");
    } catch (e: any) {
      setError(e.message || "Lưu thất bại");
      toast.error(e?.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Pagination logic

  return (
    <>
      <PageMeta
        title="Quản lý bệnh viện – CRUD"
        description="Quản lý bệnh viện: danh sách, tìm kiếm, tạo, sửa, xóa"
      />

      <div className="space-y-10">
        {/* Filters & Actions */}
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px] border-gray-300 bg-white"
              placeholder="Tìm theo tên"
              value={qName}
              onChange={(e) => setQName(e.target.value)}
            />
            <input
              type="text"
              className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[180px] border-gray-300 bg-white"
              placeholder="Tỉnh/Thành"
              value={qProvince}
              onChange={(e) => setQProvince(e.target.value)}
            />
            <input
              type="text"
              className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px] border-gray-300 bg-white"
              placeholder="Trạng thái"
              value={qStatus}
              onChange={(e) => setQStatus(e.target.value)}
            />
            <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 bg-white" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {["id", "name", "priority"].map((k) => (
                <option key={k} value={k}>Sắp xếp theo: {k}</option>
              ))}
            </select>
            <select className="rounded-lg border px-3 py-2 text-sm border-gray-300 bg-white" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">Tổng: <span className="font-semibold text-gray-900">{totalElements}</span></p>
            <div className="flex items-center gap-3">
              {canEdit && (
                <button className={`rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md`} onClick={onCreate}> + Thêm bệnh viện</button>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* Card list (replaces table) */}
        <ComponentCard title="Danh sách bệnh viện">
          {/* inline keyframes for fade-in-up used by cards */}
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="space-y-4">
            {filtered.map((h, idx) => {
              const delayMs = enableItemAnimation ? Math.round(idx * (2000 / Math.max(1, filtered.length))) : 0;
              const leftIndex = h.hospitalCode ? h.hospitalCode : String(page * size + idx + 1).padStart(3, "0");
              // detect first URL in notes (basic)
              const apiMatch = h.notes ? (h.notes.match(/https?:\/\/[^\s)]+/i) ?? null) : null;
              const apiUrl = apiMatch ? apiMatch[0] : null;
              const showApiPill = !!apiUrl || (h.notes && /API/i.test(h.notes));

              return (
                <div key={h.id} className="flex items-start gap-4" style={{ animation: `fadeInUp 600ms ease ${delayMs}ms both` }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onView(h)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onView(h);
                      }
                    }}
                    className="group w-full bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group-hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 hover:border-blue-100 cursor-pointer"
                  >
                    <div className="flex items-start gap-4 w-full md:w-2/3">
                      {/* moved: badge + small icon box inside the card */}
                      <div className="flex-shrink-0 mt-0 flex items-center gap-2">
                        {/* Larger badge that includes project status/priority dots to avoid overflow */}
                        <div className="w-14 h-14 rounded-md bg-white border border-gray-100 flex flex-col items-center justify-center text-sm font-semibold text-gray-700 shadow-sm relative">
                          <span className="text-base font-bold">{leftIndex}</span>
                          <div className="absolute -top-1 -right-1 flex space-x-1">
                            <span className={`${getStatusBg(h.projectStatus)} w-3 h-3 rounded-full border-2 border-white`} />
                            <span className={`${getPriorityBg(h.priority)} w-3 h-3 rounded-full border-2 border-white`} />
                          </div>
                        </div>
                      </div>

                      {/* hospital icon removed intentionally to avoid visual overflow */}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h4
                            title={h.name}
                            className="text-lg font-semibold text-gray-900 group-hover:text-blue-800 break-words whitespace-normal"
                          >
                            {h.name}
                          </h4>
                          {showApiPill && (
                            <a
                              href={apiUrl ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-50"
                            >
                              Kiểm tra API
                            </a>
                          )}
                          <span className="ml-2 text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">{h.province || "—"}</span>
                          <span className="ml-2 inline-flex items-center">
                            <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(h.projectStatus)} bg-gray-50`}>{disp(statusMap, h.projectStatus)}</span>
                            <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(h.priority)} bg-gray-50 ml-2`}>{disp(priorityMap, h.priority)}</span>
                          </span>
                        </div>

                        {/* important summary: address, contact, project, HIS, bank */}
                        <div className="mt-2 text-sm text-gray-700">
                          <div className="truncate">{h.address || "—"}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">Người phụ trách chính:</span>
                              <span className="font-medium text-gray-800">{h.personInChargeName || "—"}</span>
                            </div>
                            {h.contactNumber && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-sm text-gray-600">SĐT liên hệ viện: {h.contactNumber}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                              <div>
                                <span className="text-xs text-gray-400">Đơn vị HIS:</span>
                                <span className="font-medium text-orange-600 ml-2">{h.hisSystemName || '—'}</span>
                              </div>
                              {h.hardwareName && (
                                <div>
                                  <span className="text-xs text-gray-400">Phần cứng:</span>
                                  <span className="font-medium text-gray-800 ml-2">{h.hardwareName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {apiUrl && (
                            <div className="mt-2 text-sm">
                              <span className="text-xs text-orange-500 font-medium">API: </span>
                              <a
                                href={apiUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-orange-600 underline text-sm truncate block max-w-full"
                              >
                                {apiUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end w-full md:w-1/3">
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); onView(h); }} title="Xem" aria-label={`Xem ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-blue-100 text-blue-700 hover:bg-blue-50 transition transform text-xs font-medium">
                          <AiOutlineEye className="w-4 h-4" />
                          <span className="hidden sm:inline">Xem</span>
                        </button>
                        {canEdit && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); onEdit(h); }} title="Sửa" aria-label={`Sửa ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-amber-100 text-amber-700 hover:bg-amber-50 transition transform text-xs font-medium">
                              <AiOutlineEdit className="w-4 h-4" />
                              <span className="hidden sm:inline">Sửa</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(h.id); }} title="Xóa" aria-label={`Xóa ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-red-100 text-red-700 hover:bg-red-50 transition transform text-xs font-medium">
                              <AiOutlineDelete className="w-4 h-4" />
                              <span className="hidden sm:inline">Xóa</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <div className="flex flex-col items-center">
                  <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
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
              setPage(0); // Reset to first page when changing page size
            }}
            itemsPerPageOptions={[10, 20, 50]}
          />

          {loading && (
            <div className="mt-3 text-sm text-gray-500">Đang tải...</div>
          )}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </ComponentCard>
      </div>

      {/* Detail Modal - chỉ hiển thị khi isViewing */}
      <AnimatePresence mode="wait">
        {open && isViewing && viewing && (
          <DetailModal
            key={viewing.id}
            open={open && isViewing}
            onClose={closeModal}
            item={viewing}
            statusMap={statusMap}
            priorityMap={priorityMap}
          />
        )}
      </AnimatePresence>

      {/* Form Modal - chỉ hiển thị khi không phải viewing */}
      {open && !isViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-white rounded-t-3xl px-8 pt-8 pb-4 border-b border-gray-200">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {isEditing ? "Cập nhật bệnh viện" : "Thêm bệnh viện"}
                </h3>
                <button className="rounded-xl p-2 transition-all hover:bg-gray-100 hover:scale-105" onClick={closeModal}>
                  {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg> */}
                </button>
              </div>
            </div>
            {/* Scrollable Content */}

            <div className="overflow-y-auto px-8 pb-8 [&::-webkit-scrollbar]:hidden mt-6  " style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>


            {isModalLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <svg className="mb-4 h-12 w-12 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang tải chi tiết...</span>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* LEFT */}
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Mã bệnh viện</label>
                    <input
                      className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                      value={form.hospitalCode || ""}
                      onChange={(e) => setForm((s) => ({ ...s, hospitalCode: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tên bệnh viện*</label>
                    <input
                      required
                      className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Địa chỉ</label>
                    <input
                      className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed"
                      value={form.address || ""}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Tỉnh/Thành</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.province || ""}
                        onChange={(e) => setForm((s) => ({ ...s, province: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div className="hidden md:block" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">SĐT liên hệ viện</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.contactNumber || ""}
                        onChange={(e) => setForm((s) => ({ ...s, contactNumber: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Email người phụ trách</label>
                      <input
                        type="email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.contactEmail || ""}
                        onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <RemoteSelectPersonInCharge
                      label="Người phụ trách chính (IT)"
                      placeholder="Chọn người phụ trách..."
                      fetchOptions={searchItUsers}
                      value={personInChargeOpt}
                      onChange={(v) => {
                        setPersonInChargeOpt(v);
                        setForm((s) => ({
                          ...s,
                          personInChargeId: v ? v.id : undefined,
                          personInChargeName: v ? v.name : "",
                        }));
                      }}
                      disabled={isViewing || !canEdit}
                    />
                    <div>
                      <label className="mb-1 block text-sm font-medium">Đơn vị HIS</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.hisSystemId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((s) => ({ ...s, hisSystemId: v === "" ? undefined : Number(v) }));
                        }}
                        disabled={isViewing || !canEdit}
                      >
                        <option value="">(không bắt buộc)</option>
                        {(hisOptions || []).map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Hardware selector */}
                  <div className="mt-2">
                    <RemoteSelectHardware
                      label="Phần cứng"
                      placeholder="Tìm phần cứng..."
                      fetchOptions={searchHardwares}
                      value={hardwareOpt}
                      onChange={(v) => { setHardwareOpt(v); setForm((s) => ({ ...s, hardwareId: v ? v.id : undefined, hardwareName: v ? v.name : "" })); }}
                      disabled={isViewing || !canEdit}
                    />
                    {/* Removed external hardware links/clear button as requested */}
                  </div>
                </div>

                {/* RIGHT */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Ảnh bệnh viện</label>
                    {form.imageUrl && (
                      <div className="mb-3">
                        <img
                          // ✅ SỬA: Dùng imageUrl trực tiếp (URL Cloudinary)
                          src={form.imageUrl}
                          alt="Ảnh hiện tại"
                          className="max-w-full h-32 object-cover rounded-lg border"
                          onError={(e) => {
                            console.error("Image load error:", form.imageUrl);
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">Ảnh hiện tại</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                      onChange={(e) => setForm((s) => ({ ...s, imageFile: e.target.files?.[0] ?? null }))}
                      disabled={isViewing || !canEdit}
                    />
                    {form.imageFile && (
                      <p className="text-xs text-green-600 mt-1">Đã chọn: {form.imageFile.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium leading-tight">Ưu tiên*</label>
                    <select
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.priority}
                      onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    >
                      {priorityOptions.map((p) => (
                        <option key={p.name} value={p.name}>{p.displayName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Trạng thái dự án*</label>
                    <select
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.projectStatus}
                      onChange={(e) => setForm((s) => ({ ...s, projectStatus: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    >
                      {statusOptions.map((s) => (
                        <option key={s.name} value={s.name}>{s.displayName}</option>
                      ))}
                    </select>
                  </div>

                        {/* Project dates are managed on BusinessProject now; inputs removed from Hospital form */}

                  <div>
                    <label className="mb-1 block text-sm">Ghi chú</label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      rows={3}
                      value={form.notes || ""}
                      onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                      disabled={isViewing || !canEdit}
                    />
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
                    {canEdit && ( // Chỉ hiện nút Lưu/Cập nhật cho SuperAdmin
                      <button
                        type="submit"
                        className="rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                      >
                        {loading ? "Đang lưu..." : (isEditing ? "Cập nhật" : "Tạo mới")}
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
    </>
  );
}
