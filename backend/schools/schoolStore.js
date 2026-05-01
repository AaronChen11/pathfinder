const csv = require("csvtojson");
const { initSupabaseServiceClient } = require("../db/supabaseService");
const { DATA_PATH } = require("../config/paths");

function normalizeSchoolRecord(record) {
  return {
    name: record?.name || record?.Name || "",
    rank: record?.rank ?? record?.Rank ?? "",
    description: record?.description || record?.Description || "",
    acceptanceRate: record?.acceptance_rate || record?.acceptanceRate || record?.["Acceptance Rate"] || "",
    tuition: record?.tuition_and_fees || record?.tuition || record?.["Tuition and fees"] || "",
    inStateTuition: record?.in_state_tuition || record?.inStateTuition || record?.["In-state"] || "",
    satRange: record?.sat_range || record?.satRange || record?.["SAT Range"] || "",
    enrollment: record?.undergrad_enrollment || record?.enrollment || record?.["Undergrad Enrollment"] || "",
    location: record?.location || record?.Location || "",
  };
}

async function loadSchoolsFromCsv(filePath = DATA_PATH) {
  const rows = await csv().fromFile(filePath);
  return rows.map(normalizeSchoolRecord).filter((school) => school.name);
}

async function loadSchoolsFromSupabase() {
  const supabaseAdmin = initSupabaseServiceClient();
  if (!supabaseAdmin) {
    return null;
  }

  const tableName = process.env.SUPABASE_SCHOOLS_TABLE || "usnews_undergrad_rankings";
  const { data, error } = await supabaseAdmin.from(tableName).select("*");

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeSchoolRecord).filter((school) => school.name);
}

async function loadSchools(filePath = DATA_PATH) {
  const hasSupabaseConfig = Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const supabaseSchools = await loadSchoolsFromSupabase();
    if (supabaseSchools !== null) {
      return supabaseSchools;
    }
  } catch (error) {
    if (hasSupabaseConfig) {
      throw new Error(`Failed to load schools from Supabase: ${error.message}`);
    }

    console.warn("Failed to load schools from Supabase, falling back to CSV:", error.message);
  }

  return loadSchoolsFromCsv(filePath);
}

module.exports = {
  loadSchools,
};
