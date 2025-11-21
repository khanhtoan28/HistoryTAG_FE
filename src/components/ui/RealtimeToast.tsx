import React, { useEffect } from "react";
import { useNotification } from "../../context/NotificationContext";

export default function RealtimeToast() {
  const { liveNotification } = useNotification();

  useEffect(() => {
    // no-op: placeholder for potential side-effects
  }, [liveNotification]);

  if (!liveNotification) return null;

  const title = liveNotification.title || "Thông báo";
  const message = liveNotification.message || liveNotification.title || "Bạn có thông báo mới";
  const avatar = liveNotification.actorAvatar;

  return (
    <div className="fixed left-1/2 top-4 z-50 transform -translate-x-1/2 w-[min(720px,90vw)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-full rounded-lg bg-white shadow-lg p-3 border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start gap-3">
            {avatar ? (
              <img src={avatar} alt="actor" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">🔔</div>
            )}
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 whitespace-normal break-words">{message}</div>
              {liveNotification.link ? (
                <a className="text-xs text-blue-600 hover:underline inline-block mt-1" href={liveNotification.link}>Xem</a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
