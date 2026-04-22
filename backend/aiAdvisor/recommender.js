const { normalizeText } = require("../lib/text");
const { parseCurrency, parseEnrollment, parsePercent, parseSatRange, parseState } = require("../lib/numberParsers");
const { getNumericRank } = require("../schools/schoolSearch");
const { normalizeProfile } = require("./profile");

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreAcademicFit(school, profile) {
  const acceptanceRate = parsePercent(school.acceptanceRate);
  const satRange = parseSatRange(school.satRange);
  const rank = getNumericRank(school.rank);
  let score = 52;

  if (profile.sat && satRange) {
    if (profile.sat >= satRange.high) score = 90;
    else if (profile.sat >= satRange.mid) score = 76;
    else if (profile.sat >= satRange.low) score = 60;
    else if (profile.sat >= satRange.low - 80) score = 42;
    else score = 25;
  } else if (profile.gpa) {
    if (profile.gpa >= 3.9) score = 78;
    else if (profile.gpa >= 3.7) score = 68;
    else if (profile.gpa >= 3.4) score = 56;
    else score = 42;
  }

  if (acceptanceRate !== null) {
    if (acceptanceRate <= 8) score -= 24;
    else if (acceptanceRate <= 15) score -= 16;
    else if (acceptanceRate <= 30) score -= 7;
    else if (acceptanceRate >= 65) score += 13;
    else if (acceptanceRate >= 45) score += 7;
  }

  if (rank <= 15) score -= 8;
  else if (rank <= 40) score -= 4;

  return clampScore(score);
}

function scoreMajorFit(school, profile) {
  if (profile.intendedMajors.length === 0) {
    return 62;
  }

  const haystack = normalizeText(`${school.name} ${school.description}`);
  const aliases = {
    cs: ["computer science", "computing", "engineering", "technology"],
    "computer science": ["computer science", "computing", "engineering", "technology"],
    engineering: ["engineering", "technology", "polytechnic"],
    business: ["business", "management", "entrepreneurship", "finance"],
    economics: ["economics", "business", "finance"],
    biology: ["biology", "life sciences", "medicine", "health"],
    premed: ["biology", "life sciences", "medicine", "health"],
    psychology: ["psychology", "social sciences"],
    art: ["art", "design", "music", "theater", "arts"],
  };

  const matches = profile.intendedMajors.flatMap((major) => {
    const normalized = normalizeText(major);
    return aliases[normalized] || [normalized];
  });

  const hitCount = matches.filter((keyword) => keyword && haystack.includes(keyword)).length;
  return hitCount > 0 ? clampScore(74 + Math.min(hitCount, 3) * 7) : 55;
}

