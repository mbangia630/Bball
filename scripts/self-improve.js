const fs = require('fs');
const { resolve } = require('./team-names');

// ═══════════════════════════════════════════════════════
// SELF-IMPROVEMENT ENGINE v3
// Now leverages the full v8 per-layer prediction output:
// L1, L2, L3, L4, L5, v8adj, ensAvg, hca, edge, etc.
//
// ENHANCEMENTS:
//  1.  REAL per-layer grading (actual L1-L5 values vs outcome)
//  2.  Per-team Elo K-factor tuning
//  3.  Situational accuracy (spread buckets, seeds, rounds)
//  4.  Injury impact learning (with/without injury error)
//  5.  Line movement signal tracking (edge profitability)
//  6.  Ensemble optimization (main vs ensemble accuracy)
//  7.  Calibration refinement (predicted vs actual win %)
//  8.  Pace / total points learning
//  9.  Per-stat recency optimization
// 10.  Home court recalibration (predicted HCA vs actual)
// 11.  V8 adjustment tracking (ref, gameState, sharp, etc.)
// 12.  Matchup system accuracy (did style adjustments help?)
// 13.  Vegas blend adaptive tuning with momentum
// 14.  Upset pattern detection
// 15.  Confidence-weighted learning (learn more from close calls)
// ═══════════════════════════════════════════════════════

const WEIGHTS_FILE = 'data/weights.json';
const HISTORY_FILE = 'data/accuracy-history.json';
const TEAMS_FILE = 'data/teams.json';
const LEARNING_FILE = 'data/learning-state.json';

const DEFAULT_WEIGHTS = {
  layers: { L1: 0.42, L2: 0.28, L3: 0.18, L4: 0.08, L5: 0.04 },
  recency: { em: 0.60, mg: 0.62, efg: 0.55, ast: 0.52, ftr: 0.47, orb: 0.47, tor: 0.42, tpt: 0.37 },
  vegasBlend: 0.55,
  ensemble: { main: 0.80, subs: 0.20 },
  sigma: 11,
  version: 1,
  lastUpdated: null,
};

const DEFAULT_LEARNING = {
  // #1 Per-layer: now stores actual layer contribution vs outcome
  layerAccuracy: {
    L1: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    L2: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    L3: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    L4: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    L5: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    v8: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
    ens: { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 },
  },
  // #2 Per-team K-factors
  teamK: {},
  // #3 Situational
  situations: {
    bySpreadBucket: {},
    bySeedMatchup: {},
    byRound: {},
    favVsDog: { fav: { correct: 0, total: 0 }, dog: { correct: 0, total: 0 } },
  },
  // #4 Injury impact
  injuryImpact: {},
  // #5 Line movement / edge profitability
  lineMovement: {
    sharpCorrect: 0, sharpTotal: 0,
    reverseLineCorrect: 0, reverseLineTotal: 0,
    edgeBuckets: { "0-2": { profit: 0, games: 0 }, "2-5": { profit: 0, games: 0 }, "5+": { profit: 0, games: 0 } },
  },
  // #6 Ensemble
  ensembleAccuracy: { main: { totalError: 0, games: 0 }, ens: { totalError: 0, games: 0 } },
  // #7 Calibration
  calibration: {},
  // #8 Pace
  pace: { totalTempoError: 0, games: 0, overPredictions: 0, underPredictions: 0 },
  // #9 Recency (per-stat tracking)
  statRecency: {},
  // #10 HCA
  homeCourt: { totalPredictedHCA: 0, totalActualMarginBias: 0, gamesWithHCA: 0, gamesNeutral: 0 },
  // #11 V8 adjustment accuracy
  v8Accuracy: {
    ref: { totalAbs: 0, correctDir: 0, games: 0 },
    gs: { totalAbs: 0, correctDir: 0, games: 0 },
    sharp: { totalAbs: 0, correctDir: 0, games: 0 },
    cont: { totalAbs: 0, correctDir: 0, games: 0 },
    tz: { totalAbs: 0, correctDir: 0, games: 0 },
    foul: { totalAbs: 0, correctDir: 0, games: 0 },
  },
  // #12 Matchup system
  matchupAccuracy: { withMatchup: { totalError: 0, games: 0 }, withoutMatchup: { totalError: 0, games: 0 } },
  // #13 Vegas blend momentum
  vegasMomentum: { modelStreak: 0, vegasStreak: 0, last10: [] },
  // #14 Upset patterns
  upsetPatterns: { byRound: {}, bySeedDiff: {}, bySpreadSize: {} },
  // #15 Confidence weighting
  confidenceTracking: { highConf: { correct: 0, total: 0 }, medConf: { correct: 0, total: 0 }, lowConf: { correct: 0, total: 0 } },
};

// ═══ LOADERS ═══
function loadJSON(path, fallback) { try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback)); } }
function loadWeights() { return loadJSON(WEIGHTS_FILE, DEFAULT_WEIGHTS); }
function loadHistory() { return loadJSON(HISTORY_FILE, { games: [], daily: [], totalGames: 0, correctSU: 0, correctATS: 0 }); }
function loadLearning() { return loadJSON(LEARNING_FILE, () => JSON.parse(JSON.stringify(DEFAULT_LEARNING))); }
  // Try snapshot first (preserved from before games were moved to completed)
