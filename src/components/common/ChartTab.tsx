type ChartTabProps = {
  value: "monthly" | "quarterly" | "yearly";
  onChange: (value: "monthly" | "quarterly" | "yearly") => void;
};

const ChartTab = ({ value, onChange }: ChartTabProps) => {
  const getClass = (option: "monthly" | "quarterly" | "yearly") =>
    value === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getClass(
          "monthly"
        )}`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("quarterly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getClass(
          "quarterly"
        )}`}
      >
        Quarterly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getClass(
          "yearly"
        )}`}
      >
        Annually
      </button>
    </div>
  );
};

export default ChartTab;
