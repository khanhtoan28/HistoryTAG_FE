// This file contains the TaskCardNew component
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

function statusBadgeClass(status?: string) {
  if (!status) return "bg-gray-100 text-gray-800";
  const s = status.toLowerCase();
  const norm = s.replace(/[-\s]/g, "_");
  if (norm === "not_started" || norm === "notstarted" || norm === "not-started" || norm === "not_start") return "bg-orange-100 text-orange-800";
  if (s.includes("done") || s.includes("completed")) return "bg-green-100 text-green-800";
  if (s.includes("progress") || s.includes("inprogress") || s.includes("doing")) return "bg-blue-100 text-blue-800";
  if (s.includes("pending") || s.includes("new") || s.includes("todo")) return "bg-yellow-100 text-yellow-800";
  if (s.includes("cancel") || s.includes("fail") || s.includes("error")) return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

function isNotStarted(status?: string) {
  if (!status) return false;
  const norm = status.toLowerCase().replace(/[-\s]/g, "_");
  return norm === "not_started" || norm === "notstarted" || norm === "not-started" || norm === "not_start";
}

function getDisplayStatus(status?: string) {
  if (!status) return "-";
  const s = status.toLowerCase();
  const norm = s.replace(/[-\s]/g, "_");
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
  if (map[norm]) return map[norm];
  if (norm.includes("in_progress") || norm.includes("progress")) return "Đang triển khai";
  if (norm.includes("api") && (norm.includes("test") || norm.includes("testing"))) return "Kiểm tra API";
  if (norm.includes("integrat")) return "Đang tích hợp";
  if (norm.includes("wait") || norm.includes("waiting")) return "Đang chờ";
  if (norm.includes("accept") || norm.includes("nghiem")) return "Nghiệm thu";
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
  const delayMs = (typeof idx === "number" && idx > 0) ? 2000 + ((idx - 1) * 80) : 0;
  const isNot = isNotStarted(task.status ?? undefined);
  const style = animate ? { animation: "fadeInUp 220ms both", animationDelay: `${delayMs}ms` } : undefined;

  return (
    <div className="group w-full rounded-2xl bg-white px-6 py-5 shadow-sm transition-all border border-gray-100 hover:border-blue-100 hover:shadow-lg" style={style}>
      <div className="flex gap-4 items-start">
        {/* Left badge + icon */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-md bg-gray-50 border flex items-center justify-center text-sm font-semibold text-gray-700">{String(task.id).padStart(3, '0')}</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-sm">
            <FaTasks className="text-xl" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{task.hospitalName ?? task.name}</h3>
                {task.status && (
                  <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(task.status ?? undefined)} ${isNot ? 'animate-pulse' : ''}`}>{getDisplayStatus(task.status ?? undefined)}</span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-1 truncate">{task.hisSystemName ? `Đơn vị HIS: ${task.hisSystemName}` : ''}</div>
              <div className="text-sm text-gray-500 mt-2">Người liên hệ: <span className="font-medium text-gray-800">{task.picDeploymentName ?? '-'}</span></div>
              {/* Show project name under contact when hospitalName is present (avoid duplicating title) */}
              {(task.hospitalName && task.name && String(task.name).trim() && String(task.name).trim() !== String(task.hospitalName).trim()) && (
                <div className="text-sm text-gray-500 mt-1">Tên dự án: <span title={task.name} className="inline-block font-medium text-gray-800 rounded px-2 py-0.5 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-700">{task.name}</span></div>
              )}
            </div>

            {/* Right column: dates */}
            <div className="flex flex-col items-end ml-4 gap-1">
              <div className="text-sm text-gray-400">Bắt đầu</div>
              <div className="text-sm font-semibold text-gray-900">{task.startDate ? new Date(task.startDate).toLocaleDateString('vi-VN') : '-'}</div>
              <div className="text-sm text-gray-400 mt-2">Deadline</div>
              <div className="text-sm font-semibold text-gray-900">{task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '-'}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-orange-500">{task.apiUrl ? <span>API: <a className="underline text-orange-500" href={task.apiUrl} target="_blank" rel="noreferrer">{task.apiUrl}</a></span> : ''}</div>
            <div className="flex items-center gap-3">
              {canView && (
                <button onClick={(e) => { e.stopPropagation(); onOpen(task); }} className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-sm"> <AiOutlineEye /> <span className="hidden md:inline">Xem</span></button>
              )}
              {canEdit && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="inline-flex items-center gap-2 bg-white border border-orange-100 text-orange-500 px-3 py-1 rounded-lg text-sm"> <AiOutlineEdit /> <span className="hidden md:inline">Sửa</span></button>
              )}
              {canDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="inline-flex items-center gap-2 bg-white border border-red-100 text-red-600 px-3 py-1 rounded-lg text-sm"> <AiOutlineDelete /> <span className="hidden md:inline">Xóa</span></button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
