const fs = require('fs');

// ═══════════════════════════════════════════════════════
// DELTA REPORT — "What changed since the last run?"
//
// Compares the current predictions to the previous run's
// predictions and generates a report showing:
//   - Which games had their spread/winner/probability change
//   - What caused the change (line movement, Elo, injuries, weights)
//   - Sorted by biggest changes first
//
// Runs AFTER run-predictions.js in the pipeline.
// ═══════════════════════════════════════════════════════

const PREV_FILE = 'data/predictions-previous.json';
const CURR_FILE = 'data/predictions.json';
const DELTA_FILE = 'data/reports/delta-latest.json';
const DATA_FILE = 'data/latest.json';
const WEIGHTS_FILE = 'data/weights.json';

function loadJSON(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

function main() {
  console.log('\n📊 Delta Report Generator');
  console.log('════════════════════════════\n');

  const prev = loadJSON(PREV_FILE);
  const curr = loadJSON(CURR_FILE);
  const freshData = loadJSON(DATA_FILE);
  const weights = loadJSON(WEIGHTS_FILE);

  if (!curr) {
    console.log('❌ No current predictions found. Run predictions first.');
    return;
  }

  // Current predictions are nested under .predictions
  const currPreds = curr.predictions || [];

  if (!prev) {
    // First run — no previous to compare. Save current as previous for next time.
    console.log('📝 First run — no previous predictions to compare.');
    console.log('   Saving current predictions as baseline for next run.');
    fs.writeFileSync(PREV_FILE, JSON.stringify(curr, null, 2));

    // Still generate a report showing all current predictions
    const report = {
      timestamp: new Date().toISOString(),
      timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
      type: 'BASELINE',
      message: 'First run — all predictions are new. Next run will show changes.',
      currentPredictions: currPreds.map(p => ({
        matchup: `${p.teamA} vs ${p.teamB}`,
        round: p.round,
        region: p.region,
        winner: p.winner,
        winProb: p.winProb,
        spread: p.blendedSpread,
        vegasLine: p.vegasLine,
        edge: p.edge,
      })),
      totalGames: currPreds.length,
      deltas: [],
    };

    fs.mkdirSync('data/reports', { recursive: true });
    fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
    const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-');
    fs.writeFileSync(`data/reports/delta-${dateStr}.json`, JSON.stringify(report, null, 2));
    console.log('   Saved baseline report.\n');
    return;
  }

  // Previous predictions
  const prevPreds = prev.predictions || [];

  // Index previous by matchup key
  const prevByKey = {};
  prevPreds.forEach(p => {
    prevByKey[`${p.teamA} vs ${p.teamB}`] = p;
    prevByKey[`${p.teamB} vs ${p.teamA}`] = p;
  });

  // ═══ Compare each current prediction to previous ═══
  const deltas = [];

  for (const curr_p of currPreds) {
    const key = `${curr_p.teamA} vs ${curr_p.teamB}`;
    const prev_p = prevByKey[key];

    if (!prev_p) {
      // New game (wasn't in previous — maybe a new round opened up)
      deltas.push({
        matchup: key,
        round: curr_p.round,
        region: curr_p.region,
        type: 'NEW',
        winner: curr_p.winner,
        winProb: curr_p.winProb,
        spread: curr_p.blendedSpread,
        message: `New matchup — ${curr_p.winner} predicted to win (${curr_p.winProb}%)`,
        factors: ['New round matchup generated from bracket advancement'],
        absDelta: 999, // sort to top
      });
      continue;
    }

    // Calculate changes
    const spreadChange = Math.round((curr_p.blendedSpread - prev_p.blendedSpread) * 10) / 10;
    const probChange = Math.round((curr_p.winProb - prev_p.winProb) * 10) / 10;
    const modelSpChange = Math.round((curr_p.modelSpread - prev_p.modelSpread) * 10) / 10;
    const vegasChange = (curr_p.vegasLine !== null && prev_p.vegasLine !== null)
      ? Math.round((curr_p.vegasLine - prev_p.vegasLine) * 10) / 10
      : null;
    const edgeChange = (curr_p.edge !== null && prev_p.edge !== null)
      ? Math.round((curr_p.edge - prev_p.edge) * 10) / 10
      : null;
    const winnerChanged = curr_p.winner !== prev_p.winner;
    const scoreWChange = curr_p.scoreW - prev_p.scoreW;
    const scoreLChange = curr_p.scoreL - prev_p.scoreL;

    // Skip if nothing meaningful changed
    const absDelta = Math.abs(spreadChange) + Math.abs(probChange) / 10;
    if (absDelta < 0.2 && !winnerChanged) continue;

    // ═══ Figure out WHY it changed ═══
    const factors = [];

    // Vegas line moved
    if (vegasChange !== null && Math.abs(vegasChange) >= 0.5) {
      const dir = vegasChange > 0 ? 'toward ' + curr_p.teamA : 'toward ' + curr_p.teamB;
      factors.push(`Vegas line moved ${Math.abs(vegasChange)} pts ${dir} (${prev_p.vegasLine} → ${curr_p.vegasLine})`);
    }

    // Model spread changed (Elo, injuries, weights)
    if (Math.abs(modelSpChange) >= 0.3) {
      factors.push(`Model spread shifted ${modelSpChange > 0 ? '+' : ''}${modelSpChange} pts (raw model: ${prev_p.modelSpread} → ${curr_p.modelSpread})`);
    }

    // Injury flags changed
    const prevInjA = prev_p.injuryFlagA;
    const prevInjB = prev_p.injuryFlagB;
    const currInjA = curr_p.injuryFlagA;
    const currInjB = curr_p.injuryFlagB;
    if (currInjA && !prevInjA) factors.push(`New injury news for ${curr_p.teamA} (${currInjA})`);
    if (currInjB && !prevInjB) factors.push(`New injury news for ${curr_p.teamB} (${currInjB})`);
    if (!currInjA && prevInjA) factors.push(`Injury cleared for ${curr_p.teamA}`);
    if (!currInjB && prevInjB) factors.push(`Injury cleared for ${curr_p.teamB}`);

    // Winner flipped
    if (winnerChanged) {
      factors.push(`⚠️ WINNER FLIPPED: was ${prev_p.winner}, now ${curr_p.winner}`);
    }

    // If no specific factor identified, attribute to weight tuning / Elo
    if (factors.length === 0) {
      if (Math.abs(modelSpChange) >= 0.1) {
        factors.push('Elo rating adjustment from recent results');
      }
      if (weights && weights.version > 1) {
        factors.push(`Weight tuning (model v${weights.version})`);
      }
    }

    deltas.push({
      matchup: key,
      round: curr_p.round,
      region: curr_p.region,
      type: winnerChanged ? 'FLIP' : 'SHIFT',
      // Previous
      prevWinner: prev_p.winner,
      prevWinProb: prev_p.winProb,
      prevSpread: prev_p.blendedSpread,
      prevVegas: prev_p.vegasLine,
      prevModelSpread: prev_p.modelSpread,
      prevScoreW: prev_p.scoreW,
      prevScoreL: prev_p.scoreL,
      // Current
      winner: curr_p.winner,
      winProb: curr_p.winProb,
      spread: curr_p.blendedSpread,
      vegasLine: curr_p.vegasLine,
      modelSpread: curr_p.modelSpread,
      scoreW: curr_p.scoreW,
      scoreL: curr_p.scoreL,
      // Changes
      spreadChange,
      probChange,
      modelSpreadChange: modelSpChange,
      vegasChange,
      edgeChange,
      scoreWChange,
      scoreLChange,
      // Why
      factors,
      absDelta,
    });
  }

  // Sort by biggest change first
  deltas.sort((a, b) => b.absDelta - a.absDelta);

  // ═══ Build report ═══
  const prevTime = prev.timestamp || 'unknown';
  const currTime = curr.timestamp || new Date().toISOString();

  const report = {
    timestamp: new Date().toISOString(),
    timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
    type: 'DELTA',
    previousRun: prevTime,
    currentRun: currTime,
    summary: {
      totalGamesCompared: currPreds.length,
      gamesChanged: deltas.length,
      winnersFlipped: deltas.filter(d => d.type === 'FLIP').length,
      newMatchups: deltas.filter(d => d.type === 'NEW').length,
      avgSpreadChange: deltas.length > 0
        ? Math.round(deltas.filter(d => d.spreadChange !== undefined).reduce((s, d) => s + Math.abs(d.spreadChange || 0), 0) / deltas.length * 10) / 10
        : 0,
      biggestMover: deltas.length > 0 ? deltas[0].matchup : 'None',
    },
    deltas,
  };

  // Save
  fs.mkdirSync('data/reports', { recursive: true });
  fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-');
  fs.writeFileSync(`data/reports/delta-${dateStr}.json`, JSON.stringify(report, null, 2));

  // NOW save current as previous for next run
  fs.writeFileSync(PREV_FILE, JSON.stringify(curr, null, 2));

  // ═══ Print summary ═══
  console.log(`📊 Compared ${currPreds.length} predictions to previous run`);
  console.log(`   Previous run: ${prevTime}`);
  console.log(`   Current run:  ${currTime}\n`);

  console.log(`🔄 CHANGES:`);
  console.log(`   ${deltas.length} games had meaningful changes`);
  console.log(`   ${deltas.filter(d => d.type === 'FLIP').length} winners FLIPPED`);
  console.log(`   ${deltas.filter(d => d.type === 'NEW').length} new matchups\n`);

  if (deltas.length === 0) {
    console.log('   ✅ No meaningful changes — predictions are stable.\n');
  } else {
    console.log('📋 BIGGEST MOVERS:');
    deltas.slice(0, 10).forEach(d => {
      if (d.type === 'NEW') {
        console.log(`   🆕 ${d.matchup}: ${d.message}`);
      } else {
        const arrow = d.spreadChange > 0 ? '↑' : d.spreadChange < 0 ? '↓' : '→';
        const flipTag = d.type === 'FLIP' ? ' ⚠️ WINNER FLIPPED' : '';
        console.log(`   ${arrow} ${d.matchup}: spread ${d.prevSpread} → ${d.spread} (${d.spreadChange > 0 ? '+' : ''}${d.spreadChange}), prob ${d.prevWinProb}% → ${d.winProb}% (${d.probChange > 0 ? '+' : ''}${d.probChange})${flipTag}`);
        d.factors.forEach(f => console.log(`      └─ ${f}`));
      }
    });
  }

  console.log('\n✅ Delta report saved.\n');
}

main();
