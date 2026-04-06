export function getNumericRank(rank) {
  const numericRank = Number.parseInt(rank, 10);
  return Number.isFinite(numericRank) && numericRank > 0 ? numericRank : null;
}

export function formatRank(rank) {
  const numericRank = getNumericRank(rank);
  return numericRank ? `#${numericRank}` : "N/A";
}

export function formatAcceptanceRate(value) {
  return value && value !== "N/A" ? `${value}%` : "N/A";
}

export function formatSchoolName(name) {
  return String(name || "").replace(/--/g, "-");
}
