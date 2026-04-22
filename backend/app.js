const express = require("express");
const { createAuthMiddleware, initSupabaseAuthClient } = require("./auth/supabaseAuth");
const { initSupabaseServiceClient } = require("./db/supabaseService");
const { createAiAdvisorRouter } = require("./routes/aiAdvisorRoutes");
const { createSchoolsRouter } = require("./routes/schoolsRoutes");
const { createStudentProfileRouter } = require("./routes/studentProfileRoutes");

function createApp({ getSchools }) {
  const app = express();
  const authClient = initSupabaseAuthClient();
  const supabaseAdmin = initSupabaseServiceClient();
  const auth = createAuthMiddleware(authClient);

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, schools: getSchools().length });
  });

  app.use(
    "/api",
    createSchoolsRouter({
      getSchools,
      requireAuth: auth.requireAuth,
    })
  );

  app.use(
    "/api",
    createAiAdvisorRouter({
      getSchools,
      requireAuth: auth.requireAuth,
    })
  );

  app.use(
    "/api",
    createStudentProfileRouter({
      supabaseAdmin,
      requireAuth: auth.requireAuth,
    })
  );

  return app;
}

module.exports = {
  createApp,
};
