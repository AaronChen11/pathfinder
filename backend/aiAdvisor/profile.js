const { parseCurrency, parseNumber } = require("../lib/numberParsers");
const { normalizeList } = require("../lib/text");
const { NO_PREFERENCE, PREFER_NOT_TO_ANSWER, advisorQuestions } = require("./questions");

function sanitizeAdvisorAnswer(value) {
  const answer = String(value || "").trim();
  if (!answer || answer === PREFER_NOT_TO_ANSWER || answer === NO_PREFERENCE) {
    return "";
  }

  return answer.slice(0, 500);
}

function buildProfileFromAnswers(answers = []) {
  const fields = new Set(advisorQuestions.map((question) => question.field));
  const profile = {};

  for (const answer of answers || []) {
    const field = String(answer?.field || "").trim();
    if (!fields.has(field)) {
      continue;
    }

    profile[field] = sanitizeAdvisorAnswer(answer.value);
  }

  return profile;
}

function normalizeProfile(rawProfile = {}) {
  return {
    gradeLevel: String(rawProfile.gradeLevel || "").trim(),
    gpa: parseNumber(rawProfile.gpa),
    gpaType: String(rawProfile.gpaType || "").trim(),
    sat: parseNumber(rawProfile.sat),
    act: parseNumber(rawProfile.act),
    intendedMajors: normalizeList(rawProfile.intendedMajors),
    preferredRegions: normalizeList(rawProfile.preferredRegions),
    preferredStates: normalizeList(rawProfile.preferredStates).map((state) => state.toUpperCase()),
    annualBudget: parseCurrency(rawProfile.annualBudget),
    schoolSizePreference: String(rawProfile.schoolSizePreference || "").trim(),
    campusSettingPreference: String(rawProfile.campusSettingPreference || "").trim(),
    riskPreference: String(rawProfile.riskPreference || "Balanced").trim(),
    likedSchools: normalizeList(rawProfile.likedSchools),
    dislikedSchools: normalizeList(rawProfile.dislikedSchools),
    activitiesSummary: String(rawProfile.activitiesSummary || "").trim(),
  };
}

function getDisplayProfile(profile) {
  return advisorQuestions
    .map((question) => ({
      field: question.field,
      label: question.label,
      value: profile[question.field],
    }))
    .filter((item) => {
      if (Array.isArray(item.value)) {
        return item.value.length > 0;
      }

      return item.value !== null && item.value !== undefined && item.value !== "";
    })
    .map((item) => ({
      ...item,
      value: Array.isArray(item.value) ? item.value.join(", ") : String(item.value),
    }));
}

module.exports = {
  buildProfileFromAnswers,
  getDisplayProfile,
  normalizeProfile,
};
