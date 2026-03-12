// §CONSTANTS — shared across App.jsx, Components.jsx, Screens.jsx

export const GRADES = {
  "V-Scale": ["VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"],
  "YDS": ["5.6", "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a"],
  "French": ["4", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b"],
  "Custom (C-Scale)": ["C1", "C2", "C3", "C4", "C5", "C6", "C7"],
};

export const ROPE_GRADES = {
  "French": ["4", "5a", "5b", "5c", "6a", "6a+", "6b", "6b+", "6c", "6c+", "7a", "7a+", "7b", "7b+", "7c", "7c+", "8a"],
  "YDS":    ["5.6", "5.7", "5.8", "5.9", "5.10a", "5.10b", "5.10c", "5.10d", "5.11a", "5.11b", "5.11c", "5.11d", "5.12a", "5.12b", "5.12c", "5.12d"],
};

export const GRADE_COLORS = {
  "VB": "#4ade80", "V0": "#86efac", "V1": "#fde047", "V2": "#fb923c",
  "V3": "#f97316", "V4": "#ef4444", "V5": "#dc2626", "V6": "#b91c1c",
  "V7": "#c084fc", "V8": "#a855f7", "V9": "#7c3aed", "V10": "#4c1d95",
  "C1": "#4ade80", "C2": "#fde047", "C3": "#fb923c", "C4": "#f97316",
  "C5": "#ef4444", "C6": "#dc2626", "C7": "#a855f7", "default": "#fb923c"
};

export const CLIMB_COLORS = [
  { id: "black",  label: "Black",  hex: "#1a1a1a" },
  { id: "white",  label: "White",  hex: "#ffffff" },
  { id: "red",    label: "Red",    hex: "#ef4444" },
  { id: "yellow", label: "Yellow", hex: "#facc15" },
  { id: "green",  label: "Green",  hex: "#22c55e" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "blue",   label: "Blue",   hex: "#3b82f6" },
  { id: "pink",   label: "Pink",   hex: "#ec4899" },
];

export const WALL_TYPES = ["Slab", "Overhang", "Corner", "Roof"];
export const HOLD_TYPES  = ["Jugs", "Crimps", "Slopes", "Pinches", "Pockets", "Sidepull", "Undercling", "Gaston", "Dyno", "Technical", "Bat Hang", "Coordination", "Knee Bar"];

export const getGradeColor  = (g) => GRADE_COLORS[g] || GRADE_COLORS["default"];
export const formatDate      = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const formatDuration  = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
export const formatTotalTime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
export const formatRestSec   = (s) => { if (s === null || s === undefined) return "—"; const m = Math.floor(s / 60), sec = Math.round(s % 60); return m > 0 ? (sec ? `${m}m ${sec}s` : `${m}m`) : `${sec}s`; };