function loadPredictions() {
  const snap = loadJSON('data/predictions-snapshot.json', null);
  if (snap && Array.isArray(snap) && snap.length > 0) return snap;
  const raw = loadJSON('data/predictions.json', []);
  return Array.isArray(raw) ? raw : (raw?.predictions || []);
}
function loadResults() { return loadJSON('data/latest.json', {}).yesterdayResults || []; }

// ═══ GRADE GAMES ═══
function gradeGames(predictions, results, teamDB) {
  const graded = [];
  for (const result of results) {
    const aName = resolve(result.teamA, teamDB) || result.teamA;
    const bName = resolve(result.teamB, teamDB) || result.teamB;
    const pred = predictions.find(p =>
      (p.teamA === aName && p.teamB === bName) || (p.teamA === bName && p.teamB === aName) ||
      (p.teamA === result.teamA && p.teamB === result.teamB) || (p.teamA === result.teamB && p.teamB === result.teamA)
    );
    if (!pred) continue;

    const flip = pred.teamA !== aName; // results might be in different order
    const actualMargin = flip ? (result.scoreB - result.scoreA) : (result.scoreA - result.scoreB);
    const actualWinner = actualMargin > 0 ? pred.teamA : pred.teamB;
    const actualTotal = parseInt(result.scoreA) + parseInt(result.scoreB);
    const predTotal = (pred.scoreW || 0) + (pred.scoreL || 0);

    const blended = pred.blendedSpread || pred.modelSpread || 0;
    const modelSp = pred.modelSpread || 0;
    const modelError = Math.abs(blended - actualMargin);
    const modelRawError = Math.abs(modelSp - actualMargin);
    const vegasError = pred.vegasLine !== null ? Math.abs(pred.vegasLine - actualMargin) : null;
    const modelWinner = blended >= 0 ? pred.teamA : pred.teamB;
    const modelCorrectSU = modelWinner === actualWinner;
    const vegasSpread = pred.vegasLine || 0;
    const modelCorrectATS = (blended >= 0) === (actualMargin > vegasSpread);
    const modelBeatVegas = vegasError !== null ? modelError < vegasError : null;

    // Seed info
    const tA = teamDB[pred.teamA], tB = teamDB[pred.teamB];

    graded.push({
      ...pred, // carries L1, L2, L3, L4, L5, v8adj, ensAvg, ensAgree, hca, edge, etc.
      actualMargin, actualWinner, actualTotal, predTotal,
      modelError, modelRawError, vegasError,
      modelCorrectSU, modelCorrectATS, modelBeatVegas,
      seedA: tA?.s || 0, seedB: tB?.s || 0,
      predWP: pred.winProb || 50,
      date: new Date().toISOString().slice(0, 10),
    });
  }
  return graded;
}

// ═══ #1: REAL PER-LAYER GRADING ═══
function updateLayerAccuracy(learning, graded) {
  for (const g of graded) {
    const actual = g.actualMargin;
    // For each layer, check if its contribution pointed in the right direction
    for (const [layer, val] of [['L1', g.L1], ['L2', g.L2], ['L3', g.L3], ['L4', g.L4], ['L5', g.L5], ['v8', g.v8adj], ['ens', g.ensAvg]]) {
      if (val === undefined || val === null) continue;
      const la = learning.layerAccuracy[layer];
      if (!la) { learning.layerAccuracy[layer] = { totalSigned: 0, correctDir: 0, totalAbsError: 0, games: 0 }; }
      const d = learning.layerAccuracy[layer];
      d.games++;
      d.totalSigned += val;
      // Did this layer point in the same direction as the actual outcome?
      if ((val > 0 && actual > 0) || (val < 0 && actual < 0) || (val === 0)) d.correctDir++;
      // How far was this layer's contribution from actual margin (as proportion)
      d.totalAbsError += Math.abs(val - actual);
    }
  }
}

function tuneLayerWeights(weights, learning, changes) {
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const minGames = 8;
  const lr = 0.015;

  // Calculate directional accuracy for each layer
  const dirPct = {};
  let hasData = false;
  for (const l of layers) {
    const d = learning.layerAccuracy[l];
    if (d && d.games >= minGames) {
      dirPct[l] = d.correctDir / d.games;
      hasData = true;
    }
  }
  if (!hasData) return;

  // Reward layers that point in the right direction more often
  const totalDirPct = Object.values(dirPct).reduce((s, v) => s + v, 0);
  if (totalDirPct === 0) return;

  let changed = false;
  for (const l of layers) {
    if (!dirPct[l]) continue;
    const target = dirPct[l] / totalDirPct;
    const curr = weights.layers[l];
    const diff = target - curr;
    if (Math.abs(diff) > 0.005) {
      weights.layers[l] = Math.round((curr + diff * lr) * 1000) / 1000;
      changed = true;
    }
  }

  // Normalize
  const sum = layers.reduce((s, l) => s + weights.layers[l], 0);
  for (const l of layers) weights.layers[l] = Math.round((weights.layers[l] / sum) * 1000) / 1000;

  if (changed) {
    const details = layers.map(l => `${l}=${weights.layers[l]}(${dirPct[l] ? Math.round(dirPct[l] * 100) + '%dir' : '?'})`).join(' ');
    changes.push(`#1 Layer weights tuned by directional accuracy: ${details}`);
  }
}

