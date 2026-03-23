"use client";
import { useState, useEffect, useMemo } from "react";

/* ── design tokens (matches bracket.js) ── */
const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d",
  tx: "#e6edf3", dim: "#7d8590",
  grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0",
};
const FONT = "'JetBrains Mono', Consolas, 'Courier New', monospace";
const safe = (o, ...p) => { let v = o; for (const k of p) { if (v == null) return null; v = v[k]; } return v; };

const ROUND_LABELS = { 0: "FF", 1: "R64", 2: "R32", 3: "S16", 4: "E8", 5: "F4", 6: "Champ" };
const ROUND_NAMES = { 0: "First Four", 1: "Round of 64", 2: "Round of 32", 3: "Sweet 16", 4: "Elite 8", 5: "Final Four", 6: "Championship" };

/* ══════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════ */
export default function ReportPage() {
  const [report, setReport] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [snapshot, setSnapshot] = useState([]);
  const [weights, setWeights] = useState(null);
  const [learnState, setLearnState] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const tryFetch = (url) => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    Promise.all([
      tryFetch("/data/reports/latest.json"),
      fetch("/data/bracket-display.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      tryFetch("/data/predictions-snapshot.json"),
      tryFetch("/data/weights.json"),
      tryFetch("/data/learning-state.json"),
    ]).then(([rep, brk, snap, wt, ls]) => {
      setReport(rep);
      setBracket(brk);
      setSnapshot(Array.isArray(snap) ? snap : []);
      // Fall back to weights from report if standalone fetch failed
      setWeights(wt ?? safe(rep, "v8Baseline", "finalWeights") ?? safe(rep, "currentWeights"));
      setLearnState(ls);
    }).catch(e => setErr(e.message));
  }, []);

  // Compute graded games from bracket + snapshot
  const graded = useMemo(() => {
    if (!bracket) return [];
    const games = [];
    for (const round of (bracket.rounds || [])) {
      for (const g of round.g) {
        if (g.status !== "FINAL") continue;
        const actualMargin = (g.sW ?? g.scoreW ?? 0) - (g.sL ?? g.scoreL ?? 0);
        // Match snapshot
        const snap = snapshot.find(s =>
          (s.teamA === g.teamA && s.teamB === g.teamB) ||
          (s.teamA === g.teamB && s.teamB === g.teamA)
        );
        const predWinner = snap?.winner ?? g.w;
        const predSpread = snap ? Math.abs(snap.blendedSpread ?? snap.modelSpread ?? 0) : (g.sp ?? Math.abs(g.modelSp ?? g.modelSpread ?? 0));
        const vegasLine = snap?.vegasLine ?? g.vegasLine ?? g.vegasSp;
        const winProb = snap?.winProb ?? g.wp ?? 50;
        const modelError = Math.abs(actualMargin - predSpread);
        const vegasError = vegasLine != null ? Math.abs(actualMargin - Math.abs(vegasLine)) : null;
        const correct = predWinner === g.w;
        const wSeed = g.sW2 ?? g.seedW;
        const lSeed = g.sL2 ?? g.seedL;
        const isUpset = lSeed != null && wSeed != null && lSeed < wSeed;
        const hasSnap = !!snap;

        games.push({
          ...g, actualMargin, predWinner, predSpread, vegasLine, winProb,
          modelError, vegasError, correct, isUpset, hasSnap, rd: g.rd ?? g.round ?? 0,
          wSeed, lSeed,
        });
      }
    }
    return games;
  }, [bracket, snapshot]);

  if (err) return <Shell><p style={{ color: C.red }}>Failed to load: {err}</p></Shell>;
  if (!bracket) return <Shell><p style={{ color: C.dim, textAlign: "center", padding: 40 }}>Loading report...</p></Shell>;

  const totalGraded = graded.length;
  const timestamp = bracket.timestampCST || report?.generatedAtCST || "";

  return (
    <Shell>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>v9.0 MONTE CARLO ENGINE</div>
            <h1 style={{ margin: 0, fontSize: 20, color: C.tx }}>Model performance</h1>
          </div>
          <a href="/" style={{ fontSize: 12, color: C.purp, textDecoration: "none" }}>← Back to bracket</a>
        </div>
        <div style={{ fontSize: 11, color: C.cyan, marginTop: 4 }}>{timestamp} · {totalGraded} games graded</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        {["overview", "gamelog", "tuning"].map(t => (
          <TabBtn key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "overview" ? "Overview" : t === "gamelog" ? "Game log" : "Model tuning"}
          </TabBtn>
        ))}
      </div>

      {tab === "overview" && <OverviewTab graded={graded} report={report} />}
      {tab === "gamelog" && <GameLogTab graded={graded} />}
      {tab === "tuning" && <TuningTab weights={weights} report={report} learnState={learnState} />}
    </Shell>
  );
}

