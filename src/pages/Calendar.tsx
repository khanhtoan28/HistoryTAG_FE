import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { viLocale } from "../utils/calendarLocale";
import {
  getAllPersonalCalendarEvents,
  createPersonalCalendarEvent,
  updatePersonalCalendarEvent,
  deletePersonalCalendarEvent,
  type PersonalCalendarEventResponseDTO,
} from "../api/auth.api";
import toast from "react-hot-toast";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    eventId?: number;
    color?: string;
    isPast?: boolean;
    isTeamEvent?: boolean; // Đánh dấu event từ team calendar
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventTime, setEventTime] = useState(""); // Thêm state cho giờ
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const [dateLocked, setDateLocked] = useState(false); // Track xem ngày có bị khóa không
  const [errors, setErrors] = useState<{
    title?: string;
    startDate?: string;
    eventLevel?: string;
  }>({});
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const workPriorityLevels = {
    "Rất quan trọng": "danger", // Đỏ
    "Bình thường": "success", // Xanh lá
    "Quan trọng": "warning", // Vàng
  };

  // Map color name to work priority level
  const colorToPriorityLevel: Record<string, string> = {
    danger: "Rất quan trọng",
    success: "Bình thường",
    warning: "Quan trọng",
  };

  const priorityLevelToColor: Record<string, string> = {
    "Rất quan trọng": "danger",
    "Bình thường": "success",
    "Quan trọng": "warning",
  };

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);

  // Tạo danh sách giờ (0-23) và phút (0-59)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // Load events from API
  useEffect(() => {
    loadEvents();
  }, []);

  // Check if event date has passed
  const isEventPast = (eventDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    return event < today;
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const apiEvents = await getAllPersonalCalendarEvents();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const mappedEvents: CalendarEvent[] = apiEvents.map((event) => {
        const eventDate = new Date(event.startDate);
        const isAllDay = event.allDay ?? true;
        
        // Kiểm tra isPast: chỉ so sánh ngày, không so sánh giờ
        // Event là "past" chỉ khi ngày của event < ngày hôm nay
        const eventDay = new Date(eventDate);
        eventDay.setHours(0, 0, 0, 0);
        // So sánh: event đã qua nếu eventDay < today (tức là ngày hôm qua hoặc trước đó)
        // Event của ngày hôm nay (eventDay === today) sẽ KHÔNG bị đánh dấu là past
        const isPast = eventDay.getTime() < today.getTime();
        
        // Check if this is a team event (negative ID indicates team event)
        const isTeamEvent = event.id < 0;
        
        return {
          id: String(event.id),
          title: isTeamEvent ? `[Meeting invite] ${event.title}` : event.title, // Prefix để phân biệt
          start: event.startDate,
          end: event.endDate || undefined,
          allDay: isAllDay,
          extendedProps: {
            calendar: colorToPriorityLevel[event.color] || "Bình thường",
            color: isPast ? "secondary" : (event.color || "success"), // Dùng "secondary" (xám) nếu đã qua ngày
            eventId: event.id,
            isPast: isPast, // Lưu trạng thái đã qua ngày
            isTeamEvent: isTeamEvent, // Đánh dấu là team event
          },
        };
      });
      setEvents(mappedEvents);
    } catch (error: any) {
      console.error("Error loading events:", error);
      toast.error("Không thể tải sự kiện: " + (error?.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  };

  // Check if a date is in the past
  const isDatePast = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr + "T00:00:00");
    date.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // Block selection of past dates
    const selectedDate = selectInfo.startStr.includes("T") 
      ? selectInfo.startStr.split("T")[0] 
      : selectInfo.startStr;
    
    if (isDatePast(selectedDate)) {
      toast.error("Không thể chọn ngày trong quá khứ");
      selectInfo.view.calendar.unselect();
      return;
    }

    resetModalFields();
    // Tự động set ngày khi chọn trên calendar
    setEventStartDate(selectedDate);
    setEventEndDate(selectedDate);
    setDateLocked(true); // Khóa ngày khi chọn từ calendar
    openModal();
  };

  // Callback to add CSS class for past dates
  const dayCellClassNames = (arg: any) => {
    const dateStr = arg.date.toISOString().split("T")[0];
    if (isDatePast(dateStr)) {
      return "fc-day-past";
    }
    return "";
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    const calendarEvent = event as unknown as CalendarEvent;
    const isTeamEvent = calendarEvent.extendedProps?.isTeamEvent || false;
    
    // Nếu là team event, hiển thị thông báo và chỉ cho xem

    
    setSelectedEvent(calendarEvent);
    // Remove prefix [Team] nếu có
    const titleWithoutPrefix = event.title.replace(/^\[Team\]\s*/, "");
    setEventTitle(titleWithoutPrefix);
    
    // Format ngày tránh timezone issue
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
    // Format giờ từ event
    const formatTimeFromDate = (date: Date | null | undefined): string => {
      if (!date) return "";
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    };
    
    const eventDate = formatDate(event.start);
    const eventTimeStr = formatTimeFromDate(event.start);
    setEventStartDate(eventDate);
    setEventEndDate(eventDate);
    setEventTime(eventTimeStr);
    setEventLevel(event.extendedProps.calendar);
    setDateLocked(true); // Khóa ngày khi edit event từ calendar
    openModal();
  };

  // Check if selected event is past
  const isSelectedEventPast = (): boolean => {
    if (!selectedEvent || !eventStartDate) return false;
    return isEventPast(eventStartDate);
  };

  // Check if selected event is a team event (read-only)
  const isSelectedEventTeamEvent = (): boolean => {
    return selectedEvent?.extendedProps?.isTeamEvent || false;
  };

  // Combined check: event is past OR team event (both should be read-only)
  const isSelectedEventReadOnly = (): boolean => {
    return isSelectedEventPast() || isSelectedEventTeamEvent();
  };

  const validateForm = (): boolean => {
    const newErrors: {
      title?: string;
      startDate?: string;
      eventLevel?: string;
    } = {};

    // Validate title
    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle) {
      newErrors.title = "Vui lòng nhập tiêu đề sự kiện";
    } else if (trimmedTitle.length > 255) {
      newErrors.title = "Tiêu đề sự kiện không được vượt quá 255 ký tự";
    }

    // Validate startDate
    if (!eventStartDate) {
      newErrors.startDate = "Vui lòng chọn ngày trên lịch";
    } else {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(eventStartDate)) {
        newErrors.startDate = "Định dạng ngày không hợp lệ";
      }
    }

    // Validate eventLevel
    if (!eventLevel) {
      newErrors.eventLevel = "Vui lòng chọn mức độ công việc";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = () => {
    // Block saving if this is a team event
    if (selectedEvent?.extendedProps?.isTeamEvent) {
      toast.error("Không thể chỉnh sửa sự kiện từ lịch team");
      return;
    }

    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin đã nhập");
      return;
    }

    // If updating, show confirmation modal
    if (selectedEvent && selectedEvent.extendedProps.eventId) {
      setUpdateConfirmOpen(true);
    } else {
      // If creating, save directly
      handleSaveEvent();
    }
  };

  const handleSaveEvent = async () => {
    setLoading(true);
    try {
      const trimmedTitle = eventTitle.trim();
      const color = workPriorityLevels[eventLevel as keyof typeof workPriorityLevels] || "success";
      
      // Tạo datetime từ ngày và giờ
      let startDateTime = eventStartDate;
      let endDateTime = eventStartDate;
      
      // Nếu có giờ, thêm vào datetime
      if (eventTime) {
        startDateTime = `${eventStartDate}T${eventTime}:00`;
        endDateTime = `${eventStartDate}T${eventTime}:00`;
      } else {
        // Nếu không có giờ, dùng allDay
        startDateTime = `${eventStartDate}T00:00:00`;
        endDateTime = `${eventStartDate}T23:59:59`;
      }
      
      const payload = {
        title: trimmedTitle,
        startDate: startDateTime,
        endDate: endDateTime,
        color: color,
        allDay: !eventTime, // allDay = false nếu có giờ
      };

      if (selectedEvent && selectedEvent.extendedProps.eventId) {
        // Update existing event
        await updatePersonalCalendarEvent(selectedEvent.extendedProps.eventId, payload);
        toast.success("Cập nhật sự kiện thành công");
      } else {
        // Create new event
        await createPersonalCalendarEvent(payload);
        toast.success("Thêm sự kiện thành công");
      }

      await loadEvents();
      setUpdateConfirmOpen(false);
      closeModal();
      resetModalFields();
    } catch (error: any) {
      console.error("Error saving event:", error);
      const errorMessage = error?.response?.data?.data || error?.response?.data?.message || error?.message || "Lỗi không xác định";
      
      // Try to map backend errors to form fields
      const errorLower = errorMessage.toLowerCase();
      if (errorLower.includes("tiêu đề") || errorLower.includes("title")) {
        setErrors({ title: errorMessage });
      } else if (errorLower.includes("ngày bắt đầu") || errorLower.includes("startdate") || errorLower.includes("start date")) {
        setErrors({ startDate: errorMessage });
      } else if (errorLower.includes("mức độ") || errorLower.includes("màu sắc") || errorLower.includes("color")) {
        setErrors({ eventLevel: errorMessage });
      } else {
        toast.error("Không thể lưu sự kiện: " + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCancel = () => {
    setUpdateConfirmOpen(false);
  };

  const handleDeleteClick = () => {
    // Block delete if this is a team event
    if (selectedEvent?.extendedProps?.isTeamEvent) {
      toast.error("Không thể xóa sự kiện từ lịch team");
      return;
    }

    // Block delete if event ID is negative (team event)
    if (selectedEvent && selectedEvent.extendedProps.eventId && selectedEvent.extendedProps.eventId < 0) {
      toast.error("Không thể xóa sự kiện từ lịch team");
      return;
    }

    if (!selectedEvent || !selectedEvent.extendedProps.eventId) {
      toast.error("Không thể xóa sự kiện này");
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // Block delete if this is a team event
    if (selectedEvent?.extendedProps?.isTeamEvent) {
      toast.error("Không thể xóa sự kiện từ lịch team");
      setDeleteConfirmOpen(false);
      return;
    }

    // Block delete if event ID is negative (team event)
    if (selectedEvent && selectedEvent.extendedProps.eventId && selectedEvent.extendedProps.eventId < 0) {
      toast.error("Không thể xóa sự kiện từ lịch team");
      setDeleteConfirmOpen(false);
      return;
    }

    if (!selectedEvent || !selectedEvent.extendedProps.eventId || selectedEvent.extendedProps.eventId <= 0) {
      toast.error("Không thể xóa sự kiện này");
      setDeleteConfirmOpen(false);
      return;
    }

    setLoading(true);
    try {
      await deletePersonalCalendarEvent(selectedEvent.extendedProps.eventId);
      toast.success("Xóa sự kiện thành công");
      await loadEvents();
      setDeleteConfirmOpen(false);
      closeModal();
      resetModalFields();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      const errorMessage = error?.response?.data?.data || error?.message || "Lỗi không xác định";
      toast.error("Không thể xóa sự kiện: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventTime("");
    setEventLevel("");
    setSelectedEvent(null);
    setDateLocked(false);
    setSelectedHour(null);
    setSelectedMinute(null);
    setShowTimePicker(false);
    setErrors({});
  };

  // Parse time từ string HH:mm
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: null, minute: null };
    const [hour, minute] = timeStr.split(":").map(Number);
    return { hour, minute };
  };

  // Format time thành HH:mm
  const formatTime = (hour: number | null, minute: number | null): string => {
    if (hour === null || minute === null) return "";
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  // Khi chọn giờ/phút, cập nhật eventTime
  useEffect(() => {
    if (selectedHour !== null && selectedMinute !== null) {
      setEventTime(formatTime(selectedHour, selectedMinute));
    } else if (selectedHour === null && selectedMinute === null) {
      setEventTime("");
    }
  }, [selectedHour, selectedMinute]);

  // Khi eventTime thay đổi từ bên ngoài, parse lại
  useEffect(() => {
    if (eventTime) {
      const { hour, minute } = parseTime(eventTime);
      setSelectedHour(hour);
      setSelectedMinute(minute);
    } else {
      setSelectedHour(null);
      setSelectedMinute(null);
    }
  }, [eventTime]);

  return (
    <>
      <PageMeta
        title="Lịch Cá Nhân | TailAdmin"
        description="Lịch cá nhân của bạn"
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Lịch Cá Nhân
          </h2>
        </div>
        <style>{`
          .fc-day-past {
            background-color: #f3f4f6 !important;
            cursor: not-allowed !important;
          }
          .fc-day-past .fc-daygrid-day-frame {
            pointer-events: none;
          }
          .fc-day-past .fc-daygrid-day-number {
            color: #6b7280 !important;
            opacity: 1 !important;
          }
          .fc-day-past.fc-day-today .fc-daygrid-day-number {
            color: #6b7280 !important;
          }
        `}</style>
        <div className="custom-calendar">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={viLocale as any}
            locales={[viLocale as any]}
            headerToolbar={{
              left: "prev,next addEventButton",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            selectable={true}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            dayMaxEvents={2}
            moreLinkContent={(arg) => {
              // arg.num là số events còn lại
              return `Bạn còn ${arg.num}\ncông việc trong ngày`;
            }}
            moreLinkClick={(info) => {
              // Chuyển sang day view của ngày đó khi click "còn tiếp..."
              if (calendarRef.current) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.changeView('timeGridDay', info.date);
              }
            }}
            customButtons={{
              addEventButton: {
                text: "Thêm sự kiện +",
                click: () => {
                  resetModalFields();
                  setDateLocked(false); // Cho phép sửa ngày khi click nút
                  openModal();
                },
              },
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Lên kế hoạch cho sự kiện tiếp theo: lên lịch hoặc chỉnh sửa sự kiện để theo dõi công việc
              </p>
            </div>
            <div className="mt-8">
              
              <div>
                <div>
                  <label className={`mb-1.5 block text-sm font-medium ${
                    isSelectedEventReadOnly() 
                      ? "text-gray-400 dark:text-gray-500" 
                      : "text-gray-700 dark:text-gray-400"
                  }`}>
                    Tên công việc {!isSelectedEventReadOnly() && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => {
                      setEventTitle(e.target.value);
                      // Clear error when user starts typing
                      if (errors.title) {
                        setErrors({ ...errors, title: undefined });
                      }
                    }}
                    disabled={isSelectedEventReadOnly()}
                    className={`dark:bg-dark-900 h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
                      isSelectedEventPast()
                        ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                        : errors.title
                        ? "bg-transparent border-red-500 text-gray-800 focus:border-red-500 focus:ring-red-500/10"
                        : "bg-transparent border-gray-300 text-gray-800 focus:border-brand-300"
                    }`}
                  />
                  {errors.title && !isSelectedEventReadOnly() && (
                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <label className={`mb-1.5 block text-sm font-medium ${
                  isSelectedEventReadOnly() 
                    ? "text-gray-400 dark:text-gray-500" 
                    : "text-gray-700 dark:text-gray-400"
                }`}>
                  Ngày sự kiện {!isSelectedEventReadOnly() && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => {
                    setEventStartDate(e.target.value);
                    setEventEndDate(e.target.value);
                    // Clear error when user selects date
                    if (errors.startDate) {
                      setErrors({ ...errors, startDate: undefined });
                    }
                  }}
                  disabled={isSelectedEventReadOnly() || dateLocked}
                  className={`dark:bg-dark-900 h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
                    isSelectedEventPast() || dateLocked
                      ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      : errors.startDate
                      ? "bg-transparent border-red-500 text-gray-800 focus:border-red-500 focus:ring-red-500/10"
                      : "bg-transparent border-gray-300 text-gray-800 focus:border-brand-300"
                  }`}
                />
                {errors.startDate && !isSelectedEventReadOnly() && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>
                )}
                {dateLocked && !isSelectedEventReadOnly() && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Ngày đã được chọn từ lịch, không thể thay đổi
                  </p>
                )}
              </div>
              <div className="mt-6">
                <label className={`mb-1.5 block text-sm font-medium ${
                  isSelectedEventReadOnly() 
                    ? "text-gray-400 dark:text-gray-500" 
                    : "text-gray-700 dark:text-gray-400"
                }`}>
                  Giờ sự kiện
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => !isSelectedEventReadOnly() && setShowTimePicker(!showTimePicker)}
                    disabled={isSelectedEventReadOnly()}
                    className={`w-full h-11 rounded-lg border px-4 py-2.5 text-left text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                      isSelectedEventPast()
                        ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                        : eventTime
                        ? "bg-transparent border-gray-300 text-gray-800 focus:border-brand-300"
                        : "bg-transparent border-gray-300 text-gray-500 focus:border-brand-300"
                    }`}
                  >
                    {eventTime && eventTime.trim() !== ""
                      ? (() => {
                          const [hours, minutes] = eventTime.split(":").map(Number);
                          if (isNaN(hours) || isNaN(minutes)) return "— Chọn giờ (tùy chọn) —";
                          const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                          const ampm = hours < 12 ? "SA" : "CH";
                          return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
                        })()
                      : "— Chọn giờ (tùy chọn) —"
                    }
                  </button>
                  
                  {showTimePicker && !isSelectedEventReadOnly() && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => {
                          // Khi click ra ngoài, đóng time picker và giữ nguyên giờ đã chọn
                          setShowTimePicker(false);
                        }}
                      />
                      <div className="absolute z-50 mt-2 w-full max-w-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Chọn giờ</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedHour(null);
                            setSelectedMinute(null);
                            setShowTimePicker(false);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          Xóa
                        </button>
                      </div>
                      <div className="flex gap-2">
                        {/* Giờ */}
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Giờ</div>
                          <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent border border-gray-200 dark:border-gray-700 rounded">
                            {hours.map((hour) => (
                              <div
                                key={hour}
                                onClick={() => setSelectedHour(hour)}
                                className={`px-2 py-1 text-xs text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  selectedHour === hour
                                    ? "bg-brand-500 text-white dark:bg-brand-600"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {String(hour).padStart(2, "0")}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Phút */}
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-center">Phút</div>
                          <div className="h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent border border-gray-200 dark:border-gray-700 rounded">
                            {minutes.map((minute) => (
                              <div
                                key={minute}
                                onClick={() => setSelectedMinute(minute)}
                                className={`px-2 py-1 text-xs text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                  selectedMinute === minute
                                    ? "bg-brand-500 text-white dark:bg-brand-600"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {String(minute).padStart(2, "0")}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            // Đóng time picker và giữ nguyên giờ đã chọn
                            setShowTimePicker(false);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
                        >
                          Xong
                        </button>
                      </div>
                    </div>
                    </>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Chọn giờ hoặc để trống nếu sự kiện kéo dài cả ngày
                </p>
              </div>
              <div className="mt-6">
                <label className={`block mb-4 text-sm font-medium ${
                  isSelectedEventPast() 
                    ? "text-gray-400 dark:text-gray-500" 
                    : "text-gray-700 dark:text-gray-400"
                }`}>
                  Mức độ công việc {!isSelectedEventPast() && <span className="text-red-500">*</span>}
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(workPriorityLevels).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div
                        className={`form-check form-check-${value} form-check-inline ${
                          isSelectedEventPast() ? "opacity-60 pointer-events-none" : ""
                        }`}
                      >
                        <label
                        className={`flex items-center text-sm form-check-label ${
                          isSelectedEventReadOnly() 
                            ? "text-gray-400 cursor-not-allowed dark:text-gray-500" 
                            : "text-gray-700 dark:text-gray-400"
                        }`}
                          htmlFor={`modal${key}`}
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-level"
                              value={key}
                              id={`modal${key}`}
                              checked={eventLevel === key}
                              onChange={() => {
                                setEventLevel(key);
                                // Clear error when user selects
                                if (errors.eventLevel) {
                                  setErrors({ ...errors, eventLevel: undefined });
                                }
                              }}
                              disabled={isSelectedEventReadOnly()}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventLevel === key ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          {key}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                {errors.eventLevel && (
                  <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{errors.eventLevel}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              {selectedEvent && !isSelectedEventTeamEvent() && (
                <button
                  onClick={handleDeleteClick}
                  type="button"
                  disabled={loading || isSelectedEventReadOnly()}
                  className="flex w-full justify-center rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto disabled:opacity-50"
                >
                  Xóa sự kiện
                </button>
              )}
              <button
                onClick={closeModal}
                type="button"
                disabled={loading}
                className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                onClick={handleSaveClick}
                type="button"
                disabled={loading || isSelectedEventReadOnly()}
                className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xử lý..." : selectedEvent ? "Cập nhật" : "Thêm sự kiện"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50" onClick={handleDeleteCancel} />
            <div className="relative z-[100001] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-100">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Xác nhận xóa sự kiện
                    </h3>
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">
                        Bạn có chắc chắn muốn xóa sự kiện "{selectedEvent?.title}"? Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang xóa..." : "Xóa sự kiện"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Confirmation Modal */}
        {updateConfirmOpen && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50" onClick={handleUpdateCancel} />
            <div className="relative z-[100001] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-100">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Xác nhận cập nhật sự kiện
                    </h3>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Bạn có chắc chắn muốn cập nhật sự kiện "{eventTitle || selectedEvent?.title}"? Thông tin sự kiện sẽ được thay đổi theo dữ liệu mới.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={handleUpdateCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang cập nhật..." : "Xác nhận cập nhật"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  // Sử dụng màu từ extendedProps.color (danger/success/warning/secondary) thay vì text
  const color = eventInfo.event.extendedProps.color || "success";
  const colorClass = `fc-bg-${color}`;
  const isPast = eventInfo.event.extendedProps.isPast || false;
  
  // Format giờ từ event nếu có
  const formatEventTime = (event: any) => {
    if (!event.start) return "";
    const date = new Date(event.start);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0 && event.allDay) return ""; // All day event, không hiển thị giờ
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? "SA" : "CH";
    return `${hour12}:${String(minutes).padStart(2, "0")} ${ampm}`;
  };
  
  const eventTime = formatEventTime(eventInfo.event);
  
  return (
    <div
      className={`event-fc-color w-full flex flex-col fc-event-main ${colorClass} p-1 rounded-sm ${
        isPast ? "opacity-70" : ""
      }`}
    >
      {/* <div className="fc-daygrid-event-dot"></div> */}
      <div className="fc-event-title">{eventInfo.event.title}</div>
      {eventTime && <div className="fc-event-time text-xs">{eventTime}</div>}
    </div>
  );
};

export default Calendar;
