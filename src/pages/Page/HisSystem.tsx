import React, { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";

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

  const isEditing = !!editing?.id;

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
    }
  }

  // view details (read-only)
  async function onView(h: HisResponseDTO) {
    try {
      setViewing(null);
      setOpen(true);
      const res = await fetchWithFallback((base) => `${base}/${h.id}`, { headers: { ...authHeader() } });
      const detail = (await res.json()) as HisResponseDTO;
      setViewing(detail);
      // also fill form for consistency so the modal shows data if user switches to edit
      setForm({
        name: detail.name ?? "",
        address: detail.address ?? "",
        contactPerson: detail.contactPerson ?? "",
        email: detail.email ?? "",
        phoneNumber: detail.phoneNumber ?? "",
        apiUrl: detail.apiUrl ?? "",
      });
    } catch (error: unknown) {
      const msg = errMsg(error, "Không thể tải chi tiết HIS");
      console.error("onView error:", error);
      setError(msg);
      setOpen(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Xóa HIS này?")) return;
    setLoading(true);
    try {
      await fetchWithFallback((base) => `${base}/${id}`, { method: "DELETE", headers: { ...authHeader() } });
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
    try {
      const method = isEditing ? "PUT" : "POST";
      await fetchWithFallback((base) => (isEditing ? `${base}/${editing!.id}` : base), {
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
              <button className="rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md" onClick={onCreate}> + Thêm HIS</button>
              <button className="rounded-xl border-2 border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2" onClick={fetchList}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>
        </ComponentCard>

        {/* Card list */}
        <ComponentCard title="Danh sách HIS">
          <div className="overflow-x-auto -mx-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <div className="p-4 space-y-4">
                {filtered.length === 0 && !loading ? (
                  <div className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center">
                      <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <span className="text-sm">Không có dữ liệu</span>
                    </div>
                  </div>
                ) : (
                  filtered.map((h, idx) => {
                    const delay = `${(idx * 1600) / Math.max(1, filtered.length)}ms`;
                    const start = h.createdAt ? new Date(h.createdAt) : null;
                    return (
                      <div
                        key={h.id}
                        className="w-full grid grid-cols-3 gap-4 items-center bg-white rounded-xl p-4 border transition-all hover:shadow-lg hover:border-blue-200 row-anim"
                        style={{ animationDelay: delay }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-4 9 4" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">{h.name}</div>
                            <div className="text-sm text-gray-500">{h.address || '—'}</div>
                          </div>
                        </div>

                        <div className="col-span-1 px-2">
                          <div className="text-sm text-gray-600">Người liên hệ: <span className="text-gray-900 font-medium">{h.contactPerson || '—'}</span></div>
                          <div className="text-sm text-gray-500">Email: {h.email || '—'}</div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-gray-500">{start ? start.toLocaleDateString() : '—'}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <button title="Xem" onClick={() => onView(h)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-300 text-xs font-medium">
                              <AiOutlineEye className="w-3 h-3" />
                              Xem
                            </button>
                            <button title="Chỉnh sửa" onClick={() => onEdit(h)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors duration-300 text-xs font-medium">
                              <AiOutlineEdit className="w-3 h-3" />
                              Sửa
                            </button>
                            <button title="Xóa" onClick={() => onDelete(h.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors duration-300 text-xs font-medium">
                              <AiOutlineDelete className="w-3 h-3" />
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
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
              <h3 className="text-2xl font-bold text-gray-900">{isEditing ? "Cập nhật HIS" : "Thêm HIS"}</h3>
              <button className="rounded-xl p-2 transition-all hover:bg-gray-100 hover:scale-105" onClick={() => setOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {viewing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-3 text-sm text-gray-500">Tên</div>
                  <div className="font-semibold text-gray-900">{viewing.name}</div>
                  <div className="mt-4 text-sm text-gray-500">Địa chỉ</div>
                  <div className="text-gray-700">{viewing.address || '—'}</div>
                  <div className="mt-4 text-sm text-gray-500">API URL</div>
                  <div className="text-gray-700">{viewing.apiUrl || '—'}</div>
                </div>
                <div>
                  <div className="mb-3 text-sm text-gray-500">Người liên hệ</div>
                  <div className="font-medium text-gray-800">{viewing.contactPerson || '—'}</div>
                  <div className="mt-4 text-sm text-gray-500">Email</div>
                  <div className="font-medium text-gray-800">{viewing.email || '—'}</div>
                  <div className="mt-4 text-sm text-gray-500">Số điện thoại</div>
                  <div className="text-gray-700">{viewing.phoneNumber || '—'}</div>
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 flex items-center justify-between border-t border-gray-200 pt-6">
                  {error && (
                    <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    <button type="button" className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400" onClick={() => setOpen(false)}>Đóng</button>
                    <button type="button" className="rounded-xl border-2 border-amber-500 bg-amber-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-amber-600 hover:shadow-lg" onClick={() => { setEditing(viewing); setOpen(true); }}>
                      Chỉnh sửa
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tên HIS*</label>
                    <input
                      required
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
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? "Đang lưu..." : (isEditing ? "Cập nhật" : "Tạo mới")}
                    </button>
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
