import path from "node:path";
import csv from "csvtojson";
import { createClient } from "@supabase/supabase-js";
import { loadDotEnv } from "./env.mjs";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env`);
  }

  return value;
}

export async function importCsvToSupabase(config, context) {
  loadDotEnv(context.envPath);

  const supabaseUrl = getRequiredEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const tableName = process.env[config.tableEnvKey] || config.defaultTableName;

  if (!tableName) {
    throw new Error(`No table name configured for import "${config.name}"`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const csvPath = path.resolve(context.projectRoot, config.csvPath);
  const rows = await csv().fromFile(csvPath);
  const payload = rows.map(config.mapRow).filter((row) => !config.filterRow || config.filterRow(row));

  if (payload.length === 0) {
    console.log(`No rows to import for ${config.name}.`);
    return;
  }

  const chunkSize = config.chunkSize || 100;
  let processed = 0;

  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, {
      onConflict: config.onConflict,
      ignoreDuplicates: false,
    });

    if (error) {
      throw error;
    }

    processed += chunk.length;
    console.log(`[${config.name}] Uploaded ${processed}/${payload.length}`);
  }

  console.log(`[${config.name}] Done. Upserted ${payload.length} rows into ${tableName}.`);
}
