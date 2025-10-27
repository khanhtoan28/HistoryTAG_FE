import { useEffect, useMemo, useState } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { toast } from "react-hot-toast";
import {
  getUserAccount,
  updateUserAccount,
  type UserResponseDTO,
  type UserUpdateRequestDTO,
} from "../../api/auth.api";

const VN_DEPARTMENT: Record<string, string> = {
  IT: "Phòng Kỹ Thuật",
  ACCOUNTING: "Phòng Kế Toán",
};

const VN_TEAM: Record<string, string> = {
  DEV: "Lập Trình Viên",
  DEPLOYMENT: "Triển Khai",
  MAINTENANCE: "Bảo Hành, Bảo Trì",
};

export default function UserInfoCard() {
  const { isOpen, openModal, closeModal } = useModal();

  const userId = useMemo(() => {
    const s = localStorage.getItem("userId");
    return s ? Number(s) : undefined;
  }, []);

  const [user, setUser] = useState<UserResponseDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ fullname?: string; phone?: string; address?: string }>({});

  const [form, setForm] = useState<UserUpdateRequestDTO>({
    fullname: "",
    phone: "",
    address: "",
    email: "",
    workStatus: null,
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
          department: (me.department as any) ?? null,
          team: (me.team as any) ?? null,
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

  const teamLabel =
    user?.team && VN_TEAM[user.team] ? `Team ${VN_TEAM[user.team]}` : "Chưa cập nhật team";

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
    if (form.address && form.address.trim().length < 5)
      newErrors.address = "Địa chỉ phải có ít nhất 5 ký tự.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Vui lòng kiểm tra lại thông tin nhập!");
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const updated = await updateUserAccount(userId, form);
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

  return (
    <>
      {/* ✅ Banner hiển thị sau khi lưu thành công */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-start justify-center mt-16 z-[100] pointer-events-none">
          <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in">
            ✅ Cập nhật thông tin thành công!
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
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {teamLabel}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openModal}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            ✏️ Chỉnh sửa
          </button>
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
                        className="w-full rounded-lg border px-3 py-2"
                        value={form.department ?? ""}
                        onChange={onChange("department")}
                      >
                        <option value="">-- Chọn phòng ban --</option>
                        <option value="IT">Phòng Kỹ Thuật</option>
                        <option value="ACCOUNTING">Phòng Kế Toán</option>
                      </select>
                    </div>

                    <div className="col-span-2 lg:col-span-1">
                      <Label>Team</Label>
                      <select
                        className="w-full rounded-lg border px-3 py-2"
                        value={form.team ?? ""}
                        onChange={onChange("team")}
                      >
                        <option value="">-- Chọn team --</option>
                        <option value="DEV">Team Lập Trình Viên</option>
                        <option value="DEPLOYMENT">Team Triển Khai</option>
                        <option value="MAINTENANCE">Team Bảo Hành, Bảo Trì</option>
                      </select>
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
      </div>
    </>
  );
}
