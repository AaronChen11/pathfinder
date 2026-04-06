const express = require("express");
const fs = require("fs");
const path = require("path");
const csv = require("csvtojson");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3200;
const DATA_PATH = path.join(__dirname, "..", "Schools.csv");
const ENV_PATH = path.join(__dirname, "..", ".env");

let schools = [];
let authClient = null;

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function initSupabaseAuthClient() {
  loadDotEnv(ENV_PATH);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAuth(req, res, next) {
  if (!authClient) {
    res.status(500).json({ error: "Supabase auth client is not configured." });
    return;
  }

  const authHeader = String(req.headers.authorization || "");
  const [, token] = authHeader.match(/^Bearer\s+(.+)$/i) || [];

  if (!token) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  try {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: "Invalid or expired token." });
      return;
    }

    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Failed to verify token." });
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getNumericRank(rank) {
  const value = Number.parseInt(rank, 10);
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function getRankScore(rank) {
  if (rank === Number.MAX_SAFE_INTEGER) {
    return 0;
  }

  if (rank <= 10) {
    return 110;
  }

  if (rank <= 25) {
    return 95;
  }

  if (rank <= 50) {
    return 78;
  }

  if (rank <= 100) {
    return 58;
  }

  if (rank <= 180) {
    return 35;
  }

  return 18;
}

function getCategoryPreferenceBoost(rank, category) {
  switch (String(category || "").toLowerCase()) {
    case "reach":
      if (rank === Number.MAX_SAFE_INTEGER) return -10;
      if (rank <= 25) return 65;
      if (rank <= 60) return 45;
      if (rank <= 120) return 20;
      return 0;
    case "target":
      if (rank === Number.MAX_SAFE_INTEGER) return 0;
      if (rank >= 20 && rank <= 120) return 55;
      if (rank <= 180) return 28;
      return 8;
    case "safety":
      if (rank === Number.MAX_SAFE_INTEGER) return 35;
      if (rank >= 100) return 58;
      if (rank >= 60) return 25;
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

  if (normalizedName === normalizedQuery) {
    score += 1000;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    score += 700;
  }

  if (normalizedName.includes(` ${normalizedQuery}`)) {
    score += 450;
  }

  if (normalizedName.includes(normalizedQuery)) {
    score += 260;
  }

  if (compactQuery && compactName.includes(compactQuery)) {
    score += 160;
  }

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const nameTokens = normalizedName.split(/\s+/).filter(Boolean);
  const tokenMatches = queryTokens.filter((token) => nameTokens.some((nameToken) => nameToken.startsWith(token))).length;

  if (tokenMatches === 0) {
    return null;
  }

  score += tokenMatches * 90;
  const rank = getNumericRank(school.rank);
  score += getRankScore(rank);
  score += getCategoryPreferenceBoost(rank, category);
  score -= Math.min(normalizedName.length, 120);

  return score;
}

async function loadSchools() {
  const rows = await csv().fromFile(DATA_PATH);
  schools = rows.map((row) => ({
    name: row.Name,
    rank: row.Rank,
    description: row.Description,
    acceptanceRate: row["Acceptance Rate"],
    tuition: row["Tuition and fees"],
    inStateTuition: row["In-state"],
    satRange: row["SAT Range"],
    enrollment: row["Undergrad Enrollment"],
    location: row.Location,
  }));
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, schools: schools.length });
});

app.get("/api/schools", requireAuth, (req, res) => {
  const query = String(req.query.search || "").trim().toLowerCase();
  const filtered = query
    ? schools.filter((school) => school.name.toLowerCase().includes(query))
    : schools;

  res.json(filtered);
});

app.get("/api/schools/suggest", requireAuth, (req, res) => {
  const query = String(req.query.query || "").trim();
  const category = String(req.query.category || "").trim();
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 16, 1), 20);

  if (!query) {
    res.json([]);
    return;
  }

  const suggestions = schools
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
        return leftRank - rightRank;
      }

      return left.school.name.localeCompare(right.school.name);
    })
    .slice(0, limit)
    .map((entry) => entry.school);

  res.json(suggestions);
});

authClient = initSupabaseAuthClient();

loadSchools()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to load Schools.csv:", error);
    process.exit(1);
  });
