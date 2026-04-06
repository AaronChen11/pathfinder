import { getNumericRank } from "./formatters";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRankScore(rank) {
  if (rank === null) return 0;
  if (rank <= 10) return 110;
  if (rank <= 25) return 95;
  if (rank <= 50) return 78;
  if (rank <= 100) return 58;
  if (rank <= 180) return 35;
  return 18;
}

function getCategoryPreferenceBoost(rank, category) {
  const numericRank = rank ?? Number.MAX_SAFE_INTEGER;

  switch (String(category || "").toLowerCase()) {
    case "reach":
      if (numericRank === Number.MAX_SAFE_INTEGER) return -10;
      if (numericRank <= 25) return 65;
      if (numericRank <= 60) return 45;
      if (numericRank <= 120) return 20;
      return 0;
    case "target":
      if (numericRank === Number.MAX_SAFE_INTEGER) return 0;
      if (numericRank >= 20 && numericRank <= 120) return 55;
      if (numericRank <= 180) return 28;
      return 8;
    case "safety":
      if (numericRank === Number.MAX_SAFE_INTEGER) return 35;
      if (numericRank >= 100) return 58;
      if (numericRank >= 60) return 25;
      return 0;
    default:
      return 0;
  }
}

function scoreSchoolMatch(school, query, category) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return null;
  }

  const normalizedName = normalizeText(school.name);
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const compactName = normalizedName.replace(/\s+/g, "");

  let score = 0;

  if (normalizedName === normalizedQuery) score += 1000;
  if (normalizedName.startsWith(normalizedQuery)) score += 700;
  if (normalizedName.includes(` ${normalizedQuery}`)) score += 450;
  if (normalizedName.includes(normalizedQuery)) score += 260;
  if (compactQuery && compactName.includes(compactQuery)) score += 160;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const nameTokens = normalizedName.split(/\s+/).filter(Boolean);
  const tokenMatches = queryTokens.filter((token) => nameTokens.some((nameToken) => nameToken.startsWith(token))).length;

  if (tokenMatches === 0) {
    return null;
  }

  const rank = getNumericRank(school.rank);
  score += tokenMatches * 90;
  score += getRankScore(rank);
  score += getCategoryPreferenceBoost(rank, category);
  score -= Math.min(normalizedName.length, 120);

  return score;
}

export function getSchoolSuggestions(schools, query, category, limit = 16) {
  if (!query.trim()) {
    return [];
  }

  return schools
    .map((school) => ({
      school,
      score: scoreSchoolMatch(school, query, category),
    }))
    .filter((entry) => entry.score !== null)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const leftRank = getNumericRank(left.school.rank);
      const rightRank = getNumericRank(right.school.rank);
      if (leftRank !== rightRank) {
        return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
      }

      return left.school.name.localeCompare(right.school.name);
    })
    .slice(0, limit)
    .map((entry) => entry.school);
}
