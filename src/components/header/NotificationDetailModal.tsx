import React from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notification: any | null;
}

const NotificationDetailModal: React.FC<Props> = ({ isOpen, onClose, notification }) => {
  if (!isOpen || !notification) return null;

  const avatar = notification.actorAvatar;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative z-10 w-[520px] max-w-full rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden">
            {avatar ? (
              <img
                src={avatar}
                alt={notification.actorName || "User"}
                className="w-14 h-14 object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  img.onerror = null;
                  img.src = "/images/user/user-02.jpg";
                }}
              />
            ) : (
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{notification.actorName}</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-white">{notification.title}</div>
              </div>
              <div className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</div>
            </div>

            <div className="mt-4 text-gray-600 dark:text-gray-300">{notification.message}</div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className="rounded-md border px-4 py-2" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
