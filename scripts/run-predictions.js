const fs = require('fs');
const { resolve } = require('./team-names');

// ═══════════════════════════════════════════════════════
// PREDICTION RUNNER v2
// Predicts ALL upcoming tournament games, not just today.
// Uses fresh Vegas lines, updated Elo, and injury flags.
// ═══════════════════════════════════════════════════════

const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));
let teamDB = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));

// Load tuned weights if available
let weights;
try {
  weights = JSON.parse(fs.readFileSync('data/weights.json', 'utf8'));
} catch {
  weights = { vegasBlend: 0.55, sigma: 11, recency: { em: 0.60 } };
}

console.log('\n🧠 Running predictions with data from', data.timestamp);
console.log(`   Using weights v${weights.version || 1}, Vegas blend: ${(weights.vegasBlend * 100).toFixed(1)}%\n`);

// ═══ ALL TOURNAMENT MATCHUPS ═══
const TOURNAMENT_GAMES = [
  // First Four
  { a: "UMBC", b: "Howard", round: "First Four", region: "Midwest" },
  { a: "Texas", b: "NC State", round: "First Four", region: "West" },
  { a: "Lehigh", b: "Prairie View", round: "First Four", region: "South" },
  { a: "SMU", b: "Miami OH", round: "First Four", region: "Midwest" },

  // EAST R64
  { a: "Duke", b: "Siena", round: "R64", region: "East" },
  { a: "Ohio State", b: "TCU", round: "R64", region: "East" },
  { a: "St. John's", b: "N. Iowa", round: "R64", region: "East" },
  { a: "Kansas", b: "Cal Baptist", round: "R64", region: "East" },
  { a: "Louisville", b: "S. Florida", round: "R64", region: "East" },
  { a: "Michigan St.", b: "N. Dakota St.", round: "R64", region: "East" },
  { a: "UCLA", b: "UCF", round: "R64", region: "East" },
  { a: "UConn", b: "Furman", round: "R64", region: "East" },

  // SOUTH R64
  { a: "Florida", b: "Lehigh", round: "R64", region: "South" },
  { a: "Clemson", b: "Iowa", round: "R64", region: "South" },
  { a: "Vanderbilt", b: "McNeese", round: "R64", region: "South" },
  { a: "Nebraska", b: "Troy", round: "R64", region: "South" },
  { a: "N. Carolina", b: "VCU", round: "R64", region: "South" },
  { a: "Illinois", b: "Penn", round: "R64", region: "South" },
  { a: "St. Mary's", b: "Texas A&M", round: "R64", region: "South" },
  { a: "Houston", b: "Idaho", round: "R64", region: "South" },

  // WEST R64
  { a: "Arizona", b: "LIU", round: "R64", region: "West" },
  { a: "Villanova", b: "Utah State", round: "R64", region: "West" },
  { a: "Wisconsin", b: "High Point", round: "R64", region: "West" },
  { a: "Arkansas", b: "Hawaii", round: "R64", region: "West" },
  { a: "BYU", b: "Texas", round: "R64", region: "West" },
  { a: "Gonzaga", b: "Kennesaw St.", round: "R64", region: "West" },
  { a: "Miami FL", b: "Missouri", round: "R64", region: "West" },
  { a: "Purdue", b: "Queens", round: "R64", region: "West" },

  // MIDWEST R64
  { a: "Michigan", b: "UMBC", round: "R64", region: "Midwest" },
  { a: "Georgia", b: "Saint Louis", round: "R64", region: "Midwest" },
  { a: "Texas Tech", b: "Akron", round: "R64", region: "Midwest" },
  { a: "Alabama", b: "Hofstra", round: "R64", region: "Midwest" },
  { a: "Tennessee", b: "SMU", round: "R64", region: "Midwest" },
  { a: "Virginia", b: "Wright St.", round: "R64", region: "Midwest" },
  { a: "Kentucky", b: "Santa Clara", round: "R64", region: "Midwest" },
  { a: "Iowa State", b: "Tennessee St.", round: "R64", region: "Midwest" },
];

// ═══ Vegas lines mapping ═══
const vegasLines = {};
for (const [key, val] of Object.entries(data.odds)) {
  if (val.spread !== null) {
    const parts = key.split(' vs ');
    if (parts.length === 2) {
      const a = resolve(parts[0].trim(), teamDB) || parts[0].trim();
      const b = resolve(parts[1].trim(), teamDB) || parts[1].trim();
      vegasLines[`${a} vs ${b}`] = val.spread;
      vegasLines[`${b} vs ${a}`] = -val.spread;
    }
    vegasLines[key] = val.spread;
  }
}
console.log(`📊 Loaded ${Object.keys(data.odds).length} raw Vegas lines → ${Object.keys(vegasLines).length} mapped entries`);

