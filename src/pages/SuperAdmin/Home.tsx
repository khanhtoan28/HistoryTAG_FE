import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getSummaryReport, type SuperAdminSummaryDTO } from "../../api/superadmin.api";
import toast from "react-hot-toast";

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
      } finally {
        /* no-op */
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const donutOptions: ApexOptions = {
  // Local type for formatter options to avoid using `any` and satisfy eslint
  // Apex provides a `w` object in opts with globals.series and globals.seriesTotals
  // We only declare the bits we need here.
  // Note: Keep this local and narrow to avoid depending on internal 'any' shapes.
    // TIP: If ApexCharts publishes types for `opts.w.globals`, we can replace this later.
    // Define the shape inline below.
    labels: ["Người dùng", "Bệnh viện", "HIS" , "Phần cứng", "Đại lý"],
    legend: {
      position: "bottom",
      // Keep default legend labels (color + label). Percent is shown on slices.
    },
    chart: { toolbar: { show: false } },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
        },
      },
    },
    dataLabels: {
      enabled: true,
      // Show percentage on slices
      formatter: (val: number, opts?: { seriesIndex?: number; w?: { globals?: { series?: number[] } } }) => {
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
        formatter: (val: number, opts?: { seriesIndex?: number; w?: { globals?: { series?: number[] } } }) => {
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
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Super Admin Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Chào mừng đến với trang quản lý Super Admin. Từ đây bạn có thể quản lý tất cả các thành phần của hệ thống.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Quản lý nhanh
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/superadmin/users"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  👥
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Người dùng</p>
                  <p className="text-xs text-gray-500">Quản lý người dùng</p>
                </div>
              </Link>
              <Link
                to="/superadmin/hospitals"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  🏥
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Bệnh viện</p>
                  <p className="text-xs text-gray-500">Quản lý bệnh viện</p>
                </div>
              </Link>
              <Link
                to="/superadmin/his-systems"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  💼
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">HIS Systems</p>
                  <p className="text-xs text-gray-500">Quản lý hệ thống HIS</p>
                </div>
              </Link>
              <Link
                to="/superadmin/agencies"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  🏢
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Đại lý</p>
                  <p className="text-xs text-gray-500">Quản lý đại lý</p>
                </div>
              </Link>
              <Link
                to="/superadmin/hardware"
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  💻
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Phần cứng</p>
                  <p className="text-xs text-gray-500">Quản lý phần cứng</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Thống kê nhanh
            </h3>
            {/* Donut chart */}
            <div className="mb-4">
              <div className="flex justify-center">
                <Chart
                  options={donutOptions}
                  series={summary ? [summary.totalUsers, summary.totalHospitals, summary.totalHisSystems, summary.totalHardware, summary.totalAgencies] : [0,0,0,0,0]}
                  type="donut"
                  width={320}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng người dùng</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{summary ? summary.totalUsers : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng bệnh viện</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{summary ? summary.totalHospitals : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng hệ thống HIS</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{summary ? summary.totalHisSystems : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng đại lý</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{summary ? summary.totalAgencies : "--"}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng phần cứng</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{summary ? summary.totalHardware : "--"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

