import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  lockUser,
  unlockUser,
  type UserResponseDTO,
  type SuperAdminUserCreateDTO,
  type UserUpdateRequestDTO,
} from "../../api/superadmin.api";
import toast from "react-hot-toast";

type UserForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  avatarFile?: File | null;
  avatar?: string | null;
  roles: string[];
  department: "" | (typeof DEPARTMENT_OPTIONS)[number];
  team: "" | (typeof TEAM_OPTIONS)[number];
  workStatus?: string;
};

const ROLE_OPTIONS = ["USER", "ADMIN", "SUPERADMIN"]; // Match backend RoleType enum
const DEPARTMENT_OPTIONS = ["IT", "ACCOUNTING"] as const;
const TEAM_OPTIONS = ["DEV", "DEPLOYMENT", "MAINTENANCE"] as const;
const WORK_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"] as const;

export default function SuperAdminUsers() {
  const [items, setItems] = useState<UserResponseDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filters
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserResponseDTO | null>(null);
  const [viewing, setViewing] = useState<UserResponseDTO | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [form, setForm] = useState<UserForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    phoneNumber: "",
    address: "",
    avatarFile: null,
    avatar: null,
    roles: [],
    department: "",
    team: "",
    workStatus: "",
  });

  function getErrorMessage(err: unknown, fallback = "Thao tác thất bại") {
    if (axios.isAxiosError(err)) {
      const respData = err.response?.data as unknown;
      if (respData && typeof respData === "object") {
        const maybeMsg = (respData as { message?: unknown }).message;
        if (typeof maybeMsg === "string") return maybeMsg;
      }
      return err.message || fallback;
    }
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return fallback;
  }

  const isEditing = !!editing?.id;
  const isViewing = !!viewing?.id;

  function closeModal() {
    setOpen(false);
    setEditing(null);
    setViewing(null);
    setError(null);
    setIsModalLoading(false);
    setForm({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      address: "",
      avatarFile: null,
      avatar: null,
      roles: [],
      department: "",
      team: "",
      workStatus: "",
    });
  }

  function fillForm(user: UserResponseDTO) {
    setForm({
      username: user.username || "",
      email: user.email || "",
      password: "", // Don't populate password for security
      confirmPassword: "",
      fullName: user.fullname || "",
      phoneNumber: user.phone || "",
      address: user.address || "",
      avatarFile: null,
      avatar: user.avatar || null,
      roles: user.roles?.map((r: { roleId: number; roleName: string }) => r.roleName) || [],
      department: (user.department ?? "") as UserForm["department"],
      team: (user.team ?? "") as UserForm["team"],
      workStatus: "",
    });
  }

  async function fetchUserDetails(id: number): Promise<UserResponseDTO | null> {
    setIsModalLoading(true);
    setError(null);
    try {
      const data = await getUserById(id);
      return data;
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "Lỗi tải chi tiết người dùng");
      setError(msg);
      console.error("❌ FETCH DETAIL ERROR:", error);
      return null;
    } finally {
      setIsModalLoading(false);
    }
  }

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsers({ page, size, sortBy, sortDir });
      setItems(data.content || data);
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "Lỗi tải danh sách");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  function onCreate() {
    setEditing(null);
    setViewing(null);
    setForm({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      phoneNumber: "",
      address: "",
      avatarFile: null,
      avatar: null,
      roles: [],
      department: "",
      team: "",
      workStatus: "",
    });
    setOpen(true);
  }

  async function onView(user: UserResponseDTO) {
    setEditing(null);
    setViewing(null);
    setOpen(true);

    const details = await fetchUserDetails(user.id);
    if (details) {
      setViewing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onEdit(user: UserResponseDTO) {
    setViewing(null);
    setEditing(null);
    setOpen(true);

    const details = await fetchUserDetails(user.id);
    if (details) {
      setEditing(details);
      fillForm(details);
    } else {
      setOpen(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Xóa người dùng này?")) return;

    // Debug: Check if token exists
    const token = localStorage.getItem("access_token") || sessionStorage.getItem("access_token");
    console.log("Current token exists:", !!token);
    console.log("Current user roles:", localStorage.getItem("roles") || sessionStorage.getItem("roles"));

    setLoading(true);
    try {
      await deleteUser(id);
      toast.success("Xóa thành công");
      await fetchList();
    } catch (error: unknown) {
      console.error("Delete error:", error);
      const msg = getErrorMessage(error, "Xóa thất bại");
      toast.error(msg);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        console.error("401 Unauthorized - Check if user has SUPERADMIN role");
        toast.error("Không có quyền xóa người dùng. Vui lòng đăng nhập lại với quyền SUPERADMIN.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onToggleLock(id: number, currentStatus?: boolean) {
    const willLock = !!currentStatus; // if currently active(true) -> lock
    const confirmMsg = willLock ? "Bạn có chắc muốn khóa tài khoản này?" : "Bạn có chắc muốn mở khóa tài khoản này?";
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      if (willLock) {
        await lockUser(id);
        toast.success("Tài khoản đã được khóa");
      } else {
        await unlockUser(id);
        toast.success("Tài khoản đã được mở khóa");
      }
      await fetchList();
    } catch (error: unknown) {
      console.error("Lock/Unlock error:", error);
      const msg = getErrorMessage(error, "Thao tác thất bại");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!form.username.trim()) {
      setError("Tên đăng nhập không được để trống");
      return;
    }
    if (!form.email.trim()) {
      setError("Email không được để trống");
      return;
    }
    if (!isEditing && !form.password.trim()) {
      setError("Mật khẩu không được để trống");
      return;
    }
    if (!isEditing && form.password !== form.confirmPassword) {
      setError("Mật khẩu và xác nhận mật khẩu không khớp");
      return;
    }
    if (!form.fullName.trim()) {
      setError("Họ và tên không được để trống");
      return;
    }
    if (!form.address.trim()) {
      setError("Địa chỉ không được để trống");
      return;
    }
    if (!isEditing && form.roles.length === 0) {
      setError("Vai trò không được để trống");
      return;
    }

    if (isViewing) return;

    setLoading(true);
    setError(null);

  try {
      if (isEditing) {
        const payload: UserUpdateRequestDTO = {
          email: form.email?.trim() || undefined,
          fullname: form.fullName?.trim() || undefined,
          phone: form.phoneNumber?.trim() || undefined,
          address: form.address?.trim() || undefined,
          avatar: form.avatarFile || undefined,
          department: form.department || undefined,
          team: form.team || undefined,
          workStatus: form.workStatus || undefined,
        };
        await updateUser(editing!.id, payload);
        toast.success("Cập nhật thành công");
      } else {
        const payload: SuperAdminUserCreateDTO = {
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password.trim(),
          confirmPassword: form.confirmPassword.trim(),
          fullName: form.fullName.trim(),
          address: form.address.trim(),
          phoneNumber: form.phoneNumber.trim(),
          department: form.department,
          team: form.team || undefined,
          roles: form.roles,
        };
        await createUser(payload);
        toast.success("Tạo thành công");
      }

      closeModal();
      setPage(0);
      await fetchList();
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "Lưu thất bại");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(
      (item) =>
        item.username?.toLowerCase().includes(lowerSearch) ||
        item.email?.toLowerCase().includes(lowerSearch) ||
        item.fullname?.toLowerCase().includes(lowerSearch) ||
        item.phone?.toLowerCase().includes(lowerSearch)
    );
  }, [items, search]);

  return (
    <>
      <PageMeta title="Quản lý người dùng" description="Super Admin - Quản lý người dùng" />

      <div className="space-y-6">
        {/* Search & Actions */}
        <ComponentCard title="Tìm kiếm & Thao tác">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-primary/30"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {["id", "username", "fullname", "email", "createdAt"].map((k) => (
                <option key={k} value={k}>
                  Sắp xếp theo: {k}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
            <select
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              onClick={fetchList}
            >
              Làm mới
            </button>
            <button
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
              onClick={onCreate}
            >
              + Thêm người dùng
            </button>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Tổng: <span className="font-medium text-gray-700">{filtered.length}</span>
            </p>
          </div>
        </ComponentCard>

        {/* Table */}
        <ComponentCard title="Danh sách người dùng">
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2 w-14 text-center">STT</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Tên đầy đủ</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Trạng thái</th>
                  <th className="px-3 py-2">Vai trò</th>
                  <th className="px-3 py-2">Phòng ban</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, idx) => {
                  const rowNo = idx + 1;
                  return (
                    <tr key={user.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 text-center">{rowNo}</td>
                      <td className="px-3 py-2 font-medium">{user.username}</td>
                      <td className="px-3 py-2">{user.email || "—"}</td>
                      <td className="px-3 py-2">{user.fullname || "—"}</td>
                      <td className="px-3 py-2">{user.phone || "—"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                            user.status
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-red-200 bg-red-50 text-red-700"
                          }`}
                        >
                          {user.status ? "Hoạt động" : "Không hoạt động"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {user.roles?.map((r: { roleId: number; roleName: string }) => r.roleName)?.join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2">{user.department || "—"}</td>
                      <td className="px-3 py-2">{user.team || "—"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50 text-gray-600"
                            onClick={() => onView(user)}
                          >
                            Xem
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            onClick={() => onEdit(user)}
                          >
                            Sửa
                          </button>
                          <button
                            className={`rounded-md border px-2 py-1 text-xs ${user.status ? "hover:bg-yellow-50 text-yellow-700" : "hover:bg-green-50 text-green-700"}`}
                            onClick={() => onToggleLock(user.id, user.status)}
                          >
                            {user.status ? "Khoá" : "Mở khóa"}
                          </button>
                          <button
                            className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                            onClick={() => onDelete(user.id)}
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
                    <td colSpan={10} className="px-3 py-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {loading && <div className="mt-3 text-sm text-gray-500">Đang tải...</div>}
          {error && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {/* Pagination controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">Trang: <span className="font-medium">{page + 1}</span></div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page <= 0}
              >
                Trước
              </button>
              <button
                className="rounded-md border px-3 py-1 text-sm"
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </ComponentCard>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative z-10 m-4 w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {isViewing ? "Chi tiết người dùng" : isEditing ? "Cập nhật người dùng" : "Thêm người dùng"}
              </h3>
              <button className="rounded-md p-1 hover:bg-gray-100" onClick={closeModal}>
                ✕
              </button>
            </div>

            {isModalLoading ? (
              <div className="text-center py-12 text-gray-500">Đang tải chi tiết...</div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.username}
                      onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
                      disabled={isViewing || isEditing}
                      pattern="^[a-zA-Z0-9]+$"
                      minLength={6}
                      maxLength={100}
                    />
                    <p className="mt-1 text-xs text-gray-500">Từ 6-100 ký tự, chỉ chữ và số</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      disabled={isViewing}
                    />
                  </div>
                  {!isEditing && (
                    <>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="password"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                          value={form.password}
                          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                          disabled={isViewing}
                          minLength={8}
                        />
                        <p className="mt-1 text-xs text-gray-500">Tối thiểu 8 ký tự</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Xác nhận mật khẩu <span className="text-red-500">*</span>
                        </label>
                        <input
                          required
                          type="password"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                          value={form.confirmPassword}
                          onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))}
                          disabled={isViewing}
                          minLength={8}
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Họ và tên <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.fullName}
                      onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                      disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Số điện thoại</label>
                    <input
                      type="tel"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.phoneNumber}
                      onChange={(e) => setForm((s) => ({ ...s, phoneNumber: e.target.value }))}
                      disabled={isViewing}
                      pattern="^\d{10,11}$"
                      placeholder="10-11 chữ số"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Địa chỉ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      rows={3}
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Avatar</label>
                    {form.avatar && (
                      <div className="mb-3">
                        <img
                          src={form.avatar}
                          alt="Avatar hiện tại"
                          className="h-32 w-full max-w-full rounded-lg border object-cover"
                          onError={(e) => {
                            console.error("Image load error:", form.avatar);
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <p className="mt-1 text-xs text-gray-500">Avatar hiện tại</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                      onChange={(e) => setForm((s) => ({ ...s, avatarFile: e.target.files?.[0] ?? null }))}
                      disabled={isViewing}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Vai trò <span className="text-red-500">*</span> {!isEditing && "(Có thể chọn nhiều)"}
                    </label>
                    <select
                      multiple={!isEditing}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.roles}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                        setForm((s) => ({ ...s, roles: selected }));
                      }}
                      disabled={isViewing || isEditing}
                      required={!isEditing}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    {!isEditing && <p className="mt-1 text-xs text-gray-500">Giữ Ctrl/Cmd để chọn nhiều</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Phòng ban <span className="text-red-500">*</span>
                    </label>
                    <select
                      required={!isEditing}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.department}
                      onChange={(e) => setForm((s) => ({ ...s, department: e.target.value as UserForm["department"] }))}
                      disabled={isViewing}
                    >
                      <option value="">— Chọn phòng ban —</option>
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">Team</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                      value={form.team}
                      onChange={(e) => setForm((s) => ({ ...s, team: e.target.value as UserForm["team"] }))}
                      disabled={isViewing}
                    >
                      <option value="">— Chọn team —</option>
                      {TEAM_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isEditing && (
                    <div>
                      <label className="mb-1 block text-sm">Trạng thái làm việc</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4693FF] disabled:bg-gray-50"
                        value={form.workStatus}
                        onChange={(e) => setForm((s) => ({ ...s, workStatus: e.target.value }))}
                        disabled={isViewing}
                      >
                        <option value="">— Chọn trạng thái —</option>
                        {WORK_STATUS_OPTIONS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="col-span-1 mt-2 flex items-center justify-between md:col-span-2">
                  {error && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                      onClick={closeModal}
                    >
                      {isViewing ? "Đóng" : "Huỷ"}
                    </button>
                    {!isViewing && (
                      <button
                        type="submit"
                        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                        disabled={loading}
                      >
                        {loading ? "Đang lưu..." : isEditing ? "Cập nhật" : "Tạo mới"}
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
