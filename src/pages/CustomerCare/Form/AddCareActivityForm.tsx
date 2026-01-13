import { useState, useEffect } from "react";
import { FiX, FiSave, FiPhoneCall, FiMail, FiUser, FiFileText } from "react-icons/fi";

export interface CareActivityFormData {
  type: "call" | "email" | "visit" | "note";
  date: string;
  title: string;
  description: string;
  outcome: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  nextAction: string;
  nextFollowUpDate: string;
}

// Helper function để convert form data sang Backend DTO format (cho create)
export function convertActivityFormDataToDTO(formData: CareActivityFormData): any {
  // Convert activityType từ lowercase sang uppercase enum
  const typeMap: Record<string, string> = {
    "call": "CALL",
    "email": "EMAIL",
    "visit": "VISIT",
    "note": "NOTE",
    "meeting": "MEETING",
    "sms": "SMS"
  };
  
  const activityType = typeMap[formData.type.toLowerCase()] || formData.type.toUpperCase();
  
  // Convert date từ datetime-local sang ISO format (LocalDateTime)
  const activityDate = formData.date.includes("T") 
    ? (formData.date.length === 16 ? `${formData.date}:00` : formData.date)
    : formData.date;
  
  // Convert nextFollowUpDate nếu có
  const nextFollowUpDate = formData.nextFollowUpDate 
    ? (formData.nextFollowUpDate.includes("T") 
      ? (formData.nextFollowUpDate.length === 16 ? `${formData.nextFollowUpDate}:00` : formData.nextFollowUpDate)
      : formData.nextFollowUpDate)
    : undefined;
  
  return {
    activityType,
    title: formData.title,
    description: formData.description || undefined,
    outcome: formData.outcome || undefined,
    nextAction: formData.nextAction || undefined,
    activityDate,
    nextFollowUpDate,
  };
}

// Helper function để convert form data sang Backend DTO format (cho update - không có activityDate)
export function convertActivityFormDataToUpdateDTO(formData: CareActivityFormData): any {
  // Convert activityType từ lowercase sang uppercase enum
  const typeMap: Record<string, string> = {
    "call": "CALL",
    "email": "EMAIL",
    "visit": "VISIT",
    "note": "NOTE",
    "meeting": "MEETING",
    "sms": "SMS"
  };
  
  const activityType = typeMap[formData.type.toLowerCase()] || formData.type.toUpperCase();
  
  // Convert nextFollowUpDate nếu có (không có activityDate trong update)
  const nextFollowUpDate = formData.nextFollowUpDate 
    ? (formData.nextFollowUpDate.includes("T") 
      ? (formData.nextFollowUpDate.length === 16 ? `${formData.nextFollowUpDate}:00` : formData.nextFollowUpDate)
      : formData.nextFollowUpDate)
    : undefined;
  
  return {
    activityType,
    title: formData.title,
    description: formData.description || undefined,
    outcome: formData.outcome || undefined,
    nextAction: formData.nextAction || undefined,
    // Note: activityDate không được gửi trong update
    nextFollowUpDate,
  };
}

interface CareActivity {
  id: number;
  date: string;
  timeAgo: string;
  type: "call" | "email" | "visit" | "note";
  title: string;
  description: string;
  outcome?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  nextAction?: string;
  nextFollowUpDate?: string;
}

interface AddCareActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CareActivityFormData) => void;
  hospitalName?: string;
  editingActivity?: CareActivity | null;
  careId?: number; // careId để gọi API trực tiếp từ form (optional)
}

