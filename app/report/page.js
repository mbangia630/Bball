"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d", wh: "#e6edf3",
  dim: "#7d8590", grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0", amb: "#d4a017",
};

// Try to load report from public data — falls back to sample
function useSampleReport() {
  return {
    date: "2026-03-20",
    generatedAtCST: "2026-03-20 7:02 AM CST",
    modelVersion: 4,
    today: {
      gamesGraded: 0,
      straightUp: { correct: 0, total: 0, pct: null },
      ats: { correct: 0, total: 0, pct: null },
      beatVegas: { correct: 0, total: 0, pct: null },
      avgError: null,
      avgVegasError: null,
    },
    games: [],
    cumulative: { totalGames: 0, straightUpPct: null, atsPct: null, trend: [] },
    adjustments: {
      changes: ["No games played yet — waiting for tournament to begin."],
      before: { vegasBlend: 0.55, sigma: 11, recency: { em: 0.60, efg: 0.55, tor: 0.42 } },
      after: { vegasBlend: 0.55, sigma: 11, recency: { em: 0.60, efg: 0.55, tor: 0.42 } },
    },
    eloUpdates: 0,
  };
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ padding: "14px 10px", background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: C.wh, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch('/data/reports/latest.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => setReport(data || useSampleReport()))
      .catch(() => setReport(useSampleReport()));
  }, []);

  if (!report) return <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Loading report...</div>;

  const t = report.today;
  const cum = report.cumulative;
  const adj = report.adjustments;

  return (
    <div style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", background: C.bg, color: C.wh, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20, borderBottom: `1px solid ${C.brd}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.gold, marginBottom: 4 }}>DAILY PERFORMANCE REPORT</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "4px 0", fontFamily: "Georgia,serif" }}>
            Model Self-Improvement Report
          </h1>
          <div style={{ fontSize: 13, color: C.cyan, marginTop: 6, padding: "4px 14px", background: `${C.cyan}08`, borderRadius: 4, display: "inline-block" }}>
            📅 {report.date} · Model v{report.modelVersion} · Generated {report.generatedAtCST}
          </div>
          <div style={{ marginTop: 8 }}>
            <a href="/" style={{ fontSize: 12, color: C.blue, textDecoration: "none" }}>← Back to Bracket</a>
          </div>
        </div>

        {/* Today's Performance */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>
            📊 TODAY'S RESULTS ({t.gamesGraded} games graded)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            <StatBox label="Straight-Up" value={t.straightUp.pct !== null ? t.straightUp.pct + "%" : "—"} sub={t.straightUp.total > 0 ? `${t.straightUp.correct}/${t.straightUp.total} correct` : "No games yet"} color={t.straightUp.pct >= 70 ? C.grn : t.straightUp.pct >= 50 ? C.gold : t.straightUp.pct !== null ? C.red : C.dim} />
            <StatBox label="vs Spread (ATS)" value={t.ats.pct !== null ? t.ats.pct + "%" : "—"} sub={t.ats.total > 0 ? `${t.ats.correct}/${t.ats.total} covered` : "No games yet"} color={t.ats.pct >= 55 ? C.grn : t.ats.pct >= 50 ? C.gold : t.ats.pct !== null ? C.red : C.dim} />
            <StatBox label="Beat Vegas" value={t.beatVegas.pct !== null ? t.beatVegas.pct + "%" : "—"} sub={t.beatVegas.total > 0 ? `${t.beatVegas.correct}/${t.beatVegas.total} closer` : "No Vegas lines"} color={t.beatVegas.pct >= 50 ? C.grn : t.beatVegas.pct !== null ? C.red : C.dim} />
            <StatBox label="Avg Error" value={t.avgError !== null ? t.avgError + "pts" : "—"} sub={t.avgVegasError !== null ? `Vegas: ${t.avgVegasError}pts` : ""} color={t.avgError !== null && t.avgError < 10 ? C.grn : t.avgError !== null && t.avgError < 14 ? C.gold : C.dim} />
          </div>
        </div>

        {/* Game-by-Game Breakdown */}
        {report.games.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>
              🏀 GAME-BY-GAME BREAKDOWN
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.brd}` }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: C.dim, fontSize: 10 }}>MATCHUP</th>
                    <th style={{ padding: "8px 6px", textAlign: "center", color: C.dim, fontSize: 10 }}>SCORE</th>
                    <th style={{ padding: "8px 6px", textAlign: "center", color: C.dim, fontSize: 10 }}>MODEL</th>
                    <th style={{ padding: "8px 6px", textAlign: "center", color: C.dim, fontSize: 10 }}>VEGAS</th>
                    <th style={{ padding: "8px 6px", textAlign: "center", color: C.dim, fontSize: 10 }}>ERROR</th>
                    <th style={{ padding: "8px 10px", textAlign: "right", color: C.dim, fontSize: 10 }}>VERDICT</th>
                  </tr>
                </thead>
                <tbody>
                  {report.games.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.brd}`, background: g.verdict.startsWith('✅') ? `${C.grn}06` : g.verdict.startsWith('❌') ? `${C.red}06` : "transparent" }}>
                      <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600 }}>{g.matchup}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: C.wh }}>{g.score}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: C.purp, fontWeight: 700 }}>{g.modelSpread > 0 ? "+" : ""}{g.modelSpread}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: C.dim }}>{g.vegasLine !== null ? (g.vegasLine > 0 ? "+" : "") + g.vegasLine : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: g.modelError < 8 ? C.grn : g.modelError < 15 ? C.gold : C.red, fontWeight: 700 }}>{g.modelError}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{g.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cumulative Performance */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>
            📈 CUMULATIVE PERFORMANCE ({cum.totalGames} total games)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <StatBox label="All-Time Straight-Up" value={cum.straightUpPct !== null ? cum.straightUpPct + "%" : "—"} sub={`${cum.totalGames} games`} color={cum.straightUpPct >= 70 ? C.grn : cum.straightUpPct >= 60 ? C.gold : C.dim} />
            <StatBox label="All-Time ATS" value={cum.atsPct !== null ? cum.atsPct + "%" : "—"} sub={`${cum.totalGames} games`} color={cum.atsPct >= 55 ? C.grn : cum.atsPct >= 52 ? C.gold : C.dim} />
          </div>

          {/* Trend chart */}
          {cum.trend.length > 0 && (
            <div style={{ padding: "12px 14px", background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>7-DAY TREND</div>
              <div style={{ display: "flex", gap: 6 }}>
                {cum.trend.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: C.dim }}>{d.date.slice(5)}</div>
                    <div style={{ height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center", marginTop: 4 }}>
                      <div style={{ width: "60%", height: `${Math.max(5, parseInt(d.su))}%`, background: parseInt(d.su) >= 65 ? C.grn : parseInt(d.su) >= 50 ? C.gold : C.red, borderRadius: "3px 3px 0 0" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: parseInt(d.su) >= 65 ? C.grn : C.gold, marginTop: 2 }}>{d.su}</div>
                    <div style={{ fontSize: 9, color: C.dim }}>SU</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weight Adjustments */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>
            ⚙️ MODEL ADJUSTMENTS
          </div>

          {/* Changes list */}
          <div style={{ padding: "14px 16px", background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8, marginBottom: 10 }}>
            {adj.changes.map((c, i) => (
              <div key={i} style={{ padding: "6px 0", borderBottom: i < adj.changes.length - 1 ? `1px solid ${C.brd}` : "none", fontSize: 13, color: C.wh, lineHeight: 1.6 }}>
                📐 {c}
              </div>
            ))}
          </div>

          {/* Before/After comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "12px 14px", background: `${C.red}06`, border: `1px solid ${C.red}22`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 8 }}>BEFORE</div>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                Vegas blend: <span style={{ color: "#fff" }}>{(adj.before.vegasBlend * 100).toFixed(1)}%</span>
                <br />Sigma: <span style={{ color: "#fff" }}>{adj.before.sigma}</span>
                <br />Recency (EM): <span style={{ color: "#fff" }}>{(adj.before.recency.em * 100).toFixed(0)}%</span>
              </div>
            </div>
            <div style={{ padding: "12px 14px", background: `${C.grn}06`, border: `1px solid ${C.grn}22`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.grn, fontWeight: 700, marginBottom: 8 }}>AFTER</div>
              <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                Vegas blend: <span style={{ color: "#fff" }}>{(adj.after.vegasBlend * 100).toFixed(1)}%</span>
                {adj.before.vegasBlend !== adj.after.vegasBlend && <span style={{ color: adj.after.vegasBlend > adj.before.vegasBlend ? C.blue : C.grn, marginLeft: 4 }}>({adj.after.vegasBlend > adj.before.vegasBlend ? "↑" : "↓"} trusting Vegas {adj.after.vegasBlend > adj.before.vegasBlend ? "more" : "less"})</span>}
                <br />Sigma: <span style={{ color: "#fff" }}>{adj.after.sigma}</span>
                {adj.before.sigma !== adj.after.sigma && <span style={{ color: C.gold, marginLeft: 4 }}>({adj.after.sigma > adj.before.sigma ? "↑ more uncertain" : "↓ more confident"})</span>}
                <br />Recency (EM): <span style={{ color: "#fff" }}>{(adj.after.recency.em * 100).toFixed(0)}%</span>
                {adj.before.recency.em !== adj.after.recency.em && <span style={{ color: C.purp, marginLeft: 4 }}>({adj.after.recency.em > adj.before.recency.em ? "↑ recent form" : "↓ season stats"})</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Elo Updates */}
        <div style={{ padding: "12px 16px", background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8, marginBottom: 20, fontSize: 13, color: C.dim }}>
          ⚡ Elo updated for <span style={{ color: "#fff", fontWeight: 700 }}>{report.eloUpdates}</span> games
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: C.dim, textAlign: "center", paddingTop: 14, borderTop: `1px solid ${C.brd}` }}>
          NCAA Prediction Engine v8.0 · Self-Improvement Report · Auto-generated daily at 7am CST
        </div>
      </div>
    </div>
  );
}
