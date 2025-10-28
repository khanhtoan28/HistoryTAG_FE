import React, { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

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
const BASE = `${API_BASE}/api/v1/admin/his`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }
    : { "Content-Type": "application/json", Accept: "application/json" };
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
  const [form, setForm] = useState<HisRequestDTO>({ name: "" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof HisRequestDTO, string>>>({});

  const isEditing = !!editing?.id;

  // ------- data fetching (server paging compatible) ------- //
  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(BASE);
      url.searchParams.set("search", "");
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(size));
      url.searchParams.set("sortBy", String(sortBy));
      url.searchParams.set("sortDir", sortDir);
      const res = await fetch(url.toString(), { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
        setTotalElements(data.length);
      } else {
        const pageRes = data as SpringPage<HisResponseDTO>;
        setItems(pageRes.content ?? []);
        setTotalElements(pageRes.totalElements ?? pageRes.content?.length ?? 0);
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
      const res = await fetch(`${BASE}/${h.id}`, { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET ${res.status}`);
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

  async function onDelete(id: number) {
    if (!confirm("Xóa HIS này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`, { method: "DELETE", headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`DELETE ${res.status}`);
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
      const url = isEditing ? `${BASE}/${editing!.id}` : BASE;
      const res = await fetch(url, {
        method,
        headers: { ...authHeader() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${method} ${res.status}: ${txt}`);
      }
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

      <div className="space-y-6">
        {/* Filters & Actions */}
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Tìm theo tên HIS"
              value={qName}
              onChange={(e) => setQName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Người liên hệ"
              value={qContact}
              onChange={(e) => setQContact(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={String(sortBy)}
              onChange={(e) => setSortBy(e.target.value as keyof HisResponseDTO)}
            >
              {["id", "name", "createdAt"].map((k) => (
                <option key={k} value={k}>
                  Sắp xếp theo: {k}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
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
                + Thêm HIS
              </button>
              <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={fetchList}>
                Làm mới
              </button>
            </div>
          </div>
        </ComponentCard>

        {/* Table */}
        <ComponentCard title="Danh sách HIS">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-14 text-center">STT</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Người liên hệ</th>
                  <th className="px-3 py-2">SĐT</th>
                  <th className="px-3 py-2 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const rowNo = page * size + idx + 1;
                  return (
                    <tr key={h.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-center">{rowNo}</td>
                      <td className="px-3 py-2 font-medium">{h.name}</td>
                      <td className="px-3 py-2">{h.contactPerson || "—"}</td>
                      <td className="px-3 py-2">{h.phoneNumber || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => onEdit(h)}>
                            Sửa
                          </button>
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
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>Trang:</span>
              <button
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Trước
              </button>
              <span className="rounded border px-2 py-1">{page + 1}</span>
              <button
                className="rounded border px-2 py-1 disabled:opacity-50"
                onClick={() => setPage((p) => p + 1)}
                disabled={filtered.length < size}
              >
                Sau
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span>Kích thước:</span>
              <select className="rounded border px-2 py-1" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && <div className="mt-3 text-sm text-gray-500">Đang tải...</div>}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
        </ComponentCard>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 m-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isEditing ? "Cập nhật HIS" : "Thêm HIS"}</h3>
              <button className="rounded-md p-1 hover:bg-gray-100" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tên HIS*</label>
                  <input
                    required
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] ${
                      formErrors.name ? "border-red-400" : "border-gray-300"
                    }`}
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm">Người liên hệ</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] ${
                      formErrors.contactPerson ? "border-red-400" : "border-gray-300"
                    }`}
                    value={form.contactPerson || ""}
                    onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">Email</label>
                  <input
                    type="email"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] ${
                      formErrors.email ? "border-red-400" : "border-gray-300"
                    }`}
                    value={form.email || ""}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  />
                  {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm">Số điện thoại</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] ${
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

              <div className="col-span-1 md:col-span-2 mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                  onClick={() => setOpen(false)}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                  disabled={loading}
                >
                  {isEditing ? "Cập nhật" : "Tạo mới"}
                </button>
              </div>

              {error && (
                <div className="col-span-1 md:col-span-2 mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default HisSystemPage;