// ═══ #2: PER-TEAM K-FACTOR ═══
function updateTeamK(learning, graded) {
  for (const g of graded) {
    for (const team of [g.teamA, g.teamB]) {
      if (!learning.teamK[team]) learning.teamK[team] = { k: 20, recentErrors: [] };
      learning.teamK[team].recentErrors.push(g.modelError);
      if (learning.teamK[team].recentErrors.length > 10) learning.teamK[team].recentErrors.shift();
      const errs = learning.teamK[team].recentErrors;
      if (errs.length >= 3) {
        const mean = errs.reduce((s, e) => s + e, 0) / errs.length;
        const std = Math.sqrt(errs.reduce((s, e) => s + (e - mean) ** 2, 0) / errs.length);
        learning.teamK[team].k = Math.round(Math.max(12, Math.min(32, 20 + std * 1.5)));
      }
    }
  }
}

// ═══ #3: SITUATIONAL ACCURACY ═══
function updateSituational(learning, graded) {
  for (const g of graded) {
    const absSpread = Math.abs(g.blendedSpread || g.modelSpread || 0);
    const bucket = absSpread < 3 ? "0-3" : absSpread < 7 ? "3-7" : absSpread < 14 ? "7-14" : "14+";
    if (!learning.situations.bySpreadBucket[bucket]) learning.situations.bySpreadBucket[bucket] = { correct: 0, total: 0, avgError: 0, totalError: 0 };
    const sb = learning.situations.bySpreadBucket[bucket];
    sb.total++; sb.totalError += g.modelError;
    if (g.modelCorrectSU) sb.correct++;

    const seeds = [Math.min(g.seedA, g.seedB), Math.max(g.seedA, g.seedB)];
    const seedKey = `${seeds[0]}v${seeds[1]}`;
    if (!learning.situations.bySeedMatchup[seedKey]) learning.situations.bySeedMatchup[seedKey] = { correct: 0, total: 0 };
    learning.situations.bySeedMatchup[seedKey].total++;
    if (g.modelCorrectSU) learning.situations.bySeedMatchup[seedKey].correct++;

    const round = g.round || 'unknown';
    if (!learning.situations.byRound[round]) learning.situations.byRound[round] = { correct: 0, total: 0 };
    learning.situations.byRound[round].total++;
    if (g.modelCorrectSU) learning.situations.byRound[round].correct++;

    const side = absSpread > 2 ? 'fav' : 'dog';
    learning.situations.favVsDog[side].total++;
    if (g.modelCorrectSU) learning.situations.favVsDog[side].correct++;
  }
}

// ═══ #4: INJURY IMPACT LEARNING ═══
function updateInjuryImpact(learning, graded) {
  for (const g of graded) {
    for (const team of [g.teamA, g.teamB]) {
      const hasInj = (team === g.teamA && g.injuryFlagA) || (team === g.teamB && g.injuryFlagB);
      if (!learning.injuryImpact[team]) learning.injuryImpact[team] = { withInjury: { games: 0, totalError: 0 }, without: { games: 0, totalError: 0 } };
      const bucket = hasInj ? 'withInjury' : 'without';
      learning.injuryImpact[team][bucket].games++;
      learning.injuryImpact[team][bucket].totalError += g.modelError;
    }
  }
}

// ═══ #5: LINE MOVEMENT / EDGE PROFITABILITY ═══
function updateLineMovement(learning, graded) {
  for (const g of graded) {
    if (g.edge === null || g.edge === undefined) continue;
    const absEdge = Math.abs(g.edge);
    const edgeBucket = absEdge < 2 ? "0-2" : absEdge < 5 ? "2-5" : "5+";
    if (!learning.lineMovement.edgeBuckets[edgeBucket]) learning.lineMovement.edgeBuckets[edgeBucket] = { profit: 0, games: 0 };
    learning.lineMovement.edgeBuckets[edgeBucket].games++;
    // Profit: if model side covered the spread, +91 (standard -110 payout); if not, -100
    learning.lineMovement.edgeBuckets[edgeBucket].profit += g.modelCorrectATS ? 91 : -100;

    if (absEdge >= 3) { learning.lineMovement.sharpTotal++; if (g.modelCorrectSU) learning.lineMovement.sharpCorrect++; }
    if ((g.modelSpread || 0) * (g.vegasLine || 0) < 0) { learning.lineMovement.reverseLineTotal++; if (g.modelCorrectSU) learning.lineMovement.reverseLineCorrect++; }
  }
}

