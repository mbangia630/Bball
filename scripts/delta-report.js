const fs = require('fs');

// ═══════════════════════════════════════════════════════
// DELTA REPORT v9 — Compares current predictions to baseline
//
// At scheduled run (IS_SCHEDULED=true): saves current predictions
//   as the day's BASELINE. Delta report shows "fresh start."
//
// At manual run: compares current predictions to baseline.
//   Shows what changed and why.
// ═══════════════════════════════════════════════════════

const BASELINE_FILE = 'data/predictions-baseline.json';
const CURR_FILE = 'data/predictions.json';
const DELTA_FILE = 'data/reports/delta-latest.json';
const WEIGHTS_FILE = 'data/weights.json';

const isScheduled = process.env.IS_SCHEDULED === 'true';

function loadJSON(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

function fmtCST() {
  return new Date().toLocaleString('en-US', {
    timeZone: 'America/Chicago', month: 'short', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  }) + ' CST';
}

function saveReport(report) {
  fs.mkdirSync('data/reports', { recursive: true });
  fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-');
  fs.writeFileSync(`data/reports/delta-${dateStr}.json`, JSON.stringify(report, null, 2));
  // Copy to public
  fs.mkdirSync('public/data/reports', { recursive: true });
  try { fs.copyFileSync(DELTA_FILE, 'public/data/reports/delta-latest.json'); } catch {}
}

function main() {
  console.log('\n📊 Delta Report Generator v9');
  console.log(`   Run type: ${isScheduled ? '⏰ SCHEDULED — setting new baseline' : '🔄 MANUAL — comparing to baseline'}`);
  console.log('════════════════════════════\n');

  const curr = loadJSON(CURR_FILE);
  const weights = loadJSON(WEIGHTS_FILE);

  if (!curr) {
    console.log('❌ No current predictions found.');
    return;
  }

  const currPreds = curr.predictions || [];

  // ═══ SCHEDULED RUN: Set new baseline ═══
  if (isScheduled) {
    console.log('⏰ Scheduled run — saving predictions as baseline.\n');
    const baseline = {
      ...curr,
      baselineSetAt: new Date().toISOString(),
      baselineSetAtCST: fmtCST(),
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));

    const report = {
      timestamp: new Date().toISOString(),
      timestampCST: fmtCST(),
      type: 'BASELINE_SET',
      message: 'Scheduled update complete. This is the new baseline. Next runs will show changes relative to this snapshot.',
      baselineTime: baseline.baselineSetAtCST,
      totalPredictions: currPreds.length,
      deltas: [],
      summary: {
        totalGamesCompared: currPreds.length,
        gamesChanged: 0,
        winnersFlipped: 0,
        newMatchups: 0,
        avgSpreadChange: 0,
        biggestMover: 'None — this is the baseline',
      },
    };

    saveReport(report);
    console.log('   ✅ Baseline saved.\n');
    return;
  }

  // ═══ MANUAL RUN: Compare to baseline ═══
  let baseline = loadJSON(BASELINE_FILE);

  if (!baseline) {
    console.log('📝 No baseline found — saving current as baseline.\n');
    const fallback = {
      ...curr,
      baselineSetAt: new Date().toISOString(),
      baselineSetAtCST: fmtCST() + ' (auto — no scheduled run found)',
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(fallback, null, 2));

    const report = {
      timestamp: new Date().toISOString(),
      timestampCST: fmtCST(),
      type: 'BASELINE_SET',
      message: 'No baseline found — using this run as baseline. Next run will show changes.',
      baselineTime: fallback.baselineSetAtCST,
      totalPredictions: currPreds.length,
      deltas: [],
      summary: { totalGamesCompared: currPreds.length, gamesChanged: 0, winnersFlipped: 0, newMatchups: 0, avgSpreadChange: 0, biggestMover: 'None' },
    };
    saveReport(report);
    console.log('   ✅ Saved as baseline.\n');
    return;
  }

  // We have a baseline — compare!
  const basePreds = baseline.predictions || [];
  const baseTime = baseline.baselineSetAtCST || baseline.timestamp || 'unknown';

  console.log(`📋 Comparing to baseline from: ${baseTime}`);
  console.log(`   Baseline: ${basePreds.length} predictions`);
  console.log(`   Current:  ${currPreds.length} predictions\n`);

  // Index baseline by matchup (check both orderings)
  const baseByKey = {};
  basePreds.forEach(p => {
    baseByKey[`${p.teamA}|${p.teamB}`] = p;
    baseByKey[`${p.teamB}|${p.teamA}`] = p;
  });

  // ═══ Compare ═══
  const deltas = [];

  for (const cp of currPreds) {
    const key = `${cp.teamA}|${cp.teamB}`;
    const bp = baseByKey[key];

    if (!bp) {
      deltas.push({
        matchup: `${cp.teamA} vs ${cp.teamB}`,
        round: cp.round || '',
        region: cp.region || '',
        type: 'NEW',
        winner: cp.winner,
        winProb: cp.winProb,
        spread: cp.blendedSpread || cp.finalSpread || cp.modelSpread || 0,
        message: `New matchup — ${cp.winner} predicted to win (${cp.winProb}%)`,
        factors: ['New matchup generated from bracket advancement'],
        absDelta: 999,
      });
      continue;
    }

    const currSpread = cp.blendedSpread || cp.finalSpread || cp.modelSpread || 0;
    const baseSpread = bp.blendedSpread || bp.finalSpread || bp.modelSpread || 0;
    const spreadChange = Math.round((currSpread - baseSpread) * 10) / 10;
    const probChange = Math.round(((cp.winProb || 0) - (bp.winProb || 0)) * 10) / 10;
    const modelSpChange = Math.round(((cp.modelSpread || 0) - (bp.modelSpread || 0)) * 10) / 10;
    const vegasChange = (cp.vegasLine != null && bp.vegasLine != null)
      ? Math.round((cp.vegasLine - bp.vegasLine) * 10) / 10 : null;
    const winnerChanged = cp.winner !== bp.winner;

    const absDelta = Math.abs(spreadChange) + Math.abs(probChange) / 10;
    if (absDelta < 0.2 && !winnerChanged) continue;

    // Figure out WHY
    const factors = [];

    if (vegasChange !== null && Math.abs(vegasChange) >= 0.5) {
      const dir = vegasChange > 0 ? 'toward ' + cp.teamA : 'toward ' + cp.teamB;
      factors.push(`Vegas line moved ${Math.abs(vegasChange)} pts ${dir} (was ${bp.vegasLine}, now ${cp.vegasLine})`);
    }

    if (Math.abs(modelSpChange) >= 0.3) {
      factors.push(`Model spread shifted ${modelSpChange > 0 ? '+' : ''}${modelSpChange} pts (was ${bp.modelSpread}, now ${cp.modelSpread})`);
    }

    // Sim changes (v9-specific)
    if (cp.sim && bp.sim) {
      const medianChange = Math.round(((cp.sim.median || 0) - (bp.sim.median || 0)) * 10) / 10;
      if (Math.abs(medianChange) >= 1) {
        factors.push(`Monte Carlo median shifted ${medianChange > 0 ? '+' : ''}${medianChange} (${bp.sim.median} → ${cp.sim.median})`);
      }
      const closeChange = Math.round(((cp.sim.closeGame || 0) - (bp.sim.closeGame || 0)) * 10) / 10;
      if (Math.abs(closeChange) >= 5) {
        factors.push(`Close game probability ${closeChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(closeChange)}%`);
      }
    }

    if (winnerChanged) factors.push(`⚠️ WINNER FLIPPED: was ${bp.winner}, now ${cp.winner}`);

    if (factors.length === 0) {
      if (Math.abs(modelSpChange) >= 0.1) factors.push('Rating adjustments from recent results');
      if (weights && weights.version > 1) factors.push(`Weight tuning (model v${weights.version})`);
      if (factors.length === 0) factors.push('Minor model recalibration');
    }

    deltas.push({
      matchup: `${cp.teamA} vs ${cp.teamB}`,
      round: cp.round || '',
      region: cp.region || '',
      type: winnerChanged ? 'FLIP' : 'SHIFT',
      baselineWinner: bp.winner,
      baselineWinProb: bp.winProb,
      baselineSpread: baseSpread,
      baselineVegas: bp.vegasLine ?? null,
      baselineModelSpread: bp.modelSpread,
      baselineScoreW: bp.scoreW,
      baselineScoreL: bp.scoreL,
      winner: cp.winner,
      winProb: cp.winProb,
      spread: currSpread,
      vegasLine: cp.vegasLine ?? null,
      modelSpread: cp.modelSpread,
      scoreW: cp.scoreW,
      scoreL: cp.scoreL,
      spreadChange,
      probChange,
      modelSpreadChange: modelSpChange,
      vegasChange,
      // v9: include sim deltas
      simMedianBefore: bp.sim?.median ?? null,
      simMedianAfter: cp.sim?.median ?? null,
      simStdDevBefore: bp.sim?.stdDev ?? null,
      simStdDevAfter: cp.sim?.stdDev ?? null,
      factors,
      absDelta,
    });
  }

  deltas.sort((a, b) => b.absDelta - a.absDelta);

  // ═══ Build report ═══
  const report = {
    timestamp: new Date().toISOString(),
    timestampCST: fmtCST(),
    type: 'DELTA',
    engineVersion: 'v9.0-montecarlo',
    baselineTime: baseTime,
    currentTime: fmtCST(),
    summary: {
      totalGamesCompared: currPreds.length,
      gamesChanged: deltas.length,
      winnersFlipped: deltas.filter(d => d.type === 'FLIP').length,
      newMatchups: deltas.filter(d => d.type === 'NEW').length,
      avgSpreadChange: deltas.filter(d => d.spreadChange !== undefined).length > 0
        ? Math.round(deltas.filter(d => d.spreadChange !== undefined).reduce((s, d) => s + Math.abs(d.spreadChange || 0), 0) / deltas.filter(d => d.spreadChange !== undefined).length * 10) / 10
        : 0,
      biggestMover: deltas.length > 0 ? deltas[0].matchup : 'None — predictions are stable',
    },
    deltas,
  };

  saveReport(report);

  // ═══ Print ═══
  console.log(`🔄 CHANGES SINCE BASELINE:`);
  console.log(`   ${deltas.length} games changed`);
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
        console.log(`   ${arrow} ${d.matchup}: spread ${d.baselineSpread} → ${d.spread} (${d.spreadChange > 0 ? '+' : ''}${d.spreadChange}), prob ${d.baselineWinProb}% → ${d.winProb}% (${d.probChange > 0 ? '+' : ''}${d.probChange})${flipTag}`);
        d.factors.forEach(f => console.log(`      └─ ${f}`));
      }
    });
  }

  console.log('\n✅ Delta report saved.\n');
}

main();
