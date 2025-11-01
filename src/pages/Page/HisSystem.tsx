import React, { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { FaHospital } from "react-icons/fa";

// ===================== Types ===================== //
export type SortDir = "asc" | "desc";

export interface HisResponseDTO {
  id: number;
  name: string;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  apiUrl?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface HisRequestDTO {
  name: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  apiUrl?: string;
}

// Spring Page
interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ===================== Config & helpers ===================== //
// ⚠️ Fix env access for Vite-based projects
const API_BASE = import.meta.env.VITE_API_URL ?? ""; // same-origin if not set
const BASES = [
  `${API_BASE}/api/v1/superadmin/his`,
  `${API_BASE}/api/v1/admin/his`,
] as const;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }
    : { "Content-Type": "application/json", Accept: "application/json" };
}

async function fetchWithFallback(inputFactory: (base: string) => string, init?: RequestInit) {
  let lastError: unknown = null;
  for (const base of BASES) {
    try {
      const url = inputFactory(base);
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${res.status}`);
      return res;
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError ?? new Error("All endpoints failed");
}

function validate(values: HisRequestDTO) {
  const e: Partial<Record<keyof HisRequestDTO, string>> = {};
  if (!values.name?.trim()) e.name = "Tên HIS là bắt buộc";
  if (values.name && values.name.length > 100) e.name = "Tên HIS tối đa 100 ký tự";
  if (values.address && values.address.length > 255) e.address = "Địa chỉ tối đa 255 ký tự";
  if (values.contactPerson && values.contactPerson.length > 100)
    e.contactPerson = "Người liên hệ tối đa 100 ký tự";
  if (values.email) {
    if (values.email.length > 255) e.email = "Email tối đa 255 ký tự";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(values.email)) e.email = "Email không hợp lệ";
  }
  if (values.phoneNumber) {
    const r = /^\d{10,11}$/;
    if (!r.test(values.phoneNumber)) e.phoneNumber = "Số điện thoại 10-11 chữ số";
  }
  if (values.apiUrl && values.apiUrl.length > 500) e.apiUrl = "API URL tối đa 500 ký tự";
  return e;
}

function errMsg(err: unknown, fallback = "Lỗi xảy ra") {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err;
  return fallback;
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

// ===================== Page ===================== //
const HisSystemPage: React.FC = () => {
  // table state
  const [items, setItems] = useState<HisResponseDTO[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pagination & sort
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState<keyof HisResponseDTO>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // filters (client-side like your Hospitals page)
  const [qName, setQName] = useState("");
  const [qContact, setQContact] = useState("");
  const [qEmail] = useState("");

  // modal/form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HisResponseDTO | null>(null);
  const [viewing, setViewing] = useState<HisResponseDTO | null>(null);
  const [form, setForm] = useState<HisRequestDTO>({ name: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HisRequestDTO, string>>>({});
  const [isModalLoading, setIsModalLoading] = useState(false);

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

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

  // ------- data fetching (server paging compatible) ------- //
  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithFallback((base) => {
        const url = new URL(base);
        url.searchParams.set("search", "");
        url.searchParams.set("page", String(page));
        url.searchParams.set("size", String(size));
        url.searchParams.set("sortBy", String(sortBy));
        url.searchParams.set("sortDir", sortDir);
        return url.toString();
      }, { headers: { ...authHeader() } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        setTotalElements(data.length);
        setTotalPages(Math.ceil(data.length / size));
      } else {
        const pageRes = data as SpringPage<HisResponseDTO>;
        setItems(pageRes.content ?? []);
        setTotalElements(pageRes.totalElements ?? pageRes.content?.length ?? 0);
        setTotalPages(pageRes.totalPages ?? Math.ceil((pageRes.totalElements ?? pageRes.content?.length ?? 0) / size));
      }
    } catch (error: unknown) {
      const msg = errMsg(error, "Lỗi tải dữ liệu");
      console.error("fetchList error:", error);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, sortBy, sortDir]);

  // ------- client-side filtering like hospitals page ------- //
  const filtered = useMemo(() => {
    const name = qName.trim().toLowerCase();
    const contact = qContact.trim().toLowerCase();
    const email = qEmail.trim().toLowerCase();
    return items.filter((h) => {
      const okName = !name || (h.name ?? "").toLowerCase().includes(name);
      const okContact = !contact || (h.contactPerson ?? "").toLowerCase().includes(contact);
      const okEmail = !email || (h.email ?? "").toLowerCase().includes(email);
      return okName && okContact && okEmail;
    });
  }, [items, qName, qContact, qEmail]);

  // ------- modal helpers ------- //
  function onCreate() {
    setEditing(null);
    setForm({ name: "", address: "", contactPerson: "", email: "", phoneNumber: "", apiUrl: "" });
    setFormErrors({});
    setOpen(true);
  }

  async function onEdit(h: HisResponseDTO) {
    setViewing(null);
    setIsModalLoading(true);
    try {
      const res = await fetchWithFallback((base) => `${base}/${h.id}`, { headers: { ...authHeader() } });
      const detail = (await res.json()) as HisResponseDTO;
      setEditing(detail);
      setForm({
        name: detail.name ?? "",
        address: detail.address ?? "",
        contactPerson: detail.contactPerson ?? "",
        email: detail.email ?? "",
        phoneNumber: detail.phoneNumber ?? "",
        apiUrl: detail.apiUrl ?? "",
      });
      setFormErrors({});
      setOpen(true);
    } catch (error: unknown) {
      const msg = errMsg(error, "Không thể tải chi tiết HIS");
      console.error("onEdit error:", error);
      setError(msg);
    } finally {
      setIsModalLoading(false);
    }
  }

  async function onView(h: HisResponseDTO) {
    setEditing(null);
    setViewing(null);
    setOpen(true);
    setIsModalLoading(true);
    try {
      const res = await fetchWithFallback((base) => `${base}/${h.id}`, { headers: { ...authHeader() } });
      const detail = (await res.json()) as HisResponseDTO;
      setViewing(detail);
      setForm({
        name: detail.name ?? "",
        address: detail.address ?? "",
        contactPerson: detail.contactPerson ?? "",
        email: detail.email ?? "",
        phoneNumber: detail.phoneNumber ?? "",
        apiUrl: detail.apiUrl ?? "",
      });
      setFormErrors({});
    } catch (error: unknown) {
      const msg = errMsg(error, "Không thể tải chi tiết HIS");
      console.error("onView error:", error);
      setError(msg);
      setOpen(false);
    } finally {
      setIsModalLoading(false);
    }
  }

  async function onDelete(id: number) {
    if (!canEdit) {
      alert("Bạn không có quyền xóa HIS");
      return;
    }
    if (!confirm("Xóa HIS này?")) return;
    setLoading(true);
    try {
      // @ts-ignore
      const res = await fetchWithFallback((base) => `${base}/${id}`, { method: "DELETE", headers: { ...authHeader() } });
      // adjust page when last item removed
      if (items.length === 1 && page > 0) setPage((p) => p - 1);
      await fetchList();
    } catch (error: unknown) {
      const msg = errMsg(error, "Xóa thất bại");
      console.error("onDelete error:", error);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setError(null);
    if (!canEdit) {
      setError("Bạn không có quyền thực hiện thao tác này");
      return;
    }
    try {
      const method = isEditing ? "PUT" : "POST";
      // @ts-ignore
      const res = await fetchWithFallback((base) => (isEditing ? `${base}/${editing!.id}` : base), {
        method,
        headers: { ...authHeader() },
        body: JSON.stringify(form),
      });
      // if not thrown, res.ok already ensured by fetchWithFallback
      setOpen(false);
      setEditing(null);
      await fetchList();
    } catch (error: unknown) {
      const msg = errMsg(error, "Lưu thất bại");
      console.error("onSubmit error:", error);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ===================== Render ===================== //
  return (
    <>
      <PageMeta title="HIS System – CRUD" description="Quản lý hệ thống HIS: danh sách, lọc, tạo/sửa/xóa" />

      <div className="space-y-10">
        {/* Filters & Actions */}
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <input className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Tìm theo tên HIS" value={qName} onChange={(e) => setQName(e.target.value)} />
            <input className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Người liên hệ" value={qContact} onChange={(e) => setQContact(e.target.value)} />
            <span className="hidden md:block col-span-2" />
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={String(sortBy)} onChange={(e) => setSortBy(e.target.value as keyof HisResponseDTO)}>
              {["id", "name", "createdAt"].map((k) => (
                <option key={k} value={k}>
                  Sắp xếp theo: {k}
                </option>
              ))}
            </select>
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)}>
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
            <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">Tổng: <span className="font-semibold text-gray-900">{totalElements}</span></p>
            <div className="flex items-center gap-3">
              {canEdit && (
                <button className="rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md" onClick={onCreate}> + Thêm HIS</button>
              )}
              {/* <button className="rounded-xl border-2 border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2" onClick={fetchList}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button> */}
            </div>
          </div>
        </ComponentCard>

        {/* Card list version */}
        <ComponentCard title="Danh sách HIS">
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="space-y-4">
            {filtered.map((h, idx) => {
              const delayMs = Math.round(idx * (2000 / Math.max(1, filtered.length)));
              return (
                <div
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onView(h)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onView(h);
                    }
                  }}
                  className="group bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:bg-blue-50/30 hover:ring-1 hover:ring-blue-200 cursor-pointer"
                  style={{ animation: `fadeInUp 600ms ease ${delayMs}ms both` }}
                >
                  <div className="flex items-center gap-4 w-2/3">
                    <div className="h-12 w-12 rounded-lg bg-white flex items-center justify-center text-indigo-600 font-semibold text-sm border border-gray-100 transition-colors duration-200 group-hover:border-blue-200 group-hover:bg-blue-50">
                      <FaHospital className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 title={h.name} className="font-semibold text-gray-900 truncate group-hover:text-blue-800">{h.name}</h4>
                        <span className="text-xs text-gray-400">•</span>
                        <span title={h.address || ""} className="text-xs text-gray-500">{h.address || "—"}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="truncate"><span className="text-xs text-gray-400">Người liên hệ: </span><span title={h.contactPerson || ""} className="font-medium text-gray-800">{h.contactPerson || "—"}</span>{h.phoneNumber && <span className="ml-2 text-xs text-gray-500">• {h.phoneNumber}</span>}</div>
                        <div className="truncate mt-1"><span className="text-xs text-gray-400">Email: </span><span title={h.email || ""} className="text-gray-700">{h.email || "—"}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col text-right text-sm text-gray-600">
                      <span className="text-xs text-gray-400">Ngày tạo</span>
                      <span className="font-medium">{formatDateShort(h.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        title="Xem"
                        aria-label={`Xem ${h.name}`}
                        onClick={(e) => { e.stopPropagation(); onView(h); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition transform group-hover:scale-105 text-xs font-medium"
                      >
                        <AiOutlineEye className="w-4 h-4" />
                        <span className="hidden sm:inline">Xem</span>
                      </button>
                      {canEdit && (
                        <>
                          <button
                            title="Sửa"
                            aria-label={`Sửa ${h.name}`}
                            onClick={(e) => { e.stopPropagation(); onEdit(h); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition transform group-hover:scale-105 text-xs font-medium"
                          >
                            <AiOutlineEdit className="w-4 h-4" />
                            <span className="hidden sm:inline">Sửa</span>
                          </button>
                          <button
                            title="Xóa"
                            aria-label={`Xóa ${h.name}`}
                            onClick={(e) => { e.stopPropagation(); onDelete(h.id); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition transform group-hover:scale-105 text-xs font-medium"
                          >
                            <AiOutlineDelete className="w-4 h-4" />
                            <span className="hidden sm:inline">Xóa</span>
                          </button>
                        </>
                      )}
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

          {loading && <div className="mt-3 text-sm text-gray-500">Đang tải...</div>}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
        </ComponentCard>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{isViewing ? "Chi tiết HIS" : (isEditing ? "Cập nhật HIS" : "Thêm HIS")}</h3>
              <button className="rounded-xl p-2 transition-all hover:bg-gray-100 hover:scale-105" onClick={() => setOpen(false)}>
                {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg> */}
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
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tên HIS*</label>
                    <input
                        required
                        disabled={isViewing || !canEdit}
                      className={`w-full rounded-xl border-2 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        formErrors.name ? "border-red-400" : "border-gray-300"
                      }`}
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    />
                    {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Người liên hệ</label>
                    <input
                      disabled={isViewing || !canEdit}
                      className={`w-full rounded-xl border-2 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        formErrors.contactPerson ? "border-red-400" : "border-gray-300"
                      }`}
                      value={form.contactPerson || ""}
                      onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                    <input
                      disabled={isViewing || !canEdit}
                      type="email"
                      className={`w-full rounded-xl border-2 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        formErrors.email ? "border-red-400" : "border-gray-300"
                      }`}
                      value={form.email || ""}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Số điện thoại</label>
                    <input
                      disabled={isViewing || !canEdit}
                      className={`w-full rounded-xl border-2 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ${
                        formErrors.phoneNumber ? "border-red-400" : "border-gray-300"
                      }`}
                      value={form.phoneNumber || ""}
                      onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))}
                    />
                    {formErrors.phoneNumber && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.phoneNumber}</p>
                    )}
                  </div>
                </div>

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
                      onClick={() => setOpen(false)}
                    >
                      {isViewing ? "Đóng" : "Huỷ"}
                    </button>
                    {!isViewing && canEdit && (
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
};

export default HisSystemPage;
