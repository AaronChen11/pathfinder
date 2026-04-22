function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercent(value) {
  const parsed = parseNumber(value);
  return parsed === null ? null : parsed;
}

function parseCurrency(value) {
  return parseNumber(value);
}

function parseEnrollment(value) {
  return parseNumber(value);
}

function parseSatRange(value) {
  const matches = String(value || "").match(/\d{3,4}/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const numbers = matches.map((item) => Number.parseInt(item, 10)).filter((item) => Number.isFinite(item));
  if (numbers.length === 0) {
    return null;
  }

  return {
    low: Math.min(...numbers),
    high: Math.max(...numbers),
    mid: Math.round(numbers.reduce((sum, item) => sum + item, 0) / numbers.length),
  };
}

function parseState(location) {
  const parts = String(location || "").split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim().toUpperCase() : "";
}

module.exports = {
  parseCurrency,
  parseEnrollment,
  parseNumber,
  parsePercent,
  parseSatRange,
  parseState,
};
