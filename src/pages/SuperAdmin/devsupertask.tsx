import React, { useEffect, useState, useRef } from "react";
import TaskFormModal from "./TaskFormModal";
import TaskCard from "./TaskCardNew";
import toast from "react-hot-toast";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000;

type DevTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const DevSuperTaskPage: React.FC = () => {
  const roles = JSON.parse(localStorage.getItem("roles") || "[]");
  const isSuper = roles.some((r: unknown) => {
    if (typeof r === "string") return r.toUpperCase() === "SUPERADMIN";
    if (r && typeof r === "object") {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === "string") return roleName.toUpperCase() === "SUPERADMIN";
    }
    return false;
  });

  const [data, setData] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  // removed person-in-charge (PIC) filter — search uses the input text only
  const [hospitalQuery, setHospitalQuery] = useState<string>("");
  const [hospitalOptions, setHospitalOptions] = useState<Array<{ id: number; label: string }>>([]);
  // selectedHospital removed; we keep hospitalQuery and hospitalOptions for suggestions
  const searchDebounce = useRef<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDir, setSortDir] = useState<string>("asc");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
  // userOptions removed

  const apiBase = `${API_ROOT}/api/v1/superadmin/dev/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DevTask | null>(null);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

  async function fetchList() {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
  const params = new URLSearchParams({ page: String(page), size: String(size), sortBy, sortDir });
      const combinedSearch = (searchTerm || "").trim();
      if (combinedSearch) params.set("search", combinedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const url = `${apiBase}?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  const resp = await res.json();
  const items = Array.isArray(resp?.content) ? resp.content : Array.isArray(resp) ? resp : [];
      setData(items);
  if (resp && typeof resp.totalElements === 'number') setTotalCount(resp.totalElements);
  else setTotalCount(Array.isArray(resp) ? resp.length : null);
      if (enableItemAnimation) {
        const itemCount = items.length;
        const maxDelay = itemCount > 1 ? 2000 + ((itemCount - 2) * 80) : 0;
        const animationDuration = 220;
        const buffer = 120;
        window.setTimeout(() => setEnableItemAnimation(false), maxDelay + animationDuration + buffer);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải dữ liệu");
    } finally {
        const elapsed = Date.now() - start;
        if (isInitialLoad) {
          const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
          await new Promise((res) => setTimeout(res, remaining));
        }
        setLoading(false);
        if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  useEffect(() => { fetchList(); }, [page, size]);

  // reset page when filters/sort/search change
  useEffect(() => { setPage(0); }, [searchTerm, statusFilter, sortBy, sortDir]);

    async function fetchHospitalOptions(query: string) {
      try {
        const res = await fetch(`${API_ROOT}/api/v1/superadmin/hospitals/search?name=${encodeURIComponent(query || "")}`, { headers: authHeaders() });
        if (!res.ok) return;
        const list = await res.json();
        if (Array.isArray(list)) {
          setHospitalOptions(list.map((h: Record<string, unknown>) => ({ id: Number(h['id'] as unknown as number), label: String(h['label'] ?? h['name'] ?? '') })));
        }
      } catch {
        // ignore
      }
    }

    // fetchUsersByHospital removed — we no longer load user options per hospital

  useEffect(() => { fetchList(); }, []); /* eslint-disable-line react-hooks/exhaustive-deps */

  // debounce hospitalQuery -> fetch hospital suggestions
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (hospitalQuery && hospitalQuery.trim().length > 0) {
        fetchHospitalOptions(hospitalQuery.trim());
      } else {
        setHospitalOptions([]);
      }
    }, 300);
    return () => window.clearTimeout(id);
  }, [hospitalQuery]);

  // debounce searchTerm
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => {
      fetchList();
    }, 600);
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
  }, [searchTerm]); /* eslint-disable-line react-hooks/exhaustive-deps */

  // refetch when status or sort changes
  useEffect(() => { fetchList(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [statusFilter]);
  useEffect(() => { fetchList(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [sortBy, sortDir]);

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`${apiBase}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(`Xóa thất bại: ${msg || res.status}`);
      return;
    }
    setData((s) => s.filter((x) => x.id !== id));
  };

  const handleSubmit = async (payload: Record<string, unknown>, id?: number) => {
    const isUpdate = Boolean(id);
    const url = isUpdate ? `${apiBase}/${id}` : apiBase;
    const method = isUpdate ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      toast.error(`${method} thất bại: ${msg || res.status}`);
      return;
    }
    await fetchList();
    toast.success(isUpdate ? "Cập nhật thành công" : "Tạo mới thành công");
  };

  if (!isSuper) {
    return <div className="p-6 text-red-600">Bạn không có quyền truy cập trang SuperAdmin.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Dev Tasks (SuperAdmin)</h1>
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Thao tác</h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  list="hospital-list"
                  type="text"
                  className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px]"
                  placeholder="Tìm theo tên (gõ để gợi ý bệnh viện)"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setHospitalQuery(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { fetchList(); } }}
                  onBlur={(e) => {
                    // if the user picked a suggestion, keep the text (searchTerm already updated)
                    // previously we fetched users by hospital here; that behavior is removed
                    const val = e.currentTarget.value?.trim() || '';
                    if (val.length === 0 || !hospitalOptions.some((h) => h.label === val)) {
                      // do nothing special — free text search is allowed
                    }
                  }}
                />
                <datalist id="hospital-list">
                  {hospitalOptions.map((h) => (
                    <option key={h.id} value={h.label} />
                  ))}
                </datalist>
              </div>

              {/* person-in-charge filter removed; search uses the input box only */}

              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">— Chọn trạng thái —</option>
                <option value="NOT_STARTED">Chưa triển khai</option>
                <option value="IN_PROGRESS">Đang triển khai</option>
                <option value="API_TESTING">Test thông api</option>
                <option value="INTEGRATING">Tích hợp với viện</option>
                <option value="WAITING_FOR_DEV">Chờ dev build update</option>
                <option value="ACCEPTED">Nghiệm thu</option>
              </select>
            </div>
            <div className="mt-3 text-sm text-gray-600">Tổng: <span className="font-semibold text-gray-800">{loading ? '...' : (totalCount ?? data.length)}</span></div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="id">Sắp xếp theo: id</option>
                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                <option value="createdAt">Sắp xếp theo: ngày tạo</option>
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </div>

            <button className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Thêm mới</button>
      <button className="rounded-full border px-4 py-2 text-sm shadow-sm" onClick={async () => { setSearchTerm(''); setStatusFilter(''); setSortBy('id'); setSortDir('asc');
        setLoading(true);
        const start = Date.now();
        await fetchList();
        const minMs = 800;
        const elapsed = Date.now() - start;
        if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
        setLoading(false);
      }}>Làm mới</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }`}</style>

      <div className="space-y-3">
        {loading && isInitialLoad ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse" aria-hidden="true">TAG</div>
          </div>
        ) : (
          data.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</div>
          ) : (
            data.map((row, idx) => (
              <TaskCard
                key={row.id}
                task={row}
                idx={idx}
                animate={enableItemAnimation}
                onOpen={(t) => { setEditing(t as DevTask); setViewOnly(true); setModalOpen(true); }}
                onEdit={(t) => { setEditing(t as DevTask); setViewOnly(false); setModalOpen(true); }}
                onDelete={(id) => handleDelete(id)}
              />
            ))
          )
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0}>Prev</button>
          <span>Trang {page + 1}{totalCount ? ` / ${Math.max(1, Math.ceil(totalCount / size))}` : ""}</span>
          <button className="px-3 py-1 border rounded" onClick={() => setPage((p) => p + 1)} disabled={totalCount !== null && (page + 1) * size >= (totalCount || 0)}>Next</button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Số hàng:</label>
          <select value={String(size)} onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} className="border rounded px-2 py-1">
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>
  <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing ?? undefined} onSubmit={handleSubmit} readOnly={viewOnly} />
    </div>
  );
};

export default DevSuperTaskPage;
