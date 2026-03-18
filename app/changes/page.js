"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d", wh: "#e6edf3",
  dim: "#7d8590", grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0", amb: "#d4a017",
};

function useSampleDelta() {
  return {
    timestampCST: "Mar 18, 2026, 2:45 PM CST",
    type: "BASELINE",
    message: "First run — predictions are being generated. The 7am scheduled run will set the baseline, then manual refreshes will show changes.",
    summary: { totalGamesCompared: 0, gamesChanged: 0, winnersFlipped: 0, newMatchups: 0, avgSpreadChange: 0, biggestMover: "None" },
    deltas: [],
  };
}

export default function DeltaPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch('/data/reports/delta-latest.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => setReport(d || useSampleDelta()))
      .catch(() => setReport(useSampleDelta()));
  }, []);

  if (!report) return <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Loading...</div>;

  const d = report.deltas || [];
  const s = report.summary || {};

  return (
    <div style={{ fontFamily: "'JetBrains Mono',Consolas,monospace", background: C.bg, color: C.wh, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20, borderBottom: `1px solid ${C.brd}`, paddingBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: C.cyan, marginBottom: 4 }}>PREDICTION DELTA REPORT</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "4px 0", fontFamily: "Georgia,serif" }}>What Changed Since 7am</h1>
          <div style={{ fontSize: 13, color: C.cyan, marginTop: 6, padding: "4px 14px", background: `${C.cyan}08`, borderRadius: 4, display: "inline-block" }}>
            📅 {report.timestampCST}
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 16 }}>
            <a href="/" style={{ fontSize: 12, color: C.blue, textDecoration: "none" }}>← Bracket</a>
            <a href="/report" style={{ fontSize: 12, color: C.purp, textDecoration: "none" }}>📋 Performance Report</a>
          </div>
        </div>

        {report.type === "BASELINE" && (
          <div style={{ padding: "20px 24px", background: `${C.gold}08`, border: `1px solid ${C.gold}33`, borderRadius: 8, textAlign: "center", fontSize: 14, color: C.gold, marginBottom: 20 }}>
            {report.message || "First run — no 7am baseline yet — run the scheduled update first. The 7am scheduled run will set the baseline, then manual refreshes will show changes."}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { n: s.gamesChanged, l: "Games Changed", c: s.gamesChanged > 0 ? C.cyan : C.dim },
            { n: s.winnersFlipped, l: "Winners Flipped", c: s.winnersFlipped > 0 ? C.red : C.dim },
            { n: s.newMatchups, l: "New Matchups", c: s.newMatchups > 0 ? C.grn : C.dim },
            { n: s.avgSpreadChange ? s.avgSpreadChange + " pts" : "0", l: "Avg Spread Move", c: C.purp },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center", padding: "14px 8px", background: `${stat.c}08`, borderRadius: 8, border: `1px solid ${stat.c}22` }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: stat.c }}>{stat.n}</div>
              <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{stat.l}</div>
            </div>
          ))}
        </div>

        {/* Run comparison */}
        {report.baselineTime && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, marginBottom: 20, alignItems: "center" }}>
            <div style={{ padding: "10px 14px", background: `${C.dim}08`, borderRadius: 6, border: `1px solid ${C.brd}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.dim }}>7AM BASELINE</div>
              <div style={{ fontSize: 12, color: C.wh, marginTop: 4 }}>{new Date(report.baselineTime).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 18, color: C.cyan }}>→</div>
            <div style={{ padding: "10px 14px", background: `${C.cyan}08`, borderRadius: 6, border: `1px solid ${C.cyan}22`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.cyan }}>CURRENT</div>
              <div style={{ fontSize: 12, color: C.wh, marginTop: 4 }}>{new Date(report.currentTime).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</div>
            </div>
          </div>
        )}

        {/* Delta cards */}
        {d.length === 0 && report.type !== "BASELINE" && (
          <div style={{ padding: "20px", background: `${C.grn}08`, border: `1px solid ${C.grn}22`, borderRadius: 8, textAlign: "center", fontSize: 14, color: C.grn }}>
            ✅ No meaningful changes since the 7am baseline — predictions are stable.
          </div>
        )}

        {d.map((delta, i) => {
          const isFlip = delta.type === 'FLIP';
          const isNew = delta.type === 'NEW';
          const borderColor = isFlip ? C.red : isNew ? C.grn : C.cyan;

          return (
            <div key={i} style={{ marginBottom: 8, padding: "14px 16px", background: `${borderColor}04`, border: `1px solid ${borderColor}22`, borderRadius: 8, borderLeft: `4px solid ${borderColor}` }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{delta.matchup}</div>
                  <div style={{ fontSize: 11, color: C.dim }}>{delta.round} · {delta.region}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {isFlip && <span style={{ fontSize: 11, padding: "2px 8px", background: `${C.red}20`, color: C.red, borderRadius: 4, fontWeight: 700 }}>WINNER FLIPPED</span>}
                  {isNew && <span style={{ fontSize: 11, padding: "2px 8px", background: `${C.grn}20`, color: C.grn, borderRadius: 4, fontWeight: 700 }}>NEW MATCHUP</span>}
                  {!isFlip && !isNew && <span style={{ fontSize: 11, padding: "2px 8px", background: `${C.cyan}20`, color: C.cyan, borderRadius: 4, fontWeight: 700 }}>SHIFTED</span>}
                </div>
              </div>

              {isNew ? (
                <div style={{ marginTop: 8, fontSize: 13, color: C.wh }}>{delta.message}</div>
              ) : (
                <>
                  {/* Before → After comparison */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 1fr", gap: 8, marginTop: 10 }}>
                    <div style={{ padding: "8px 12px", background: `${C.red}06`, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.red, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
                      <div style={{ fontSize: 13, color: C.wh }}>
                        <span style={{ fontWeight: 700 }}>{delta.baselineWinner}</span> wins
                      </div>
                      <div style={{ fontSize: 12, color: C.dim }}>
                        {delta.baselineWinProb}% · spread {delta.baselineSpread > 0 ? '+' : ''}{delta.baselineSpread}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {delta.baselineScoreW}-{delta.baselineScoreL}
                        {delta.baselineVegas !== null && ` · Vegas: ${delta.baselineVegas > 0 ? '+' : ''}${delta.baselineVegas}`}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.cyan }}>→</div>
                    <div style={{ padding: "8px 12px", background: `${C.grn}06`, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: C.grn, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
                      <div style={{ fontSize: 13, color: C.wh }}>
                        <span style={{ fontWeight: 700 }}>{delta.winner}</span> wins
                      </div>
                      <div style={{ fontSize: 12, color: C.dim }}>
                        {delta.winProb}% · spread {delta.spread > 0 ? '+' : ''}{delta.spread}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim }}>
                        {delta.scoreW}-{delta.scoreL}
                        {delta.vegasLine !== null && ` · Vegas: ${delta.vegasLine > 0 ? '+' : ''}${delta.vegasLine}`}
                      </div>
                    </div>
                  </div>

                  {/* Change summary */}
                  <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                    {delta.spreadChange !== 0 && (
                      <div style={{ fontSize: 12, color: Math.abs(delta.spreadChange) >= 2 ? C.red : C.purp, fontWeight: 700 }}>
                        Spread: {delta.spreadChange > 0 ? '+' : ''}{delta.spreadChange} pts
                      </div>
                    )}
                    {delta.probChange !== 0 && (
                      <div style={{ fontSize: 12, color: C.blue }}>
                        Prob: {delta.probChange > 0 ? '+' : ''}{delta.probChange}%
                      </div>
                    )}
                    {delta.vegasChange !== null && delta.vegasChange !== 0 && (
                      <div style={{ fontSize: 12, color: C.gold }}>
                        Vegas: {delta.vegasChange > 0 ? '+' : ''}{delta.vegasChange} pts
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Factors */}
              {delta.factors && delta.factors.length > 0 && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.wh}04`, borderRadius: 4 }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 700 }}>WHY IT CHANGED</div>
                  {delta.factors.map((f, fi) => (
                    <div key={fi} style={{ fontSize: 12, color: f.includes('FLIPPED') ? C.red : C.wh, lineHeight: 1.6 }}>
                      {f.includes('FLIPPED') ? '⚠️' : '📌'} {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer */}
        <div style={{ fontSize: 11, color: C.dim, textAlign: "center", paddingTop: 14, marginTop: 20, borderTop: `1px solid ${C.brd}` }}>
          NCAA Prediction Engine v8.0 · Delta Report · Always compared to 7am daily baseline
        </div>
      </div>
    </div>
  );
}
