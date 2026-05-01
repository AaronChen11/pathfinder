const { createApp } = require("./app");
const { loadSchools } = require("./schools/schoolStore");

const PORT = process.env.PORT || 3200;

let schools = [];

function getSchools() {
  return schools;
}

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
