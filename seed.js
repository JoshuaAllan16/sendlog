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

// Same hash function as the app
const hashPassword = (pw) => {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

const USERNAME    = "test_account";
const PASSWORD    = "123456";
const DISPLAYNAME = "Test Account";

const GRADES     = ["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10"];
const LOCATIONS  = ["Boulder Barn","The Crux Gym","Movement","Earth Treks","Local Wall"];
const WALL_TYPES = ["Slab","Overhang","Corner","Roof"];
const HOLD_TYPES = ["Jugs","Crimps","Slopes","Pinches","Pockets","Sidepull","Undercling","Technical","Gaston","Dyno"];
const COLORS     = ["black","white","red","yellow","green","orange","blue","pink"];
const NAMES      = [
  "Warm Up Slab","The Crimper","Sloper Problem","Pinch Fest","Dynamic Move",
  "The Arete","Corner Crack","Overhang Beast","Slab Master","Power Endurance",
  "Balance Act","Roof Problem","Compression Route","Pocket Monster","The Gaston",
  "Technical Face","Big Move","Volume Problem","Coordination Test","Project Beta",
  "Green Route","Blue Wall","Orange Traverse","Purple Rain","The Undercling",
  "Flash Bait","Jug Haul","Tricky Footing","Crimp City","Slopey Nightmare",
  "The Knee Bar","Dyno Problem","Mantleshelf","Heel Hook Heaven","Drop Knee",
];

const rand    = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function skillRange(months) {
  if (months <  3) return [0, 1];
  if (months <  6) return [0, 2];
  if (months < 10) return [1, 3];
  if (months < 14) return [1, 4];
  if (months < 18) return [2, 5];
  if (months < 24) return [2, 5];
  if (months < 30) return [3, 6];
  if (months < 36) return [3, 6];
  if (months < 42) return [4, 7];
  if (months < 48) return [4, 7];
  if (months < 54) return [4, 8];
  return [5, 8];
}

function makeClimb(months, id) {
  const [minG, maxG] = skillRange(months);
  const gradeIdx  = randInt(minG, maxG);
  const grade     = GRADES[gradeIdx];
  const isHard    = gradeIdx >= minG + Math.ceil((maxG - minG) * 0.55);
  const tries     = isHard ? randInt(2, 9) : randInt(1, 3);
  const completed = tries === 1 ? true : Math.random() > (isHard ? 0.48 : 0.15);
  const holdPick  = [rand(HOLD_TYPES)];
  if (Math.random() > 0.55) holdPick.push(rand(HOLD_TYPES));
  return {
    id,
    name: rand(NAMES) + (Math.random() > 0.45 ? " " + randInt(1, 9) : ""),
    grade,
    scale: "V-Scale",
    tries,
    completed,
    isProject: isHard && !completed && Math.random() > 0.65,
    comments: "",
    photo: null,
    projectId: null,
    color: rand(COLORS),
    wallTypes: [rand(WALL_TYPES)],
    holdTypes: [...new Set(holdPick)],
  };
}

function generateSessions() {
  const sessions = [];
  const now   = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 5);

  let d  = new Date(start);
  let id = 100000;

  while (d < now) {
    const months    = (d - start) / (1000 * 60 * 60 * 24 * 30.4);
    const perWeek   = months < 6 ? 0.9 : months < 12 ? 1.4 : months < 24 ? 1.9 : months < 36 ? 2.2 : 2.5;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const prob      = (perWeek / 7) * (isWeekend ? 2.2 : 0.65);

    if (Math.random() < prob) {
      const climbCount = randInt(4, 9);
      const climbs = Array.from({ length: climbCount }, (_, i) => makeClimb(months, id + i));
      id += climbCount + 1;
      sessions.push({
        id: id++,
        date: new Date(d.getTime() + randInt(7, 20) * 3600000).toISOString(),
        duration: randInt(3000, 7800),
        location: rand(LOCATIONS),
        climbs,
      });
    }

    d.setDate(d.getDate() + 1);
  }

  return sessions.reverse();
}

