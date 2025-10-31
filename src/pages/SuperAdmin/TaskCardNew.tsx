﻿// This file contains the TaskCardNew component
// It is responsible for displaying task information in a card format

import { AiOutlineEdit, AiOutlineDelete, AiOutlineEye } from "react-icons/ai";
import { FaTasks } from "react-icons/fa";

type ImplTask = {
  id: number;
  name: string;
  hospitalName?: string | null;
  picDeploymentName?: string | null;
  status?: string | null;
  deadline?: string | null;
  hisSystemName?: string | null;
  acceptanceDate?: string | null;
  startDate?: string | null;
  apiUrl?: string | null;
};

// ✅ Thay thế statusBadgeClass bằng bản có màu rõ ràng + dark mode
function statusBadgeClass(status?: string) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  const normalized = status.toUpperCase();

  switch (normalized) {
    case "NOT_STARTED":
      // ⛔ Chưa bắt đầu → xám
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    case "IN_PROGRESS":
      // 🟡 Đang triển khai → vàng
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "API_TESTING":
      // 🔵 Test API → xanh dương
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "INTEGRATING":
      // 🟣 Tích hợp → tím
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "WAITING_FOR_DEV":
      // 🟠 Chờ dev → cam
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "ACCEPTED":
      // ✅ Nghiệm thu → xanh lá
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      // fallback
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

// ✅ Giữ nguyên logic nhận dạng trạng thái ban đầu
function getDisplayStatus(status?: string) {
  if (!status) return "-";
  const s = status.toLowerCase().replace(/[-\s]/g, "_");
  const map: Record<string, string> = {
    not_started: "Chưa triển khai",
    in_progress: "Đang triển khai",
    api_testing: "Kiểm tra API",
    api_test: "Kiểm tra API",
    integrating: "Đang tích hợp",
    waiting_for_dev: "Chờ cập nhật từ dev",
    waiting_for_developer: "Chờ cập nhật từ dev",
    accepted: "Nghiệm thu",
    done: "Hoàn thành",
    completed: "Hoàn thành",
    pending: "Đang chờ",
    cancelled: "Đã hủy",
    failed: "Thất bại",
  };
  if (map[s]) return map[s];
  return status;
}

export default function TaskCardNew({
  task,
  onEdit,
  onDelete,
  onOpen,
  idx,
  animate = true,
  canView = true,
  canEdit = true,
  canDelete = true,
}: {
  task: ImplTask;
  onEdit: (t: ImplTask) => void;
  onDelete: (id: number) => void;
  onOpen: (t: ImplTask) => void;
  idx?: number;
  animate?: boolean;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const delayMs = typeof idx === "number" && idx > 0 ? 2000 + (idx - 1) * 80 : 0;
  const style = animate ? { animation: "fadeInUp 220ms both", animationDelay: `${delayMs}ms` } : undefined;

  return (
    <div
      className="group w-full rounded-2xl bg-white dark:bg-gray-900 px-6 py-5 shadow-sm transition-all border border-gray-100 dark:border-gray-800 hover:border-blue-200 hover:shadow-lg"
      style={style}
    >
      <div className="flex gap-4 items-start">
        {/* Left badge + icon */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-md bg-gray-50 dark:bg-gray-800 border flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
              {String(task.id).padStart(3, "0")}
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 shadow-sm">
            <FaTasks className="text-xl" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {task.hospitalName ?? task.name}
                </h3>

                {task.status && (
                  <span
                    className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                      task.status
                    )}`}
                  >
                    {getDisplayStatus(task.status)}
                  </span>
                )}
              </div>

              {task.hisSystemName && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                  Đơn vị HIS: {task.hisSystemName}
                </div>
              )}

              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Nhân viên phụ trách:{" "}
                <span className="font-medium text-gray-800 dark:text-gray-200">
                  {task.picDeploymentName ?? "-"}
                </span>
              </div>

              {task.hospitalName &&
                task.name &&
                task.name.trim() &&
                task.name.trim() !== task.hospitalName.trim() && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tên dự án:{" "}
                    <span
                      title={task.name}
                      className="inline-block font-medium text-gray-800 dark:text-gray-100 rounded px-2 py-0.5 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-800/40 hover:text-blue-700"
                    >
                      {task.name}
                    </span>
                  </div>
                )}
            </div>

            {/* Right column: dates */}
            <div className="flex flex-col items-end ml-4 gap-1 text-right">
              <div className="text-sm text-gray-400 dark:text-gray-500">Bắt đầu</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {task.startDate
                  ? new Date(task.startDate).toLocaleDateString("vi-VN")
                  : "-"}
              </div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-2">Deadline</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {task.deadline
                  ? new Date(task.deadline).toLocaleDateString("vi-VN")
                  : "-"}
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-orange-500">
              {task.apiUrl && (
                <span>
                  API:{" "}
                  <a
                    className="underline text-orange-500 dark:text-orange-300 hover:text-orange-600"
                    href={task.apiUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {task.apiUrl}
                  </a>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {canView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(task);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-200 px-3 py-1 rounded-lg text-sm hover:bg-blue-100 dark:hover:bg-blue-800"
                >
                  <AiOutlineEye />
                  <span className="hidden md:inline">Xem</span>
                </button>
              )}
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-orange-100 dark:border-orange-800 text-orange-500 px-3 py-1 rounded-lg text-sm hover:bg-orange-50 dark:hover:bg-orange-900/40"
                >
                  <AiOutlineEdit />
                  <span className="hidden md:inline">Sửa</span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                  className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 border border-red-100 dark:border-red-800 text-red-600 px-3 py-1 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/40"
                >
                  <AiOutlineDelete />
                  <span className="hidden md:inline">Xóa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
