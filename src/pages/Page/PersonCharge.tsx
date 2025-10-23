import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";

type Person = { id: number; name: string; role: string };

export default function PersonCharge() {
  const [data, setData] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        // TODO: thay bằng API thật
        const mock: Person[] = [
          { id: 1, name: "Nguyễn Văn A", role: "DEPLOYMENT" },
          { id: 2, name: "Trần Thị B", role: "DEPLOYMENT" },
        ];
        if (alive) setData(mock);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = q.trim()
    ? data.filter(d => (d.name + d.role).toLowerCase().includes(q.toLowerCase()))
    : data;

  return (
    <>
      <PageMeta title="Người phụ trách" description="Danh sách người phụ trách triển khai" />
      <div className="p-6 xl:p-10">
        <ComponentCard title="Danh sách người phụ trách">
          <div className="mb-4 flex items-center gap-2">
            <input
              className="h-10 w-64 rounded-xl border px-3 outline-none"
              placeholder="Tìm theo tên, vai trò…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">ID</th>
                    <th className="px-4 py-3 text-left">Tên</th>
                    <th className="px-4 py-3 text-left">Vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">Đang tải…</td></tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-500">Không có dữ liệu</td></tr>
                  )}
                  {!loading && filtered.map(p => (
                    <tr key={p.id} className="border-t">
                      <td className="px-4 py-3">{p.id}</td>
                      <td className="px-4 py-3">{p.name}</td>
                      <td className="px-4 py-3">{p.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