// ═══ Update Elo ═══
let eloUpdates = 0;
for (const game of data.yesterdayResults) {
  const aName = resolve(game.teamA, teamDB);
  const bName = resolve(game.teamB, teamDB);
  const a = aName ? teamDB[aName] : null;
  const b = bName ? teamDB[bName] : null;
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

// ═══ Injury flags ═══
const injuredTeams = {};
for (const article of data.injuries) {
  const text = (article.headline + ' ' + (article.description || '')).toLowerCase();
  for (const team of Object.keys(teamDB)) {
    if (text.includes(team.toLowerCase())) {
      if (!injuredTeams[team]) injuredTeams[team] = [];
      injuredTeams[team].push(article.headline);
    }
  }
}
if (Object.keys(injuredTeams).length > 0) {
  console.log(`🏥 Injury news for: ${Object.keys(injuredTeams).join(', ')}`);
}

// ═══ Math helpers ═══
function rw(season, recent, weight) { return season * (1 - weight) + recent * weight; }
function Phi(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x) / 1.414;
  const t = 1 / (1 + 0.3275911 * a);
  return 0.5 * (1 + s * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a))));
}

// ═══ RUN PREDICTIONS ═══
const predictions = [];
const rwEm = weights.recency?.em || 0.60;

for (const game of TOURNAMENT_GAMES) {
  const a = teamDB[game.a];
  const b = teamDB[game.b];
  if (!a || !b) {
    console.log(`   ⚠️ Skipping ${game.a} vs ${game.b} — team not in database`);
    continue;
  }

  const aEM = rw(a.em, a.em_r, rwEm);
  const bEM = rw(b.em, b.em_r, rwEm);
  const avgTempo = (a.t + b.t) / 200;

  // Layer 1: Efficiency
  const L1 = 1.1 * (aEM - bEM) * avgTempo;
  // Layer 3: Elo + injuries
  const eloDiff = ((a.elo || 1500) - (b.elo || 1500)) / 25 * 0.3;
  const injDiff = (a.ij || 0) - (b.ij || 0);
  // Coaching
  const coachDiff = ((a.cAdj || 0) - (b.cAdj || 0)) * 0.6;

  const modelSpread = L1 + eloDiff + injDiff + coachDiff;

  // Vegas
  const vKey = `${game.a} vs ${game.b}`;
  const vegasLine = vegasLines[vKey] ?? null;

  const blend = weights.vegasBlend || 0.55;
  const blended = vegasLine !== null ? modelSpread * (1 - blend) + vegasLine * blend : modelSpread;

  const sigma = weights.sigma || 11;
  const rawP = Phi(blended / sigma);
  const winner = blended >= 0 ? game.a : game.b;
  const loser = blended >= 0 ? game.b : game.a;
  const wp = Math.round(Math.max(rawP, 1 - rawP) * 1000) / 10;

  const avgPts = ((a.t + b.t) / 2) * ((rw(a.o, a.o_r, rwEm) + rw(b.d, b.d_r, rwEm)) / 200 + (rw(b.o, b.o_r, rwEm) + rw(a.d, a.d_r, rwEm)) / 200) / 2;
  const scoreW = Math.round(avgPts + Math.abs(blended) / 2);
  const scoreL = Math.round(avgPts - Math.abs(blended) / 2);

  const edge = vegasLine !== null ? Math.round((modelSpread - vegasLine) * 10) / 10 : null;

  predictions.push({
    teamA: game.a, teamB: game.b,
    round: game.round, region: game.region,
    modelSpread: Math.round(modelSpread * 10) / 10,
    vegasLine: vegasLine !== null ? Math.round(vegasLine * 10) / 10 : null,
    blendedSpread: Math.round(blended * 10) / 10,
    edge, winner, loser, winProb: wp, scoreW, scoreL,
    injuryFlagA: injuredTeams[game.a] ? injuredTeams[game.a].length + ' articles' : null,
    injuryFlagB: injuredTeams[game.b] ? injuredTeams[game.b].length + ' articles' : null,
  });
}

// Save
fs.writeFileSync('data/predictions.json', JSON.stringify(predictions, null, 2));
fs.writeFileSync('data/teams.json', JSON.stringify(teamDB, null, 2));

console.log(`\n✅ Generated ${predictions.length} predictions for all tournament games`);

// Summary
const rounds = {};
for (const p of predictions) { if (!rounds[p.round]) rounds[p.round] = []; rounds[p.round].push(p); }
for (const [round, games] of Object.entries(rounds)) {
  console.log(`\n📋 ${round} (${games.length} games):`);
  games.forEach(p => {
    const edgeStr = p.edge !== null ? ` | edge: ${Math.abs(p.edge)}` : '';
    const injStr = (p.injuryFlagA || p.injuryFlagB) ? ' 🏥' : '';
    console.log(`   ${p.winner} ${p.scoreW}-${p.scoreL} over ${p.loser} (${p.winProb}%)${edgeStr}${injStr}`);
  });
}

const edges = predictions.filter(p => p.edge !== null).sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
console.log('\n🔥 TOP 5 BETTING EDGES:');
edges.slice(0, 5).forEach(p => {
  console.log(`   ${p.teamA} vs ${p.teamB}: model ${p.modelSpread > 0 ? '+' : ''}${p.modelSpread} / vegas ${p.vegasLine > 0 ? '+' : ''}${p.vegasLine} → edge ${Math.abs(p.edge)}`);
});