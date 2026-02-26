import PageMeta from "../../components/common/PageMeta";

/**
 * Công việc triển khai mới - New implementation tasks flow.
 * Page placeholder for the rebuilt implementation work flow.
 */
export default function ListHospitalImplementation() {
  return (
    <>
      <PageMeta
        title="Công việc triển khai mới | TAGTECH"
        description="Quản lý công việc triển khai (luồng mới)"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Công việc triển khai mới
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Trang công việc triển khai mới — đang xây dựng luồng.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-600 dark:text-gray-400">
            Nội dung trang sẽ được phát triển tại đây.
          </p>
        </div>
      </div>
    </>
  );
}
