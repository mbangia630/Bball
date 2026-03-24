"use client";
import { useState, useEffect } from "react";

const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d", wh: "#e6edf3",
  dim: "#7d8590", grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0",
};
const font = "'JetBrains Mono',Consolas,'Courier New',monospace";

function SectionLabel({ text, color }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: 2, color, fontWeight: 700, marginBottom: 12, marginTop: 24 }}>
      {text}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 8px", background: "#0d1117", border: `0.5px solid ${C.brd}`, borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || C.wh }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function DeltaPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/data/reports/delta-latest.json')
      .then(r => r.ok ? r.json() : null)
      .then(d => setReport(d))
      .catch(() => setError(true));
  }, []);

  if (error) return (
    <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, marginBottom: 8 }}>No delta report available</div>
        <div style={{ fontSize: 13, color: C.dim }}>Run the pipeline to generate prediction comparisons</div>
        <a href="/" style={{ fontSize: 13, color: C.blue, marginTop: 12, display: "inline-block" }}>← Back to bracket</a>
      </div>
    </div>
  );

  if (!report) return (
    <div style={{ background: C.bg, color: C.wh, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      Loading...
    </div>
  );

  const d = report.deltas || [];
  const s = report.summary || {};
  const flips = d.filter(x => x.type === 'FLIP');
  const shifts = d.filter(x => x.type === 'SHIFT');
  const newGames = d.filter(x => x.type === 'NEW');

  return (
    <div style={{ fontFamily: font, background: C.bg, color: C.wh, minHeight: "100vh" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, marginBottom: 4 }}>V9.0 MONTE CARLO ENGINE</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0 }}>What&apos;s changed</h1>
            <div style={{ fontSize: 13, color: C.cyan, marginTop: 4 }}>
              {report.timestampCST || 'Unknown time'}
              {report.type === 'DELTA' && ` · ${d.length} change${d.length !== 1 ? 's' : ''} detected`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="/" style={{ fontSize: 13, color: C.blue, textDecoration: "none" }}>← Back to bracket</a>
            <a href="/report" style={{ fontSize: 13, color: C.purp, textDecoration: "none" }}>Performance →</a>
          </div>
        </div>

        {/* Baseline info */}
        {report.type === 'BASELINE_SET' && (
          <div style={{ padding: "16px 20px", background: `${C.gold}08`, border: `1px solid ${C.gold}33`, borderRadius: 8, marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: C.gold, fontWeight: 700, marginBottom: 4 }}>Baseline set</div>
            <div style={{ fontSize: 13, color: C.dim }}>
              {report.message || 'This is the baseline snapshot. The next pipeline run will show changes relative to this point.'}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 8 }}>
              {report.totalPredictions || 0} active predictions tracked
            </div>
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
          <StatBox label="Games Changed" value={s.gamesChanged || 0} color={s.gamesChanged > 0 ? C.cyan : C.dim} />
          <StatBox label="Winners Flipped" value={s.winnersFlipped || 0} color={s.winnersFlipped > 0 ? C.red : C.dim} />
          <StatBox label="New Matchups" value={s.newMatchups || 0} color={s.newMatchups > 0 ? C.grn : C.dim} />
          <StatBox label="Avg Spread Move" value={s.avgSpreadChange ? `${s.avgSpreadChange} pts` : "0"} color={C.purp} />
        </div>

        {/* Baseline → Current comparison */}
        {report.type === 'DELTA' && report.baselineTime && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, marginBottom: 20, alignItems: "center" }}>
            <div style={{ padding: "10px 14px", background: `${C.dim}08`, borderRadius: 6, border: `1px solid ${C.brd}`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1 }}>BASELINE</div>
              <div style={{ fontSize: 12, color: C.wh, marginTop: 4 }}>{report.baselineTime}</div>
            </div>
            <div style={{ textAlign: "center", fontSize: 18, color: C.cyan }}>→</div>
            <div style={{ padding: "10px 14px", background: `${C.cyan}08`, borderRadius: 6, border: `1px solid ${C.cyan}22`, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 1 }}>CURRENT</div>
              <div style={{ fontSize: 12, color: C.wh, marginTop: 4 }}>{report.currentTime}</div>
            </div>
          </div>
        )}

        {/* No changes */}
        {d.length === 0 && report.type === 'DELTA' && (
          <div style={{ padding: "20px", background: `${C.grn}08`, border: `1px solid ${C.grn}22`, borderRadius: 8, textAlign: "center", fontSize: 14, color: C.grn }}>
            ✅ No meaningful changes since baseline — predictions are stable.
          </div>
        )}

        {/* Winner flips (highlighted) */}
        {flips.length > 0 && (
          <>
            <SectionLabel text="WINNER FLIPS" color={C.red} />
            {flips.map((delta, i) => <DeltaCard key={`flip-${i}`} delta={delta} />)}
          </>
        )}

        {/* New matchups */}
        {newGames.length > 0 && (
          <>
            <SectionLabel text="NEW MATCHUPS" color={C.grn} />
            {newGames.map((delta, i) => <DeltaCard key={`new-${i}`} delta={delta} />)}
          </>
        )}

        {/* Shifts */}
        {shifts.length > 0 && (
          <>
            <SectionLabel text="PREDICTION SHIFTS" color={C.cyan} />
            {shifts.map((delta, i) => <DeltaCard key={`shift-${i}`} delta={delta} />)}
          </>
        )}

        {/* Biggest mover callout */}
        {s.biggestMover && d.length > 0 && (
          <div style={{ marginTop: 20, padding: "12px 16px", background: `${C.purp}08`, border: `1px solid ${C.purp}22`, borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: C.purp, fontWeight: 700 }}>Biggest mover:</span>{' '}
            <span style={{ color: C.wh }}>{s.biggestMover}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ fontSize: 11, color: C.dim, textAlign: "center", paddingTop: 14, marginTop: 24, borderTop: `1px solid ${C.brd}` }}>
          NCAA Prediction Engine {report.engineVersion || 'v9.0'} · Delta Report · Compared to{' '}
          {report.type === 'DELTA' ? 'baseline' : 'initial snapshot'}
        </div>
      </div>
    </div>
  );
}

