const fs = require('fs');

// ═══════════════════════════════════════════════════════
// DELTA REPORT v2 — Always compares to 7am baseline
//
// At 7am (scheduled run): saves current predictions as
//   the day's BASELINE. Delta report shows "fresh start."
//
// At any manual run after 7am: compares current predictions
//   to the 7am BASELINE. So if 7am = 56%, 9am = 58%,
//   11am = 59%, the 11am report shows 56% → 59% (not 58→59).
//
// The baseline is ONLY overwritten by the next 7am run.
// ═══════════════════════════════════════════════════════

const BASELINE_FILE = 'data/predictions-baseline.json';
const CURR_FILE = 'data/predictions.json';
const DELTA_FILE = 'data/reports/delta-latest.json';
const WEIGHTS_FILE = 'data/weights.json';

// Is this the 7am scheduled run?
const isScheduled = process.env.IS_SCHEDULED === 'true';

function loadJSON(path) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); } catch { return null; }
}

function main() {
  console.log('\n📊 Delta Report Generator v2');
  console.log(`   Run type: ${isScheduled ? '⏰ SCHEDULED (7am) — will set new baseline' : '🔄 MANUAL — comparing to 7am baseline'}`);
  console.log('════════════════════════════\n');

  const curr = loadJSON(CURR_FILE);
  const weights = loadJSON(WEIGHTS_FILE);

  if (!curr) {
    console.log('❌ No current predictions found.');
    return;
  }

  const currPreds = curr.predictions || [];
  fs.mkdirSync('data/reports', { recursive: true });

  // ═══ SCHEDULED 7am RUN: Set new baseline ═══
  if (isScheduled) {
    console.log('⏰ This is the 7am scheduled run.');
    console.log('   Saving current predictions as today\'s baseline.\n');

    const baseline = {
      ...curr,
      baselineSetAt: new Date().toISOString(),
      baselineSetAtCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
    };

    fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));

    const report = {
      timestamp: new Date().toISOString(),
      timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
      type: 'BASELINE_SET',
      message: '7am daily update complete. This is the new baseline. Any manual refreshes today will show changes relative to this snapshot.',
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

    fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
    const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-');
    fs.writeFileSync(`data/reports/delta-${dateStr}.json`, JSON.stringify(report, null, 2));
    console.log('   ✅ Baseline saved. Delta report: "no changes (this IS the baseline)."\n');
    return;
  }

  // ═══ MANUAL RUN: Compare to 7am baseline ═══
  const baseline = loadJSON(BASELINE_FILE);

  if (!baseline) {
    console.log('📝 No baseline found (no 7am run yet today).');
    console.log('   Saving current predictions as baseline for future comparisons.\n');
    const fallback = {
      ...curr,
      baselineSetAt: new Date().toISOString(),
      baselineSetAtCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST (manual — no 7am run found)',
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(fallback, null, 2));

    const report = {
      timestamp: new Date().toISOString(),
      timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
      type: 'BASELINE_SET',
      message: 'No 7am baseline found — using this run as the baseline. Next manual refresh will show changes.',
      baselineTime: fallback.baselineSetAtCST,
      totalPredictions: currPreds.length,
      deltas: [],
      summary: { totalGamesCompared: currPreds.length, gamesChanged: 0, winnersFlipped: 0, newMatchups: 0, avgSpreadChange: 0, biggestMover: 'None' },
    };
    fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
    console.log('   ✅ Saved as baseline.\n');
    return;
  }

  // We have a baseline — compare!
  const basePreds = baseline.predictions || [];
  const baseTime = baseline.baselineSetAtCST || baseline.timestamp || 'unknown';

  console.log(`📋 Comparing to 7am baseline from: ${baseTime}`);
  console.log(`   Baseline: ${basePreds.length} predictions`);
  console.log(`   Current:  ${currPreds.length} predictions\n`);

  // Index baseline by matchup
  const baseByKey = {};
  basePreds.forEach(p => {
    baseByKey[`${p.teamA} vs ${p.teamB}`] = p;
    baseByKey[`${p.teamB} vs ${p.teamA}`] = p;
  });

  // ═══ Compare ═══
  const deltas = [];

  for (const curr_p of currPreds) {
    const key = `${curr_p.teamA} vs ${curr_p.teamB}`;
    const base_p = baseByKey[key];

    if (!base_p) {
      deltas.push({
        matchup: key, round: curr_p.round, region: curr_p.region,
        type: 'NEW', winner: curr_p.winner, winProb: curr_p.winProb,
        spread: curr_p.blendedSpread,
        message: `New matchup since 7am — ${curr_p.winner} predicted to win (${curr_p.winProb}%)`,
        factors: ['New round matchup generated from bracket advancement'],
        absDelta: 999,
      });
      continue;
    }

    const spreadChange = Math.round((curr_p.blendedSpread - base_p.blendedSpread) * 10) / 10;
    const probChange = Math.round((curr_p.winProb - base_p.winProb) * 10) / 10;
    const modelSpChange = Math.round((curr_p.modelSpread - base_p.modelSpread) * 10) / 10;
    const vegasChange = (curr_p.vegasLine !== null && base_p.vegasLine !== null)
      ? Math.round((curr_p.vegasLine - base_p.vegasLine) * 10) / 10 : null;
    const winnerChanged = curr_p.winner !== base_p.winner;

    const absDelta = Math.abs(spreadChange) + Math.abs(probChange) / 10;
    if (absDelta < 0.2 && !winnerChanged) continue;

    // Figure out WHY
    const factors = [];

    if (vegasChange !== null && Math.abs(vegasChange) >= 0.5) {
      const dir = vegasChange > 0 ? 'toward ' + curr_p.teamA : 'toward ' + curr_p.teamB;
      factors.push(`Vegas line moved ${Math.abs(vegasChange)} pts ${dir} (was ${base_p.vegasLine}, now ${curr_p.vegasLine})`);
    }

    if (Math.abs(modelSpChange) >= 0.3) {
      factors.push(`Model spread shifted ${modelSpChange > 0 ? '+' : ''}${modelSpChange} pts (was ${base_p.modelSpread}, now ${curr_p.modelSpread})`);
    }

    if (curr_p.injuryFlagA && !base_p.injuryFlagA) factors.push(`New injury news for ${curr_p.teamA} (${curr_p.injuryFlagA})`);
    if (curr_p.injuryFlagB && !base_p.injuryFlagB) factors.push(`New injury news for ${curr_p.teamB} (${curr_p.injuryFlagB})`);
    if (!curr_p.injuryFlagA && base_p.injuryFlagA) factors.push(`Injury cleared for ${curr_p.teamA}`);
    if (!curr_p.injuryFlagB && base_p.injuryFlagB) factors.push(`Injury cleared for ${curr_p.teamB}`);

    if (winnerChanged) factors.push(`⚠️ WINNER FLIPPED: was ${base_p.winner} at 7am, now ${curr_p.winner}`);

    if (factors.length === 0) {
      if (Math.abs(modelSpChange) >= 0.1) factors.push('Elo rating adjustment from games played today');
      if (weights && weights.version > 1) factors.push(`Weight tuning (model v${weights.version})`);
    }

    deltas.push({
      matchup: key, round: curr_p.round, region: curr_p.region,
      type: winnerChanged ? 'FLIP' : 'SHIFT',
      baselineWinner: base_p.winner, baselineWinProb: base_p.winProb,
      baselineSpread: base_p.blendedSpread, baselineVegas: base_p.vegasLine,
      baselineModelSpread: base_p.modelSpread,
      baselineScoreW: base_p.scoreW, baselineScoreL: base_p.scoreL,
      winner: curr_p.winner, winProb: curr_p.winProb,
      spread: curr_p.blendedSpread, vegasLine: curr_p.vegasLine,
      modelSpread: curr_p.modelSpread,
      scoreW: curr_p.scoreW, scoreL: curr_p.scoreL,
      spreadChange, probChange,
      modelSpreadChange: modelSpChange, vegasChange,
      factors, absDelta,
    });
  }

  deltas.sort((a, b) => b.absDelta - a.absDelta);

  // ═══ Build report ═══
  const report = {
    timestamp: new Date().toISOString(),
    timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
    type: 'DELTA',
    baselineTime: baseTime,
    currentTime: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
    summary: {
      totalGamesCompared: currPreds.length,
      gamesChanged: deltas.length,
      winnersFlipped: deltas.filter(d => d.type === 'FLIP').length,
      newMatchups: deltas.filter(d => d.type === 'NEW').length,
      avgSpreadChange: deltas.filter(d => d.spreadChange !== undefined).length > 0
        ? Math.round(deltas.filter(d => d.spreadChange !== undefined).reduce((s, d) => s + Math.abs(d.spreadChange || 0), 0) / deltas.filter(d => d.spreadChange !== undefined).length * 10) / 10
        : 0,
      biggestMover: deltas.length > 0 ? deltas[0].matchup : 'None',
    },
    deltas,
  };

  fs.writeFileSync(DELTA_FILE, JSON.stringify(report, null, 2));
  const dateStr = new Date().toISOString().slice(0, 16).replace(':', '-');
  fs.writeFileSync(`data/reports/delta-${dateStr}.json`, JSON.stringify(report, null, 2));

  // ═══ Print ═══
  console.log(`🔄 CHANGES SINCE 7AM BASELINE:`);
  console.log(`   ${deltas.length} games changed`);
  console.log(`   ${deltas.filter(d => d.type === 'FLIP').length} winners FLIPPED`);
  console.log(`   ${deltas.filter(d => d.type === 'NEW').length} new matchups\n`);

  if (deltas.length === 0) {
    console.log('   ✅ No meaningful changes since 7am — predictions are stable.\n');
  } else {
    console.log('📋 BIGGEST MOVERS (vs 7am baseline):');
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

  console.log('\n✅ Delta report saved (compared to 7am baseline).\n');
}

main();
