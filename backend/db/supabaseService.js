const { createClient } = require("@supabase/supabase-js");
const { loadDotEnv } = require("../config/env");
const { ENV_PATH } = require("../config/paths");

function initSupabaseServiceClient() {
  loadDotEnv(ENV_PATH);

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = {
  initSupabaseServiceClient,
};
