import { useState, useEffect, useMemo } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useNavigate } from "react-router";
import { getUserAccount, type UserResponseDTO } from "../../api/auth.api";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const [user, setUser] = useState<UserResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = useMemo(() => {
    const s = localStorage.getItem("userId");
    return s ? Number(s) : undefined;
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    (async () => {
      try {
        const userData = await getUserAccount(userId);
        setUser(userData);
      } catch (err) {
        console.error("Failed to fetch user data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const LOGOUT_URL = "http://localhost:8080/api/v1/auth/logout";
  // Nếu đã proxy: const LOGOUT_URL = "/api/v1/auth/logout";

  function toggleDropdown() { setIsOpen(!isOpen); }
  function closeDropdown() { setIsOpen(false); }

  async function handleSignOut() {
    try {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

      const res = await fetch(LOGOUT_URL, {
        method: "GET",                // hoặc "POST" nếu BE dùng POST
        credentials: "include",       // không hại gì, dùng được cả khi không cần cookie
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        console.warn("Logout failed:", await res.text());
      }
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      closeDropdown();
      // Xoá token phía FE (BE cũng nên clear nếu bạn có cookie)
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      navigate("/signin");
    }
  }


  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11 flex-shrink-0">
          <img 
            src={user?.avatar || "/images/user/owner.jpg"} 
            alt={user?.fullname || user?.username || "User"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "/images/user/owner.jpg";
            }}
          />
        </span>

        <span className="block mr-1 font-medium text-theme-sm whitespace-nowrap">
          {loading ? "Loading..." : (user?.fullname && user.fullname !== "Chưa cập nhật" ? user.fullname : user?.username || "User")}
        </span>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
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

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {loading ? "Loading..." : (
              (user?.fullname && user.fullname !== "Chưa cập nhật" ? user.fullname : user?.username) || "User"
            )}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {user?.email || "Chưa có email"}
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9 9C11.0711 9 12.75 7.32107 12.75 5.25C12.75 3.17893 11.0711 1.5 9 1.5C6.92893 1.5 5.25 3.17893 5.25 5.25C5.25 7.32107 6.92893 9 9 9Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.4425 16.5C15.4425 13.8975 12.54 11.8125 9 11.8125C5.46 11.8125 2.5575 13.8975 2.5575 16.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Chỉnh sửa hồ sơ
            </DropdownItem>
          </li>
        
        </ul>

        {/* Nút ĐĂNG XUẤT: gọi logout và điều hướng */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 mt-3 w-full text-left font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.25 12.75L15 9L11.25 5.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M15 9H6.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.75 15H4.5C3.67157 15 3 14.3284 3 13.5V4.5C3 3.67157 3.67157 3 4.5 3H6.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Đăng xuất
        </button>
      </Dropdown>
    </div>
  );
}
