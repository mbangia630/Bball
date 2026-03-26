"use client";
import { useState, useEffect, useMemo } from "react";

/* ── design tokens ── */
const C = {
  bg: "#0d1117", card: "#161b22", brd: "#30363d",
  tx: "#e6edf3", dim: "#7d8590",
  grn: "#3fb950", red: "#f85149", blue: "#58a6ff",
  purp: "#bc8cff", gold: "#d29922", cyan: "#39d2c0",
};
const FONT = "'JetBrains Mono', Consolas, 'Courier New', monospace";

/* ── helpers ── */
const pct = (v) => v != null ? `${Math.round(v * 10) / 10}%` : "—";
const pts = (v) => v != null ? v.toFixed(1) : "—";
const sign = (v) => v > 0 ? `+${v.toFixed(1)}` : v?.toFixed(1) ?? "—";
const clr = (v) => v > 0 ? C.grn : v < 0 ? C.red : C.dim;
const safe = (o, ...path) => { let v = o; for (const k of path) { if (v == null) return null; v = v[k]; } return v; };

function americanToDecimal(ml) {
  if (ml == null) return null;
  return ml > 0 ? 1 + ml / 100 : 1 + 100 / Math.abs(ml);
}

/* ── main component ── */
export default function Bracket() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [tab, setTab] = useState("bracket");
  const [betSub, setBetSub] = useState("singles");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/bracket-display.json").then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch("/data/predictions-snapshot.json").then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([bracket, snapshot]) => {
      // Merge v8 snapshot predictions into FINAL games missing sim data
      if (Array.isArray(snapshot) && snapshot.length > 0) {
        for (const round of (bracket.rounds || [])) {
          for (const g of round.g) {
            if (g.status !== "FINAL") continue;
            if (g.sim || (g.modelSpread && g.modelSpread !== 0)) continue;
            // Match by teamA/teamB names (exact, then fuzzy by shared team + same round)
            const snap = snapshot.find(s =>
              (s.teamA === g.teamA && s.teamB === g.teamB) ||
              (s.teamA === g.teamB && s.teamB === g.teamA)
            ) ?? snapshot.find(s =>
              s.round === (g.rd ?? g.round) &&
              (s.teamA === g.teamA || s.teamA === g.teamB ||
               s.teamB === g.teamA || s.teamB === g.teamB) &&
              (s.winner === g.w || s.winner === g.teamA || s.winner === g.teamB)
            );
            if (snap) {
              g._v8snap = snap;
              g._v8 = true;
              g.modelSpread = snap.modelSpread ?? snap.blendedSpread ?? 0;
              g.modelSp = g.modelSpread;
              g.blendedSpread = snap.blendedSpread ?? snap.modelSpread ?? 0;
              g.rawSp = g.blendedSpread;
              if (snap.vegasLine != null) { g.vegasLine = snap.vegasLine; g.vegasSp = snap.vegasLine; }
              if (snap.winProb != null) g.wp = snap.winProb;
              g._v8winner = snap.winner;
              // Spread is always positive (margin of victory for predicted winner)
              g.sp = Math.abs(g.blendedSpread);
              // Copy layer data if present
              if (snap.L1 != null) { g.L1 = snap.L1; g.L2 = snap.L2; g.L3 = snap.L3; g.L4 = snap.L4; g.L5 = snap.L5; }
            } else {
              g._v8 = false;
            }
          }
        }
      }
      setData(bracket);
    }).catch(e => setErr(e.message));
  }, []);

  if (err) return <Shell><p style={{ color: C.red }}>Failed to load: {err}</p></Shell>;
  if (!data) return <Shell><p style={{ color: C.dim, textAlign: "center", padding: 40 }}>Loading bracket...</p></Shell>;

  const rounds = data.rounds || [];

  return (
    <Shell>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, color: C.gold }}>NCAA Tournament Predictions</h1>
          <div style={{ fontSize: 11, color: C.dim }}>{data.timestampCST || ""} · {data.engineVersion || "v9"}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/changes" style={{ fontSize: 12, color: C.cyan, textDecoration: "none", border: `1px solid ${C.cyan}33`, borderRadius: 6, padding: "6px 12px" }}>What&apos;s Changed →</a>
          <a href="/report" style={{ fontSize: 12, color: C.purp, textDecoration: "none", border: `1px solid ${C.purp}33`, borderRadius: 6, padding: "6px 12px" }}>Performance →</a>
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <TabBtn active={tab === "bracket"} onClick={() => setTab("bracket")}>Bracket</TabBtn>
        <TabBtn active={tab === "bets"} onClick={() => setTab("bets")}>Bets</TabBtn>
      </div>

      {tab === "bracket" && <BracketTab rounds={rounds} expanded={expanded} setExpanded={setExpanded} />}
      {tab === "bets" && <BetsTab rounds={rounds} betSub={betSub} setBetSub={setBetSub} />}
    </Shell>
  );
}

