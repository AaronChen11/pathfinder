import { supabase } from "./supabase";

const schoolsTableName = import.meta.env.VITE_SUPABASE_SCHOOLS_TABLE || "usnews_undergrad_rankings";

function pickValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return "";
}

function normalizeSchoolRecord(record) {
  return {
    name: pickValue(record, ["name", "Name"]),
    rank: pickValue(record, ["rank", "Rank"]),
    description: pickValue(record, ["description", "Description"]),
    acceptanceRate: pickValue(record, ["acceptanceRate", "acceptance_rate", "Acceptance Rate"]),
    tuition: pickValue(record, ["tuition", "tuition_and_fees", "Tuition and fees"]),
    inStateTuition: pickValue(record, ["inStateTuition", "in_state", "In-state"]),
    satRange: pickValue(record, ["satRange", "sat_range", "SAT Range"]),
    enrollment: pickValue(record, ["enrollment", "undergrad_enrollment", "Undergrad Enrollment"]),
    location: pickValue(record, ["location", "Location"]),
  };
}

async function loadSchoolsFromSupabase() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from(schoolsTableName).select("*");
  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeSchoolRecord).filter((school) => school.name);
}

async function loadSchoolsFromApi() {
  const response = await fetch("/api/schools");
  if (!response.ok) {
    throw new Error(`Failed to load schools from API: ${response.status}`);
  }

  return response.json();
}

export async function loadSchools() {
  if (supabase) {
    return loadSchoolsFromSupabase();
  }

  return loadSchoolsFromApi();
}