/* ── Shell + TabBtn (same as bracket.js) ── */
function Shell({ children }) {
  return (
    <div style={{ background: C.bg, color: C.tx, minHeight: "100vh", padding: 16, fontFamily: FONT, maxWidth: 700, margin: "0 auto" }}>
      {children}
    </div>
  );
}
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.card : "transparent", color: active ? C.tx : C.dim,
      border: `1px solid ${active ? C.brd : "transparent"}`, borderRadius: 6,
      padding: "8px 20px", fontFamily: FONT, fontSize: 13, cursor: "pointer", fontWeight: active ? 700 : 400,
    }}>{children}</button>
  );
}

/* ══════════════════════════════════════════
   OVERVIEW TAB
   ══════════════════════════════════════════ */
function OverviewTab({ graded, report }) {
  const total = graded.length;
  const correctCount = graded.filter(g => g.correct).length;
  const suPct = total > 0 ? (correctCount / total * 100) : 0;

  const withVegas = graded.filter(g => g.vegasLine != null);
  const beatVegasCount = withVegas.filter(g => g.modelError < (g.vegasError ?? Infinity)).length;
  const atsPct = withVegas.length > 0 ? (beatVegasCount / withVegas.length * 100) : 0;

  const avgError = total > 0 ? graded.reduce((s, g) => s + g.modelError, 0) / total : 0;
  const avgVegasErr = withVegas.length > 0 ? withVegas.reduce((s, g) => s + (g.vegasError ?? 0), 0) / withVegas.length : 0;

  // By round
  const byRound = {};
  for (const g of graded) {
    const rd = g.rd;
    if (!byRound[rd]) byRound[rd] = { correct: 0, total: 0 };
    byRound[rd].total++;
    if (g.correct) byRound[rd].correct++;
  }

  // Confidence tiers
  const tiers = [
    { label: "75%+ confidence", min: 75, max: 100, mid: 85 },
    { label: "60-75% confidence", min: 60, max: 75, mid: 67 },
    { label: "<60% confidence", min: 0, max: 60, mid: 55 },
  ].map(t => {
    const games = graded.filter(g => g.winProb >= t.min && g.winProb < (t.max === 100 ? 101 : t.max));
    const correct = games.filter(g => g.correct).length;
    const rate = games.length > 0 ? (correct / games.length * 100) : 0;
    return { ...t, games: games.length, correct, rate };
  });

  // Best calls & biggest misses
  const correctGames = graded.filter(g => g.correct).sort((a, b) => a.modelError - b.modelError);
  const bestCalls = correctGames.slice(0, 3);
  const misses = [...graded].sort((a, b) => {
    if (!a.correct && b.correct) return -1;
    if (a.correct && !b.correct) return 1;
    return b.modelError - a.modelError;
  }).slice(0, 3);

  // v8 baseline
  const v8 = report?.v8Baseline ?? { gamesGraded: 34, straightUpPct: 76.5, atsPct: 44.1 };

  // v9 games (rd >= 3)
  const v9Games = graded.filter(g => g.rd >= 3);
  const v9Correct = v9Games.filter(g => g.correct).length;
  const v9SuPct = v9Games.length > 0 ? (v9Correct / v9Games.length * 100) : 0;
  const v9AvgErr = v9Games.length > 0 ? v9Games.reduce((s, g) => s + g.modelError, 0) / v9Games.length : 0;

  return (
    <div>
      {/* Cumulative performance */}
      <SectionLabel color={C.cyan}>CUMULATIVE PERFORMANCE</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
        <StatBox label="Straight-up" value={`${suPct.toFixed(1)}%`} sub={`${correctCount}/${total}`} color={suPct >= 70 ? C.grn : suPct >= 60 ? C.gold : C.dim} />
        <StatBox label="vs Spread" value={`${atsPct.toFixed(1)}%`} sub={`${beatVegasCount}/${withVegas.length}`} color={atsPct >= 55 ? C.grn : C.dim} />
        <StatBox label="Beat Vegas" value={`${atsPct.toFixed(1)}%`} sub={`${beatVegasCount}/${withVegas.length}`} color={atsPct >= 50 ? C.blue : C.dim} />
        <StatBox label="Avg error" value={`${avgError.toFixed(1)} pts`} sub={`Vegas: ${avgVegasErr.toFixed(1)}`} color={C.dim} />
      </div>

      {/* By round */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 6].map(rd => {
          const r = byRound[rd];
          const pctR = r ? (r.correct / r.total * 100).toFixed(0) : null;
          return (
            <div key={rd} style={{
              flex: "1 1 60px", textAlign: "center", padding: "6px 4px",
              background: C.card, border: `1px solid ${r ? C.brd : C.cyan + "33"}`, borderRadius: 6,
            }}>
              <div style={{ fontSize: 9, color: C.dim }}>{ROUND_LABELS[rd]}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: pctR ? (pctR >= 70 ? C.grn : pctR >= 60 ? C.gold : C.red) : C.cyan }}>{pctR ? `${pctR}%` : "—"}</div>
              {r && <div style={{ fontSize: 9, color: C.dim }}>{r.correct}/{r.total}</div>}
            </div>
          );
        })}
      </div>

      {/* Daily trend */}
      <DailyTrend graded={graded} />

      {/* Engine comparison */}
      <SectionLabel color={C.blue}>ENGINE COMPARISON</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <EngineCard
          label="v8 · deterministic" sub="First Four through Round of 32" badge="archived" badgeColor={C.dim}
          borderColor={C.dim} suPct={v8.straightUpPct ?? 76.5} atsPct={v8.atsPct ?? 44.1}
          games={v8.gamesGraded ?? 34} extra={null}
        />
        <EngineCard
          label="v9 · Monte Carlo" sub="Sweet 16 onward" badge="active" badgeColor={C.cyan}
          borderColor={C.cyan} suPct={v9Games.length > 0 ? v9SuPct : null} atsPct={null}
          games={v9Games.length}
          extra={v9Games.length === 0 ? <div style={{ fontSize: 11, color: C.cyan, fontStyle: "italic", marginTop: 6 }}>Waiting for Sweet 16 results...</div> : <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>{v9Games.length} games, 10k sims each · Avg err: {v9AvgErr.toFixed(1)}</div>}
        />
      </div>

      {/* Confidence calibration */}
      <SectionLabel color={C.purp}>CONFIDENCE CALIBRATION</SectionLabel>
      <div style={{ marginBottom: 16 }}>
        {tiers.map(t => (
          <div key={t.label} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: C.dim }}>{t.label}</span>
              <span style={{ color: t.rate >= t.mid ? C.grn : C.red }}>{t.rate.toFixed(0)}% ({t.correct}/{t.games})</span>
            </div>
            <div style={{ height: 12, background: C.brd, borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(t.rate, 100)}%`, background: t.rate >= t.mid ? C.grn + "66" : C.red + "66", borderRadius: 4 }} />
              <div style={{ position: "absolute", top: 0, left: `${t.mid}%`, width: 2, height: "100%", background: C.purp }} />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>Filled bar = actual win rate. Purple line = predicted confidence midpoint. Ideally the bar reaches the purple line.</div>
      </div>

      {/* Best calls & biggest misses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <SectionLabel color={C.grn}>BEST CALLS</SectionLabel>
          {bestCalls.length === 0 ? <Dim>No data</Dim> : bestCalls.map((g, i) => (
            <CallCard key={i} g={g} color={C.grn} />
          ))}
        </div>
        <div>
          <SectionLabel color={C.red}>BIGGEST MISSES</SectionLabel>
          {misses.length === 0 ? <Dim>No data</Dim> : misses.map((g, i) => (
            <CallCard key={i} g={g} color={C.red} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyTrend({ graded }) {
  const byDate = {};
  for (const g of graded) {
    // Use date from the game or fall back to a single bucket
    const d = g.date ?? "2026-03-23";
    if (!byDate[d]) byDate[d] = { correct: 0, total: 0 };
    byDate[d].total++;
    if (g.correct) byDate[d].correct++;
  }
  const dates = Object.keys(byDate).sort();
  if (dates.length <= 1) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel color={C.gold}>DAILY TREND</SectionLabel>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 60 }}>
        {dates.map(d => {
          const pctD = (byDate[d].correct / byDate[d].total * 100);
          const barColor = pctD >= 70 ? C.grn : pctD >= 60 ? C.gold : C.red;
          return (
            <div key={d} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: Math.max(pctD * 0.5, 2), background: barColor + "88", borderRadius: "2px 2px 0 0" }} />
              <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>{d.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngineCard({ label, sub, badge, badgeColor, borderColor, suPct, atsPct, games, extra }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${borderColor}33`, borderRadius: 8, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.tx }}>{label}</span>
        <span style={{ fontSize: 9, color: badgeColor, border: `1px solid ${badgeColor}44`, borderRadius: 4, padding: "1px 6px" }}>{badge}</span>
      </div>
      <div style={{ fontSize: 10, color: C.dim, marginBottom: 8 }}>{sub}</div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.8 }}>
        <div>SU: <span style={{ color: suPct != null ? (suPct >= 70 ? C.grn : C.gold) : C.dim, fontWeight: 700 }}>{suPct != null ? `${suPct.toFixed(1)}%` : "—"}</span></div>
        {atsPct != null && <div>ATS: <span style={{ color: atsPct >= 50 ? C.blue : C.dim }}>{atsPct.toFixed(1)}%</span></div>}
        <div>Games: {games}</div>
      </div>
      {extra}
    </div>
  );
}

