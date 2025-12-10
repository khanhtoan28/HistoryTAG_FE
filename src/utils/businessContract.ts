const BUSINESS_KEYWORD_CANDIDATES = [
  "hợp đồng kinh doanh",
  "hop dong kinh doanh",
  "business contract",
  "business-contract",
  "business_contract",
];

const BUSINESS_COMPACT_MARKERS = [
  "hopdongkinhdoanh",
  "hopdongkd",
  "hdkd",
];

export function removeVietnameseDiacriticsLower(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

export function isBusinessContractTaskName(name?: string | null): boolean {
  if (!name) return false;
  const trimmed = name.toString().trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const ascii = removeVietnameseDiacriticsLower(trimmed);
  const compactAscii = ascii.replace(/[^a-z0-9]+/g, "");

  for (const candidate of BUSINESS_KEYWORD_CANDIDATES) {
    const candidateLower = candidate.toLowerCase();
    if (lower.includes(candidateLower)) return true;
    const asciiCandidate = removeVietnameseDiacriticsLower(candidateLower);
    if (ascii.includes(asciiCandidate)) return true;
  }

  return BUSINESS_COMPACT_MARKERS.some(
    (marker) => compactAscii.startsWith(marker) || compactAscii.includes(marker)
  );
}

export function normalizeBusinessContractName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.toString().trim();
  if (!trimmed) return "";

  let ascii = removeVietnameseDiacriticsLower(trimmed);

  for (const candidate of BUSINESS_KEYWORD_CANDIDATES) {
    const asciiCandidate = removeVietnameseDiacriticsLower(candidate);
    if (ascii.startsWith(asciiCandidate)) {
      ascii = ascii.slice(asciiCandidate.length);
      break;
    }
  }

  for (const marker of BUSINESS_COMPACT_MARKERS) {
    if (ascii.startsWith(marker)) {
      ascii = ascii.slice(marker.length);
      break;
    }
  }

  ascii = ascii.replace(/^[\s:;,\-–_]+/, "");
  ascii = ascii.replace(/\s+/g, " ").trim();
  return ascii;
}
























