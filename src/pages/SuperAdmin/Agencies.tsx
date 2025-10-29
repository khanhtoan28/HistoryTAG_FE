import { useEffect, useMemo, useState } from "react";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";

type Agency = {
  id: number;
  name: string;
  address?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AgencyForm = {
  name: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  phoneNumber?: string;
  notes?: string;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_BASE}/api/v1/superadmin/agencies`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token
    ? { Authorization: `Bearer ${token}`, Accept: "application/json" }
    : { Accept: "application/json" };
}

export default function AgenciesPage() {
  const [items, setItems] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters (client-side placeholders for now)
  const [qName, setQName] = useState("");
  const [qContact, setQContact] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agency | null>(null);
  const [viewing, setViewing] = useState<Agency | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [form, setForm] = useState<AgencyForm>({
    name: "",
    address: "",
    contactPerson: "",
    email: "",
    phoneNumber: "",
    notes: "",
  });

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
  }

  function fillForm(a: Agency) {
    setForm({
      name: a.name ?? "",
      address: a.address ?? "",
      contactPerson: a.contactPerson ?? "",
      email: a.email ?? "",
      phoneNumber: a.phoneNumber ?? "",
      notes: a.notes ?? "",
    });
  }

  async function fetchDetails(id: number): Promise<Agency | null> {
    setIsModalLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/${id}`, { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET detail failed ${res.status}`);
      const data = await res.json();
      return data as Agency;
    } catch (e: any) {
      setError(e.message || "Lỗi tải chi tiết đại lý");
      console.error("FETCH AGENCY DETAIL ERROR:", e);
      return null;
    } finally {
      setIsModalLoading(false);
    }
  }

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(BASE);
      url.searchParams.set("page", String(page));
      url.searchParams.set("size", String(size));
      url.searchParams.set("sortBy", sortBy);
      url.searchParams.set("sortDir", sortDir);
      const search = [qName, qContact].filter(Boolean).join(" ").trim();
      if (search) url.searchParams.set("search", search);
      const res = await fetch(url.toString(), { headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`GET failed ${res.status}`);
      const data = await res.json();
      setItems(data.content ?? data);
      setTotalElements(data.totalElements ?? data.length ?? 0);
      setTotalPages(data.totalPages ?? Math.ceil((data.totalElements ?? data.length ?? 0) / size));
    } catch (e: any) {
      setError(e.message || "Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, [page, size, sortBy, sortDir]);

  const filtered = useMemo(() => {
    return items.filter((it) =>
      (qName ? it.name.toLowerCase().includes(qName.toLowerCase()) : true) &&
      (qContact
        ? (it.contactPerson || "").toLowerCase().includes(qContact.toLowerCase()) ||
          (it.phoneNumber || "").toLowerCase().includes(qContact.toLowerCase())
        : true)
    );
  }, [items, qName, qContact]);

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({ name: "", address: "", contactPerson: "", email: "", phoneNumber: "", notes: "" });
    setOpen(true);
  }

  async function onView(a: Agency) {
    setEditing(null);
    setViewing(null);
    setOpen(true);
    const details = await fetchDetails(a.id);
    if (details) {
      setViewing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onEdit(a: Agency) {
    setViewing(null);
    setEditing(null);
    setOpen(true);
    const details = await fetchDetails(a.id);
    if (details) {
      setEditing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Xóa đại lý này?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/${id}`, { method: "DELETE", headers: { ...authHeader() } });
      if (!res.ok) throw new Error(`DELETE failed ${res.status}`);
      await fetchList();
    } catch (e: any) {
      alert(e.message || "Xóa thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Tên đại lý không được để trống");
      return;
    }
    if (isViewing) return;

    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        address: form.address?.trim() || undefined,
        contactPerson: form.contactPerson?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phoneNumber: form.phoneNumber?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${BASE}/${editing!.id}` : BASE;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${method} failed ${res.status}: ${txt}`);
      }
      closeModal();
      setPage(0);
      await fetchList();
    } catch (e: any) {
      setError(e.message || "Lưu thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageMeta title="Quản lý Đại lý – CRUD" description="Quản lý đại lý: danh sách, tìm kiếm, tạo, sửa, xóa" />

      <div className="space-y-10">
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <input className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Tìm theo tên" value={qName} onChange={(e) => setQName(e.target.value)} />
            <input className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Liên hệ (người/điện thoại)" value={qContact} onChange={(e) => setQContact(e.target.value)} />
            <span className="hidden md:block col-span-2" />
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {["id", "name"].map((k) => (
                <option key={k} value={k}>Sắp xếp theo: {k}</option>
              ))}
            </select>
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">Tổng: <span className="font-semibold text-gray-900">{totalElements}</span></p>
            <div className="flex items-center gap-3">
              <button className="rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md" onClick={onCreate}> + Thêm đại lý</button>
              <button className="rounded-xl border-2 border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 flex items-center gap-2" onClick={fetchList}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Danh sách đại lý">
          <div className="overflow-x-auto -mx-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-700">STT</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">Tên</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">Liên hệ</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">Điện thoại</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">Email</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">Địa chỉ</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Thao tác</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-100">
                {filtered.map((a, idx) => {
                  const rowNo = page * size + idx + 1;
                  return (
                    <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-5 text-center font-medium text-gray-600">{rowNo}</td>
                      <td className="px-6 py-5"><span className="font-semibold text-gray-900">{a.name}</span></td>
                      <td className="px-6 py-5"><span className="text-gray-700">{a.contactPerson || "—"}</span></td>
                      <td className="px-6 py-5"><span className="text-gray-700">{a.phoneNumber || "—"}</span></td>
                      <td className="px-6 py-5"><span className="text-gray-700">{a.email || "—"}</span></td>
                      <td className="px-6 py-5"><span className="text-gray-700">{a.address || "—"}</span></td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button title="Xem chi tiết" onClick={() => onView(a)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-200 text-xs font-medium">
                            <AiOutlineEye className="w-3 h-3" />
                            Xem
                          </button>
                          <button title="Chỉnh sửa" onClick={() => onEdit(a)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors duration-200 text-xs font-medium">
                            <AiOutlineEdit className="w-3 h-3" />
                            Sửa
                          </button>
                          <button title="Xóa" onClick={() => onDelete(a.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors duration-200 text-xs font-medium">
                            <AiOutlineDelete className="w-3 h-3" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
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
          {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </ComponentCard>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{isViewing ? "Chi tiết đại lý" : (isEditing ? "Cập nhật đại lý" : "Thêm đại lý")}</h3>
              <button className="rounded-xl p-2 transition-all hover:bg-gray-100 hover:scale-105" onClick={closeModal}>✕</button>
            </div>

            {isModalLoading ? (
              <div className="text-center py-12 text-gray-500">Đang tải chi tiết...</div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tên đại lý*</label>
                    <input required className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Địa chỉ</label>
                    <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.address || ""} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} disabled={isViewing} />
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Người liên hệ</label>
                      <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.contactPerson || ""} onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))} disabled={isViewing} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">Điện thoại</label>
                        <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.phoneNumber || ""} onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))} disabled={isViewing} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Email</label>
                      <input type="email" className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.email || ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Ghi chú</label>
                    <textarea className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" rows={3} value={form.notes || ""} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} disabled={isViewing} />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 flex items-center justify-between border-t border-gray-200 pt-6">
                  {error && <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                  <div className="ml-auto flex items-center gap-3">
                    <button type="button" className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400" onClick={closeModal}>{isViewing ? "Đóng" : "Huỷ"}</button>
                    {!isViewing && (
                      <button type="submit" className="rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
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

