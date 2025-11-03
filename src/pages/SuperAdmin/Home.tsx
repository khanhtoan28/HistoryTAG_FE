import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getSummaryReport, type SuperAdminSummaryDTO } from "../../api/superadmin.api";
import toast from "react-hot-toast";

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon?: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-white to-white/50 p-4 shadow-sm border border-gray-100">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${color ?? 'bg-slate-400'}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-xl font-semibold text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}

export default function SuperAdminHome() {
  const [summary, setSummary] = useState<SuperAdminSummaryDTO | null>(null);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await getSummaryReport();
        if (mounted) setSummary(res);
      } catch (err: unknown) {
        console.error("Failed to load summary:", err);
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg || "Không thể tải báo cáo");
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const donutOptions: ApexOptions = {
    labels: ["Người dùng", "Bệnh viện", "HIS", "Phần cứng", "Đại lý"],
    legend: { position: 'bottom' },
    chart: { toolbar: { show: false } },
    plotOptions: { pie: { donut: { size: '64%' } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts?: any) => {
        const w = opts?.w;
        const series = w?.globals?.series ?? [];
        const idx = opts?.seriesIndex ?? 0;
        const value = series?.[idx] ?? val ?? 0;
        const total = (series.reduce((a: number, b: number) => a + b, 0) as number) || 1;
        const pct = Math.round((value / total) * 100);
        return `${pct}%`;
      },
      style: { fontSize: '12px', colors: ['#fff'] },
    },
    tooltip: {
      y: {
        formatter: (val: number, opts?: any) => {
          const w = opts?.w;
          const series = w?.globals?.series ?? [];
          const idx = opts?.seriesIndex ?? 0;
          const value = series?.[idx] ?? val ?? 0;
          const total = (series.reduce((a: number, b: number) => a + b, 0) as number) || 1;
          const pct = Math.round((value / total) * 100);
          return `${value} (${pct}%)`;
        }
      }
    },
    colors: ["#465fff", "#10b981", "#f59e0b", "#ef4444", "#6366f1"],
  };

  return (
    <>
      <PageMeta title="Super Admin Dashboard | TAGTECH" description="" />

      <div className="space-y-6">
        <header className="relative overflow-hidden rounded-2xl p-6 text-white shadow-md">
          {/* animated gradient background */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(270deg,#7c3aed,#06b6d4,#f97316,#8b5cf6)',
              backgroundSize: '600% 600%',
              filter: 'saturate(1.1) contrast(1.02)',
              animation: 'bgShift 12s ease infinite',
              opacity: 0.95,
            }}
          />
          <style>{`@keyframes bgShift { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }`}</style>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
              <p className="mt-1 text-sm opacity-90">Tổng quan hệ thống & truy cập nhanh các phần quản trị</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <main className="col-span-12 xl:col-span-8 space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Quản lý nhanh</h2>
              <p className="text-sm text-gray-500 mt-1">Các hành động thường dùng được gom lại để bạn thao tác nhanh.</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/superadmin/users" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-lg">👥</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Người dùng</div>
                    <div className="text-xs text-gray-500">Quản lý người dùng</div>
                  </div>
                </Link>

                <Link to="/superadmin/hospitals" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center text-lg">🏥</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Bệnh viện</div>
                    <div className="text-xs text-gray-500">Quản lý bệnh viện</div>
                  </div>
                </Link>

                <Link to="/superadmin/his-systems" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-lg">💼</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">HIS Systems</div>
                    <div className="text-xs text-gray-500">Quản lý hệ thống HIS</div>
                  </div>
                </Link>

                <Link to="/superadmin/agencies" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-lg">🏢</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Đại lý</div>
                    <div className="text-xs text-gray-500">Quản lý đại lý</div>
                  </div>
                </Link>

                <Link to="/superadmin/hardware" className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-md">
                  <div className="h-12 w-12 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-lg">💻</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Phần cứng</div>
                    <div className="text-xs text-gray-500">Quản lý phần cứng</div>
                  </div>
                </Link>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Thống kê tổng quan</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard title="Người dùng" value={summary ? summary.totalUsers : '--'} icon={<span>👥</span>} color="bg-indigo-500" />
                  <StatCard title="Bệnh viện" value={summary ? summary.totalHospitals : '--'} icon={<span>🏥</span>} color="bg-emerald-500" />
                  <StatCard title="Hệ thống HIS" value={summary ? summary.totalHisSystems : '--'} icon={<span>💼</span>} color="bg-purple-500" />
                  <StatCard title="Phần cứng" value={summary ? summary.totalHardware : '--'} icon={<span>💻</span>} color="bg-teal-500" />
                  <StatCard title="Đại lý" value={summary ? summary.totalAgencies : '--'} icon={<span>🏢</span>} color="bg-orange-500" />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <h3 className="text-sm font-medium text-gray-700">Sơ đồ phân bố</h3>
                <div className="mt-3 flex justify-center">
                  <Chart
                    options={donutOptions}
                    series={summary ? [summary.totalUsers, summary.totalHospitals, summary.totalHisSystems, summary.totalHardware, summary.totalAgencies] : [0,0,0,0,0]}
                    type="donut"
                    width={260}
                  />
                </div>
              </div>
            </section>
          </main>

          <aside className="col-span-12 xl:col-span-4 space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Quick stats</h3>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Tổng đại lý</div>
                  <div className="text-sm font-semibold text-gray-900">{summary ? summary.totalAgencies : '--'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">Hệ thống HIS</div>
                  <div className="text-sm font-semibold text-gray-900">{summary ? summary.totalHisSystems : '--'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">Hành động nhanh</h3>
              <div className="mt-3 flex flex-col gap-2">
                <Link to="/superadmin/users" className="rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">Tạo người dùng mới</Link>
                <Link to="/superadmin/hospitals" className="rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">Thêm bệnh viện</Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

