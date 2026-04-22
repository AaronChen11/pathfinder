const csv = require("csvtojson");
const { DATA_PATH } = require("../config/paths");

async function loadSchools(filePath = DATA_PATH) {
  const rows = await csv().fromFile(filePath);
  return rows.map((row) => ({
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

module.exports = {
  loadSchools,
};
