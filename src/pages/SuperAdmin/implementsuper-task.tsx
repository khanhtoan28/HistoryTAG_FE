import React, { useEffect, useState } from "react";
import TaskFormModal from "./TaskFormModal";
import toast from "react-hot-toast";
import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
import { FaTasks } from "react-icons/fa";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  const [error, setError] = useState<string | null>(null);

  const apiBase = `${API_ROOT}/api/v1/superadmin/implementation/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImplTask | null>(null);

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}?page=0&size=50&sortBy=id&sortDir=asc`, {
        method: "GET",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(`GET ${apiBase} failed: ${res.status}`);
      const page = await res.json();
      setData(Array.isArray(page?.content) ? page.content : Array.isArray(page) ? page : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function statusBadgeClass(status?: string) {
    if (!status) return "bg-gray-100 text-gray-800";
    const s = status.toLowerCase();
    if (s.includes("done") || s.includes("completed") || s.includes("completed")) return "bg-green-100 text-green-800";
    if (s.includes("progress") || s.includes("inprogress") || s.includes("doing")) return "bg-blue-100 text-blue-800";
    if (s.includes("pending") || s.includes("new") || s.includes("todo")) return "bg-yellow-100 text-yellow-800";
    if (s.includes("cancel") || s.includes("fail") || s.includes("error")) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  }

  if (!isSuper) {
    return <div className="p-6 text-red-600">Bạn không có quyền truy cập trang SuperAdmin.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Danh sách công việc triển khai (SuperAdmin)</h1>
        <div>
          <button className="h-10 rounded-xl bg-gray-900 text-white px-3" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Thêm mới</button>
        </div>
      </div>
      {loading && <div>Đang tải...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <style>{`
          @keyframes fadeInUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        `}</style>

        {(!loading && data.length === 0) && (
          <div className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</div>
        )}

        <div className="space-y-3">
          {data.map((row, idx) => (
            <div
              key={row.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setEditing(row); setModalOpen(true); } }}
              onClick={() => { setEditing(row); setModalOpen(true); }}
              className="group flex items-center justify-between rounded-xl border-2 border-transparent bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400/40 hover:border-blue-100"
              style={{ animation: "fadeInUp 220ms both", animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FaTasks />
                </div>
                <div className="hidden w-px rounded bg-gray-200 md:block" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold truncate max-w-md" title={row.name ?? ""}>{row.name}</div>
                    <div className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{row.id}</div>
                    {row.status && (
                      <div className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>{row.status}</div>
                    )}
                  </div>

                  <div className="mt-1 flex flex-col text-sm text-gray-500">
                    <div className="truncate" title={row.hospitalName ?? ""}><span className="font-medium text-gray-700">Bệnh viện:</span> {row.hospitalName ?? "-"}</div>
                    <div className="mt-1 text-xs text-gray-400 truncate" title={row.picDeploymentName ?? ""}><span className="font-medium text-gray-700">PIC:</span> {row.picDeploymentName ?? "-"}</div>
                    {/* show extra fields if present on the object */}
                    {row.hisSystemName && (
                      <div className="mt-1 text-xs text-gray-400 truncate" title={row.hisSystemName}><span className="font-medium text-gray-700">HIS:</span> {row.hisSystemName}</div>
                    )}
                    {row.agency && (
                      <div className="mt-1 text-xs text-gray-400 truncate" title={row.agency}><span className="font-medium text-gray-700">Agency:</span> {row.agency}</div>
                    )}
                    {row.quantity !== undefined && row.quantity !== null && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">Số lượng:</span> {row.quantity}</div>
                    )}
                    {row.hardware && (
                      <div className="mt-1 text-xs text-gray-400 truncate" title={row.hardware}><span className="font-medium text-gray-700">Hardware:</span> {row.hardware}</div>
                    )}
                    {row.apiUrl && (
                      <div className="mt-1 text-xs text-gray-400 truncate" title={row.apiUrl}><span className="font-medium text-gray-700">API URL:</span> {row.apiUrl}</div>
                    )}
                    {row.apiTestStatus && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">API Test:</span> {row.apiTestStatus}</div>
                    )}
                    {row.bhytPortCheckInfo && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">BHYT Port:</span> {row.bhytPortCheckInfo}</div>
                    )}
                    {row.deadline && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">Deadline:</span> {new Date(row.deadline).toLocaleString()}</div>
                    )}
                    {row.startDate && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">Start:</span> {new Date(row.startDate).toLocaleString()}</div>
                    )}
                    {row.acceptanceDate && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">Acceptance:</span> {new Date(row.acceptanceDate).toLocaleString()}</div>
                    )}
                    {row.finishDate && (
                      <div className="mt-1 text-xs text-gray-400 truncate"><span className="font-medium text-gray-700">Finish:</span> {new Date(row.finishDate).toLocaleString()}</div>
                    )}
                    {row.notes && (
                      <div className="mt-1 text-xs text-gray-400 truncate" title={row.notes}><span className="font-medium text-gray-700">Yêu cầu:</span> {row.notes}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ml-4 flex items-center gap-4">
                <div className="hidden text-right md:block">
                  <div className="text-sm font-medium text-gray-700">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "-"}</div>
                  <div className="text-xs text-gray-400">{row.createdAt ? new Date(row.createdAt).toLocaleTimeString() : ""}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(row); setModalOpen(true); }}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                  >
                    <AiOutlineEdit className="inline mr-1 text-base align-middle" /> Sửa
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(row.id); }}
                    className="rounded-lg px-3 py-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition"
                  >
                    <AiOutlineDelete className="inline mr-1 text-base align-middle" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
};

export default ImplementSuperTaskPage;