function DeltaCard({ delta }) {
  const isFlip = delta.type === 'FLIP';
  const isNew = delta.type === 'NEW';
  const borderColor = isFlip ? C.red : isNew ? C.grn : C.cyan;

  return (
    <div style={{ marginBottom: 8, padding: "14px 16px", background: C.card, border: `0.5px solid ${C.brd}`, borderRadius: 8, borderLeft: `4px solid ${borderColor}` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{delta.matchup}</div>
          <div style={{ fontSize: 11, color: C.dim }}>{[delta.round, delta.region].filter(Boolean).join(' · ')}</div>
        </div>
        <div>
          {isFlip && <span style={{ fontSize: 10, padding: "2px 8px", background: `${C.red}20`, color: C.red, borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>FLIP</span>}
          {isNew && <span style={{ fontSize: 10, padding: "2px 8px", background: `${C.grn}20`, color: C.grn, borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>NEW</span>}
          {!isFlip && !isNew && <span style={{ fontSize: 10, padding: "2px 8px", background: `${C.cyan}20`, color: C.cyan, borderRadius: 4, fontWeight: 700, letterSpacing: 1 }}>SHIFT</span>}
        </div>
      </div>

      {isNew ? (
        <div style={{ marginTop: 8, fontSize: 13, color: C.wh }}>
          {delta.message || `${delta.winner} predicted to win (${delta.winProb}%)`}
        </div>
      ) : (
        <>
          {/* Before → After */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 30px 1fr", gap: 8, marginTop: 10 }}>
            <div style={{ padding: "8px 12px", background: "#0d1117", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.dim, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
              <div style={{ fontSize: 13, color: C.wh }}>
                <span style={{ fontWeight: 700 }}>{delta.baselineWinner}</span> wins
              </div>
              <div style={{ fontSize: 12, color: C.dim }}>
                {delta.baselineWinProb}% · spread {delta.baselineSpread > 0 ? '+' : ''}{delta.baselineSpread}
              </div>
              {delta.baselineScoreW != null && (
                <div style={{ fontSize: 11, color: C.dim }}>
                  {delta.baselineScoreW}-{delta.baselineScoreL}
                  {delta.baselineVegas != null && ` · Vegas: ${delta.baselineVegas > 0 ? '+' : ''}${delta.baselineVegas}`}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.cyan }}>→</div>
            <div style={{ padding: "8px 12px", background: "#0d1117", borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: C.grn, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
              <div style={{ fontSize: 13, color: C.wh }}>
                <span style={{ fontWeight: 700 }}>{delta.winner}</span> wins
              </div>
              <div style={{ fontSize: 12, color: C.dim }}>
                {delta.winProb}% · spread {delta.spread > 0 ? '+' : ''}{delta.spread}
              </div>
              {delta.scoreW != null && (
                <div style={{ fontSize: 11, color: C.dim }}>
                  {delta.scoreW}-{delta.scoreL}
                  {delta.vegasLine != null && ` · Vegas: ${delta.vegasLine > 0 ? '+' : ''}${delta.vegasLine}`}
                </div>
              )}
            </div>
          </div>

          {/* Change summary pills */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {delta.spreadChange != null && delta.spreadChange !== 0 && (
              <div style={{ fontSize: 12, color: Math.abs(delta.spreadChange) >= 2 ? C.red : C.purp, fontWeight: 700 }}>
                Spread: {delta.spreadChange > 0 ? '+' : ''}{delta.spreadChange} pts
              </div>
            )}
            {delta.probChange != null && delta.probChange !== 0 && (
              <div style={{ fontSize: 12, color: C.blue }}>
                Prob: {delta.probChange > 0 ? '+' : ''}{delta.probChange}%
              </div>
            )}
            {delta.vegasChange != null && delta.vegasChange !== 0 && (
              <div style={{ fontSize: 12, color: C.gold }}>
                Vegas: {delta.vegasChange > 0 ? '+' : ''}{delta.vegasChange} pts
              </div>
            )}
            {delta.simMedianBefore != null && delta.simMedianAfter != null && delta.simMedianBefore !== delta.simMedianAfter && (
              <div style={{ fontSize: 12, color: C.cyan }}>
                MC median: {delta.simMedianBefore} → {delta.simMedianAfter}
              </div>
            )}
          </div>
        </>
      )}

      {/* Factors */}
      {delta.factors && delta.factors.length > 0 && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.wh}04`, borderRadius: 4 }}>
          <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, fontWeight: 700, letterSpacing: 1 }}>WHY IT CHANGED</div>
          {delta.factors.map((f, fi) => (
            <div key={fi} style={{ fontSize: 12, color: f.includes('FLIPPED') ? C.red : C.wh, lineHeight: 1.6 }}>
              {f.includes('FLIPPED') ? '⚠️' : '📌'} {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
