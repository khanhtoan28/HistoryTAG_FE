import React, { useEffect, useState, useRef } from "react";
import TaskFormModal from "./TaskFormModal";
import toast from "react-hot-toast";
import TaskCard from "./TaskCardNew";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000; // ensure spinner shows at least ~2s for perceived smoothness

type ImplTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
  status?: string | null;
  createdAt?: string | null;
  quantity?: number | null;
  agency?: string | null;
  hisSystemName?: string | null;
  hardware?: string | null;
  apiUrl?: string | null;
  apiTestStatus?: string | null;
  bhytPortCheckInfo?: string | null;
  deadline?: string | null;
  startDate?: string | null;
  acceptanceDate?: string | null;
  finishDate?: string | null;
  notes?: string | null;
};

function authHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const ImplementSuperTaskPage: React.FC = () => {
  const roles = JSON.parse(localStorage.getItem("roles") || "[]");
  const isSuper = roles.some((r: unknown) => {
    if (typeof r === "string") return r.toUpperCase() === "SUPERADMIN";
    if (r && typeof r === "object") {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === "string") return roleName.toUpperCase() === "SUPERADMIN";
    }
    return false;
  });
  const [data, setData] = useState<ImplTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [picFilter, setPicFilter] = useState<string>("");
  const searchDebounce = useRef<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDir, setSortDir] = useState<string>("asc");
  const [enableItemAnimation, setEnableItemAnimation] = useState<boolean>(true);
  const [userOptions, setUserOptions] = useState<Array<{ id: number; label: string }>>([]);

  const apiBase = `${API_ROOT}/api/v1/superadmin/implementation/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplTask | null>(null);

  async function fetchList() {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: "0",
        size: "50",
        sortBy: sortBy,
        sortDir: sortDir,
      });
      // Build search param. If a PIC is selected, append the PIC's label (name)
      // to the search query so backend can match tasks by PIC name even when
      // there is no dedicated 'pic' filter on the server.
      let combinedSearch = (searchTerm || "").trim();
      if (picFilter) {
        const found = userOptions.find((u) => String(u.id) === String(picFilter));
        if (found && found.label) {
          combinedSearch = [combinedSearch, found.label].filter(Boolean).join(" ");
        }
      }
      if (combinedSearch) params.set("search", combinedSearch);
      if (statusFilter) params.set("status", statusFilter);

      const url = `${apiBase}?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  const page = await res.json();
      const items = Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : [];
      setData(items);
      // try to read total count from paged response
      if (page && typeof page.totalElements === 'number') setTotalCount(page.totalElements);
      else setTotalCount(Array.isArray(page) ? page.length : null);
      // disable entrance animation after all staggered animations have started
      if (enableItemAnimation) {
        const itemCount = items.length;
        // base delay 2000ms for first visible row, +80ms per subsequent row (as in TaskCardNew)
        const maxDelay = itemCount > 1 ? 2000 + ((itemCount - 2) * 80) : 0;
        const animationDuration = 220; // matches TaskCardNew animation duration
        const buffer = 120; // small buffer before turning off
        window.setTimeout(() => setEnableItemAnimation(false), maxDelay + animationDuration + buffer);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải dữ liệu");
    } finally {
      const elapsed = Date.now() - start;
      // enforce MIN_LOADING_MS only for the initial page load so searches/filters feel snappy
      if (isInitialLoad) {
        const remaining = Math.max(0, MIN_LOADING_MS - elapsed);
        await new Promise((res) => setTimeout(res, remaining));
      }
      setLoading(false);
      // after first full load, stop treating loads as initial
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }

  async function fetchUserOptions() {
    try {
      const res = await fetch(`${API_ROOT}/api/v1/superadmin/users/search?name=`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      // expecting EntitySelectDTO { id, label }
      if (Array.isArray(list)) {
        setUserOptions(list.map((u: Record<string, unknown>) => ({ id: Number(u['id'] as unknown as number), label: String((u['label'] ?? u['fullname'] ?? u['id']) as unknown) })));
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchList();
    fetchUserOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce searchTerm changes
  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    // small debounce to avoid too many requests while typing
    searchDebounce.current = window.setTimeout(() => {
      fetchList();
    }, 600);
    return () => { if (searchDebounce.current) window.clearTimeout(searchDebounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, picFilter]);

  // refetch immediately when statusFilter changes
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // refetch when sort changes
  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

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
          <h1 className="text-3xl font-extrabold text-gray-900">Task triển khai (SuperAdmin)</h1>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-3">Tìm kiếm & Thao tác</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[220px]"
                placeholder="Tìm theo tên"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { fetchList(); } }}
              />

              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px]"
                value={picFilter}
                onChange={(e) => setPicFilter(e.target.value)}
              >
                <option value="">Người phụ trách</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.label}</option>
                ))}
              </select>

              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Trạng thái</option>
                <option value="NOT_STARTED">Chưa triển khai</option>
                <option value="IN_PROGRESS">Đang triển khai</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            <div className="mt-3 text-sm text-gray-600">Tổng: <span className="font-semibold text-gray-800">{loading ? '...' : (totalCount ?? data.length)}</span></div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="id">Sắp xếp theo: id</option>
                <option value="hospitalName">Sắp xếp theo: bệnh viện</option>
                <option value="deadline">Sắp xếp theo: deadline</option>
              </select>
              <select className="rounded-lg border px-3 py-2 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </div>

            <button className="rounded-full bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Thêm mới</button>
            <button className="rounded-full border px-4 py-2 text-sm shadow-sm" onClick={() => { setSearchTerm(''); setStatusFilter(''); setSortBy('id'); setSortDir('asc'); fetchList(); }}>Làm mới</button>
          </div>
        </div>
      </div>

      <div>
        <style>{`
          @keyframes fadeInUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        `}</style>

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
                  onOpen={(t) => { setEditing(t); setModalOpen(true); }}
                  onEdit={(t) => { setEditing(t); setModalOpen(true); }}
                  onDelete={(id) => handleDelete(id)}
                />
              ))
            )
          )}
        </div>
      </div>

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
};

export default ImplementSuperTaskPage;
