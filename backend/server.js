const { createApp } = require("./app");
const { loadSchools } = require("./schools/schoolStore");

const PORT = process.env.PORT || 3200;

let schools = [];

function getSchools() {
  return schools;
}

console.log("Startup config:", {
  hasSupabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
  hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  schoolsTable: process.env.SUPABASE_SCHOOLS_TABLE || "usnews_undergrad_rankings",
  port: PORT,
});

loadSchools()
  .then((loadedSchools) => {
    schools = loadedSchools;
    const app = createApp({ getSchools });

    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT} with ${schools.length} schools loaded`);
    });
  })
  .catch((error) => {
    console.error("Failed to load schools data:", error);
    process.exit(1);
  });
