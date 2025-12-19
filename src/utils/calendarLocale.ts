// Vietnamese locale configuration for FullCalendar v6
// FullCalendar v6 no longer supports monthNames, monthNamesShort, dayNames, dayNamesShort
// Use formatters (dayHeaderFormat, titleFormat) if custom day/month names are needed
export const viLocale = {
  code: "vi",
  week: {
    dow: 1, // Monday is the first day of the week
    doy: 4, // The week that contains Jan 4th is the first week of the year
  },
  buttonText: {
    prev: "Trước",
    next: "Sau",
    today: "Hôm nay",
    month: "Tháng",
    week: "Tuần",
    day: "Ngày",
    list: "Danh sách",
  },
  weekText: "Tuần",
  allDayText: "Cả ngày",
  moreLinkText: (n: number) => `+${n} thêm`,
  noEventsText: "Không có sự kiện",
} as const;

