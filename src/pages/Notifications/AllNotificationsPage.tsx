import { useEffect, useState } from "react";
import { getNotificationsPage, deleteNotification, markAsRead } from "../../api/notification.api";
import NotificationDetailModal from "../../components/header/NotificationDetailModal";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../../context/NotificationContext";

export default function AllNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [preset, setPreset] = useState<string>("all");
  const [page, setPage] = useState<number>(0);
  const size = 20;
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  const navigate = useNavigate();
  const { loadUnread } = useNotification();

  const loadPage = async (p: number) => {
    setLoading(true);
    try {
      const res = await getNotificationsPage(p, size);
      if (Array.isArray(res)) {
        setNotifications(res || []);
        setFiltered(res || []);
        setTotalPages(1);
        setTotalElements((res || []).length);
        setPage(0);
      } else {
        setNotifications(res.content || []);
        setFiltered(res.content || []);
        setTotalPages(res.totalPages || 0);
        setTotalElements(res.totalElements || 0);
        setPage(res.number || p);
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(0);
  }, []);

  useEffect(() => {
    // apply client-side filtering on currently loaded notifications
    let list = [...notifications];
    const now = new Date();
    if (preset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      list = list.filter((n) => {
        const d = new Date(n.createdAt);
        return d >= start && d < end;
      });
    } else if (preset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      list = list.filter((n) => {
        const d = new Date(n.createdAt);
        return d >= start && d < end;
      });
    } else if (preset === "year") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      list = list.filter((n) => {
        const d = new Date(n.createdAt);
        return d >= start && d < end;
      });
    }

    if (startDate) {
      const s = new Date(startDate);
      list = list.filter((n) => new Date(n.createdAt) >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      list = list.filter((n) => new Date(n.createdAt) <= e);
    }

    setFiltered(list);
  }, [notifications, startDate, endDate, preset]);

  const handleDelete = async (id: number) => {
    const oldNotifications = notifications;
    const oldFiltered = filtered;
    
    // 1. Cập nhật giao diện ngay lập tức (Optimistic UI)
    setNotifications((prev) => prev.filter((p) => p.id !== id));
    setFiltered((prev) => prev.filter((p) => p.id !== id));
    
    // FIX 1: Giảm số tổng hiển thị ở dưới đáy (Pagination)
    setTotalElements(prev => Math.max(0, prev - 1));

    try {
      await deleteNotification(id);
      
      // FIX 2: Gọi Context để cập nhật lại số trên "Cái Chuông" (Header)
      // Vì nếu xóa tin chưa đọc, số trên chuông phải giảm
      await loadUnread();
    } catch (e) {
      // Revert lại nếu API lỗi
      setNotifications(oldNotifications);
      setFiltered(oldFiltered);
      setTotalElements(prev => prev + 1);
    }
  };

  const handleOpen = async (n: any) => {
    try {
      if (!n.read) {
        // Gọi API đánh dấu đã đọc
        await markAsRead(n.id);
        
        // Cập nhật state local để đổi màu background
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
        // Cần cập nhật cả filtered nữa để nó đồng bộ
        setFiltered((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );

        // Cập nhật số đếm trên chuông (Global State)
        // Đảm bảo hàm này trong Context hoạt động đúng việc fetch lại số unread
        await loadUnread();
      }
    } catch (e) {
      console.error("Lỗi khi đánh dấu đã đọc", e);
    }
    setSelected(n);
  };

  return (
    <div className="p-5 xl:p-0">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Thông báo</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Quản lý toàn bộ thông báo</p>
      </div>

      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <select 
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={preset} 
            onChange={(e) => setPreset(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm này</option>
          </select>
          <input 
            type="date" 
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            placeholder="mm/dd/yyyy"
          />
          <input 
            type="date" 
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="mm/dd/yyyy"
          />
        </div>
        <div className="flex items-center gap-3">
          
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-lg font-medium">Không có thông báo</p>
            </div>
          )}

          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((n) => (
              <li 
                key={n.id} 
                className={`flex items-start gap-4 p-4 transition-colors ${
                  n.read 
                    ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800' 
                    : 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  {n.actorAvatar ? (
                    <img 
                      src={n.actorAvatar} 
                      alt={n.actorName} 
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-gray-800 shadow-sm" 
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        img.onerror = null;
                        img.src = "/images/user/user-02.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {n.actorName && <span className="font-semibold">{n.actorName} </span>}
                        <span className="font-normal">{n.title}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{n.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleString('vi-VN', { 
                          month: 'numeric',
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpen(n)} 
                          className="text-xs px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                        >
                          Xem
                        </button>
                        <button 
                          onClick={() => handleDelete(n.id)} 
                          className="text-xs px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                disabled={page <= 0 || loading} 
                onClick={() => loadPage(Math.max(0, page - 1))} 
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button 
                disabled={loading || (totalPages>0 && page >= totalPages-1)} 
                onClick={() => loadPage(page + 1)} 
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Page {page + 1} / {Math.max(1, totalPages)}
              </div>
            </div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Total: <span className="font-semibold">{totalElements}</span>
            </div>
          </div>
        </div>
      </div>

      <NotificationDetailModal isOpen={!!selected} onClose={() => setSelected(null)} notification={selected} />
    </div>
  );
}
