const fs = require('fs');
const { BRACKET } = require('./config');

// ═══════════════════════════════════════════════════════
// v9 LEARNING ENGINE
// Grades completed games, tunes weights, generates report
// Reads from: bracket-state, predictions-snapshot, weights
// Writes to: weights, learning-state, accuracy-history, reports
// ═══════════════════════════════════════════════════════

function loadJSON(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch { return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback)); }
}
function r5(v) { return Math.round(v * 2) / 2; }

const DEFAULT_LEARNING = {
  gradedGameIds: [],
  teamK: {},
  layerAccuracy: { L1: { correctDir: 0, games: 0 }, L2: { correctDir: 0, games: 0 }, L3: { correctDir: 0, games: 0 }, L4: { correctDir: 0, games: 0 }, L5: { correctDir: 0, games: 0 } },
  calibration: {},
  confidenceTracking: { highConf: { correct: 0, total: 0 }, medConf: { correct: 0, total: 0 }, lowConf: { correct: 0, total: 0 } },
  vegasMomentum: { modelStreak: 0, vegasStreak: 0, last10: [] },
  upsetPatterns: { byRound: {}, bySeedDiff: {} },
};

function main() {
  console.log('\n🧠 v9 Learning Engine');
  console.log('═══════════════════════\n');

  const weights = loadJSON('data/weights.json', {});
  const oldW = JSON.parse(JSON.stringify(weights));
  const learning = { ...JSON.parse(JSON.stringify(DEFAULT_LEARNING)), ...loadJSON('data/learning-state.json', {}) };
  const history = loadJSON('data/accuracy-history.json', { games: [], daily: [], totalGames: 0, correctSU: 0, correctATS: 0 });
  const bracketState = loadJSON('data/bracket-state.json', { results: {} });
  const predictions = loadJSON('data/predictions-snapshot.json', []);
  const teamDB = loadJSON('data/teams.json', {});

  // Get all completed games from bracket-state
  const allCompleted = Object.entries(bracketState.results).map(([id, r]) => {
    const rd = id.startsWith('FF') ? 0 : id.includes('R32') ? 2 : id.includes('S16') ? 3 : id.includes('E8') ? 4 : id.includes('F4') ? 5 : id === 'CHAMP' ? 6 : 1;
    return { id, rd, ...r };
  });

  // Only grade new games
  const gradedIds = learning.gradedGameIds || [];
  const newGames = allCompleted.filter(g => !gradedIds.includes(g.id));
  console.log(`📊 ${allCompleted.length} completed, ${gradedIds.length} already graded, ${newGames.length} new\n`);

  // Grade each new game against its prediction
  const graded = [];
  for (const game of newGames) {
    const pred = predictions.find(p =>
      (p.teamA === game.winner && p.teamB === game.loser) ||
      (p.teamA === game.loser && p.teamB === game.winner)
    );
    if (!pred) continue;

    const margin = Math.abs(game.scoreW - game.scoreL);
    const actualMargin = game.winner === pred.teamA ? margin : -margin;
    const modelSp = r5(pred.modelSpread || pred.finalSpread || pred.blendedSpread || 0);
    const modelWinner = modelSp >= 0 ? pred.teamA : pred.teamB;
    const vegasLine = pred.vegasLine ?? pred.vegasSp ?? null;
    const modelError = Math.abs(modelSp - actualMargin);
    const vegasError = vegasLine !== null ? Math.abs(vegasLine - actualMargin) : null;
    const correctSU = modelWinner === game.winner;
    const correctATS = vegasError !== null ? modelError < vegasError : false;
    const beatVegas = vegasError !== null ? modelError < vegasError : null;

    graded.push({
      id: game.id, rd: game.rd, date: game.date,
      teamA: pred.teamA, teamB: pred.teamB,
      winner: game.winner, loser: game.loser,
      scoreW: game.scoreW, scoreL: game.scoreL,
      actualMargin, modelSp, vegasLine,
      modelError, vegasError,
      correctSU, correctATS, beatVegas,
      winProb: pred.winProb || 50,
      layers: pred.layers || {},
      verdict: correctSU && correctATS ? '✅ Nailed it' : correctSU ? '🟡 Right winner, wrong spread' : correctATS ? '🟡 Wrong winner, covered ATS' : '❌ Missed',
    });
  }

  if (graded.length > 0) {
    const su = graded.filter(g => g.correctSU).length;
    const ats = graded.filter(g => g.correctATS).length;
    console.log(`✅ Graded ${graded.length} new games: SU ${su}/${graded.length} (${Math.round(su / graded.length * 100)}%), ATS ${ats}/${graded.length}`);

    // Update cumulative history
    history.totalGames += graded.length;
    history.correctSU += su;
    history.correctATS += ats;
    history.games.push(...graded);
    history.daily.push({
      date: new Date().toISOString().slice(0, 10),
      games: graded.length,
      suPct: Math.round(su / graded.length * 100),
      avgError: Math.round(graded.reduce((s, g) => s + g.modelError, 0) / graded.length * 10) / 10,
    });

    // Mark as graded
    learning.gradedGameIds = [...gradedIds, ...graded.map(g => g.id)];
  }

  // ═══ TUNE WEIGHTS ═══
  const changes = [];

  // Layer directional accuracy
  for (const g of graded) {
    for (const [layer, val] of Object.entries(g.layers || {})) {
      if (val === undefined || val === null || !learning.layerAccuracy[layer]) continue;
      learning.layerAccuracy[layer].games++;
      if ((val > 0 && g.actualMargin > 0) || (val < 0 && g.actualMargin < 0)) learning.layerAccuracy[layer].correctDir++;
    }
  }

  // Tune layer weights
  const layers = ['L1', 'L2', 'L3', 'L4', 'L5'];
  const dirPct = {};
  for (const l of layers) {
    const d = learning.layerAccuracy[l];
    if (d && d.games >= 8) dirPct[l] = d.correctDir / d.games;
  }
  if (Object.keys(dirPct).length >= 3) {
    const total = Object.values(dirPct).reduce((s, v) => s + v, 0);
    if (total > 0) {
      for (const l of layers) {
        if (!dirPct[l]) continue;
        const target = dirPct[l] / total;
        const curr = weights.layers[l] || 0.2;
        weights.layers[l] = Math.round((curr + (target - curr) * 0.015) * 1000) / 1000;
      }
      const sum = layers.reduce((s, l) => s + (weights.layers[l] || 0), 0);
      for (const l of layers) weights.layers[l] = Math.round((weights.layers[l] / sum) * 1000) / 1000;
      changes.push(`Layer weights tuned: ${layers.map(l => `${l}=${weights.layers[l]}`).join(' ')}`);
    }
  }

  // Vegas blend
  const withVegas = graded.filter(g => g.vegasError !== null);
  if (withVegas.length >= 3) {
    const avgModel = withVegas.reduce((s, g) => s + g.modelError, 0) / withVegas.length;
    const avgVegas = withVegas.reduce((s, g) => s + g.vegasError, 0) / withVegas.length;
    const old = weights.vegasBlend || 0.55;
    if (avgVegas < avgModel) weights.vegasBlend = Math.min(0.75, old + 0.02);
    else weights.vegasBlend = Math.max(0.30, old - 0.02);
    changes.push(`Vegas blend: ${(old * 100).toFixed(0)}% → ${(weights.vegasBlend * 100).toFixed(0)}%`);
  }

  // Confidence tracking
  for (const g of graded) {
    const tier = g.winProb >= 75 ? 'highConf' : g.winProb >= 60 ? 'medConf' : 'lowConf';
    learning.confidenceTracking[tier].total++;
    if (g.correctSU) learning.confidenceTracking[tier].correct++;
  }

  // TeamK volatility
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

  if (changes.length > 0) changes.forEach(c => console.log(`   📐 ${c}`));

  // ═══ GENERATE REPORT ═══
  const allGraded = [...graded, ...(history.games || []).filter(hg => !graded.some(g => g.id === hg.id))];
  const recent15 = allGraded.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.rd || 0) - (a.rd || 0)).slice(0, 15);

  const report = {
    date: new Date().toISOString().slice(0, 10),
    generatedAtCST: `${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST`,
    modelVersion: weights.version || 1,
    engineVersion: 'v9.0-montecarlo',
    today: {
      gamesGraded: recent15.length,
      straightUp: { correct: recent15.filter(g => g.correctSU).length, total: recent15.length, pct: recent15.length > 0 ? Math.round(recent15.filter(g => g.correctSU).length / recent15.length * 100) : null },
      ats: { correct: recent15.filter(g => g.correctATS).length, total: recent15.length, pct: recent15.length > 0 ? Math.round(recent15.filter(g => g.correctATS).length / recent15.length * 100) : null },
      beatVegas: { correct: recent15.filter(g => g.beatVegas === true).length, total: recent15.filter(g => g.beatVegas !== null).length },
      avgError: recent15.length > 0 ? Math.round(recent15.reduce((s, g) => s + (g.modelError || 0), 0) / recent15.length * 10) / 10 : null,
      avgVegasError: recent15.filter(g => g.vegasError != null).length > 0 ? Math.round(recent15.filter(g => g.vegasError != null).reduce((s, g) => s + g.vegasError, 0) / recent15.filter(g => g.vegasError != null).length * 10) / 10 : null,
    },
    games: allGraded.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.rd || 0) - (a.rd || 0)).map(g => ({
      matchup: `${g.teamA} vs ${g.teamB}`,
      score: `${g.winner} ${g.scoreW}-${g.scoreL}`,
      modelSpread: g.modelSp, vegasLine: g.vegasLine,
      modelError: Math.round((g.modelError || 0) * 10) / 10,
      vegasError: g.vegasError != null ? Math.round(g.vegasError * 10) / 10 : null,
      pickedWinnerCorrectly: g.correctSU, coveredSpread: g.correctATS, closerThanVegas: g.beatVegas,
      verdict: g.verdict,
    })),
    cumulative: {
      totalGames: history.totalGames,
      straightUpPct: history.totalGames > 0 ? Math.round(history.correctSU / history.totalGames * 1000) / 10 : null,
      atsPct: history.totalGames > 0 ? Math.round(history.correctATS / history.totalGames * 1000) / 10 : null,
      trend: history.daily.slice(-7),
    },
    v8Baseline: loadJSON('data/v8-archive/summary.json', null),
    adjustments: { changes: changes.length > 0 ? changes : ['No adjustments needed.'], before: { vegasBlend: oldW.vegasBlend, sigma: oldW.sigma }, after: { vegasBlend: weights.vegasBlend, sigma: weights.sigma } },
  };

  fs.mkdirSync('data/reports', { recursive: true });
  fs.mkdirSync('public/data/reports', { recursive: true });
  fs.writeFileSync('data/reports/latest.json', JSON.stringify(report, null, 2));
  fs.writeFileSync(`data/reports/${report.date}.json`, JSON.stringify(report, null, 2));
  fs.writeFileSync('public/data/reports/latest.json', JSON.stringify(report, null, 2));

  // Save state
  weights.version = (oldW.version || 1) + 1;
  weights.lastUpdated = new Date().toISOString();
  fs.writeFileSync('data/weights.json', JSON.stringify(weights, null, 2));
  fs.writeFileSync('data/accuracy-history.json', JSON.stringify(history, null, 2));
  fs.writeFileSync('data/learning-state.json', JSON.stringify(learning, null, 2));

  console.log(`\n💾 Saved. Weights v${weights.version}, ${history.totalGames} total games graded.`);
  console.log('═══════════════════════\n');
}

main();