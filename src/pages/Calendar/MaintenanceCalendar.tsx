import { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import PageMeta from "../../components/common/PageMeta";
import { viLocale } from "../../utils/calendarLocale";
import toast from "react-hot-toast";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    team?: string;
    eventType?: "team" | "member";
    memberId?: string;
    eventId?: number;
    createdByName?: string;
    originalTitle?: string;
  };
}

const MaintenanceCalendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [eventType, setEventType] = useState<"team" | "member">("team");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dateLocked, setDateLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const workPriorityLevels = {
    "Rất quan trọng": "danger",
    "Bình thường": "success",
    "Quan trọng": "warning",
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

  // Kiểm tra xem user có phải superadmin không
  const isSuperAdmin = () => {
    try {
      const rolesStr = localStorage.getItem("roles") || sessionStorage.getItem("roles");
      if (rolesStr) {
        const roles = JSON.parse(rolesStr);
        if (Array.isArray(roles)) {
          return roles.some((r: any) => {
            if (typeof r === "string") {
              return r.toUpperCase() === "SUPERADMIN" || r.toUpperCase() === "SUPER_ADMIN";
            }
            if (r && typeof r === "object") {
              const roleName = r.roleName || r.role_name || r.role;
              return typeof roleName === "string" && roleName.toUpperCase() === "SUPERADMIN";
            }
            return false;
          });
        }
      }
    } catch (e) {
      console.error("Error checking superadmin role:", e);
    }
    return false;
  };

  const canAddEventForMember = isSuperAdmin();

  useEffect(() => {
    // Initialize with some events for Maintenance team
    setEvents([
      {
        id: "1",
        title: "Bảo trì hệ thống BV B",
        start: new Date().toISOString().split("T")[0],
        extendedProps: { calendar: "Warning", team: "MAINTENANCE" },
      },
      {
        id: "2",
        title: "Kiểm tra định kỳ",
        start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        extendedProps: { calendar: "Success", team: "MAINTENANCE" },
      },
    ]);
  }, []);

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
    setEventStartDate(selectedDate);
    setEventEndDate(selectedDate);
    setDateLocked(true);
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
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    
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
    
    // Map color to priority level
    const color = event.extendedProps.calendar?.toLowerCase() || "success";
    const colorToLevel: Record<string, string> = {
      danger: "Rất quan trọng",
      success: "Bình thường",
      warning: "Quan trọng",
    };
    setEventLevel(colorToLevel[color] || "Bình thường");
    // Chỉ cho phép chọn member nếu là superadmin
    const eventTypeFromProps = event.extendedProps.eventType || "team";
    setEventType(canAddEventForMember ? eventTypeFromProps : "team");
    setSelectedMemberId(canAddEventForMember ? (event.extendedProps.memberId || "") : "");
    setDateLocked(true);
    openModal();
  };

  const handleSaveClick = () => {
    // Validation
    if (!eventTitle.trim()) {
      toast.error("Vui lòng nhập tên công việc");
      return;
    }
    if (!eventStartDate) {
      toast.error("Vui lòng chọn ngày sự kiện");
      return;
    }
    if (!eventLevel) {
      toast.error("Vui lòng chọn mức độ công việc");
      return;
    }
    // Chỉ validate member nếu là superadmin và chọn option member
    if (canAddEventForMember && eventType === "member" && !selectedMemberId) {
      toast.error("Vui lòng chọn người trong team");
      return;
    }

    // If updating, show confirmation modal
    if (selectedEvent) {
      setUpdateConfirmOpen(true);
    } else {
      // If creating, save directly
      handleAddOrUpdateEvent();
    }
  };

  const handleAddOrUpdateEvent = () => {
    // Tạo datetime từ ngày và giờ
    let startDateTime = eventStartDate;
    let endDateTime = eventStartDate;
    const isAllDay = !eventTime;
    
    if (eventTime) {
      startDateTime = `${eventStartDate}T${eventTime}:00`;
      endDateTime = `${eventStartDate}T${eventTime}:00`;
    } else {
      startDateTime = `${eventStartDate}T00:00:00`;
      endDateTime = `${eventStartDate}T23:59:59`;
    }
    
    const color = priorityLevelToColor[eventLevel] || "success";
    
    if (selectedEvent) {
      // Update existing event
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                title: eventTitle,
                start: startDateTime,
                end: endDateTime,
                allDay: isAllDay,
                extendedProps: { 
                  calendar: color, 
                  team: "MAINTENANCE",
                  eventType: canAddEventForMember ? eventType : "team",
                  memberId: (canAddEventForMember && eventType === "member") ? selectedMemberId : undefined,
                },
              }
            : event
        )
      );
      toast.success("Cập nhật sự kiện thành công");
    } else {
      // Add new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: startDateTime,
        end: endDateTime,
        allDay: isAllDay,
        extendedProps: { 
          calendar: color, 
          team: "MAINTENANCE",
          eventType: canAddEventForMember ? eventType : "team",
          memberId: (canAddEventForMember && eventType === "member") ? selectedMemberId : undefined,
        },
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
      toast.success("Thêm sự kiện thành công");
    }
    setUpdateConfirmOpen(false);
    closeModal();
    resetModalFields();
  };

  const handleDeleteClick = () => {
    if (!selectedEvent) {
      toast.error("Không thể xóa sự kiện này");
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedEvent) {
      toast.error("Không thể xóa sự kiện này");
      setDeleteConfirmOpen(false);
      return;
    }

    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== selectedEvent.id));
    toast.success("Xóa sự kiện thành công");
    setDeleteConfirmOpen(false);
    closeModal();
    resetModalFields();
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  const handleUpdateCancel = () => {
    setUpdateConfirmOpen(false);
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventTime("");
    setEventLevel("");
    setEventType("team");
    setSelectedMemberId("");
    setSelectedEvent(null);
    setDateLocked(false);
    setSelectedHour(null);
    setSelectedMinute(null);
    setShowTimePicker(false);
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
        title="Lịch Team Bảo Hành | TailAdmin"
        description="Lịch làm việc của team bảo hành"
      />
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Lịch Team Bảo Hành
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
              return `Bạn còn ${arg.num}\ncông việc trong ngày`;
            }}
            moreLinkClick={(info) => {
              if (calendarRef.current) {
                const calendarApi = calendarRef.current.getApi();
                calendarApi.changeView('timeGridDay', info.date);
              }
            }}
            customButtons={{
              addEventButton: {
                text: "Thêm sự kiện +",
                click: openModal,
              },
            }}
          />
        </div>
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-[700px] p-6 lg:p-10"
        >
          <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
            <div>
              <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Lên kế hoạch cho sự kiện tiếp theo: lên lịch hoặc chỉnh sửa sự kiện để theo dõi công việc
              </p>
            </div>
            <div className="mt-8">
              {canAddEventForMember && (
                <div className="mb-6">
                  <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                    Loại sự kiện <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                    <div className="n-chk">
                      <div className="form-check form-check-inline">
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor="event-type-team"
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-type"
                              value="team"
                              id="event-type-team"
                              checked={eventType === "team"}
                              onChange={() => {
                                setEventType("team");
                                setSelectedMemberId("");
                              }}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventType === "team" ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          Thêm sự kiện cho team
                        </label>
                      </div>
                    </div>
                    <div className="n-chk">
                      <div className="form-check form-check-inline">
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                          htmlFor="event-type-member"
                        >
                          <span className="relative">
                            <input
                              className="sr-only form-check-input"
                              type="radio"
                              name="event-type"
                              value="member"
                              id="event-type-member"
                              checked={eventType === "member"}
                              onChange={() => setEventType("member")}
                            />
                            <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                              <span
                                className={`h-2 w-2 rounded-full bg-white ${
                                  eventType === "member" ? "block" : "hidden"
                                }`}
                              ></span>
                            </span>
                          </span>
                          Thêm sự kiện cho người trong team
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {eventType === "member" && canAddEventForMember && (
                <div className="mb-6">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Chọn người <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  >
                    <option value="">-- Chọn người --</option>
                    {/* TODO: Load danh sách người trong team từ API */}
                    <option value="1">Người dùng 1</option>
                    <option value="2">Người dùng 2</option>
                    <option value="3">Người dùng 3</option>
                  </select>
                </div>
              )}
              <div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Tên công việc <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    placeholder="Nhập tên công việc"
                  />
                </div>
              </div>
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Ngày sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  id="event-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => {
                    setEventStartDate(e.target.value);
                    setEventEndDate(e.target.value);
                  }}
                  disabled={dateLocked}
                  className={`dark:bg-dark-900 h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${
                    dateLocked
                      ? "bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed opacity-70 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      : "bg-transparent border-gray-300 text-gray-800 focus:border-brand-300"
                  }`}
                />
                {dateLocked && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Ngày đã được chọn từ lịch, không thể thay đổi
                  </p>
                )}
              </div>
              <div className="mt-6">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Giờ sự kiện
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className={`w-full h-11 rounded-lg border px-4 py-2.5 text-left text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800 ${
                      eventTime
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
                  
                  {showTimePicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowTimePicker(false)}
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
                            onClick={() => setShowTimePicker(false)}
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
                <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                  Mức độ công việc <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                  {Object.entries(workPriorityLevels).map(([key, value]) => (
                    <div key={key} className="n-chk">
                      <div className={`form-check form-check-${value} form-check-inline`}>
                        <label
                          className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
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
                              onChange={() => setEventLevel(key)}
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
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
              {selectedEvent && (
                <button
                  onClick={handleDeleteClick}
                  type="button"
                  disabled={loading}
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
                disabled={loading}
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
            <div className="relative z-[100001] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/20">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      Xác nhận xóa sự kiện
                    </h3>
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Bạn có chắc chắn muốn xóa sự kiện "{selectedEvent?.title}"? Hành động này không thể hoàn tác.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="relative z-[100001] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      Xác nhận cập nhật sự kiện
                    </h3>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Bạn có chắc chắn muốn cập nhật sự kiện "{selectedEvent?.title}"?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    onClick={handleUpdateCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleAddOrUpdateEvent}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Đang cập nhật..." : "Cập nhật"}
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
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar.toLowerCase()}`;
  const originalTitle = eventInfo.event.extendedProps.originalTitle || eventInfo.event.title.replace(/\s*\([^)]+\)$/, "");
  const createdByName = eventInfo.event.extendedProps.createdByName;
  
  // Format time giống lịch cá nhân
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
      className={`event-fc-color fc-event-main ${colorClass} p-1 rounded-sm`}
    >
      <div className="flex items-start">
        <div className="fc-daygrid-event-dot flex-shrink-0"></div>
        <div className="flex-1 flex flex-col min-w-0">
          <div className="fc-event-title text-gray-800">{originalTitle}</div>
          {createdByName && (
            <div className="text-xs mt-0.5 opacity-80 text-gray-700" style={{ fontSize: '10px' }}>
              {createdByName}
            </div>
          )}
          {eventTime && (
            <div className="fc-event-time text-xs mt-0.5 opacity-80 text-gray-700" style={{ fontSize: '10px' }}>
              {eventTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenanceCalendar;

