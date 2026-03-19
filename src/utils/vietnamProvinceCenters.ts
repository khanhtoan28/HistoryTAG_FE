type LatLng = { lat: number; lng: number };

/**
 * Vietnamese province labels (same set as Hospitals form) for filters / dropdowns.
 * Must stay in sync with centroid keys in PROVINCE_CENTERS_RAW.
 */
export const VIETNAM_PROVINCE_LABELS: string[] = [
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bạc Liêu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Cần Thơ",
  "Đà Nẵng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Nội",
  "Hà Tĩnh",
  "Hải Dương",
  "Hải Phòng",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "TP Hồ Chí Minh",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

// Province centroid coordinates.
// Data source: https://gist.github.com/duytruong/a3edf9e680aa256068448918e45fb8e4
// Keys are stored in a raw lower-case/no-diacritics form and then normalized.
const PROVINCE_CENTERS_RAW: Record<string, [number, number]> = {
  "bac giang": [21.333333, 106.333333],
  "bac kan": [22.166667, 105.833333],
  "cao bang": [22.666667, 106],
  "ha giang": [22.75, 105],
  "lang son": [21.75, 106.5],
  "phu tho": [21.333333, 105.166667],
  "quang ninh": [21.25, 107.333333],
  "thai nguyen": [21.666667, 105.833333],
  "tuyen quang": [21.666667, 105.833333],
  "lao cai": [22.333333, 104],
  "yen bai": [21.5, 104.666667],
  "dien bien": [21.383333, 103.016667],
  "hoa binh": [20.333333, 105.25],
  "lai chau": [22, 103],
  "son la": [21.166667, 104],
  "bac ninh": [21.083333, 106.166667],
  "ha nam": [20.583333, 106],
  "hai duong": [20.916667, 106.333333],
  "hung yen": [20.833333, 106.083333],
  "nam dinh": [20.25, 106.25],
  "ninh binh": [20.25, 105.833333],
  "thai binh": [20.5, 106.333333],
  "vinh phuc": [21.3, 105.6],
  "ha noi": [21.028472, 105.854167],
  "hai phong": [20.865139, 106.683833],
  "ha tinh": [18.333333, 105.9],
  "nghe an": [19.333333, 104.833333],
  "quang binh": [17.5, 106.333333],
  "quang tri": [16.75, 107],
  "thanh hoa": [20, 105.5],
  "thua thien - hue": [16.333333, 107.583333],
  "dak lak": [12.666667, 108.05],
  "dak nong": [11.983333, 107.7],
  "gia lai": [13.75, 108.25],
  "kon tum": [14.75, 107.916667],
  "lam dong": [11.95, 108.433333],
  "binh dinh": [14.166667, 109],
  "binh thuan": [10.933333, 108.1],
  "khanh hoa": [12.25, 109.2],
  "ninh thuan": [11.75, 108.833333],
  "phu yen": [13.166667, 109.166667],
  "quang nam": [15.583333, 107.916667],
  "quang ngai": [15, 108.666667],
  "da nang": [16.066667, 108.233333],
  "ba ria - vung tau": [10.583333, 107.25],
  "binh duong": [11.166667, 106.666667],
  "binh phuoc": [11.75, 106.916667],
  "dong nai": [11.116667, 107.183333],
  "tay ninh": [11.333333, 106.166667],
  "ho chi minh": [10.776889, 106.700806],
  "an giang": [10.5, 105.166667],
  "bac lieu": [9.25, 105.75],
  "ben tre": [10.166667, 106.5],
  "ca mau": [9.083333, 105.083333],
  "dong thap": [10.666667, 105.666667],
  "hau giang": [9.783333, 105.466667],
  "kien giang": [10, 105.166667],
  "long an": [10.666667, 106.166667],
  "soc trang": [9.666667, 105.833333],
  "tien giang": [10.416667, 106.166667],
  "tra vinh": [9.833333, 106.25],
  "vinh long": [10.166667, 106],
  "can tho": [10.033333, 105.783333],
};

function canonicalizeProvinceName(input: string): string {
  let s = input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
  // Vietnamese "đ" does not decompose in NFD; map to ASCII "d" for matching keys like "dak lak"
  s = s.replace(/\u0111/g, "d");

  // Remove/replace common prefixes
  s = s.replace(/^tp\s+/, "");
  s = s.replace(/^thanh pho\s+/, "");

  // Convert punctuation to spaces so "a - b" and "a b" match.
  s = s.replace(/[-/]/g, " ");
  s = s.replace(/[^a-z0-9 ]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/** True when two province strings refer to the same place (diacritics / spacing tolerant). */
export function provincesMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return canonicalizeProvinceName(a) === canonicalizeProvinceName(b);
}

/** Zoom level when focusing one province (city/province view). */
export const PROVINCE_FOCUS_ZOOM = 9;

const PROVINCE_CENTERS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(PROVINCE_CENTERS_RAW).map(([k, v]) => [canonicalizeProvinceName(k), v]),
) as Record<string, [number, number]>;

export function getProvinceCenter(province?: string | null): LatLng | null {
  if (!province) return null;
  const key = canonicalizeProvinceName(province);
  const val = PROVINCE_CENTERS[key];
  if (!val) return null;
  return { lat: val[0], lng: val[1] };
}