function scoreLocationFit(school, profile) {
  const schoolState = parseState(school.location);
  if (profile.preferredStates.length === 0 && profile.preferredRegions.length === 0) {
    return 68;
  }

  if (schoolState && profile.preferredStates.includes(schoolState)) {
    return 96;
  }

  const locationText = normalizeText(school.location);
  const regionMatches = profile.preferredRegions.some((region) => {
    const normalized = normalizeText(region);
    if (!normalized) return false;
    if (locationText.includes(normalized)) return true;
    if (normalized.includes("california") && schoolState === "CA") return true;
    if (normalized.includes("northeast") && ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"].includes(schoolState)) return true;
    if (normalized.includes("west") && ["CA", "OR", "WA", "CO", "AZ", "UT"].includes(schoolState)) return true;
    if (normalized.includes("south") && ["AL", "FL", "GA", "NC", "SC", "TN", "TX", "VA"].includes(schoolState)) return true;
    if (normalized.includes("midwest") && ["IL", "IN", "IA", "MI", "MN", "MO", "OH", "WI"].includes(schoolState)) return true;
    return false;
  });

  return regionMatches ? 88 : 42;
}

function scoreBudgetFit(school, profile) {
  if (!profile.annualBudget) {
    return 66;
  }

  const tuition = parseCurrency(school.tuition);
  const inStateTuition = parseCurrency(school.inStateTuition);
  const cost = inStateTuition || tuition;

  if (!cost) {
    return 56;
  }

  if (cost <= profile.annualBudget) {
    return 95;
  }

  const overageRatio = (cost - profile.annualBudget) / profile.annualBudget;
  if (overageRatio <= 0.15) return 76;
  if (overageRatio <= 0.35) return 55;
  if (overageRatio <= 0.65) return 34;
  return 18;
}

function scoreSizeFit(school, profile) {
  const preference = normalizeText(profile.schoolSizePreference);
  if (!preference) {
    return 66;
  }

  const enrollment = parseEnrollment(school.enrollment);
  if (!enrollment) {
    return 56;
  }

  const size = enrollment < 5000 ? "small" : enrollment <= 15000 ? "medium" : "large";
  if (preference.includes(size)) return 94;
  if ((preference.includes("medium") && (size === "small" || size === "large")) || size === "medium") return 68;
  return 44;
}

function scorePreferenceFit(school, profile) {
  const normalizedName = normalizeText(school.name);
  if (profile.dislikedSchools.some((name) => normalizedName.includes(normalizeText(name)))) {
    return 8;
  }

  if (profile.likedSchools.some((name) => normalizedName.includes(normalizeText(name)))) {
    return 96;
  }

  return 64;
}

function classifyRecommendation(school, profile, academicScore) {
  const acceptanceRate = parsePercent(school.acceptanceRate);
  const satRange = parseSatRange(school.satRange);
  const rank = getNumericRank(school.rank);
  const riskPreference = normalizeText(profile.riskPreference);

  if ((acceptanceRate !== null && acceptanceRate <= 12) || rank <= 20 || academicScore < 45) {
    return "Reach";
  }

  if (profile.sat && satRange && profile.sat >= satRange.high + 40 && acceptanceRate !== null && acceptanceRate >= 45) {
    return "Likely";
  }

  if (acceptanceRate !== null && acceptanceRate >= 60 && academicScore >= 60) {
    return riskPreference.includes("reach") ? "Target" : "Likely";
  }

  if (academicScore >= 76 && acceptanceRate !== null && acceptanceRate >= 32) {
    return "Likely";
  }

  return "Target";
}

function buildRecommendationReasons(school, profile, scores) {
  const reasons = [];
  const risks = [];
  const acceptanceRate = parsePercent(school.acceptanceRate);

  if (scores.majorScore >= 74) reasons.push("Program keywords and school context line up with the stated academic interests.");
  if (scores.locationScore >= 88) reasons.push("Location matches the student's state or regional preference.");
  if (scores.budgetScore >= 76) reasons.push("Published tuition appears close to or under the stated annual budget before aid.");
  if (scores.sizeScore >= 85) reasons.push("Undergraduate enrollment matches the preferred school size.");
  if (scores.academicScore >= 72) reasons.push("Academic indicators look competitive against the available SAT and admissions data.");

  if (acceptanceRate !== null && acceptanceRate <= 15) risks.push("Overall admit rate is highly selective, so this should be treated cautiously.");
  if (scores.budgetScore <= 40) risks.push("Published tuition may exceed the stated budget before financial aid.");
  if (scores.locationScore <= 45) risks.push("Location may not match the stated geographic preferences.");
  if (profile.intendedMajors.length > 0 && scores.majorScore <= 58) risks.push("The current school data has limited evidence for the intended major fit.");

  return {
    reasons: reasons.slice(0, 4),
    risks: risks.slice(0, 3),
  };
}

function scoreSchoolForProfile(school, profile) {
  const scores = {
    academicScore: scoreAcademicFit(school, profile),
    majorScore: scoreMajorFit(school, profile),
    locationScore: scoreLocationFit(school, profile),
    budgetScore: scoreBudgetFit(school, profile),
    sizeScore: scoreSizeFit(school, profile),
    preferenceScore: scorePreferenceFit(school, profile),
  };

  const fitScore = clampScore(
    scores.academicScore * 0.34 +
      scores.majorScore * 0.18 +
      scores.locationScore * 0.15 +
      scores.budgetScore * 0.15 +
      scores.sizeScore * 0.08 +
      scores.preferenceScore * 0.1
  );

  const category = classifyRecommendation(school, profile, scores.academicScore);
  const notes = buildRecommendationReasons(school, profile, scores);

  return {
    school,
    category,
    fitScore,
    scoreBreakdown: scores,
    reasons: notes.reasons,
    risks: notes.risks,
  };
}

function balanceRecommendations(scoredSchools, limit) {
  const buckets = {
    Reach: [],
    Target: [],
    Likely: [],
  };

  for (const entry of scoredSchools) {
    buckets[entry.category].push(entry);
  }

  const ordered = [];
  const pattern = ["Reach", "Target", "Likely", "Target", "Reach", "Likely"];

  while (ordered.length < limit && ordered.length < scoredSchools.length) {
    let added = false;
    for (const category of pattern) {
      const next = buckets[category].shift();
      if (next) {
        ordered.push(next);
        added = true;
      }
      if (ordered.length >= limit) break;
    }

    if (!added) break;
  }

  return ordered;
}

function normalizeSavedCollegeNames(savedLists = {}) {
  return Object.values(savedLists)
    .flatMap((items) => (Array.isArray(items) ? items : []))
    .map((name) => normalizeText(name))
    .filter(Boolean);
}

function getRecommendations(schools, profile, limit = 12, context = {}) {
  const normalizedProfile = normalizeProfile(profile);
  const savedCollegeNames = normalizeSavedCollegeNames(context.savedLists);
  const scoredSchools = schools
    .filter((school) => !savedCollegeNames.includes(normalizeText(school.name)))
    .map((school) => scoreSchoolForProfile(school, normalizedProfile))
    .filter((entry) => entry.scoreBreakdown.preferenceScore > 10)
    .sort((left, right) => {
      if (left.fitScore !== right.fitScore) {
        return right.fitScore - left.fitScore;
      }

      return getNumericRank(left.school.rank) - getNumericRank(right.school.rank);
    });

  return {
    profile: normalizedProfile,
    recommendations: balanceRecommendations(scoredSchools, limit),
  };
}

module.exports = {
  getRecommendations,
};
