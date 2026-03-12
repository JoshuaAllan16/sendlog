import { useState } from "react";
import { useTheme } from "./theme.js";
import { CLIMB_COLORS, getGradeColor, formatDuration, formatRestSec } from "./constants.js";

// §COLOR_DOT
export const ColorDot = ({ colorId, size = 12 }) => {
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
export const LocationDropdown = ({ value, onChange, open, setOpen, knownLocations, onRemove }) => {
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
        <div onClick={() => { setOpen(false); setAddPopup(true); }} style={{ padding: "11px 14px", cursor: "pointer", color: W.accent, fontSize: 13, fontWeight: 700, borderTop: `1px solid ${W.border}`, display: "flex", alignItems: "center", gap: 6 }}>＋ Add new gym location</div>
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
                  <input type="number" min="0" step="0.01" value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="Time in seconds (e.g. 14.83)" autoFocus style={{ width: "100%", padding: "10px 12px", background: W.surface, border: `2px solid ${W.accent}`, borderRadius: 10, color: W.text, fontSize: 16, fontWeight: 800, boxSizing: "border-box", marginBottom: 10, fontFamily: "inherit" }} />
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
export const ActiveClimbCard = ({ climb, onEdit, onStartClimbing, onEndAttempt, onUpdateTries, onToggleCompleted, onLogRope, onRemove, onLightbox, onPauseClimb, onResumeClimb, sessionCount }) => {
  const W = useTheme();
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
    + (climb.climbingStartedAt ? Date.now() - climb.climbingStartedAt + (climb.pausedWorkedMs || 0) : (climb.pausedWorkedMs || 0)) : 0;

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
          {!isRope && totalWorkedMs > 0 && (() => {
            const totalAttempts = (climb.attemptLog || []).length + (climb.climbingStartedAt ? 1 : 0);
            const timeColor = climb.completed ? W.greenDark : W.accent;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: timeColor, fontVariantNumeric: "tabular-nums" }}>{formatDuration(Math.floor(totalWorkedMs / 1000))}</span>
                <span style={{ fontSize: 11, color: W.textDim, fontWeight: 600 }}>worked</span>
                {totalAttempts > 0 && <><span style={{ fontSize: 11, color: W.textDim }}>·</span><span style={{ fontSize: 11, color: W.textDim, fontWeight: 600 }}>{totalAttempts} {totalAttempts === 1 ? "attempt" : "attempts"}</span></>}
                {sessionCount != null && sessionCount > 1 && <><span style={{ fontSize: 11, color: W.textDim }}>·</span><span style={{ fontSize: 11, color: W.textDim, fontWeight: 600 }}>{sessionCount} sessions</span></>}
              </div>
            );
          })()}
          {climb.comments && <div style={{ fontSize: 11, color: W.textDim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{climb.comments}</div>}
          <TagChips wallTypes={climb.wallTypes} holdTypes={climb.holdTypes} />
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => onEdit(climb)} style={{ background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, color: W.accent, fontWeight: 700, cursor: "pointer" }}>Edit</button>
          <button onClick={() => setConfirmRemove(true)} style={{ background: "none", border: "none", color: W.redDark, cursor: "pointer", fontSize: 16, padding: "0 2px" }}>🗑</button>
        </div>
      </div>

      {/* Boulder action bar — only shown when NOT actively climbing (timer+actions rendered in timer area when climbing) */}
      {!isRope && !climb.climbingStartedAt && (
        <div style={{ borderTop: `1px solid ${W.border}`, background: climb.completed ? W.green + "55" : W.surface2 }}>
          <button onClick={() => onToggleCompleted(climb.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer" }}>
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
              {/* Timer + Pause row — above falls/mark sent */}
              <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 12, background: isRope ? W.purple + "33" : W.green + "44" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: isRope ? W.purpleDark : W.greenDark, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700, marginBottom: 2 }}>Working on for</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: isRope ? W.purpleDark : W.greenDark, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {formatDuration(Math.max(0, Math.floor(((Date.now() - climb.climbingStartedAt) + (climb.pausedWorkedMs || 0)) / 1000)))}
                  </div>
                </div>
                {isRope
                  ? <button onClick={handleDone} style={{ padding: "10px 18px", background: W.purple, border: `2px solid ${W.purpleDark}`, borderRadius: 12, color: W.purpleDark, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Done</button>
                  : <button onClick={() => onPauseClimb(climb.id)} style={{ padding: "10px 16px", background: W.surface, border: `2px solid ${W.border}`, borderRadius: 12, color: W.textMuted, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Pause</button>
                }
              </div>
              {/* Falls + Mark Sent row — below timer, only for boulder */}
              {!isRope && (
                <div style={{ display: "flex", borderTop: `1px solid ${W.border}` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 12px", borderRight: `1px solid ${W.border}`, background: W.surface2 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 30, fontWeight: 900, color: W.text, lineHeight: 1 }}>{climb.tries}</div>
                      <div style={{ fontSize: 10, color: W.textDim, textTransform: "uppercase", letterSpacing: 0.8 }}>{climb.tries === 1 ? "fall" : "falls"}</div>
                    </div>
                    <button onClick={() => onUpdateTries(climb.id, 1)} style={{ width: 48, height: 48, borderRadius: 12, border: `2px solid ${W.border}`, background: W.surface, color: W.text, fontSize: 26, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                  <button onClick={() => onToggleCompleted(climb.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "14px 10px", border: "none", background: climb.completed ? W.green : W.surface2, cursor: "pointer", gap: 5 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, border: `2.5px solid ${W.greenDark}`, background: climb.completed ? W.greenDark : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {climb.completed && <span style={{ color: "#fff", fontSize: 17, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: W.greenDark }}>{climb.completed ? "Sent!" : "Mark Sent"}</span>
                  </button>
                </div>
              )}
              {!isRope && (climb.fallLog || []).length > 0 && (
                <div style={{ padding: "4px 14px 8px", display: "flex", gap: 5, flexWrap: "wrap" }}>
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
              <button onClick={() => onStartClimbing(climb.id)} style={{ flex: restSec !== null ? "0 0 auto" : 1, padding: isRope ? "10px 18px" : "14px 20px", background: isRope ? W.purple : W.green, border: `2px solid ${isRope ? W.purpleDark : W.greenDark}`, borderRadius: 12, color: isRope ? W.purpleDark : W.greenDark, fontWeight: 800, fontSize: isRope ? 13 : 16, cursor: "pointer" }}>
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
