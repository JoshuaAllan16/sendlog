import { useState, useRef, useEffect } from "react";

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

const WALL_TYPES = ["Slab", "Overhang"];
const HOLD_TYPES  = ["Jugs", "Slopes", "Pinches", "Dyno", "Technical"];

const getGradeColor = (g) => GRADE_COLORS[g] || GRADE_COLORS["default"];
const formatDate    = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const W = {
  bg: "linear-gradient(160deg, #e8d5c0 0%, #ddc4a8 40%, #d4b896 100%)",
  surface: "rgba(255,248,242,0.92)", surface2: "rgba(255,235,210,0.78)",
  border: "#c8a882", accent: "#e8833a", accentGlow: "rgba(232,131,58,0.25)", accentDark: "#c45e1a",
  text: "#3d2010", textMuted: "#7a4a2e", textDim: "#a07858",
  gold: "#f59e0b", goldLight: "#fef3c7",
  pink: "#fce7f0", pinkDark: "#be185d",
  yellow: "#fef9c3", yellowDark: "#92400e",
  green: "#dcfce7", greenDark: "#15803d",
  red: "#fee2e2", redDark: "#dc2626",
  purple: "#f3e8ff", purpleDark: "#7c3aed",
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
const storage = window.storage;

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
  const [sessionStarted, setSessionStarted] = useState(false);
  const [pendingLocation, setPendingLocation] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen]       = useState(false);
  const [activeLocationDropdownOpen, setActiveLocationDropdownOpen] = useState(false);
  const timerRef = useRef(null);
  const fileRef  = useRef();

  const [showClimbForm, setShowClimbForm]       = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [editingClimbId, setEditingClimbId]     = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const blankForm = { name: "", grade: "V3", scale: "V-Scale", isProject: false, comments: "", photo: null, color: null, wallTypes: [], holdTypes: [] };
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
  const [statsGradeFilter, setStatsGradeFilter]     = useState("All");
  const [statsScaleFilter, setStatsScaleFilter]     = useState("V-Scale");
  const [analyzeOpen, setAnalyzeOpen] = useState(false);

  // ── INIT: check for existing session ──────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionResult = await storage.get("active:session");
        if (sessionResult) {
          const { username, userData } = JSON.parse(sessionResult.value);
          setCurrentUser({ username, ...userData.profile });
          setSessions(userData.sessions || []);
          setProjects(userData.projects || []);
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
        profile: { displayName: currentUser.displayName },
        sessions,
        projects,
      };
      const ok = await saveUserData(currentUser.username, userData);
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 1000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [sessions, projects]);

  useEffect(() => {
    if (timerRunning) { timerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000); }
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

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
        sessions: SAMPLE_SESSIONS,
        projects: SAMPLE_PROJECTS,
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
    setAuthScreen("login");
  };

  // ── APP LOGIC ──────────────────────────────────────────────
  const knownLocations = [...new Set([...KNOWN_GYMS, ...sessions.map(s => s.location).filter(Boolean)])];
  const allGyms = ["All Gyms", ...new Set(sessions.map(s => s.location).filter(Boolean))];

  const goToSessionSetup = () => { setPendingLocation(""); setSessionStarted(false); setActiveSession({ location: "", climbs: [] }); setSessionTimer(0); setScreen("session"); };
  const beginTimer = () => { setActiveSession(s => ({ ...s, location: pendingLocation })); setSessionStarted(true); setTimerRunning(true); };
  const endSession = () => {
    if (!activeSession) return;
    setSessions(prev => [{ id: Date.now(), date: new Date().toISOString(), duration: sessionTimer, location: activeSession.location || pendingLocation || "Unknown Gym", climbs: activeSession.climbs }, ...prev]);
    setTimerRunning(false); setActiveSession(null); setSessionTimer(0); setSessionStarted(false); setPendingLocation(""); setScreen("home");
  };
  const deleteSession = (id) => { setSessions(prev => prev.filter(s => s.id !== id)); setScreen("profile"); setProfileTab("logbook"); };

  const updateActiveClimbTries    = (id, delta) => setActiveSession(s => ({ ...s, climbs: s.climbs.map(c => c.id === id ? { ...c, tries: Math.max(0, c.tries + delta) } : c) }));
  const toggleActiveClimbCompleted = (id) => setActiveSession(s => ({ ...s, climbs: s.climbs.map(c => c.id === id ? { ...c, completed: !c.completed, tries: !c.completed && c.tries === 0 ? 1 : c.tries } : c) }));
  const removeClimbFromActive      = (id) => setActiveSession(s => ({ ...s, climbs: s.climbs.filter(c => c.id !== id) }));
  const removeClimbFromSession     = (sessionId, climbId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: s.climbs.filter(c => c.id !== climbId) } : s));
    setSelectedSession(prev => ({ ...prev, climbs: prev.climbs.filter(c => c.id !== climbId) }));
  };

  const openClimbForm = (existing = null, fromProject = null) => {
    if (existing) {
      setEditingClimbId(existing.id);
      setClimbForm({ name: existing.name || "", grade: existing.grade, scale: existing.scale, isProject: existing.isProject, comments: existing.comments, photo: existing.photo, projectId: existing.projectId, tries: existing.tries, completed: existing.completed, color: existing.color || null, wallTypes: existing.wallTypes || [], holdTypes: existing.holdTypes || [] });
      setPhotoPreview(existing.photo);
    } else if (fromProject) {
      setEditingClimbId(null);
      setClimbForm({ ...blankForm, name: fromProject.name || "", grade: fromProject.grade, scale: fromProject.scale, isProject: true, comments: fromProject.comments || "", projectId: fromProject.id });
      setPhotoPreview(null);
    } else {
      setEditingClimbId(null);
      setClimbForm(blankForm);
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
      const newClimb = { ...climbForm, photo: photoPreview, projectId: pid, id: Date.now(), tries: 0, completed: false };
      if (newClimb.isProject && !climbForm.projectId) setProjects(prev => [...prev, { id: pid, name: newClimb.name, grade: newClimb.grade, scale: newClimb.scale, comments: newClimb.comments, active: true, completed: false, dateAdded: new Date().toISOString(), dateSent: null }]);
      setActiveSession(s => ({ ...s, climbs: [...s.climbs, newClimb] }));
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

  const getGradeIndex = (grade, scale) => (GRADES[scale] || GRADES["V-Scale"]).indexOf(grade);

  const getStats = () => {
    const base = allClimbs.filter(c => (statsScaleFilter === "All Scales" || c.scale === statsScaleFilter) && (statsGradeFilter === "All" || c.grade === statsGradeFilter));
    const completed = base.filter(c => c.completed);
    const flashes   = completed.filter(c => c.tries === 1);
    const flashRate = base.length ? Math.round((flashes.length / base.length) * 100) : 0;
    const avgTries  = base.length ? (base.reduce((a, c) => a + c.tries, 0) / base.length).toFixed(1) : "—";
    const vBase     = allClimbs.filter(c => c.completed && c.scale === "V-Scale");
    const bestGrade = vBase.length ? [...vBase].sort((a, b) => GRADES["V-Scale"].indexOf(b.grade) - GRADES["V-Scale"].indexOf(a.grade))[0]?.grade : "—";
    const gradeBreakdown = (GRADES[statsScaleFilter] || []).map(g => ({ grade: g, count: completed.filter(c => c.grade === g).length })).filter(g => g.count > 0);
    return { base, completed, flashes, flashRate, avgTries, bestGrade, gradeBreakdown };
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
    else climbs.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
    return climbs;
  };

  const getFilteredSessions = () => logbookGymFilter === "All Gyms" ? sessions : sessions.filter(s => s.location === logbookGymFilter);

  const getSessionStats = (session) => {
    const sends = session.climbs.filter(c => c.completed).length;
    const total  = session.climbs.length;
    const totalTries = session.climbs.reduce((s, c) => s + c.tries, 0);
    const flashes    = session.climbs.filter(c => c.completed && c.tries === 1).length;
    const flashRate  = total ? Math.round((flashes / total) * 100) : 0;
    const avgTries   = total ? (totalTries / total).toFixed(1) : "0";
    const gradeBreakdown = {};
    session.climbs.forEach(c => { if (!gradeBreakdown[c.grade]) gradeBreakdown[c.grade] = { completed: 0, attempted: 0 }; gradeBreakdown[c.grade].attempted++; if (c.completed) gradeBreakdown[c.grade].completed++; });
    return { sends, total, totalTries, flashes, flashRate, avgTries, gradeBreakdown };
  };

  // ── AUTH SCREENS ───────────────────────────────────────────
  if (authScreen === "loading") {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: W.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
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
      <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: W.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
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
    );
  }

  // ── LOCATION DROPDOWN ──────────────────────────────────────
  const LocationDropdown = ({ value, onChange, open, setOpen }) => (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", background: W.surface, border: `2px solid ${open ? W.accent : W.border}`, borderRadius: open && knownLocations.length ? "12px 12px 0 0" : "12px", overflow: "hidden" }}>
        <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="e.g. Boulder Barn" style={{ flex: 1, padding: "11px 14px", background: "transparent", border: "none", outline: "none", color: W.text, fontSize: 14, fontFamily: "inherit" }} />
        <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "none", padding: "0 12px", cursor: "pointer", color: W.textMuted, fontSize: 14 }}>{open ? "▲" : "▼"}</button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: W.surface, border: `2px solid ${W.accent}`, borderTop: "none", borderRadius: "0 0 12px 12px", zIndex: 100, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
          {knownLocations.length > 0 && <div style={{ padding: "8px 14px 4px", fontSize: 10, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Previous Locations</div>}
          {knownLocations.map(loc => <div key={loc} onClick={() => { onChange(loc); setOpen(false); }} style={{ padding: "10px 14px", cursor: "pointer", color: W.text, fontSize: 14, fontWeight: loc === value ? 700 : 400, background: loc === value ? W.surface2 : "transparent", borderBottom: `1px solid ${W.border}` }}>📍 {loc}</div>)}
          {value && !knownLocations.includes(value) && <div onClick={() => setOpen(false)} style={{ padding: "10px 14px", cursor: "pointer", color: W.accent, fontSize: 14, fontWeight: 700 }}>✚ Add "{value}"</div>}
        </div>
      )}
    </div>
  );

  const Label = ({ children }) => <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 7 }}>{children}</div>;

  // ── CLIMB FORM ─────────────────────────────────────────────
  const ClimbFormPanel = ({ onSave, onCancel, isActiveSession = false }) => (
    <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
      <div style={{ fontWeight: 700, color: W.text, marginBottom: 14, fontSize: 15 }}>{editingClimbId ? "✏️ Edit Climb" : "Add a Climb"}</div>
      <Label>Climb Name</Label>
      <input value={climbForm.name} onChange={e => setClimbForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. The Sloper Problem" style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 14, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
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
      <Label>Scale</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {Object.keys(GRADES).map(scale => <button key={scale} onClick={() => setClimbForm(f => ({ ...f, scale, grade: GRADES[scale][0] }))} style={{ padding: "7px", borderRadius: 8, border: "2px solid", borderColor: climbForm.scale === scale ? W.accent : W.border, background: climbForm.scale === scale ? W.accent + "22" : W.surface, color: climbForm.scale === scale ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{scale}</button>)}
      </div>
      <Label>Grade</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {GRADES[climbForm.scale].map(g => <button key={g} onClick={() => setClimbForm(f => ({ ...f, grade: g }))} style={{ padding: "5px 11px", borderRadius: 14, border: "2px solid", borderColor: climbForm.grade === g ? getGradeColor(g) : W.border, background: climbForm.grade === g ? getGradeColor(g) + "33" : W.surface, color: climbForm.grade === g ? getGradeColor(g) : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{g}</button>)}
      </div>
      <Label>Wall Type</Label>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {WALL_TYPES.map(t => { const sel = climbForm.wallTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, wallTypes: toggleArr(f.wallTypes, t) }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: sel ? W.purpleDark : W.border, background: sel ? W.purple : W.surface, color: sel ? W.purpleDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{t}</button>); })}
      </div>
      <Label>Hold Types (select all that apply)</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {HOLD_TYPES.map(t => { const sel = climbForm.holdTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, holdTypes: toggleArr(f.holdTypes, t) }))} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid", borderColor: sel ? W.accentDark : W.border, background: sel ? W.accent + "22" : W.surface, color: sel ? W.accentDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{t}</button>); })}
      </div>
      {!isActiveSession && editingClimbId && (
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
      {isActiveSession && !editingClimbId && (
        <div style={{ background: W.yellow, borderRadius: 10, padding: "10px 12px", marginBottom: 12, border: `1px solid ${W.yellowDark}30` }}>
          <div style={{ fontSize: 12, color: W.yellowDark, fontWeight: 600 }}>💡 Tries and completion are tracked live on the session screen once added.</div>
        </div>
      )}
      <Label>Mark as Project?</Label>
      <button onClick={() => setClimbForm(f => ({ ...f, isProject: !f.isProject }))} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.isProject ? W.pinkDark : W.border, background: climbForm.isProject ? W.pink : W.surface, color: climbForm.isProject ? W.pinkDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🎯 {climbForm.isProject ? "Yes — Project" : "No — Not a Project"}</button>
      <Label>Comments</Label>
      <textarea value={climbForm.comments} onChange={e => setClimbForm(f => ({ ...f, comments: e.target.value }))} placeholder="Beta, hold types, notes..." style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, resize: "none", height: 70, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
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

  // ── ACTIVE SESSION CLIMB CARD ──────────────────────────────
  const ActiveClimbCard = ({ climb }) => {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const isFlash = climb.completed && climb.tries === 1;
    return (
      <div style={{ background: W.surface, borderRadius: 14, border: `2px solid ${climb.completed ? W.greenDark : W.border}`, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, background: getGradeColor(climb.grade) + "30", color: getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}60` }}>{climb.grade}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {climb.color && <ColorDot colorId={climb.color} size={11} />}
              <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{climb.name || climb.grade}</span>
              {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
              {isFlash && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
            </div>
            {climb.comments && <div style={{ fontSize: 11, color: W.textDim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
            <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
          </div>
          <button onClick={() => openClimbForm(climb)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.accent, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Edit</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", borderTop: `1px solid ${W.border}`, background: climb.completed ? W.green + "55" : W.surface2 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0, padding: "8px 0", borderRight: `1px solid ${W.border}` }}>
            <button onClick={() => updateActiveClimbTries(climb.id, -1)} disabled={climb.tries <= 0} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${W.border}`, background: climb.tries <= 0 ? "transparent" : W.surface, color: climb.tries <= 0 ? W.textDim : W.text, fontSize: 18, cursor: climb.tries <= 0 ? "default" : "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <div style={{ minWidth: 52, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: W.text, lineHeight: 1 }}>{climb.tries}</div>
              <div style={{ fontSize: 9, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8 }}>{climb.tries === 1 ? "try" : "tries"}</div>
            </div>
            <button onClick={() => updateActiveClimbTries(climb.id, 1)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
          <button onClick={() => toggleActiveClimbCompleted(climb.id)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer" }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${climb.completed ? W.greenDark : W.border}`, background: climb.completed ? W.greenDark : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              {climb.completed && <span style={{ color: "#fff", fontSize: 13, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: climb.completed ? W.greenDark : W.textMuted }}>{climb.completed ? "Sent!" : "Mark Sent"}</span>
          </button>
          <button onClick={() => setConfirmRemove(true)} style={{ padding: "8px 12px", border: "none", borderLeft: `1px solid ${W.border}`, background: "transparent", color: W.redDark, cursor: "pointer", fontSize: 16 }}>🗑</button>
        </div>
        {confirmRemove && (
          <div style={{ background: W.red, padding: "10px 14px", borderTop: `1px solid ${W.redDark}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: W.redDark, fontWeight: 700 }}>Remove this climb?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemove(false)} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, cursor: "pointer", fontSize: 12 }}>No</button>
              <button onClick={() => removeClimbFromActive(climb.id)} style={{ padding: "5px 12px", background: W.redDark, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Yes</button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
              {climb.tries === 1 && climb.completed && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
            </div>
            <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{climb.grade} · {climb.tries} {climb.tries === 1 ? "try" : "tries"} · {climb.completed ? "✓ Completed" : "✗ Not completed"}</div>
            <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            {climb.comments && <div style={{ fontSize: 12, color: W.textDim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
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

  const SessionCard = ({ session, onClick }) => {
    const sends = session.climbs.filter(c => c.completed).length;
    const total  = session.climbs.length;
    const totalTries = session.climbs.reduce((s, c) => s + c.tries, 0);
    return (
      <div onClick={onClick} style={{ background: W.surface, borderRadius: 16, padding: "16px", cursor: "pointer", border: `1px solid ${W.border}`, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div><div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>{session.location || "Session"}</div><div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{formatDate(session.date)}</div></div>
          <div style={{ background: W.yellow, borderRadius: 10, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: W.yellowDark }}>⏱ {formatDuration(session.duration)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: W.green, color: W.greenDark, borderRadius: 8, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>✓ {sends}/{total} climbs</span>
          <span style={{ background: W.surface2, color: W.textMuted, borderRadius: 8, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>🔁 {totalTries} tries</span>
          {session.climbs.filter(c => c.isProject).length > 0 && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 8, padding: "4px 11px", fontSize: 12, fontWeight: 700 }}>🎯 {session.climbs.filter(c => c.isProject).length} projects</span>}
        </div>
      </div>
    );
  };

  const LogbookSessionCard = ({ session }) => {
    const stats = getSessionStats(session);
    const gradeEntries = Object.entries(stats.gradeBreakdown).sort((a, b) => GRADES["V-Scale"].indexOf(b[0]) - GRADES["V-Scale"].indexOf(a[0]));
    const maxCount = Math.max(...gradeEntries.map(([, v]) => v.attempted), 1);
    return (
      <div style={{ background: W.surface, borderRadius: 18, border: `1px solid ${W.border}`, marginBottom: 16, overflow: "hidden" }}>
        <div onClick={() => { setSelectedSession(session); setScreen("sessionDetail"); }} style={{ padding: "16px", cursor: "pointer", borderBottom: `1px solid ${W.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div><div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>{session.location}</div><div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{formatDate(session.date)} · ⏱ {formatDuration(session.duration)}</div></div>
          <div style={{ color: W.accent, fontSize: 13, fontWeight: 700 }}>Details ›</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: `1px solid ${W.border}` }}>
          {[{ icon: "🧗", label: "Climbs", value: `${stats.sends}/${stats.total}` }, { icon: "🔁", label: "Tries", value: stats.totalTries }, { icon: "⚡", label: "Flashes", value: stats.flashes }, { icon: "📊", label: "Avg", value: stats.avgTries }].map((s, i) => (
            <div key={s.label} style={{ padding: "12px 8px", textAlign: "center", borderRight: i < 3 ? `1px solid ${W.border}` : "none" }}>
              <div style={{ fontSize: 14 }}>{s.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: W.text, marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: W.textDim }}>{s.label}</div>
            </div>
          ))}
        </div>
        {gradeEntries.length > 0 && (
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Grade Breakdown</div>
            {gradeEntries.map(([grade, data]) => (
              <div key={grade} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 32, fontSize: 11, fontWeight: 700, color: getGradeColor(grade), textAlign: "right", flexShrink: 0 }}>{grade}</div>
                <div style={{ flex: 1, height: 16, background: W.surface2, borderRadius: 8, overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.round((data.attempted / maxCount) * 100)}%`, background: getGradeColor(grade) + "44", borderRadius: 8 }} />
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.round((data.completed / maxCount) * 100)}%`, background: getGradeColor(grade), borderRadius: 8 }} />
                </div>
                <div style={{ fontSize: 11, color: W.textMuted, flexShrink: 0, minWidth: 36 }}>{data.completed}/{data.attempted}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── SCREENS ────────────────────────────────────────────────
  const HomeScreen = () => (
    <div style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: W.text, margin: "0 0 4px" }}>Hey, {currentUser?.displayName || "Climber"} 👋</h1>
      <p style={{ color: W.textMuted, margin: "0 0 22px", fontSize: 14 }}>Ready to send something today?</p>
      <button onClick={goToSessionSetup} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 28, boxShadow: `0 4px 20px ${W.accentGlow}` }}>▶ Start a Session</button>
      <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Previous Sessions</div>
      {sessions.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, padding: "40px 0" }}>No sessions yet!</div>
        : sessions.map(s => <SessionCard key={s.id} session={s} onClick={() => { setSelectedSession(s); setScreen("sessionDetail"); }} />)}
    </div>
  );

  const SessionSetupScreen = () => (
    <div style={{ padding: "32px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🧗</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: W.text, margin: "0 0 8px" }}>Start a Session</h2>
        <p style={{ color: W.textMuted, fontSize: 14, margin: 0 }}>Set your location, then start climbing.</p>
      </div>
      <div style={{ background: W.surface, borderRadius: 18, padding: "20px", border: `1px solid ${W.border}`, marginBottom: 24 }}>
        <Label>Gym / Location</Label>
        <LocationDropdown value={pendingLocation} onChange={setPendingLocation} open={locationDropdownOpen} setOpen={setLocationDropdownOpen} />
      </div>
      <button onClick={beginTimer} style={{ width: "100%", padding: "18px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 24px ${W.accentGlow}`, marginBottom: 12 }}>▶ Start Climbing</button>
      <button onClick={() => setScreen("home")} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
    </div>
  );

  const SessionActiveScreen = () => {
    const unclimbed = activeSession?.climbs?.filter(c => c.tries === 0 && !c.completed) || [];
    const attempted  = activeSession?.climbs?.filter(c => c.tries > 0 || c.completed) || [];
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, borderRadius: 16, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: `0 4px 16px ${W.accentGlow}` }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Session Timer</div>
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 900, letterSpacing: 2 }}>{formatDuration(sessionTimer)}</div>
            {activeSession?.location && <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>📍 {activeSession.location}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, marginBottom: 4 }}>{activeSession?.climbs?.filter(c => c.completed).length || 0}/{activeSession?.climbs?.length || 0} sent</div>
            <button onClick={() => setTimerRunning(r => !r)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{timerRunning ? "⏸ Pause" : "▶ Resume"}</button>
          </div>
        </div>
        <Label>Gym / Location</Label>
        <div style={{ marginBottom: 18 }}>
          <LocationDropdown value={activeSession?.location || ""} onChange={v => setActiveSession(s => ({ ...s, location: v }))} open={activeLocationDropdownOpen} setOpen={setActiveLocationDropdownOpen} />
        </div>
        {showClimbForm && <ClimbFormPanel isActiveSession onSave={saveClimbToActiveSession} onCancel={() => { setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); }} />}
        {!showClimbForm && !showProjectPicker && attempted.length > 0 && (
          <><Label>Climbs This Session</Label>{attempted.map(c => <ActiveClimbCard key={c.id} climb={c} />)}</>
        )}
        {!showClimbForm && !showProjectPicker && unclimbed.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: attempted.length > 0 ? 14 : 0 }}>Queued — Not Started</div>
            {unclimbed.map(c => <ActiveClimbCard key={c.id} climb={c} />)}
          </>
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
        {!showClimbForm && !showProjectPicker && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, marginTop: 8 }}>
            <button onClick={() => openClimbForm()} style={{ padding: "13px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 14, color: W.greenDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+ New Climb</button>
            <button onClick={() => setShowProjectPicker(true)} style={{ padding: "13px", background: W.pink, border: `2px solid ${W.pinkDark}`, borderRadius: 14, color: W.pinkDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>🎯 Log Project</button>
          </div>
        )}
        {!showClimbForm && !showProjectPicker && (
          <button onClick={endSession} style={{ width: "100%", padding: "14px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 14, color: W.redDark, fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 }}>⏹ End Session</button>
        )}
      </div>
    );
  };

  const SessionDetailScreen = ({ session }) => {
    const [editingLocation, setEditingLocation] = useState(false);
    const [locationVal, setLocationVal]         = useState(session.location);
    const [locDropOpen, setLocDropOpen]         = useState(false);
    const [confirmDelete, setConfirmDelete]     = useState(false);
    const stats = getSessionStats(session);
    const saveLocation = () => { setSessions(prev => prev.map(s => s.id === session.id ? { ...s, location: locationVal } : s)); setSelectedSession(s => ({ ...s, location: locationVal })); setEditingLocation(false); };
    return (
      <div style={{ padding: "24px 20px" }}>
        <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
          {editingLocation ? (
            <div>
              <LocationDropdown value={locationVal} onChange={setLocationVal} open={locDropOpen} setOpen={setLocDropOpen} />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setEditingLocation(false)} style={{ flex: 1, padding: "8px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, cursor: "pointer" }}>Cancel</button>
                <button onClick={saveLocation} style={{ flex: 1, padding: "8px", background: W.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div><div style={{ fontWeight: 800, fontSize: 18, color: W.text }}>{session.location}</div><div style={{ fontSize: 13, color: W.textMuted, marginTop: 2 }}>{formatDate(session.date)}</div></div>
              <button onClick={() => setEditingLocation(true)} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
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
        {showClimbForm && editingClimbId ? (
          <ClimbFormPanel onSave={() => saveClimbToFinishedSession(session.id)} onCancel={() => { setShowClimbForm(false); setEditingClimbId(null); setEditingSessionId(null); }} />
        ) : (
          session.climbs.map(c => (
            <ClimbRow key={c.id} climb={c}
              onEdit={climb => { setEditingClimbId(climb.id); setEditingSessionId(session.id); setClimbForm({ name: climb.name || "", grade: climb.grade, scale: climb.scale, tries: climb.tries, completed: climb.completed, isProject: climb.isProject, comments: climb.comments, photo: climb.photo, projectId: climb.projectId, color: climb.color || null, wallTypes: climb.wallTypes || [], holdTypes: climb.holdTypes || [] }); setPhotoPreview(climb.photo); setShowClimbForm(true); }}
              onRemove={climbId => removeClimbFromSession(session.id, climbId)}
            />
          ))
        )}
        {!showClimbForm && (
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
    const availableGrades = statsScaleFilter !== "All Scales" ? ["All", ...GRADES[statsScaleFilter]] : ["All"];
    const logbookGrades   = logbookScale !== "All Scales" ? ["All", ...GRADES[logbookScale]] : ["All"];
    const hasClimbFilters   = logbookFilter !== "all" || logbookScale !== "All Scales" || logbookGrade !== "All" || logbookSort !== "date";
    const hasSessionFilters = logbookGymFilter !== "All Gyms";
    const [showAccountPanel, setShowAccountPanel] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);

    return (
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 4px 14px ${W.accentGlow}` }}>🧗</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.text }}>{currentUser?.displayName || "Climber"}</div>
            <div style={{ fontSize: 12, color: W.textMuted }}>@{currentUser?.username} · {sessions.length} sessions · {allClimbs.length} climbs</div>
          </div>
          <button onClick={() => setShowAccountPanel(o => !o)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>⚙️</button>
        </div>

        {showAccountPanel && (
          <div style={{ background: W.surface, borderRadius: 16, padding: "16px", marginBottom: 20, border: `1px solid ${W.border}` }}>
            <div style={{ fontWeight: 700, color: W.text, fontSize: 14, marginBottom: 12 }}>Account</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{currentUser?.displayName}</div>
                <div style={{ fontSize: 12, color: W.textMuted }}>@{currentUser?.username}</div>
              </div>
              <div style={{ background: W.green, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: W.greenDark }}>● Signed In</div>
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
        )}

        <div style={{ display: "flex", background: W.surface2, borderRadius: 12, padding: 4, marginBottom: 22, border: `1px solid ${W.border}` }}>
          {[{ id: "stats", label: "📊 Stats" }, { id: "logbook", label: "📖 Logbook" }, { id: "projects", label: "🎯 Projects" }].map(tab => (
            <button key={tab.id} onClick={() => setProfileTab(tab.id)} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: profileTab === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: profileTab === tab.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{tab.label}</button>
          ))}
        </div>

        {profileTab === "stats" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setAnalyzeOpen(o => !o)} style={{ width: "100%", padding: "13px 16px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: analyzeOpen ? "14px 14px 0 0" : "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>🔍</span><span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>Analyze By</span></div>
                <span style={{ color: W.textMuted, fontSize: 18 }}>⌄</span>
              </button>
              {analyzeOpen && (
                <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "14px" }}>
                  <Label>Scale</Label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {["All Scales", ...Object.keys(GRADES)].map(s => <button key={s} onClick={() => { setStatsScaleFilter(s); setStatsGradeFilter("All"); }} style={{ padding: "5px 12px", borderRadius: 16, border: "2px solid", borderColor: statsScaleFilter === s ? W.accent : W.border, background: statsScaleFilter === s ? W.accent + "22" : W.surface, color: statsScaleFilter === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{s}</button>)}
                  </div>
                  <Label>Grade</Label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {availableGrades.map(g => <button key={g} onClick={() => setStatsGradeFilter(g)} style={{ padding: "5px 12px", borderRadius: 16, border: "2px solid", borderColor: statsGradeFilter === g ? W.accent : W.border, background: statsGradeFilter === g ? W.accent + "22" : W.surface, color: statsGradeFilter === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{g}</button>)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[{ icon: "🏆", label: "Best Grade", value: stats.bestGrade, sub: "V-Scale overall", bg: W.goldLight, tc: W.yellowDark }, { icon: "⚡", label: "Flash Rate", value: `${stats.flashRate}%`, sub: `${stats.flashes.length} flashes`, bg: W.yellow, tc: W.yellowDark }, { icon: "🔁", label: "Avg Tries", value: stats.avgTries, sub: "per climb", bg: W.green, tc: W.greenDark }, { icon: "🧗", label: "Total Sends", value: stats.completed.length, sub: "completed", bg: W.surface2, tc: W.accent }, { icon: "📅", label: "Sessions", value: sessions.length, sub: "total", bg: W.purple, tc: W.purpleDark }, { icon: "🎯", label: "Projects", value: activeProjects.length, sub: "active", bg: W.pink, tc: W.pinkDark }].map(s => (
                <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.tc }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen("calendar")} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${W.gold}, #d97706)`, border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>📅 View Climbing Calendar</button>
            {stats.gradeBreakdown.length > 0 && (
              <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Grade Breakdown</div>
                {stats.gradeBreakdown.map(({ grade, count }) => { const max = Math.max(...stats.gradeBreakdown.map(g => g.count)); return (<div key={grade} style={{ marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 700, color: getGradeColor(grade) }}>{grade}</span><span style={{ fontSize: 12, color: W.textDim }}>{count} send{count !== 1 ? "s" : ""}</span></div><div style={{ background: W.surface2, borderRadius: 6, height: 8, overflow: "hidden" }}><div style={{ width: `${Math.round((count / max) * 100)}%`, height: "100%", borderRadius: 6, background: getGradeColor(grade) }} /></div></div>); })}
              </div>
            )}
          </div>
        )}

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
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {allGyms.map(g => <button key={g} onClick={() => setLogbookGymFilter(g)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookGymFilter === g ? W.accent : W.border, background: logbookGymFilter === g ? W.accent + "22" : W.surface, color: logbookGymFilter === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📍 {g}</button>)}
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
                        {["All Scales", ...Object.keys(GRADES)].map(s => <button key={s} onClick={() => { setLogbookScale(s); setLogbookGrade("All"); }} style={{ padding: "5px 10px", borderRadius: 14, border: "2px solid", borderColor: logbookScale === s ? W.accent : W.border, background: logbookScale === s ? W.accent + "22" : W.surface, color: logbookScale === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{s}</button>)}
                      </div>
                      <Label>Grade</Label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {logbookGrades.map(g => <button key={g} onClick={() => setLogbookGrade(g)} style={{ padding: "5px 10px", borderRadius: 14, border: "2px solid", borderColor: logbookGrade === g ? W.accent : W.border, background: logbookGrade === g ? W.accent + "22" : W.surface, color: logbookGrade === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{g}</button>)}
                      </div>
                      <Label>Sort</Label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {[["date", "📅 Newest"], ["hardest", "🔺 Hardest"], ["easiest", "🔻 Easiest"]].map(([val, label]) => <button key={val} onClick={() => setLogbookSort(val)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookSort === val ? W.accent : W.border, background: logbookSort === val ? W.accent + "22" : W.surface, color: logbookSort === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>)}
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
                  : filteredSessions.map(s => <LogbookSessionCard key={s.id} session={s} />)}
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
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}><span style={{ fontWeight: 700, fontSize: 13, color: getGradeColor(p.grade) }}>{p.grade}</span><span style={{ color: W.textMuted, fontSize: 12 }}>{p.scale}</span></div>
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
                    <div><div style={{ fontWeight: 700, fontSize: 15, color: W.textMuted }}>{p.name || p.grade}</div><div style={{ fontSize: 12, color: W.textDim, marginTop: 2 }}>{p.grade} · {p.scale}</div></div>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}><span style={{ fontWeight: 800, fontSize: 16, color: getGradeColor(project.grade) }}>{project.grade}</span><span style={{ color: W.textMuted, fontSize: 13 }}>{project.scale}</span>{project.completed && <span style={{ background: W.greenDark, color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>✓ SENT!</span>}</div>
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
    const hasClimb = (day) => climbDates.some(d => { const dt = new Date(d); return dt.getFullYear() === year && dt.getMonth() === month && dt.getDate() === day; });
    const isToday  = (day) => { const t = new Date(); return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day; };
    return (
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: W.text, fontWeight: 700 }}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 17, color: W.text }}>{calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", color: W.text, fontWeight: 700 }}>›</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: W.textMuted, padding: "4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {Array.from({ length: firstDay }, (_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
            <div key={day} style={{ aspectRatio: "1", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: hasClimb(day) ? 800 : 400, background: hasClimb(day) ? W.gold : isToday(day) ? W.surface2 : "transparent", color: hasClimb(day) ? "#fff" : isToday(day) ? W.accent : W.text, border: isToday(day) ? `2px solid ${W.accent}` : "2px solid transparent" }}>{day}</div>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Sessions This Month</div>
          {sessions.filter(s => { const d = new Date(s.date); return d.getFullYear() === year && d.getMonth() === month; }).length === 0
            ? <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No sessions this month</div>
            : sessions.filter(s => { const d = new Date(s.date); return d.getFullYear() === year && d.getMonth() === month; }).map(s => (
              <div key={s.id} onClick={() => { setSelectedSession(s); setScreen("sessionDetail"); }} style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${W.border}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><div style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{s.location}</div><div style={{ fontSize: 12, color: W.textMuted }}>{formatDate(s.date)} · {s.climbs.length} climbs</div></div>
                <div style={{ color: W.textDim }}>›</div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const backMap  = { sessionDetail: "home", calendar: "profile", projectDetail: "profile" };
  const navItems = [
    { id: "home",    label: "🏠", text: "Home" },
    { id: "session", label: "⏱", text: "Session", action: () => activeSession ? setScreen("session") : goToSessionSetup() },
    { id: "profile", label: "👤", text: "Profile" },
  ];

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: W.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${W.border}`, background: W.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(backMap[screen] || screen === "session") && (
            <button onClick={() => { if (screen === "session" && !sessionStarted) setScreen("home"); else if (backMap[screen]) { setScreen(backMap[screen]); setShowClimbForm(false); if (screen === "calendar" || screen === "projectDetail") setProfileTab("stats"); } }} style={{ background: "none", border: "none", color: W.accent, fontSize: 16, cursor: "pointer", padding: 0, marginRight: 4 }}>←</button>
          )}
          <span style={{ fontSize: 20 }}>🧗</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: W.text }}>SendLog</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {timerRunning && <div style={{ background: W.accent, borderRadius: 20, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>⏱ {formatDuration(sessionTimer)}</div>}
          {saveStatus === "saving" && <div style={{ fontSize: 11, color: W.textDim, fontWeight: 600 }}>💾</div>}
          {saveStatus === "saved" && <div style={{ fontSize: 11, color: W.greenDark, fontWeight: 600 }}>✓</div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }} onClick={() => { setLocationDropdownOpen(false); setActiveLocationDropdownOpen(false); }}>
        {screen === "home"          && <HomeScreen />}
        {screen === "session"       && (sessionStarted ? <SessionActiveScreen /> : <SessionSetupScreen />)}
        {screen === "profile"       && <ProfileScreen />}
        {screen === "sessionDetail" && selectedSession && <SessionDetailScreen session={selectedSession} />}
        {screen === "calendar"      && <CalendarScreen />}
        {screen === "projectDetail" && selectedProject && <ProjectDetailScreen project={projects.find(p => p.id === selectedProject.id) || selectedProject} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: W.surface, borderTop: `1px solid ${W.border}`, display: "flex", justifyContent: "space-around", padding: "10px 0 18px", zIndex: 10 }}>
        {navItems.map(item => (
          <button key={item.id} onClick={item.action || (() => setScreen(item.id))} style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: (screen === item.id || (item.id === "session" && screen === "session")) ? W.accent : W.textDim }}>
            <span style={{ fontSize: 22 }}>{item.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{item.text}</span>
            {item.id === "session" && timerRunning && <div style={{ width: 6, height: 6, borderRadius: "50%", background: W.accent }} />}
          </button>
        ))}
      </div>
    </div>
  );
}