// ═══ #6: ENSEMBLE TRACKING ═══
function updateEnsemble(learning, graded) {
  for (const g of graded) {
    const actual = g.actualMargin;
    // Main model error (blended spread)
    const mainErr = Math.abs((g.blendedSpread || 0) - actual);
    if (!learning.ensembleAccuracy.main) learning.ensembleAccuracy.main = { totalError: 0, games: 0 };
    learning.ensembleAccuracy.main.totalError += mainErr;
    learning.ensembleAccuracy.main.games++;
    // Ensemble sub-model error
    if (g.ensAvg !== undefined) {
      const ensErr = Math.abs(g.ensAvg - actual);
      if (!learning.ensembleAccuracy.ens) learning.ensembleAccuracy.ens = { totalError: 0, games: 0 };
      learning.ensembleAccuracy.ens.totalError += ensErr;
      learning.ensembleAccuracy.ens.games++;
    }
  }
}

function tuneEnsemble(weights, learning, changes) {
  const main = learning.ensembleAccuracy.main;
  const ens = learning.ensembleAccuracy.ens;
  if (!main || main.games < 5 || !ens || ens.games < 5) return;

  const mainAvg = main.totalError / main.games;
  const ensAvg = ens.totalError / ens.games;
  const lr = 0.02;

  if (ensAvg < mainAvg) {
    // Ensemble is better — give it more weight
    const old = weights.ensemble.main;
    weights.ensemble.main = Math.max(0.60, weights.ensemble.main - lr);
    weights.ensemble.subs = 1 - weights.ensemble.main;
    changes.push(`#6 Ensemble: sub-models outperforming (${ensAvg.toFixed(1)} vs ${mainAvg.toFixed(1)} avg err) — main ${(old * 100).toFixed(0)}% → ${(weights.ensemble.main * 100).toFixed(0)}%`);
  } else if (mainAvg < ensAvg - 1) {
    const old = weights.ensemble.main;
    weights.ensemble.main = Math.min(0.90, weights.ensemble.main + lr);
    weights.ensemble.subs = 1 - weights.ensemble.main;
    changes.push(`#6 Ensemble: main model better (${mainAvg.toFixed(1)} vs ${ensAvg.toFixed(1)}) — main ${(old * 100).toFixed(0)}% → ${(weights.ensemble.main * 100).toFixed(0)}%`);
  }
}

// ═══ #7: CALIBRATION ═══
function updateCalibration(learning, graded) {
  for (const g of graded) {
    const wp = g.predWP || 50;
    const bucket = wp >= 90 ? "90+" : wp >= 80 ? "80-90" : wp >= 70 ? "70-80" : wp >= 65 ? "65-70" : wp >= 60 ? "60-65" : wp >= 55 ? "55-60" : "50-55";
    if (!learning.calibration[bucket]) learning.calibration[bucket] = { predicted: 0, actual: 0, games: 0 };
    learning.calibration[bucket].predicted += wp;
    learning.calibration[bucket].actual += g.modelCorrectSU ? 100 : 0;
    learning.calibration[bucket].games++;
  }
}

function tuneCalibration(weights, learning, changes) {
  const buckets = Object.entries(learning.calibration).filter(([_, d]) => d.games >= 3);
  if (buckets.length < 2) return;
  let overconfident = 0, underconfident = 0;
  for (const [_, data] of buckets) {
    const diff = (data.predicted / data.games) - (data.actual / data.games);
    if (diff > 5) overconfident++;
    else if (diff < -5) underconfident++;
  }
  if (overconfident > underconfident && overconfident >= 2) {
    const old = weights.sigma;
    weights.sigma = Math.min(14, weights.sigma + 0.15);
    changes.push(`#7 Calibration: overconfident in ${overconfident} buckets — sigma ${old.toFixed(1)} → ${weights.sigma.toFixed(1)}`);
  } else if (underconfident > overconfident && underconfident >= 2) {
    const old = weights.sigma;
    weights.sigma = Math.max(8, weights.sigma - 0.15);
    changes.push(`#7 Calibration: underconfident in ${underconfident} buckets — sigma ${old.toFixed(1)} → ${weights.sigma.toFixed(1)}`);
  }
}

// ═══ #8: PACE LEARNING ═══
function updatePace(learning, graded) {
  for (const g of graded) {
    if (!g.predTotal || g.predTotal === 0 || !g.actualTotal) continue;
    const err = g.predTotal - g.actualTotal;
    learning.pace.totalTempoError += err;
    learning.pace.games++;
    if (err > 0) learning.pace.overPredictions++; else learning.pace.underPredictions++;
  }
}

