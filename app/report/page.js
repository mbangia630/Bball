"use client";
import { useState, useEffect } from "react";

const C = { bg: "#0a0a0f", wh: "#e8e8e8", dim: "#666", brd: "#1a1a2e", gold: "#ffd700", grn: "#22ff44", red: "#ff4444", blue: "#4488ff", purp: "#aa66ff", amb: "#ffaa00", pink: "#ff66aa", cyan: "#44ddff" };

export default function ReportPage() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/data/reports/latest.json")
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(setData)
      .catch(e => setErr(e.message));
  }, []);

  if (err) return (
    <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", padding: 20, fontFamily: "monospace" }}>
      <h2 style={{ color: C.red }}>Failed to load report</h2>
      <p style={{ color: C.dim }}>Error: {err}</p>
      <a href="/" style={{ color: C.purp }}>Back to Bracket</a>
    </div>
  );

  if (!data) return (
    <div style={{ background: C.bg, color: C.dim, minHeight: "100vh", padding: 40, fontFamily: "monospace", textAlign: "center" }}>
      Loading report...
    </div>
  );

  const t = data.today || {};
  const cum = data.cumulative || {};
  const v8 = data.v8Baseline || {};
  const games = data.games || [];
  const adjustments = data.adjustments || [];

  return (
    <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", padding: "16px", fontFamily: "monospace", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0, color: C.gold }}>Performance Report</h1>
          <div style={{ fontSize: 11, color: C.dim }}>{data.generatedAtCST || data.date} | {data.engineVersion || "v9"}</div>
        </div>
        <a href="/" style={{ fontSize: 12, color: C.purp, textDecoration: "none" }}>Back to Bracket</a>
      </div>

      {/* Today's Performance */}
      <Section title="TODAY'S PERFORMANCE" color={C.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
          <StatBox label="Straight-Up" value={t.straightUp ? `${t.straightUp.correct}/${t.straightUp.total}` : "—"} sub={t.straightUp ? `${t.straightUp.pct}%` : ""} color={t.straightUp && t.straightUp.pct >= 70 ? C.grn : C.amb} />
          <StatBox label="vs Spread" value={t.ats ? `${t.ats.correct}/${t.ats.total}` : "—"} sub={t.ats ? `${t.ats.pct}%` : ""} color={t.ats && t.ats.pct >= 55 ? C.grn : C.red} />
          <StatBox label="Beat Vegas" value={t.beatVegas ? `${t.beatVegas.correct}/${t.beatVegas.total}` : "—"} sub="" color={C.purp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <StatBox label="Avg Model Error" value={t.avgError != null ? `${t.avgError.toFixed(1)} pts` : "—"} color={C.dim} />
          <StatBox label="Avg Vegas Error" value={t.avgVegasError != null ? `${t.avgVegasError.toFixed(1)} pts` : "—"} color={C.dim} />
        </div>
      </Section>

      {/* Cumulative */}
      <Section title="CUMULATIVE" color={C.gold}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          <StatBox label="Total Games" value={cum.totalGames || 0} color={C.wh} />
          <StatBox label="SU Accuracy" value={cum.straightUpPct != null ? `${cum.straightUpPct}%` : "—"} color={cum.straightUpPct >= 70 ? C.grn : C.amb} />
          <StatBox label="ATS Accuracy" value={cum.atsPct != null ? `${cum.atsPct}%` : "—"} color={cum.atsPct >= 55 ? C.grn : C.red} />
        </div>
      </Section>

      {/* v8 Comparison */}
      {v8.version && (
        <Section title="v8 BASELINE COMPARISON" color={C.cyan}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div style={{ textAlign: "center", padding: 6 }}>
              <div style={{ fontSize: 10, color: C.dim }}>Metric</div>
            </div>
            <div style={{ textAlign: "center", padding: 6 }}>
              <div style={{ fontSize: 10, color: C.cyan }}>v9 (current)</div>
            </div>
            <div style={{ textAlign: "center", padding: 6 }}>
              <div style={{ fontSize: 10, color: C.dim }}>v8 (baseline)</div>
            </div>
            <CompRow label="SU %" cur={cum.straightUpPct} base={v8.straightUpPct} />
            <CompRow label="ATS %" cur={cum.atsPct} base={v8.atsPct} />
            <CompRow label="Games" cur={cum.totalGames} base={v8.gamesGraded} />
          </div>
        </Section>
      )}

      {/* Adjustments */}
      {adjustments.length > 0 && (
        <Section title="ADJUSTMENTS MADE" color={C.amb}>
          {adjustments.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: "#aaa", padding: "3px 0", borderLeft: `2px solid ${C.amb}44`, paddingLeft: 8, marginBottom: 4 }}>{a}</div>
          ))}
        </Section>
      )}

      {/* Game-by-Game */}
      <Section title={`GAME-BY-GAME (${games.length})`} color={C.purp}>
        {games.map((g, i) => (
          <div key={i} style={{ padding: "6px 8px", marginBottom: 4, background: `${C.wh}04`, borderRadius: 4, borderLeft: `3px solid ${g.pickedWinnerCorrectly ? C.grn : C.red}66` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: C.wh, fontWeight: 700 }}>{g.matchup}</div>
              <div style={{ fontSize: 11 }}>{g.verdict}</div>
            </div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
              {g.score} | Model: {g.modelSpread > 0 ? "+" : ""}{g.modelSpread} | Vegas: {g.vegasLine != null ? (g.vegasLine > 0 ? "+" : "") + g.vegasLine : "N/A"} | Error: {g.modelError.toFixed(1)}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16, padding: "10px 12px", background: `${color}06`, border: `1px solid ${color}22`, borderRadius: 6 }}>
      <div style={{ fontSize: 11, color, letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 4px", background: `${color}08`, borderRadius: 4 }}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#666" }}>{sub}</div>}
    </div>
  );
}

function CompRow({ label, cur, base }) {
  const better = cur > base;
  const c = better ? "#22ff44" : cur < base ? "#ff4444" : "#888";
  return (
    <>
      <div style={{ fontSize: 11, color: "#888", padding: "4px 0" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: c, textAlign: "center" }}>{cur != null ? cur : "—"}</div>
      <div style={{ fontSize: 13, color: "#666", textAlign: "center" }}>{base != null ? base : "—"}</div>
    </>
  );
}
