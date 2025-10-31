import { useEffect, useState } from "react";
import { getNotificationsPage, deleteNotification, markAsRead } from "../../api/notification.api";
import NotificationDetailModal from "../../components/header/NotificationDetailModal";
import { useNavigate } from "react-router-dom";

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
    const old = notifications;
    setNotifications((prev) => prev.filter((p) => p.id !== id));
    setFiltered((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteNotification(id);
    } catch (e) {
      setNotifications(old);
    }
  };

  const handleOpen = async (n: any) => {
    try {
      if (!n.read) await markAsRead(n.id);
    } catch (e) {}
    setSelected(n);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Notifications</h2>
          <p className="text-sm text-gray-500">Manage all notifications and filters</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-3 py-1 border rounded" value={preset} onChange={(e) => setPreset(e.target.value)}>
            <option value="all">All</option>
            <option value="today">Today</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <input type="date" className="px-2 py-1 border rounded" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="px-2 py-1 border rounded" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <button onClick={() => { setPreset("all"); setStartDate(""); setEndDate(""); }} className="px-3 py-1 border rounded">Reset</button>
          <button onClick={() => navigate(-1)} className="px-3 py-1 border rounded">Back</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        <div className="max-h-[65vh] overflow-y-auto custom-scrollbar">
          {loading && <div className="p-4 text-center">Loading...</div>}
          {!loading && filtered.length === 0 && <div className="p-4 text-center text-gray-500">No notifications</div>}

          <ul className="flex flex-col gap-2">
            {filtered.map((n) => (
              <li key={n.id} className="flex items-start gap-3 p-3 rounded border hover:shadow-md hover:scale-[1.01] transition-transform">
                <div className="flex-shrink-0">
                  {n.actorAvatar ? (
                    <img src={n.actorAvatar} alt={n.actorName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 20c0-3.314 2.686-6 6-6h4c3.314 0 6 2.686 6 6" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{n.actorName ? `${n.actorName} ` : ""}<span className="font-normal">{n.title}</span></div>
                      <div className="text-xs text-gray-500 truncate max-w-[800px]">{n.message}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</div>
                      <button onClick={() => handleDelete(n.id)} className="text-xs px-2 py-1 border rounded text-red-600">Delete</button>
                    </div>
                  </div>
                </div>

                <div className="ml-2">
                  <button onClick={() => handleOpen(n)} className="text-sm px-2 py-1 rounded border">View</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button disabled={page <= 0 || loading} onClick={() => loadPage(Math.max(0, page - 1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
            <button disabled={loading || (totalPages>0 && page >= totalPages-1)} onClick={() => loadPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
            <div className="text-sm text-gray-500">Page {page + 1} / {Math.max(1, totalPages)}</div>
          </div>
          <div className="text-sm text-gray-500">Total: {totalElements}</div>
        </div>
      </div>

      <NotificationDetailModal isOpen={!!selected} onClose={() => setSelected(null)} notification={selected} />
    </div>
  );
}
