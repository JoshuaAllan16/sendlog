import { useState, useRef, useEffect, Component, Fragment } from "react";
import { createClient } from "@supabase/supabase-js";
import { ThemeCtx, THEMES } from "./theme.js";
import { ColorDot, TagChips, LocationDropdown, SpeedSessionCard, BoulderRopeSessionCard, ActiveClimbCard } from "./Components.jsx";
import { ProjectDetailScreen, SessionSummaryScreen } from "./Screens.jsx";
import { GRADES, ROPE_GRADES, GRADE_COLORS, CLIMB_COLORS, WALL_TYPES, HOLD_TYPES, getGradeColor, formatDate, formatDuration, formatTotalTime, formatRestSec } from "./constants.js";

// §CONSTANTS — all constants and utils are in ./constants.js
// §CONTEXT — ThemeCtx, useTheme, and THEMES are imported from ./theme.js

const DEFAULT_WARMUP_ITEMS = [
  { id: 1, text: "Wrist & finger stretches" },
  { id: 2, text: "Shoulder & arm circles" },
  { id: 3, text: "Hip flexors & leg swings" },
  { id: 4, text: "Core activation" },
  { id: 5, text: "Easy footwork / slab traversing" },
  { id: 6, text: "Low intensity problems (V0–V1)" },
];

const DEFAULT_WORKOUT_ITEMS = [
  { id: 1, text: "Pull-ups: 3×8" },
  { id: 2, text: "Dead hangs: 4×10s" },
  { id: 3, text: "Antagonist push-ups: 3×15" },
  { id: 4, text: "Core: 3×20 hollow body" },
];

const DEFAULT_FINGERBOARD_ITEMS = [
  { id: 1, text: "Half crimp: 5×(7s on / 3s off)" },
  { id: 2, text: "Open hand: 5×(7s on / 3s off)" },
  { id: 3, text: "3-finger drag: 3×(10s on / 5s off)" },
  { id: 4, text: "Pinch: 3×(10s on / 5s off)" },
];

const WARMUP_PRESETS = [
  { name: "Standard", description: "Full-body warmup for a climbing session", items: DEFAULT_WARMUP_ITEMS },
  { name: "Quick Warmup", description: "10-minute fast prep", items: [
    { id: 1, text: "Wrist & finger stretches" },
    { id: 2, text: "Arm circles" },
    { id: 3, text: "Easy footwork traversing" },
  ]},
  { name: "Thorough Warmup", description: "Complete mobility & activation", items: [
    { id: 1, text: "Foam roll upper back & lats" },
    { id: 2, text: "Wrist & finger stretches" },
    { id: 3, text: "Shoulder circles & pendulums" },
    { id: 4, text: "Hip flexors & leg swings" },
    { id: 5, text: "Core activation" },
    { id: 6, text: "Easy footwork / slab traversing" },
    { id: 7, text: "V0–V1 problems (focus on feet)" },
    { id: 8, text: "V1–V2 problems" },
  ]},
];

const WORKOUT_PRESETS = [
  { name: "Standard Strength", description: "Balanced pull + push + core", items: DEFAULT_WORKOUT_ITEMS },
  { name: "Upper Body Focus", description: "Pulling power and shoulders", items: [
    { id: 1, text: "Pull-ups: 4×6 (weighted if possible)" },
    { id: 2, text: "Lock-offs: 3×5s each arm" },
    { id: 3, text: "Shoulder press: 3×10" },
    { id: 4, text: "Face pulls: 3×15" },
    { id: 5, text: "Bicep curls: 3×12" },
  ]},
  { name: "Core Stability", description: "Core, balance, and body tension", items: [
    { id: 1, text: "Hollow body hold: 3×20s" },
    { id: 2, text: "Dead bug: 3×10 each side" },
    { id: 3, text: "Plank: 3×45s" },
    { id: 4, text: "L-sit: 3×10s" },
    { id: 5, text: "Side plank: 2×30s each" },
  ]},
];

const FINGERBOARD_PRESETS = [
  { name: "Standard", description: "Crimp + open hand protocol", items: DEFAULT_FINGERBOARD_ITEMS },
  { name: "Beginner Protocol", description: "Introduction to hangboarding", items: [
    { id: 1, text: "Open hand: 3×(7s on / 3s off) — comfortable edge" },
    { id: 2, text: "Jug hang: 2×20s" },
    { id: 3, text: "Rest 3 min between sets" },
  ]},
  { name: "Max Strength", description: "Heavy loads, longer rest periods", items: [
    { id: 1, text: "Half crimp: 5×(10s on / 3 min rest) — add weight" },
    { id: 2, text: "3-finger drag: 5×(10s on / 3 min rest)" },
    { id: 3, text: "Open hand: 4×(10s on / 3 min rest)" },
    { id: 4, text: "Pinch: 3×(12s on / 2 min rest)" },
  ]},
];

// §STORAGE

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

// §COMPONENTS_OUTER — TagChips, LocationDropdown, SpeedSessionCard, BoulderRopeSessionCard, ActiveClimbCard are imported from ./Components.jsx

// §ERROR_BOUNDARY
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("Session render error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>An error occurred. Your session data is safe.</div>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "#6c3a1f", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
function ActiveSessionRenderer({ render }) { return render(); }

// §APP_START
export default function App() {
  // §STATE
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
  const [abandonedSession, setAbandonedSession] = useState(null);
  const [locationDropdownOpen, setLocationDropdownOpen]       = useState(false);
  const [activeLocationDropdownOpen, setActiveLocationDropdownOpen] = useState(false);
  const timerRef           = useRef(null);
  const fileRef            = useRef();
  const picRef             = useRef();
  const lbPhotoRef         = useRef();
  const sessionInitialized = useRef(false); // prevents persist effect from clearing active:climb before checkSession reads it
  const boulderListRef     = useRef(null);
  const swipeStartRef      = useRef(null); // { x, y, ts }
  const swipeLockedRef     = useRef(null); // null | "h" | "v"
  const swipeAnimRef       = useRef(false);
  const screenRef          = useRef(screen);
  const scrollDivRef       = useRef(null);
  const peekDivRef         = useRef(null);
  const swipePeekRef       = useRef(null); // { tab, fromRight } when peek is active

  const [swipePeekScreen, setSwipePeekScreen]   = useState(null); // "home"|"session"|"profile" during swipe

  // Gyms & custom grading schemes
  const [gyms, setGyms] = useState([]);
  const [customGradingSchemes, setCustomGradingSchemes] = useState([]);
  const [showGymCreate, setShowGymCreate] = useState(false);
  const [gymCreateStep, setGymCreateStep] = useState(1);
  const [gymCreateName, setGymCreateName] = useState("");
  const [gymCreateActivities, setGymCreateActivities] = useState([]);
  const [gymCreateId, setGymCreateId] = useState(null);
  const [gymCreateBoulderScale, setGymCreateBoulderScale] = useState("V-Scale");
  const [gymCreateRopeScale, setGymCreateRopeScale] = useState("French");
  const [showSchemeBuilder, setShowSchemeBuilder] = useState(false);
  const [schemeEditId, setSchemeEditId] = useState(null);
  const [schemeName, setSchemeName] = useState("");
  const [schemeGrades, setSchemeGrades] = useState([]);
  const [schemeNewGrade, setSchemeNewGrade] = useState("");
  const [schemeColorPicking, setSchemeColorPicking] = useState(null);
  const [schemeBuilderFor, setSchemeBuilderFor] = useState(null);
  const [schemeDragState, setSchemeDragState] = useState(null);

  const [showClimbForm, setShowClimbForm]       = useState(false);
  const [formProjectPickerOpen, setFormProjectPickerOpen] = useState(false);
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
  const [customLocations, setCustomLocations]   = useState([]);
  const [mainGym, setMainGym]                   = useState("");
  const [showOnboarding, setShowOnboarding]     = useState(false);
  const [onboardingStep, setOnboardingStep]     = useState(0);
  const [onboardingGymInput, setOnboardingGymInput] = useState("");
  const [onboardingGyms, setOnboardingGyms]     = useState([]);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [homeGymDropOpen, setHomeGymDropOpen]   = useState(false);
  const [confirmLogout, setConfirmLogout]       = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteAccountInput, setDeleteAccountInput] = useState("");
  const [notifPrefsOpen, setNotifPrefsOpen]       = useState(false);
  const [settingsGradingOpen, setSettingsGradingOpen] = useState(false);
  const [settingsSessionTypeOpen, setSettingsSessionTypeOpen] = useState(false);
  const [settingsWarmupOpen, setSettingsWarmupOpen] = useState(false);
  const [settingsWorkoutOpen, setSettingsWorkoutOpen] = useState(false);
  const [settingsFingerboardOpen, setSettingsFingerboardOpen] = useState(false);
  const [deleteSetConfirm, setDeleteSetConfirm] = useState(false);
  const [editingGymSetClimb, setEditingGymSetClimb] = useState(false);
  const [followRequestsOpen, setFollowRequestsOpen] = useState(false);
  const [profileNotifsOpen, setProfileNotifsOpen]   = useState(false);
  const [lightboxPhoto, setLightboxPhoto]           = useState(null); // { photos:[{src,grade,name,colorId}], idx }
  const [feedPage, setFeedPage]                     = useState(1);
  const [logbookPage, setLogbookPage]               = useState(1);
  const [logbookClimbPage, setLogbookClimbPage]     = useState(1);
  const [sessionTypes, setSessionTypes]             = useState(["boulder"]);
  const [showMoreClimbTypes, setShowMoreClimbTypes] = useState(false);
  const [showSentBoulders, setShowSentBoulders]     = useState(false);
  const [showSentRope, setShowSentRope]             = useState(false);
  const [showClimbTypeDropdown, setShowClimbTypeDropdown] = useState(null); // null | { top, right }
  const [warmupNewItemText, setWarmupNewItemText]         = useState("");
  const [defaultWarmupItems, setDefaultWarmupItems]       = useState(DEFAULT_WARMUP_ITEMS);
  const [warmupTemplates, setWarmupTemplates]             = useState([{ id: 1, name: "Standard", items: DEFAULT_WARMUP_ITEMS }]);
  const [activeWarmupTemplateId, setActiveWarmupTemplateId] = useState(1);
  const [showWarmupNudge, setShowWarmupNudge]             = useState(false);
  const [warmupSettingsNewItem, setWarmupSettingsNewItem] = useState("");
  const [warmupTemplateNewName, setWarmupTemplateNewName] = useState("");
  const [autoEndWarmup, setAutoEndWarmup]                 = useState(true);
  const [workoutNewItemText, setWorkoutNewItemText]           = useState("");
  const [defaultWorkoutItems, setDefaultWorkoutItems]         = useState(DEFAULT_WORKOUT_ITEMS);
  const [workoutSettingsNewItem, setWorkoutSettingsNewItem]   = useState("");
  const [fingerboardNewItemText, setFingerboardNewItemText]   = useState("");
  const [defaultFingerboardItems, setDefaultFingerboardItems] = useState(DEFAULT_FINGERBOARD_ITEMS);
  const [fingerboardSettingsNewItem, setFingerboardSettingsNewItem] = useState("");
  const [workoutRoutines, setWorkoutRoutines]                 = useState([{ id: 1, name: "Standard Workout", description: "Upper body + core strength", items: DEFAULT_WORKOUT_ITEMS }]);
  const [fingerboardRoutines, setFingerboardRoutines]         = useState([{ id: 1, name: "Standard Fingerboard", description: "Crimp and open hand training", items: DEFAULT_FINGERBOARD_ITEMS }]);
  const [activeWorkoutRoutineId, setActiveWorkoutRoutineId]   = useState(1);
  const [activeFingerboardRoutineId, setActiveFingerboardRoutineId] = useState(1);
  const [routineEditor, setRoutineEditor]                     = useState(null);
  const [routineEditorName, setRoutineEditorName]             = useState("");
  const [routineEditorDesc, setRoutineEditorDesc]             = useState("");
  const [routineEditorItems, setRoutineEditorItems]           = useState([]);
  const [routineEditorNewItem, setRoutineEditorNewItem]       = useState("");
  const [routineEditorShowPresets, setRoutineEditorShowPresets] = useState(false);
  const [showAddRoutineTypePicker, setShowAddRoutineTypePicker] = useState(false);
  const [routineEditorEditingItemId, setRoutineEditorEditingItemId] = useState(null);
  const [routineEditorEditingText, setRoutineEditorEditingText]     = useState("");
  const [routineEditorEditingDetail, setRoutineEditorEditingDetail] = useState("");
  const [routineEditorEditingRest, setRoutineEditorEditingRest]     = useState("");
  const [routineShareModal, setRoutineShareModal]   = useState(null);
  const [routineImportCode, setRoutineImportCode]   = useState("");
  const [routineImportError, setRoutineImportError] = useState("");
  const [showImportRoutine, setShowImportRoutine]   = useState(false);
  const [routineRestTimer, setRoutineRestTimer]     = useState(null); // { itemId, endsAt }
  const [fitnessPickerStep, setFitnessPickerStep] = useState(null); // null | "choose" | "routine-type" | "routine-list" | "exercise"
  const [fitnessPickerRoutineType, setFitnessPickerRoutineType] = useState(null); // "warmup"|"workout"|"fingerboard"
  const [fitnessNewExerciseName, setFitnessNewExerciseName] = useState("");
  const [fitnessNewItemTexts, setFitnessNewItemTexts]       = useState({}); // { [sectionId]: string }
  const [fitnessDragIdx, setFitnessDragIdx]                 = useState(null);
  const [trainingPickerType, setTrainingPickerType]         = useState(null); // null | "warmup" | "workout" | "fingerboard"
  const [sessionSetupClimbingOpen, setSessionSetupClimbingOpen] = useState(true);
  const [sessionSetupFitnessOpen, setSessionSetupFitnessOpen]   = useState(false);
  const [routinePreview, setRoutinePreview]         = useState(null); // { type, id }
  const [collapsedRoutineSections, setCollapsedRoutineSections] = useState({});
  const [routineListSearch, setRoutineListSearch]   = useState("");
  const [swipedRoutineCard, setSwipedRoutineCard]   = useState(null); // { type, id }
  const [sessionTypeOrder, setSessionTypeOrder]               = useState(["boulder","rope","speed","warmup","workout","fingerboard","fitness"]);
  const [colorTheme, setColorTheme]             = useState("espresso");
  const [showEndConfirm, setShowEndConfirm]     = useState(false);
  const [showRemoveQueuedPrompt, setShowRemoveQueuedPrompt] = useState(false);
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);
  const [projectPromptChecked, setProjectPromptChecked] = useState({});
  const [sessionSummary, setSessionSummary]     = useState(null);
  const [projectTypeFilter, setProjectTypeFilter]     = useState(() => localStorage.getItem("projectTypeFilter") || "all");
  const [projectSort, setProjectSort]                 = useState(() => localStorage.getItem("projectSort") || "recent");
  const [projActiveCollapsed, setProjActiveCollapsed] = useState(false);
  const [projSentCollapsed, setProjSentCollapsed]     = useState(false);
  const [projRetiredCollapsed, setProjRetiredCollapsed] = useState(false);
  const [climbingSubTab, setClimbingSubTab] = useState("climbs");
  const [trainingSubTab, setTrainingSubTab] = useState("overview");

  const blankForm = { name: "", grade: GRADES[preferredScale]?.[2] || "V3", scale: preferredScale, isProject: false, comments: "", photo: null, color: null, wallTypes: [], holdTypes: [], climbType: "boulder", ropeStyle: "lead", speedTime: "", setClimbId: null, section: null };

  const [climbForm, setClimbForm]   = useState(blankForm);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [boulderAddMode, setBoulderAddMode] = useState(null); // null | "landing" | "set-picker" | "new-boulder"
  const [setPickerSelected, setSetPickerSelected] = useState(new Set());
  const [newBoulderStep, setNewBoulderStep] = useState(0);
  const [newBoulderVisited, setNewBoulderVisited] = useState(new Set());
  const [showBoulderScalePicker, setShowBoulderScalePicker] = useState(false);
  const [showRopeScalePicker, setShowRopeScalePicker] = useState(false);
  const [gymSets, setGymSets] = useState({});
  const [gymSetStaleWeeks, setGymSetStaleWeeks] = useState(8);
  const [selectedSetClimb, setSelectedSetClimb] = useState(null);
  const [gymScales, setGymScales] = useState({}); // { [location]: { boulder, rope, wallSections, hours, notes } }
  const [selectedGym, setSelectedGym] = useState(null);
  const [gymDetailsOpen, setGymDetailsOpen] = useState(false);
  const [gymSettingsOpen, setGymSettingsOpen] = useState(false);
  const [confirmDeleteGym, setConfirmDeleteGym] = useState(false);
  const [gymEditName, setGymEditName] = useState("");
  const [gymSetView, setGymSetView] = useState("tiles"); // "single" | "tiles"
  const [gymDetailTab, setGymDetailTab] = useState("overview"); // "overview" | "sets"
  const [showSendClimbs, setShowSendClimbs] = useState(false);
  const [sendClimbStep, setSendClimbStep] = useState("select"); // "select" | "friend"
  const [sendSelectedIds, setSendSelectedIds] = useState(new Set());
  const [sendMutuals, setSendMutuals] = useState(null);
  const [sendToUser, setSendToUser] = useState(null);
  const [sendingClimbs, setSendingClimbs] = useState(false);
  const [showSendSingleClimb, setShowSendSingleClimb] = useState(false);
  const [pendingSharedClimbs, setPendingSharedClimbs] = useState(null);
  const [sharedClimbGym, setSharedClimbGym] = useState("");
  const [sharedClimbSections, setSharedClimbSections] = useState({});
  const [toastMsg, setToastMsg] = useState(null);
  const [notifTypeFilter, setNotifTypeFilter] = useState("all");
  const [showMergeClimbPicker, setShowMergeClimbPicker] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState(null);
  const [showMergeResult, setShowMergeResult] = useState(false);
  const [editSetClimbOpen, setEditSetClimbOpen] = useState(false);
  const [gymSectionInput, setGymSectionInput] = useState("");
  const [gymManageMode, setGymManageMode] = useState(false);
  const [gymSelectedIds, setGymSelectedIds] = useState(new Set());
  const [selectedLogbookClimb, setSelectedLogbookClimb] = useState(null);
  const [boulderQuickPanel, setBoulderQuickPanel] = useState(null); // null | "projects" | "set"
  const [quickPanelSelected, setQuickPanelSelected] = useState([]); // array of selected item IDs
  const [pendingDupeClimb, setPendingDupeClimb] = useState(null);
  const [dupeNewName, setDupeNewName] = useState("");
  const [gymSetShowRemoved, setGymSetShowRemoved] = useState({});
  const [showNewBoulderForm, setShowNewBoulderForm] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const [logbookFilter, setLogbookFilter]   = useState(() => localStorage.getItem("lb:filter") || "all");
  const [logbookScale, setLogbookScale]     = useState(() => localStorage.getItem("lb:scale") || "All Scales");
  const [logbookGrade, setLogbookGrade]     = useState(() => localStorage.getItem("lb:grade") || "All");
  const [logbookSort, setLogbookSort]       = useState(() => localStorage.getItem("lb:sort") || "date");
  const [logbookView, setLogbookView]       = useState("climbs");
  const [logbookFiltersOpen, setLogbookFiltersOpen] = useState(false);
  const [logbookColorFilter, setLogbookColorFilter]     = useState(() => localStorage.getItem("lb:color") || "All");
  const [logbookSectionFilter, setLogbookSectionFilter] = useState(() => localStorage.getItem("lb:section") || "All");
  const [gymSetSortBySection, setGymSetSortBySection]   = useState(false);
  const [logbookTickList, setLogbookTickList]           = useState(() => localStorage.getItem("lb:tickList") === "true");
  const [logbookTileView, setLogbookTileView]           = useState(() => { const v = localStorage.getItem("lb:tileView"); return (v === "list" || v === "single" || v === "tiles") ? v : (v === "false" ? "list" : "tiles"); });
  const [logbookSearch, setLogbookSearch]               = useState("");
  const [logbookSearchOpen, setLogbookSearchOpen]       = useState(false);
  const [logbookClimbTypeFilter, setLogbookClimbTypeFilter] = useState(() => { try { const v = localStorage.getItem("lb:climbType"); return v ? JSON.parse(v) : ["boulder","rope"]; } catch { return ["boulder","rope"]; } });
  const [logbookClimbGymFilter, setLogbookClimbGymFilter]   = useState(() => { try { const v = localStorage.getItem("lb:climbGyms"); return v ? JSON.parse(v) : null; } catch { return null; } });
  const [logbookGymSectionFilter, setLogbookGymSectionFilter] = useState(() => { try { const v = localStorage.getItem("lb:gymSections"); return v ? JSON.parse(v) : {}; } catch { return {}; } });
  const [logbookColorMulti, setLogbookColorMulti]           = useState(() => { try { const v = localStorage.getItem("lb:colorMulti"); return v ? JSON.parse(v) : null; } catch { return null; } });
  const [logbookQuickSort, setLogbookQuickSort]             = useState(() => localStorage.getItem("lb:quickSort") || "date");
  const [logbookQuickSortDir, setLogbookQuickSortDir]       = useState(() => localStorage.getItem("lb:quickSortDir") || "desc");
  const [logbookGymExpanded, setLogbookGymExpanded]         = useState({});
  const [longPressPhotoTarget, setLongPressPhotoTarget] = useState(null); // { climbId, sessionId }
  const [showAddGym, setShowAddGym]                     = useState(false);
  const [addGymInput, setAddGymInput]                   = useState("");
  const [showClimbShare, setShowClimbShare]         = useState(false);
  const [logbookClimbEditOpen, setLogbookClimbEditOpen] = useState(false);
  const [logbookEditOriginal, setLogbookEditOriginal]   = useState(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt]       = useState(false);
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
  const [openOverallDropdown, setOpenOverallDropdown] = useState(null); // null | "sends" | "time"
  const [ropePieStat, setRopePieStat]               = useState("sends");
  const [ropePieSelGrade, setRopePieSelGrade]       = useState(null);
  const [ropePieHiddenGrades, setRopePieHiddenGrades] = useState([]);
  const [statsChartFilter, setStatsChartFilter]     = useState("all");
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
  const [lbDebug, setLbDebug]                 = useState(null); // diagnostic info for troubleshooting
  const [socialResults, setSocialResults]     = useState(null); // null = not searched yet
  const [socialFeed, setSocialFeed]           = useState([]);
  const [socialFeedLoading, setSocialFeedLoading] = useState(false);
  const [socialUserList, setSocialUserList]   = useState(null); // null | { type, users }
  const [viewedUser, setViewedUser]           = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(false);
  const [userProfileBackTo, setUserProfileBackTo] = useState("social");
  const [sessionDetailBackTo, setSessionDetailBackTo] = useState("home");
  const [showSummaryLeaveWarn, setShowSummaryLeaveWarn] = useState(false);
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

  // §EFFECTS
  // Prevent background scroll when any full-screen popup is open
  useEffect(() => {
    const locked = !!(boulderQuickPanel || pendingDupeClimb || selectedSetClimb || boulderAddMode);
    document.body.style.overflow = locked ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [boulderQuickPanel, pendingDupeClimb, selectedSetClimb, boulderAddMode]);

  // Persist logbook filter prefs
  useEffect(() => {
    localStorage.setItem("lb:filter", logbookFilter);
    localStorage.setItem("lb:scale", logbookScale);
    localStorage.setItem("lb:grade", logbookGrade);
    localStorage.setItem("lb:sort", logbookSort);
    localStorage.setItem("lb:color", logbookColorFilter);
    localStorage.setItem("lb:section", logbookSectionFilter);
    localStorage.setItem("lb:tickList", logbookTickList);
    localStorage.setItem("lb:tileView", logbookTileView); // "tiles" | "single" | "list"
  }, [logbookFilter, logbookScale, logbookGrade, logbookSort, logbookColorFilter, logbookSectionFilter, logbookTickList, logbookTileView]);

  // ── SHARED: restore active:climb from localStorage ─────────
  // Called from both checkSession (auto-login) and handleLogin (manual login after logout/close).
  const tryRestoreClimbSession = (loginUsername) => {
    const IDLE_LIMIT_MS = 90 * 60 * 1000;
    const savedClimb = localStorage.getItem("active:climb");
    if (!savedClimb) return;
    try {
      const { username: su, activeSession: sa, sessionActiveStart: sas, sessionPausedSec: sps, sessionStarted: ss, timerRunning: tr, pendingLocation: pl, lastActivityAt: lat } = JSON.parse(savedClimb);
      if (su && su !== loginUsername) return; // belongs to a different user on this device
      if (Date.now() - (lat || 0) > IDLE_LIMIT_MS) {
        // Idle too long — convert to abandoned session offer
        const finalDuration = sas ? Math.floor((Date.now() - sas) / 1000) + (sps || 0) : (sps || 0);
        const rawLoc = (sa?.location || pl || "Unknown Gym").trim();
        const loc = rawLoc.replace(/\b([a-z])/g, c => c.toUpperCase());
        const abandoned = { id: Date.now(), date: new Date().toISOString(), duration: finalDuration, location: loc, climbs: sa?.climbs || [], boulderTotalSec: sa?.boulderTotalSec || 0, ropeTotalSec: sa?.ropeTotalSec || 0, boulderStartedAt: sa?.boulderStartedAt, ropeStartedAt: sa?.ropeStartedAt };
        localStorage.setItem("abandoned:session", JSON.stringify({ session: abandoned, idledAt: lat }));
        localStorage.removeItem("active:climb");
      } else if (ss && sa) {
        // Restore photos from sessionStorage (stripped from localStorage to avoid quota errors)
        const savedPhotos = JSON.parse(sessionStorage.getItem("active:photos") || "{}");
        const restoredSession = { ...sa, climbs: (sa.climbs || []).map(c => ({ ...c, photo: savedPhotos[c.id] || null })) };
        setActiveSession(restoredSession);
        if (tr && sas && lat) {
          const gapSec = Math.floor((Date.now() - lat) / 1000);
          setSessionPausedSec((sps || 0) + gapSec);
          setSessionActiveStart(Date.now());
        } else {
          setSessionActiveStart(sas);
          setSessionPausedSec(sps || 0);
        }
        setSessionStarted(true);
        setTimerRunning(tr);
        setPendingLocation(pl || "");
        setScreen("session");
      }
    } catch (e) { localStorage.removeItem("active:climb"); }
    const ab = localStorage.getItem("abandoned:session");
    if (ab) { try { setAbandonedSession(JSON.parse(ab)); } catch (e) { localStorage.removeItem("abandoned:session"); } }
  };

  // ── INIT: check for existing session ──────────────────────
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionResult = await storage.get("active:session");
        if (sessionResult) {
          const { username, userData: cachedData } = JSON.parse(sessionResult.value);
          // Always load fresh data from Supabase so following/sessions are never stale
          const freshData = await loadUserData(username).catch(() => null);
          const userData = freshData || cachedData || { profile: {}, sessions: [], projects: [] };
          setCurrentUser({ username, ...userData.profile });
          setSessions(userData.sessions || []);
          setProjects(userData.projects || []);
          setGymSets(userData.gymSets || {});
          setGymScales(userData.profile?.gymScales || {});
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
          setCustomLocations(userData.profile?.customLocations || []);
          setMainGym(userData.profile?.mainGym || "");
          setSocialFollowing(userData.profile?.following || []);
          setGyms(userData.profile?.gyms || []);
          setCustomGradingSchemes(userData.profile?.customGradingSchemes || []);
          setColorTheme(userData.profile?.colorTheme || "espresso");
          setMutedUsers(userData.profile?.mutedUsers || []);
          setNotifPrefs(userData.profile?.notifPrefs || { follows: true, sessions: true });
          setIsPrivate(userData.profile?.isPrivate || false);
          setDefaultWarmupItems(userData.profile?.defaultWarmupItems || DEFAULT_WARMUP_ITEMS);
          if (userData.profile?.warmupTemplates?.length) {
            setWarmupTemplates(userData.profile.warmupTemplates);
            setActiveWarmupTemplateId(userData.profile.activeWarmupTemplateId || userData.profile.warmupTemplates[0].id);
          }
          setAutoEndWarmup(userData.profile?.autoEndWarmup !== false);
          if (userData.profile?.gymSetStaleWeeks != null) setGymSetStaleWeeks(userData.profile.gymSetStaleWeeks);
          if (userData.profile?.workoutRoutines?.length) {
            setWorkoutRoutines(userData.profile.workoutRoutines);
            if (userData.profile?.activeWorkoutRoutineId) setActiveWorkoutRoutineId(userData.profile.activeWorkoutRoutineId);
            const activeWR = userData.profile.workoutRoutines.find(r => r.id === (userData.profile.activeWorkoutRoutineId || 1));
            if (activeWR) setDefaultWorkoutItems(activeWR.items);
            else if (userData.profile?.defaultWorkoutItems?.length) setDefaultWorkoutItems(userData.profile.defaultWorkoutItems);
          } else if (userData.profile?.defaultWorkoutItems?.length) {
            setDefaultWorkoutItems(userData.profile.defaultWorkoutItems);
            setWorkoutRoutines([{ id: 1, name: "Standard Workout", description: "Upper body + core strength", items: userData.profile.defaultWorkoutItems }]);
          }
          if (userData.profile?.fingerboardRoutines?.length) {
            setFingerboardRoutines(userData.profile.fingerboardRoutines);
            if (userData.profile?.activeFingerboardRoutineId) setActiveFingerboardRoutineId(userData.profile.activeFingerboardRoutineId);
            const activeFR = userData.profile.fingerboardRoutines.find(r => r.id === (userData.profile.activeFingerboardRoutineId || 1));
            if (activeFR) setDefaultFingerboardItems(activeFR.items);
            else if (userData.profile?.defaultFingerboardItems?.length) setDefaultFingerboardItems(userData.profile.defaultFingerboardItems);
          } else if (userData.profile?.defaultFingerboardItems?.length) {
            setDefaultFingerboardItems(userData.profile.defaultFingerboardItems);
            setFingerboardRoutines([{ id: 1, name: "Standard Fingerboard", description: "Crimp and open hand training", items: userData.profile.defaultFingerboardItems }]);
          }
          if (userData.profile?.sessionTypeOrder?.length) setSessionTypeOrder(userData.profile.sessionTypeOrder);
          storage.get(`followers:${username}`).then(r => setSocialFollowers(r ? JSON.parse(r.value) : [])).catch(() => {});
          loadNotifications(username).then(n => { setNotifications(n); setNotifCount(n.filter(x => !x.read).length); }).catch(() => {});
          loadMyReactions(username).then(setMyReactions).catch(() => {});
          setPendingFollowRequests(userData.profile?.pendingFollowRequests || []);
          storage.get(`followRequests:${username}`).then(r => setMyFollowRequests(r ? JSON.parse(r.value) : [])).catch(() => {});
          setAuthScreen("app");
          tryRestoreClimbSession(username);
        } else {
          setAuthScreen("login");
        }
      } catch (e) {
        setAuthScreen("login");
      } finally {
        sessionInitialized.current = true;
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
        profile: { displayName: editDisplayName || currentUser.displayName, preferredScale, preferredRopeScale, profilePic, customBoulderGrades, customRopeGrades, customBoulderScaleName, customRopeScaleName, hiddenLocations, customLocations, mainGym, following: socialFollowing, colorTheme, mutedUsers, notifPrefs, isPrivate, pendingFollowRequests, defaultWarmupItems, autoEndWarmup, warmupTemplates, activeWarmupTemplateId, defaultWorkoutItems, defaultFingerboardItems, workoutRoutines, fingerboardRoutines, activeWorkoutRoutineId, activeFingerboardRoutineId, sessionTypeOrder, gymSetStaleWeeks, gymScales, gyms, customGradingSchemes },
        sessions,
        projects,
        gymSets,
      };
      const ok = await saveUserData(currentUser.username, userData);
      setSaveStatus(ok ? "saved" : "error");
      setTimeout(() => setSaveStatus(""), 2000);
    }, 1000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [sessions, projects, gymSets, editDisplayName, preferredScale, preferredRopeScale, profilePic, customBoulderGrades, customRopeGrades, customBoulderScaleName, customRopeScaleName, hiddenLocations, customLocations, mainGym, socialFollowing, colorTheme, mutedUsers, notifPrefs, isPrivate, pendingFollowRequests, defaultWarmupItems, autoEndWarmup, warmupTemplates, activeWarmupTemplateId, defaultWorkoutItems, defaultFingerboardItems, workoutRoutines, fingerboardRoutines, activeWorkoutRoutineId, activeFingerboardRoutineId, sessionTypeOrder, gymSetStaleWeeks, gymScales]);

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

  // ── PERSIST IN-PROGRESS CLIMB SESSION ──────────────────────
  // Saves to localStorage so a page refresh doesn't lose the session.
  // Cleared on endSession / discardSession.
  useEffect(() => {
    if (!sessionInitialized.current) return; // don't touch active:climb until checkSession has read it
    if (!sessionStarted || !activeSession) { localStorage.removeItem("active:climb"); return; }
    // Preserve stored username if currentUser is null (logged-out state) so restore still works after page reload
    const savedUsername = currentUser?.username || (() => { try { return JSON.parse(localStorage.getItem("active:climb") || "{}").username; } catch (e) { return null; } })();
    // Strip photos from climbs before persisting to avoid localStorage quota errors on mobile
    const sessionForStorage = { ...activeSession, climbs: (activeSession.climbs || []).map(c => ({ ...c, photo: null })) };
    try { localStorage.setItem("active:climb", JSON.stringify({ username: savedUsername, activeSession: sessionForStorage, sessionActiveStart, sessionPausedSec, sessionStarted, timerRunning, pendingLocation, lastActivityAt: Date.now() })); } catch (e) { console.warn("active:climb storage failed:", e); }
    // Save photos separately in sessionStorage (survives page refresh within same tab)
    try { const photoMap = {}; (activeSession.climbs || []).forEach(c => { if (c.photo) photoMap[c.id] = c.photo; }); sessionStorage.setItem("active:photos", JSON.stringify(photoMap)); } catch (e) {}
  }, [activeSession, sessionActiveStart, sessionPausedSec, sessionStarted, timerRunning, pendingLocation, currentUser]);

  // §HANDLERS
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
        profile: { displayName: displayName.trim() || username, colorTheme },
        sessions: [],
        projects: [],
      };
      await saveUserData(username.toLowerCase(), userData);
      accounts[username.toLowerCase()] = { hash: hashPassword(password), displayName: displayName.trim() || username };
      await saveAccountIndex(accounts);

      const user = { username: username.toLowerCase(), displayName: displayName.trim() || username };
      await storage.set("active:session", JSON.stringify({ username: username.toLowerCase(), userData: { profile: userData.profile } }));
      setCurrentUser(user);
      setSessions(userData.sessions);
      setProjects(userData.projects);
      setShowOnboarding(true);
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
      // Store only profile in localStorage to avoid QuotaExceededError on large accounts
      const cachedProfile = { profile: safeData.profile };
      await storage.set("active:session", JSON.stringify({ username: username.toLowerCase(), userData: cachedProfile }));

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
      setCustomLocations(safeData.profile?.customLocations || []);
      setMainGym(safeData.profile?.mainGym || "");
      setSocialFollowing(safeData.profile?.following || []);
      setGyms(safeData.profile?.gyms || []);
      setCustomGradingSchemes(safeData.profile?.customGradingSchemes || []);
      setColorTheme(safeData.profile?.colorTheme || "espresso");
      setMutedUsers(safeData.profile?.mutedUsers || []);
      setNotifPrefs(safeData.profile?.notifPrefs || { follows: true, sessions: true });
      setIsPrivate(safeData.profile?.isPrivate || false);
      storage.get(`followers:${username.toLowerCase()}`).then(r => setSocialFollowers(r ? JSON.parse(r.value) : [])).catch(() => {});
      loadNotifications(username.toLowerCase()).then(n => { setNotifications(n); setNotifCount(n.filter(x => !x.read).length); }).catch(() => {});
      loadMyReactions(username.toLowerCase()).then(setMyReactions).catch(() => {});
      setPendingFollowRequests(safeData.profile?.pendingFollowRequests || []);
      storage.get(`followRequests:${username.toLowerCase()}`).then(r => setMyFollowRequests(r ? JSON.parse(r.value) : [])).catch(() => {});
      // Load fields that checkSession sets but handleLogin previously missed
      setDefaultWarmupItems(safeData.profile?.defaultWarmupItems || DEFAULT_WARMUP_ITEMS);
      if (safeData.profile?.warmupTemplates?.length) {
        setWarmupTemplates(safeData.profile.warmupTemplates);
        setActiveWarmupTemplateId(safeData.profile.activeWarmupTemplateId || safeData.profile.warmupTemplates[0].id);
      }
      setAutoEndWarmup(safeData.profile?.autoEndWarmup !== false);
      if (safeData.profile?.workoutRoutines?.length) {
        setWorkoutRoutines(safeData.profile.workoutRoutines);
        if (safeData.profile?.activeWorkoutRoutineId) setActiveWorkoutRoutineId(safeData.profile.activeWorkoutRoutineId);
        const activeWR = safeData.profile.workoutRoutines.find(r => r.id === (safeData.profile.activeWorkoutRoutineId || 1));
        if (activeWR) setDefaultWorkoutItems(activeWR.items);
        else if (safeData.profile?.defaultWorkoutItems?.length) setDefaultWorkoutItems(safeData.profile.defaultWorkoutItems);
      } else if (safeData.profile?.defaultWorkoutItems?.length) {
        setDefaultWorkoutItems(safeData.profile.defaultWorkoutItems);
        setWorkoutRoutines([{ id: 1, name: "Standard Workout", description: "Upper body + core strength", items: safeData.profile.defaultWorkoutItems }]);
      }
      if (safeData.profile?.fingerboardRoutines?.length) {
        setFingerboardRoutines(safeData.profile.fingerboardRoutines);
        if (safeData.profile?.activeFingerboardRoutineId) setActiveFingerboardRoutineId(safeData.profile.activeFingerboardRoutineId);
        const activeFR = safeData.profile.fingerboardRoutines.find(r => r.id === (safeData.profile.activeFingerboardRoutineId || 1));
        if (activeFR) setDefaultFingerboardItems(activeFR.items);
        else if (safeData.profile?.defaultFingerboardItems?.length) setDefaultFingerboardItems(safeData.profile.defaultFingerboardItems);
      } else if (safeData.profile?.defaultFingerboardItems?.length) {
        setDefaultFingerboardItems(safeData.profile.defaultFingerboardItems);
        setFingerboardRoutines([{ id: 1, name: "Standard Fingerboard", description: "Crimp and open hand training", items: safeData.profile.defaultFingerboardItems }]);
      }
      if (safeData.profile?.sessionTypeOrder?.length) setSessionTypeOrder(safeData.profile.sessionTypeOrder);
      setGymSets(safeData.gymSets || {});
      setAuthScreen("app");
      // If session is still live in memory (user logged out and back in without closing browser)
      // just navigate to it directly rather than re-reading localStorage
      if (sessionStarted && activeSession) {
        setScreen("session");
      } else {
        tryRestoreClimbSession(username.toLowerCase());
      }
    } catch (e) {
      setAuthError("Something went wrong. Please try again.");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    // Explicitly snapshot active session before clearing auth — survives page close after logout
    if (sessionStarted && activeSession) {
      localStorage.setItem("active:climb", JSON.stringify({
        username: currentUser?.username,
        activeSession, sessionActiveStart, sessionPausedSec,
        sessionStarted: true, timerRunning, pendingLocation,
        lastActivityAt: Date.now(),
      }));
    }
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

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    try {
      const accounts = await loadAccountIndex();
      delete accounts[currentUser.username];
      await saveAccountIndex(accounts);
      await storage.delete(`user:${currentUser.username}`);
    } catch (e) {}
    await handleLogout();
  };

  const handleExportData = () => {
    const data = { exportedAt: new Date().toISOString(), username: currentUser?.username, sessions, projects, gymSets };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sendlog-${currentUser?.username}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
  const knownLocations = (() => {
    const seen = new Set();
    // Build ordered list: mainGym first, then sessions by recency, then custom, then pending/active
    const ordered = [mainGym, ...sessions.map(s => s.location), ...customLocations, pendingLocation, activeSession?.location]
      .filter(Boolean)
      .filter(l => { const k = l.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
      .filter(l => !hiddenLocations.includes(l));
    return ordered;
  })();
  const addCustomLocation = (loc) => { const trimmed = loc?.trim(); if (trimmed && !sessions.some(s => s.location?.toLowerCase() === trimmed.toLowerCase()) && !customLocations.some(c => c.toLowerCase() === trimmed.toLowerCase())) setCustomLocations(prev => [...prev, trimmed]); };
  const getGymByName = (name) => gyms.find(g => g.name === name);
  const getAllBoulderScaleNames = () => [...Object.keys(GRADES), ...customGradingSchemes.filter(s => s.applicableTo?.includes("boulder")).map(s => s.name)];
  const getAllRopeScaleNames = () => [...Object.keys(ROPE_GRADES), ...customGradingSchemes.filter(s => s.applicableTo?.includes("rope")).map(s => s.name)];
  const allGyms = ["All Gyms", ...new Set(sessions.map(s => s.location).filter(Boolean))];

  const goToSessionSetup = () => {
    const lastSession = sessions.length > 0 ? sessions[0] : null;
    const defaultLocation = mainGym || lastSession?.location || "";
    const defaultTypes = lastSession?.sessionTypes?.length ? lastSession.sessionTypes : ["boulder"];
    setPendingLocation(defaultLocation);
    setSessionTypes(defaultTypes);
    setSessionStarted(false);
    setActiveSession({ location: defaultLocation, climbs: [], collapsedSections: { boulder: false, rope: false } });
    setSessionTimer(0); setSessionActiveStart(null); setSessionPausedSec(0); setShowMoreClimbTypes(false); setScreen("session");
  };
  const beginTimer = () => {
    setActiveSession(s => ({ ...s, location: pendingLocation, sessionTypes }));
    setSessionStarted(true); setSessionActiveStart(Date.now()); setTimerRunning(true); setShowMoreClimbTypes(false);
    if (gymScales[pendingLocation]?.boulder) setPreferredScale(gymScales[pendingLocation].boulder);
    if (gymScales[pendingLocation]?.rope) setPreferredRopeScale(gymScales[pendingLocation].rope);
  };
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
    setActiveSession(s => {
      const updates = {};
      if (s.boulderActiveStart) {
        updates.boulderTotalSec = (s.boulderTotalSec || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000));
        updates.boulderActiveStart = null;
        updates.boulderPausedAt = now;
      }
      if (s.ropeActiveStart) {
        updates.ropeTotalSec = (s.ropeTotalSec || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart) / 1000));
        updates.ropeActiveStart = null;
        updates.ropePausedAt = now;
      }
      const newSpeed = { id: now, climbType: "speed-session", name: "Speed Session", attempts: [], startedAt: now, loggedAt: now, tries: 0, completed: false, grade: "⚡", scale: "Speed", wallTypes: [], holdTypes: [], speedTotalSec: 0, speedActiveStart: now };
      return {
        ...s, ...updates,
        climbs: [
          ...(s.climbs || []).map(c => {
            if (c.climbingStartedAt) return { ...c, climbingStartedAt: null, pausedWorkedMs: 0, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration: now - c.climbingStartedAt + (c.pausedWorkedMs || 0) }] };
            if (c.climbType === "speed-session" && c.speedActiveStart && !c.endedAt) return { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null };
            return c;
          }),
          newSpeed,
        ],
      };
    });
  };
  const addSpeedAttempt = (climbId, attempt) => {
    setActiveSession(s => ({ ...s, climbs: (s.climbs || []).map(c => c.id === climbId ? { ...c, attempts: [...(c.attempts || []), attempt] } : c) }));
  };
  const removeSpeedSession = (climbId) => {
    setActiveSession(s => ({ ...s, climbs: (s.climbs || []).filter(c => c.id !== climbId) }));
  };
  const endSpeedSession = (climbId) => {
    setActiveSession(s => ({ ...s, climbs: (s.climbs || []).map(c => c.id === climbId ? { ...c, endedAt: Date.now() } : c) }));
  };
  const startClimbing = (climbId) => setActiveSession(s => {
    const climb = (s.climbs || []).find(c => c.id === climbId);
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
    // Stop any other active climb timer; pause active speed sessions
    return {
      ...s, ...updates,
      climbs: (s.climbs || []).map(c => {
        if (c.id === climbId) return { ...c, climbingStartedAt: now, paused: false, pausedWorkedMs: 0 };
        if (c.climbingStartedAt && !c.completed) {
          const dur = now - c.climbingStartedAt + (c.pausedWorkedMs || 0);
          return { ...c, climbingStartedAt: null, pausedWorkedMs: 0, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration: dur, falls: c.tries }] };
        }
        if (c.climbType === "speed-session" && c.speedActiveStart && !c.endedAt) return { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null };
        return c;
      }),
    };
  });
  const pauseBoulderSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.boulderActiveStart ? Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)) : 0;
    return {
      ...s,
      boulderTotalSec: (s.boulderTotalSec || 0) + elapsed,
      boulderActiveStart: null,
      boulderPausedAt: now,
      climbs: (s.climbs || []).map(c =>
        c.climbType !== "rope" && c.climbingStartedAt
          ? { ...c, climbingStartedAt: null, pausedWorkedMs: 0, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration: now - c.climbingStartedAt + (c.pausedWorkedMs || 0), falls: c.tries }] }
          : c
      ),
    };
  });
  const resumeBoulderSession = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.ropeActiveStart)        { updates.ropeTotalSec        = (s.ropeTotalSec        || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)        / 1000)); updates.ropeActiveStart        = null; updates.ropePausedAt        = now; }
    if (s.warmupActiveStart)      { updates.warmupTotalSec      = (s.warmupTotalSec      || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)      / 1000)); updates.warmupActiveStart      = null; updates.warmupPausedAt      = now; }
    if (s.workoutActiveStart)     { updates.workoutTotalSec     = (s.workoutTotalSec     || 0) + Math.max(0, Math.floor((now - s.workoutActiveStart)     / 1000)); updates.workoutActiveStart     = null; updates.workoutPausedAt     = now; }
    if (s.fingerboardActiveStart) { updates.fingerboardTotalSec = (s.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)); updates.fingerboardActiveStart = null; updates.fingerboardPausedAt = now; }
    return { ...s, ...updates, boulderActiveStart: now, boulderPausedAt: null, climbs: (s.climbs || []).map(c => c.climbType === "speed-session" && c.speedActiveStart && !c.endedAt ? { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null } : c) };
  });
  const pauseRopeSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.ropeActiveStart ? Math.max(0, Math.floor((now - s.ropeActiveStart) / 1000)) : 0;
    return {
      ...s,
      ropeTotalSec: (s.ropeTotalSec || 0) + elapsed,
      ropeActiveStart: null,
      ropePausedAt: now,
      climbs: (s.climbs || []).map(c =>
        c.climbType === "rope" && c.climbingStartedAt
          ? { ...c, climbingStartedAt: null, lastAttemptEndedAt: null, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration: now - c.climbingStartedAt }] }
          : c
      ),
    };
  });
  const resumeRopeSession = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart)     { updates.boulderTotalSec     = (s.boulderTotalSec     || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart)     / 1000)); updates.boulderActiveStart     = null; updates.boulderPausedAt     = now; }
    if (s.warmupActiveStart)      { updates.warmupTotalSec      = (s.warmupTotalSec      || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)      / 1000)); updates.warmupActiveStart      = null; updates.warmupPausedAt      = now; }
    if (s.workoutActiveStart)     { updates.workoutTotalSec     = (s.workoutTotalSec     || 0) + Math.max(0, Math.floor((now - s.workoutActiveStart)     / 1000)); updates.workoutActiveStart     = null; updates.workoutPausedAt     = now; }
    if (s.fingerboardActiveStart) { updates.fingerboardTotalSec = (s.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)); updates.fingerboardActiveStart = null; updates.fingerboardPausedAt = now; }
    return { ...s, ...updates, ropeActiveStart: now, ropePausedAt: null, climbs: (s.climbs || []).map(c => c.climbType === "speed-session" && c.speedActiveStart && !c.endedAt ? { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null } : c) };
  });
  const pauseSpeedSession = (climbId) => setActiveSession(s => {
    const now = Date.now();
    return { ...s, climbs: (s.climbs || []).map(c => c.id === climbId && c.speedActiveStart && !c.endedAt ? { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null } : c) };
  });
  const resumeSpeedSession = (climbId) => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart) { updates.boulderTotalSec = (s.boulderTotalSec || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)); updates.boulderActiveStart = null; updates.boulderPausedAt = now; }
    if (s.ropeActiveStart) { updates.ropeTotalSec = (s.ropeTotalSec || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart) / 1000)); updates.ropeActiveStart = null; updates.ropePausedAt = now; }
    return { ...s, ...updates, climbs: (s.climbs || []).map(c => {
      if (c.id === climbId && !c.endedAt) return { ...c, speedActiveStart: now };
      if (c.climbType === "speed-session" && c.speedActiveStart && !c.endedAt) return { ...c, speedTotalSec: (c.speedTotalSec || 0) + Math.max(0, Math.floor((now - c.speedActiveStart) / 1000)), speedActiveStart: null };
      return c;
    }) };
  });
  // ── Warm-up section ─────────────────────────────────────────
  const startWarmupSection = () => {
    if (warmupTemplates.length > 1) {
      // Multiple routines — show picker first; timer starts only after selection
      setTrainingPickerType("warmup");
      return;
    }
    setActiveSession(s => {
      const now = Date.now();
      const updates = {};
      if (s.boulderActiveStart) { updates.boulderTotalSec = (s.boulderTotalSec || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)); updates.boulderActiveStart = null; updates.boulderPausedAt = now; }
      if (s.ropeActiveStart)    { updates.ropeTotalSec    = (s.ropeTotalSec    || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)    / 1000)); updates.ropeActiveStart    = null; updates.ropePausedAt    = now; }
      const activeTpl = warmupTemplates.find(t => t.id === activeWarmupTemplateId) || warmupTemplates[0];
      const tplItems = activeTpl?.items || defaultWarmupItems;
      const notesNote = activeTpl?.name ? `Warmup: ${activeTpl.name}` : null;
      const notesUpdate = !s.notes && notesNote ? { notes: notesNote } : {};
      return { ...s, ...updates, ...notesUpdate, warmupStartedAt: now, warmupActiveStart: now, warmupTotalSec: 0, warmupPausedAt: null, warmupEndedAt: null, warmupTemplateName: activeTpl?.name || null, warmupTemplateId: activeTpl?.id || null, warmupChecklist: tplItems.map(item => ({ ...item, id: Date.now() + Math.random(), checked: false })) };
    });
  };
  const pauseWarmupSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.warmupActiveStart ? Math.max(0, Math.floor((now - s.warmupActiveStart) / 1000)) : 0;
    return { ...s, warmupTotalSec: (s.warmupTotalSec || 0) + elapsed, warmupActiveStart: null, warmupPausedAt: now };
  });
  const resumeWarmupSession = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart)     { updates.boulderTotalSec     = (s.boulderTotalSec     || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart)     / 1000)); updates.boulderActiveStart     = null; updates.boulderPausedAt     = now; }
    if (s.ropeActiveStart)        { updates.ropeTotalSec        = (s.ropeTotalSec        || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)        / 1000)); updates.ropeActiveStart        = null; updates.ropePausedAt        = now; }
    if (s.workoutActiveStart)     { updates.workoutTotalSec     = (s.workoutTotalSec     || 0) + Math.max(0, Math.floor((now - s.workoutActiveStart)     / 1000)); updates.workoutActiveStart     = null; updates.workoutPausedAt     = now; }
    if (s.fingerboardActiveStart) { updates.fingerboardTotalSec = (s.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)); updates.fingerboardActiveStart = null; updates.fingerboardPausedAt = now; }
    return { ...s, ...updates, warmupActiveStart: now, warmupPausedAt: null };
  });
  const endWarmupSection = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.warmupActiveStart ? Math.max(0, Math.floor((now - s.warmupActiveStart) / 1000)) : 0;
    return { ...s, warmupTotalSec: (s.warmupTotalSec || 0) + elapsed, warmupActiveStart: null, warmupEndedAt: now };
  });
  const toggleWarmupItem = (itemId) => {
    const currentItem = (activeSession?.warmupChecklist || []).find(i => i.id === itemId);
    const beingChecked = currentItem && !currentItem.checked;
    if (beingChecked && (currentItem.restDuration || 0) > 0) {
      setRoutineRestTimer({ itemId, endsAt: Date.now() + currentItem.restDuration * 1000 });
    } else { setRoutineRestTimer(null); }
    setActiveSession(s => {
      const isUnchecking = currentItem?.checked;
      const newList = (s.warmupChecklist || []).map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
      if (isUnchecking && s.warmupEndedAt) {
        const now = Date.now();
        return { ...s, warmupChecklist: newList, warmupActiveStart: now, warmupEndedAt: null, warmupPausedAt: null };
      }
      if (autoEndWarmup && newList.length > 0 && newList.every(i => i.checked) && !s.warmupEndedAt) {
        const now = Date.now();
        const elapsed = s.warmupActiveStart ? Math.max(0, Math.floor((now - s.warmupActiveStart) / 1000)) : 0;
        return { ...s, warmupChecklist: newList, warmupTotalSec: (s.warmupTotalSec || 0) + elapsed, warmupActiveStart: null, warmupEndedAt: now, collapsedSections: { ...(s.collapsedSections || {}), warmup: true } };
      }
      return { ...s, warmupChecklist: newList };
    });
  };
  const addWarmupItem         = (text)   => setActiveSession(s => ({ ...s, warmupChecklist: [...(s.warmupChecklist || []), { id: Date.now(), text, checked: false }] }));
  const removeWarmupItem      = (itemId) => setActiveSession(s => ({ ...s, warmupChecklist: (s.warmupChecklist || []).filter(item => item.id !== itemId) }));
  const completeAllWarmupItems = () => setActiveSession(s => {
    const newList = (s.warmupChecklist || []).map(i => ({ ...i, checked: true }));
    if (autoEndWarmup && !s.warmupEndedAt) {
      const now = Date.now();
      const elapsed = s.warmupActiveStart ? Math.max(0, Math.floor((now - s.warmupActiveStart) / 1000)) : 0;
      return { ...s, warmupChecklist: newList, warmupTotalSec: (s.warmupTotalSec || 0) + elapsed, warmupActiveStart: null, warmupEndedAt: now, collapsedSections: { ...(s.collapsedSections || {}), warmup: true } };
    }
    return { ...s, warmupChecklist: newList };
  });

  // ── Workout section ──────────────────────────────────────
  const startWorkoutSection = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart)     { updates.boulderTotalSec     = (s.boulderTotalSec     || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart)     / 1000)); updates.boulderActiveStart     = null; updates.boulderPausedAt     = now; }
    if (s.ropeActiveStart)        { updates.ropeTotalSec        = (s.ropeTotalSec        || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)        / 1000)); updates.ropeActiveStart        = null; updates.ropePausedAt        = now; }
    if (s.warmupActiveStart)      { updates.warmupTotalSec      = (s.warmupTotalSec      || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)      / 1000)); updates.warmupActiveStart      = null; updates.warmupPausedAt      = now; }
    if (s.fingerboardActiveStart) { updates.fingerboardTotalSec = (s.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)); updates.fingerboardActiveStart = null; updates.fingerboardPausedAt = now; }
    const activeWR = workoutRoutines.find(r => r.id === activeWorkoutRoutineId) || workoutRoutines[0];
    const wrItems = activeWR?.items || defaultWorkoutItems;
    const wrNote = activeWR?.name ? `Workout: ${activeWR.name}` : null;
    const wrNotesUpdate = !s.notes && wrNote ? { notes: wrNote } : {};
    return { ...s, ...updates, ...wrNotesUpdate, workoutStartedAt: now, workoutActiveStart: now, workoutTotalSec: 0, workoutPausedAt: null, workoutEndedAt: null, workoutRoutineName: activeWR?.name || null, workoutRoutineId: activeWR?.id || null, workoutChecklist: wrItems.map(item => ({ ...item, id: Date.now() + Math.random(), checked: false })) };
  });
  const pauseWorkoutSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.workoutActiveStart ? Math.max(0, Math.floor((now - s.workoutActiveStart) / 1000)) : 0;
    return { ...s, workoutTotalSec: (s.workoutTotalSec || 0) + elapsed, workoutActiveStart: null, workoutPausedAt: now };
  });
  const resumeWorkoutSession = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart)     { updates.boulderTotalSec     = (s.boulderTotalSec     || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart)     / 1000)); updates.boulderActiveStart     = null; updates.boulderPausedAt     = now; }
    if (s.ropeActiveStart)        { updates.ropeTotalSec        = (s.ropeTotalSec        || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)        / 1000)); updates.ropeActiveStart        = null; updates.ropePausedAt        = now; }
    if (s.warmupActiveStart)      { updates.warmupTotalSec      = (s.warmupTotalSec      || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)      / 1000)); updates.warmupActiveStart      = null; updates.warmupPausedAt      = now; }
    if (s.fingerboardActiveStart) { updates.fingerboardTotalSec = (s.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)); updates.fingerboardActiveStart = null; updates.fingerboardPausedAt = now; }
    return { ...s, ...updates, workoutActiveStart: now, workoutPausedAt: null };
  });
  const endWorkoutSection = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.workoutActiveStart ? Math.max(0, Math.floor((now - s.workoutActiveStart) / 1000)) : 0;
    return { ...s, workoutTotalSec: (s.workoutTotalSec || 0) + elapsed, workoutActiveStart: null, workoutEndedAt: now };
  });
  const toggleWorkoutItem = (itemId) => {
    const currentItem = (activeSession?.workoutChecklist || []).find(i => i.id === itemId);
    const beingChecked = currentItem && !currentItem.checked;
    if (beingChecked && (currentItem.restDuration || 0) > 0) {
      setRoutineRestTimer({ itemId, endsAt: Date.now() + currentItem.restDuration * 1000 });
    } else { setRoutineRestTimer(null); }
    setActiveSession(s => {
      const newList = (s.workoutChecklist || []).map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
      return { ...s, workoutChecklist: newList };
    });
  };
  const addWorkoutItem    = (text)   => setActiveSession(s => ({ ...s, workoutChecklist: [...(s.workoutChecklist || []), { id: Date.now(), text, checked: false }] }));
  const removeWorkoutItem = (itemId) => setActiveSession(s => ({ ...s, workoutChecklist: (s.workoutChecklist || []).filter(item => item.id !== itemId) }));
  const completeAllWorkoutItems = () => setActiveSession(s => ({ ...s, workoutChecklist: (s.workoutChecklist || []).map(i => ({ ...i, checked: true })) }));

  // ── Fingerboard section ──────────────────────────────────
  const startFingerboardSection = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart) { updates.boulderTotalSec = (s.boulderTotalSec || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)); updates.boulderActiveStart = null; updates.boulderPausedAt = now; }
    if (s.ropeActiveStart)    { updates.ropeTotalSec    = (s.ropeTotalSec    || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)    / 1000)); updates.ropeActiveStart    = null; updates.ropePausedAt    = now; }
    if (s.warmupActiveStart)  { updates.warmupTotalSec  = (s.warmupTotalSec  || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)  / 1000)); updates.warmupActiveStart  = null; updates.warmupPausedAt  = now; }
    if (s.workoutActiveStart) { updates.workoutTotalSec = (s.workoutTotalSec || 0) + Math.max(0, Math.floor((now - s.workoutActiveStart) / 1000)); updates.workoutActiveStart = null; updates.workoutPausedAt = now; }
    const activeFR = fingerboardRoutines.find(r => r.id === activeFingerboardRoutineId) || fingerboardRoutines[0];
    const frItems = activeFR?.items || defaultFingerboardItems;
    const frNote = activeFR?.name ? `Fingerboard: ${activeFR.name}` : null;
    const frNotesUpdate = !s.notes && frNote ? { notes: frNote } : {};
    return { ...s, ...updates, ...frNotesUpdate, fingerboardStartedAt: now, fingerboardActiveStart: now, fingerboardTotalSec: 0, fingerboardPausedAt: null, fingerboardEndedAt: null, fingerboardRoutineName: activeFR?.name || null, fingerboardRoutineId: activeFR?.id || null, fingerboardChecklist: frItems.map(item => ({ ...item, id: Date.now() + Math.random(), checked: false })) };
  });
  const pauseFingerboardSession = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.fingerboardActiveStart ? Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)) : 0;
    return { ...s, fingerboardTotalSec: (s.fingerboardTotalSec || 0) + elapsed, fingerboardActiveStart: null, fingerboardPausedAt: now };
  });
  const resumeFingerboardSession = () => setActiveSession(s => {
    const now = Date.now();
    const updates = {};
    if (s.boulderActiveStart) { updates.boulderTotalSec = (s.boulderTotalSec || 0) + Math.max(0, Math.floor((now - s.boulderActiveStart) / 1000)); updates.boulderActiveStart = null; updates.boulderPausedAt = now; }
    if (s.ropeActiveStart)    { updates.ropeTotalSec    = (s.ropeTotalSec    || 0) + Math.max(0, Math.floor((now - s.ropeActiveStart)    / 1000)); updates.ropeActiveStart    = null; updates.ropePausedAt    = now; }
    if (s.warmupActiveStart)  { updates.warmupTotalSec  = (s.warmupTotalSec  || 0) + Math.max(0, Math.floor((now - s.warmupActiveStart)  / 1000)); updates.warmupActiveStart  = null; updates.warmupPausedAt  = now; }
    if (s.workoutActiveStart) { updates.workoutTotalSec = (s.workoutTotalSec || 0) + Math.max(0, Math.floor((now - s.workoutActiveStart) / 1000)); updates.workoutActiveStart = null; updates.workoutPausedAt = now; }
    return { ...s, ...updates, fingerboardActiveStart: now, fingerboardPausedAt: null };
  });
  const endFingerboardSection = () => setActiveSession(s => {
    const now = Date.now();
    const elapsed = s.fingerboardActiveStart ? Math.max(0, Math.floor((now - s.fingerboardActiveStart) / 1000)) : 0;
    return { ...s, fingerboardTotalSec: (s.fingerboardTotalSec || 0) + elapsed, fingerboardActiveStart: null, fingerboardEndedAt: now };
  });
  const toggleFingerboardItem = (itemId) => {
    const currentItem = (activeSession?.fingerboardChecklist || []).find(i => i.id === itemId);
    const beingChecked = currentItem && !currentItem.checked;
    if (beingChecked && (currentItem.restDuration || 0) > 0) {
      setRoutineRestTimer({ itemId, endsAt: Date.now() + currentItem.restDuration * 1000 });
    } else { setRoutineRestTimer(null); }
    setActiveSession(s => {
      const newList = (s.fingerboardChecklist || []).map(item => item.id === itemId ? { ...item, checked: !item.checked } : item);
      return { ...s, fingerboardChecklist: newList };
    });
  };
  const addFingerboardItem    = (text)   => setActiveSession(s => ({ ...s, fingerboardChecklist: [...(s.fingerboardChecklist || []), { id: Date.now(), text, checked: false }] }));
  const removeFingerboardItem = (itemId) => setActiveSession(s => ({ ...s, fingerboardChecklist: (s.fingerboardChecklist || []).filter(item => item.id !== itemId) }));
  const completeAllFingerboardItems = () => setActiveSession(s => ({ ...s, fingerboardChecklist: (s.fingerboardChecklist || []).map(i => ({ ...i, checked: true })) }));

  // ── Fitness section ──────────────────────────────────────
  const startFitnessSession = () => {
    setFitnessPickerStep("choose");
  };

  const addFitnessRoutine = (routineType, routine) => {
    const newSection = {
      id: Date.now(),
      kind: "routine",
      name: routine.name,
      routineType,
      routineId: routine.id,
      items: (routine.items || []).map(i => ({ ...i, id: Date.now() + Math.random(), checked: false })),
      startedAt: Date.now(),
      endedAt: null,
    };
    setActiveSession(s => ({ ...s, fitnessSections: [...(s.fitnessSections || []), newSection] }));
    setFitnessPickerStep(null);
    setFitnessPickerRoutineType(null);
  };

  const addFitnessExercise = () => {
    if (!fitnessNewExerciseName.trim()) return;
    const newSection = {
      id: Date.now(),
      kind: "exercise",
      name: fitnessNewExerciseName.trim(),
      items: [],
      startedAt: Date.now(),
      endedAt: null,
    };
    setActiveSession(s => ({ ...s, fitnessSections: [...(s.fitnessSections || []), newSection] }));
    setFitnessPickerStep(null);
    setFitnessNewExerciseName("");
  };

  const toggleFitnessItem = (sectionId, itemId) => {
    setActiveSession(s => ({
      ...s,
      fitnessSections: (s.fitnessSections || []).map(sec =>
        sec.id === sectionId
          ? { ...sec, items: sec.items.map(i => i.id === itemId ? { ...i, checked: !i.checked } : i) }
          : sec
      ),
    }));
  };

  const endFitnessBlock = (sectionId) => {
    setActiveSession(s => ({
      ...s,
      fitnessSections: (s.fitnessSections || []).map(sec =>
        sec.id === sectionId ? { ...sec, endedAt: Date.now() } : sec
      ),
    }));
  };

  const removeFitnessBlock = (sectionId) => {
    setActiveSession(s => ({
      ...s,
      fitnessSections: (s.fitnessSections || []).filter(sec => sec.id !== sectionId),
    }));
  };

  const addFitnessItem = (sectionId, text) => {
    if (!text.trim()) return;
    setActiveSession(s => ({
      ...s,
      fitnessSections: (s.fitnessSections || []).map(sec =>
        sec.id === sectionId
          ? { ...sec, items: [...(sec.items || []), { id: Date.now(), text: text.trim(), checked: false }] }
          : sec
      ),
    }));
    setFitnessNewItemTexts(prev => ({ ...prev, [sectionId]: "" }));
  };

  const reorderFitnessSections = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setActiveSession(s => {
      const arr = [...(s.fitnessSections || [])];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return { ...s, fitnessSections: arr };
    });
  };

  const updateFitnessBlockNote = (sectionId, note) => setActiveSession(s => ({
    ...s,
    fitnessSections: (s.fitnessSections || []).map(sec => sec.id === sectionId ? { ...sec, note } : sec),
  }));

  const updateFitnessBlockResult = (sectionId, result) => setActiveSession(s => ({
    ...s,
    fitnessSections: (s.fitnessSections || []).map(sec => sec.id === sectionId ? { ...sec, result } : sec),
  }));

  // Stops the per-climb timer without logging tries (used for rope "Done" button)
  // Type section timer keeps running — it only pauses when switching types or ending the section
  const endClimbAttempt = (id) => setActiveSession(s => {
    const climb = (s.climbs || []).find(c => c.id === id);
    if (!climb || !climb.climbingStartedAt) return s;
    const now = Date.now();
    const duration = now - climb.climbingStartedAt + (climb.pausedWorkedMs || 0);
    return {
      ...s,
      climbs: (s.climbs || []).map(c => c.id === id ? { ...c, climbingStartedAt: null, pausedWorkedMs: 0, lastAttemptEndedAt: now, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration }] } : c),
    };
  });
  // Commits a rope attempt: +1 try, adds falls and takes, sets topped
  const logRopeAttempt = (id, falls, takes, topped) => setActiveSession(s => ({
    ...s,
    climbs: (s.climbs || []).map(c => c.id === id ? { ...c, tries: (c.tries || 0) + 1, falls: (c.falls || 0) + falls, takes: (c.takes || 0) + takes, completed: topped } : c),
  }));
  // Pauses attempt tracking on a boulder climb (hides rest timer)
  const pauseClimb = (id) => setActiveSession(s => {
    const now = Date.now();
    return {
      ...s,
      climbs: (s.climbs || []).map(c => {
        if (c.id !== id) return c;
        if (c.climbingStartedAt) {
          // Pause during active attempt — bank elapsed time into pausedWorkedMs
          return { ...c, paused: true, climbingStartedAt: null, pausedWorkedMs: (c.pausedWorkedMs || 0) + (now - c.climbingStartedAt), pauseCount: (c.pauseCount || 0) + 1 };
        }
        return { ...c, paused: true, pauseCount: (c.pauseCount || 0) + 1 };
      }),
    };
  });
  // Resumes attempt tracking on a paused boulder climb — pauses any other currently active climb
  const resumeClimb = (id) => setActiveSession(s => {
    const now = Date.now();
    return {
      ...s,
      climbs: (s.climbs || []).map(c => {
        if (c.id === id) return { ...c, paused: false, climbingStartedAt: now };
        if (c.climbingStartedAt) return { ...c, paused: true, climbingStartedAt: null, pausedWorkedMs: (c.pausedWorkedMs || 0) + (now - c.climbingStartedAt), pauseCount: (c.pauseCount || 0) + 1 };
        return c;
      }),
    };
  });
  // Stops the boulder climb timer without marking as sent (gave up / moving on)
  const stopBoulderClimb = (id) => setActiveSession(s => {
    const climb = (s.climbs || []).find(c => c.id === id);
    if (!climb || !climb.climbingStartedAt) return s;
    const now = Date.now();
    const duration = now - climb.climbingStartedAt + (climb.pausedWorkedMs || 0);
    return {
      ...s,
      climbs: (s.climbs || []).map(c => c.id === id
        ? { ...c, climbingStartedAt: null, pausedWorkedMs: 0, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration, falls: c.tries }] }
        : c),
    };
  });
  const endSession = (climbsOverride) => {
    if (!activeSession) return;
    const now = Date.now();
    let final = climbsOverride !== undefined ? { ...activeSession, climbs: climbsOverride } : { ...activeSession };
    // Flush any active type timers
    if (final.boulderActiveStart) {
      final.boulderTotalSec = (final.boulderTotalSec || 0) + Math.max(0, Math.floor((now - final.boulderActiveStart) / 1000));
      final.boulderActiveStart = null;
    }
    if (final.ropeActiveStart) {
      final.ropeTotalSec = (final.ropeTotalSec || 0) + Math.max(0, Math.floor((now - final.ropeActiveStart) / 1000));
      final.ropeActiveStart = null;
    }
    if (final.warmupActiveStart) {
      final.warmupTotalSec = (final.warmupTotalSec || 0) + Math.max(0, Math.floor((now - final.warmupActiveStart) / 1000));
      final.warmupActiveStart = null;
    }
    if (final.workoutActiveStart) {
      final.workoutTotalSec = (final.workoutTotalSec || 0) + Math.max(0, Math.floor((now - final.workoutActiveStart) / 1000));
      final.workoutActiveStart = null;
    }
    if (final.fingerboardActiveStart) {
      final.fingerboardTotalSec = (final.fingerboardTotalSec || 0) + Math.max(0, Math.floor((now - final.fingerboardActiveStart) / 1000));
      final.fingerboardActiveStart = null;
    }
    const finalDuration = sessionActiveStart ? Math.floor((now - sessionActiveStart) / 1000) + sessionPausedSec : sessionPausedSec;
    const rawLoc = (final.location || pendingLocation || "Unknown Gym").trim();
    const location = rawLoc.replace(/\b([a-z])/g, c => c.toUpperCase());
    const completed = { id: now, date: new Date().toISOString(), duration: finalDuration, location, climbs: final.climbs, boulderTotalSec: final.boulderTotalSec || 0, ropeTotalSec: final.ropeTotalSec || 0, warmupTotalSec: final.warmupTotalSec || 0, warmupChecklist: final.warmupChecklist || [], warmupTemplateName: final.warmupTemplateName || null, warmupTemplateId: final.warmupTemplateId || null, workoutTotalSec: final.workoutTotalSec || 0, workoutChecklist: final.workoutChecklist || [], workoutRoutineName: final.workoutRoutineName || null, workoutRoutineId: final.workoutRoutineId || null, fingerboardTotalSec: final.fingerboardTotalSec || 0, fingerboardChecklist: final.fingerboardChecklist || [], fingerboardRoutineName: final.fingerboardRoutineName || null, fingerboardRoutineId: final.fingerboardRoutineId || null, fitnessSections: final.fitnessSections || [], boulderStartedAt: final.boulderStartedAt, ropeStartedAt: final.ropeStartedAt, sessionTypes: final.sessionTypes || [], notes: final.notes || null };
    setSessions(prev => [completed, ...prev]);
    const sentProjectIds = (final.climbs || []).filter(c => c.isProject && c.completed && c.projectId).map(c => c.projectId);
    if (sentProjectIds.length > 0) {
      setProjects(prev => prev.map(p => sentProjectIds.includes(p.id) ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));
    }
    setSessionSummary(completed);
    setTimerRunning(false); setSessionActiveStart(null); setSessionPausedSec(0); setActiveSession(null); setSessionTimer(0); setSessionStarted(false); setPendingLocation(""); setShowEndConfirm(false); setScreen("sessionSummary");
    localStorage.removeItem("active:climb"); sessionStorage.removeItem("active:photos");
  };
  const deleteSession = (id) => {
    setSessions(prev => {
      const target = prev.find(s => s.id === id);
      const remaining = prev.filter(s => s.id !== id);
      if (target) {
        // Find setClimbIds only in this session (not referenced by any other session)
        const setIdsInSession = new Set((target.climbs || []).map(c => c.setClimbId).filter(Boolean));
        const setIdsElsewhere = new Set(remaining.flatMap(s => (s.climbs || []).map(c => c.setClimbId).filter(Boolean)));
        const orphanIds = [...setIdsInSession].filter(sid => !setIdsElsewhere.has(sid));
        if (orphanIds.length) {
          setGymSets(gs => {
            const updated = { ...gs };
            for (const loc of Object.keys(updated)) updated[loc] = updated[loc].filter(e => !orphanIds.includes(e.id));
            return updated;
          });
        }
      }
      return remaining;
    });
    setScreen("profile"); setProfileTab("climbing"); setClimbingSubTab("climbs");
  };
  const saveGymSetEdit = (entryId) => {
    setGymSets(prev => {
      const updated = { ...prev };
      for (const loc of Object.keys(updated)) {
        updated[loc] = updated[loc].map(e => e.id === entryId
          ? { ...e, ...climbForm, photo: photoPreview !== undefined ? photoPreview : e.photo }
          : e);
      }
      return updated;
    });
    setSelectedSetClimb(prev => prev && prev.id === entryId ? { ...prev, ...climbForm } : prev);
    setEditSetClimbOpen(false); setShowClimbForm(false); setEditingClimbId(null); setEditingSessionId(null);
  };

  const updateSessionNotes = (id, notes) => setSessions(prev => prev.map(s => s.id === id ? { ...s, notes } : s));
  const discardSession = () => {
    if (!sessionSummary) return;
    setSessions(prev => prev.filter(s => s.id !== sessionSummary.id));
    const sentProjectIds = (sessionSummary.climbs || []).filter(c => c.isProject && c.completed && c.projectId).map(c => c.projectId);
    if (sentProjectIds.length > 0) {
      setProjects(prev => prev.map(p => sentProjectIds.includes(p.id) ? { ...p, completed: false, active: true, dateSent: null } : p));
    }
    setSessionSummary(null); setScreen("home");
    localStorage.removeItem("active:climb"); sessionStorage.removeItem("active:photos");
  };

  const updateActiveClimbTries = (id, delta) => setActiveSession(s => {
    const climb = (s.climbs || []).find(c => c.id === id);
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
    return { ...s, climbs: (s.climbs || []).map(c => c.id === id ? { ...c, ...climbUpdates } : c) };
  });
  const toggleActiveClimbCompleted = (id) => setActiveSession(s => {
    const climb = (s.climbs || []).find(c => c.id === id);
    if (!climb) return s;
    const newCompleted = !climb.completed;
    let climbUpdates = { completed: newCompleted };
    if (newCompleted && climb.climbingStartedAt) {
      const now = Date.now();
      const duration = now - climb.climbingStartedAt + (climb.pausedWorkedMs || 0);
      climbUpdates = { ...climbUpdates, climbingStartedAt: null, pausedWorkedMs: 0, sentAt: now,
        attemptLog: [...(climb.attemptLog || []), { startedAt: climb.climbingStartedAt, duration }] };
      // Boulder section timer keeps running — don't flush it here
    }
    return { ...s, climbs: (s.climbs || []).map(c => c.id === id ? { ...c, ...climbUpdates } : c) };
  });
  const removeClimbFromActive      = (id) => setActiveSession(s => ({ ...s, climbs: (s.climbs || []).filter(c => c.id !== id) }));
  const climbAgain = (climb) => {
    const newId = Date.now();
    const fresh = { ...climb, id: newId, loggedAt: newId, tries: 0, falls: 0, takes: 0, completed: false, climbingStartedAt: null, lastAttemptEndedAt: null, attemptLog: [], fallLog: [], pausedWorkedMs: 0, paused: false, climbGroupId: climb.climbGroupId || climb.id };
    setActiveSession(s => {
      const climbs = s.climbs || [];
      const idx = climbs.findIndex(c => c.id === climb.id);
      const inserted = idx >= 0
        ? [...climbs.slice(0, idx + 1), fresh, ...climbs.slice(idx + 1)]
        : [...climbs, fresh];
      return { ...s, climbs: inserted };
    });
  };
  const removeClimbFromSession     = (sessionId, climbId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: (s.climbs || []).filter(c => c.id !== climbId) } : s));
    setSelectedSession(prev => ({ ...prev, climbs: (prev.climbs || []).filter(c => c.id !== climbId) }));
  };
  const saveClimbInlineEdit = (sessionId, climbId, changes) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: (s.climbs || []).map(c => c.id === climbId ? { ...c, ...changes } : c) } : s));
    setSelectedSession(prev => ({ ...prev, climbs: (prev.climbs || []).map(c => c.id === climbId ? { ...c, ...changes } : c) }));
  };

  const openBoulderAdd = () => {
    setClimbForm(f => ({ ...f, climbType: "boulder", scale: preferredScale, grade: GRADES[preferredScale]?.[2] || "V3", name: "", color: null, wallTypes: [], holdTypes: [], section: null, comments: "", isProject: false, projectId: null, setClimbId: null }));
    setPhotoPreview(null);
    setNewBoulderStep(0);
    setNewBoulderVisited(new Set([0]));
    setBoulderAddMode("landing");
  };

  const openClimbForm = (existing = null, fromProject = null, climbType = "boulder") => {
    setShowNewBoulderForm(false);
    if (existing) {
      // Auto-stop climb timer when opening edit form
      if (existing.climbingStartedAt && activeSession) {
        const now = Date.now();
        const type = existing.climbType === "rope" ? "rope" : "boulder";
        const duration = now - existing.climbingStartedAt + (existing.pausedWorkedMs || 0);
        setActiveSession(s => {
          const activeStart = s[`${type}ActiveStart`];
          const elapsed = activeStart ? Math.max(0, Math.floor((now - activeStart) / 1000)) : 0;
          return {
            ...s,
            [`${type}TotalSec`]: (s[`${type}TotalSec`] || 0) + elapsed,
            [`${type}ActiveStart`]: null,
            climbs: (s.climbs || []).map(c => c.id === existing.id ? { ...c, climbingStartedAt: null, pausedWorkedMs: 0, lastAttemptEndedAt: now, attemptLog: [...(c.attemptLog || []), { startedAt: c.climbingStartedAt, duration }] } : c),
          };
        });
      }
      setEditingClimbId(existing.id);
      setClimbForm({ name: existing.name || "", grade: existing.grade, scale: existing.scale, isProject: existing.isProject, comments: existing.comments, photo: existing.photo, projectId: existing.projectId, tries: existing.tries, completed: existing.completed, color: existing.color || null, wallTypes: existing.wallTypes || [], holdTypes: existing.holdTypes || [], climbType: existing.climbType || "boulder", ropeStyle: existing.ropeStyle || "lead", speedTime: existing.speedTime || "" });
      setPhotoPreview(existing.photo);
    } else if (fromProject) {
      setEditingClimbId(null);
      setClimbForm({ ...blankForm, name: fromProject.name || "", grade: fromProject.grade, scale: fromProject.scale, isProject: true, comments: fromProject.comments || "", projectId: fromProject.id, climbType: fromProject.climbType || "boulder" });
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
    try {
      if (editingClimbId) {
        setActiveSession(s => ({ ...s, climbs: (s.climbs || []).map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) }));
      } else {
        // Duplicate detection: warn if same name + grade + color already exists in set or projects
        if (!climbForm.setClimbId && (climbForm.climbType === "boulder" || climbForm.climbType === "rope")) {
          const location = activeSession?.location;
          const inSet = location ? (gymSets[location] || []).filter(sc => !sc.removed).some(sc =>
            sc.grade === climbForm.grade && (sc.color || null) === (climbForm.color || null) && (sc.name || "") === (climbForm.name || "")
          ) : false;
          const inProjects = activeProjects.some(p =>
            p.grade === climbForm.grade && (p.name || "") === (climbForm.name || "")
          );
          if (inSet || inProjects) {
            setPendingDupeClimb({ form: climbForm, photo: photoPreview });
            setDupeNewName(climbForm.name || "");
            return;
          }
        }
        const pid = climbForm.isProject ? (climbForm.projectId || Date.now() + 1) : null;
        const speedGrade = climbForm.climbType === "speed" ? (climbForm.speedTime ? climbForm.speedTime + "s" : "—") : undefined;
        // Gym set tracking: link to existing set climb or create a new one
        const location = activeSession?.location;
        let setClimbId = climbForm.setClimbId || null;
        if (location && !setClimbId && (climbForm.climbType === "boulder" || climbForm.climbType === "rope")) {
          setClimbId = Date.now() + 2;
          const newSetClimb = { id: setClimbId, name: climbForm.name, grade: climbForm.grade, scale: climbForm.scale, color: climbForm.color, wallTypes: climbForm.wallTypes, holdTypes: climbForm.holdTypes, climbType: climbForm.climbType || "boulder", setDate: new Date().toISOString(), location, removed: false, removedDate: null, section: climbForm.section || null };
          setGymSets(prev => ({ ...prev, [location]: [...(prev[location] || []), newSetClimb] }));
        }
        const newClimb = { ...climbForm, photo: photoPreview, projectId: pid, id: Date.now(), loggedAt: Date.now(), tries: climbForm.climbType === "speed" ? 1 : 0, completed: climbForm.climbType === "speed" ? climbForm.completed : false, ...(speedGrade ? { grade: speedGrade, scale: "Speed" } : {}), ...(setClimbId ? { setClimbId } : {}) };
        if (newClimb.isProject && !climbForm.projectId) setProjects(prev => [...prev, { id: pid, name: newClimb.name, grade: newClimb.grade, scale: newClimb.scale, climbType: newClimb.climbType || "boulder", comments: newClimb.comments, active: true, completed: false, dateAdded: new Date().toISOString(), dateSent: null }]);
        setActiveSession(s => {
          const now = Date.now();
          const typeUpdates = {};
          if (newClimb.climbType === "boulder" && !s.boulderStartedAt) { typeUpdates.boulderStartedAt = now; typeUpdates.boulderTotalSec = 0; }
          if (newClimb.climbType === "rope"    && !s.ropeStartedAt)    { typeUpdates.ropeStartedAt    = now; typeUpdates.ropeTotalSec    = 0; }
          return { ...s, ...typeUpdates, climbs: [...(s.climbs || []), newClimb] };
        });
      }
      // Show warmup nudge if first climb logged within 2 min of session start with no warmup
      if (!editingClimbId && !activeSession?.warmupStartedAt && sessionActiveStart && Date.now() - sessionActiveStart < 120000) {
        setShowWarmupNudge(true);
      }
      setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); setClimbForm(blankForm);
    } catch (e) {
      console.error("saveClimbToActiveSession error:", e);
      setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); setClimbForm(blankForm);
    }
  };

  const quickAddToSession = (data) => {
    try {
      const pid = data.isProject ? (data.projectId || Date.now() + 1) : null;
      const newClimb = {
        name: data.name || "", grade: data.grade, scale: data.scale || preferredScale,
        color: data.color || null, wallTypes: data.wallTypes || [], holdTypes: data.holdTypes || [],
        climbType: data.climbType || "boulder", ropeStyle: "lead",
        isProject: !!data.isProject, projectId: pid,
        photo: null, comments: "", id: Date.now(), loggedAt: Date.now(), tries: 0, completed: false,
        ...(data.setClimbId ? { setClimbId: data.setClimbId } : {}),
      };
      setActiveSession(s => {
        const now = Date.now();
        const typeUpdates = {};
        if (newClimb.climbType === "boulder" && !s.boulderStartedAt) { typeUpdates.boulderStartedAt = now; typeUpdates.boulderTotalSec = 0; }
        if (newClimb.climbType === "rope"    && !s.ropeStartedAt)    { typeUpdates.ropeStartedAt    = now; typeUpdates.ropeTotalSec    = 0; }
        return { ...s, ...typeUpdates, climbs: [...(s.climbs || []), newClimb] };
      });
      if (!activeSession?.warmupStartedAt && sessionActiveStart && Date.now() - sessionActiveStart < 120000) setShowWarmupNudge(true);
      setBoulderQuickPanel(null);
      setQuickPanelSelected([]);
      setShowClimbForm(false);
      setClimbForm(blankForm);
    } catch (e) {
      console.error("quickAddToSession error:", e);
      setBoulderQuickPanel(null);
      setQuickPanelSelected([]);
      setShowClimbForm(false);
    }
  };

  const saveClimbToFinishedSession = (sessionId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: (s.climbs || []).map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) } : s));
    setSelectedSession(prev => prev ? { ...prev, climbs: (prev.climbs || []).map(c => c.id === editingClimbId ? { ...c, ...climbForm, photo: photoPreview } : c) } : null);
    if (climbForm.isProject && climbForm.completed && climbForm.projectId) setProjects(prev => prev.map(p => p.id === climbForm.projectId ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));
    // Sync section/name/grade/color changes back to the gym set entry
    setGymSets(prev => {
      const updated = { ...prev };
      const sessionLoc = sessions.find(s => s.id === sessionId)?.location;
      for (const loc of Object.keys(updated)) {
        updated[loc] = updated[loc].map(e => {
          const matchById = climbForm.setClimbId && e.id === climbForm.setClimbId;
          const matchByName = !climbForm.setClimbId && sessionLoc && e.location === sessionLoc && e.name && climbForm.name && e.name === climbForm.name;
          if (!matchById && !matchByName) return e;
          return { ...e, section: climbForm.section !== undefined ? (climbForm.section || null) : e.section, name: climbForm.name || e.name, grade: climbForm.grade || e.grade, color: climbForm.color || e.color };
        });
      }
      return updated;
    });
    setEditingClimbId(null); setEditingSessionId(null); setShowClimbForm(false);
  };

  const addPhotoToLogbookClimb = (climbId, sessionId, dataUrl) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, climbs: (s.climbs || []).map(c => c.id === climbId ? { ...c, photo: dataUrl } : c) } : s));
    setSelectedLogbookClimb(prev => prev && prev.id === climbId ? { ...prev, photo: dataUrl } : prev);
  };

  const deactivateProject    = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, active: false } : p));
  const reactivateProject    = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, active: true, completed: false, dateSent: null } : p));
  const updateProjectNotes   = (id, notes) => setProjects(prev => prev.map(p => p.id === id ? { ...p, notes } : p));
  const markProjectSent    = (id) => setProjects(prev => prev.map(p => p.id === id ? { ...p, completed: true, active: false, dateSent: new Date().toISOString() } : p));

  const allClimbs      = sessions.flatMap(s => s.climbs || []);
  const activeProjects = projects.filter(p => p.active && !p.completed);
  const completedProjects = projects.filter(p => p.completed);
  const retiredProjects   = projects.filter(p => !p.active && !p.completed);

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

  // For boulder climbs, tries = falls only; the send attempt is not counted in tries.
  // This helper returns the true total attempts (falls + 1 if sent).
  // For rope, tries already counts every attempt including the topped one.
  const climbAttempts = (c) => (c.tries || 0) + (c.climbType !== "rope" && c.completed ? 1 : 0);
  const wasAttempted = (c) => c.completed || (c.tries || 0) > 0;

  const getStats = (overrideSessions) => {
    const tfSessions = overrideSessions !== undefined ? overrideSessions : getTimeframeSessions();
    const tfClimbs = tfSessions.flatMap(s => s.climbs);
    const base = tfClimbs.filter(c => wasAttempted(c) && (statsScaleFilter === "All Scales" || c.scale === statsScaleFilter) && (statsGradeFilter === "All" || c.grade === statsGradeFilter));
    const completed = base.filter(c => c.completed);
    const flashes   = completed.filter(c => c.tries === 0);
    const flashRate = base.length ? Math.round((flashes.length / base.length) * 100) : 0;
    const avgTries  = base.length ? (base.reduce((a, c) => a + climbAttempts(c), 0) / base.length).toFixed(1) : "—";
    const vBase     = tfClimbs.filter(c => c.completed && c.scale === preferredScale);
    const boulderGradeList = preferredScale === "Custom" ? customBoulderGrades : (GRADES[preferredScale] || []);
    const bestGrade = vBase.length ? [...vBase].sort((a, b) => boulderGradeList.indexOf(b.grade) - boulderGradeList.indexOf(a.grade))[0]?.grade : "—";
    const statsCustomGrades = [...new Set([...customBoulderGrades, ...customRopeGrades])];
    const gradeScaleList = statsScaleFilter === "Custom" ? statsCustomGrades : (GRADES[statsScaleFilter] || []);
    const gradeBreakdown = gradeScaleList.length > 0
      ? gradeScaleList.map(g => ({ grade: g, count: completed.filter(c => c.grade === g).length })).filter(g => g.count > 0)
      : [...new Set(completed.map(c => c.grade))].map(g => ({ grade: g, count: completed.filter(c => c.grade === g).length }));
    const totalAttempts = base.reduce((a, c) => a + climbAttempts(c), 0);
    const totalFalls = base.reduce((a, c) => a + (c.climbType === "rope" ? (c.falls ?? c.tries) : c.tries), 0);
    const avgFalls = base.length ? (totalFalls / base.length).toFixed(1) : "—";
    const climbsByDay = {}, attemptsByDay = {}, fallsByDay = {};
    tfSessions.forEach(s => { const day = s.date.slice(0, 10); const sc = s.climbs || []; climbsByDay[day] = (climbsByDay[day] || 0) + sc.length; attemptsByDay[day] = (attemptsByDay[day] || 0) + sc.reduce((t,c)=>t+climbAttempts(c),0); fallsByDay[day] = (fallsByDay[day] || 0) + sc.reduce((t,c)=>t+(c.climbType==="rope"?(c.falls??c.tries):c.tries),0); });
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
      const ts = (s.climbs || []).map(c => c.loggedAt).filter(t => t).sort((a, b) => a - b);
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
    const allSpeedAttempts = tfSessions.flatMap(s => (s.climbs || []).filter(c => c.climbType === "speed-session").flatMap(ss => ss.attempts || [])).filter(a => !a.fell && a.time != null);
    const speedPB = allSpeedAttempts.length ? Math.min(...allSpeedAttempts.map(a => a.time)) : null;
    return { base, completed, flashes, flashRate, avgTries, avgFalls, bestGrade, gradeBreakdown, mostInDay, mostAttemptsInDay, mostFallsInDay, totalAttempts, totalFalls, uniqueGyms, mostGymVisits, totalTimeClimbed, sessionCount: tfSessions.length, avgRestDays, avgClimbRestSec, maxClimbRestSec, speedPB };
  };

  const getProjectHistory    = (pid) => sessions.flatMap(s => (s.climbs || []).filter(c => c.projectId === pid).map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location }))).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  const getProjectTotalTries = (pid) => getProjectHistory(pid).reduce((sum, c) => sum + climbAttempts(c), 0);
  const getProjectTotalTimeMs = (pid) => sessions.flatMap(s => (s.climbs || []).filter(c => c.projectId === pid)).flatMap(c => c.attemptLog || []).reduce((sum, a) => sum + (a.duration || 0), 0);
  const getProjectPhoto = (pid) => { const c = sessions.flatMap(s => s.climbs || []).find(c => c.projectId === pid && c.photo); return c ? c.photo : null; };

  const getLogbookClimbs = () => {
    const rawClimbs = sessions.flatMap(s => (s.climbs || []).map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location, _sessionId: s.id })));

    // Pre-aggregate set climb metadata across ALL sessions
    const setMeta = {};
    for (const c of rawClimbs) {
      if (!c.setClimbId) continue;
      const id = c.setClimbId;
      if (!setMeta[id]) setMeta[id] = { count: 0, completed: false, photo: null, mostRecentDate: "", totalTries: 0, totalTimeMs: 0 };
      setMeta[id].count++;
      if (c.completed) setMeta[id].completed = true;
      if (!setMeta[id].photo && c.photo) setMeta[id].photo = c.photo;
      if ((c.sessionDate || "") > setMeta[id].mostRecentDate) setMeta[id].mostRecentDate = c.sessionDate;
      setMeta[id].totalTries += climbAttempts(c);
      setMeta[id].totalTimeMs += (c.attemptLog || []).reduce((s, a) => s + (a.duration || 0), 0);
    }

    // Normalize set climbs: apply merged metadata so filter/sort uses aggregate values
    let climbs = rawClimbs.map(c => {
      if (!c.setClimbId) return { ...c, _totalTries: climbAttempts(c), _totalTimeMs: (c.attemptLog || []).reduce((s, a) => s + (a.duration || 0), 0) };
      const meta = setMeta[c.setClimbId];
      return { ...c, completed: meta.completed, photo: meta.photo, _sessionCount: meta.count, sessionDate: meta.mostRecentDate, _totalTries: meta.totalTries, _totalTimeMs: meta.totalTimeMs };
    }).filter(c => {
      if (logbookFilter === "completed" && !c.completed) return false;
      if (logbookFilter === "incomplete" && c.completed) return false;
      if (logbookFilter === "projects" && !c.isProject) return false;
      if (logbookScale !== "All Scales" && c.scale !== logbookScale) return false;
      if (logbookGrade !== "All" && c.grade !== logbookGrade) return false;
      // Climb type filter
      if (logbookClimbTypeFilter.length < 2) {
        const ct = c.climbType === "rope" ? "rope" : "boulder";
        if (!logbookClimbTypeFilter.includes(ct)) return false;
      }
      // Gym + section filter
      if (logbookClimbGymFilter !== null) {
        if (!logbookClimbGymFilter.includes(c.sessionLocation || "")) return false;
        const sectionsForGym = logbookGymSectionFilter[c.sessionLocation];
        if (sectionsForGym && sectionsForGym.length > 0 && !sectionsForGym.includes(c.section || null)) return false;
      }
      // Multi-select color filter
      if (logbookColorMulti !== null && !logbookColorMulti.includes(c.color || "")) return false;
      if (logbookSearch.trim()) {
        const q = logbookSearch.trim().toLowerCase();
        if (!(c.name || "").toLowerCase().includes(q) && !(c.grade || "").toLowerCase().includes(q) && !(c.sessionLocation || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const photoFirst = (a, b) => (b.photo ? 1 : 0) - (a.photo ? 1 : 0);
    // Legacy sort values kept for backward compat
    if (logbookSort === "name") climbs.sort((a, b) => { const d = (a.name || a.grade).localeCompare(b.name || b.grade); return d !== 0 ? d : photoFirst(a, b); });
    else if (logbookSort === "projects") climbs.sort((a, b) => { const d = (b.isProject ? 1 : 0) - (a.isProject ? 1 : 0); return d !== 0 ? d : new Date(b.sessionDate) - new Date(a.sessionDate); });
    else if (logbookSort === "hardest") climbs.sort((a, b) => { const d = getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale); return d !== 0 ? d : photoFirst(a, b); });
    else if (logbookSort === "easiest") climbs.sort((a, b) => { const d = getGradeIndex(a.grade, a.scale) - getGradeIndex(b.grade, b.scale); return d !== 0 ? d : photoFirst(a, b); });
    else if (logbookQuickSort === "grade") {
      const dir = logbookQuickSortDir === "desc" ? 1 : -1;
      climbs.sort((a, b) => { const d = dir * (getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale)); return d !== 0 ? d : photoFirst(a, b); });
    } else if (logbookQuickSort === "attempts") {
      const dir = logbookQuickSortDir === "desc" ? 1 : -1;
      climbs.sort((a, b) => dir * ((b._totalTries || 0) - (a._totalTries || 0)));
    } else if (logbookQuickSort === "time") {
      const dir = logbookQuickSortDir === "desc" ? 1 : -1;
      climbs.sort((a, b) => dir * ((b._totalTimeMs || 0) - (a._totalTimeMs || 0)));
    } else {
      const dir = logbookQuickSortDir === "desc" ? 1 : -1;
      climbs.sort((a, b) => { const d = dir * (new Date(b.sessionDate) - new Date(a.sessionDate)); return d !== 0 ? d : photoFirst(a, b); });
    }
    // Deduplicate set climbs: keep first occurrence per setClimbId after sort
    const seenSetClimbs = new Set();
    climbs = climbs.filter(c => {
      if (!c.setClimbId) return true;
      if (seenSetClimbs.has(c.setClimbId)) return false;
      seenSetClimbs.add(c.setClimbId);
      return true;
    });
    if (logbookTickList) {
      // Keep best entry per unique climb identity (sent beats not-sent; first match wins after sort)
      const seen = new Map();
      for (const c of climbs) {
        const key = c.setClimbId ? `set-${c.setClimbId}`
          : c.name?.trim() ? `${c.name.trim()}-${c.grade}-${c.climbType || "boulder"}`
          : c.projectId ? `pid-${c.projectId}`
          : `solo-${c.id}`;
        if (!seen.has(key) || (!seen.get(key).completed && c.completed)) seen.set(key, c);
      }
      climbs = [...seen.values()];
    }
    return climbs;
  };

  const getSessionType = (session) => {
    const types = new Set((session.climbs || []).map(c => c.climbType === "speed-session" ? "speed" : (c.climbType || "boulder")));
    if (types.size === 0) return (session.fitnessSections || []).length > 0 ? "fitness" : "boulder";
    if (types.size === 1) return [...types][0];
    return "mixed";
  };

  const getFilteredSessions = () => {
    let base = logbookGymFilter === "All Gyms" ? [...sessions] : sessions.filter(s => s.location === logbookGymFilter);
    if (sessionTypeFilter !== "all") base = base.filter(s => getSessionType(s) === sessionTypeFilter);
    if (sessionSort === "climbs-desc") return base.sort((a, b) => (b.climbs || []).length - (a.climbs || []).length);
    if (sessionSort === "climbs-asc")  return base.sort((a, b) => (a.climbs || []).length - (b.climbs || []).length);
    if (sessionSort === "attempts-desc") return base.sort((a, b) => (b.climbs || []).reduce((s, c) => s + climbAttempts(c), 0) - (a.climbs || []).reduce((s, c) => s + climbAttempts(c), 0));
    if (sessionSort === "attempts-asc")  return base.sort((a, b) => (a.climbs || []).reduce((s, c) => s + climbAttempts(c), 0) - (b.climbs || []).reduce((s, c) => s + climbAttempts(c), 0));
    if (sessionSort === "flashes-desc") return base.sort((a, b) => (b.climbs || []).filter(c => c.completed && c.tries === 0).length - (a.climbs || []).filter(c => c.completed && c.tries === 0).length);
    if (sessionSort === "flashes-asc")  return base.sort((a, b) => (a.climbs || []).filter(c => c.completed && c.tries === 0).length - (b.climbs || []).filter(c => c.completed && c.tries === 0).length);
    return base;
  };

  const getSessionStats = (session) => {
    const climbs = (session.climbs || []).filter(c => c.climbType !== "speed-session" && wasAttempted(c));
    const sends = climbs.filter(c => c.completed).length;
    const total  = climbs.length;
    const totalTries = climbs.reduce((s, c) => s + climbAttempts(c), 0);
    const flashes    = climbs.filter(c => c.completed && c.tries === 0).length;
    const flashRate  = total ? Math.round((flashes / total) * 100) : 0;
    const avgTries   = total ? (totalTries / total).toFixed(1) : "0";
    const gradeBreakdown = {};
    climbs.forEach(c => { if (!gradeBreakdown[c.grade]) gradeBreakdown[c.grade] = { completed: 0, attempted: 0, tries: 0, scale: c.scale }; gradeBreakdown[c.grade].attempted++; gradeBreakdown[c.grade].tries += climbAttempts(c); if (c.completed) gradeBreakdown[c.grade].completed++; });
    const sortedByGrade = (arr) => [...arr].sort((a, b) => getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale));
    const hardestAttempted = climbs.length ? sortedByGrade(climbs)[0]?.grade : "—";
    const hardestSent = climbs.filter(c => c.completed).length ? sortedByGrade(climbs.filter(c => c.completed))[0]?.grade : "—";
    const loggedTimes = climbs.map(c => c.loggedAt).filter(t => t).sort((a, b) => a - b);
    const restGapsSec = loggedTimes.length > 1 ? loggedTimes.slice(1).map((t, i) => (t - loggedTimes[i]) / 1000) : [];
    const avgAttemptRest = restGapsSec.length ? Math.round(restGapsSec.reduce((a, b) => a + b, 0) / restGapsSec.length) : null;
    const maxAttemptRest = restGapsSec.length ? Math.round(Math.max(...restGapsSec)) : null;
    const minAttemptRest = restGapsSec.length ? Math.round(Math.min(...restGapsSec)) : null;
    const speedSessions = (session.climbs || []).filter(c => c.climbType === "speed-session");
    const speedAttempts = speedSessions.flatMap(s => s.attempts || []).filter(a => !a.fell && a.time != null);
    const speedBest = speedAttempts.length ? Math.min(...speedAttempts.map(a => a.time)) : null;
    const totalPauses = climbs.filter(c => c.climbType !== "rope").reduce((s, c) => s + (c.pauseCount || 0), 0);
    return { sends, total, totalTries, flashes, flashRate, avgTries, gradeBreakdown, hardestAttempted, hardestSent, avgAttemptRest, maxAttemptRest, minAttemptRest, speedSessions, speedBest, totalPauses };
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

  const loadMutuals = async () => {
    if (!currentUser) return [];
    try {
      const myFollowers = await loadFollowersStore(currentUser.username);
      const results = await Promise.all(
        socialFollowing.map(async uname => {
          const theirData = await loadUserData(uname);
          const isMutual = myFollowers.includes(uname) || (theirData?.profile?.following || []).includes(currentUser.username);
          return isMutual ? { username: uname, displayName: theirData?.profile?.displayName || uname } : null;
        })
      );
      return results.filter(Boolean);
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

  const sendClimbsToFriend = async (strippedClimbs, toUsername) => {
    const notif = {
      id: `share_${Date.now()}`,
      type: "climbShare",
      from: currentUser.username,
      fromDisplay: editDisplayName || currentUser.displayName || currentUser.username,
      climbs: strippedClimbs,
      at: new Date().toISOString(),
      read: false,
    };
    await addNotification(toUsername, notif);
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
    setLbDebug(null);
    try {
      // Use React state for who I follow (always up-to-date, synced by auto-save)
      const myFollowing = socialFollowing;

      // Load who follows me via the secondary followers store
      const myFollowers = await loadFollowersStore(currentUser.username);
      setSocialFollowers(myFollowers);

      // Load each person I follow, check mutual via BOTH methods:
      // 1. followers store (they appear in my followers:me list)
      // 2. profile.following (my username appears in their profile)
      const results = await Promise.all(
        myFollowing.map(async (uname) => {
          try {
            const theirData = await loadUserData(uname);
            const inFollowersStore = myFollowers.includes(uname);
            const inTheirProfile = (theirData?.profile?.following || []).includes(currentUser.username);
            return { username: uname, theirData, isMutual: inFollowersStore || inTheirProfile };
          } catch { return { username: uname, theirData: null, isMutual: false }; }
        })
      );

      const debug = {
        following: myFollowing.length,
        followers: myFollowers.length,
        followersStore: myFollowers,
        followingList: myFollowing,
        profileMutuals: results.filter(r => (r.theirData?.profile?.following || []).includes(currentUser.username)).map(r => r.username),
        storeMutuals: results.filter(r => myFollowers.includes(r.username)).map(r => r.username),
      };
      setLbDebug(debug);

      const entries = results
        .filter(r => r.isMutual && r.theirData)
        .map(r => ({
          username: r.username,
          displayName: r.theirData.profile?.displayName || r.username,
          sessions: r.theirData.sessions || [],
          isMe: false,
        }));
      entries.push({ username: currentUser.username, displayName: currentUser.displayName || editDisplayName, sessions, isMe: true });
      setLeaderboardData(entries);
    } catch (e) { setLeaderboardData([]); setLbDebug({ error: String(e) }); }
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

  // Lock body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxPhoto ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxPhoto]);

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

  // §CLIMB_FORM
  const ClimbFormPanel = ({ onSave, onCancel, isActiveSession = false }) => {
    const type = climbForm.climbType || "boulder";
    const ropeGrades = climbForm.scale === "Custom" ? customRopeGrades : (ROPE_GRADES[climbForm.scale] || ROPE_GRADES["French"]);
    const boulderGrades = climbForm.scale === "Custom" ? customBoulderGrades : (GRADES[climbForm.scale] || GRADES["V-Scale"]);
    const title = editingClimbId ? "Edit Climb" : type === "boulder" ? "Add a Boulder" : type === "rope" ? "Add a Rope Climb" : "Add a Speed Climb";
    const showFields = !isActiveSession || !!editingClimbId || (type !== "boulder" && type !== "rope") || showNewBoulderForm;
    return (
      <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
        <div style={{ fontWeight: 700, color: W.text, marginBottom: 14, fontSize: 15 }}>{title}</div>

        {/* Quick-add buttons: Projects + Current Set — popup is rendered at app level */}
        {isActiveSession && !editingClimbId && (type === "boulder" || type === "rope") && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <button onClick={() => setBoulderQuickPanel(type === "rope" ? "rope-projects" : "projects")} style={{ padding: "9px", borderRadius: 12, border: `2px solid ${W.border}`, background: W.surface, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Projects</button>
            <button onClick={() => setBoulderQuickPanel(type === "rope" ? "rope-set" : "set")} style={{ padding: "9px", borderRadius: 12, border: `2px solid ${W.border}`, background: W.surface, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Current Set</button>
          </div>
        )}
        {/* Collapsible create section for active session */}
        {isActiveSession && !editingClimbId && (type === "boulder" || type === "rope") && !showNewBoulderForm && (
          <button onClick={() => setShowNewBoulderForm(true)} style={{ width: "100%", padding: "13px", borderRadius: 14, border: `2px solid ${W.border}`, background: W.surface, color: W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 4 }}>{type === "rope" ? "+ Create a New Rope Climb" : "+ Create a New Boulder"}</button>
        )}
        {showFields && <>
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

        {/* Boulder: grade (with inline scale picker), wall type, hold types */}
        {type === "boulder" && (
          <>
            {showBoulderScalePicker && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowBoulderScalePicker(false)}>
                <div style={{ background: W.surface, borderRadius: 18, padding: "20px", width: "100%", maxWidth: 340, border: `1px solid ${W.border}`, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: W.text, marginBottom: 14 }}>Grading Scheme</div>
                  {[...Object.keys(GRADES), "Custom"].map(s => (
                    <button key={s} onClick={() => { const gl = s === "Custom" ? customBoulderGrades : (GRADES[s] || []); setClimbForm(f => ({ ...f, scale: s, grade: gl[0] || f.grade })); if (s !== "Custom") setShowBoulderScalePicker(false); }} style={{ width: "100%", padding: "12px 16px", marginBottom: 8, borderRadius: 12, border: `2px solid ${climbForm.scale === s ? W.accent : W.border}`, background: climbForm.scale === s ? W.accent + "18" : W.surface2, color: climbForm.scale === s ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                      {s === "Custom" ? customBoulderScaleName : s}
                      {climbForm.scale === s && <span style={{ float: "right", color: W.accent }}>✓</span>}
                    </button>
                  ))}
                  {climbForm.scale === "Custom" && (
                    <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px solid ${W.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Scale Name</div>
                      <input value={customBoulderScaleName === "Custom" ? "" : customBoulderScaleName} onChange={e => setCustomBoulderScaleName(e.target.value || "Custom")} placeholder="e.g. Gym Scale" style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Grades (comma-separated)</div>
                      <input value={customBoulderGrades.join(", ")} onChange={e => { const g = e.target.value.split(",").map(x => x.trim()).filter(Boolean); setCustomBoulderGrades(g); setCustomBoulderInput(e.target.value); if (g.length) setClimbForm(f => ({ ...f, grade: g[0] })); }} placeholder="e.g. Easy, Medium, Hard" style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  )}
                  <button onClick={() => setShowBoulderScalePicker(false)} style={{ width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${W.border}`, background: "transparent", color: W.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 12 }}>Close</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Grade</div>
              <button onClick={() => setShowBoulderScalePicker(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${W.border}`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", color: W.textMuted, fontSize: 11, fontWeight: 700 }}>
                {climbForm.scale === "Custom" ? customBoulderScaleName : climbForm.scale} ✏️
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {boulderGrades.length > 0
                ? boulderGrades.map(g => <button key={g} onClick={() => setClimbForm(f => ({ ...f, grade: g }))} style={{ padding: "5px 11px", borderRadius: 14, border: "2px solid", borderColor: climbForm.grade === g ? getGradeColor(g) : W.border, background: climbForm.grade === g ? getGradeColor(g) + "33" : W.surface, color: climbForm.grade === g ? getGradeColor(g) : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{g}</button>)
                : <div style={{ fontSize: 12, color: W.textDim, padding: "6px 0" }}>No custom grades set — add them in Settings</div>
              }
              <button onClick={() => setClimbForm(f => ({ ...f, grade: "Ungraded" }))} style={{ padding: "5px 11px", borderRadius: 14, border: "2px solid", borderColor: climbForm.grade === "Ungraded" ? W.textMuted : W.border, background: climbForm.grade === "Ungraded" ? W.surface2 : W.surface, color: climbForm.grade === "Ungraded" ? W.text : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>Ungraded</button>
            </div>
            <Label>Wall Type</Label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {WALL_TYPES.map(t => { const sel = climbForm.wallTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, wallTypes: toggleArr(f.wallTypes, t) }))} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "2px solid", borderColor: sel ? W.purpleDark : W.border, background: sel ? W.purple : W.surface, color: sel ? W.purpleDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>{t}</button>); })}
            </div>
            {(() => {
              const loc = isActiveSession ? activeSession?.location
                : sessions.find(s => s.id === editingSessionId)?.location
                || Object.keys(gymSets).find(l => (gymSets[l] || []).some(e => e.id === editingClimbId));
              const sections = (loc ? gymScales[loc]?.wallSections : null) || [];
              if (!sections.length) return null;
              return (<>
                <Label>Section</Label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {sections.map(sec => { const sel = climbForm.section === sec; return (<button key={sec} onClick={() => setClimbForm(f => ({ ...f, section: sel ? null : sec }))} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid", borderColor: sel ? W.accentDark : W.border, background: sel ? W.accent + "22" : W.surface, color: sel ? W.accentDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{sec}</button>); })}
                </div>
              </>);
            })()}
            <Label>Climb Identifier</Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {HOLD_TYPES.map(t => { const sel = climbForm.holdTypes.includes(t); return (<button key={t} onClick={() => setClimbForm(f => ({ ...f, holdTypes: toggleArr(f.holdTypes, t) }))} style={{ padding: "6px 14px", borderRadius: 20, border: "2px solid", borderColor: sel ? W.accentDark : W.border, background: sel ? W.accent + "22" : W.surface, color: sel ? W.accentDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>{t}</button>); })}
            </div>
          </>
        )}

        {/* Rope: scale, grade, style (top rope/lead) */}
        {type === "rope" && (
          <>
            {showRopeScalePicker && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setShowRopeScalePicker(false)}>
                <div style={{ background: W.surface, borderRadius: 18, padding: "20px", width: "100%", maxWidth: 340, border: `1px solid ${W.border}`, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: W.text, marginBottom: 14 }}>Grading Scheme</div>
                  {[...Object.keys(ROPE_GRADES), "Custom"].map(s => (
                    <button key={s} onClick={() => { const gl = s === "Custom" ? customRopeGrades : (ROPE_GRADES[s] || []); setClimbForm(f => ({ ...f, scale: s, grade: gl[Math.floor(gl.length / 2)] || gl[0] || f.grade })); if (s !== "Custom") setShowRopeScalePicker(false); }} style={{ width: "100%", padding: "12px 16px", marginBottom: 8, borderRadius: 12, border: `2px solid ${climbForm.scale === s ? W.accent : W.border}`, background: climbForm.scale === s ? W.accent + "18" : W.surface2, color: climbForm.scale === s ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                      {s === "Custom" ? customRopeScaleName : s}
                      {climbForm.scale === s && <span style={{ float: "right", color: W.accent }}>✓</span>}
                    </button>
                  ))}
                  {climbForm.scale === "Custom" && (
                    <div style={{ marginTop: 4, paddingTop: 12, borderTop: `1px solid ${W.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Scale Name</div>
                      <input value={customRopeScaleName === "Custom" ? "" : customRopeScaleName} onChange={e => setCustomRopeScaleName(e.target.value || "Custom")} placeholder="e.g. Gym Routes" style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Grades (comma-separated)</div>
                      <input value={customRopeGrades.join(", ")} onChange={e => { const g = e.target.value.split(",").map(x => x.trim()).filter(Boolean); setCustomRopeGrades(g); if (g.length) setClimbForm(f => ({ ...f, grade: g[0] })); }} placeholder="e.g. 5.8, 5.9, 5.10a" style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  )}
                  <button onClick={() => setShowRopeScalePicker(false)} style={{ width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${W.border}`, background: "transparent", color: W.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", marginTop: 12 }}>Close</button>
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <div style={{ color: W.textMuted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Grade</div>
              <button onClick={() => setShowRopeScalePicker(true)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${W.border}`, borderRadius: 8, padding: "3px 8px", cursor: "pointer", color: W.textMuted, fontSize: 11, fontWeight: 700 }}>
                {climbForm.scale === "Custom" ? customRopeScaleName : climbForm.scale} ✏️
              </button>
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

        {/* Tries/Completed when editing a finished session climb (boulder/rope) — hidden for gym set edits */}
        {!isActiveSession && editingClimbId && type !== "speed" && !editingGymSetClimb && (
          <>
            <Label>Falls</Label>
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

        {/* Project toggle — only shown in logbook edit mode; active session uses the picker above */}
        {type !== "speed" && !isActiveSession && (
          <>
            <Label>Mark as Project?</Label>
            <button onClick={() => setClimbForm(f => ({ ...f, isProject: !f.isProject }))} style={{ width: "100%", padding: "9px", borderRadius: 10, border: "2px solid", borderColor: climbForm.isProject ? W.pinkDark : W.border, background: climbForm.isProject ? W.pink : W.surface, color: climbForm.isProject ? W.pinkDark : W.textDim, cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🎯 {climbForm.isProject ? "Yes — Project" : "No — Not a Project"}</button>
          </>
        )}

        {isActiveSession && !editingClimbId && type !== "speed" && !climbForm.projectId && (
          <button onClick={() => setClimbForm(f => { const toggled = !f.isProject; return { ...f, isProject: toggled, name: toggled && !f.name ? `${f.grade} Project` : f.name }; })} style={{ width: "100%", padding: "10px", borderRadius: 12, border: `2px solid ${climbForm.isProject ? W.pinkDark : W.border}`, background: climbForm.isProject ? W.pink : W.surface, color: climbForm.isProject ? W.pinkDark : W.textMuted, cursor: "pointer", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🎯 {climbForm.isProject ? "Marked as New Project ✓" : "Mark as New Project"}</button>
        )}
        <Label>Comments</Label>
        <textarea value={climbForm.comments} onChange={e => setClimbForm(f => ({ ...f, comments: e.target.value }))} placeholder="Beta, notes..." style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, resize: "none", height: 70, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" }} />
        <Label>Photo</Label>
        <div style={{ border: `2px dashed ${W.border}`, borderRadius: 10, padding: photoPreview ? "0" : "12px", textAlign: "center", marginBottom: 12, background: W.surface, overflow: "hidden", position: "relative" }}>
          {photoPreview ? (
            <>
              <img src={photoPreview} alt="climb" onClick={() => setLightboxPhoto({ photos: [{ src: photoPreview, grade: climbForm.grade, name: climbForm.name, colorId: climbForm.color }], idx: 0 })} style={{ width: "100%", borderRadius: 8, maxHeight: 140, objectFit: "cover", display: "block", cursor: "zoom-in" }} />
              <button onClick={() => fileRef.current.click()} style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: 7, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", cursor: "pointer" }}>Change</button>
            </>
          ) : (
            <div onClick={() => fileRef.current.click()} style={{ color: W.textDim, fontSize: 13, cursor: "pointer" }}>📷 Tap to upload</div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const img = new Image(); img.onload = () => { const MAX = 900; const scale = Math.min(1, MAX / Math.max(img.width, img.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height); setPhotoPreview(canvas.toDataURL("image/jpeg", 0.75)); }; img.src = ev.target.result; }; r.readAsDataURL(f); }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
          <button onClick={onSave} style={{ padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Save</button>
        </div>
        </>}
      </div>
    );
  };

  // ActiveClimbCard is defined outside App() — see above export default

  // §CLIMB_ROW
  const ClimbRow = ({ climb, onEdit, onRemove, onInlineSave, onClimbClick }) => {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [inlineEditing, setInlineEditing] = useState(false);
    const [inlineName, setInlineName] = useState(climb.name || "");
    const [inlineTries, setInlineTries] = useState(climb.tries || 0);
    const [inlineCompleted, setInlineCompleted] = useState(!!climb.completed);
    const [inlineComments, setInlineComments] = useState(climb.comments || "");
    const [inlineGrade, setInlineGrade] = useState(climb.grade || "");
    const [inlineScale, setInlineScale] = useState(climb.scale || preferredScale);
    const [inlineFalls, setInlineFalls] = useState(climb.falls ?? climb.tries ?? 0);
    const gradeScrollRef = useRef(null);
    useEffect(() => {
      if (inlineEditing && gradeScrollRef.current) {
        const sel = gradeScrollRef.current.querySelector("[data-sel='1']");
        if (sel) sel.scrollIntoView({ inline: "center", behavior: "instant", block: "nearest" });
      }
    }, [inlineEditing]);
    const handleEditClick = () => onInlineSave ? setInlineEditing(e => !e) : onEdit && onEdit(climb);
    const handleInlineSave = () => { onInlineSave(climb.id, { name: inlineName, tries: inlineTries, completed: inlineCompleted, comments: inlineComments, grade: inlineGrade, scale: inlineScale, ...(climb.climbType === "rope" ? { falls: inlineFalls } : {}) }); setInlineEditing(false); };
    // No-photo logbook card
    if (!climb.photo && onClimbClick && !onEdit && !onInlineSave && !onRemove && !inlineEditing) {
      const colorEntry = CLIMB_COLORS.find(cc => cc.id === climb.color);
      const colorHex   = colorEntry?.hex;
      const colorLabel = colorEntry?.label;
      const timeSec    = Math.floor((climb.attemptLog || []).reduce((t, a) => t + (a.duration || 0), 0) / 1000);
      const gradeClr   = getGradeColor(climb.grade);
      return (
        <div onClick={() => onClimbClick(climb)} style={{ borderRadius: 14, border: `1px solid ${climb.isProject ? W.pinkDark + "60" : W.border}`, borderLeft: `4px solid ${climb.isProject ? W.pinkDark : gradeClr}`, marginBottom: 10, cursor: "pointer", background: W.surface, overflow: "hidden" }}>
          {climb.isProject && (
            <div style={{ background: W.pink, padding: "5px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${W.pinkDark}30` }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: W.pinkDark, letterSpacing: 1.2, textTransform: "uppercase" }}>🎯 Project</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "stretch", minHeight: 72 }}>
            <div style={{ background: gradeClr + "1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", minWidth: 56, borderRight: `1px solid ${gradeClr}28` }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: gradeClr, textAlign: "center" }}>{climb.grade}</div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                {colorHex && <div style={{ width: 13, height: 13, borderRadius: "50%", background: colorHex, border: `1.5px solid ${W.border}`, flexShrink: 0 }} title={colorLabel} />}
                {colorLabel && <span style={{ fontSize: 12, color: W.textMuted, fontWeight: 600 }}>{colorLabel}</span>}
                {climb.name && <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{climb.name}</span>}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: W.textMuted }}>{climb.climbType === "rope" ? <><span style={{ fontWeight: 700, color: W.text }}>{climb.tries || 0}</span> attempts · <span style={{ fontWeight: 700, color: W.text }}>{climb.falls ?? 0}</span> falls{(climb.takes || 0) > 0 && <> · <span style={{ fontWeight: 700, color: W.text }}>{climb.takes}</span> takes</>}</> : <><span style={{ fontWeight: 700, color: W.text }}>{climb.tries || 0}</span> falls · <span style={{ fontWeight: 700, color: W.text }}>{climbAttempts(climb)}</span> attempts</>}</span>
                {timeSec > 0 && <span style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{formatDuration(timeSec)}</span> on climb</span>}
                {climb._sessionCount > 1 && <span style={{ fontSize: 11, color: W.textMuted, fontWeight: 700 }}>🗓 {climb._sessionCount} sessions</span>}
                <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
                {climb.section && <span style={{ fontSize: 11, color: W.accent, fontWeight: 700 }}>📌 {climb.section}</span>}
              </div>
            </div>
            <div style={{ padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0 }}>
              <span style={{ background: climb.completed ? W.green : W.red, color: climb.completed ? W.greenDark : W.redDark, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{climb.completed ? "✓ Sent" : "Not Sent"}</span>
            </div>
          </div>
        </div>
      );
    }
    // Photo-card layout for logbook view
    if (climb.photo && onClimbClick && !onEdit && !onInlineSave && !onRemove && !inlineEditing) {
      const colorEntry = CLIMB_COLORS.find(cc => cc.id === climb.color);
      const colorHex   = colorEntry?.hex;
      const colorLabel = colorEntry?.label;
      const timeSec    = Math.floor((climb.attemptLog || []).reduce((t, a) => t + (a.duration || 0), 0) / 1000);
      return (
        <div onClick={() => onClimbClick(climb)} style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${W.border}`, marginBottom: 12, cursor: "pointer", background: W.surface }}>
          <div style={{ position: "relative" }}>
            <img src={climb.photo} alt="" style={{ width: "100%", height: 190, objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.65) 100%)" }} />
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <span style={{ background: climb.completed ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{climb.completed ? "✓ Sent" : "Not Sent"}</span>
            </div>
            {climb.isProject && (
              <div style={{ position: "absolute", top: 10, left: 10 }}>
                <span style={{ background: W.pinkDark, color: "#fff", borderRadius: 8, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>🎯 Project</span>
              </div>
            )}
            <div style={{ position: "absolute", bottom: 12, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ background: getGradeColor(climb.grade), color: "#fff", borderRadius: 10, padding: "4px 13px", fontWeight: 900, fontSize: 20, letterSpacing: 0.3, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{climb.grade}</div>
              {colorHex && <div style={{ width: 24, height: 24, borderRadius: "50%", background: colorHex, border: "2.5px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 5px rgba(0,0,0,0.5)", flexShrink: 0 }} title={colorLabel} />}
              {colorLabel && <span style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, fontSize: 13, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{colorLabel}</span>}
            </div>
          </div>
          <div style={{ padding: "10px 14px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {climb.name && <span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{climb.name}</span>}
            <span style={{ fontSize: 12, color: W.textMuted }}>{climb.climbType === "rope" ? <><span style={{ fontWeight: 700, color: W.text }}>{climb.tries || 0}</span> attempts · <span style={{ fontWeight: 700, color: W.text }}>{climb.falls ?? 0}</span> falls{(climb.takes || 0) > 0 && <> · <span style={{ fontWeight: 700, color: W.text }}>{climb.takes}</span> takes</>}</> : <><span style={{ fontWeight: 700, color: W.text }}>{climb.tries || 0}</span> falls · <span style={{ fontWeight: 700, color: W.text }}>{climbAttempts(climb)}</span> attempts</>}</span>
            {timeSec > 0 && <span style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{formatDuration(timeSec)}</span> on climb</span>}
            {climb._sessionCount > 1 && <span style={{ fontSize: 11, color: W.textMuted, fontWeight: 700 }}>🗓 {climb._sessionCount} sessions</span>}
            <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            {climb.section && <span style={{ fontSize: 11, color: W.accent, fontWeight: 700 }}>📌 {climb.section}</span>}
          </div>
        </div>
      );
    }
    return (
      <div style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", border: `1px solid ${W.border}`, marginBottom: 8, borderLeft: `4px solid ${(inlineEditing ? inlineCompleted : climb.completed) ? W.greenDark : W.redDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, background: getGradeColor(climb.grade) + "30", color: getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}60` }}>{climb.grade}</div>
          <div style={{ flex: 1, minWidth: 0, cursor: onClimbClick && !inlineEditing && !confirmRemove ? "pointer" : "default" }} onClick={onClimbClick && !inlineEditing && !confirmRemove ? () => onClimbClick(climb) : undefined}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {climb.color && <ColorDot colorId={climb.color} size={11} />}
              <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{climb.name || climb.grade}</span>
              {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
              {climb.tries === 0 && climb.completed && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
            </div>
            <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{climb.grade} · {climb.climbType === "rope" ? `${climb.tries || 0} ${(climb.tries || 0) === 1 ? "attempt" : "attempts"} · ${climb.falls ?? 0} ${(climb.falls ?? 0) === 1 ? "fall" : "falls"}${(climb.takes || 0) > 0 ? ` · ${climb.takes} ${climb.takes === 1 ? "take" : "takes"}` : ""}` : `${climb.tries || 0} ${(climb.tries || 0) === 1 ? "fall" : "falls"} · ${climbAttempts(climb)} ${climbAttempts(climb) === 1 ? "attempt" : "attempts"}`} · {climb.completed ? "✓ Completed" : "✗ Not completed"}</div>
            <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            {!inlineEditing && climb.comments && <div style={{ fontSize: 12, color: W.textDim, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
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
          {climb.photo && !inlineEditing && (
            <img src={climb.photo} alt="" onClick={onClimbClick && !confirmRemove ? () => onClimbClick(climb) : undefined} style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", flexShrink: 0, cursor: onClimbClick && !confirmRemove ? "pointer" : "default", border: `1px solid ${W.border}` }} />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            {(onEdit || onInlineSave) && !confirmRemove && <button onClick={handleEditClick} style={{ background: inlineEditing ? W.accent + "22" : W.surface2, border: `1px solid ${inlineEditing ? W.accent : W.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.accent, fontWeight: 700, cursor: "pointer" }}>{inlineEditing ? "Cancel" : "Edit"}</button>}
            {onRemove && !confirmRemove && !inlineEditing && <button onClick={() => setConfirmRemove(true)} style={{ background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.redDark, fontWeight: 700, cursor: "pointer" }}>Remove</button>}
          </div>
        </div>
        {inlineEditing && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${W.border}` }}>
            <input value={inlineName} onChange={e => setInlineName(e.target.value)} placeholder="Climb name" style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }} />
            <div ref={gradeScrollRef} style={{ overflowX: "auto", display: "flex", gap: 4, marginBottom: 8, paddingBottom: 2 }}>
              {(climb.climbType === "rope"
                ? (inlineScale === "Custom" ? customRopeGrades : (ROPE_GRADES[inlineScale] || ROPE_GRADES["French"]))
                : (inlineScale === "Custom" ? customBoulderGrades : (GRADES[inlineScale] || GRADES["V-Scale"]))
              ).map(g => (
                <button key={g} data-sel={g === inlineGrade ? "1" : "0"} onClick={() => setInlineGrade(g)} style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 7, border: `1.5px solid ${inlineGrade === g ? getGradeColor(g) : W.border}`, background: inlineGrade === g ? getGradeColor(g) + "30" : W.surface, color: inlineGrade === g ? getGradeColor(g) : W.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{g}</button>
              ))}
              <button onClick={() => setInlineGrade("Ungraded")} style={{ flexShrink: 0, padding: "4px 9px", borderRadius: 7, border: `1.5px solid ${inlineGrade === "Ungraded" ? W.textMuted : W.border}`, background: inlineGrade === "Ungraded" ? W.surface2 : W.surface, color: inlineGrade === "Ungraded" ? W.text : W.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Ungraded</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: W.textMuted, fontWeight: 600 }}>Tries</span>
              <button onClick={() => setInlineTries(t => Math.max(0, t - 1))} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 16, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              <span style={{ fontSize: 16, fontWeight: 900, color: W.text, minWidth: 24, textAlign: "center" }}>{inlineTries}</span>
              <button onClick={() => setInlineTries(t => t + 1)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 16, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              <button onClick={() => setInlineCompleted(c => !c)} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, border: `2px solid ${inlineCompleted ? W.greenDark : W.border}`, background: inlineCompleted ? W.green : W.surface, color: inlineCompleted ? W.greenDark : W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{inlineCompleted ? "✓ Sent" : "Not Sent"}</button>
            </div>
            {climb.climbType === "rope" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: W.textMuted, fontWeight: 600 }}>Falls</span>
                <button onClick={() => setInlineFalls(f => Math.max(0, f - 1))} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 16, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                <span style={{ fontSize: 16, fontWeight: 900, color: W.text, minWidth: 24, textAlign: "center" }}>{inlineFalls}</span>
                <button onClick={() => setInlineFalls(f => f + 1)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 16, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
            )}
            <textarea value={inlineComments} onChange={e => setInlineComments(e.target.value)} placeholder="Notes..." style={{ width: "100%", padding: "8px 10px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 12, resize: "none", height: 52, boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: 8 }}>
              {onEdit && <button onClick={() => { setInlineEditing(false); onEdit(climb); }} style={{ padding: "7px 12px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 9, color: W.textMuted, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Full Edit</button>}
              <button onClick={handleInlineSave} style={{ flex: 1, padding: "7px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
            </div>
          </div>
        )}
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


  // Shared donut pie builder — returns slice paths + startAngle/endAngle/pct/total per slice
  const buildPie = (slices) => {
    const total = slices.reduce((s, r) => s + r.value, 0);
    if (!total) return [];
    let angle = -Math.PI / 2;
    return slices.map(s => {
      const startAngle = angle;
      const a = (s.value / total) * 2 * Math.PI;
      const end = angle + a;
      const [r, ir, cx, cy] = [32, 18, 40, 40];
      const x1 = cx+r*Math.cos(angle), y1 = cy+r*Math.sin(angle);
      const x2 = cx+r*Math.cos(end),   y2 = cy+r*Math.sin(end);
      const ix1 = cx+ir*Math.cos(angle), iy1 = cy+ir*Math.sin(angle);
      const ix2 = cx+ir*Math.cos(end),   iy2 = cy+ir*Math.sin(end);
      const large = a > Math.PI ? 1 : 0;
      const path = `M ${ix1.toFixed(1)} ${iy1.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} A ${ir} ${ir} 0 ${large} 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)} Z`;
      angle = end;
      return { ...s, path, pct: Math.round((s.value / total) * 100), startAngle, endAngle: end, total };
    });
  };
  // Build a send-ratio arc path at outer edge (r 27–32) for a grade slice
  const makeSendArc = (startAngle, sendAngle) => {
    if (sendAngle < 0.01) return null;
    const [rO, rI, cx, cy] = [32, 27, 40, 40];
    const end = startAngle + sendAngle;
    const x1 = cx+rO*Math.cos(startAngle), y1 = cy+rO*Math.sin(startAngle);
    const x2 = cx+rO*Math.cos(end),        y2 = cy+rO*Math.sin(end);
    const ix1 = cx+rI*Math.cos(startAngle), iy1 = cy+rI*Math.sin(startAngle);
    const ix2 = cx+rI*Math.cos(end),        iy2 = cy+rI*Math.sin(end);
    const large = sendAngle > Math.PI ? 1 : 0;
    return `M ${ix1.toFixed(1)} ${iy1.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rO} ${rO} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix2.toFixed(1)} ${iy2.toFixed(1)} A ${rI} ${rI} 0 ${large} 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)} Z`;
  };

  const LogbookSessionCard = ({ session, poster, onNavigate }) => {
    const stats = getSessionStats(session);
    const climbPhotos = (session.climbs || []).filter(c => c.photo);
    const [photoIdx, setPhotoIdx] = useState(0);
    const [photoVisible, setPhotoVisible] = useState(true);
    const [selectedGradeSlice, setSelectedGradeSlice] = useState(null);
    const [selectedTimeSlice, setSelectedTimeSlice]   = useState(null);
    const safeIdx = Math.min(photoIdx, climbPhotos.length - 1);
    const switchPhoto = (newIdx) => {
      if (newIdx === safeIdx) return;
      setPhotoVisible(false);
      setTimeout(() => { setPhotoIdx(newIdx); setPhotoVisible(true); }, 130);
    };
    const timeAgo = (dateStr) => {
      const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
      if (diff === 0) return "Today";
      if (diff === 1) return "Yesterday";
      if (diff < 7) return `${diff} days ago`;
      if (diff < 14) return "1 week ago";
      if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
      if (diff < 60) return "1 month ago";
      return `${Math.floor(diff / 30)} months ago`;
    };
    return (
      <div style={{ background: W.surface, borderRadius: 18, border: `2px solid ${W.accent}40`, marginBottom: 16, overflow: "hidden", boxShadow: `0 2px 12px ${W.accentGlow}` }}>
        {/* Top row: avatar+name left, date/timeago right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${W.border}`, background: W.surface2 }}>
          {poster ? (
            <div onClick={() => poster.username !== currentUser?.username && openUserProfile(poster.username, poster.displayName, "home")} style={{ cursor: poster.username !== currentUser?.username ? "pointer" : "default", display: "flex", alignItems: "center", gap: 10 }}>
              {poster.profilePic
                ? <img src={poster.profilePic} style={{ width: 40, height: 40, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🧗</div>
              }
              <span style={{ fontWeight: 800, color: W.accent, fontSize: 16 }}>{poster.displayName}</span>
            </div>
          ) : <div />}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted }}>{formatDate(session.date)}</div>
            <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>{timeAgo(session.date)}</div>
          </div>
        </div>
        {/* Header: session time left, location + type chips right */}
        {(() => {
          const hasBoulder    = (session.climbs || []).some(c => c.climbType !== "rope" && c.climbType !== "speed-session") || !!session.boulderStartedAt;
          const hasRope       = (session.climbs || []).some(c => c.climbType === "rope") || !!session.ropeStartedAt;
          const hasSpeed      = (session.climbs || []).some(c => c.climbType === "speed-session");
          const hasWarmup     = (session.warmupTotalSec || 0) > 0;
          const hasWorkout    = (session.workoutTotalSec || 0) > 0;
          const hasFingerboard = (session.fingerboardTotalSec || 0) > 0;
          const hasFitness     = (session.fitnessSections || []).length > 0;
          const sessionFlashes = (session.climbs || []).filter(c => c.completed && c.tries === 0 && c.climbType !== "speed-session").length;
          const typeChips  = [
            hasBoulder    && { label: "🪨 Boulder", bg: W.green,  tc: W.greenDark  },
            hasRope       && { label: "🪢 Rope",    bg: W.purple, tc: W.purpleDark },
            hasSpeed      && { label: "⚡ Speed",   bg: W.yellow, tc: W.yellowDark },
            sessionFlashes > 0 && { label: `⚡ ${sessionFlashes} flash${sessionFlashes > 1 ? "es" : ""}`, bg: W.yellow, tc: W.yellowDark },
            hasWarmup     && { label: `🔥 ${formatDuration(session.warmupTotalSec)}`, bg: W.pink, tc: W.pinkDark },
            hasWorkout    && { label: `💪 ${formatDuration(session.workoutTotalSec)}`, bg: W.purple, tc: W.purpleDark },
            hasFingerboard && { label: `🤲 ${formatDuration(session.fingerboardTotalSec)}`, bg: W.yellow, tc: W.yellowDark },
            hasFitness    && { label: `🏋️ ${(session.fitnessSections || []).length} block${(session.fitnessSections || []).length !== 1 ? "s" : ""}`, bg: `#f9731622`, tc: "#f97316" },
          ].filter(Boolean);
          return (
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${W.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 900, color: W.text, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{formatDuration(session.duration)}</div>
                <div style={{ fontSize: 10, color: W.textDim, marginTop: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Session Time</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: W.textMuted }}>📍 {session.location}</div>
                {typeChips.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    {typeChips.map(chip => (
                      <span key={chip.label} style={{ background: chip.bg, color: chip.tc, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{chip.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
        {session.notes && (
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${W.border}`, fontSize: 13, color: W.textMuted, fontStyle: "italic", lineHeight: 1.5 }}>
            "{session.notes}"
          </div>
        )}
        {/* Photo swiper */}
        {climbPhotos.length > 0 && (() => {
          const photo = climbPhotos[safeIdx];
          const colorHex = CLIMB_COLORS.find(cc => cc.id === photo.color)?.hex;
          return (
            <div
              style={{ position: "relative", borderBottom: `1px solid ${W.border}`, overflow: "hidden" }}
              onTouchStart={e => { e.currentTarget._swipeX = e.touches[0].clientX; }}
              onTouchEnd={e => {
                const dx = e.changedTouches[0].clientX - (e.currentTarget._swipeX || 0);
                if (Math.abs(dx) > 40) switchPhoto(dx < 0 ? Math.min(safeIdx + 1, climbPhotos.length - 1) : Math.max(safeIdx - 1, 0));
              }}
            >
              <img
                key={safeIdx}
                src={photo.photo}
                alt={photo.name || photo.grade}
                onClick={e => { e.stopPropagation(); setLightboxPhoto({ photos: climbPhotos.map(p => ({ src: p.photo, grade: p.grade, name: p.name, colorId: p.color })), idx: safeIdx }); }}
                style={{ width: "100%", height: 220, objectFit: "cover", display: "block", cursor: "pointer", opacity: photoVisible ? 1 : 0, transition: "opacity 0.13s ease" }}
              />
              {/* Gradient overlay */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 90, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)", pointerEvents: "none" }} />
              {/* Tap zones for prev/next */}
              {climbPhotos.length > 1 && safeIdx > 0 && (
                <button onClick={e => { e.stopPropagation(); switchPhoto(safeIdx - 1); }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "28%", background: "transparent", border: "none", cursor: "pointer" }} />
              )}
              {climbPhotos.length > 1 && safeIdx < climbPhotos.length - 1 && (
                <button onClick={e => { e.stopPropagation(); switchPhoto(safeIdx + 1); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "28%", background: "transparent", border: "none", cursor: "pointer" }} />
              )}
              {/* Grade / name badges */}
              <div style={{ position: "absolute", bottom: climbPhotos.length > 1 ? 30 : 10, left: 12, display: "flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
                <div style={{ background: getGradeColor(photo.grade) + "ee", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 800, color: "#fff" }}>{photo.grade}</div>
                {colorHex && <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "2px solid rgba(255,255,255,0.85)", boxShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />}
                {photo.name && <div style={{ background: "rgba(0,0,0,0.45)", borderRadius: 6, padding: "2px 8px", fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{photo.name}</div>}
              </div>
              {climbPhotos.length > 1 && (
                <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.45)", borderRadius: 10, padding: "2px 8px", fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600, pointerEvents: "none" }}>{safeIdx + 1}/{climbPhotos.length}</div>
              )}
              {climbPhotos.length > 1 && (
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5 }}>
                  {climbPhotos.map((_, i) => (
                    <div key={i} onClick={e => { e.stopPropagation(); switchPhoto(i); }} style={{ width: i === safeIdx ? 16 : 6, height: 6, borderRadius: 3, background: i === safeIdx ? "#fff" : "rgba(255,255,255,0.4)", cursor: "pointer" }} />
                  ))}
                </div>
              )}
            </div>
          );
        })()}
        {/* Stats section */}
        {(() => {
          const fitnessSections = session.fitnessSections || [];
          const isPureFitness = stats.total === 0 && fitnessSections.length > 0;
          if (isPureFitness) {
            const totalBlocks = fitnessSections.length;
            const doneBlocks = fitnessSections.filter(s => s.endedAt).length;
            const totalTasks = fitnessSections.reduce((t, s) => t + (s.items || []).length, 0);
            const doneTasks  = fitnessSections.reduce((t, s) => t + (s.items || []).filter(i => i.checked).length, 0);
            return (
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${W.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{doneBlocks}/{totalBlocks}</div>
                    <div style={{ fontSize: 10, color: W.textMuted, fontWeight: 600, marginTop: 2 }}>blocks done</div>
                  </div>
                  {totalTasks > 0 && (
                    <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#f97316" }}>{doneTasks}/{totalTasks}</div>
                      <div style={{ fontSize: 10, color: W.textMuted, fontWeight: 600, marginTop: 2 }}>tasks done</div>
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: W.textMuted }}>{fitnessSections.map(s => s.name).join(" · ")}</div>
              </div>
            );
          }
          const col1 = [
            { label: "Climbs Sent",   value: `${stats.sends}/${stats.total}` },
            { label: "Flashes",       value: stats.flashes },
            { label: "Hardest Tried", value: stats.hardestAttempted },
          ];
          const col2 = [
            { label: "Total Tries",  value: stats.totalTries },
            { label: "Avg Tries",    value: stats.avgTries },
            { label: "Hardest Sent", value: stats.hardestSent, accent: true },
          ];
          const boulderSec = session.boulderTotalSec || 0;
          const ropeSec    = session.ropeTotalSec || 0;
          const warmupSec  = session.warmupTotalSec || 0;
          const speedSec   = stats.speedSessions.reduce((s, ss) => s + Math.max(0, Math.floor(((ss.endedAt || Date.now()) - ss.startedAt) / 1000)), 0);
          const hasBoulder  = boulderSec > 0 || (session.climbs || []).some(c => c.climbType !== "rope" && c.climbType !== "speed-session");
          const hasRope     = ropeSec > 0 || (session.climbs || []).some(c => c.climbType === "rope");
          const hasSpeed    = speedSec > 0 || stats.speedSessions.length > 0;
          const hasWarmupT  = warmupSec > 0;
          const hasWorkoutT = (session.workoutTotalSec || 0) > 0;
          const hasFboardT  = (session.fingerboardTotalSec || 0) > 0;
          // Only count actual climbing types (not warmup/workout/fingerboard) to decide which chart to show
          const climbTypeCount = [hasBoulder, hasRope, hasSpeed].filter(Boolean).length;
          // Build right panel based on session type mix
          let rightPanel = null;
          if (climbTypeCount >= 2) {
            // Multi climbing type: time breakdown pie (warmup/workout slices included if present)
            const timeSlices = [
              hasBoulder  && boulderSec > 0                           && { label: "🪨 Boulder",     value: boulderSec,                        color: W.greenDark  },
              hasRope     && ropeSec > 0                              && { label: "🪢 Rope",         value: ropeSec,                           color: W.purpleDark },
              hasSpeed    && speedSec > 0                             && { label: "⚡ Speed",         value: speedSec,                          color: W.yellowDark },
              hasWarmupT  && warmupSec > 0                            && { label: "🔥 Warm Up",      value: warmupSec,                         color: W.pinkDark   },
              hasWorkoutT && (session.workoutTotalSec || 0) > 0       && { label: "💪 Workout",      value: session.workoutTotalSec,           color: W.purpleDark },
              hasFboardT  && (session.fingerboardTotalSec || 0) > 0   && { label: "🤲 Fingerboard",  value: session.fingerboardTotalSec,       color: W.yellowDark },
            ].filter(Boolean);
            const paths = buildPie(timeSlices);
            if (paths.length >= 2) {
              const activeTimeLabel = selectedTimeSlice && paths.find(p => p.label === selectedTimeSlice) ? selectedTimeSlice : paths[0]?.label;
              const activeTimeSlice = paths.find(p => p.label === activeTimeLabel) || paths[0];
              rightPanel = (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <svg width={110} height={110} viewBox="0 0 80 80" style={{ cursor: "pointer" }}>
                    <style>{`@keyframes pie-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}.pie-p{transform-origin:40px 40px;animation:pie-pulse 0.28s ease}`}</style>
                    {paths.map((s, i) => (
                      <path key={s.label === activeTimeLabel ? `${i}-a` : i} d={s.path} fill={s.color}
                        className={s.label === activeTimeLabel ? "pie-p" : undefined}
                        style={{ opacity: s.label === activeTimeLabel ? 1 : 0.45, transition: "opacity 0.25s ease" }}
                        onClick={e => { e.stopPropagation(); setSelectedTimeSlice(prev => prev === s.label ? null : s.label); }} />
                    ))}
                    <circle cx="40" cy="40" r="35" fill="none" stroke={activeTimeSlice?.color} strokeWidth="2" strokeOpacity="0.65" pointerEvents="none" />
                    <circle cx="40" cy="40" r="17" fill="transparent" style={{ cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); const idx = paths.findIndex(p => p.label === activeTimeLabel); setSelectedTimeSlice(paths[(idx + 1) % paths.length].label); }} />
                    {activeTimeSlice && <text x="40" y="44" textAnchor="middle" fontSize="9" fontWeight="900" fill={W.text} pointerEvents="none">{activeTimeSlice.pct}%</text>}
                  </svg>
                  {activeTimeSlice && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: activeTimeSlice.color, lineHeight: 1 }}>{activeTimeSlice.label}</div>
                      <div style={{ fontSize: 10, color: W.textDim, marginTop: 2 }}>{activeTimeSlice.pct}% · {formatDuration(activeTimeSlice.value)}</div>
                    </div>
                  )}
                </div>
              );
            }
          } else if (climbTypeCount === 1 && hasSpeed && !hasBoulder && !hasRope) {
            // Speed only: top times leaderboard
            const topTimes = stats.speedSessions.flatMap(ss => ss.attempts || []).filter(a => !a.fell && a.time != null).sort((a, b) => a.time - b.time).slice(0, 5);
            const best = topTimes[0]?.time;
            if (topTimes.length > 0) rightPanel = (
              <div style={{ flexShrink: 0, minWidth: 88 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Top Times</div>
                {topTimes.map((a, i) => (
                  <div key={a.id || i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: W.textDim, width: 14, flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: a.time === best ? W.yellowDark : W.text, fontVariantNumeric: "tabular-nums" }}>{a.time.toFixed(2)}s</span>
                    {a.time === best && <span style={{ fontSize: 9, fontWeight: 800, color: W.yellowDark }}>PB</span>}
                  </div>
                ))}
              </div>
            );
          } else if (climbTypeCount === 1 && (hasBoulder || hasRope)) {
            // Single climb type (even with warmup/workout/fingerboard): grade breakdown pie
            // Color palette for custom/unknown grades — cycles through distinct hues
            const CUSTOM_PALETTE = ["#4ade80","#fde047","#fb923c","#ef4444","#c084fc","#38bdf8","#f472b6","#a3e635","#f87171","#818cf8","#34d399","#fbbf24"];
            const gradeColorForPie = (grade, scale) => {
              const known = GRADE_COLORS[grade];
              if (known) return known;
              const list = customBoulderGrades.length ? customBoulderGrades : customRopeGrades;
              const idx = list.indexOf(grade);
              if (idx >= 0) return CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length];
              let hash = 0; for (let i = 0; i < grade.length; i++) hash = (hash * 31 + grade.charCodeAt(i)) & 0xffff;
              return CUSTOM_PALETTE[hash % CUSTOM_PALETTE.length];
            };
            // Use `attempted` (climb count) not `tries` (falls) — avoids zero-total when climbs are all flashed
            const gradeEntries = Object.entries(stats.gradeBreakdown).sort((a, b) => b[1].attempted - a[1].attempted);
            if (gradeEntries.length >= 1) {
              const gradeSlices = gradeEntries.map(([grade, data]) => ({ label: grade, value: data.attempted, completed: data.completed || 0, color: gradeColorForPie(grade, data.scale) }));
              const paths = buildPie(gradeSlices);
              const totalClimbs = paths[0]?.total || 0;
              const activeLabel = selectedGradeSlice && paths.find(p => p.label === selectedGradeSlice) ? selectedGradeSlice : paths[0]?.label;
              const activeSlice = paths.find(p => p.label === activeLabel) || paths[0];
              if (paths.length >= 1) rightPanel = (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <svg width={110} height={110} viewBox="0 0 80 80" style={{ cursor: "pointer" }}>
                    <style>{`@keyframes pie-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}.pie-p{transform-origin:40px 40px;animation:pie-pulse 0.28s ease}`}</style>
                    {paths.map((s, i) => (
                      <path key={s.label === activeLabel ? `${i}-a` : i} d={s.path} fill={s.color}
                        className={s.label === activeLabel ? "pie-p" : undefined}
                        style={{ opacity: s.label === activeLabel ? 1 : 0.45, transition: "opacity 0.25s ease" }}
                        onClick={e => { e.stopPropagation(); setSelectedGradeSlice(prev => prev === s.label ? null : s.label); }} />
                    ))}
                    {paths.map((s, i) => {
                      const sendAngle = s.value > 0 ? ((s.completed / s.value) * (s.endAngle - s.startAngle)) : 0;
                      const arcPath = makeSendArc(s.startAngle, sendAngle);
                      return arcPath ? <path key={`sa${i}`} d={arcPath} fill="rgba(255,255,255,0.45)" pointerEvents="none" /> : null;
                    })}
                    <circle cx="40" cy="40" r="35" fill="none" stroke={activeSlice?.color} strokeWidth="2" strokeOpacity="0.65" pointerEvents="none" />
                    {paths.length > 1 && <circle cx="40" cy="40" r="17" fill="transparent" style={{ cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); const idx = paths.findIndex(p => p.label === activeLabel); setSelectedGradeSlice(paths[(idx + 1) % paths.length].label); }} />}
                    <text x="40" y="44" textAnchor="middle" fontSize="10" fontWeight="900" fill={W.text} pointerEvents="none">{totalClimbs}</text>
                  </svg>
                  {activeSlice && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: activeSlice.color, lineHeight: 1 }}>{activeSlice.label}</div>
                      <div style={{ fontSize: 10, color: W.textDim, marginTop: 2 }}>{activeSlice.pct}% · {activeSlice.value} climb{activeSlice.value !== 1 ? "s" : ""} · {activeSlice.completed} sent</div>
                    </div>
                  )}
                </div>
              );
            }
          }
          return (
            <div style={{ padding: "12px 16px 4px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Stats</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                  <div style={{ borderRight: `1px solid ${W.border}`, paddingRight: 10 }}>
                    {col1.map((row, i) => (
                      <div key={row.label} style={{ padding: "6px 0", borderBottom: i < col1.length - 1 ? `1px solid ${W.border}` : "none" }}>
                        <div style={{ fontSize: 10, color: W.textDim, fontWeight: 600 }}>{row.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: W.text, marginTop: 1 }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ paddingLeft: 10 }}>
                    {col2.map((row, i) => (
                      <div key={row.label} style={{ padding: "6px 0", borderBottom: i < col2.length - 1 ? `1px solid ${W.border}` : "none" }}>
                        <div style={{ fontSize: 10, color: W.textDim, fontWeight: 600 }}>{row.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: row.accent ? W.greenDark : W.text, marginTop: 1 }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {rightPanel}
              </div>
            </div>
          );
        })()}
        {/* Bottom row: social cards = 👍 + 💬 + Details inline; own cards = Details full-width */}
        {poster ? (
          <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: `1px solid ${W.border}`, alignItems: "center" }}>
            {(() => {
              const active = myReactions[session.id] === "👍";
              const count = feedReactionCounts[session.id]?.["👍"] || 0;
              return (
                <button onClick={e => { e.stopPropagation(); toggleReaction(session.id, "👍"); }} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${active ? W.accent : W.border}`, background: active ? W.accent + "22" : "transparent", fontSize: 15, cursor: "pointer", fontWeight: active ? 700 : 400, color: active ? W.accent : W.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                  👍{count > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{count}</span>}
                </button>
              );
            })()}
            <button onClick={e => { e.stopPropagation(); openCommentPanel(session.id, poster?.username || currentUser.username); }} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${W.border}`, background: "transparent", fontSize: 13, cursor: "pointer", color: W.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              💬{sessionComments[session.id]?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700 }}>{sessionComments[session.id].length}</span>}
            </button>
            <button onClick={onNavigate || (() => { setSessionReadOnly(false); setSelectedSession(session); setScreen("sessionDetail"); })} style={{ marginLeft: "auto", padding: "5px 14px", borderRadius: 20, border: `1.5px solid ${W.border}`, background: W.surface2, color: W.accent, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Details ›
            </button>
          </div>
        ) : (
          <div style={{ padding: "10px 16px", borderTop: `1px solid ${W.border}` }}>
            <button onClick={onNavigate || (() => { setSessionReadOnly(false); setSelectedSession(session); setScreen("sessionDetail"); })} style={{ width: "100%", padding: "10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.accent, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              View Details ›
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── SCREENS ────────────────────────────────────────────────
  // §SCREEN_HOME
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

  // §SCREEN_SESSION_SETUP
  const SessionSetupScreen = () => {
    const toggleType = (t) => setSessionTypes(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
    const climbingOpts = [
      { id: "boulder", label: "Bouldering" },
      { id: "rope",    label: "Rope" },
      { id: "speed",   label: "Speed" },
    ];
    const trainingOpts = [
      { id: "warmup",      label: "Warm Up" },
      { id: "workout",     label: "Workout" },
      { id: "fingerboard", label: "Fingerboard" },
    ];
    const tab = sessionSetupClimbingOpen ? "climbing" : sessionSetupFitnessOpen ? "training" : null;
    const setTab = (t) => {
      setSessionSetupClimbingOpen(t === "climbing");
      setSessionSetupFitnessOpen(t === "training");
    };
    const hasClimbing = sessionTypes.some(t => ["boulder","rope","speed"].includes(t));
    const hasTraining = sessionTypes.some(t => ["warmup","workout","fingerboard","fitness"].includes(t));
    const activeOpts = tab === "climbing" ? climbingOpts : tab === "training" ? trainingOpts : [];
    const currentGym = gyms.find(g => g.name === pendingLocation);
    const gymActs = currentGym?.activities || null;
    return (
      <div style={{ padding: "32px 20px" }}>
        {/* Location */}
        <div style={{ background: W.surface, borderRadius: 18, padding: "18px 20px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
          <Label>Gym / Location</Label>
          <LocationDropdown value={pendingLocation} onChange={v => { setPendingLocation(v); addCustomLocation(v); }} open={locationDropdownOpen} setOpen={setLocationDropdownOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
        </div>
        {/* Session type card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { key: "climbing", label: "Climbing", icon: "🧗", defaultType: "boulder", show: !gymActs || gymActs.some(a => ["boulder","rope","speed"].includes(a)) },
            { key: "training", label: "Fitness",  icon: "🏋️", defaultType: "fitness", show: !gymActs || gymActs.includes("workout") },
          ].filter(x => x.show).map(({ key, label, icon, defaultType }) => {
            const sel = key === "climbing" ? hasClimbing : hasTraining;
            return (
              <button key={key} onClick={() => {
                if (key === "climbing") {
                  if (hasClimbing) setSessionTypes(prev => prev.filter(t => !["boulder","rope","speed"].includes(t)).length ? prev.filter(t => !["boulder","rope","speed"].includes(t)) : ["fitness"]);
                  else setSessionTypes(prev => [...prev.filter(t => !["boulder","rope","speed"].includes(t)), "boulder"]);
                } else {
                  if (hasTraining) setSessionTypes(prev => prev.filter(t => !["warmup","workout","fingerboard","fitness"].includes(t)).length ? prev.filter(t => !["warmup","workout","fingerboard","fitness"].includes(t)) : ["boulder"]);
                  else setSessionTypes(prev => [...prev.filter(t => !["warmup","workout","fingerboard","fitness"].includes(t)), "fitness"]);
                }
              }} style={{ padding: "24px 16px", background: sel ? W.accent + "18" : W.surface, border: `2px solid ${sel ? W.accent : W.border}`, borderRadius: 18, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transition: "background 0.12s, border-color 0.12s" }}>
                <span style={{ fontSize: 36 }}>{icon}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: sel ? W.accent : W.text }}>{label}</span>
                {sel && <span style={{ fontSize: 18, color: W.accent }}>✓</span>}
              </button>
            );
          })}
        </div>
        <button onClick={beginTimer} style={{ width: "100%", padding: "18px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 17, fontWeight: 800, cursor: "pointer", boxShadow: `0 6px 24px ${W.accentGlow}` }}>Start Session</button>
      </div>
    );
  };

  // §SCREEN_SESSION_ACTIVE
  const SessionActiveScreen = () => {
    const selectedTypes = activeSession?.sessionTypes || ["boulder"];
    const allTypeButtons = [
      { type: "boulder",     label: "+ Boulder Session",       bg: W.green,   border: W.greenDark,   color: W.greenDark,   onClick: openBoulderAdd },
      { type: "rope",        label: "+ Rope Climb Session",    bg: W.purple,  border: W.purpleDark,  color: W.purpleDark,  onClick: () => openClimbForm(null, null, "rope") },
      { type: "speed",       label: "+ Speed Climb Session",   bg: W.yellow,  border: W.yellowDark,  color: W.yellowDark,  onClick: addSpeedSession },
      { type: "warmup",      label: "+ Warm Up Session",       bg: W.pink,    border: W.pinkDark,    color: W.pinkDark,    onClick: startWarmupSection },
      { type: "workout",     label: "+ Workout Session",       bg: W.accent,  border: W.accentDark,  color: W.accentDark,  onClick: startWorkoutSection },
      { type: "fingerboard", label: "+ Finger Board Session",  bg: W.yellow,  border: W.yellowDark,  color: W.yellowDark,  onClick: startFingerboardSection },
      { type: "fitness",     label: "+ Fitness",              bg: W.surface2, border: W.border,      color: W.text,        onClick: startFitnessSession },
    ];
    const primaryBtns   = allTypeButtons.filter(b => selectedTypes.includes(b.type)).sort((a, b) => { const ai = sessionTypeOrder.indexOf(a.type); const bi = sessionTypeOrder.indexOf(b.type); return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi); });
    const secondaryBtns = allTypeButtons.filter(b => !selectedTypes.includes(b.type));
    const hasClimbing = selectedTypes.some(t => ["boulder","rope","speed"].includes(t));
    const hasFitness = selectedTypes.some(t => ["workout","fingerboard","fitness"].includes(t));
    const allClimbs = activeSession?.climbs || [];
    const speedSessions = allClimbs.filter(c => c.climbType === "speed-session");
    const hasAnyClimbActivity = !!(activeSession?.boulderStartedAt || activeSession?.ropeStartedAt || speedSessions.length > 0);
    const hasAnyFitnessActivity = !!(activeSession?.workoutStartedAt || activeSession?.fingerboardStartedAt || (activeSession?.fitnessSections || []).length > 0);
    const boulderClimbs = allClimbs.filter(c => c.climbType !== "speed-session" && (c.climbType === "boulder" || !c.climbType));
    const ropeClimbs    = allClimbs.filter(c => c.climbType === "rope");
    const regularSends = allClimbs.filter(c => c.climbType !== "speed-session" && wasAttempted(c) && c.completed).length;
    const regularTotal = allClimbs.filter(c => c.climbType !== "speed-session" && wasAttempted(c)).length;
    const queuedCount  = allClimbs.filter(c => c.climbType !== "speed-session" && !wasAttempted(c)).length;
    // Compute lap numbers: climbs sharing a climbGroupId or setClimbId get numbered 1,2,3…
    const lapNumbers = {};
    const grouped = {};
    allClimbs.forEach(c => {
      const key = c.climbGroupId ? `g_${c.climbGroupId}` : c.setClimbId ? `s_${c.setClimbId}` : null;
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
    Object.values(grouped).forEach(group => {
      if (group.length <= 1) return;
      group.sort((a, b) => (a.loggedAt || 0) - (b.loggedAt || 0));
      group.forEach((c, i) => { lapNumbers[c.id] = i + 1; });
    });
    // Shared props passed to every ActiveClimbCard
    const cardProps = {
      onEdit: openClimbForm, onStartClimbing: startClimbing, onEndAttempt: endClimbAttempt,
      onUpdateTries: updateActiveClimbTries, onToggleCompleted: toggleActiveClimbCompleted,
      onLogRope: logRopeAttempt, onRemove: removeClimbFromActive, onLightbox: setLightboxPhoto,
      onPauseClimb: pauseClimb, onResumeClimb: resumeClimb, onClimbAgain: climbAgain,
    };
    return (
      <div style={{ padding: "20px" }}>
        {/* Warmup nudge banner */}
        {!showClimbForm && showWarmupNudge && !activeSession?.warmupStartedAt && (
          <div style={{ background: `${W.pinkDark}22`, border: `1.5px solid ${W.pinkDark}55`, borderRadius: 12, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: W.pinkDark }}>Don't forget to warm up!</div>
              <div style={{ fontSize: 11, color: W.textDim, marginTop: 1 }}>Starting cold increases injury risk.</div>
            </div>
            <button onClick={startWarmupSection} style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${W.pinkDark}55`, background: W.pink, color: W.pinkDark, fontWeight: 700, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>Start</button>
            <button onClick={() => setShowWarmupNudge(false)} style={{ background: "transparent", border: "none", color: W.textDim, fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}>×</button>
          </div>
        )}
        {showClimbForm && ClimbFormPanel({ isActiveSession: true, onSave: saveClimbToActiveSession, onCancel: () => { setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); } })}
        {!showClimbForm && boulderAddMode && <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) { setBoulderAddMode(null); setSetPickerSelected(new Set()); } }}>
          <div style={{ background: W.surface, borderRadius: "24px 24px 0 0", maxHeight: "90vh", overflowY: "auto", padding: "0 20px" }}>
        {(() => {
          const location = activeSession?.location;
          const gradeRank = (grade, scale) => { const list = GRADES[scale] || GRADES["V-Scale"]; const idx = list.indexOf(grade); return idx >= 0 ? idx : -1; };
          const gymEntries = (gymSets[location] || []).filter(e => !e.removed && (e.climbType === "boulder" || !e.climbType));
          const inSessionIds = new Set((activeSession?.climbs || []).map(c => c.setClimbId).filter(Boolean));
          const getEntryPhoto = (entryId) => sessions.flatMap(s => (s.climbs||[]).filter(c => c.setClimbId === entryId && c.photo)).map(c => c.photo)[0] || null;
          const getEntryStats = (entry) => {
            const related = sessions.flatMap(s => (s.climbs||[]).filter(c => c.setClimbId === entry.id));
            return { sends: related.filter(c => c.completed).length, attempts: related.reduce((t,c) => t + climbAttempts(c), 0), sessionCount: related.length };
          };
          // Quick add: most attempted boulder in set not already in session
          const quickEntry = gymEntries.filter(e => !inSessionIds.has(e.id)).sort((a, b) => getEntryStats(b).attempts - getEntryStats(a).attempts)[0] || null;
          const quickPhoto = quickEntry ? getEntryPhoto(quickEntry.id) : null;
          const addFromSetSubmit = () => {
            if (setPickerSelected.size === 0) return;
            const toAdd = gymEntries.filter(e => setPickerSelected.has(e.id));
            const newClimbs = toAdd.map(e => ({ id: Date.now() + Math.random(), loggedAt: Date.now(), name: e.name || "", grade: e.grade, scale: e.scale || preferredScale, color: e.color || null, wallTypes: e.wallTypes || [], holdTypes: e.holdTypes || [], section: e.section || null, climbType: "boulder", setClimbId: e.id, tries: 0, falls: 0, takes: 0, completed: false, isProject: false, photo: getEntryPhoto(e.id), projectId: null, comments: "", attemptLog: [], fallLog: [], climbingStartedAt: null, lastAttemptEndedAt: null, pausedWorkedMs: 0, paused: false }));
            setActiveSession(s => {
              const now = Date.now();
              const upd = {};
              if (!s.boulderStartedAt) { upd.boulderStartedAt = now; upd.boulderActiveStart = now; upd.boulderTotalSec = 0; }
              return { ...s, ...upd, climbs: [...(s.climbs || []), ...newClimbs] };
            });
            setSetPickerSelected(new Set());
            setBoulderAddMode(null);
          };
          const closeBoulderAdd = () => { setBoulderAddMode(null); setSetPickerSelected(new Set()); };
          const allStepsVisited = newBoulderVisited.size >= 4;
          const confirmStep = () => {
            if (newBoulderStep < 3) {
              const next = newBoulderStep + 1;
              setNewBoulderStep(next);
              setNewBoulderVisited(prev => { const s = new Set(prev); s.add(next); return s; });
            } else {
              // last step: submit
              const pid = climbForm.projectId || (climbForm.isProject ? `proj_${Date.now()}` : null);
              const setClimbIdVal = Date.now() + 2;
              if (location) {
                const newSetClimb = { id: setClimbIdVal, name: climbForm.name, grade: climbForm.grade, scale: climbForm.scale || preferredScale, color: climbForm.color, wallTypes: climbForm.wallTypes || [], holdTypes: climbForm.holdTypes || [], climbType: "boulder", setDate: new Date().toISOString(), location, removed: false, removedDate: null, section: climbForm.section || null };
                setGymSets(prev => ({ ...prev, [location]: [...(prev[location] || []), newSetClimb] }));
              }
              const newClimb = { id: Date.now(), loggedAt: Date.now(), name: climbForm.name || "", grade: climbForm.grade, scale: climbForm.scale || preferredScale, color: climbForm.color || null, wallTypes: climbForm.wallTypes || [], holdTypes: climbForm.holdTypes || [], section: climbForm.section || null, climbType: "boulder", setClimbId: location ? setClimbIdVal : null, tries: 0, falls: 0, takes: 0, completed: false, isProject: climbForm.isProject || false, projectId: pid, photo: photoPreview || null, comments: climbForm.comments || "", attemptLog: [], fallLog: [], climbingStartedAt: null, lastAttemptEndedAt: null, pausedWorkedMs: 0, paused: false };
              if (climbForm.isProject && pid && !climbForm.projectId) setProjects(prev => [...prev, { id: pid, name: newClimb.name, grade: newClimb.grade, scale: newClimb.scale, climbType: "boulder", comments: "", active: true, completed: false, dateAdded: new Date().toISOString(), dateSent: null }]);
              setActiveSession(s => {
                const now = Date.now();
                const upd = {};
                if (!s.boulderStartedAt) { upd.boulderStartedAt = now; upd.boulderActiveStart = now; upd.boulderTotalSec = 0; }
                return { ...s, ...upd, climbs: [...(s.climbs || []), newClimb] };
              });
              setPhotoPreview(null);
              setBoulderAddMode(null);
            }
          };
          const goToStep = (step) => {
            if (step < 0 || step > 3) return;
            if (step > newBoulderStep && !newBoulderVisited.has(step)) return; // can't skip ahead
            setNewBoulderStep(step);
          };
          // ── LANDING SCREEN ──────────────────────────────────────────
          if (boulderAddMode === "landing") {
            const quickGradeColor = quickEntry ? (GRADE_COLORS[quickEntry.grade] || GRADE_COLORS.default) : null;
            const quickColorEntry = quickEntry ? CLIMB_COLORS.find(c => c.id === quickEntry.color) : null;
            const quickStats = quickEntry ? getEntryStats(quickEntry) : null;
            return (
              <div style={{ padding: "0 0 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 18px" }}>
                  <button onClick={closeBoulderAdd} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>←</button>
                  <div style={{ fontWeight: 900, fontSize: 20, color: W.text }}>Add Boulder</div>
                </div>
                {/* Add from Current Set — tall green */}
                <button onClick={() => location ? setBoulderAddMode("set-picker") : null} style={{ width: "100%", marginBottom: 14, background: location ? `linear-gradient(135deg, #16a34a, #166534)` : W.surface2, border: location ? "2px solid #15803d" : `2px solid ${W.border}`, borderRadius: 20, cursor: location ? "pointer" : "default", padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 200, textAlign: "left", opacity: location ? 1 : 0.7 }}>
                  <div style={{ padding: "22px 24px 12px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 34 }}>🏟️</span>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 22, color: location ? "#fff" : W.text, letterSpacing: 0.3 }}>Add from Current Set</div>
                      <div style={{ fontSize: 13, color: location ? "rgba(255,255,255,0.75)" : W.textMuted, marginTop: 2 }}>{location ? `${gymEntries.length} climbs in set at ${location}` : "Set a session location first"}</div>
                    </div>
                  </div>
                  {quickEntry ? (
                    <div style={{ margin: "0 16px 16px", borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,0.25)", border: "1.5px solid rgba(255,255,255,0.2)", position: "relative", height: 100 }}>
                      {quickPhoto && <img src={quickPhoto} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 100%)" }} />
                      <div style={{ position: "absolute", inset: 0, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ background: quickGradeColor, color: "#fff", borderRadius: 8, padding: "4px 10px", fontWeight: 900, fontSize: 18, flexShrink: 0 }}>{quickEntry.grade}</div>
                        {quickColorEntry && <div style={{ width: 14, height: 14, borderRadius: "50%", background: quickColorEntry.hex, border: "2px solid rgba(255,255,255,0.9)", flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {quickEntry.name && <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{quickEntry.name}</div>}
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>{quickStats.attempts} attempts · quick add ⚡</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ margin: "0 16px 16px", padding: "12px 14px", borderRadius: 12, background: "rgba(0,0,0,0.2)", border: "1.5px dashed rgba(255,255,255,0.25)" }}>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>{gymEntries.length === 0 ? "No gym set at this location" : "All set climbs already added"}</div>
                    </div>
                  )}
                </button>
                {/* Create New Boulder — blue/accent */}
                <button onClick={() => {
                  // pre-fill grade from median of current gym set (improvement 3)
                  if (gymEntries.length > 0) {
                    const sorted = [...gymEntries].sort((a, b) => gradeRank(a.grade, a.scale) - gradeRank(b.grade, b.scale));
                    const medianGrade = sorted[Math.floor(sorted.length / 2)]?.grade;
                    if (medianGrade) setClimbForm(f => ({ ...f, grade: medianGrade }));
                  }
                  setNewBoulderStep(0); setNewBoulderVisited(new Set([0])); setBoulderAddMode("new-boulder");
                }} style={{ width: "100%", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: `2px solid ${W.accentDark}`, borderRadius: 20, cursor: "pointer", padding: "22px 24px", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                  <span style={{ fontSize: 34 }}>✏️</span>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: "#fff", letterSpacing: 0.3 }}>Create New Boulder</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>Name, grade, color, section & more</div>
                  </div>
                </button>
              </div>
            );
          }
          // ── SET PICKER SCREEN ──────────────────────────────────────
          if (boulderAddMode === "set-picker") {
            const sections = [...new Set(gymEntries.map(e => e.section || ""))];
            const sectionGroups = {};
            gymEntries.forEach(e => {
              const sec = e.section || "";
              if (!sectionGroups[sec]) sectionGroups[sec] = [];
              sectionGroups[sec].push(e);
            });
            return (
              <div style={{ padding: "0 0 100px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 18px" }}>
                  <button onClick={() => setBoulderAddMode("landing")} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>←</button>
                  <div style={{ fontWeight: 900, fontSize: 20, color: W.text, flex: 1 }}>Add from Set</div>
                  {setPickerSelected.size > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: W.accent }}>{setPickerSelected.size} selected</div>}
                </div>
                {gymEntries.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "40px 0", fontSize: 14 }}>No climbs in set at {location || "this gym"}</div>}
                {sections.map(sec => (
                  <div key={sec} style={{ marginBottom: 18 }}>
                    {sec && <div style={{ fontSize: 11, fontWeight: 800, color: W.accent, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>📌 {sec}</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(sectionGroups[sec] || []).sort((a, b) => gradeRank(b.grade, b.scale) - gradeRank(a.grade, a.scale)).map(entry => {
                        const gradeColor = GRADE_COLORS[entry.grade] || GRADE_COLORS.default;
                        const colorEntry = CLIMB_COLORS.find(c => c.id === entry.color);
                        const photo = getEntryPhoto(entry.id);
                        const st = getEntryStats(entry);
                        const hasSends = st.sends > 0;
                        const alreadyIn = inSessionIds.has(entry.id);
                        const isSel = setPickerSelected.has(entry.id);
                        const ago = (() => { if (!entry.setDate) return null; const d = Math.floor((Date.now()-new Date(entry.setDate))/86400000); if (d===0) return "Today"; if (d===1) return "1d"; if (d<7) return `${d}d`; if (d<30) return `${Math.floor(d/7)}w`; return `${Math.floor(d/30)}mo`; })();
                        return (
                          <div key={entry.id} onClick={() => { if (alreadyIn) return; setSetPickerSelected(prev => { const s = new Set(prev); if (s.has(entry.id)) s.delete(entry.id); else s.add(entry.id); return s; }); }} style={{ border: `1.5px solid ${isSel ? W.accent : alreadyIn ? W.border + "88" : W.border}`, borderRadius: 16, overflow: "hidden", cursor: alreadyIn ? "default" : "pointer", position: "relative", minHeight: 180, background: photo ? "transparent" : W.surface, opacity: alreadyIn ? 0.4 : 1 }}>
                            {photo ? <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${gradeColor}18, ${W.surface2})` }} />}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: photo ? "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" : `linear-gradient(to top, ${W.surface}cc 0%, transparent 100%)`, zIndex: 1 }} />
                            <div style={{ position: "absolute", top: 8, left: 8, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, background: hasSends ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)", color: hasSends ? "#14532d" : "#7f1d1d", zIndex: 2 }}>{hasSends ? "✓" : "✗"}</div>
                            <div style={{ position: "absolute", top: 8, right: 8, maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, zIndex: 2 }}>
                              {entry.name && <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{entry.name}</div>}
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ background: gradeColor, color: "#fff", borderRadius: 6, padding: "2px 7px", fontWeight: 900, fontSize: 12 }}>{entry.grade}</div>
                                {colorEntry && <div style={{ width: 13, height: 13, borderRadius: "50%", background: colorEntry.hex, border: "1.5px solid rgba(255,255,255,0.85)", flexShrink: 0 }} />}
                              </div>
                            </div>
                            {isSel && <div style={{ position: "absolute", inset: 0, zIndex: 3, border: `3px solid ${W.accent}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${W.accent}33` }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 900 }}>✓</div></div>}
                            {alreadyIn && <div style={{ position: "absolute", inset: 0, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ background: "rgba(0,0,0,0.5)", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Already added</div></div>}
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "6px 4px 4px" }}>
                              <div style={{ display: "flex", justifyContent: "space-around" }}>
                                {[{ val: st.sends, label: "Sends", hi: hasSends }, { val: st.attempts, label: "Att." }, { val: st.sessionCount, label: "Sess." }].map((s, i) => (
                                  <div key={i} style={{ textAlign: "center", background: "rgba(0,0,0,0.35)", borderRadius: 6, padding: "3px 5px", minWidth: 34 }}>
                                    <div style={{ fontWeight: 900, fontSize: 13, color: s.hi ? "#86efac" : "#fff", lineHeight: 1 }}>{s.val}</div>
                                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>{s.label}</div>
                                  </div>
                                ))}
                              </div>
                              {ago && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 3 }}>Set {ago}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {setPickerSelected.size > 0 && (
                  <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px 20px", background: W.surface, borderTop: `1px solid ${W.border}`, zIndex: 500 }}>
                    <button onClick={addFromSetSubmit} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontWeight: 900, fontSize: 17, cursor: "pointer", boxShadow: `0 6px 24px ${W.accentGlow}` }}>Add {setPickerSelected.size} Boulder{setPickerSelected.size > 1 ? "s" : ""} to Session</button>
                  </div>
                )}
              </div>
            );
          }
          // ── MULTI-STEP NEW BOULDER FORM ───────────────────────────
          if (boulderAddMode === "new-boulder") {
            const stepLabels = ["Name & Photo", "Color & Grade", "Wall Section", "Wall Details"];
            const loc = location || null;
            const wallSections = (loc && gymScales[loc]?.wallSections) || [];
            const gradeList = GRADES[climbForm.scale] || GRADES["V-Scale"] || [];
            const canGoRight = newBoulderVisited.has(newBoulderStep + 1) || newBoulderStep === 3;
            const touchHandlers = {
              onTouchStart: e => { e.currentTarget._swX = e.touches[0].clientX; },
              onTouchEnd: e => {
                const dx = e.changedTouches[0].clientX - (e.currentTarget._swX || 0);
                if (dx < -50 && newBoulderStep < 3 && newBoulderVisited.has(newBoulderStep + 1)) setNewBoulderStep(s => s + 1);
                else if (dx > 50 && newBoulderStep > 0) setNewBoulderStep(s => s - 1);
              },
            };
            const fileInputId = "boulder-step-photo";
            const stepContent = (() => {
              if (newBoulderStep === 0) return (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Photo (optional)</div>
                  <div style={{ position: "relative" }}>
                    <label htmlFor={fileInputId} style={{ display: "block", cursor: photoPreview ? "default" : "pointer" }}>
                      <div style={{ width: "100%", height: 200, borderRadius: 16, overflow: "hidden", border: photoPreview ? "none" : `2px dashed ${W.border}`, background: W.surface2, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {photoPreview ? <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ textAlign: "center", color: W.textDim }}><div style={{ fontSize: 36, marginBottom: 6 }}>📷</div><div style={{ fontSize: 13, fontWeight: 600 }}>Tap to add photo</div></div>}
                      </div>
                    </label>
                    {photoPreview && <button onClick={e => { e.stopPropagation(); setPhotoPreview(null); }} style={{ position: "absolute", top: 8, left: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, zIndex: 10 }}>✕</button>}
                  </div>
                  <input id={fileInputId} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => { const img = new Image(); img.onload = () => { const maxD = 900; const sc = Math.min(1, maxD / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = img.width * sc; c.height = img.height * sc; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); setPhotoPreview(c.toDataURL("image/jpeg", 0.75)); }; img.src = ev.target.result; }; r.readAsDataURL(f); e.target.value = ""; }} />
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: 18, marginBottom: 8 }}>Climb Name (optional)</div>
                  <input value={climbForm.name || ""} onChange={e => setClimbForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. The Crimp Problem…" style={{ width: "100%", boxSizing: "border-box", padding: "14px 16px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.text, fontSize: 16, fontWeight: 600, outline: "none" }} />
                </div>
              );
              if (newBoulderStep === 1) return (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Hold Color</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
                    {CLIMB_COLORS.map(cc => (
                      <button key={cc.id} onClick={() => setClimbForm(f => ({ ...f, color: f.color === cc.id ? null : cc.id }))} style={{ width: 44, height: 44, borderRadius: 12, background: cc.hex, border: `3px solid ${climbForm.color === cc.id ? W.text : "transparent"}`, cursor: "pointer", boxShadow: climbForm.color === cc.id ? "0 0 0 2px " + W.accent : "none", flexShrink: 0 }} title={cc.label} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Grade</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {gradeList.map(g => { const gc = GRADE_COLORS[g] || GRADE_COLORS.default; const sel = climbForm.grade === g; return <button key={g} onClick={() => setClimbForm(f => ({ ...f, grade: g }))} style={{ padding: "8px 14px", borderRadius: 10, border: `2px solid ${sel ? gc : W.border}`, background: sel ? gc : "transparent", color: sel ? "#fff" : W.text, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{g}</button>; })}
                  </div>
                </div>
              );
              if (newBoulderStep === 2) return (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Wall Section</div>
                  {wallSections.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      {wallSections.map(sec => { const sel = climbForm.section === sec; return <button key={sec} onClick={() => setClimbForm(f => ({ ...f, section: f.section === sec ? null : sec }))} style={{ padding: "10px 16px", borderRadius: 12, border: `2px solid ${sel ? W.accent : W.border}`, background: sel ? W.accent + "22" : W.surface2, color: sel ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{sec}</button>; })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, color: W.textDim, marginBottom: 14 }}>No sections configured for this gym. Type one below or skip.</div>
                  )}
                </div>
              );
              if (newBoulderStep === 3) return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Wall Type</div>
                    <span style={{ fontSize: 11, color: W.textDim, fontStyle: "italic" }}>(optional)</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 22 }}>
                    {WALL_TYPES.map(wt => { const sel = (climbForm.wallTypes || []).includes(wt); return <button key={wt} onClick={() => setClimbForm(f => ({ ...f, wallTypes: sel ? f.wallTypes.filter(x => x !== wt) : [...(f.wallTypes||[]), wt] }))} style={{ padding: "9px 16px", borderRadius: 12, border: `2px solid ${sel ? W.accent : W.border}`, background: sel ? W.accent + "22" : W.surface2, color: sel ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{wt}</button>; })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Hold Types</div>
                    <span style={{ fontSize: 11, color: W.textDim, fontStyle: "italic" }}>(optional)</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {HOLD_TYPES.map(ht => { const sel = (climbForm.holdTypes || []).includes(ht); return <button key={ht} onClick={() => setClimbForm(f => ({ ...f, holdTypes: sel ? f.holdTypes.filter(x => x !== ht) : [...(f.holdTypes||[]), ht] }))} style={{ padding: "9px 16px", borderRadius: 12, border: `2px solid ${sel ? W.accent : W.border}`, background: sel ? W.accent + "22" : W.surface2, color: sel ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{ht}</button>; })}
                  </div>
                </div>
              );
              return null;
            })();
            return (
              <div style={{ padding: "0 0 20px" }} {...touchHandlers}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 18px" }}>
                  <button onClick={() => newBoulderStep > 0 ? setNewBoulderStep(s => s - 1) : setBoulderAddMode("landing")} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>←</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 18, color: W.text }}>{stepLabels[newBoulderStep]}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                      {[0,1,2,3].map(i => <div key={i} style={{ width: i === newBoulderStep ? 18 : 8, height: 8, borderRadius: 4, background: i === newBoulderStep ? W.accent : newBoulderVisited.has(i) ? W.accent + "66" : W.border, transition: "all 0.2s" }} />)}
                    </div>
                  </div>
                  {newBoulderStep < 3 && newBoulderVisited.has(newBoulderStep + 1) && (
                    <button onClick={() => setNewBoulderStep(s => s + 1)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>→</button>
                  )}
                </div>
                {/* Step content */}
                <div style={{ marginBottom: 20 }}>{stepContent}</div>
                {/* Confirm button (not on last step) */}
                {newBoulderStep < 3 && (
                  <button onClick={confirmStep} style={{ display: "block", marginLeft: "auto", padding: "10px 22px", background: W.surface2, border: `2px solid ${W.accent}`, borderRadius: 12, color: W.accent, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Confirm →</button>
                )}
                {/* Big submit — shown on all pages once all visited, or on last page always */}
                {(newBoulderStep === 3 || allStepsVisited) && (
                  <button onClick={confirmStep} style={{ width: "100%", marginTop: 16, padding: "17px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontWeight: 900, fontSize: 17, cursor: "pointer", boxShadow: `0 6px 24px ${W.accentGlow}` }}>Add Boulder to Session</button>
                )}
              </div>
            );
          }
          return null;
        })()}
          </div>
        </div>}

        {/* ══ TRAINING ROUTINE PICKER (top-level, works regardless of section visibility) ══ */}
        {!showClimbForm && trainingPickerType && (() => {
          const isWarmup = trainingPickerType === "warmup";
          const isWorkout = trainingPickerType === "workout";
          const isFb = trainingPickerType === "fingerboard";
          const routines = isWarmup ? warmupTemplates : isWorkout ? workoutRoutines : fingerboardRoutines;
          const accentC = isWarmup ? W.pinkDark : isWorkout ? W.accentDark : W.yellowDark;
          const bgC = isWarmup ? W.pink : isWorkout ? `${W.accent}22` : W.yellow;
          const label = isWarmup ? "Warm Up" : isWorkout ? "Workout" : "Fingerboard";
          const alreadyStarted = isWarmup ? !!activeSession?.warmupStartedAt : isWorkout ? !!activeSession?.workoutStartedAt : !!activeSession?.fingerboardStartedAt;
          const handleRoutineSelect = (routine) => {
            const items = (routine?.items || []).map(item => ({ ...item, id: Date.now() + Math.random(), checked: false }));
            if (!alreadyStarted) {
              if (isWarmup) {
                setActiveSession(s => {
                  const now = Date.now(), upd = {};
                  if (s.boulderActiveStart) { upd.boulderTotalSec = (s.boulderTotalSec||0)+Math.max(0,Math.floor((now-s.boulderActiveStart)/1000)); upd.boulderActiveStart=null; upd.boulderPausedAt=now; }
                  if (s.ropeActiveStart)    { upd.ropeTotalSec    = (s.ropeTotalSec   ||0)+Math.max(0,Math.floor((now-s.ropeActiveStart)   /1000)); upd.ropeActiveStart   =null; upd.ropePausedAt   =now; }
                  return { ...s, ...upd, warmupStartedAt: now, warmupActiveStart: now, warmupTotalSec: 0, warmupPausedAt: null, warmupEndedAt: null, warmupChecklist: items };
                });
              } else if (isWorkout) {
                setActiveSession(s => {
                  const now = Date.now(), upd = {};
                  if (s.boulderActiveStart)     { upd.boulderTotalSec=(s.boulderTotalSec||0)+Math.max(0,Math.floor((now-s.boulderActiveStart)/1000)); upd.boulderActiveStart=null; upd.boulderPausedAt=now; }
                  if (s.ropeActiveStart)        { upd.ropeTotalSec=(s.ropeTotalSec||0)+Math.max(0,Math.floor((now-s.ropeActiveStart)/1000)); upd.ropeActiveStart=null; upd.ropePausedAt=now; }
                  if (s.warmupActiveStart)      { upd.warmupTotalSec=(s.warmupTotalSec||0)+Math.max(0,Math.floor((now-s.warmupActiveStart)/1000)); upd.warmupActiveStart=null; upd.warmupPausedAt=now; }
                  if (s.fingerboardActiveStart) { upd.fingerboardTotalSec=(s.fingerboardTotalSec||0)+Math.max(0,Math.floor((now-s.fingerboardActiveStart)/1000)); upd.fingerboardActiveStart=null; upd.fingerboardPausedAt=now; }
                  return { ...s, ...upd, workoutStartedAt: now, workoutActiveStart: now, workoutTotalSec: 0, workoutPausedAt: null, workoutEndedAt: null, workoutChecklist: items };
                });
              } else {
                setActiveSession(s => {
                  const now = Date.now(), upd = {};
                  if (s.boulderActiveStart)  { upd.boulderTotalSec=(s.boulderTotalSec||0)+Math.max(0,Math.floor((now-s.boulderActiveStart)/1000)); upd.boulderActiveStart=null; upd.boulderPausedAt=now; }
                  if (s.ropeActiveStart)     { upd.ropeTotalSec=(s.ropeTotalSec||0)+Math.max(0,Math.floor((now-s.ropeActiveStart)/1000)); upd.ropeActiveStart=null; upd.ropePausedAt=now; }
                  if (s.warmupActiveStart)   { upd.warmupTotalSec=(s.warmupTotalSec||0)+Math.max(0,Math.floor((now-s.warmupActiveStart)/1000)); upd.warmupActiveStart=null; upd.warmupPausedAt=now; }
                  if (s.workoutActiveStart)  { upd.workoutTotalSec=(s.workoutTotalSec||0)+Math.max(0,Math.floor((now-s.workoutActiveStart)/1000)); upd.workoutActiveStart=null; upd.workoutPausedAt=now; }
                  return { ...s, ...upd, fingerboardStartedAt: now, fingerboardActiveStart: now, fingerboardTotalSec: 0, fingerboardPausedAt: null, fingerboardEndedAt: null, fingerboardChecklist: items };
                });
              }
            } else {
              const key = isWarmup ? "warmupChecklist" : isWorkout ? "workoutChecklist" : "fingerboardChecklist";
              setActiveSession(s => ({ ...s, [key]: [...(s[key] || []), ...items] }));
            }
            setTrainingPickerType(null);
          };
          return (
            <div style={{ marginBottom: 14, background: W.surface, border: `2px solid ${accentC}44`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>{label} Routines</div>
                <button onClick={() => setTrainingPickerType(null)} style={{ background: "none", border: "none", color: W.textDim, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
              </div>
              {routines.length === 0 && <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "12px 0" }}>No {label.toLowerCase()} routines yet. Add one in Settings.</div>}
              {routines.map(r => (
                <div key={r.id} onClick={() => handleRoutineSelect(r)} style={{ background: W.surface2, border: `1px solid ${accentC}33`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{r.name}</div>
                  {r.description && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{r.description}</div>}
                  <div style={{ fontSize: 11, color: accentC, marginTop: 4, fontWeight: 600 }}>{(r.items || []).length} tasks {alreadyStarted ? "· tap to add to session" : "· tap to start"}</div>
                </div>
              ))}
              {!alreadyStarted && (
                <button onClick={() => handleRoutineSelect(null)} style={{ width: "100%", padding: "10px", background: bgC, border: `1.5px solid ${accentC}44`, borderRadius: 10, color: accentC, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 4 }}>Start Empty</button>
              )}
            </div>
          );
        })()}

        {/* ══ WARMUP SECTION (standalone — active, shown before climbing) ═══ */}
        {!showClimbForm && activeSession?.warmupStartedAt && !activeSession?.warmupEndedAt && (() => {
          const ws = activeSession;
          const isActive = !!ws.warmupActiveStart;
          const isEnded  = !!ws.warmupEndedAt;
          const totalSec = (ws.warmupTotalSec || 0) + (isActive ? Math.max(0, Math.floor((Date.now() - ws.warmupActiveStart) / 1000)) : 0);
          const checklist = ws.warmupChecklist || [];
          const doneCount = checklist.filter(i => i.checked).length;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 14, border: `2px solid ${W.pinkDark}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
                <div style={{ background: W.pink, padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ fontWeight: 800, color: W.pinkDark, fontSize: 18 }}>🔥 Warm Up</div>
                      {isActive && <span style={{ background: `${W.pinkDark}33`, color: W.pinkDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
                      {!isActive && totalSec > 0 && <span style={{ background: `${W.pinkDark}22`, color: W.pinkDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button onClick={() => setTrainingPickerType("warmup")} style={{ background: "none", border: `1px solid ${W.pinkDark}44`, borderRadius: 7, color: W.pinkDark, fontSize: 11, cursor: "pointer", padding: "3px 8px", lineHeight: 1, fontWeight: 700 }}>+ Routine</button>
                      <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), warmup: !s.collapsedSections?.warmup } }))} style={{ background: "none", border: `1px solid ${W.pinkDark}44`, borderRadius: 7, color: W.pinkDark, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>{activeSession.collapsedSections?.warmup ? "▼" : "▲"}</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: W.pinkDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1, marginBottom: 8 }}>{formatDuration(totalSec)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${W.pinkDark}33`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%`, background: W.pinkDark, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: W.pinkDark, flexShrink: 0 }}>{doneCount}/{checklist.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {isActive
                      ? <button onClick={pauseWarmupSession}  style={{ background: W.pinkDark, border: "none", color: W.pink, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Pause</button>
                      : <button onClick={resumeWarmupSession} style={{ background: W.pinkDark, border: "none", color: W.pink, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Resume</button>
                    }
                    {doneCount < checklist.length && <button onClick={completeAllWarmupItems} style={{ background: `${W.pinkDark}33`, border: `1px solid ${W.pinkDark}44`, color: W.pinkDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>✓ All</button>}
                    <button onClick={endWarmupSection} style={{ background: `${W.pinkDark}22`, border: `1px solid ${W.pinkDark}44`, color: W.pinkDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Done</button>
                  </div>
                </div>
              </div>
              {!activeSession.collapsedSections?.warmup && <div style={{ borderLeft: `3px solid ${W.pinkDark}44`, paddingLeft: 10, marginLeft: 2 }}>
                {checklist.map(item => {
                  const restRemain = routineRestTimer?.itemId === item.id ? Math.max(0, Math.ceil((routineRestTimer.endsAt - Date.now()) / 1000)) : 0;
                  return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 6, background: item.checked ? W.pink : W.surface2, border: `1px solid ${item.checked ? W.pinkDark + "44" : W.border}`, borderRadius: 10, cursor: "pointer" }}
                    onClick={() => toggleWarmupItem(item.id)}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.checked ? W.pinkDark : W.border}`, background: item.checked ? W.pinkDark : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.checked && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: item.checked ? W.pinkDark : W.text, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
                      {item.detail && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{item.detail}</div>}
                      {restRemain > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: W.pinkDark, marginTop: 2 }}>⏱ Rest: {restRemain}s</div>}
                    </div>
                    {item.restDuration > 0 && !restRemain && <span style={{ fontSize: 10, color: W.textMuted, fontWeight: 600 }}>{item.restDuration}s rest</span>}
                    <button onClick={e => { e.stopPropagation(); removeWarmupItem(item.id); }} style={{ background: "transparent", border: "none", color: W.textDim, fontSize: 15, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
                  </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <input value={warmupNewItemText} onChange={e => setWarmupNewItemText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && warmupNewItemText.trim()) { addWarmupItem(warmupNewItemText.trim()); setWarmupNewItemText(""); } }}
                    placeholder="Add a warmup task…" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
                  <button onClick={() => { if (warmupNewItemText.trim()) { addWarmupItem(warmupNewItemText.trim()); setWarmupNewItemText(""); } }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${W.pinkDark}55`, background: W.pink, color: W.pinkDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
                </div>
              </div>}
            </div>
          );
        })()}

        {/* ══ CLIMBING SECTION ══════════════════════════════════════ */}
        {!showClimbForm && hasClimbing && (() => {
          const isCollapsed = !!activeSession?.collapsedSections?.climbingSection;
          const climbTotalSec = (() => {
            let t = (activeSession?.boulderTotalSec || 0) + (activeSession?.ropeTotalSec || 0);
            if (activeSession?.boulderActiveStart) t += Math.max(0, Math.floor((Date.now() - activeSession.boulderActiveStart) / 1000));
            if (activeSession?.ropeActiveStart) t += Math.max(0, Math.floor((Date.now() - activeSession.ropeActiveStart) / 1000));
            speedSessions.forEach(ss => {
              t += ss.totalSec || 0;
              if (ss.activeStart && !ss.endedAt) t += Math.max(0, Math.floor((Date.now() - ss.activeStart) / 1000));
            });
            return t;
          })();
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 16, border: `2px solid ${W.accentDark}55`, marginBottom: isCollapsed ? 0 : 12, overflow: "hidden", background: W.surface }}>
                <div style={{ background: `${W.accent}22`, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, color: W.accent, fontSize: 22, letterSpacing: 0.5, marginBottom: 3 }}>Climbing</div>
                      <div style={{ fontSize: 36, fontWeight: 900, color: W.accent, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1 }}>{formatDuration(climbTotalSec)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, marginTop: 2 }}>
                      <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), climbingSection: !s.collapsedSections?.climbingSection } }))} style={{ background: "none", border: `1px solid ${W.accentDark}44`, borderRadius: 8, color: W.accent, fontSize: 15, cursor: "pointer", padding: "4px 10px", lineHeight: 1 }}>{isCollapsed ? "▼" : "▲"}</button>
                      {hasAnyClimbActivity && (
                        <button ref={el => { if (el) el._climbDropBtn = true; }} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setShowClimbTypeDropdown(v => v ? false : { top: r.bottom + 4, right: window.innerWidth - r.right }); }} style={{ background: showClimbTypeDropdown ? W.accent : "none", border: `1px solid ${W.accentDark}44`, borderRadius: 8, color: showClimbTypeDropdown ? "#fff" : W.accent, fontSize: 18, fontWeight: 900, cursor: "pointer", padding: "2px 10px", lineHeight: 1 }}>+</button>
                      )}
                    </div>
                  </div>
                  {(regularTotal > 0 || queuedCount > 0) && <div style={{ fontSize: 12, color: W.textMuted, fontWeight: 600, marginBottom: 10 }}>{regularTotal > 0 ? `${regularSends} sends · ${regularTotal} climbs` : "no attempts yet"}{queuedCount > 0 ? <span style={{ color: W.textDim, fontWeight: 500 }}> · {queuedCount} queued</span> : ""}{speedSessions.length > 0 ? ` · ${speedSessions.reduce((t, s) => t + (s.attempts||[]).length, 0)} speed attempts` : ""}</div>}
                  {!hasAnyClimbActivity && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                      {[
                        { id: "boulder", label: "Bouldering", icon: "🪨", bg: W.green,  tc: W.greenDark,  fn: openBoulderAdd },
                        { id: "rope",    label: "Rope",        icon: "🪢", bg: W.purple, tc: W.purpleDark, fn: () => openClimbForm(null, null, "rope") },
                        { id: "speed",   label: "Speed",       icon: "⚡", bg: W.yellow, tc: W.yellowDark, fn: addSpeedSession },
                        { id: "warmup",  label: "Warm Up",     icon: "🔥", bg: W.pink,   tc: W.pinkDark,   fn: startWarmupSection, disabled: !!activeSession?.warmupStartedAt },
                      ].map(opt => (
                        <button key={opt.id} onClick={opt.disabled ? undefined : opt.fn} style={{ padding: "16px 10px", background: opt.disabled ? W.surface2 : opt.bg, border: `1.5px solid ${opt.disabled ? W.border : opt.tc}`, borderRadius: 14, cursor: opt.disabled ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: opt.disabled ? 0.45 : 1 }}>
                          <span style={{ fontSize: 26 }}>{opt.icon}</span>
                          <span style={{ fontWeight: 800, fontSize: 12, color: opt.disabled ? W.textDim : opt.tc }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Climb-type dropdown — rendered fixed so it escapes overflow:hidden */}
              {showClimbTypeDropdown && (() => {
                const dropOpts = [
                  { id: "boulder", label: "Bouldering", icon: "🪨", tc: W.greenDark,  fn: openBoulderAdd,                        hide: !!activeSession?.boulderStartedAt },
                  { id: "rope",    label: "Rope",        icon: "🪢", tc: W.purpleDark, fn: () => openClimbForm(null, null, "rope"), hide: !!activeSession?.ropeStartedAt },
                  { id: "speed",   label: "Speed",       icon: "⚡", tc: W.yellowDark, fn: addSpeedSession,                        hide: false },
                  { id: "warmup",  label: "Warm Up",     icon: "🔥", tc: W.pinkDark,   fn: startWarmupSection,                    hide: !!activeSession?.warmupStartedAt },
                ].filter(o => !o.hide);
                if (dropOpts.length === 0) return null;
                return (
                  <>
                    <div onClick={() => setShowClimbTypeDropdown(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
                    <div style={{ position: "fixed", top: showClimbTypeDropdown.top, right: showClimbTypeDropdown.right, zIndex: 300, background: W.surface, border: `1.5px solid ${W.accentDark}44`, borderRadius: 14, overflow: "hidden", minWidth: 170, boxShadow: `0 4px 20px rgba(0,0,0,0.22)` }}>
                      {dropOpts.map((opt, i) => (
                        <button key={opt.id} onClick={() => { opt.fn(); setShowClimbTypeDropdown(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "transparent", border: "none", borderBottom: i < dropOpts.length - 1 ? `1px solid ${W.border}` : "none", cursor: "pointer", textAlign: "left" }}>
                          <span style={{ fontSize: 18 }}>{opt.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 14, color: opt.tc }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
              {!isCollapsed && (
                <div>
                  {/* Sections sorted by start time — most recently added first */}
                  {[
                    activeSession?.boulderStartedAt ? { key: "boulder", t: activeSession.boulderStartedAt } : null,
                    activeSession?.ropeStartedAt    ? { key: "rope",    t: activeSession.ropeStartedAt    } : null,
                    speedSessions.length > 0        ? { key: "speed",   t: speedSessions[0].loggedAt || speedSessions[0].id } : null,
                  ].filter(Boolean).sort((a, b) => b.t - a.t).map(({ key }) => {
                    if (key === "boulder") return (
                      <div key="boulder" ref={boulderListRef} style={{ marginBottom: 16 }}>
                        <BoulderRopeSessionCard type="boulder" totalSec={activeSession.boulderTotalSec || 0} activeStart={activeSession.boulderActiveStart || null} isEnded={!!activeSession.boulderEndedAt} tick={sessionTimer} onPause={pauseBoulderSession} onResume={resumeBoulderSession} pausedAt={activeSession.boulderPausedAt || null} collapsed={!!activeSession.collapsedSections?.boulder} onToggleCollapse={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), boulder: !s.collapsedSections?.boulder } }))} />
                        {!activeSession.collapsedSections?.boulder && (
                          <div style={{ borderLeft: `3px solid ${W.greenDark}44`, paddingLeft: 10, marginLeft: 2 }}>
                            {boulderClimbs.filter(c => !c.completed).sort((a, b) => {
                                if (!!a.climbingStartedAt !== !!b.climbingStartedAt) return a.climbingStartedAt ? -1 : 1;
                                if (!wasAttempted(a) && !wasAttempted(b)) return 0;
                                if (!wasAttempted(a)) return 1;
                                if (!wasAttempted(b)) return -1;
                                return (b.lastAttemptEndedAt || 0) - (a.lastAttemptEndedAt || 0);
                              }).map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} onStartClimbing={id => { startClimbing(id); setTimeout(() => boulderListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }} sessionCount={c.projectId ? getProjectHistory(c.projectId).length + 1 : null} lapNumber={lapNumbers[c.id] || null} />)}
                            {!activeSession.boulderEndedAt && (
                              <button onClick={openBoulderAdd} style={{ width: "100%", padding: "10px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 12, color: W.greenDark, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 2 }}>+ Boulder Climb</button>
                            )}
                            {boulderClimbs.filter(c => c.completed).length > 0 && (
                              <>
                                <button onClick={() => setShowSentBoulders(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, background: W.green + "33", border: `1px solid ${W.greenDark}44`, borderRadius: 10, color: W.greenDark, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                  <span>✓ Sent ({boulderClimbs.filter(c => c.completed).length})</span>
                                  <span>{showSentBoulders ? "▲" : "▼"}</span>
                                </button>
                                {showSentBoulders && boulderClimbs.filter(c => c.completed).map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} sessionCount={c.projectId ? getProjectHistory(c.projectId).length + 1 : null} lapNumber={lapNumbers[c.id] || null} />)}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                    if (key === "rope") return (
                      <div key="rope" style={{ marginBottom: 16 }}>
                        <BoulderRopeSessionCard type="rope" totalSec={activeSession.ropeTotalSec || 0} activeStart={activeSession.ropeActiveStart || null} isEnded={!!activeSession.ropeEndedAt} tick={sessionTimer} onPause={pauseRopeSession} onResume={resumeRopeSession} pausedAt={activeSession.ropePausedAt || null} collapsed={!!activeSession.collapsedSections?.rope} onToggleCollapse={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), rope: !s.collapsedSections?.rope } }))} />
                        {!activeSession.collapsedSections?.rope && (
                          <div style={{ borderLeft: `3px solid ${W.purpleDark}44`, paddingLeft: 10, marginLeft: 2 }}>
                            {ropeClimbs.filter(c => !c.completed).map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} sessionCount={c.projectId ? getProjectHistory(c.projectId).length + 1 : null} lapNumber={lapNumbers[c.id] || null} />)}
                            {!activeSession.ropeEndedAt && (
                              <button onClick={() => openClimbForm(null, null, "rope")} style={{ width: "100%", padding: "10px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 12, color: W.purpleDark, fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 2 }}>+ Rope Climb</button>
                            )}
                            {ropeClimbs.filter(c => c.completed).length > 0 && (
                              <>
                                <button onClick={() => setShowSentRope(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", marginTop: 6, background: W.purple + "33", border: `1px solid ${W.purpleDark}44`, borderRadius: 10, color: W.purpleDark, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                  <span>✓ Sent ({ropeClimbs.filter(c => c.completed).length})</span>
                                  <span>{showSentRope ? "▲" : "▼"}</span>
                                </button>
                                {showSentRope && ropeClimbs.filter(c => c.completed).map(c => <ActiveClimbCard key={c.id} climb={c} {...cardProps} sessionCount={c.projectId ? getProjectHistory(c.projectId).length + 1 : null} lapNumber={lapNumbers[c.id] || null} />)}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                    if (key === "speed") return (
                      <div key="speed">
                        {speedSessions.map((c, i) => <SpeedSessionCard key={c.id} climb={c} tick={sessionTimer} index={i} totalCount={speedSessions.length} onAddAttempt={a => addSpeedAttempt(c.id, a)} onRemove={() => removeSpeedSession(c.id)} onEnd={() => endSpeedSession(c.id)} onPause={() => pauseSpeedSession(c.id)} onResume={() => resumeSpeedSession(c.id)} />)}
                      </div>
                    );
                    return null;
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ TRAINING SECTION ══════════════════════════════════════ */}
        {!showClimbForm && hasFitness && (() => {
          const orangeColor = "#f97316";
          const isCollapsedT = !!activeSession?.collapsedSections?.trainingSection;
          const trainTotalSec = (() => {
            let t = (activeSession?.workoutTotalSec || 0) + (activeSession?.fingerboardTotalSec || 0);
            if (activeSession?.workoutActiveStart) t += Math.max(0, Math.floor((Date.now() - activeSession.workoutActiveStart) / 1000));
            if (activeSession?.fingerboardActiveStart) t += Math.max(0, Math.floor((Date.now() - activeSession.fingerboardActiveStart) / 1000));
            (activeSession?.fitnessSections || []).forEach(sec => {
              if (sec.startedAt) t += Math.max(0, Math.floor(((sec.endedAt || Date.now()) - sec.startedAt) / 1000));
            });
            return t;
          })();
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 16, border: `2px solid ${orangeColor}55`, marginBottom: isCollapsedT ? 0 : 12, overflow: "hidden", background: W.surface }}>
                <div style={{ background: `${orangeColor}22`, padding: "16px 18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, color: orangeColor, fontSize: 22, letterSpacing: 0.5, marginBottom: 3 }}>Training</div>
                      <div style={{ fontSize: 36, fontWeight: 900, color: orangeColor, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1 }}>{formatDuration(trainTotalSec)}</div>
                    </div>
                    <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), trainingSection: !s.collapsedSections?.trainingSection } }))} style={{ background: "none", border: `1px solid ${orangeColor}44`, borderRadius: 8, color: orangeColor, fontSize: 15, cursor: "pointer", padding: "4px 10px", lineHeight: 1, marginTop: 2 }}>{isCollapsedT ? "▼" : "▲"}</button>
                  </div>
                  {(() => {
                    const parts = [];
                    if (activeSession?.workoutStartedAt) parts.push(activeSession?.workoutEndedAt ? "✓ Workout" : "Workout");
                    if (activeSession?.fingerboardStartedAt) parts.push(activeSession?.fingerboardEndedAt ? "✓ Fingerboard" : "Fingerboard");
                    const bt = (activeSession?.fitnessSections || []).length;
                    if (bt > 0) parts.push(`${(activeSession?.fitnessSections || []).filter(s => s.endedAt).length}/${bt} blocks`);
                    return parts.length > 0 ? <div style={{ fontSize: 12, color: W.textMuted, fontWeight: 600, marginBottom: 10 }}>{parts.join(" · ")}</div> : null;
                  })()}
                  {hasAnyFitnessActivity ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => setTrainingPickerType("workout")} style={{ padding: "8px 14px", background: `${W.accent}22`, border: `1.5px solid ${W.accentDark}`, borderRadius: 10, color: W.accentDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Workout</button>
                      <button onClick={() => setTrainingPickerType("fingerboard")} style={{ padding: "8px 14px", background: W.yellow, border: `1.5px solid ${W.yellowDark}`, borderRadius: 10, color: W.yellowDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Fingerboard</button>
                      <button onClick={startFitnessSession} style={{ padding: "8px 14px", background: `${orangeColor}18`, border: `1.5px solid ${orangeColor}`, borderRadius: 10, color: orangeColor, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Block</button>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                      {[
                        { id: "workout",     label: "Workout",     icon: "💪", bg: `${W.accent}22`, tc: W.accentDark, fn: () => setTrainingPickerType("workout") },
                        { id: "fingerboard", label: "Fingerboard", icon: "🤲", bg: W.yellow,        tc: W.yellowDark, fn: () => setTrainingPickerType("fingerboard") },
                        { id: "warmup",      label: "Warm Up",     icon: "🔥", bg: W.pink,          tc: W.pinkDark,   fn: startWarmupSection, disabled: !!activeSession?.warmupStartedAt },
                        { id: "exercise",    label: "Exercise",    icon: "🏋️", bg: `${orangeColor}18`, tc: orangeColor, fn: startFitnessSession },
                      ].map(opt => (
                        <button key={opt.id} onClick={opt.disabled ? undefined : opt.fn} style={{ padding: "16px 10px", background: opt.disabled ? W.surface2 : opt.bg, border: `1.5px solid ${opt.disabled ? W.border : opt.tc}`, borderRadius: 14, cursor: opt.disabled ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: opt.disabled ? 0.45 : 1 }}>
                          <span style={{ fontSize: 26 }}>{opt.icon}</span>
                          <span style={{ fontWeight: 800, fontSize: 12, color: opt.disabled ? W.textDim : opt.tc }}>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {!isCollapsedT && (
                <div>
        {/* ── Workout Section ──────────────────────────────────── */}
        {!showClimbForm && activeSession?.workoutStartedAt && (() => {
          const ws = activeSession;
          const isActive = !!ws.workoutActiveStart;
          const isEnded  = !!ws.workoutEndedAt;
          const totalSec = (ws.workoutTotalSec || 0) + (isActive ? Math.max(0, Math.floor((Date.now() - ws.workoutActiveStart) / 1000)) : 0);
          const checklist = ws.workoutChecklist || [];
          const doneCount = checklist.filter(i => i.checked).length;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 14, border: `2px solid ${W.accentDark}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
                <div style={{ background: W.accent + "22", padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ fontWeight: 800, color: W.accentDark, fontSize: 18 }}>💪 Workout</div>
                      {isEnded  && <span style={{ background: W.accentDark, color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>DONE</span>}
                      {isActive && <span style={{ background: `${W.accentDark}33`, color: W.accentDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
                      {!isActive && !isEnded && totalSec > 0 && <span style={{ background: `${W.accentDark}22`, color: W.accentDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
                    </div>
                    <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), workout: !s.collapsedSections?.workout } }))} style={{ background: "none", border: `1px solid ${W.accentDark}44`, borderRadius: 7, color: W.accentDark, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>
                      {activeSession.collapsedSections?.workout ? "▼" : "▲"}
                    </button>
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: W.accentDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1, marginBottom: 8 }}>{formatDuration(totalSec)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${W.accentDark}33`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%`, background: W.accentDark, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: W.accentDark, flexShrink: 0 }}>{doneCount}/{checklist.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isEnded && (isActive
                      ? <button onClick={pauseWorkoutSession}  style={{ background: W.accentDark, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Pause</button>
                      : <button onClick={resumeWorkoutSession} style={{ background: W.accentDark, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Resume</button>
                    )}
                    {!isEnded && doneCount < checklist.length && <button onClick={completeAllWorkoutItems} style={{ background: `${W.accentDark}33`, border: `1px solid ${W.accentDark}44`, color: W.accentDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>✓ All</button>}
                    {!isEnded && <button onClick={endWorkoutSection} style={{ background: `${W.accentDark}22`, border: `1px solid ${W.accentDark}44`, color: W.accentDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Done</button>}
                  </div>
                </div>
              </div>
              {!activeSession.collapsedSections?.workout && <div style={{ borderLeft: `3px solid ${W.accentDark}44`, paddingLeft: 10, marginLeft: 2 }}>
                {checklist.map(item => {
                  const restRemain = routineRestTimer?.itemId === item.id ? Math.max(0, Math.ceil((routineRestTimer.endsAt - Date.now()) / 1000)) : 0;
                  return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 6, background: item.checked ? W.accent + "22" : W.surface2, border: `1px solid ${item.checked ? W.accentDark + "44" : W.border}`, borderRadius: 10, cursor: "pointer" }}
                    onClick={() => toggleWorkoutItem(item.id)}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.checked ? W.accentDark : W.border}`, background: item.checked ? W.accentDark : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.checked && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: item.checked ? W.accentDark : W.text, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
                      {item.detail && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{item.detail}</div>}
                      {restRemain > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: W.accentDark, marginTop: 2 }}>⏱ Rest: {restRemain}s</div>}
                    </div>
                    {item.restDuration > 0 && !restRemain && <span style={{ fontSize: 10, color: W.textMuted, fontWeight: 600 }}>{item.restDuration}s rest</span>}
                    {!isEnded && <button onClick={e => { e.stopPropagation(); removeWorkoutItem(item.id); }} style={{ background: "transparent", border: "none", color: W.textDim, fontSize: 15, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>}
                  </div>
                  );
                })}
                {!isEnded && (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input value={workoutNewItemText} onChange={e => setWorkoutNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && workoutNewItemText.trim()) { addWorkoutItem(workoutNewItemText.trim()); setWorkoutNewItemText(""); } }}
                      placeholder="Add an exercise…" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
                    <button onClick={() => { if (workoutNewItemText.trim()) { addWorkoutItem(workoutNewItemText.trim()); setWorkoutNewItemText(""); } }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${W.accentDark}55`, background: W.accent + "22", color: W.accentDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
                  </div>
                )}
              </div>}
            </div>
          );
        })()}

        {/* ── Fingerboard Section ───────────────────────────────── */}
        {!showClimbForm && activeSession?.fingerboardStartedAt && (() => {
          const fs = activeSession;
          const isActive = !!fs.fingerboardActiveStart;
          const isEnded  = !!fs.fingerboardEndedAt;
          const totalSec = (fs.fingerboardTotalSec || 0) + (isActive ? Math.max(0, Math.floor((Date.now() - fs.fingerboardActiveStart) / 1000)) : 0);
          const checklist = fs.fingerboardChecklist || [];
          const doneCount = checklist.filter(i => i.checked).length;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ borderRadius: 14, border: `2px solid ${W.yellowDark}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
                <div style={{ background: W.yellow, padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ fontWeight: 800, color: W.yellowDark, fontSize: 18 }}>🤞 Fingerboard</div>
                      {isEnded  && <span style={{ background: W.yellowDark, color: W.yellow, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>DONE</span>}
                      {isActive && <span style={{ background: `${W.yellowDark}33`, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
                      {!isActive && !isEnded && totalSec > 0 && <span style={{ background: `${W.yellowDark}22`, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
                    </div>
                    <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), fingerboard: !s.collapsedSections?.fingerboard } }))} style={{ background: "none", border: `1px solid ${W.yellowDark}44`, borderRadius: 7, color: W.yellowDark, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>
                      {activeSession.collapsedSections?.fingerboard ? "▼" : "▲"}
                    </button>
                  </div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1, marginBottom: 8 }}>{formatDuration(totalSec)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${W.yellowDark}33`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${checklist.length ? (doneCount / checklist.length) * 100 : 0}%`, background: W.yellowDark, borderRadius: 2, transition: "width 0.3s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: W.yellowDark, flexShrink: 0 }}>{doneCount}/{checklist.length}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {!isEnded && (isActive
                      ? <button onClick={pauseFingerboardSession}  style={{ background: W.yellowDark, border: "none", color: W.yellow, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Pause</button>
                      : <button onClick={resumeFingerboardSession} style={{ background: W.yellowDark, border: "none", color: W.yellow, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Resume</button>
                    )}
                    {!isEnded && doneCount < checklist.length && <button onClick={completeAllFingerboardItems} style={{ background: `${W.yellowDark}33`, border: `1px solid ${W.yellowDark}44`, color: W.yellowDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>✓ All</button>}
                    {!isEnded && <button onClick={endFingerboardSection} style={{ background: `${W.yellowDark}22`, border: `1px solid ${W.yellowDark}44`, color: W.yellowDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Done</button>}
                  </div>
                </div>
              </div>
              {!activeSession.collapsedSections?.fingerboard && <div style={{ borderLeft: `3px solid ${W.yellowDark}44`, paddingLeft: 10, marginLeft: 2 }}>
                {checklist.map(item => {
                  const restRemain = routineRestTimer?.itemId === item.id ? Math.max(0, Math.ceil((routineRestTimer.endsAt - Date.now()) / 1000)) : 0;
                  return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 6, background: item.checked ? W.yellow : W.surface2, border: `1px solid ${item.checked ? W.yellowDark + "44" : W.border}`, borderRadius: 10, cursor: "pointer" }}
                    onClick={() => toggleFingerboardItem(item.id)}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.checked ? W.yellowDark : W.border}`, background: item.checked ? W.yellowDark : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {item.checked && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: item.checked ? W.yellowDark : W.text, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
                      {item.detail && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{item.detail}</div>}
                      {restRemain > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: W.yellowDark, marginTop: 2 }}>⏱ Rest: {restRemain}s</div>}
                    </div>
                    {item.restDuration > 0 && !restRemain && <span style={{ fontSize: 10, color: W.textMuted, fontWeight: 600 }}>{item.restDuration}s rest</span>}
                    {!isEnded && <button onClick={e => { e.stopPropagation(); removeFingerboardItem(item.id); }} style={{ background: "transparent", border: "none", color: W.textDim, fontSize: 15, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>}
                  </div>
                  );
                })}
                {!isEnded && (
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input value={fingerboardNewItemText} onChange={e => setFingerboardNewItemText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && fingerboardNewItemText.trim()) { addFingerboardItem(fingerboardNewItemText.trim()); setFingerboardNewItemText(""); } }}
                      placeholder="Add a protocol…" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
                    <button onClick={() => { if (fingerboardNewItemText.trim()) { addFingerboardItem(fingerboardNewItemText.trim()); setFingerboardNewItemText(""); } }} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${W.yellowDark}55`, background: W.yellow, color: W.yellowDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
                  </div>
                )}
              </div>}
            </div>
          );
        })()}

        {/* ── Fitness Picker ───────────────────────────────────── */}
        {!showClimbForm && fitnessPickerStep && (() => {
          const orangeColor = "#f97316";
          const orangeLight = "#fff7ed";
          if (fitnessPickerStep === "choose") return (
            <div style={{ marginBottom: 16, background: W.surface, border: `2px solid ${orangeColor}55`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>🏋️ Add to Fitness</div>
                <button onClick={() => setFitnessPickerStep(null)} style={{ background: "none", border: "none", color: W.textDim, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div onClick={() => setFitnessPickerStep("routine-type")} style={{ background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 14, padding: "18px 14px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📋</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: W.text }}>Add a Routine</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 4 }}>Pick from your saved routines</div>
                </div>
                <div onClick={() => setFitnessPickerStep("exercise")} style={{ background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 14, padding: "18px 14px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>✏️</div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: W.text }}>Add an Exercise</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 4 }}>Log a custom exercise</div>
                </div>
              </div>
            </div>
          );
          if (fitnessPickerStep === "routine-type") return (
            <div style={{ marginBottom: 16, background: W.surface, border: `2px solid ${orangeColor}55`, borderRadius: 14, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <button onClick={() => setFitnessPickerStep("choose")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 10px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>← Back</button>
                <div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>Choose Routine Type</div>
              </div>
              {[
                { type: "warmup", emoji: "🧘", label: "Warmup", routines: warmupTemplates },
                { type: "workout", emoji: "💪", label: "Workout", routines: workoutRoutines },
                { type: "fingerboard", emoji: "🤙", label: "Fingerboard", routines: fingerboardRoutines },
              ].map(opt => (
                <div key={opt.type} onClick={() => { setFitnessPickerRoutineType(opt.type); setFitnessPickerStep("routine-list"); }} style={{ display: "flex", alignItems: "center", gap: 12, background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                  <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: W.textMuted }}>{opt.routines.length} routine{opt.routines.length !== 1 ? "s" : ""}</div>
                  </div>
                  <span style={{ color: W.textMuted, fontSize: 18 }}>›</span>
                </div>
              ))}
            </div>
          );
          if (fitnessPickerStep === "routine-list") {
            const rType = fitnessPickerRoutineType;
            const routineList = rType === "warmup" ? warmupTemplates : rType === "workout" ? workoutRoutines : fingerboardRoutines;
            const typeEmoji = rType === "warmup" ? "🧘" : rType === "workout" ? "💪" : "🤙";
            const typeLabel2 = rType === "warmup" ? "Warmup" : rType === "workout" ? "Workout" : "Fingerboard";
            return (
              <div style={{ marginBottom: 16, background: W.surface, border: `2px solid ${orangeColor}55`, borderRadius: 14, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <button onClick={() => setFitnessPickerStep("routine-type")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 10px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>← Back</button>
                  <div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{typeEmoji} {typeLabel2} Routines</div>
                </div>
                {routineList.length === 0 && <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "16px 0" }}>No {rType} routines yet. Add one in your profile.</div>}
                {routineList.map(r => (
                  <div key={r.id} onClick={() => addFitnessRoutine(rType, r)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{r.name}</div>
                    {r.description && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{r.description}</div>}
                    <div style={{ fontSize: 11, color: W.textDim, marginTop: 4 }}>{(r.items || []).length} tasks</div>
                  </div>
                ))}
              </div>
            );
          }
          if (fitnessPickerStep === "exercise") {
            const QUICK_EXERCISES = ["Pull-ups","Push-ups","Dips","Plank","Core Circuit","Hangboard","Campus Board","Antagonist","Stretching","Cool Down"];
            return (
              <div style={{ marginBottom: 16, background: W.surface, border: `2px solid ${orangeColor}55`, borderRadius: 14, padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <button onClick={() => setFitnessPickerStep("choose")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 10px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>← Back</button>
                  <div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>Add an Exercise</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {QUICK_EXERCISES.map(name => (
                    <button key={name} onClick={() => { setFitnessNewExerciseName(name); }} style={{ padding: "5px 10px", borderRadius: 20, border: `1px solid ${fitnessNewExerciseName === name ? orangeColor : orangeColor + "55"}`, background: fitnessNewExerciseName === name ? `${orangeColor}22` : W.surface2, color: fitnessNewExerciseName === name ? orangeColor : W.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{name}</button>
                  ))}
                </div>
                <input value={fitnessNewExerciseName} onChange={e => setFitnessNewExerciseName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addFitnessExercise(); }} placeholder="Or type a custom name…" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface2, color: W.text, fontSize: 14, outline: "none", marginBottom: 10 }} />
                <button onClick={addFitnessExercise} disabled={!fitnessNewExerciseName.trim()} style={{ width: "100%", padding: "12px", background: fitnessNewExerciseName.trim() ? orangeColor : W.surface2, border: "none", borderRadius: 12, color: fitnessNewExerciseName.trim() ? "#fff" : W.textDim, fontWeight: 800, fontSize: 14, cursor: fitnessNewExerciseName.trim() ? "pointer" : "default", transition: "background 0.15s" }}>Add Exercise</button>
              </div>
            );
          }
          return null;
        })()}

        {/* ── Fitness Sections ─────────────────────────────────── */}
        {!showClimbForm && (activeSession?.fitnessSections || []).map((section, secIdx) => {
          const orangeColor = "#f97316";
          const orangeLight = "#fff7ed";
          const isEnded = !!section.endedAt;
          const doneCount = (section.items || []).filter(i => i.checked).length;
          const totalItems = (section.items || []).length;
          const blockSec = isEnded ? Math.floor((section.endedAt - section.startedAt) / 1000) : Math.floor((Date.now() - section.startedAt) / 1000);
          const isDragTarget = fitnessDragIdx !== null && fitnessDragIdx !== secIdx;
          return (
            <div key={section.id} style={{ marginBottom: 16, opacity: fitnessDragIdx === secIdx ? 0.5 : 1, transition: "opacity 0.15s" }}
              draggable
              onDragStart={() => setFitnessDragIdx(secIdx)}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={() => { reorderFitnessSections(fitnessDragIdx, secIdx); setFitnessDragIdx(null); }}
              onDragEnd={() => setFitnessDragIdx(null)}
            >
              <div style={{ borderRadius: 14, border: `2px solid ${isDragTarget ? orangeColor : orangeColor + "55"}`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
                <div style={{ background: `${orangeColor}18`, padding: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span style={{ fontSize: 14, color: orangeColor, cursor: "grab", opacity: 0.6, userSelect: "none" }}>⠿</span>
                      <div style={{ fontWeight: 800, color: orangeColor, fontSize: 16 }}>🏋️ {section.name}</div>
                      {section.kind === "routine" && <span style={{ fontSize: 10, color: orangeColor, background: `${orangeColor}22`, borderRadius: 5, padding: "1px 6px", fontWeight: 700 }}>{section.routineType}</span>}
                      {isEnded && <span style={{ background: orangeColor, color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>DONE</span>}
                      <span style={{ fontSize: 10, color: orangeColor, fontWeight: 700, opacity: 0.8 }}>{formatDuration(blockSec)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), [`fitness_${section.id}`]: !s.collapsedSections?.[`fitness_${section.id}`] } }))} style={{ background: "none", border: `1px solid ${orangeColor}44`, borderRadius: 7, color: orangeColor, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>
                        {activeSession.collapsedSections?.[`fitness_${section.id}`] ? "▼" : "▲"}
                      </button>
                      {!isEnded && <button onClick={() => removeFitnessBlock(section.id)} style={{ background: "none", border: `1px solid ${orangeColor}44`, borderRadius: 7, color: orangeColor, fontSize: 12, cursor: "pointer", padding: "3px 8px", lineHeight: 1, fontWeight: 700 }}>×</button>}
                    </div>
                  </div>
                  {totalItems > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${orangeColor}33`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${totalItems ? (doneCount / totalItems) * 100 : 0}%`, background: orangeColor, borderRadius: 2, transition: "width 0.3s ease" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: orangeColor, flexShrink: 0 }}>{doneCount}/{totalItems}</span>
                    </div>
                  )}
                  {!isEnded && (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {totalItems > 0 && doneCount < totalItems && <button onClick={() => setActiveSession(s => ({ ...s, fitnessSections: (s.fitnessSections || []).map(sec => sec.id === section.id ? { ...sec, items: sec.items.map(i => ({ ...i, checked: true })) } : sec) }))} style={{ background: `${orangeColor}33`, border: `1px solid ${orangeColor}44`, color: orangeColor, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>✓ All</button>}
                      <button onClick={() => endFitnessBlock(section.id)} style={{ background: `${orangeColor}22`, border: `1px solid ${orangeColor}44`, color: orangeColor, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>Done</button>
                    </div>
                  )}
                </div>
              </div>
              {!activeSession.collapsedSections?.[`fitness_${section.id}`] && (
                <div style={{ borderLeft: `3px solid ${orangeColor}44`, paddingLeft: 10, marginLeft: 2 }}>
                  {!isEnded && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, marginTop: 2 }}>
                      <input value={fitnessNewItemTexts[section.id] || ""} onChange={e => setFitnessNewItemTexts(prev => ({ ...prev, [section.id]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") addFitnessItem(section.id, fitnessNewItemTexts[section.id] || ""); }} placeholder="Add a task…" style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
                      <button onClick={() => addFitnessItem(section.id, fitnessNewItemTexts[section.id] || "")} style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${orangeColor}55`, background: `${orangeColor}18`, color: orangeColor, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
                    </div>
                  )}
                  {(section.items || []).map(item => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 6, background: item.checked ? `${orangeColor}18` : W.surface2, border: `1px solid ${item.checked ? orangeColor + "44" : W.border}`, borderRadius: 10, cursor: "pointer" }}
                      onClick={() => toggleFitnessItem(section.id, item.id)}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${item.checked ? orangeColor : W.border}`, background: item.checked ? orangeColor : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {item.checked && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: item.checked ? orangeColor : W.text, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
                        {item.detail && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{item.detail}</div>}
                      </div>
                      {item.restDuration > 0 && <span style={{ fontSize: 10, color: W.textMuted, fontWeight: 600 }}>{item.restDuration}s rest</span>}
                    </div>
                  ))}
                  {/* Result + Note fields */}
                  <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 4 }}>
                    <input value={section.result || ""} onChange={e => updateFitnessBlockResult(section.id, e.target.value)} placeholder="Result (e.g. 3×10, 90s, 12 reps)…" style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1px solid ${orangeColor}44`, background: W.surface, color: W.text, fontSize: 12, outline: "none" }} />
                  </div>
                  <input value={section.note || ""} onChange={e => updateFitnessBlockNote(section.id, e.target.value)} placeholder="Notes (weight, intensity, observations)…" style={{ width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 9, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 12, outline: "none", marginBottom: 4 }} />
                </div>
              )}
            </div>
          );
        })}
                </div>
              )}
            </div>
          );
        })()}
        {/* ══ WARMUP SECTION (ended — shown at bottom) ══ */}
        {!showClimbForm && activeSession?.warmupStartedAt && activeSession?.warmupEndedAt && (() => {
          const ws = activeSession;
          const totalSec = ws.warmupTotalSec || 0;
          const checklist = ws.warmupChecklist || [];
          const doneCount = checklist.filter(i => i.checked).length;
          const isCollapsedW = !!activeSession.collapsedSections?.warmup;
          return (
            <div style={{ marginBottom: 16, opacity: 0.8 }}>
              <div style={{ borderRadius: 14, border: `2px solid ${W.pinkDark}33`, overflow: "hidden", background: W.surface }}>
                <div style={{ background: W.pink, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ fontWeight: 800, color: W.pinkDark, fontSize: 16 }}>🔥 Warm Up</div>
                    <span style={{ background: W.pinkDark, color: W.pink, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>DONE</span>
                    <span style={{ fontSize: 12, color: W.pinkDark, fontWeight: 700 }}>{formatDuration(totalSec)} · {doneCount}/{checklist.length}</span>
                  </div>
                  <button onClick={() => setActiveSession(s => ({ ...s, collapsedSections: { ...(s.collapsedSections || {}), warmup: !s.collapsedSections?.warmup } }))} style={{ background: "none", border: `1px solid ${W.pinkDark}44`, borderRadius: 7, color: W.pinkDark, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>{isCollapsedW ? "▼" : "▲"}</button>
                </div>
                {!isCollapsedW && checklist.length > 0 && (
                  <div style={{ padding: "8px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {checklist.map(item => (
                      <span key={item.id} style={{ fontSize: 11, color: item.checked ? W.pinkDark : W.textDim, fontWeight: item.checked ? 700 : 400, textDecoration: item.checked ? "line-through" : "none", background: W.surface2, borderRadius: 6, padding: "2px 8px", border: `1px solid ${W.border}` }}>{item.text}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Hidden section add buttons */}
        {!showClimbForm && (!hasClimbing || !hasFitness) && (
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {!hasClimbing && <button onClick={() => setActiveSession(s => ({ ...s, sessionTypes: [...new Set([...(s.sessionTypes || []), "boulder"])] }))} style={{ flex: 1, padding: "10px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Climbing</button>}
            {!hasFitness && <button onClick={() => setActiveSession(s => ({ ...s, sessionTypes: [...new Set([...(s.sessionTypes || []), "fitness"])] }))} style={{ flex: 1, padding: "10px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Fitness</button>}
          </div>
        )}

        {!showClimbForm && (
          <div style={{ marginTop: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Session Notes</div>
            <textarea
              value={activeSession?.notes || ""}
              onChange={e => setActiveSession(s => ({ ...s, notes: e.target.value }))}
              placeholder="How did it go? Conditions, goals, observations…"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }}
            />
          </div>
        )}
        {!showClimbForm && (
          <div style={{ marginTop: 4 }}>
            <button onClick={toggleSessionTimer} style={{ width: "100%", padding: "12px", background: W.surface2, border: `2px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 22, cursor: "pointer", marginBottom: 8 }}>{timerRunning ? "⏸" : "▶"}</button>
            <button onClick={() => setShowEndConfirm(true)} style={{ width: "100%", padding: "14px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 14, color: W.redDark, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>End Session</button>
          </div>
        )}
        {showProjectPrompt && (() => {
          // Filter out climbs already linked to a project
          const unsent = (activeSession?.climbs || []).filter(c => !c.completed && c.climbType !== "speed-session" && !c.projectId);
          // For each climb, find a similar existing project (same grade, not yet sent)
          const findSimilar = (c) => c.name ? projects.find(p => p.active && !p.completed && p.grade === c.grade && p.name && p.name === c.name) : null;
          const confirmAndEnd = () => {
            const checkedIds = Object.entries(projectPromptChecked).filter(([, v]) => v).map(([id]) => id);
            if (checkedIds.length > 0) {
              const newProjects = [];
              checkedIds.forEach(id => {
                const c = unsent.find(u => String(u.id) === id);
                if (!c) return;
                const similar = findSimilar(c);
                if (!similar) {
                  newProjects.push({ id: `proj_${Date.now()}_${id}`, name: c.name || "", grade: c.grade, scale: c.scale, climbType: c.climbType || "boulder", active: true, completed: false, dateAdded: new Date().toISOString() });
                }
                // if similar exists, it's already tracked — no duplicate created
              });
              if (newProjects.length > 0) setProjects(prev => [...prev, ...newProjects]);
            }
            setShowProjectPrompt(false);
            endSession();
          };
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div style={{ background: W.surface, borderRadius: 20, padding: "24px", width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "80vh", overflowY: "auto" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: W.text, marginBottom: 6 }}>Add Projects?</div>
                <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 18 }}>These climbs weren't sent — add any as projects to track them across sessions.</div>
                {unsent.length === 0 && <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "16px 0" }}>All unsent climbs are already tracked as projects.</div>}
                {unsent.map(c => {
                  const checked = !!projectPromptChecked[c.id];
                  const similar = findSimilar(c);
                  return (
                    <div key={c.id} onClick={() => setProjectPromptChecked(prev => ({ ...prev, [c.id]: !prev[c.id] }))} style={{ display: "flex", alignItems: "center", gap: 12, background: checked ? W.pink : W.surface2, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1.5px solid ${checked ? W.pinkDark + "55" : W.border}`, cursor: "pointer" }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${checked ? W.pinkDark : W.border}`, background: checked ? W.pinkDark : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <span style={{ color: "#fff", fontSize: 13, fontWeight: 900 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{c.name || c.grade}</div>
                        <div style={{ fontSize: 12, color: getGradeColor(c.grade), fontWeight: 700 }}>{c.grade} · {climbAttempts(c)} {climbAttempts(c) === 1 ? "attempt" : "attempts"}</div>
                        {similar && <div style={{ fontSize: 10, color: W.accent, fontWeight: 600, marginTop: 2 }}>Already tracked as a project — checking this won't duplicate it</div>}
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
                  <button onClick={() => { setShowProjectPrompt(false); endSession(); }} style={{ padding: "12px", background: "transparent", border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Skip</button>
                  <button onClick={confirmAndEnd} style={{ padding: "12px", background: `linear-gradient(135deg, ${W.pinkDark}, #be185d)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                    {Object.values(projectPromptChecked).filter(Boolean).length > 0 ? `Add ${Object.values(projectPromptChecked).filter(Boolean).length} Project${Object.values(projectPromptChecked).filter(Boolean).length > 1 ? "s" : ""}` : "End Session"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
        {showRemoveQueuedPrompt && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: W.surface, borderRadius: 20, padding: "28px 24px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: W.text, marginBottom: 8 }}>Remove queued climbs?</div>
              <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 20 }}>
                {queuedCount} climb{queuedCount !== 1 ? "s" : ""} {queuedCount !== 1 ? "were" : "was"} added but never attempted. Remove {queuedCount !== 1 ? "them" : "it"} from the session log?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => {
                  setShowRemoveQueuedPrompt(false);
                  const unsent = (activeSession?.climbs || []).filter(c => !c.completed && c.climbType !== "speed-session" && wasAttempted(c));
                  if (unsent.length > 0) { setProjectPromptChecked({}); setShowProjectPrompt(true); } else { endSession(); }
                }} style={{ padding: "13px", background: "transparent", border: `2px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Keep</button>
                <button onClick={() => {
                  const filteredClimbs = (activeSession?.climbs || []).filter(c => wasAttempted(c) || c.climbType === "speed-session");
                  setActiveSession(s => ({ ...s, climbs: filteredClimbs }));
                  setShowRemoveQueuedPrompt(false);
                  const unsent = filteredClimbs.filter(c => !c.completed && c.climbType !== "speed-session" && wasAttempted(c));
                  if (unsent.length > 0) { setProjectPromptChecked({}); setShowProjectPrompt(true); } else { endSession(filteredClimbs); }
                }} style={{ padding: "13px", background: `linear-gradient(135deg, ${W.redDark}, #b91c1c)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Remove</button>
              </div>
            </div>
          </div>
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
                  {regularTotal > 0 ? `${regularSends} sends · ${regularTotal} climbs` : "no attempts yet"}{queuedCount > 0 ? ` · ${queuedCount} queued` : ""}{speedSessions.length > 0 ? ` · ${speedSessions.reduce((t, s) => t + (s.attempts||[]).length, 0)} speed attempts` : ""}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => setShowEndConfirm(false)} style={{ padding: "13px", background: "transparent", border: `2px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Keep Going</button>
                <button onClick={() => {
                  setShowEndConfirm(false);
                  if (queuedCount > 0) {
                    setShowRemoveQueuedPrompt(true);
                  } else {
                    const unsent = (activeSession?.climbs || []).filter(c => !c.completed && c.climbType !== "speed-session" && wasAttempted(c));
                    if (unsent.length > 0) { setProjectPromptChecked({}); setShowProjectPrompt(true); } else { endSession(); }
                  }
                }} style={{ padding: "13px", background: `linear-gradient(135deg, ${W.redDark}, #b91c1c)`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>End It</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // §SCREEN_SESSION_DETAIL
  const SessionDetailScreen = ({ session }) => {
    const readOnly = sessionReadOnly;
    const [editingLocation, setEditingLocation] = useState(false);
    const [locationVal, setLocationVal]         = useState(session.location);
    const [locDropOpen, setLocDropOpen]         = useState(false);
    const [confirmDelete, setConfirmDelete]                        = useState(false);
    const [selectedDetailGradeSlice, setSelectedDetailGradeSlice] = useState(null);
    const [selectedDetailTimeSlice, setSelectedDetailTimeSlice]   = useState(null);
    const stats = getSessionStats(session);
    const saveLocation = () => { setSessions(prev => prev.map(s => s.id === session.id ? { ...s, location: locationVal } : s)); setSelectedSession(s => ({ ...s, location: locationVal })); setEditingLocation(false); };
    return (
      <div style={{ padding: "24px 20px" }}>
        {!readOnly && (
          <button onClick={() => { setScreen("profile"); setProfileTab("climbing"); setClimbingSubTab("climbs"); }} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 16, boxShadow: `0 4px 16px ${W.accentGlow}` }}>Save Session</button>
        )}
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
        {(() => {
          const climbs = (session.climbs || []).filter(c => c.climbType !== "speed-session" && wasAttempted(c));
          const totalAttempts = climbs.reduce((s, c) => s + climbAttempts(c), 0);
          const mostAttempts  = climbs.length ? Math.max(...climbs.map(c => climbAttempts(c))) : 0;
          const sendRate      = climbs.length ? Math.round((climbs.filter(c => c.completed).length / climbs.length) * 100) : 0;
          const longestClimbMs = climbs.length ? Math.max(...climbs.map(c => (c.attemptLog || []).reduce((s, a) => s + (a.duration || 0), 0))) : 0;
          const longestClimbSec = Math.round(longestClimbMs / 1000);
          const typeTimes = [session.boulderTotalSec || 0, session.ropeTotalSec || 0, session.warmupTotalSec || 0].filter(t => t > 0);
          const longestTypeSec = typeTimes.length ? Math.max(...typeTimes) : 0;
          const statCells = [
            { label: "Session Time",    value: formatDuration(session.duration || 0) },
            { label: "Longest Climb",   value: longestClimbSec > 0 ? formatDuration(longestClimbSec) : "—" },
            { label: "Longest Type",    value: longestTypeSec > 0 ? formatDuration(longestTypeSec) : "—" },
            { label: "Total Attempts",  value: totalAttempts },
            { label: "Max Attempts",    value: mostAttempts },
            { label: "Climbs",          value: climbs.length },
            { label: "Send Rate",       value: `${sendRate}%` },
            { label: "Flash Rate",      value: `${stats.flashRate}%` },
            { label: "Avg Attempts",    value: stats.avgTries },
          ];
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {statCells.map(s => (
                <div key={s.label} style={{ background: W.surface2, borderRadius: 12, padding: "10px 10px", border: `1px solid ${W.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: W.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: W.textMuted, marginTop: 2, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          );
        })()}
        {(() => {
          // Time breakdown pie — multi-type sessions
          const boulderSec = session.boulderTotalSec || 0;
          const ropeSec    = session.ropeTotalSec || 0;
          const warmupSecD = session.warmupTotalSec || 0;
          const speedSec   = (session.climbs || []).filter(c => c.climbType === "speed-session").reduce((s, c) => s + Math.max(0, Math.floor(((c.endedAt || Date.now()) - c.startedAt) / 1000)), 0);
          const timeSlices = [
            boulderSec > 0 && { label: "🪨 Boulder", value: boulderSec, color: W.greenDark },
            ropeSec > 0    && { label: "🪢 Rope",    value: ropeSec,    color: W.purpleDark },
            speedSec > 0   && { label: "⚡ Speed",   value: speedSec,   color: W.yellowDark },
            warmupSecD > 0 && { label: "🔥 Warm Up", value: warmupSecD, color: W.pinkDark },
          ].filter(Boolean);
          if (timeSlices.length < 2) return null;
          const paths = buildPie(timeSlices);
          const activeTimeLabel = selectedDetailTimeSlice && paths.find(p => p.label === selectedDetailTimeSlice) ? selectedDetailTimeSlice : paths[0]?.label;
          const activeTimeSlice = paths.find(p => p.label === activeTimeLabel) || paths[0];
          return (
            <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 16 }}>
              <svg width={110} height={110} viewBox="0 0 80 80" style={{ cursor: "pointer", flexShrink: 0 }}>
                <style>{`@keyframes pie-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}.pie-p{transform-origin:40px 40px;animation:pie-pulse 0.28s ease}`}</style>
                {paths.map((s, i) => (
                  <path key={s.label === activeTimeLabel ? `${i}-a` : i} d={s.path} fill={s.color}
                    className={s.label === activeTimeLabel ? "pie-p" : undefined}
                    style={{ opacity: s.label === activeTimeLabel ? 1 : 0.45, transition: "opacity 0.25s ease" }}
                    onClick={() => setSelectedDetailTimeSlice(prev => prev === s.label ? null : s.label)} />
                ))}
                <circle cx="40" cy="40" r="35" fill="none" stroke={activeTimeSlice?.color} strokeWidth="2" strokeOpacity="0.65" pointerEvents="none" />
                <circle cx="40" cy="40" r="17" fill="transparent" style={{ cursor: "pointer" }}
                  onClick={() => { const idx = paths.findIndex(p => p.label === activeTimeLabel); setSelectedDetailTimeSlice(paths[(idx + 1) % paths.length].label); }} />
                {activeTimeSlice && <text x="40" y="44" textAnchor="middle" fontSize="9" fontWeight="900" fill={W.text} pointerEvents="none">{activeTimeSlice.pct}%</text>}
              </svg>
              {activeTimeSlice && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Time Breakdown</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: activeTimeSlice.color, lineHeight: 1 }}>{activeTimeSlice.label}</div>
                  <div style={{ fontSize: 12, color: W.textMuted, marginTop: 4 }}>{activeTimeSlice.pct}% · {formatDuration(activeTimeSlice.value)}</div>
                  <div style={{ fontSize: 10, color: W.textDim, marginTop: 6 }}>Tap slice or center to cycle</div>
                </div>
              )}
            </div>
          );
        })()}
        {(() => {
          const hasBoulder = (session.climbs || []).some(c => c.climbType !== "rope" && c.climbType !== "speed-session");
          const hasRope    = (session.climbs || []).some(c => c.climbType === "rope");
          if (!(hasBoulder || hasRope)) return null;
          const gradeEntries = Object.entries(stats.gradeBreakdown).sort((a, b) => b[1].tries - a[1].tries);
          if (gradeEntries.length < 2) return null;
          const gradeSlices = gradeEntries.map(([grade, data]) => ({ label: grade, value: data.tries, completed: data.completed || 0, color: getGradeColor(grade) }));
          const paths = buildPie(gradeSlices);
          const totalTries = paths[0]?.total || 0;
          const activeLabel = selectedDetailGradeSlice && paths.find(p => p.label === selectedDetailGradeSlice) ? selectedDetailGradeSlice : paths[0]?.label;
          const activeSlice = paths.find(p => p.label === activeLabel) || paths[0];
          return (
            <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 16 }}>
              <svg width={110} height={110} viewBox="0 0 80 80" style={{ cursor: "pointer", flexShrink: 0 }}>
                <style>{`@keyframes pie-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}.pie-p{transform-origin:40px 40px;animation:pie-pulse 0.28s ease}`}</style>
                {paths.map((s, i) => (
                  <path key={s.label === activeLabel ? `${i}-a` : i} d={s.path} fill={s.color}
                    className={s.label === activeLabel ? "pie-p" : undefined}
                    style={{ opacity: s.label === activeLabel ? 1 : 0.45, transition: "opacity 0.25s ease" }}
                    onClick={() => setSelectedDetailGradeSlice(prev => prev === s.label ? null : s.label)} />
                ))}
                {paths.map((s, i) => {
                  const sendAngle = s.value > 0 ? ((s.completed / s.value) * (s.endAngle - s.startAngle)) : 0;
                  const arcPath = makeSendArc(s.startAngle, sendAngle);
                  return arcPath ? <path key={`sa${i}`} d={arcPath} fill="rgba(255,255,255,0.45)" pointerEvents="none" /> : null;
                })}
                <circle cx="40" cy="40" r="35" fill="none" stroke={activeSlice?.color} strokeWidth="2" strokeOpacity="0.65" pointerEvents="none" />
                <circle cx="40" cy="40" r="17" fill="transparent" style={{ cursor: "pointer" }}
                  onClick={() => { const idx = paths.findIndex(p => p.label === activeLabel); setSelectedDetailGradeSlice(paths[(idx + 1) % paths.length].label); }} />
                <text x="40" y="44" textAnchor="middle" fontSize="10" fontWeight="900" fill={W.text} pointerEvents="none">{totalTries}</text>
              </svg>
              {activeSlice && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Grade Breakdown</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: activeSlice.color, lineHeight: 1 }}>{activeSlice.label}</div>
                  <div style={{ fontSize: 12, color: W.textMuted, marginTop: 4 }}>{activeSlice.pct}% · {activeSlice.value} tries · {activeSlice.completed} sends</div>
                  <div style={{ fontSize: 10, color: W.textDim, marginTop: 6 }}>Tap slice or center to cycle</div>
                </div>
              )}
            </div>
          );
        })()}
        {session.workoutChecklist?.length > 0 && (
          <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: W.accentDark }}>💪 Workout Checklist</div>
              <div style={{ fontSize: 11, color: W.textDim }}>
                {session.workoutChecklist.filter(i => i.checked).length}/{session.workoutChecklist.length} done
                {session.workoutTotalSec > 0 && ` · ${formatDuration(session.workoutTotalSec)}`}
              </div>
            </div>
            {session.workoutChecklist.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${W.border}` }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: item.checked ? W.accentDark : "transparent", border: `2px solid ${item.checked ? W.accentDark : W.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.checked && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: item.checked ? W.accentDark : W.textMuted, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
        {session.fingerboardChecklist?.length > 0 && (
          <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: W.yellowDark }}>🤲 Fingerboard Checklist</div>
              <div style={{ fontSize: 11, color: W.textDim }}>
                {session.fingerboardChecklist.filter(i => i.checked).length}/{session.fingerboardChecklist.length} done
                {session.fingerboardTotalSec > 0 && ` · ${formatDuration(session.fingerboardTotalSec)}`}
              </div>
            </div>
            {session.fingerboardChecklist.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${W.border}` }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: item.checked ? W.yellowDark : "transparent", border: `2px solid ${item.checked ? W.yellowDark : W.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.checked && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: item.checked ? W.yellowDark : W.textMuted, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Climbs</div>
        {!readOnly && showClimbForm && editingClimbId ? (
          <ClimbFormPanel onSave={() => saveClimbToFinishedSession(session.id)} onCancel={() => { setShowClimbForm(false); setEditingClimbId(null); setEditingSessionId(null); }} />
        ) : (
          [...(session.climbs || [])].sort((a, b) => (b.photo ? 1 : 0) - (a.photo ? 1 : 0)).map((c, ci) => {
            const gradeClr  = getGradeColor(c.grade);
            const colorHex  = CLIMB_COLORS.find(cc => cc.id === c.color)?.hex;
            const allPhotos = (session.climbs || []).filter(x => x.photo);
            const photoIdx  = allPhotos.findIndex(x => x.id === c.id);
            return c.photo ? (
              <div key={c.id} onClick={() => setLightboxPhoto({ photos: allPhotos.map(p => ({ src: p.photo, grade: p.grade, name: p.name, colorId: p.color })), idx: photoIdx })} style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: `1.5px solid ${c.isProject ? W.pinkDark + "80" : W.border}`, marginBottom: 10, cursor: "pointer", height: 160 }}>
                {c.isProject && <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 2, background: `linear-gradient(90deg, ${W.pinkDark}ee, #be185dee)`, color: "#fff", padding: "4px 14px", fontSize: 11, fontWeight: 900, letterSpacing: 0.4 }}>🎯 PROJECT</div>}
                <img src={c.photo} alt={c.name || c.grade} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)" }} />
                <div style={{ position: "absolute", inset: 0, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: gradeClr, color: "#fff", borderRadius: 10, padding: "6px 12px", fontWeight: 900, fontSize: 20, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{c.grade}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.name && <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>}
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{c.climbType === "rope" ? `${c.tries || 0} attempts · ${c.falls ?? 0} falls${(c.takes || 0) > 0 ? ` · ${c.takes} takes` : ""}` : `${c.tries || 0} falls · ${climbAttempts(c)} attempts`}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {colorHex && <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorHex, border: "1.5px solid rgba(255,255,255,0.8)", flexShrink: 0 }} />}
                      {c.section && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>📌 {c.section}</span>}
                    </div>
                  </div>
                  <span style={{ background: c.completed ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.completed ? "✓" : "✗"}</span>
                </div>
              </div>
            ) : (
              <div key={c.id} style={{ background: W.surface, borderRadius: 14, border: `1.5px solid ${c.isProject ? W.pinkDark + "80" : W.border}`, borderLeft: `4px solid ${gradeClr}`, marginBottom: 10, overflow: "hidden" }}>
                {c.isProject && <div style={{ background: `linear-gradient(90deg, ${W.pinkDark}, #be185d)`, color: "#fff", padding: "4px 14px", fontSize: 11, fontWeight: 900, letterSpacing: 0.4 }}>🎯 PROJECT</div>}
                <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 900, fontSize: 22, color: gradeClr, flexShrink: 0, minWidth: 42 }}>{c.grade}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.name && <div style={{ fontSize: 13, fontWeight: 700, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: c.name ? 3 : 0 }}>
                      {colorHex && <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorHex, border: `1px solid ${W.border}`, flexShrink: 0 }} />}
                      <span style={{ fontSize: 11, color: W.textMuted }}>{c.climbType === "rope" ? `${c.tries || 0} attempts · ${c.falls ?? 0} falls${(c.takes || 0) > 0 ? ` · ${c.takes} takes` : ""}` : `${c.tries || 0} falls · ${climbAttempts(c)} attempts`}</span>
                      {c.section && <span style={{ fontSize: 11, color: W.accent, fontWeight: 700 }}>📌 {c.section}</span>}
                    </div>
                  </div>
                  <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{c.completed ? "✓" : "✗"}</span>
                </div>
              </div>
            );
          })
        )}
        {session.warmupChecklist?.length > 0 && (
          <div style={{ background: W.surface2, borderRadius: 16, padding: "16px", marginBottom: 16, border: `1px solid ${W.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: W.pinkDark }}>🔥 Warm Up Checklist</div>
              <div style={{ fontSize: 11, color: W.textDim }}>
                {session.warmupChecklist.filter(i => i.checked).length}/{session.warmupChecklist.length} done
                {session.warmupTotalSec > 0 && ` · ${formatDuration(session.warmupTotalSec)}`}
              </div>
            </div>
            {session.warmupChecklist.map(item => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${W.border}` }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: item.checked ? W.pinkDark : "transparent", border: `2px solid ${item.checked ? W.pinkDark : W.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {item.checked && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 12, color: item.checked ? W.pinkDark : W.textMuted, textDecoration: item.checked ? "line-through" : "none" }}>{item.text}</span>
              </div>
            ))}
          </div>
        )}
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

  // §SCREEN_PROFILE
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
    const hasClimbFilters   = logbookFilter !== "all" || logbookScale !== "All Scales" || logbookGrade !== "All" || logbookSort !== "date" || logbookColorFilter !== "All" || logbookSectionFilter !== "All" || logbookTickList || !!logbookSearch.trim();
    const activeFilterCount = [logbookFilter !== "all", logbookScale !== "All Scales", logbookGrade !== "All", logbookSort === "name" || logbookSort === "projects", logbookColorMulti !== null, logbookClimbGymFilter !== null, logbookClimbTypeFilter.length < 2, logbookTickList].filter(Boolean).length;
    const hasSessionFilters = logbookGymFilter !== "All Gyms" || sessionSort !== "date" || sessionTypeFilter !== "all";

    const renderRoutinesPanel = () => {
      const ROUTINE_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#64748b"];
      const typeLabel = { warmup: "Warmup", workout: "Workout", fingerboard: "Fingerboard" };
      const presets = { warmup: WARMUP_PRESETS, workout: WORKOUT_PRESETS, fingerboard: FINGERBOARD_PRESETS };

      const getUsage = (type, routine) => {
        if (type === "warmup") return sessions.filter(s => (s.warmupTotalSec || 0) > 0 && (s.warmupTemplateId === routine.id || s.warmupTemplateName === routine.name));
        if (type === "workout") return sessions.filter(s => (s.workoutTotalSec || 0) > 0 && (s.workoutRoutineId === routine.id || s.workoutRoutineName === routine.name));
        return sessions.filter(s => (s.fingerboardTotalSec || 0) > 0 && (s.fingerboardRoutineId === routine.id || s.fingerboardRoutineName === routine.name));
      };

      const getStreak = (usageSessions, weeklyGoal) => {
        if (!weeklyGoal || weeklyGoal <= 0) return null;
        const today = new Date(); today.setHours(0,0,0,0);
        const dow = today.getDay();
        const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow);
        let streak = 0;
        for (let w = 0; w < 52; w++) {
          const ws = new Date(weekStart); ws.setDate(weekStart.getDate() - w * 7);
          const we = new Date(ws); we.setDate(ws.getDate() + 6);
          const cnt = usageSessions.filter(s => { const d = new Date(s.date); return d >= ws && d <= we; }).length;
          if (cnt >= weeklyGoal) streak++;
          else if (w > 0) break;
        }
        return streak;
      };

      const openEditor = (mode, type, id) => {
        let routine = null;
        if (mode === "edit") {
          const src = type === "warmup" ? warmupTemplates : type === "workout" ? workoutRoutines : fingerboardRoutines;
          routine = src.find(r => r.id === id);
        }
        setRoutineEditorName(routine?.name || "");
        setRoutineEditorDesc(routine?.description || "");
        setRoutineEditorItems(routine?.items ? routine.items.map(i => ({ ...i })) : []);
        setRoutineEditorNewItem("");
        setRoutineEditorShowPresets(false);
        setRoutineEditorEditingItemId(null);
        setRoutineEditor({ mode, type, id: id || null, notes: routine?.notes || "", color: routine?.color || "", weeklyGoal: routine?.weeklyGoal || "" });
      };

      const saveEditor = () => {
        const items = routineEditorItems;
        const name = routineEditorName.trim() || "Untitled";
        const description = routineEditorDesc.trim();
        const notes = routineEditor.notes || "";
        const color = routineEditor.color || "";
        const weeklyGoal = parseInt(routineEditor.weeklyGoal) || null;
        const data = { name, description, notes, color, weeklyGoal, items };
        if (routineEditor.type === "warmup") {
          if (routineEditor.mode === "new") { const newId = Date.now(); setWarmupTemplates(prev => [...prev, { id: newId, ...data }]); }
          else { setWarmupTemplates(prev => prev.map(t => t.id === routineEditor.id ? { ...t, ...data } : t)); if (routineEditor.id === activeWarmupTemplateId) setDefaultWarmupItems(items); }
        } else if (routineEditor.type === "workout") {
          if (routineEditor.mode === "new") { const newId = Date.now(); setWorkoutRoutines(prev => [...prev, { id: newId, ...data }]); }
          else { setWorkoutRoutines(prev => prev.map(t => t.id === routineEditor.id ? { ...t, ...data } : t)); if (routineEditor.id === activeWorkoutRoutineId) setDefaultWorkoutItems(items); }
        } else {
          if (routineEditor.mode === "new") { const newId = Date.now(); setFingerboardRoutines(prev => [...prev, { id: newId, ...data }]); }
          else { setFingerboardRoutines(prev => prev.map(t => t.id === routineEditor.id ? { ...t, ...data } : t)); if (routineEditor.id === activeFingerboardRoutineId) setDefaultFingerboardItems(items); }
        }
        setRoutineEditor(null);
      };

      const duplicateRoutine = () => {
        const name = (routineEditorName.trim() || "Untitled") + " (Copy)";
        const items = routineEditorItems.map(i => ({ ...i, id: Date.now() + Math.random() }));
        const data = { name, description: routineEditorDesc.trim(), notes: routineEditor.notes || "", color: routineEditor.color || "", weeklyGoal: parseInt(routineEditor.weeklyGoal) || null, items };
        if (routineEditor.type === "warmup") setWarmupTemplates(prev => [...prev, { id: Date.now(), ...data }]);
        else if (routineEditor.type === "workout") setWorkoutRoutines(prev => [...prev, { id: Date.now(), ...data }]);
        else setFingerboardRoutines(prev => [...prev, { id: Date.now(), ...data }]);
        setRoutineEditor(null);
      };

      const deleteRoutine = () => {
        if (routineEditor.type === "warmup") {
          if (warmupTemplates.length <= 1) return;
          setWarmupTemplates(prev => prev.filter(t => t.id !== routineEditor.id));
          if (activeWarmupTemplateId === routineEditor.id) { const r = warmupTemplates.find(t => t.id !== routineEditor.id); setActiveWarmupTemplateId(r?.id); setDefaultWarmupItems(r?.items || []); }
        } else if (routineEditor.type === "workout") {
          if (workoutRoutines.length <= 1) return;
          setWorkoutRoutines(prev => prev.filter(t => t.id !== routineEditor.id));
          if (activeWorkoutRoutineId === routineEditor.id) { const r = workoutRoutines.find(t => t.id !== routineEditor.id); setActiveWorkoutRoutineId(r?.id); setDefaultWorkoutItems(r?.items || []); }
        } else {
          if (fingerboardRoutines.length <= 1) return;
          setFingerboardRoutines(prev => prev.filter(t => t.id !== routineEditor.id));
          if (activeFingerboardRoutineId === routineEditor.id) { const r = fingerboardRoutines.find(t => t.id !== routineEditor.id); setActiveFingerboardRoutineId(r?.id); setDefaultFingerboardItems(r?.items || []); }
        }
        setRoutineEditor(null);
      };

      const loadPreset = (preset) => {
        setRoutineEditorName(preset.name);
        setRoutineEditorDesc(preset.description);
        setRoutineEditorItems(preset.items.map(i => ({ ...i, id: Date.now() + Math.random() })));
        setRoutineEditorShowPresets(false);
      };

      const reorderRoutines = (type, idx, dir) => {
        const setter = type === "warmup" ? setWarmupTemplates : type === "workout" ? setWorkoutRoutines : setFingerboardRoutines;
        setter(prev => { const a = [...prev]; const swap = idx + dir; if (swap < 0 || swap >= a.length) return a; [a[idx], a[swap]] = [a[swap], a[idx]]; return a; });
      };

      const commitInlineEdit = () => {
        if (!routineEditorEditingItemId) return;
        setRoutineEditorItems(prev => prev.map(it => it.id === routineEditorEditingItemId ? { ...it, text: routineEditorEditingText || it.text, detail: routineEditorEditingDetail || undefined, restDuration: parseInt(routineEditorEditingRest) || undefined } : it));
        setRoutineEditorEditingItemId(null);
      };

      const addNewTask = () => {
        if (!routineEditorNewItem.trim()) return;
        const newId = Date.now();
        setRoutineEditorItems(prev => [...prev, { id: newId, text: routineEditorNewItem.trim() }]);
        setRoutineEditorEditingItemId(newId);
        setRoutineEditorEditingText(routineEditorNewItem.trim());
        setRoutineEditorEditingDetail("");
        setRoutineEditorEditingRest("");
        setRoutineEditorNewItem("");
      };

      // ── Import modal ─────────────────────────────────────────
      if (showImportRoutine) {
        const doImport = () => {
          try {
            const decoded = JSON.parse(atob(routineImportCode.trim()));
            if (!decoded.name || !Array.isArray(decoded.items)) throw new Error("Invalid");
            const { type, name, description, notes, color, weeklyGoal, items } = decoded;
            const newId = Date.now();
            const data = { id: newId, name, description: description || "", notes: notes || "", color: color || "", weeklyGoal: weeklyGoal || null, items };
            if (type === "warmup") setWarmupTemplates(prev => [...prev, data]);
            else if (type === "workout") setWorkoutRoutines(prev => [...prev, data]);
            else setFingerboardRoutines(prev => [...prev, data]);
            setShowImportRoutine(false); setRoutineImportCode(""); setRoutineImportError("");
          } catch { setRoutineImportError("Invalid code. Make sure you pasted the full share code."); }
        };
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={() => { setShowImportRoutine(false); setRoutineImportCode(""); setRoutineImportError(""); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>Import Routine</div>
            </div>
            <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 12 }}>Paste a share code from another user to import their routine.</div>
            <textarea value={routineImportCode} onChange={e => setRoutineImportCode(e.target.value)} placeholder="Paste share code here…" rows={4} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, fontFamily: "monospace", outline: "none", resize: "vertical" }} />
            {routineImportError && <div style={{ color: W.redDark, fontSize: 12, marginTop: 6 }}>{routineImportError}</div>}
            <button onClick={doImport} style={{ marginTop: 10, width: "100%", padding: "12px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Import</button>
          </div>
        );
      }

      // ── Share modal ───────────────────────────────────────────
      if (routineShareModal) {
        const encoded = btoa(JSON.stringify(routineShareModal));
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={() => setRoutineShareModal(null)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>Share: {routineShareModal.name}</div>
            </div>
            <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 10 }}>Share this code with others. They can import it using the Import Routine button.</div>
            <div style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, padding: "12px", fontFamily: "monospace", fontSize: 11, color: W.textDim, wordBreak: "break-all", marginBottom: 12 }}>{encoded}</div>
            <button onClick={() => navigator.clipboard?.writeText(encoded)} style={{ width: "100%", padding: "12px", background: W.accent, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Copy to Clipboard</button>
          </div>
        );
      }

      // ── Editor view ───────────────────────────────────────────
      if (routineEditor) {
        const ps = presets[routineEditor.type] || [];
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <button onClick={() => setRoutineEditor(null)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <div style={{ fontWeight: 800, fontSize: 16, color: W.text, flex: 1 }}>{routineEditor.mode === "new" ? `New ${typeLabel[routineEditor.type]}` : "Edit Routine"}</div>
              {routineEditor.mode === "edit" && <button onClick={() => { const src = routineEditor.type === "warmup" ? warmupTemplates : routineEditor.type === "workout" ? workoutRoutines : fingerboardRoutines; const r = src.find(x => x.id === routineEditor.id); if (r) setRoutineShareModal({ ...r, type: routineEditor.type }); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "6px 10px", color: W.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Share</button>}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Name</div>
              <input value={routineEditorName} onChange={e => setRoutineEditorName(e.target.value)} placeholder="Routine name" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 14, outline: "none" }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Description (optional)</div>
              <input value={routineEditorDesc} onChange={e => setRoutineEditorDesc(e.target.value)} placeholder="Short description" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 14, outline: "none" }} />
            </div>
            {ps.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <button onClick={() => setRoutineEditorShowPresets(o => !o)} style={{ padding: "8px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  {routineEditorShowPresets ? "▲ Hide presets" : "⚡ Load preset"}
                </button>
                {routineEditorShowPresets && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {ps.map(p => (
                      <button key={p.name} onClick={() => loadPreset(p)} style={{ textAlign: "left", padding: "10px 14px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 12, cursor: "pointer" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: W.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{p.description} · {p.items.length} tasks</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ fontWeight: 800, fontSize: 14, color: W.text, marginBottom: 8 }}>Tasks ({routineEditorItems.length})</div>
            {routineEditorItems.length === 0 && <div style={{ color: W.textDim, fontSize: 13, padding: "8px 0 12px", textAlign: "center" }}>No tasks yet. Add one below or load a preset.</div>}
            {routineEditorItems.map((item, i) => (
              <div key={item.id} style={{ marginBottom: 6 }}
                draggable={routineEditorEditingItemId !== item.id}
                onDragStart={e => e.dataTransfer.setData("text/plain", String(i))}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData("text/plain")); if (from === i || isNaN(from)) return; setRoutineEditorItems(prev => { const a = [...prev]; const [moved] = a.splice(from, 1); a.splice(i, 0, moved); return a; }); }}
              >
                {routineEditorEditingItemId === item.id ? (
                  <div style={{ background: W.surface, border: `1.5px solid ${W.accent}`, borderRadius: 10, padding: "8px 10px" }}>
                    <input autoFocus value={routineEditorEditingText} onChange={e => setRoutineEditorEditingText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") commitInlineEdit(); if (e.key === "Escape") setRoutineEditorEditingItemId(null); }} style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.surface2, color: W.text, fontSize: 13, outline: "none", marginBottom: 6 }} placeholder="Task name" />
                    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                      <input value={routineEditorEditingDetail} onChange={e => setRoutineEditorEditingDetail(e.target.value)} style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface2, color: W.text, fontSize: 12, outline: "none" }} placeholder="Detail (e.g. 3×8, 30s)" />
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" min="0" value={routineEditorEditingRest} onChange={e => setRoutineEditorEditingRest(e.target.value)} style={{ width: 50, padding: "5px 6px", borderRadius: 7, border: `1px solid ${W.border}`, background: W.surface2, color: W.text, fontSize: 12, outline: "none", textAlign: "center" }} placeholder="0" />
                        <span style={{ fontSize: 11, color: W.textMuted }}>s rest</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={commitInlineEdit} style={{ flex: 1, padding: "6px", background: W.accent, border: "none", borderRadius: 7, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✓ Done</button>
                      <button onClick={() => setRoutineEditorEditingItemId(null)} style={{ padding: "6px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, color: W.textDim, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 10px", cursor: "grab" }}>
                    <span style={{ color: W.textDim, fontSize: 12, cursor: "grab", padding: "0 2px" }}>⠿</span>
                    <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setRoutineEditorEditingItemId(item.id); setRoutineEditorEditingText(item.text); setRoutineEditorEditingDetail(item.detail || ""); setRoutineEditorEditingRest(item.restDuration ? String(item.restDuration) : ""); }}>
                      <div style={{ fontSize: 13, color: W.text }}>{item.text}</div>
                      {item.detail && <div style={{ fontSize: 11, color: W.textMuted }}>{item.detail}</div>}
                    </div>
                    {item.restDuration > 0 && <span style={{ fontSize: 10, color: W.textMuted, background: W.surface2, borderRadius: 5, padding: "1px 5px" }}>{item.restDuration}s</span>}
                    <button onClick={() => setRoutineEditorItems(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: W.redDark, fontSize: 14, cursor: "pointer", padding: "2px 4px", fontWeight: 700 }}>✕</button>
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 16 }}>
              <input value={routineEditorNewItem} onChange={e => setRoutineEditorNewItem(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNewTask(); }} placeholder="Add task…" style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
              <button onClick={addNewTask} style={{ padding: "9px 16px", background: W.accent, borderRadius: 10, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>+</button>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Notes (optional)</div>
              <textarea value={routineEditor.notes || ""} onChange={e => setRoutineEditor(re => ({ ...re, notes: e.target.value }))} placeholder="Rest intervals, equipment, cues…" rows={2} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Weekly goal</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" min="0" max="7" value={routineEditor.weeklyGoal || ""} onChange={e => setRoutineEditor(re => ({ ...re, weeklyGoal: e.target.value }))} placeholder="0" style={{ width: 50, padding: "8px 10px", borderRadius: 8, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 14, outline: "none", textAlign: "center" }} />
                <span style={{ fontSize: 12, color: W.textMuted }}>× / week</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveEditor} style={{ flex: 1, padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Save Routine</button>
              {routineEditor.mode === "edit" && <button onClick={duplicateRoutine} style={{ padding: "13px 14px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Copy</button>}
              {routineEditor.mode === "edit" && <button onClick={deleteRoutine} style={{ padding: "13px 14px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Delete</button>}
            </div>
          </div>
        );
      }

      // ── Type picker ───────────────────────────────────────────
      if (showAddRoutineTypePicker) {
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button onClick={() => setShowAddRoutineTypePicker(false)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>Choose Type</div>
            </div>
            {[
              { type: "warmup", emoji: "🧘", label: "Warmup", desc: "Mobility, activation, and easy climbing prep" },
              { type: "workout", emoji: "💪", label: "Workout", desc: "Strength and conditioning exercises" },
              { type: "fingerboard", emoji: "🤙", label: "Fingerboard", desc: "Hangboard protocols and finger training" },
            ].map(opt => (
              <div key={opt.type} onClick={() => { setShowAddRoutineTypePicker(false); openEditor("new", opt.type, null); }} style={{ display: "flex", alignItems: "center", gap: 14, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 16, padding: "16px 18px", marginBottom: 10, cursor: "pointer" }}>
                <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                <div><div style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{opt.label}</div><div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>{opt.desc}</div></div>
                <span style={{ marginLeft: "auto", color: W.textMuted, fontSize: 20 }}>›</span>
              </div>
            ))}
          </div>
        );
      }

      // ── Preview view ──────────────────────────────────────────
      if (routinePreview) {
        const src = routinePreview.type === "warmup" ? warmupTemplates : routinePreview.type === "workout" ? workoutRoutines : fingerboardRoutines;
        const routine = src.find(r => r.id === routinePreview.id);
        if (!routine) { setRoutinePreview(null); return null; }
        const accentColor = routine.color || W.accent;
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <button onClick={() => setRoutinePreview(null)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>← Back</button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: W.text }}>{routine.name}</div>
                {routine.description && <div style={{ fontSize: 12, color: W.textMuted, marginTop: 1 }}>{routine.description}</div>}
              </div>
              <button onClick={() => { setRoutinePreview(null); openEditor("edit", routinePreview.type, routine.id); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 12px", color: W.textDim, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Edit</button>
            </div>
            {routine.notes && <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: W.textMuted, borderLeft: `3px solid ${accentColor}` }}>{routine.notes}</div>}
            <div style={{ fontWeight: 700, fontSize: 12, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Tasks ({(routine.items || []).length})</div>
            {(routine.items || []).length === 0 && <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No tasks in this routine yet.</div>}
            {(routine.items || []).map((item, i) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${W.border}`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: W.text }}>{item.text}</div>
                  {item.detail && <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{item.detail}</div>}
                </div>
                {item.restDuration > 0 && <span style={{ fontSize: 10, color: W.textMuted, background: W.surface2, borderRadius: 5, padding: "2px 6px", flexShrink: 0 }}>{item.restDuration}s rest</span>}
              </div>
            ))}
            {routine.weeklyGoal > 0 && (
              <div style={{ marginTop: 14, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: W.textMuted }}>Weekly goal: <span style={{ color: W.text, fontWeight: 700 }}>{routine.weeklyGoal}× / week</span></div>
              </div>
            )}
          </div>
        );
      }

      // ── Routines list ─────────────────────────────────────────
      const sections = [
        { sectionLabel: "🧘 Warmup", type: "warmup", typeRoutines: warmupTemplates, emptyLabel: "warmup" },
        { sectionLabel: "💪 Workout", type: "workout", typeRoutines: workoutRoutines, emptyLabel: "workout" },
        { sectionLabel: "🤙 Fingerboard", type: "fingerboard", typeRoutines: fingerboardRoutines, emptyLabel: "fingerboard" },
      ];
      const searchLower = routineListSearch.toLowerCase();
      const totalCount = sections.reduce((t, s) => t + s.typeRoutines.length, 0);
      let longPressTimer = null;
      return (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setShowAddRoutineTypePicker(true)} style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>+ Add Routine</button>
            <button onClick={() => setShowImportRoutine(true)} style={{ padding: "11px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Import</button>
          </div>
          {totalCount > 3 && (
            <div style={{ marginBottom: 14 }}>
              <input value={routineListSearch} onChange={e => setRoutineListSearch(e.target.value)} placeholder="Search routines…" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 13, outline: "none" }} />
            </div>
          )}
          {sections.map(({ sectionLabel, type, typeRoutines, emptyLabel }) => {
            const filtered = routineListSearch ? typeRoutines.filter(r => r.name.toLowerCase().includes(searchLower) || (r.description || "").toLowerCase().includes(searchLower)) : typeRoutines;
            const isCollapsed = !!collapsedRoutineSections[type];
            return (
              <div key={type} style={{ marginBottom: 22 }}>
                <div onClick={() => setCollapsedRoutineSections(prev => ({ ...prev, [type]: !prev[type] }))} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 10, userSelect: "none" }}>
                  <div style={{ fontWeight: 800, fontSize: 12, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{sectionLabel} <span style={{ fontWeight: 500, opacity: 0.7 }}>({filtered.length})</span></div>
                  <span style={{ color: W.textDim, fontSize: 12 }}>{isCollapsed ? "▼" : "▲"}</span>
                </div>
                {!isCollapsed && filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "18px 0" }}>
                    {routineListSearch
                      ? <div style={{ fontSize: 13, color: W.textDim }}>No {emptyLabel} routines match your search.</div>
                      : <div>
                          <div style={{ fontSize: 13, color: W.textDim, marginBottom: 10 }}>No {emptyLabel} routines yet.</div>
                          <button onClick={() => { openEditor("new", type, null); }} style={{ padding: "8px 16px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>+ Add {emptyLabel} routine</button>
                        </div>
                    }
                  </div>
                )}
                {!isCollapsed && filtered.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {filtered.map((routine) => {
                      const usageSessions = getUsage(type, routine);
                      const lastUsed = usageSessions.length > 0 ? usageSessions.sort((a,b) => new Date(b.date) - new Date(a.date))[0] : null;
                      const streak = getStreak(usageSessions, routine.weeklyGoal);
                      const today = new Date(); today.setHours(0,0,0,0);
                      const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay());
                      const thisWeekCount = usageSessions.filter(s => new Date(s.date) >= weekStart).length;
                      const isSwiped = swipedRoutineCard?.type === type && swipedRoutineCard?.id === routine.id;
                      return (
                        <div key={routine.id} style={{ position: "relative", borderRadius: 14, overflow: "hidden" }}>
                          {/* Swipe-reveal delete background */}
                          <div style={{ position: "absolute", inset: 0, background: W.redDark, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, borderRadius: 14 }}>
                            <button onClick={e => { e.stopPropagation();
                              const src2 = type === "warmup" ? warmupTemplates : type === "workout" ? workoutRoutines : fingerboardRoutines;
                              if (src2.length <= 1) { setSwipedRoutineCard(null); return; }
                              if (type === "warmup") setWarmupTemplates(prev => prev.filter(t => t.id !== routine.id));
                              else if (type === "workout") setWorkoutRoutines(prev => prev.filter(t => t.id !== routine.id));
                              else setFingerboardRoutines(prev => prev.filter(t => t.id !== routine.id));
                              setSwipedRoutineCard(null);
                            }} style={{ background: "none", border: "none", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Delete</button>
                          </div>
                          {/* Card — color accent via inset box-shadow to avoid overflow:hidden clipping */}
                          <div
                            style={{ background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: 14, padding: "12px", paddingLeft: 12, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, transform: isSwiped ? "translateX(-80px)" : "translateX(0)", transition: "transform 0.2s ease", position: "relative" }}
                            onClick={() => { if (isSwiped) { setSwipedRoutineCard(null); return; } setRoutinePreview({ type, id: routine.id }); }}
                            onTouchStart={e => {
                              e.currentTarget._touchStartX = e.touches[0].clientX;
                              longPressTimer = setTimeout(() => { longPressTimer = null; openEditor("edit", type, routine.id); }, 600);
                            }}
                            onTouchMove={() => { clearTimeout(longPressTimer); longPressTimer = null; }}
                            onTouchEnd={e => {
                              clearTimeout(longPressTimer);
                              if (longPressTimer === null) return; // long press already fired
                              longPressTimer = null;
                              const dx = e.changedTouches[0].clientX - (e.currentTarget._touchStartX || 0);
                              if (dx < -40) setSwipedRoutineCard({ type, id: routine.id });
                              else if (dx > 20) setSwipedRoutineCard(null);
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
                              <span style={{ fontWeight: 800, fontSize: 13, color: W.text, lineHeight: 1.2, flex: 1 }}>{routine.name}</span>
                              <span style={{ fontSize: 9, color: W.textMuted, background: W.surface2, borderRadius: 4, padding: "1px 5px", fontWeight: 600, flexShrink: 0 }}>{typeLabel[type]}</span>
                            </div>
                            {routine.description && <div style={{ fontSize: 11, color: W.textMuted, lineHeight: 1.3 }}>{routine.description}</div>}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                              <span style={{ fontSize: 10, color: W.textDim, background: W.surface2, borderRadius: 4, padding: "1px 5px" }}>{(routine.items || []).length} tasks</span>
                              {usageSessions.length > 0 && <span style={{ fontSize: 10, color: W.textDim, background: W.surface2, borderRadius: 4, padding: "1px 5px" }}>{usageSessions.length} uses</span>}
                              {streak > 0 && <span style={{ fontSize: 10, color: W.accent, background: W.surface2, borderRadius: 4, padding: "1px 5px" }}>🔥 {streak}wk</span>}
                            </div>
                            {lastUsed && <div style={{ fontSize: 10, color: W.textDim }}>Last: {formatDate(lastUsed.date)}</div>}
                            {routine.weeklyGoal > 0 && (
                              <div>
                                <div style={{ fontSize: 10, color: thisWeekCount >= routine.weeklyGoal ? W.accent : W.textDim, marginBottom: 3 }}>{thisWeekCount}/{routine.weeklyGoal} this week</div>
                                <div style={{ height: 3, borderRadius: 2, background: W.surface2, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${Math.min(100, (thisWeekCount / routine.weeklyGoal) * 100)}%`, background: thisWeekCount >= routine.weeklyGoal ? W.accent : `${W.accent}88`, borderRadius: 2 }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    };

    if (routineEditor || showAddRoutineTypePicker || showImportRoutine || routineShareModal || routinePreview) {
      return (
        <div style={{ padding: "24px 20px" }}>
          {renderRoutinesPanel()}
        </div>
      );
    }

    return (
      <div style={{ padding: "24px 20px" }}>
        {/* Header row: avatar + name/stats/follow pills + action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {profilePic
            ? <img src={profilePic} style={{ width: 58, height: 58, borderRadius: 18, objectFit: "cover", boxShadow: `0 4px 14px ${W.accentGlow}`, flexShrink: 0, border: `2px solid ${W.accent}` }} />
            : <div style={{ width: 58, height: 58, borderRadius: 18, background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, boxShadow: `0 4px 14px ${W.accentGlow}`, flexShrink: 0 }}>🧗</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: W.text, lineHeight: 1.2 }}>{currentUser?.displayName || "Climber"}</div>
            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>@{currentUser?.username} · {sessions.length} sessions · {allClimbs.length} climbs</div>
            <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
              <button onClick={() => showUserList("following")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: W.textMuted, fontWeight: 500 }}>
                <span style={{ fontWeight: 700, color: W.text }}>{socialFollowing.length}</span> following
              </button>
              <button onClick={() => showUserList("followers")} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "2px 7px", cursor: "pointer", fontSize: 10, color: W.textMuted, fontWeight: 500 }}>
                <span style={{ fontWeight: 700, color: W.text }}>{socialFollowers.length}</span> followers
              </button>
            </div>
          </div>
          {/* Compact action buttons stacked vertically */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
            <button onClick={() => setShowAccountPanel(true)} style={{ padding: "6px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 9, fontSize: 16, color: W.textMuted, cursor: "pointer" }}>⚙️</button>
            <button onClick={() => setScreen("social")} style={{ padding: "6px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 9, fontSize: 16, color: W.textMuted, cursor: "pointer" }}>👥</button>
            <button onClick={goToLeaderboard} style={{ padding: "6px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 9, fontSize: 16, color: W.textMuted, cursor: "pointer" }}>🏆</button>
          </div>
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

            {/* Home Gym */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Home Gym (default session location)</div>
              <LocationDropdown value={mainGym} onChange={v => { setMainGym(v); addCustomLocation(v); }} open={homeGymDropOpen} setOpen={setHomeGymDropOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
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

            {/* Grading (collapsible) */}
            <div style={{ marginBottom: 14, border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setSettingsGradingOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: W.surface2, border: "none", padding: "10px 12px", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Grading Schemes</span>
                <span style={{ fontSize: 12, color: W.textDim }}>{settingsGradingOpen ? "▲" : "▼"}</span>
              </button>
              {settingsGradingOpen && (
                <div style={{ padding: "12px", borderTop: `1px solid ${W.border}` }}>
                  {/* Custom Grading Schemes */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2 }}>Custom Schemes</div>
                      <button onClick={() => { setSchemeName(""); setSchemeGrades([]); setSchemeEditId(null); setSchemeBuilderFor(null); setShowSchemeBuilder(true); }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", background: W.accent+"22", border: `1px solid ${W.accent}`, borderRadius: 8, color: W.accent, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>+ New</button>
                    </div>
                    {customGradingSchemes.length === 0 ? (
                      <div style={{ fontSize: 12, color: W.textDim, padding: "8px 0" }}>No custom schemes yet. Create one above or during gym setup.</div>
                    ) : (
                      customGradingSchemes.map(scheme => (
                        <div key={scheme.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, marginBottom: 6 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{scheme.name}</div>
                            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                              {(scheme.grades || []).slice(0, 6).map(g => (
                                <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: g.color || "#888" }} />
                                  <span style={{ fontSize: 10, color: W.textMuted }}>{g.label}</span>
                                </div>
                              ))}
                              {(scheme.grades || []).length > 6 && <span style={{ fontSize: 10, color: W.textDim }}>+{scheme.grades.length-6} more</span>}
                            </div>
                          </div>
                          <button onClick={() => { setSchemeEditId(scheme.id); setSchemeName(scheme.name); setSchemeGrades(scheme.grades || []); setSchemeBuilderFor(null); setShowSchemeBuilder(true); }} style={{ padding: "6px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => setCustomGradingSchemes(prev => prev.filter(s => s.id !== scheme.id))} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 18, cursor: "pointer", padding: "0 4px" }}>×</button>
                        </div>
                      ))
                    )}
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
                        <input value={customBoulderScaleName} onChange={e => setCustomBoulderScaleName(e.target.value)} placeholder="e.g. Gym Grades" style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }} />
                        <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Grades (easiest → hardest, one per line or comma-separated)</div>
                        <textarea value={customBoulderInput} onChange={e => setCustomBoulderInput(e.target.value)} onBlur={e => { const parsed = e.target.value.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); setCustomBoulderGrades(parsed); setCustomBoulderInput(parsed.join(", ")); }} placeholder={"Easy\nMedium\nHard\nVery Hard"} rows={3} style={{ width: "100%", boxSizing: "border-box", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 10px", color: W.text, fontSize: 12, resize: "vertical", fontFamily: "inherit" }} />
                        {customBoulderGrades.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{customBoulderGrades.map((g, i) => <span key={i} style={{ background: W.accent + "22", color: W.accent, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{g}</span>)}</div>}
                      </div>
                    )}
                  </div>
                  {/* Rope grading */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Rope Grading</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {["YDS", "French", "Custom"].map(s => (
                        <button key={s} onClick={() => setPreferredRopeScale(s)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: preferredRopeScale === s ? W.accent : W.border, background: preferredRopeScale === s ? W.accent + "22" : W.surface2, color: preferredRopeScale === s ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: preferredRopeScale === s ? 700 : 500 }}>{s === "Custom" ? customRopeScaleName : s}</button>
                      ))}
                    </div>
                    {preferredRopeScale === "Custom" && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Scale name</div>
                        <input value={customRopeScaleName} onChange={e => setCustomRopeScaleName(e.target.value)} placeholder="e.g. Local Wall Grades" style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", background: W.surface2, border: `1px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", marginBottom: 8 }} />
                        <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 4 }}>Grades (easiest → hardest, one per line or comma-separated)</div>
                        <textarea value={customRopeInput} onChange={e => setCustomRopeInput(e.target.value)} onBlur={e => { const parsed = e.target.value.split(/[\n,]+/).map(x => x.trim()).filter(Boolean); setCustomRopeGrades(parsed); setCustomRopeInput(parsed.join(", ")); }} placeholder={"Easy\nMedium\nHard\nProject"} rows={3} style={{ width: "100%", boxSizing: "border-box", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "8px 10px", color: W.text, fontSize: 12, resize: "vertical", fontFamily: "inherit" }} />
                        {customRopeGrades.length > 0 && <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>{customRopeGrades.map((g, i) => <span key={i} style={{ background: W.accent + "22", color: W.accent, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{g}</span>)}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Session Type Order (collapsible) */}
            <div style={{ marginBottom: 14, border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden" }}>
              <button onClick={() => setSettingsSessionTypeOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: W.surface2, border: "none", padding: "10px 12px", cursor: "pointer" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Session Type Order</span>
                <span style={{ fontSize: 12, color: W.textDim }}>{settingsSessionTypeOpen ? "▲" : "▼"}</span>
              </button>
              {settingsSessionTypeOpen && (
                <div style={{ padding: "10px 12px", borderTop: `1px solid ${W.border}` }}>
                  {sessionTypeOrder.map((typeId, i) => {
                    const labels = { boulder: "Bouldering", rope: "Rope Climbing", speed: "Speed Climbing", warmup: "Warm Up", workout: "Workout", fingerboard: "Fingerboard Session", fitness: "Fitness" };
                    return (
                      <div key={typeId} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", marginBottom: 5, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 9 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          <button onClick={() => i > 0 && setSessionTypeOrder(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; })} style={{ background: "transparent", border: "none", color: i > 0 ? W.textDim : W.border, fontSize: 10, cursor: i > 0 ? "pointer" : "default", padding: "0 2px", lineHeight: 1 }}>▲</button>
                          <button onClick={() => i < sessionTypeOrder.length - 1 && setSessionTypeOrder(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; })} style={{ background: "transparent", border: "none", color: i < sessionTypeOrder.length - 1 ? W.textDim : W.border, fontSize: 10, cursor: i < sessionTypeOrder.length - 1 ? "pointer" : "default", padding: "0 2px", lineHeight: 1 }}>▼</button>
                        </div>
                        <span style={{ fontSize: 12, color: W.text, flex: 1 }}>{labels[typeId] || typeId}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gym Set Stale Alert */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Gym Set Stale Alert</div>
              <div style={{ fontSize: 12, color: W.textDim, marginBottom: 8 }}>Highlight climbs that have been on the wall for longer than:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[4, 6, 8, 10, 12].map(w => (
                  <button key={w} onClick={() => setGymSetStaleWeeks(w)} style={{ padding: "6px 14px", borderRadius: 16, border: "2px solid", borderColor: gymSetStaleWeeks === w ? W.accent : W.border, background: gymSetStaleWeeks === w ? W.accent + "22" : W.surface2, color: gymSetStaleWeeks === w ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: gymSetStaleWeeks === w ? 700 : 500 }}>{w} weeks</button>
                ))}
              </div>
            </div>

            {/* Warmup Templates (collapsible) */}
            {(() => {
              const activeTpl = warmupTemplates.find(t => t.id === activeWarmupTemplateId) || warmupTemplates[0];
              const updateActiveTplItems = (updater) => setWarmupTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, items: updater(t.items) } : t));
              return (
                <div style={{ marginBottom: 14, border: `1px solid ${W.border}`, borderRadius: 10, overflow: "hidden" }}>
                  <button onClick={() => setSettingsWarmupOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: W.surface2, border: "none", padding: "10px 12px", cursor: "pointer" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>Warmup Templates</span>
                    <span style={{ fontSize: 12, color: W.textDim }}>{settingsWarmupOpen ? "▲" : "▼"}</span>
                  </button>
                  {settingsWarmupOpen && <div style={{ padding: "10px 12px", borderTop: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, display: "none" }}>Warmup Templates</div>
                  {/* Template tabs */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    {warmupTemplates.map(t => (
                      <button key={t.id} onClick={() => setActiveWarmupTemplateId(t.id)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${t.id === activeTpl.id ? W.pinkDark : W.border}`, background: t.id === activeTpl.id ? W.pink : W.surface2, color: t.id === activeTpl.id ? W.pinkDark : W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                        {t.name}
                      </button>
                    ))}
                    <button onClick={() => {
                      const newId = Date.now();
                      setWarmupTemplates(prev => [...prev, { id: newId, name: `Template ${prev.length + 1}`, items: [] }]);
                      setActiveWarmupTemplateId(newId);
                    }} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px dashed ${W.border}`, background: "transparent", color: W.textDim, fontSize: 12, cursor: "pointer" }}>+ New</button>
                  </div>
                  {/* Template name edit + delete */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <input value={activeTpl.name} onChange={e => setWarmupTemplates(prev => prev.map(t => t.id === activeTpl.id ? { ...t, name: e.target.value } : t))}
                      style={{ flex: 1, padding: "6px 10px", borderRadius: 9, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 12, outline: "none" }} placeholder="Template name" />
                    <button onClick={() => {
                      const newId = Date.now();
                      setWarmupTemplates(prev => [...prev, { id: newId, name: `${activeTpl.name} (copy)`, items: activeTpl.items.map(i => ({ ...i, id: Date.now() + Math.random() })) }]);
                      setActiveWarmupTemplateId(newId);
                    }} style={{ padding: "6px 10px", borderRadius: 9, border: `1px solid ${W.border}`, background: "transparent", color: W.textMuted, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>Duplicate</button>
                    {warmupTemplates.length > 1 && (
                      <button onClick={() => {
                        const remaining = warmupTemplates.filter(t => t.id !== activeTpl.id);
                        setWarmupTemplates(remaining);
                        setActiveWarmupTemplateId(remaining[0].id);
                      }} style={{ padding: "6px 10px", borderRadius: 9, border: `1px solid ${W.border}`, background: "transparent", color: W.redDark, fontSize: 12, cursor: "pointer" }}>Delete</button>
                    )}
                  </div>
                  {/* Items list */}
                  {activeTpl.items.map((item, i) => (
                    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", marginBottom: 5, background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 9 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button onClick={() => i > 0 && updateActiveTplItems(prev => { const a = [...prev]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; })} style={{ background: "transparent", border: "none", color: i > 0 ? W.textDim : W.border, fontSize: 10, cursor: i > 0 ? "pointer" : "default", padding: "0 2px", lineHeight: 1 }}>▲</button>
                        <button onClick={() => i < activeTpl.items.length - 1 && updateActiveTplItems(prev => { const a = [...prev]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; })} style={{ background: "transparent", border: "none", color: i < activeTpl.items.length - 1 ? W.textDim : W.border, fontSize: 10, cursor: i < activeTpl.items.length - 1 ? "pointer" : "default", padding: "0 2px", lineHeight: 1 }}>▼</button>
                      </div>
                      <span style={{ fontSize: 12, color: W.text, flex: 1 }}>{item.text}</span>
                      <button onClick={() => updateActiveTplItems(prev => prev.filter(x => x.id !== item.id))} style={{ background: "transparent", border: "none", color: W.textDim, fontSize: 16, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <input value={warmupSettingsNewItem} onChange={e => setWarmupSettingsNewItem(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && warmupSettingsNewItem.trim()) { updateActiveTplItems(prev => [...prev, { id: Date.now(), text: warmupSettingsNewItem.trim() }]); setWarmupSettingsNewItem(""); } }}
                      placeholder="Add item…" style={{ flex: 1, padding: "7px 10px", borderRadius: 9, border: `1px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 12, outline: "none" }} />
                    <button onClick={() => { if (warmupSettingsNewItem.trim()) { updateActiveTplItems(prev => [...prev, { id: Date.now(), text: warmupSettingsNewItem.trim() }]); setWarmupSettingsNewItem(""); } }} style={{ padding: "7px 12px", borderRadius: 9, border: `1px solid ${W.pinkDark}55`, background: W.pink, color: W.pinkDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
                  </div>
                  <button onClick={() => updateActiveTplItems(() => DEFAULT_WARMUP_ITEMS.map(i => ({ ...i })))} style={{ marginTop: 6, padding: "5px 10px", borderRadius: 8, border: `1px solid ${W.border}`, background: "transparent", color: W.textDim, fontSize: 11, cursor: "pointer" }}>Reset to defaults</button>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <span style={{ fontSize: 12, color: W.text }}>Auto-end when all tasks checked</span>
                    <button onClick={() => setAutoEndWarmup(v => !v)} style={{ width: 42, height: 24, borderRadius: 12, border: "none", background: autoEndWarmup ? W.pinkDark : W.border, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
                      <div style={{ position: "absolute", top: 3, left: autoEndWarmup ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                    </button>
                  </div>
                  </div>}
                </div>
              );
            })()}

            {/* App Theme */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>App Theme</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  { id: "espresso", label: "Espresso", icon: "☕",  desc: "Dark warm" },
                  { id: "neon",     label: "Neon",     icon: "⚡",  desc: "Black + cyan" },
                  { id: "midnight", label: "Midnight", icon: "🌙",  desc: "Dark navy" },
                  { id: "forest",   label: "Forest",   icon: "🌲",  desc: "Dark green" },
                  { id: "blossom",  label: "Blossom",  icon: "🌸",  desc: "Pink light" },
                  { id: "sakura",   label: "Sakura",   icon: "🌺",  desc: "Dark pink" },
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
            <button onClick={handleExportData} style={{ width: "100%", padding: "11px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>Export My Data (JSON)</button>
            {!confirmLogout
              ? <button onClick={() => setConfirmLogout(true)} style={{ width: "100%", padding: "11px", background: W.red, border: `1px solid ${W.redDark}`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>Sign Out</button>
              : <div style={{ background: W.red, borderRadius: 12, padding: "14px", border: `1px solid ${W.redDark}`, marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W.redDark, marginBottom: 10 }}>Sign out of @{currentUser?.username}?</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setConfirmLogout(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleLogout} style={{ padding: "9px", background: W.redDark, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Sign Out</button>
                  </div>
                </div>}
            {!confirmDeleteAccount
              ? <button onClick={() => { setConfirmDeleteAccount(true); setDeleteAccountInput(""); }} style={{ width: "100%", padding: "11px", background: "transparent", border: `1px solid ${W.redDark}55`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: 0.7 }}>Delete Account</button>
              : <div style={{ background: W.red, borderRadius: 12, padding: "14px", border: `1px solid ${W.redDark}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: W.redDark, marginBottom: 4 }}>This will permanently delete all your data.</div>
                  <div style={{ fontSize: 12, color: W.redDark, opacity: 0.8, marginBottom: 10 }}>Type your username to confirm:</div>
                  <input value={deleteAccountInput} onChange={e => setDeleteAccountInput(e.target.value)} placeholder={currentUser?.username} style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", background: W.surface, border: `1.5px solid ${W.redDark}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", marginBottom: 10 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button onClick={() => setConfirmDeleteAccount(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button onClick={handleDeleteAccount} disabled={deleteAccountInput !== currentUser?.username} style={{ padding: "9px", background: deleteAccountInput === currentUser?.username ? W.redDark : W.border, border: "none", borderRadius: 10, color: "#fff", cursor: deleteAccountInput === currentUser?.username ? "pointer" : "default", fontWeight: 700, opacity: deleteAccountInput === currentUser?.username ? 1 : 0.5 }}>Delete Forever</button>
                  </div>
                </div>}
          </div>
          </div>
        )}

        <div style={{ display: "flex", background: W.surface2, borderRadius: 14, padding: 5, marginBottom: 10, border: `1px solid ${W.border}` }}>
          {[{ id: "stats", label: "Stats" }, { id: "climbing", label: "Climbing" }, { id: "training", label: "Training" }].map(tab => (
            <button key={tab.id} onClick={() => setProfileTab(tab.id)} style={{ flex: 1, padding: "12px 4px", borderRadius: 10, border: "none", background: profileTab === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: profileTab === tab.id ? "#fff" : W.textDim, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>{tab.label}</button>
          ))}
        </div>

        {profileTab === "climbing" && (
          <div style={{ display: "flex", background: W.surface2, borderRadius: 10, padding: 3, marginBottom: 18, border: `1px solid ${W.border}` }}>
            {[{ id: "climbs", label: "Climbs" }, { id: "sessions", label: "Sessions" }, { id: "gyms", label: "Gyms" }].map(tab => (
              <button key={tab.id} onClick={() => setClimbingSubTab(tab.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", background: climbingSubTab === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: climbingSubTab === tab.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{tab.label}</button>
            ))}
          </div>
        )}

        {profileTab === "training" && (
          <div style={{ display: "flex", background: W.surface2, borderRadius: 10, padding: 3, marginBottom: 18, border: `1px solid ${W.border}` }}>
            {[{ id: "overview", label: "Overview" }, { id: "routines", label: "Routines" }].map(tab => (
              <button key={tab.id} onClick={() => setTrainingSubTab(tab.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", background: trainingSubTab === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: trainingSubTab === tab.id ? "#fff" : W.textDim, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{tab.label}</button>
            ))}
          </div>
        )}

        {profileTab === "training" && trainingSubTab === "overview" && (() => {
          const warmupSessions     = sessions.filter(s => (s.warmupTotalSec || 0) > 0);
          const workoutSessions    = sessions.filter(s => (s.workoutTotalSec || 0) > 0);
          const fingerboardSessions = sessions.filter(s => (s.fingerboardTotalSec || 0) > 0);
          const fitnessSessions     = sessions.filter(s => (s.fitnessSections || []).length > 0);
          const totalWarmupSec     = warmupSessions.reduce((sum, s) => sum + (s.warmupTotalSec || 0), 0);
          const totalWorkoutSec    = workoutSessions.reduce((sum, s) => sum + (s.workoutTotalSec || 0), 0);
          const totalFingerboardSec = fingerboardSessions.reduce((sum, s) => sum + (s.fingerboardTotalSec || 0), 0);

          // ── Calendar heatmap — past 8 weeks ────────────────────
          const today = new Date(); today.setHours(0,0,0,0);
          const calStart = new Date(today); calStart.setDate(calStart.getDate() - 55); // 8 weeks back
          const calDays = [];
          for (let d = new Date(calStart); d <= today; d.setDate(d.getDate() + 1)) calDays.push(new Date(d));
          const trainingByDate = {};
          sessions.forEach(s => {
            const day = s.date?.slice(0,10);
            if (!day) return;
            if (!trainingByDate[day]) trainingByDate[day] = { warmup: false, workout: false, fingerboard: false, fitness: false };
            if ((s.warmupTotalSec || 0) > 0) trainingByDate[day].warmup = true;
            if ((s.workoutTotalSec || 0) > 0) trainingByDate[day].workout = true;
            if ((s.fingerboardTotalSec || 0) > 0) trainingByDate[day].fingerboard = true;
            if ((s.fitnessSections || []).length > 0) trainingByDate[day].fitness = true;
          });
          const calCols = [];
          for (let i = 0; i < calDays.length; i += 7) calCols.push(calDays.slice(i, i + 7));

          // ── Routine breakdown ──────────────────────────────────
          const warmupByRoutine = {};
          warmupSessions.forEach(s => { const k = s.warmupTemplateName || "Unknown"; warmupByRoutine[k] = (warmupByRoutine[k] || 0) + 1; });
          const workoutByRoutine = {};
          workoutSessions.forEach(s => { const k = s.workoutRoutineName || "Unknown"; workoutByRoutine[k] = (workoutByRoutine[k] || 0) + 1; });
          const fingerboardByRoutine = {};
          fingerboardSessions.forEach(s => { const k = s.fingerboardRoutineName || "Unknown"; fingerboardByRoutine[k] = (fingerboardByRoutine[k] || 0) + 1; });
          const fitnessByBlock = {};
          const fitnessBestResult = {}; // { [blockName]: { result, date, numeric } }
          fitnessSessions.forEach(s => (s.fitnessSections || []).forEach(sec => {
            fitnessByBlock[sec.name] = (fitnessByBlock[sec.name] || 0) + 1;
            if (sec.result) {
              const num = parseFloat(sec.result);
              const prev = fitnessBestResult[sec.name];
              if (!prev || (isFinite(num) && (!isFinite(parseFloat(prev.result)) || num > parseFloat(prev.result)))) {
                fitnessBestResult[sec.name] = { result: sec.result, date: s.date?.slice(0,10) };
              }
            }
          }));
          const fitnessAllTasks  = fitnessSessions.reduce((t, s) => t + (s.fitnessSections || []).reduce((a, sec) => a + (sec.items || []).length, 0), 0);
          const fitnessDoneTasks = fitnessSessions.reduce((t, s) => t + (s.fitnessSections || []).reduce((a, sec) => a + (sec.items || []).filter(i => i.checked).length, 0), 0);
          const fitnessCompletionRate = fitnessAllTasks > 0 ? `${Math.round((fitnessDoneTasks / fitnessAllTasks) * 100)}%` : null;

          const StatCard = ({ emoji, label, count, totalSec, byRoutine, accent, secondValue, secondLabel, thirdValue, thirdLabel, bestResult }) => (
            <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{emoji}</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: W.text }}>{label}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: thirdValue !== undefined ? "1fr 1fr 1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: accent || W.accent }}>{count}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>sessions</div>
                </div>
                <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: accent || W.accent }}>{secondValue !== undefined ? secondValue : formatDuration(totalSec)}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>{secondLabel || "total time"}</div>
                </div>
                {thirdValue !== undefined && (
                  <div style={{ background: W.surface2, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: accent || W.accent }}>{thirdValue}</div>
                    <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>{thirdLabel || ""}</div>
                  </div>
                )}
              </div>
              {Object.entries(byRoutine).sort((a,b) => b[1]-a[1]).map(([name, cnt]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderTop: `1px solid ${W.border}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, color: W.textDim }}>{name}</span>
                    {bestResult?.[name] && <span style={{ fontSize: 10, color: accent || W.accent, fontWeight: 700, marginLeft: 6 }}>🏆 {bestResult[name].result}</span>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: accent || W.accent, flexShrink: 0 }}>{cnt}×</span>
                </div>
              ))}
            </div>
          );

          if (warmupSessions.length === 0 && workoutSessions.length === 0 && fingerboardSessions.length === 0 && fitnessSessions.length === 0) return (
            <div style={{ textAlign: "center", color: W.textDim, padding: "40px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🏋️</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: W.text, marginBottom: 6 }}>No training data yet</div>
              <div style={{ fontSize: 13 }}>Use the warmup, workout, or fingerboard sections during a session to track training time.</div>
            </div>
          );
          return (
            <div>
              <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 16, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: W.text, marginBottom: 10 }}>Training days — past 8 weeks</div>
                <div style={{ display: "flex", gap: 3 }}>
                  {calCols.map((week, wi) => (
                    <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {week.map(d => {
                        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                        const t = trainingByDate[key];
                        const hasTraining = t?.warmup || t?.workout || t?.fingerboard || t?.fitness;
                        const typeCount = [t?.warmup, t?.workout, t?.fingerboard, t?.fitness].filter(Boolean).length;
                        const bg = !t ? W.surface2 : typeCount > 1 ? W.accent : t?.warmup ? W.pinkDark : t?.workout ? W.accentDark : t?.fingerboard ? W.yellowDark : "#f97316";
                        return <div key={key} title={key} style={{ width: 12, height: 12, borderRadius: 3, background: hasTraining ? bg : W.surface2, opacity: hasTraining ? 1 : 0.4 }} />;
                      })}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  {[["🧘",W.pinkDark,"Warmup"],["💪",W.accentDark,"Workout"],["🤙",W.yellowDark,"Fingerboard"],["🏋️","#f97316","Fitness"]].map(([e,c,l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                      <span style={{ fontSize: 10, color: W.textMuted }}>{l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {warmupSessions.length > 0 && <StatCard emoji="🧘" label="Warmup" count={warmupSessions.length} totalSec={totalWarmupSec} byRoutine={warmupByRoutine} accent={W.pinkDark} />}
              {workoutSessions.length > 0 && <StatCard emoji="💪" label="Workout" count={workoutSessions.length} totalSec={totalWorkoutSec} byRoutine={workoutByRoutine} accent={W.accentDark} />}
              {fingerboardSessions.length > 0 && <StatCard emoji="🤙" label="Fingerboard" count={fingerboardSessions.length} totalSec={totalFingerboardSec} byRoutine={fingerboardByRoutine} accent={W.yellowDark} />}
              {fitnessSessions.length > 0 && (() => {
                // Build block duration chart — average block duration per session (last 12 sessions)
                const recent = [...fitnessSessions].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-12);
                const chartPts = recent.map(s => {
                  const blocks = (s.fitnessSections || []).filter(b => b.startedAt && b.endedAt);
                  const avgSec = blocks.length ? blocks.reduce((t, b) => t + Math.floor((b.endedAt - b.startedAt) / 1000), 0) / blocks.length : 0;
                  return { date: s.date?.slice(0, 10), avgSec };
                }).filter(p => p.avgSec > 0);
                const maxSec = Math.max(...chartPts.map(p => p.avgSec), 1);
                return (
                  <>
                    <StatCard emoji="🏋️" label="Fitness" count={fitnessSessions.length} totalSec={0} byRoutine={fitnessByBlock} accent="#f97316" secondValue={fitnessSessions.reduce((t, s) => t + (s.fitnessSections || []).length, 0)} secondLabel="total blocks" thirdValue={fitnessCompletionRate} thirdLabel="task completion" bestResult={fitnessBestResult} />
                    {chartPts.length >= 2 && (
                      <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: W.text, marginBottom: 10 }}>🏋️ Avg block duration</div>
                        <svg width="100%" height={52} viewBox={`0 0 ${(chartPts.length - 1) * 24 + 8} 52`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                          <polyline
                            points={chartPts.map((p, i) => `${i * 24 + 4},${46 - Math.round((p.avgSec / maxSec) * 40)}`).join(" ")}
                            fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                          />
                          {chartPts.map((p, i) => (
                            <circle key={i} cx={i * 24 + 4} cy={46 - Math.round((p.avgSec / maxSec) * 40)} r={3} fill="#f97316" />
                          ))}
                        </svg>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                          <span style={{ fontSize: 9, color: W.textDim }}>{chartPts[0]?.date}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316" }}>peak {formatDuration(Math.round(maxSec))}</span>
                          <span style={{ fontSize: 9, color: W.textDim }}>{chartPts[chartPts.length - 1]?.date}</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })()}

        {profileTab === "training" && trainingSubTab === "routines" && renderRoutinesPanel()}

        {profileTab === "stats" && (() => {
          const tfLabels = { "2w": "Past 2 Weeks", "1m": "Past Month", "6m": "Past 6 Months", "1y": "Past Year", "all": "All Time" };
          const tfSessions = getTimeframeSessions();

          // ── Per-type filtered sessions ─────────────────────────
          const boulderFilter = c => c.climbType === "boulder" || !c.climbType;
          const boulderSessions = tfSessions.map(s => ({ ...s, climbs: (s.climbs || []).filter(boulderFilter) })).filter(s => s.climbs.length > 0);
          const ropeSessions    = tfSessions.map(s => ({ ...s, climbs: (s.climbs || []).filter(c => c.climbType === "rope") })).filter(s => s.climbs.length > 0);
          const boulderStats    = getStats(boulderSessions);
          const ropeStats       = getStats(ropeSessions);

          // ── Speed data ─────────────────────────────────────────
          const allSpeedSessions  = tfSessions.flatMap(s => (s.climbs || []).filter(c => c.climbType === "speed-session"));
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
              const cls = ss.flatMap(s => climbFilter ? (s.climbs || []).filter(climbFilter) : (s.climbs || []).filter(c => c.climbType !== "speed-session"));
              const allCls = ss.flatMap(s => s.climbs || []);
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
              return { label, sessions: ss, sends: cls.filter(c => c.completed).length, attempts: cls.reduce((t, c) => t + climbAttempts(c), 0), time: totalSec, typeSplit };
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
                <div key={s.label} onClick={s.onClick} style={{ background: s.bg, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}`, cursor: s.onClick ? "pointer" : "default", position: "relative" }}>
                  {s.onClick && <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, color: W.textDim }}>{s.expanded ? "▲" : "▼"}</div>}
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.tc }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{s.sub}</div>
                  {s.trendPct != null && (() => {
                    const good = (s.trendPct > 0) === (s.trendGood !== false);
                    return <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700, color: good ? W.greenDark : W.redDark }}>{s.trendPct > 0 ? "▲" : "▼"} {Math.abs(s.trendPct)}% vs prev</div>;
                  })()}
                </div>
              ))}
            </div>
          );

          // Overall: bar selection → re-filter stats
          const selBucket    = statsBarSel !== null ? chartBuckets[statsBarSel] : null;
          const displayStats = selBucket ? getStats(selBucket.sessions) : stats;
          const selLabel     = selBucket ? (selBucket.label || `Point ${statsBarSel + 1}`) : null;

          // Boulder: bar selection → filter sessions to boulder
          const boulderSelRaw = statsBarSel !== null ? boulderBuckets[statsBarSel] : null;
          const boulderSelSessions = boulderSelRaw ? boulderSelRaw.sessions.map(s => ({ ...s, climbs: (s.climbs || []).filter(boulderFilter) })).filter(s => s.climbs.length > 0) : null;
          const boulderDisplayStats = boulderSelSessions ? getStats(boulderSelSessions) : boulderStats;
          const boulderSelLabel = boulderSelRaw ? (boulderSelRaw.label || `Point ${statsBarSel + 1}`) : null;

          // Rope: bar selection → filter sessions to rope
          const ropeSelRaw = statsBarSel !== null ? ropeBuckets[statsBarSel] : null;
          const ropeSelSessions = ropeSelRaw ? ropeSelRaw.sessions.map(s => ({ ...s, climbs: (s.climbs || []).filter(c => c.climbType === "rope") })).filter(s => s.climbs.length > 0) : null;
          const ropeDisplayStats = ropeSelSessions ? getStats(ropeSelSessions) : ropeStats;
          const ropeSelLabel = ropeSelRaw ? (ropeSelRaw.label || `Point ${statsBarSel + 1}`) : null;

          // Grade pie data (overall only)
          const effectivePieScale = pieScale || preferredScale;
          const pieGradeList = effectivePieScale === "Custom"
            ? [...new Set([...customBoulderGrades, ...customRopeGrades])]
            : (GRADES[effectivePieScale] || []);
          const pieGrades = pieGradeList.filter(g => !pieHiddenGrades.includes(g));
          const pieClimbs = tfSessions.flatMap(s => s.climbs).filter(c => c.scale === effectivePieScale);
          // ── Previous period stats (for trend arrows) ──────────
          const prevSessions = (() => {
            const cutoffs = { "2w": 14, "1m": 30, "6m": 182, "1y": 365 };
            const days = cutoffs[statsTimeFrame];
            if (!days) return null;
            const end = Date.now() - days * 86400000;
            const start = end - days * 86400000;
            return sessions.filter(s => { const t = new Date(s.date).getTime(); return t >= start && t < end; });
          })();
          const prevStats = prevSessions ? getStats(prevSessions) : null;
          const trendPct = (cur, prev) => {
            if (prev == null || typeof prev !== "number" || prev === 0) return null;
            const pct = Math.round(((cur - prev) / prev) * 100);
            return pct === 0 ? null : pct;
          };

          // ── Shared grade pie renderer ──────────────────────────
          const renderGradePie = (climbsList, scale, pStat, setPStat, selGrade, setSelGrade, hiddenGrades, setHiddenGrades) => {
            const gradeList = scale === "Custom" ? [...new Set([...customBoulderGrades, ...customRopeGrades])] : (GRADES[scale] || ROPE_GRADES[scale] || []);
            const visGrades = gradeList.filter(g => !hiddenGrades.includes(g));
            const raw = visGrades.map(g => {
              const gc = climbsList.filter(c => c.grade === g);
              const value = pStat === "attempts" ? gc.reduce((t, c) => t + climbAttempts(c), 0) : pStat === "sends" ? gc.filter(c => c.completed).length : gc.filter(c => c.completed && c.tries === 1).length;
              return { grade: g, value, color: getGradeColor(g) };
            }).filter(d => d.value > 0);
            const total = raw.reduce((s, d) => s + d.value, 0);
            if (!total) return (
              <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Grade Breakdown</div>
                <div style={{ textAlign: "center", color: W.textDim, fontSize: 13, padding: "20px 0" }}>No data for selected filters</div>
              </div>
            );
            let angle = -Math.PI / 2;
            const slices = raw.map(d => {
              const sweep = (d.value / total) * 2 * Math.PI;
              const end = angle + sweep; const sa = angle; angle = end;
              const ir = 22, cx = 50, cy = 50;
              const mkPath = (r) => { const x1=cx+r*Math.cos(sa),y1=cy+r*Math.sin(sa),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end),ix1=cx+ir*Math.cos(sa),iy1=cy+ir*Math.sin(sa),ix2=cx+ir*Math.cos(end),iy2=cy+ir*Math.sin(end),large=sweep>Math.PI?1:0; return `M ${ix1.toFixed(2)} ${iy1.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix2.toFixed(2)} ${iy2.toFixed(2)} A ${ir} ${ir} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)} Z`; };
              return { ...d, path: mkPath(42), pathSel: mkPath(47) };
            });
            const anySelected = selGrade !== null;
            const selSlice = slices.find(s => s.grade === selGrade);
            return (
              <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Grade Breakdown</div>
                  <select value={pStat} onChange={e => { setPStat(e.target.value); setSelGrade(null); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, padding: "4px 8px", color: W.text, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    <option value="attempts">Attempts</option>
                    <option value="sends">Sends</option>
                    <option value="flashes">Flashes</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                  {gradeList.map(g => { const hidden = hiddenGrades.includes(g); return (<button key={g} onClick={() => { setHiddenGrades(prev => hidden ? prev.filter(x => x !== g) : [...prev, g]); setSelGrade(null); }} style={{ padding: "3px 10px", borderRadius: 12, border: `2px solid ${hidden ? W.border : getGradeColor(g)}`, background: hidden ? W.surface2 : getGradeColor(g) + "33", color: hidden ? W.textDim : getGradeColor(g), fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: hidden ? 0.5 : 1 }}>{g}</button>); })}
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                  <svg width={220} height={220} viewBox="-6 -6 112 112" style={{ display: "block" }}>
                    {slices.map((sl, i) => <path key={i} d={sl.grade === selGrade ? sl.pathSel : sl.path} fill={sl.color} opacity={anySelected ? (sl.grade === selGrade ? 1 : 0.25) : 0.9} style={{ cursor: "pointer", transition: "opacity 0.15s" }} onClick={() => setSelGrade(selGrade === sl.grade ? null : sl.grade)} />)}
                    {selSlice ? (<><text x="50" y="44" textAnchor="middle" fontSize="9" fontWeight="bold" fill={selSlice.color}>{selSlice.grade}</text><text x="50" y="57" textAnchor="middle" fontSize="14" fontWeight="bold" fill={W.text}>{selSlice.value}</text><text x="50" y="67" textAnchor="middle" fontSize="7" fill={W.textMuted}>{Math.round((selSlice.value / total) * 100)}%</text></>) : (<><text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="bold" fill={W.text}>{total}</text><text x="50" y="58" textAnchor="middle" fontSize="7" fill={W.textMuted}>total</text></>)}
                  </svg>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {slices.map(sl => { const isSel = selGrade === sl.grade; return (<div key={sl.grade} onClick={() => setSelGrade(selGrade === sl.grade ? null : sl.grade)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", opacity: anySelected ? (isSel ? 1 : 0.4) : 1, transition: "opacity 0.15s", background: isSel ? sl.color + "18" : "transparent", borderRadius: 8, padding: "5px 8px", border: `1px solid ${isSel ? sl.color + "60" : "transparent"}` }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: sl.color, flexShrink: 0 }} /><span style={{ fontSize: 12, fontWeight: isSel ? 900 : 700, color: sl.color }}>{sl.grade}</span></div><div><span style={{ fontSize: 13, fontWeight: 800, color: isSel ? sl.color : W.text }}>{sl.value}</span><span style={{ fontSize: 10, color: W.textDim, marginLeft: 4 }}>{Math.round((sl.value / total) * 100)}%</span></div></div>); })}
                </div>
              </div>
            );
          };

          return (
          <div>
            {/* ── Category tabs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, marginBottom: 16, background: W.surface2, borderRadius: 10, padding: 3, border: `1px solid ${W.border}` }}>
              {[
                { id: "overall", label: "Overall" },
                { id: "boulder", label: "Boulder" },
                { id: "rope",    label: "Rope"    },
                { id: "speed",   label: "Speed"   },
              ].map(tab => (
                <button key={tab.id} onClick={() => { setStatsCategory(tab.id); localStorage.setItem("statsCategory", tab.id); setStatsBarSel(null); }} style={{ padding: "8px 2px", borderRadius: 7, border: "none", background: statsCategory === tab.id ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : "transparent", color: statsCategory === tab.id ? "#fff" : W.textDim, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══ OVERALL ══════════════════════════════════════════ */}
            {statsCategory === "overall" && (
              <div>
                {!statsShowCalendar ? renderChart(statsChartFilter === "boulder" ? boulderBuckets : statsChartFilter === "rope" ? ropeBuckets : chartBuckets) : (
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
                {/* Top row: Total Sends + Time Climbed (clickable with inline dropdown) */}
                {(() => {
                  const makeTypePie = (slices) => {
                    const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
                    let cumAngle = 0;
                    return slices.filter(sl => sl.value > 0).map(sl => {
                      const angle = (sl.value / total) * 2 * Math.PI;
                      const x1 = 50 + 44 * Math.cos(cumAngle - Math.PI / 2);
                      const y1 = 50 + 44 * Math.sin(cumAngle - Math.PI / 2);
                      cumAngle += angle;
                      const x2 = 50 + 44 * Math.cos(cumAngle - Math.PI / 2);
                      const y2 = 50 + 44 * Math.sin(cumAngle - Math.PI / 2);
                      return { ...sl, total, path: `M50,50 L${x1.toFixed(2)},${y1.toFixed(2)} A44,44 0 ${angle > Math.PI ? 1 : 0},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` };
                    });
                  };
                  const renderTypePie = (pieSlices, centerLabel) => {
                    const total = pieSlices[0]?.total || 1;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <svg width={100} height={100} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                          {pieSlices.length === 1 ? <circle cx="50" cy="50" r="44" fill={pieSlices[0].color} opacity={0.85} /> : pieSlices.map((sl, i) => <path key={i} d={sl.path} fill={sl.color} opacity={0.85} />)}
                          <circle cx="50" cy="50" r="28" fill={W.surface} />
                          <text x="50" y="47" textAnchor="middle" fontSize="11" fontWeight="bold" fill={W.text}>{centerLabel}</text>
                          <text x="50" y="58" textAnchor="middle" fontSize="7" fill={W.textMuted}>total</text>
                        </svg>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          {pieSlices.map(sl => (
                            <div key={sl.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 9, height: 9, borderRadius: 3, background: sl.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: W.textMuted }}>{sl.label}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 800, color: W.text }}>{sl.value}</span>
                                <span style={{ fontSize: 10, color: W.textDim, marginLeft: 4 }}>{Math.round((sl.value / total) * 100)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  };
                  const sendsSlices = makeTypePie([
                    { label: "Boulder", value: displayStats.completed.filter(c => !c.climbType || c.climbType === "boulder").length, color: W.accent },
                    { label: "Rope",    value: displayStats.completed.filter(c => c.climbType === "rope").length,                    color: W.purple },
                    { label: "Speed",   value: displayStats.completed.filter(c => c.climbType === "speed-session").length,           color: W.yellow },
                  ]);
                  const timeSlices = makeTypePie((() => {
                    const t = { boulder: 0, rope: 0, speed: 0 };
                    tfSessions.forEach(s => {
                      const b = (s.climbs || []).filter(c => !c.climbType || c.climbType === "boulder").length;
                      const r = (s.climbs || []).filter(c => c.climbType === "rope").length;
                      const sp = (s.climbs || []).filter(c => c.climbType === "speed-session").length;
                      const ct = b + r + sp || 1;
                      t.boulder += (b / ct) * (s.duration || 0);
                      t.rope    += (r / ct) * (s.duration || 0);
                      t.speed   += (sp / ct) * (s.duration || 0);
                    });
                    return [
                      { label: "Boulder", value: Math.round(t.boulder), color: W.accent },
                      { label: "Rope",    value: Math.round(t.rope),    color: W.purple },
                      { label: "Speed",   value: Math.round(t.speed),   color: W.yellow },
                    ];
                  })());
                  const cardStyle = (key) => ({ background: key === "sends" ? W.surface2 : W.purple, borderRadius: 14, padding: "14px", border: `2px solid ${openOverallDropdown === key ? (key === "sends" ? W.accent : W.purpleDark) : W.border}`, cursor: "pointer", position: "relative", flex: 1 });
                  return (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 0 }}>
                        <div onClick={() => setOpenOverallDropdown(d => d === "sends" ? null : "sends")} style={cardStyle("sends")}>
                          <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, color: W.textDim }}>{openOverallDropdown === "sends" ? "▲" : "▼"}</div>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>🧗</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: W.accent }}>{displayStats.completed.length}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginTop: 2 }}>Total Sends</div>
                          <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{selLabel || tfLabels[statsTimeFrame]}</div>
                          {prevStats && trendPct(displayStats.completed.length, prevStats.completed.length) != null && (() => { const p = trendPct(displayStats.completed.length, prevStats.completed.length); return <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700, color: p > 0 ? W.greenDark : W.redDark }}>{p > 0 ? "▲" : "▼"} {Math.abs(p)}% vs prev</div>; })()}
                        </div>
                        <div onClick={() => setOpenOverallDropdown(d => d === "time" ? null : "time")} style={cardStyle("time")}>
                          <div style={{ position: "absolute", top: 10, right: 10, fontSize: 10, color: W.textDim }}>{openOverallDropdown === "time" ? "▲" : "▼"}</div>
                          <div style={{ fontSize: 20, marginBottom: 4 }}>⏱</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: W.purpleDark }}>{formatTotalTime(displayStats.totalTimeClimbed)}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginTop: 2 }}>Time Climbed</div>
                          <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{selLabel || tfLabels[statsTimeFrame]}</div>
                          {prevStats && trendPct(displayStats.totalTimeClimbed, prevStats.totalTimeClimbed) != null && (() => { const p = trendPct(displayStats.totalTimeClimbed, prevStats.totalTimeClimbed); return <div style={{ fontSize: 10, marginTop: 4, fontWeight: 700, color: p > 0 ? W.greenDark : W.redDark }}>{p > 0 ? "▲" : "▼"} {Math.abs(p)}% vs prev</div>; })()}
                        </div>
                      </div>
                      {openOverallDropdown === "sends" && (
                        <div style={{ background: W.surface, borderRadius: "0 0 16px 16px", padding: "14px 16px", border: `1px solid ${W.border}`, borderTop: "none", marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Sends by Type</div>
                          {sendsSlices.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, fontSize: 12 }}>No sends in selected period</div> : renderTypePie(sendsSlices, String(displayStats.completed.length))}
                        </div>
                      )}
                      {openOverallDropdown === "time" && (
                        <div style={{ background: W.surface, borderRadius: "0 0 16px 16px", padding: "14px 16px", border: `1px solid ${W.border}`, borderTop: "none", marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Time by Type</div>
                          {timeSlices.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, fontSize: 12 }}>No session data in selected period</div> : renderTypePie(timeSlices, formatTotalTime(Math.round(timeSlices.reduce((s, sl) => s + sl.value, 0))))}
                        </div>
                      )}
                    </>
                  );
                })()}
                {renderStatCards([
                  { icon: "🔁", label: "Total Attempts",      value: displayStats.totalAttempts,                     sub: selLabel || tfLabels[statsTimeFrame], bg: W.green,     tc: W.greenDark,  trendPct: prevStats ? trendPct(displayStats.totalAttempts, prevStats.totalAttempts) : null },
                  { icon: "📅", label: "Sessions",            value: displayStats.sessionCount,                      sub: selLabel || tfLabels[statsTimeFrame], bg: W.surface2,  tc: W.accentDark, trendPct: prevStats ? trendPct(displayStats.sessionCount, prevStats.sessionCount) : null },
                  { icon: "⚡", label: "Flash Rate",          value: `${displayStats.flashRate}%`,                   sub: `${displayStats.flashes.length} flashes`,             bg: W.yellow,    tc: W.yellowDark, trendPct: prevStats ? trendPct(displayStats.flashRate, prevStats.flashRate) : null },
                  { icon: "🏆", label: "Best Grade",          value: displayStats.bestGrade,                         sub: `${preferredScale} · ${selLabel || tfLabels[statsTimeFrame]}`, bg: W.goldLight, tc: W.yellowDark },
                  { icon: "✅", label: "Projects Sent",       value: completedProjects.length,                       sub: "all time",                           bg: W.green,     tc: W.greenDark },
                  { icon: "🎯", label: "Active Projects",     value: activeProjects.length,                          sub: "in progress",                        bg: W.pink,      tc: W.pinkDark },
                  { icon: "📈", label: "Best Day (Climbs)",   value: displayStats.mostInDay,                         sub: "climbs in one session",              bg: W.surface2,  tc: W.accentDark },
                  { icon: "💥", label: "Best Day (Attempts)", value: displayStats.mostAttemptsInDay,                 sub: "attempts in one session",            bg: W.surface2,  tc: W.accentDark },
                  { icon: "📍", label: "Unique Gyms",         value: displayStats.uniqueGyms,                        sub: "visited",                            bg: W.surface2,  tc: W.accent },
                  { icon: "🏅", label: "Top Gym Visits",      value: displayStats.mostGymVisits,                     sub: "visits to one gym",                  bg: W.goldLight, tc: W.yellowDark },
                  { icon: "🔁", label: "Avg Tries",           value: displayStats.avgTries,                          sub: "per climb",                          bg: W.green,     tc: W.greenDark,  trendPct: prevStats ? trendPct(displayStats.avgTries, prevStats.avgTries) : null, trendGood: false },
                  { icon: "😴", label: "Avg Rest Days",       value: displayStats.avgRestDays,                       sub: "between sessions",                   bg: W.surface2,  tc: W.accentDark },
                  { icon: "⏸", label: "Avg Rest (Climbs)",   value: formatRestSec(displayStats.avgClimbRestSec),    sub: "between logged climbs",              bg: W.purple,    tc: W.purpleDark },
                  { icon: "🐢", label: "Longest Climb Rest",  value: formatRestSec(displayStats.maxClimbRestSec),    sub: "single longest gap",                 bg: W.surface2,  tc: W.accentDark },
                  ...(displayStats.speedPB != null ? [{ icon: "⚡", label: "Speed PB", value: `${displayStats.speedPB.toFixed(2)}s`, sub: selLabel || tfLabels[statsTimeFrame], bg: W.yellow, tc: W.yellowDark }] : []),
                ])}
                {(() => {
                  const allSections = [...new Set(sessions.flatMap(s => (s.climbs || []).map(c => c.section).filter(Boolean)))];
                  if (!allSections.length) return null;
                  const sectionData = allSections.map(sec => {
                    const secClimbs = sessions.flatMap(s => (s.climbs || []).filter(c => c.section === sec));
                    return { sec, total: secClimbs.length, sends: secClimbs.filter(c => c.completed).length };
                  }).sort((a, b) => b.total - a.total);
                  const maxTotal = sectionData[0]?.total || 1;
                  return (
                    <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Section Breakdown</div>
                      {sectionData.map(d => (
                        <div key={d.sec} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: W.text }}>📌 {d.sec}</span>
                            <span style={{ fontSize: 12, color: W.textMuted }}>{d.sends}/{d.total} sent</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: W.surface2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(d.total / maxTotal) * 100}%`, background: W.accent, borderRadius: 3 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
                      { icon: "🧗", label: "Sends",           value: boulderDisplayStats.completed.length,               sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accent,     trendPct: prevStats ? trendPct(boulderDisplayStats.completed.length, getStats(prevSessions ? prevSessions.map(s => ({ ...s, climbs: (s.climbs || []).filter(boulderFilter) })).filter(s => s.climbs.length > 0) : []).completed.length) : null },
                      { icon: "🔁", label: "Total Attempts",  value: boulderDisplayStats.totalAttempts,                  sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.green,    tc: W.greenDark },
                      { icon: "⚡", label: "Flash Rate",      value: `${boulderDisplayStats.flashRate}%`,                sub: `${boulderDisplayStats.flashes.length} flashes`,             bg: W.yellow,   tc: W.yellowDark },
                      { icon: "🏆", label: "Best Grade",      value: boulderDisplayStats.bestGrade,                      sub: preferredScale,                              bg: W.goldLight,tc: W.yellowDark },
                      { icon: "🔄", label: "Avg Tries",       value: boulderDisplayStats.avgTries,                       sub: "per boulder",                               bg: W.surface2, tc: W.accentDark, trendGood: false },
                      { icon: "📅", label: "Sessions",        value: boulderDisplayStats.sessionCount,                   sub: boulderSelLabel || tfLabels[statsTimeFrame], bg: W.surface2, tc: W.accentDark },
                      { icon: "📈", label: "Best Day",        value: boulderDisplayStats.mostInDay,                      sub: "boulders in one session",                   bg: W.surface2, tc: W.accentDark },
                      { icon: "💥", label: "Best Day Tries",  value: boulderDisplayStats.mostAttemptsInDay,              sub: "attempts in one session",                   bg: W.surface2, tc: W.accentDark },
                      { icon: "✅", label: "Projects Sent",   value: completedProjects.filter(p => !p.climbType || p.climbType === "boulder").length, sub: "all time", bg: W.green, tc: W.greenDark },
                      { icon: "🎯", label: "Active Projects", value: activeProjects.filter(p => !p.climbType || p.climbType === "boulder").length,   sub: "in progress", bg: W.pink, tc: W.pinkDark },
                      { icon: "⏸", label: "Avg Rest",        value: formatRestSec(boulderDisplayStats.avgClimbRestSec), sub: "between logged climbs",                     bg: W.purple,   tc: W.purpleDark },
                      { icon: "🐢", label: "Longest Rest",    value: formatRestSec(boulderDisplayStats.maxClimbRestSec), sub: "single gap",                                bg: W.surface2, tc: W.accentDark },
                    ])}
                    {renderGradePie(
                      boulderSessions.flatMap(s => s.climbs),
                      effectivePieScale,
                      pieStat, setPieStat,
                      pieSelGrade, setPieSelGrade,
                      pieHiddenGrades, setPieHiddenGrades
                    )}
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
                    {(() => {
                      const ropeClimbs = ropeSessions.flatMap(s => s.climbs);
                      const scaleCounts = {};
                      ropeClimbs.forEach(c => { if (c.scale) scaleCounts[c.scale] = (scaleCounts[c.scale] || 0) + 1; });
                      const defaultRopeScale = Object.keys(scaleCounts).sort((a, b) => scaleCounts[b] - scaleCounts[a])[0] || Object.keys(ROPE_GRADES)[0];
                      return renderGradePie(ropeClimbs, defaultRopeScale, ropePieStat, setRopePieStat, ropePieSelGrade, setRopePieSelGrade, ropePieHiddenGrades, setRopePieHiddenGrades);
                    })()}
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
                    {/* Attempt timeline chart */}
                    {timedAttempts.length > 0 && (() => {
                      const times = timedAttempts.map(a => a.time);
                      const maxT = Math.max(...times), minT = Math.min(...times);
                      const range = maxT - minT || 1;
                      const WC = 300, HC = 90;
                      // Map each timed attempt to an x position across the full chronological range of ALL attempts
                      const totalCount = allSpeedAttempts.length;
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
                    {/* Stat cards */}
                    {renderStatCards([
                      { icon: "⏱", label: "Total Speed Time",  value: formatTotalTime(totalSpeedSec),       sub: tfLabels[statsTimeFrame],                    bg: W.surface2, tc: W.accent },
                      { icon: "✅", label: "Total Tops",        value: timedAttempts.length,                 sub: "successful attempts",                       bg: W.green,    tc: W.greenDark },
                      { icon: "✗",  label: "Total Falls",       value: fellAttempts.length,                  sub: "failed attempts",                           bg: W.red,      tc: W.redDark },
                      { icon: "📊", label: "Success Rate",      value: `${successRatio}%`,                   sub: `${allSpeedAttempts.length} total attempts`,  bg: W.purple,   tc: W.purpleDark },
                      { icon: "📅", label: "Sessions",          value: allSpeedSessions.length,              sub: tfLabels[statsTimeFrame],                    bg: W.surface2, tc: W.accentDark },
                      { icon: "🔁", label: "Avg per Session",   value: allSpeedSessions.length ? (Math.round(allSpeedAttempts.length / allSpeedSessions.length * 10) / 10) : "—", sub: "attempts per session", bg: W.surface2, tc: W.accentDark },
                    ])}
                  </>
                )}
              </div>
            )}
            {/* ── Warm Up Stats ──────────────────────────────── */}
            {(() => {
              const warmupSessionsAll = tfSessions.filter(s => (s.warmupTotalSec || 0) > 0 || s.warmupChecklist?.length > 0);
              if (!warmupSessionsAll.length) return null;
              const totalWarmupSec = warmupSessionsAll.reduce((sum, s) => sum + (s.warmupTotalSec || 0), 0);
              const avgWarmupSec = warmupSessionsAll.length ? Math.round(totalWarmupSec / warmupSessionsAll.length) : 0;
              const checklistSessions = warmupSessionsAll.filter(s => s.warmupChecklist?.length > 0);
              const avgCompletion = checklistSessions.length ? Math.round(checklistSessions.reduce((sum, s) => sum + (s.warmupChecklist.filter(i => i.checked).length / s.warmupChecklist.length), 0) / checklistSessions.length * 100) : null;
              return (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.pinkDark, marginBottom: 10 }}>🔥 Warm Up</div>
                  {renderStatCards([
                    { icon: "🔥", label: "Warmup Sessions",   value: warmupSessionsAll.length,         sub: tfLabels[statsTimeFrame],  bg: W.pink,    tc: W.pinkDark },
                    { icon: "⏱", label: "Total Warmup Time", value: formatTotalTime(totalWarmupSec),   sub: "cumulative",              bg: W.surface2, tc: W.accent },
                    { icon: "📊", label: "Avg Duration",      value: formatDuration(avgWarmupSec),      sub: "per warmup session",      bg: W.surface2, tc: W.accentDark },
                    ...(avgCompletion !== null ? [{ icon: "✅", label: "Avg Completion", value: `${avgCompletion}%`, sub: "checklist tasks done", bg: W.green, tc: W.greenDark }] : []),
                  ])}
                </div>
              );
            })()}
            {/* ── Workout Stats ──────────────────────────────── */}
            {(() => {
              const workoutSessions = tfSessions.filter(s => (s.workoutTotalSec || 0) > 0 || s.workoutChecklist?.length > 0);
              if (!workoutSessions.length) return null;
              const totalWorkoutSec = workoutSessions.reduce((sum, s) => sum + (s.workoutTotalSec || 0), 0);
              const avgWorkoutSec = workoutSessions.length ? Math.round(totalWorkoutSec / workoutSessions.length) : 0;
              return (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.accentDark, marginBottom: 10 }}>💪 Workout</div>
                  {renderStatCards([
                    { icon: "💪", label: "Workout Sessions",   value: workoutSessions.length,        sub: tfLabels[statsTimeFrame], bg: W.accent + "22", tc: W.accentDark },
                    { icon: "⏱", label: "Total Workout Time", value: formatTotalTime(totalWorkoutSec), sub: "cumulative",             bg: W.surface2,      tc: W.accent },
                    { icon: "📊", label: "Avg Duration",       value: formatDuration(avgWorkoutSec),   sub: "per workout session",    bg: W.surface2,      tc: W.accentDark },
                  ])}
                </div>
              );
            })()}
            {/* ── Fingerboard Stats ──────────────────────────── */}
            {(() => {
              const fbSessions = tfSessions.filter(s => (s.fingerboardTotalSec || 0) > 0 || s.fingerboardChecklist?.length > 0);
              if (!fbSessions.length) return null;
              const totalFbSec = fbSessions.reduce((sum, s) => sum + (s.fingerboardTotalSec || 0), 0);
              const avgFbSec = fbSessions.length ? Math.round(totalFbSec / fbSessions.length) : 0;
              return (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.yellowDark, marginBottom: 10 }}>🤞 Fingerboard</div>
                  {renderStatCards([
                    { icon: "🤞", label: "Fingerboard Sessions",   value: fbSessions.length,        sub: tfLabels[statsTimeFrame], bg: W.yellow,   tc: W.yellowDark },
                    { icon: "⏱", label: "Total Fingerboard Time", value: formatTotalTime(totalFbSec), sub: "cumulative",             bg: W.surface2, tc: W.accent },
                    { icon: "📊", label: "Avg Duration",           value: formatDuration(avgFbSec),   sub: "per session",            bg: W.surface2, tc: W.accentDark },
                  ])}
                </div>
              );
            })()}
          </div>
          );
        })()}

        {profileTab === "climbing" && climbingSubTab === "climbs" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              {logbookFiltersOpen ? (
                <>
                  <button onClick={() => setLogbookFiltersOpen(false)} style={{ width: "100%", padding: "11px 14px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: "12px 12px 0 0", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>Filters</span>{activeFilterCount > 0 && <span style={{ background: W.accent, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}</div>
                    <span style={{ color: W.textMuted, fontSize: 16 }}>⌄</span>
                  </button>
                  <div style={{ background: W.surface, border: `1.5px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "14px" }}>
                    {/* 1. Climb Type */}
                    <Label>Climb Type</Label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {[["boulder","🪨 Boulder"],["rope","🧗 Rope"]].map(([val, label]) => {
                        const sel = logbookClimbTypeFilter.includes(val);
                        return <button key={val} onClick={() => {
                          const next = sel ? logbookClimbTypeFilter.filter(t => t !== val) : [...logbookClimbTypeFilter, val];
                          const final = next.length === 2 ? ["boulder","rope"] : next;
                          setLogbookClimbTypeFilter(final); localStorage.setItem("lb:climbType", JSON.stringify(final)); setLogbookClimbPage(1);
                        }} style={{ padding: "6px 14px", borderRadius: 16, border: "2px solid", borderColor: sel ? W.accent : W.border, background: sel ? W.accent + "22" : W.surface, color: sel ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>;
                      })}
                    </div>
                    {/* 2. Gym Location */}
                    {(() => {
                      const gymsWithSessions = [...new Set(sessions.map(s => s.location).filter(Boolean))].sort();
                      if (!gymsWithSessions.length) return null;
                      const allGymsSelected = logbookClimbGymFilter === null;
                      const setGymFilter = (newFilter) => { setLogbookClimbGymFilter(newFilter); localStorage.setItem("lb:climbGyms", JSON.stringify(newFilter)); setLogbookClimbPage(1); };
                      return (<>
                        <Label>Gym Location</Label>
                        <div style={{ marginBottom: 12 }}>
                          <button onClick={() => setGymFilter(allGymsSelected ? [] : null)} style={{ padding: "5px 12px", borderRadius: 14, border: `2px solid ${W.border}`, background: W.surface2, color: W.textMuted, cursor: "pointer", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>{allGymsSelected ? "Deselect All" : "Select All"}</button>
                          {gymsWithSessions.map(gym => {
                            const isGymSelected = logbookClimbGymFilter === null || logbookClimbGymFilter.includes(gym);
                            const gymSections = [...new Set(sessions.filter(s => s.location === gym).flatMap(s => (s.climbs || []).map(c => c.section).filter(Boolean)))];
                            const isExpanded = logbookGymExpanded[gym];
                            const selectedSecs = logbookGymSectionFilter[gym]; // undefined/null = all
                            return (
                              <div key={gym} style={{ marginBottom: 4 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <button onClick={() => {
                                    const cur = logbookClimbGymFilter === null ? [...gymsWithSessions] : [...logbookClimbGymFilter];
                                    const idx = cur.indexOf(gym);
                                    if (idx >= 0) cur.splice(idx, 1); else cur.push(gym);
                                    setGymFilter(cur.length === gymsWithSessions.length ? null : cur);
                                  }} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isGymSelected ? W.accent : W.border}`, background: isGymSelected ? W.accent : W.surface, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>{isGymSelected ? "✓" : ""}</button>
                                  <span style={{ fontSize: 13, color: W.text, fontWeight: 600, flex: 1 }}>{gym}</span>
                                  {gymSections.length > 0 && isGymSelected && <button onClick={() => setLogbookGymExpanded(e => ({ ...e, [gym]: !e[gym] }))} style={{ background: "none", border: "none", color: W.textMuted, cursor: "pointer", fontSize: 12, padding: "0 4px" }}>{isExpanded ? "▲" : "▼"}</button>}
                                </div>
                                {isExpanded && gymSections.length > 0 && isGymSelected && (
                                  <div style={{ paddingLeft: 28, paddingTop: 4, display: "flex", flexWrap: "wrap", gap: 5 }}>
                                    {gymSections.map(sec => {
                                      const isSec = !selectedSecs || selectedSecs.includes(sec);
                                      return <button key={sec} onClick={() => {
                                        const allSecs = gymSections;
                                        const cur = selectedSecs ?? [...allSecs];
                                        const next = isSec ? cur.filter(s => s !== sec) : [...cur, sec];
                                        const final = next.length === allSecs.length ? null : next;
                                        setLogbookGymSectionFilter(f => { const u = { ...f, [gym]: final }; localStorage.setItem("lb:gymSections", JSON.stringify(u)); return u; });
                                        setLogbookClimbPage(1);
                                      }} style={{ padding: "4px 9px", borderRadius: 12, border: `2px solid ${isSec ? W.accent : W.border}`, background: isSec ? W.accent + "22" : W.surface, color: isSec ? W.accent : W.textDim, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>📌 {sec}</button>;
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>);
                    })()}
                    {/* 3. Hold Color */}
                    {(() => {
                      const colorsWithClimbs = CLIMB_COLORS.filter(cc => sessions.some(s => (s.climbs || []).some(c => c.color === cc.id)));
                      if (!colorsWithClimbs.length) return null;
                      const toggleColor = (colorId) => {
                        const cur = logbookColorMulti ?? colorsWithClimbs.map(cc => cc.id);
                        const next = cur.includes(colorId) ? cur.filter(id => id !== colorId) : [...cur, colorId];
                        const final = next.length === colorsWithClimbs.length ? null : next;
                        setLogbookColorMulti(final); localStorage.setItem("lb:colorMulti", JSON.stringify(final)); setLogbookClimbPage(1);
                      };
                      return (<>
                        <Label>Hold Color</Label>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                          {colorsWithClimbs.map(cc => {
                            const sel = logbookColorMulti === null || logbookColorMulti.includes(cc.id);
                            return <button key={cc.id} onClick={() => toggleColor(cc.id)} style={{ padding: "5px 10px", borderRadius: 14, border: `2px solid ${sel ? cc.hex : W.border}`, background: sel ? cc.hex + "22" : W.surface, cursor: "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                              <div style={{ width: 11, height: 11, borderRadius: "50%", background: cc.hex, flexShrink: 0 }} />
                              <span style={{ color: sel ? W.text : W.textDim }}>{cc.label}</span>
                            </button>;
                          })}
                        </div>
                      </>);
                    })()}
                    {/* 4. Status */}
                    <Label>Status</Label>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      {[["all", "All"], ["completed", "✓ Sent"], ["incomplete", "✗ Not Sent"], ["projects", "🎯 Projects"]].map(([val, label]) => <button key={val} onClick={() => setLogbookFilter(val)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookFilter === val ? (val === "projects" ? W.pinkDark : W.accent) : W.border, background: logbookFilter === val ? (val === "projects" ? W.pink : W.accent + "22") : W.surface, color: logbookFilter === val ? (val === "projects" ? W.pinkDark : W.accent) : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>)}
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
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      {[["name", "🔤 A–Z"], ["projects", "🎯 Projects"]].map(([val, label]) => <button key={val} onClick={() => { setLogbookSort(logbookSort === val ? "date" : val); setLogbookClimbPage(1); }} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookSort === val ? W.accent : W.border, background: logbookSort === val ? W.accent + "22" : W.surface, color: logbookSort === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>)}
                    </div>
                    <Label>View</Label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setLogbookTickList(t => !t)} style={{ padding: "6px 14px", borderRadius: 16, border: "2px solid", borderColor: logbookTickList ? W.accent : W.border, background: logbookTickList ? W.accent + "22" : W.surface, color: logbookTickList ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📋 Tick List</button>
                      {[["tiles","⊞ Tiles"],["single","▤ Single"],["list","☰ List"]].map(([val,label]) => (
                        <button key={val} onClick={() => setLogbookTileView(val)} style={{ padding: "6px 14px", borderRadius: 16, border: "2px solid", borderColor: logbookTileView === val ? W.accent : W.border, background: logbookTileView === val ? W.accent + "22" : W.surface, color: logbookTileView === val ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{label}</button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setLogbookSearchOpen(o => { if (o) setLogbookSearch(""); return !o; }); }} style={{ padding: "11px 13px", background: logbookSearchOpen ? W.accent + "22" : W.surface2, border: `1.5px solid ${logbookSearchOpen ? W.accent : W.border}`, borderRadius: 12, color: logbookSearchOpen ? W.accent : W.textMuted, cursor: "pointer", flexShrink: 0, fontSize: 16, lineHeight: 1 }}>🔍</button>
                  <button onClick={() => { setLogbookFilter(f => f === "projects" ? "all" : "projects"); setLogbookClimbPage(1); }} style={{ padding: "11px 13px", background: logbookFilter === "projects" ? W.pinkDark + "22" : W.surface2, border: `1.5px solid ${logbookFilter === "projects" ? W.pinkDark : W.border}`, borderRadius: 12, color: logbookFilter === "projects" ? W.pinkDark : W.textMuted, cursor: "pointer", flexShrink: 0, fontSize: 16, lineHeight: 1 }}>🎯</button>
                  {logbookSearchOpen ? (
                    <div style={{ flex: 1, position: "relative" }}>
                      <input autoFocus value={logbookSearch} onChange={e => { setLogbookSearch(e.target.value); setLogbookClimbPage(1); }} placeholder="Search name, grade, gym…" style={{ width: "100%", padding: "11px 36px 11px 14px", background: W.surface2, border: `1.5px solid ${logbookSearch ? W.accent : W.border}`, borderRadius: 12, color: W.text, fontSize: 13, boxSizing: "border-box", fontFamily: "inherit", outline: "none" }} />
                      {logbookSearch && <button onClick={() => setLogbookSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: W.textMuted, fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>}
                    </div>
                  ) : (
                    <button onClick={() => setLogbookFiltersOpen(true)} style={{ flex: 1, padding: "11px 14px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>Filters</span>{activeFilterCount > 0 && <span style={{ background: W.accent, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{activeFilterCount}</span>}</div>
                      <span style={{ color: W.textMuted, fontSize: 16 }}>⌄</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Sort toggle buttons — always visible below filter bar */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { key: "date",     baseLabel: "Newest",   labelDesc: "↓ Newest",    labelAsc: "↑ Oldest"   },
                { key: "grade",    baseLabel: "Grade",    labelDesc: "↓ Grade",     labelAsc: "↑ Grade"    },
                { key: "attempts", baseLabel: "Attempts", labelDesc: "↓ Attempts",  labelAsc: "↑ Attempts" },
                { key: "time",     baseLabel: "Time",     labelDesc: "↓ Time",      labelAsc: "↑ Time"     },
              ].map(({ key, baseLabel, labelDesc, labelAsc }) => {
                const isSpecialSort = logbookSort === "name" || logbookSort === "projects";
                const active = !isSpecialSort && logbookQuickSort === key;
                const isDesc = logbookQuickSortDir === "desc";
                return (
                  <button key={key} onClick={() => {
                    if (active) {
                      const nd = logbookQuickSortDir === "desc" ? "asc" : "desc";
                      setLogbookQuickSortDir(nd); localStorage.setItem("lb:quickSortDir", nd);
                    } else {
                      setLogbookQuickSort(key); setLogbookQuickSortDir("desc");
                      setLogbookSort("date");
                      localStorage.setItem("lb:quickSort", key); localStorage.setItem("lb:quickSortDir", "desc"); localStorage.setItem("lb:sort", "date");
                    }
                    setLogbookClimbPage(1);
                  }} style={{ padding: "7px 13px", borderRadius: 16, border: "2px solid", borderColor: active ? W.accent : W.border, background: active ? W.accent + "22" : W.surface2, color: active ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    {active ? (isDesc ? labelDesc : labelAsc) : baseLabel}
                  </button>
                );
              })}
            </div>
            <input ref={lbPhotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
              const file = e.target.files?.[0]; e.target.value = "";
              if (!file || !longPressPhotoTarget) return;
              const reader = new FileReader();
              reader.onload = ev => {
                const img = new Image();
                img.onload = () => {
                  const MAX = 900; const canvas = document.createElement("canvas");
                  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                  canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
                  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
                  addPhotoToLogbookClimb(longPressPhotoTarget.climbId, longPressPhotoTarget.sessionId, canvas.toDataURL("image/jpeg", 0.75));
                  setLongPressPhotoTarget(null);
                };
                img.src = ev.target.result;
              };
              reader.readAsDataURL(file);
            }} />
            <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12, fontWeight: 600 }}>{logbookClimbs.length} climb{logbookClimbs.length !== 1 ? "s" : ""} found</div>
            {logbookClimbs.length === 0 ? <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0" }}>No climbs match your filters.</div>
              : (() => {
                  const visible = logbookClimbs.slice(0, logbookClimbPage * 20);
                  const hasMore = logbookClimbs.length > visible.length;
                  return (
                    <>
                      {logbookTileView === "list" ? (
                        visible.map((c, i) => (
                          <ClimbRow key={`${c.id}-${i}`} climb={c} onEdit={() => {}} onRemove={() => {}} onInlineSave={() => {}} onClimbClick={() => setSelectedLogbookClimb(c)} />
                        ))
                      ) : (() => {
                        // Shared per-card data extraction for both tile views
                        const renderCards = (cols) => visible.map((c, i) => {
                          const showHeader = logbookSort === "date" && (i === 0 || logbookClimbs[i - 1].sessionDate !== c.sessionDate);
                          const gradeClr  = getGradeColor(c.grade);
                          const colorHex  = CLIMB_COLORS.find(cc => cc.id === c.color)?.hex;
                          const isOffWall = c.setClimbId ? Object.values(gymSets).flat().some(e => e.id === c.setClimbId && e.removed) : false;
                          let lpTimer = null;
                          const handleLPStart = () => { lpTimer = setTimeout(() => { setLongPressPhotoTarget({ climbId: c.id, sessionId: c._sessionId }); lbPhotoRef.current?.click(); }, 600); };
                          const handleLPEnd   = () => { clearTimeout(lpTimer); };
                          const headerSpan   = cols === 2 ? { gridColumn: "1 / -1" } : {};
                          return (
                            <Fragment key={`${c.id}-${i}`}>
                              {showHeader && (
                                <div style={{ ...headerSpan, fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 2, marginTop: i > 0 ? 10 : 0 }}>📍 {c.sessionLocation} · {formatDate(c.sessionDate)}</div>
                              )}
                              {c.photo ? (
                                /* ── PHOTO CARD ─────────────────────────── */
                                <div onClick={() => setSelectedLogbookClimb(c)} style={{ borderRadius: 14, overflow: "hidden", border: `1.5px solid ${c.isProject ? W.pinkDark + "80" : W.border}`, cursor: "pointer", position: "relative", minHeight: cols === 2 ? 200 : 190 }}>
                                  <img src={c.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: isOffWall ? "grayscale(60%)" : "none" }} />
                                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.72) 100%)" }} />
                                  {/* top-left badges */}
                                  <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                                    {c.isProject && <span style={{ background: W.pinkDark, color: "#fff", borderRadius: 7, padding: "3px 9px", fontSize: 11, fontWeight: 900, boxShadow: "0 2px 6px rgba(0,0,0,0.5)", letterSpacing: 0.3 }}>🎯 PROJECT</span>}
                                    {isOffWall && <span style={{ background: "rgba(0,0,0,0.65)", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>🚫 Off Wall</span>}
                                  </div>
                                  {/* sent badge top-right */}
                                  <div style={{ position: "absolute", top: 8, right: 8 }}>
                                    <span style={{ background: c.completed ? "#16a34a" : "#dc2626", color: "#fff", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 800 }}>{c.completed ? "✓" : "✗"}</span>
                                  </div>
                                  {/* grade + info bottom */}
                                  <div style={{ position: "absolute", bottom: 10, left: 10, right: 10 }}>
                                    {c.name && <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{c.name}</div>}
                                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                      <div style={{ background: isOffWall ? "rgba(80,80,80,0.85)" : gradeClr, color: "#fff", borderRadius: 8, padding: "3px 10px", fontWeight: 900, fontSize: 17, letterSpacing: 0.3, boxShadow: "0 1px 5px rgba(0,0,0,0.5)" }}>{c.grade}</div>
                                      {colorHex && <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorHex, border: "2px solid rgba(255,255,255,0.8)", flexShrink: 0 }} />}
                                    </div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{c.climbType === "rope" ? `${c.tries || 0} attempts · ${c.falls ?? 0} falls${(c.takes || 0) > 0 ? ` · ${c.takes} takes` : ""}` : `${c.tries || 0} falls · ${climbAttempts(c)} attempts`}{c._sessionCount > 1 ? ` · 🗓 ${c._sessionCount}` : ""}</div>
                                    {c.section && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, marginTop: 2 }}>📌 {c.section}</div>}
                                  </div>
                                </div>
                              ) : cols === 2 ? (
                                /* ── NO-PHOTO 2-COL TILE ─────────────────── */
                                <div onClick={() => setSelectedLogbookClimb(c)} onTouchStart={handleLPStart} onTouchEnd={handleLPEnd} onTouchMove={handleLPEnd} style={{ background: W.surface, borderRadius: 14, border: `1.5px solid ${c.isProject ? W.pinkDark + "80" : W.border}`, borderTop: `3px solid ${isOffWall ? W.border : gradeClr}`, cursor: "pointer", overflow: "hidden", minHeight: 120 }}>
                                  {c.isProject && <div style={{ background: `linear-gradient(90deg, ${W.pinkDark}, #be185d)`, color: "#fff", padding: "4px 10px", fontSize: 11, fontWeight: 900, letterSpacing: 0.4 }}>🎯 PROJECT</div>}
                                  {isOffWall && !c.isProject && <div style={{ background: W.surface2, color: W.textMuted, padding: "3px 8px", fontSize: 10, fontWeight: 800 }}>🚫 Off Wall</div>}
                                  <div style={{ padding: "10px 10px 12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: W.text, overflow: "hidden", textOverflow: "ellipsis", flex: 1, marginRight: 6, lineHeight: 1.3 }}>{c.name || "—"}</span>
                                      <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 6, padding: "2px 6px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>{c.completed ? "✓" : "✗"}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                                      <span style={{ fontWeight: 900, fontSize: 20, color: isOffWall ? W.textMuted : gradeClr }}>{c.grade}</span>
                                      {colorHex && <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorHex, flexShrink: 0, border: `1px solid ${W.border}` }} />}
                                    </div>
                                    <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 3 }}>{c.climbType === "rope" ? `${c.tries || 0} attempts · ${c.falls ?? 0} falls${(c.takes || 0) > 0 ? ` · ${c.takes} takes` : ""}` : `${c.tries || 0} falls · ${climbAttempts(c)} attempts`}{c._sessionCount > 1 ? ` · 🗓 ${c._sessionCount}` : ""}</div>
                                    {c.section && <div style={{ fontSize: 11, color: W.accent, fontWeight: 700 }}>📌 {c.section}</div>}
                                  </div>
                                </div>
                              ) : (
                                /* ── NO-PHOTO SINGLE ROW ─────────────────── */
                                <div onClick={() => setSelectedLogbookClimb(c)} onTouchStart={handleLPStart} onTouchEnd={handleLPEnd} onTouchMove={handleLPEnd} style={{ borderRadius: 14, border: `1px solid ${c.isProject ? W.pinkDark + "80" : W.border}`, borderLeft: `4px solid ${isOffWall ? W.border : gradeClr}`, marginBottom: 10, cursor: "pointer", background: W.surface, overflow: "hidden" }}>
                                  {c.isProject && <div style={{ background: `linear-gradient(90deg, ${W.pinkDark}, #be185d)`, color: "#fff", padding: "4px 14px", fontSize: 11, fontWeight: 900, letterSpacing: 0.4 }}>🎯 PROJECT</div>}
                                  <div style={{ display: "flex", alignItems: "stretch", minHeight: 72 }}>
                                    <div style={{ background: (isOffWall ? W.border : gradeClr) + "1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 14px", minWidth: 56, borderRight: `1px solid ${(isOffWall ? W.border : gradeClr)}28` }}>
                                      <div style={{ fontWeight: 900, fontSize: 17, color: isOffWall ? W.textMuted : gradeClr }}>{c.grade}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, flexWrap: "wrap" }}>
                                        {colorHex && <div style={{ width: 13, height: 13, borderRadius: "50%", background: colorHex, border: `1.5px solid ${W.border}`, flexShrink: 0 }} />}
                                        {c.name && <span style={{ fontWeight: 700, color: W.text, fontSize: 14 }}>{c.name}</span>}
                                        {isOffWall && <span style={{ fontSize: 10, color: W.textMuted, fontWeight: 800 }}>🚫 Off Wall</span>}
                                      </div>
                                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                        <span style={{ fontSize: 12, color: W.textMuted }}>{c.climbType === "rope" ? `${c.tries || 0} attempts · ${c.falls ?? 0} falls${(c.takes || 0) > 0 ? ` · ${c.takes} takes` : ""}` : `${c.tries || 0} falls · ${climbAttempts(c)} attempts`}{c._sessionCount > 1 ? ` · 🗓 ${c._sessionCount}` : ""}</span>
                                        {c.section && <span style={{ fontSize: 11, color: W.accent, fontWeight: 700 }}>📌 {c.section}</span>}
                                      </div>
                                    </div>
                                    <div style={{ padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                                      <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{c.completed ? "✓" : "✗"}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Fragment>
                          );
                        });
                        return logbookTileView === "tiles"
                          ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{renderCards(2)}</div>
                          : <div>{renderCards(1)}</div>;
                      })()}
                      {hasMore && (
                        <button onClick={() => setLogbookClimbPage(p => p + 1)} style={{ width: "100%", padding: "13px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8, marginBottom: 8 }}>
                          Load more ({logbookClimbs.length - visible.length} remaining)
                        </button>
                      )}
                    </>
                  );
                })()}
          </div>
        )}

        {profileTab === "climbing" && climbingSubTab === "sessions" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setLogbookFiltersOpen(o => !o)} style={{ width: "100%", padding: "11px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: logbookFiltersOpen ? "12px 12px 0 0" : "12px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>Filters</span>{hasSessionFilters && <span style={{ background: W.accent, color: "#fff", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Active</span>}</div>
                <span style={{ color: W.textMuted, fontSize: 16 }}>⌄</span>
              </button>
              {logbookFiltersOpen && (
                <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderTop: "none", borderRadius: "0 0 12px 12px", padding: "14px" }}>
                  <Label>Gym</Label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {allGyms.map(g => <button key={g} onClick={() => setLogbookGymFilter(g)} style={{ padding: "6px 12px", borderRadius: 16, border: "2px solid", borderColor: logbookGymFilter === g ? W.accent : W.border, background: logbookGymFilter === g ? W.accent + "22" : W.surface, color: logbookGymFilter === g ? W.accent : W.textDim, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📍 {g}</button>)}
                  </div>
                  <Label>Type</Label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                    {[["all","All"],["boulder","Boulder"],["rope","Rope"],["speed","Speed"],["mixed","Mixed"],["fitness","Fitness"]].map(([val,label]) =>
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
                </div>
              )}
            </div>
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
          </div>
        )}

        {profileTab === "climbing" && climbingSubTab === "gyms" && (() => {
          // All known locations, home gym first then alphabetical
          const allLocations = [...new Set([
            ...Object.keys(gymSets).filter(loc => (gymSets[loc] || []).length > 0),
            ...sessions.map(s => s.location).filter(Boolean),
            ...customLocations,
          ])].filter(Boolean).sort((a, b) => {
            if (a === mainGym) return -1;
            if (b === mainGym) return 1;
            return a.localeCompare(b);
          });

          // ── Gym cards grid ─────────────────────────────────────────
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {allLocations.map(loc => {
                const allEntries = gymSets[loc] || [];
                const active = allEntries.filter(e => !e.removed);
                const activeSends = active.filter(entry =>
                  sessions.some(s => (s.climbs || []).some(c => c.setClimbId === entry.id && c.completed))
                ).length;
                const gymSessionCount = sessions.filter(s => s.location === loc).length;
                const gs = gymScales[loc] || {};
                const isHome = loc === mainGym;
                const gymTotalSec = sessions.filter(s => s.location === loc).reduce((sum, s) => sum + (s.duration || 0), 0);
                return (
                  <div key={loc} onClick={() => { setSelectedGym(loc); setGymDetailTab("overview"); }} style={{ background: W.surface, border: `2px solid ${isHome ? W.accentDark : W.border}`, borderRadius: 16, padding: "14px 12px", cursor: "pointer", position: "relative", minHeight: 120, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    {isHome && <span style={{ position: "absolute", top: 8, right: 8, background: W.accent, color: "#fff", borderRadius: 6, padding: "1px 7px", fontSize: 9, fontWeight: 800 }}>HOME</span>}
                    <div style={{ fontWeight: 800, fontSize: 13, color: W.text, paddingRight: isHome ? 44 : 0, lineHeight: 1.3 }}>{loc}</div>
                    <div style={{ display: "flex", gap: 14 }}>
                      {active.length > 0 && <>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 20, color: W.text, lineHeight: 1 }}>{active.length}</div>
                          <div style={{ fontSize: 10, color: W.textMuted, marginTop: 2 }}>Active</div>
                        </div>
                        <div>
                          <div style={{ fontWeight: 900, fontSize: 20, color: activeSends > 0 ? W.greenDark : W.textMuted, lineHeight: 1 }}>{activeSends}</div>
                          <div style={{ fontSize: 10, color: W.textMuted, marginTop: 2 }}>Sent</div>
                        </div>
                      </>}
                      {gymSessionCount > 0 && <div>
                        <div style={{ fontWeight: 900, fontSize: 20, color: W.accent, lineHeight: 1 }}>{gymSessionCount}</div>
                        <div style={{ fontSize: 10, color: W.textMuted, marginTop: 2 }}>Sessions</div>
                      </div>}
                      {active.length === 0 && gymSessionCount === 0 && <div style={{ fontSize: 11, color: W.textDim }}>No sessions yet</div>}
                    </div>
                    {gymTotalSec > 0 && (
                      <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 700 }}>
                        <span style={{ color: W.text, fontWeight: 900 }}>{formatTotalTime(gymTotalSec)}</span> total time
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Add gym card */}
              <div onClick={() => { setGymCreateStep(1); setGymCreateName(""); setGymCreateActivities([]); setGymCreateId(null); setGymCreateBoulderScale("V-Scale"); setGymCreateRopeScale("French"); setShowGymCreate(true); }} style={{ background: W.surface, border: `2px dashed ${W.border}`, borderRadius: 16, padding: "14px 12px", cursor: "pointer", minHeight: 110, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <div style={{ fontSize: 32, color: W.textMuted, lineHeight: 1 }}>+</div>
                <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 700 }}>Add Gym</div>
              </div>
            </div>
          );
        })()}

      </div>
    );
  };

  // §SCREEN_PROJECT_DETAIL — defined in ./Screens.jsx, imported above

    // §SCREEN_CALENDAR
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
                      <div style={{ fontSize: 12, color: W.textMuted }}>{s.location} · {(s.climbs || []).length} climbs</div>
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

  // §SCREEN_SESSION_SUMMARY — defined in ./Screens.jsx, imported above

    // §SCREEN_USER_PROFILE
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
    const totalTries = uClimbs.reduce((t, c) => t + climbAttempts(c), 0);
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

  // §SCREEN_LEADERBOARD
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

  // §SCREEN_SOCIAL
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
          const notifFiltered = notifTypeFilter === "climbs"
            ? notifications.map((n, origIdx) => ({ n, origIdx })).filter(({ n }) => n.type === "climbShare")
            : notifications.map((n, origIdx) => ({ n, origIdx }));
          return (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <button onClick={() => setNotifTypeFilter("all")} style={{ padding: "5px 12px", background: notifTypeFilter === "all" ? W.accent : W.surface2, border: `1px solid ${notifTypeFilter === "all" ? W.accent : W.border}`, borderRadius: 20, color: notifTypeFilter === "all" ? "#fff" : W.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>All</button>
                <button onClick={() => setNotifTypeFilter("climbs")} style={{ padding: "5px 12px", background: notifTypeFilter === "climbs" ? W.accent : W.surface2, border: `1px solid ${notifTypeFilter === "climbs" ? W.accent : W.border}`, borderRadius: 20, color: notifTypeFilter === "climbs" ? "#fff" : W.textMuted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>📤 Shared Climbs</button>
              </div>
              {notifFiltered.map(({ n, origIdx: i }) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderBottom: `1px solid ${W.border}` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? W.border : W.accent, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    {n.type === "follow"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> started following you</div>
                    : n.type === "followRequest"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> requested to follow you</div>
                    : n.type === "comment"
                    ? <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> commented on your session</div>
                    : n.type === "climbShare"
                    ? <div>
                        <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> sent you {n.climbs?.length === 1 ? "a climb" : `${n.climbs?.length} climbs`} 📤</div>
                        <button onClick={() => { setPendingSharedClimbs(n); setSharedClimbGym(""); setSharedClimbSections({}); setScreen("social"); }} style={{ marginTop: 6, padding: "5px 12px", background: W.accent + "22", border: `1px solid ${W.accent}`, borderRadius: 8, color: W.accent, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View & Add to Gym</button>
                      </div>
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

  screenRef.current = screen; // sync ref each render — no hook needed

  // §RENDER
  const backMap  = { sessionDetail: sessionDetailBackTo, calendar: "profile", projectDetail: "profile", userProfile: userProfileBackTo, social: "profile", leaderboard: "profile" };
  const navItems = [
    { id: "home",    label: "🏠", text: "Home" },
    { id: "session", label: "⏱", text: "Session", action: () => activeSession ? setScreen("session") : goToSessionSetup() },
    { id: "profile", label: "👤", text: "Profile" },
  ];

  return (
    <ErrorBoundary key="app-root">
    <ThemeCtx.Provider value={W}>
    {showOnboarding && (
      <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: W.bg, overflowY: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 420, padding: "40px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🧗</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: W.text, marginBottom: 6 }}>Welcome to SendLog!</div>
            <div style={{ fontSize: 14, color: W.textMuted }}>Let's set up your preferences</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {[0, 1, 2, 3].map(i => <div key={i} style={{ width: onboardingStep === i ? 20 : 8, height: 8, borderRadius: 4, background: onboardingStep === i ? W.accent : W.border, transition: "width 0.2s" }} />)}
            </div>
            <button onClick={() => setShowOnboarding(false)} style={{ marginTop: 12, background: "none", border: "none", color: W.textDim, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Skip setup</button>
          </div>
          {onboardingStep === 0 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 4 }}>Grading scales</div>
              <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 16 }}>Choose the grade systems you use for bouldering and rope climbing.</div>

              {/* Boulder */}
              <div style={{ fontSize: 13, fontWeight: 700, color: W.accent, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>🪨 Bouldering</div>
              {["V-Scale", "French", "Custom"].map(s => (
                <button key={s} onClick={() => setPreferredScale(s)} style={{ display: "block", width: "100%", padding: "12px 16px", marginBottom: 8, borderRadius: 12, border: `2px solid ${preferredScale === s ? W.accent : W.border}`, background: preferredScale === s ? W.accent + "22" : W.surface, color: preferredScale === s ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                  {s === "V-Scale" ? "V-Scale — V0, V1, V2…" : s === "French" ? "French — 4a, 5b, 6c…" : "Custom — your own system"}
                </button>
              ))}
              {preferredScale === "Custom" && (
                <div style={{ marginBottom: 12, background: W.surface2, borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${W.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginBottom: 6 }}>Scale name</div>
                  <input value={customBoulderScaleName} onChange={e => setCustomBoulderScaleName(e.target.value)} onBlur={e => { if (!e.target.value.trim()) setCustomBoulderScaleName("Custom"); }} placeholder="e.g. My Gym Scale" style={{ width: "100%", padding: "8px 11px", background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginBottom: 5 }}>Grade levels <span style={{ color: W.textDim, fontWeight: 400 }}>(easiest → hardest, comma or newline separated)</span></div>
                  <textarea value={customBoulderInput} onChange={e => { setCustomBoulderInput(e.target.value); setCustomBoulderGrades(e.target.value.split(/[\n,]+/).map(g => g.trim()).filter(Boolean)); }} placeholder={"Easy, Medium, Hard, Project"} rows={3} style={{ width: "100%", padding: "8px 11px", background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
                  {customBoulderGrades.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {customBoulderGrades.map((g, i) => <span key={i} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 7, padding: "2px 9px", fontSize: 11, color: W.text, fontWeight: 600 }}>{g}</span>)}
                    </div>
                  )}
                </div>
              )}

              {/* Rope */}
              <div style={{ fontSize: 13, fontWeight: 700, color: W.accent, marginBottom: 8, marginTop: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>🧗 Rope Climbing</div>
              {["French", "YDS", "Custom"].map(s => (
                <button key={s} onClick={() => setPreferredRopeScale(s)} style={{ display: "block", width: "100%", padding: "12px 16px", marginBottom: 8, borderRadius: 12, border: `2px solid ${preferredRopeScale === s ? W.accent : W.border}`, background: preferredRopeScale === s ? W.accent + "22" : W.surface, color: preferredRopeScale === s ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>
                  {s === "French" ? "French — 6a, 6b+, 7a…" : s === "YDS" ? "YDS — 5.10a, 5.11c…" : "Custom — your own system"}
                </button>
              ))}
              {preferredRopeScale === "Custom" && (
                <div style={{ marginBottom: 12, background: W.surface2, borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${W.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginBottom: 6 }}>Scale name</div>
                  <input value={customRopeScaleName} onChange={e => setCustomRopeScaleName(e.target.value)} onBlur={e => { if (!e.target.value.trim()) setCustomRopeScaleName("Custom"); }} placeholder="e.g. My Gym Rope Scale" style={{ width: "100%", padding: "8px 11px", background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.text, marginBottom: 5 }}>Grade levels <span style={{ color: W.textDim, fontWeight: 400 }}>(easiest → hardest, comma or newline separated)</span></div>
                  <textarea value={customRopeInput} onChange={e => { setCustomRopeInput(e.target.value); setCustomRopeGrades(e.target.value.split(/[\n,]+/).map(g => g.trim()).filter(Boolean)); }} placeholder={"Easy, Medium, Hard, Project"} rows={3} style={{ width: "100%", padding: "8px 11px", background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
                  {customRopeGrades.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {customRopeGrades.map((g, i) => <span key={i} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 7, padding: "2px 9px", fontSize: 11, color: W.text, fontWeight: 600 }}>{g}</span>)}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setOnboardingStep(1)} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8 }}>Next →</button>
            </div>
          )}
          {onboardingStep === 1 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 6 }}>Your gyms</div>
              <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 16 }}>Add climbing gyms so they appear in the location picker.</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input value={onboardingGymInput} onChange={e => setOnboardingGymInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && onboardingGymInput.trim()) { setOnboardingGyms(prev => [...new Set([...prev, onboardingGymInput.trim()])]); setOnboardingGymInput(""); } }} placeholder="Type a gym name..." style={{ flex: 1, padding: "11px 14px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 14, fontFamily: "inherit" }} />
                <button onClick={() => { if (onboardingGymInput.trim()) { setOnboardingGyms(prev => [...new Set([...prev, onboardingGymInput.trim()])]); setOnboardingGymInput(""); } }} style={{ padding: "11px 16px", background: W.accent, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Add</button>
              </div>
              {onboardingGyms.map(g => (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: 10, background: W.surface2, borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: `1px solid ${W.border}` }}>
                  <span style={{ flex: 1, fontWeight: 600, color: W.text, fontSize: 14 }}>📍 {g}</span>
                  <button onClick={() => setOnboardingGyms(prev => prev.filter(x => x !== g))} style={{ background: "none", border: "none", color: W.redDark, cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
              {onboardingGyms.length === 0 && <div style={{ color: W.textDim, fontSize: 13, textAlign: "center", padding: "20px 0" }}>No gyms added yet — you can skip this and add them later</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => setOnboardingStep(0)} style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>← Back</button>
                <button onClick={() => setOnboardingStep(2)} style={{ flex: 2, padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Next →</button>
              </div>
            </div>
          )}
          {onboardingStep === 2 && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 6 }}>Main gym</div>
              <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 16 }}>This will be the default location when you start a session.</div>
              {onboardingGyms.filter((v, i, a) => a.indexOf(v) === i).map(g => (
                <button key={g} onClick={() => setMainGym(mainGym === g ? "" : g)} style={{ display: "block", width: "100%", padding: "13px 16px", marginBottom: 10, borderRadius: 14, border: `2px solid ${mainGym === g ? W.accent : W.border}`, background: mainGym === g ? W.accent + "22" : W.surface, color: mainGym === g ? W.accent : W.text, fontWeight: 700, fontSize: 14, cursor: "pointer", textAlign: "left" }}>📍 {g}</button>
              ))}
              {onboardingGyms.length === 0 && <div style={{ color: W.textDim, fontSize: 13, marginBottom: 12 }}>Add gyms in the previous step to select a main gym.</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setOnboardingStep(1)} style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>← Back</button>
                <button onClick={() => { if (onboardingGyms.length > 0) setCustomLocations(prev => [...new Set([...prev, ...onboardingGyms])]); setOnboardingStep(3); }} style={{ flex: 2, padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Next →</button>
              </div>
            </div>
          )}
          {onboardingStep === 3 && (() => {
            const themes = [
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
            ];
            return (
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: W.text, marginBottom: 6 }}>Choose your theme</div>
                <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 16 }}>Pick a look that feels like you — change it anytime in settings.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                  {themes.map(t => {
                    const themeW = THEMES[t.id];
                    const isSelected = colorTheme === t.id;
                    return (
                      <button key={t.id} onClick={() => setColorTheme(t.id)} style={{ padding: "12px 6px", borderRadius: 14, border: `2px solid`, borderColor: isSelected ? W.accent : W.border, background: isSelected ? W.accent + "22" : W.surface, cursor: "pointer", textAlign: "center", position: "relative", overflow: "hidden" }}>
                        {isSelected && <div style={{ position: "absolute", top: 5, right: 7, fontSize: 10, fontWeight: 900, color: W.accent }}>✓</div>}
                        <div style={{ display: "flex", gap: 3, justifyContent: "center", marginBottom: 6 }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: themeW.accent }} />
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: themeW.surface2 }} />
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: themeW.green }} />
                        </div>
                        <div style={{ fontSize: 18, marginBottom: 3 }}>{t.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 11, color: isSelected ? W.accent : W.text }}>{t.label}</div>
                        <div style={{ fontSize: 9, color: W.textMuted, marginTop: 1, opacity: 0.8 }}>{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setOnboardingStep(2)} style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, cursor: "pointer" }}>← Back</button>
                  <button onClick={() => setShowOnboarding(false)} style={{ flex: 2, padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Let's Climb! 🎉</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    )}
    <div style={{ width: "100%", minHeight: "100vh", background: W.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", justifyContent: "center", zoom: 1.1 }}>
    <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: `1px solid ${W.border}`, background: W.navBg, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(backMap[screen] || screen === "session" || screen === "sessionSummary") && (
            <button onClick={() => { if (screen === "session" && sessionStarted && showClimbForm) { setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); setShowNewBoulderForm(false); } else if (screen === "session" && !sessionStarted) setScreen("home"); else if (screen === "sessionSummary") setShowSummaryLeaveWarn(true); else if (backMap[screen]) { setScreen(backMap[screen]); setShowClimbForm(false); if (screen === "calendar" || screen === "projectDetail") setProfileTab("stats"); if (screen === "sessionDetail") setSessionReadOnly(false); } }} style={{ background: "none", border: "none", color: W.accent, fontSize: 16, cursor: "pointer", padding: 0, marginRight: 4 }}>←</button>
          )}
          {screen === "session" && sessionStarted ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: W.text, lineHeight: 1.2 }}>{activeSession?.location || "Session"}</div>
                <button onClick={() => setActiveLocationDropdownOpen(o => !o)} style={{ background: "none", border: "none", color: W.textMuted, cursor: "pointer", padding: "0 2px", fontSize: 12, lineHeight: 1 }}>✏️</button>
              </div>
              <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 600 }}>{(activeSession?.climbs || []).filter(c => c.climbType !== "speed-session").reduce((sum, c) => sum + (c.tries || 0) + (c.completed ? 1 : 0), 0)} attempts</div>
            </div>
          ) : (
            <>
              <span style={{ fontSize: 20 }}>🧗</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: W.text }}>SendLog</span>
            </>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {screen === "session" && sessionStarted && <div style={{ fontWeight: 900, fontSize: 26, color: W.text, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1 }}>{formatDuration(sessionTimer)}</div>}
          {timerRunning && screen !== "session" && <div style={{ background: W.accent, borderRadius: 20, padding: "4px 12px", color: "#fff", fontSize: 12, fontWeight: 700 }}>⏱ {formatDuration(sessionTimer)}</div>}
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

      {screen === "session" && sessionStarted && activeLocationDropdownOpen && (
        <div style={{ padding: "10px 20px 12px", background: W.navBg, borderBottom: `1px solid ${W.border}`, position: "sticky", top: 0, zIndex: 49 }} onClick={e => e.stopPropagation()}>
          <LocationDropdown value={activeSession?.location || ""} onChange={v => { setActiveSession(s => ({ ...s, location: v })); addCustomLocation(v); setActiveLocationDropdownOpen(false); if (gymScales[v]?.boulder) setPreferredScale(gymScales[v].boulder); if (gymScales[v]?.rope) setPreferredRopeScale(gymScales[v].rope); }} open={activeLocationDropdownOpen} setOpen={setActiveLocationDropdownOpen} knownLocations={knownLocations} onRemove={loc => setHiddenLocations(h => [...h, loc])} />
        </div>
      )}
      {/* Clip container — holds main panel + peek panel side by side during swipe */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {/* Main panel */}
        <div
          ref={node => { scrollDivRef.current = node; }}
          style={{ position: "absolute", inset: 0, overflowY: "auto", paddingBottom: screen === "sessionSummary" ? 0 : "calc(80px + env(safe-area-inset-bottom))" }}
          onTouchStart={e => {
            if (swipeAnimRef.current) return;
            const touch = e.touches[0];
            swipeStartRef.current = { x: touch.clientX, y: touch.clientY, ts: Date.now() };
            swipeLockedRef.current = null;
            // Attach non-passive touchmove on document so we can preventDefault for horizontal swipes
            const onMove = (me) => {
              if (!swipeStartRef.current) return;
              const mt = me.touches[0];
              const ddx = mt.clientX - swipeStartRef.current.x;
              const ddy = mt.clientY - swipeStartRef.current.y;
              if (!swipeLockedRef.current) {
                if (Math.abs(ddx) > 7 || Math.abs(ddy) > 7) {
                  const si = ["home","session","profile"].indexOf(screenRef.current);
                  const canH = si !== -1 && !swipeAnimRef.current &&
                    ((ddx < 0 && si < 2) || (ddx > 0 && si > 0));
                  const locked = (Math.abs(ddx) >= Math.abs(ddy) && canH) ? "h" : "v";
                  swipeLockedRef.current = locked;
                  // Initiate peek panel on first horizontal lock
                  if (locked === "h" && !swipePeekRef.current) {
                    const si2 = ["home","session","profile"].indexOf(screenRef.current);
                    const nextTab = ["home","session","profile"][ddx < 0 ? si2 + 1 : si2 - 1];
                    if (nextTab) {
                      swipePeekRef.current = { tab: nextTab, fromRight: ddx < 0 };
                      // Use rAF so peek renders next frame without blocking current touch event
                      requestAnimationFrame(() => setSwipePeekScreen(nextTab));
                    }
                  }
                }
                return;
              }
              if (swipeLockedRef.current !== "h") return;
              me.preventDefault();
              const si = ["home","session","profile"].indexOf(screenRef.current);
              const atEdge = (si === 0 && ddx > 0) || (si === 2 && ddx < 0);
              const offset = atEdge ? Math.sign(ddx) * Math.pow(Math.abs(ddx), 0.55) * 5 : ddx;
              const vpW = window.innerWidth;
              if (scrollDivRef.current) { scrollDivRef.current.style.transform = `translateX(${offset}px)`; scrollDivRef.current.style.transition = "none"; }
              // Move peek panel: starts at ±vpW, tracks with drag
              if (peekDivRef.current && swipePeekRef.current) {
                const peekBase = swipePeekRef.current.fromRight ? vpW : -vpW;
                peekDivRef.current.style.transform = `translateX(${peekBase + offset}px)`;
                peekDivRef.current.style.transition = "none";
              }
            };
            swipeStartRef.current.onMove = onMove;
            document.addEventListener("touchmove", onMove, { passive: false });
          }}
          onTouchEnd={e => {
            const onMove = swipeStartRef.current?.onMove;
            if (onMove) document.removeEventListener("touchmove", onMove);
            const el = scrollDivRef.current;
            if (!swipeStartRef.current || swipeLockedRef.current !== "h") {
              swipeStartRef.current = null;
              swipeLockedRef.current = null;
              if (el && el.style.transform && el.style.transform !== "translateX(0px)") {
                el.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
                el.style.transform = "translateX(0px)";
                setTimeout(() => { if (el) el.style.cssText = el.style.cssText.replace(/transition[^;]*;?/g,"").replace(/transform[^;]*;?/g,""); }, 400);
              }
              // Spring peek back if it somehow appeared
              if (peekDivRef.current && swipePeekRef.current) {
                const vpW = window.innerWidth;
                peekDivRef.current.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
                peekDivRef.current.style.transform = `translateX(${swipePeekRef.current.fromRight ? vpW : -vpW}px)`;
                setTimeout(() => { setSwipePeekScreen(null); swipePeekRef.current = null; }, 400);
              }
              return;
            }
            const { x: startX, ts: startTs } = swipeStartRef.current;
            swipeStartRef.current = null;
            swipeLockedRef.current = null;
            const touch = e.changedTouches[0];
            const ddx = touch.clientX - startX;
            const velocity = Math.abs(ddx) / Math.max(Date.now() - startTs, 1);
            const STABS = ["home","session","profile"];
            const si = STABS.indexOf(screen);
            if (si === -1) { if (el) { el.style.transform = ""; } return; }
            const shouldCommit = (Math.abs(ddx) >= 58 || velocity > 0.45) &&
              ((ddx < 0 && si < 2) || (ddx > 0 && si > 0));
            if (shouldCommit) {
              const nextTab = STABS[ddx < 0 ? si + 1 : si - 1];
              const vpW = window.innerWidth;
              swipeAnimRef.current = true;
              const doSwitch = () => {
                if (nextTab === "session") { activeSession ? setScreen("session") : goToSessionSetup(); } else setScreen(nextTab);
                setSwipePeekScreen(null);
                swipePeekRef.current = null;
                if (scrollDivRef.current) { scrollDivRef.current.style.transition = "none"; scrollDivRef.current.style.transform = ""; }
                swipeAnimRef.current = false;
              };
              if (peekDivRef.current) {
                // Peek is ready — full sliding transition
                el.style.transition = "transform 0.22s cubic-bezier(0.4,0,1,1)";
                el.style.transform = `translateX(${ddx < 0 ? -vpW : vpW}px)`;
                peekDivRef.current.style.transition = "transform 0.22s cubic-bezier(0.4,0,1,1)";
                peekDivRef.current.style.transform = "translateX(0)";
                setTimeout(doSwitch, 220);
              } else {
                // Peek not rendered yet — skip animation, switch directly
                if (el) { el.style.transform = ""; el.style.transition = "none"; }
                doSwitch();
              }
            } else {
              const vpW = window.innerWidth;
              // Spring main back
              el.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
              el.style.transform = "translateX(0px)";
              // Spring peek back off-screen
              if (peekDivRef.current && swipePeekRef.current) {
                peekDivRef.current.style.transition = "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)";
                peekDivRef.current.style.transform = `translateX(${swipePeekRef.current.fromRight ? vpW : -vpW}px)`;
              }
              setTimeout(() => {
                if (el) { el.style.transform = ""; el.style.transition = ""; }
                setSwipePeekScreen(null);
                swipePeekRef.current = null;
              }, 400);
            }
          }}
          onTouchCancel={() => {
            const onMove = swipeStartRef.current?.onMove;
            if (onMove) document.removeEventListener("touchmove", onMove);
            swipeStartRef.current = null;
            swipeLockedRef.current = null;
            if (scrollDivRef.current) { scrollDivRef.current.style.transform = ""; scrollDivRef.current.style.transition = ""; }
            setSwipePeekScreen(null);
            swipePeekRef.current = null;
          }}
          onClick={() => { setLocationDropdownOpen(false); setActiveLocationDropdownOpen(false); }}>
          {screen === "home"          && <HomeScreen />}
          {screen === "session"       && (sessionStarted ? <ErrorBoundary key="session-active"><ActiveSessionRenderer render={SessionActiveScreen} /></ErrorBoundary> : SessionSetupScreen())}
          {screen === "social"        && SocialScreen()}
          {screen === "userProfile"   && UserProfileScreen()}
          {screen === "profile"       && ProfileScreen()}
          {screen === "sessionDetail" && selectedSession && <SessionDetailScreen session={selectedSession} />}
          {screen === "calendar"      && <CalendarScreen />}
          {screen === "projectDetail" && selectedProject && <ProjectDetailScreen
            project={projects.find(p => p.id === selectedProject.id) || selectedProject}
            history={getProjectHistory(selectedProject.id)}
            totalTries={getProjectTotalTries(selectedProject.id)}
            totalMs={getProjectTotalTimeMs(selectedProject.id)}
            photo={getProjectPhoto(selectedProject.id)}
            getGradeIndex={getGradeIndex}
            updateProjectNotes={updateProjectNotes}
            markProjectSent={markProjectSent}
            deactivateProject={deactivateProject}
            reactivateProject={reactivateProject}
            setScreen={setScreen}
            setProfileTab={setProfileTab}
          />}
          {screen === "leaderboard"    && LeaderboardScreen()}
          {screen === "sessionSummary" && sessionSummary && <SessionSummaryScreen
            session={sessionSummary}
            getSessionStats={getSessionStats}
            getGradeIndex={getGradeIndex}
            leaderboardData={leaderboardData}
            goToLeaderboard={goToLeaderboard}
            setSessionSummary={setSessionSummary}
            setScreen={setScreen}
            discardSession={discardSession}
            showSummaryLeaveWarn={showSummaryLeaveWarn}
            setShowSummaryLeaveWarn={setShowSummaryLeaveWarn}
            updateSessionNotes={updateSessionNotes}
            recentSessions={sessions.filter(s => s.id !== sessionSummary.id).slice(0, 5)}
            allSessions={sessions}
          />}
        </div>

        {/* Peek panel — adjacent screen visible during horizontal swipe */}
        {swipePeekScreen && (
          <div
            ref={node => {
              peekDivRef.current = node;
              // Set initial off-screen position when panel first mounts
              if (node && swipePeekRef.current) {
                const vpW = window.innerWidth;
                node.style.transform = `translateX(${swipePeekRef.current.fromRight ? vpW : -vpW}px)`;
                node.style.transition = "none";
              }
            }}
            style={{ position: "absolute", inset: 0, overflowY: "auto", paddingBottom: "calc(80px + env(safe-area-inset-bottom))", pointerEvents: "none" }}>
            {swipePeekScreen === "home"    && <HomeScreen />}
            {swipePeekScreen === "session" && (sessionStarted ? <ErrorBoundary key="session-peek"><ActiveSessionRenderer render={SessionActiveScreen} /></ErrorBoundary> : SessionSetupScreen())}
            {swipePeekScreen === "profile" && ProfileScreen()}
          </div>
        )}
      </div>

      {/* Scheme Builder Modal */}
      {showSchemeBuilder && (() => {
        const SCHEME_COLORS = ["#ff4444","#ff8c00","#ffd700","#88cc00","#00cc88","#00aaff","#6644ff","#ff44cc","#ffffff","#aaaaaa","#555555","#000000","#a0522d","#ff69b4","#40e0d0","#ff6347"];
        const PRESETS = [
          { name: "Rainbow",    colors: ["#ff0000","#ff7700","#ffee00","#00cc44","#0099ff","#8833ff"] },
          { name: "Traffic",    colors: ["#00e676","#aeea00","#ffee00","#ff9100","#ff1744"] },
          { name: "Lava",       colors: ["#fffde7","#ffca28","#ff6f00","#bf360c","#3e0000"] },
          { name: "Ocean",      colors: ["#e0f7fa","#00e5ff","#0077b6","#023e8a","#03045e"] },
          { name: "Aurora",     colors: ["#00e5ff","#00e676","#ffee00","#ff4081","#aa00ff"] },
          { name: "Dusk",       colors: ["#fce4ec","#f48fb1","#ce93d8","#7986cb","#1a237e"] },
          { name: "Forest",     colors: ["#f9fbe7","#dce775","#43a047","#1b5e20","#0a1f0a"] },
          { name: "Mono",       colors: ["#f5f5f5","#bdbdbd","#757575","#424242","#111111"] },
        ];
        const lerpColor = (c1, c2, t) => {
          const p = (s, i) => parseInt(s.slice(i,i+2),16);
          const r = Math.round(p(c1,1)+(p(c2,1)-p(c1,1))*t).toString(16).padStart(2,'0');
          const g = Math.round(p(c1,3)+(p(c2,3)-p(c1,3))*t).toString(16).padStart(2,'0');
          const b = Math.round(p(c1,5)+(p(c2,5)-p(c1,5))*t).toString(16).padStart(2,'0');
          return `#${r}${g}${b}`;
        };
        const applyPreset = (preset) => {
          if (schemeGrades.length === 0) return;
          const n = schemeGrades.length;
          setSchemeGrades(schemeGrades.map((g, i) => {
            const t = n === 1 ? 0 : i / (n-1);
            const cols = preset.colors;
            const seg = (cols.length-1)*t;
            const idx = Math.min(Math.floor(seg), cols.length-2);
            return { ...g, color: lerpColor(cols[idx], cols[idx+1], seg-idx) };
          }));
        };
        const addGrade = () => {
          if (!schemeNewGrade.trim()) return;
          setSchemeGrades(prev => [...prev, { id: `g${Date.now()}`, label: schemeNewGrade.trim(), color: "#888888" }]);
          setSchemeNewGrade("");
        };
        const deleteGrade = (id) => setSchemeGrades(prev => prev.filter(g => g.id !== id));
        const changeColor = (id, color) => { setSchemeGrades(prev => prev.map(g => g.id === id ? { ...g, color } : g)); setSchemeColorPicking(null); };
        const moveGrade = (idx, dir) => {
          const newArr = [...schemeGrades];
          const target = idx + dir;
          if (target < 0 || target >= newArr.length) return;
          [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
          setSchemeGrades(newArr);
        };
        const saveScheme = () => {
          if (!schemeName.trim() || schemeGrades.length === 0) return;
          const scheme = {
            id: schemeEditId || `cgs_${Date.now()}`,
            name: schemeName.trim(),
            applicableTo: ["boulder","rope"],
            grades: schemeGrades,
          };
          setCustomGradingSchemes(prev => schemeEditId ? prev.map(s => s.id === schemeEditId ? scheme : s) : [...prev, scheme]);
          if (schemeBuilderFor === "boulder") setGymCreateBoulderScale(scheme.name);
          if (schemeBuilderFor === "rope") setGymCreateRopeScale(scheme.name);
          if (schemeBuilderFor === "gym-boulder" && selectedGym) setGymScales(prev => ({ ...prev, [selectedGym]: { ...(prev[selectedGym] || {}), boulder: scheme.name } }));
          if (schemeBuilderFor === "gym-rope" && selectedGym) setGymScales(prev => ({ ...prev, [selectedGym]: { ...(prev[selectedGym] || {}), rope: scheme.name } }));
          setShowSchemeBuilder(false);
          setSchemeEditId(null); setSchemeName(""); setSchemeGrades([]); setSchemeBuilderFor(null);
        };
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }} onClick={e => { if (e.target === e.currentTarget) setSchemeColorPicking(null); }}>
            <div style={{ background: W.bg, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", paddingTop: "calc(16px + env(safe-area-inset-top))" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px 16px", borderBottom: `1px solid ${W.border}`, flexShrink: 0 }}>
                <button onClick={() => { setShowSchemeBuilder(false); setSchemeEditId(null); setSchemeName(""); setSchemeGrades([]); setSchemeBuilderFor(null); }} style={{ background: "none", border: "none", fontSize: 22, color: W.textMuted, cursor: "pointer", padding: 0 }}>←</button>
                <div style={{ fontWeight: 800, fontSize: 17, color: W.text }}>{schemeEditId ? "Edit Grading Scheme" : "New Grading Scheme"}</div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
                {/* Name */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Scheme Name</div>
                  <input value={schemeName} onChange={e => setSchemeName(e.target.value)} placeholder="e.g. My Gym Grades" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 15, fontFamily: "inherit" }} />
                </div>
                {/* Add grade */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Grade Levels <span style={{ color: W.textDim, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(easiest → hardest)</span></div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input value={schemeNewGrade} onChange={e => setSchemeNewGrade(e.target.value)} onKeyDown={e => e.key === "Enter" && addGrade()} placeholder="e.g. Yellow, V1, Easy…" style={{ flex: 1, padding: "9px 12px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit" }} />
                    <button onClick={addGrade} style={{ padding: "9px 16px", background: W.accent, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add</button>
                  </div>
                  {/* Grade list */}
                  {schemeGrades.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: W.textDim, fontSize: 13 }}>No grades yet. Add some above.</div>
                  ) : (
                    <div>
                      {schemeGrades.map((g, idx) => (
                        <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 10, marginBottom: 6, position: "relative" }}>
                          {/* Up/down reorder */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <button onClick={() => moveGrade(idx, -1)} disabled={idx === 0} style={{ background: "none", border: "none", color: idx === 0 ? W.border : W.textMuted, fontSize: 10, cursor: idx === 0 ? "default" : "pointer", padding: "1px 4px", lineHeight: 1 }}>▲</button>
                            <button onClick={() => moveGrade(idx, 1)} disabled={idx === schemeGrades.length-1} style={{ background: "none", border: "none", color: idx === schemeGrades.length-1 ? W.border : W.textMuted, fontSize: 10, cursor: idx === schemeGrades.length-1 ? "default" : "pointer", padding: "1px 4px", lineHeight: 1 }}>▼</button>
                          </div>
                          {/* Color dot + picker */}
                          <div style={{ position: "relative" }}>
                            <div onClick={() => setSchemeColorPicking(schemeColorPicking === g.id ? null : g.id)} style={{ width: 26, height: 26, borderRadius: "50%", background: g.color || "#888", border: `2px solid ${W.border}`, cursor: "pointer", flexShrink: 0 }} />
                            {schemeColorPicking === g.id && (
                              <div style={{ position: "absolute", left: 0, top: 32, zIndex: 10, background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, padding: "10px", display: "flex", flexWrap: "wrap", gap: 6, width: 200 }}>
                                {SCHEME_COLORS.map(c => (
                                  <div key={c} onClick={() => changeColor(g.id, c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: `2px solid ${g.color === c ? W.accent : W.border}`, cursor: "pointer" }} />
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Label */}
                          <div style={{ flex: 1, color: W.text, fontSize: 14, fontWeight: 600 }}>{g.label}</div>
                          {/* Delete */}
                          <button onClick={() => deleteGrade(g.id)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Color presets */}
                {schemeGrades.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Color Presets</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {PRESETS.map(p => (
                        <button key={p.name} onClick={() => applyPreset(p)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: W.surface, border: `1px solid ${W.border}`, borderRadius: 12, cursor: "pointer", width: "100%", textAlign: "left" }}>
                          <div style={{ display: "flex", gap: 3 }}>{p.colors.map((c, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: c }} />)}</div>
                          <span style={{ color: W.text, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Save */}
                <button onClick={saveScheme} disabled={!schemeName.trim() || schemeGrades.length === 0} style={{ width: "100%", padding: "16px", background: schemeName.trim() && schemeGrades.length > 0 ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.surface2, border: "none", borderRadius: 16, color: schemeName.trim() && schemeGrades.length > 0 ? "#fff" : W.textDim, fontSize: 16, fontWeight: 800, cursor: schemeName.trim() && schemeGrades.length > 0 ? "pointer" : "default" }}>Save Scheme</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Gym Create Modal */}
      {showGymCreate && (() => {
        const activities = [
          { id: "boulder", label: "Bouldering", icon: "🪨" },
          { id: "rope",    label: "Rope Climbing", icon: "🧗" },
          { id: "speed",   label: "Speed Climbing", icon: "⚡" },
          { id: "workout", label: "Working Out", icon: "🏋️" },
        ];
        const toggleActivity = (id) => setGymCreateActivities(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        const canNext = gymCreateName.trim().length > 0 && gymCreateActivities.length > 0;
        const hasBoulder = gymCreateActivities.includes("boulder");
        const hasRope = gymCreateActivities.includes("rope");
        const allBoulderScales = getAllBoulderScaleNames();
        const allRopeScales = getAllRopeScaleNames();
        const saveGym = () => {
          const name = gymCreateName.trim();
          if (!name) return;
          const newGym = {
            id: gymCreateId || `gym_${Date.now()}`,
            name,
            activities: gymCreateActivities,
            boulderScale: gymCreateBoulderScale,
            ropeScale: gymCreateRopeScale,
          };
          setGyms(prev => gymCreateId ? prev.map(g => g.id === gymCreateId ? newGym : g) : [...prev, newGym]);
          addCustomLocation(name);
          setGymScales(prev => ({ ...prev, [name]: { ...prev[name], boulder: gymCreateBoulderScale, rope: gymCreateRopeScale } }));
          setShowGymCreate(false);
        };
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }}>
            <div style={{ background: W.bg, flex: 1, display: "flex", flexDirection: "column", paddingTop: "calc(16px + env(safe-area-inset-top))" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px 16px", borderBottom: `1px solid ${W.border}` }}>
                <button onClick={() => gymCreateStep > 1 ? setGymCreateStep(gymCreateStep-1) : setShowGymCreate(false)} style={{ background: "none", border: "none", fontSize: 22, color: W.textMuted, cursor: "pointer", padding: 0 }}>←</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 17, color: W.text }}>{gymCreateStep === 1 ? "New Gym" : "Grading Schemes"}</div>
                  <div style={{ fontSize: 11, color: W.textMuted }}>Step {gymCreateStep} of 2</div>
                </div>
                {/* Step indicators */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[1,2].map(s => <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: s <= gymCreateStep ? W.accent : W.border }} />)}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", paddingBottom: "calc(80px + env(safe-area-inset-bottom))" }}>
                {gymCreateStep === 1 && (
                  <>
                    {/* Name */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Gym Name</div>
                      <input autoFocus value={gymCreateName} onChange={e => setGymCreateName(e.target.value)} placeholder="e.g. The Crux Gym" style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 14, color: W.text, fontSize: 16, fontFamily: "inherit" }} />
                    </div>
                    {/* Activities */}
                    <div style={{ marginBottom: 32 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>What Can You Do Here?</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {activities.map(a => {
                          const sel = gymCreateActivities.includes(a.id);
                          return (
                            <button key={a.id} onClick={() => toggleActivity(a.id)} style={{ padding: "16px 12px", background: sel ? W.accent+"22" : W.surface, border: `2px solid ${sel ? W.accent : W.border}`, borderRadius: 14, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 28 }}>{a.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: sel ? W.accent : W.text }}>{a.label}</span>
                              {sel && <span style={{ fontSize: 14, color: W.accent }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button onClick={() => canNext && setGymCreateStep(2)} disabled={!canNext} style={{ width: "100%", padding: "16px", background: canNext ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.surface2, border: "none", borderRadius: 16, color: canNext ? "#fff" : W.textDim, fontSize: 16, fontWeight: 800, cursor: canNext ? "pointer" : "default" }}>Next →</button>
                  </>
                )}
                {gymCreateStep === 2 && (
                  <>
                    {(() => {
                      const scalePreview = (scaleName, type) => {
                        const builtIn = type === "boulder" ? GRADES[scaleName] : ROPE_GRADES[scaleName];
                        if (builtIn) return builtIn.map(label => ({ label, color: null }));
                        const custom = customGradingSchemes.find(s => s.name === scaleName);
                        return custom ? custom.grades.map(g => ({ label: g.label, color: g.color })) : [];
                      };
                      const GradePreview = ({ scaleName, type }) => {
                        const levels = scalePreview(scaleName, type);
                        if (!levels.length) return null;
                        return (
                          <div style={{ marginTop: 10, marginBottom: 8, padding: "10px 12px", background: W.surface2, borderRadius: 10, border: `1px solid ${W.border}` }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Grades ({levels.length})</div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {levels.map((g, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 8, padding: "3px 8px" }}>
                                  {g.color && <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color, flexShrink: 0 }} />}
                                  <span style={{ fontSize: 11, color: W.text, fontWeight: 600 }}>{g.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      };
                      return (
                        <>
                          {hasBoulder && (
                            <div style={{ marginBottom: 28 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: W.text, marginBottom: 4 }}>Boulder Grading</div>
                              <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12 }}>What grading system does this gym use for bouldering?</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                                {allBoulderScales.map(s => (
                                  <button key={s} onClick={() => setGymCreateBoulderScale(s)} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${gymCreateBoulderScale === s ? W.accent : W.border}`, background: gymCreateBoulderScale === s ? W.accent+"22" : W.surface2, color: gymCreateBoulderScale === s ? W.accent : W.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{s}</button>
                                ))}
                              </div>
                              <GradePreview scaleName={gymCreateBoulderScale} type="boulder" />
                              <button onClick={() => { setSchemeBuilderFor("boulder"); setSchemeName(""); setSchemeGrades([]); setSchemeEditId(null); setShowSchemeBuilder(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                <span style={{ fontSize: 16 }}>+</span> Create Custom Scheme
                              </button>
                            </div>
                          )}
                          {hasRope && (
                            <div style={{ marginBottom: 28 }}>
                              <div style={{ fontSize: 14, fontWeight: 800, color: W.text, marginBottom: 4 }}>Rope Grading</div>
                              <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12 }}>What grading system does this gym use for rope climbing?</div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                                {allRopeScales.map(s => (
                                  <button key={s} onClick={() => setGymCreateRopeScale(s)} style={{ padding: "7px 14px", borderRadius: 20, border: `2px solid ${gymCreateRopeScale === s ? W.accent : W.border}`, background: gymCreateRopeScale === s ? W.accent+"22" : W.surface2, color: gymCreateRopeScale === s ? W.accent : W.textDim, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{s}</button>
                                ))}
                              </div>
                              <GradePreview scaleName={gymCreateRopeScale} type="rope" />
                              <button onClick={() => { setSchemeBuilderFor("rope"); setSchemeName(""); setSchemeGrades([]); setSchemeEditId(null); setShowSchemeBuilder(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                                <span style={{ fontSize: 16 }}>+</span> Create Custom Scheme
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {!hasBoulder && !hasRope && (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: W.textMuted, fontSize: 13 }}>No grading schemes needed for the selected activities.</div>
                    )}
                    <button onClick={saveGym} style={{ width: "100%", padding: "16px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 16, color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer" }}>Add Gym</button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Abandoned session recovery popup */}
      {abandonedSession && (() => {
        const { session, idledAt } = abandonedSession;
        const hoursAgo = Math.round((Date.now() - (idledAt || 0)) / (1000 * 60 * 60) * 10) / 10;
        const sends = (session.climbs || []).filter(c => c.completed && c.climbType !== "speed-session").length;
        const total = (session.climbs || []).filter(c => c.climbType !== "speed-session").length;
        const keepSession = () => { setSessions(prev => [session, ...prev]); setAbandonedSession(null); localStorage.removeItem("abandoned:session"); };
        const dismissSession = () => { setAbandonedSession(null); localStorage.removeItem("abandoned:session"); };
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <div style={{ background: W.surface, borderRadius: 20, padding: "24px", width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>💾</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: W.text, marginBottom: 6 }}>Unsaved Session Found</div>
              <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 4 }}>A session was auto-saved because the app was inactive for {hoursAgo}h.</div>
              <div style={{ background: W.surface2, borderRadius: 12, padding: "12px 14px", marginBottom: 18, border: `1px solid ${W.border}` }}>
                <div style={{ fontWeight: 700, color: W.text, fontSize: 14, marginBottom: 2 }}>📍 {session.location}</div>
                <div style={{ fontSize: 12, color: W.textMuted }}>⏱ {formatDuration(session.duration)} · {sends}/{total} sends · {total} climbs</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={keepSession} style={{ padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Save to Logbook</button>
                <button onClick={dismissSession} style={{ padding: "12px", background: "transparent", border: `2px solid ${W.redDark}55`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Discard Session</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Session summary leave warning */}
      {showSummaryLeaveWarn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: W.surface, borderRadius: 20, padding: "24px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: W.text, marginBottom: 8 }}>Leave without saving?</div>
            <div style={{ fontSize: 13, color: W.textMuted, marginBottom: 20 }}>Your session is saved. Tap "Save &amp; Exit" to keep it, or "Discard" to delete it permanently.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => { setSessionSummary(null); setScreen("home"); setShowSummaryLeaveWarn(false); }} style={{ padding: "13px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Save &amp; Exit</button>
              <button onClick={() => { discardSession(); setShowSummaryLeaveWarn(false); }} style={{ padding: "13px", background: "transparent", border: `2px solid ${W.redDark}55`, borderRadius: 12, color: W.redDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Discard Session</button>
              <button onClick={() => setShowSummaryLeaveWarn(false)} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Stay</button>
            </div>
          </div>
        </div>
      )}

      {/* Notification panel */}
      {showNotifPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowNotifPanel(false)}>
          <div style={{ width: "100%", maxWidth: 420, background: W.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 0", paddingBottom: "calc(20px + env(safe-area-inset-bottom))", maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
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
                        : n.type === "climbShare"
                        ? <div>
                            <div style={{ fontSize: 13, color: W.text }}><span style={{ fontWeight: 700 }}>{n.fromDisplay}</span> sent you {n.climbs?.length === 1 ? "a climb" : `${n.climbs?.length} climbs`} 📤</div>
                            <button onClick={() => { setPendingSharedClimbs(n); setSharedClimbGym(""); setSharedClimbSections({}); setShowNotifPanel(false); setScreen("social"); setSocialTab("notifications"); }} style={{ marginTop: 6, padding: "5px 12px", background: W.accent + "22", border: `1px solid ${W.accent}`, borderRadius: 8, color: W.accent, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>View & Add to Gym</button>
                          </div>
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

      {/* Receive Shared Climbs modal */}
      {pendingSharedClimbs && (() => {
        const climbs = pendingSharedClimbs.climbs || [];
        const gymOptions = [...gyms.map(g => g.name), ...customLocations.filter(l => !gyms.find(g => g.name === l))];
        const selectedGymObj = gymScales[sharedClimbGym] || {};
        const gymSectionOptions = ["Unknown", ...(selectedGymObj.wallSections || [])];
        const handleAddToGym = () => {
          if (!sharedClimbGym) return;
          const now = Date.now();
          const newEntries = climbs.map((c, i) => ({
            id: now + i,
            name: c.name,
            grade: c.grade,
            scale: c.scale,
            color: c.color,
            wallTypes: c.wallTypes || [],
            holdTypes: c.holdTypes || [],
            climbType: c.climbType || "boulder",
            photo: c.photo || null,
            section: sharedClimbSections[c.id] === "Unknown" ? "" : (sharedClimbSections[c.id] || ""),
            location: sharedClimbGym,
            setDate: new Date().toISOString(),
            removed: false,
            isProject: false,
            receivedFrom: pendingSharedClimbs.fromDisplay,
            receivedFromUser: pendingSharedClimbs.from,
          }));
          setGymSets(prev => ({ ...prev, [sharedClimbGym]: [...(prev[sharedClimbGym] || []), ...newEntries] }));
          const updated = notifications.map(n => n.id === pendingSharedClimbs.id ? { ...n, read: true, handled: true } : n);
          setNotifications(updated);
          storage.set(`notifications:${currentUser.username}`, JSON.stringify(updated)).catch(() => {});
          setPendingSharedClimbs(null);
        };
        return (
          <div onClick={() => setPendingSharedClimbs(null)} style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)" }}>
              {/* Header */}
              <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${W.border}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 17, color: W.text }}>Climbs from {pendingSharedClimbs.fromDisplay}</div>
                  <button onClick={() => setPendingSharedClimbs(null)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
                </div>
                <div style={{ fontSize: 12, color: W.textMuted, marginTop: 3 }}>{climbs.length} climb{climbs.length !== 1 ? "s" : ""} shared with you</div>
              </div>
              {/* Scroll area */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
                {/* Gym picker */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Add to Gym</div>
                  <select value={sharedClimbGym} onChange={e => { setSharedClimbGym(e.target.value); setSharedClimbSections({}); }} style={{ width: "100%", padding: "10px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 14, fontFamily: "inherit", appearance: "auto" }}>
                    <option value="">— Select a gym —</option>
                    {gymOptions.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {/* Batch section selector */}
                {sharedClimbGym && climbs.length > 1 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 5, fontWeight: 600 }}>Quick-assign all to same section:</div>
                    <select value="" onChange={e => { if (e.target.value) { const all = {}; climbs.forEach(c => { all[c.id] = e.target.value; }); setSharedClimbSections(all); }}} style={{ width: "100%", padding: "8px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", appearance: "auto" }}>
                      <option value="">— Set all climbs to… —</option>
                      {gymSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {/* Climbs list with section pickers */}
                {climbs.map(c => {
                  const gradeColor = getGradeColor(c.grade);
                  const colorEntry = CLIMB_COLORS.find(cc => cc.id === c.color);
                  return (
                    <div key={c.id} style={{ background: W.surface, borderRadius: 14, border: `1px solid ${W.border}`, overflow: "hidden", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                        {c.photo
                          ? <img src={c.photo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 44, borderRadius: 8, background: gradeColor + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontWeight: 900, fontSize: 13, color: gradeColor }}>{c.grade}</span>
                            </div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <div style={{ background: gradeColor, color: "#fff", borderRadius: 5, padding: "1px 7px", fontWeight: 900, fontSize: 12 }}>{c.grade}</div>
                            {colorEntry && <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorEntry.hex }} />}
                          </div>
                          {c.name && <div style={{ fontSize: 13, fontWeight: 700, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>}
                          {c.section && <div style={{ fontSize: 11, color: W.textMuted }}>Was in: {c.section}</div>}
                        </div>
                      </div>
                      {sharedClimbGym && (
                        <div style={{ borderTop: `1px solid ${W.border}`, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: W.textMuted, flexShrink: 0 }}>Section:</span>
                          <select value={sharedClimbSections[c.id] || ""} onChange={e => setSharedClimbSections(prev => ({ ...prev, [c.id]: e.target.value }))} style={{ flex: 1, padding: "5px 8px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 8, color: W.text, fontSize: 12, fontFamily: "inherit", appearance: "auto" }}>
                            <option value="">— Choose section —</option>
                            {gymSectionOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Add button */}
              <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${W.border}`, flexShrink: 0 }}>
                <button disabled={!sharedClimbGym} onClick={handleAddToGym} style={{ width: "100%", padding: "13px", background: sharedClimbGym ? W.accent : W.surface2, border: "none", borderRadius: 14, color: sharedClimbGym ? "#fff" : W.textDim, fontWeight: 700, fontSize: 15, cursor: sharedClimbGym ? "pointer" : "default" }}>
                  Add {climbs.length} Climb{climbs.length !== 1 ? "s" : ""} to {sharedClimbGym || "Gym"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
          <div style={{ width: "100%", maxWidth: 420, background: W.surface, borderRadius: "20px 20px 0 0", padding: "20px 20px 0", paddingBottom: "calc(20px + env(safe-area-inset-bottom))", maxHeight: "60vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
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
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 56px" }}>
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

      {screen !== "sessionSummary" && <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: W.navBg, borderTop: `1px solid ${W.border}`, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 12px 0", paddingBottom: "calc(8px + env(safe-area-inset-bottom))", zIndex: 10 }}>
        {navItems.map(item => {
          const isActive = screen === item.id || (item.id === "session" && (screen === "session" || screen === "sessionSummary"));
          return (
            <button key={item.id} onClick={item.action || (() => setScreen(item.id))} style={{ background: isActive ? W.accent + "18" : "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, cursor: "pointer", padding: "4px 18px", borderRadius: 12, position: "relative" }}>
              <span style={{ fontSize: 18, color: isActive ? W.accent : W.textDim, lineHeight: 1.2 }}>{item.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? W.accent : W.textDim, letterSpacing: 0.3 }}>{item.text}</span>
              {item.id === "session" && timerRunning && <div style={{ position: "absolute", top: 3, right: 12, width: 5, height: 5, borderRadius: "50%", background: W.accent }} />}
            </button>
          );
        })}
      </div>}
    </div>
    </div>

    {/* Quick-add popup: Projects / Current Set — multi-select */}
    {boulderQuickPanel && (() => {
      const isRopeCtx = boulderQuickPanel === "rope-projects" || boulderQuickPanel === "rope-set";
      const isProjects = boulderQuickPanel === "projects" || boulderQuickPanel === "rope-projects";
      const climbTypeForAdd = isRopeCtx ? "rope" : "boulder";
      const location = activeSession?.location;
      const rawList = isProjects
        ? activeProjects.filter(p => isRopeCtx ? p.climbType === "rope" : (!p.climbType || p.climbType === "boulder"))
        : (location ? (gymSets[location] || []).filter(c => !c.removed && (isRopeCtx ? c.climbType === "rope" : c.climbType !== "rope")) : []);
      const sorted = [...rawList].sort((a, b) => getGradeIndex(b.grade, b.scale) - getGradeIndex(a.grade, a.scale));
      const title = isProjects ? (isRopeCtx ? "Rope Projects" : "Boulder Projects") : `Current Set · ${location || "No gym"}`;
      const accentColor = isProjects ? W.pinkDark : W.accent;
      const accentBg = isProjects ? W.pink : W.accent + "22";
      const activeClimbs = activeSession?.climbs || [];
      const inSession = (item) => isProjects
        ? activeClimbs.some(c => c.projectId === item.id)
        : activeClimbs.some(c => c.setClimbId === item.id);
      const selCount = quickPanelSelected.length;
      const close = () => { setBoulderQuickPanel(null); setQuickPanelSelected([]); };
      const toggleSel = (id, alreadyIn) => { if (alreadyIn) return; setQuickPanelSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
      const addSelected = () => {
        const items = sorted.filter(item => quickPanelSelected.includes(item.id));
        const base = Date.now();
        // Build all climbs with guaranteed unique IDs, then add in one state update
        const newClimbs = items.map((item, idx) => {
          const pid = isProjects ? item.id : null;
          return {
            name: item.name || "", grade: item.grade, scale: item.scale || preferredScale,
            color: item.color || null, wallTypes: item.wallTypes || [], holdTypes: item.holdTypes || [],
            climbType: climbTypeForAdd, ropeStyle: "lead",
            isProject: isProjects, projectId: pid,
            photo: null, comments: "", id: base + idx, loggedAt: base + idx, tries: 0, completed: false,
            ...(isProjects ? {} : { setClimbId: item.id }),
          };
        });
        setActiveSession(s => {
          const now = base;
          const typeUpdates = {};
          if (!s.boulderStartedAt && newClimbs.some(c => c.climbType === "boulder")) { typeUpdates.boulderStartedAt = now; typeUpdates.boulderTotalSec = 0; }
          if (!s.ropeStartedAt && newClimbs.some(c => c.climbType === "rope")) { typeUpdates.ropeStartedAt = now; typeUpdates.ropeTotalSec = 0; }
          return { ...s, ...typeUpdates, climbs: [...(s.climbs || []), ...newClimbs] };
        });
        if (!activeSession?.warmupStartedAt && sessionActiveStart && Date.now() - sessionActiveStart < 120000) setShowWarmupNudge(true);
        setBoulderQuickPanel(null);
        setQuickPanelSelected([]);
        setShowClimbForm(false);
        setClimbForm(blankForm);
      };
      return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 400, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={close}>
          <div style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "75vh", display: "flex", flexDirection: "column", border: `1px solid ${W.border}` }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "18px 20px 12px", borderBottom: `1px solid ${W.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: W.text }}>{title}</div>
              <button onClick={close} style={{ background: "none", border: "none", fontSize: 20, color: W.textMuted, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, padding: "8px 16px 4px" }}>
              {sorted.length === 0 ? (
                <div style={{ color: W.textDim, fontSize: 13, padding: "20px 0", textAlign: "center" }}>
                  {isProjects ? "No active boulder projects yet." : !location ? "No gym selected for this session." : `No climbs currently set at ${location}.`}
                </div>
              ) : sorted.map(item => {
                const gc = getGradeColor(item.grade);
                const sel = quickPanelSelected.includes(item.id);
                const alreadyIn = inSession(item);
                return (
                  <div key={item.id} onClick={() => toggleSel(item.id, alreadyIn)} style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${W.border}`, cursor: alreadyIn ? "default" : "pointer", background: alreadyIn ? W.surface2 : sel ? accentBg : "transparent", margin: "0 -16px", padding: "12px 16px", opacity: alreadyIn ? 0.55 : 1 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, border: `2px solid ${alreadyIn ? W.border : sel ? accentColor : W.border}`, background: alreadyIn ? W.border : sel ? accentColor : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {alreadyIn ? <span style={{ fontSize: 11, fontWeight: 900, color: W.textMuted }}>–</span> : sel && <span style={{ color: "#fff", fontSize: 14, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, background: gc + "30", color: gc, border: `1.5px solid ${gc}60`, flexShrink: 0 }}>{item.grade}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {!isProjects && item.color && <ColorDot colorId={item.color} size={10} />}
                        <span style={{ fontWeight: 700, color: W.text, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name || item.grade}</span>
                      </div>
                      <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{item.grade} · {item.scale}</div>
                    </div>
                    {alreadyIn && <span style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, background: W.surface, border: `1px solid ${W.border}`, borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>In Session</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "12px 16px 28px", borderTop: `1px solid ${W.border}`, flexShrink: 0 }}>
              <button onClick={selCount > 0 ? addSelected : undefined} disabled={selCount === 0} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: selCount > 0 ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` : W.surface2, color: selCount > 0 ? "#fff" : W.textDim, fontWeight: 800, fontSize: 15, cursor: selCount > 0 ? "pointer" : "default" }}>
                {selCount === 0 ? "Select climbs above" : `Add ${selCount} Climb${selCount !== 1 ? "s" : ""} to Session`}
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {/* Duplicate climb name prompt */}
    {pendingDupeClimb && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: W.bg, borderRadius: 20, padding: "24px 20px", width: "100%", maxWidth: 360, border: `1px solid ${W.border}` }}>
          <div style={{ fontSize: 22, textAlign: "center", marginBottom: 8 }}>⚠️</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: W.text, textAlign: "center", marginBottom: 8 }}>This looks like a duplicate</div>
          <div style={{ fontSize: 13, color: W.textMuted, textAlign: "center", marginBottom: 20 }}>A climb with the same grade, color, and name already exists in the current set or your projects. Give this one a unique name to tell them apart.</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Climb Name</div>
          <input autoFocus value={dupeNewName} onChange={e => setDupeNewName(e.target.value)} placeholder="e.g. Left Wall Crimp Problem" style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 14, boxSizing: "border-box", marginBottom: 16, fontFamily: "inherit" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => { setPendingDupeClimb(null); }} style={{ padding: "11px", borderRadius: 12, border: `1px solid ${W.border}`, background: "transparent", color: W.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => {
              const { form, photo } = pendingDupeClimb;
              setClimbForm(f => ({ ...f, ...form, name: dupeNewName }));
              setPhotoPreview(photo);
              setPendingDupeClimb(null);
              // Re-trigger save on next tick with updated name in form — set a flag instead
              // Directly save with the renamed form:
              const pid = form.isProject ? (form.projectId || Date.now() + 1) : null;
              const location = activeSession?.location;
              let setClimbId = null;
              if (location && (form.climbType === "boulder" || form.climbType === "rope")) {
                setClimbId = Date.now() + 2;
                const newSetClimb = { id: setClimbId, name: dupeNewName, grade: form.grade, scale: form.scale, color: form.color, wallTypes: form.wallTypes, holdTypes: form.holdTypes, setDate: new Date().toISOString(), location, removed: false, removedDate: null };
                setGymSets(prev => ({ ...prev, [location]: [...(prev[location] || []), newSetClimb] }));
              }
              const newClimb = { ...form, name: dupeNewName, photo, projectId: pid, id: Date.now(), loggedAt: Date.now(), tries: 0, completed: false, ...(setClimbId ? { setClimbId } : {}) };
              setActiveSession(s => { const now = Date.now(); const typeUpdates = {}; if (newClimb.climbType === "boulder" && !s.boulderStartedAt) { typeUpdates.boulderStartedAt = now; typeUpdates.boulderTotalSec = 0; } return { ...s, ...typeUpdates, climbs: [...(s.climbs || []), newClimb] }; });
              setShowClimbForm(false); setPhotoPreview(null); setEditingClimbId(null); setClimbForm(blankForm);
            }} disabled={!dupeNewName.trim()} style={{ padding: "11px", borderRadius: 12, border: "none", background: dupeNewName.trim() ? `linear-gradient(135deg, ${W.accent}, ${W.accentDark})` : W.surface2, color: dupeNewName.trim() ? "#fff" : W.textDim, fontWeight: 700, fontSize: 13, cursor: dupeNewName.trim() ? "pointer" : "default" }}>Save with New Name</button>
          </div>
        </div>
      </div>
    )}

    {/* Logbook Climb Detail Page */}
    {selectedLogbookClimb && (() => {
      const climb = selectedLogbookClimb;
      // Find all sessions containing this climb (by id, projectId, setClimbId, or name+grade)
      const relatedEntries = sessions.flatMap(s =>
        (s.climbs || [])
          .filter(c =>
            c.id === climb.id ||
            (climb.projectId && c.projectId === climb.projectId) ||
            (climb.setClimbId && c.setClimbId === climb.setClimbId) ||
            (climb.name && climb.name.trim() && c.name === climb.name && c.grade === climb.grade && c.climbType === (climb.climbType || "boulder"))
          )
          .map(c => ({ climb: c, session: s }))
      ).sort((a, b) => new Date(b.session.date) - new Date(a.session.date));
      const totalAttempts = relatedEntries.reduce((t, { climb: c }) => t + climbAttempts(c), 0);
      const totalSends    = relatedEntries.filter(({ climb: c }) => c.completed).length;
      const totalTimeMs   = relatedEntries.reduce((t, { climb: c }) => t + (c.attemptLog || []).reduce((s, a) => s + (a.duration || 0), 0), 0);
      const totalTimeSec  = Math.floor(totalTimeMs / 1000);
      const gradeColor    = getGradeColor(climb.grade);
      const setClimbEntry = climb.setClimbId
        ? Object.values(gymSets).flat().find(e => e.id === climb.setClimbId)
        : climb._sessionId === null
          ? Object.values(gymSets).flat().find(e => e.id === climb.id)
          : null;
      const isOffWall     = setClimbEntry?.removed || false;
      const colorEntry    = CLIMB_COLORS.find(cc => cc.id === climb.color);
      return (
        <div
          onTouchStart={e => { e.currentTarget._swipeY = e.touches[0].clientY; e.currentTarget._swipeScrollTop = e.currentTarget.scrollTop; }}
          onTouchMove={e => {
            const dy = e.touches[0].clientY - (e.currentTarget._swipeY || 0);
            if (dy > 0 && (e.currentTarget._swipeScrollTop || 0) === 0) {
              e.currentTarget.style.transform = `translateY(${Math.min(dy * 0.45, 110)}px)`;
              e.currentTarget.style.opacity = `${Math.max(0.55, 1 - dy / 320)}`;
            }
          }}
          onTouchEnd={e => {
            const dy = e.changedTouches[0].clientY - (e.currentTarget._swipeY || 0);
            if (dy > 100 && (e.currentTarget._swipeScrollTop || 0) === 0) {
              setSelectedLogbookClimb(null); setShowClimbShare(false);
            } else {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.opacity = "";
            }
          }}
          style={{ position: "fixed", inset: 0, zIndex: 450, background: W.bg, overflowY: "auto", display: "flex", flexDirection: "column", transition: "transform 0.05s, opacity 0.05s" }}>
          {/* Header bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 12px", paddingTop: "calc(16px + env(safe-area-inset-top))", background: W.surface, borderBottom: `1px solid ${W.border}`, position: "sticky", top: 0, zIndex: 2 }}>
            <button onClick={() => { if (logbookClimbEditOpen && logbookEditOriginal && JSON.stringify(climbForm) !== logbookEditOriginal) { setShowUnsavedPrompt(true); } else { setSelectedLogbookClimb(null); setShowClimbShare(false); setLogbookClimbEditOpen(false); setLogbookEditOriginal(null); } }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "7px 14px", color: W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Back</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.name || climb.grade}</div>
              <div style={{ fontSize: 12, color: W.textMuted }}>{climb.grade}{climb.climbType === "rope" ? " · Rope" : ""}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, background: gradeColor + "30", color: gradeColor, border: `1.5px solid ${gradeColor}60`, flexShrink: 0 }}>{climb.grade}</div>
            <button onClick={() => { const ownerSession = sessions.find(s => (s.climbs || []).some(c => c.id === climb.id)); const form = { name: climb.name || "", grade: climb.grade, scale: climb.scale || preferredScale, tries: climb.tries ?? 0, completed: climb.completed ?? false, isProject: climb.isProject ?? false, comments: climb.comments || "", photo: climb.photo, projectId: climb.projectId || null, color: climb.color || null, wallTypes: climb.wallTypes || [], holdTypes: climb.holdTypes || [], climbType: climb.climbType || "boulder", ropeStyle: climb.ropeStyle || "lead", speedTime: "", setClimbId: climb.setClimbId || null, section: climb.section || null }; setClimbForm(form); setLogbookEditOriginal(JSON.stringify(form)); setPhotoPreview(climb.photo || null); setEditingClimbId(climb.id); setEditingSessionId(ownerSession?.id || null); setEditingGymSetClimb(!!setClimbEntry); setLogbookClimbEditOpen(true); }} style={{ background: logbookClimbEditOpen ? W.accent + "22" : W.surface2, border: `1px solid ${logbookClimbEditOpen ? W.accent : W.border}`, borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", flexShrink: 0 }} title="Edit">✏️</button>
            <button onClick={() => setShowClimbShare(true)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", flexShrink: 0 }} title="Share">⬆</button>
          </div>
          {showUnsavedPrompt && (
            <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: W.surface, borderRadius: 20, padding: "24px 20px", width: "100%", maxWidth: 340, border: `1px solid ${W.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: W.text, marginBottom: 6 }}>Unsaved changes</div>
                <div style={{ fontSize: 14, color: W.textMuted, marginBottom: 20 }}>You have unsaved edits. Do you want to save before going back?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => { setShowUnsavedPrompt(false); setLogbookClimbEditOpen(false); setLogbookEditOriginal(null); setPhotoPreview(null); setEditingClimbId(null); setEditingSessionId(null); }} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Discard</button>
                  <button onClick={() => { saveClimbToFinishedSession(editingSessionId); setSelectedLogbookClimb(s => s ? { ...s, ...climbForm, photo: photoPreview } : s); setShowUnsavedPrompt(false); setLogbookClimbEditOpen(false); setLogbookEditOriginal(null); }} style={{ padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Save</button>
                </div>
              </div>
            </div>
          )}
          {logbookClimbEditOpen && (
            <div style={{ background: W.bg, borderBottom: `1px solid ${W.border}` }}>
              {ClimbFormPanel({ isActiveSession: false, onSave: () => { saveClimbToFinishedSession(editingSessionId); setSelectedLogbookClimb(s => s ? { ...s, ...climbForm, photo: photoPreview } : s); setLogbookClimbEditOpen(false); setLogbookEditOriginal(null); }, onCancel: () => { setLogbookClimbEditOpen(false); setPhotoPreview(null); setEditingClimbId(null); setEditingSessionId(null); setLogbookEditOriginal(null); } })}
            </div>
          )}
          <div style={{ padding: "20px", display: logbookClimbEditOpen ? "none" : undefined }}>
            {/* Photo */}
            {climb.photo && (() => {
              const colorHex   = colorEntry?.hex;
              const colorLabel = colorEntry?.label;
              return (
                <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: `1px solid ${W.border}`, position: "relative" }}>
                  <img src={climb.photo} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.60) 100%)", borderRadius: 16 }} />
                  {/* Fullscreen button — top right */}
                  <button onClick={() => setLightboxPhoto({ photos: [{ src: climb.photo, grade: climb.grade, name: climb.name, colorId: climb.color }], idx: 0 })} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8, color: "#fff", fontSize: 18, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>⤢</button>
                  {/* Grade + color overlay — bottom left */}
                  <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: gradeColor, color: "#fff", borderRadius: 10, padding: "5px 15px", fontWeight: 900, fontSize: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>{climb.grade}</div>
                    {colorHex && <div style={{ width: 26, height: 26, borderRadius: "50%", background: colorHex, border: "2.5px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 5px rgba(0,0,0,0.5)", flexShrink: 0 }} title={colorLabel} />}
                    {colorLabel && <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 700, fontSize: 14, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{colorLabel}</span>}
                  </div>
                </div>
              );
            })()}
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Total Attempts", value: totalAttempts },
                { label: "Total Sends", value: totalSends },
                { label: "Sessions", value: relatedEntries.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: W.text }}>{value}</div>
                  <div style={{ fontSize: 10, color: W.textMuted, fontWeight: 700, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </div>
            {/* Send rate bar for multi-session climbs */}
            {relatedEntries.length > 1 && (
              <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Send Rate</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: totalSends > 0 ? W.greenDark : W.textMuted }}>{totalSends}/{relatedEntries.length} sessions</div>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: W.surface2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((totalSends / relatedEntries.length) * 100)}%`, background: totalSends > 0 ? W.greenDark : W.border, borderRadius: 4, transition: "width 0.3s" }} />
                </div>
              </div>
            )}
            {totalTimeSec > 0 && (
              <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Time on Climb</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: W.text }}>{formatDuration(totalTimeSec)}</div>
              </div>
            )}
            {/* Project progress block */}
            {climb.isProject && climb.projectId && (() => {
              const proj = projects.find(p => p.id === climb.projectId);
              if (!proj) return null;
              const avgSendTries = (() => {
                const sent = completedProjects.filter(p => getProjectTotalTries(p.id) > 0);
                if (!sent.length) return null;
                return Math.round(sent.reduce((sum, p) => sum + getProjectTotalTries(p.id), 0) / sent.length);
              })();
              const daysSinceAdded = proj.dateAdded ? Math.floor((Date.now() - new Date(proj.dateAdded)) / 86400000) : null;
              const progressPct = avgSendTries && totalAttempts > 0 ? Math.min(100, Math.round(totalAttempts / avgSendTries * 100)) : null;
              return (
                <div style={{ background: W.pink, border: `1px solid ${W.pinkDark}30`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: W.pinkDark, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>🎯 Project Progress</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: avgSendTries ? 10 : 0 }}>
                    {daysSinceAdded !== null && <span style={{ fontSize: 12, color: W.pinkDark, fontWeight: 700 }}>{daysSinceAdded === 0 ? "Started today" : `${daysSinceAdded} day${daysSinceAdded !== 1 ? "s" : ""} working`}</span>}
                    <span style={{ fontSize: 12, color: W.pinkDark, fontWeight: 700 }}>{totalAttempts} total attempt{totalAttempts !== 1 ? "s" : ""}</span>
                    {proj.completed && <span style={{ background: W.greenDark, color: "#fff", borderRadius: 6, padding: "1px 8px", fontSize: 11, fontWeight: 800 }}>✓ Sent</span>}
                  </div>
                  {progressPct != null && !proj.completed && (
                    <>
                      <div style={{ height: 8, borderRadius: 4, background: "rgba(0,0,0,0.12)", overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: progressPct >= 80 ? W.redDark : W.pinkDark, borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                      <div style={{ fontSize: 10, color: W.pinkDark, fontWeight: 600 }}>{progressPct}% of avg send ({avgSendTries} tries)</div>
                    </>
                  )}
                </div>
              );
            })()}
            {/* Tags */}
            {((climb.wallTypes || []).length > 0 || (climb.holdTypes || []).length > 0) && (
              <div style={{ marginBottom: 20 }}><TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} /></div>
            )}
            {/* Notes from sessions */}
            {(() => {
              const withNotes = relatedEntries.filter(({ climb: c }) => c.comments);
              if (!withNotes.length) return null;
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Notes</div>
                  {withNotes.slice(0, 5).map(({ climb: c, session: s }, i) => (
                    <div key={`note-${s.id}-${i}`} style={{ background: W.surface, border: `1px solid ${W.border}`, borderLeft: `3px solid ${W.accentDark}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 700, marginBottom: 5 }}>{formatDate(s.date?.slice(0, 10))}</div>
                      <div style={{ fontSize: 13, color: W.text, fontStyle: "italic", lineHeight: 1.4 }}>"{c.comments}"</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Last 10 attempts graphic */}
            {relatedEntries.length > 0 && (() => {
              const last10 = relatedEntries.slice(0, 10).reverse();
              return (
                <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Last {last10.length} Session{last10.length !== 1 ? "s" : ""}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {last10.map(({ climb: c, session: s }, i) => (
                      <div key={`att-${s.id}-${i}`} style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, border: `1.5px solid ${c.completed ? W.greenDark + "80" : W.redDark + "80"}`, flexShrink: 0 }} title={formatDate(s.date?.slice(0, 10))}>
                        {c.completed ? "✓" : "✗"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Session history */}
            <div style={{ fontSize: 13, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Session History</div>
            {relatedEntries.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "20px 0" }}>No history found.</div>}
            {relatedEntries.map(({ climb: c, session: s }, i) => {
              const timeMs = (c.attemptLog || []).reduce((t, a) => t + (a.duration || 0), 0);
              const timeSec = Math.floor(timeMs / 1000);
              return (
                <div key={`${s.id}-${c.id}-${i}`} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{formatDate(s.date?.slice(0, 10))}</div>
                      <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>📍 {s.location}</div>
                    </div>
                    <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{c.completed ? "✓ Sent" : "Not Sent"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{c.tries || 0}</span> {c.climbType === "rope" ? "attempts" : "falls"}</div>
                    {c.climbType === "rope" && c.falls != null && <div style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{c.falls}</span> falls</div>}
                    {timeSec > 0 && <div style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{formatDuration(timeSec)}</span> on climb</div>}
                  </div>
                  {c.comments && <div style={{ fontSize: 12, color: W.textDim, marginTop: 6, fontStyle: "italic" }}>{c.comments}</div>}
                  {(c.attemptLog || []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {c.attemptLog.map((a, ai) => (
                        <span key={ai} style={{ fontSize: 10, color: W.textDim, background: W.surface2, borderRadius: 5, padding: "1px 6px", border: `1px solid ${W.border}` }}>#{ai + 1} {formatDuration(Math.floor(a.duration / 1000))}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Wall status toggle + delete — only for set climbs */}
            {setClimbEntry && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${W.border}` }}>
                <button
                  onClick={() => {
                    const loc = setClimbEntry.location;
                    setGymSets(prev => ({ ...prev, [loc]: (prev[loc] || []).map(e => e.id === setClimbEntry.id ? { ...e, removed: !e.removed, removedDate: !e.removed ? new Date().toISOString() : null } : e) }));
                  }}
                  style={{ width: "100%", padding: "13px", borderRadius: 14, border: `2px solid ${isOffWall ? W.border : "#f87171"}`, background: isOffWall ? W.surface2 : "#fca5a5", color: isOffWall ? W.textMuted : "#b91c1c", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 8 }}
                >
                  {isOffWall ? "↩ Mark as Back on Wall" : "🚫 Mark as No Longer on Wall"}
                </button>
                {!deleteSetConfirm
                  ? <button onClick={() => setDeleteSetConfirm(true)} style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #f87171", borderRadius: 14, color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: 0.8 }}>Delete from Gym Sets Permanently</button>
                  : <div style={{ background: "#fca5a5", borderRadius: 14, padding: "12px", border: "1px solid #f87171" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>Delete this gym set entry and all its history?</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button onClick={() => setDeleteSetConfirm(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                        <button onClick={() => { const loc = setClimbEntry.location; setGymSets(prev => ({ ...prev, [loc]: (prev[loc] || []).filter(e => e.id !== setClimbEntry.id) })); setDeleteSetConfirm(false); setSelectedLogbookClimb(null); }} style={{ padding: "9px", background: "#b91c1c", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Delete Forever</button>
                      </div>
                    </div>
                }
              </div>
            )}
            {/* Similar climbs */}
            {(() => {
              const allLogbook = sessions.flatMap(s => (s.climbs || []).map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location })));
              const similarRaw = allLogbook.filter(c =>
                c.id !== climb.id &&
                !(climb.setClimbId && c.setClimbId === climb.setClimbId) &&
                c.grade === climb.grade &&
                (climb.holdTypes || []).some(h => (c.holdTypes || []).includes(h))
              );
              const seen = new Set();
              const similar = similarRaw.filter(c => {
                const key = c.setClimbId || c.id;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              }).slice(0, 5);
              if (!similar.length) return null;
              return (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Similar Climbs</div>
                  {similar.map((c, i) => {
                    const gc = getGradeColor(c.grade);
                    return (
                      <div key={`sim-${c.id}-${i}`} onClick={() => setSelectedLogbookClimb(c)} style={{ background: W.surface, border: `1px solid ${W.border}`, borderLeft: `4px solid ${gc}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: gc, minWidth: 32, flexShrink: 0 }}>{c.grade}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name || c.grade}</div>
                          <div style={{ fontSize: 11, color: W.textMuted }}>📍 {c.sessionLocation}</div>
                        </div>
                        <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{c.completed ? "✓" : "✗"}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          {/* Share modal */}
          {showClimbShare && (
            <div onClick={() => setShowClimbShare(false)} style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
                {climb.photo ? (
                  <div style={{ position: "relative", height: 200 }}>
                    <img src={climb.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72))" }} />
                    <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: gradeColor, color: "#fff", borderRadius: 8, padding: "5px 14px", fontWeight: 900, fontSize: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{climb.grade}</div>
                      {colorEntry && <div style={{ width: 22, height: 22, borderRadius: "50%", background: colorEntry.hex, border: "2.5px solid rgba(255,255,255,0.85)" }} />}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: gradeColor + "25", padding: "22px 20px 14px", borderBottom: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ background: gradeColor, color: "#fff", borderRadius: 12, padding: "8px 20px", fontWeight: 900, fontSize: 26 }}>{climb.grade}</div>
                    {colorEntry && <div style={{ width: 24, height: 24, borderRadius: "50%", background: colorEntry.hex, border: `2px solid ${W.border}`, flexShrink: 0 }} title={colorEntry.label} />}
                    {colorEntry && <span style={{ fontSize: 13, color: W.textMuted, fontWeight: 600 }}>{colorEntry.label}</span>}
                  </div>
                )}
                <div style={{ padding: "16px 18px 20px" }}>
                  {climb.name && <div style={{ fontWeight: 900, fontSize: 20, color: W.text, marginBottom: 2 }}>{climb.name}</div>}
                  {relatedEntries[relatedEntries.length - 1]?.session.location && (
                    <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 14 }}>📍 {relatedEntries[relatedEntries.length - 1].session.location}</div>
                  )}
                  <div style={{ display: "flex", gap: 0, marginBottom: 16, background: W.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${W.border}` }}>
                    {[
                      { val: relatedEntries.length, label: "Sessions" },
                      { val: totalAttempts, label: "Attempts" },
                      { val: totalSends, label: "Sends", color: totalSends > 0 ? W.greenDark : undefined },
                      ...(totalTimeSec > 0 ? [{ val: formatDuration(totalTimeSec), label: "Time" }] : []),
                    ].map((s, i, arr) => (
                      <div key={i} style={{ flex: 1, padding: "10px 4px", textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${W.border}` : "none" }}>
                        <div style={{ fontWeight: 900, fontSize: 18, color: s.color || W.text }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: W.textMuted, marginTop: 1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: W.textMuted, textAlign: "center", marginBottom: 14, fontWeight: 600, letterSpacing: 0.3 }}>Logged with SendLog</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {typeof navigator?.share === "function" && (
                      <button onClick={() => {
                        const loc = relatedEntries[relatedEntries.length - 1]?.session.location;
                        const text = `${climb.name ? climb.name + " — " : ""}${climb.grade}${loc ? " at " + loc : ""}\n${totalSends > 0 ? `✓ Sent ${totalSends}×` : "Still projecting"} · ${totalAttempts} attempts · ${relatedEntries.length} session${relatedEntries.length !== 1 ? "s" : ""}\n\nLogged with SendLog`;
                        navigator.share({ title: climb.name || climb.grade, text }).catch(() => {});
                      }} style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Share</button>
                    )}
                    <button onClick={() => {
                      const loc = relatedEntries[relatedEntries.length - 1]?.session.location;
                      const text = `${climb.name ? climb.name + " — " : ""}${climb.grade}${loc ? " at " + loc : ""}\n${totalSends > 0 ? `✓ Sent ${totalSends}×` : "Still projecting"} · ${totalAttempts} attempts · ${relatedEntries.length} session${relatedEntries.length !== 1 ? "s" : ""}\n\nLogged with SendLog`;
                      navigator.clipboard?.writeText(text);
                      setShowClimbShare(false);
                    }} style={{ flex: 1, padding: "11px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Copy Text</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    })()}

    {/* Gym Detail Overlay */}
    {selectedGym && (() => {
      const loc = selectedGym;
      const allEntries = gymSets[loc] || [];
      const active = allEntries.filter(e => !e.removed);
      const removed = allEntries.filter(e => e.removed);
      const gs = gymScales[loc] || {};
      const gymSessions = sessions.filter(s => s.location === loc);
      const gymSessionCount = gymSessions.length;
      const lastVisit = gymSessions.length ? gymSessions.reduce((latest, s) => s.date > latest ? s.date : latest, gymSessions[0].date) : null;
      const sections = gs.wallSections || [];

      // Grade rank helper — higher index = harder
      const getGradeRank = (grade, scale) => {
        const list = (GRADES[scale] || GRADES["V-Scale"]);
        const idx = list.indexOf(grade);
        return idx >= 0 ? idx : -1;
      };

      // "Set X ago" helper
      const setAgo = (dateStr) => {
        if (!dateStr) return null;
        const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
        if (days < 1) return "Today";
        if (days < 7) return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        if (weeks < 5) return `${weeks}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
      };

      // Per-entry stats helper
      const entryStats = (entry) => {
        const related = sessions.flatMap(s => (s.climbs || []).filter(c => c.setClimbId === entry.id).map(c => ({ climb: c })));
        return {
          sends: related.filter(({ climb: c }) => c.completed).length,
          attempts: related.reduce((t, { climb: c }) => t + climbAttempts(c), 0),
          sessionCount: related.length,
          photo: sessions.flatMap(s => (s.climbs || []).filter(c => c.setClimbId === entry.id && c.photo)).map(c => c.photo)[0],
        };
      };

      // Build section-grouped + sorted active climbs, photos first within each group
      const sectionGroups = {};
      for (const entry of active) {
        const sec = entry.section || "";
        if (!sectionGroups[sec]) sectionGroups[sec] = [];
        sectionGroups[sec].push(entry);
      }
      for (const sec of Object.keys(sectionGroups)) {
        sectionGroups[sec].sort((a, b) => {
          const aPhoto = !!entryStats(a).photo;
          const bPhoto = !!entryStats(b).photo;
          if (bPhoto !== aPhoto) return bPhoto ? 1 : -1; // photos first
          return getGradeRank(b.grade, b.scale) - getGradeRank(a.grade, a.scale); // then hardest first
        });
      }
      const orderedSections = [
        ...sections.filter(s => sectionGroups[s]),
        ...Object.keys(sectionGroups).filter(s => s && !sections.includes(s)),
        ...(sectionGroups[""] ? [""] : []),
      ];

      const openGymClimbDetail = (entry) => {
        const related = sessions.flatMap(s =>
          (s.climbs || []).filter(c => c.setClimbId === entry.id)
            .map(c => ({ ...c, sessionDate: s.date, sessionLocation: s.location, _sessionId: s.id }))
        ).sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        setSelectedLogbookClimb(related.length > 0 ? related[0] : { ...entry, sessionDate: entry.setDate, sessionLocation: entry.location, _sessionId: null });
      };

      const renderGymCard = (entry) => {
        const gradeColor = getGradeColor(entry.grade);
        const colorEntry = CLIMB_COLORS.find(cc => cc.id === entry.color);
        const { sends, attempts, sessionCount, photo } = entryStats(entry);
        const hasSends = sends > 0;
        const isSelected = gymSelectedIds.has(entry.id);
        const ago = setAgo(entry.setDate);

        const handleClick = () => {
          if (gymManageMode) {
            setGymSelectedIds(prev => { const next = new Set(prev); next.has(entry.id) ? next.delete(entry.id) : next.add(entry.id); return next; });
          } else {
            openGymClimbDetail(entry);
          }
        };

        if (gymSetView === "tiles") {
          return (
            <div key={entry.id} onClick={handleClick} style={{ border: `1.5px solid ${isSelected ? W.accent : W.border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", position: "relative", minHeight: 200, background: photo ? "transparent" : W.surface }}>
              {/* Full bleed photo or gradient background */}
              {photo
                ? <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${gradeColor}18, ${W.surface2})` }} />
              }
              {/* Bottom gradient scrim */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: photo ? "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" : `linear-gradient(to top, ${W.surface}cc 0%, transparent 100%)`, zIndex: 1 }} />
              {/* Top-left: sent/not sent badge */}
              <div style={{ position: "absolute", top: 8, left: 8, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, background: hasSends ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)", color: hasSends ? "#14532d" : "#7f1d1d", zIndex: 2 }}>
                {hasSends ? "✓" : "✗"}
              </div>
              {/* Top-right: name + grade + color */}
              <div style={{ position: "absolute", top: 8, right: 8, maxWidth: "62%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, zIndex: 2 }}>
                {entry.name && <div style={{ fontSize: 10, fontWeight: 800, color: "#fff", textAlign: "right", lineHeight: 1.2, textShadow: "0 1px 4px rgba(0,0,0,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{entry.name}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ background: gradeColor, color: "#fff", borderRadius: 6, padding: "2px 7px", fontWeight: 900, fontSize: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>{entry.grade}</div>
                  {colorEntry && <div style={{ width: 13, height: 13, borderRadius: "50%", background: colorEntry.hex, border: "1.5px solid rgba(255,255,255,0.85)", flexShrink: 0 }} />}
                </div>
              </div>
              {/* Project badge */}
              {entry.isProject && <div style={{ position: "absolute", top: 40, right: 8, background: "rgba(157,23,77,0.9)", color: "#fff", fontSize: 8, fontWeight: 900, letterSpacing: 0.8, borderRadius: 5, padding: "2px 6px", zIndex: 2 }}>🎯 PROJECT</div>}
              {/* Received-from badge */}
              {entry.receivedFrom && <div style={{ position: "absolute", top: entry.isProject ? 56 : 40, right: 8, background: "rgba(59,130,246,0.88)", color: "#fff", fontSize: 8, fontWeight: 900, letterSpacing: 0.5, borderRadius: 5, padding: "2px 6px", zIndex: 2, maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📤 @{entry.receivedFromUser || entry.receivedFrom}</div>}
              {/* Manage mode overlay */}
              {gymManageMode && isSelected && <div style={{ position: "absolute", inset: 0, zIndex: 3, border: `3px solid ${W.accent}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: `${W.accent}33` }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff" }}>✓</div></div>}
              {/* Bottom stats overlay — transparent, text directly on photo */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: "6px 4px 4px" }}>
                <div style={{ display: "flex", justifyContent: "space-around" }}>
                  {[{ val: sends, label: "Sends", hi: hasSends }, { val: attempts, label: "Att." }, { val: sessionCount, label: "Sess." }].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", background: "rgba(0,0,0,0.35)", borderRadius: 6, padding: "3px 5px", minWidth: 34 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, color: s.hi ? "#86efac" : "#fff", lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>{s.val}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.75)", marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {ago && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 3 }}>Set {ago}</div>}
              </div>
            </div>
          );
        }
        // single / list view
        return (
          <div key={entry.id} onClick={handleClick} style={{ background: W.surface, border: `1.5px solid ${isSelected ? W.accent : W.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", display: "flex", marginBottom: 8, position: "relative" }}>
            <div style={{ width: 56, background: gradeColor + "22", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 4px", flexShrink: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: gradeColor }}>{entry.grade}</div>
              {colorEntry && <div style={{ width: 14, height: 14, borderRadius: "50%", background: colorEntry.hex, border: `1.5px solid ${W.border}` }} />}
            </div>
            <div style={{ flex: 1, padding: "10px 12px", minWidth: 0 }}>
              {entry.isProject && <div style={{ fontSize: 9, color: "#be185d", fontWeight: 900, letterSpacing: 0.5, marginBottom: 2 }}>🎯 PROJECT</div>}
              {entry.receivedFrom && <div style={{ fontSize: 9, color: "#3b82f6", fontWeight: 700, marginBottom: 2 }}>📤 @{entry.receivedFromUser || entry.receivedFrom}</div>}
              {entry.name && <div style={{ fontWeight: 800, fontSize: 14, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}</div>}
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{entry.section ? `${entry.section} · ` : ""}{entry.wallTypes?.join(", ")}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                {ago && <span style={{ fontSize: 9, color: W.textDim }}>Set {ago}</span>}
                {attempts > 0 && <span style={{ fontSize: 9, color: W.textMuted }}>{attempts} att</span>}
                {sends > 0 && <span style={{ fontSize: 9, color: W.greenDark, fontWeight: 700 }}>{sends} sent</span>}
              </div>
            </div>
            {photo && <img src={photo} alt="" style={{ width: 56, height: 56, objectFit: "cover", alignSelf: "center", borderRadius: 10, margin: "0 10px 0 0", flexShrink: 0 }} />}
            {!photo && <div style={{ alignSelf: "center", marginRight: 12, width: 26, height: 26, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, background: hasSends ? W.green : W.red, color: hasSends ? W.greenDark : W.redDark, flexShrink: 0 }}>{hasSends ? "✓" : "✗"}</div>}
            {gymManageMode && isSelected && <div style={{ position: "absolute", inset: 0, background: `${W.accent}22`, border: `2px solid ${W.accent}`, borderRadius: 14, pointerEvents: "none" }} />}
          </div>
        );
      };

      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 440, background: W.bg, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px 12px", paddingTop: "calc(16px + env(safe-area-inset-top))", background: W.surface, borderBottom: `1px solid ${W.border}`, position: "sticky", top: 0, zIndex: 2 }}>
            <button onClick={() => { setSelectedGym(null); setGymManageMode(false); setGymSelectedIds(new Set()); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "7px 14px", color: W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loc}</div>
              <div style={{ fontSize: 11, color: W.textMuted }}>{active.length} active · {gymSessionCount} sessions</div>
            </div>
            <button onClick={() => { setGymManageMode(m => !m); setGymSelectedIds(new Set()); }} style={{ background: gymManageMode ? W.accent : W.surface2, border: `1px solid ${gymManageMode ? W.accent : W.border}`, borderRadius: 10, padding: "7px 10px", color: gymManageMode ? "#fff" : W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>{gymManageMode ? "Done" : "Manage"}</button>
            <button onClick={() => { setGymEditName(selectedGym); setGymSettingsOpen(true); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "7px 10px", color: W.textMuted, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>⚙️</button>
          </div>

          <div style={{ paddingBottom: 80 }}>
            {/* Tab toggle */}
            <div style={{ display: "flex", borderBottom: `1px solid ${W.border}`, background: W.surface, position: "sticky", top: "calc(57px + env(safe-area-inset-top))", zIndex: 1 }}>
              {[{ id: "overview", label: "Overview" }, { id: "sets", label: "Sets" }].map(t => (
                <button key={t.id} onClick={() => setGymDetailTab(t.id)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", borderBottom: `2.5px solid ${gymDetailTab === t.id ? W.accent : "transparent"}`, color: gymDetailTab === t.id ? W.accent : W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {gymDetailTab === "overview" && (() => {
              const gymTotalSec   = gymSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
              const gymBoulderSec = gymSessions.reduce((sum, s) => sum + (s.boulderTotalSec || 0), 0);
              const gymRopeSec    = gymSessions.reduce((sum, s) => sum + (s.ropeTotalSec || 0), 0);
              const gymSpeedSec   = gymSessions.reduce((sum, s) => sum + (s.climbs || []).filter(c => c.climbType === "speed-session").reduce((a, c) => a + (c.speedTotalSec || 0), 0), 0);
              const allGymClimbs  = gymSessions.flatMap(s => s.climbs || []);
              const gymSends      = allGymClimbs.filter(c => c.completed);
              const gymFlashes    = gymSends.filter(c => (c.tries || 0) === 0);
              const gymAttempts   = allGymClimbs.reduce((sum, c) => sum + climbAttempts(c), 0);

              // Last 5 sessions
              const last5 = [...gymSessions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

              // Sends by grade (pie chart)
              const sendsByGrade = {};
              for (const c of gymSends) {
                if (c.grade && c.grade !== "Ungraded") sendsByGrade[c.grade] = (sendsByGrade[c.grade] || 0) + 1;
              }
              const gradeOrder = [...Object.keys(GRADES), ...Object.keys(ROPE_GRADES)];
              const pieSlices = Object.entries(sendsByGrade)
                .sort((a, b) => (gradeOrder.indexOf(a[0]) - gradeOrder.indexOf(b[0])))
                .map(([grade, count]) => ({ label: grade, value: count, color: getGradeColor(grade) }));

              // Attempts by wall section (bar chart)
              const setMap = {};
              for (const e of allEntries) setMap[e.id] = e.section || null;
              const attemptsBySection = {};
              for (const c of allGymClimbs) {
                if (c.setClimbId && setMap[c.setClimbId]) {
                  const sec = setMap[c.setClimbId];
                  attemptsBySection[sec] = (attemptsBySection[sec] || 0) + climbAttempts(c);
                }
              }
              const sectionBars = Object.entries(attemptsBySection).sort((a, b) => b[1] - a[1]);
              const maxSectionAttempts = sectionBars.length ? sectionBars[0][1] : 1;

              // SVG Pie helper
              const PieChart = ({ slices, size = 150 }) => {
                const total = slices.reduce((s, d) => s + d.value, 0);
                if (!total) return null;
                const cx = size / 2, cy = size / 2, r = size / 2 - 3;
                let angle = -Math.PI / 2;
                const paths = slices.map(d => {
                  const sweep = (d.value / total) * 2 * Math.PI;
                  const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
                  const endA = angle + sweep;
                  const x2 = cx + r * Math.cos(endA), y2 = cy + r * Math.sin(endA);
                  const largeArc = sweep > Math.PI ? 1 : 0;
                  const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
                  angle = endA;
                  return { ...d, path };
                });
                return (
                  <svg width={size} height={size} style={{ display: "block" }}>
                    {paths.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke={W.bg} strokeWidth={2} />)}
                  </svg>
                );
              };

              return (
                <div style={{ padding: "16px 16px 0" }}>
                  {/* Quick stats row */}
                  <div style={{ display: "flex", gap: 0, marginBottom: 14, background: W.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${W.border}` }}>
                    {[
                      { val: gymSessionCount, label: "Sessions" },
                      { val: gymSends.length, label: "Sends", color: W.greenDark },
                      { val: gymFlashes.length, label: "Flashes", color: W.accent },
                      { val: gymAttempts, label: "Attempts" },
                    ].map((s, i, arr) => (
                      <div key={i} style={{ flex: 1, padding: "10px 2px", textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${W.border}` : "none" }}>
                        <div style={{ fontWeight: 900, fontSize: 18, color: s.color || W.text, lineHeight: 1 }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: W.textMuted, marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Time breakdown */}
                  <div style={{ background: W.surface, borderRadius: 14, border: `1px solid ${W.border}`, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Time at Gym</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: W.text, lineHeight: 1 }}>{formatTotalTime(gymTotalSec)}</div>
                      <div style={{ fontSize: 12, color: W.textMuted }}>total</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "🪨 Bouldering", sec: gymBoulderSec },
                        { label: "🧗 Rope", sec: gymRopeSec },
                        { label: "⚡ Speed", sec: gymSpeedSec },
                      ].filter(t => t.sec > 0).map((t, i) => {
                        const pct = gymTotalSec > 0 ? Math.round((t.sec / gymTotalSec) * 100) : 0;
                        return (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: W.text, fontWeight: 600 }}>{t.label}</span>
                              <span style={{ fontSize: 12, color: W.textMuted }}>{formatTotalTime(t.sec)} · {pct}%</span>
                            </div>
                            <div style={{ background: W.surface2, borderRadius: 4, height: 8, overflow: "hidden" }}>
                              <div style={{ background: W.accent, borderRadius: 4, height: 8, width: `${pct}%`, transition: "width 0.4s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                      {gymBoulderSec === 0 && gymRopeSec === 0 && gymSpeedSec === 0 && (
                        <div style={{ fontSize: 12, color: W.textDim }}>No type-specific time data yet — logged from future sessions.</div>
                      )}
                    </div>
                  </div>

                  {/* Last 5 sessions */}
                  <div style={{ background: W.surface, borderRadius: 14, border: `1px solid ${W.border}`, padding: "14px 16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Recent Sessions</div>
                    {last5.length === 0 ? (
                      <div style={{ fontSize: 12, color: W.textDim, padding: "8px 0" }}>No sessions logged here yet.</div>
                    ) : last5.map((s, i) => {
                      const climbs = s.climbs || [];
                      const sends   = climbs.filter(c => c.completed).length;
                      const flashes = climbs.filter(c => c.completed && (c.tries || 0) === 0).length;
                      const attempts = climbs.reduce((t, c) => t + climbAttempts(c), 0);
                      return (
                        <div key={s.id} style={{ display: "flex", alignItems: "center", paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0, borderTop: i > 0 ? `1px solid ${W.border}` : "none" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: W.text }}>{formatDate(s.date)}</div>
                            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>{formatTotalTime(s.duration || 0)} · {attempts} att · {sends} sends{flashes > 0 ? ` · ${flashes} flash${flashes > 1 ? "es" : ""}` : ""}</div>
                          </div>
                          {sends > 0 && <div style={{ fontSize: 11, fontWeight: 800, color: W.greenDark, background: W.green, borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>{sends}✓</div>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Sends by grade — pie chart */}
                  {pieSlices.length > 0 && (
                    <div style={{ background: W.surface, borderRadius: 14, border: `1px solid ${W.border}`, padding: "14px 16px", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Sends by Grade</div>
                      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <PieChart slices={pieSlices} size={130} />
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                          {pieSlices.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: W.text, fontWeight: 700 }}>{s.label}</span>
                              <span style={{ fontSize: 11, color: W.textMuted, marginLeft: "auto" }}>{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Attempts by wall section — bar chart */}
                  {sectionBars.length > 0 && (
                    <div style={{ background: W.surface, borderRadius: 14, border: `1px solid ${W.border}`, padding: "14px 16px", marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Attempts by Section</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {sectionBars.map(([sec, count], i) => (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: W.text, fontWeight: 600 }}>{sec}</span>
                              <span style={{ fontSize: 12, color: W.textMuted }}>{count}</span>
                            </div>
                            <div style={{ background: W.surface2, borderRadius: 4, height: 10, overflow: "hidden" }}>
                              <div style={{ background: W.accent, borderRadius: 4, height: 10, width: `${(count / maxSectionAttempts) * 100}%`, transition: "width 0.4s ease" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── SETS TAB ── */}
            {gymDetailTab === "sets" && (
              <div style={{ padding: "12px 16px 0" }}>
                {/* Manage mode bulk-remove bar */}
                {gymManageMode && gymSelectedIds.size > 0 && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button onClick={() => {
                      setGymSets(prev => ({ ...prev, [loc]: (prev[loc] || []).map(e => gymSelectedIds.has(e.id) ? { ...e, removed: true, removedDate: new Date().toISOString() } : e) }));
                      setGymSelectedIds(new Set());
                    }} style={{ flex: 1, padding: "10px", background: "#fca5a5", border: "1px solid #f87171", borderRadius: 12, color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      Remove {gymSelectedIds.size} from Wall
                    </button>
                    <button onClick={() => setGymSelectedIds(new Set())} style={{ padding: "10px 14px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear</button>
                  </div>
                )}

                {/* View toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.text }}>Active Climbs</div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["tiles", "single"].map(v => (
                      <button key={v} onClick={() => setGymSetView(v)} style={{ padding: "5px 12px", background: gymSetView === v ? W.accent : W.surface2, border: `1px solid ${gymSetView === v ? W.accent : W.border}`, borderRadius: 8, color: gymSetView === v ? "#fff" : W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                        {v === "single" ? "List" : "Tiles"}
                      </button>
                    ))}
                  </div>
                </div>

                {active.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0", fontSize: 13 }}>No active climbs on this wall.</div>}

                {/* Section-grouped active climbs */}
                {orderedSections.map(sec => {
                  const entries = sectionGroups[sec] || [];
                  return (
                    <div key={sec || "__unsectioned__"} style={{ marginBottom: 18 }}>
                      {(sec || orderedSections.length > 1) && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8, paddingLeft: 2 }}>
                          {sec || "Other"}
                        </div>
                      )}
                      {gymSetView === "tiles" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {entries.map(e => renderGymCard(e))}
                        </div>
                      ) : (
                        <div>{entries.map(e => renderGymCard(e))}</div>
                      )}
                    </div>
                  );
                })}

                {/* Removed section */}
                {removed.length > 0 && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 8 }}>Removed from Wall</div>
                    {gymSetView === "tiles" ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {removed.map(e => <div key={e.id} style={{ opacity: 0.55 }}>{renderGymCard(e)}</div>)}
                      </div>
                    ) : (
                      <div>{removed.map(e => <div key={e.id} style={{ opacity: 0.55 }}>{renderGymCard(e)}</div>)}</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Send Climbs button */}
            <div style={{ padding: "16px 0 0" }}>
              <button onClick={async () => {
                setSendSelectedIds(new Set());
                setSendClimbStep("select");
                setSendToUser(null);
                setSendMutuals(null);
                setShowSendClimbs(true);
                const m = await loadMutuals();
                setSendMutuals(m);
              }} style={{ width: "100%", padding: "12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📤 Send Climbs to a Friend
              </button>
            </div>
          </div>

          {/* Send Climbs modal */}
          {showSendClimbs && (() => {
            const toggleSend = (id) => setSendSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
            const toggleSection = (sec) => {
              const ids = (sectionGroups[sec] || []).map(e => e.id);
              const allSelected = ids.every(id => sendSelectedIds.has(id));
              setSendSelectedIds(prev => {
                const n = new Set(prev);
                allSelected ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id));
                return n;
              });
            };
            const handleSend = async () => {
              if (!sendToUser || sendSelectedIds.size === 0 || sendingClimbs) return;
              setSendingClimbs(true);
              const stripped = [...sendSelectedIds].map(id => {
                const entry = allEntries.find(e => e.id === id);
                if (!entry) return null;
                const { photo } = entryStats(entry);
                return { id: `shared_${Date.now()}_${id}`, name: entry.name || "", grade: entry.grade || "", scale: entry.scale || "V-Scale", color: entry.color || null, wallTypes: entry.wallTypes || [], holdTypes: entry.holdTypes || [], climbType: entry.climbType || "boulder", photo: photo || null, section: entry.section || null };
              }).filter(Boolean);
              await sendClimbsToFriend(stripped, sendToUser.username);
              setSendingClimbs(false);
              const _sentTo = sendToUser.username;
              setShowSendClimbs(false);
              setSendSelectedIds(new Set());
              setSendToUser(null);
              setToastMsg(`Sent to @${_sentTo}`);
              setTimeout(() => setToastMsg(null), 2500);
            };
            return (
              <div onClick={() => setShowSendClimbs(false)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)" }}>
                  {/* Header */}
                  <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${W.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontWeight: 900, fontSize: 17, color: W.text }}>
                        {sendClimbStep === "select" ? "Select Climbs" : "Send to Friend"}
                      </div>
                      <button onClick={() => setShowSendClimbs(false)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
                    </div>
                    {sendClimbStep === "select" && sendSelectedIds.size > 0 && (
                      <div style={{ fontSize: 12, color: W.accent, fontWeight: 700 }}>{sendSelectedIds.size} climb{sendSelectedIds.size !== 1 ? "s" : ""} selected</div>
                    )}
                  </div>
                  {/* Step: Select climbs */}
                  {sendClimbStep === "select" && (
                    <>
                      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
                        {orderedSections.map(sec => {
                          const entries = sectionGroups[sec] || [];
                          const secIds = entries.map(e => e.id);
                          const allSel = secIds.length > 0 && secIds.every(id => sendSelectedIds.has(id));
                          return (
                            <div key={sec || "__unsec__"} style={{ marginBottom: 16 }}>
                              {(sec || orderedSections.length > 1) && (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.1 }}>{sec || "Other"}</div>
                                  <button onClick={() => toggleSection(sec)} style={{ padding: "3px 10px", background: allSel ? W.accent + "22" : W.surface2, border: `1px solid ${allSel ? W.accent : W.border}`, borderRadius: 8, color: allSel ? W.accent : W.textMuted, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>
                                    {allSel ? "Deselect all" : "Select all"}
                                  </button>
                                </div>
                              )}
                              {entries.map(entry => {
                                const sel = sendSelectedIds.has(entry.id);
                                const gradeColor = getGradeColor(entry.grade);
                                const colorEntry = CLIMB_COLORS.find(cc => cc.id === entry.color);
                                return (
                                  <div key={entry.id} onClick={() => toggleSend(entry.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: sel ? W.accent + "11" : W.surface, border: `1.5px solid ${sel ? W.accent : W.border}`, borderRadius: 12, marginBottom: 6, cursor: "pointer" }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${sel ? W.accent : W.border}`, background: sel ? W.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      {sel && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                                    </div>
                                    <div style={{ background: gradeColor, color: "#fff", borderRadius: 6, padding: "2px 8px", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{entry.grade}</div>
                                    {colorEntry && <div style={{ width: 10, height: 10, borderRadius: "50%", background: colorEntry.hex, flexShrink: 0 }} />}
                                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: W.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name || entry.grade}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                        {active.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0", fontSize: 13 }}>No active climbs to share.</div>}
                      </div>
                      <div style={{ padding: "12px 16px 16px", flexShrink: 0, borderTop: `1px solid ${W.border}` }}>
                        <button disabled={sendSelectedIds.size === 0} onClick={() => setSendClimbStep("friend")} style={{ width: "100%", padding: "13px", background: sendSelectedIds.size > 0 ? W.accent : W.surface2, border: "none", borderRadius: 14, color: sendSelectedIds.size > 0 ? "#fff" : W.textDim, fontWeight: 700, fontSize: 15, cursor: sendSelectedIds.size > 0 ? "pointer" : "default" }}>
                          Next — Choose Friend →
                        </button>
                      </div>
                    </>
                  )}
                  {/* Step: Choose friend */}
                  {sendClimbStep === "friend" && (
                    <>
                      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
                        {sendMutuals === null && <div style={{ textAlign: "center", color: W.textMuted, padding: "30px 0", fontSize: 13 }}>Loading friends…</div>}
                        {sendMutuals !== null && sendMutuals.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0", fontSize: 13 }}>No mutual follows yet. Follow someone and have them follow back to send climbs.</div>}
                        {(sendMutuals || []).map(m => (
                          <div key={m.username} onClick={() => setSendToUser(sendToUser?.username === m.username ? null : m)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: sendToUser?.username === m.username ? W.accent + "18" : W.surface, border: `1.5px solid ${sendToUser?.username === m.username ? W.accent : W.border}`, borderRadius: 14, marginBottom: 8, cursor: "pointer" }}>
                            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sendToUser?.username === m.username ? W.accent : W.border}`, background: sendToUser?.username === m.username ? W.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              {sendToUser?.username === m.username && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{m.displayName}</div>
                              <div style={{ fontSize: 12, color: W.textMuted }}>@{m.username}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: "12px 16px 16px", flexShrink: 0, borderTop: `1px solid ${W.border}`, display: "flex", gap: 8 }}>
                        <button onClick={() => setSendClimbStep("select")} style={{ padding: "13px 18px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
                        <button disabled={!sendToUser || sendingClimbs} onClick={handleSend} style={{ flex: 1, padding: "13px", background: sendToUser ? W.accent : W.surface2, border: "none", borderRadius: 14, color: sendToUser ? "#fff" : W.textDim, fontWeight: 700, fontSize: 15, cursor: sendToUser ? "pointer" : "default" }}>
                          {sendingClimbs ? "Sending…" : `Send ${sendSelectedIds.size} Climb${sendSelectedIds.size !== 1 ? "s" : ""}`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Gym Settings modal */}
          {gymSettingsOpen && (() => {
            const gymObj = gyms.find(g => g.name === loc);
            const gymActivities = gymObj?.activities || [];
            const toggleSettingsActivity = (id) => setGyms(prev => prev.map(g => g.name === loc ? { ...g, activities: g.activities.includes(id) ? g.activities.filter(x => x !== id) : [...g.activities, id] } : g));
            const settingsActivities = [
              { id: "boulder", label: "Bouldering", icon: "🪨" },
              { id: "rope",    label: "Rope",        icon: "🧗" },
              { id: "speed",   label: "Speed",       icon: "⚡" },
              { id: "workout", label: "Workout",     icon: "💪" },
            ];
            const saveGymName = () => {
              const newName = gymEditName.trim();
              if (!newName || newName === loc) return;
              setGyms(prev => prev.map(g => g.name === loc ? { ...g, name: newName } : g));
              setCustomLocations(prev => prev.map(l => l === loc ? newName : l));
              setGymScales(prev => { const n = { ...prev }; if (n[loc]) { n[newName] = n[loc]; delete n[loc]; } return n; });
              setGymSets(prev => { const n = { ...prev }; if (n[loc]) { n[newName] = n[loc]; delete n[loc]; } return n; });
              setSessions(prev => prev.map(s => s.location === loc ? { ...s, location: newName } : s));
              setSelectedGym(newName);
            };
            return (
            <div onClick={() => { setGymSettingsOpen(false); setConfirmDeleteGym(false); }} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto", padding: "20px 20px 0", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
                <div style={{ fontWeight: 900, fontSize: 18, color: W.text, marginBottom: 16 }}>⚙️ Gym Settings</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Gym Name</div>
                <input value={gymEditName} onChange={e => setGymEditName(e.target.value)} placeholder="Gym name…" style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: W.surface2, border: `1.5px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 15, fontFamily: "inherit", outline: "none", marginBottom: 16 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 8 }}>Activities</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {settingsActivities.map(a => {
                    const sel = gymActivities.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => toggleSettingsActivity(a.id)} style={{ padding: "10px 12px", background: sel ? W.accent+"22" : W.surface2, border: `2px solid ${sel ? W.accent : W.border}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: sel ? W.accent : W.textMuted, fontWeight: 700, fontSize: 13 }}>
                        <span>{a.icon}</span><span>{a.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Wall Sections</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {sections.map(sec => (
                    <div key={sec} style={{ display: "flex", alignItems: "center", gap: 4, background: W.surface2, borderRadius: 8, padding: "4px 10px", border: `1px solid ${W.border}` }}>
                      <span style={{ fontSize: 12, color: W.text }}>{sec}</span>
                      <button onClick={() => setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), wallSections: (prev[loc]?.wallSections || []).filter(s => s !== sec) } }))} style={{ background: "none", border: "none", color: W.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  <input value={gymSectionInput} onChange={e => setGymSectionInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && gymSectionInput.trim()) { setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), wallSections: [...(prev[loc]?.wallSections || []), gymSectionInput.trim()] } })); setGymSectionInput(""); } }} placeholder="Add section…" style={{ flex: 1, padding: "7px 10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 9, color: W.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                  <button onClick={() => { if (gymSectionInput.trim()) { setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), wallSections: [...(prev[loc]?.wallSections || []), gymSectionInput.trim()] } })); setGymSectionInput(""); } }} style={{ padding: "7px 14px", background: W.accent, border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Add</button>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Boulder Grading Scale</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {getAllBoulderScaleNames().map(scale => (
                    <button key={scale} onClick={() => setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), boulder: scale } }))} style={{ padding: "5px 12px", background: gs.boulder === scale ? W.accent : W.surface2, border: `1px solid ${gs.boulder === scale ? W.accent : W.border}`, borderRadius: 8, color: gs.boulder === scale ? "#fff" : W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{scale}</button>
                  ))}
                </div>
                {gs.boulder && customGradingSchemes.find(s => s.name === gs.boulder) && (
                  <button onClick={() => { const s = customGradingSchemes.find(cs => cs.name === gs.boulder); setSchemeEditId(s.id); setSchemeName(s.name); setSchemeGrades(s.grades || []); setSchemeBuilderFor("gym-boulder"); setShowSchemeBuilder(true); }} style={{ marginBottom: 14, padding: "5px 12px", background: "none", border: `1px solid ${W.accent}`, borderRadius: 8, color: W.accent, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✏️ Edit "{gs.boulder}" scheme</button>
                )}
                {!gs.boulder || !customGradingSchemes.find(s => s.name === gs.boulder) ? <div style={{ marginBottom: 14 }} /> : null}
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Rope Grading Scale</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                  {getAllRopeScaleNames().map(scale => (
                    <button key={scale} onClick={() => setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), rope: scale } }))} style={{ padding: "5px 12px", background: gs.rope === scale ? W.accent : W.surface2, border: `1px solid ${gs.rope === scale ? W.accent : W.border}`, borderRadius: 8, color: gs.rope === scale ? "#fff" : W.textMuted, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{scale}</button>
                  ))}
                </div>
                {gs.rope && customGradingSchemes.find(s => s.name === gs.rope) && (
                  <button onClick={() => { const s = customGradingSchemes.find(cs => cs.name === gs.rope); setSchemeEditId(s.id); setSchemeName(s.name); setSchemeGrades(s.grades || []); setSchemeBuilderFor("gym-rope"); setShowSchemeBuilder(true); }} style={{ marginBottom: 14, padding: "5px 12px", background: "none", border: `1px solid ${W.accent}`, borderRadius: 8, color: W.accent, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✏️ Edit "{gs.rope}" scheme</button>
                )}
                {!gs.rope || !customGradingSchemes.find(s => s.name === gs.rope) ? <div style={{ marginBottom: 14 }} /> : null}
                <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 6 }}>Hours / Notes</div>
                <textarea value={gs.notes || ""} onChange={e => setGymScales(prev => ({ ...prev, [loc]: { ...(prev[loc] || {}), notes: e.target.value } }))} placeholder="Hours, address, or notes about this gym…" rows={3} style={{ width: "100%", padding: "9px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.text, fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
                <button onClick={() => { saveGymName(); setGymSettingsOpen(false); setConfirmDeleteGym(false); }} style={{ width: "100%", marginTop: 16, padding: "13px", background: W.accent, border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Done</button>
                <div style={{ borderTop: `1px solid ${W.border}`, marginTop: 20, paddingTop: 16, marginBottom: 4 }}>
                  {confirmDeleteGym ? (
                    <div style={{ background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 12, padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, color: W.text, fontWeight: 700, marginBottom: 4 }}>Delete "{loc}"?</div>
                      <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 12 }}>This gym will be removed. Sessions logged here keep their location name.</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setConfirmDeleteGym(false)} style={{ flex: 1, padding: "10px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, color: W.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                        <button onClick={() => {
                          setGyms(prev => prev.filter(g => g.name !== loc));
                          setCustomLocations(prev => prev.filter(l => l !== loc));
                          setGymScales(prev => { const n = { ...prev }; delete n[loc]; return n; });
                          setConfirmDeleteGym(false);
                          setGymSettingsOpen(false);
                          setSelectedGym(null);
                          setGymDetailsOpen(false);
                        }} style={{ flex: 1, padding: "10px", background: "#dc3232", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Delete Gym</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteGym(true)} style={{ width: "100%", padding: "10px", background: "none", border: `1px solid rgba(220,50,50,0.4)`, borderRadius: 10, color: "#dc3232", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>Delete Gym</button>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      );
    })()}

    {/* Climb Stats Modal */}
    {selectedSetClimb && (() => {
      const entry = selectedSetClimb;
      const relatedEntries = sessions.flatMap(s =>
        (s.climbs || []).filter(c => c.setClimbId === entry.id).map(c => ({ climb: c, session: s }))
      ).sort((a, b) => new Date(b.session.date) - new Date(a.session.date));
      const totalAttempts = relatedEntries.reduce((t, { climb: c }) => t + climbAttempts(c), 0);
      const totalSends    = relatedEntries.filter(({ climb: c }) => c.completed).length;
      const totalTimeMs   = relatedEntries.reduce((t, { climb: c }) => t + (c.attemptLog || []).reduce((s, a) => s + (a.duration || 0), 0), 0);
      const totalTimeSec  = Math.floor(totalTimeMs / 1000);
      const gradeColor    = getGradeColor(entry.grade);
      const colorEntry    = CLIMB_COLORS.find(cc => cc.id === entry.color);
      const entryPhoto    = relatedEntries.find(({ climb: c }) => c.photo)?.climb.photo;
      return (
        <div
          onTouchStart={e => { e.currentTarget._swipeY = e.touches[0].clientY; e.currentTarget._swipeScrollTop = e.currentTarget.scrollTop; }}
          onTouchMove={e => {
            const dy = e.touches[0].clientY - (e.currentTarget._swipeY || 0);
            if (dy > 0 && (e.currentTarget._swipeScrollTop || 0) === 0) {
              e.currentTarget.style.transform = `translateY(${Math.min(dy * 0.45, 110)}px)`;
              e.currentTarget.style.opacity = `${Math.max(0.55, 1 - dy / 320)}`;
            }
          }}
          onTouchEnd={e => {
            const dy = e.changedTouches[0].clientY - (e.currentTarget._swipeY || 0);
            if (dy > 100 && (e.currentTarget._swipeScrollTop || 0) === 0) {
              setSelectedSetClimb(null); setDeleteSetConfirm(false); setShowClimbShare(false);
            } else {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.opacity = "";
            }
          }}
          style={{ position: "fixed", inset: 0, zIndex: 450, background: W.bg, overflowY: "auto", display: "flex", flexDirection: "column", transition: "transform 0.05s, opacity 0.05s" }}>
          {/* Header bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px 12px", paddingTop: "calc(16px + env(safe-area-inset-top))", background: W.surface, borderBottom: `1px solid ${W.border}`, position: "sticky", top: 0, zIndex: 2 }}>
            <button onClick={() => { setSelectedSetClimb(null); setDeleteSetConfirm(false); setShowClimbShare(false); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, padding: "7px 14px", color: W.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>←</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: W.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name || entry.grade}</div>
              <div style={{ fontSize: 12, color: W.textMuted }}>{entry.grade}{entry.climbType === "rope" ? " · Rope" : ""}{entry.location ? ` · ${entry.location}` : ""}</div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 13, background: gradeColor + "30", color: gradeColor, border: `1.5px solid ${gradeColor}60`, flexShrink: 0 }}>{entry.grade}</div>
            <button onClick={() => { setEditSetClimbOpen(true); setEditingClimbId(entry.id); setClimbForm({ name: entry.name || "", grade: entry.grade || "", scale: entry.scale || "V-Scale", color: entry.color || "", wallTypes: entry.wallTypes || [], holdTypes: entry.holdTypes || [], section: entry.section || "", climbType: entry.climbType || "boulder", comments: entry.comments || "", isProject: entry.isProject || false, projectId: entry.projectId || null, completed: entry.completed || false, tries: entry.tries || 0 }); setPhotoPreview(null); }} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", flexShrink: 0 }} title="Edit">✏️</button>
            <button onClick={() => setShowClimbShare(true)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, cursor: "pointer", flexShrink: 0 }} title="Share">⬆</button>
          </div>
          {/* Edit form panel */}
          {editSetClimbOpen && ClimbFormPanel({ isActiveSession: false, onSave: () => saveGymSetEdit(entry.id), onCancel: () => { setEditSetClimbOpen(false); setShowClimbForm(false); setEditingClimbId(null); } })}
          <div style={{ padding: "20px", display: editSetClimbOpen ? "none" : undefined }}>
            {/* Photo */}
            {entryPhoto && (() => {
              return (
                <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: `1px solid ${W.border}`, position: "relative" }}>
                  <img src={entryPhoto} alt="" style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.60) 100%)", borderRadius: 16 }} />
                  <button onClick={() => setLightboxPhoto({ photos: [{ src: entryPhoto, grade: entry.grade, name: entry.name, colorId: entry.color }], idx: 0 })} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 8, color: "#fff", fontSize: 18, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", lineHeight: 1 }}>⤢</button>
                  <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ background: gradeColor, color: "#fff", borderRadius: 10, padding: "5px 15px", fontWeight: 900, fontSize: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.45)" }}>{entry.grade}</div>
                    {colorEntry?.hex && <div style={{ width: 26, height: 26, borderRadius: "50%", background: colorEntry.hex, border: "2.5px solid rgba(255,255,255,0.9)", boxShadow: "0 1px 5px rgba(0,0,0,0.5)", flexShrink: 0 }} />}
                  </div>
                </div>
              );
            })()}
            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Total Attempts", value: totalAttempts },
                { label: "Total Sends",    value: totalSends },
                { label: "Sessions",       value: relatedEntries.length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: W.text }}>{value}</div>
                  <div style={{ fontSize: 10, color: W.textMuted, fontWeight: 700, marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                </div>
              ))}
            </div>
            {totalTimeSec > 0 && (
              <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Total Time on Climb</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: W.text }}>{formatDuration(totalTimeSec)}</div>
              </div>
            )}
            {/* Tags */}
            {((entry.wallTypes || []).length > 0 || (entry.holdTypes || []).length > 0) && (
              <div style={{ marginBottom: 20 }}><TagChips wallTypes={entry.wallTypes} holdTypes={entry.holdTypes} /></div>
            )}
            {entry.section && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ background: W.accent + "18", color: W.accent, borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>📌 {entry.section}</span>
              </div>
            )}
            {/* Notes from sessions */}
            {(() => {
              const withNotes = relatedEntries.filter(({ climb: c }) => c.comments);
              if (!withNotes.length) return null;
              return (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Notes</div>
                  {withNotes.slice(0, 5).map(({ climb: c, session: s }, i) => (
                    <div key={`note-${s.id}-${i}`} style={{ background: W.surface, border: `1px solid ${W.border}`, borderLeft: `3px solid ${W.accentDark}`, borderRadius: 12, padding: "10px 14px", marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: W.textMuted, fontWeight: 700, marginBottom: 5 }}>{formatDate(s.date?.slice(0, 10))}</div>
                      <div style={{ fontSize: 13, color: W.text, fontStyle: "italic", lineHeight: 1.4 }}>"{c.comments}"</div>
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Last 10 attempts graphic */}
            {relatedEntries.length > 0 && (() => {
              const last10 = relatedEntries.slice(0, 10).reverse();
              return (
                <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>Last {last10.length} Session{last10.length !== 1 ? "s" : ""}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {last10.map(({ climb: c, session: s }, i) => (
                      <div key={`att-${s.id}-${i}`} style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, border: `1.5px solid ${c.completed ? W.greenDark + "80" : W.redDark + "80"}`, flexShrink: 0 }} title={formatDate(s.date?.slice(0, 10))}>
                        {c.completed ? "✓" : "✗"}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            {/* Session history */}
            <div style={{ fontSize: 13, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Session History</div>
            {relatedEntries.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "20px 0" }}>No history yet. Log a session at this gym to start tracking.</div>}
            {relatedEntries.map(({ climb: c, session: s }, i) => {
              const timeMs = (c.attemptLog || []).reduce((t, a) => t + (a.duration || 0), 0);
              const timeSec = Math.floor(timeMs / 1000);
              return (
                <div key={`${s.id}-${c.id}-${i}`} style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{formatDate(s.date?.slice(0, 10))}</div>
                      <div style={{ fontSize: 12, color: W.textMuted, marginTop: 2 }}>📍 {s.location}</div>
                    </div>
                    <span style={{ background: c.completed ? W.green : W.red, color: c.completed ? W.greenDark : W.redDark, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 800 }}>{c.completed ? "✓ Sent" : "Not Sent"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{c.tries || 0}</span> {c.climbType === "rope" ? "attempts" : "falls"}</div>
                    {timeSec > 0 && <div style={{ fontSize: 12, color: W.textMuted }}><span style={{ fontWeight: 700, color: W.text }}>{formatDuration(timeSec)}</span> on climb</div>}
                  </div>
                  {c.comments && <div style={{ fontSize: 12, color: W.textDim, marginTop: 6, fontStyle: "italic" }}>{c.comments}</div>}
                </div>
              );
            })}
            {/* Gym actions */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${W.border}` }}>
              <button onClick={async () => {
                setSendSelectedIds(new Set([entry.id]));
                setSendClimbStep("friend");
                setSendToUser(null);
                setSendMutuals(null);
                setShowSendSingleClimb(true);
                const m = await loadMutuals();
                setSendMutuals(m);
              }} style={{ width: "100%", padding: "11px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📤 Send to Friend</button>
              {!entry.removed ? (
                <button onClick={() => { setGymSets(prev => { const loc = entry.location; return { ...prev, [loc]: (prev[loc] || []).map(e => e.id === entry.id ? { ...e, removed: true, removedDate: new Date().toISOString() } : e) }; }); setSelectedSetClimb(null); }} style={{ width: "100%", padding: "13px", background: "#fca5a5", border: "1px solid #f87171", borderRadius: 14, color: "#b91c1c", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
                  Remove from Wall
                </button>
              ) : (
                <button onClick={() => { setGymSets(prev => { const loc = entry.location; return { ...prev, [loc]: (prev[loc] || []).map(e => e.id === entry.id ? { ...e, removed: false, removedDate: null } : e) }; }); setSelectedSetClimb(null); }} style={{ width: "100%", padding: "13px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
                  Put Back on Wall
                </button>
              )}
              <button onClick={() => { setMergeTargetId(null); setShowMergeClimbPicker(true); }} style={{ width: "100%", padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 14, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10 }}>🔀 Transfer Session Data to New Climb</button>
              {!deleteSetConfirm
                ? <button onClick={() => setDeleteSetConfirm(true)} style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid #f87171", borderRadius: 14, color: "#b91c1c", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10, opacity: 0.8 }}>Delete Permanently</button>
                : <div style={{ background: "#fca5a5", borderRadius: 14, padding: "12px", marginBottom: 10, border: "1px solid #f87171" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c", marginBottom: 8 }}>Delete this climb and all its history?</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={() => setDeleteSetConfirm(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                      <button onClick={() => { setGymSets(prev => { const loc = entry.location; return { ...prev, [loc]: (prev[loc] || []).filter(e => e.id !== entry.id) }; }); setSelectedSetClimb(null); setDeleteSetConfirm(false); }} style={{ padding: "9px", background: "#b91c1c", border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Delete Forever</button>
                    </div>
                  </div>
              }
            </div>
          </div>
          {/* Send to Friend modal (single climb) */}
          {showSendSingleClimb && (() => {
            const handleSendSingle = async () => {
              if (!sendToUser || sendingClimbs) return;
              setSendingClimbs(true);
              const { photo } = entryStats(entry);
              const stripped = [{ id: `shared_${Date.now()}_${entry.id}`, name: entry.name || "", grade: entry.grade || "", scale: entry.scale || "V-Scale", color: entry.color || null, wallTypes: entry.wallTypes || [], holdTypes: entry.holdTypes || [], climbType: entry.climbType || "boulder", photo: photo || null, section: entry.section || null }];
              await sendClimbsToFriend(stripped, sendToUser.username);
              setSendingClimbs(false);
              const _sentTo2 = sendToUser.username;
              setShowSendSingleClimb(false);
              setSendToUser(null);
              setToastMsg(`Sent to @${_sentTo2}`);
              setTimeout(() => setToastMsg(null), 2500);
            };
            return (
              <div onClick={() => setShowSendSingleClimb(false)} style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "75vh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)" }}>
                  <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${W.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 900, fontSize: 17, color: W.text }}>Send to Friend</div>
                      <button onClick={() => setShowSendSingleClimb(false)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ fontSize: 12, color: W.textMuted, marginTop: 4 }}>📤 {entry.name || entry.grade} · {entry.grade}</div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 16px" }}>
                    {sendMutuals === null && <div style={{ textAlign: "center", color: W.textMuted, padding: "30px 0", fontSize: 13 }}>Loading friends…</div>}
                    {sendMutuals !== null && sendMutuals.length === 0 && <div style={{ textAlign: "center", color: W.textDim, padding: "30px 0", fontSize: 13 }}>No mutual follows yet.</div>}
                    {(sendMutuals || []).map(m => (
                      <div key={m.username} onClick={() => setSendToUser(sendToUser?.username === m.username ? null : m)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: sendToUser?.username === m.username ? W.accent + "18" : W.surface, border: `1.5px solid ${sendToUser?.username === m.username ? W.accent : W.border}`, borderRadius: 14, marginBottom: 8, cursor: "pointer" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${sendToUser?.username === m.username ? W.accent : W.border}`, background: sendToUser?.username === m.username ? W.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {sendToUser?.username === m.username && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: W.text }}>{m.displayName}</div>
                          <div style={{ fontSize: 12, color: W.textMuted }}>@{m.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "12px 16px 16px", flexShrink: 0, borderTop: `1px solid ${W.border}` }}>
                    <button disabled={!sendToUser || sendingClimbs} onClick={handleSendSingle} style={{ width: "100%", padding: "13px", background: sendToUser ? W.accent : W.surface2, border: "none", borderRadius: 14, color: sendToUser ? "#fff" : W.textDim, fontWeight: 700, fontSize: 15, cursor: sendToUser ? "pointer" : "default" }}>
                      {sendingClimbs ? "Sending…" : "Send Climb"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Share modal */}
          {showClimbShare && (
            <div onClick={() => setShowClimbShare(false)} style={{ position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 340, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
                {entryPhoto ? (
                  <div style={{ position: "relative", height: 200 }}>
                    <img src={entryPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.72))" }} />
                    <div style={{ position: "absolute", bottom: 14, left: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: gradeColor, color: "#fff", borderRadius: 8, padding: "5px 14px", fontWeight: 900, fontSize: 22, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>{entry.grade}</div>
                      {colorEntry && <div style={{ width: 22, height: 22, borderRadius: "50%", background: colorEntry.hex, border: "2.5px solid rgba(255,255,255,0.85)" }} />}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: gradeColor + "25", padding: "22px 20px 14px", borderBottom: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ background: gradeColor, color: "#fff", borderRadius: 12, padding: "8px 20px", fontWeight: 900, fontSize: 26 }}>{entry.grade}</div>
                    {colorEntry && <div style={{ width: 24, height: 24, borderRadius: "50%", background: colorEntry.hex, border: `2px solid ${W.border}`, flexShrink: 0 }} />}
                    {colorEntry && <span style={{ fontSize: 13, color: W.textMuted, fontWeight: 600 }}>{colorEntry.label}</span>}
                  </div>
                )}
                <div style={{ padding: "16px 18px 20px" }}>
                  {entry.name && <div style={{ fontWeight: 900, fontSize: 20, color: W.text, marginBottom: 2 }}>{entry.name}</div>}
                  {entry.location && <div style={{ fontSize: 12, color: W.textMuted, marginBottom: 14 }}>📍 {entry.location}</div>}
                  <div style={{ display: "flex", gap: 0, marginBottom: 16, background: W.surface, borderRadius: 14, overflow: "hidden", border: `1px solid ${W.border}` }}>
                    {[
                      { val: relatedEntries.length, label: "Sessions" },
                      { val: totalAttempts, label: "Attempts" },
                      { val: totalSends, label: "Sends", color: totalSends > 0 ? W.greenDark : undefined },
                      ...(totalTimeSec > 0 ? [{ val: formatDuration(totalTimeSec), label: "Time" }] : []),
                    ].map((s, i, arr) => (
                      <div key={i} style={{ flex: 1, padding: "10px 4px", textAlign: "center", borderRight: i < arr.length - 1 ? `1px solid ${W.border}` : "none" }}>
                        <div style={{ fontWeight: 900, fontSize: 18, color: s.color || W.text }}>{s.val}</div>
                        <div style={{ fontSize: 10, color: W.textMuted, marginTop: 1 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: W.textMuted, textAlign: "center", marginBottom: 14, fontWeight: 600, letterSpacing: 0.3 }}>Logged with SendLog</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {typeof navigator?.share === "function" && (
                      <button onClick={() => {
                        const text = `${entry.name ? entry.name + " — " : ""}${entry.grade}${entry.location ? " at " + entry.location : ""}\n${totalSends > 0 ? `✓ Sent ${totalSends}×` : "Still projecting"} · ${totalAttempts} attempts · ${relatedEntries.length} session${relatedEntries.length !== 1 ? "s" : ""}\n\nLogged with SendLog`;
                        navigator.share({ title: entry.name || entry.grade, text }).catch(() => {});
                      }} style={{ flex: 1, padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Share</button>
                    )}
                    <button onClick={() => {
                      const text = `${entry.name ? entry.name + " — " : ""}${entry.grade}${entry.location ? " at " + entry.location : ""}\n${totalSends > 0 ? `✓ Sent ${totalSends}×` : "Still projecting"} · ${totalAttempts} attempts · ${relatedEntries.length} session${relatedEntries.length !== 1 ? "s" : ""}\n\nLogged with SendLog`;
                      navigator.clipboard?.writeText(text);
                      setShowClimbShare(false);
                    }} style={{ flex: 1, padding: "11px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Copy Text</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Merge Climb Picker */}
          {showMergeClimbPicker && (() => {
            const loc = entry.location;
            const allInGym = (gymSets[loc] || []).filter(e => e.id !== entry.id);
            // Sort: source section first, then same grade first, then rest
            const srcSection = entry.section || "";
            const srcGrade = entry.grade || "";
            const sorted = [...allInGym].sort((a, b) => {
              const aSection = (a.section || "") === srcSection ? 0 : 1;
              const bSection = (b.section || "") === srcSection ? 0 : 1;
              if (aSection !== bSection) return aSection - bSection;
              const aGrade = a.grade === srcGrade ? 0 : 1;
              const bGrade = b.grade === srcGrade ? 0 : 1;
              return aGrade - bGrade;
            });
            // Group by section
            const sections = [];
            const seen = new Set();
            sorted.forEach(e => { const s = e.section || ""; if (!seen.has(s)) { seen.add(s); sections.push(s); }});
            const bySection = {};
            sorted.forEach(e => { const s = e.section || ""; if (!bySection[s]) bySection[s] = []; bySection[s].push(e); });
            const getPhoto = (id) => sessions.flatMap(s => (s.climbs||[]).filter(c => c.setClimbId === id && c.photo)).map(c => c.photo)[0] || null;
            return (
              <div onClick={() => setShowMergeClimbPicker(false)} style={{ position: "fixed", inset: 0, zIndex: 800, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                <div onClick={e => e.stopPropagation()} style={{ background: W.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: "env(safe-area-inset-bottom)" }}>
                  <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${W.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 900, fontSize: 17, color: W.text }}>Transfer Session Data</div>
                      <button onClick={() => setShowMergeClimbPicker(false)} style={{ background: "none", border: "none", color: W.textMuted, fontSize: 20, cursor: "pointer" }}>×</button>
                    </div>
                    <div style={{ fontSize: 12, color: W.textMuted, marginTop: 4 }}>Which climb should receive the session data from <span style={{ fontWeight: 700, color: W.text }}>{entry.name || entry.grade}</span>?</div>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "14px 16px" }}>
                    {allInGym.length === 0 && <div style={{ textAlign: "center", color: W.textMuted, padding: "30px 0", fontSize: 13 }}>No other climbs in this gym.</div>}
                    {sections.map(sec => (
                      <div key={sec || "__"} style={{ marginBottom: 16 }}>
                        {(sec || sections.length > 1) && <div style={{ fontSize: 10, fontWeight: 800, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{sec || "Other"}{sec === srcSection ? " · same section" : ""}</div>}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {(bySection[sec] || []).map(e => {
                            const gc = getGradeColor(e.grade);
                            const photo = getPhoto(e.id);
                            const ce = CLIMB_COLORS.find(cc => cc.id === e.color);
                            const isSel = mergeTargetId === e.id;
                            return (
                              <div key={e.id} onClick={() => setMergeTargetId(isSel ? null : e.id)} style={{ border: `2px solid ${isSel ? W.accent : W.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", position: "relative", minHeight: 140, background: photo ? "transparent" : W.surface }}>
                                {photo ? <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${gc}18, ${W.surface2})` }} />}
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: photo ? "linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)" : `linear-gradient(to top, ${W.surface}cc 0%, transparent 100%)`, zIndex: 1 }} />
                                {isSel && <div style={{ position: "absolute", inset: 0, background: `${W.accent}33`, zIndex: 3, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: W.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>✓</div></div>}
                                <div style={{ position: "absolute", top: 6, right: 6, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                                  {e.name && <div style={{ fontSize: 9, fontWeight: 800, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>}
                                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                                    <div style={{ background: gc, color: "#fff", borderRadius: 5, padding: "1px 6px", fontWeight: 900, fontSize: 11, boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>{e.grade}</div>
                                    {e.grade === srcGrade && <div style={{ background: W.accent + "cc", color: "#fff", borderRadius: 4, padding: "1px 4px", fontSize: 8, fontWeight: 800 }}>same</div>}
                                    {ce && <div style={{ width: 11, height: 11, borderRadius: "50%", background: ce.hex, border: "1px solid rgba(255,255,255,0.8)" }} />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {mergeTargetId && (
                    <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${W.border}`, flexShrink: 0 }}>
                      <button onClick={() => {
                        // Transfer: update all sessions where setClimbId === entry.id → mergeTargetId
                        const targetEntry = (gymSets[loc] || []).find(e => e.id === mergeTargetId);
                        if (!targetEntry) return;
                        setSessions(prev => prev.map(s => ({
                          ...s,
                          climbs: (s.climbs || []).map(c => {
                            if (c.setClimbId !== entry.id) return c;
                            return { ...c, setClimbId: targetEntry.id, name: targetEntry.name || c.name, wallTypes: targetEntry.wallTypes?.length ? targetEntry.wallTypes : c.wallTypes, holdTypes: targetEntry.holdTypes?.length ? targetEntry.holdTypes : c.holdTypes, section: targetEntry.section || c.section };
                          }),
                        })));
                        setShowMergeClimbPicker(false);
                        setShowMergeResult(true);
                      }} style={{ width: "100%", padding: "14px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>Confirm Transfer</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Merge Result — delete source option */}
          {showMergeResult && (
            <div style={{ position: "fixed", inset: 0, zIndex: 810, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: W.bg, borderRadius: 20, width: "100%", maxWidth: 380, padding: 24, boxShadow: "0 8px 40px rgba(0,0,0,0.45)" }}>
                <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 900, fontSize: 18, color: W.text, textAlign: "center", marginBottom: 8 }}>Session data transferred!</div>
                <div style={{ fontSize: 13, color: W.textMuted, textAlign: "center", marginBottom: 20 }}>Would you like to delete <span style={{ fontWeight: 700, color: W.text }}>{entry.name || entry.grade}</span> from the gym now?</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => {
                    setGymSets(prev => { const l = entry.location; return { ...prev, [l]: (prev[l] || []).filter(e2 => e2.id !== entry.id) }; });
                    setShowMergeResult(false);
                    setSelectedSetClimb(null);
                  }} style={{ padding: "12px", background: "#b91c1c", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Yes, Delete It</button>
                  <button onClick={() => { setShowMergeResult(false); setSelectedSetClimb(null); }} style={{ padding: "12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Keep It</button>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    })()}

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: W.text, color: W.bg, borderRadius: 20, padding: "10px 20px", fontSize: 13, fontWeight: 700, zIndex: 9999, pointerEvents: "none", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>{toastMsg}</div>
      )}
    </ThemeCtx.Provider>
    </ErrorBoundary>
  );
}