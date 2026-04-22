const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..", "..");

module.exports = {
  PROJECT_ROOT,
  DATA_PATH: path.join(PROJECT_ROOT, "Schools.csv"),
  ENV_PATH: path.join(PROJECT_ROOT, ".env"),
};
