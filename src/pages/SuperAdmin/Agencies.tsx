import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";

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

      <div className="space-y-6">
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
              placeholder="Liên hệ (người/điện thoại)"
              value={qContact}
              onChange={(e) => setQContact(e.target.value)}
            />
            <span className="hidden md:block" />
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {["id", "name"].map((k) => (
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
                + Thêm đại lý
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

        <ComponentCard title="Danh sách đại lý">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-14 text-center">STT</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Liên hệ</th>
                  <th className="px-3 py-2">Điện thoại</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Địa chỉ</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, idx) => {
                  const rowNo = page * size + idx + 1;
                  return (
                    <tr key={a.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-center">{rowNo}</td>
                      <td className="px-3 py-2 font-medium">{a.name}</td>
                      <td className="px-3 py-2">{a.contactPerson || "—"}</td>
                      <td className="px-3 py-2">{a.phoneNumber || "—"}</td>
                      <td className="px-3 py-2">{a.email || "—"}</td>
                      <td className="px-3 py-2">{a.address || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 text-gray-600" onClick={() => onView(a)}>Xem</button>
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => onEdit(a)}>Sửa</button>
                          <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => onDelete(a.id)}>Xóa</button>
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

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span>Trang:</span>
              <button className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Trước</button>
              <span className="rounded border px-2 py-1">{page + 1}</span>
              <button className="rounded border px-2 py-1 disabled:opacity-50" onClick={() => setPage((p) => p + 1)} disabled={filtered.length < size}>Sau</button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Hiển thị:</span>
              <select className="rounded border px-2 py-1" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}>
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {loading && <div className="mt-3 text-sm text-gray-500">Đang tải...</div>}
          {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </ComponentCard>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 m-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isViewing ? "Chi tiết đại lý" : (isEditing ? "Cập nhật đại lý" : "Thêm đại lý")}</h3>
              <button className="rounded-md p-1 hover:bg-gray-100" onClick={closeModal}>✕</button>
            </div>

            {isModalLoading ? (
              <div className="text-center py-12 text-gray-500">Đang tải chi tiết...</div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tên đại lý*</label>
                    <input required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Địa chỉ</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.address || ""} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} disabled={isViewing} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm">Người liên hệ</label>
                      <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.contactPerson || ""} onChange={(e) => setForm((s) => ({ ...s, contactPerson: e.target.value }))} disabled={isViewing} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm">Điện thoại</label>
                        <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.phoneNumber || ""} onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))} disabled={isViewing} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Email</label>
                      <input type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.email || ""} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Ghi chú</label>
                    <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" rows={3} value={form.notes || ""} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} disabled={isViewing} />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 mt-2 flex items-center justify-between">
                  {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                  <div className="ml-auto flex items-center gap-2">
                    <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100" onClick={closeModal}>{isViewing ? "Đóng" : "Huỷ"}</button>
                    {!isViewing && (
                      <button type="submit" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50" disabled={loading}>
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

