import { useState, useRef, useEffect, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

const GRADES = {
  "V-Scale": ["VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"],
  "YDS": ["5.6", "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a"],
  "French": ["4", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b"],
  "Custom (C-Scale)": ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
};

const GRADE_COLORS = {
  "VB": "#4ade80", "V0": "#86efac", "V1": "#fde047", "V2": "#fb923c",
  "V3": "#f97316", "V4": "#ef4444", "V5": "#dc2626", "V6": "#b91c1c",
  "V7": "#c084fc", "V8": "#a855f7", "V9": "#7c3aed", "V10": "#4c1d95",
  "C1": "#4ade80", "C2": "#fde047", "C3": "#fb923c", "C4": "#f97316",
  "C5": "#ef4444", "C6": "#dc2626", "C7": "#a855f7", "default": "#fb923c"
};

const CLIMB_COLORS = [
  { id: "black",  label: "Black",  hex: "#1a1a1a" },
  { id: "white",  label: "White",  hex: "#ffffff" },
  { id: "red",    label: "Red",    hex: "#ef4444" },
  { id: "yellow", label: "Yellow", hex: "#facc15" },
  { id: "green",  label: "Green",  hex: "#22c55e" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "blue",   label: "Blue",   hex: "#3b82f6" },
  { id: "pink",   label: "Pink",   hex: "#ec4899" },
];

const ROPE_GRADES = {
  "French": ["4", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a"],
  "YDS":    ["5.6", "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a", "5.12b", "5.12c", "5.12d"],
};

const WALL_TYPES = ["Slab", "Overhang", "Corner", "Roof"];
const HOLD_TYPES  = ["Jugs", "Crimps", "Slopes", "Pinches", "Pockets", "Sidepull", "Undercling", "Gaston", "Dyno", "Technical", "Bat Hang", "Coordination", "Knee Bar"];

const getGradeColor = (g) => GRADE_COLORS[g] || GRADE_COLORS["default"];
const formatDate    = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
const formatTotalTime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
const formatRestSec  = (s) => { if (s === null || s === undefined) return "—"; const m = Math.floor(s / 60), sec = Math.round(s % 60); return m > 0 ? (sec ? `${m}m ${sec}s` : `${m}m`) : `${sec}s`; };

const ThemeCtx = createContext(null);
const useTheme = () => useContext(ThemeCtx);

const THEMES = {
  espresso: {
    bg: "linear-gradient(160deg, #2c1a0c 0%, #1f1208 50%, #160c04 100%)",
    surface: "rgba(44, 24, 8, 0.97)", surface2: "rgba(60, 34, 10, 0.92)",
    border: "#5c3218", accent: "#f09040", accentGlow: "rgba(240,144,64,0.28)", accentDark: "#c86818",
    text: "#f0dcc0", textMuted: "#c89060", textDim: "#8a6040",
    gold: "#f59e0b", goldLight: "#3a2800",
    pink: "#3d0a1c", pinkDark: "#f472b6",
    yellow: "#2e2200", yellowDark: "#fbbf24",
    green: "#0a2c12", greenDark: "#4ade80",
    red: "#2e0a0a", redDark: "#f87171",
    purple: "#1e0a3e", purpleDark: "#c084fc",
    navBg: "#110702",
  },
  alpine: {
    bg: "linear-gradient(160deg, #f0f5ea 0%, #e8f0e0 50%, #dfe9d5 100%)",
    surface: "rgba(255, 255, 252, 0.99)", surface2: "rgba(236, 243, 228, 0.97)",
    border: "#bfcfb0", accent: "#3a7848", accentGlow: "rgba(58,120,72,0.18)", accentDark: "#275c34",
    text: "#1a2416", textMuted: "#4a5e42", textDim: "#8a9e84",
    gold: "#9a6e08", goldLight: "#eee8c8",
    pink: "#f0dce4", pinkDark: "#a01e50",
    yellow: "#f4f0c8", yellowDark: "#806000",
    green: "#d0eccb", greenDark: "#1e7636",
    red: "#f0dcd8", redDark: "#9e2626",
    purple: "#e2d4f4", purpleDark: "#58209e",
    navBg: "#d4e2c8",
  },
  chalk: {
    bg: "linear-gradient(160deg, #fef5e0 0%, #fdedc8 50%, #fce4b0 100%)",
    surface: "rgba(255, 252, 238, 0.99)", surface2: "rgba(252, 243, 215, 0.97)",
    border: "#e4c27a", accent: "#d85818", accentGlow: "rgba(216,88,24,0.22)", accentDark: "#b04010",
    text: "#281408", textMuted: "#7a4c28", textDim: "#b08458",
    gold: "#c67800", goldLight: "#feefaa",
    pink: "#fce0ee", pinkDark: "#c02068",
    yellow: "#fef5aa", yellowDark: "#9a6800",
    green: "#d4f2d4", greenDark: "#1a7c38",
    red: "#fce0d4", redDark: "#c01c14",
    purple: "#e8d4fc", purpleDark: "#6618bc",
    navBg: "#f6d888",
  },
  neon: {
    bg: "linear-gradient(160deg, #00060f 0%, #000408 50%, #000204 100%)",
    surface: "rgba(0, 8, 20, 0.98)", surface2: "rgba(0, 14, 32, 0.96)",
    border: "#00304860", accent: "#00d4ff", accentGlow: "rgba(0,212,255,0.35)", accentDark: "#0090c8",
    text: "#d8f0ff", textMuted: "#5090b0", textDim: "#204860",
    gold: "#f59e0b", goldLight: "#001428",
    pink: "#0c0020", pinkDark: "#f472b6",
    yellow: "#0c1000", yellowDark: "#fbbf24",
    green: "#001c10", greenDark: "#00e87a",
    red: "#160008", redDark: "#ff6080",
    purple: "#08001e", purpleDark: "#c084fc",
    navBg: "#000204",
  },
  midnight: {
    bg: "linear-gradient(160deg, #0d1525 0%, #091020 50%, #060c18 100%)",
    surface: "rgba(10, 16, 32, 0.98)", surface2: "rgba(16, 24, 48, 0.96)",
    border: "#243456", accent: "#7ba4d8", accentGlow: "rgba(123,164,216,0.22)", accentDark: "#4a74b0",
    text: "#c0d0e8", textMuted: "#6880a8", textDim: "#384860",
    gold: "#b88820", goldLight: "#181830",
    pink: "#180d26", pinkDark: "#c870b8",
    yellow: "#181808", yellowDark: "#c09838",
    green: "#081a14", greenDark: "#48b878",
    red: "#180a0a", redDark: "#c86060",
    purple: "#100828", purpleDark: "#9070c8",
    navBg: "#050c18",
  },
  ember: {
    bg: "linear-gradient(160deg, #1a1410 0%, #120e08 50%, #0e0a06 100%)",
    surface: "rgba(20, 14, 8, 0.98)", surface2: "rgba(30, 22, 12, 0.96)",
    border: "#483020", accent: "#d08040", accentGlow: "rgba(208,128,64,0.25)", accentDark: "#a05820",
    text: "#e8d4b0", textMuted: "#987050", textDim: "#584030",
    gold: "#c09010", goldLight: "#281c04",
    pink: "#240c14", pinkDark: "#c86880",
    yellow: "#201800", yellowDark: "#c89820",
    green: "#0a1c08", greenDark: "#60b050",
    red: "#200808", redDark: "#c85848",
    purple: "#160c28", purpleDark: "#9068b8",
    navBg: "#0c0806",
  },
  abyss: {
    bg: "linear-gradient(160deg, #000008 0%, #000205 50%, #000103 100%)",
    surface: "rgba(0, 2, 12, 0.99)", surface2: "rgba(0, 5, 22, 0.97)",
    border: "#0030a0", accent: "#2266ff", accentGlow: "rgba(34,102,255,0.38)", accentDark: "#0044dd",
    text: "#b8d0ff", textMuted: "#4060a0", textDim: "#182040",
    gold: "#f59e0b", goldLight: "#001030",
    pink: "#0a0020", pinkDark: "#e060f0",
    yellow: "#080800", yellowDark: "#d0b020",
    green: "#001810", greenDark: "#40e090",
    red: "#100008", redDark: "#ff4060",
    purple: "#060020", purpleDark: "#8866ff",
    navBg: "#000003",
  },
  forest: {
    bg: "linear-gradient(160deg, #081a08 0%, #051005 50%, #030a03 100%)",
    surface: "rgba(8, 20, 8, 0.99)", surface2: "rgba(12, 28, 10, 0.97)",
    border: "#1a4018", accent: "#40d060", accentGlow: "rgba(64,208,96,0.28)", accentDark: "#28a040",
    text: "#c0e8b0", textMuted: "#508050", textDim: "#284028",
    gold: "#c0a020", goldLight: "#141800",
    pink: "#200820", pinkDark: "#e06090",
    yellow: "#181400", yellowDark: "#b8b020",
    green: "#0a2808", greenDark: "#60d878",
    red: "#200808", redDark: "#e05858",
    purple: "#100820", purpleDark: "#9060d8",
    navBg: "#030803",
  },
  dusk: {
    bg: "linear-gradient(160deg, #180828 0%, #100618 50%, #0c0412 100%)",
    surface: "rgba(20, 8, 30, 0.99)", surface2: "rgba(30, 12, 44, 0.97)",
    border: "#502060", accent: "#d060f0", accentGlow: "rgba(208,96,240,0.30)", accentDark: "#a030c8",
    text: "#f0c8ff", textMuted: "#9060c0", textDim: "#401860",
    gold: "#d09020", goldLight: "#180820",
    pink: "#200030", pinkDark: "#ff70c0",
    yellow: "#1a0c00", yellowDark: "#d0a030",
    green: "#081018", greenDark: "#50d0a0",
    red: "#200010", redDark: "#f05080",
    purple: "#0e0028", purpleDark: "#c880ff",
    navBg: "#08040e",
  },
  sakura: {
    bg: "linear-gradient(160deg, #1a0810 0%, #120508 50%, #0e0306 100%)",
    surface: "rgba(20, 6, 12, 0.99)", surface2: "rgba(30, 10, 18, 0.97)",
    border: "#601030", accent: "#f060a0", accentGlow: "rgba(240,96,160,0.30)", accentDark: "#c03070",
    text: "#ffc8d8", textMuted: "#a04068", textDim: "#602040",
    gold: "#c08020", goldLight: "#200a08",
    pink: "#280018", pinkDark: "#ff70b8",
    yellow: "#180c00", yellowDark: "#c09820",
    green: "#081210", greenDark: "#50b870",
    red: "#200810", redDark: "#ff6070",
    purple: "#100818", purpleDark: "#a060d8",
    navBg: "#0e0408",
  },
  blossom: {
    bg: "linear-gradient(160deg, #fce8f0 0%, #fad0e4 50%, #f7b8d6 100%)",
    surface: "rgba(255, 246, 251, 0.99)", surface2: "rgba(253, 232, 244, 0.97)",
    border: "#f0a8cc", accent: "#c01e5e", accentGlow: "rgba(192,30,94,0.22)", accentDark: "#8c1444",
    text: "#28081a", textMuted: "#8c2058", textDim: "#c07898",
    gold: "#b87010", goldLight: "#ffe8d0",
    pink: "#fcdce8", pinkDark: "#b81858",
    yellow: "#fef5c0", yellowDark: "#906000",
    green: "#d0f0da", greenDark: "#1c6e40",
    red: "#fcdcdc", redDark: "#b82020",
    purple: "#e8d0f8", purpleDark: "#5a1ca8",
    navBg: "#f4aed0",
  },
  slate: {
    bg: "linear-gradient(160deg, #1c2028 0%, #141820 50%, #101418 100%)",
    surface: "rgba(20, 24, 32, 0.98)", surface2: "rgba(28, 34, 44, 0.96)",
    border: "#384050", accent: "#78a0c8", accentGlow: "rgba(120,160,200,0.25)", accentDark: "#486e9e",
    text: "#d0dcea", textMuted: "#6878a0", textDim: "#384060",
    gold: "#c0a040", goldLight: "#181c24",
    pink: "#201828", pinkDark: "#d87090",
    yellow: "#181810", yellowDark: "#c0b040",
    green: "#0c1c14", greenDark: "#58b878",
    red: "#180c0c", redDark: "#c86060",
    purple: "#140c28", purpleDark: "#9870d0",
    navBg: "#0c1016",
  },
  crimson: {
    bg: "linear-gradient(160deg, #1e0408 0%, #160204 50%, #100102 100%)",
    surface: "rgba(22, 4, 6, 0.99)", surface2: "rgba(32, 8, 10, 0.97)",
    border: "#581018", accent: "#f03050", accentGlow: "rgba(240,48,80,0.30)", accentDark: "#b01830",
    text: "#ffccd0", textMuted: "#a04050", textDim: "#602030",
    gold: "#c08020", goldLight: "#200a04",
    pink: "#200010", pinkDark: "#f870a8",
    yellow: "#181000", yellowDark: "#c09820",
    green: "#081410", greenDark: "#50b870",
    red: "#280808", redDark: "#ff6060",
    purple: "#120818", purpleDark: "#a060d8",
    navBg: "#0e0204",
  },
};

const SAMPLE_PROJECTS = [
  { id: 301, name: "The Sloper Problem", grade: "V4", scale: "V-Scale", comments: "Crux is a big dynamic move to sloper.", active: true, completed: false, dateAdded: new Date(Date.now() - 86400000 * 14).toISOString(), dateSent: null },
  { id: 302, name: "Overhang Pump Fest", grade: "V5", scale: "V-Scale", comments: "Sustained overhang, pump is real.", active: true, completed: false, dateAdded: new Date(Date.now() - 86400000 * 7).toISOString(), dateSent: null },
  { id: 303, name: "Green Crimpy Arete", grade: "V3", scale: "V-Scale", comments: "Fun arete movement.", active: false, completed: true, dateAdded: new Date(Date.now() - 86400000 * 30).toISOString(), dateSent: new Date(Date.now() - 86400000 * 5).toISOString() },
];

const SAMPLE_SESSIONS = [
  { id: 1, date: new Date(Date.now() - 86400000 * 2).toISOString(), duration: 3720, location: "Boulder Barn", climbs: [
    { id: 101, name: "Warm Up Slab", grade: "V2", scale: "V-Scale", tries: 1, completed: true, isProject: false, comments: "Easy flash.", photo: null, projectId: null, color: "yellow", wallTypes: ["Slab"], holdTypes: ["Jugs"] },
    { id: 102, name: "The Sloper Problem", grade: "V4", scale: "V-Scale", tries: 5, completed: false, isProject: true, comments: "Couldn't stick crux.", photo: null, projectId: 301, color: "blue", wallTypes: ["Overhang"], holdTypes: ["Slopes", "Pinches"] },
    { id: 103, name: "Corner Crack", grade: "V3", scale: "V-Scale", tries: 2, completed: true, isProject: false, comments: "Great beta.", photo: null, projectId: null, color: "green", wallTypes: ["Slab"], holdTypes: ["Technical"] },
  ]},
  { id: 2, date: new Date(Date.now() - 86400000 * 7).toISOString(), duration: 5400, location: "The Crux Gym", climbs: [
    { id: 201, name: "Overhang Pump Fest", grade: "V5", scale: "V-Scale", tries: 7, completed: false, isProject: true, comments: "Dynamic move brutal.", photo: null, projectId: 302, color: "red", wallTypes: ["Overhang"], holdTypes: ["Jugs", "Dyno"] },
    { id: 202, name: "Fun Compression", grade: "V3", scale: "V-Scale", tries: 3, completed: true, isProject: false, comments: "Fun movement.", photo: null, projectId: null, color: "orange", wallTypes: ["Slab"], holdTypes: ["Pinches"] },
  ]},
  { id: 3, date: new Date(Date.now() - 86400000 * 14).toISOString(), duration: 4200, location: "Boulder Barn", climbs: [
    { id: 301, name: "The Sloper Problem", grade: "V4", scale: "V-Scale", tries: 3, completed: false, isProject: true, comments: "First attempt.", photo: null, projectId: 301, color: "blue", wallTypes: ["Overhang"], holdTypes: ["Slopes"] },
    { id: 302, name: "Green Crimpy Arete", grade: "V3", scale: "V-Scale", tries: 4, completed: true, isProject: true, comments: "Finally sent it!", photo: null, projectId: 303, color: "green", wallTypes: ["Slab"], holdTypes: ["Technical", "Pinches"] },
  ]},
];

const KNOWN_GYMS = ["Boulder Barn", "The Crux Gym", "Movement", "Earth Treks"];

// ── STORAGE HELPERS ────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// active:session stays in localStorage (it's device-specific — who is logged in on this browser)
// everything else (accounts, user data) goes to Supabase
const storage = {
  get: async (key) => {
    if (key === "active:session") {
      const val = localStorage.getItem(key);
      return val ? { value: val } : null;
    }
    const { data, error } = await supabase
      .from("kv_store")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },
  set: async (key, value) => {
    if (key === "active:session") {
      localStorage.setItem(key, value);
      return;
    }
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  delete: async (key) => {
    if (key === "active:session") {
      localStorage.removeItem(key);
      return;
    }
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
  },
};

const saveUserData = async (username, data) => {
  try {
    await storage.set(`user:${username}`, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
};

const loadUserData = async (username) => {
  try {
    const result = await storage.get(`user:${username}`);
    return result ? JSON.parse(result.value) : null;
  } catch (e) {
    return null;
  }
};

const saveAccountIndex = async (accounts) => {
  try {
    await storage.set("accounts:index", JSON.stringify(accounts));
  } catch (e) {
    console.error("Account index save failed:", e);
  }
};

const loadAccountIndex = async () => {
  try {
    const result = await storage.get("accounts:index");
    return result ? JSON.parse(result.value) : {};
  } catch (e) {
    return {};
  }
};

const hashPassword = (pw) => {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Small color dot shown next to climb name
const ColorDot = ({ colorId, size = 12 }) => {
  if (!colorId) return null;
  const c = CLIMB_COLORS.find(c => c.id === colorId);
  if (!c) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: 3, flexShrink: 0,
      background: c.hex,
      border: c.id === "white" ? "1.5px solid #c8a882" : "1.5px solid rgba(0,0,0,0.18)",
      display: "inline-block",
    }} title={c.label} />
  );
};

// Tag chips for wall / hold types
const TagChips = ({ wallTypes = [], holdTypes = [] }) => {
  const W = useTheme() || THEMES.espresso;
  if (!wallTypes.length && !holdTypes.length) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {wallTypes.map(t => (
        <span key={t} style={{ background: W.purple, color: W.purpleDark, borderRadius: 5, padding: "1px 6px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t}</span>
      ))}
      {holdTypes.map(t => (
        <span key={t} style={{ background: W.surface2, color: W.textMuted, borderRadius: 5, padding: "1px 6px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{t}</span>
      ))}
    </div>
  );
};

const LocationDropdown = ({ value, onChange, open, setOpen, knownLocations, onRemove }) => {
  const W = useTheme() || THEMES.espresso;
  const filtered = value.trim()
    ? knownLocations.filter(l => l.toLowerCase().includes(value.toLowerCase()))
    : knownLocations;
  const isNew = value.trim() && !knownLocations.some(l => l.toLowerCase() === value.trim().toLowerCase());
  return (
  <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
    <div style={{ display: "flex", alignItems: "center", background: W.surface, border: `2px solid ${open ? W.accent : W.border}`, borderRadius: open && filtered.length ? "12px 12px 0 0" : "12px", overflow: "hidden" }}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="e.g. Boulder Barn" style={{ flex: 1, padding: "11px 14px", background: "transparent", border: "none", outline: "none", color: W.text, fontSize: 14, fontFamily: "inherit" }} />
      {isNew && (
        <button onClick={() => { onChange(value); setOpen(false); }} style={{ background: W.accent, border: "none", padding: "0 14px", alignSelf: "stretch", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>Save</button>
      )}
      <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", padding: "0 12px", cursor: "pointer", color: W.textMuted, fontSize: 14, alignSelf: "stretch" }}>{open ? "▲" : "▼"}</button>
    </div>
    {open && filtered.length > 0 && (
      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: W.surface, border: `2px solid ${W.accent}`, borderTop: "none", borderRadius: "0 0 12px 12px", zIndex: 100, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
        <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Locations</div>
        {filtered.map(loc => (
          <div key={loc} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${W.border}`, background: loc === value ? W.surface2 : "transparent" }}>
            <div onClick={() => { onChange(loc); setOpen(false); }} style={{ flex: 1, padding: "10px 14px", cursor: "pointer", color: W.text, fontSize: 14, fontWeight: loc === value ? 700 : 400 }}>📍 {loc}</div>
            {onRemove && <button onClick={e => { e.stopPropagation(); onRemove(loc); }} style={{ background: "none", border: "none", padding: "0 12px", cursor: "pointer", color: W.textDim, fontSize: 16, lineHeight: 1 }} title="Remove location">×</button>}
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

const SpeedSessionCard = ({ climb, tick, index, totalCount, onAddAttempt, onRemove, onEnd }) => {
  const W = useTheme() || THEMES.espresso;
  const [showForm, setShowForm] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const isEnded = !!climb.endedAt;
  const attempts = climb.attempts || [];
  const lastTs = attempts.length > 0 ? attempts[attempts.length - 1].loggedAt : climb.startedAt;
  const restSec = isEnded ? 0 : Math.max(0, Math.floor((Date.now() - lastTs) / 1000));
  const sessionDurationSec = isEnded
    ? Math.floor((climb.endedAt - climb.startedAt) / 1000)
    : Math.max(0, Math.floor((Date.now() - climb.startedAt) / 1000));
  const validTimes = attempts.filter(a => !a.fell && a.time != null).map(a => a.time);
  const bestTime = validTimes.length ? Math.min(...validTimes) : null;
  const sessionLabel = totalCount > 1 ? `Speed Session ${index + 1}` : "Speed Climb Session";

  const handleAdd = (fell) => {
    if (!fell && !timeInput) return;
    onAddAttempt({ id: Date.now(), time: fell ? null : parseFloat(timeInput), fell, loggedAt: Date.now() });
    setTimeInput("");
    setShowForm(false);
  };

  return (
    <div style={{ borderRadius: 14, border: `2px solid ${W.yellowDark}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
      {/* Header */}
      <div style={{ background: W.yellow, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div style={{ fontSize: 11, fontVariantNumeric: "tabular-nums", fontWeight: 900, color: W.yellowDark, background: `${W.yellowDark}22`, borderRadius: 7, padding: "2px 8px", letterSpacing: 0.5 }}>
              ⏱ {formatDuration(sessionDurationSec)}
            </div>
            {isEnded && <span style={{ background: W.yellowDark, color: W.yellow, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ENDED</span>}
          </div>
          <div style={{ fontWeight: 800, color: W.yellowDark, fontSize: 14 }}>⚡ {sessionLabel}</div>
          {bestTime != null && <div style={{ fontSize: 11, color: W.yellowDark, marginTop: 1 }}>Best: {bestTime.toFixed(2)}s</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: W.yellowDark, fontWeight: 700 }}>{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</span>
          {!isEnded && <button onClick={onEnd} style={{ background: W.yellowDark, border: "none", color: W.yellow, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "4px 8px", borderRadius: 7 }}>End</button>}
          <button onClick={onRemove} style={{ background: "none", border: "none", color: W.yellowDark, fontSize: 16, cursor: "pointer", padding: "0 2px", opacity: 0.6 }} title="Remove">×</button>
        </div>
      </div>

      {/* Attempts list */}
      {attempts.length > 0 && (
        <div style={{ padding: "6px 14px 4px" }}>
          {attempts.map((a, i) => {
            const prevTs = i === 0 ? climb.startedAt : attempts[i - 1].loggedAt;
            const restMs = a.loggedAt - prevTs;
            const restBefore = Math.floor(restMs / 1000);
            return (
              <div key={a.id}>
                {i > 0 && (
                  <div style={{ textAlign: "center", fontSize: 10, color: W.textDim, padding: "2px 0" }}>↕ {formatRestSec(restBefore)} rest</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < attempts.length - 1 ? `1px solid ${W.border}` : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: a.fell ? W.red : W.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                    <span style={{ color: a.fell ? W.redDark : W.greenDark, fontWeight: 800 }}>{a.fell ? "✗" : "✓"}</span>
                  </div>
                  <div style={{ flex: 1, fontWeight: 700, color: a.fell ? W.textDim : W.text, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
                    {a.fell ? "Fell" : `${a.time?.toFixed(2)}s`}
                  </div>
                  {!a.fell && bestTime != null && a.time === bestTime && (
                    <div style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 800 }}>PB</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isEnded && (
        <>
          {/* Rest timer */}
          <div style={{ textAlign: "center", padding: attempts.length > 0 ? "8px 14px" : "12px 14px", background: W.surface2, borderTop: attempts.length > 0 ? `1px solid ${W.border}` : "none" }}>
            <div style={{ fontSize: 10, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
              {attempts.length === 0 ? "Ready to start" : "Resting"}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>
              {formatDuration(restSec)}
            </div>
          </div>

          {/* Add attempt form */}
          {showForm ? (
            <div style={{ padding: "12px 14px", borderTop: `1px solid ${W.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 8 }}>Log Attempt</div>
              <input type="number" min="0" step="0.01" value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="Time in seconds (e.g. 14.83)" autoFocus style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 18, fontWeight: 800, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <button onClick={() => { setShowForm(false); setTimeInput(""); }} style={{ padding: "10px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => handleAdd(true)} style={{ padding: "10px", background: W.red, border: `2px solid ${W.redDark}`, borderRadius: 10, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✗ Fell</button>
                <button onClick={() => handleAdd(false)} disabled={!timeInput} style={{ padding: "10px", background: timeInput ? W.green : W.surface2, border: `2px solid ${timeInput ? W.greenDark : W.border}`, borderRadius: 10, color: timeInput ? W.greenDark : W.textDim, fontWeight: 700, fontSize: 13, cursor: timeInput ? "pointer" : "default" }}>✓ Log</button>
              </div>
            </div>
          ) : (
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${W.border}` }}>
              <button onClick={() => setShowForm(true)} style={{ width: "100%", padding: "10px", background: W.yellow, border: `2px solid ${W.yellowDark}`, borderRadius: 10, color: W.yellowDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ Add Attempt</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const BoulderRopeSessionCard = ({ type, totalSec, activeStart, isEnded, tick, onEnd }) => {
  const W = useTheme() || THEMES.espresso;
  const liveSec = !isEnded && activeStart
    ? Math.max(0, Math.floor((Date.now() - activeStart) / 1000))
    : 0;
  const displaySec = (totalSec || 0) + liveSec;
  const isBoulder = type === "boulder";
  const color     = isBoulder ? W.green  : W.purple;
  const darkColor = isBoulder ? W.greenDark : W.purpleDark;
  const label     = isBoulder ? "🪨 Boulder Session" : "🪢 Rope Session";
  const isActive  = !isEnded && !!activeStart;
  const isPaused  = !isEnded && !activeStart;
  return (
    <div style={{ borderRadius: 14, border: `2px solid ${darkColor}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
      <div style={{ background: color, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
            <div style={{ fontWeight: 800, color: darkColor, fontSize: 14 }}>{label}</div>
            {isEnded  && <span style={{ background: darkColor, color: color, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ENDED</span>}
            {isActive && <span style={{ background: `${darkColor}33`, color: darkColor, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
            {isPaused && (totalSec || 0) > 0 && <span style={{ background: `${darkColor}22`, color: darkColor, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: darkColor, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1.2 }}>⏱ {formatDuration(displaySec)}</div>
          {isPaused && (totalSec || 0) === 0 && <div style={{ fontSize: 10, color: darkColor, opacity: 0.6, marginTop: 2 }}>Timer starts when you begin climbing</div>}
        </div>
        <div>
          {!isEnded && <button onClick={onEnd} style={{ background: darkColor, border: "none", color: color, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 12px", borderRadius: 8 }}>End</button>}
        </div>
      </div>
    </div>
  );
};

const ActiveClimbCard = ({ climb, onEdit, onStartClimbing, onEndAttempt, onUpdateTries, onToggleCompleted, onLogRope, onRemove, onLightbox, onPauseClimb, onResumeClimb, onStopClimb, tick }) => {
  const W = useTheme() || THEMES.espresso;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showRopeLog, setShowRopeLog] = useState(false);
  const [ropeLogFalls, setRopeLogFalls] = useState(0);
  const [ropeLogTakes, setRopeLogTakes] = useState(0);
  const [ropeLogTopped, setRopeLogTopped] = useState(false);
  const isFlash = climb.completed && climb.tries === 0;
  const isRope = climb.climbType === "rope";
  const restSec = !climb.climbingStartedAt && !climb.paused && climb.lastAttemptEndedAt
    ? Math.max(0, Math.floor((Date.now() - climb.lastAttemptEndedAt) / 1000)) : null;
  const showReady = restSec !== null && restSec >= 180;
  const totalWorkedMs = !isRope ? (climb.attemptLog || []).reduce((sum, a) => sum + a.duration, 0)
    + (climb.climbingStartedAt ? Date.now() - climb.climbingStartedAt : 0) : 0;

  const handleDone = () => { onEndAttempt(climb.id); setShowRopeLog(true); setRopeLogFalls(0); setRopeLogTakes(0); setRopeLogTopped(false); };
  const handleRopeSave = () => { onLogRope(climb.id, ropeLogFalls, ropeLogTakes, ropeLogTopped); setShowRopeLog(false); };

  return (
    <div style={{ background: W.surface, borderRadius: 14, border: `2px solid ${climb.completed ? W.greenDark : W.border}`, marginBottom: 10, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
        {climb.photo
          ? <div onClick={() => onLightbox({ photos: [{ src: climb.photo, grade: climb.grade, name: climb.name, colorId: climb.color }], idx: 0 })} style={{ width: 44, height: 44, borderRadius: 8, overflow: "hidden", flexShrink: 0, cursor: "pointer", border: `1.5px solid ${W.border}` }}><img src={climb.photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /></div>
          : <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, background: getGradeColor(climb.grade) + "30", color: getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}60` }}>{climb.grade}</div>
              {!climb.completed && !isRope && totalWorkedMs > 5000 && (
                <div style={{ fontSize: 9, color: W.textDim, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatDuration(Math.floor(totalWorkedMs / 1000))}</div>
              )}
            </div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {climb.color && <ColorDot colorId={climb.color} size={11} />}
            <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{climb.name || climb.grade}</span>
            {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
            {isFlash && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
            {isRope && climb.ropeStyle && <span style={{ background: W.purple, color: W.purpleDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{climb.ropeStyle === "top-rope" ? "🔝 TR" : "🧗 Lead"}</span>}
          </div>
          {climb.comments && <div style={{ fontSize: 11, color: W.textDim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
          <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => onEdit(climb)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
          <button onClick={() => setConfirmRemove(true)} style={{ background: "none", border: "none", color: W.redDark, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>🗑</button>
        </div>
      </div>

      {/* Boulder action bar */}
      {!isRope && (
        <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${W.border}`, background: climb.completed ? W.green + "55" : W.surface2 }}>
          {climb.climbingStartedAt && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 14px", borderRight: `1px solid ${W.border}` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: W.text, lineHeight: 1 }}>{climb.tries}</div>
                <div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8 }}>{climb.tries === 1 ? "fall" : "falls"}</div>
              </div>
              <button onClick={() => onUpdateTries(climb.id, 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
            </div>
          )}
          <button onClick={() => onToggleCompleted(climb.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${climb.completed ? W.greenDark : W.border}`, background: climb.completed ? W.greenDark : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {climb.completed && <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: climb.completed ? W.greenDark : W.textMuted }}>{climb.completed ? "Sent!" : "Mark Sent"}</span>
              {climb.completed && (climb.attemptLog || []).length > 0 && (
                <span style={{ fontSize: 10, color: W.greenDark, fontWeight: 600, opacity: 0.8 }}>
                  {formatDuration(Math.floor(climb.attemptLog[climb.attemptLog.length - 1].duration / 1000))}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Rope attempt summary bar */}
      {isRope && (climb.tries > 0 || climb.completed) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 14px", borderTop: `1px solid ${W.border}`, background: climb.completed ? W.green + "55" : W.surface2 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: W.text }}>{climb.tries}</div>
            <div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{climb.tries === 1 ? "attempt" : "attempts"}</div>
          </div>
          <div style={{ width: 1, height: 28, background: W.border }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: W.text }}>{climb.falls || 0}</div>
            <div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{(climb.falls || 0) === 1 ? "fall" : "falls"}</div>
          </div>
          {(climb.takes || 0) > 0 && <><div style={{ width: 1, height: 28, background: W.border }} /><div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color: W.text }}>{climb.takes}</div><div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{climb.takes === 1 ? "take" : "takes"}</div></div></>}
          {climb.completed && <><div style={{ width: 1, height: 28, background: W.border }} /><span style={{ background: W.green, color: W.greenDark, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>✓ TOPPED</span></>}
        </div>
      )}

      {/* Timer / rope log area */}
      {!climb.completed && (
        <div style={{ borderTop: `1px solid ${W.border}`, background: climb.climbingStartedAt ? (isRope ? W.purple + "33" : W.green + "44") : W.surface2 }}>
          {showRopeLog ? (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Log This Attempt</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: W.textDim, marginBottom: 4 }}>Falls</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setRopeLogFalls(f => Math.max(0, f - 1))} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 900, color: W.text }}>{ropeLogFalls}</div>
                    <button onClick={() => setRopeLogFalls(f => f + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: W.textDim, marginBottom: 4 }}>Takes</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setRopeLogTakes(t => Math.max(0, t - 1))} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                    <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 900, color: W.text }}>{ropeLogTakes}</div>
                    <button onClick={() => setRopeLogTakes(t => t + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <button onClick={() => setRopeLogTopped(t => !t)} style={{ width: "100%", padding: "8px 12px", background: ropeLogTopped ? W.green : W.surface, border: `2px solid ${ropeLogTopped ? W.greenDark : W.border}`, borderRadius: 10, color: ropeLogTopped ? W.greenDark : W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  {ropeLogTopped ? "✓ Topped!" : "Topped?"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setShowRopeLog(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
                <button onClick={handleRopeSave} style={{ padding: "9px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 10, color: W.purpleDark, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Log Attempt</button>
              </div>
            </div>
          ) : climb.climbingStartedAt ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px" }}>
                <div>
                  <div style={{ fontSize: 9, color: isRope ? W.purpleDark : W.greenDark, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Working on for</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: isRope ? W.purpleDark : W.greenDark, fontVariantNumeric: "tabular-nums" }}>
                    {formatDuration(Math.max(0, Math.floor((Date.now() - climb.climbingStartedAt) / 1000)))}
                  </div>
                </div>
                {isRope
                  ? <button onClick={handleDone} style={{ padding: "8px 16px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 10, color: W.purpleDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Done</button>
                  : <button onClick={() => onStopClimb(climb.id)} style={{ padding: "6px 12px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 9, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✕ Stop</button>
                }
              </div>
              {!isRope && (climb.fallLog || []).length > 0 && (
                <div style={{ padding: "0 14px 8px", display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {climb.fallLog.map((f, i) => (
                    <span key={i} style={{ fontSize: 10, color: W.textDim, background: W.surface, borderRadius: 6, padding: "2px 7px", border: `1px solid ${W.border}` }}>
                      F{i + 1} +{formatDuration(Math.floor(f.intervalMs / 1000))}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : climb.paused ? (
            <div style={{ display: "flex", alignItems: "center", padding: "10px 14px", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>⏸ Paused</div>
                <div style={{ fontSize: 12, color: W.textMuted, marginTop: 1 }}>Attempt tracking paused</div>
              </div>
              <button onClick={() => onResumeClimb(climb.id)} style={{ padding: "7px 14px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 10, color: W.greenDark, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>▶ Resume</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", gap: 8 }}>
              {restSec !== null && (
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: showReady ? W.accent : W.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: showReady ? 700 : 400 }}>{showReady ? "⚡ Ready?" : "Resting"}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: showReady ? W.accent : W.textMuted, fontVariantNumeric: "tabular-nums" }}>{formatDuration(restSec)}</div>
                </div>
              )}
              {!isRope && climb.lastAttemptEndedAt && (
                <button onClick={() => onPauseClimb(climb.id)} title="Pause attempts" style={{ padding: "6px 10px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 8, color: W.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>⏸</button>
              )}
              <button onClick={() => onStartClimbing(climb.id)} style={{ flex: restSec !== null ? "0 0 auto" : 1, padding: "8px 14px", background: isRope ? W.purple : W.green, border: `2px solid ${isRope ? W.purpleDark : W.greenDark}`, borderRadius: 10, color: isRope ? W.purpleDark : W.greenDark, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                {climb.tries === 0 ? (isRope ? "Start Attempt" : "Start Climbing") : "Start Attempt"}
              </button>
            </div>
          )}
          {(climb.attemptLog || []).length > 0 && !showRopeLog && (
            <div style={{ padding: "0 14px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(climb.attemptLog || []).map((a, i) => (
                <span key={i} style={{ fontSize: 10, color: W.textDim, background: W.surface, borderRadius: 6, padding: "2px 7px", border: `1px solid ${W.border}` }}>
                  #{i + 1} {formatDuration(Math.floor(a.duration / 1000))}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmRemove && (
        <div style={{ background: W.red, padding: "10px 14px", borderTop: `1px solid ${W.redDark}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: W.redDark, fontWeight: 700 }}>Remove this climb?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setConfirmRemove(false)} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, cursor: "pointer", fontSize: 12 }}>No</button>
            <button onClick={() => onRemove(climb.id)} style={{ padding: "5px 12px", background: W.redDark, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Yes</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  // ── AUTH STATE ─────────────────────────────────────────────
  const [authScreen, setAuthScreen] = useState("loading"); // loading | login | signup | app
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({ username: "", password: "", confirmPassword: "", displayName: "" });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(""); // "", "saving", "saved", "error"

  // ── APP STATE ──────────────────────────────────────────────
  const [screen, setScreen]           = useState("home");
  const [profileTab, setProfileTab]   = useState("stats");
  const [sessions, setSessions]       = useState([]);
  const [projects, setProjects]       = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [activeSession, setActiveSession]   = useState(null);
  const [sessionTimer, setSessionTimer]     = useState(0);
  const [timerRunning, setTimerRunning]     = useState(false);
  const [sessionActiveStart, setSessionActiveStart] = useState(null);
  const [sessionPausedSec, setSessionPausedSec]     = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [pendingLocation, setPendingLocation] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen]       = useState(false);
  const [activeLocationDropdownOpen, setActiveLocationDropdownOpen] = useState(false);
  const timerRef = useRef(null);
  const fileRef  = useRef();
  const picRef   = useRef();

  const [showClimbForm, setShowClimbForm]       = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [editingClimbId, setEditingClimbId]     = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [preferredScale, setPreferredScale]     = useState("V-Scale");
  const [preferredRopeScale, setPreferredRopeScale] = useState("French");
  const [profilePic, setProfilePic]             = useState(null);
  const [editDisplayName, setEditDisplayName]   = useState("");
  const [customBoulderGrades, setCustomBoulderGrades] = useState([]);
  const [customRopeGrades, setCustomRopeGrades] = useState([]);
  const [customBoulderScaleName, setCustomBoulderScaleName] = useState("Custom");
  const [customRopeScaleName, setCustomRopeScaleName]     = useState("Custom");
  const [customBoulderInput, setCustomBoulderInput]       = useState("");
  const [customRopeInput, setCustomRopeInput]             = useState("");
  const [hiddenLocations, setHiddenLocations]   = useState([]);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [confirmLogout, setConfirmLogout]       = useState(false);
  const [notifPrefsOpen, setNotifPrefsOpen]       = useState(false);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [profileNotifsOpen, setProfileNotifsOpen]   = useState(false);
  const [lightboxPhoto, setLightboxPhoto]           = useState(null); // { photos:[{src,grade,name,colorId}], idx }
  const [feedPage, setFeedPage]                     = useState(1);
  const [logbookPage, setLogbookPage]               = useState(1);
  const [sessionTypes, setSessionTypes]             = useState(["boulder"]);
  const [showMoreClimbTypes, setShowMoreClimbTypes] = useState(false);
  const [colorTheme, setColorTheme]             = useState("espresso");
  const [showEndConfirm, setShowEndConfirm]     = useState(false);
  const [sessionSummary, setSessionSummary]     = useState(null);

  const blankForm = { name: "", grade: GRADES[preferredScale]?.[2] || "V3", scale: preferredScale, isProject: false, comments: "", photo: null, color: null, wallTypes: [], holdTypes: [], climbType: "boulder", ropeStyle: "lead", speedTime: "" };

  const generateInitialSessions = () => {
    const VG  = ["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8"];
    const YDS = ["5.6","5.7","5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b"];
    const BN  = ["The Arete","Corner Problem","Slab Route","Overhang Crux","Crimpy Wall","Pocket Route","Sidepull Sequence","The Bulge","Roof Section","Compression Problem","Warm Up Wall","The Sloper","Dynamic Move","Balance Slab","The Gaston","Heel Hook","Campus Crux","The Pinch","Undercling Traverse","Mantle Shelf","Green V2","Red V3","Blue Problem","Starting Moves","Exit Sequence"];
    const RN  = ["Red 5.10","The Slab Wall","Overhang Lead","Corner Crack","Crimpy Face","Long 5.9","Warm Up Route","Technical Face","The Chimney","Juggy Overhang","Sustained Wall","Arete Route","Pumpy Traverse","Top Rope Warm","Lead Project","Blue 5.9","5.10 Corner","Face Climbing","The Roof Route","Endurance Wall"];
    const SL  = ["Local Gym","The Crux Gym","Boulder Barn","Peak Fitness","Summit Walls"];
    const SC  = ["red","yellow","green","orange","blue","pink","black","white"];
    const ri  = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    const rf  = (a, b) => Math.random() * (b - a) + a;
    const pk  = a => a[ri(0, a.length - 1)];

    // Grade range by months climbed
    const vRange = mo => mo<2?[0,1]:mo<4?[0,2]:mo<7?[1,3]:mo<10?[1,4]:[2,5];
    const rRange = mo => mo<3?[0,2]:mo<6?[1,4]:mo<9?[2,5]:[3,7];
    const sRange = mo => mo<3?[26,44]:mo<6?[21,37]:mo<9?[17,30]:[14,26];

    // Session type probability mix: boulder / rope / speed / mixed(b+r)
    const pickType = mo => {
      const x = Math.random();
      const [b,r,s] = mo<2?[.92,.05,.00]:mo<4?[.76,.10,.04]:mo<7?[.62,.16,.07]:[.55,.20,.09];
      return x<b?"boulder":x<b+r?"rope":x<b+r+s?"speed":"mixed";
    };

    let uid = 400000;
    const nid = () => uid++;

    // Build boulder climbs from timestamp t, return climbs array and end timestamp
    const mkBoulders = (mo, t) => {
      const climbs = [];
      const [minG, maxG] = vRange(mo);
      const count = ri(4, 8);
      for (let i = 0; i < count; i++) {
        t += ri(60, 180) * 1000;                      // walk over, chalk up, study the problem
        const gIdx = ri(minG, maxG);
        const grade = VG[gIdx];
        const isHard = gIdx >= maxG - 1;
        const tries = isHard ? ri(2, 7) : (Math.random() < 0.4 ? 1 : ri(2, 3));
        const completed = tries === 1 ? Math.random() > 0.1 : Math.random() > (isHard ? 0.55 : 0.2);
        const attemptLog = [];
        for (let a = 0; a < tries; a++) {
          const dur = ri(12, isHard ? 70 : 45) * 1000;  // 12-70s per attempt
          attemptLog.push({ startedAt: t, duration: dur });
          t += dur;
          if (a < tries - 1) t += ri(90, 240) * 1000;   // 1.5-4 min rest between attempts
        }
        climbs.push({ id: nid(), name: pk(BN), grade, scale:"V-Scale", tries, completed,
          isProject:false, comments:"", photo:null, projectId:null,
          color:pk(SC), wallTypes:[pk(WALL_TYPES)], holdTypes:[pk(HOLD_TYPES)],
          climbType:"boulder", attemptLog, loggedAt: t });
      }
      return { climbs, endTs: t };
    };

    // Build rope climbs from timestamp t, return climbs array and end timestamp
    const mkRopes = (mo, t) => {
      const climbs = [];
      const [minG, maxG] = rRange(mo);
      const count = ri(2, 5);
      for (let i = 0; i < count; i++) {
        t += ri(300, 600) * 1000;                       // 5-10 min between routes
        const gIdx = ri(minG, maxG);
        const grade = YDS[gIdx];
        const isHard = gIdx >= maxG - 1;
        const tries = isHard ? ri(2, 4) : (Math.random() < 0.5 ? 1 : 2);
        const falls = isHard ? ri(1, tries * 2) : (tries === 1 ? 0 : ri(0, 2));
        const takes = Math.random() > 0.55 ? ri(0, 3) : 0;
        const completed = tries === 1 ? Math.random() > 0.3 : Math.random() > (isHard ? 0.55 : 0.3);
        const ropeStyle = mo < 4 ? "top-rope" : (Math.random() > (mo < 7 ? 0.4 : 0.55) ? "top-rope" : "lead");
        const attemptLog = [];
        for (let a = 0; a < tries; a++) {
          const dur = ri(90, isHard ? 420 : 240) * 1000; // 1.5-7 min on wall
          attemptLog.push({ startedAt: t, duration: dur });
          t += dur;
          if (a < tries - 1) t += ri(300, 720) * 1000;  // 5-12 min rest between attempts
        }
        climbs.push({ id: nid(), name: pk(RN), grade, scale:"YDS", tries, falls, takes, completed,
          isProject:false, comments:"", photo:null, projectId:null,
          color:pk(SC), wallTypes:[pk(WALL_TYPES)], holdTypes:[pk(HOLD_TYPES)],
          climbType:"rope", ropeStyle, attemptLog, loggedAt: t });
      }
      return { climbs, endTs: t };
    };

    // Build a speed session from timestamp t, return as array (1 speed-session climb)
    const mkSpeed = (mo, t) => {
      const [lo, hi] = sRange(mo);
      const count = ri(4, 9);
      const startedAt = t;
      const attempts = [];
      for (let i = 0; i < count; i++) {
        t += (i === 0 ? ri(30, 90) : ri(120, 300)) * 1000; // 30-90s warmup or 2-5 min rest
        const fell = Math.random() < (mo < 4 ? 0.25 : 0.15);
        // Times improve slightly as session goes on
        const progress = i / Math.max(count - 1, 1);
        const time = fell ? null : parseFloat(rf(lo - progress * 2, hi - progress * 2).toFixed(2));
        const dur = (fell ? ri(5, 18) : ri(Math.ceil(lo * 0.7), Math.ceil(hi * 0.9))) * 1000;
        t += dur;
        attempts.push({ id: nid(), time, fell, loggedAt: t });
      }
      const endedAt = t + ri(30, 120) * 1000;
      return [{ id: nid(), climbType:"speed-session", name:"Speed Session",
        attempts, startedAt, loggedAt: endedAt, endedAt,
        tries:0, completed:false, grade:"⚡", scale:"Speed", wallTypes:[], holdTypes:[] }];
    };

    const sessions = [];
    const now   = new Date();
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    let d = new Date(start);

    while (d < now) {
      const mo   = (d - start) / (1000 * 60 * 60 * 24 * 30.4);
      const isWE = d.getDay() === 0 || d.getDay() === 6;
      if (Math.random() < (1.5 / 7) * (isWE ? 2.0 : 0.6)) {
        const sType = pickType(mo);
        const loc   = pk(SL);
        const sTs   = d.getTime() + ri(8, 19) * 3600000;
        let t = sTs + ri(5, 15) * 60 * 1000; // warm-up / arrival time

        let allClimbs = [], boulderStartedAt = null, ropeStartedAt = null;
        let boulderTotalSec = 0, ropeTotalSec = 0;

        if (sType === "boulder" || sType === "mixed") {
          boulderStartedAt = t;
          const { climbs, endTs } = mkBoulders(mo, t);
          allClimbs.push(...climbs);
          boulderTotalSec = Math.round((endTs - boulderStartedAt) / 1000);
          t = endTs;
        }
        if (sType === "rope" || sType === "mixed") {
          if (sType === "mixed") t += ri(1, 5) * 60 * 1000; // transition break
          ropeStartedAt = t;
          const { climbs, endTs } = mkRopes(mo, t);
          allClimbs.push(...climbs);
          ropeTotalSec = Math.round((endTs - ropeStartedAt) / 1000);
          t = endTs;
        }
        if (sType === "speed") {
          const sc = mkSpeed(mo, t);
          allClimbs.push(...sc);
          t = sc[0].endedAt;
        }

        sessions.push({
          id: nid(),
          date: new Date(sTs).toISOString(),
          duration: Math.round((t - sTs) / 1000),
          location: loc,
          climbs: allClimbs,
          ...(boulderStartedAt != null ? { boulderStartedAt, boulderTotalSec } : {}),
          ...(ropeStartedAt    != null ? { ropeStartedAt,  ropeTotalSec  } : {}),
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return sessions.reverse();
  };
  const [climbForm, setClimbForm]   = useState(blankForm);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [logbookFilter, setLogbookFilter]   = useState("all");
  const [logbookScale, setLogbookScale]     = useState("All Scales");
  const [logbookGrade, setLogbookGrade]     = useState("All");
  const [logbookSort, setLogbookSort]       = useState("date");
  const [logbookView, setLogbookView]       = useState("climbs");
  const [logbookFiltersOpen, setLogbookFiltersOpen] = useState(false);
  const [logbookGymFilter, setLogbookGymFilter]     = useState("All Gyms");
  const [sessionTypeFilter, setSessionTypeFilter]   = useState("all");
  const [sessionSort, setSessionSort]               = useState("date");
  const [statsGradeFilter, setStatsGradeFilter]     = useState("All");
  const [statsScaleFilter, setStatsScaleFilter]     = useState("All Scales");
  const [statsTimeFrame, setStatsTimeFrame]         = useState("2w");
  const [statsCategory, setStatsCategory]           = useState(() => localStorage.getItem("statsCategory") || "overall");
  const [statsChart, setStatsChart]                 = useState("time");
  const [statsBarSel, setStatsBarSel]               = useState(null);
  const [statsShowCalendar, setStatsShowCalendar]   = useState(false);
  const [statsCumulative, setStatsCumulative]       = useState(false);
  const [calendarSessionsOpen, setCalendarSessionsOpen] = useState(true);
  const [pieStat, setPieStat]                       = useState("attempts");
  const [pieScale, setPieScale]                     = useState("");
  const [pieHiddenGrades, setPieHiddenGrades]       = useState([]);
  const [pieSelGrade, setPieSelGrade]               = useState(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  // ── SOCIAL STATE ───────────────────────────────────────────
  const [socialFollowing, setSocialFollowing] = useState([]);
  const [socialFollowers, setSocialFollowers] = useState([]);
  const [socialTab, setSocialTab]             = useState("notifications");
  const [socialQuery, setSocialQuery]         = useState("");
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [lbBoard, setLbBoard]                 = useState("time");
  const [lbTimeFrame, setLbTimeFrame]         = useState("all");
  const [socialResults, setSocialResults]     = useState(null); // null = not searched yet
  const [socialFeed, setSocialFeed]           = useState([]);
  const [socialFeedLoading, setSocialFeedLoading] = useState(false);
  const [socialUserList, setSocialUserList]   = useState(null); // null | { type, users }
  const [viewedUser, setViewedUser]           = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(false);
  const [userProfileBackTo, setUserProfileBackTo] = useState("social");
  const [sessionReadOnly, setSessionReadOnly]     = useState(false);
  const [confirmUnfollowUser, setConfirmUnfollowUser] = useState(null); // username pending unfollow confirm
  const [notifications, setNotifications]         = useState([]);
  const [notifCount, setNotifCount]               = useState(0);
  const [showNotifPanel, setShowNotifPanel]       = useState(false);
  const [mutedUsers, setMutedUsers]               = useState([]);
  const [myReactions, setMyReactions]             = useState({}); // { sessionId: emoji }
  const [feedReactionCounts, setFeedReactionCounts] = useState({}); // { sessionId: { "🔥": 2 } }
  const [notifPrefs, setNotifPrefs]               = useState({ follows: true, sessions: true });
  const [isPrivate, setIsPrivate]                 = useState(false);
  const [pendingFollowRequests, setPendingFollowRequests] = useState([]); // usernames I've requested
  const [myFollowRequests, setMyFollowRequests]   = useState([]); // incoming requests to me
  const [commentPanelId, setCommentPanelId]       = useState(null); // sessionId with open comments
  const [sessionComments, setSessionComments]     = useState({}); // { sessionId: [comments] }
  const [commentText, setCommentText]             = useState("");
  const [commentLoading, setCommentLoading]       = useState(false);
  const [commentPanelOwner, setCommentPanelOwner] = useState(null); // username of session owner

  // ── INIT: check for existing session ──────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionResult = await storage.get("active:session");
        if (sessionResult) {
          const { username, userData: cachedData } = JSON.parse(sessionResult.value);
          // Always load fresh data from Supabase so following/sessions are never stale
          const freshData = await loadUserData(username).catch(() => null);
          const userData = freshData || cachedData;
          setCurrentUser({ username, ...userData.profile });
          setSessions(userData.sessions || []);
          setProjects(userData.projects || []);
          setPreferredScale(userData.profile?.preferredScale || "V-Scale");
          setPreferredRopeScale(userData.profile?.preferredRopeScale || "French");
          setProfilePic(userData.profile?.profilePic || null);
          setEditDisplayName(userData.profile?.displayName || username);
          setCustomBoulderGrades(userData.profile?.customBoulderGrades || []);
          setCustomRopeGrades(userData.profile?.customRopeGrades || []);
          setCustomBoulderScaleName(userData.profile?.customBoulderScaleName || "Custom");
          setCustomRopeScaleName(userData.profile?.customRopeScaleName || "Custom");
          setCustomBoulderInput((userData.profile?.customBoulderGrades || []).join(", "));
          setCustomRopeInput((userData.profile?.customRopeGrades || []).join(", "));
          setHiddenLocations(userData.profile?.hiddenLocations || []);
          setSocialFollowing(userData.profile?.following || []);
          setColorTheme(userData.profile?.colorTheme || "espresso");
          setMutedUsers(userData.profile?.mutedUsers || []);
          setNotifPrefs(userData.profile?.notifPrefs || { follows: true, sessions: true });
          setIsPrivate(userData.profile?.isPrivate || false);
          storage.get(`followers:${username}`).then(r => setSocialFollowers(r ? JSON.parse(r.value) : [])).catch(() => {});
          loadNotifications(username).then(n => { setNotifications(n); setNotifCount(n.filter(x => !x.read).length); }).catch(() => {});
          loadMyReactions(username).then(setMyReactions).catch(() => {});
          setPendingFollowRequests(userData.profile?.pendingFollowRequests || []);
          storage.get(`followRequests:${username}`).then(r => setMyFollowRequests(r ? JSON.parse(r.value) : [])).catch(() => {});
          setAuthScreen("app");
        } else {
          setAuthScreen("login");
        }
      } catch (e) {
        setAuthScreen("login");
      }
    };
    checkSession();
  }, []);

  // ── AUTO-SAVE when sessions/projects change ────────────────
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (authScreen !== "app" || !currentUser) return;
    clearTimeout(saveTimeoutRef.current);
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      const userData = {
        profile: { displayName: editDisplayName || currentUser.displayName, preferredScale, preferredRopeScale, profilePic, customBoulderGrades, customRopeGrades, customBoulderScaleName, customRopeScaleName, hiddenLocations, following: socialFollowing, colorTheme, mutedUsers, notifPrefs, isPrivate, pendingFollowRequests },
        sessions,
        projects,
      };
      const ok = await saveUserData(currentUser.username, userData);
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 1000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [sessions, projects, editDisplayName, preferredScale, preferredRopeScale, profilePic, customBoulderGrades, customRopeGrades, customBoulderScaleName, customRopeScaleName, hiddenLocations, socialFollowing, colorTheme, mutedUsers, notifPrefs, isPrivate, pendingFollowRequests]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setSessionTimer(sessionActiveStart
          ? Math.floor((Date.now() - sessionActiveStart) / 1000) + sessionPausedSec
          : sessionPausedSec);
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, sessionActiveStart, sessionPausedSec]);

  // ── AUTH HANDLERS ──────────────────────────────────────────
  const handleSignup = async () => {
    setAuthError("");
    const { username, password, confirmPassword, displayName } = authForm;
    if (!username.trim()) return setAuthError("Username is required.");
    if (username.length < 3) return setAuthError("Username must be at least 3 characters.");
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return setAuthError("Username can only contain letters, numbers, and underscores.");
    if (!password) return setAuthError("Password is required.");
    if (password.length < 6) return setAuthError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setAuthError("Passwords do not match.");

    setAuthLoading(true);
    try {
      const accounts = await loadAccountIndex();
      if (accounts[username.toLowerCase()]) {
        setAuthLoading(false);
        return setAuthError("Username already taken. Please choose another.");
      }

      const userData = {
        profile: { displayName: displayName.trim() || username },
        sessions: generateInitialSessions(),
        projects: [],
      };
      await saveUserData(username.toLowerCase(), userData);
      accounts[username.toLowerCase()] = { hash: hashPassword(password), displayName: displayName.trim() || username };
      await saveAccountIndex(accounts);

      const user = { username: username.toLowerCase(), displayName: displayName.trim() || username };
      await storage.set("active:session", JSON.stringify({ username: username.toLowerCase(), userData }));
      setCurrentUser(user);
      setSessions(userData.sessions);
      setProjects(userData.projects);
      setAuthScreen("app");
    } catch (e) {
      setAuthError("Something went wrong. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleLogin = async () => {
    setAuthError("");
    const { username, password } = authForm;
    if (!username.trim()) return setAuthError("Username is required.");
    if (!password) return setAuthError("Password is required.");

    setAuthLoading(true);
    try {
      const accounts = await loadAccountIndex();
      const account = accounts[username.toLowerCase()];
      if (!account) {
        setAuthLoading(false);
        return setAuthError("No account found with that username.");
      }
      if (account.hash !== hashPassword(password)) {
        setAuthLoading(false);
        return setAuthError("Incorrect password.");
      }

      const userData = await loadUserData(username.toLowerCase());
      const safeData = userData || { profile: { displayName: account.displayName }, sessions: [], projects: [] };
      await storage.set("active:session", JSON.stringify({ username: username.toLowerCase(), userData: safeData }));

      setCurrentUser({ username: username.toLowerCase(), displayName: safeData.profile?.displayName || username });
      setSessions(safeData.sessions || []);
      setProjects(safeData.projects || []);
      setPreferredScale(safeData.profile?.preferredScale || "V-Scale");
      setPreferredRopeScale(safeData.profile?.preferredRopeScale || "French");
      setProfilePic(safeData.profile?.profilePic || null);
      setCustomBoulderGrades(safeData.profile?.customBoulderGrades || []);
      setCustomRopeGrades(safeData.profile?.customRopeGrades || []);
      setCustomBoulderScaleName(safeData.profile?.customBoulderScaleName || "Custom");
      setCustomRopeScaleName(safeData.profile?.customRopeScaleName || "Custom");
      setCustomBoulderInput((safeData.profile?.customBoulderGrades || []).join(", "));
      setCustomRopeInput((safeData.profile?.customRopeGrades || []).join(", "));
      setEditDisplayName(safeData.profile?.displayName || username.toLowerCase());
      setHiddenLocations(safeData.profile?.hiddenLocations || []);
      setSocialFollowing(safeData.profile?.following || []);
      setColorTheme(safeData.profile?.colorTheme || "espresso");
      setMutedUsers(safeData.profile?.mutedUsers || []);
      setNotifPrefs(safeData.profile?.notifPrefs || { follows: true, sessions: true });
      setIsPrivate(safeData.profile?.isPrivate || false);
      storage.get(`followers:${username.toLowerCase()}`).then(r => setSocialFollowers(r ? JSON.parse(r.value) : [])).catch(() => {});
      loadNotifications(username.toLowerCase()).then(n => { setNotifications(n); setNotifCount(n.filter(x => !x.read).length); }).catch(() => {});
      loadMyReactions(username.toLowerCase()).then(setMyReactions).catch(() => {});
      setPendingFollowRequests(safeData.profile?.pendingFollowRequests || []);
      storage.get(`followRequests:${username.toLowerCase()}`).then(r => setMyFollowRequests(r ? JSON.parse(r.value) : [])).catch(() => {});
      setAuthScreen("app");
    } catch (e) {
      setAuthError("Something went wrong. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try { await storage.delete("active:session"); } catch (e) {}
    setCurrentUser(null);
    setSessions([]);
    setProjects([]);
    setScreen("home");
    setAuthForm({ username: "", password: "", confirmPassword: "", displayName: "" });
    setAuthError("");
    setPreferredScale("V-Scale");
    setHiddenLocations([]);
    setColorTheme("espresso");
    setNotifications([]);
    setNotifCount(0);
    setShowNotifPanel(false);
    setConfirmUnfollowUser(null);
    setMutedUsers([]);
    setMyReactions({});
    setNotifPrefs({ follows: true, sessions: true });
    setIsPrivate(false);
    setSocialFollowing([]);
    setSocialFollowers([]);
    setSocialResults(null);
    setSocialFeed([]);
    setSocialUserList(null);
    setViewedUser(null);
    setPendingFollowRequests([]);
    setMyFollowRequests([]);
    setFeedReactionCounts({});
    setCommentPanelId(null);
    setCommentPanelOwner(null);
    setSessionComments({});
    setCommentText("");
    setShowAccountPanel(false);
    setConfirmLogout(false);
    setProfilePic(null);
    setPreferredRopeScale("French");
    setCustomBoulderGrades([]);
    setCustomRopeGrades([]);
    setCustomBoulderScaleName("Custom");
    setCustomRopeScaleName("Custom");
    setCustomBoulderInput("");
    setCustomRopeInput("");
    setAuthScreen("login");
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2, sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        setProfilePic(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const W = THEMES[colorTheme] || THEMES.espresso;

  // ── APP LOGIC ──────────────────────────────────────────────
  const knownLocations = [...new Set([...KNOWN_GYMS, ...sessions.map(s => s.location).filter(Boolean)])].filter(l => !hiddenLocations.includes(l));
  const allGyms = ["All Gyms", ...new Set(sessions.map(s => s.location).filter(Boolean))];

  const goToSessionSetup = () => { setPendingLocation(""); setSessionStarted(false); setActiveSession({ location: "", climbs: [] }); setSessionTimer(0); setSessionActiveStart(null); setSessionPausedSec(0); setShowMoreClimbTypes(false); setScreen("session"); };
  const beginTimer = () => { setActiveSession(s => ({ ...s, location: pendingLocation, sessionTypes })); setSessionStarted(true); setSessionActiveStart(Date.now()); setTimerRunning(true); setShowMoreClimbTypes(false); };
  const toggleSessionTimer = () => {
    if (timerRunning) {
      setSessionPausedSec(s => s + (sessionActiveStart ? Math.floor((Date.now() - sessionActiveStart) / 1000) : 0));
      setSessionActiveStart(null);
      setTimerRunning(false);
    } else {
      setSessionActiveStart(Date.now());
      setTimerRunning(true);
    }
  };
  const addSpeedSession = () => {
    const now = Date.now();
    setActiveSession(s => ({ ...s, climbs: [...s.climbs, { id: now, climbType: "speed-session", name: "Speed Session", attempts: [], startedAt: now, loggedAt: now, tries: 0, completed: false, grade: "⚡", scale: "Speed", wallTypes: [], holdTypes: [] }] }));
  };
  const addSpeedAttempt = (climbId, attempt) => {
    setActiveSession(s => ({ ...s, climbs: s.climbs.map(c => c.id === climbId ? { ...c, attempts: [...(c.attempts || []), attempt] } : c) }));
  };
  const removeSpeedSession = (climbId) => {
    setActiveSession(s => ({ ...s, climbs: s.climbs.filter(c => c.id !== climbId) }));
  };
  const endSpeedSession = (climbId) => {
    setActiveSession(s => ({ ...s, climbs: s.climbs.map(c => c.id === climbId ? { ...c, endedAt: Date.now() } : c) }));
  };
  const startClimbing = (climbId) => setActiveSession(s => {
    const climb = s.climbs.find(c => c.id === climbId);
    if (!climb) return s;
    const type = climb.climbType === "rope" ? "rope" : "boulder";
    const other = type === "boulder" ? "rope" : "boulder";
    const now = Date.now();
    const updates = {};
    // Pause the other type if it's currently active
    const otherStart = s[`${other}ActiveStart`];
    if (otherStart) {
      const elapsed = Math.max(0, Math.floor((now - otherStart) / 1000));
      updates[`${other}TotalSec`] = (s[`${other}TotalSec`] || 0) + elapsed;
      updates[`${other}ActiveStart`] = null;
    }
    // Start this type's active timer only if not already running (keep it continuous between attempts)
    if (!s[`${type}ActiveStart`]) updates[`${type}ActiveStart`] = now;
    // Stop any other active climb timer; clear rest timers on others
    return {
      ...s, ...updates,
      climbs: s.climbs.map(c =>
        c.id === climbId
          ? { ...c, climbingStartedAt: now }
          : c.climbingStartedAt && !c.completed
            ? { ...c, climbingStartedAt: null }
            : c
      ),
    };
  });
  const endBoulderSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.boulderActiveStart ? Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)) : 0;
    return { ...s, boulderTotalSec: (s.boulderTotalSec || 0) + elapsed, boulderActiveStart: null, boulderEndedAt: now };
  });
  const endRopeSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.ropeActiveStart ? Math.max(0, Math.floor((now - s.ropeActiveStart) / 1000)) : 0;
    return { ...s, ropeTotalSec: (s.ropeTotalSec || 0) + elapsed, ropeActiveStart: null, ropeEndedAt: now };
  });
  // Stops the per-climb timer without logging tries (used for rope "Done" button)
  // Type section timer keeps running — it only pauses when switching types or ending the section
  const endClimbAttempt = (id) => setActiveSession(s => {
    const climb = s.climbs.find(c => c.id === id);
    if (!climb || !climb.climbingStartedAt) return s;
    const now = Date.now();
    const duration = now - climb.climbingStartedAt;
    return {
      ...s,
      climbs: s.climbs.map(c => c.id === id ? { ...c, climbingStartedAt: null, lastAttemptEndedAt: now, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration }] } : c),
    };
  });
  // Commits a rope attempt: +1 try, adds falls and takes, sets topped
  const logRopeAttempt = (id, falls, takes, topped) => setActiveSession(s => ({
    ...s,
    climbs: s.climbs.map(c => c.id === id ? { ...c, tries: (c.tries || 0) + 1, falls: (c.falls || 0) + falls, takes: (c.takes || 0) + takes, completed: topped } : c),
  }));
  // Pauses attempt tracking on a boulder climb (hides rest timer)
  const pauseClimb = (id) => setActiveSession(s => ({
    ...s,
    climbs: s.climbs.map(c => c.id === id ? { ...c, paused: true } : c),
  }));
  // Resumes attempt tracking on a paused boulder climb
  const resumeClimb = (id) => setActiveSession(s => ({
    ...s,
    climbs: s.climbs.map(c => c.id === id ? { ...c, paused: false } : c),
  }));
  // Stops the boulder climb timer without marking as sent (gave up / moving on)
  const stopBoulderClimb = (id) => setActiveSession(s => {
    const climb = s.climbs.find(c => c.id === id);
    if (!climb || !climb.climbingStartedAt) return s;
    const now = Date.now();
    const duration = now - climb.climbingStartedAt;
    return {
      ...s,
      climbs: s.climbs.map(c => c.id === id
        ? { ...c, climbingStartedAt: null, lastAttemptEndedAt: now, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration, falls: c.tries }] }
        : c),
    };
  });
  const endSession = () => {
    if (!activeSession) return;
    const now = Date.now();
    let final = { ...activeSession };
    // Flush any active type timers
    if (final.boulderActiveStart) {
      final.boulderTotalSec = (final.boulderTotalSec || 0) + Math.max(0, Math.floor((now - final.boulderActiveStart) / 1000));
      final.boulderActiveStart = null;
    }
    if (final.ropeActiveStart) {
      final.ropeTotalSec = (final.ropeTotalSec || 0) + Math.max(0, Math.floor((now - final.ropeActiveStart) / 1000));
      final.ropeActiveStart = null;
    }
    const finalDuration = sessionActiveStart ? Math.floor((now - sessionActiveStart) / 1000) + sessionPausedSec : sessionPausedSec;
    const completed = { id: now, date: new Date().toISOString(), duration: finalDuration, location: final.location || pendingLocation || "Unknown Gym", climbs: final.climbs, boulderTotalSec: final.boulderTotalSec || 0, ropeTotalSec: final.ropeTotalSec || 0, boulderStartedAt: final.boulderStartedAt, ropeStartedAt: final.ropeStartedAt };
    setSessions(prev => [completed, ...prev]);
    const sentProjectIds = final.climbs.filter(c => c.isProject && c.completed && c.projectId).map(c => c.projectId);
    if (sentProjectIds.length > 0) {
      setProjects(prev => prev.map(p => sentProjectIds.includes(p.id) ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));
    }
    setSessionSummary(completed);
    setTimerRunning(false); setSessionActiveStart(null); setSessionPausedSec(0); setActiveSession(null); setSessionTimer(0); setSessionStarted(false); setPendingLocation(""); setShowEndConfirm(false); setScreen("sessionSummary");
  };
  const deleteSession = (id) => { setSessions(prev => prev.filter(s => s.id !== id)); setScreen("profile"); setProfileTab("logbook"); };
  const discardSession = () => {
    if (!sessionSummary) return;
    setSessions(prev => prev.filter(s => s.id !== sessionSummary.id));
    const sentProjectIds = sessionSummary.climbs.filter(c => c.isProject && c.completed && c.projectId).map(c => c.projectId);
    if (sentProjectIds.length > 0) {
      setProjects(prev => prev.map(p => sentProjectIds.includes(p.id) ? { ...p, completed: false, active: true, dateSent: null } : p));
    }
    setSessionSummary(null); setScreen("home");
  };

  const updateActiveClimbTries = (id, delta) => setActiveSession(s => {
    const climb = s.climbs.find(c => c.id === id);
    if (!climb) return s;
    const newTries = Math.max(0, climb.tries + delta);
    let climbUpdates = { tries: newTries };
    if (delta > 0 && climb.climbingStartedAt) {
      const now = Date.now();
      // Boulder: record fall interval, keep timer and boulder section timer running
      const lastFallAt = (climb.fallLog || []).length > 0
        ? climb.fallLog[climb.fallLog.length - 1].at
        : climb.climbingStartedAt;
      climbUpdates = { ...climbUpdates, fallLog: [...(climb.fallLog || []), { at: now, intervalMs: now - lastFallAt }] };
      // climbingStartedAt stays set — timer keeps running
    }
    return { ...s, climbs: s.climbs.map(c => c.id === id ? { ...c, ...climbUpdates } : c) };
  });
  const toggleActiveClimbCompleted = (id) => setActiveSession(s => {
    const climb = s.climbs.find(c => c.id === id);
    if (!climb) return s;
    const newCompleted = !climb.completed;
    let climbUpdates = { completed: newCompleted };
    if (newCompleted && climb.climbingStartedAt) {
      const now = Date.now();
      const duration = now - climb.climbingStartedAt;
      climbUpdates = { ...climbUpdates, climbingStartedAt: null, sentAt: now,
        attemptLog: [...(climb.attemptLog || []), { startedAt: climb.climbingStartedAt, duration }] };
      // Boulder section timer keeps running — don't flush it here
    }
    return { ...s, climbs: s.climbs.map(c => c.id === id ? { ...c, ...climbUpdates } : c) };
  });
  const removeClimbFromActive      = (id) => setActiveSession(s => ({ ...s, climbs: s.climbs.filter(c => c.id !== id) }));
  const removeClimbFromSession     = (sessionId, climbId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: s.climbs.filter(c => c.id !== climbId) } : s));
    setSelectedSession(prev => ({ ...prev, climbs: prev.climbs.filter(c => c.id !== climbId) }));
  };

  const openClimbForm = (existing = null, fromProject = null, climbType = "boulder") => {
    if (existing) {
      // Auto-stop climb timer when opening edit form
      if (existing.climbingStartedAt && activeSession) {
        const now = Date.now();
        const type = existing.climbType === "rope" ? "rope" : "boulder";
        const duration = now - existing.climbingStartedAt;
        setActiveSession(s => {
          const activeStart = s[`${type}ActiveStart`];
          const elapsed = activeStart ? Math.max(0, Math.floor((now - activeStart) / 1000)) : 0;
          return {
            ...s,
            [`${type}TotalSec`]: (s[`${type}TotalSec`] || 0) + elapsed,
            [`${type}ActiveStart`]: null,
            climbs: s.climbs.map(c => c.id === existing.id ? { ...c, climbingStartedAt: null, lastAttemptEndedAt: now, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration }] } : c),
          };
        });
      }
      setEditingClimbId(existing.id);
      setClimbForm({ name: existing.name || "", grade: existing.grade, scale: existing.scale, isProject: existing.isProject, comments: existing.comments, photo: existing.photo, projectId: existing.projectId, tries: existing.tries, completed: existing.completed, color: existing.color || null, wallTypes: existing.wallTypes || [], holdTypes: existing.holdTypes || [], climbType: existing.climbType || "boulder", ropeStyle: existing.ropeStyle || "lead", speedTime: existing.speedTime || "" });
      setPhotoPreview(existing.photo);
    } else if (fromProject) {
      setEditingClimbId(null);
      setClimbForm({ ...blankForm, name: fromProject.name || "", grade: fromProject.grade, scale: fromProject.scale, isProject: true, comments: fromProject.comments || "", projectId: fromProject.id });
      setPhotoPreview(null);
    } else {
      setEditingClimbId(null);
      const ropeInitScale = preferredRopeScale;
      const ropeGradeList = preferredRopeScale === "Custom" ? customRopeGrades : (ROPE_GRADES[ropeInitScale] || ROPE_GRADES["French"]);
      const ropeInitGrade = ropeGradeList[Math.floor(ropeGradeList.length / 2)] || ropeGradeList[0] || "5.9";
      const boulderGradeList = preferredScale === "Custom" ? customBoulderGrades : (GRADES[preferredScale] || GRADES["V-Scale"]);
      setClimbForm({ ...blankForm, climbType, scale: climbType === "rope" ? ropeInitScale : preferredScale, grade: climbType === "rope" ? ropeInitGrade : (boulderGradeList[2] || boulderGradeList[0] || "V3") });
      setPhotoPreview(null);
    }
    setShowClimbForm(true);
  };

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const saveClimbToActiveSession = () => {
    if (editingClimbId) {
      setActiveSession(s => ({ ...s, climbs: s.climbs.map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) }));
    } else {
      const pid = climbForm.isProject ? (climbForm.projectId || Date.now() + 1) : null;
      const speedGrade = climbForm.climbType === "speed" ? (climbForm.speedTime ? climbForm.speedTime + "s" : "—") : undefined;
      const newClimb = { ...climbForm, photo: photoPreview, projectId: pid, id: Date.now(), loggedAt: Date.now(), tries: climbForm.climbType === "speed" ? 1 : 0, completed: climbForm.climbType === "speed" ? climbForm.completed : false, ...(speedGrade ? { grade: speedGrade, scale: "Speed" } : {}) };
      if (newClimb.isProject && !climbForm.projectId) setProjects(prev => [...prev, { id: pid, name: newClimb.name, grade: newClimb.grade, scale: newClimb.scale, comments: newClimb.comments, active: true, completed: false, dateAdded: new Date().toISOString(), dateSent: null }]);
      setActiveSession(s => {
        const now = Date.now();
        const typeUpdates = {};
        if (newClimb.climbType === "boulder" && !s.boulderStartedAt) { typeUpdates.boulderStartedAt = now; typeUpdates.boulderTotalSec = 0; }
        if (newClimb.climbType === "rope"    && !s.ropeStartedAt)    { typeUpdates.ropeStartedAt    = now; typeUpdates.ropeTotalSec    = 0; }
        return { ...s, ...typeUpdates, climbs: [...s.climbs, newClimb] };
      });
    }
    setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); setClimbForm(blankForm);
  };

  const saveClimbToFinishedSession = (sessionId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: s.climbs.map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) } : s));
    setSelectedSession(prev => ({ ...prev, climbs: prev.climbs.map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) }));
    if (climbForm.isProject && climbForm.completed && climbForm.projectId) setProjects(prev => prev.map(p => p.id === climbForm.projectId ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));
    setEditingClimbId(null); setEditingSessionId(null); setShowClimbForm(false);
  };

  const deactivateProject = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, active: false } : p));
  const reactivateProject  = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, active: true, completed: false, dateSent: null } : p));
  const markProjectSent    = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));

  const allClimbs      = sessions.flatMap(s => s.climbs);
  const activeProjects = projects.filter(p => p.active && !p.completed);
  const completedProjects = projects.filter(p => p.completed);
  const retiredProjects   = projects.filter(p => !p.active && !p.completed);
  const climbDates     = sessions.map(s => s.date);

  const resolveScaleName = (scale, climbType) => {
    if (scale !== "Custom") return scale;
    return climbType === "rope" ? customRopeScaleName : customBoulderScaleName;
  };

  const getGradeIndex = (grade, scale) => {
    if (scale === "Custom") {
      const i = customBoulderGrades.indexOf(grade);
      if (i !== -1) return i;
      return customRopeGrades.indexOf(grade);
    }
    return (GRADES[scale] || ROPE_GRADES[scale] || GRADES["V-Scale"]).indexOf(grade);
  };

  const getTimeframeSessions = () => {
    const cutoffs = { "2w": 14, "1m": 30, "6m": 182, "1y": 365 };
    const days = cutoffs[statsTimeFrame];
    if (!days) return sessions;
    const cutoff = Date.now() - days * 86400000;
    return sessions.filter(s => new Date(s.date).getTime() >= cutoff);
  };

  const getStats = (overrideSessions) => {
    const tfSessions = overrideSessions !== undefined ? overrideSessions : getTimeframeSessions();
    const tfClimbs = tfSessions.flatMap(s => s.climbs);
    const base = tfClimbs.filter(c => (statsScaleFilter === "All Scales" || c.scale === statsScaleFilter) && (statsGradeFilter === "All" || c.grade === statsGradeFilter));
    const completed = base.filter(c => c.completed);
    const flashes   = completed.filter(c => c.tries === 0);
    const flashRate = base.length ? Math.round((flashes.length / base.length) * 100) : 0;
    const avgTries  = base.length ? (base.reduce((a, c) => a + c.tries, 0) / base.length).toFixed(1) : "—";
    const vBase     = tfClimbs.filter(c => c.completed && c.scale === preferredScale);
    const boulderGradeList = preferredScale === "Custom" ? customBoulderGrades : (GRADES[preferredScale] || []);
    const bestGrade = vBase.length ? [...vBase].sort((a, b) => boulderGradeList.indexOf(b.grade) - boulderGradeList.indexOf(a.grade))[0]?.grade : "—";
    const statsCustomGrades = [...new Set([...customBoulderGrades, ...customRopeGrades])];
    const gradeScaleList = statsScaleFilter === "Custom" ? statsCustomGrades : (GRADES[statsScaleFilter] || []);
    const gradeBreakdown = gradeScaleList.length > 0
      ? gradeScaleList.map(g => ({ grade: g, count: completed.filter(c => c.grade === g).length })).filter(g => g.count > 0)
      : [...new Set(completed.map(c => c.grade))].map(g => ({ grade: g, count: completed.filter(c => c.grade === g).length }));
    const totalAttempts = base.reduce((a, c) => a + c.tries, 0);
    const totalFalls = base.reduce((a, c) => a + (c.climbType === "rope" ? (c.falls ?? c.tries) : c.tries), 0);
    const avgFalls = base.length ? (totalFalls / base.length).toFixed(1) : "—";
    const climbsByDay = {}, attemptsByDay = {}, fallsByDay = {};
    tfSessions.forEach(s => { const day = s.date.slice(0, 10); climbsByDay[day] = (climbsByDay[day] || 0) + s.climbs.length; attemptsByDay[day] = (attemptsByDay[day] || 0) + s.climbs.reduce((t,c)=>t+c.tries,0); fallsByDay[day] = (fallsByDay[day] || 0) + s.climbs.reduce((t,c)=>t+(c.climbType==="rope"?(c.falls??c.tries):c.tries),0); });
    const mostInDay = Object.values(climbsByDay).length ? Math.max(...Object.values(climbsByDay)) : 0;
    const mostAttemptsInDay = Object.values(attemptsByDay).length ? Math.max(...Object.values(attemptsByDay)) : 0;
    const mostFallsInDay = Object.values(fallsByDay).length ? Math.max(...Object.values(fallsByDay)) : 0;
    const gymVisits = {};
    tfSessions.forEach(s => { gymVisits[s.location] = (gymVisits[s.location] || 0) + 1; });
    const uniqueGyms = Object.keys(gymVisits).length;
    const mostGymVisits = Object.values(gymVisits).length ? Math.max(...Object.values(gymVisits)) : 0;
    const totalTimeClimbed = tfSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    // Time-between-attempts stats across all sessions
    const allRestGaps = [];
    tfSessions.forEach(s => {
      const ts = s.climbs.map(c => c.loggedAt).filter(t => t).sort((a, b) => a - b);
      for (let i = 1; i < ts.length; i++) allRestGaps.push((ts[i] - ts[i - 1]) / 1000);
    });
    const avgClimbRestSec = allRestGaps.length ? Math.round(allRestGaps.reduce((a, b) => a + b, 0) / allRestGaps.length) : null;
    const maxClimbRestSec = allRestGaps.length ? Math.round(Math.max(...allRestGaps)) : null;
    const sortedSessionDays = [...new Set(tfSessions.map(s => s.date.slice(0, 10)))].sort();
    let restTotal = 0, restCount = 0;
    for (let i = 1; i < sortedSessionDays.length; i++) {
      restTotal += (new Date(sortedSessionDays[i]) - new Date(sortedSessionDays[i - 1])) / 86400000;
      restCount++;
    }
    const avgRestDays = restCount > 0 ? (restTotal / restCount).toFixed(1) : "—";
    const allSpeedAttempts = tfSessions.flatMap(s => s.climbs.filter(c => c.climbType === "speed-session").flatMap(ss => ss.attempts || [])).filter(a => !a.fell && a.time != null);
    const speedPB = allSpeedAttempts.length ? Math.min(...allSpeedAttempts.map(a => a.time)) : null;
    return { base, completed, flashes, flashRate, avgTries, avgFalls, bestGrade, gradeBreakdown, mostInDay, mostAttemptsInDay, mostFallsInDay, totalAttempts, totalFalls, uniqueGyms, mostGymVisits, totalTimeClimbed, sessionCount: tfSessions.length, avgRestDays, avgClimbRestSec, maxClimbRestSec, speedPB };
  };

  const getProjectHistory    = (pid) => sessions.flatMap(s => s.climbs.filter(c => c.projectId === pid).map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location }))).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  const getProjectTotalTries = (pid) => getProjectHistory(pid).reduce((sum, c) => sum + c.tries, 0);

  const getLogbookClimbs = () => {
    let climbs = sessions.flatMap(s => s.climbs.map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location })))
      .filter(c => {
        if (logbookFilter === "completed" && !c.completed) return false;
        if (logbookFilter === "incomplete" && c.completed) return false;
        if (logbookScale !== "All Scales" && c.scale !== logbookScale) return false;
        if (logbookGrade !== "All" && c.grade !== logbookGrade) return false;
        return true;
      });
    if (logbookSort === "hardest") climbs.sort((a, b) => getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale));
    else if (logbookSort === "easiest") climbs.sort((a, b) => getGradeIndex(a.grade, a.scale) - getGradeIndex(b.grade, b.scale));
    else if (logbookSort === "name") climbs.sort((a, b) => (a.name || a.grade).localeCompare(b.name || b.grade));
    else climbs.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
    return climbs;
  };

  const getSessionType = (session) => {
    const types = new Set(session.climbs.map(c => c.climbType === "speed-session" ? "speed" : (c.climbType || "boulder")));
    if (types.size === 0) return "boulder";
    if (types.size === 1) return [...types][0];
    return "mixed";
  };

  const getFilteredSessions = () => {
    let base = logbookGymFilter === "All Gyms" ? [...sessions] : sessions.filter(s => s.location === logbookGymFilter);
    if (sessionTypeFilter !== "all") base = base.filter(s => getSessionType(s) === sessionTypeFilter);
    if (sessionSort === "climbs-desc") return base.sort((a, b) => b.climbs.length - a.climbs.length);
    if (sessionSort === "climbs-asc")  return base.sort((a, b) => a.climbs.length - b.climbs.length);
    if (sessionSort === "attempts-desc") return base.sort((a, b) => b.climbs.reduce((s, c) => s + c.tries, 0) - a.climbs.reduce((s, c) => s + c.tries, 0));
    if (sessionSort === "attempts-asc")  return base.sort((a, b) => a.climbs.reduce((s, c) => s + c.tries, 0) - b.climbs.reduce((s, c) => s + c.tries, 0));
    if (sessionSort === "flashes-desc") return base.sort((a, b) => b.climbs.filter(c => c.completed && c.tries === 0).length - a.climbs.filter(c => c.completed && c.tries === 0).length);
    if (sessionSort === "flashes-asc")  return base.sort((a, b) => a.climbs.filter(c => c.completed && c.tries === 0).length - b.climbs.filter(c => c.completed && c.tries === 0).length);
    return base;
  };

  const getSessionStats = (session) => {
    const climbs = session.climbs.filter(c => c.climbType !== "speed-session");
    const sends = climbs.filter(c => c.completed).length;
    const total  = climbs.length;
    const totalTries = climbs.reduce((s, c) => s + c.tries, 0);
    const flashes    = climbs.filter(c => c.completed && c.tries === 0).length;
    const flashRate  = total ? Math.round((flashes / total) * 100) : 0;
    const avgTries   = total ? (totalTries / total).toFixed(1) : "0";
    const gradeBreakdown = {};
    climbs.forEach(c => { if (!gradeBreakdown[c.grade]) gradeBreakdown[c.grade] = { completed: 0, attempted: 0, tries: 0, scale: c.scale }; gradeBreakdown[c.grade].attempted++; gradeBreakdown[c.grade].tries += (c.tries || 0); if (c.completed) gradeBreakdown[c.grade].completed++; });
    const sortedByGrade = (arr) => [...arr].sort((a, b) => getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale));
    const hardestAttempted = climbs.length ? sortedByGrade(climbs)[0]?.grade : "—";
    const hardestSent = climbs.filter(c => c.completed).length ? sortedByGrade(climbs.filter(c => c.completed))[0]?.grade : "—";
    const loggedTimes = climbs.map(c => c.loggedAt).filter(t => t).sort((a, b) => a - b);
    const restGapsSec = loggedTimes.length > 1 ? loggedTimes.slice(1).map((t, i) => (t - loggedTimes[i]) / 1000) : [];
    const avgAttemptRest = restGapsSec.length ? Math.round(restGapsSec.reduce((a, b) => a + b, 0) / restGapsSec.length) : null;
    const maxAttemptRest = restGapsSec.length ? Math.round(Math.max(...restGapsSec)) : null;
    const minAttemptRest = restGapsSec.length ? Math.round(Math.min(...restGapsSec)) : null;
    const speedSessions = session.climbs.filter(c => c.climbType === "speed-session");
    const speedAttempts = speedSessions.flatMap(s => s.attempts || []).filter(a => !a.fell && a.time != null);
    const speedBest = speedAttempts.length ? Math.min(...speedAttempts.map(a => a.time)) : null;
    return { sends, total, totalTries, flashes, flashRate, avgTries, gradeBreakdown, hardestAttempted, hardestSent, avgAttemptRest, maxAttemptRest, minAttemptRest, speedSessions, speedBest };
  };

  // ── SOCIAL HELPERS ─────────────────────────────────────────
  const loadSocialFeed = async () => {
    if (!currentUser || socialFollowing.length === 0) { setSocialFeed([]); setSocialFeedLoading(false); return; }
    setSocialFeedLoading(true);
    try {
      const feedItems = [];
      const activeFeed = socialFollowing.filter(u => !mutedUsers.includes(u));
      for (const username of activeFeed) {
        const data = await loadUserData(username);
        if (data?.sessions) {
          data.sessions.slice(0, 20).forEach(s =>
            feedItems.push({ ...s, feedUsername: username, feedDisplayName: data.profile?.displayName || username, feedProfilePic: data.profile?.profilePic || null })
          );
        }
      }
      feedItems.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSocialFeed(feedItems);
      // Load aggregate reaction counts for all feed sessions
      Promise.all(feedItems.map(async s => {
        try {
          const r = await storage.get(`sessionReactions:${s.id}`);
          if (!r) return { sessionId: s.id, counts: {} };
          const agg = JSON.parse(r.value);
          const counts = {};
          Object.values(agg).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
          return { sessionId: s.id, counts };
        } catch { return { sessionId: s.id, counts: {} }; }
      })).then(results => {
        const combined = {};
        results.forEach(({ sessionId, counts }) => { combined[sessionId] = counts; });
        setFeedReactionCounts(combined);
      });
      // Session activity notifications (last 24h, no duplicates)
      if (notifPrefs.sessions) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        setNotifications(prev => {
          const newNotifs = feedItems
            .filter(s => new Date(s.date) > oneDayAgo && !prev.some(n => n.type === "session" && n.sessionId === s.id))
            .slice(0, 5)
            .map(s => ({ type: "session", from: s.feedUsername, fromDisplay: s.feedDisplayName, sessionId: s.id, location: s.location, at: s.date, read: false }));
          if (!newNotifs.length) return prev;
          setNotifCount(c => c + newNotifs.length);
          const updated = [...newNotifs, ...prev].slice(0, 50);
          storage.set(`notifications:${currentUser.username}`, JSON.stringify(updated)).catch(() => {});
          return updated;
        });
      }
    } catch (e) { console.error(e); }
    setSocialFeedLoading(false);
  };

  const searchUsers = async () => {
    if (!socialQuery.trim()) return;
    try {
      const accounts = await loadAccountIndex();
      const q = socialQuery.toLowerCase().trim();
      const matched = Object.entries(accounts)
        .filter(([u]) => u !== currentUser.username && u.includes(q))
        .map(([u, data]) => ({ username: u, displayName: data.displayName }));
      setSocialResults(matched); // show names immediately
      // Load stats for each matched user in parallel
      const withStats = await Promise.all(matched.map(async user => {
        try {
          const data = await loadUserData(user.username);
          const uSessions = data?.sessions || [];
          const uClimbs = uSessions.flatMap(s => s.climbs);
          const sent = uClimbs.filter(c => c.completed);
          const bestGrade = sent.length
            ? [...sent].sort((a, b) => (GRADES[b.scale || "V-Scale"] || []).indexOf(b.grade) - (GRADES[a.scale || "V-Scale"] || []).indexOf(a.grade))[0]?.grade
            : null;
          return { ...user, sessionsCount: uSessions.length, climbsCount: uClimbs.length, bestGrade };
        } catch { return user; }
      }));
      setSocialResults(withStats);
    } catch { setSocialResults([]); }
  };

  const loadFollowersStore = async (username) => {
    try {
      const r = await storage.get(`followers:${username}`);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  };

  const updateFollowersStore = async (username, list) => {
    try { await storage.set(`followers:${username}`, JSON.stringify(list)); } catch {}
  };

  const loadNotifications = async (username) => {
    try {
      const r = await storage.get(`notifications:${username}`);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  };

  const addNotification = async (toUsername, notif) => {
    try {
      const existing = await loadNotifications(toUsername);
      const updated = [notif, ...existing].slice(0, 50);
      await storage.set(`notifications:${toUsername}`, JSON.stringify(updated));
    } catch {}
  };

  const loadFollowRequestsFor = async (username) => {
    try {
      const r = await storage.get(`followRequests:${username}`);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  };

  const acceptFollowRequest = async (requesterUsername, requesterDisplay) => {
    // Add to own followers
    const fresh = await loadFollowersStore(currentUser.username);
    if (!fresh.includes(requesterUsername)) await updateFollowersStore(currentUser.username, [...fresh, requesterUsername]);
    setSocialFollowers(prev => prev.includes(requesterUsername) ? prev : [...prev, requesterUsername]);
    // Add currentUser to their following list
    try {
      const theirData = await loadUserData(requesterUsername);
      if (theirData?.profile) {
        const theirFollowing = [...new Set([...(theirData.profile.following || []), currentUser.username])];
        await saveUserData(requesterUsername, { ...theirData, profile: { ...theirData.profile, following: theirFollowing } });
      }
    } catch {}
    // Remove from followRequests
    const updated = myFollowRequests.filter(r => r.from !== requesterUsername);
    setMyFollowRequests(updated);
    await storage.set(`followRequests:${currentUser.username}`, JSON.stringify(updated)).catch(() => {});
  };

  const denyFollowRequest = async (requesterUsername) => {
    const updated = myFollowRequests.filter(r => r.from !== requesterUsername);
    setMyFollowRequests(updated);
    await storage.set(`followRequests:${currentUser.username}`, JSON.stringify(updated)).catch(() => {});
  };

  const dismissNotification = async (index) => {
    const notif = notifications[index];
    const updated = notifications.filter((_, i) => i !== index);
    setNotifications(updated);
    if (!notif.read) setNotifCount(c => Math.max(0, c - 1));
    await storage.set(`notifications:${currentUser.username}`, JSON.stringify(updated)).catch(() => {});
  };

  const loadComments = async (sessionId) => {
    try {
      const r = await storage.get(`comments:${sessionId}`);
      return r ? JSON.parse(r.value) : [];
    } catch { return []; }
  };

  const openCommentPanel = async (sessionId, ownerUsername = null) => {
    setCommentPanelId(sessionId);
    setCommentPanelOwner(ownerUsername);
    if (!sessionComments[sessionId]) {
      const comments = await loadComments(sessionId);
      setSessionComments(prev => ({ ...prev, [sessionId]: comments }));
    }
  };

  const submitComment = async (sessionId) => {
    if (!commentText.trim() || commentLoading) return;
    setCommentLoading(true);
    const existing = sessionComments[sessionId] || await loadComments(sessionId);
    const comment = { id: Date.now(), username: currentUser.username, displayName: currentUser.displayName, text: commentText.trim(), at: new Date().toISOString() };
    const updated = [...existing, comment];
    await storage.set(`comments:${sessionId}`, JSON.stringify(updated)).catch(() => {});
    setSessionComments(prev => ({ ...prev, [sessionId]: updated }));
    // Notify session owner (skip if owner is the commenter)
    const owner = commentPanelOwner;
    if (owner && owner !== currentUser.username) {
      addNotification(owner, { type: "comment", from: currentUser.username, fromDisplay: currentUser.displayName || currentUser.username, sessionId, at: new Date().toISOString(), read: false }).catch(() => {});
    }
    setCommentText("");
    setCommentLoading(false);
  };

  const deleteComment = async (sessionId, commentId) => {
    const existing = sessionComments[sessionId] || await loadComments(sessionId);
    const updated = existing.filter(c => c.id !== commentId);
    await storage.set(`comments:${sessionId}`, JSON.stringify(updated)).catch(() => {});
    setSessionComments(prev => ({ ...prev, [sessionId]: updated }));
  };

  const loadMyReactions = async (username) => {
    try {
      const r = await storage.get(`myReactions:${username}`);
      return r ? JSON.parse(r.value) : {};
    } catch { return {}; }
  };

  const toggleReaction = async (sessionId, emoji) => {
    const current = myReactions[sessionId];
    const updated = current === emoji
      ? Object.fromEntries(Object.entries(myReactions).filter(([k]) => k !== sessionId))
      : { ...myReactions, [sessionId]: emoji };
    setMyReactions(updated);
    try { await storage.set(`myReactions:${currentUser.username}`, JSON.stringify(updated)); } catch {}
    // Maintain aggregate sessionReactions:{sessionId} so counts are visible to all
    try {
      const r = await storage.get(`sessionReactions:${sessionId}`);
      const agg = r ? JSON.parse(r.value) : {};
      if (current === emoji) {
        delete agg[currentUser.username];
      } else {
        agg[currentUser.username] = emoji;
      }
      await storage.set(`sessionReactions:${sessionId}`, JSON.stringify(agg));
      const counts = {};
      Object.values(agg).forEach(e => { counts[e] = (counts[e] || 0) + 1; });
      setFeedReactionCounts(prev => ({ ...prev, [sessionId]: counts }));
    } catch {}
  };

  const toggleMute = (username) => {
    setMutedUsers(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]);
  };

  const removeFollower = async (followerUsername) => {
    const fresh = await loadFollowersStore(currentUser.username);
    const updated = fresh.filter(u => u !== followerUsername);
    await updateFollowersStore(currentUser.username, updated);
    setSocialFollowers(updated);
    setSocialUserList(prev => prev ? { ...prev, users: prev.users.filter(u => u.username !== followerUsername) } : null);
    try {
      const theirData = await loadUserData(followerUsername);
      if (theirData?.profile) {
        const theirFollowing = (theirData.profile.following || []).filter(u => u !== currentUser.username);
        await saveUserData(followerUsername, { ...theirData, profile: { ...theirData.profile, following: theirFollowing } });
      }
    } catch {}
  };

  const toggleFollow = async (username, targetIsPrivate = false) => {
    const isNowFollowing = !socialFollowing.includes(username);
    // If target is private and we're not yet following, send a follow request instead
    if (isNowFollowing && targetIsPrivate) {
      if (pendingFollowRequests.includes(username)) return;
      setPendingFollowRequests(prev => [...prev, username]);
      try {
        const existing = await loadFollowRequestsFor(username);
        if (!existing.some(r => r.from === currentUser.username)) {
          const updated = [...existing, { from: currentUser.username, fromDisplay: currentUser.displayName || currentUser.username, at: new Date().toISOString() }];
          await storage.set(`followRequests:${username}`, JSON.stringify(updated));
        }
      } catch {}
      // Notify the target about the follow request
      await addNotification(username, { type: "followRequest", from: currentUser.username, fromDisplay: currentUser.displayName || currentUser.username, at: new Date().toISOString(), read: false });
      return;
    }
    setSocialFollowing(prev => isNowFollowing ? [...prev, username] : prev.filter(u => u !== username));
    setConfirmUnfollowUser(null);
    // If unfollowing, also cancel any pending request
    if (!isNowFollowing) setPendingFollowRequests(prev => prev.filter(u => u !== username));
    const theirFollowers = await loadFollowersStore(username);
    const updatedFollowers = isNowFollowing
      ? [...new Set([...theirFollowers, currentUser.username])]
      : theirFollowers.filter(u => u !== currentUser.username);
    await updateFollowersStore(username, updatedFollowers);
    if (isNowFollowing && notifPrefs.follows) {
      await addNotification(username, { type: "follow", from: currentUser.username, fromDisplay: currentUser.displayName || currentUser.username, at: new Date().toISOString(), read: false });
    }
  };

  const showUserList = async (type) => {
    const accounts = await loadAccountIndex();
    if (type === "following") {
      const users = socialFollowing.map(u => ({ username: u, displayName: accounts[u]?.displayName || u }));
      setSocialUserList({ type: "following", users, canUnfollow: true });
    } else {
      const fresh = await loadFollowersStore(currentUser.username);
      setSocialFollowers(fresh);
      const users = fresh.map(u => ({ username: u, displayName: accounts[u]?.displayName || u }));
      setSocialUserList({ type: "followers", users, canUnfollow: true });
    }
  };

  const openUserProfile = async (username, displayName, backTo = "social") => {
    setSocialUserList(null);
    setUserProfileBackTo(backTo);
    setViewedUser({ username, displayName, sessions: null, projects: null, following: [], followersList: [] });
    setViewedUserLoading(true);
    setScreen("userProfile");
    try {
      const [data, followers] = await Promise.all([
        loadUserData(username),
        loadFollowersStore(username),
      ]);
      const theirFollowing = data?.profile?.following || [];
      setViewedUser({
        username,
        displayName: data?.profile?.displayName || displayName,
        sessions: data?.sessions || [],
        projects: data?.projects || [],
        following: theirFollowing,
        followersList: followers,
        followersCount: followers.length,
        followingCount: theirFollowing.length,
        isPrivate: data?.profile?.isPrivate || false,
      });
    } catch {
      setViewedUser({ username, displayName, sessions: [], projects: [], following: [], followersList: [], followersCount: 0, followingCount: 0, isPrivate: false });
    }
    setViewedUserLoading(false);
  };

  const goToLeaderboard = async () => {
    setScreen("leaderboard");
    setLeaderboardLoading(true);
    setLeaderboardData(null);
    try {
      // Load my fresh profile to get who I follow
      const myData = await loadUserData(currentUser.username);
      const myFollowing = myData?.profile?.following || [];
      setSocialFollowing(myFollowing);

      // For each person I follow, load their full profile and check if they follow me back.
      // Check profile.following directly — more reliable than the secondary followers: store
      const results = await Promise.all(
        myFollowing.map(async (uname) => {
          try {
            const theirData = await loadUserData(uname);
            const theyFollowMe = (theirData?.profile?.following || []).includes(currentUser.username);
            return { username: uname, theirData, isMutual: theyFollowMe };
          } catch { return { username: uname, theirData: null, isMutual: false }; }
        })
      );

      // Refresh followers secondary store for profile display (fire-and-forget)
      loadFollowersStore(currentUser.username).then(setSocialFollowers).catch(() => {});

      const entries = results
        .filter(r => r.isMutual && r.theirData)
        .map(r => ({
          username: r.username,
          displayName: r.theirData.profile?.displayName || r.username,
          sessions: r.theirData.sessions || [],
          isMe: false,
        }));
      entries.push({ username: currentUser.username, displayName: displayName, sessions, isMe: true });
      setLeaderboardData(entries);
    } catch { setLeaderboardData([]); }
    setLeaderboardLoading(false);
  };

  const showViewedUserList = async (type) => {
    if (!viewedUser) return;
    const accounts = await loadAccountIndex();
    if (type === "following") {
      const users = (viewedUser.following || []).map(u => ({ username: u, displayName: accounts[u]?.displayName || u }));
      setSocialUserList({ type: "following", users, canUnfollow: false });
    } else {
      const users = (viewedUser.followersList || []).map(u => ({ username: u, displayName: accounts[u]?.displayName || u }));
      setSocialUserList({ type: "followers", users, canUnfollow: false });
    }
  };

  // Reload feed when home screen opens or following list changes
  useEffect(() => {
    if (screen === "home") loadSocialFeed();
  }, [screen, socialFollowing]);

  // Refresh own follower count + follow requests when profile screen opens
  useEffect(() => {
    if (screen === "profile" && currentUser) {
      loadFollowersStore(currentUser.username).then(setSocialFollowers).catch(() => {});
      storage.get(`followRequests:${currentUser.username}`).then(r => setMyFollowRequests(r ? JSON.parse(r.value) : [])).catch(() => {});
    }
  }, [screen]);

  // ── AUTH SCREENS ───────────────────────────────────────────
  if (authScreen === "loading") {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: W.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🧗</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: W.text }}>SendLog</div>
          <div style={{ marginTop: 20, color: W.textMuted, fontSize: 14 }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (authScreen === "login" || authScreen === "signup") {
    const isSignup = authScreen === "signup";
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: W.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "48px 28px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧗</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: W.text, letterSpacing: -0.5 }}>SendLog</div>
          <div style={{ fontSize: 14, color: W.textMuted, marginTop: 6 }}>Track your climbing journey</div>
        </div>

        {/* Card */}
        <div style={{ margin: "0 20px", background: W.surface, borderRadius: 24, padding: "28px 24px", border: `1px solid ${W.border}`, boxShadow: "0 8px 32px rgba(61,32,16,0.1)" }}>
          {/* Tab Toggle */}
          <div style={{ display: "flex", background: W.surface2, borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${W.border}` }}>
            {[["login", "Sign In"], ["signup", "Create Account"]].map(([id, label]) => (
              <button key={id} onClick={() => { setAuthScreen(id); setAuthError(""); }} style={{ flex: 1, padding: "9px", borderRadius: 9, border: "none", background: authScreen === id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: authScreen === id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          {isSignup && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>Display Name</div>
              <input value={authForm.displayName} onChange={e => setAuthForm(f => ({ ...f, displayName: e.target.value }))} placeholder="e.g. Alex H." style={{ width: "100%", padding: "12px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>Username</div>
            <input value={authForm.username} onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))} onKeyDown={e => e.key === "Enter" && (isSignup ? handleSignup() : handleLogin())} placeholder="e.g. alexclimbs" autoCapitalize="none" style={{ width: "100%", padding: "12px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>

          <div style={{ marginBottom: isSignup ? 14 : 20 }}>
            <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>Password</div>
            <input type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && (isSignup ? handleSignup() : handleLogin())} placeholder={isSignup ? "At least 6 characters" : "Enter password"} style={{ width: "100%", padding: "12px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>

          {isSignup && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>Confirm Password</div>
              <input type="password" value={authForm.confirmPassword} onChange={e => setAuthForm(f => ({ ...f, confirmPassword: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSignup()} placeholder="Re-enter password" style={{ width: "100%", padding: "12px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
          )}

          {authError && (
            <div style={{ background: W.red, borderRadius: 10, padding: "10px 14px", marginBottom: 16, border: `1px solid ${W.redDark}30` }}>
              <div style={{ fontSize: 13, color: W.redDark, fontWeight: 600 }}>⚠️ {authError}</div>
            </div>
          )}

          <button onClick={isSignup ? handleSignup : handleLogin} disabled={authLoading} style={{ width: "100%", padding: "15px", background: authLoading ? W.border : `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 800, cursor: authLoading ? "default" : "pointer", boxShadow: authLoading ? "none" : `0 4px 18px ${W.accentGlow}` }}>
            {authLoading ? "Please wait…" : isSignup ? "Create Account" : "Sign In"}
          </button>

          {isSignup && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: W.yellow, borderRadius: 10, border: `1px solid ${W.yellowDark}20` }}>
              <div style={{ fontSize: 11, color: W.yellowDark, fontWeight: 600 }}>🎉 New accounts start with sample data so you can explore the app right away!</div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", padding: "20px", fontSize: 12, color: W.textDim }}>
          Your data is saved securely to your account.
        </div>
      </div>
      </div>
    );
  }

  // ── LOCATION DROPDOWN ──────────────────────────────────────

  const Label = ({ children }) => <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>{children}</div>;

  // ── CLIMB FORM ─────────────────────────────────────────────
  const ClimbFormPanel = ({ onSave, onCancel, isActiveSession = false }) => {
    const type = climbForm.climbType || "boulder";
    const ropeGrades = climbForm.scale === "Custom" ? customRopeGrades : (ROPE_GRADES[climbForm.scale] || ROPE_GRADES["French"]);
    const boulderGrades = climbForm.scale === "Custom" ? customBoulderGrades : (GRADES[climbForm.scale] || GRADES["V-Scale"]);
    const title = editingClimbId ? "✏️ Edit Climb" : type === "boulder" ? "🪨 Add a Boulder" : type === "rope" ? "🪢 Add a Rope Climb" : "⏱ Add a Speed Climb";
    return (
      <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
        <div style={{ fontWeight: 700, color: W.text, marginBottom: 14, fontSize: 15 }}>{title}</div>

        {/* Name */}
        <Label>{type === "speed" ? "Climb Name (optional)" : "Climb Name"}</Label>
        <input value={climbForm.name} onChange={e => setClimbForm(f => ({ ...f, name: e.target.value }))} placeholder={type === "boulder" ? "e.g. The Sloper Problem" : type === "rope" ? "e.g. Red Route 6b+" : "e.g. Speed Route"} style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 14, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />

        {/* Hold Color (boulder + rope) */}
        {type !== "speed" && (
          <>
            <Label>Hold Color</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {CLIMB_COLORS.map(c => (
                <button key={c.id} onClick={() => setClimbForm(f => ({ ...f, color: f.color === c.id ? null : c.id }))} title={c.label} style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0, background: c.hex, border: climbForm.color === c.id ? `3px solid ${W.accent}` : c.id === "white" ? "2px solid #c8a882" : "2px solid rgba(0,0,0,0.15)", cursor: "pointer", boxShadow: climbForm.color === c.id ? `0 0 0 2px ${W.accent}55` : "none", outline: "none", transform: climbForm.color === c.id ? "scale(1.15)" : "scale(1)", transition: "transform 0.12s, box-shadow 0.12s" }} />
              ))}
            </div>
            {climbForm.color && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <ColorDot colorId={climbForm.color} size={14} />
                <span style={{ fontSize: 12, color: W.textMuted, fontWeight: 600 }}>{CLIMB_COLORS.find(c => c.id === climbForm.color)?.label} selected</span>
                <button onClick={() => setClimbForm(f => ({ ...f, color: null }))} style={{ marginLeft: "auto", fontSize: 11, color: W.textDim, background: "none", border: "none", cursor: "pointer" }}>✕ Clear</button>
              </div>
            )}
          </>
        )}

        {/* Boulder: scale, grade, wall type, hold types */}
        {type === "boulder" && (
          <>
            <Label>Scale</Label>
            <select value={climbForm.scale} onChange={e => { const s = e.target.value; const gl = s === "Custom" ? customBoulderGrades : (GRADES[s] || []); setClimbForm(f => ({ ...f, scale: s, grade: gl[0] || f.grade })); }} style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 14, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit", cursor: "pointer" }}>
              {Object.keys(GRADES).map(scale => <option key={scale} value={scale}>{scale}</option>)}
              <option value="Custom">{customBoulderScaleName}</option>
            </select>
            <Label>Grade</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {boulderGrades.length > 0
                ? boulderGrades.map(g => <button key={g} onClick={() => setClimbForm(f => ({ ...f, grade: g }))} style={{ padding: "5px 11px", borderRadius: 14, border: "2px solid", borderColor: climbForm.grade === g ? getGradeColor(g) : W.border, background: climbForm.grade === g ? getGradeColor(g) + "33" : W.surface, color: climbForm.grade === g ? getGradeColor(g) : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{g}</button>)
                : <div style={{ fontSize: 12, color: W.textDim, padding: "6px 0" }}>No custom grades set — add them in Settings</div>
              }
            </div>
            <Label>Wall Type</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {WALL_TYPES.map(t => { const sel = climbForm.wallTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, wallTypes: toggleArr(f.wallTypes, t) }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: sel ? W.purpleDark : W.border, background: sel ? W.purple : W.surface, color: sel ? W.purpleDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{t}</button>); })}
            </div>
            <Label>Climb Identifier</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {HOLD_TYPES.map(t => { const sel = climbForm.holdTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, holdTypes: toggleArr(f.holdTypes, t) }))} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid", borderColor: sel ? W.accentDark : W.border, background: sel ? W.accent + "22" : W.surface, color: sel ? W.accentDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{t}</button>); })}
            </div>
          </>
        )}

        {/* Rope: scale, grade, style (top rope/lead) */}
        {type === "rope" && (
          <>
            <Label>Scale</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[...Object.keys(ROPE_GRADES), "Custom"].map(s => (
                <button key={s} onClick={() => { const gl = s === "Custom" ? customRopeGrades : (ROPE_GRADES[s] || []); setClimbForm(f => ({ ...f, scale: s, grade: gl[Math.floor(gl.length / 2)] || gl[0] || f.grade })); }} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.scale === s ? W.accent : W.border, background: climbForm.scale === s ? W.accent + "22" : W.surface, color: climbForm.scale === s ? W.accent : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{s === "Custom" ? customRopeScaleName : s}</button>
              ))}
            </div>
            <Label>Grade</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {ropeGrades.length > 0
                ? ropeGrades.map(g => <button key={g} onClick={() => setClimbForm(f => ({ ...f, grade: g }))} style={{ padding: "5px 11px", borderRadius: 14, border: "2px solid", borderColor: climbForm.grade === g ? W.accent : W.border, background: climbForm.grade === g ? W.accent + "22" : W.surface, color: climbForm.grade === g ? W.accent : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{g}</button>)
                : <div style={{ fontSize: 12, color: W.textDim, padding: "6px 0" }}>No custom grades set — add them in Settings</div>
              }
            </div>
            <Label>Style</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["top-rope", "🔝 Top Rope"], ["lead", "🧗 Lead"]].map(([val, label]) => (
                <button key={val} onClick={() => setClimbForm(f => ({ ...f, ropeStyle: val }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.ropeStyle === val ? W.purpleDark : W.border, background: climbForm.ropeStyle === val ? W.purple : W.surface, color: climbForm.ropeStyle === val ? W.purpleDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{label}</button>
              ))}
            </div>
          </>
        )}

        {/* Speed: time input */}
        {type === "speed" && (
          <>
            <Label>Time (seconds)</Label>
            <input type="number" min="0" step="0.01" value={climbForm.speedTime} onChange={e => setClimbForm(f => ({ ...f, speedTime: e.target.value }))} placeholder="e.g. 14.83" style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 20, fontWeight: 800, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
            <Label>Completed?</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setClimbForm(f => ({ ...f, completed: true }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.completed ? W.greenDark : W.border, background: climbForm.completed ? W.green : W.surface, color: climbForm.completed ? W.greenDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✓ Yes</button>
              <button onClick={() => setClimbForm(f => ({ ...f, completed: false }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: !climbForm.completed ? W.redDark : W.border, background: !climbForm.completed ? W.red : W.surface, color: !climbForm.completed ? W.redDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✗ No</button>
            </div>
          </>
        )}

        {/* Tries/Completed when editing a finished session climb (boulder/rope) */}
        {!isActiveSession && editingClimbId && type !== "speed" && (
          <>
            <Label>Tries</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <button onClick={() => setClimbForm(f => ({ ...f, tries: Math.max(0, (f.tries || 0) - 1) }))} style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 20, cursor: "pointer" }}>−</button>
              <span style={{ fontSize: 22, fontWeight: 800, color: W.text, minWidth: 30, textAlign: "center" }}>{climbForm.tries || 0}</span>
              <button onClick={() => setClimbForm(f => ({ ...f, tries: (f.tries || 0) + 1 }))} style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 20, cursor: "pointer" }}>+</button>
            </div>
            <Label>Completed?</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => setClimbForm(f => ({ ...f, completed: true }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.completed ? W.greenDark : W.border, background: climbForm.completed ? W.green : W.surface, color: climbForm.completed ? W.greenDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✓ Yes</button>
              <button onClick={() => setClimbForm(f => ({ ...f, completed: false }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: !climbForm.completed ? W.redDark : W.border, background: !climbForm.completed ? W.red : W.surface, color: !climbForm.completed ? W.redDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>✗ No</button>
            </div>
          </>
        )}

        {isActiveSession && !editingClimbId && type !== "speed" && (
          <div style={{ background: W.yellow, borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: `1px solid ${W.yellowDark}30` }}>
            <div style={{ fontSize: 12, color: W.yellowDark, fontWeight: 600 }}>💡 Tries and completion are tracked live on the session screen once added.</div>
          </div>
        )}

        {/* Project toggle (boulder + rope only) */}
        {type !== "speed" && (
          <>
            <Label>Mark as Project?</Label>
            <button onClick={() => setClimbForm(f => ({ ...f, isProject: !f.isProject }))} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.isProject ? W.pinkDark : W.border, background: climbForm.isProject ? W.pink : W.surface, color: climbForm.isProject ? W.pinkDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🎯 {climbForm.isProject ? "Yes — Project" : "No — Not a Project"}</button>
          </>
        )}

        <Label>Comments</Label>
        <textarea value={climbForm.comments} onChange={e => setClimbForm(f => ({ ...f, comments: e.target.value }))} placeholder="Beta, notes..." style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, resize: "none", height: 70, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
        <Label>Photo</Label>
        <div onClick={() => fileRef.current.click()} style={{ border: `2px dashed ${W.border}`, borderRadius: 10, padding: "12px", textAlign: "center", cursor: "pointer", marginBottom: 12, background: W.surface }}>
          {photoPreview ? <img src={photoPreview} alt="climb" style={{ width: "100%", borderRadius: 8, maxHeight: 140, objectFit: "cover" }} /> : <div style={{ color: W.textDim, fontSize: 13 }}>📷 Tap to upload</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPhotoPreview(ev.target.result); r.readAsDataURL(f); }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={onSave} style={{ padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Save</button>
        </div>
      </div>
    );
  };

  // ActiveClimbCard is defined outside App() — see above export default

  // ── REGULAR CLIMB ROW ──────────────────────────────────────
  const ClimbRow = ({ climb, onEdit, onRemove }) => {
    const [confirmRemove, setConfirmRemove] = useState(false);
    return (
      <div style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", border: `1px solid ${W.border}`, marginBottom: 8, borderLeft: `4px solid ${climb.completed ? W.greenDark : W.redDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, background: getGradeColor(climb.grade) + "30", color: getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}60` }}>{climb.grade}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {climb.color && <ColorDot colorId={climb.color} size={11} />}
              <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{climb.name || climb.grade}</span>
              {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
              {climb.tries === 0 && climb.completed && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
            </div>
            <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{climb.grade} · {climb.climbType === "rope" ? `${climb.tries} ${climb.tries === 1 ? "attempt" : "attempts"} · ${climb.falls ?? climb.tries} ${(climb.falls ?? climb.tries) === 1 ? "fall" : "falls"}` : `${climb.tries} ${climb.tries === 1 ? "fall" : "falls"}`} · {climb.completed ? "✓ Completed" : "✗ Not completed"}</div>
            <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            {climb.comments && <div style={{ fontSize: 12, color: W.textDim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
            {(climb.attemptLog || []).length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                {(climb.attemptLog || []).map((a, i) => (
                  <span key={i} style={{ fontSize: 10, color: W.textDim, background: W.surface2, borderRadius: 5, padding: "1px 6px", border: `1px solid ${W.border}` }}>
                    #{i + 1} {formatDuration(Math.floor(a.duration / 1000))}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            {onEdit && !confirmRemove && <button onClick={() => onEdit(climb)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>}
            {onRemove && !confirmRemove && <button onClick={() => setConfirmRemove(true)} style={{ background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.redDark, fontWeight: 700, cursor: "pointer" }}>Remove</button>}
          </div>
        </div>
        {confirmRemove && (
          <div style={{ marginTop: 10, background: W.red, borderRadius: 10, padding: "10px 12px", border: `1px solid ${W.redDark}` }}>
            <div style={{ fontSize: 12, color: W.redDark, fontWeight: 700, marginBottom: 8 }}>Remove this climb?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemove(false)} style={{ flex: 1, padding: "7px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, cursor: "pointer", fontSize: 12 }}>Cancel</button>
              <button onClick={() => onRemove(climb.id)} style={{ flex: 1, padding: "7px", background: W.redDark, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Remove</button>
            </div>
          </div>
        )}
      </div>
    );
  };


  const LogbookSessionCard = ({ session, poster, onNavigate }) => {
    const stats = getSessionStats(session);
    const gradeEntries = Object.entries(stats.gradeBreakdown).sort((a, b) => getGradeIndex(b[0], b[1].scale || "V-Scale") - getGradeIndex(a[0], a[1].scale || "V-Scale"));
    const barMax = gradeEntries.reduce((m, [, v]) => Math.max(m, v.tries), 0);
    const climbPhotos = session.climbs.filter(c => c.photo);
    return (
      <div style={{ background: W.surface, borderRadius: 18, border: `2px solid ${W.accent}40`, marginBottom: 16, overflow: "hidden", boxShadow: `0 2px 12px ${W.accentGlow}` }}>
        {/* Posted-by row (only in feed) */}
        {poster && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderBottom: `1px solid ${W.border}`, background: W.surface2 }}>
            {poster.profilePic
              ? <img src={poster.profilePic} style={{ width: 24, height: 24, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>🧗</div>
            }
            <span style={{ fontWeight: 700, color: W.accent, fontSize: 13 }}>{poster.displayName}</span>
            <span style={{ color: W.textDim, fontSize: 12 }}>@{poster.username}</span>
          </div>
        )}
        {/* Header */}
        <div onClick={onNavigate || (() => { setSessionReadOnly(false); setSelectedSession(session); setScreen("sessionDetail"); })} style={{ padding: "14px 16px", cursor: "pointer", borderBottom: `1px solid ${W.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: W.text }}>{formatDate(session.date)}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: W.textMuted, marginTop: 2 }}>📍 {session.location}</div>
            <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>⏱ {formatDuration(session.duration)}</div>
          </div>
          <div style={{ color: W.accent, fontSize: 13, fontWeight: 700 }}>Details ›</div>
        </div>
        {/* Photos strip */}
        {climbPhotos.length > 0 && (
          <div style={{ display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto", borderBottom: `1px solid ${W.border}` }}>
            {climbPhotos.map((c, ci) => {
              const colorHex = CLIMB_COLORS.find(cc => cc.id === c.color)?.hex;
              return (
                <div key={c.id} onClick={e => { e.stopPropagation(); setLightboxPhoto({ photos: climbPhotos.map(p => ({ src: p.photo, grade: p.grade, name: p.name, colorId: p.color })), idx: ci }); }} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
                  <img src={c.photo} alt={c.name || c.grade} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, display: "block" }} />
                  <div style={{ position: "absolute", bottom: 4, left: 4, background: getGradeColor(c.grade) + "ee", borderRadius: 5, padding: "1px 6px", fontSize: 10, fontWeight: 800, color: "#fff" }}>{c.grade}</div>
                  {colorHex && <div style={{ position: "absolute", bottom: 4, right: 4, width: 13, height: 13, borderRadius: "50%", background: colorHex, border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />}
                </div>
              );
            })}
          </div>
        )}
        {/* Bar chart — attempts per grade */}
        {gradeEntries.length > 0 && (
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${W.border}` }}>
            {gradeEntries.map(([grade, data]) => (
              <div key={grade} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 28, fontSize: 11, fontWeight: 800, color: getGradeColor(grade), flexShrink: 0, textAlign: "right" }}>{grade}</div>
                <div style={{ flex: 1, height: 14, background: W.surface2, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(data.tries / barMax) * 100}%`, borderRadius: 4, display: "flex", overflow: "hidden", minWidth: 4 }}>
                    <div style={{ height: "100%", width: `${(data.completed / Math.max(data.attempted, 1)) * 100}%`, background: getGradeColor(grade), minWidth: data.completed > 0 ? 4 : 0 }} />
                    <div style={{ height: "100%", flex: 1, background: getGradeColor(grade) + "44" }} />
                  </div>
                </div>
                <div style={{ width: 32, fontSize: 11, fontWeight: 700, color: W.text, flexShrink: 0 }}>{data.completed}/{data.attempted}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: W.accent }} />
                <span style={{ fontSize: 10, color: W.textDim }}>Sends</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: W.textDim + "55" }} />
                <span style={{ fontSize: 10, color: W.textDim }}>Attempts</span>
              </div>
            </div>
          </div>
        )}
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: `1px solid ${W.border}` }}>
          {[{ icon: "🧗", label: "Sends", value: `${stats.sends}/${stats.total}` }, { icon: "🔁", label: "Tries", value: stats.totalTries }, { icon: "⚡", label: "Flashes", value: stats.flashes }, { icon: "📊", label: "Avg", value: stats.avgTries }].map((s, i) => (
            <div key={s.label} style={{ padding: "10px 6px", textAlign: "center", borderRight: i < 3 ? `1px solid ${W.border}` : "none" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: W.text }}>{s.value}</div>
              <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {/* Hardest row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {[{ icon: "🔺", label: "Hardest Tried", value: stats.hardestAttempted }, { icon: "✅", label: "Hardest Sent", value: stats.hardestSent }].map((s, i) => (
            <div key={s.label} style={{ padding: "10px 8px", textAlign: "center", borderRight: i === 0 ? `1px solid ${W.border}` : "none" }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: W.accent }}>{s.value}</div>
              <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
        {/* Reactions + Comments — only on social feed cards */}
        {poster && (
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: `1px solid ${W.border}`, alignItems: "center" }}>
            {["🔥", "💪", "✨"].map(emoji => {
              const active = myReactions[session.id] === emoji;
              const count = feedReactionCounts[session.id]?.[emoji] || 0;
              return (
                <button key={emoji} onClick={e => { e.stopPropagation(); toggleReaction(session.id, emoji); }} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${active ? W.accent : W.border}`, background: active ? W.accent + "22" : "transparent", fontSize: 15, cursor: "pointer", fontWeight: active ? 700 : 400, color: active ? W.accent : W.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                  {emoji}{count > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{count}</span>}
                </button>
              );
            })}
            <button onClick={e => { e.stopPropagation(); openCommentPanel(session.id, poster?.username || currentUser.username); }} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${W.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: W.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              💬{sessionComments[session.id]?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{sessionComments[session.id].length}</span>}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── SCREENS ────────────────────────────────────────────────
  const HomeScreen = () => {
    // Build combined feed: own sessions + followed users' sessions, sorted newest first
    const ownFeedItems = sessions.map(s => ({
      ...s,
      feedUsername: currentUser.username,
      feedDisplayName: editDisplayName || currentUser.displayName,
      feedProfilePic: profilePic,
      isOwn: true,
    }));
    const combined = [...ownFeedItems, ...socialFeed]
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div style={{ padding: "24px 20px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: W.text, margin: "0 0 4px" }}>Hey, {currentUser?.displayName || "Climber"} 👋</h1>
        <p style={{ color: W.textMuted, margin: "0 0 22px", fontSize: 14 }}>Ready to send something today?</p>
        <button onClick={goToSessionSetup} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 28, boxShadow: `0 4px 20px ${W.accentGlow}` }}>▶ Start a Session</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
          {socialFollowing.length > 0 ? "Feed" : "Previous Sessions"}
        </div>
        {combined.length === 0
          ? sessions.length === 0
            ? <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 38, marginBottom: 12 }}>🧗</div>
                <div style={{ fontWeight: 700, color: W.text, fontSize: 15, marginBottom: 6 }}>No sessions yet</div>
                <div style={{ color: W.textMuted, fontSize: 13, marginBottom: 18 }}>Log your first session, then follow other climbers to see their activity here.</div>
                <button onClick={() => { setScreen("social"); setSocialTab("search"); }} style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Find Climbers</button>
              </div>
            : <div style={{ textAlign: "center", color: W.textDim, padding: "40px 0", fontSize: 13 }}>No recent sessions from people you follow.</div>
          : (() => {
              const visible = combined.slice(0, feedPage * 8);
              const hasMore = combined.length > visible.length;
              return (
                <>
                  {visible.map((s, i) => (
                    s.isOwn
                      ? <LogbookSessionCard key={`own-${s.id}`} session={s} poster={socialFollowing.length > 0 ? { username: s.feedUsername, displayName: s.feedDisplayName, profilePic: s.feedProfilePic } : null} />
                      : <LogbookSessionCard
                          key={`feed-${s.id}-${i}`}
                          session={s}
                          poster={{ username: s.feedUsername, displayName: s.feedDisplayName, profilePic: s.feedProfilePic }}
                          onNavigate={() => { setSessionReadOnly(true); setSelectedSession(s); setScreen("sessionDetail"); }}
                        />
                  ))}
                  {hasMore && (
                    <button onClick={() => setFeedPage(p => p + 1)} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                      Load more ({combined.length - visible.length} remaining)
                    </button>
                  )}
                </>
              );
            })()
        }
      </div>
    );
  };

  const SessionSetupScreen = () => {
    const toggleType = (t) => setSessionTypes(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
    const typeOptions = [
      { id: "boulder", label: "🪨 Bouldering", desc: "Problems, grades, send tracking" },
      { id: "rope",    label: "🪢 Rope Climbing", desc: "Sport, trad, top-rope, lead" },
      { id: "speed",   label: "⚡ Speed Climbing", desc: "Timed attempts, rest tracking" },
    ];
    return (
      <div style={{ padding: "32px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧗</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: W.text, margin: "0 0 8px" }}>Start a Session</h2>
          <p style={{ color: W.textMuted, fontSize: 14, margin: 0 }}>Set your location, then start climbing.</p>
        </div>
        <div style={{ background: W.surface, borderRadius: 18, padding: "20px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
          <Label>Gym / Location</Label>
          <LocationDropdown value={pendingLocation} onChange={setPendingLocation} open={locationDropdownOpen} setOpen={setLocationDropdownOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
        </div>
        <div style={{ background: W.surface, borderRadius: 18, padding: "20px", border: `1px solid ${W.border}`, marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>What will this session mostly involve? (select all that apply)</div>
          {typeOptions.map(opt => {
            const sel = sessionTypes.includes(opt.id);
            return (
              <button key={opt.id} onClick={() => toggleType(opt.id)} style={{ display: "flex", alignItems: "center", width: "100%", background: sel ? W.accent + "18" : W.surface2, border: `2px solid ${sel ? W.accent : W.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left", gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sel ? W.accent : W.border}`, background: sel ? W.accent : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: sel ? W.accent : W.text, fontSize: 14 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={beginTimer} style={{ width: "100%", padding: "18px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 24px ${W.accentGlow}`, marginBottom: 12 }}>▶ Start Climbing</button>
        <button onClick={() => setScreen("home")} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
      </div>
    );
  };

  const SessionActiveScreen = () => {
    const selectedTypes = activeSession?.sessionTypes || ["boulder"];
    const allTypeButtons = [
      { type: "boulder", label: "🪨 New Boulder",        bg: W.green,  border: W.greenDark,  color: W.greenDark,  onClick: () => openClimbForm(null, null, "boulder") },
      { type: "rope",    label: "🪢 New Rope Climb",     bg: W.purple, border: W.purpleDark, color: W.purpleDark, onClick: () => openClimbForm(null, null, "rope") },
      { type: "speed",   label: "⚡ Speed Climb Session", bg: W.yellow, border: W.yellowDark, color: W.yellowDark, onClick: addSpeedSession },
    ];
    const primaryBtns   = allTypeButtons.filter(b => selectedTypes.includes(b.type));
    const secondaryBtns = allTypeButtons.filter(b => !selectedTypes.includes(b.type));
    const allClimbs = activeSession?.climbs || [];
    const speedSessions = allClimbs.filter(c => c.climbType === "speed-session");
    const boulderClimbs = allClimbs.filter(c => c.climbType !== "speed-session" && (c.climbType === "boulder" || !c.climbType));
    const ropeClimbs    = allClimbs.filter(c => c.climbType === "rope");
    const regularSends = allClimbs.filter(c => c.climbType !== "speed-session" && c.completed).length;
    const regularTotal = allClimbs.filter(c => c.climbType !== "speed-session").length;
    // Shared props passed to every ActiveClimbCard
    const cardProps = {
      onEdit: openClimbForm, onStartClimbing: startClimbing, onEndAttempt: endClimbAttempt,
      onUpdateTries: updateActiveClimbTries, onToggleCompleted: toggleActiveClimbCompleted,
      onLogRope: logRopeAttempt, onRemove: removeClimbFromActive, onLightbox: setLightboxPhoto,
      onPauseClimb: pauseClimb, onResumeClimb: resumeClimb, onStopClimb: stopBoulderClimb,
      tick: sessionTimer,
    };
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 4px 16px ${W.accentGlow}` }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Session Timer</div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>{formatDuration(sessionTimer)}</div>
            {activeSession?.location && <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>📍 {activeSession.location}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 4 }}>{regularSends}/{regularTotal} sent</div>
            <button onClick={toggleSessionTimer} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{timerRunning ? "⏸ Pause" : "▶ Resume"}</button>
          </div>
        </div>
        <Label>Gym / Location</Label>
        <div style={{ marginBottom: 18 }}>
          <LocationDropdown value={activeSession?.location || ""} onChange={v => setActiveSession(s => ({ ...s, location: v }))} open={activeLocationDropdownOpen} setOpen={setActiveLocationDropdownOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
        </div>
        {showClimbForm && ClimbFormPanel({ isActiveSession: true, onSave: saveClimbToActiveSession, onCancel: () => { setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); } })}

        {/* ── Boulder Section ─────────────────────────────────── */}
        {!showClimbForm && !showProjectPicker && activeSession?.boulderStartedAt && (
          <div style={{ marginBottom: 16 }}>
            <BoulderRopeSessionCard type="boulder" totalSec={activeSession.boulderTotalSec || 0} activeStart={activeSession.boulderActiveStart || null} isEnded={!!activeSession.boulderEndedAt} tick={sessionTimer} onEnd={endBoulderSession} />
            <div style={{ borderLeft: `3px solid ${W.greenDark}44`, paddingLeft: 10, marginLeft: 2 }}>
              {boulderClimbs.map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} />)}
              {selectedTypes.includes("boulder") && !activeSession.boulderEndedAt && (
                <button onClick={() => openClimbForm(null, null, "boulder")} style={{ width: "100%", padding: "10px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 12, color: W.greenDark, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 2 }}>+ New Boulder</button>
              )}
            </div>
          </div>
        )}

        {/* ── Rope Section ─────────────────────────────────────── */}
        {!showClimbForm && !showProjectPicker && activeSession?.ropeStartedAt && (
          <div style={{ marginBottom: 16 }}>
            <BoulderRopeSessionCard type="rope" totalSec={activeSession.ropeTotalSec || 0} activeStart={activeSession.ropeActiveStart || null} isEnded={!!activeSession.ropeEndedAt} tick={sessionTimer} onEnd={endRopeSession} />
            <div style={{ borderLeft: `3px solid ${W.purpleDark}44`, paddingLeft: 10, marginLeft: 2 }}>
              {ropeClimbs.map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} />)}
              {selectedTypes.includes("rope") && !activeSession.ropeEndedAt && (
                <button onClick={() => openClimbForm(null, null, "rope")} style={{ width: "100%", padding: "10px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 12, color: W.purpleDark, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 2 }}>+ New Rope Climb</button>
              )}
            </div>
          </div>
        )}

        {/* ── Speed Sessions ────────────────────────────────────── */}
        {!showClimbForm && !showProjectPicker && speedSessions.length > 0 && (
          <>{speedSessions.map((c, i) => <SpeedSessionCard key={c.id} climb={c} tick={sessionTimer} index={i} totalCount={speedSessions.length} onAddAttempt={a => addSpeedAttempt(c.id, a)} onRemove={() => removeSpeedSession(c.id)} onEnd={() => endSpeedSession(c.id)} />)}</>
        )}

        {showProjectPicker && (
          <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
            <div style={{ fontWeight: 700, color: W.text, marginBottom: 4 }}>🎯 Which project?</div>
            {activeProjects.length === 0 ? <div style={{ color: W.textDim, fontSize: 13 }}>No active projects yet.</div>
              : activeProjects.map(p => (
                <div key={p.id} style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontWeight: 700, color: getGradeColor(p.grade), fontSize: 15 }}>{p.grade}</span>
                    <span style={{ color: W.text, fontSize: 14, fontWeight: 600, marginLeft: 8 }}>{p.name}</span>
                  </div>
                  <button onClick={() => { const nc = { id: Date.now(), name: p.name, grade: p.grade, scale: p.scale, isProject: true, comments: p.comments || "", photo: null, projectId: p.id, tries: 0, completed: false, color: null, wallTypes: [], holdTypes: [] }; setActiveSession(s => ({ ...s, climbs: [...s.climbs, nc] })); setShowProjectPicker(false); }} style={{ background: W.pink, border: "none", borderRadius: 8, color: W.pinkDark, padding: "6px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Add</button>
                </div>
              ))}
            <button onClick={() => setShowProjectPicker(false)} style={{ width: "100%", marginTop: 8, padding: "10px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer" }}>Cancel</button>
          </div>
        )}
        {!showClimbForm && !showProjectPicker && (() => {
          // Buttons for types whose section isn't started yet (first climb of that type)
          const unstartedPrimary = primaryBtns.filter(b =>
            !(b.type === "boulder" && activeSession?.boulderStartedAt) &&
            !(b.type === "rope"    && activeSession?.ropeStartedAt)
          );
          const hasBottomButtons = unstartedPrimary.length > 0 || secondaryBtns.length > 0;
          if (!hasBottomButtons) return (
            <div style={{ marginBottom: 12, marginTop: 4 }}>
              <button onClick={() => setShowProjectPicker(true)} style={{ width: "100%", padding: "13px", background: W.pink, border: `2px solid ${W.pinkDark}`, borderRadius: 14, color: W.pinkDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🎯 Log Project</button>
            </div>
          );
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, marginTop: 8 }}>
              {unstartedPrimary.map(b => (
                <button key={b.type} onClick={b.onClick} style={{ padding: "13px", background: b.bg, border: `2px solid ${b.border}`, borderRadius: 14, color: b.color, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{b.label}</button>
              ))}
              <button onClick={() => setShowProjectPicker(true)} style={{ padding: "13px", background: W.pink, border: `2px solid ${W.pinkDark}`, borderRadius: 14, color: W.pinkDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🎯 Log Project</button>
              {secondaryBtns.length > 0 && (
                <button onClick={() => setShowMoreClimbTypes(v => !v)} style={{ padding: "13px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{showMoreClimbTypes ? "▲ Less" : "▼ See More"}</button>
              )}
              {showMoreClimbTypes && secondaryBtns.map(b => (
                <button key={b.type} onClick={b.onClick} style={{ padding: "13px", background: b.bg, border: `2px solid ${b.border}`, borderRadius: 14, color: b.color, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: 0.85 }}>{b.label}</button>
              ))}
            </div>
          );
        })()}
        {!showClimbForm && !showProjectPicker && (
          <button onClick={() => setShowEndConfirm(true)} style={{ width: "100%", padding: "14px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 14, color: W.redDark, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>⏹ End Session</button>
        )}
        {showEndConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: W.surface, borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: W.text, marginBottom: 12 }}>End Session?</div>
                <div style={{ background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, borderRadius: 16, padding: "16px 20px", marginBottom: 12 }}>
                  <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Time on Wall</div>
                  <div style={{ color: "#fff", fontSize: 42, fontWeight: 900, letterSpacing: 3, lineHeight: 1 }}>{formatDuration(sessionTimer)}</div>
                </div>
                <div style={{ fontSize: 13, color: W.textMuted }}>
                  {regularSends} sends · {regularTotal} climbs · {speedSessions.length > 0 ? `${speedSessions.reduce((t, s) => t + (s.attempts||[]).length, 0)} speed attempts` : ""}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => setShowEndConfirm(false)} style={{ padding: "13px", background: "transparent", border: `2px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Keep Going</button>
                <button onClick={endSession} style={{ padding: "13px", background: `linear-gradient(135deg, ${W.redDark}, #b91c1c)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>End It</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SessionDetailScreen = ({ session }) => {
    const readOnly = sessionReadOnly;
    const [editingLocation, setEditingLocation] = useState(false);
    const [locationVal, setLocationVal]         = useState(session.location);
    const [locDropOpen, setLocDropOpen]         = useState(false);
    const [confirmDelete, setConfirmDelete]     = useState(false);
    const stats = getSessionStats(session);
    const saveLocation = () => { setSessions(prev => prev.map(s => s.id === session.id ? { ...s, location: locationVal } : s)); setSelectedSession(s => ({ ...s, location: locationVal })); setEditingLocation(false); };
    return (
      <div style={{ padding: "24px 20px" }}>
        {readOnly && (
          <div style={{ background: W.surface2, borderRadius: 12, padding: "8px 14px", marginBottom: 14, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: W.textMuted }}>👤 Viewing someone else's session</span>
          </div>
        )}
        <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
          {!readOnly && editingLocation ? (
            <div>
              <LocationDropdown value={locationVal} onChange={setLocationVal} open={locDropOpen} setOpen={setLocDropOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setEditingLocation(false)} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveLocation} style={{ flex: 1, padding: "8px", background: W.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 800, fontSize: 18, color: W.text }}>{session.location}</div><div style={{ fontSize: 13, color: W.textMuted, marginTop: 2 }}>{formatDate(session.date)}</div></div>
              {!readOnly && <button onClick={() => setEditingLocation(true)} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>⏱ {formatDuration(session.duration)}</span>
            <span style={{ background: W.green, color: W.greenDark, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>✓ {stats.sends}/{stats.total} climbs</span>
            <span style={{ background: W.surface2, color: W.textMuted, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>🔁 {stats.totalTries} tries</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[{ icon: "⚡", label: "Flash Rate", value: `${stats.flashRate}%`, bg: W.yellow, tc: W.yellowDark }, { icon: "📊", label: "Avg Tries", value: stats.avgTries, bg: W.green, tc: W.greenDark }, { icon: "⚡", label: "Flashes", value: stats.flashes, bg: W.goldLight, tc: W.yellowDark }, { icon: "🎯", label: "Projects", value: session.climbs.filter(c => c.isProject).length, bg: W.pink, tc: W.pinkDark }].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${W.border}` }}>
              <div style={{ fontSize: 16 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.tc, marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: W.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Climbs</div>
        {!readOnly && showClimbForm && editingClimbId ? (
          <ClimbFormPanel onSave={() => saveClimbToFinishedSession(session.id)} onCancel={() => { setShowClimbForm(false); setEditingClimbId(null); setEditingSessionId(null); }} />
        ) : (
          session.climbs.map(c => (
            <ClimbRow key={c.id} climb={c}
              onEdit={readOnly ? null : (climb => { setEditingClimbId(climb.id); setEditingSessionId(session.id); setClimbForm({ name: climb.name || "", grade: climb.grade, scale: climb.scale, tries: climb.tries, completed: climb.completed, isProject: climb.isProject, comments: climb.comments, photo: climb.photo, projectId: climb.projectId, color: climb.color || null, wallTypes: climb.wallTypes || [], holdTypes: climb.holdTypes || [] }); setPhotoPreview(climb.photo); setShowClimbForm(true); })}
              onRemove={readOnly ? null : (climbId => removeClimbFromSession(session.id, climbId))}
            />
          ))
        )}
        {(() => {
          const climbsWithPhotos = session.climbs.filter(c => c.photo);
          if (!climbsWithPhotos.length) return null;
          return (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Photos</div>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                {climbsWithPhotos.map((c, ci) => {
                  const colorHex = CLIMB_COLORS.find(cc => cc.id === c.color)?.hex;
                  return (
                    <div key={c.id} onClick={() => setLightboxPhoto({ photos: climbsWithPhotos.map(p => ({ src: p.photo, grade: p.grade, name: p.name, colorId: p.color })), idx: ci })} style={{ position: "relative", flexShrink: 0, cursor: "pointer" }}>
                      <img src={c.photo} alt={c.name || c.grade} style={{ width: 150, height: 150, objectFit: "cover", borderRadius: 14, display: "block" }} />
                      <div style={{ position: "absolute", bottom: 8, left: 8, background: getGradeColor(c.grade) + "ee", borderRadius: 7, padding: "3px 9px", fontSize: 12, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{c.grade}</div>
                      {colorHex && <div style={{ position: "absolute", bottom: 8, right: c.name ? 90 : 8, width: 16, height: 16, borderRadius: "50%", background: colorHex, border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />}
                      {c.name && <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", borderRadius: 7, padding: "3px 8px", fontSize: 10, color: "#fff", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {/* Comments section — only on read-only (someone else's) sessions */}
        {readOnly && (
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Comments{sessionComments[session.id]?.length > 0 ? ` (${sessionComments[session.id].length})` : ""}</div>
              <button onClick={() => openCommentPanel(session.id, session.feedUsername || null)} style={{ padding: "5px 14px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>💬 Comment</button>
            </div>
            {(sessionComments[session.id] || []).slice(0, 3).map(c => (
              <div key={c.id} style={{ background: W.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 8, border: `1px solid ${W.border}` }}>
                <div style={{ fontWeight: 700, color: W.accent, fontSize: 12, marginBottom: 3 }}>{c.displayName}</div>
                <div style={{ fontSize: 14, color: W.text }}>{c.text}</div>
              </div>
            ))}
            {(sessionComments[session.id] || []).length > 3 && (
              <button onClick={() => openCommentPanel(session.id, session.feedUsername || null)} style={{ width: "100%", padding: "8px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontSize: 13, cursor: "pointer" }}>View all {sessionComments[session.id].length} comments</button>
            )}
            {!sessionComments[session.id] && (
              <button onClick={() => openCommentPanel(session.id, session.feedUsername || null)} style={{ width: "100%", padding: "8px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontSize: 13, cursor: "pointer" }}>Load comments</button>
            )}
          </div>
        )}
        {!readOnly && !showClimbForm && (
          <div style={{ marginTop: 24 }}>
            {!confirmDelete
              ? <button onClick={() => setConfirmDelete(true)} style={{ width: "100%", padding: "13px", background: "transparent", border: `2px solid ${W.redDark}`, borderRadius: 14, color: W.redDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>🗑 Delete This Session</button>
              : <div style={{ background: W.red, borderRadius: 14, padding: "16px", border: `2px solid ${W.redDark}` }}>
                  <div style={{ fontWeight: 700, color: W.redDark, fontSize: 14, marginBottom: 12 }}>Are you sure? This cannot be undone.</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button onClick={() => deleteSession(session.id)} style={{ padding: "11px", background: W.redDark, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Yes, Delete</button>
                  </div>
                </div>}
          </div>
        )}
      </div>
    );
  };

  const ProfileScreen = () => {
    const stats = getStats();
    const logbookClimbs = getLogbookClimbs();
    const filteredSessions = getFilteredSessions();
    const customAllGrades = [...new Set([...customBoulderGrades, ...customRopeGrades])];
    const availableGrades = statsScaleFilter === "Custom"
      ? ["All", ...customAllGrades]
      : statsScaleFilter !== "All Scales" ? ["All", ...(GRADES[statsScaleFilter] || [])] : ["All"];
    const logbookGrades = logbookScale === "Custom"
      ? ["All", ...customAllGrades]
      : logbookScale !== "All Scales" ? ["All", ...(GRADES[logbookScale] || [])] : ["All"];
    const hasClimbFilters   = logbookFilter !== "all" || logbookScale !== "All Scales" || logbookGrade !== "All" || logbookSort !== "date";
    const hasSessionFilters = logbookGymFilter !== "All Gyms" || sessionSort !== "date" || sessionTypeFilter !== "all";

    return (
      <div style={{ padding: "24px 20px" }}>
        {/* Header row: avatar + name/stats/follow pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          {profilePic
            ? <img src={profilePic} style={{ width: 58, height: 58, borderRadius: 18, objectFit: "cover", boxShadow: `0 4px 14px ${W.accentGlow}`, flexShrink: 0, border: `2px solid ${W.accent}` }} />
            : <div style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 4px 14px ${W.accentGlow}`, flexShrink: 0 }}>🧗</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.text }}>{currentUser?.displayName || "Climber"}</div>
            <div style={{ fontSize: 12, color: W.textMuted }}>@{currentUser?.username} · {sessions.length} sessions · {allClimbs.length} climbs</div>
            <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
              <button onClick={() => showUserList("following")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "2px 9px", cursor: "pointer", fontSize: 11, color: W.textMuted, fontWeight: 500 }}>
                <span style={{ fontWeight: 700, color: W.text }}>{socialFollowing.length}</span> following
              </button>
              <button onClick={() => showUserList("followers")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "2px 9px", cursor: "pointer", fontSize: 11, color: W.textMuted, fontWeight: 500 }}>
                <span style={{ fontWeight: 700, color: W.text }}>{socialFollowers.length}</span> followers
              </button>
            </div>
          </div>
        </div>
        {/* 3-button action row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          <button onClick={() => setShowAccountPanel(true)} style={{ padding: "9px 4px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, fontSize: 12, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>⚙️ Settings</button>
          <button onClick={() => setScreen("social")} style={{ padding: "9px 4px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, fontSize: 12, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>👥 Social</button>
          <button onClick={goToLeaderboard} style={{ padding: "9px 4px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, fontSize: 12, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>🏆 Board</button>
        </div>

        {/* Pending follow requests — collapsible */}
        {myFollowRequests.length > 0 && (
          <div style={{ border: `1px solid ${W.border}`, borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
            <button onClick={() => setFollowRequestsOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: W.surface, border: "none", padding: "12px 16px", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>Follow Requests</span>
                <span style={{ background: W.accent, color: "#fff", borderRadius: 20, minWidth: 20, height: 20, fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{myFollowRequests.length}</span>
              </div>
              <span style={{ fontSize: 12, color: W.textDim }}>{followRequestsOpen ? "▲" : "▼"}</span>
            </button>
            {followRequestsOpen && (
              <div style={{ background: W.surface2, borderTop: `1px solid ${W.border}`, padding: "8px 16px" }}>
                {myFollowRequests.map(req => (
                  <div key={req.from} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${W.border}` }}>
                    <div onClick={() => openUserProfile(req.from, req.fromDisplay, "profile")} style={{ flex: 1, cursor: "pointer" }}>
                      <div style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{req.fromDisplay}</div>
                      <div style={{ fontSize: 11, color: W.accent }}>@{req.from} ›</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => acceptFollowRequest(req.from, req.fromDisplay)} style={{ padding: "5px 12px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Accept</button>
                      <button onClick={() => denyFollowRequest(req.from)} style={{ padding: "5px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Deny</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showAccountPanel && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.65)", overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px 40px" }} onClick={() => setShowAccountPanel(false)}>
          <div style={{ background: W.surface, borderRadius: 20, padding: "20px", width: "100%", maxWidth: 440, border: `1px solid ${W.border}`, position: "relative", marginTop: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: W.text, fontSize: 17 }}>Settings</div>
              <button onClick={() => setShowAccountPanel(false)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: W.textMuted, cursor: "pointer" }}>×</button>
            </div>

            {/* Account info row */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{editDisplayName || currentUser?.displayName}</div>
                <div style={{ fontSize: 12, color: W.textMuted }}>@{currentUser?.username}</div>
              </div>
              <div style={{ background: W.green, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: W.greenDark }}>● Signed In</div>
            </div>

            {/* Display name editor */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Display Name</div>
              <input
                value={editDisplayName}
                onChange={e => setEditDisplayName(e.target.value)}
                onBlur={e => { const v = e.target.value.trim(); if (v) { setEditDisplayName(v); setCurrentUser(u => ({ ...u, displayName: v })); } }}
                placeholder={currentUser?.username}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 14, fontFamily: "inherit" }}
              />
            </div>

            {/* Profile picture */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Profile Picture</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {profilePic
                  ? <img src={profilePic} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", border: `2px solid ${W.accent}` }} />
                  : <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🧗</div>
                }
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => picRef.current?.click()} style={{ padding: "6px 14px", background: W.accent + "22", border: `1px solid ${W.accent}`, borderRadius: 10, color: W.accent, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Upload Photo</button>
                  {profilePic && <button onClick={() => setProfilePic(null)} style={{ padding: "5px 14px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontSize: 12, cursor: "pointer" }}>Remove</button>}
                </div>
              </div>
              <input ref={picRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleProfilePicUpload} />
            </div>

            {/* Boulder grading */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Boulder Grading</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["V-Scale", "French", "Custom"].map(s => (
                  <button key={s} onClick={() => setPreferredScale(s)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: preferredScale === s ? W.accent : W.border, background: preferredScale === s ? W.accent + "22" : W.surface2, color: preferredScale === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: preferredScale === s ? 700 : 500 }}>{s === "Custom" ? customBoulderScaleName : s}</button>
                ))}
              </div>
              {preferredScale === "Custom" && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Scale name</div>
                  <input
                    value={customBoulderScaleName}
                    onChange={e => setCustomBoulderScaleName(e.target.value)}
                    placeholder="e.g. Gym Grades"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Grades (easiest → hardest, one per line or comma-separated)</div>
                  <textarea
                    value={customBoulderInput}
                    onChange={e => setCustomBoulderInput(e.target.value)}
                    onBlur={e => { const parsed = e.target.value.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); setCustomBoulderGrades(parsed); setCustomBoulderInput(parsed.join(", ")); }}
                    placeholder={"Easy\nMedium\nHard\nVery Hard"}
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 10px", color: W.text, fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
                  />
                  {customBoulderGrades.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {customBoulderGrades.map((g, i) => (
                        <span key={i} style={{ background: W.accent + "22", color: W.accent, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rope grading */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Rope Grading</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["YDS", "French", "Custom"].map(s => (
                  <button key={s} onClick={() => setPreferredRopeScale(s)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: preferredRopeScale === s ? W.accent : W.border, background: preferredRopeScale === s ? W.accent + "22" : W.surface2, color: preferredRopeScale === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: preferredRopeScale === s ? 700 : 500 }}>{s === "Custom" ? customRopeScaleName : s}</button>
                ))}
              </div>
              {preferredRopeScale === "Custom" && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Scale name</div>
                  <input
                    value={customRopeScaleName}
                    onChange={e => setCustomRopeScaleName(e.target.value)}
                    placeholder="e.g. Local Wall Grades"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }}
                  />
                  <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Grades (easiest → hardest, one per line or comma-separated)</div>
                  <textarea
                    value={customRopeInput}
                    onChange={e => setCustomRopeInput(e.target.value)}
                    onBlur={e => { const parsed = e.target.value.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); setCustomRopeGrades(parsed); setCustomRopeInput(parsed.join(", ")); }}
                    placeholder={"Easy\nMedium\nHard\nProject"}
                    rows={3}
                    style={{ width: "100%", boxSizing: "border-box", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 10px", color: W.text, fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
                  />
                  {customRopeGrades.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {customRopeGrades.map((g, i) => (
                        <span key={i} style={{ background: W.accent + "22", color: W.accent, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* App Theme */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>App Theme</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { id: "espresso", label: "Espresso", icon: "☕",  desc: "Dark warm" },
                  { id: "alpine",   label: "Alpine",   icon: "🏔",  desc: "Light natural" },
                  { id: "chalk",    label: "Chalk",    icon: "🎨",  desc: "Warm bright" },
                  { id: "neon",     label: "Neon",     icon: "⚡",  desc: "Black + cyan" },
                  { id: "midnight", label: "Midnight", icon: "🌙",  desc: "Dark navy" },
                  { id: "ember",    label: "Ember",    icon: "🔥",  desc: "Dark amber" },
                  { id: "abyss",    label: "Abyss",    icon: "🔵",  desc: "Black + blue" },
                  { id: "forest",   label: "Forest",   icon: "🌲",  desc: "Dark green" },
                  { id: "dusk",     label: "Dusk",     icon: "🌆",  desc: "Dark purple" },
                  { id: "blossom",  label: "Blossom",  icon: "🌸",  desc: "Pink light" },
                  { id: "sakura",   label: "Sakura",   icon: "🌺",  desc: "Dark pink" },
                  { id: "slate",    label: "Slate",    icon: "🩶",  desc: "Cool gray" },
                  { id: "crimson",  label: "Crimson",  icon: "🩸",  desc: "Dark red" },
                ].map(t => (
                  <button key={t.id} onClick={() => setColorTheme(t.id)} style={{ padding: "8px 4px", borderRadius: 12, border: `2px solid`, borderColor: colorTheme === t.id ? W.accent : W.border, background: colorTheme === t.id ? W.accent + "22" : W.surface2, color: colorTheme === t.id ? W.accent : W.textDim, cursor: "pointer", fontSize: 10, fontWeight: colorTheme === t.id ? 700 : 500, textAlign: "center", position: "relative" }}>
                    {colorTheme === t.id && <div style={{ position: "absolute", top: 4, right: 6, fontSize: 10, fontWeight: 900, color: W.accent }}>✓</div>}
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{t.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 1 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notification preferences */}
            <div style={{ marginBottom: 14, border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setNotifPrefsOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: W.surface2, border: "none", padding: "10px 12px", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Notification Preferences</span>
                <span style={{ fontSize: 12, color: W.textDim }}>{notifPrefsOpen ? "▲" : "▼"}</span>
              </button>
              {notifPrefsOpen && (
                <div style={{ padding: "10px 12px", borderTop: `1px solid ${W.border}` }}>
                  {[
                    { key: "follows", label: "New followers" },
                    { key: "sessions", label: "New sessions from people you follow" },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: W.text }}>{label}</span>
                      <button onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key] }))} style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: notifPrefs[key] ? W.accent : W.border, cursor: "pointer", position: "relative", flexShrink: 0, marginLeft: 12, transition: "background 0.2s" }}>
                        <div style={{ position: "absolute", top: 3, left: notifPrefs[key] ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Privacy</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, color: W.text, fontWeight: 600 }}>Private account</div>
                  <div style={{ fontSize: 11, color: W.textDim, marginTop: 2 }}>Non-followers can't see your sessions or stats</div>
                </div>
                <button onClick={() => setIsPrivate(p => !p)} style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: isPrivate ? W.accent : W.border, cursor: "pointer", position: "relative", flexShrink: 0, marginLeft: 12, transition: "background 0.2s" }}>
                  <div style={{ position: "absolute", top: 3, left: isPrivate ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
              </div>
            </div>

            {saveStatus && (
              <div style={{ background: saveStatus === "saved" ? W.green : saveStatus === "error" ? W.red : W.yellow, borderRadius: 10, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: saveStatus === "saved" ? W.greenDark : saveStatus === "error" ? W.redDark : W.yellowDark }}>
                {saveStatus === "saving" ? "💾 Saving…" : saveStatus === "saved" ? "✓ All changes saved" : "⚠️ Save failed — check connection"}
              </div>
            )}
            {!confirmLogout
              ? <button onClick={() => setConfirmLogout(true)} style={{ width: "100%", padding: "11px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Sign Out</button>
              : <div style={{ background: W.red, borderRadius: 12, padding: "14px", border: `1px solid ${W.redDark}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W.redDark, marginBottom: 10 }}>Sign out of @{currentUser?.username}?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setConfirmLogout(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleLogout} style={{ padding: "9px", background: W.redDark, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Sign Out</button>
                  </div>
                </div>}
          </div>
          </div>
        )}

        <div style={{ display: "flex", background: W.surface2, borderRadius: 12, padding: 4, marginBottom: 22, border: `1px solid ${W.border}` }}>
          {[{ id: "stats", label: "📊 Stats" }, { id: "logbook", label: "📖 Logbook" }, { id: "projects", label: "🎯 Projects" }].map(tab => (
            <button key={tab.id} onClick={() => setProfileTab(tab.id)} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: profileTab === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: profileTab === tab.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{tab.label}</button>
          ))}
        </div>

        {profileTab === "stats" && (() => {
          const tfLabels = { "2w": "Past 2 Weeks", "1m": "Past Month", "6m": "Past 6 Months", "1y": "Past Year", "all": "All Time" };
          const tfSessions = getTimeframeSessions();

          // ── Per-type filtered sessions ─────────────────────────
          const boulderFilter = c => c.climbType === "boulder" || !c.climbType;
          const boulderSessions = tfSessions.map(s => ({ ...s, climbs: s.climbs.filter(boulderFilter) })).filter(s => s.climbs.length > 0);
          const ropeSessions    = tfSessions.map(s => ({ ...s, climbs: s.climbs.filter(c => c.climbType === "rope") })).filter(s => s.climbs.length > 0);
          const boulderStats    = getStats(boulderSessions);
          const ropeStats       = getStats(ropeSessions);

          // ── Speed data ─────────────────────────────────────────
          const allSpeedSessions  = tfSessions.flatMap(s => s.climbs.filter(c => c.climbType === "speed-session"));
          const allSpeedAttempts  = allSpeedSessions.flatMap(ss => ss.attempts || []).sort((a, b) => a.loggedAt - b.loggedAt);
          const timedAttempts     = allSpeedAttempts.filter(a => !a.fell && a.time != null);
          const fellAttempts      = allSpeedAttempts.filter(a => a.fell);
          const speedPB_val       = timedAttempts.length ? Math.min(...timedAttempts.map(a => a.time)) : null;
          const totalSpeedSec     = allSpeedSessions.reduce((sum, ss) => sum + Math.max(0, Math.floor(((ss.endedAt || ss.loggedAt) - ss.startedAt) / 1000)), 0);
          const successRatio      = allSpeedAttempts.length > 0 ? Math.round((timedAttempts.length / allSpeedAttempts.length) * 100) : 0;

          // ── Chart bucket builder ───────────────────────────────
          const buildBuckets = (climbFilter) => {
            const now = new Date();
            const mkB = (label, ss) => {
              const cls = ss.flatMap(s => climbFilter ? s.climbs.filter(climbFilter) : s.climbs.filter(c => c.climbType !== "speed-session"));
              const allCls = ss.flatMap(s => s.climbs);
              const bCls = allCls.filter(c => c.climbType === "boulder" || !c.climbType);
              const rCls = allCls.filter(c => c.climbType === "rope");
              const sCls = allCls.filter(c => c.climbType === "speed-session");
              const bSec = ss.reduce((t, s) => t + (s.boulderTotalSec || 0), 0);
              const rSec = ss.reduce((t, s) => t + (s.ropeTotalSec || 0), 0);
              const sSec = sCls.reduce((t, c) => t + Math.max(0, Math.floor(((c.endedAt || c.loggedAt) - c.startedAt) / 1000)), 0);
              const totalSec = ss.reduce((t, s) => t + (s.duration || 0), 0);
              const typeSplit = {
                time: (bSec + rSec + sSec > 0) ? { boulder: bSec, rope: rSec, speed: sSec } : { boulder: totalSec, rope: 0, speed: 0 },
                sends: { boulder: bCls.filter(c => c.completed).length, rope: rCls.filter(c => c.completed).length, speed: 0 },
                attempts: { boulder: bCls.reduce((t,c)=>t+c.tries,0), rope: rCls.reduce((t,c)=>t+c.tries,0), speed: sCls.reduce((t,c)=>t+(c.attempts?.length||0),0) },
              };
              return { label, sessions: ss, sends: cls.filter(c => c.completed).length, attempts: cls.reduce((t, c) => t + c.tries, 0), time: totalSec, typeSplit };
            };
            if (statsTimeFrame === "2w") return Array.from({ length: 14 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - 13 + i); const key = d.toISOString().slice(0, 10); return mkB(["Su","Mo","Tu","We","Th","Fr","Sa"][d.getDay()], tfSessions.filter(s => s.date.slice(0, 10) === key)); });
            if (statsTimeFrame === "1m") return Array.from({ length: 5 }, (_, i) => { const ws = new Date(now); ws.setDate(ws.getDate() - (4-i)*7); ws.setHours(0,0,0,0); const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59,999); const label = `${ws.getMonth()+1}/${ws.getDate()}-${we.getMonth()+1}/${we.getDate()}`; return mkB(label, tfSessions.filter(s => { const d = new Date(s.date); return d >= ws && d <= we; })); });
            if (statsTimeFrame === "all") { if (!sessions.length) return []; const earliest = new Date(Math.min(...sessions.map(s => new Date(s.date).getTime()))); const sy = earliest.getFullYear(), sm = earliest.getMonth(); const totalMonths = (now.getFullYear() - sy) * 12 + (now.getMonth() - sm) + 1; return Array.from({ length: totalMonths }, (_, i) => { const d = new Date(sy, sm + i, 1); const ss = sessions.filter(s => { const sd = new Date(s.date); return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth(); }); return mkB(d.getMonth() === 0 ? String(d.getFullYear()) : "", ss); }); }
            const months = statsTimeFrame === "6m" ? 6 : 12;
            return Array.from({ length: months }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - (months-1) + i, 1); return mkB(d.toLocaleDateString("en-US", { month: "short" }), tfSessions.filter(s => { const sd = new Date(s.date); return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth(); })); });
          };

          const chartBuckets   = buildBuckets(null);
          const boulderBuckets = buildBuckets(boulderFilter);
          const ropeBuckets    = buildBuckets(c => c.climbType === "rope");

          const chartConfigs = {
            time:     { key: "time",     color: W.purpleDark, xform: v => Math.round(v / 60), unit: "min", label: "Time on Wall" },
            sends:    { key: "sends",    color: W.greenDark,  xform: v => v,                   unit: "",    label: "Sends" },
            attempts: { key: "attempts", color: W.accent,     xform: v => v,                   unit: "",    label: "Attempts" },
          };

          // Shared chart renderer (called as plain function)
          const renderChart = (buckets) => {
            const { key: cKey, color: cColor, xform: cXform, unit: cUnit } = chartConfigs[statsChart];
            const cVals = buckets.map(b => cXform(b[cKey]));
            const displayVals = statsCumulative ? cVals.reduce((acc, v) => { acc.push((acc[acc.length - 1] || 0) + v); return acc; }, []) : cVals;
            const cMax = Math.max(...displayVals, 1);
            return (
              <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Activity</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => { setStatsCumulative(c => !c); setStatsBarSel(null); }} style={{ padding: "4px 10px", borderRadius: 10, border: `1px solid ${statsCumulative ? W.accent : W.border}`, background: statsCumulative ? W.accent + "33" : W.surface2, color: statsCumulative ? W.accent : W.textDim, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{statsCumulative ? "Cumulative" : "Per Period"}</button>
                    <select value={statsChart} onChange={e => { setStatsChart(e.target.value); setStatsBarSel(null); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "5px 10px", color: W.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <option value="time">Time on Wall</option>
                      <option value="sends">Sends</option>
                      <option value="attempts">Attempts</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: W.textDim }}>{statsCumulative ? "cumulative" : "total"}: {cVals.reduce((a,b)=>a+b,0)}{cUnit ? ` ${cUnit}` : ""}</span>
                  {statsBarSel !== null && displayVals[statsBarSel] !== undefined && (
                    <span style={{ fontSize: 12, fontWeight: 800, color: cColor }}>{buckets[statsBarSel]?.label}: {displayVals[statsBarSel]}{cUnit ? ` ${cUnit}` : ""}</span>
                  )}
                </div>
                {statsTimeFrame === "all" ? (() => {
                  const pts = displayVals.map((v, i) => ({ x: displayVals.length > 1 ? (i / (displayVals.length - 1)) * 300 : 150, y: 56 - Math.round((v / cMax) * 52), v }));
                  return (
                    <div style={{ position: "relative" }}>
                      <svg width="100%" height={64} viewBox="0 0 300 64" preserveAspectRatio="none" style={{ display: "block" }}>
                        <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={cColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={statsBarSel === i ? 5 : 3} fill={statsBarSel === i ? cColor : W.surface2} stroke={cColor} strokeWidth={2} style={{ cursor: "pointer" }} onClick={() => setStatsBarSel(statsBarSel === i ? null : i)} />)}
                      </svg>
                    </div>
                  );
                })() : (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 64 }}>
                    {displayVals.map((v, i) => {
                      const split = buckets[i]?.typeSplit?.time;
                      const splitTotal = split ? (split.boulder + split.rope + split.speed) : 0;
                      const barH = Math.max(Math.round((v / cMax) * 100), v > 0 ? 4 : 1);
                      const opacity = statsBarSel === null || statsBarSel === i ? (v > 0 ? 1 : 0.3) : 0.25;
                      return (
                        <div key={i} onClick={() => setStatsBarSel(statsBarSel === i ? null : i)} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}>
                          <div style={{ width: "100%", borderRadius: "3px 3px 0 0", height: `${barH}%`, opacity, outline: statsBarSel === i ? `2px solid ${cColor}` : "none", transition: "opacity 0.15s", overflow: "hidden", display: "flex", flexDirection: "column", background: v > 0 ? W.greenDark : W.border }}>
                            {split && splitTotal > 0 && v > 0 ? (
                              <>
                                {split.speed > 0 && <div style={{ height: `${(split.speed / splitTotal) * 100}%`, background: W.yellowDark, minHeight: 2 }} />}
                                {split.rope > 0 && <div style={{ height: `${(split.rope / splitTotal) * 100}%`, background: W.purpleDark, minHeight: 2 }} />}
                                <div style={{ flex: 1, background: W.greenDark, minHeight: split.boulder > 0 ? 2 : 0 }} />
                              </>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 2, marginTop: 3, marginBottom: 6 }}>
                  {buckets.map((b, i) => <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 7, color: statsBarSel === i ? cColor : W.textDim, fontWeight: statsBarSel === i ? 900 : 700, overflow: "hidden" }}>{b.label}</div>)}
                </div>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  {[["boulder", W.greenDark, "Boulder"], ["rope", W.purpleDark, "Rope"], ["speed", W.yellowDark, "Speed"]].map(([type, color, label]) => (
                    <div key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: 10, color: W.textDim }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingTop: 6, paddingBottom: 2 }}>
                  {[["2w","2W"],["1m","1M"],["6m","6M"],["1y","1Y"],["all","All"]].map(([id, lbl]) => (
                    <button key={id} onClick={() => { setStatsTimeFrame(id); setStatsBarSel(null); }} style={{ flexShrink: 0, padding: "4px 10px", borderRadius: 14, border: "2px solid", borderColor: statsTimeFrame === id ? W.accent : W.border, background: statsTimeFrame === id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.surface, color: statsTimeFrame === id ? "#fff" : W.textDim, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{lbl}</button>
                  ))}
                </div>
              </div>
            );
          };

          // Shared stat card grid renderer
          const renderStatCards = (cards) => (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {cards.filter(Boolean).map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.tc }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          );

          // Shared grade breakdown renderer
          const renderGradeBreakdown = (gradeBreakdown) => {
            if (!gradeBreakdown || !gradeBreakdown.length) return null;
            const max = Math.max(...gradeBreakdown.map(g => g.count));
            return (
              <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Grade Breakdown</div>
                {gradeBreakdown.map(({ grade, count }) => (
                  <div key={grade} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: getGradeColor(grade) }}>{grade}</span>
                      <span style={{ fontSize: 12, color: W.textDim }}>{count} send{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: W.surface2, borderRadius: 6, height: 8, overflow: "hidden" }}>
                      <div style={{ width: `${Math.round((count / max) * 100)}%`, height: "100%", borderRadius: 6, background: getGradeColor(grade) }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          };

          // Overall: bar selection → re-filter stats
          const selBucket    = statsBarSel !== null ? chartBuckets[statsBarSel] : null;
          const displayStats = selBucket ? getStats(selBucket.sessions) : stats;
          const selLabel     = selBucket ? (selBucket.label || `Point ${statsBarSel + 1}`) : null;

          // Boulder: bar selection → filter sessions to boulder
          const boulderSelRaw = statsBarSel !== null ? boulderBuckets[statsBarSel] : null;
          const boulderSelSessions = boulderSelRaw ? boulderSelRaw.sessions.map(s => ({ ...s, climbs: s.climbs.filter(boulderFilter) })).filter(s => s.climbs.length > 0) : null;
          const boulderDisplayStats = boulderSelSessions ? getStats(boulderSelSessions) : boulderStats;
          const boulderSelLabel = boulderSelRaw ? (boulderSelRaw.label || `Point ${statsBarSel + 1}`) : null;

          // Rope: bar selection → filter sessions to rope
          const ropeSelRaw = statsBarSel !== null ? ropeBuckets[statsBarSel] : null;
          const ropeSelSessions = ropeSelRaw ? ropeSelRaw.sessions.map(s => ({ ...s, climbs: s.climbs.filter(c => c.climbType === "rope") })).filter(s => s.climbs.length > 0) : null;
          const ropeDisplayStats = ropeSelSessions ? getStats(ropeSelSessions) : ropeStats;
          const ropeSelLabel = ropeSelRaw ? (ropeSelRaw.label || `Point ${statsBarSel + 1}`) : null;

          // Grade pie data (overall only)
          const effectivePieScale = pieScale || preferredScale;
          const pieGradeList = effectivePieScale === "Custom"
            ? [...new Set([...customBoulderGrades, ...customRopeGrades])]
            : (GRADES[effectivePieScale] || []);
          const pieGrades = pieGradeList.filter(g => !pieHiddenGrades.includes(g));
          const pieClimbs = tfSessions.flatMap(s => s.climbs).filter(c => c.scale === effectivePieScale);
          const pieData = (() => {
            const raw = pieGrades.map(g => {
              const gc = pieClimbs.filter(c => c.grade === g);
              const value = pieStat === "attempts" ? gc.reduce((t, c) => t + c.tries, 0) : pieStat === "sends" ? gc.filter(c => c.completed).length : gc.filter(c => c.completed && c.tries === 1).length;
              return { grade: g, value, color: getGradeColor(g) };
            }).filter(d => d.value > 0);
            const total = raw.reduce((s, d) => s + d.value, 0);
            if (!total) return { slices: [], total: 0 };
            let angle = -Math.PI / 2;
            const slices = raw.map(d => {
              const sweep = (d.value / total) * 2 * Math.PI;
              const end = angle + sweep; const sa = angle; angle = end;
              const ir = 22, cx = 50, cy = 50;
              const mkPath = (r) => { const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end),ix1=cx+ir*Math.cos(sa),iy1=cy+ir*Math.sin(sa),ix2=cx+ir*Math.cos(end),iy2=cy+ir*Math.sin(end),large=sweep>Math.PI?1:0; return `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${ir} ${ir} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`; };
              return { ...d, path: mkPath(42), pathSel: mkPath(47) };
            });
            return { slices, total };
          })();

          return (
          <div>
            {/* ── Category tabs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, marginBottom: 16, background: W.surface2, borderRadius: 14, padding: 4, border: `1px solid ${W.border}` }}>
              {[
                { id: "overall", label: "Overall", icon: "📊" },
                { id: "boulder", label: "Boulder", icon: "🪨" },
                { id: "rope",    label: "Rope",    icon: "🪢" },
                { id: "speed",   label: "Speed",   icon: "⚡" },
              ].map(tab => (
                <button key={tab.id} onClick={() => { setStatsCategory(tab.id); localStorage.setItem("statsCategory", tab.id); setStatsBarSel(null); }} style={{ padding: "8px 2px", borderRadius: 10, border: "none", background: statsCategory === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: statsCategory === tab.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 11, cursor: "pointer", lineHeight: 1.5 }}>
                  <div style={{ fontSize: 16 }}>{tab.icon}</div>
                  <div>{tab.label}</div>
                </button>
              ))}
            </div>

            {/* ══ OVERALL ══════════════════════════════════════════ */}
            {statsCategory === "overall" && (
              <div>
                {/* Streak counter */}
                {(() => {
                  const dayKeys = new Set(sessions.map(s => s.date.slice(0, 10)));
                  const weekKey = (d) => { const dt = new Date(d); dt.setHours(0,0,0,0); dt.setDate(dt.getDate() - dt.getDay()); return dt.toISOString().slice(0, 10); };
                  const weekKeys = new Set([...dayKeys].map(weekKey));
                  // Current streak: count consecutive weeks back from current week
                  let streak = 0, best = 0, cur = 0;
                  const nowWk = weekKey(new Date());
                  const dt = new Date(); dt.setHours(0,0,0,0); dt.setDate(dt.getDate() - dt.getDay());
                  for (let i = 0; i < 260; i++) {
                    const k = dt.toISOString().slice(0, 10);
                    if (weekKeys.has(k)) { cur++; best = Math.max(best, cur); if (i === 0 || weekKeys.has(k)) streak = cur; }
                    else { if (i === 0) { streak = 0; } else break; }
                    dt.setDate(dt.getDate() - 7);
                  }
                  // Recalculate streak properly
                  const allWeeks = [...weekKeys].sort((a,b)=>b.localeCompare(a));
                  streak = 0; cur = 0;
                  let expectedWk = new Date(); expectedWk.setHours(0,0,0,0); expectedWk.setDate(expectedWk.getDate() - expectedWk.getDay());
                  for (let i = 0; i < 260; i++) {
                    const k = expectedWk.toISOString().slice(0, 10);
                    if (weekKeys.has(k)) { streak++; expectedWk.setDate(expectedWk.getDate() - 7); }
                    else if (i === 0) { expectedWk.setDate(expectedWk.getDate() - 7); continue; }
                    else break;
                  }
                  // Best streak
                  const sortedWks = [...weekKeys].sort();
                  let bestStreak = 0, runStreak = 0, prevWk = null;
                  for (const wk of sortedWks) {
                    if (!prevWk) { runStreak = 1; }
                    else { const prev = new Date(prevWk); prev.setDate(prev.getDate() + 7); runStreak = prev.toISOString().slice(0,10) === wk ? runStreak + 1 : 1; }
                    bestStreak = Math.max(bestStreak, runStreak); prevWk = wk;
                  }
                  if (streak === 0 && sessions.length === 0) return null;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                      <div style={{ background: streak > 0 ? W.accent + "18" : W.surface2, border: `1px solid ${streak > 0 ? W.accent : W.border}`, borderRadius: 14, padding: "12px 14px" }}>
                        <div style={{ fontSize: 22 }}>🔥</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: streak > 0 ? W.accent : W.textDim }}>{streak}w</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>Current Streak</div>
                        <div style={{ fontSize: 11, color: W.textMuted }}>{streak === 0 ? "No sessions this week" : `${streak} week${streak !== 1 ? "s" : ""} in a row`}</div>
                      </div>
                      <div style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, padding: "12px 14px" }}>
                        <div style={{ fontSize: 22 }}>🏅</div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: W.goldLight || W.accent }}>{bestStreak}w</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>Best Streak</div>
                        <div style={{ fontSize: 11, color: W.textMuted }}>{bestStreak} week{bestStreak !== 1 ? "s" : ""} personal best</div>
                      </div>
                    </div>
                  );
                })()}
                {!statsShowCalendar ? renderChart(chartBuckets) : (
                  <div style={{ background: W.surface, borderRadius: 16, border: `1px solid ${W.border}`, marginBottom: 10, overflow: "hidden" }}>{CalendarScreen()}</div>
                )}
                <button onClick={() => setStatsShowCalendar(s => !s)} style={{ width: "100%", padding: "12px", background: statsShowCalendar ? W.surface2 : `linear-gradient(135deg, ${W.gold}, #d97706)`, border: `1px solid ${W.border}`, borderRadius: 14, color: statsShowCalendar ? W.textMuted : "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
                  {statsShowCalendar ? "📊 View Stats Chart" : "📅 View Climbing Calendar"}
                </button>
                <div style={{ marginBottom: 16 }}>
                  <button onClick={() => setAnalyzeOpen(o => !o)} style={{ width: "100%", padding: "13px 16px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: analyzeOpen ? "14px 14px 0 0" : "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>🔍</span><span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>Filter by Scale / Grade</span></div>
                    <span style={{ color: W.textMuted, fontSize: 18 }}>⌄</span>
                  </button>
                  {analyzeOpen && (
                    <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px" }}>
                      <Label>Scale</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {["All Scales", ...Object.keys(GRADES), ...(customAllGrades.length > 0 ? ["Custom"] : [])].map(s => <button key={s} onClick={() => { setStatsScaleFilter(s); setStatsGradeFilter("All"); }} style={{ padding: "5px 12px", borderRadius: 16, border: "2px solid", borderColor: statsScaleFilter === s ? W.accent : W.border, background: statsScaleFilter === s ? W.accent + "22" : W.surface, color: statsScaleFilter === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{s === "Custom" && customBoulderScaleName !== "Custom" ? customBoulderScaleName : s}</button>)}
                      </div>
                      <Label>Grade</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {availableGrades.map(g => <button key={g} onClick={() => setStatsGradeFilter(g)} style={{ padding: "5px 12px", borderRadius: 16, border: "2px solid", borderColor: statsGradeFilter === g ? W.accent : W.border, background: statsGradeFilter === g ? W.accent + "22" : W.surface, color: statsGradeFilter === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{g}</button>)}
                      </div>
                    </div>
                  )}
                </div>
                {renderStatCards([
                  { icon: "🧗", label: "Total Sends",        value: displayStats.completed.length,                  sub: selLabel || tfLabels[statsTimeFrame], bg: W.surface2,  tc: W.accent },
                  { icon: "⏱", label: "Time Climbed",        value: formatTotalTime(displayStats.totalTimeClimbed), sub: selLabel || tfLabels[statsTimeFrame], bg: W.purple,    tc: W.purpleDark },
                  { icon: "🔁", label: "Total Attempts",      value: displayStats.totalAttempts,                     sub: selLabel || tfLabels[statsTimeFrame], bg: W.green,     tc: W.greenDark },
                  { icon: "📅", label: "Sessions",            value: displayStats.sessionCount,                      sub: selLabel || tfLabels[statsTimeFrame], bg: W.surface2,  tc: W.accentDark },
                  { icon: "⚡", label: "Flash Rate",          value: `${displayStats.flashRate}%`,                   sub: `${displayStats.flashes.length} flashes`,             bg: W.yellow,    tc: W.yellowDark },
                  { icon: "🏆", label: "Best Grade",          value: displayStats.bestGrade,                         sub: `${preferredScale} · ${selLabel || tfLabels[statsTimeFrame]}`, bg: W.goldLight, tc: W.yellowDark },
                  { icon: "✅", label: "Projects Sent",       value: completedProjects.length,                       sub: "all time",                           bg: W.green,     tc: W.greenDark },
                  { icon: "🎯", label: "Active Projects",     value: activeProjects.length,                          sub: "in progress",                        bg: W.pink,      tc: W.pinkDark },
                  { icon: "📈", label: "Best Day (Climbs)",   value: displayStats.mostInDay,                         sub: "climbs in one session",              bg: W.surface2,  tc: W.accentDark },
                  { icon: "💥", label: "Best Day (Attempts)", value: displayStats.mostAttemptsInDay,                 sub: "attempts in one session",            bg: W.surface2,  tc: W.accentDark },
                  { icon: "📍", label: "Unique Gyms",         value: displayStats.uniqueGyms,                        sub: "visited",                            bg: W.surface2,  tc: W.accent },
                  { icon: "🏅", label: "Top Gym Visits",      value: displayStats.mostGymVisits,                     sub: "visits to one gym",                  bg: W.goldLight, tc: W.yellowDark },
                  { icon: "😴", label: "Avg Rest Days",       value: displayStats.avgRestDays,                       sub: "between sessions",                   bg: W.surface2,  tc: W.accentDark },
                  { icon: "🔁", label: "Avg Tries",           value: displayStats.avgTries,                          sub: "per climb",                          bg: W.green,     tc: W.greenDark },
                  { icon: "⏸", label: "Avg Rest (Climbs)",   value: formatRestSec(displayStats.avgClimbRestSec),    sub: "between logged climbs",              bg: W.purple,    tc: W.purpleDark },
                  { icon: "🐢", label: "Longest Climb Rest",  value: formatRestSec(displayStats.maxClimbRestSec),    sub: "single longest gap",                 bg: W.surface2,  tc: W.accentDark },
                  ...(displayStats.speedPB != null ? [{ icon: "⚡", label: "Speed PB", value: `${displayStats.speedPB.toFixed(2)}s`, sub: selLabel || tfLabels[statsTimeFrame], bg: W.yellow, tc: W.yellowDark }] : []),
                ])}
                {displayStats.gradeBreakdown.length > 0 && renderGradeBreakdown(displayStats.gradeBreakdown)}
                {/* Grade Pie Chart */}
                <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Grade Pie Chart</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <select value={pieStat} onChange={e => { setPieStat(e.target.value); setPieSelGrade(null); }} style={{ flex: 1, background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 8px", color: W.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      <option value="attempts">Total Attempts</option>
                      <option value="sends">Total Sends</option>
                      <option value="flashes">Total Flashes</option>
                    </select>
                    <select value={effectivePieScale} onChange={e => { setPieScale(e.target.value); setPieHiddenGrades([]); setPieSelGrade(null); }} style={{ flex: 1, background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 8px", color: W.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      {Object.keys(GRADES).map(s => <option key={s} value={s}>{s}</option>)}
                      {[...new Set([...customBoulderGrades, ...customRopeGrades])].length > 0 && <option value="Custom">{customBoulderScaleName !== "Custom" ? customBoulderScaleName : "Custom"}</option>}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                    {pieGradeList.map(g => { const hidden = pieHiddenGrades.includes(g); return (<button key={g} onClick={() => { setPieHiddenGrades(prev => hidden ? prev.filter(x => x !== g) : [...prev, g]); setPieSelGrade(null); }} style={{ padding: "3px 10px", borderRadius: 12, border: `2px solid ${hidden ? W.border : getGradeColor(g)}`, background: hidden ? W.surface2 : getGradeColor(g) + "33", color: hidden ? W.textDim : getGradeColor(g), fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: hidden ? 0.5 : 1 }}>{g}</button>); })}
                  </div>
                  {pieData.total === 0 ? (
                    <div style={{ textAlign: "center", color: W.textDim, fontSize: 13, padding: "20px 0" }}>No data for selected filters</div>
                  ) : (() => {
                    const anySelected = pieSelGrade !== null;
                    const selSlice = pieData.slices.find(s => s.grade === pieSelGrade);
                    return (
                      <div>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                          <svg width={220} height={220} viewBox="-6 -6 112 112" style={{ display: "block" }}>
                            {pieData.slices.map((sl, i) => <path key={i} d={sl.grade === pieSelGrade ? sl.pathSel : sl.path} fill={sl.color} opacity={anySelected ? (sl.grade === pieSelGrade ? 1 : 0.25) : 0.9} style={{ cursor: "pointer", transition: "opacity 0.15s" }} onClick={() => setPieSelGrade(pieSelGrade === sl.grade ? null : sl.grade)} />)}
                            {selSlice ? (<><text x="50" y="44" textAnchor="middle" fontSize="9" fontWeight="bold" fill={selSlice.color}>{selSlice.grade}</text><text x="50" y="57" textAnchor="middle" fontSize="14" fontWeight="bold" fill={W.text}>{selSlice.value}</text><text x="50" y="67" textAnchor="middle" fontSize="7" fill={W.textMuted}>{Math.round((selSlice.value / pieData.total) * 100)}%</text></>) : (<><text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="bold" fill={W.text}>{pieData.total}</text><text x="50" y="58" textAnchor="middle" fontSize="7" fill={W.textMuted}>total</text></>)}
                          </svg>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          {pieData.slices.map(sl => { const isSel = pieSelGrade === sl.grade; return (<div key={sl.grade} onClick={() => setPieSelGrade(pieSelGrade === sl.grade ? null : sl.grade)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", opacity: anySelected ? (isSel ? 1 : 0.4) : 1, transition: "opacity 0.15s", background: isSel ? sl.color + "18" : "transparent", borderRadius: 8, padding: "5px 8px", border: `1px solid ${isSel ? sl.color + "60" : "transparent"}` }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, flexShrink: 0 }} /><span style={{ fontSize: 12, fontWeight: isSel ? 900 : 700, color: sl.color }}>{sl.grade}</span></div><div><span style={{ fontSize: 13, fontWeight: 800, color: isSel ? sl.color : W.text }}>{sl.value}</span><span style={{ fontSize: 10, color: W.textDim, marginLeft: 4 }}>{Math.round((sl.value / pieData.total) * 100)}%</span></div></div>); })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ══ BOULDERING ══════════════════════════════════════ */}
            {statsCategory === "boulder" && (
              <div>
                {boulderSessions.length === 0 ? (
                  <div style={{ textAlign: "center", color: W.textDim, fontSize: 14, padding: "48px 20px" }}>No bouldering data in the selected time frame.</div>
                ) : (
                  <>
                    {renderChart(boulderBuckets)}
                    {renderStatCards([
                      { icon: "🧗", label: "Sends",           value: boulderDisplayStats.completed.length,               sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accent },
                      { icon: "🔁", label: "Total Attempts",  value: boulderDisplayStats.totalAttempts,                  sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.green,    tc: W.greenDark },
                      { icon: "⚡", label: "Flash Rate",      value: `${boulderDisplayStats.flashRate}%`,                sub: `${boulderDisplayStats.flashes.length} flashes`,             bg: W.yellow,   tc: W.yellowDark },
                      { icon: "🏆", label: "Best Grade",      value: boulderDisplayStats.bestGrade,                      sub: preferredScale,                              bg: W.goldLight,tc: W.yellowDark },
                      { icon: "🔄", label: "Avg Tries",       value: boulderDisplayStats.avgTries,                       sub: "per boulder",                               bg: W.surface2, tc: W.accentDark },
                      { icon: "📅", label: "Sessions",        value: boulderDisplayStats.sessionCount,                   sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accentDark },
                      { icon: "📈", label: "Best Day",        value: boulderDisplayStats.mostInDay,                      sub: "boulders in one session",                   bg: W.surface2, tc: W.accentDark },
                      { icon: "💥", label: "Best Day Tries",  value: boulderDisplayStats.mostAttemptsInDay,              sub: "attempts in one session",                   bg: W.surface2, tc: W.accentDark },
                      { icon: "✅", label: "Projects Sent",   value: completedProjects.filter(p => !p.climbType || p.climbType === "boulder").length, sub: "all time", bg: W.green, tc: W.greenDark },
                      { icon: "🎯", label: "Active Projects", value: activeProjects.filter(p => !p.climbType || p.climbType === "boulder").length,   sub: "in progress", bg: W.pink, tc: W.pinkDark },
                      { icon: "⏸", label: "Avg Rest",        value: formatRestSec(boulderDisplayStats.avgClimbRestSec), sub: "between logged climbs",                     bg: W.purple,   tc: W.purpleDark },
                      { icon: "🐢", label: "Longest Rest",    value: formatRestSec(boulderDisplayStats.maxClimbRestSec), sub: "single gap",                                bg: W.surface2, tc: W.accentDark },
                    ])}
                    {renderGradeBreakdown(boulderDisplayStats.gradeBreakdown)}
                  </>
                )}
              </div>
            )}

            {/* ══ ROPE CLIMBING ═══════════════════════════════════ */}
            {statsCategory === "rope" && (
              <div>
                {ropeSessions.length === 0 ? (
                  <div style={{ textAlign: "center", color: W.textDim, fontSize: 14, padding: "48px 20px" }}>No rope climbing data in the selected time frame.</div>
                ) : (
                  <>
                    {renderChart(ropeBuckets)}
                    {renderStatCards([
                      { icon: "🧗", label: "Routes Sent",    value: ropeDisplayStats.completed.length,              sub: ropeSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accent },
                      { icon: "💥", label: "Total Falls",    value: ropeDisplayStats.totalFalls,                    sub: ropeSelLabel || tfLabels[statsTimeFrame], bg: W.red,      tc: W.redDark },
                      { icon: "🎯", label: "Onsight Rate",   value: `${ropeDisplayStats.flashRate}%`,               sub: `${ropeDisplayStats.flashes.length} onsights`,           bg: W.yellow,   tc: W.yellowDark },
                      { icon: "🏆", label: "Best Grade",     value: ropeDisplayStats.bestGrade,                     sub: "rope grades",                           bg: W.goldLight,tc: W.yellowDark },
                      { icon: "🔄", label: "Avg Falls/Route",value: ropeDisplayStats.avgFalls,                      sub: "falls per route",                       bg: W.surface2, tc: W.accentDark },
                      { icon: "📅", label: "Sessions",       value: ropeDisplayStats.sessionCount,                  sub: ropeSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accentDark },
                      { icon: "📈", label: "Best Day",       value: ropeDisplayStats.mostInDay,                     sub: "routes in one session",                 bg: W.surface2, tc: W.accentDark },
                      { icon: "💥", label: "Best Day Falls", value: ropeDisplayStats.mostFallsInDay,                sub: "falls in one session",                  bg: W.surface2, tc: W.accentDark },
                      { icon: "⏸", label: "Avg Rest",       value: formatRestSec(ropeDisplayStats.avgClimbRestSec), sub: "between logged routes",                bg: W.purple,   tc: W.purpleDark },
                      { icon: "🐢", label: "Longest Rest",   value: formatRestSec(ropeDisplayStats.maxClimbRestSec), sub: "single gap",                          bg: W.surface2, tc: W.accentDark },
                    ])}
                    {renderGradeBreakdown(ropeDisplayStats.gradeBreakdown)}
                  </>
                )}
              </div>
            )}

            {/* ══ SPEED CLIMBING ══════════════════════════════════ */}
            {statsCategory === "speed" && (
              <div>
                {/* Time frame selector */}
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[["2w","2W"],["1m","1M"],["6m","6M"],["1y","1Y"],["all","All"]].map(([id, lbl]) => (
                    <button key={id} onClick={() => setStatsTimeFrame(id)} style={{ flex: 1, padding: "6px", borderRadius: 14, border: "2px solid", borderColor: statsTimeFrame === id ? W.accent : W.border, background: statsTimeFrame === id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.surface, color: statsTimeFrame === id ? "#fff" : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{lbl}</button>
                  ))}
                </div>
                {allSpeedAttempts.length === 0 ? (
                  <div style={{ textAlign: "center", color: W.textDim, fontSize: 14, padding: "48px 20px" }}>No speed climbing data in the selected time frame.</div>
                ) : (
                  <>
                    {/* PB hero card */}
                    <div style={{ background: `linear-gradient(135deg, ${W.yellow}, ${W.yellowDark}44)`, borderRadius: 20, padding: "24px 20px", marginBottom: 16, textAlign: "center", border: `2px solid ${W.yellowDark}55` }}>
                      <div style={{ fontSize: 11, color: W.yellowDark, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, opacity: 0.8 }}>Personal Best</div>
                      <div style={{ fontSize: 58, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums", lineHeight: 1, letterSpacing: 1 }}>
                        {speedPB_val != null ? `${speedPB_val.toFixed(2)}s` : "—"}
                      </div>
                      <div style={{ fontSize: 12, color: W.yellowDark, opacity: 0.65, marginTop: 8 }}>{tfLabels[statsTimeFrame]}</div>
                    </div>
                    {/* Stat cards */}
                    {renderStatCards([
                      { icon: "⏱", label: "Total Speed Time",  value: formatTotalTime(totalSpeedSec),       sub: tfLabels[statsTimeFrame],                    bg: W.surface2, tc: W.accent },
                      { icon: "✅", label: "Total Tops",        value: timedAttempts.length,                 sub: "successful attempts",                       bg: W.green,    tc: W.greenDark },
                      { icon: "✗",  label: "Total Falls",       value: fellAttempts.length,                  sub: "failed attempts",                           bg: W.red,      tc: W.redDark },
                      { icon: "📊", label: "Success Rate",      value: `${successRatio}%`,                   sub: `${allSpeedAttempts.length} total attempts`,  bg: W.purple,   tc: W.purpleDark },
                      { icon: "📅", label: "Sessions",          value: allSpeedSessions.length,              sub: tfLabels[statsTimeFrame],                    bg: W.surface2, tc: W.accentDark },
                      { icon: "🔁", label: "Avg per Session",   value: allSpeedSessions.length ? (Math.round(allSpeedAttempts.length / allSpeedSessions.length * 10) / 10) : "—", sub: "attempts per session", bg: W.surface2, tc: W.accentDark },
                    ])}
                    {/* Attempt timeline chart */}
                    {timedAttempts.length > 0 && (() => {
                      const times = timedAttempts.map(a => a.time);
                      const maxT = Math.max(...times), minT = Math.min(...times);
                      const range = maxT - minT || 1;
                      const WC = 300, HC = 90;
                      // Map each timed attempt to an x position across the full chronological range of ALL attempts
                      const totalCount = allSpeedAttempts.length;
                      let timedIdx = 0;
                      const pts = allSpeedAttempts.map((a, i) => {
                        if (a.fell) return null;
                        const x = totalCount > 1 ? (i / (totalCount - 1)) * WC : WC / 2;
                        const y = HC - 14 - Math.round(((a.time - minT) / range) * (HC - 28));
                        const isPB = a.time === speedPB_val;
                        return { x, y, time: a.time, isPB };
                      }).filter(Boolean);
                      const fallPts = allSpeedAttempts.map((a, i) => a.fell ? { x: totalCount > 1 ? (i / (totalCount - 1)) * WC : WC / 2 } : null).filter(Boolean);
                      const pbY = HC - 14 - Math.round(((speedPB_val - minT) / range) * (HC - 28));
                      // PB history (each time a new PB was set)
                      const pbHistory = [];
                      let runningPB = Infinity;
                      allSpeedAttempts.forEach(a => {
                        if (!a.fell && a.time != null && a.time < runningPB) { runningPB = a.time; pbHistory.push({ time: a.time, loggedAt: a.loggedAt }); }
                      });
                      return (
                        <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Attempt Times</div>
                          <svg width="100%" height={HC} viewBox={`0 0 ${WC} ${HC}`} preserveAspectRatio="none" style={{ display: "block", marginBottom: 8 }}>
                            {speedPB_val != null && <line x1={0} y1={pbY} x2={WC} y2={pbY} stroke={W.yellowDark} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />}
                            {pts.length > 1 && <polyline points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} fill="none" stroke={W.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
                            {/* Fall markers — red X at bottom */}
                            {fallPts.map((p, i) => (
                              <g key={`fell-${i}`}>
                                <line x1={p.x - 4} y1={HC - 5} x2={p.x + 4} y2={HC - 13} stroke={W.redDark} strokeWidth={2} strokeLinecap="round" />
                                <line x1={p.x + 4} y1={HC - 5} x2={p.x - 4} y2={HC - 13} stroke={W.redDark} strokeWidth={2} strokeLinecap="round" />
                              </g>
                            ))}
                            {pts.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.isPB ? 5 : 3.5} fill={p.isPB ? W.yellowDark : W.accent} stroke={p.isPB ? W.yellow : W.surface} strokeWidth={1.5} />)}
                          </svg>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 10, color: W.textDim, marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: W.yellowDark }} /><span>PB</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: W.accent }} /><span>Top</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ color: W.redDark, fontWeight: 900, fontSize: 12 }}>✗</span><span>Fall</span></div>
                            {speedPB_val != null && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 14, height: 2, background: W.yellowDark, opacity: 0.7 }} /><span>PB line</span></div>}
                          </div>
                          {/* PB History */}
                          {pbHistory.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>PB History</div>
                              {pbHistory.map((pb, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < pbHistory.length - 1 ? `1px solid ${W.border}` : "none" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ width: 22, height: 22, borderRadius: 6, background: i === pbHistory.length - 1 ? W.yellow : W.surface2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: i === pbHistory.length - 1 ? W.yellowDark : W.textDim }}>
                                      {i === pbHistory.length - 1 ? "⚡" : `#${i + 1}`}
                                    </div>
                                    <span style={{ fontSize: 11, color: W.textMuted }}>{new Date(pb.loggedAt).toLocaleDateString()}</span>
                                  </div>
                                  <span style={{ fontWeight: 900, fontSize: 15, color: i === pbHistory.length - 1 ? W.yellowDark : W.text, fontVariantNumeric: "tabular-nums" }}>{pb.time.toFixed(2)}s</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          );
        })()}

        {profileTab === "logbook" && (
          <div>
            <div style={{ display: "flex", background: W.surface2, borderRadius: 10, padding: 3, marginBottom: 14, border: `1px solid ${W.border}` }}>
              {[{ id: "climbs", label: "By Climb" }, { id: "sessions", label: "By Session" }].map(v => (
                <button key={v.id} onClick={() => setLogbookView(v.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: logbookView === v.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: logbookView === v.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{v.label}</button>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setLogbookFiltersOpen(o => !o)} style={{ width: "100%", padding: "11px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: logbookFiltersOpen ? "12px 12px 0 0" : "12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span>🔽</span><span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>Filters</span>{(logbookView === "climbs" ? hasClimbFilters : hasSessionFilters) && <span style={{ background: W.accent, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Active</span>}</div>
                <span style={{ color: W.textMuted, fontSize: 16 }}>⌄</span>
              </button>
              {logbookFiltersOpen && (
                <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "14px" }}>
                  {logbookView === "sessions" && (
                    <>
                      <Label>Gym</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {allGyms.map(g => <button key={g} onClick={() => setLogbookGymFilter(g)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookGymFilter === g ? W.accent : W.border, background: logbookGymFilter === g ? W.accent + "22" : W.surface, color: logbookGymFilter === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📍 {g}</button>)}
                      </div>
                      <Label>Type</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {[["all","All"],["boulder","Boulder"],["rope","Rope"],["speed","Speed"],["mixed","Mixed"]].map(([val,label]) =>
                          <button key={val} onClick={() => setSessionTypeFilter(val)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: sessionTypeFilter === val ? W.accent : W.border, background: sessionTypeFilter === val ? W.accent + "22" : W.surface, color: sessionTypeFilter === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>
                        )}
                      </div>
                      <Label>Sort By</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button onClick={() => setSessionSort("date")} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: sessionSort === "date" ? W.accent : W.border, background: sessionSort === "date" ? W.accent + "22" : W.surface, color: sessionSort === "date" ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📅 Date</button>
                        {[["climbs", "🧗 Climbs"], ["attempts", "🔁 Attempts"], ["flashes", "⚡ Flashes"]].map(([cat, label]) => {
                          const isDesc = sessionSort === `${cat}-desc`;
                          const isAsc  = sessionSort === `${cat}-asc`;
                          const active = isDesc || isAsc;
                          return (
                            <button key={cat} onClick={() => setSessionSort(isDesc ? `${cat}-asc` : `${cat}-desc`)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: active ? W.accent : W.border, background: active ? W.accent + "22" : W.surface, color: active ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                              {label}{active ? (isDesc ? " ↓" : " ↑") : ""}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                  {logbookView === "climbs" && (
                    <>
                      <Label>Status</Label>
                      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                        {[["all", "All"], ["completed", "✓ Sent"], ["incomplete", "✗ Not Sent"]].map(([val, label]) => <button key={val} onClick={() => setLogbookFilter(val)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookFilter === val ? W.accent : W.border, background: logbookFilter === val ? W.accent + "22" : W.surface, color: logbookFilter === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>)}
                      </div>
                      <Label>Scale</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {["All Scales", ...Object.keys(GRADES), ...(customAllGrades.length > 0 ? ["Custom"] : [])].map(s => <button key={s} onClick={() => { setLogbookScale(s); setLogbookGrade("All"); }} style={{ padding: "5px 10px", borderRadius: 14, border: "2px solid", borderColor: logbookScale === s ? W.accent : W.border, background: logbookScale === s ? W.accent + "22" : W.surface, color: logbookScale === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{s === "Custom" && customBoulderScaleName !== "Custom" ? customBoulderScaleName : s}</button>)}
                      </div>
                      <Label>Grade</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {logbookGrades.map(g => <button key={g} onClick={() => setLogbookGrade(g)} style={{ padding: "5px 10px", borderRadius: 14, border: "2px solid", borderColor: logbookGrade === g ? W.accent : W.border, background: logbookGrade === g ? W.accent + "22" : W.surface, color: logbookGrade === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{g}</button>)}
                      </div>
                      <Label>Sort</Label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["date", "📅 Newest"], ["hardest", "🔺 Hardest"], ["easiest", "🔻 Easiest"], ["name", "🔤 A–Z"]].map(([val, label]) => <button key={val} onClick={() => setLogbookSort(val)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookSort === val ? W.accent : W.border, background: logbookSort === val ? W.accent + "22" : W.surface, color: logbookSort === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>)}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {logbookView === "climbs" && (
              <>
                <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12, fontWeight: 600 }}>{logbookClimbs.length} climb{logbookClimbs.length !== 1 ? "s" : ""} found</div>
                {logbookClimbs.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0" }}>No climbs match your filters.</div>
                  : logbookClimbs.map((c, i) => {
                    const showHeader = logbookSort === "date" && (i === 0 || logbookClimbs[i - 1].sessionDate !== c.sessionDate);
                    return (<div key={`${c.id}-${i}`}>{showHeader && <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6, marginTop: i > 0 ? 14 : 0 }}>📍 {c.sessionLocation} · {formatDate(c.sessionDate)}</div>}<ClimbRow climb={c} /></div>);
                  })}
              </>
            )}
            {logbookView === "sessions" && (
              <>
                <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12, fontWeight: 600 }}>{filteredSessions.length} session{filteredSessions.length !== 1 ? "s" : ""}</div>
                {filteredSessions.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0" }}>No sessions yet.</div>
                  : (() => {
                      const visible = filteredSessions.slice(0, logbookPage * 8);
                      const hasMore = filteredSessions.length > visible.length;
                      return (
                        <>
                          {visible.map(s => <LogbookSessionCard key={s.id} session={s} />)}
                          {hasMore && (
                            <button onClick={() => setLogbookPage(p => p + 1)} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
                              Load more ({filteredSessions.length - visible.length} remaining)
                            </button>
                          )}
                        </>
                      );
                    })()}
              </>
            )}
          </div>
        )}

        {profileTab === "projects" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Active Projects <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{activeProjects.length}</span></div>
            {activeProjects.length === 0 ? <div style={{ color: W.textDim, fontSize: 13, marginBottom: 20, padding: "12px", background: W.surface, borderRadius: 12, border: `1px solid ${W.border}` }}>No active projects.</div>
              : activeProjects.map(p => (
                <div key={p.id} onClick={() => { setSelectedProject(p); setScreen("projectDetail"); }} style={{ background: W.pink, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${W.pinkDark}30`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{p.name || p.grade}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}><span style={{ fontWeight: 700, fontSize: 13, color: getGradeColor(p.grade) }}>{p.grade}</span><span style={{ color: W.textMuted, fontSize: 12 }}>{resolveScaleName(p.scale)}</span></div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <span style={{ background: "rgba(255,255,255,0.6)", borderRadius: 7, padding: "2px 9px", fontSize: 11, fontWeight: 700, color: W.pinkDark }}>🔁 {getProjectTotalTries(p.id)} tries</span>
                    </div>
                  </div>
                  <div style={{ color: W.pinkDark, fontSize: 20 }}>›</div>
                </div>
              ))}
            {completedProjects.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 22 }}>✓ Sent! <span style={{ background: W.green, color: W.greenDark, borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{completedProjects.length}</span></div>
                {completedProjects.map(p => (
                  <div key={p.id} onClick={() => { setSelectedProject(p); setScreen("projectDetail"); }} style={{ background: W.green, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${W.greenDark}30`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{p.name || p.grade}</div><span style={{ background: W.greenDark, color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: 10, fontWeight: 700 }}>SENT</span></div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}><span style={{ fontWeight: 700, fontSize: 13, color: getGradeColor(p.grade) }}>{p.grade}</span></div>
                    </div>
                    <div style={{ color: W.greenDark, fontSize: 20 }}>›</div>
                  </div>
                ))}
              </>
            )}
            {retiredProjects.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 22 }}>🪨 Off The Wall <span style={{ background: W.surface2, color: W.textMuted, borderRadius: 10, padding: "1px 8px", fontSize: 11 }}>{retiredProjects.length}</span></div>
                {retiredProjects.map(p => (
                  <div key={p.id} onClick={() => { setSelectedProject(p); setScreen("projectDetail"); }} style={{ background: W.surface2, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${W.border}`, cursor: "pointer", opacity: 0.8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 15, color: W.textMuted }}>{p.name || p.grade}</div><div style={{ fontSize: 12, color: W.textDim, marginTop: 2 }}>{p.grade} · {resolveScaleName(p.scale)}</div></div>
                    <div style={{ color: W.textDim, fontSize: 20 }}>›</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const ProjectDetailScreen = ({ project }) => {
    const history = getProjectHistory(project.id);
    const totalTries = getProjectTotalTries(project.id);
    const avgTriesPerSession = history.length ? (history.reduce((a, h) => a + h.tries, 0) / history.length).toFixed(1) : "—";
    const bestSession = history.length ? [...history].sort((a, b) => a.tries - b.tries)[0] : null;
    return (
      <div style={{ padding: "24px 20px" }}>
        <div style={{ background: project.completed ? W.green : W.pink, borderRadius: 20, padding: "20px", marginBottom: 20, border: `1px solid ${project.completed ? W.greenDark : W.pinkDark}30` }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: W.text }}>{project.name || project.grade}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}><span style={{ fontWeight: 800, fontSize: 16, color: getGradeColor(project.grade) }}>{project.grade}</span><span style={{ color: W.textMuted, fontSize: 13 }}>{resolveScaleName(project.scale)}</span>{project.completed && <span style={{ background: W.greenDark, color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>✓ SENT!</span>}</div>
          {project.comments && <div style={{ fontSize: 13, color: W.textMuted, marginTop: 6 }}>{project.comments}</div>}
          <div style={{ fontSize: 11, color: W.textDim, marginTop: 6 }}>Added {formatDate(project.dateAdded)}{project.dateSent && ` · Sent ${formatDate(project.dateSent)}`}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[{ icon: "🔁", label: "Total Tries", value: totalTries }, { icon: "📅", label: "Sessions", value: history.length }, { icon: "📊", label: "Avg/Session", value: avgTriesPerSession }].map(s => (
            <div key={s.label} style={{ background: W.surface, borderRadius: 14, padding: "12px", textAlign: "center", border: `1px solid ${W.border}` }}>
              <div style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: W.accent, marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: W.textMuted, marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {bestSession && <div style={{ background: W.green, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: W.greenDark, textTransform: "uppercase" }}>Best Session</div><div style={{ fontSize: 16, fontWeight: 800, color: W.greenDark }}>{bestSession.tries} {bestSession.tries === 1 ? "try" : "tries"} · {formatDate(bestSession.sessionDate)}</div></div>}
        <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Session History</div>
        {history.length === 0 ? <div style={{ color: W.textDim, fontSize: 13, marginBottom: 16 }}>No attempts yet.</div>
          : history.map((h, i) => (<div key={i} style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${W.border}`, borderLeft: `4px solid ${h.completed ? W.greenDark : W.accent}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{h.sessionLocation}</div><div style={{ fontSize: 11, color: W.textMuted }}>{formatDate(h.sessionDate)}</div></div><div style={{ fontSize: 12, color: W.textMuted, marginTop: 3 }}>{h.tries} {h.tries === 1 ? "try" : "tries"} · {h.completed ? <span style={{ color: W.greenDark, fontWeight: 700 }}>✓ Sent!</span> : <span style={{ color: W.pinkDark }}>✗ Not sent</span>}</div></div>))}
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          {project.active && !project.completed && <>
            <button onClick={() => { markProjectSent(project.id); setScreen("profile"); setProfileTab("projects"); }} style={{ width: "100%", padding: "13px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 14, color: W.greenDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>🎉 Mark as Sent!</button>
            <button onClick={() => { deactivateProject(project.id); setScreen("profile"); setProfileTab("projects"); }} style={{ width: "100%", padding: "13px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>🪨 No Longer On The Wall</button>
          </>}
          {(!project.active || project.completed) && <button onClick={() => { reactivateProject(project.id); setScreen("profile"); setProfileTab("projects"); }} style={{ width: "100%", padding: "13px", background: W.yellow, border: `2px solid ${W.yellowDark}`, borderRadius: 14, color: W.yellowDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>↩️ Reactivate as Project</button>}
        </div>
      </div>
    );
  };

  const CalendarScreen = () => {
    const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isToday = (day) => { const t = new Date(); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day; };
    const monthSessions = sessions.filter(s => { const d = new Date(s.date); return d.getFullYear() === year && d.getMonth() === month; });
    // Build consistent gym→color map across all sessions
    const GYM_PALETTE = ["#f09040","#4ade80","#60a5fa","#f472b6","#a78bfa","#fb923c","#34d399","#fbbf24","#f87171","#818cf8"];
    const gymList = [...new Set(sessions.map(s => s.location).filter(Boolean))];
    const gymColorMap = Object.fromEntries(gymList.map((g, i) => [g, GYM_PALETTE[i % GYM_PALETTE.length]]));
    const getDayInfo = (day) => {
      const ss = sessions.filter(s => { const dt = new Date(s.date); return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day; });
      if (!ss.length) return null;
      return { color: gymColorMap[ss[0].location] || W.gold };
    };
    const activeGyms = [...new Set(monthSessions.map(s => s.location))];
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: W.text, fontWeight: 700 }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 17, color: W.text }}>{calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: W.text, fontWeight: 700 }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: W.textMuted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const info = getDayInfo(day);
            const today = isToday(day);
            return (
              <div key={day} style={{ aspectRatio: "1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: info ? 800 : 400, background: info ? info.color : today ? W.surface2 : "transparent", color: info ? "#fff" : today ? W.accent : W.text, border: today ? `2px solid ${W.accent}` : "2px solid transparent" }}>{day}</div>
            );
          })}
        </div>
        {activeGyms.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {activeGyms.map(gym => (
              <div key={gym} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: gymColorMap[gym] || W.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: W.textMuted }}>{gym}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setCalendarSessionsOpen(o => !o)} style={{ width: "100%", padding: "11px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: calendarSessionsOpen ? "12px 12px 0 0" : "12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>Sessions This Month</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: monthSessions.length ? W.accent : W.border, color: monthSessions.length ? "#fff" : W.textDim, borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>{monthSessions.length}</span>
              <span style={{ color: W.textMuted, fontSize: 14 }}>{calendarSessionsOpen ? "∧" : "⌄"}</span>
            </div>
          </button>
          {calendarSessionsOpen && (
            <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
              {monthSessions.length === 0
                ? <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No sessions this month</div>
                : monthSessions.map(s => (
                  <div key={s.id} onClick={() => { setSelectedSession(s); setScreen("sessionDetail"); }} style={{ padding: "12px 14px", borderBottom: `1px solid ${W.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", borderLeft: `4px solid ${gymColorMap[s.location] || W.gold}` }}>
                    <div>
                      <div style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{formatDate(s.date)}</div>
                      <div style={{ fontSize: 12, color: W.textMuted }}>{s.location} · {s.climbs.length} climbs</div>
                    </div>
                    <div style={{ color: W.textDim }}>›</div>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      </div>
    );
  };

  const SessionSummaryScreen = ({ session }) => {
    const [showDiscard, setShowDiscard] = useState(false);
    const stats = getSessionStats(session);
    const hasRestData = stats.avgAttemptRest !== null;
    const gradeEntries = Object.entries(stats.gradeBreakdown).sort((a, b) => getGradeIndex(b[0], b[1].scale || "V-Scale") - getGradeIndex(a[0], a[1].scale || "V-Scale"));
    let pieAngle = -Math.PI / 2;
    const pieTotal = gradeEntries.reduce((s, [, v]) => s + v.tries, 0);
    const pieSlices = gradeEntries.map(([grade, data]) => {
      const angle = (data.tries / pieTotal) * 2 * Math.PI;
      const end = pieAngle + angle;
      const r = 42, ir = 22, cx = 50, cy = 50;
      const x1 = cx + r * Math.cos(pieAngle), y1 = cy + r * Math.sin(pieAngle);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const ix1 = cx + ir * Math.cos(pieAngle), iy1 = cy + ir * Math.sin(pieAngle);
      const ix2 = cx + ir * Math.cos(end), iy2 = cy + ir * Math.sin(end);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${ir} ${ir} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`;
      pieAngle = end;
      return { grade, path, color: getGradeColor(grade), data };
    });
    return (
      <div style={{ padding: "28px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: W.text, marginBottom: 4 }}>Session Complete!</div>
          <div style={{ fontSize: 13, color: W.textMuted }}>📍 {session.location} · {formatDate(session.date)}</div>
        </div>
        {(() => {
          const sentProjects = session.climbs.filter(c => c.isProject && c.completed);
          if (!sentProjects.length) return null;
          return (
            <div style={{ background: `linear-gradient(135deg, ${W.green}, #166534)`, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.greenDark}40` }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: W.greenDark, marginBottom: 4 }}>Project{sentProjects.length > 1 ? "s" : ""} Sent!</div>
              {sentProjects.map(c => (
                <div key={c.id} style={{ fontSize: 13, fontWeight: 700, color: W.greenDark, marginTop: 4 }}>✓ {c.name || c.grade} — {c.grade}</div>
              ))}
            </div>
          );
        })()}
        <div style={{ background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, borderRadius: 18, padding: "18px", marginBottom: 20, textAlign: "center", boxShadow: `0 4px 20px ${W.accentGlow}` }}>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Time on Wall</div>
          <div style={{ color: "#fff", fontSize: 48, fontWeight: 900, letterSpacing: 3, lineHeight: 1 }}>{formatDuration(session.duration)}</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 8 }}>{formatTotalTime(session.duration)} total</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { icon: "🧗", label: "Climbs Sent", value: `${stats.sends}/${stats.total}`, bg: W.green, tc: W.greenDark },
            { icon: "⚡", label: "Flashes", value: stats.flashes, bg: W.yellow, tc: W.yellowDark },
            { icon: "🔁", label: "Total Tries", value: stats.totalTries, bg: W.surface2, tc: W.accent },
            { icon: "📊", label: "Avg Tries", value: stats.avgTries, bg: W.surface2, tc: W.accentDark },
            { icon: "🔺", label: "Hardest Tried", value: stats.hardestAttempted, bg: W.purple, tc: W.purpleDark },
            { icon: "✅", label: "Hardest Sent", value: stats.hardestSent, bg: W.green, tc: W.greenDark },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.tc }}>{s.value}</div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
          {hasRestData && [
            { icon: "⏸", label: "Avg Rest", value: formatRestSec(stats.avgAttemptRest), sub: "between climbs", bg: W.surface2, tc: W.accentDark },
            { icon: "🐢", label: "Longest Rest", value: formatRestSec(stats.maxAttemptRest), sub: "single gap", bg: W.purple, tc: W.purpleDark },
            { icon: "⚡", label: "Shortest Rest", value: formatRestSec(stats.minAttemptRest), sub: "single gap", bg: W.yellow, tc: W.yellowDark },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.tc }}>{s.value}</div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{s.sub}</div>
            </div>
          ))}
        </div>
        {gradeEntries.length > 0 && (
          <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Grade Distribution</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <svg width={90} height={90} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                {pieSlices.map((s, i) => <path key={i} d={s.path} fill={s.color} />)}
              </svg>
              <div style={{ flex: 1 }}>
                {pieSlices.map(s => (
                  <div key={s.grade} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.grade}</span>
                    <span style={{ fontSize: 11, color: W.textDim, marginLeft: "auto" }}>{s.data.tries} tries</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Time breakdown by climb type */}
        {(() => {
          const boulderSec = session.boulderTotalSec || 0;
          const ropeSec = session.ropeTotalSec || 0;
          const totalSpeedSec = stats.speedSessions.reduce((sum, ss) => sum + Math.max(0, Math.floor(((ss.endedAt || ss.loggedAt) - ss.startedAt) / 1000)), 0);
          const allSpeedAttempts = stats.speedSessions.flatMap(ss => ss.attempts || []);
          const rows = [
            session.boulderStartedAt && { icon: "🪨", label: "Bouldering", time: boulderSec, color: W.greenDark, bg: W.green },
            session.ropeStartedAt    && { icon: "🪢", label: "Rope Climbing", time: ropeSec, color: W.purpleDark, bg: W.purple },
            stats.speedSessions.length > 0 && { icon: "⚡", label: "Speed Climbing", time: totalSpeedSec, color: W.yellowDark, bg: W.yellow, extra: `${allSpeedAttempts.length} attempts · Best: ${stats.speedBest != null ? stats.speedBest.toFixed(2)+"s" : "—"}` },
          ].filter(Boolean);
          if (!rows.length) return null;
          return (
            <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Time by Type</div>
              {rows.map(r => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${W.border}` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{r.label}</div>
                    {r.extra && <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{r.extra}</div>}
                  </div>
                  <div style={{ fontWeight: 900, color: r.color, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{formatDuration(r.time)}</div>
                </div>
              ))}
            </div>
          );
        })()}
        {session.climbs.filter(c => c.climbType !== "speed-session").length > 0 && (
          <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Climbs This Session</div>
            {session.climbs.filter(c => c.climbType !== "speed-session").map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${W.border}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0, background: getGradeColor(c.grade) + "30", color: getGradeColor(c.grade), border: `1.5px solid ${getGradeColor(c.grade)}60` }}>{c.grade}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {c.color && <ColorDot colorId={c.color} size={10} />}
                    <span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{c.name || c.grade}</span>
                    {c.completed && c.tries === 0 && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 5, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>FLASH</span>}
                  </div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{c.climbType === "rope" ? `${c.tries} ${c.tries === 1 ? "attempt" : "attempts"} · ${c.falls ?? c.tries} ${(c.falls ?? c.tries) === 1 ? "fall" : "falls"}` : `${c.tries} ${c.tries === 1 ? "fall" : "falls"}`} · {c.completed ? "✓ Sent" : "✗ Not sent"}</div>
                  {(c.attemptLog || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                      {(c.attemptLog || []).map((a, i) => (
                        <span key={i} style={{ fontSize: 9, color: W.textDim, background: W.surface2, borderRadius: 4, padding: "1px 5px", border: `1px solid ${W.border}` }}>
                          #{i + 1} {formatDuration(Math.floor(a.duration / 1000))}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Share session */}
        {(() => {
          const fmtDuration = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
          const allClimbs = session.climbs.filter(c => c.climbType !== "speed-session");
          const sends = allClimbs.filter(c => c.completed);
          const text = [
            `🧗 SendLog Session`,
            `📍 ${session.location} · ${formatDate(session.date)}`,
            `⏱ ${fmtDuration(session.duration || 0)}`,
            `✓ ${sends.length}/${allClimbs.length} sends`,
            sends.length > 0 ? `Best: ${sends.sort((a, b) => (GRADES[b.scale || "V-Scale"] || []).indexOf(b.grade) - (GRADES[a.scale || "V-Scale"] || []).indexOf(a.grade))[0]?.grade || ""}` : null,
            ``,
            sends.map(c => `  · ${c.grade}${c.name ? ` — ${c.name}` : ""}`).join("\n"),
          ].filter(Boolean).join("\n");
          const share = async () => {
            if (navigator.share) { try { await navigator.share({ title: "SendLog Session", text }); return; } catch {} }
            try { await navigator.clipboard.writeText(text); alert("Session summary copied to clipboard!"); } catch { alert(text); }
          };
          return (
            <button onClick={share} style={{ width: "100%", padding: "13px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>📤 Share Session</button>
          );
        })()}
        {leaderboardData && leaderboardData.length > 1 && (() => {
          const ranked = [...leaderboardData].map(e => ({ ...e, totalTime: (e.sessions || []).reduce((t, s) => t + (s.duration || 0), 0) })).sort((a, b) => b.totalTime - a.totalTime);
          const myRank = ranked.findIndex(e => e.isMe) + 1;
          if (myRank === 0) return null;
          const leader = ranked[0];
          return (
            <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🏆</div>
              <div style={{ fontWeight: 800, color: W.text, fontSize: 16, marginBottom: 2 }}>
                #{myRank} of {ranked.length} friends
              </div>
              <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 10 }}>by all-time climbing time{myRank > 1 ? ` · ${leader.displayName} leads` : " · You're on top!"}</div>
              <button onClick={goToLeaderboard} style={{ padding: "8px 20px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View Leaderboard</button>
            </div>
          );
        })()}
        <button onClick={() => { setSessionSummary(null); setScreen("home"); }} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", boxShadow: `0 4px 20px ${W.accentGlow}`, marginBottom: 10 }}>Done</button>
        {showDiscard
          ? (
            <div style={{ background: W.red, borderRadius: 14, padding: "16px", border: `2px solid ${W.redDark}` }}>
              <div style={{ fontWeight: 700, color: W.redDark, fontSize: 14, marginBottom: 10 }}>Discard this session? It will not be saved to your logbook.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => setShowDiscard(false)} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={discardSession} style={{ padding: "11px", background: W.redDark, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Yes, Discard</button>
              </div>
            </div>
          )
          : <button onClick={() => setShowDiscard(true)} style={{ width: "100%", padding: "13px", background: "transparent", border: `2px solid ${W.redDark}55`, borderRadius: 14, color: W.redDark, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: 0.7 }}>Discard Session</button>
        }
      </div>
    );
  };

  const UserProfileScreen = () => {
    if (!viewedUser) return null;
    const { username, displayName, sessions: uSessions, projects: uProjects, followersCount, followingCount, isPrivate: profileIsPrivate } = viewedUser;
    const isFollowing = socialFollowing.includes(username);
    const isMuted = mutedUsers.includes(username);
    const isLockedOut = profileIsPrivate && !isFollowing && username !== currentUser.username;

    // Stats computed from their data
    const uClimbs    = (uSessions || []).flatMap(s => s.climbs);
    const uCompleted = uClimbs.filter(c => c.completed);
    const uFlashes   = uCompleted.filter(c => c.tries === 1);
    const flashRate  = uClimbs.length ? Math.round((uFlashes.length / uClimbs.length) * 100) : 0;
    const bestGrade  = uCompleted.length
      ? [...uCompleted].sort((a, b) => (GRADES[b.scale || "V-Scale"] || []).indexOf(b.grade) - (GRADES[a.scale || "V-Scale"] || []).indexOf(a.grade))[0]?.grade
      : "—";
    const totalTries = uClimbs.reduce((t, c) => t + (c.tries || 0), 0);
    const recentSessions = (uSessions || []).slice(0, 8);

    return (
      <div style={{ padding: "20px" }}>
        {/* Header */}
        <div style={{ background: W.surface, borderRadius: 20, padding: "20px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 4px 14px ${W.accentGlow}`, flexShrink: 0 }}>🧗</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: W.text }}>{displayName}</div>
              <div style={{ fontSize: 13, color: W.textMuted }}>@{username}</div>
              {!viewedUserLoading && viewedUser?.following?.includes(currentUser.username) && (
                <div style={{ fontSize: 11, color: W.accent, fontWeight: 700, marginTop: 3 }}>Follows you</div>
              )}
            </div>
            {username === currentUser.username
              ? <div style={{ padding: "6px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textDim, fontWeight: 700, fontSize: 12 }}>You</div>
              : confirmUnfollowUser === username
                ? <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                    <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>Unfollow?</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setConfirmUnfollowUser(null)} style={{ padding: "5px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                      <button onClick={() => toggleFollow(username)} style={{ padding: "5px 10px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 8, color: W.redDark, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Unfollow</button>
                    </div>
                  </div>
                : pendingFollowRequests.includes(username)
                ? <div style={{ padding: "9px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.textDim, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>Requested</div>
                : <button onClick={() => isFollowing ? setConfirmUnfollowUser(username) : toggleFollow(username, profileIsPrivate)} style={{ padding: "9px 18px", background: isFollowing ? W.surface2 : `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: isFollowing ? `2px solid ${W.border}` : "none", borderRadius: 12, color: isFollowing ? W.textMuted : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                    {isFollowing ? "Following" : "Follow"}
                  </button>
            }
          </div>
          {/* Follower / Following counts */}
          <div style={{ display: "flex", gap: 10, marginBottom: username !== currentUser.username ? 12 : 0 }}>
            {[{ label: "Following", count: followingCount ?? "—", type: "following" }, { label: "Followers", count: followersCount ?? "—", type: "followers" }].map(item => (
              <button key={item.label} onClick={() => !viewedUserLoading && showViewedUserList(item.type)} style={{ flex: 1, background: W.surface2, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${W.border}`, cursor: viewedUserLoading ? "default" : "pointer" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: W.text }}>{item.count}</div>
                <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600, marginTop: 2 }}>{item.label}</div>
              </button>
            ))}
          </div>
          {username !== currentUser.username && (
            <button onClick={() => toggleMute(username)} style={{ width: "100%", padding: "7px", background: isMuted ? W.yellow : "transparent", border: `1px solid ${isMuted ? W.yellowDark : W.border}`, borderRadius: 10, color: isMuted ? W.yellowDark : W.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {isMuted ? "🔕 Muted — tap to unmute" : "🔕 Mute (hide from feed)"}
            </button>
          )}
        </div>

        {viewedUserLoading && (
          <div style={{ textAlign: "center", padding: "32px", color: W.textMuted }}>Loading profile…</div>
        )}

        {!viewedUserLoading && isLockedOut && (
          <div style={{ textAlign: "center", padding: "40px 20px", background: W.surface, borderRadius: 18, border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, color: W.text, fontSize: 16, marginBottom: 6 }}>This account is private</div>
            <div style={{ color: W.textMuted, fontSize: 13 }}>Follow {displayName} to see their sessions and stats.</div>
          </div>
        )}

        {!viewedUserLoading && uSessions !== null && !isLockedOut && (
          <>
            {/* Stats grid */}
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Sessions", value: uSessions.length, bg: W.surface2, tc: W.text },
                { label: "Climbs Logged", value: uClimbs.length, bg: W.surface2, tc: W.text },
                { label: "Total Sends", value: uCompleted.length, bg: W.green, tc: W.greenDark },
                { label: "Total Tries", value: totalTries, bg: W.surface2, tc: W.text },
                { label: "Flash Rate", value: `${flashRate}%`, bg: W.yellow, tc: W.yellowDark },
                { label: "Best Grade", value: bestGrade, bg: W.purple, tc: W.purpleDark },
              ].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.tc }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Sessions</div>
                {recentSessions.map((s, i) => {
                  const sends = s.climbs?.filter(c => c.completed).length || 0;
                  const total = s.climbs?.length || 0;
                  const isOwnProfile = username === currentUser.username;
                  return (
                    <div key={i} style={{ background: W.surface, borderRadius: 14, marginBottom: 10, border: `1px solid ${W.border}`, overflow: "hidden" }}>
                      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{formatDate(s.date)}</div>
                          {s.location && <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>📍 {s.location}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 800, color: W.greenDark, fontSize: 14 }}>{sends}/{total} sends</div>
                          {s.duration > 0 && <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>⏱ {formatTotalTime(s.duration)}</div>}
                        </div>
                      </div>
                      {/* Reactions + comments (only for other users' sessions) */}
                      {!isOwnProfile && (
                        <div style={{ display: "flex", gap: 8, padding: "8px 16px", borderTop: `1px solid ${W.border}`, alignItems: "center" }}>
                          {["🔥", "💪", "✨"].map(emoji => {
                            const active = myReactions[s.id] === emoji;
                            const count = feedReactionCounts[s.id]?.[emoji] || 0;
                            return (
                              <button key={emoji} onClick={() => toggleReaction(s.id, emoji)} style={{ padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${active ? W.accent : W.border}`, background: active ? W.accent + "22" : "transparent", fontSize: 14, cursor: "pointer", color: active ? W.accent : W.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                                {emoji}{count > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{count}</span>}
                              </button>
                            );
                          })}
                          <button onClick={() => openCommentPanel(s.id, username)} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 20, border: `1.5px solid ${W.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: W.textMuted, display: "flex", alignItems: "center", gap: 3 }}>
                            💬{sessionComments[s.id]?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{sessionComments[s.id].length}</span>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {uSessions.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px", color: W.textMuted, fontSize: 14 }}>No sessions logged yet.</div>
            )}
          </>
        )}
      </div>
    );
  };

  const LeaderboardScreen = () => {
    const fmtTime = (secs) => {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const filterSessions = (sess) => {
      if (lbTimeFrame === "all") return sess;
      const cutoffs = { "1m": 30, "6m": 182, "1y": 365 };
      const cutoff = Date.now() - cutoffs[lbTimeFrame] * 86400000;
      return sess.filter(s => new Date(s.date).getTime() >= cutoff);
    };

    const gradeScore = (grade, scale) => {
      const list = GRADES[scale] || ROPE_GRADES[scale] || [];
      const idx = list.indexOf(grade);
      return list.length > 0 && idx >= 0 ? idx / list.length : -1;
    };

    const computeEntry = (entry) => {
      const sess = filterSessions(entry.sessions || []);
      const allClimbs = sess.flatMap(s => s.climbs || []);
      const totalTime = sess.reduce((t, s) => t + (s.duration || 0), 0);
      const totalClimbs = allClimbs.length;
      const bestSend = allClimbs.filter(c => c.completed).reduce((best, c) => {
        const sc = gradeScore(c.grade, c.scale);
        return sc > best.score ? { score: sc, grade: c.grade } : best;
      }, { score: -1, grade: null });
      const longestSession = sess.reduce((mx, s) => Math.max(mx, s.duration || 0), 0);
      const weekCounts = {};
      sess.forEach(s => {
        const wk = Math.floor(new Date(s.date).getTime() / (7 * 86400000));
        weekCounts[wk] = (weekCounts[wk] || 0) + 1;
      });
      const bestWeek = Object.values(weekCounts).length > 0 ? Math.max(...Object.values(weekCounts)) : 0;
      const lastSessionDate = sess.length > 0
        ? sess.reduce((latest, s) => new Date(s.date) > new Date(latest) ? s.date : latest, sess[0].date)
        : null;
      const daysSinceLast = lastSessionDate
        ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000)
        : null;
      return { ...entry, totalTime, totalClimbs, bestSend, longestSession, bestWeek, daysSinceLast };
    };

    const boards = [
      { id: "time",    label: "⏱ Time",    sortKey: e => -e.totalTime,      value: e => fmtTime(e.totalTime),                                    rawValue: e => e.totalTime,      unit: "total time" },
      { id: "climbs",  label: "🧗 Climbs",  sortKey: e => -e.totalClimbs,    value: e => e.totalClimbs.toLocaleString(),                           rawValue: e => e.totalClimbs,    unit: "climbs" },
      { id: "hardest", label: "🏅 Hardest", sortKey: e => -e.bestSend.score, value: e => e.bestSend.grade || "—",                                  rawValue: e => Math.max(0, e.bestSend.score), unit: "best send" },
      { id: "session", label: "⌛ Session", sortKey: e => -e.longestSession, value: e => e.longestSession > 0 ? fmtTime(e.longestSession) : "—",   rawValue: e => e.longestSession, unit: "longest session" },
      { id: "week",    label: "📅 Week",    sortKey: e => -e.bestWeek,       value: e => e.bestWeek > 0 ? `${e.bestWeek}` : "—",                   rawValue: e => e.bestWeek,       unit: "best week" },
    ];
    const activeBoardCfg = boards.find(b => b.id === lbBoard) || boards[0];

    const computed = (leaderboardData || []).map(computeEntry);
    const board = [...computed].sort((a, b) => activeBoardCfg.sortKey(a) - activeBoardCfg.sortKey(b));
    const medalEmoji = ["🥇","🥈","🥉"];

    return (
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: W.text, margin: 0 }}>Leaderboard</h2>
          <button onClick={goToLeaderboard} style={{ background: "none", border: `1px solid ${W.border}`, borderRadius: 10, padding: "5px 10px", color: W.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↺ Refresh</button>
        </div>
        <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 14 }}>Friends = mutual follows only</div>

        {/* Timeframe filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {[["all","All time"],["1m","30 days"],["6m","6 months"],["1y","1 year"]].map(([id, label]) => (
            <button key={id} onClick={() => setLbTimeFrame(id)} style={{ padding: "5px 12px", borderRadius: 10, border: `1px solid ${lbTimeFrame === id ? W.accent : W.border}`, background: lbTimeFrame === id ? W.accent + "22" : W.surface2, color: lbTimeFrame === id ? W.accent : W.textDim, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {/* Board selector */}
        <div style={{ display: "flex", background: W.surface2, borderRadius: 12, padding: 4, marginBottom: 18, border: `1px solid ${W.border}`, gap: 2 }}>
          {boards.map(({ id, label }) => (
            <button key={id} onClick={() => setLbBoard(id)} style={{ flex: 1, padding: "7px 2px", borderRadius: 9, border: "none", background: lbBoard === id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: lbBoard === id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        {leaderboardLoading && (
          <div style={{ textAlign: "center", padding: "48px 20px", color: W.textMuted, fontSize: 14 }}>Loading...</div>
        )}

        {!leaderboardLoading && leaderboardData !== null && computed.length <= 1 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
            <div style={{ color: W.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No friends yet</div>
            <div style={{ color: W.textMuted, fontSize: 13 }}>Follow climbers who follow you back to compete here.</div>
          </div>
        )}

        {!leaderboardLoading && computed.length > 1 && (
          <div>
            {board.map((entry, i) => {
              const leaderVal = board[0] ? activeBoardCfg.rawValue(board[0]) : 1;
              const entryVal = activeBoardCfg.rawValue(entry);
              const pct = leaderVal > 0 ? Math.round((entryVal / leaderVal) * 100) : 0;
              return (
                <div key={entry.username} onClick={() => !entry.isMe && openUserProfile(entry.username, entry.displayName, "leaderboard")} style={{ background: entry.isMe ? W.surface2 : W.surface, borderRadius: 14, padding: "12px 16px", marginBottom: 10, border: `1px solid ${entry.isMe ? W.accent : W.border}`, cursor: entry.isMe ? "default" : "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: i < 3 ? 22 : 15, fontWeight: 800, color: W.textDim, width: 32, textAlign: "center", flexShrink: 0 }}>
                      {i < 3 ? medalEmoji[i] : i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: entry.isMe ? W.accent : W.text, fontSize: 15 }}>
                        {entry.displayName}{entry.isMe && " ✓"}
                      </div>
                      <div style={{ fontSize: 12, color: W.textMuted }}>
                        @{entry.username}{entry.bestSend?.grade ? ` · Best: ${entry.bestSend.grade}` : ""}
                      </div>
                      {entry.daysSinceLast !== null && (
                        <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>
                          {entry.daysSinceLast === 0 ? "Climbed today" : entry.daysSinceLast === 1 ? "Climbed yesterday" : `Last climbed ${entry.daysSinceLast}d ago`}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: W.text, fontSize: 16 }}>{activeBoardCfg.value(entry)}</div>
                      <div style={{ fontSize: 11, color: W.textDim }}>{activeBoardCfg.unit}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, height: 4, background: W.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: entry.isMe ? W.accent : W.accentDark + "88", borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const SocialScreen = () => {
    const topGrade = (climbs) => {
      if (!climbs?.length) return null;
      const sent = climbs.filter(c => c.completed);
      if (!sent.length) return null;
      return sent.reduce((best, c) => {
        const scale = c.scale || "V-Scale";
        const idx = (GRADES[scale] || []).indexOf(c.grade);
        const bIdx = (GRADES[best.scale] || []).indexOf(best.grade);
        return idx > bIdx ? c : best;
      }, sent[0])?.grade;
    };

    return (
      <div style={{ padding: "20px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: W.text, margin: "0 0 16px" }}>Social</h2>
        {/* Tabs */}
        <div style={{ display: "flex", background: W.surface2, borderRadius: 12, padding: 4, marginBottom: 20, border: `1px solid ${W.border}` }}>
          {[["notifications", "Notifications"], ["search", "Find Climbers"]].map(([id, label]) => (
            <button key={id} onClick={() => {
              setSocialTab(id);
              if (id === "notifications" && notifCount > 0) {
                const marked = notifications.map(n => ({ ...n, read: true }));
                setNotifications(marked);
                setNotifCount(0);
                storage.set(`notifications:${currentUser.username}`, JSON.stringify(marked)).catch(() => {});
              }
            }} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: socialTab === id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: socialTab === id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 13, cursor: "pointer", position: "relative" }}>
              {label}
              {id === "notifications" && notifCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 6, background: W.accent, color: "#fff", borderRadius: "50%", minWidth: 14, height: 14, fontSize: 9, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>{notifCount > 9 ? "9+" : notifCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS TAB */}
        {socialTab === "notifications" && (() => {
          if (notifications.length === 0) return (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div style={{ color: W.text, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No notifications yet</div>
              <div style={{ color: W.textMuted, fontSize: 13 }}>You'll see follows and session activity here.</div>
            </div>
          );
          return (
            <div>
              {notifications.map((n, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: `1px solid ${W.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? W.border : W.accent, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    {n.type === "follow"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> started following you</div>
                    : n.type === "followRequest"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> requested to follow you</div>
                    : n.type === "comment"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> commented on your session</div>
                    : <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> logged a session{n.location ? ` at ${n.location}` : ""}</div>
                  }
                  <div style={{ fontSize: 11, color: W.textDim, marginTop: 2 }}>{new Date(n.at).toLocaleDateString()}</div>
                </div>
                <button onClick={() => dismissNotification(i)} style={{ background: "none", border: "none", color: W.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        );
      })()}

        {/* SEARCH TAB */}
        {socialTab === "search" && (() => (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                value={socialQuery}
                onChange={e => setSocialQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchUsers()}
                placeholder="Search by username…"
                style={{ flex: 1, padding: "11px 14px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, fontFamily: "inherit" }}
              />
              <button onClick={searchUsers} style={{ padding: "11px 16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Search</button>
            </div>
            {socialResults === null && (
              <div style={{ textAlign: "center", padding: "32px 20px", color: W.textMuted, fontSize: 14 }}>Search for a username to find other climbers.</div>
            )}
            {socialResults !== null && socialResults.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 20px", color: W.textMuted, fontSize: 14 }}>No users found matching "{socialQuery}".</div>
            )}
            {socialResults?.map(user => {
              const isFollowing = socialFollowing.includes(user.username);
              return (
                <div key={user.username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: W.surface, borderRadius: 14, padding: "12px 16px", marginBottom: 10, border: `1px solid ${W.border}` }}>
                  <div onClick={() => openUserProfile(user.username, user.displayName, "social")} style={{ flex: 1, cursor: "pointer" }}>
                    <div style={{ fontWeight: 700, color: W.text, fontSize: 15 }}>{user.displayName}</div>
                    <div style={{ color: W.accent, fontSize: 12 }}>@{user.username} ›</div>
                    {(user.sessionsCount !== undefined) && (
                      <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: W.textDim }}>{user.sessionsCount} sessions</span>
                        <span style={{ fontSize: 11, color: W.textDim }}>·</span>
                        <span style={{ fontSize: 11, color: W.textDim }}>{user.climbsCount} climbs</span>
                        {user.bestGrade && <><span style={{ fontSize: 11, color: W.textDim }}>·</span><span style={{ fontSize: 11, color: W.textMuted, fontWeight: 700 }}>Best: {user.bestGrade}</span></>}
                      </div>
                    )}
                  </div>
                  {user.username === currentUser.username
                    ? <div style={{ padding: "6px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textDim, fontWeight: 700, fontSize: 12, marginLeft: 10 }}>You</div>
                    : confirmUnfollowUser === user.username
                      ? <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginLeft: 10 }}>
                          <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>Unfollow?</div>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button onClick={() => setConfirmUnfollowUser(null)} style={{ padding: "5px 8px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, color: W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => toggleFollow(user.username)} style={{ padding: "5px 8px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 7, color: W.redDark, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Unfollow</button>
                          </div>
                        </div>
                      : <button onClick={() => isFollowing ? setConfirmUnfollowUser(user.username) : toggleFollow(user.username)} style={{ padding: "8px 16px", background: isFollowing ? W.surface2 : `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: isFollowing ? `2px solid ${W.border}` : "none", borderRadius: 10, color: isFollowing ? W.textMuted : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", marginLeft: 10 }}>
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                  }
                </div>
              );
            })}
          </div>
        ))()}
      </div>
    );
  };

  const backMap  = { sessionDetail: "home", calendar: "profile", projectDetail: "profile", userProfile: userProfileBackTo, social: "profile", leaderboard: "profile" };
  const navItems = [
    { id: "home",    label: "🏠", text: "Home" },
    { id: "session", label: "⏱", text: "Session", action: () => activeSession ? setScreen("session") : goToSessionSetup() },
    { id: "profile", label: "👤", text: "Profile" },
  ];

  return (
    <ThemeCtx.Provider value={W}>
    <div style={{ width: "100%", minHeight: "100vh", background: W.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", justifyContent: "center" }}>
    <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${W.border}`, background: W.navBg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(backMap[screen] || screen === "session") && (
            <button onClick={() => { if (screen === "session" && !sessionStarted) setScreen("home"); else if (backMap[screen]) { setScreen(backMap[screen]); setShowClimbForm(false); if (screen === "calendar" || screen === "projectDetail") setProfileTab("stats"); if (screen === "sessionDetail") setSessionReadOnly(false); } }} style={{ background: "none", border: "none", color: W.accent, fontSize: 16, cursor: "pointer", padding: 0, marginRight: 4 }}>←</button>
          )}
          <span style={{ fontSize: 20 }}>🧗</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: W.text }}>SendLog</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {timerRunning && <div style={{ background: W.accent, borderRadius: 20, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>⏱ {formatDuration(sessionTimer)}</div>}
          {saveStatus === "saving" && <div style={{ fontSize: 11, color: W.textDim, fontWeight: 600 }}>💾</div>}
          {saveStatus === "saved" && <div style={{ fontSize: 11, color: W.greenDark, fontWeight: 600 }}>✓</div>}
          {screen === "home" && (
            <button onClick={() => setShowNotifPanel(true)} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "2px 4px", color: notifCount > 0 ? W.accent : W.textDim }}>
              🔔
              {notifCount > 0 && <span style={{ position: "absolute", top: -2, right: -2, background: W.accent, color: "#fff", borderRadius: "50%", minWidth: 15, height: 15, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px" }}>{notifCount > 9 ? "9+" : notifCount}</span>}
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }} onClick={() => { setLocationDropdownOpen(false); setActiveLocationDropdownOpen(false); }}>
        {screen === "home"          && <HomeScreen />}
        {screen === "session"       && (sessionStarted ? SessionActiveScreen() : SessionSetupScreen())}
        {screen === "social"        && SocialScreen()}
        {screen === "userProfile"   && UserProfileScreen()}
        {screen === "profile"       && ProfileScreen()}
        {screen === "sessionDetail" && selectedSession && <SessionDetailScreen session={selectedSession} />}
        {screen === "calendar"      && <CalendarScreen />}
        {screen === "projectDetail" && selectedProject && <ProjectDetailScreen project={projects.find(p => p.id === selectedProject.id) || selectedProject} />}
        {screen === "leaderboard"    && LeaderboardScreen()}
        {screen === "sessionSummary" && sessionSummary && <SessionSummaryScreen session={sessionSummary} />}
      </div>

      {/* Notification panel */}
      {showNotifPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowNotifPanel(false)}>
          <div style={{ width: "100%", maxWidth: 420, background: W.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: W.text, fontSize: 17 }}>Notifications</div>
              <button onClick={() => setShowNotifPanel(false)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer", padding: 0 }}>×</button>
            </div>
            {notifications.length === 0
              ? <div style={{ textAlign: "center", color: W.textMuted, padding: "32px 0", fontSize: 14 }}>No notifications yet.</div>
              : notifications.map((n, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: `1px solid ${W.border}` }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? W.border : W.accent, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      {n.type === "follow"
                        ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> started following you</div>
                        : n.type === "followRequest"
                        ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> requested to follow you</div>
                        : n.type === "comment"
                        ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> commented on your session</div>
                        : <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> logged a session{n.location ? ` at ${n.location}` : ""}</div>
                      }
                      <div style={{ fontSize: 11, color: W.textDim, marginTop: 2 }}>{new Date(n.at).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => dismissNotification(i)} style={{ background: "none", border: "none", color: W.textDim, fontSize: 16, cursor: "pointer", padding: "0 4px", flexShrink: 0 }}>×</button>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {/* Comment panel */}
      {commentPanelId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setCommentPanelId(null)}>
          <div style={{ width: "100%", maxWidth: 420, background: W.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 24px", maxHeight: "70vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontWeight: 800, color: W.text, fontSize: 17 }}>Comments</div>
              <button onClick={() => setCommentPanelId(null)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer", padding: 0 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
              {(sessionComments[commentPanelId] || []).length === 0
                ? <div style={{ textAlign: "center", color: W.textMuted, padding: "28px 0", fontSize: 14 }}>No comments yet. Be the first!</div>
                : (sessionComments[commentPanelId] || []).map(c => (
                    <div key={c.id} style={{ padding: "10px 0", borderBottom: `1px solid ${W.border}` }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 3, alignItems: "center" }}>
                        <span style={{ fontWeight: 700, color: W.accent, fontSize: 13 }}>{c.displayName}</span>
                        <span style={{ color: W.textDim, fontSize: 11 }}>{new Date(c.at).toLocaleDateString()}</span>
                        {c.username === currentUser.username && (
                          <button onClick={() => deleteComment(commentPanelId, c.id)} style={{ marginLeft: "auto", background: "none", border: "none", color: W.textDim, fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: W.text }}>{c.text}</div>
                    </div>
                  ))
              }
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment(commentPanelId)} placeholder="Add a comment…" style={{ flex: 1, padding: "10px 14px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, fontFamily: "inherit" }} />
              <button onClick={() => submitComment(commentPanelId)} disabled={commentLoading || !commentText.trim()} style={{ padding: "10px 16px", background: commentText.trim() ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.border, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: commentText.trim() ? "pointer" : "default" }}>Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Follower / Following list modal */}
      {socialUserList && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setSocialUserList(null)}>
          <div style={{ width: "100%", maxWidth: 420, background: W.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 40px", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: W.text, fontSize: 17 }}>{socialUserList.type === "following" ? "Following" : "Followers"}</div>
              <button onClick={() => setSocialUserList(null)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer", padding: 0 }}>×</button>
            </div>
            {socialUserList.users.length === 0
              ? <div style={{ textAlign: "center", color: W.textMuted, padding: "24px 0", fontSize: 14 }}>{socialUserList.type === "following" ? "Not following anyone yet." : "No followers yet."}</div>
              : socialUserList.users.map(u => {
                  const isMe = u.username === currentUser.username;
                  const iAlreadyFollow = socialFollowing.includes(u.username);
                  return (
                    <div key={u.username} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${W.border}` }}>
                      <div onClick={() => !isMe && openUserProfile(u.username, u.displayName, "profile")} style={{ flex: 1, cursor: isMe ? "default" : "pointer" }}>
                        <div style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{u.displayName}</div>
                        <div style={{ fontSize: 12, color: W.accent }}>@{u.username}{isMe ? "" : " ›"}</div>
                      </div>
                      {isMe
                        ? <div style={{ padding: "4px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textDim, fontWeight: 700, fontSize: 11 }}>You</div>
                        : socialUserList.type === "following" && socialUserList.canUnfollow
                          ? confirmUnfollowUser === u.username
                            ? <div style={{ display: "flex", gap: 5 }}>
                                <button onClick={() => setConfirmUnfollowUser(null)} style={{ padding: "5px 8px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, color: W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
                                <button onClick={() => toggleFollow(u.username)} style={{ padding: "5px 8px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 7, color: W.redDark, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Unfollow</button>
                              </div>
                            : <button onClick={() => setConfirmUnfollowUser(u.username)} style={{ padding: "6px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Unfollow</button>
                          : socialUserList.type === "followers" && socialUserList.canUnfollow
                            ? <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {iAlreadyFollow
                                  ? <div style={{ padding: "4px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textDim, fontWeight: 700, fontSize: 11 }}>Following</div>
                                  : <button onClick={() => toggleFollow(u.username)} style={{ padding: "5px 12px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Follow Back</button>
                                }
                                <button onClick={() => removeFollower(u.username)} style={{ padding: "5px 10px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 10, color: W.redDark, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Remove</button>
                              </div>
                            : socialUserList.type === "followers"
                              ? iAlreadyFollow
                                ? <div style={{ padding: "4px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textDim, fontWeight: 700, fontSize: 11 }}>Following</div>
                                : <button onClick={() => toggleFollow(u.username)} style={{ padding: "6px 14px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Follow Back</button>
                              : null
                      }
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* Photo lightbox */}
      {lightboxPhoto && (() => {
        const photo = lightboxPhoto.photos[lightboxPhoto.idx];
        const total = lightboxPhoto.photos.length;
        const colorHex = CLIMB_COLORS.find(cc => cc.id === photo.colorId)?.hex;
        return (
          <div
            onClick={() => setLightboxPhoto(null)}
            onTouchStart={e => { const t = e.touches[0]; e.currentTarget._swipeX = t.clientX; }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - (e.currentTarget._swipeX || 0);
              if (Math.abs(dx) > 50) {
                e.stopPropagation();
                setLightboxPhoto(p => {
                  if (dx < 0 && p.idx < p.photos.length - 1) return { ...p, idx: p.idx + 1 };
                  if (dx > 0 && p.idx > 0) return { ...p, idx: p.idx - 1 };
                  return p;
                });
              }
            }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 56px" }}>
            <button onClick={() => setLightboxPhoto(null)} style={{ position: "absolute", top: 16, right: 20, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            {total > 1 && lightboxPhoto.idx > 0 && (
              <button onClick={e => { e.stopPropagation(); setLightboxPhoto(p => ({ ...p, idx: p.idx - 1 })); }} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            )}
            <img src={photo.src} alt={photo.name || photo.grade} style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: 16 }} onClick={e => e.stopPropagation()} />
            {total > 1 && lightboxPhoto.idx < total - 1 && (
              <button onClick={e => { e.stopPropagation(); setLightboxPhoto(p => ({ ...p, idx: p.idx + 1 })); }} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            )}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }} onClick={e => e.stopPropagation()}>
              <div style={{ background: getGradeColor(photo.grade) + "ee", borderRadius: 8, padding: "4px 12px", fontSize: 14, fontWeight: 800, color: "#fff" }}>{photo.grade}</div>
              {colorHex && <div style={{ width: 18, height: 18, borderRadius: "50%", background: colorHex, border: "2px solid rgba(255,255,255,0.7)", flexShrink: 0 }} />}
              {photo.name && <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 600 }}>{photo.name}</div>}
              {total > 1 && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{lightboxPhoto.idx + 1}/{total}</div>}
            </div>
          </div>
        );
      })()}

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: W.navBg, borderTop: `1px solid ${W.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 12px 18px", zIndex: 10 }}>
        {navItems.map(item => {
          const isActive = screen === item.id || (item.id === "session" && (screen === "session" || screen === "sessionSummary"));
          return (
            <button key={item.id} onClick={item.action || (() => setScreen(item.id))} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer", padding: "4px 18px", borderRadius: 12, background: isActive ? W.accent + "18" : "none", position: "relative" }}>
              <span style={{ fontSize: 18, color: isActive ? W.accent : W.textDim, lineHeight: 1.2 }}>{item.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? W.accent : W.textDim, letterSpacing: 0.3 }}>{item.text}</span>
              {item.id === "session" && timerRunning && <div style={{ position: "absolute", top: 3, right: 12, width: 5, height: 5, borderRadius: "50%", background: W.accent }} />}
            </button>
          );
        })}
      </div>
    </div>
    </div>
    </ThemeCtx.Provider>
  );
}