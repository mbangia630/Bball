const fs = require('fs');

// ═══════════════════════════════════════════════════════
// PREDICTION RUNNER — uses fresh data to re-run model
// ═══════════════════════════════════════════════════════

// Load the latest data
const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));

// Load the team database (your algorithm's team stats)
// This is the DB object from v8-final.jsx, exported as JSON
let teamDB = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));

console.log('\n🧠 Running predictions with data from', data.timestamp);

// ═══ 1. UPDATE VEGAS LINES ═══
const vegasLines = {};
for (const [key, val] of Object.entries(data.odds)) {
  if (val.spread !== null) {
    vegasLines[key] = val.spread;
  }
}
console.log(`📊 Loaded ${Object.keys(vegasLines).length} Vegas lines`);

// ═══ 2. UPDATE ELO FROM YESTERDAY'S RESULTS ═══
let eloUpdates = 0;
for (const game of data.yesterdayResults) {
  const a = teamDB[game.teamA];
  const b = teamDB[game.teamB];
  if (!a || !b) continue;

  const K = 20;
  const hca = game.neutral ? 0 : 65;
  const expected = 1 / (1 + Math.pow(10, ((b.elo || 1500) - (a.elo || 1500) - hca) / 400));
  const actual = game.scoreA > game.scoreB ? 1 : 0;
  const mov = Math.min(Math.abs(game.scoreA - game.scoreB), 25);
  const movMult = Math.log(mov + 1) * 0.8;

  a.elo = Math.round((a.elo || 1500) + K * movMult * (actual - expected));
  b.elo = Math.round((b.elo || 1500) + K * movMult * (expected - actual));
  eloUpdates++;
}
console.log(`⚡ Updated Elo for ${eloUpdates} games`);

// ═══ 3. FLAG INJURY CHANGES ═══
const injuryKeywords = {};
for (const article of data.injuries) {
  const text = (article.headline + ' ' + article.description).toLowerCase();
  // Simple keyword extraction — in production, use Claude API for better parsing
  for (const team of Object.keys(teamDB)) {
    if (text.includes(team.toLowerCase())) {
      if (!injuryKeywords[team]) injuryKeywords[team] = [];
      injuryKeywords[team].push(article.headline);
    }
  }
}
const teamsWithInjuryNews = Object.keys(injuryKeywords);
if (teamsWithInjuryNews.length > 0) {
  console.log(`🏥 Injury news found for: ${teamsWithInjuryNews.join(', ')}`);
  console.log('   ⚠️ Review manually — auto-injury adjustment not yet implemented');
}

// ═══ 4. RUN PREDICTIONS FOR TODAY'S GAMES ═══
const predictions = [];
for (const game of data.games) {
  const a = teamDB[game.teamA];
  const b = teamDB[game.teamB];
  if (!a || !b) {
    console.log(`   ⚠️ Unknown team: ${game.teamA} or ${game.teamB}`);
    continue;
  }

  // Simplified sim — in production, use the full v8 sim() function
  const emDiff = (a.em || 0) - (b.em || 0);
  const modelSpread = emDiff * 0.75; // simplified
  const vegasLine = vegasLines[game.teamA + ' vs ' + game.teamB]
    || vegasLines[game.teamB + ' vs ' + game.teamA]
    || null;
  const blended = vegasLine !== null ? modelSpread * 0.45 + vegasLine * 0.55 : modelSpread;

  predictions.push({
    ...game,
    modelSpread: Math.round(modelSpread * 10) / 10,
    vegasLine,
    blendedSpread: Math.round(blended * 10) / 10,
    edge: vegasLine !== null ? Math.round((modelSpread - vegasLine) * 10) / 10 : null,
  });
}

// Save predictions
fs.writeFileSync('data/predictions.json', JSON.stringify(predictions, null, 2));

// Save updated team DB (with new Elo)
fs.writeFileSync('data/teams.json', JSON.stringify(teamDB, null, 2));

console.log(`\n✅ Generated ${predictions.length} predictions`);
console.log('   Saved to data/predictions.json');

// Print top edges
const edges = predictions.filter(p => p.edge !== null).sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
console.log('\n🔥 TOP EDGES:');
edges.slice(0, 5).forEach(p => {
  console.log(`   ${p.teamA} vs ${p.teamB}: model ${p.modelSpread > 0 ? '+' : ''}${p.modelSpread} / vegas ${p.vegasLine > 0 ? '+' : ''}${p.vegasLine} → edge ${Math.abs(p.edge)}`);
});