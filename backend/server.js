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
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to load Schools.csv:", error);
    process.exit(1);
  });
