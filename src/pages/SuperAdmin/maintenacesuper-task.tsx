import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { FiActivity, FiInfo, FiLink, FiUser, FiClock } from "react-icons/fi";
import toast from "react-hot-toast";
import TaskCard from "./TaskCardNew";
import TaskFormModal from "./TaskFormModal";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";
const MIN_LOADING_MS = 2000;

type MaintTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
  status?: string | null;
  createdAt?: string | null;
  apiUrl?: string | null;
  apiTestStatus?: string | null;
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

function statusBadgeClasses(status?: string | null) {
  if (!status)
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  const s = status.toUpperCase();
  switch (s) {
    case "NOT_STARTED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "API_TESTING":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "INTEGRATING":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "WAITING_FOR_DEV":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "ACCEPTED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

function statusLabel(status?: string | null) {
  if (!status) return "-";
  const map: Record<string, string> = {
    NOT_STARTED: "Chưa triển khai",
    IN_PROGRESS: "Đang triển khai",
    API_TESTING: "Test API",
    INTEGRATING: "Đang tích hợp",
    WAITING_FOR_DEV: "Chờ dev build",
    ACCEPTED: "Nghiệm thu",
  };
  const normalized = status.toUpperCase();
  return map[normalized] || status;
}

const MaintenanceSuperTaskPage: React.FC = () => {
  const roles = JSON.parse(localStorage.getItem("roles") || "[]");
  const isSuper = roles.some((r: unknown) => {
    if (typeof r === "string") return r.toUpperCase() === "SUPERADMIN";
    if (r && typeof r === "object") {
      const roleName = (r as Record<string, unknown>).roleName;
      if (typeof roleName === "string")
        return roleName.toUpperCase() === "SUPERADMIN";
    }
    return false;
  });

  const [data, setData] = useState<MaintTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [hospitalQuery, setHospitalQuery] = useState<string>("");
  const [hospitalOptions, setHospitalOptions] = useState<
    Array<{ id: number; label: string }>
  >([]);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const searchDebounce = useRef<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("id");
  const [sortDir, setSortDir] = useState<string>("asc");
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [enableItemAnimation, setEnableItemAnimation] =
    useState<boolean>(true);

  const apiBase = `${API_ROOT}/api/v1/superadmin/maintenance/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintTask | null>(null);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

  async function fetchList() {
    const start = Date.now();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(size),
        sortBy: sortBy,
        sortDir: sortDir,
      });
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter) params.set("status", statusFilter);

      const url = `${apiBase}?${params.toString()}`;
      const res = await fetch(url, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
      const resp = await res.json();
      const items = Array.isArray(resp?.content)
        ? resp.content
        : Array.isArray(resp)
        ? resp
        : [];
      setData(items);
      if (resp && typeof resp.totalElements === "number")
        setTotalCount(resp.totalElements);
      else setTotalCount(Array.isArray(resp) ? resp.length : null);

      if (enableItemAnimation) {
        const itemCount = items.length;
        const maxDelay = itemCount > 1 ? 2000 + (itemCount - 2) * 80 : 0;
        const animationDuration = 220;
        const buffer = 120;
        window.setTimeout(
          () => setEnableItemAnimation(false),
          maxDelay + animationDuration + buffer
        );
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

  useEffect(() => {
    fetchList();
  }, [page, size]);

  useEffect(() => {
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(() => {
      fetchList();
    }, 600);
    return () => {
      if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    };
  }, [searchTerm, statusFilter, sortBy, sortDir]);

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`${apiBase}/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) {
      const msg = await res.text();
      toast.error(`Xóa thất bại: ${msg || res.status}`);
      return;
    }
    setData((s) => s.filter((x) => x.id !== id));
    toast.success("Đã xóa");
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
    return (
      <div className="p-6 text-red-600">
        Bạn không có quyền truy cập trang SuperAdmin.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          Danh sách công việc bảo trì (SuperAdmin)
        </h1>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {/* Search & Filter */}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchList();
                }}
              />
              <select
                className="rounded-full border px-4 py-3 text-sm shadow-sm min-w-[160px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">— Chọn trạng thái —</option>
                <option value="NOT_STARTED">Chưa triển khai</option>
                <option value="IN_PROGRESS">Đang triển khai</option>
                <option value="API_TESTING">Test thông API</option>
                <option value="INTEGRATING">Tích hợp với viện</option>
                <option value="WAITING_FOR_DEV">Chờ dev build update</option>
                <option value="ACCEPTED">Nghiệm thu</option>
              </select>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Tổng:{" "}
              <span className="font-semibold text-gray-800">
                {loading ? "..." : totalCount ?? data.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="id">Sắp xếp theo: id</option>
                <option value="hospitalName">Bệnh viện</option>
                <option value="createdAt">Ngày tạo</option>
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
              >
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </div>

            <button
              className="rounded-xl bg-blue-600 text-white px-5 py-2 shadow hover:bg-blue-700"
              onClick={() => {
                setEditing(null);
                setViewOnly(false);
                setModalOpen(true);
              }}
            >
              + Thêm mới
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && isInitialLoad ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-blue-600 text-4xl font-extrabold tracking-wider animate-pulse">
              TAG
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500">
            Không có dữ liệu
          </div>
        ) : (
          data.map((row, idx) => (
            <TaskCard
              key={row.id}
              task={row}
              idx={idx}
              animate={enableItemAnimation}
              onOpen={(t) => {
                setEditing(t);
                setViewOnly(true);
                setModalOpen(true);
              }}
              onEdit={(t) => {
                setEditing(t);
                setViewOnly(false);
                setModalOpen(true);
              }}
              onDelete={(id) => handleDelete(id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page <= 0}
          >
            Prev
          </button>
          <span>
            Trang {page + 1}
            {totalCount
              ? ` / ${Math.max(1, Math.ceil(totalCount / size))}`
              : ""}
          </span>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => setPage((p) => p + 1)}
            disabled={
              totalCount !== null && (page + 1) * size >= (totalCount || 0)
            }
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Số hàng:</label>
          <select
            value={String(size)}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
            className="border rounded px-2 py-1"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Modals */}
      {viewOnly ? (
        <DetailModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          item={editing}
        />
      ) : (
        <TaskFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initial={editing ?? undefined}
          onSubmit={handleSubmit}
          readOnly={false}
        />
      )}
    </div>
  );
};

// =======================
// Detail Modal
// =======================
function DetailModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: MaintTask | null;
}) {
  if (!open || !item) return null;
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <span className="text-green-600 dark:text-green-400"><FiActivity /></span>
            <span>Chi tiết tác vụ bảo trì</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="p-6 max-h-[60vh] overflow-y-auto text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <Info label="Tên" value={item.name} icon={<FiInfo />} />
            <Info label="Bệnh viện" value={item.hospitalName} icon={<FiUser />} />
            <Info label="Người phụ trách" value={item.picDeploymentName} icon={<FiUser />} />
            <Info
              label="Trạng thái"
              icon={<FiActivity />}
              value={
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClasses(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              }
            />
            <Info
              label="API URL"
              icon={<FiLink />}
              value={
                item.apiUrl ? (
                  <a href={item.apiUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {item.apiUrl}
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Info label="API Test" value={item.apiTestStatus} icon={<FiInfo />} />
            <Info label="Ngày bắt đầu" value={fmt(item.startDate)} icon={<FiClock />} />
            <Info label="Ngày nghiệm thu" value={fmt(item.acceptanceDate)} icon={<FiClock />} />
            <Info label="Ngày hoàn thành" value={fmt(item.finishDate)} icon={<FiClock />} />
            <Info label="Tạo lúc" value={fmt(item.createdAt)} icon={<FiClock />} />
          </div>

          <div className="mt-6">
            <p className="text-gray-500 mb-2">Ghi chú / Yêu cầu bổ sung:</p>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 min-h-[60px]">
              {item.notes?.trim() || "—"}
            </div>
          </div>
        </div>

        {/* Footer (sticky) */}
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-2 min-w-[140px]">
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="font-semibold text-gray-900 dark:text-gray-100">{label}:</span>
      </div>
      <div className="text-gray-700 dark:text-gray-300 text-right max-w-[60%] break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}

export default MaintenanceSuperTaskPage;