// ── test_account2 generation ────────────────────────────────────────────────

const USERNAME2    = "test_account2";
const PASSWORD2    = "123456";
const DISPLAYNAME2 = "Test Account 2";

// Project definitions for account2
// addMo = months after start to add project, sentMo = months after start to send (omit if still active)
const PROJECT_DEFS = [
  { id: 80001, name: "The Roof Problem",    grade: "V3", addMo:  2, sentMo:  5  },
  { id: 80002, name: "Crimp City Classic",  grade: "V4", addMo:  5, sentMo:  9  },
  { id: 80003, name: "Sloper Traverse",     grade: "V4", addMo:  8, sentMo: 13  },
  { id: 80004, name: "Pocket Rocket",       grade: "V5", addMo: 11, sentMo: 17  },
  { id: 80005, name: "The Gaston Wall",     grade: "V5", addMo: 15, sentMo: 20  },
  { id: 80006, name: "Iron Cross",          grade: "V5", addMo: 19               }, // active
  { id: 80007, name: "Deadpoint Dyno",      grade: "V6", addMo: 21               }, // active
  { id: 80008, name: "The Pinch King",      grade: "V6", addMo: 22               }, // active
];

function skillRange2(months) {
  if (months <  3) return [0, 2];
  if (months <  6) return [0, 3];
  if (months < 10) return [1, 3];
  if (months < 14) return [1, 4];
  if (months < 18) return [2, 5];
  if (months < 22) return [2, 5];
  return [3, 6];
}

function generate2YearData() {
  const now   = new Date();
  const start = new Date(now);
  start.setFullYear(start.getFullYear() - 2);

  // Build date-indexed project schedule
  const addDate  = (mo) => new Date(start.getTime() + mo * 30.4 * 86400000);
  const projects = PROJECT_DEFS.map(p => ({
    id: p.id,
    name: p.name,
    grade: p.grade,
    scale: "V-Scale",
    active: p.sentMo === undefined,
    completed: p.sentMo !== undefined,
    dateAdded: addDate(p.addMo).toISOString(),
    ...(p.sentMo !== undefined ? { dateSent: addDate(p.sentMo).toISOString() } : {}),
    notes: "",
  }));

  const sessions = [];
  let id = 300000;
  let d  = new Date(start);
  let lastSessionDate = null;

  // Track how many times each project has been attempted in the current run
  const projectAttempts = {};

  while (d <= now) {
    const months = (d - start) / (1000 * 60 * 60 * 24 * 30.4);
    const daysSinceLast = lastSessionDate ? (d - lastSessionDate) / 86400000 : 99;
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    // Rest-aware probability — targets ~2.5 day avg rest
    let prob = 0;
    if (daysSinceLast >= 2) {
      const base = months < 6 ? 0.28 : months < 12 ? 0.34 : 0.40;
      prob = base * (isWeekend ? 1.7 : 1.0) * (daysSinceLast >= 4 ? 1.4 : 1.0);
    }

    if (Math.random() < prob) {
      const [minG, maxG] = skillRange2(months);
      const climbCount   = randInt(4, 9);
      const climbs = Array.from({ length: climbCount }, () => {
        const gradeIdx  = randInt(minG, maxG);
        const grade     = GRADES[gradeIdx];
        const isHard    = gradeIdx >= minG + Math.ceil((maxG - minG) * 0.6);
        const tries     = isHard ? randInt(2, 8) : randInt(1, 3);
        const completed = tries === 1 ? true : Math.random() > (isHard ? 0.5 : 0.15);
        const holdPick  = [rand(HOLD_TYPES)];
        if (Math.random() > 0.5) holdPick.push(rand(HOLD_TYPES));
        return {
          id: id++,
          name: rand(NAMES) + (Math.random() > 0.4 ? " " + randInt(1, 9) : ""),
          grade, scale: "V-Scale", tries, completed,
          isProject: false, comments: "", photo: null, projectId: null,
          color: rand(COLORS), wallTypes: [rand(WALL_TYPES)], holdTypes: [...new Set(holdPick)],
        };
      });

      // Inject project climbs for active projects this month
      for (const p of PROJECT_DEFS) {
        const pAddMo  = p.addMo;
        const pSentMo = p.sentMo;
        if (months < pAddMo) continue;                         // not yet added
        if (pSentMo !== undefined && months > pSentMo) continue; // already sent

        if (!projectAttempts[p.id]) projectAttempts[p.id] = 0;

        // 60% chance of attempting project this session
        if (Math.random() < 0.60) {
          projectAttempts[p.id]++;
          const isSendSession = pSentMo !== undefined && months >= pSentMo - 0.5;
          const tries     = isSendSession ? randInt(1, 3) : randInt(2, 6);
          const completed = isSendSession;
          const holdPick  = [rand(HOLD_TYPES), rand(HOLD_TYPES)];
          climbs.push({
            id: id++,
            name: p.name,
            grade: p.grade, scale: "V-Scale", tries, completed,
            isProject: true, projectId: p.id, comments: "",
            photo: null, color: "orange", wallTypes: [rand(WALL_TYPES)],
            holdTypes: [...new Set(holdPick)],
          });
        }
      }

      sessions.push({
        id: id++,
        date: new Date(d.getTime() + randInt(8, 19) * 3600000).toISOString(),
        duration: randInt(3600, 7200),
        location: rand(LOCATIONS),
        climbs,
      });
      lastSessionDate = new Date(d);
    }

    d.setDate(d.getDate() + 1);
  }

  return { sessions: sessions.reverse(), projects };
}

