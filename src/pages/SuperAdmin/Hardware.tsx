import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AiOutlineEye, AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
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
  price?: number | null;
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
  const [showImageModal, setShowImageModal] = useState(false);

  const [form, setForm] = useState<HardwareForm>({
    name: "",
    type: "",
    supplier: "",
    warrantyPeriod: "",
    notes: "",
    imageFile: null,
    price: null,
  });

  function formatPrice(v?: number | null) {
    if (v == null) return "—";
    try {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
    } catch (e) {
      return String(v);
    }
  }

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
    setForm({ name: "", type: "", supplier: "", warrantyPeriod: "", notes: "", imageFile: null, price: null });
    setImagePreview(null);
    setShowImageModal(false);
  }

  function fillForm(h: Hardware) {
    setForm({
      name: h.name ?? "",
      type: h.type ?? "",
      supplier: h.supplier ?? "",
      warrantyPeriod: h.warrantyPeriod ?? "",
      notes: h.notes ?? "",
      imageFile: null,
      price: h.price != null ? Number(h.price) : null,
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
    setForm({ name: "", type: "", supplier: "", warrantyPeriod: "", notes: "", imageFile: null, price: null });
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
      toast.success("Xóa phần cứng thành công");
    } catch (e: any) {
      toast.error(e.message || "Xóa thất bại");
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
          price: form.price != null ? form.price : undefined,
      };

      if (isEditing) {
        await HardwareAPI.updateHardware(editing!.id, payload);
      } else {
        await HardwareAPI.createHardware(payload);
      }
      closeModal();
      setPage(0);
      await fetchList();
      toast.success(isEditing ? "Cập nhật phần cứng thành công" : "Tạo phần cứng thành công");
    } catch (e: any) {
      setError(e.message || "Lưu thất bại");
      toast.error(e.message || "Lưu thất bại");
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

      <div className="space-y-10">
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            <input className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Tìm theo tên" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tất cả loại</option>
              {Array.from(new Set(items.map((i) => i.type).filter(Boolean))).map((t) => (
                <option key={t as string} value={t as string}>{t as string}</option>
              ))}
            </select>
            <span className="hidden md:block col-span-2" />
            <select className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {["id", "name", "type"].map((k) => (
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
              <button className="rounded-xl border border-blue-500 bg-blue-500 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:shadow-md" onClick={onCreate}> + Thêm phần cứng</button>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Danh sách phần cứng">
          <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div className="space-y-4">
            {filtered.map((h, idx) => {
              const delayMs = Math.round(idx * (2000 / Math.max(1, filtered.length)));
              return (
                <div
                  key={h.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onView(h)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(h); } }}
                  className="group bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-1 group-hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 cursor-pointer"
                  style={{ animation: `fadeInUp 600ms ease ${delayMs}ms both` }}
                >
                  <div className="flex items-center gap-4 w-full md:w-2/3">
                    <div className="flex-shrink-0">
                      {h.imageUrl ? (
                        <img src={h.imageUrl} alt={h.name} className="h-12 w-12 rounded-lg object-cover ring-2 ring-gray-100" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 ring-2 ring-gray-100" />
                      )}
                    </div>

                    <div className="hidden md:block w-px h-10 bg-gray-100 rounded mx-2" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 title={h.name} className="font-semibold text-gray-900 truncate group-hover:text-blue-800">{h.name}</h4>
                        <span className="ml-2">
                          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">{h.type || "—"}</span>
                          {h.warrantyPeriod && <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm ml-2">{h.warrantyPeriod}</span>}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="truncate"><span className="text-xs text-gray-400">Nhà cung cấp: </span><span title={h.supplier || ""} className="font-medium text-gray-800">{h.supplier || "—"}</span></div>
                        <div className="truncate mt-1"><span className="text-xs text-gray-400">Ghi chú: </span><span title={h.notes || ""} className="text-gray-700">{h.notes || "—"}</span></div>
                        <div className="truncate mt-1"><span className="text-xs text-gray-400">Giá: </span><span title={String(h.price ?? "—")} className="font-medium text-gray-800">{formatPrice(h.price)}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-1/3">
                    <div className="hidden md:flex flex-col text-right text-sm text-gray-600">
                      <span className="text-xs text-gray-400">Ngày tạo</span>
                      <span className="font-medium">{h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onView(h); }} title="Xem" aria-label={`Xem ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition transform group-hover:scale-105 text-xs font-medium">
                        <AiOutlineEye className="w-4 h-4" />
                        <span className="hidden sm:inline">Xem</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(h); }} title="Sửa" aria-label={`Sửa ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition transform group-hover:scale-105 text-xs font-medium">
                        <AiOutlineEdit className="w-4 h-4" />
                        <span className="hidden sm:inline">Sửa</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(h.id); }} title="Xóa" aria-label={`Xóa ${h.name}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition transform group-hover:scale-105 text-xs font-medium">
                        <AiOutlineDelete className="w-4 h-4" />
                        <span className="hidden sm:inline">Xóa</span>
                      </button>
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
          {error && <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </ComponentCard>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">{isViewing ? "Chi tiết phần cứng" : (isEditing ? "Cập nhật phần cứng" : "Thêm phần cứng")}</h3>
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
            ) : isViewing ? (
              // Layout cho chế độ xem chi tiết - ảnh bên trái, nội dung bên phải
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Phần ảnh bên trái */}
                <div className="lg:w-1/3 flex flex-col items-center">
                  <div className="w-full max-w-sm">
                    {imagePreview ? (
                      <div className="relative cursor-pointer group" onClick={() => setShowImageModal(true)}>
                        <img 
                          src={imagePreview} 
                          alt={form.name} 
                          className="w-full h-80 rounded-3xl object-cover shadow-2xl ring-4 ring-gray-100 transition-transform group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent group-hover:from-black/30 transition-colors"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <svg className="h-8 w-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-80 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 shadow-2xl ring-4 ring-gray-100 flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <svg className="mx-auto h-16 w-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm">Không có ảnh</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <h2 className="mt-6 text-2xl font-bold text-gray-900 text-center">{form.name}</h2>
                </div>

                {/* Phần nội dung bên phải */}
                <div className="lg:w-2/3 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-blue-800 mb-2">Loại phần cứng</label>
                      <p className="text-lg font-medium text-blue-900">{form.type || "—"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-green-800 mb-2">Nhà cung cấp</label>
                      <p className="text-lg font-medium text-green-900">{form.supplier || "—"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-purple-800 mb-2">Thời gian bảo hành</label>
                      <p className="text-lg font-medium text-purple-900">{form.warrantyPeriod || "—"}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-orange-800 mb-2">ID</label>
                      <p className="text-lg font-medium text-orange-900">#{viewing?.id}</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-yellow-800 mb-2">Giá</label>
                      <p className="text-lg font-medium text-yellow-900">{formatPrice(form.price)}</p>
                    </div>
                  </div>
                  
                  {form.notes && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
                      <label className="block text-sm font-semibold text-gray-800 mb-3">Ghi chú</label>
                      <p className="text-gray-700 leading-relaxed">{form.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-6 border-t border-gray-200">
                    <button 
                      type="button" 
                      className="rounded-xl border-2 border-gray-300 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 hover:shadow-md" 
                      onClick={closeModal}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Layout cho chế độ chỉnh sửa/tạo mới
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Tên phần cứng*</label>
                    <input required className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} disabled={isViewing} />
                  </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Giá (VND)</label>
                    <input type="number" step="0.01" min="0" className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.price ?? ""} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value === "" ? null : Number(e.target.value) }))} disabled={isViewing} />
                  </div>
                </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Loại</label>
                    <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.type || ""} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Hình ảnh</label>
                    <input type="file" accept="image/*" disabled={isViewing} className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed" onChange={(e) => onFileChange(e.target.files?.[0] || null)} />
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} className="h-32 w-32 rounded-2xl object-cover shadow-md ring-2 ring-gray-200" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Nhà cung cấp</label>
                    <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.supplier || ""} onChange={(e) => setForm((s) => ({ ...s, supplier: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Thời gian bảo hành</label>
                    <input className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" value={form.warrantyPeriod || ""} onChange={(e) => setForm((s) => ({ ...s, warrantyPeriod: e.target.value }))} disabled={isViewing} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Ghi chú</label>
                    <textarea className="w-full rounded-xl border-2 border-gray-300 px-5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50 disabled:cursor-not-allowed" rows={3} value={form.notes || ""} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} disabled={isViewing} />
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 flex items-center justify-between border-t border-gray-200 pt-6">
                  {error && <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
                  <div className="ml-auto flex items-center gap-3">
                    <button type="button" className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400" onClick={closeModal}>Huỷ</button>
                      <button type="submit" className="rounded-xl border-2 border-blue-500 bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
                        {loading ? "Đang lưu..." : (isEditing ? "Cập nhật" : "Tạo mới")}
                      </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal xem ảnh phóng to */}
      {showImageModal && imagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowImageModal(false)} />
          <div className="relative z-10 max-w-6xl max-h-[90vh] flex flex-col items-center">
            <div className="mb-4 flex items-center justify-between w-full">
              <h3 className="text-xl font-semibold text-white">{form.name}</h3>
              <button 
                className="rounded-full bg-white/20 backdrop-blur-sm p-2 text-white transition-all hover:bg-white/30 hover:scale-105" 
                onClick={() => setShowImageModal(false)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative max-w-5xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl">
              <img 
                src={imagePreview} 
                alt={form.name} 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="mt-4 text-center text-white/80 text-sm">
              Click vào vùng tối để đóng
            </div>
          </div>
        </div>
      )}
    </>
  );
}

