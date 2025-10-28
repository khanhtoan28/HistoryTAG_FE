import { useEffect, useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import Pagination from "../../components/common/Pagination";
import { HardwareAPI, HardwareRequestDTO, HardwareResponseDTO } from "../../api/superadmin.api";

type Hardware = HardwareResponseDTO;

type HardwareForm = {
  name: string;
  type?: string;
  supplier?: string;
  warrantyPeriod?: string;
  notes?: string;
  imageFile?: File | null;
};

export default function HardwarePage() {
  const [items, setItems] = useState<Hardware[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hardware | null>(null);
  const [viewing, setViewing] = useState<Hardware | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<HardwareForm>({
    name: "",
    type: "",
    supplier: "",
    warrantyPeriod: "",
    notes: "",
    imageFile: null,
  });

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
    setForm({ name: "", type: "", supplier: "", warrantyPeriod: "", notes: "", imageFile: null });
    setImagePreview(null);
  }

  function fillForm(h: Hardware) {
    setForm({
      name: h.name ?? "",
      type: h.type ?? "",
      supplier: h.supplier ?? "",
      warrantyPeriod: h.warrantyPeriod ?? "",
      notes: h.notes ?? "",
      imageFile: null,
    });
    setImagePreview(h.imageUrl || null);
  }

  async function fetchDetails(id: number): Promise<Hardware | null> {
    setIsModalLoading(true);
    setError(null);
    try {
      const data = await HardwareAPI.getHardwareById(id);
      return data as Hardware;
    } catch (e: any) {
      setError(e.message || "Lỗi tải chi tiết phần cứng");
      return null;
    } finally {
      setIsModalLoading(false);
    }
  }

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const data = await HardwareAPI.getAllHardware({
        search: search || undefined,
        type: filterType || undefined,
        page,
        size,
        sortBy,
        sortDir,
      });
      if (Array.isArray(data)) {
        setItems(data);
        setTotalElements(data.length);
        setTotalPages(Math.ceil(data.length / size));
      } else {
        setItems((data as any).content || []);
        setTotalElements((data as any).totalElements || 0);
        setTotalPages((data as any).totalPages || Math.ceil(((data as any).totalElements || 0) / size));
      }
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
    if (!search) return items;
    return items.filter((it) => (it.name || "").toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({ name: "", type: "", supplier: "", warrantyPeriod: "", notes: "", imageFile: null });
    setImagePreview(null);
    setOpen(true);
  }

  async function onView(h: Hardware) {
    setEditing(null);
    setViewing(null);
    setOpen(true);
    const details = await fetchDetails(h.id);
    if (details) {
      setViewing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onEdit(h: Hardware) {
    setViewing(null);
    setEditing(null);
    setOpen(true);
    const details = await fetchDetails(h.id);
    if (details) {
      setEditing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Xóa phần cứng này?")) return;
    setLoading(true);
    try {
      await HardwareAPI.deleteHardware(id);
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
      setError("Tên phần cứng không được để trống");
      return;
    }
    if (isViewing) return;

    setLoading(true);
    setError(null);
    try {
      const payload: HardwareRequestDTO = {
        name: form.name.trim(),
        type: form.type || undefined,
        supplier: form.supplier || undefined,
        warrantyPeriod: form.warrantyPeriod || undefined,
        notes: form.notes || undefined,
        imageFile: form.imageFile || undefined,
      };

      if (isEditing) {
        await HardwareAPI.updateHardware(editing!.id, payload);
      } else {
        await HardwareAPI.createHardware(payload);
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

  function onFileChange(file: File | null) {
    setForm((s) => ({ ...s, imageFile: file }));
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  return (
    <>
      <PageMeta title="Quản lý Phần cứng – CRUD" description="Quản lý phần cứng: danh sách, tìm kiếm, tạo, sửa, xóa" />

      <div className="space-y-6">
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30" placeholder="Tìm theo tên" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Array.from(new Set(items.map((i) => i.type).filter(Boolean))).map((t) => (
                <option key={t as string} value={t as string}>{t as string}</option>
              ))}
            </select>
            <span className="hidden md:block col-span-2" />
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {["id", "name", "type"].map((k) => (
                <option key={k} value={k}>Sắp xếp theo: {k}</option>
              ))}
            </select>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">Tổng: <span className="font-medium text-gray-700">{totalElements}</span></p>
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100" onClick={onCreate}>+ Thêm phần cứng</button>
              <button className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50" onClick={fetchList}>Làm mới</button>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Danh sách phần cứng">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-14 text-center">STT</th>
                  <th className="px-3 py-2">Ảnh</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">Nhà cung cấp</th>
                  <th className="px-3 py-2">Bảo hành</th>
                  <th className="px-3 py-2">Ghi chú</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const rowNo = page * size + idx + 1;
                  return (
                    <tr key={h.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-center">{rowNo}</td>
                      <td className="px-3 py-2">
                        {h.imageUrl ? (
                          <img src={h.imageUrl} alt={h.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-gray-50" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium">{h.name}</td>
                      <td className="px-3 py-2">{h.type || "—"}</td>
                      <td className="px-3 py-2">{h.supplier || "—"}</td>
                      <td className="px-3 py-2">{h.warrantyPeriod || "—"}</td>
                      <td className="px-3 py-2">{h.notes || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 text-gray-600" onClick={() => onView(h)}>Xem</button>
                          <button className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50" onClick={() => onEdit(h)}>Sửa</button>
                          <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100" onClick={() => onDelete(h.id)}>Xóa</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 m-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{isViewing ? "Chi tiết phần cứng" : (isEditing ? "Cập nhật phần cứng" : "Thêm phần cứng")}</h3>
              <button className="rounded-md p-1 hover:bg-gray-100" onClick={closeModal}>✕</button>
            </div>

            {isModalLoading ? (
              <div className="text-center py-12 text-gray-500">Đang tải chi tiết...</div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Tên phần cứng*</label>
                    <input required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Loại</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.type || ""} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Hình ảnh</label>
                    <input type="file" accept="image/*" disabled={isViewing} onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
                    {imagePreview && (
                      <div className="mt-2">
                        <img src={imagePreview} className="h-24 w-24 rounded object-cover border" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm">Nhà cung cấp</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.supplier || ""} onChange={(e) => setForm((s) => ({ ...s, supplier: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Thời gian bảo hành</label>
                    <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50" value={form.warrantyPeriod || ""} onChange={(e) => setForm((s) => ({ ...s, warrantyPeriod: e.target.value }))} disabled={isViewing} />
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

