import { useState, useEffect } from "react";
import { 
  FiX, 
  FiUser, 
  FiCalendar, 
  FiTag, 
  FiFileText, 
  FiBriefcase,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiTrendingUp,
  FiMail,
  FiPhone,
  FiEdit3,
  FiRefreshCw,
  FiUserPlus,
  FiMoreVertical
} from "react-icons/fi";
import { AddHospitalToCareFormData } from "../Form/AddHospitalToCareForm";
import { getCustomerCareById, CustomerCareResponseDTO } from "../../../api/customerCare.api";

interface HospitalDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  hospitalId: number; // careId thực tế
}

// Helper function to format date from API (LocalDateTime string) to display format
function formatDateForDisplay(dateString?: string): string {
  if (!dateString) return "";
  try {
    // API trả về LocalDateTime string (không có timezone), parse như local date
    const [datePart] = dateString.split('T');
    if (!datePart) return "";
    
    // Parse date parts
    const [year, month, day] = datePart.split('-');
    if (!year || !month || !day) return "";
    
    // Format theo định dạng Việt Nam: dd/mm/yyyy
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

// Helper function to format datetime from API to display format
function formatDateTimeForDisplay(dateString?: string): string {
  if (!dateString) return "";
  try {
    // API trả về: "2026-01-14T10:30:00" (LocalDateTime)
    const [datePart, timePart] = dateString.split('T');
    if (!datePart || !timePart) return "";
    
    // Extract date parts
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');
    
    if (!year || !month || !day || !hours || !minutes) return "";
    
    // Format: dd/mm/yyyy HH:mm
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "";
  }
}

const careTypes: Record<string, string> = {
  CONTRACT_RENEWAL: "Gia hạn hợp đồng",
  UPSELL: "Bán thêm dịch vụ",
  COMPLAINT_HANDLING: "Xử lý khiếu nại",
  TECHNICAL_SUPPORT: "Hỗ trợ kỹ thuật",
  RELATIONSHIP_CARE: "Chăm sóc định kỳ",
  PAYMENT_ISSUE: "Vấn đề thanh toán",
  CONTRACT_EXPIRY: "Hợp đồng sắp hết hạn"
};

const priorityConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
  HIGH: { label: "Cao", bgColor: "bg-red-100", textColor: "text-red-700" },
  MEDIUM: { label: "Trung bình", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  LOW: { label: "Thấp", bgColor: "bg-green-100", textColor: "text-green-700" }
};

// ===================== COMPONENT =====================
export default function HospitalDetailView({ isOpen, onClose, hospitalId }: HospitalDetailViewProps) {
  const [hospitalData, setHospitalData] = useState<AddHospitalToCareFormData & { id: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && hospitalId) {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const careDetail = await getCustomerCareById(hospitalId);
          
          // Convert API response to form data format
          const formData: AddHospitalToCareFormData & { id: number } = {
            id: careDetail.careId,
            hospitalId: careDetail.hospitalId,
            hospitalName: careDetail.hospitalName || `Hospital #${careDetail.hospitalId}`,
            careType: careDetail.careType || "",
            status: (careDetail.status as AddHospitalToCareFormData["status"]) || "PENDING",
            priority: (careDetail.priority as "HIGH" | "MEDIUM" | "LOW") || "MEDIUM",
            reason: careDetail.reason || "",
            assignedUserId: careDetail.assignedUser?.id || null,
            assignedUserName: careDetail.assignedUser?.fullname || "Chưa phân công",
            targetDate: formatDateForDisplay(careDetail.targetDate),
            nextFollowUpDate: careDetail.nextFollowUpDate ? formatDateTimeForDisplay(careDetail.nextFollowUpDate) : "",
            notes: careDetail.notes || "",
            customerType: careDetail.customerType,
            customerTypeLabel: careDetail.customerTypeLabel,
          };
          
          setHospitalData(formData);
        } catch (err: any) {
          console.error("Error loading hospital detail:", err);
          setError(err?.response?.data?.message || err?.message || "Không thể tải thông tin chi tiết");
          setHospitalData(null);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    } else {
      setHospitalData(null);
      setError(null);
    }
  }, [isOpen, hospitalId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold">
              H
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {loading ? "Đang tải..." : hospitalData?.hospitalName || "Chi tiết bệnh viện"}
              </h3>
              {hospitalData && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Thông tin chăm sóc khách hàng
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : hospitalData ? (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Thông tin chính */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiBriefcase className="h-4 w-4 text-blue-600" />
                        Thông tin chăm sóc
                      </h2>
                    </div>
                    <div className="p-4 space-y-4">
                      
                      {/* Bệnh viện */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Bệnh viện
                        </label>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {hospitalData.hospitalName}
                        </p>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700"></div>

                      {/* Loại chăm sóc */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Loại chăm sóc
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {careTypes[hospitalData.careType] || hospitalData.careType}
                        </p>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700"></div>

                      {/* Lý do cần chăm sóc */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Lý do cần chăm sóc
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                          {hospitalData.reason}
                        </p>
                      </div>

                      <div className="border-t border-gray-200 dark:border-gray-700"></div>

                      {/* Ghi chú */}
                      {hospitalData.notes && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                              Ghi chú
                            </label>
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                                {hospitalData.notes}
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-gray-200 dark:border-gray-700"></div>
                        </>
                      )}

                      {/* Loại khách hàng */}
                      {hospitalData.customerTypeLabel && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Loại khách hàng
                          </label>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                              <FiTag className="h-3 w-3" />
                              {hospitalData.customerTypeLabel}
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  
                  {/* Thông tin người phụ trách */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiUser className="h-4 w-4 text-blue-600" />
                        Người phụ trách
                      </h2>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-sm font-semibold dark:bg-blue-900/20 dark:text-blue-400">
                          {hospitalData.assignedUserName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {hospitalData.assignedUserName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Người được giao
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin thời gian */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <FiCalendar className="h-4 w-4 text-blue-600" />
                        Thời gian
                      </h2>
                    </div>
                    <div className="p-4 space-y-3">
                      
                      {/* Ngày mục tiêu */}
                      {hospitalData.targetDate && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Ngày mục tiêu
                          </label>
                          <div className="flex items-center gap-2">
                            <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {hospitalData.targetDate}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Ngày follow up tiếp theo */}
                      {hospitalData.nextFollowUpDate && (
                        <>
                          {hospitalData.targetDate && (
                            <div className="border-t border-gray-200 dark:border-gray-700"></div>
                          )}
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                              Ngày follow up tiếp theo
                            </label>
                            <div className="flex items-center gap-2">
                              <FiCalendar className="h-3.5 w-3.5 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {hospitalData.nextFollowUpDate}
                              </p>
                            </div>
                          </div>
                        </>
                      )}

                    </div>
                  </div>

                </div>

              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy thông tin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