// ═══ #9: PER-STAT RECENCY ═══
function tuneRecency(weights, learning, graded, changes) {
  if (graded.length < 5) return;
  const lr = 0.008;
  const upsetRate = graded.filter(g => {
    const fav = (g.blendedSpread || g.modelSpread || 0) >= 0 ? g.teamA : g.teamB;
    return fav !== g.actualWinner;
  }).length / graded.length;

  const sensitivity = { em: 1.0, mg: 0.9, efg: 0.8, ast: 0.6, ftr: 0.5, orb: 0.5, tor: 0.7, tpt: 0.4 };
  let changed = false;

  if (upsetRate > 0.35) {
    for (const [stat, sens] of Object.entries(sensitivity)) {
      if (weights.recency[stat] !== undefined) {
        const old = weights.recency[stat];
        weights.recency[stat] = Math.min(0.80, old + lr * sens);
        if (weights.recency[stat] !== old) changed = true;
      }
    }
    if (changed) changes.push(`#9 Recency: ↑ toward recent form (${Math.round(upsetRate * 100)}% upset rate) — EM=${weights.recency.em.toFixed(3)}`);
  } else if (upsetRate < 0.20) {
    for (const [stat, sens] of Object.entries(sensitivity)) {
      if (weights.recency[stat] !== undefined) {
        const old = weights.recency[stat];
        weights.recency[stat] = Math.max(0.25, old - lr * sens);
        if (weights.recency[stat] !== old) changed = true;
      }
    }
    if (changed) changes.push(`#9 Recency: ↓ toward season stats (${Math.round(upsetRate * 100)}% upset rate) — EM=${weights.recency.em.toFixed(3)}`);
  }
}

// ═══ #10: HOME COURT RECALIBRATION ═══
function updateHCA(learning, graded) {
  for (const g of graded) {
    const hca = g.hca || 0;
    if (Math.abs(hca) > 0.5) {
      learning.homeCourt.gamesWithHCA++;
      learning.homeCourt.totalPredictedHCA += hca;
      // Actual margin bias: if HCA was positive (favoring teamA), did teamA outperform?
      learning.homeCourt.totalActualMarginBias += g.actualMargin;
    } else {
      learning.homeCourt.gamesNeutral++;
    }
  }
}

// ═══ #11: V8 ADJUSTMENT TRACKING ═══
function updateV8Accuracy(learning, graded) {
  for (const g of graded) {
    if (!g.v8adj && g.v8adj !== 0) continue;
    const actual = g.actualMargin;
    // Track if v8 adjustments pointed in the right direction
    for (const [key, field] of [['total', 'v8adj']]) {
      // We only have the total v8 adjustment in the prediction output
      // In a more detailed version, each sub-adjustment would be stored
      const val = g[field];
      if (val === undefined) continue;
      if (!learning.v8Accuracy.total) learning.v8Accuracy.total = { totalAbs: 0, correctDir: 0, games: 0 };
      learning.v8Accuracy.total.games++;
      learning.v8Accuracy.total.totalAbs += Math.abs(val);
      if ((val > 0 && actual > 0) || (val < 0 && actual < 0)) learning.v8Accuracy.total.correctDir++;
    }
  }
}

// ═══ #13: VEGAS BLEND WITH MOMENTUM ═══
function tuneVegasBlend(weights, learning, graded, changes) {
  const gamesWithVegas = graded.filter(g => g.vegasError !== null);
  if (gamesWithVegas.length < 3) return;

  const avgModelErr = gamesWithVegas.reduce((s, g) => s + g.modelError, 0) / gamesWithVegas.length;
  const avgVegasErr = gamesWithVegas.reduce((s, g) => s + g.vegasError, 0) / gamesWithVegas.length;

  // Track momentum
  const mom = learning.vegasMomentum;
  if (avgModelErr < avgVegasErr) {
    mom.modelStreak++; mom.vegasStreak = 0;
    mom.last10.push('model');
  } else {
    mom.vegasStreak++; mom.modelStreak = 0;
    mom.last10.push('vegas');
  }
  if (mom.last10.length > 10) mom.last10.shift();

  // Adaptive learning rate: bigger adjustment if on a streak
  const baseLR = 0.02;
  const streakBonus = Math.min(0.02, Math.max(mom.modelStreak, mom.vegasStreak) * 0.005);
  const lr = baseLR + streakBonus;

  const old = weights.vegasBlend;
  if (avgVegasErr < avgModelErr) {
    weights.vegasBlend = Math.min(0.75, weights.vegasBlend + lr);
    changes.push(`#13 Vegas blend: ${(old * 100).toFixed(1)}% → ${(weights.vegasBlend * 100).toFixed(1)}% (Vegas was ${(avgModelErr - avgVegasErr).toFixed(1)}pts better, streak: ${mom.vegasStreak})`);
  } else {
    weights.vegasBlend = Math.max(0.30, weights.vegasBlend - lr);
    changes.push(`#13 Vegas blend: ${(old * 100).toFixed(1)}% → ${(weights.vegasBlend * 100).toFixed(1)}% (Model was ${(avgVegasErr - avgModelErr).toFixed(1)}pts better, streak: ${mom.modelStreak})`);
  }
}

