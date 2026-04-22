const { createClient } = require("@supabase/supabase-js");
const { loadDotEnv } = require("../config/env");
const { ENV_PATH } = require("../config/paths");

function initSupabaseAuthClient() {
  loadDotEnv(ENV_PATH);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !publishableKey) {
    return null;
  }

  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createAuthMiddleware(authClient) {
  async function requireAuth(req, res, next) {
    if (!authClient) {
      res.status(500).json({ error: "Supabase auth client is not configured." });
      return;
    }

    const authHeader = String(req.headers.authorization || "");
    const [, token] = authHeader.match(/^Bearer\s+(.+)$/i) || [];

    if (!token) {
      res.status(401).json({ error: "Missing bearer token." });
      return;
    }

    try {
      const { data, error } = await authClient.auth.getUser(token);
      if (error || !data?.user) {
        res.status(401).json({ error: "Invalid or expired token." });
        return;
      }

      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).json({ error: "Failed to verify token." });
    }
  }

  function requireAuthIfConfigured(req, res, next) {
    if (!authClient) {
      next();
      return;
    }

    requireAuth(req, res, next);
  }

  return {
    requireAuth,
    requireAuthIfConfigured,
  };
}

module.exports = {
  createAuthMiddleware,
  initSupabaseAuthClient,
};
