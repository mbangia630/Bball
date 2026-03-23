// ═══════════════════════════════════════════════════════
// v8 → v9 MIGRATION SCRIPT
// Run this ONCE before deploying v9.
// Archives v8 state and resets learning for v9.
// ═══════════════════════════════════════════════════════
//
// Usage: node scripts/migrate-v8-to-v9.js
//
// What it does:
// 1. Archives current v8 weights/learning/accuracy to data/v8-archive/
// 2. Resets accuracy-history to 0 (v9 starts fresh for fair comparison)
// 3. Preserves bracket-state, teams.json, predictions-snapshot (all still valid)
// 4. Preserves v8 learned weights (v9 uses them as starting point)
// 5. Resets gradedGameIds so v9 learning re-grades all games with v9 engine output

const fs = require('fs');

console.log('\n🔄 Migrating v8 → v9...\n');

// 1. Archive v8
fs.mkdirSync('data/v8-archive', { recursive: true });
const files = ['weights.json', 'learning-state.json', 'accuracy-history.json'];
for (const f of files) {
  try {
    fs.copyFileSync(`data/${f}`, `data/v8-archive/${f.replace('.json', '-final.json')}`);
    console.log(`   ✅ Archived ${f}`);
  } catch (e) {
    console.log(`   ⚠️ Could not archive ${f}: ${e.message}`);
  }
}

// 2. Create v8 summary
try {
  const h = JSON.parse(fs.readFileSync('data/accuracy-history.json', 'utf8'));
  const w = JSON.parse(fs.readFileSync('data/weights.json', 'utf8'));
  const summary = {
    version: 'v8.0',
    gamesGraded: h.totalGames || 0,
    straightUpPct: h.totalGames > 0 ? Math.round(h.correctSU / h.totalGames * 1000) / 10 : null,
    atsPct: h.totalGames > 0 ? Math.round(h.correctATS / h.totalGames * 1000) / 10 : null,
    finalWeights: w,
    archivedAt: new Date().toISOString(),
    note: 'v8 baseline for comparison with v9 Monte Carlo engine',
  };
  fs.writeFileSync('data/v8-archive/summary.json', JSON.stringify(summary, null, 2));
  console.log(`   ✅ v8 summary: ${summary.gamesGraded} games, ${summary.straightUpPct}% SU, ${summary.atsPct}% ATS`);
} catch (e) {
  console.log(`   ⚠️ Could not create summary: ${e.message}`);
}

// 3. Reset accuracy history (v9 starts clean for fair comparison)
fs.writeFileSync('data/accuracy-history.json', JSON.stringify({
  games: [], daily: [], totalGames: 0, correctSU: 0, correctATS: 0,
  v8Baseline: { totalGames: 34, straightUpPct: 76.5, atsPct: 50.0 },
}, null, 2));
console.log('   ✅ Accuracy history reset (v8 baseline preserved)');

// 4. Reset gradedGameIds only (keep everything else in learning-state)
try {
  const learning = JSON.parse(fs.readFileSync('data/learning-state.json', 'utf8'));
  learning.gradedGameIds = []; // v9 will re-grade with its own output
  fs.writeFileSync('data/learning-state.json', JSON.stringify(learning, null, 2));
  console.log('   ✅ GradedGameIds reset (teamK + layer accuracy preserved)');
} catch (e) {
  console.log(`   ⚠️ Could not reset learning: ${e.message}`);
}

console.log('\n✅ Migration complete. Deploy v9 and run the pipeline.\n');