export default function AddCareActivityForm({
  isOpen,
  onClose,
  onSubmit,
  hospitalName,
  editingActivity,
  careId,
}: AddCareActivityFormProps) {
  // Helper để tạo local datetime string (không có timezone conversion)
  const getLocalDateTimeString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<CareActivityFormData>({
    type: "call",
    date: getLocalDateTimeString(),
    title: "",
    description: "",
    outcome: "NEUTRAL",
    nextAction: "",
    nextFollowUpDate: "",
  });

  useEffect(() => {
    if (editingActivity) {
      // Convert date to datetime-local format (không dùng toISOString để tránh timezone issue)
      let dateValue = "";
      
      // Case 1: Format từ API: "YYYY-MM-DDTHH:mm:ss" hoặc "YYYY-MM-DDTHH:mm"
      if (editingActivity.date.includes("T")) {
        dateValue = editingActivity.date.slice(0, 16); // YYYY-MM-DDTHH:mm
      } 
      // Case 2: Format hiển thị: "HH:mm, dd/mm/yyyy" (ví dụ: "09:00, 18/09/2025")
      else if (editingActivity.date.includes(",")) {
        try {
          const [timePart, datePart] = editingActivity.date.split(",");
          if (timePart && datePart) {
            const [hours, minutes] = timePart.trim().split(":");
            const [day, month, year] = datePart.trim().split("/");
            dateValue = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
          } else {
            dateValue = getLocalDateTimeString();
          }
        } catch {
          dateValue = getLocalDateTimeString();
        }
      }
      // Case 3: Format khác, thử parse
      else {
        try {
          // Nếu là ISO string không có T, hoặc format khác
          const date = new Date(editingActivity.date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            dateValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          } else {
            dateValue = getLocalDateTimeString();
          }
        } catch {
          dateValue = getLocalDateTimeString();
        }
      }
      
      // Convert nextFollowUpDate tương tự
      let nextFollowUpValue = "";
      if (editingActivity.nextFollowUpDate) {
        if (editingActivity.nextFollowUpDate.includes("T")) {
          nextFollowUpValue = editingActivity.nextFollowUpDate.slice(0, 16);
        } else {
          try {
            const date = new Date(editingActivity.nextFollowUpDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            nextFollowUpValue = `${year}-${month}-${day}T${hours}:${minutes}`;
          } catch {
            nextFollowUpValue = editingActivity.nextFollowUpDate.slice(0, 16);
          }
        }
      }
      
      setFormData({
        type: editingActivity.type,
        date: dateValue,
        title: editingActivity.title,
        description: editingActivity.description,
        outcome: editingActivity.outcome || "NEUTRAL",
        nextAction: editingActivity.nextAction || "",
        nextFollowUpDate: nextFollowUpValue,
      });
    } else {
      // Set default date to current local datetime
      setFormData({
        type: "call",
        date: getLocalDateTimeString(),
        title: "",
        description: "",
        outcome: "NEUTRAL",
        nextAction: "",
        nextFollowUpDate: "",
      });
    }
  }, [editingActivity, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert form data to match Backend DTO format
    const convertedData: CareActivityFormData = {
      ...formData,
      // Data sẽ được convert trong onSubmit callback hoặc API call
    };
    
    onSubmit(convertedData);
    
    // Reset form với local datetime
    setFormData({
      type: "call",
      date: getLocalDateTimeString(),
      title: "",
      description: "",
      outcome: "NEUTRAL",
      nextAction: "",
      nextFollowUpDate: "",
    });
  };

  const handleClose = () => {
    // Reset form when closing với local datetime
    setFormData({
      type: "call",
      date: getLocalDateTimeString(),
      title: "",
      description: "",
      outcome: "NEUTRAL",
      nextAction: "",
      nextFollowUpDate: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto dark:bg-gray-800">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingActivity ? "Sửa hoạt động chăm sóc" : "Thêm hoạt động chăm sóc"}
            </h3>
            {hospitalName && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {hospitalName}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Loại hoạt động <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              required
            >
              <option value="call">📞 Gọi điện</option>
              <option value="email">✉️ Gửi email</option>
              <option value="visit">👤 Gặp mặt</option>
              <option value="note">📝 Ghi chú</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ngày & Giờ <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nhập tiêu đề hoạt động"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mô tả chi tiết <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập mô tả chi tiết về hoạt động..."
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kết quả <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="POSITIVE"
                  checked={formData.outcome === "POSITIVE"}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-green-700 dark:text-green-400 font-medium">✅ Tích cực</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="NEUTRAL"
                  checked={formData.outcome === "NEUTRAL"}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">➖ Trung lập</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="outcome"
                  value="NEGATIVE"
                  checked={formData.outcome === "NEGATIVE"}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value as any })}
                  className="mr-2"
                />
                <span className="text-sm text-red-700 dark:text-red-400 font-medium">❌ Tiêu cực</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Hành động tiếp theo
            </label>
            <input
              type="text"
              value={formData.nextAction}
              onChange={(e) => setFormData({ ...formData, nextAction: e.target.value })}
              placeholder="Nhập hành động tiếp theo (tùy chọn)"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ngày follow up (tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={formData.nextFollowUpDate}
              onChange={(e) => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
            >
              <FiSave className="h-4 w-4" />
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

