const express = require("express");
const { getSchoolSuggestions } = require("../schools/schoolSearch");

function createSchoolsRouter({ getSchools, requireAuth }) {
  const router = express.Router();

  router.get("/schools", requireAuth, (req, res) => {
    const schools = getSchools();
    const query = String(req.query.search || "").trim().toLowerCase();
    const filtered = query ? schools.filter((school) => school.name.toLowerCase().includes(query)) : schools;

    res.json(filtered);
  });

  router.get("/schools/suggest", requireAuth, (req, res) => {
    const schools = getSchools();
    const query = String(req.query.query || "").trim();
    const category = String(req.query.category || "").trim();
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 16, 1), 20);

    if (!query) {
      res.json([]);
      return;
    }

    res.json(getSchoolSuggestions(schools, query, category, limit));
  });

  return router;
}

module.exports = {
  createSchoolsRouter,
};
