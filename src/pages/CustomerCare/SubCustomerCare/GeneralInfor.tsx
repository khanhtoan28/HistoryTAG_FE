import { useRef } from "react";
import { FiPlus, FiAlertTriangle, FiCheckCircle, FiShield, FiTool, FiRefreshCw, FiExternalLink, FiClock, FiPhoneCall, FiSend, FiUser, FiMail, FiFileText, FiMessageCircle } from "react-icons/fi";

export interface Contract {
  id: string;
  code: string;
  type: "Bảo trì (Maintenance)" | "Bảo hành (Warranty)";
  year: number;
  value: string;
  status: "SAP_HET_HAN" | "DA_GIA_HAN" | "HET_HAN" | "DANG_HOAT_DONG";
  linkedContract?: string;
  startDate?: string;
  expiryDate?: string;
  daysLeft?: number;
  picUser?: { id: number; label: string; subLabel?: string; phone?: string | null } | null;
  kioskQuantity?: number | null;
}

export interface Ticket {
  id: string;
  issue: string;
  priority: "Cao" | "Trung bình" | "Thấp";
  createdAt?: string; // ISO date string
  timeElapsed?: string; // Human readable: "2h 30p", "3 ngày", etc.
  pic: string;
  status: "CHUA_XU_LY" | "DANG_XU_LY" | "HOAN_THANH";
  ticketType?: "MAINTENANCE" | "DEPLOYMENT"; // Loại ticket: Bảo trì hoặc Triển khai
}

export interface CareActivity {
  id: number;
  date: string;
  timeAgo: string;
  type: "call" | "email" | "visit" | "note" | "zalo" | "cong_van";
  title: string;
  description: string;
  outcome?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  nextAction?: string;
  nextFollowUpDate?: string;
}

interface ContractsTabProps {
  contracts: Contract[];
  tickets: Ticket[];
  timeline: {
    warranty: { year: number; completed: boolean };
    maintenance: { year: number; completed: boolean };
    renewal: { year: number; completed: boolean };
  };
  nextExpiringContractId?: string;
  contractRowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  careHistory?: CareActivity[];
}