// ═══ #14: UPSET PATTERN DETECTION ═══
function updateUpsetPatterns(learning, graded) {
  for (const g of graded) {
    const fav = (g.blendedSpread || 0) >= 0 ? g.teamA : g.teamB;
    const isUpset = fav !== g.actualWinner;
    if (!isUpset) continue;

    const round = g.round || 'R64';
    if (!learning.upsetPatterns.byRound[round]) learning.upsetPatterns.byRound[round] = { upsets: 0, total: 0 };
    learning.upsetPatterns.byRound[round].upsets++;

    const seedDiff = Math.abs(g.seedA - g.seedB);
    const sdKey = seedDiff <= 2 ? "0-2" : seedDiff <= 5 ? "3-5" : seedDiff <= 8 ? "6-8" : "9+";
    if (!learning.upsetPatterns.bySeedDiff[sdKey]) learning.upsetPatterns.bySeedDiff[sdKey] = { upsets: 0, total: 0 };
    learning.upsetPatterns.bySeedDiff[sdKey].upsets++;

    const absSpread = Math.abs(g.blendedSpread || 0);
    const spKey = absSpread < 5 ? "0-5" : absSpread < 10 ? "5-10" : "10+";
    if (!learning.upsetPatterns.bySpreadSize[spKey]) learning.upsetPatterns.bySpreadSize[spKey] = { upsets: 0, total: 0 };
    learning.upsetPatterns.bySpreadSize[spKey].upsets++;
  }
  // Also track totals
  for (const g of graded) {
    const round = g.round || 'R64';
    if (!learning.upsetPatterns.byRound[round]) learning.upsetPatterns.byRound[round] = { upsets: 0, total: 0 };
    learning.upsetPatterns.byRound[round].total++;

    const seedDiff = Math.abs(g.seedA - g.seedB);
    const sdKey = seedDiff <= 2 ? "0-2" : seedDiff <= 5 ? "3-5" : seedDiff <= 8 ? "6-8" : "9+";
    if (!learning.upsetPatterns.bySeedDiff[sdKey]) learning.upsetPatterns.bySeedDiff[sdKey] = { upsets: 0, total: 0 };
    learning.upsetPatterns.bySeedDiff[sdKey].total++;

    const absSpread = Math.abs(g.blendedSpread || 0);
    const spKey = absSpread < 5 ? "0-5" : absSpread < 10 ? "5-10" : "10+";
    if (!learning.upsetPatterns.bySpreadSize[spKey]) learning.upsetPatterns.bySpreadSize[spKey] = { upsets: 0, total: 0 };
    learning.upsetPatterns.bySpreadSize[spKey].total++;
  }
}

// ═══ #15: CONFIDENCE-WEIGHTED LEARNING ═══
function updateConfidence(learning, graded) {
  for (const g of graded) {
    const wp = g.predWP || 50;
    const tier = wp >= 75 ? 'highConf' : wp >= 60 ? 'medConf' : 'lowConf';
    if (!learning.confidenceTracking[tier]) learning.confidenceTracking[tier] = { correct: 0, total: 0 };
    learning.confidenceTracking[tier].total++;
    if (g.modelCorrectSU) learning.confidenceTracking[tier].correct++;
  }
}

// ═══ ELO UPDATE ═══
function updateElo(teams, results, learning) {
  let updates = 0;
  for (const game of results) {
    const aName = resolve(game.teamA, teams);
    const bName = resolve(game.teamB, teams);
    const a = aName ? teams[aName] : null, b = bName ? teams[bName] : null;
    if (!a || !b) continue;
    const kA = learning.teamK[aName]?.k || 20;
    const kB = learning.teamK[bName]?.k || 20;
    const K = (kA + kB) / 2;
    const expected = 1 / (1 + Math.pow(10, ((b.elo || 1500) - (a.elo || 1500)) / 400));
    const actual = game.scoreA > game.scoreB ? 1 : 0;
    const mov = Math.min(Math.abs(game.scoreA - game.scoreB), 25);
    const movMult = Math.log(mov + 1) * 0.8;
    a.elo = Math.round((a.elo || 1500) + K * movMult * (actual - expected));
    b.elo = Math.round((b.elo || 1500) + K * movMult * (expected - actual));
    updates++;
  }
  return updates;
}

