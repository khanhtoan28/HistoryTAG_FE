import { AiOutlineEdit, AiOutlineDelete } from "react-icons/ai";
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
  if (norm === "not_started" || norm === "notstarted" || norm === "not-started" || norm === "not_start") return "Chưa triển khai";
  return status;
}

export default function TaskCardNew({
  task,
  onEdit,
  onDelete,
  onOpen,
  idx,
  animate = true,
}: {
  task: ImplTask;
  onEdit: (t: ImplTask) => void;
  onDelete: (id: number) => void;
  onOpen: (t: ImplTask) => void;
  idx?: number;
  animate?: boolean;
}) {
  const delayMs = (typeof idx === "number" && idx > 0) ? 2000 + ((idx - 1) * 80) : 0;
  const isNot = isNotStarted(task.status ?? undefined);
  const style = animate ? { animation: "fadeInUp 220ms both", animationDelay: `${delayMs}ms` } : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(task); }}
      className="group flex items-center justify-between w-full rounded-2xl bg-white px-6 py-5 shadow-sm transition-all hover:shadow-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
      style={style}
    >
      <div className="flex items-center gap-6 w-full">
  <div className="flex items-center gap-4 min-w-0" onClick={(e) => { e.stopPropagation(); }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shadow-sm">
            <FaTasks className="text-xl" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <div className="text-sm text-gray-500">Bệnh viện</div>
            {/* prevent clicks on the hospital name from triggering the card onClick (open/edit) */}
            <div
              onClick={(e) => { e.stopPropagation(); }}
              className="text-base md:text-lg font-semibold text-gray-900 truncate max-w-xl hover:underline"
              title={task.hospitalName ?? task.name}
            >
              {task.hospitalName ?? task.name}
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 flex-1 justify-center">
          <div className="flex flex-col items-center justify-center min-w-[120px]">
            <div className="text-sm text-gray-400 text-center">Deadline</div>
            <div className="text-sm font-semibold text-gray-900 text-center">{task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : "-"}</div>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[160px]">
            <div className="text-sm text-gray-400 text-center">Người phụ trách</div>
            <div className="text-sm font-semibold text-gray-900 text-center">{task.picDeploymentName ?? "-"}</div>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-sm text-gray-400 text-center">HIS</div>
            <div className="text-sm font-semibold text-gray-900 text-center">{task.hisSystemName ?? "-"}</div>
          </div>
          <div className="flex flex-col items-center justify-center min-w-[140px]">
            <div className="text-sm text-gray-400 text-center">Ngày nghiệm thu</div>
            <div className="text-sm font-semibold text-gray-900 text-center">{task.acceptanceDate ? new Date(task.acceptanceDate).toLocaleDateString('vi-VN') : "-"}</div>
          </div>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-3">
        <div className="flex items-center gap-3">
          {task.status && (
            <div className={`inline-flex items-center justify-center whitespace-nowrap min-w-[96px] px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(task.status ?? undefined)} ${isNot ? 'animate-pulse' : ''}`} title={task.status}>
              {getDisplayStatus(task.status ?? undefined)}
            </div>
          )}

          {/* Note: 'Xem' action removed per design request (main card click opens item) */}

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-white border shadow-sm"
          >
            <AiOutlineEdit className="text-orange-500" /> <span className="hidden sm:inline text-orange-500">Sửa</span>
          </button>

          {/* 'Khóa' action removed per request — only Sửa and Xóa remain */}

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold bg-white border shadow-sm"
          >
            <AiOutlineDelete className="text-red-600" /> <span className="hidden sm:inline text-red-600">Xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
}
