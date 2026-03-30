import { useState } from "react";
import { useTheme } from "./theme.js";
import { CLIMB_COLORS, getGradeColor, formatDuration, formatRestSec } from "./constants.js";

// §COLOR_DOT
export const ColorDot = ({ colorId, size = 16 }) => {
  if (!colorId) return null;
  const c = CLIMB_COLORS.find(c => c.id === colorId);
  if (!c) return null;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: c.hex,
      border: c.id === "white" ? "2px solid #c8a882" : "2px solid rgba(0,0,0,0.22)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
      display: "inline-block",
    }} title={c.label} />
  );
};

// §TAG_CHIPS
export const TagChips = ({ wallTypes = [], holdTypes = [] }) => {
  const W = useTheme();
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

// §LOCATION_DROPDOWN
export const LocationDropdown = ({ value, onChange, open, setOpen, knownLocations, onRemove, onAddNew }) => {
  const W = useTheme();
  const [addPopup, setAddPopup] = useState(false);
  const [newGymInput, setNewGymInput] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const handleAddConfirm = () => {
    const trimmed = newGymInput.trim();
    if (trimmed) onChange(trimmed);
    setNewGymInput(""); setAddPopup(false);
  };
  return (
  <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
    <button onClick={() => setOpen(o => !o)} style={{ width: "100%", padding: "11px 14px", background: W.surface, border: `2px solid ${open ? W.accent : W.border}`, borderRadius: open ? "12px 12px 0 0" : "12px", color: value ? W.text : W.textDim, fontSize: 14, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "inherit", fontWeight: value ? 600 : 400 }}>
      <span>📍 {value || "Select a location"}</span>
      <span style={{ color: W.textMuted, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
    </button>
    {open && (
      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: W.surface, border: `2px solid ${W.accent}`, borderTop: "none", borderRadius: "0 0 12px 12px", zIndex: 100, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 20px rgba(0,0,0,0.12)" }}>
        {knownLocations.length === 0 && <div style={{ padding: "12px 14px", color: W.textDim, fontSize: 13 }}>No locations yet — add one below</div>}
        {knownLocations.map(loc => (
          <div key={loc} style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${W.border}`, background: loc === value ? W.accent + "14" : "transparent" }}>
            <div onClick={() => { onChange(loc); setOpen(false); }} style={{ flex: 1, padding: "10px 14px", cursor: "pointer", color: loc === value ? W.accent : W.text, fontSize: 14, fontWeight: loc === value ? 700 : 400 }}>📍 {loc}{loc === value ? " ✓" : ""}</div>
            {onRemove && (removeConfirm === loc
              ? <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 8px" }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { onRemove(loc); setRemoveConfirm(null); }} style={{ background: W.redDark, border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                  <button onClick={() => setRemoveConfirm(null)} style={{ background: "none", border: "none", color: W.textDim, fontSize: 13, cursor: "pointer" }}>✕</button>
                </div>
              : <button onClick={e => { e.stopPropagation(); setRemoveConfirm(loc); }} style={{ background: "none", border: "none", padding: "0 12px", cursor: "pointer", color: W.textDim, fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>
        ))}
        <div onClick={() => { setOpen(false); if (onAddNew) { onAddNew(""); } else { setAddPopup(true); } }} style={{ padding: "11px 14px", cursor: "pointer", color: W.accent, fontSize: 13, fontWeight: 700, borderTop: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 6 }}>＋ Add new gym location</div>
      </div>
    )}
    {addPopup && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => { setAddPopup(false); setNewGymInput(""); }}>
        <div style={{ background: W.surface, borderRadius: 18, padding: "24px", width: "100%", maxWidth: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
          <div style={{ fontWeight: 800, color: W.text, fontSize: 16, marginBottom: 14 }}>New Gym Location</div>
          <input autoFocus value={newGymInput} onChange={e => setNewGymInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddConfirm()} placeholder="e.g. Boulder Barn" style={{ width: "100%", padding: "11px 14px", background: W.surface2, border: `2px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 15, boxSizing: "border-box", fontFamily: "inherit", marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={() => { setAddPopup(false); setNewGymInput(""); }} style={{ padding: "11px", background: "transparent", border: `1px solid ${W.border}`, borderRadius: 10, color: W.textMuted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
            <button onClick={handleAddConfirm} style={{ padding: "11px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Add</button>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

// §SPEED_SESSION_CARD
export const SpeedSessionCard = ({ climb, tick, index, totalCount, onAddAttempt, onRemove, onEnd, onPause, onResume }) => {
  const W = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [timeInput, setTimeInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const isEnded = !!climb.endedAt;
  const attempts = climb.attempts || [];
  const lastTs = attempts.length > 0 ? attempts[attempts.length - 1].loggedAt : climb.startedAt;
  const restSec = isEnded ? 0 : Math.max(0, Math.floor((Date.now() - lastTs) / 1000));
  const speedTotalSec = climb.speedTotalSec || 0;
  const speedActiveStart = climb.speedActiveStart || null;
  const isActive = !isEnded && !!speedActiveStart;
  const isPausedSpeed = !isEnded && !speedActiveStart;
  const sessionDurationSec = isEnded
    ? Math.floor((climb.endedAt - climb.startedAt) / 1000)
    : speedTotalSec + (speedActiveStart ? Math.max(0, Math.floor((Date.now() - speedActiveStart) / 1000)) : 0);
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
      <div style={{ background: W.yellow, padding: "14px" }}>
        {/* Row 1: label + badges | × + collapse icon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ fontWeight: 800, color: W.yellowDark, fontSize: 18 }}>{sessionLabel}</div>
            {isEnded    && <span style={{ background: W.yellowDark, color: W.yellow, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ENDED</span>}
            {isActive   && <span style={{ background: `${W.yellowDark}33`, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
            {isPausedSpeed && <span style={{ background: `${W.yellowDark}22`, color: W.yellowDark, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <button onClick={onRemove} style={{ background: "none", border: `1px solid ${W.yellowDark}44`, borderRadius: 7, color: W.yellowDark, fontSize: 14, cursor: "pointer", padding: "2px 7px", opacity: 0.7 }}>×</button>
            <button onClick={() => setCollapsed(c => !c)} style={{ background: "none", border: `1px solid ${W.yellowDark}44`, borderRadius: 7, color: W.yellowDark, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>
              {collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>
        {/* Row 2: timer */}
        <div style={{ fontSize: 48, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1, marginBottom: 6 }}>{formatDuration(sessionDurationSec)}</div>
        {bestTime != null && <div style={{ fontSize: 11, color: W.yellowDark, opacity: 0.85, marginBottom: 6 }}>Best: {bestTime.toFixed(2)}s · {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</div>}
        {/* Row 3: subtitle | End + Pause/Resume */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: bestTime == null ? 6 : 0 }}>
          <div>
            {!isEnded && attempts.length === 0 && isActive && <div style={{ fontSize: 10, color: W.yellowDark, opacity: 0.6 }}>Add your first attempt below</div>}
            {!isEnded && isPausedSpeed && <div style={{ fontSize: 10, color: W.yellowDark, opacity: 0.6 }}>Session paused</div>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!isEnded && <button onClick={onEnd} style={{ background: W.yellowDark, border: "none", color: W.yellow, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>End</button>}
            {!isEnded && <button onClick={isActive ? onPause : onResume} style={{ background: "none", border: `2px solid ${W.yellowDark}`, color: W.yellowDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "6px 12px", borderRadius: 8 }}>
              {isActive ? "Pause" : "Resume"}
            </button>}
          </div>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Attempts list */}
          {attempts.length > 0 && (
            <div style={{ padding: "6px 14px 4px" }}>
              {attempts.map((a, i) => {
                const prevTs = i === 0 ? climb.startedAt : attempts[i - 1].loggedAt;
                const restBefore = Math.floor((a.loggedAt - prevTs) / 1000);
                return (
                  <div key={a.id}>
                    {i > 0 && <div style={{ textAlign: "center", fontSize: 10, color: W.textDim, padding: "2px 0" }}>↕ {formatRestSec(restBefore)} rest</div>}
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
              <div style={{ textAlign: "center", padding: attempts.length > 0 ? "8px 14px" : "12px 14px", background: W.surface2, borderTop: attempts.length > 0 ? `1px solid ${W.border}` : "none" }}>
                <div style={{ fontSize: 10, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{attempts.length === 0 ? "Ready to start" : "Resting"}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>{formatDuration(restSec)}</div>
              </div>
              {showForm ? (
                <div style={{ padding: "12px 14px", borderTop: `1px solid ${W.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, marginBottom: 8 }}>Log Attempt</div>
                  <input type="text" inputMode="decimal" pattern="[0-9.]*" value={timeInput} onChange={e => setTimeInput(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Time in seconds (e.g. 14.83)" autoFocus style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 16, fontWeight: 800, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />
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
        </>
      )}
    </div>
  );
};

// §BOULDER_ROPE_SESSION_CARD
export const BoulderRopeSessionCard = ({ type, totalSec, activeStart, isEnded, tick, onPause, onResume, pausedAt, collapsed, onToggleCollapse }) => {
  const W = useTheme();
  const liveSec = !isEnded && activeStart
    ? Math.max(0, Math.floor((Date.now() - activeStart) / 1000))
    : 0;
  const displaySec = (totalSec || 0) + liveSec;
  const pausedForSec = pausedAt ? Math.max(0, Math.floor((Date.now() - pausedAt) / 1000)) : 0;
  const isBoulder = type === "boulder";
  const color     = isBoulder ? W.green  : W.purple;
  const darkColor = isBoulder ? W.greenDark : W.purpleDark;
  const label     = isBoulder ? "Boulder Session" : "Rope Session";
  const isActive  = !isEnded && !!activeStart;
  const isPaused  = !isEnded && !activeStart;
  return (
    <div style={{ borderRadius: 14, border: `2px solid ${darkColor}55`, marginBottom: 10, overflow: "hidden", background: W.surface }}>
      <div style={{ background: color, padding: "14px" }}>
        {/* Row 1: label + badges | collapse icon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ fontWeight: 800, color: darkColor, fontSize: 18 }}>{label}</div>
            {isEnded  && <span style={{ background: darkColor, color: color, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ENDED</span>}
            {isActive && <span style={{ background: `${darkColor}33`, color: darkColor, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>ACTIVE</span>}
            {isPaused && (totalSec || 0) > 0 && <span style={{ background: `${darkColor}22`, color: darkColor, borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 800 }}>PAUSED</span>}
          </div>
          <button onClick={onToggleCollapse} style={{ background: "none", border: `1px solid ${darkColor}44`, borderRadius: 7, color: darkColor, fontSize: 14, cursor: "pointer", padding: "3px 9px", lineHeight: 1 }}>
            {collapsed ? "▼" : "▲"}
          </button>
        </div>
        {/* Row 2: timer */}
        <div style={{ fontSize: 48, fontWeight: 900, color: darkColor, fontVariantNumeric: "tabular-nums", letterSpacing: 1, lineHeight: 1, marginBottom: 8 }}>{formatDuration(displaySec)}</div>
        {/* Row 3: subtitle | pause/resume */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            {isPaused && (totalSec || 0) === 0 && <div style={{ fontSize: 10, color: darkColor, opacity: 0.6 }}>Timer starts when you begin climbing</div>}
            {isPaused && pausedForSec > 0 && <div style={{ fontSize: 10, color: darkColor, opacity: 0.65 }}>Paused {formatDuration(pausedForSec)} ago</div>}
          </div>
          {!isEnded && (isActive || (isPaused && (totalSec || 0) > 0)) && (
            <button onClick={isActive ? onPause : onResume} style={{ background: darkColor, border: "none", color: color, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "7px 14px", borderRadius: 8 }}>
              {isActive ? "Pause" : "Resume"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// §ACTIVE_CLIMB_CARD
export const ActiveClimbCard = ({ climb, onEdit, onStartClimbing, onEndAttempt, onUpdateTries, onToggleCompleted, onLogRope, onRemove, onLightbox, onPauseClimb, onResumeClimb, onClimbAgain, sessionCount, lapNumber }) => {
  const W = useTheme();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showRopeLog, setShowRopeLog] = useState(false);
  const [ropeLogFalls, setRopeLogFalls] = useState(0);
  const [ropeLogTakes, setRopeLogTakes] = useState(0);
  const [ropeLogTopped, setRopeLogTopped] = useState(false);

  const isFlash = climb.completed && climb.tries === 0;
  const isRope = climb.climbType === "rope";
  const hasPhoto = !!climb.photo;
  const isActivelyClimbing = !!climb.climbingStartedAt;
  const isQueued = !climb.completed && (climb.tries || 0) === 0 && !climb.climbingStartedAt && !climb.lastAttemptEndedAt && !climb.paused;

  const restSec = !climb.climbingStartedAt && !climb.paused && climb.lastAttemptEndedAt
    ? Math.max(0, Math.floor((Date.now() - climb.lastAttemptEndedAt) / 1000)) : null;
  const showReady = restSec !== null && restSec >= 180;
  const totalWorkedMs = !isRope ? (climb.attemptLog || []).reduce((sum, a) => sum + a.duration, 0)
    + (climb.climbingStartedAt ? Date.now() - climb.climbingStartedAt + (climb.pausedWorkedMs || 0) : (climb.pausedWorkedMs || 0)) : 0;

  const handleDone = () => { onEndAttempt(climb.id); setShowRopeLog(true); setRopeLogFalls(0); setRopeLogTakes(0); setRopeLogTopped(false); };
  const handleRopeSave = () => { onLogRope(climb.id, ropeLogFalls, ropeLogTakes, ropeLogTopped); setShowRopeLog(false); };

  // Photo-adaptive colors — when card has a photo background, use white text on dark overlay
  const T = hasPhoto ? {
    text: "#fff",
    textMuted: "rgba(255,255,255,0.85)",
    textDim: "rgba(255,255,255,0.6)",
    border: "rgba(255,255,255,0.18)",
    sectionBg: "rgba(0,0,0,0.38)",
    activeBg: isRope ? "rgba(88,28,135,0.55)" : "rgba(20,83,45,0.55)",
    completedBg: "rgba(20,83,45,0.5)",
    surface: "rgba(0,0,0,0.3)",
    accent: "#86efac",
    greenDark: "#86efac",
    purpleDark: "#d8b4fe",
  } : {
    text: W.text,
    textMuted: W.textMuted,
    textDim: W.textDim,
    border: W.border,
    sectionBg: W.surface2,
    activeBg: isRope ? W.purple + "33" : W.green + "44",
    completedBg: W.green + "55",
    surface: W.surface,
    accent: W.accent,
    greenDark: W.greenDark,
    purpleDark: W.purpleDark,
  };

  // Boulder: running attempt timer or accumulated worked time
  const boulderTimerSec = isActivelyClimbing
    ? Math.max(0, Math.floor(((Date.now() - climb.climbingStartedAt) + (climb.pausedWorkedMs || 0)) / 1000))
    : Math.floor(totalWorkedMs / 1000);
  const hasBoulderTimer = !isRope && (isActivelyClimbing || totalWorkedMs > 0);
  const fallCount = (climb.fallLog || []).length;
  const boulderAttemptCount = fallCount + (isActivelyClimbing ? 1 : 0);
  const lastFallAt = fallCount > 0 ? climb.fallLog[fallCount - 1].at : null;
  const currentAttemptStart = isActivelyClimbing
    ? (lastFallAt && lastFallAt > climb.climbingStartedAt ? lastFallAt : climb.climbingStartedAt)
    : null;
  const currentAttemptSec = currentAttemptStart
    ? Math.max(0, Math.floor((Date.now() - currentAttemptStart) / 1000))
    : 0;

  const outerBorderColor = climb.paused ? W.yellowDark + "99"
    : climb.completed ? W.greenDark
    : isActivelyClimbing ? W.greenDark
    : hasPhoto ? "transparent"
    : W.border;

  return (
    <div style={{
      position: "relative",
      borderRadius: 16,
      border: `2px solid ${outerBorderColor}`,
      marginBottom: isActivelyClimbing ? 14 : 10,
      overflow: "hidden",
      opacity: isQueued ? 0.55 : 1,
      boxShadow: isActivelyClimbing ? `0 0 0 2px ${W.greenDark}, 0 8px 28px ${W.greenDark}44` : hasPhoto ? "0 4px 14px rgba(0,0,0,0.28)" : "none",
      background: !isRope && !hasPhoto ? `linear-gradient(135deg, ${getGradeColor(climb.grade)}${isActivelyClimbing ? "50" : "2e"} 0%, ${W.surface} ${isActivelyClimbing ? "70%" : "55%"})` : W.surface,
    }}>
      {/* Photo background */}
      {hasPhoto && <>
        <img src={climb.photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: isActivelyClimbing
          ? "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.75) 100%)"
          : "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.68) 100%)", zIndex: 1 }} />
      </>}

      <div style={{ position: "relative", zIndex: 2, background: "transparent" }}>

        {/* ── BOULDER HEADER ── */}
        {!isRope && (isActivelyClimbing ? (
          /* ── ACTIVE CLIMBING: centered full-width layout ── */
          <div style={{ padding: "14px 14px 12px", position: "relative" }}>
            {/* Edit + delete pinned top-right */}
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 5, zIndex: 1 }}>
              <button onClick={() => onEdit(climb)} style={{ background: T.sectionBg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: hasPhoto ? "#fff" : W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
              <button onClick={() => setConfirmRemove(true)} style={{ background: "none", border: "none", color: hasPhoto ? "rgba(255,120,120,0.9)" : W.redDark, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>🗑</button>
            </div>
            {/* Grade + color — top left */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <div style={{ background: getGradeColor(climb.grade) + (hasPhoto ? "ee" : "cc"), color: "#fff", border: `1.5px solid ${getGradeColor(climb.grade)}`, borderRadius: 8, padding: "2px 8px", fontWeight: 900, fontSize: 14, lineHeight: 1 }}>{climb.grade}</div>
              {climb.color && <ColorDot colorId={climb.color} size={18} />}
              {climb.name && <span style={{ fontWeight: 700, color: T.textMuted, fontSize: 12 }}>{climb.name}</span>}
            </div>
            {/* Label */}
            <div style={{ textAlign: "center", fontSize: 9, color: T.greenDark, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 2 }}>Working on for</div>
            {/* Big centered timer */}
            <div style={{ textAlign: "center", fontSize: 60, fontWeight: 900, color: T.greenDark, fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 6 }}>{formatDuration(boulderTimerSec)}</div>
            {/* Status badges */}
            {(climb.isProject || lapNumber || sessionCount > 1) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
                {lapNumber && <span style={{ background: T.sectionBg, color: T.textMuted, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, border: `1px solid ${T.border}` }}>Lap {lapNumber}</span>}
                {sessionCount != null && sessionCount > 1 && <span style={{ fontSize: 10, color: T.textDim }}>{sessionCount} sessions</span>}
              </div>
            )}
          </div>
        ) : (
          /* ── NOT ACTIVELY CLIMBING: original two-column layout ── */
          <div style={{ display: "flex", gap: 12, padding: "16px 14px 12px", minHeight: 96 }}>
            {/* Left: timer / rest / grade */}
            <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 68 }}>
              {hasBoulderTimer ? (<>
                <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 1 }}>Worked</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: climb.completed ? T.greenDark : T.accent, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{formatDuration(boulderTimerSec)}</div>
                {boulderAttemptCount > 0 && <div style={{ fontSize: 10, color: T.textDim, marginTop: 3 }}>{boulderAttemptCount} attempt{boulderAttemptCount !== 1 ? "s" : ""}</div>}
                {sessionCount != null && sessionCount > 1 && <div style={{ fontSize: 10, color: T.textDim }}>{sessionCount} sessions</div>}
              </>) : restSec !== null ? (<>
                <div style={{ fontSize: 9, color: showReady ? T.accent : T.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: showReady ? 700 : 400 }}>{showReady ? "⚡ Ready?" : "Resting"}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: showReady ? T.accent : T.textMuted, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{formatDuration(restSec)}</div>
              </>) : (
                <div style={{ width: 46, height: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, background: getGradeColor(climb.grade) + (hasPhoto ? "dd" : "30"), color: hasPhoto ? "#fff" : getGradeColor(climb.grade), border: `2px solid ${getGradeColor(climb.grade)}${hasPhoto ? "ff" : "60"}` }}>{climb.grade}</div>
              )}
            </div>
            {/* Right: grade + color + name + actions */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => onEdit(climb)} style={{ background: T.sectionBg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: hasPhoto ? "#fff" : W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                <button onClick={() => setConfirmRemove(true)} style={{ background: "none", border: "none", color: hasPhoto ? "rgba(255,120,120,0.9)" : W.redDark, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>🗑</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {hasBoulderTimer && <div style={{ background: getGradeColor(climb.grade) + (hasPhoto ? "dd" : "30"), color: hasPhoto ? "#fff" : getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}${hasPhoto ? "ff" : "60"}`, borderRadius: 8, padding: "2px 8px", fontWeight: 900, fontSize: 12 }}>{climb.grade}</div>}
                {climb.color && <ColorDot colorId={climb.color} size={18} />}
                {climb.name && <span style={{ fontWeight: 700, color: T.text, fontSize: 14, textAlign: "right" }}>{climb.name}</span>}
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
                {lapNumber && <span style={{ background: T.sectionBg, color: T.textMuted, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, border: `1px solid ${T.border}` }}>Lap {lapNumber}</span>}
                {isFlash && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>⚡ FLASH</span>}
                {climb.paused && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>⏸ PAUSED</span>}
                {isQueued && <span style={{ background: W.surface2, color: W.textDim, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, border: `1px solid ${W.border}` }}>QUEUED</span>}
              </div>
              {climb.comments && <div style={{ fontSize: 11, color: T.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{climb.comments}</div>}
              <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            </div>
          </div>
        ))}

        {/* ── ROPE HEADER (unchanged) ── */}
        {isRope && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0, background: getGradeColor(climb.grade) + (hasPhoto ? "dd" : "30"), color: hasPhoto ? "#fff" : getGradeColor(climb.grade), border: `1.5px solid ${getGradeColor(climb.grade)}${hasPhoto ? "ff" : "60"}` }}>{climb.grade}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {climb.color && <ColorDot colorId={climb.color} size={18} />}
                <span style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{climb.name || climb.grade}</span>
                {climb.isProject && <span style={{ background: W.pink, color: W.pinkDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>PROJECT</span>}
                {lapNumber && <span style={{ background: T.sectionBg, color: T.textMuted, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, border: `1px solid ${T.border}` }}>Lap {lapNumber}</span>}
                {climb.ropeStyle && <span style={{ background: W.purple, color: W.purpleDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{climb.ropeStyle === "top-rope" ? "🔝 TR" : "🧗 Lead"}</span>}
                {climb.paused && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>⏸ PAUSED</span>}
                {isQueued && <span style={{ background: W.surface2, color: W.textDim, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 700, border: `1px solid ${W.border}` }}>QUEUED</span>}
              </div>
              {climb.comments && <div style={{ fontSize: 11, color: T.textDim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
              <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
            </div>
            <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
              <button onClick={() => onEdit(climb)} style={{ background: T.sectionBg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: hasPhoto ? "#fff" : W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
              <button onClick={() => setConfirmRemove(true)} style={{ background: "none", border: "none", color: hasPhoto ? "rgba(255,120,120,0.9)" : W.redDark, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>🗑</button>
            </div>
          </div>
        )}

        {/* Rope attempt summary bar */}
        {isRope && (climb.tries > 0 || climb.completed) && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 14px", borderTop: `1px solid ${T.border}`, background: climb.completed ? T.completedBg : T.sectionBg }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{climb.tries}</div>
              <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{climb.tries === 1 ? "attempt" : "attempts"}</div>
            </div>
            <div style={{ width: 1, height: 28, background: T.border }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{climb.falls || 0}</div>
              <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{(climb.falls || 0) === 1 ? "fall" : "falls"}</div>
            </div>
            {(climb.takes || 0) > 0 && <><div style={{ width: 1, height: 28, background: T.border }} /><div style={{ textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{climb.takes}</div><div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{climb.takes === 1 ? "take" : "takes"}</div></div></>}
            {climb.completed && <><div style={{ width: 1, height: 28, background: T.border }} /><span style={{ background: W.green, color: W.greenDark, borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>✓ TOPPED</span></>}
          </div>
        )}

        {/* ── BOULDER attempt history rows ── */}
        {!isRope && !climb.completed && boulderAttemptCount > 0 && (
          <div style={{ padding: "6px 14px 8px", borderTop: `1px solid ${T.border}`, background: T.sectionBg }}>
            {(climb.fallLog || []).map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: T.textMuted, minWidth: 76 }}>Attempt {i + 1}:</span>
                <span style={{ fontWeight: 800, color: T.text, flex: 1 }}>{formatDuration(Math.floor(f.intervalMs / 1000))}</span>
                <span style={{ color: hasPhoto ? "#fca5a5" : W.redDark, fontWeight: 900, fontSize: 13 }}>✕</span>
              </div>
            ))}
            {isActivelyClimbing && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 12 }}>
                <span style={{ fontWeight: 700, color: T.greenDark, minWidth: 76 }}>Attempt {fallCount + 1}:</span>
                <span style={{ fontWeight: 800, color: T.greenDark, fontVariantNumeric: "tabular-nums" }}>{formatDuration(currentAttemptSec)}</span>
              </div>
            )}
          </div>
        )}

        {/* ── BOULDER action area ── */}
        {!isRope && !climb.completed && (
          <div style={{ borderTop: `1px solid ${T.border}` }}>
            {climb.climbingStartedAt ? (
              <div>
                {/* Mark Sent + Falls row */}
                <div style={{ display: "flex" }}>
                  <button onClick={() => onToggleCompleted(climb.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "22px 10px", border: "none", borderRight: `1px solid ${T.border}`, background: climb.completed ? (hasPhoto ? "rgba(20,83,45,0.55)" : W.green) : T.sectionBg, cursor: "pointer", gap: 5 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, border: `2.5px solid ${W.greenDark}`, background: climb.completed ? W.greenDark : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {climb.completed && <span style={{ color: "#fff", fontSize: 18, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: T.greenDark }}>{climb.completed ? (lapNumber > 1 ? `Lap ${lapNumber} sent` : "Sent!") : "Mark Sent"}</span>
                  </button>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "22px 12px", background: T.sectionBg }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 34, fontWeight: 900, color: T.text, lineHeight: 1 }}>{climb.tries}</div>
                      <div style={{ fontSize: 10, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.8 }}>{climb.tries === 1 ? "fall" : "falls"}</div>
                    </div>
                    <button onClick={() => onUpdateTries(climb.id, 1)} style={{ width: 62, height: 62, borderRadius: 14, border: "none", background: W.accentDark, color: "#fff", fontSize: 34, cursor: "pointer", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${W.accentGlow}` }}>+</button>
                  </div>
                </div>
              </div>
            ) : climb.paused ? (
              <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>⏸ Paused</div>
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>Attempt tracking paused</div>
                </div>
                <button onClick={() => onResumeClimb(climb.id)} style={{ padding: "9px 18px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 12, color: W.greenDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>▶ Resume</button>
              </div>
            ) : (
              /* Not actively climbing: just Start Climbing, no Mark Sent */
              <div style={{ padding: "12px 14px" }}>
                <button onClick={() => onStartClimbing(climb.id)} style={{ width: "100%", padding: "16px", background: W.green, border: `2px solid ${W.greenDark}`, borderRadius: 14, color: W.greenDark, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
                  {climb.tries === 0 ? "Start Climbing" : "Start Attempt"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ROPE timer / log area (unchanged logic) ── */}
        {isRope && !climb.completed && (
          <div style={{ borderTop: `1px solid ${T.border}`, background: climb.climbingStartedAt ? T.activeBg : T.sectionBg }}>
            {showRopeLog ? (
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Log This Attempt</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Falls</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setRopeLogFalls(f => Math.max(0, f - 1))} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 900, color: T.text }}>{ropeLogFalls}</div>
                      <button onClick={() => setRopeLogFalls(f => f + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Takes</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button onClick={() => setRopeLogTakes(t => Math.max(0, t - 1))} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                      <div style={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 900, color: T.text }}>{ropeLogTakes}</div>
                      <button onClick={() => setRopeLogTakes(t => t + 1)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontSize: 18, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <button onClick={() => setRopeLogTopped(t => !t)} style={{ width: "100%", padding: "8px 12px", background: ropeLogTopped ? W.green : T.surface, border: `2px solid ${ropeLogTopped ? W.greenDark : T.border}`, borderRadius: 10, color: ropeLogTopped ? W.greenDark : T.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{ropeLogTopped ? "✓ Topped!" : "Topped?"}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => setShowRopeLog(false)} style={{ padding: "9px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10, color: T.textMuted, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
                  <button onClick={handleRopeSave} style={{ padding: "9px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 10, color: W.purpleDark, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Log Attempt</button>
                </div>
              </div>
            ) : climb.climbingStartedAt ? (
              <div style={{ display: "flex", alignItems: "center", padding: "14px 14px", gap: 12, background: T.activeBg }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.purpleDark, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 2 }}>Working on for</div>
                  <div style={{ fontSize: 38, fontWeight: 900, color: T.purpleDark, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {formatDuration(Math.max(0, Math.floor(((Date.now() - climb.climbingStartedAt) + (climb.pausedWorkedMs || 0)) / 1000)))}
                  </div>
                </div>
                <button onClick={handleDone} style={{ padding: "12px 20px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 12, color: W.purpleDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", gap: 8 }}>
                {restSec !== null && (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: showReady ? T.accent : T.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: showReady ? 700 : 400 }}>{showReady ? "⚡ Ready?" : "Resting"}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: showReady ? T.accent : T.textMuted, fontVariantNumeric: "tabular-nums" }}>{formatDuration(restSec)}</div>
                  </div>
                )}
                <button onClick={() => onStartClimbing(climb.id)} style={{ flex: restSec !== null ? "0 0 auto" : 1, padding: "10px 18px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 12, color: W.purpleDark, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                  {climb.tries === 0 ? "Start Attempt" : "Start Attempt"}
                </button>
              </div>
            )}
            {(climb.attemptLog || []).length > 0 && !showRopeLog && (
              <div style={{ padding: "0 14px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(climb.attemptLog || []).map((a, i) => <span key={i} style={{ fontSize: 10, color: T.textDim, background: T.surface, borderRadius: 6, padding: "2px 7px", border: `1px solid ${T.border}` }}>#{i + 1} {formatDuration(Math.floor(a.duration / 1000))}</span>)}
              </div>
            )}
          </div>
        )}

        {/* ── PAUSE RIBBON — boulder only, when actively climbing ── */}
        {!isRope && isActivelyClimbing && !climb.completed && (
          <button onClick={() => onPauseClimb(climb.id)} style={{ width: "100%", padding: "11px", background: T.sectionBg, border: "none", borderTop: `1px solid ${T.border}`, color: T.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            ⏸ Pause
          </button>
        )}

        {confirmRemove && (
          <div style={{ background: hasPhoto ? "rgba(127,29,29,0.7)" : W.red, padding: "10px 14px", borderTop: `1px solid ${W.redDark}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: hasPhoto ? "#fca5a5" : W.redDark, fontWeight: 700 }}>Remove this climb?</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmRemove(false)} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.textMuted, cursor: "pointer", fontSize: 12 }}>No</button>
              <button onClick={() => onRemove(climb.id)} style={{ padding: "5px 12px", background: W.redDark, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Yes</button>
            </div>
          </div>
        )}
        {climb.completed && !confirmRemove && (onClimbAgain || onToggleCompleted) && (
          <div style={{ display: "flex", borderTop: `1px solid ${T.border}` }}>
            {onClimbAgain && (
              <button onClick={() => onClimbAgain(climb)} style={{ flex: 1, padding: "9px", background: "transparent", border: "none", borderRight: onToggleCompleted ? `1px solid ${T.border}` : "none", color: T.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↩ Climb Again</button>
            )}
            {onToggleCompleted && (
              <button onClick={() => onToggleCompleted(climb.id)} style={{ flex: 1, padding: "9px", background: "transparent", border: "none", color: T.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✕ Unsend</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