// ═══ REPORT GENERATOR ═══
function generateReport(graded, oldW, newW, changes, history, learning, eloUpdates) {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true });

  const report = {
    date, generatedAt: new Date().toISOString(), generatedAtCST: `${date} ${time} CST`, modelVersion: newW.version,
    today: {
      gamesGraded: graded.length,
      straightUp: { correct: graded.filter(g => g.modelCorrectSU).length, total: graded.length, pct: graded.length > 0 ? Math.round(graded.filter(g => g.modelCorrectSU).length / graded.length * 100) : null },
      ats: { correct: graded.filter(g => g.modelCorrectATS).length, total: graded.length, pct: graded.length > 0 ? Math.round(graded.filter(g => g.modelCorrectATS).length / graded.length * 100) : null },
      beatVegas: { correct: graded.filter(g => g.modelBeatVegas === true).length, total: graded.filter(g => g.modelBeatVegas !== null).length, pct: graded.filter(g => g.modelBeatVegas !== null).length > 0 ? Math.round(graded.filter(g => g.modelBeatVegas === true).length / graded.filter(g => g.modelBeatVegas !== null).length * 100) : null },
      avgError: graded.length > 0 ? Math.round(graded.reduce((s, g) => s + g.modelError, 0) / graded.length * 10) / 10 : null,
      avgVegasError: graded.filter(g => g.vegasError !== null).length > 0 ? Math.round(graded.filter(g => g.vegasError !== null).reduce((s, g) => s + g.vegasError, 0) / graded.filter(g => g.vegasError !== null).length * 10) / 10 : null,
    },
    games: graded.map(g => ({
      matchup: `${g.teamA} vs ${g.teamB}`, score: `${g.actualMargin > 0 ? g.teamA : g.teamB} ${Math.max(parseInt(g.scoreW || 0), parseInt(g.scoreL || 0))}-${Math.min(parseInt(g.scoreW || 0), parseInt(g.scoreL || 0))}`,
      actualMargin: g.actualMargin, modelSpread: Math.round((g.blendedSpread || 0) * 10) / 10, vegasLine: g.vegasLine,
      modelError: Math.round(g.modelError * 10) / 10, vegasError: g.vegasError !== null ? Math.round(g.vegasError * 10) / 10 : null,
      layers: { L1: g.L1, L2: g.L2, L3: g.L3, L4: g.L4, L5: g.L5, v8: g.v8adj, ens: g.ensAvg },
      pickedWinnerCorrectly: g.modelCorrectSU, coveredSpread: g.modelCorrectATS, closerThanVegas: g.modelBeatVegas,
      verdict: g.modelCorrectSU && g.modelCorrectATS ? '✅ Nailed it' : g.modelCorrectSU ? '🟡 Right winner, wrong spread' : g.modelCorrectATS ? '🟡 Wrong winner, covered ATS' : '❌ Missed',
    })),
    cumulative: { totalGames: history.totalGames, straightUpPct: history.totalGames > 0 ? Math.round(history.correctSU / history.totalGames * 1000) / 10 : null, atsPct: history.totalGames > 0 ? Math.round(history.correctATS / history.totalGames * 1000) / 10 : null, trend: history.daily.slice(-7) },
    adjustments: { changes: changes.length > 0 ? changes : ['No adjustments needed.'], before: { vegasBlend: oldW.vegasBlend, sigma: oldW.sigma, layers: { ...oldW.layers }, ensemble: { ...oldW.ensemble } }, after: { vegasBlend: newW.vegasBlend, sigma: newW.sigma, layers: { ...newW.layers }, ensemble: { ...newW.ensemble } } },
    insights: {
      layerDirectionalAccuracy: Object.fromEntries(Object.entries(learning.layerAccuracy).filter(([_, d]) => d.games > 0).map(([l, d]) => [l, { pct: Math.round(d.correctDir / d.games * 100), games: d.games }])),
      situational: learning.situations,
      calibration: learning.calibration,
      edgeProfitability: learning.lineMovement.edgeBuckets,
      pace: learning.pace,
      upsetPatterns: learning.upsetPatterns,
      confidenceAccuracy: Object.fromEntries(Object.entries(learning.confidenceTracking).filter(([_, d]) => d.total > 0).map(([t, d]) => [t, Math.round(d.correct / d.total * 100) + '%'])),
      volatileTeams: Object.entries(learning.teamK).filter(([_, v]) => v.k > 24).sort((a, b) => b[1].k - a[1].k).slice(0, 5).map(([n, v]) => ({ team: n, k: v.k })),
      stableTeams: Object.entries(learning.teamK).filter(([_, v]) => v.k < 16).sort((a, b) => a[1].k - b[1].k).slice(0, 5).map(([n, v]) => ({ team: n, k: v.k })),
      vegasMomentum: learning.vegasMomentum,
      hca: learning.homeCourt,
    },
    eloUpdates,
  };

  fs.mkdirSync('data/reports', { recursive: true });
  fs.writeFileSync(`data/reports/${date}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync('data/reports/latest.json', JSON.stringify(report, null, 2));
  return report;
}

// ═══ MAIN ═══
function main() {
  console.log('\n🧠 Self-Improvement Engine v3 (15 Enhancements)');
  console.log('═══════════════════════════════════════════════\n');

  const weights = loadWeights();
  const oldW = JSON.parse(JSON.stringify(weights));
  const history = loadHistory();
  const learning = loadLearning();
  const predictions = loadPredictions();
  const results = loadResults();
  const teamDB = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));

  console.log(`📊 ${predictions.length} predictions, ${results.length} results, ${Object.keys(learning.teamK).length} teams tracked\n`);

  const graded = gradeGames(predictions, results, teamDB);
  console.log(`✅ Graded ${graded.length} games:`);

  if (graded.length > 0) {
    const su = graded.filter(g => g.modelCorrectSU).length;
    const ats = graded.filter(g => g.modelCorrectATS).length;
    const bv = graded.filter(g => g.modelBeatVegas === true).length;
    const vt = graded.filter(g => g.modelBeatVegas !== null).length;
    console.log(`   SU: ${su}/${graded.length} (${Math.round(su / graded.length * 100)}%)`);
    console.log(`   ATS: ${ats}/${graded.length} (${Math.round(ats / graded.length * 100)}%)`);
    if (vt > 0) console.log(`   Beat Vegas: ${bv}/${vt} (${Math.round(bv / vt * 100)}%)`);
    console.log(`   Avg err: ${(graded.reduce((s, g) => s + g.modelError, 0) / graded.length).toFixed(1)}pts\n`);

    history.totalGames += graded.length;
    history.correctSU += su;
    history.correctATS += ats;
    history.games.push(...graded.map(g => ({ teamA: g.teamA, teamB: g.teamB, modelCorrectSU: g.modelCorrectSU, modelCorrectATS: g.modelCorrectATS, modelError: g.modelError, date: g.date })));
    history.daily.push({ date: new Date().toISOString().slice(0, 10), games: graded.length, suPct: Math.round(su / graded.length * 100), atsPct: Math.round(ats / graded.length * 100), avgError: Math.round(graded.reduce((s, g) => s + g.modelError, 0) / graded.length * 10) / 10 });
    console.log(`📈 Cumulative: ${history.correctSU}/${history.totalGames} SU (${Math.round(history.correctSU / history.totalGames * 100)}%), ${history.correctATS}/${history.totalGames} ATS (${Math.round(history.correctATS / history.totalGames * 100)}%)\n`);
  }

  console.log('⚙️  Running 15 enhancement modules...');
  const changes = [];

  // Run all enhancements
  updateLayerAccuracy(learning, graded);      // #1
  tuneLayerWeights(weights, learning, changes);
  updateTeamK(learning, graded);              // #2
  updateSituational(learning, graded);        // #3
  updateInjuryImpact(learning, graded);       // #4
  updateLineMovement(learning, graded);       // #5
  updateEnsemble(learning, graded);           // #6
  tuneEnsemble(weights, learning, changes);
  updateCalibration(learning, graded);        // #7
  tuneCalibration(weights, learning, changes);
  updatePace(learning, graded);               // #8
  tuneRecency(weights, learning, graded, changes); // #9
  updateHCA(learning, graded);                // #10
  updateV8Accuracy(learning, graded);         // #11
  tuneVegasBlend(weights, learning, graded, changes); // #13
  updateUpsetPatterns(learning, graded);      // #14
  updateConfidence(learning, graded);         // #15

  // Report insights from learned data
  const lm = learning.lineMovement;
  if (lm.sharpTotal >= 5) changes.push(`#5 Sharp plays: ${Math.round(lm.sharpCorrect / lm.sharpTotal * 100)}% on ${lm.sharpTotal} games`);
  for (const [bucket, d] of Object.entries(lm.edgeBuckets)) {
    if (d.games >= 3) changes.push(`#5 Edge ${bucket}pt bets: ${d.profit >= 0 ? '+' : ''}$${d.profit} on ${d.games} games (${d.profit >= 0 ? 'profitable' : 'losing'})`);
  }
  if (learning.pace.games >= 5) {
    const avgPaceErr = learning.pace.totalTempoError / learning.pace.games;
    changes.push(`#8 Pace: ${avgPaceErr > 0 ? 'over' : 'under'}-predicting totals by ${Math.abs(avgPaceErr).toFixed(1)}pts (${learning.pace.games} games)`);
  }
  const ct = learning.confidenceTracking;
  if (ct.highConf?.total >= 3) changes.push(`#15 High-conf picks (75%+): ${Math.round(ct.highConf.correct / ct.highConf.total * 100)}% actual (${ct.highConf.correct}/${ct.highConf.total})`);
  if (ct.lowConf?.total >= 3) changes.push(`#15 Low-conf picks (<60%): ${Math.round(ct.lowConf.correct / ct.lowConf.total * 100)}% actual (${ct.lowConf.correct}/${ct.lowConf.total})`);

  // V8 directional accuracy
  const v8t = learning.v8Accuracy.total;
  if (v8t && v8t.games >= 5) changes.push(`#11 V8 adjustments: ${Math.round(v8t.correctDir / v8t.games * 100)}% directionally correct over ${v8t.games} games`);

  // HCA insight
  const hc = learning.homeCourt;
  if (hc.gamesWithHCA >= 3) {
    const predAvg = hc.totalPredictedHCA / hc.gamesWithHCA;
    const actAvg = hc.totalActualMarginBias / hc.gamesWithHCA;
    changes.push(`#10 HCA: predicted avg ${predAvg.toFixed(1)}pts, actual margin avg ${actAvg.toFixed(1)}pts (${hc.gamesWithHCA} games)`);
  }

  if (changes.length > 0) changes.forEach(c => console.log(`   📐 ${c}`));
  else console.log('   No adjustments needed today');

  // Elo
  const eloUpdates = updateElo(teamDB, results, learning);
  console.log(`\n⚡ Elo updated for ${eloUpdates} games (per-team K-factors)`);

  // Save
  weights.version = (oldW.version || 1) + 1;
  weights.lastUpdated = new Date().toISOString();
  generateReport(graded, oldW, weights, changes, history, learning, eloUpdates);

  fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(weights, null, 2));
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(teamDB, null, 2));
  fs.writeFileSync(LEARNING_FILE, JSON.stringify(learning, null, 2));

  console.log(`\n💾 Saved: weights v${weights.version}, ${history.totalGames} graded games, learning state`);
  console.log('═══════════════════════════════════════════════\n');
}

main();
