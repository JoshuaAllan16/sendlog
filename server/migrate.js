/**
 * migrate.js — copies all data from Supabase into your new SendLog server
 *
 * Usage:
 *   1. npm install @supabase/supabase-js node-fetch
 *   2. Fill in the 3 variables below
 *   3. node migrate.js
 */

const SUPABASE_URL = "YOUR_SUPABASE_URL";       // e.g. https://abcdef.supabase.co
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const NEW_SERVER_URL = "http://YOUR-ZIMA-IP:3001"; // e.g. http://192.168.1.50:3001

const { createClient } = require("@supabase/supabase-js");

async function migrate() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log("Fetching all rows from Supabase...");
  const { data, error } = await supabase.from("kv_store").select("*");
  if (error) { console.error("Supabase error:", error); process.exit(1); }

  console.log(`Found ${data.length} rows. Migrating...`);

  for (const row of data) {
    let parsed;
    try { parsed = JSON.parse(row.value); } catch { parsed = row.value; }

    const res = await fetch(`${NEW_SERVER_URL}/kv/${encodeURIComponent(row.key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    if (res.ok) {
      console.log(`  ✓ ${row.key}`);
    } else {
      console.error(`  ✗ ${row.key} — HTTP ${res.status}`);
    }
  }

  console.log("Migration complete.");
}

migrate().catch(console.error);
