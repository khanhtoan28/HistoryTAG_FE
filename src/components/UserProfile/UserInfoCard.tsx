import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { toast } from "react-hot-toast";
import { EyeIcon, EyeCloseIcon } from "../../icons";
import {
  getUserAccount,
  updateUserAccount,
  changePassword,
  type UserResponseDTO,
  type UserUpdateRequestDTO,
  type ChangePasswordRequestDTO,
} from "../../api/auth.api";

const VN_DEPARTMENT: Record<string, string> = {
  IT: "Phòng Kỹ Thuật",
  ACCOUNTING: "Phòng Kế Toán",
  BUSINESS: "Phòng Kinh Doanh",
};

const VN_TEAM: Record<string, string> = {
  DEV: "Lập Trình Viên",
  DEPLOYMENT: "Triển Khai",
  MAINTENANCE: "Bảo Hành, Bảo Trì",
  SALES: "Kinh Doanh",
  CUSTOMER_SERVICE: "Chăm sóc khách hàng",
};

const TEAM_LABELS_SHORT: Record<string, string> = {
  DEV: "Phát triển",
  DEPLOYMENT: "Triển khai",
  MAINTENANCE: "Bảo trì",
  SALES: "Kinh doanh",
  CUSTOMER_SERVICE: "CSKH",
};
const getTeamLabel = (teamId: string) => TEAM_LABELS_SHORT[teamId] || VN_TEAM[teamId] || teamId;
const isLeaderRole = (r: string | undefined) => r != null && String(r).toUpperCase() === "LEADER";

interface UserInfoCardProps {
  isSuperAdmin?: boolean;
}

