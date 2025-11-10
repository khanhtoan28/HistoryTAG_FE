// This file contains the TaskCardNew component
// It is responsible for displaying task information in a card format

import { AiOutlineEdit, AiOutlineDelete, AiOutlineEye } from "react-icons/ai";
import { FaTasks } from "react-icons/fa";
import { ImplementationTaskResponseDTO } from "../PageClients/implementation-tasks";

// 🔹 Base type chung cho cả Implementation và Maintenance tasks
type BaseTask = {
  id: number;
  name: string;
  hospitalId?: number | null;
  hospitalName?: string | null;
  picDeploymentId?: number | null;
  picDeploymentName?: string | null;
  status?: string | null;
  startDate?: string | null;
  deadline?: string | null;
  apiUrl?: string | null;
  hisSystemName?: string | null;
  readOnlyForDeployment?: boolean | null;
  transferredToMaintenance?: boolean | null;
  // Additional fields that may exist in either type
  [key: string]: any;
};

// 🔹 Dùng union type để hỗ trợ cả Implementation và Maintenance tasks
type ImplTask = BaseTask | ImplementationTaskResponseDTO;

// ✅ Thay thế statusBadgeClass bằng bản có màu rõ ràng + dark mode
function statusBadgeClass(status?: string) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

  const normalized = status.toUpperCase();

  switch (normalized) {
    case "RECEIVED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "IN_PROCESS":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "COMPLETED":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "ISSUE":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
}

// ✅ Giữ nguyên logic nhận dạng trạng thái ban đầu
function getDisplayStatus(status?: string) {
  if (!status) return "-";
  const s = status.toLowerCase().replace(/[-\s]/g, "_");
  const map: Record<string, string> = {
    received: "Đã tiếp nhận",
    in_process: "Đang xử lý",
    completed: "Hoàn thành",
    issue: "Gặp sự cố",
    cancelled: "Hủy",
    // Legacy support (backward compatibility)
    not_started: "Đã tiếp nhận",
    in_progress: "Đang xử lý",
    accepted: "Hoàn thành",
    done: "Hoàn thành",
    pending: "Đang chờ",
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
  hideHospitalName = false,
  statusLabelOverride,
  statusClassOverride,
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
  hideHospitalName?: boolean;
  statusLabelOverride?: (status?: string) => string;
  statusClassOverride?: (status?: string) => string;
}) {
  const delayMs = typeof idx === "number" && idx > 0 ? 2000 + (idx - 1) * 80 : 0;
  const style = animate ? { animation: "fadeInUp 220ms both", animationDelay: `${delayMs}ms` } : undefined;

  // (Indicators removed; keep component lean and avoid unused vars)

  const transferredToMaintenance = Boolean((task as any)?.transferredToMaintenance);
  const statusValue = typeof task.status === "string" ? task.status : undefined;
  const fallbackStatus = statusValue ?? "";
  const badgeClass = transferredToMaintenance
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200"
    : (statusClassOverride || statusBadgeClass)(fallbackStatus);
  const badgeLabel = transferredToMaintenance
    ? "Chờ bảo trì"
    : statusLabelOverride
      ? statusLabelOverride(statusValue)
      : getDisplayStatus(statusValue);

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
                  { task.name}
                </h3>

                {(statusValue || transferredToMaintenance) && (
                  <span
                    className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${badgeClass}`}
                  >
                    {badgeLabel}
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

              {!hideHospitalName && task.hospitalName &&
                task.name &&
                task.name.trim() &&
                task.name.trim() !== task.hospitalName.trim() && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tên bệnh viện:{" "}
                    <span
                      title={task.hospitalName}
                      className="inline-block font-medium text-gray-800 dark:text-gray-100 rounded px-2 py-0.5 transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-blue-800/40 hover:text-blue-700"
                    >
                      {task.hospitalName}
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
              {/**
               * If the implementation task has been marked readOnlyForDeployment or
               * already transferred, disable edit/delete and hide convert action.
               */}
              {canEdit && !task.readOnlyForDeployment && (
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
              {canDelete && !task.readOnlyForDeployment && (
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
              {/* Non-clickable indicators shown next to Xem */}
              {/* Status badges for transfer are intentionally hidden in the implementation tasks list
                  per UX: conversion actions/indicators are surfaced at the hospital list level only. */}
              {/* Convert action intentionally removed from the list/card view.
                  The convert-to-maintenance action should only be visible
                  inside the task detail modal when the task is fully accepted. */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
