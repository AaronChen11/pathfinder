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
  try {
    const supabaseSchools = await loadSchoolsFromSupabase();
    if (supabaseSchools && supabaseSchools.length > 0) {
      return supabaseSchools;
    }
  } catch (error) {
    console.warn("Failed to load schools from Supabase, falling back to CSV:", error.message);
  }

  return loadSchoolsFromCsv(filePath);
}

module.exports = {
  loadSchools,
};
