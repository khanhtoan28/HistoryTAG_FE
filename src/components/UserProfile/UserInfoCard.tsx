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
  const [error, setError] = useState<string | null>(null);

  // form state trong modal
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
      if (error) setError(null); // Clear error on change
    };

  const handleSave = async () => {
    if (!userId) return;
    
    // Validate email (required field)
    if (!form.email || !form.email.trim()) {
      setError("Email không được để trống");
      toast.error("Vui lòng nhập email");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Email không hợp lệ");
      toast.error("Vui lòng nhập email hợp lệ");
      return;
    }
    
    setError(null);
    setSaving(true);
    try {
      const updated = await updateUserAccount(userId, form);
      setUser(updated);
      toast.success("Cập nhật thông tin thành công!");
      closeModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Lỗi khi cập nhật thông tin";
      toast.error(errorMsg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
            Thông tin cá nhân
          </h4>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Họ & Tên
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {loading ? "Đang tải..." : name}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user?.email || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Số điện thoại
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user?.phone || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Địa chỉ
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {user?.address || "Chưa cập nhật"}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phòng ban
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {departmentLabel}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Team
              </p>
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
          <svg
            className="fill-current"
            width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd" clipRule="evenodd"
              d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
            />
          </svg>
          Chỉnh sửa
        </button>
      </div>

      {/* MODAL EDIT */}
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
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2 mx-2">
                {error}
              </div>
            )}
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Thông tin cá nhân
                </h5>
                <div className="mb-5">
                  <Label>Ảnh đại diện</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm((s) => ({ ...s, avatar: e.target.files?.[0] ?? null }))
                    }
                    className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {form.avatar && (
                    <p className="mt-2 text-sm text-green-600">
                      Đã chọn: {form.avatar.name}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2">
                    <Label>Họ & Tên</Label>
                    <Input type="text" value={form.fullname ?? ""} onChange={onChange("fullname")} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input 
                      type="email" 
                      value={form.email ?? ""} 
                      onChange={onChange("email")}
                      placeholder="Nhập email"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Trạng thái làm việc</Label>
                    <Input 
                      type="text" 
                      value={form.workStatus ?? ""} 
                      onChange={onChange("workStatus")}
                      placeholder="Trạng thái làm việc"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Số điện thoại</Label>
                    <Input type="text" value={form.phone ?? ""} onChange={onChange("phone")} />
                  </div>

                  <div className="col-span-2">
                    <Label>Địa chỉ</Label>
                    <Input type="text" value={form.address ?? ""} onChange={onChange("address")} />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phòng ban</Label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 cursor-not-allowed"
                      value={
                        user?.department
                          ? (user.department === "IT" ? "Phòng Kỹ Thuật" : "Phòng Kế Toán")
                          : "Chưa cập nhật"
                      }
                      readOnly
                      disabled
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Team</Label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-3 py-2 cursor-not-allowed"
                      value={
                        user?.team
                          ? (user.team === "DEV"
                              ? "Team Lập Trình Viên"
                              : user.team === "DEPLOYMENT"
                              ? "Team Triển Khai"
                              : user.team === "MAINTENANCE"
                              ? "Team Bảo Hành, Bảo Trì"
                              : user.team)
                          : "Chưa cập nhật"
                      }
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button size="sm" variant="outline" onClick={closeModal}>Đóng</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