const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor?: string }> = {
  SAP_HET_HAN: { label: "Sắp hết hạn", bgColor: "bg-amber-100", textColor: "text-amber-700", borderColor: "border-amber-300" },
  DA_GIA_HAN: { label: "Đã gia hạn", bgColor: "bg-green-100", textColor: "text-green-700", borderColor: "border-green-300" },
  HET_HAN: { label: "Hết hạn", bgColor: "bg-gray-100", textColor: "text-gray-600", borderColor: "border-gray-300" },
  DANG_HOAT_DONG: { label: "Đang hoạt động", bgColor: "bg-blue-100", textColor: "text-blue-700", borderColor: "border-blue-300" },
  DANG_BAO_HANH: { label: "Đang bảo hành", bgColor: "bg-green-100", textColor: "text-green-700", borderColor: "border-green-300" },
  CHUA_XU_LY: { label: "Chưa xử lý", bgColor: "bg-gray-100", textColor: "text-gray-700" },
  DANG_XU_LY: { label: "Đang xử lý", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  QUA_SLA: { label: "Quá SLA", bgColor: "bg-red-100", textColor: "text-red-700" },
  HOAN_THANH: { label: "Hoàn thành", bgColor: "bg-green-100", textColor: "text-green-700" }
};

const priorityConfig: Record<string, { bgColor: string; textColor: string }> = {
  "Cao": { bgColor: "bg-red-100", textColor: "text-red-700" },
  "Trung bình": { bgColor: "bg-amber-100", textColor: "text-amber-700" },
  "Thấp": { bgColor: "bg-green-100", textColor: "text-green-700" }
};

export default function ContractsTab({
  contracts,
  tickets,
  timeline,
  nextExpiringContractId,
  contractRowRefs,
  careHistory = []
}: ContractsTabProps) {
  return (
    <div className="space-y-6">
      {/* Section A: Contracts Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Danh sách hợp đồng
          </h3>
          <button className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition">
            <FiPlus className="h-3.5 w-3.5" />
            Tạo hợp đồng mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Mã Hợp Đồng</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Loại Hợp Đồng</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Năm</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Giá Trị</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Trạng Thái</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Liên Kết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FiFileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Chưa có hợp đồng nào
                    </p>
                  </td>
                </tr>
              ) : (
                contracts
                  .sort((a, b) => {
                    // Sắp xếp theo expiryDate giảm dần (mới nhất trước)
                    // Nếu không có expiryDate thì đưa xuống cuối
                    if (!a.expiryDate && !b.expiryDate) return 0;
                    if (!a.expiryDate) return 1;
                    if (!b.expiryDate) return -1;
                    
                    try {
                      const dateA = new Date(a.expiryDate.split('/').reverse().join('-')).getTime();
                      const dateB = new Date(b.expiryDate.split('/').reverse().join('-')).getTime();
                      return dateB - dateA; // Mới nhất trước
                    } catch {
                      return 0;
                    }
                  })
                  .slice(0, 3) // Chỉ lấy 3 hợp đồng mới nhất
                  .map((contract) => {
                    const isHighlighted = nextExpiringContractId === contract.id;
                    return (
                      <tr 
                        key={contract.id} 
                        ref={(el) => { contractRowRefs.current[contract.id] = el; }}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all ${
                          isHighlighted 
                            ? "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500" 
                            : ""
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-600">{contract.code}</span>
                            {isHighlighted && (
                              <FiAlertTriangle className="h-4 w-4 text-amber-600" title="Hợp đồng sắp hết hạn gần nhất" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                          {contract.type}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                          {contract.year}
                        </td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                          {contract.value}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[contract.status]?.bgColor} ${statusConfig[contract.status]?.textColor}`}>
                            {statusConfig[contract.status]?.label}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {contract.linkedContract ? (
                            <button className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                              <FiExternalLink className="h-3.5 w-3.5" />
                              {contract.linkedContract}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">Gốc</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section B: Lifecycle Timeline */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
          Quy trình vòng đời (Timeline)
        </h3>
        
        <div className="relative flex items-center justify-between max-w-2xl mx-auto">
          {/* Line connecting steps */}
          <div className="absolute top-6 left-[15%] right-[15%] h-0.5 bg-blue-200 dark:bg-blue-800 z-0"></div>
          
          {/* Warranty Step */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              timeline.warranty.completed 
                ? "bg-green-500 border-green-500 text-white" 
                : "bg-white border-gray-300 text-gray-400 dark:bg-gray-800"
            }`}>
              {timeline.warranty.completed ? (
                <FiCheckCircle className="h-6 w-6" />
              ) : (
                <FiShield className="h-5 w-5" />
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Bảo hành</p>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">{timeline.warranty.year}</p> */}
          </div>

          {/* Maintenance Step */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              timeline.maintenance.completed 
                ? "bg-blue-500 border-blue-500 text-white" 
                : "bg-white border-gray-300 text-gray-400 dark:bg-gray-800"
            }`}>
              {timeline.maintenance.completed ? (
                <FiTool className="h-5 w-5" />
              ) : (
                <FiTool className="h-5 w-5" />
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Bảo trì</p>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">{timeline.maintenance.year}</p> */}
          </div>

          {/* Renewal Step */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
              timeline.renewal.completed 
                ? "bg-green-500 border-green-500 text-white" 
                : "bg-white border-blue-400 text-blue-500 dark:bg-gray-800"
            }`}>
              <FiRefreshCw className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Gia hạn</p>
            {/* <p className="text-xs text-gray-500 dark:text-gray-400">{timeline.renewal.year}</p> */}
          </div>
        </div>
      </div>

      {/* Section C: Recent Incidents */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Sự cố Kiosk gần đây
        </h3>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Ticket ID</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Vấn đề</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Ưu tiên</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Thời gian chờ</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Phụ trách</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider dark:text-gray-400">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FiFileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Chưa có sự cố nào
                    </p>
                  </td>
                </tr>
              ) : (
                tickets
                  .sort((a, b) => {
                    // Sắp xếp theo createdAt giảm dần (mới nhất trước)
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                  })
                  .slice(0, 3) // Chỉ lấy 3 ticket mới nhất
                  .map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-3">
                        <span className="text-sm font-medium text-blue-600">{ticket.id}</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                        {ticket.issue}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityConfig[ticket.priority]?.bgColor} ${priorityConfig[ticket.priority]?.textColor}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                          <FiClock className="h-4 w-4 text-gray-400" />
                          {ticket.status === "HOAN_THANH" ? "Đã hoàn thành" : (ticket.timeElapsed || "Chưa có")}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                        {ticket.pic}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[ticket.status]?.bgColor} ${statusConfig[ticket.status]?.textColor}`}>
                          {statusConfig[ticket.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section D: Care History (Vertical Timeline) */}
      {careHistory && careHistory.length > 0 && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Lịch sử Chăm sóc
          </h3>

          <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-blue-200 dark:bg-blue-800"></div>
            
            <div className="space-y-6">
              {careHistory.slice(0, 3).map((item, index) => (
                <div key={item.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                    index === 0 
                      ? "bg-blue-500 border-blue-500 text-white" 
                      : "bg-white border-gray-300 text-gray-500 dark:bg-gray-800"
                  }`}>
                    {item.type === "call" ? (
                      <FiPhoneCall className="h-4 w-4" />
                    ) : item.type === "email" ? (
                      <FiSend className="h-4 w-4" />
                    ) : item.type === "visit" ? (
                      <FiUser className="h-4 w-4" />
                    ) : item.type === "zalo" ? (
                      <FiMessageCircle className="h-4 w-4" />
                    ) : item.type === "cong_van" ? (
                      <FiFileText className="h-4 w-4" />
                    ) : (
                      <FiFileText className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        index === 0 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}>
                        {item.timeAgo}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">- {item.date}</span>
                      {item.outcome && (
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.outcome === "POSITIVE" ? "bg-green-100 text-green-700" :
                          item.outcome === "NEGATIVE" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {item.outcome === "POSITIVE" ? "Tích cực" :
                           item.outcome === "NEGATIVE" ? "Tiêu cực" : "Trung lập"}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      {item.type === "call" && <FiPhoneCall className="h-4 w-4 inline-block mr-1.5 text-blue-600" />}
                      {item.type === "email" && <FiMail className="h-4 w-4 inline-block mr-1.5 text-purple-600" />}
                      {item.type === "visit" && <FiUser className="h-4 w-4 inline-block mr-1.5 text-green-600" />}
                      {item.type === "note" && <FiFileText className="h-4 w-4 inline-block mr-1.5 text-gray-600" />}
                      {item.type === "zalo" && <FiMessageCircle className="h-4 w-4 inline-block mr-1.5 text-indigo-600" />}
                      {item.type === "cong_van" && <FiFileText className="h-4 w-4 inline-block mr-1.5 text-orange-600" />}
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {item.description}
                    </p>
                    {item.nextAction && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <strong>Hành động tiếp theo:</strong> {item.nextAction}
                        {item.nextFollowUpDate && (
                          <span className="ml-2">
                            (Follow up: {new Date(item.nextFollowUpDate).toLocaleString("vi-VN")})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

