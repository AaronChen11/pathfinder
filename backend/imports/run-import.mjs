import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { importCsvToSupabase } from "./lib/importCsvToSupabase.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const envPath = path.join(projectRoot, ".env");

async function main() {
  const importName = process.argv[2];

  if (!importName) {
    throw new Error("Usage: node backend/imports/run-import.mjs <import-name>");
  }

  const configPath = pathToFileURL(path.join(__dirname, "configs", `${importName}.mjs`)).href;
  const configModule = await import(configPath);
  const config = configModule.default;

  if (!config) {
    throw new Error(`Import config "${importName}" did not export a default config.`);
  }

  await importCsvToSupabase(config, { projectRoot, envPath });
}

main().catch((error) => {
  console.error("Import failed:");
  console.error(error);
  process.exit(1);
});
