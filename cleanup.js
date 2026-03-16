import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Read .env
const envContent = readFileSync(".env", "utf8");
const env = {};
for (const line of envContent.split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const CUTOFF = "2026-03-13"; // Keep sessions on or after this date

async function cleanUser(username) {
  console.log(`\nProcessing user: ${username}`);
  const { data, error } = await supabase
    .from("kv_store").select("value").eq("key", `user:${username}`).maybeSingle();
  if (error) { console.error(`  Error loading: ${error.message}`); return; }
  if (!data) { console.log(`  No data found, skipping.`); return; }

  const userData = JSON.parse(data.value);
  const before = (userData.sessions || []).length;

  // Filter sessions to only keep date >= CUTOFF
  const keptSessions = (userData.sessions || []).filter(s => {
    const d = (s.date || "").slice(0, 10);
    return d >= CUTOFF;
  });

  // Collect project IDs that appear in kept sessions
  const activeProjectIds = new Set(
    keptSessions.flatMap(s => (s.climbs || []).map(c => c.projectId)).filter(Boolean)
  );

  // Keep projects that either: have a dateAdded >= CUTOFF, or appear in kept sessions
  const keptProjects = (userData.projects || []).filter(p => {
    const addedDate = (p.dateAdded || "").slice(0, 10);
    return addedDate >= CUTOFF || activeProjectIds.has(p.id);
  });

  console.log(`  Sessions: ${before} → ${keptSessions.length} (removed ${before - keptSessions.length})`);
  console.log(`  Projects: ${(userData.projects || []).length} → ${keptProjects.length}`);

  const updated = { ...userData, sessions: keptSessions, projects: keptProjects };
  const { error: saveErr } = await supabase.from("kv_store")
    .upsert({ key: `user:${username}`, value: JSON.stringify(updated), updated_at: new Date().toISOString() });
  if (saveErr) { console.error(`  Error saving: ${saveErr.message}`); return; }
  console.log(`  Saved successfully.`);
}

async function main() {
  console.log(`Cutoff date: ${CUTOFF} (keeping sessions on/after this date)`);

  // Load all accounts
  const { data: accData, error: accErr } = await supabase
    .from("kv_store").select("value").eq("key", "accounts:index").maybeSingle();
  if (accErr) { console.error("Error loading accounts:", accErr.message); return; }
  if (!accData) { console.log("No accounts found."); return; }

  const accounts = JSON.parse(accData.value);
  const usernames = Object.keys(accounts);
  console.log(`Found ${usernames.length} account(s): ${usernames.join(", ")}`);

  for (const username of usernames) {
    await cleanUser(username);
  }

  console.log("\nDone.");
}

main();
