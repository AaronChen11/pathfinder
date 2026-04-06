function parseInteger(value) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default {
  name: "schools",
  csvPath: "Schools.csv",
  tableEnvKey: "SUPABASE_SCHOOLS_TABLE",
  defaultTableName: "usnews_undergrad_rankings",
  onConflict: "name",
  chunkSize: 100,
  mapRow(row) {
    return {
      source_index: parseInteger(row.index),
      name: row.Name?.trim() || null,
      location: row.Location?.trim() || null,
      rank: parseInteger(row.Rank),
      description: row.Description?.trim() || null,
      tuition: row["Tuition and fees"]?.trim() || null,
      in_state_tuition: row["In-state"]?.trim() || null,
      undergrad_enrollment: row["Undergrad Enrollment"]?.trim() || null,
      sat_range: row["SAT Range"]?.trim() || null,
      acceptance_rate: row["Acceptance Rate"]?.trim() || null,
    };
  },
  filterRow(row) {
    return Boolean(row.name);
  },
};