async function main() {
  // ── account index ────────────────────────────────────────────
  console.log("Loading accounts index...");
  const { data: accData, error: accErr } = await supabase
    .from("kv_store").select("value").eq("key", "accounts:index").maybeSingle();
  if (accErr) { console.error("Error loading accounts:", accErr.message); return; }

  const accounts = accData ? JSON.parse(accData.value) : {};
  accounts[USERNAME]  = { hash: hashPassword(PASSWORD),  displayName: DISPLAYNAME  };
  accounts[USERNAME2] = { hash: hashPassword(PASSWORD2), displayName: DISPLAYNAME2 };

  const { error: accSaveErr } = await supabase.from("kv_store")
    .upsert({ key: "accounts:index", value: JSON.stringify(accounts), updated_at: new Date().toISOString() });
  if (accSaveErr) { console.error("Error saving accounts:", accSaveErr.message); return; }
  console.log("Accounts registered.");

  // ── test_account: 5 years ────────────────────────────────────
  console.log("Generating 5 years of sessions for test_account...");
  const sessions1 = generateSessions();
  console.log(`Generated ${sessions1.length} sessions.`);
  const { error: e1 } = await supabase.from("kv_store")
    .upsert({ key: `user:${USERNAME}`, value: JSON.stringify({ profile: { displayName: DISPLAYNAME, preferredScale: "V-Scale", hiddenLocations: [] }, sessions: sessions1, projects: [] }), updated_at: new Date().toISOString() });
  if (e1) { console.error("Error saving test_account:", e1.message); return; }
  console.log(`test_account saved.`);

  // ── test_account2: 2 years + projects ───────────────────────
  console.log("Generating 2 years of sessions for test_account2...");
  const { sessions: sessions2, projects: projects2 } = generate2YearData();
  console.log(`Generated ${sessions2.length} sessions, ${projects2.length} projects.`);
  const { error: e2 } = await supabase.from("kv_store")
    .upsert({ key: `user:${USERNAME2}`, value: JSON.stringify({ profile: { displayName: DISPLAYNAME2, preferredScale: "V-Scale", hiddenLocations: [] }, sessions: sessions2, projects: projects2 }), updated_at: new Date().toISOString() });
  if (e2) { console.error("Error saving test_account2:", e2.message); return; }

  console.log(`\nDone!`);
  console.log(`  test_account  → username: ${USERNAME}  password: ${PASSWORD}`);
  console.log(`  test_account2 → username: ${USERNAME2}  password: ${PASSWORD2}`);
}

main();
