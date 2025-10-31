import { useEffect, useMemo, useRef, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
// removed unused icons import (use react-icons instead)
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";

export type Hospital = {
  id: number;
  hospitalCode?: string | null;
  name: string;
  address?: string | null;
  taxCode?: string | null;
  contactPerson?: string | null;
  contactPosition?: string | null;
  contactEmail?: string | null;
  contactNumber?: string | null;
  itDepartmentContact?: string | null;
  itContactPhone?: string | null;
  hisSystemId?: number | null;
  hisSystemName?: string | null;
  bankName?: string | null;
  bankContactPerson?: string | null;
  province?: string | null;
  projectStatus?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  completionDate?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  priority?: string | null;
  createdAt?: string;
  updatedAt?: string | null;
  assignedUserIds?: number[];
  hardwareId?: number | null;
  hardwareName?: string | null;
};

export type HospitalForm = {
  hospitalCode?: string;
  name: string;
  address?: string;
  taxCode?: string;
  contactPerson?: string;
  contactPosition?: string;
  contactEmail?: string;
  contactNumber?: string;
  itDepartmentContact?: string;
  itContactPhone?: string;
  bankName?: string;
  bankContactPerson?: string;
  province?: string;
  hisSystemId?: number;
  hardwareId?: number;
  hardwareName?: string;
  projectStatus: string;
  startDate?: string;
  deadline?: string;
  completionDate?: string;
  notes?: string;
  imageFile?: File | null;
  imageUrl?: string | null;
  priority: string;
  assignedUserIds: number[];
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_BASE}/api/v1/auth/hospitals`;

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



function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateShort(value?: string | null) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    const dd = d.getDate();
    const mm = d.getMonth() + 1;
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return "—";
  }
}

function toLocalDateTime(value?: string) {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
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

  // Filters (client-side)
  const [qName, setQName] = useState("");
  const [qProvince, setQProvince] = useState("");
  const [qStatus, setQStatus] = useState("");

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
    taxCode: "",
    contactPerson: "",
    contactPosition: "",
    contactEmail: "",
    contactNumber: "",
    itDepartmentContact: "",
    itContactPhone: "",
    bankName: "",
    bankContactPerson: "",
    province: "",
    hisSystemId: undefined,
    hardwareId: undefined,
    hardwareName: "",
    projectStatus: "IN_PROGRESS",
    startDate: "",
    deadline: "",
    completionDate: "",
    notes: "",
    imageFile: null,
    imageUrl: null,
    priority: "P2",
    assignedUserIds: [],
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
      taxCode: h.taxCode ?? "",
      contactPerson: h.contactPerson ?? "",
      contactPosition: h.contactPosition ?? "",
      contactEmail: h.contactEmail ?? "",
      contactNumber: h.contactNumber ?? "",
      itDepartmentContact: h.itDepartmentContact ?? "",
      itContactPhone: h.itContactPhone ?? "",
      bankName: h.bankName ?? "",
      bankContactPerson: h.bankContactPerson ?? "",
      province: h.province ?? "",
      hisSystemId: h.hisSystemId ?? undefined,
      hardwareId: h.hardwareId ?? undefined,
      hardwareName: h.hardwareName ?? "",
      projectStatus: h.projectStatus ?? "IN_PROGRESS",
      startDate: h.startDate ? formatDateTimeLocal(h.startDate) : "",
      deadline: h.deadline ? formatDateTimeLocal(h.deadline) : "",
      completionDate: h.completionDate ? formatDateTimeLocal(h.completionDate) : "",
      notes: h.notes ?? "",
      imageFile: null,
      imageUrl: (h.imageUrl && h.imageUrl.trim()) ? h.imageUrl : null,
      priority: h.priority ?? "P2",
      assignedUserIds: h.assignedUserIds ?? [],
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

  const [hardwareOpt, setHardwareOpt] = useState<{ id: number; name: string } | null>(null);

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
  }, [page, size, sortBy, sortDir]);

  // ✅ Bỏ client-side filter, dùng server pagination
  const filtered = useMemo(() => items, [items]);

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({
      hospitalCode: "",
      name: "",
      address: "",
      taxCode: "",
      contactPerson: "",
      contactPosition: "",
      contactEmail: "",
      contactNumber: "",
      itDepartmentContact: "",
      itContactPhone: "",
      bankName: "",
      bankContactPerson: "",
      province: "",
      hisSystemId: undefined,
      hardwareId: undefined,
      hardwareName: "",
      projectStatus: "IN_PROGRESS",
      startDate: "",
      deadline: "",
      completionDate: "",
      notes: "",
      imageFile: null,
      imageUrl: null,
      priority: "P2",
      assignedUserIds: [],
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
      alert("Bạn không có quyền xóa bệnh viện");
      return;
    }
    if (!confirm("Xóa bệnh viện này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`DELETE failed ${res.status}`);
      await fetchList();
      // close modal if currently viewing the deleted item
      if (isViewing) closeModal();
    } catch (e: any) {
      alert(e.message || "Xóa thất bại");
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
        taxCode: form.taxCode?.trim() || undefined,
        contactPerson: form.contactPerson?.trim() || undefined,
        contactPosition: form.contactPosition?.trim() || undefined,
        contactEmail: form.contactEmail?.trim() || undefined,
        contactNumber: form.contactNumber?.trim() || undefined,
        itDepartmentContact: form.itDepartmentContact?.trim() || undefined,
        itContactPhone: form.itContactPhone?.trim() || undefined,
        bankName: form.bankName?.trim() || undefined,
        bankContactPerson: form.bankContactPerson?.trim() || undefined,
        province: form.province?.trim() || undefined,
        hisSystemId: form.hisSystemId ?? undefined,
        hardwareId: form.hardwareId ?? undefined,
        projectStatus: form.projectStatus,
        startDate: toLocalDateTime(form.startDate) || undefined,
        deadline: toLocalDateTime(form.deadline) || undefined,
        completionDate: toLocalDateTime(form.completionDate) || undefined,
        notes: form.notes?.trim() || undefined,
        imageFile: form.imageFile || undefined,
        priority: form.priority,
        assignedUserIds: form.assignedUserIds,
      };

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${BASE}/${editing!.id}` : BASE;

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
    } catch (e: any) {
      setError(e.message || "Lưu thất bại");
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
              {["id", "name", "priority", "startDate", "deadline"].map((k) => (
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
              <button className="rounded-xl border-2 border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2" onClick={fetchList}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
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
                          <h4 title={h.name} className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-800">{h.name}</h4>
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
                              <span className="text-xs text-gray-400">Người liên hệ:</span>
                              <span className="font-medium text-gray-800">{h.contactPerson || "—"}</span>
                            </div>
                            {h.contactNumber && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-sm text-gray-600">{h.contactNumber}</span>
                              </div>
                            )}
                            {h.contactEmail && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-sm text-gray-600 truncate">{h.contactEmail}</span>
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
                              {h.bankName && (
                                <div>
                                  <span className="text-xs text-gray-400">Đơn vị tài trợ:</span>
                                  <span className="font-medium text-gray-800 ml-2">{h.bankName}</span>
                                </div>
                              )}
                              {h.bankContactPerson && (
                                <div>
                                  <span className="text-xs text-gray-400">Liên hệ tài trợ:</span>
                                  <span className="font-medium text-gray-800 ml-2">{h.bankContactPerson}</span>
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
                      <div className="text-right text-sm text-gray-600 mb-3">
                        <div className="text-xs text-gray-400">Bắt đầu</div>
                        <div className="text-sm font-semibold text-gray-900">{formatDateShort(h.startDate)}</div>
                        <div className="mt-2 text-xs text-gray-400">Deadline</div>
                        <div className="text-sm font-semibold text-gray-900">{formatDateShort(h.deadline)}</div>
                      </div>

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

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                {isViewing ? "Chi tiết bệnh viện" : (isEditing ? "Cập nhật bệnh viện" : "Thêm bệnh viện")}
              </h3>
              <button className="rounded-xl p-2 transition-all hover:bg-gray-100 hover:scale-105" onClick={closeModal}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>


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
                    <div>
                      <label className="mb-1 block text-sm">Người phụ trách</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        placeholder="ID users (cách nhau dấu phẩy)"
                        value={(form.assignedUserIds ?? []).join(",")}
                        onChange={(e) =>
                          setForm((s) => ({
                            ...s,
                            assignedUserIds: e.target.value
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean)
                              .map((x) => Number(x))
                              .filter((n) => !Number.isNaN(n)),
                          }))
                        }
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Liên hệ chung</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.contactNumber || ""}
                        onChange={(e) => setForm((s) => ({ ...s, contactNumber: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Email liên hệ</label>
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
                    <div>
                      <label className="mb-1 block text-sm">Người liên hệ</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.contactPerson || ""}
                        onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Đơn vị HIS</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        placeholder="(không bắt buộc)"
                        value={form.hisSystemId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setForm((s) => ({ ...s, hisSystemId: v === "" ? undefined : Number(v) }));
                        }}
                        disabled={isViewing || !canEdit}
                      />
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

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.startDate || ""}
                        onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Deadline</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.deadline || ""}
                        onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Hoàn thành</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.completionDate || ""}
                        onChange={(e) => setForm((s) => ({ ...s, completionDate: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Đơn vị tài trợ</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.bankName || ""}
                        onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Liên hệ đơn vị tài trợ</label>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.bankContactPerson || ""}
                        onChange={(e) => setForm((s) => ({ ...s, bankContactPerson: e.target.value }))}
                        disabled={isViewing || !canEdit}
                      />
                    </div>
                  </div>

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
                      {isViewing ? "Đóng" : "Huỷ"}
                    </button>
                    {!isViewing && canEdit && ( // Chỉ hiện nút Lưu/Cập nhật cho SuperAdmin
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
      )}
    </>
  );
}