export default function UserInfoCard({ isSuperAdmin = false }: UserInfoCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const { isOpen: isPasswordModalOpen, openModal: openPasswordModal, closeModal: closePasswordModal } = useModal();

  const userId = useMemo(() => {
    const s = localStorage.getItem("userId");
    return s ? Number(s) : undefined;
  }, []);

  const [user, setUser] = useState<UserResponseDTO | null>(null);

  // Check if user is admin (not superadmin)
  // Admin thường bị disable các field Department/Team, nhưng SuperAdmin được phép chỉnh
  // Nếu prop isSuperAdmin=true thì bỏ qua check (SuperAdmin có quyền đầy đủ)
  const isAdmin = useMemo(() => {
    // SuperAdmin được truyền từ prop → có quyền đầy đủ
    if (isSuperAdmin) return false;
    
    try {
      const rolesStr = localStorage.getItem("roles") || sessionStorage.getItem("roles");
      if (!rolesStr) return false;
      
      const roles = JSON.parse(rolesStr);
      if (!Array.isArray(roles)) return false;
      
      // Normalize role name
      const normalizeRole = (r: unknown): string => {
        if (typeof r === "string") return r.toUpperCase();
        if (r && typeof r === "object") {
          const rr = r as Record<string, unknown>;
          const roleName = rr.roleName || rr.role_name || rr.role;
          if (typeof roleName === "string") return roleName.toUpperCase();
        }
        return "";
      };
      
      const normalizedRoles = roles.map(normalizeRole);
      
      // ADMIN bị disable department/team
      return normalizedRoles.includes("ADMIN");
    } catch {
      return false;
    }
  }, [isSuperAdmin]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullname?: string; phone?: string; address?: string }>({});

  // Password change state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequestDTO>({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{ oldPassword?: string; newPassword?: string; confirmPassword?: string }>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [form, setForm] = useState<UserUpdateRequestDTO>({
    fullname: "",
    phone: "",
    address: "",
    email: "",
    workStatus: null,
    workStatusDate: null,
    department: null,
    team: null,
    avatar: null,
  });

  // 🔹 Lấy thông tin user
  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      try {
        const me = await getUserAccount(userId);
        setUser(me);
        setForm({
          fullname:
            me.fullname && me.fullname !== "Chưa cập nhật"
              ? me.fullname
              : me.username || "",
          phone: me.phone ?? "",
          address: me.address ?? "",
          email: me.email ?? "",
          workStatus: (me as any).workStatus ?? null,
          workStatusDate: (me as any).workStatusDate ?? null,
          department: (me.department as any) ?? null,
          team: (me.primaryTeam ?? me.team) as any ?? null,
          avatar: null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const departmentLabel =
    user?.department && VN_DEPARTMENT[user.department]
      ? VN_DEPARTMENT[user.department]
      : "Chưa cập nhật phòng ban";

  // Đội chính: primaryTeam > team mà user là Leader > team cũ (user.team)
  const mainTeamId =
    user?.primaryTeam ??
    (user?.availableTeams && user?.teamRoles
      ? user.availableTeams.find((t) => user.teamRoles![t] === "LEADER") ?? null
      : null) ??
    user?.team ??
    null;
  const teamsRaw = (user?.availableTeams && user.availableTeams.length > 0)
    ? user.availableTeams
    : (user?.team ? [user.team] : []);
  const primaryTeamId =
    (user?.primaryTeam && teamsRaw.includes(user.primaryTeam) ? user.primaryTeam : null) ??
    (user?.teamRoles ? teamsRaw.find((t) => (user.teamRoles![t] != null && String(user.teamRoles![t]).toUpperCase() === "LEADER")) ?? null : null);
  const teams = primaryTeamId
    ? [primaryTeamId, ...teamsRaw.filter((t) => t !== primaryTeamId)]
    : teamsRaw;

  const name =
    (user?.fullname && user.fullname !== "Chưa cập nhật" && user.fullname) ||
    user?.username ||
    "Chưa cập nhật";


  const onChange = <K extends keyof UserUpdateRequestDTO>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value as any;
      setForm((s) => ({ ...s, [k]: v }));
      setErrors((prev) => ({ ...prev, [k]: undefined }));
    };

  // 🔹 Chọn file ảnh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setForm((s) => ({ ...s, avatar: file }));
      setPreviewUrl(url);
      setUser((prev) => (prev ? { ...prev, avatar: url } : prev));

      // ✅ Gửi event toàn cục để UserMetaCard cập nhật ngay
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: { avatar: url } }));
    }
  };

  // 🔹 Lưu thay đổi
  const handleSave = async () => {
    if (!userId) return;

    const newErrors: { fullname?: string; phone?: string; address?: string } = {};

    if (!form.fullname?.trim()) newErrors.fullname = "Họ tên không được để trống.";
    const phone = form.phone?.trim() ?? "";
    const phoneRegex = /^[0-9]{10,11}$/;
    if (phone && !phoneRegex.test(phone)) newErrors.phone = "Số điện thoại phải gồm 10-11 chữ số.";
    // ✅ Xóa validation độ dài address để cho phép để trống (backend sẽ xử lý set về "Chưa cập nhật")

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Vui lòng kiểm tra lại thông tin nhập!");
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      // ✅ Gửi address và phone (kể cả empty string) để backend có thể xử lý xóa
      // Backend sẽ set address về "Chưa cập nhật" nếu nhận empty string
      // ✅ Admin không thể thay đổi department và team
      const payloadToSend = {
        ...form,
        address: form.address?.trim() ?? "",
        phone: form.phone?.trim() ?? "",
        // Nếu là admin, giữ nguyên department và team từ user hiện tại
        department: isAdmin ? (user?.department as any) ?? null : form.department,
        team: isAdmin ? (user?.team as any) ?? null : form.team,
      };
      const updated = await updateUserAccount(userId, payloadToSend);
      setUser((prev) => ({ ...prev, ...updated }));
      closeModal();

      // ✅ Bắn event để avatar ở Profile cập nhật luôn
      if (previewUrl) {
        window.dispatchEvent(new CustomEvent("userUpdated", { detail: { avatar: previewUrl } }));
      }

      // ✅ Hiển thị banner “Cập nhật thành công”
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Lỗi khi cập nhật thông tin";
      toast.error(errorMsg);


      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Đổi mật khẩu
  const handleChangePassword = async () => {
    if (!userId) return;

    const newErrors: { oldPassword?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!passwordForm.oldPassword?.trim()) {
      newErrors.oldPassword = "Mật khẩu cũ không được để trống.";
    }
     
    if (!passwordForm.newPassword?.trim()) {
      newErrors.newPassword = "Mật khẩu mới không được để trống.";
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = "Mật khẩu mới phải có ít nhất 8 ký tự.";
    }
    if (!passwordForm.confirmPassword?.trim()) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không được để trống.";
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = "Xác nhận mật khẩu không khớp.";
    }
    if (passwordForm.oldPassword === passwordForm.newPassword) {
      newErrors.newPassword = "Mật khẩu mới phải khác mật khẩu cũ.";
    }

    if (Object.keys(newErrors).length > 0) {
      setPasswordErrors(newErrors);
      toast.error("Vui lòng kiểm tra lại thông tin nhập!");
      return;
    }

    setChangingPassword(true);
    setPasswordErrors({});
    try {
      await changePassword(userId, passwordForm);
      toast.success("Đổi mật khẩu thành công!");
      closePasswordModal();
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Lỗi khi đổi mật khẩu";
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      {/* ✅ Banner hiển thị sau khi lưu thành công */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-start justify-center mt-16 z-[100] pointer-events-none">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
             Cập nhật thông tin thành công!
          </div>
        </div>
      )}

      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Thông tin cá nhân
            </h4>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Họ & Tên</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {loading ? "Đang tải..." : name}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.email || "Chưa cập nhật"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Số điện thoại</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.phone || "Chưa cập nhật"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Địa chỉ</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {user?.address || "Chưa cập nhật"}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Phòng ban</p>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {departmentLabel}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Team</p>
                {teams.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {teams.map((teamId) => {
                      const role = user?.teamRoles?.[teamId] ?? "MEMBER";
                      const isLeader = isLeaderRole(role);
                      const isPrimary = primaryTeamId != null && teamId === primaryTeamId;
                      return (
                        <span
                          key={teamId}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            isPrimary
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700"
                              : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                          }`}
                        >
                          {getTeamLabel(teamId)}
                          {isPrimary && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold" title="Đội chính">★</span>
                          )}
                          <span className={isLeader ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-gray-500 dark:text-gray-400"}>
                            ({isLeader ? "Trưởng đội" : "Thành viên"})
                          </span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">Chưa cập nhật team</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <button
              onClick={openModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
            >
              ✏️ Chỉnh sửa
            </button>
            <button
              onClick={openPasswordModal}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 shadow-theme-xs hover:bg-blue-100 hover:text-blue-800 dark:border-blue-700 dark:bg-blue-800 dark:text-blue-400 dark:hover:bg-blue-900 lg:inline-flex lg:w-auto"
            >
              🔒 Đổi mật khẩu
            </button>
          </div>
        </div>

        {/* MODAL */}
        <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
          <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
            <div className="px-2 pr-14">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                Cập nhật thông tin cá nhân
              </h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                Vui lòng cập nhật thông tin của bạn.
              </p>
            </div>

            <form className="flex flex-col" onSubmit={(e) => e.preventDefault()}>
              <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
                <div className="mt-7">
                  <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                    Ảnh đại diện
                  </h5>

                  <div className="flex items-center gap-4 mb-6">
                    <img
                      src={
                        previewUrl ||
                        user?.avatar ||
                        "https://ui-avatars.com/api/?name=User"
                      }
                      alt="avatar"
                      className="w-24 h-24 rounded-full object-cover border"
                    />
                    <div>
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                        Chọn ảnh đại diện
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-400">
                        Hỗ trợ định dạng JPG, PNG (tối đa 5MB)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                    <div className="col-span-2">
                      <Label>Họ & Tên</Label>
                      <Input
                        type="text"
                        value={form.fullname ?? ""}
                        onChange={onChange("fullname")}
                        className={`${
                          errors.fullname
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.fullname && (
                        <p className="mt-1 text-xs text-red-500">{errors.fullname}</p>
                      )}
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Email (không chỉnh sửa tại đây)</Label>
                      <Input type="text" value={user?.email ?? ""} readOnly />
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Số điện thoại</Label>
                      <Input
                        type="text"
                        value={form.phone ?? ""}
                        onChange={onChange("phone")}
                        className={`${
                          errors.phone
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.phone && (
                        <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <Label>Địa chỉ</Label>
                      <Input
                        type="text"
                        value={form.address ?? ""}
                        onChange={onChange("address")}
                        className={`${
                          errors.address
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.address && (
                        <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                      )}
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Phòng ban</Label>
                      <select
                        className={`w-full rounded-lg border px-3 py-2 ${isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={form.department ?? ""}
                        onChange={onChange("department")}
                        disabled={isAdmin}
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        <option value="IT">Phòng Kỹ Thuật</option>
                        <option value="ACCOUNTING">Phòng Kế Toán</option>
                        <option value="BUSINESS">Phòng Kinh Doanh</option>
                      </select>
                      {isAdmin && (
                        <p className="mt-1 text-xs text-gray-500">Admin không thể thay đổi phòng ban</p>
                      )}
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Team</Label>
                      <select
                        className={`w-full rounded-lg border px-3 py-2 ${isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        value={form.team ?? ""}
                        onChange={onChange("team")}
                        disabled={isAdmin}
                      >
                        <option value="">-- Chọn team --</option>
                        <option value="DEV">Team Lập Trình Viên</option>
                        <option value="DEPLOYMENT">Team Triển Khai</option>
                        <option value="MAINTENANCE">Team Bảo Hành, Bảo Trì</option>
                        <option value="SALES">Team Kinh Doanh</option>
                        <option value="CUSTOMER_SERVICE">Team Chăm sóc khách hàng</option>
                      </select>
                      {isAdmin && (
                        <p className="mt-1 text-xs text-gray-500">Admin không thể thay đổi team</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closeModal}>
                  Đóng
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>

        {/* MODAL: Đổi mật khẩu */}
        <Modal isOpen={isPasswordModalOpen} onClose={closePasswordModal} className="max-w-[500px] m-4">
          <div className="no-scrollbar relative w-full max-w-[500px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8">
            <div className="px-2 pr-14">
              <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                Đổi mật khẩu
              </h4>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                Vui lòng nhập mật khẩu cũ và mật khẩu mới của bạn.
              </p>
            </div>

            <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
              <div className="px-2 pb-3">
                <div className="space-y-4">
                  <div>
                    <Label>Mật khẩu cũ <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showOldPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={passwordForm.oldPassword}
                        onChange={(e) => {
                          setPasswordForm((s) => ({ ...s, oldPassword: e.target.value }));
                          setPasswordErrors((prev) => ({ ...prev, oldPassword: undefined }));
                        }}
                        className={`w-full pr-10 ${
                          passwordErrors.oldPassword
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={showOldPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showOldPassword ? (
                          <EyeIcon className="fill-gray-500 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 size-5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.oldPassword && (
                      <p className="mt-1 text-xs text-red-500">{passwordErrors.oldPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label>Mật khẩu mới <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm((s) => ({ ...s, newPassword: e.target.value }));
                          setPasswordErrors((prev) => ({ ...prev, newPassword: undefined, confirmPassword: undefined }));
                        }}
                        className={`w-full pr-10 ${
                          passwordErrors.newPassword
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showNewPassword ? (
                          <EyeIcon className="fill-gray-500 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 size-5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-xs text-red-500">{passwordErrors.newPassword}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Tối thiểu 8 ký tự</p>
                  </div>

                  <div>
                    <Label>Xác nhận mật khẩu mới <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }));
                          setPasswordErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        className={`w-full pr-10 ${
                          passwordErrors.confirmPassword
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                        aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showConfirmPassword ? (
                          <EyeIcon className="fill-gray-500 size-5" />
                        ) : (
                          <EyeCloseIcon className="fill-gray-500 size-5" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button size="sm" variant="outline" onClick={closePasswordModal} type="button">
                  Đóng
                </Button>
                <Button size="sm" onClick={handleChangePassword} disabled={changingPassword} type="submit">
                  {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </>
  );
}
