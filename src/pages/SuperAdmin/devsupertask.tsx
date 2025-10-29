import React, { useEffect, useState } from "react";
import TaskFormModal from "./TaskFormModal";
import toast from "react-hot-toast";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  const [error, setError] = useState<string | null>(null);

  const apiBase = `${API_ROOT}/api/v1/superadmin/dev/tasks`;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DevTask | null>(null);

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

  if (!isSuper) {
    return <div className="p-6 text-red-600">Bạn không có quyền truy cập trang SuperAdmin.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Dev Tasks (SuperAdmin)</h1>
        <div>
          <button className="h-10 rounded-xl bg-gray-900 text-white px-3" onClick={() => { setEditing(null); setModalOpen(true); }}>+ Thêm mới</button>
        </div>
      </div>
      {loading && <div>Đang tải...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Tên</th>
              <th className="px-4 py-2 text-left">Bệnh viện</th>
              <th className="px-4 py-2 text-left">PIC</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Tạo lúc</th>
              <th className="px-4 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3">{row.hospitalName}</td>
                <td className="px-4 py-3">{row.picDeploymentName}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.createdAt ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button className="mr-2 text-sm text-blue-600" onClick={() => { setEditing(row); setModalOpen(true); }}>Sửa</button>
                  <button className="text-sm text-red-600" onClick={() => handleDelete(row.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} initial={editing ?? undefined} onSubmit={handleSubmit} />
    </div>
  );
};

export default DevSuperTaskPage;
