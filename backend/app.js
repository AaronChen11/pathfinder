const express = require("express");
const { createAuthMiddleware, initSupabaseAuthClient } = require("./auth/supabaseAuth");
const { initSupabaseServiceClient } = require("./db/supabaseService");
const { createAiAdvisorRouter } = require("./routes/aiAdvisorRoutes");
const { createSchoolsRouter } = require("./routes/schoolsRoutes");
const { createStudentProfileRouter } = require("./routes/studentProfileRoutes");

function createCorsMiddleware() {
  const allowedOrigins = String(process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    const allowOrigin =
      origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];

    if (allowOrigin) {
      res.setHeader("Access-Control-Allow-Origin", allowOrigin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}

function createApp({ getSchools }) {
  const app = express();
  const authClient = initSupabaseAuthClient();
  const supabaseAdmin = initSupabaseServiceClient();
  const auth = createAuthMiddleware(authClient);

  app.use(createCorsMiddleware());
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