/* ── shell ── */
function Shell({ children }) {
  return (
    <div style={{ background: C.bg, color: C.tx, minHeight: "100vh", padding: "16px", fontFamily: FONT, maxWidth: 700, margin: "0 auto" }}>
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
   BRACKET TAB
   ══════════════════════════════════════════ */
function BracketTab({ rounds, expanded, setExpanded }) {
  const ordered = useMemo(() => [...rounds].reverse(), [rounds]);

  return ordered.map(round => (
    <div key={round.n} style={{ marginBottom: 20 }}>
      <SectionLabel color={C.cyan}>{round.n}</SectionLabel>
      {round.g.map(g => (
        <div key={g.id}>
          <GameCard g={g} isExpanded={expanded === g.id} toggle={() => setExpanded(expanded === g.id ? null : g.id)} />
          {expanded === g.id && <GameDetail g={g} />}
        </div>
      ))}
    </div>
  ));
}

/* ── collapsed game card ── */
function GameCard({ g, isExpanded, toggle }) {
  const isFinal = g.status === "FINAL";
  const wp = g.wp ?? 50;
  const favProb = Math.max(wp, 100 - wp);
  const coinFlip = wp >= 45 && wp <= 55 && !isFinal;

  const wSeed = g.sW2 ?? g.seedW;
  const lSeed = g.sL2 ?? g.seedL;
  const isUpset = isFinal && lSeed != null && wSeed != null && lSeed < wSeed;

  const mSp = g.modelSp ?? g.modelSpread ?? 0;
  const vSp = g.vegasSp ?? g.vegasLine;
  const spread = g.sp ?? Math.abs(mSp);
  const closeGame = safe(g, "sim", "closeGame") ?? 0;
  const stdDev = safe(g, "sim", "stdDev");

  return (
    <div onClick={toggle} style={{
      background: C.card, border: `1px solid ${isExpanded ? C.blue + "66" : C.brd}`,
      borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer",
      transition: "border-color 0.2s",
    }}>
      {isFinal ? (
        <FinalCardBody g={g} wSeed={wSeed} lSeed={lSeed} isUpset={isUpset} />
      ) : (
        <ProjectedCardBody g={g} wp={wp} />
      )}

      {/* Probability bar */}
      {!isFinal && (
        <div style={{ height: 8, background: C.red + "33", borderRadius: 4, margin: "8px 0 6px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${favProb}%`, background: C.grn, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, marginTop: isFinal ? 6 : 0 }}>
        {isFinal ? (
          <FinalBottomRow g={g} mSp={mSp} vSp={vSp} />
        ) : (
          <ProjectedBottomRow g={g} spread={spread} vSp={vSp} closeGame={closeGame} stdDev={stdDev} />
        )}
      </div>

      {coinFlip && <span style={{ fontSize: 10, color: C.red, fontWeight: 700, marginTop: 4, display: "inline-block" }}>⚠ Coin flip</span>}
    </div>
  );
}

function ProjectedCardBody({ g, wp }) {
  const wProb = wp;
  const lProb = (100 - wp).toFixed(1);
  const wName = g.w ?? g.winner;
  const lName = g.l ?? g.loser;
  const wSeed = g.sW2 ?? g.seedW;
  const lSeed = g.sL2 ?? g.seedL;

  return (
    <div>
      <TeamRow seed={wSeed} name={wName} probOrScore={`${wProb}%`} probColor={C.grn} right={`${g.sW ?? g.scoreW ?? "—"}`} bold />
      <TeamRow seed={lSeed} name={lName} probOrScore={`${lProb}%`} probColor={C.red} right={`${g.sL ?? g.scoreL ?? "—"}`} />
    </div>
  );
}

function FinalCardBody({ g, wSeed, lSeed, isUpset }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
        <div>
          <span style={{ color: C.gold, fontSize: 11, marginRight: 6 }}>({wSeed})</span>
          <span style={{ color: C.grn, fontWeight: 700, fontSize: 13 }}>✓ {g.w}</span>
          {isUpset && <span style={{ fontSize: 10, color: C.red, fontWeight: 700, marginLeft: 6 }}>upset!</span>}
        </div>
        <span style={{ color: C.tx, fontSize: 13, fontWeight: 700 }}>{g.sW ?? g.scoreW}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ color: C.gold, fontSize: 11, marginRight: 6 }}>({lSeed})</span>
          <span style={{ color: C.dim, fontSize: 13 }}>{g.l}</span>
        </div>
        <span style={{ color: C.dim, fontSize: 13 }}>{g.sL ?? g.scoreL}</span>
      </div>
    </div>
  );
}

function FinalBottomRow({ g, mSp, vSp }) {
  const actualMargin = (g.sW ?? g.scoreW ?? 0) - (g.sL ?? g.scoreL ?? 0);
  const predictedSpread = g.sp ?? Math.abs(mSp);
  const hasPredict = g._v8 !== false && (predictedSpread > 0 || mSp !== 0);

  if (!hasPredict && !g._v8) {
    return (
      <>
        <span style={{ color: C.dim }}>FINAL {g.sW ?? g.scoreW}—{g.sL ?? g.scoreL}</span>
        <span style={{ color: C.dim }}>No prediction data</span>
      </>
    );
  }

  const v8Winner = g._v8winner ?? g.w;
  const actualWinner = g.w;
  const modelCorrect = v8Winner === actualWinner;
  const error = Math.abs(actualMargin - predictedSpread);

  return (
    <>
      <span style={{ color: modelCorrect ? C.grn : C.red }}>{modelCorrect ? "✅" : "❌"} FINAL</span>
      <span style={{ color: C.dim }}>Pred: {predictedSpread.toFixed(1)}</span>
      <span style={{ color: C.dim }}>Actual: {actualMargin}</span>
      <span style={{ color: error <= 3 ? C.grn : error <= 7 ? C.gold : C.red }}>Err: {error.toFixed(1)}</span>
      {!modelCorrect && <span style={{ color: C.red, fontSize: 9 }}>Picked {v8Winner}</span>}
      {g._v8 && <span style={{ color: C.dim, fontSize: 9 }}>(v8 prediction)</span>}
    </>
  );
}

function ProjectedBottomRow({ g, spread, vSp, closeGame, stdDev }) {
  return (
    <>
      <span style={{ color: C.purp }}>Spread: {spread.toFixed(1)}</span>
      {vSp != null && <span style={{ color: C.blue }}>Vegas: {sign(vSp)}</span>}
      <span style={{ color: closeGame > 60 ? C.gold : C.dim }}>Close: {closeGame.toFixed(0)}%</span>
      {stdDev != null && <span style={{ color: C.cyan }}>σ {stdDev.toFixed(1)}</span>}
      <span style={{ color: C.dim }}>{g.ven ?? g.venue ?? ""}</span>
    </>
  );
}

function TeamRow({ seed, name, probOrScore, probColor, right, bold = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
      <div>
        <span style={{ color: C.gold, fontSize: 11, marginRight: 6 }}>({seed})</span>
        <span style={{ color: bold ? C.tx : C.dim, fontWeight: bold ? 700 : 400, fontSize: 13 }}>{name}</span>
        <span style={{ color: probColor, fontSize: 11, marginLeft: 8 }}>{probOrScore}</span>
      </div>
      <span style={{ color: C.dim, fontSize: 13 }}>{right}</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   EXPANDED GAME DETAIL
   ══════════════════════════════════════════ */
function GameDetail({ g }) {
  const isFinal = g.status === "FINAL";
  const pa = g.a ?? safe(g, "profiles", "a") ?? {};
  const pb = g.b ?? safe(g, "profiles", "b") ?? {};
  const sim = g.sim;
  const hasVegas = g.vegasLine != null || g.vegasSp != null || g.moneyline != null;

  return (
    <div style={{ background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 8, padding: 12, marginBottom: 8, marginTop: -2 }}>
      <SectionA g={g} isFinal={isFinal} />
      {!isFinal && sim && <SectionB g={g} sim={sim} />}
      <SectionC g={g} pa={pa} pb={pb} />
      <SectionD g={g} pa={pa} pb={pb} />
      {!isFinal && hasVegas && <SectionE g={g} sim={sim} />}
    </div>
  );
}

/* ── Section A: Headline ── */
function SectionA({ g, isFinal }) {
  const wp = g.wp ?? 50;
  const mSp = g.modelSp ?? g.modelSpread ?? 0;
  const vSp = g.vegasSp ?? g.vegasLine;
  const blend = g.rawSp ?? g.blendedSpread ?? g.finalSpread ?? mSp;
  const edge = g.edge ?? (vSp != null ? Math.abs(Math.abs(mSp) - Math.abs(vSp)) : null);
  const wSeed = g.sW2 ?? g.seedW;
  const lSeed = g.sL2 ?? g.seedL;

  return (
    <div style={{
      textAlign: "center", padding: 16, marginBottom: 12,
      background: C.grn + "08", border: `1px solid ${C.grn}22`, borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{g.ven ?? g.venue} · Round {g.rd ?? g.round}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: C.grn }}>{wp}%</div>
      <div style={{ fontSize: 14, color: C.tx, marginBottom: 8 }}>
        ({wSeed}) {g.w} over ({lSeed}) {g.l}
      </div>

      {isFinal ? (
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{g.sW ?? g.scoreW} — {g.sL ?? g.scoreL}</div>
          {g.sp > 0 && <div style={{ fontSize: 11, color: C.dim }}>Model predicted spread: {g.sp.toFixed(1)}</div>}
        </div>
      ) : (
        <div style={{ fontSize: 22, fontWeight: 700 }}>{g.sW ?? g.scoreW} — {g.sL ?? g.scoreL}</div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: C.purp }}>Model: {sign(mSp)}</span>
        {vSp != null && <span style={{ color: C.blue }}>Vegas: {sign(vSp)}</span>}
        <span style={{ color: C.tx }}>Blend: {sign(blend)}</span>
        {edge != null && edge >= 2 && <span style={{ color: C.grn, fontWeight: 700 }}>Edge: {edge.toFixed(1)}</span>}
      </div>
    </div>
  );
}

/* ── Section B: Monte Carlo distribution ── */
function SectionB({ g, sim }) {
  const favName = g.w ?? g.winner;
  const udName = g.l ?? g.loser;

  const { bins, labels } = buildHistogramBins(sim);

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel color={C.cyan}>Monte Carlo distribution · {g.simCount?.toLocaleString() ?? "10,000"} sims</SectionLabel>

      {/* Histogram */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60, margin: "8px 0" }}>
        {bins.map((b, i) => (
          <div key={i} style={{
            flex: 1, height: Math.max(b.px, 2),
            background: b.side === "fav" ? C.grn + "88" : C.red + "88",
            borderRadius: "2px 2px 0 0",
          }} />
        ))}
      </div>
      {/* X-axis percentile labels */}
      <div style={{ position: "relative", height: 14, marginBottom: 4 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ position: "absolute", left: `${Math.min(Math.max(l.pct, 2), 95)}%`, transform: "translateX(-50%)", fontSize: 8, color: C.dim, whiteSpace: "nowrap" }}>
            {l.label}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.dim, margin: "0 0 8px" }}>
        <span>{udName} wins</span>
        <span>Even</span>
        <span>{favName} wins big</span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
        <MiniStat label="Median" value={sign(sim.median)} color={C.purp} />
        <MiniStat label="Volatility σ" value={sim.stdDev?.toFixed(1) ?? "—"} color={C.cyan} />
        <MiniStat label="Close game" value={pct(sim.closeGame)} color={sim.closeGame > 60 ? C.gold : C.dim} />
        {sim.coverProb != null ? (
          <MiniStat label="Cover" value={pct(sim.coverProb)} color={C.blue} />
        ) : (
          <MiniStat label="Cover" value="No line" color={C.dim} />
        )}
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
        80% confidence: {favName} wins by {sim.p25?.toFixed(1)} to {sim.p75?.toFixed(1)}<br />
        Blowout (15+): {pct((sim.blowoutA ?? 0) + (sim.blowoutB ?? 0))}<br />
        Upset: {pct(100 - (g.wp ?? 50))}
      </div>
    </div>
  );
}

function buildHistogramBins(sim) {
  if (!sim) return { bins: [], labels: [] };
  const med = sim.median ?? 0;
  const std = sim.stdDev ?? 5;
  const lo = (sim.p10 ?? med - 2 * std) - 2;
  const hi = (sim.p90 ?? med + 2 * std) + 2;
  const N = 12;
  const step = (hi - lo) / N;
  const raw = [];
  let maxH = 0;
  for (let i = 0; i < N; i++) {
    const center = lo + step * (i + 0.5);
    const z = (center - med) / (std || 1);
    const h = Math.exp(-0.5 * z * z);
    if (h > maxH) maxH = h;
    raw.push({ center, h });
  }
  const bins = raw.map(r => ({
    px: maxH > 0 ? (r.h / maxH) * 50 : 0,
    side: r.center >= 0 ? "fav" : "opp",
    center: r.center,
  }));
  // X-axis labels at key percentiles
  const labels = [
    { val: sim.p10, label: `p10: ${sim.p10?.toFixed(1)}` },
    { val: sim.p25, label: `p25: ${sim.p25?.toFixed(1)}` },
    { val: med, label: `med: ${med.toFixed(1)}` },
    { val: sim.p75, label: `p75: ${sim.p75?.toFixed(1)}` },
    { val: sim.p90, label: `p90: ${sim.p90?.toFixed(1)}` },
  ].filter(l => l.val != null).map(l => ({
    ...l,
    pct: ((l.val - lo) / (hi - lo)) * 100,
  }));
  return { bins, labels };
}

/* ── Section C: Head to head ── */
function SectionC({ g, pa, pb }) {
  const adj = g.adjStats ?? {};
  const stats = [
    { label: "AdjEM", a: pa.em, b: pb.em, adjKey: null },
    { label: "eFG%", a: pa.efg, b: pb.efg, adjKey: ["aEfg", "bEfg"] },
    { label: "TO Rate", a: pa.tor, b: pb.tor, adjKey: ["aTor", "bTor"] },
    { label: "ORB%", a: pa.orb, b: pb.orb, adjKey: ["aOrb", "bOrb"] },
    { label: "FTR", a: pa.ftr, b: pb.ftr, adjKey: ["aFtr", "bFtr"] },
    { label: "3PT%", a: pa.tpt, b: pb.tpt, adjKey: null },
    { label: "Elo", a: pa.elo, b: pb.elo, adjKey: null },
    { label: "Tempo", a: pa.t ?? pa.tempo, b: pb.t ?? pb.tempo, adjKey: null },
  ];

  const aName = pa.name ?? g.teamA;
  const bName = pb.name ?? g.teamB;
  const aSeed = pa.s ?? pa.seed ?? g.seedA;
  const bSeed = pb.s ?? pb.seed ?? g.seedB;

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel color={C.blue}>Head to head</SectionLabel>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: C.tx, fontWeight: 700 }}>{aName} ({aSeed}) · {pa.rec ?? pa.record ?? ""}</span>
        <span style={{ color: C.tx, fontWeight: 700 }}>{bName} ({bSeed}) · {pb.rec ?? pb.record ?? ""}</span>
      </div>
      {stats.map(s => {
        const isAdj = s.adjKey && adj[s.adjKey[0]] !== undefined &&
          (adj[s.adjKey[0]] !== (s.a ?? 0) || adj[s.adjKey[1]] !== (s.b ?? 0)) &&
          (adj[s.adjKey[0]] !== 0 || adj[s.adjKey[1]] !== 0);
        const aVal = s.a ?? 0;
        const bVal = s.b ?? 0;
        const isLowerBetter = s.label === "TO Rate";
        const aBetter = isLowerBetter ? aVal < bVal : aVal > bVal;
        const prefix = isAdj ? "⚔️ " : "";
        const aPct = Math.min((Math.abs(aVal) / (Math.abs(aVal) + Math.abs(bVal) + 0.01)) * 100, 100);

        return (
          <div key={s.label} style={{ display: "grid", gridTemplateColumns: "80px 50px 1fr 50px 80px", gap: 4, alignItems: "center", marginBottom: 3, fontSize: 11 }}>
            <span style={{ color: C.dim, textAlign: "left" }}>{prefix}{s.label}</span>
            <span style={{ color: aBetter ? C.grn : C.dim, textAlign: "right", fontWeight: aBetter ? 700 : 400 }}>{aVal?.toFixed(1)}</span>
            <div style={{ height: 6, background: C.brd, borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${aPct}%`, background: aBetter ? C.grn + "66" : C.blue + "66", borderRadius: 3 }} />
            </div>
            <span style={{ color: !aBetter ? C.blue : C.dim, textAlign: "left", fontWeight: !aBetter ? 700 : 400 }}>{bVal?.toFixed(1)}</span>
            <span style={{ color: C.dim, textAlign: "right" }}>{prefix}{s.label}</span>
          </div>
        );
      })}
      <div style={{ fontSize: 9, color: C.dim, marginTop: 4 }}>⚔️ = matchup-adjusted (style penalty/boost applied before simulation)</div>
    </div>
  );
}

/* ── Section D: Why this pick ── */
function SectionD({ g, pa, pb }) {
  const L1 = g.L1 ?? safe(g, "layers", "L1") ?? 0;
  const L2 = g.L2 ?? safe(g, "layers", "L2") ?? 0;
  const L3 = g.L3 ?? safe(g, "layers", "L3") ?? 0;
  const L4 = g.L4 ?? safe(g, "layers", "L4") ?? 0;
  const L5 = g.L5 ?? safe(g, "layers", "L5") ?? 0;
  const layers = [
    { name: "L1 efficiency", v: L1 },
    { name: "L2 four factors", v: L2 },
    { name: "L3 matchup", v: L3 },
    { name: "L4 context", v: L4 },
    { name: "L5 momentum", v: L5 },
  ];
  const total = layers.reduce((s, l) => s + Math.abs(l.v), 0) || 1;

  const muDet = safe(g, "mu", "det") ?? safe(g, "matchup", "details") ?? [];
  const v8 = g.v8 ?? {};
  const coaching = g.coaching ?? {};
  const cDiff = g.cDiff ?? safe(coaching, "diff") ?? 0;
  const fatA = safe(g, "fatA", "pts") ?? safe(g, "fatigue", "a") ?? 0;
  const fatB = safe(g, "fatB", "pts") ?? safe(g, "fatigue", "b") ?? 0;
  const ha = g.ha ?? safe(g, "hca", "team");
  const hb = g.hb ?? safe(g, "hca", "value") ?? 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel color={C.purp}>Why {g.w ?? g.winner} wins</SectionLabel>

      {/* Layer bar */}
      <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
        {layers.map(l => (
          <div key={l.name} style={{
            width: `${(Math.abs(l.v) / total) * 100}%`,
            background: l.v >= 0 ? C.grn + "88" : C.red + "88",
            minWidth: Math.abs(l.v) > 0.1 ? 2 : 0,
          }} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: C.dim, marginBottom: 10 }}>
        {layers.map(l => (
          <span key={l.name} style={{ color: l.v >= 0 ? C.grn : C.red }}>{l.name} {sign(l.v)}</span>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.8 }}>
        {ha ? (
          <div>🏠 HCA: {ha} +{typeof hb === "number" ? hb.toFixed(1) : hb}</div>
        ) : (
          <div>🏠 Neutral site (no HCA)</div>
        )}

        {muDet.length > 0 && muDet.map((m, i) => (
          <div key={i}>⚔️ {m.stat}: {m.team} {sign(m.impact ?? m.i)} — {m.desc ?? m.d}</div>
        ))}

        {["gs", "sharp", "cont", "ref", "foul", "tz"].map(k => {
          const val = v8[k];
          if (!val || val === 0) return null;
          const labels = { gs: "Game script", sharp: "Sharpness", cont: "Continuity", ref: "Ref impact", foul: "Foul trouble", tz: "Time zone" };
          return <div key={k}>🏀 {labels[k]}: <span style={{ color: clr(val) }}>{sign(val)}</span></div>;
        })}

        {(pa.coach || pb.coach || coaching.a) && (
          <div>🎓 {pa.coach ?? safe(coaching, "a", "name")} ({sign(pa.cAdj ?? safe(coaching, "a", "adj") ?? 0)}) vs {pb.coach ?? safe(coaching, "b", "name")} ({sign(pb.cAdj ?? safe(coaching, "b", "adj") ?? 0)}) → net {sign(cDiff)}</div>
        )}

        {(fatA !== 0 || fatB !== 0) && (
          <div>😴 Fatigue: {pa.name ?? g.teamA} {sign(fatA)}, {pb.name ?? g.teamB} {sign(fatB)}</div>
        )}
      </div>
    </div>
  );
}

/* ── Section E: Betting edge ── */
function SectionE({ g, sim }) {
  const mSp = g.modelSp ?? g.modelSpread ?? 0;
  const vSp = g.vegasSp ?? g.vegasLine;
  const ml = g.moneyline;
  const wp = g.wp ?? 50;
  const modelProb = wp / 100;

  let mlImplied = null, mlVerdict = null, mlEdge = 0;
  if (ml && Array.isArray(ml) && ml.length === 2) {
    const { wMl } = getWinnerMl(g);
    if (wMl != null) {
      mlImplied = mlImpliedProb(wMl) * 100;
      mlEdge = Math.abs(modelProb * 100 - mlImplied);
      if (mlEdge > 15) mlVerdict = `Strong value on ${g.w} ML`;
      else if (mlEdge > 5) mlVerdict = `Slight value on ${g.w} ML`;
      else mlVerdict = "No value — model agrees with Vegas";
    }
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionLabel color={C.gold}>Betting edge</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <MiniStat label="Model spread" value={sign(mSp)} color={C.purp} />
        <MiniStat label="Vegas spread" value={vSp != null ? sign(vSp) : "N/A"} color={C.blue} />
      </div>
      <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.8 }}>
        {vSp != null && (
          <div>Edge: <span style={{ color: clr(Math.abs(mSp) - Math.abs(vSp)) }}>{Math.abs(Math.abs(mSp) - Math.abs(vSp)).toFixed(1)} pts</span></div>
        )}
        {sim?.coverProb != null && (
          <div>Cover probability: <span style={{ color: sim.coverProb > 55 ? C.grn : C.dim }}>{pct(sim.coverProb)}</span></div>
        )}
        {mlImplied != null && (
          <>
            <div>Moneyline implied: {mlImplied.toFixed(1)}% vs Model: {(modelProb * 100).toFixed(1)}%</div>
            <div style={{ color: mlEdge > 5 ? C.grn : C.dim, fontWeight: mlEdge > 5 ? 700 : 400 }}>{mlVerdict}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   BETS TAB
   ══════════════════════════════════════════ */
function BetsTab({ rounds, betSub, setBetSub }) {
  const allGames = useMemo(() => rounds.flatMap(r => r.g), [rounds]);

  return (
    <div>
      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <TabBtn active={betSub === "singles"} onClick={() => setBetSub("singles")}>Singles</TabBtn>
        <TabBtn active={betSub === "parlays"} onClick={() => setBetSub("parlays")}>Parlays</TabBtn>
      </div>
      {betSub === "singles" ? <SinglesTab games={allGames} /> : <ParlaysTab games={allGames} />}
    </div>
  );
}

/* ── Singles ── */
function getWinnerMl(g) {
  // g.moneyline = [mlA, mlB]; find model winner's ML
  const ml = g.moneyline;
  if (!ml || !Array.isArray(ml) || ml.length < 2) return { wMl: null, lMl: null };
  const aName = safe(g, "a", "name") ?? g.teamA;
  const wIdx = (g.w === aName || g.winner === aName) ? 0 : 1;
  return { wMl: ml[wIdx], lMl: ml[1 - wIdx] };
}

function mlImpliedProb(ml) {
  if (ml == null) return 0;
  return ml < 0 ? Math.abs(ml) / (Math.abs(ml) + 100) : 100 / (ml + 100);
}

function mlPayout100(ml) {
  if (ml == null) return 0;
  return ml < 0 ? (100 / Math.abs(ml)) * 100 : ml;
}

function SinglesTab({ games }) {
  const bets = useMemo(() => {
    const results = [];
    // Only include games with real Vegas odds (moneyline + vegasLine both present)
    // This excludes projected future-round games that haven't been scheduled
    for (const g of games) {
      if (g.status === "FINAL") continue;
      const ml = g.moneyline;
      if (!Array.isArray(ml) || ml.length < 2) continue;
      const vl = g.vegasLine ?? g.vegasSp ?? null;
      if (vl == null) continue;

      const wp = (g.wp ?? 50) / 100;
      const sim = g.sim;
      const { wMl, lMl } = getWinnerMl(g);
      if (wMl == null) continue;

      // Bet on model winner
      const wImplied = mlImpliedProb(wMl);
      const wPayout = mlPayout100(wMl);
      const wEV = (wp * wPayout) - ((1 - wp) * 100);

      // Contrarian bet on model loser
      const lProb = 1 - wp;
      const lImplied = mlImpliedProb(lMl);
      const lPayout = mlPayout100(lMl);
      const lEV = (lProb * lPayout) - ((1 - lProb) * 100);

      // Spread bet
      const coverProb = safe(sim, "coverProb") ?? 0;
      const spreadEV = (coverProb / 100) * 90.91 - ((1 - coverProb / 100) * 100);

      // Pick best positive EV bet
      const options = [
        { ev: wEV, type: "ML", team: g.w, prob: wp * 100, implied: wImplied * 100, payout: wPayout, odds: wMl },
        { ev: lEV, type: "ML", team: g.l, prob: lProb * 100, implied: lImplied * 100, payout: lPayout, odds: lMl },
        { ev: spreadEV, type: "Spread", team: g.w, prob: coverProb, implied: 50, payout: 90.91, odds: -110 },
      ].filter(o => o.ev > 0).sort((a, b) => b.ev - a.ev);

      if (options.length === 0) continue;
      const best = options[0];

      results.push({
        g, ev: best.ev,
        type: best.type,
        betTeam: best.team,
        modelProb: best.prob,
        implied: best.implied,
        payout: best.payout,
        odds: best.odds,
        edge: best.prob - best.implied,
      });
    }
    return results.sort((a, b) => b.ev - a.ev);
  }, [games]);

  const withOdds = games.filter(g => Array.isArray(g.moneyline) && g.moneyline.length >= 2 && (g.vegasLine ?? g.vegasSp) != null && g.status !== "FINAL").length;

  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 12 }}>
        <span style={{ color: C.gold }}>{withOdds} games with odds · {bets.length} with positive EV</span>
        <span style={{ color: C.dim, marginLeft: 8 }}>Sorted by expected value</span>
      </div>
      {bets.length === 0 && <p style={{ color: C.dim, fontSize: 12 }}>No positive EV bets available right now.</p>}
      {bets.map((b, i) => <SingleBetCard key={i} b={b} />)}
    </div>
  );
}

function SingleBetCard({ b }) {
  const { g, ev, type, betTeam, modelProb, implied, payout, odds, edge } = b;
  const wSeed = g.sW2 ?? g.seedW;
  const lSeed = g.sL2 ?? g.seedL;
  const simCount = g.simCount ?? 10000;
  const wins = Math.round((modelProb / 100) * simCount);
  const opponent = betTeam === g.w ? g.l : g.w;
  const oddsStr = odds > 0 ? `+${odds}` : `${odds}`;

  return (
    <div style={{
      background: C.card, borderLeft: `3px solid ${C.grn}`,
      borderRadius: 8, padding: 12, marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.tx }}>
            {betTeam} {type} vs {opponent}
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>{g.ven ?? g.venue}</div>
        </div>
        <span style={{ background: C.grn + "22", color: C.grn, padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
          +${ev.toFixed(0)} EV
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
        <MiniStat label="Model prob" value={`${modelProb.toFixed(1)}%`} color={C.grn} />
        <MiniStat label={type === "ML" ? `Vegas (${oddsStr})` : "Spread -110"} value={`Implied ${implied?.toFixed(1)}%`} color={C.dim} />
        <MiniStat label="$100 payout" value={`$${payout.toFixed(0)}`} color={C.gold} />
      </div>
      <div style={{ fontSize: 11, color: C.dim }}>
        Model gives {betTeam} a {Math.abs(edge).toFixed(1)}% edge over implied odds. {betTeam} wins in {wins.toLocaleString()} of {simCount.toLocaleString()} sims.
      </div>
    </div>
  );
}

/* ── Parlays ── */
function ParlaysTab({ games }) {
  const parlays = useMemo(() => {
    const legs = [];
    for (const g of games) {
      if (g.status === "FINAL") continue;
      const ml = g.moneyline;
      if (!Array.isArray(ml) || ml.length < 2) continue;
      const vl = g.vegasLine ?? g.vegasSp ?? null;
      if (vl == null) continue;

      const wp = (g.wp ?? 50) / 100;
      const sim = g.sim;
      const coverProb = safe(sim, "coverProb");
      const { wMl } = getWinnerMl(g);

      if (wp >= 0.55 && wMl != null) {
        const mlDec = americanToDecimal(wMl);
        if (mlDec) legs.push({ g, type: "ML", prob: wp, dec: mlDec, label: `${g.w} ML` });
      }
      if (coverProb != null && coverProb / 100 >= 0.55) {
        legs.push({ g, type: "Spread", prob: coverProb / 100, dec: 1.909, label: `${g.w} spread` });
      }
    }

    const results = [];
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        if (legs[i].g.id === legs[j].g.id) continue;
        addParlay(results, [legs[i], legs[j]]);
      }
    }
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        if (legs[i].g.id === legs[j].g.id) continue;
        for (let k = j + 1; k < legs.length; k++) {
          if (legs[k].g.id === legs[i].g.id || legs[k].g.id === legs[j].g.id) continue;
          addParlay(results, [legs[i], legs[j], legs[k]]);
        }
      }
    }

    return results.sort((a, b) => b.ev - a.ev);
  }, [games]);

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 12, lineHeight: 1.6 }}>
        Combining legs where each has ≥55% model probability. Only showing parlays with ≥50% combined hit rate and positive expected value. Sorted by EV.
      </div>
      {parlays.length === 0 && <p style={{ color: C.dim, fontSize: 12 }}>No qualifying parlays available right now.</p>}
      {parlays.map((p, i) => <ParlayCard key={i} p={p} />)}
    </div>
  );
}

function addParlay(results, legs) {
  const combinedProb = legs.reduce((p, l) => p * l.prob, 1);
  const combinedDec = legs.reduce((d, l) => d * l.dec, 1);
  const ev = (combinedProb * (combinedDec - 1) * 100) - ((1 - combinedProb) * 100);
  if (combinedProb >= 0.5 && ev > 0) {
    results.push({ legs, combinedProb, combinedDec, ev });
  }
}

function ParlayCard({ p }) {
  const { legs, combinedProb, combinedDec, ev } = p;
  const payout = combinedDec * 100;
  const borderColor = ev > 20 ? C.grn : C.gold;

  return (
    <div style={{
      background: C.card, borderLeft: `3px solid ${borderColor}`,
      borderRadius: 8, padding: 12, marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{
            background: legs.length === 2 ? C.blue + "22" : C.purp + "22",
            color: legs.length === 2 ? C.blue : C.purp,
            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, marginRight: 8,
          }}>{legs.length} legs</span>
          <span style={{ fontSize: 12, color: C.tx }}>{legs.map(l => l.label).join(" + ")}</span>
        </div>
        <span style={{ background: C.grn + "22", color: C.grn, padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
          +${ev.toFixed(0)} EV
        </span>
      </div>

      {legs.map((l, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: i < legs.length - 1 ? `1px solid ${C.brd}` : "none" }}>
          <span style={{ color: C.dim }}>{l.g.w} vs {l.g.l} ({l.type})</span>
          <span style={{ color: C.grn }}>{(l.prob * 100).toFixed(1)}%</span>
        </div>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
        <MiniStat label="Combined prob" value={`${(combinedProb * 100).toFixed(1)}%`} color={C.grn} />
        <MiniStat label="$100 payout" value={`$${payout.toFixed(0)}`} sub={`${combinedDec.toFixed(2)}x`} color={C.gold} />
        <MiniStat label="Expected value" value={`+$${ev.toFixed(0)}`} color={C.grn} />
      </div>
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

function MiniStat({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center", padding: "6px 4px", background: (color ?? C.dim) + "08", borderRadius: 4 }}>
      <div style={{ fontSize: 9, color: C.dim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color ?? C.tx }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: C.dim }}>{sub}</div>}
    </div>
  );
}
