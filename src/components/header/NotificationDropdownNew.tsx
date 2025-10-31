import { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { getNotifications, getUnreadCount, markAsRead } from "../../api/notification.api";
import { useModal } from "../../hooks/useModal";
import NotificationDetailModal from "./NotificationDetailModal";
import { Link } from "react-router-dom";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [notifying, setNotifying] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  // no modal; we'll navigate to /notifications

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const loadUnread = async () => {
    try {
      const c = await getUnreadCount();
      setUnreadCount(c || 0);
      setNotifying((c || 0) > 0);
    } catch (e) {
      // ignore
    }
  };

  const loadNotifications = async () => {
    try {
      const list = await getNotifications(50);
      setNotifications(list || []);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    loadUnread();
  }, []);

  const handleClick = async () => {
    toggleDropdown();
    setNotifying(false);
    await loadNotifications();
    await loadUnread();
  };

  const { isOpen: isModalOpen, openModal, closeModal } = useModal(false);

  const handleItemClick = async (n: any) => {
    try {
      if (!n.read) await markAsRead(n.id);
    } catch (e) {}
    // refresh counts and list
    await loadUnread();
    await loadNotifications();

    // open detail modal instead of auto-navigating
    setSelectedNotification(n);
    openModal();
  };


  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-9 w-9 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-xs text-white">{unreadCount}</span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[10px] flex h-[420px] w-[360px] max-w-[90vw] flex-col rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[420px] lg:w-[420px]"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {selectedNotification ? (
              <img
                src={selectedNotification.actorAvatar || "/images/user/user-02.jpg"}
                alt={selectedNotification.actorName || "User"}
                onError={(e) => { const img = e.currentTarget as HTMLImageElement; img.onerror = null; img.src = "/images/user/user-02.jpg"; }}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : null}
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notification
            </h5>
            {selectedNotification ? (
              <span className="ml-2 text-sm text-gray-500">{selectedNotification.actorName}</span>
            ) : null}
          </div>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
  <ul className="flex flex-col h-full overflow-y-auto custom-scrollbar">
          {notifications.length === 0 && (
            <li className="p-3 text-center text-gray-500">Không có thông báo</li>
          )}
          {notifications.map((n) => (
            <li key={n.id}>
              <DropdownItem
                onItemClick={() => handleItemClick(n)}
                className={`flex gap-3 rounded-lg border-b border-gray-100 p-2 px-3 py-2 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${n.read ? "bg-white" : "bg-gray-50"}`}
              >
                <div className="flex-shrink-0">
                  {n.actorAvatar ? (
                    <img
                      width={32}
                      height={32}
                      loading="lazy"
                      src={n.actorAvatar}
                      alt={n.actorName || "User"}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.onerror = null;
                        img.src = "/images/user/user-02.jpg";
                      }}
                      className="w-8 h-8 object-cover rounded-full ring-2 ring-white shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 ring-2 ring-white shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" />
                      </svg>
                    </div>
                  )}
                </div>

                <span className="block">
                  <span className="mb-1.5 block text-sm text-gray-600 dark:text-gray-300 space-x-1">
                    <span className="font-medium text-gray-800 dark:text-white/90">{n.actorName ? `${n.actorName} ` : ""}{n.title}</span>
                  </span>

                  <span className="flex items-center gap-2 text-gray-500 text-xs dark:text-gray-400">
                    <span className="truncate max-w-[160px]">{n.message}</span>
                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                    <span className="text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
        <Link
          to="/notifications"
          className="block w-full px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>
      <NotificationDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          closeModal();
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
      />
    </div>
  );
}
