"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d", wh: "#e6edf3",
  dim: "#7d8590", grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0",
};

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ padding: "14px 10px", background: `${color}08`, border: `1px solid ${color}22`, borderRadius: 8, textAlign: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.wh, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const [report, setReport] = useState(null);
  const [delta, setDelta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/reports/latest.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/reports/delta-latest.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([r, d]) => {
      setReport(r);
      setDelta(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Loading...</div>;

  // Safe accessors — nothing crashes if data is missing
  const t = report?.today || {};
  const su = t.straightUp || {};
  const ats = t.ats || {};
  const bv = t.beatVegas || {};
  const cum = report?.cumulative || {};
  const adj = report?.adjustments || {};
  const adjChanges = adj.changes || [];
  const adjBefore = adj.before || {};
  const adjAfter = adj.after || {};
  const games = report?.games || [];
  const dd = delta?.deltas || [];
  const ds = delta?.summary || {};
  const trend = cum.trend || [];

  const noData = !report;

  return (
    <div style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", background: C.bg, color: C.wh, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20, borderBottom: `1px solid ${C.brd}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.gold, marginBottom: 4 }}>DAILY PERFORMANCE REPORT</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "4px 0", fontFamily: "Georgia,serif" }}>Model Self-Improvement Report</h1>
          {report && <div style={{ fontSize: 13, color: C.cyan, marginTop: 6, padding: "4px 14px", background: `${C.cyan}08`, borderRadius: 4, display: "inline-block" }}>
            {report.date || "—"} · Model v{report.modelVersion || "?"} · {report.generatedAtCST || ""}
          </div>}
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 16 }}>
            <a href="/" style={{ fontSize: 12, color: C.blue, textDecoration: "none" }}>← Back to Bracket</a>
            <a href="/changes" style={{ fontSize: 12, color: C.cyan, textDecoration: "none" }}>🔄 Full Changes Log</a>
          </div>
        </div>

        {/* No data state */}
        {noData && (
          <div style={{ padding: "40px 20px", textAlign: "center", background: `${C.gold}08`, border: `1px solid ${C.gold}22`, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 16, color: C.gold, fontWeight: 700, marginBottom: 8 }}>No Report Data Yet</div>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.7 }}>
              The performance report will be generated after games are played and the pipeline runs.
              <br/>Trigger a run from GitHub Actions, or wait for the 7am daily update.
            </div>
          </div>
        )}

        {/* Yesterday + Cumulative */}
        {!noData && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ padding: "14px 16px", background: `${C.gold}06`, border: `1px solid ${C.gold}22`, borderRadius: "8px 8px 0 0" }}>
              <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, fontWeight: 700, marginBottom: 10 }}>
                📊 YESTERDAY ({t.gamesGraded || 0} games)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                <StatBox label="Straight-Up" value={su.pct != null ? su.pct + "%" : "—"} sub={su.total > 0 ? `${su.correct}/${su.total}` : "No games"} color={su.pct >= 70 ? C.grn : su.pct >= 50 ? C.gold : C.dim} />
                <StatBox label="vs Spread" value={ats.pct != null ? ats.pct + "%" : "—"} sub={ats.total > 0 ? `${ats.correct}/${ats.total}` : "No games"} color={ats.pct >= 55 ? C.grn : ats.pct >= 50 ? C.gold : C.dim} />
                <StatBox label="Beat Vegas" value={bv.pct != null ? bv.pct + "%" : "—"} sub={bv.total > 0 ? `${bv.correct}/${bv.total}` : "—"} color={bv.pct >= 50 ? C.grn : C.dim} />
                <StatBox label="Avg Error" value={t.avgError != null ? t.avgError + "pts" : "—"} sub={t.avgVegasError != null ? `Vegas: ${t.avgVegasError}pts` : ""} color={t.avgError != null && t.avgError < 10 ? C.grn : C.dim} />
              </div>
            </div>
            <div style={{ padding: "14px 16px", background: `${C.blue}06`, border: `1px solid ${C.blue}22`, borderTop: "none", borderRadius: "0 0 8px 8px" }}>
              <div style={{ fontSize: 13, letterSpacing: 3, color: C.blue, fontWeight: 700, marginBottom: 10 }}>
                📈 ALL TOURNAMENT ({cum.totalGames || 0} games)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                <StatBox label="Straight-Up" value={cum.straightUpPct != null ? cum.straightUpPct + "%" : "—"} sub={`${cum.totalGames || 0} games`} color={cum.straightUpPct >= 70 ? C.grn : cum.straightUpPct >= 60 ? C.gold : C.dim} />
                <StatBox label="vs Spread" value={cum.atsPct != null ? cum.atsPct + "%" : "—"} sub={`${cum.totalGames || 0} games`} color={cum.atsPct >= 55 ? C.grn : C.dim} />
                <StatBox label="Trend" value={trend.length > 0 ? trend[trend.length - 1].su || "—" : "—"} sub={trend.length > 1 ? `prev: ${trend[trend.length - 2]?.su || "—"}` : "—"} color={C.blue} />
                <StatBox label="Avg Error" value={trend.length > 0 ? (trend[trend.length - 1].avgError || "—") + "pts" : "—"} sub="latest day" color={C.blue} />
              </div>
              {trend.length > 1 && (
                <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                  {trend.map((d, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ height: 30, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                        <div style={{ width: "70%", height: `${Math.max(8, parseInt(d.su || d.suPct || 0))}%`, background: parseInt(d.su || d.suPct || 0) >= 65 ? C.grn : C.gold, borderRadius: "3px 3px 0 0" }} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.gold, marginTop: 2 }}>{d.su || (d.suPct + "%") || "—"}</div>
                      <div style={{ fontSize: 8, color: C.dim }}>{(d.date || "").slice(5)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game by game */}
        {games.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>🏀 GAME-BY-GAME BREAKDOWN</div>
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
                  {games.map((g, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.brd}`, background: (g.verdict || "").startsWith('✅') ? `${C.grn}06` : (g.verdict || "").startsWith('❌') ? `${C.red}06` : "transparent" }}>
                      <td style={{ padding: "8px 10px", color: "#fff", fontWeight: 600 }}>{g.matchup || "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center" }}>{g.score || "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: C.purp, fontWeight: 700 }}>{g.modelSpread != null ? (g.modelSpread > 0 ? "+" : "") + g.modelSpread : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: C.dim }}>{g.vegasLine != null ? (g.vegasLine > 0 ? "+" : "") + g.vegasLine : "—"}</td>
                      <td style={{ padding: "8px 6px", textAlign: "center", color: (g.modelError || 99) < 8 ? C.grn : (g.modelError || 99) < 15 ? C.gold : C.red, fontWeight: 700 }}>{g.modelError != null ? g.modelError : "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{g.verdict || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Weight adjustments */}
        {adjChanges.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: C.gold, marginBottom: 10, fontWeight: 700 }}>⚙️ MODEL ADJUSTMENTS</div>
            <div style={{ padding: "14px 16px", background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8, marginBottom: 10 }}>
              {adjChanges.map((c, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: i < adjChanges.length - 1 ? `1px solid ${C.brd}` : "none", fontSize: 13, color: C.wh, lineHeight: 1.6 }}>📐 {c}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: "12px 14px", background: `${C.red}06`, border: `1px solid ${C.red}22`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.red, fontWeight: 700, marginBottom: 8 }}>BEFORE</div>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                  Vegas blend: <span style={{ color: "#fff" }}>{((adjBefore.vegasBlend || 0.55) * 100).toFixed(1)}%</span>
                  <br />Sigma: <span style={{ color: "#fff" }}>{adjBefore.sigma || 11}</span>
                </div>
              </div>
              <div style={{ padding: "12px 14px", background: `${C.grn}06`, border: `1px solid ${C.grn}22`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: C.grn, fontWeight: 700, marginBottom: 8 }}>AFTER</div>
                <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.8 }}>
                  Vegas blend: <span style={{ color: "#fff" }}>{((adjAfter.vegasBlend || 0.55) * 100).toFixed(1)}%</span>
                  <br />Sigma: <span style={{ color: "#fff" }}>{adjAfter.sigma || 11}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Elo */}
        {report && <div style={{ padding: "12px 16px", background: C.card, border: `1px solid ${C.brd}`, borderRadius: 8, marginBottom: 20, fontSize: 13, color: C.dim }}>
          ⚡ Elo updated for <span style={{ color: "#fff", fontWeight: 700 }}>{report.eloUpdates || 0}</span> games
        </div>}

        {/* Drift section */}
        {delta && dd.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, letterSpacing: 3, color: C.cyan, marginBottom: 10, fontWeight: 700 }}>🔄 PREDICTION DRIFT SINCE 7AM</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
              <StatBox label="Games Changed" value={ds.gamesChanged || 0} sub={`of ${ds.totalGamesCompared || 0}`} color={C.cyan} />
              <StatBox label="Flipped" value={ds.winnersFlipped || 0} sub="winners changed" color={ds.winnersFlipped > 0 ? C.red : C.dim} />
              <StatBox label="New" value={ds.newMatchups || 0} sub="matchups" color={ds.newMatchups > 0 ? C.grn : C.dim} />
              <StatBox label="Avg Move" value={(ds.avgSpreadChange || 0) + " pts"} sub="" color={C.purp} />
            </div>
            {dd.slice(0, 5).map((d, i) => {
              const isFlip = d.type === 'FLIP';
              const isNew = d.type === 'NEW';
              const col = isFlip ? C.red : isNew ? C.grn : C.cyan;
              return (
                <div key={i} style={{ marginBottom: 4, padding: "8px 12px", background: `${col}04`, border: `1px solid ${col}22`, borderRadius: 6, borderLeft: `3px solid ${col}`, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{d.matchup}</span>
                  {isFlip && <span style={{ color: C.red, marginLeft: 8 }}>⚠️ FLIPPED</span>}
                  {isNew && <span style={{ color: C.grn, marginLeft: 8 }}>NEW</span>}
                  {!isNew && d.spreadChange != null && <span style={{ color: C.purp, marginLeft: 8 }}>{d.spreadChange > 0 ? '↑' : '↓'}{Math.abs(d.spreadChange)}pts</span>}
                </div>
              );
            })}
            {dd.length > 5 && <div style={{ textAlign: "center", marginTop: 8 }}><a href="/changes" style={{ fontSize: 12, color: C.cyan, textDecoration: "none" }}>View all {dd.length} changes →</a></div>}
          </div>
        )}

        {delta && delta.type === 'BASELINE_SET' && (
          <div style={{ padding: "14px 16px", background: `${C.gold}08`, border: `1px solid ${C.gold}22`, borderRadius: 8, marginBottom: 20, fontSize: 13, color: C.gold }}>
            ⏰ {delta.message || "This is the 7am baseline. Manual refreshes will show drift from here."}
          </div>
        )}

        <div style={{ fontSize: 11, color: C.dim, textAlign: "center", paddingTop: 14, borderTop: `1px solid ${C.brd}` }}>
          NCAA Prediction Engine v8.0 · Performance + Drift Report
        </div>
      </div>
    </div>
  );
}