import { useEffect, useMemo, useState } from "react";
import { getUserAccount, type UserResponseDTO } from "../../api/auth.api";

const fallbackAvatar = "/images/user/owner.jpg";

export default function UserMetaCard() {
  const [user, setUser] = useState<UserResponseDTO | null>(null);

  const userId = useMemo(() => {
    const stored = localStorage.getItem("userId");
    return stored ? Number(stored) : undefined;
  }, []);


  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const me = await getUserAccount(userId);
      setUser(me);
    };
    fetchData();

    // ✅ Lắng nghe sự kiện userUpdated để cập nhật avatar mới
    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatar?: string }>;
      if (customEvent.detail?.avatar) {
        setUser((prev) =>
          prev ? { ...prev, avatar: customEvent.detail.avatar } : { avatar: customEvent.detail.avatar } as any
        );
      }
    };

    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, [userId]);




  // === BẢNG DỊCH TIẾNG VIỆT ===
  const departmentMap: Record<string, string> = {
    IT: "Bộ phận kỹ thuật",
    ACCOUNTING: "Bộ phận kế toán",
  };

  const teamMap: Record<string, string> = {
    DEV: "Lập trình viên",
    DEPLOYMENT: "Triển khai",
    MAINTENANCE: "Bảo hành, bảo trì",
    SALES: "Kinh doanh",
    CUSTOMER_SERVICE: "Chăm sóc khách hàng",
  };

  const name = user?.fullname && user.fullname !== "Chưa cập nhật"
    ? user.fullname
    : user?.username ?? "Chưa cập nhật";

  const departmentVi =
    user?.department && departmentMap[user.department]
      ? departmentMap[user.department]
      : "Chưa cập nhật phòng ban";

  const teamVi =
    user?.team && teamMap[user.team]
      ? `Team ${teamMap[user.team]}`
      : "Chưa cập nhật team";

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          {/* Ảnh đại diện */}
          <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
            <img
              key={user?.avatar}
              src={user?.avatar || fallbackAvatar}
              alt={name}
              className="object-cover w-full h-full"
              onError={(e) => (e.currentTarget.src = fallbackAvatar)}
            />


          </div>

          {/* Thông tin */}
          <div className="order-3 xl:order-2">
            <h4 className="mb-1 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {name}
            </h4>

            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              {/* Phòng ban */}
              <p className="text-sm text-gray-500 dark:text-gray-400">{departmentVi}</p>
              <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
              {/* Team */}
              <p className="text-sm text-gray-500 dark:text-gray-400">{teamVi}</p>
              <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
              {/* Công ty */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Công Ty Cổ Phần Giải Pháp Công Nghệ TAG Việt Nam
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
