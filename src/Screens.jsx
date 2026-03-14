import { useState } from "react";
import { useTheme } from "./theme.js";
import { ColorDot } from "./Components.jsx";
import { GRADES, ROPE_GRADES, getGradeColor, formatDate, formatDuration, formatTotalTime, formatRestSec } from "./constants.js";

// §SCREEN_PROJECT_DETAIL
// Props: project, history, totalTries, totalMs, photo, getGradeIndex,
//        updateProjectNotes, markProjectSent, deactivateProject, reactivateProject,
//        setScreen, setProfileTab
export const ProjectDetailScreen = ({
  project,
  history,
  totalTries,
  totalMs,
  photo,
  getGradeIndex,
  updateProjectNotes,
  markProjectSent,
  deactivateProject,
  reactivateProject,
  setScreen,
  setProfileTab,
}) => {
  const W = useTheme();
  const avgTriesPerSession = history.length ? (history.reduce((a, h) => a + h.tries, 0) / history.length).toFixed(1) : "—";
  const bestSession = history.length ? [...history].sort((a, b) => a.tries - b.tries)[0] : null;
  const climbType = project.climbType || (Object.keys(ROPE_GRADES).includes(project.scale) ? "rope" : "boulder");
  const [notes, setNotes] = useState(project.notes || "");
  const [notesSaved, setNotesSaved] = useState(true);
  const [selectedDot, setSelectedDot] = useState(null);
  const saveNotes = () => { updateProjectNotes(project.id, notes); setNotesSaved(true); };
  const headerBg = project.completed ? W.green : W.pink;
  const headerAccent = project.completed ? W.greenDark : W.pinkDark;
  return (
    <div style={{ padding: "24px 20px" }}>
      <div style={{ background: headerBg, borderRadius: 20, padding: "20px", marginBottom: 20, border: `1px solid ${headerAccent}30` }}>
        {photo && <div style={{ width: "100%", height: 160, borderRadius: 12, overflow: "hidden", marginBottom: 14, border: `1.5px solid ${headerAccent}30` }}><img src={photo} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /></div>}
        <div style={{ fontSize: 22, fontWeight: 900, color: W.text }}>{project.name || project.grade}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: getGradeColor(project.grade) }}>{project.grade}</span>
          {climbType === "rope" ? <span style={{ background: W.purple, color: W.purpleDark, borderRadius: 7, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Rope</span> : <span style={{ background: W.surface2, color: W.textDim, borderRadius: 7, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Boulder</span>}
          {project.completed && <span style={{ background: headerAccent, color: "#fff", borderRadius: 8, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>✓ SENT!</span>}
        </div>
        {project.comments && <div style={{ fontSize: 13, color: W.textMuted, marginTop: 6 }}>{project.comments}</div>}
        <div style={{ fontSize: 11, color: W.textDim, marginTop: 6 }}>Added {formatDate(project.dateAdded)}{project.dateSent && ` · Sent ${formatDate(project.dateSent)}`}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { icon: "🔁", label: "Total Tries", value: totalTries },
          { icon: "📅", label: "Sessions Worked", value: history.length },
          { icon: "📊", label: "Avg/Session", value: avgTriesPerSession },
          { icon: "⏱", label: "Time Worked", value: totalMs >= 1000 ? formatDuration(Math.floor(totalMs / 1000)) : "—" },
        ].map(s => (
          <div key={s.label} style={{ background: W.surface, borderRadius: 14, padding: "12px", textAlign: "center", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: W.accent, marginTop: 2 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: W.textMuted, marginTop: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {bestSession && <div style={{ background: W.green, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, color: W.greenDark, textTransform: "uppercase" }}>Best Session</div><div style={{ fontSize: 16, fontWeight: 800, color: W.greenDark }}>{bestSession.tries} {bestSession.tries === 1 ? "try" : "tries"} · {formatDate(bestSession.sessionDate)}</div></div>}
      {history.length > 1 && (() => {
        const sorted = [...history].sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));
        const maxTries = Math.max(...sorted.map(h => h.tries), 1);
        const pts = sorted.map((h, i) => ({
          x: sorted.length > 1 ? (i / (sorted.length - 1)) * 280 : 140,
          y: 34 - Math.round((h.tries / maxTries) * 30),
          sent: h.completed,
        }));
        return (
          <div style={{ background: W.surface, borderRadius: 14, padding: "12px 16px 8px", marginBottom: 14, border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Progress (tries per session)</div>
            <svg width="100%" height={44} viewBox="0 0 300 44" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
              <polyline points={pts.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke={W.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={selectedDot === i ? 6 : 4} fill={p.sent ? W.greenDark : W.accent} stroke={W.surface} strokeWidth={1.5} style={{ cursor: "pointer" }} onClick={() => setSelectedDot(selectedDot === i ? null : i)} />
              ))}
            </svg>
            {selectedDot !== null && sorted[selectedDot] && (
              <div style={{ background: W.surface2, border: `1px solid ${W.accent}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: W.text, textAlign: "center", marginTop: 4, fontWeight: 700 }}>
                {formatDate(sorted[selectedDot].sessionDate)} · {sorted[selectedDot].tries} {sorted[selectedDot].tries === 1 ? "try" : "tries"}{sorted[selectedDot].completed ? " · ✓ Sent!" : ""}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: W.textDim, marginTop: 2 }}>
              <span>{formatDate(sorted[0].sessionDate)}</span>
              <span>{sorted[sorted.length - 1].tries} tries (latest)</span>
              <span>{formatDate(sorted[sorted.length - 1].sessionDate)}</span>
            </div>
          </div>
        );
      })()}
      <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Session History</div>
      {history.length === 0 ? <div style={{ color: W.textDim, fontSize: 13, marginBottom: 16 }}>No attempts yet.</div>
        : history.map((h, i) => (<div key={i} style={{ background: W.surface, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${W.border}`, borderLeft: `4px solid ${h.completed ? W.greenDark : W.accent}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{h.sessionLocation}</div><div style={{ fontSize: 11, color: W.textMuted }}>{formatDate(h.sessionDate)}</div></div><div style={{ fontSize: 12, color: W.textMuted, marginTop: 3 }}>{h.tries} {h.tries === 1 ? "try" : "tries"} · {h.completed ? <span style={{ color: W.greenDark, fontWeight: 700 }}>✓ Sent!</span> : <span style={{ color: W.pinkDark }}>✗ Not sent</span>}</div></div>))}
      <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Notes & Beta</div>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
          placeholder="Add beta, conditions, or notes about this project..."
          style={{ width: "100%", minHeight: 90, background: W.surface2, border: `1px solid ${notesSaved ? W.border : W.accent}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: W.text, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box", outline: "none" }}
        />
        {!notesSaved && (
          <button onClick={saveNotes} style={{ marginTop: 8, padding: "7px 16px", background: W.accent, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save Notes</button>
        )}
      </div>
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

// §SCREEN_SESSION_SUMMARY
// Props: session, getSessionStats, getGradeIndex, leaderboardData, goToLeaderboard,
//        setSessionSummary, setScreen, discardSession, showSummaryLeaveWarn, setShowSummaryLeaveWarn
export const SessionSummaryScreen = ({
  session,
  getSessionStats,
  getGradeIndex,
  leaderboardData,
  goToLeaderboard,
  setSessionSummary,
  setScreen,
  discardSession,
  showSummaryLeaveWarn,
  setShowSummaryLeaveWarn,
  updateSessionNotes,
}) => {
  const W = useTheme();
  const [showDiscard, setShowDiscard] = useState(false);
  const [notes, setNotes] = useState(session.notes || "");
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
    <div style={{ padding: "24px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: W.text, marginBottom: 4 }}>Session Complete!</div>
        <div style={{ fontSize: 13, color: W.textMuted }}>📍 {session.location} · {formatDate(session.date)}</div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, justifyContent: "center" }}>
        {[
          { label: formatDuration(session.duration), sub: "time on wall" },
          { label: `${stats.sends}/${stats.total}`, sub: "sends" },
          ...(stats.hardestSent !== "—" ? [{ label: stats.hardestSent, sub: "hardest sent" }] : []),
        ].map((c, i) => (
          <div key={i} style={{ flex: 1, background: W.surface2, borderRadius: 12, padding: "10px 6px", textAlign: "center", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: W.accent }}>{c.label}</div>
            <div style={{ fontSize: 10, color: W.textMuted, marginTop: 2, fontWeight: 600 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      {(() => {
        const wc = session.warmupChecklist || [];
        const checkedCount = wc.filter(i => i.checked).length;
        const totalCount = wc.length;
        const hasWarmup = totalCount > 0 || (session.warmupTotalSec || 0) > 0;
        if (!hasWarmup) return null;
        const allDone = totalCount > 0 && checkedCount === totalCount;
        const pct = totalCount > 0 ? checkedCount / totalCount : 1;
        const r = 18, circ = 2 * Math.PI * r;
        const dash = pct * circ;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: allDone ? W.pink : W.surface2, border: `1px solid ${allDone ? W.pinkDark + "44" : W.border}`, borderRadius: 16, padding: "12px 16px", marginBottom: 14 }}>
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.border} strokeWidth={4} />
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.pinkDark} strokeWidth={4}
                strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
                strokeLinecap="round" transform="rotate(-90 24 24)" />
              <text x={24} y={28} textAnchor="middle" fontSize={12} fontWeight={900} fill={W.pinkDark}>🔥</text>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: allDone ? W.pinkDark : W.text }}>{allDone ? "Warmup Complete!" : `Warmup ${checkedCount}/${totalCount}`}</div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
                {session.warmupTemplateName && <span style={{ fontWeight: 700, color: W.pinkDark, marginRight: 4 }}>{session.warmupTemplateName} ·</span>}
                {(session.warmupTotalSec || 0) > 0 ? formatDuration(session.warmupTotalSec) + " warm-up time" : `${checkedCount} of ${totalCount} tasks done`}
              </div>
            </div>
            {allDone && <div style={{ fontSize: 22 }}>✅</div>}
          </div>
        );
      })()}
      {(() => {
        const wc = session.workoutChecklist || [];
        const checkedCount = wc.filter(i => i.checked).length;
        const totalCount = wc.length;
        const hasWorkout = totalCount > 0 || (session.workoutTotalSec || 0) > 0;
        if (!hasWorkout) return null;
        const allDone = totalCount > 0 && checkedCount === totalCount;
        const pct = totalCount > 0 ? checkedCount / totalCount : 1;
        const r = 18, circ = 2 * Math.PI * r;
        const dash = pct * circ;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: allDone ? W.purple : W.surface2, border: `1px solid ${allDone ? W.purpleDark + "44" : W.border}`, borderRadius: 16, padding: "12px 16px", marginBottom: 14 }}>
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.border} strokeWidth={4} />
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.purpleDark} strokeWidth={4}
                strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
                strokeLinecap="round" transform="rotate(-90 24 24)" />
              <text x={24} y={28} textAnchor="middle" fontSize={12} fontWeight={900} fill={W.purpleDark}>💪</text>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: allDone ? W.purpleDark : W.text }}>{allDone ? "Workout Complete!" : `Workout ${checkedCount}/${totalCount}`}</div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
                {(session.workoutTotalSec || 0) > 0 ? formatDuration(session.workoutTotalSec) + " workout time" : `${checkedCount} of ${totalCount} tasks done`}
              </div>
            </div>
            {allDone && <div style={{ fontSize: 22 }}>✅</div>}
          </div>
        );
      })()}
      {(() => {
        const fc = session.fingerboardChecklist || [];
        const checkedCount = fc.filter(i => i.checked).length;
        const totalCount = fc.length;
        const hasFingerboard = totalCount > 0 || (session.fingerboardTotalSec || 0) > 0;
        if (!hasFingerboard) return null;
        const allDone = totalCount > 0 && checkedCount === totalCount;
        const pct = totalCount > 0 ? checkedCount / totalCount : 1;
        const r = 18, circ = 2 * Math.PI * r;
        const dash = pct * circ;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 14, background: allDone ? W.yellow : W.surface2, border: `1px solid ${allDone ? W.yellowDark + "44" : W.border}`, borderRadius: 16, padding: "12px 16px", marginBottom: 14 }}>
            <svg width={48} height={48} viewBox="0 0 48 48">
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.border} strokeWidth={4} />
              <circle cx={24} cy={24} r={r} fill="none" stroke={W.yellowDark} strokeWidth={4}
                strokeDasharray={`${dash.toFixed(2)} ${circ.toFixed(2)}`}
                strokeLinecap="round" transform="rotate(-90 24 24)" />
              <text x={24} y={28} textAnchor="middle" fontSize={12} fontWeight={900} fill={W.yellowDark}>🤲</text>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: allDone ? W.yellowDark : W.text }}>{allDone ? "Fingerboard Complete!" : `Fingerboard ${checkedCount}/${totalCount}`}</div>
              <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
                {(session.fingerboardTotalSec || 0) > 0 ? formatDuration(session.fingerboardTotalSec) + " fingerboard time" : `${checkedCount} of ${totalCount} tasks done`}
              </div>
            </div>
            {allDone && <div style={{ fontSize: 22 }}>✅</div>}
          </div>
        );
      })()}
      {(() => {
        const sentProjects = (session.climbs || []).filter(c => c.isProject && c.completed);
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
        {stats.totalPauses > 0 && (
          <div style={{ background: W.yellow, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>⏸</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.yellowDark }}>{stats.totalPauses}</div>
            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>Boulder Pauses</div>
          </div>
        )}
        {(session.warmupChecklist?.length > 0 || session.warmupTotalSec > 0) && (
          <div style={{ background: W.pink, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.pinkDark }}>
              {session.warmupChecklist?.length > 0 ? `${session.warmupChecklist.filter(i => i.checked).length}/${session.warmupChecklist.length}` : formatDuration(session.warmupTotalSec)}
            </div>
            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
              {session.warmupChecklist?.length > 0 ? `Warm Up · ${formatDuration(session.warmupTotalSec)}` : "Warm Up"}
            </div>
          </div>
        )}
        {(session.workoutChecklist?.length > 0 || session.workoutTotalSec > 0) && (
          <div style={{ background: W.purple, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>💪</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.purpleDark }}>
              {session.workoutChecklist?.length > 0 ? `${session.workoutChecklist.filter(i => i.checked).length}/${session.workoutChecklist.length}` : formatDuration(session.workoutTotalSec)}
            </div>
            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
              {session.workoutChecklist?.length > 0 ? `Workout · ${formatDuration(session.workoutTotalSec)}` : "Workout"}
            </div>
          </div>
        )}
        {(session.fingerboardChecklist?.length > 0 || session.fingerboardTotalSec > 0) && (
          <div style={{ background: W.yellow, borderRadius: 14, padding: "14px", border: `1px solid ${W.border}` }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🤲</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.yellowDark }}>
              {session.fingerboardChecklist?.length > 0 ? `${session.fingerboardChecklist.filter(i => i.checked).length}/${session.fingerboardChecklist.length}` : formatDuration(session.fingerboardTotalSec)}
            </div>
            <div style={{ fontSize: 11, color: W.textMuted, marginTop: 2 }}>
              {session.fingerboardChecklist?.length > 0 ? `Fingerboard · ${formatDuration(session.fingerboardTotalSec)}` : "Fingerboard"}
            </div>
          </div>
        )}
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
        const totalRowTime = rows.reduce((s, r) => s + r.time, 0);
        return (
          <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Time by Type</div>
            {rows.length > 1 && totalRowTime > 0 && (
              <div style={{ display: "flex", height: 8, borderRadius: 6, overflow: "hidden", marginBottom: 12, gap: 1 }}>
                {rows.map(r => (
                  <div key={r.label} style={{ flex: r.time / totalRowTime, background: r.bg, minWidth: r.time > 0 ? 4 : 0 }} />
                ))}
              </div>
            )}
            {rows.map((r, i) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < rows.length - 1 ? `1px solid ${W.border}` : "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{r.label}</div>
                  {r.extra && <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{r.extra}</div>}
                  {totalRowTime > 0 && <div style={{ fontSize: 10, color: W.textDim, marginTop: 1 }}>{Math.round(r.time / totalRowTime * 100)}% of session</div>}
                </div>
                <div style={{ fontWeight: 900, color: r.color, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{formatDuration(r.time)}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Speed session detail */}
      {stats.speedSessions.length > 0 && (() => {
        const allAttempts = stats.speedSessions.flatMap(ss => (ss.attempts || []).map(a => ({ ...a, sessionId: ss.id })));
        const tops = allAttempts.filter(a => !a.fell && a.time != null);
        const falls = allAttempts.filter(a => a.fell);
        return (
          <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>⚡ Speed Climbing</div>
              <div style={{ fontSize: 11, color: W.textDim }}>{allAttempts.length} attempt{allAttempts.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: tops.length > 0 ? 14 : 0 }}>
              <div style={{ background: W.yellow, borderRadius: 12, padding: "10px", textAlign: "center", border: `1px solid ${W.yellowDark}33` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: W.yellowDark, fontVariantNumeric: "tabular-nums" }}>{stats.speedBest != null ? `${stats.speedBest.toFixed(2)}s` : "—"}</div>
                <div style={{ fontSize: 10, color: W.yellowDark, opacity: 0.75, marginTop: 2 }}>Session PB</div>
              </div>
              <div style={{ background: W.green, borderRadius: 12, padding: "10px", textAlign: "center", border: `1px solid ${W.greenDark}33` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: W.greenDark }}>{tops.length}</div>
                <div style={{ fontSize: 10, color: W.greenDark, opacity: 0.75, marginTop: 2 }}>Tops</div>
              </div>
              <div style={{ background: W.red, borderRadius: 12, padding: "10px", textAlign: "center", border: `1px solid ${W.redDark}33` }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: W.redDark }}>{falls.length}</div>
                <div style={{ fontSize: 10, color: W.redDark, opacity: 0.75, marginTop: 2 }}>Falls</div>
              </div>
            </div>
            {tops.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Attempt Times</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {allAttempts.map((a, i) => (
                    <div key={a.id || i} style={{ background: a.fell ? W.red : W.surface2, borderRadius: 8, padding: "4px 10px", border: `1px solid ${a.fell ? W.redDark + "44" : W.border}`, display: "flex", alignItems: "center", gap: 4 }}>
                      {a.fell
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: W.redDark }}>✗ fell</span>
                        : <><span style={{ fontSize: 11, fontWeight: 900, color: a.time === stats.speedBest ? W.yellowDark : W.text, fontVariantNumeric: "tabular-nums" }}>{a.time.toFixed(2)}s</span>
                          {a.time === stats.speedBest && <span style={{ fontSize: 9, fontWeight: 800, color: W.yellowDark }}>PB</span>}</>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {(session.climbs || []).filter(c => c.climbType !== "speed-session").length > 0 && (
        <div style={{ background: W.surface, borderRadius: 16, padding: "16px", border: `1px solid ${W.border}`, marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Climbs This Session</div>
          {(session.climbs || []).filter(c => c.climbType !== "speed-session").map(c => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${W.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0, background: getGradeColor(c.grade) + "30", color: getGradeColor(c.grade), border: `1.5px solid ${getGradeColor(c.grade)}60` }}>{c.grade}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {c.color && <ColorDot colorId={c.color} size={10} />}
                  <span style={{ fontWeight: 700, color: W.text, fontSize: 13 }}>{c.name || c.grade}</span>
                  {c.completed && c.tries === 0 && <span style={{ background: W.yellow, color: W.yellowDark, borderRadius: 5, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>FLASH</span>}
                </div>
                <div style={{ fontSize: 11, color: W.textMuted, marginTop: 1 }}>{c.climbType === "rope" ? `${c.tries} ${c.tries === 1 ? "attempt" : "attempts"} · ${c.falls ?? c.tries} ${(c.falls ?? c.tries) === 1 ? "fall" : "falls"}` : `${c.tries} ${c.tries === 1 ? "fall" : "falls"}`} · {c.completed ? "✓ Sent" : "✗ Not sent"}</div>
                {c.climbType !== "rope" && (() => {
                  const workedMs = (c.attemptLog || []).reduce((sum, a) => sum + a.duration, 0);
                  const attempts = (c.attemptLog || []).length;
                  if (workedMs < 1000) return null;
                  const timeColor = c.completed ? W.greenDark : W.accent;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: timeColor, fontVariantNumeric: "tabular-nums" }}>{formatDuration(Math.floor(workedMs / 1000))}</span>
                      <span style={{ fontSize: 10, color: W.textDim, fontWeight: 600 }}>worked</span>
                      {attempts > 0 && <><span style={{ fontSize: 10, color: W.textDim }}>·</span><span style={{ fontSize: 10, color: W.textDim, fontWeight: 600 }}>{attempts} {attempts === 1 ? "attempt" : "attempts"}</span></>}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Share session */}
      {(() => {
        const fmtDuration = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
        const allClimbs = (session.climbs || []).filter(c => c.climbType !== "speed-session");
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: W.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Session Notes</div>
        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); updateSessionNotes(session.id, e.target.value); }}
          placeholder="How did it go? Conditions, goals, observations…"
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", background: W.surface2, border: `1px solid ${W.border}`, borderRadius: 12, color: W.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none" }}
        />
      </div>
      <button onClick={() => { setSessionSummary(null); setScreen("home"); }} style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg, ${W.accent}, ${W.accentDark})`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", boxShadow: `0 4px 16px ${W.accentGlow}`, marginBottom: 10 }}>Save Session</button>
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
