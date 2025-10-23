import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

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

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateTime(value?: string) {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
}

export default function HospitalsPage() {
  const [items, setItems] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totalElements, setTotalElements] = useState(0);

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
    } catch (e: any) {
      setError(e.message || "Lỗi tải danh sách");
    } finally {
      setLoading(false);
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
    if (!confirm("Xóa bệnh viện này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!res.ok) throw new Error(`DELETE failed ${res.status}`);
      await fetchList();
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
  const totalPages = Math.ceil(totalElements / size);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  return (
    <>
      <PageMeta
        title="Quản lý bệnh viện – CRUD"
        description="Quản lý bệnh viện: danh sách, tìm kiếm, tạo, sửa, xóa"
      />

      <div className="space-y-6">
        {/* Filters & Actions */}
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Tìm theo tên"
              value={qName}
              onChange={(e) => setQName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Tỉnh/Thành"
              value={qProvince}
              onChange={(e) => setQProvince(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Trạng thái"
              value={qStatus}
              onChange={(e) => setQStatus(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {["id", "name", "priority", "startDate", "deadline"].map((k) => (
                <option key={k} value={k}>Sắp xếp theo: {k}</option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as any)}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Tổng: <span className="font-medium text-gray-700">{totalElements}</span>
            </p>
            <div className="flex items-center gap-3">
              <button
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                onClick={onCreate}
              >
                + Thêm bệnh viện
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                onClick={fetchList}
              >
                Làm mới
              </button>
            </div>
          </div>
        </ComponentCard>

        {/* Table */}
        <ComponentCard title="Danh sách bệnh viện">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-14 text-center">STT</th>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Tỉnh/TP</th>
                  <th className="px-3 py-2">HIS</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Ưu tiên</th>
                  <th className="px-3 py-2">Bắt đầu</th>
                  <th className="px-3 py-2">Deadline</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const rowNo = page * size + idx + 1;
                  return (
                    <tr key={h.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-center">{rowNo}</td>
                      <td className="px-3 py-2 font-mono">{h.hospitalCode || "—"}</td>
                      <td className="px-3 py-2 font-medium">{h.name}</td>
                      <td className="px-3 py-2">{h.province || "—"}</td>
                      <td className="px-3 py-2">{h.hisSystemName || h.hisSystemId || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                          {disp(statusMap, h.projectStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2">{disp(priorityMap, h.priority)}</td>
                      <td className="px-3 py-2">{h.startDate ? new Date(h.startDate).toLocaleString() : "—"}</td>
                      <td className="px-3 py-2">{h.deadline ? new Date(h.deadline).toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                            {/* Nút 1: Xem chi tiết (Gọi API GET /hospitals/{id}) */}
                            <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 text-gray-600"
                            onClick={() => onView(h)}
                          >
                            Xem
                          </button>
                            {/* Nút 2: Sửa (Gọi API GET /hospitals/{id} và sau đó dùng PUT) */}
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            onClick={() => onEdit(h)}
                          >
                            Sửa
                          </button>
                            {/* Nút 3: Xóa (Gọi API DELETE /hospitals/{id}) */}
                          <button
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                            onClick={() => onDelete(h.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                  </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>

          {/* Pagination buttons */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>Trang {page + 1} / {totalPages}</span>
              <button
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={!hasPrev}
              >
                Prev
              </button>
              <button
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNext}
              >
                Next
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>Hiển thị:</span>
              <select
                className="rounded border px-2 py-1"
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(0); // Reset page
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 m-4 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {isViewing ? "Chi tiết bệnh viện" : (isEditing ? "Cập nhật bệnh viện" : "Thêm bệnh viện")}
              </h3>
              <button className="rounded-md p-1 hover:bg-gray-100" onClick={closeModal}>
                ✕
              </button>
            </div>
            
            {isModalLoading ? (
                <div className="text-center py-12 text-gray-500">
                    Đang tải chi tiết...
                </div>
            ) : (
            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* LEFT */}
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Mã bệnh viện</label>
                  <input 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                    value={form.hospitalCode || ""} 
                    onChange={(e) => setForm((s) => ({ ...s, hospitalCode: e.target.value }))} 
                    disabled={isViewing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Tên bệnh viện*</label>
                  <input 
                    required 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                    value={form.name} 
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} 
                    disabled={isViewing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm">Địa chỉ</label>
                  <input 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                    value={form.address || ""} 
                    onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} 
                    disabled={isViewing}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm">Tỉnh/Thành</label>
                    <input 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                      value={form.province || ""} 
                      onChange={(e) => setForm((s) => ({ ...s, province: e.target.value }))} 
                    disabled={isViewing}
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
                    disabled={isViewing}
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
                    disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Email liên hệ</label>
                    <input 
                      type="email" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                      value={form.contactEmail || ""} 
                      onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} 
                    disabled={isViewing}
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
                    disabled={isViewing}
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
                    disabled={isViewing}
                    />
                  </div>
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
                    disabled={isViewing}
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
                    disabled={isViewing}
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
                    disabled={isViewing}
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
                    disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Deadline</label>
                    <input 
                      type="datetime-local" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                      value={form.deadline || ""} 
                      onChange={(e) => setForm((s) => ({ ...s, deadline: e.target.value }))} 
                    disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Hoàn thành</label>
                    <input 
                      type="datetime-local" 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                      value={form.completionDate || ""} 
                      onChange={(e) => setForm((s) => ({ ...s, completionDate: e.target.value }))} 
                    disabled={isViewing}
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
                    disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Liên hệ đơn vị tài trợ</label>
                    <input 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" 
                      value={form.bankContactPerson || ""} 
                      onChange={(e) => setForm((s) => ({ ...s, bankContactPerson: e.target.value }))} 
                    disabled={isViewing}
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
                    disabled={isViewing}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="col-span-1 md:col-span-2 mt-2 flex items-center justify-between">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button 
                    type="button" 
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100" 
                    onClick={closeModal}
                  >
                    {isViewing ? "Đóng" : "Huỷ"}
                  </button>
                  {!isViewing && ( // Chỉ hiện nút Lưu/Cập nhật khi không ở chế độ xem
                    <button
                      type="submit"
                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50"
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