import React from 'react';
import { AiOutlineEye, AiOutlineEdit, AiOutlineLock, AiOutlineDelete, AiOutlineUser } from 'react-icons/ai';

interface User {
  id: number;
  username: string;
  email?: string | null;
  fullname?: string | null;
  phone?: string | null;
  status?: boolean;
  roles?: any[];
  department?: string | null;
  team?: string | null;
  avatar?: string | null;
}

interface UserCardProps {
  user: User;
  onView: (user: User) => void;
  onEdit: (user: User) => void;
  onToggleLock: (id: number, status?: boolean) => void;
  onDelete: (id: number) => void;
}

// ✅ Map department sang tiếng Việt (đồng bộ với Users.tsx)
const DEPARTMENT_LABELS: Record<string, string> = {
  IT: "Công nghệ thông tin",
  ACCOUNTING: "Kế toán",
  BUSINESS: "Kinh doanh",
};

function getDepartmentLabel(value: string | null | undefined): string {
  if (!value) return "Chưa cập nhật";
  return DEPARTMENT_LABELS[value] || value;
}

const UserCard: React.FC<UserCardProps> = ({ user, onView, onEdit, onToggleLock, onDelete }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="text-center mb-3">
        {/* Avatar */}
        <div className="relative inline-block mb-2">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.username}
              className="w-16 h-16 rounded-full object-cover border-3 border-gray-50 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center border-3 border-gray-50 shadow-md">
              <AiOutlineUser className="w-8 h-8 text-blue-600" />
            </div>
          )}
          {/* Status indicator */}
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white ${
            user.status ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
        </div>

        {/* Username and Status */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">{user.username}</h3>
        <p className="text-xs text-gray-500 mb-2">
          {user.status ? "Hoạt động" : "Không hoạt động"}
        </p>
      </div>

      {/* User Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-center gap-2 text-xs hover:bg-blue-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-semibold text-xs">@</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{user.email || "Chưa cập nhật"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs hover:bg-green-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-semibold text-xs">👤</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{user.fullname || "Chưa cập nhật"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs hover:bg-purple-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-purple-600 font-semibold text-xs">📞</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{user.phone || "Chưa cập nhật"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs hover:bg-orange-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
            <span className="text-orange-600 font-semibold text-xs">🏢</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{user.roles
              ?.map((r: any) => (r.roleName ?? r.roleType ?? "").toString().replace(/^ROLE_/i, "").toUpperCase())
              ?.join(", ") || "Chưa cập nhật"}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs hover:bg-indigo-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-semibold text-xs">📍</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{getDepartmentLabel(user.department)}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs hover:bg-indigo-50 rounded p-1 transition-colors duration-200">
          <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-semibold text-xs">�</span>
          </div>
          <div className="min-w-0 flex-1 text-center">
            <p className="text-gray-600 truncate text-xs leading-tight">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-3 pb-2 border-t border-gray-100">
        <button
          title="Xem chi tiết"
          aria-label={`Xem ${user.username}`}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors duration-200 text-xs font-medium whitespace-nowrap"
          onClick={() => onView(user)}
        >
          <AiOutlineEye className="w-3 h-3" />
          Xem
        </button>
        <button
          title="Chỉnh sửa"
          aria-label={`Sửa ${user.username}`}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors duration-200 text-xs font-medium whitespace-nowrap"
          onClick={() => onEdit(user)}
        >
          <AiOutlineEdit className="w-3 h-3" />
          Sửa
        </button>
        <button
          title={user.status ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          aria-label={`${user.status ? "Khóa" : "Mở khóa"} ${user.username}`}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors duration-200 text-xs font-medium ${
            user.status
              ? "bg-red-50 text-red-700 hover:bg-red-100"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          } whitespace-nowrap`}
          onClick={() => onToggleLock(user.id, user.status)}
        >
          <AiOutlineLock className="w-3 h-3" />
          {user.status ? "Khóa" : "Mở khóa"}
        </button>
        <button
          title="Xóa tài khoản"
          aria-label={`Xóa ${user.username}`}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors duration-200 text-xs font-medium whitespace-nowrap"
          onClick={() => onDelete(user.id)}
        >
          <AiOutlineDelete className="w-3 h-3" />
          Xóa
        </button>
      </div>
    </div>
  );
};

export default UserCard;