function CallCard({ g, color }) {
  return (
    <div style={{ fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${C.brd}`, lineHeight: 1.6 }}>
      <div style={{ color: C.tx, fontWeight: 700 }}>{g.w} {g.sW ?? g.scoreW}-{g.sL ?? g.scoreL}</div>
      <div style={{ color: C.dim }}>
        Pred: {g.predSpread.toFixed(1)} → Actual: {g.actualMargin}
        <span style={{ color, marginLeft: 6 }}>Err: {g.modelError.toFixed(1)}</span>
        {g.isUpset && <span style={{ color: C.red, marginLeft: 6 }}>upset</span>}
        {!g.correct && <span style={{ color: C.red, marginLeft: 4 }}>❌ picked {g.predWinner}</span>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   GAME LOG TAB
   ══════════════════════════════════════════ */
function GameLogTab({ graded }) {
  const sorted = useMemo(() =>
    [...graded].sort((a, b) => (b.rd ?? 0) - (a.rd ?? 0)),
    [graded]
  );

  return (
    <div>
      <SectionLabel color={C.blue}>ALL GRADED GAMES ({sorted.length})</SectionLabel>
      {sorted.map((g, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 2,
          background: g.correct ? (g.modelError < 5 ? C.grn + "08" : C.card) : C.red + "08",
          borderRadius: 4, borderLeft: `3px solid ${g.correct ? C.grn : C.red}44`,
        }}>
          {/* Verdict */}
          <span style={{ fontSize: 14, flexShrink: 0 }}>{g.correct ? "✅" : "❌"}</span>

          {/* Game info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: C.tx }}>{g.w}</span>
              <span style={{ color: C.dim }}>{g.sW ?? g.scoreW}-{g.sL ?? g.scoreL}</span>
              <span style={{ color: C.dim }}>{g.l}</span>
              <span style={{ fontSize: 9, color: C.blue, border: `1px solid ${C.blue}33`, borderRadius: 3, padding: "0 4px" }}>{ROUND_LABELS[g.rd] ?? `R${g.rd}`}</span>
              {g.isUpset && <span style={{ fontSize: 9, color: C.red, fontWeight: 700 }}>upset</span>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ textAlign: "right", flexShrink: 0, fontSize: 10, lineHeight: 1.6 }}>
            <div><span style={{ color: C.purp }}>Pred: {g.predSpread.toFixed(1)}</span></div>
            <div><span style={{ color: C.tx }}>Act: {g.actualMargin}</span> <span style={{ color: g.modelError < 5 ? C.grn : g.modelError < 10 ? C.gold : C.red }}>Err: {g.modelError.toFixed(1)}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════
   MODEL TUNING TAB
   ══════════════════════════════════════════ */
function TuningTab({ weights, report, learnState }) {
  return (
    <div>
      <WeightsSection weights={weights} />
      <AdjustmentsSection report={report} />
      <VolatilitySection learnState={learnState} />
    </div>
  );
}

function WeightsSection({ weights }) {
  if (!weights) return <div style={{ marginBottom: 16 }}><SectionLabel color={C.gold}>CURRENT WEIGHTS</SectionLabel><Dim>No weights data</Dim></div>;

  const layers = weights.layers ?? {};
  const layerEntries = [
    { key: "L1", label: "L1 Efficiency", color: C.grn },
    { key: "L2", label: "L2 Four factors", color: C.blue },
    { key: "L3", label: "L3 Context", color: C.purp },
    { key: "L4", label: "L4 Coaching", color: C.gold },
    { key: "L5", label: "L5 Fatigue", color: C.red },
  ];
  const total = layerEntries.reduce((s, l) => s + (layers[l.key] ?? 0), 0) || 1;

  const vb = weights.vegasBlend ?? 0.75;
  const sigma = weights.sigma;
  const recency = weights.recency ?? {};

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel color={C.gold}>CURRENT WEIGHTS <span style={{ color: C.dim, fontWeight: 400 }}>v{weights.version ?? "?"}</span></SectionLabel>

      {/* Layer bar */}
      <div style={{ display: "flex", height: 28, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        {layerEntries.map(l => {
          const w = layers[l.key] ?? 0;
          const pctW = (w / total) * 100;
          return (
            <div key={l.key} style={{
              width: `${pctW}%`, background: l.color + "66",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: C.tx, fontWeight: 700,
            }}>
              {pctW > 8 ? `${pctW.toFixed(0)}%` : ""}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 10, marginBottom: 12 }}>
        {layerEntries.map(l => (
          <span key={l.key} style={{ color: l.color }}>{l.label}: {((layers[l.key] ?? 0) * 100).toFixed(1)}%</span>
        ))}
      </div>

      {/* Parameters */}
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.8, marginBottom: 8 }}>
        <div>Vegas blend: <span style={{ color: C.blue }}>{(vb * 100).toFixed(0)}%</span> (model {((1 - vb) * 100).toFixed(0)}% / Vegas {(vb * 100).toFixed(0)}%)</div>
        {sigma != null && <div>Sigma: <span style={{ color: C.cyan }}>{sigma.toFixed(1)}</span> (started at 11.0)</div>}
      </div>

      {/* Recency weights */}
      {Object.keys(recency).length > 0 && (
        <div style={{ fontSize: 10, color: C.dim }}>
          <div style={{ marginBottom: 2, color: C.dim }}>Recency weights:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(recency).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <span key={k} style={{ color: v > 0.5 ? C.grn : C.dim }}>{k}: {v.toFixed(2)}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustmentsSection({ report }) {
  const adj = report?.adjustments;
  if (!adj) return null;

  const changes = Array.isArray(adj) ? adj : (adj.changes ?? []);
  const before = adj.before;
  const after = adj.after;

  if (changes.length === 0 && !before) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel color={C.gold}>LATEST ADJUSTMENTS</SectionLabel>
      {changes.map((c, i) => (
        <div key={i} style={{ fontSize: 11, color: C.dim, padding: "3px 0", borderLeft: `2px solid ${C.gold}44`, paddingLeft: 8, marginBottom: 3 }}>
          📐 {c}
        </div>
      ))}
      {before && after && (
        <div style={{ fontSize: 10, color: C.dim, marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ color: C.dim, marginBottom: 2 }}>Before:</div>
            {Object.entries(before).map(([k, v]) => (
              <div key={k}>{k}: {typeof v === "number" ? v.toFixed(3) : String(v)}</div>
            ))}
          </div>
          <div>
            <div style={{ color: C.dim, marginBottom: 2 }}>After:</div>
            {Object.entries(after).map(([k, v]) => (
              <div key={k}>{k}: {typeof v === "number" ? v.toFixed(3) : String(v)}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VolatilitySection({ learnState }) {
  const teamK = learnState?.teamK;
  if (!teamK || Object.keys(teamK).length === 0) return null;

  const entries = Object.entries(teamK).map(([name, val]) => ({
    name,
    k: typeof val === "object" ? (val.k ?? 20) : (val ?? 20),
  }));

  const volatile = entries.filter(e => e.k > 24).sort((a, b) => b.k - a.k);
  const stable = entries.filter(e => e.k < 16).sort((a, b) => a.k - b.k);

  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel color={C.red}>TEAM VOLATILITY</SectionLabel>
      <div style={{ fontSize: 10, color: C.dim, marginBottom: 8, lineHeight: 1.6 }}>
        These teams get wider noise in Monte Carlo sims. High k = chaotic game-to-game variance. Low k = predictable.
      </div>

      {volatile.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: C.red, marginBottom: 4 }}>Volatile (k &gt; 24):</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {volatile.map(e => (
              <span key={e.name} style={{ fontSize: 10, color: C.red, background: C.red + "15", padding: "2px 8px", borderRadius: 4 }}>
                {e.name} k={e.k}
              </span>
            ))}
          </div>
        </div>
      )}

      {stable.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: C.grn, marginBottom: 4 }}>Stable (k &lt; 16):</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {stable.map(e => (
              <span key={e.name} style={{ fontSize: 10, color: C.grn, background: C.grn + "15", padding: "2px 8px", borderRadius: 4 }}>
                {e.name} k={e.k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   SHARED UI COMPONENTS
   ══════════════════════════════════════════ */
function SectionLabel({ color, children }) {
  return (
    <div style={{ fontSize: 11, color, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 4px", background: C.bg, border: `0.5px solid ${C.brd}`, borderRadius: 6 }}>
      <div style={{ fontSize: 9, color: C.dim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? C.tx }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.dim }}>{sub}</div>}
    </div>
  );
}

function Dim({ children }) {
  return <div style={{ fontSize: 11, color: C.dim }}>{children}</div>;
}
