// ═══════════════════════════════════════════════════════
// NCAA PREDICTION ENGINE v9.0 — MONTE CARLO CORE
//
// Single source of all prediction logic.
// No other file touches basketball math.
//
// simulate(teamA, teamB, ctx) → full distribution
// ═══════════════════════════════════════════════════════

const SIMS = 10000;

// ─── Random number generation ───
function randn() {
  // Box-Muller transform → standard normal
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Noise profiles (σ per stat, calibrated from v8 learning) ───
const NOISE = {
  efg: 3.5,    // eFG% swings ±3.5% per game
  tpt: 5.0,    // 3PT% is the most volatile stat
  tor: 2.5,    // turnover rate variance
  orb: 3.0,    // offensive rebound %
  ftr: 2.0,    // free throw rate
  em: 4.0,     // adjusted efficiency margin
  off: 5.0,    // offensive rating
  def: 5.0,    // defensive rating
  tempo: 3.0,  // possessions per game
  hca: 1.5,    // home court advantage variance
  ref: 1.0,    // ref crew impact
};

// ─── Haversine distance (miles) ───
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Recency-weighted stat blending ───
function rw(season, recent, weight) {
  return season * (1 - weight) + recent * weight;
}

// ─── Round to nearest 0.5 (Vegas-style) ───
function r5(v) { return Math.round(v * 2) / 2; }

// ─── Build team profile from DB entry ───
function buildProfile(team, recencyWeights) {
  const w = recencyWeights;
  return {
    em: rw(team.em, team.em_r, w.em),
    efg: rw(team.efg, team.efg_r, w.efg),
    tor: rw(team.tor, team.tor_r, w.tor),
    orb: rw(team.orb, team.orb_r, w.orb),
    ftr: rw(team.ftr, team.ftr_r, w.ftr),
    tpt: rw(team.tpt, team.tpt_r, w.tpt),
    ast: rw(team.ast, team.ast_r, w.ast),
    mg: rw(team.mg, team.mg_r, w.mg),
    off: rw(team.o, team.o_r, w.em),
    def: rw(team.d, team.d_r, w.em),
    tempo: team.t,
    elo: team.elo || 1500,
    seed: team.s,
    name: team._name,
    // Contextual
    luck: team.lk || 0,
    sentiment: team.st || 0,
    confidenceIdx: team.ci || 0,
    injuryAdj: team.ij || 0,
    hcaBase: team.hb || 3.3,
    coachAdj: team.cAdj || 0,
    coach: team.coach || '',
    coachNote: team.cNote || '',
    kpRank: team.kp,
    record: team.rec,
    // Style (for matchup adjustments)
    style: team.style || {},
    // V8 extended data
    v8: team.v8 || {},
    // Fatigue data
    fatigue: team.fatigue || {},
  };
}

// ═══════════════════════════════════════════════════════
// MATCHUP ADJUSTMENTS (deterministic, applied before sims)
// ═══════════════════════════════════════════════════════
function calcMatchupAdjustments(a, b) {
  const adjA = { efg: 0, tor: 0, orb: 0, ftr: 0 };
  const adjB = { efg: 0, tor: 0, orb: 0, ftr: 0 };
  const details = [];
  let tempoAdj = 0;

  const sA = a.style, sB = b.style;
  if (!sA || !sB) return { adjA, adjB, details, tempoAdj };

  // 1. 3PT offense vs 3PT defense
  if (sA.p3 >= 0.42 && sB.d3r <= 25) {
    const pen = -(sA.p3 - 0.35) * 5.0;
    adjA.efg += pen;
    details.push({ stat: 'eFG%', team: a.name, impact: pen,
      desc: `${a.name}'s 3PT-heavy (${(sA.p3 * 100).toFixed(0)}%) faces ${b.name}'s #${sB.d3r} 3PT D` });
  }
  if (sB.p3 >= 0.42 && sA.d3r <= 25) {
    const pen = -(sB.p3 - 0.35) * 5.0;
    adjB.efg += pen;
    details.push({ stat: 'eFG%', team: b.name, impact: pen,
      desc: `${b.name}'s 3PT-heavy (${(sB.p3 * 100).toFixed(0)}%) faces ${a.name}'s #${sA.d3r} 3PT D` });
  }
  // 3PT feast (weak defense)
  if (sA.p3 >= 0.42 && sB.d3r >= 100) {
    const bst = (sA.p3 - 0.38) * 3.5;
    adjA.efg += bst;
    details.push({ stat: 'eFG%', team: a.name, impact: bst,
      desc: `${a.name}'s 3PT attack vs ${b.name}'s weak 3PT D (#${sB.d3r})` });
  }
  if (sB.p3 >= 0.42 && sA.d3r >= 100) {
    const bst = (sB.p3 - 0.38) * 3.5;
    adjB.efg += bst;
    details.push({ stat: 'eFG%', team: b.name, impact: bst,
      desc: `${b.name}'s 3PT attack vs ${a.name}'s weak 3PT D (#${sA.d3r})` });
  }

  // 2. Size mismatch → ORB% and FTR
  const htDiff = (sA.ht || 78) - (sB.ht || 78);
  if (Math.abs(htDiff) >= 2) {
    adjA.orb += htDiff * 0.4;  adjB.orb -= htDiff * 0.4;
    adjA.ftr += htDiff * 0.25; adjB.ftr -= htDiff * 0.25;
    details.push({ stat: 'ORB% & FTR', team: htDiff > 0 ? a.name : b.name, impact: Math.abs(htDiff * 0.4),
      desc: `${htDiff > 0 ? a.name : b.name} has ${Math.abs(htDiff)}" height edge` });
  }

  // 3. Turnover-forcing defense
  if ((sA.toF || 0) >= 11.0) {
    const adj = (sA.toF - 10.0) * 0.5;
    adjB.tor += adj;
    details.push({ stat: 'TO Rate', team: b.name, impact: adj,
      desc: `${a.name} forces ${sA.toF} TOs/g → ${b.name}'s TO rate +${adj.toFixed(1)}%` });
  }
  if ((sB.toF || 0) >= 11.0) {
    const adj = (sB.toF - 10.0) * 0.5;
    adjA.tor += adj;
    details.push({ stat: 'TO Rate', team: a.name, impact: adj,
      desc: `${b.name} forces ${sB.toF} TOs/g → ${a.name}'s TO rate +${adj.toFixed(1)}%` });
  }

  // 4. Tempo clash
  const td = Math.abs((sA.t || 68) - (sB.t || 68));
  if (td >= 5) {
    tempoAdj = (sA.t || 68) < (sB.t || 68) ? 0.3 : -0.3;
    details.push({ stat: 'Pace', team: (sA.t || 68) < (sB.t || 68) ? a.name : b.name, impact: tempoAdj,
      desc: `${Math.round(td)}-possession gap — slower team controls pace` });
  }

  return { adjA, adjB, details, tempoAdj };
}

// ═══════════════════════════════════════════════════════
// HOME COURT ADVANTAGE (Haversine GPS proximity)
// ═══════════════════════════════════════════════════════
function calcHCA(teamName, venue, hcaBase, locations, venues) {
  const teamLoc = locations[teamName];
  const venueLoc = venues[venue];
  if (!teamLoc || !venueLoc) return { dist: 999, boost: 0, tag: null };

  const dist = Math.round(haversine(teamLoc[0], teamLoc[1], venueLoc[0], venueLoc[1]));
  if (dist <= 50) return { dist, boost: hcaBase, tag: 'HOME' };
  if (dist <= 150) return { dist, boost: hcaBase * 0.4, tag: 'NEAR' };
  return { dist, boost: 0, tag: null };
}

// ═══════════════════════════════════════════════════════
// FATIGUE (compounds per round)
// ═══════════════════════════════════════════════════════
function calcFatigue(fatData, round) {
  if (!fatData || !fatData.bp || round <= 1) return 0;
  const benchVuln = Math.max(0, (30 - fatData.bp) / 20);
  const starLoad = Math.max(0, (fatData.sm - 31) / 7);
  const rotVuln = Math.max(0, (8 - fatData.rot) / 3);
  const seasonWear = Math.max(0, (fatData.gp - 33) / 8);
  const confTax = Math.max(0, (fatData.ctg - 1) * 0.15);
  const baseVuln = benchVuln * 0.30 + starLoad * 0.25 + rotVuln * 0.25 + seasonWear * 0.10 + confTax * 0.10;
  const roundMult = [0, 0, 0.3, 0.7, 1.2, 1.8, 2.5][Math.min(round, 6)];
  return -Math.round(baseVuln * roundMult * 100) / 100;
}

// ═══════════════════════════════════════════════════════
// V8 ADVANCED ADJUSTMENTS
// ═══════════════════════════════════════════════════════
function calcV8Adjustments(a, b, venue, rawSpread, venueTimezones) {
  const va = a.v8 || {}, vb = b.v8 || {};
  const def = { refSens: .5, gsLead: 10, gsTrail: 5, closeW: 2, closeL: 2, lineDir: 0, minCont: 40, expRk: 200, tz: 0, foulStar: 2.5, backupDrop: 5 };
  const av = { ...def, ...va }, bv = { ...def, ...vb };

  // Ref crew sensitivity
  const ref = (bv.refSens - av.refSens) * 0.3;

  // Game state (lead-holding vs comeback ability)
  let gs = 0;
  if (rawSpread > 0) {
    gs += (av.gsLead - av.gsTrail) / 200;
    gs -= (bv.gsTrail - bv.gsLead + 10) / 200;
  } else {
    gs -= (bv.gsLead - bv.gsTrail) / 200;
    gs += (av.gsTrail - av.gsLead + 10) / 200;
  }
  const aWP = av.closeW / (av.closeW + av.closeL + .001);
  const bWP = bv.closeW / (bv.closeW + bv.closeL + .001);
  gs += (aWP - bWP) * 0.8;

  // Sharp money
  const sharp = (av.lineDir - bv.lineDir) * 0.5;

  // Roster continuity + experience
  const cont = ((av.minCont - bv.minCont) / 100 * 0.6 + (bv.expRk - av.expRk) / 200 * 0.4);

  // Timezone travel
  const venTZ = (venueTimezones || {})[venue] || 0;
  const tz = (Math.abs((bv.tz || 0) - venTZ) - Math.abs((av.tz || 0) - venTZ)) * 0.15;

  // Foul trouble risk
  const foul = ((bv.foulStar / 5) * (bv.backupDrop / 10) * 0.3 - (av.foulStar / 5) * (av.backupDrop / 10) * 0.3);

  const total = ref + gs + sharp + cont + tz + foul;

  return {
    ref: Math.round(ref * 100) / 100,
    gs: Math.round(gs * 100) / 100,
    sharp: Math.round(sharp * 100) / 100,
    cont: Math.round(cont * 100) / 100,
    tz: Math.round(tz * 100) / 100,
    foul: Math.round(foul * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════
// SINGLE SIMULATION ITERATION
// ═══════════════════════════════════════════════════════
function simOnce(base, volatilityA, volatilityB) {
  const nA = volatilityA, nB = volatilityB;

  // Add noise to each team's stats
  const aEfg = base.aEfg + randn() * NOISE.efg * nA;
  const bEfg = base.bEfg + randn() * NOISE.efg * nB;
  const aTor = base.aTor + randn() * NOISE.tor * nA;
  const bTor = base.bTor + randn() * NOISE.tor * nB;
  const aOrb = base.aOrb + randn() * NOISE.orb * nA;
  const bOrb = base.bOrb + randn() * NOISE.orb * nB;
  const aFtr = base.aFtr + randn() * NOISE.ftr * nA;
  const bFtr = base.bFtr + randn() * NOISE.ftr * nB;
  const aEm = base.aEm + randn() * NOISE.em * nA;
  const bEm = base.bEm + randn() * NOISE.em * nB;
  const aOff = base.aOff + randn() * NOISE.off * nA;
  const bOff = base.bOff + randn() * NOISE.off * nB;
  const aDef = base.aDef + randn() * NOISE.def * nA;
  const bDef = base.bDef + randn() * NOISE.def * nB;

  const tempo = base.tempo + randn() * NOISE.tempo;
  const tf = (tempo * 2) / 200; // match v8: (tempoA + tempoB) / 200
  const hcaNoise = base.hca + randn() * NOISE.hca;

  // Foul trouble (15% chance star gets in trouble → apply backup drop penalty)
  let foulPenA = 0, foulPenB = 0;
  if (Math.random() < 0.15 && base.va.foulStar) {
    foulPenA = -(base.va.backupDrop || 0) * 0.3;
  }
  if (Math.random() < 0.15 && base.vb.foulStar) {
    foulPenB = -(base.vb.backupDrop || 0) * 0.3;
  }

  // Layer 1: Efficiency (uses v8 learned weight)
  const L1 = 1.1 * (aEm - bEm) * tf;

  // Layer 2: Four Factors (matchup-adjusted + noise)
  const L2 = ((aEfg - bEfg) * 1.8 * 0.4 +
    (bTor - aTor) * 1.2 * 0.25 +
    (aOrb - bOrb) * 0.7 * 0.18 +
    (aFtr - bFtr) * 0.6 * 0.17) * tf * 0.65;

  // Layer 3: Context (Elo, HCA, sentiment, luck, injuries)
  const L3 = ((base.aAst - base.bAst) * 0.06 +
    (base.aElo - base.bElo) / 25 * 0.3 -
    (base.aLuck - base.bLuck) * 4 +
    (base.aSent - base.bSent) * 1.2 -
    base.bCI * 0.5 +
    base.aInj - base.bInj +
    hcaNoise) * 0.65;

  // Layer 4: Coaching + tempo clash
  const L4 = (base.tempoAdj + base.coachDiff) * 0.65;

  // Layer 5: Fatigue
  const L5 = base.fatA - base.fatB;

  // V8 adjustments
  const v8 = base.v8total;

  // Combine layers (same as v8: direct sum, layer scaling is built into each formula)
  const raw = L1 + L2 + L3 + L4 + L5;

  // Add V8, foul trouble noise
  const spread = raw + v8 + foulPenA - foulPenB;

  // Calculate scores
  const avgPts = (tempo * (aOff + bDef) / 200 + tempo * (bOff + aDef) / 200) / 2;
  const scoreA = Math.round(avgPts + spread / 2);
  const scoreB = Math.round(avgPts - spread / 2);

  return { spread, scoreA, scoreB, L1, L2, L3, L4, L5 };
}

// ═══════════════════════════════════════════════════════
// MAIN SIMULATION FUNCTION
// ═══════════════════════════════════════════════════════
//
// ctx = { venue, round, weights, config }
//   weights = learned weights from v8/v9
//   config  = { locations, venues, venueTimezones }
//
function simulate(teamAData, teamBData, ctx) {
  const { venue, round, weights, config } = ctx;
  const rw_w = weights.recency || { em: .60, mg: .62, efg: .55, ast: .52, ftr: .47, orb: .47, tor: .42, tpt: .37 };

  // Build profiles
  const a = buildProfile(teamAData, rw_w);
  const b = buildProfile(teamBData, rw_w);

  // Matchup adjustments (deterministic)
  const mu = calcMatchupAdjustments(a, b);

  // Home court advantage
  const hcaA = calcHCA(a.name, venue, a.hcaBase, config.locations, config.venues);
  const hcaB = calcHCA(b.name, venue, b.hcaBase, config.locations, config.venues);
  let hcaVal = 0;
  if (hcaA.tag === 'HOME' && !hcaB.tag) hcaVal = hcaA.boost;
  else if (hcaB.tag === 'HOME' && !hcaA.tag) hcaVal = -hcaB.boost;
  else if (hcaA.tag === 'NEAR' && !hcaB.tag) hcaVal = hcaA.boost;
  else if (hcaB.tag === 'NEAR' && !hcaA.tag) hcaVal = -hcaB.boost;

  // Fatigue
  const fatA = calcFatigue(a.fatigue, round);
  const fatB = calcFatigue(b.fatigue, round);

  // V8 adjustments
  const rawEstimate = (a.em - b.em) * 0.7 + hcaVal; // rough spread for game-state calc
  const v8 = calcV8Adjustments(a, b, venue, rawEstimate, config.venueTimezones);

  // Team volatility (from v8 teamK learning, normalized)
  const teamKA = (teamAData._teamK || 20) / 20;
  const teamKB = (teamBData._teamK || 20) / 20;

  // Pre-compute deterministic base for sim iterations
  const base = {
    aEfg: a.efg + mu.adjA.efg, bEfg: b.efg + mu.adjB.efg,
    aTor: a.tor + mu.adjA.tor, bTor: b.tor + mu.adjB.tor,
    aOrb: a.orb + mu.adjA.orb, bOrb: b.orb + mu.adjB.orb,
    aFtr: a.ftr + mu.adjA.ftr, bFtr: b.ftr + mu.adjB.ftr,
    aEm: a.em, bEm: b.em,
    aOff: a.off, bOff: b.off,
    aDef: a.def, bDef: b.def,
    aAst: a.ast, bAst: b.ast,
    aElo: a.elo, bElo: b.elo,
    aLuck: a.luck, bLuck: b.luck,
    aSent: a.sentiment, bSent: b.sentiment,
    aInj: a.injuryAdj, bInj: b.injuryAdj,
    aCI: a.confidenceIdx, bCI: b.confidenceIdx,
    hca: hcaVal,
    tempo: (a.tempo + b.tempo) / 2,
    tempoAdj: mu.tempoAdj,
    coachDiff: (a.coachAdj - b.coachAdj) * 0.6,
    fatA, fatB,
    v8total: v8.total,
    va: a.v8, vb: b.v8,
    layerWeights: weights.layers || { L1: .42, L2: .28, L3: .18, L4: .08, L5: .04 },
  };

  // ═══ RUN MONTE CARLO ═══
  const margins = [];
  const scoresA = [];
  const scoresB = [];
  let winsA = 0;
  let layerSums = { L1: 0, L2: 0, L3: 0, L4: 0, L5: 0 };

  for (let i = 0; i < SIMS; i++) {
    const result = simOnce(base, teamKA, teamKB);
    margins.push(result.spread);
    scoresA.push(result.scoreA);
    scoresB.push(result.scoreB);
    if (result.spread > 0) winsA++;
    layerSums.L1 += result.L1;
    layerSums.L2 += result.L2;
    layerSums.L3 += result.L3;
    layerSums.L4 += result.L4;
    layerSums.L5 += result.L5;
  }

  // ═══ AGGREGATE RESULTS ═══
  margins.sort((a, b) => a - b);
  scoresA.sort((a, b) => a - b);
  scoresB.sort((a, b) => a - b);

  const medianMargin = margins[Math.floor(SIMS / 2)];
  const meanMargin = margins.reduce((s, v) => s + v, 0) / SIMS;
  const stdDev = Math.sqrt(margins.reduce((s, v) => s + (v - meanMargin) ** 2, 0) / SIMS);
  const winProbA = winsA / SIMS;

  // Vegas blend (post-simulation)
  const vegasBlend = weights.vegasBlend || 0.55;
  const vegasLine = ctx.vegasLine; // null if no line
  const modelSpread = r5(medianMargin);
  const finalSpread = vegasLine !== null && vegasLine !== undefined
    ? r5(modelSpread * (1 - vegasBlend) + vegasLine * vegasBlend)
    : modelSpread;

  // Determine winner from simulation (NOT from Vegas-blended spread)
  // The sim tells us who actually wins more often; Vegas blend only adjusts displayed spread
  const simWinnerIsA = winProbA >= 0.5;
  const winner = simWinnerIsA ? a.name : b.name;
  const loser = simWinnerIsA ? b.name : a.name;
  const winProb = simWinnerIsA ? winProbA : (1 - winProbA);

  // Median scores
  const medScoreA = scoresA[Math.floor(SIMS / 2)];
  const medScoreB = scoresB[Math.floor(SIMS / 2)];
  const scoreW = Math.max(medScoreA, medScoreB);
  const scoreL = Math.min(medScoreA, medScoreB);

  // Cover probability (how often does fav beat the vegas spread)
  let coverCount = 0;
  if (vegasLine !== null && vegasLine !== undefined) {
    for (const m of margins) {
      if (m > vegasLine) coverCount++;
    }
  }
  const coverProb = vegasLine !== null ? coverCount / SIMS : null;

  // Percentiles
  const p10 = margins[Math.floor(SIMS * 0.10)];
  const p25 = margins[Math.floor(SIMS * 0.25)];
  const p75 = margins[Math.floor(SIMS * 0.75)];
  const p90 = margins[Math.floor(SIMS * 0.90)];

  // Blowout / close game probabilities
  const blowoutA = margins.filter(m => m > 15).length / SIMS;
  const blowoutB = margins.filter(m => m < -15).length / SIMS;
  const closeGame = margins.filter(m => Math.abs(m) <= 5).length / SIMS;

  // Average layer contributions
  const avgLayers = {};
  for (const k of Object.keys(layerSums)) {
    avgLayers[k] = Math.round(layerSums[k] / SIMS * 10) / 10;
  }

  return {
    // Core prediction
    teamA: a.name, teamB: b.name,
    winner, loser,
    winProb: Math.round(winProb * 1000) / 10,
    modelSpread,
    finalSpread,
    vegasLine: vegasLine !== null ? r5(vegasLine) : null,
    edge: vegasLine !== null ? r5(modelSpread - vegasLine) : null,
    scoreW: Math.max(scoreW, scoreL + 1),
    scoreL: Math.min(scoreL, scoreW - 1),
    // Seeds
    seedA: a.seed, seedB: b.seed,
    seedW: winner === a.name ? a.seed : b.seed,
    seedL: loser === a.name ? a.seed : b.seed,
    // Monte Carlo distribution
    sim: {
      median: r5(medianMargin),
      mean: Math.round(meanMargin * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      p10: r5(p10), p25: r5(p25), p75: r5(p75), p90: r5(p90),
      blowoutA: Math.round(blowoutA * 1000) / 10,
      blowoutB: Math.round(blowoutB * 1000) / 10,
      closeGame: Math.round(closeGame * 1000) / 10,
      coverProb: coverProb !== null ? Math.round(coverProb * 1000) / 10 : null,
    },
    // Layer breakdown (averages across sims)
    layers: { ...avgLayers, v8: v8.total },
    // Matchup details
    matchup: { details: mu.details, adjA: mu.adjA, adjB: mu.adjB, tempoAdj: mu.tempoAdj },
    // Context
    hca: { team: hcaVal > 0 ? a.name : hcaVal < 0 ? b.name : null, value: Math.round(hcaVal * 10) / 10, distA: hcaA.dist, distB: hcaB.dist },
    fatigue: { a: fatA, b: fatB, net: Math.round((fatA - fatB) * 100) / 100 },
    v8,
    coaching: {
      a: { name: a.coach, adj: a.coachAdj, note: a.coachNote },
      b: { name: b.coach, adj: b.coachAdj, note: b.coachNote },
      diff: Math.round((a.coachAdj - b.coachAdj) * 0.6 * 10) / 10,
    },
    // Team profiles (for display)
    profiles: { a, b },
    // Adjusted stats (after matchup)
    adjStats: {
      aEfg: Math.round(base.aEfg * 10) / 10, bEfg: Math.round(base.bEfg * 10) / 10,
      aTor: Math.round(base.aTor * 10) / 10, bTor: Math.round(base.bTor * 10) / 10,
      aOrb: Math.round(base.aOrb * 10) / 10, bOrb: Math.round(base.bOrb * 10) / 10,
      aFtr: Math.round(base.aFtr * 10) / 10, bFtr: Math.round(base.bFtr * 10) / 10,
    },
    // Metadata
    venue, round,
    moneyline: ctx.moneyline || null,
    engineVersion: 'v9.0-montecarlo',
    simCount: SIMS,
  };
}

module.exports = { simulate, buildProfile, calcMatchupAdjustments, calcHCA, calcFatigue, calcV8Adjustments, r5, haversine, SIMS };

// ═══ V8-COMPATIBLE OUTPUT MAPPER ═══
// Maps v9 simulate() output to field names bracket.js expects
function toV8Format(result) {
  if (!result) return result;
  return {
    ...result,
    // v8 short field names
    w: result.winner, l: result.loser,
    sW: result.scoreW, sL: result.scoreL,
    wp: result.winProb,
    sp: Math.abs(result.finalSpread || result.modelSpread || 0),
    sW2: result.seedW || result.seedA, sL2: result.seedL || result.seedB,
    ven: result.venue,
    modelSp: result.modelSpread,
    vegasSp: result.vegasLine,
    rawSp: result.finalSpread,
    // Layer compat
    L1: result.layers?.L1 || 0, L2: result.layers?.L2 || 0,
    L3: result.layers?.L3 || 0, L4: result.layers?.L4 || 0,
    L5: result.layers?.L5 || 0,
    v8adj: result.v8?.total || 0,
    ensAvg: result.layers?.v8 || 0,
    ensAgree: true, // Monte Carlo replaces ensemble
    // HCA compat
    ha: result.hca?.team || null, hb: result.hca?.value || 0,
    // Matchup compat
    mu: { det: result.matchup?.details || [], adjA: result.matchup?.adjA, adjB: result.matchup?.adjB, tempoAdj: result.matchup?.tempoAdj },
    // Coach compat
    cDiff: result.coaching?.diff || 0,
    // Fatigue compat
    fatA: { pts: result.fatigue?.a || 0 }, fatB: { pts: result.fatigue?.b || 0 },
    // Stats compat
    adjStats: result.adjStats || {},
    // Profile compat (bracket.js reads a.name, a.em, etc.)
    a: result.profiles?.a || null, b: result.profiles?.b || null,
    // V8 details compat
    v8: result.v8 ? { ...result.v8, ens: { avg: 0, agree: true, m1: 0, m2: 0, m3: 0 } } : { ref: 0, gs: 0, sharp: 0, cont: 0, tz: 0, foul: 0, total: 0, ens: { avg: 0, agree: true, m1: 0, m2: 0, m3: 0 } },
    // NEW v9 Monte Carlo data (bracket.js can progressively use these)
    sim: result.sim || null,
    rd: result.round,
  };
}

module.exports.toV8Format = toV8Format;
