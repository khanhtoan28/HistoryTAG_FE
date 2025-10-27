import { useState, useEffect, useMemo } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useNavigate } from "react-router";
import { getUserAccount, type UserResponseDTO } from "../../api/auth.api";

const fallbackAvatar = "/images/user/owner.jpg";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserResponseDTO | null>(null);
  const navigate = useNavigate();

  const LOGOUT_URL = "http://localhost:8080/api/v1/auth/logout";

  const userId = useMemo(() => {
    const s = localStorage.getItem("userId");
    return s ? Number(s) : undefined;
  }, []);

  // 🔹 Lấy thông tin user đang đăng nhập
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const me = await getUserAccount(userId);
        setUser(me);
      } catch (err) {
        console.error("Không lấy được thông tin user:", err);
      }
    })();

    // 🔹 Lắng nghe sự kiện avatar cập nhật
    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ avatar?: string }>;
      if (customEvent.detail?.avatar) {
        setUser((prev) =>
          prev ? { ...prev, avatar: customEvent.detail.avatar } : prev
        );
      }
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, [userId]);

  // === Hàm xử lý dropdown ===
  function toggleDropdown() {
    setIsOpen(!isOpen);
  }
  function closeDropdown() {
    setIsOpen(false);
  }

  // === Hàm xử lý Đăng xuất ===
  async function handleSignOut() {
    try {
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");

      const res = await fetch(LOGOUT_URL, {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        console.warn("Logout failed:", await res.text());
      }
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      closeDropdown();
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      navigate("/signin");
    }
  }

  // === Dữ liệu hiển thị ===
  const avatar = user?.avatar || fallbackAvatar;
  const fullname =
    (user?.fullname && user.fullname !== "Chưa cập nhật" && user.fullname) ||
    user?.username ||
    "Người dùng";
  const email = user?.email || "Chưa cập nhật email";

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
      >
        {/* Ảnh đại diện */}
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11 border border-gray-300 dark:border-gray-700">
          <img
            key={avatar}
            src={avatar}
            alt="User Avatar"
            className="object-cover w-full h-full"
            onError={(e) => (e.currentTarget.src = fallbackAvatar)}
          />
        </span>

        {/* Tên người dùng */}
        <span className="block mr-1 font-medium text-theme-sm truncate max-w-[120px]">
          {fullname}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="flex flex-col">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {fullname}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400 truncate">
            {email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
            Chỉnh sửa hồ sơ
            </DropdownItem>
          </li>
        </ul>

        {/* Nút Đăng xuất */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 mt-3 w-full text-left font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          Đăng xuất
        </button>
      </Dropdown>
    </div>
  );
}
