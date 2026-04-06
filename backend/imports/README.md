# CSV Imports

This directory contains reusable CSV-to-Supabase import tooling.

## Current imports

- `schools`

## How it works

1. Put your real Supabase values in `.env`
2. Create a config file in `backend/imports/configs/`
3. Run the importer with the config name

## Required `.env` values

```env
VITE_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Optional per-import table names:

```env
SUPABASE_SCHOOLS_TABLE=usnews_undergrad_rankings
```

## Run an import

```bash
npm run import:csv schools
```

Or for the built-in schools shortcut:

```bash
npm run supabase:import-schools
```

## Add a new CSV import

Create a new file like `backend/imports/configs/my-data.mjs`:

```js
export default {
  name: "my-data",
  csvPath: "data/MyData.csv",
  tableEnvKey: "SUPABASE_MY_DATA_TABLE",
  defaultTableName: "my_data",
  onConflict: "slug",
  chunkSize: 100,
  mapRow(row) {
    return {
      slug: row.slug?.trim() || null,
      title: row.title?.trim() || null,
    };
  },
  filterRow(row) {
    return Boolean(row.slug);
  },
};
```

Then run:

```bash
npm run import:csv my-data
```
