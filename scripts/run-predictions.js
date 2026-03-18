const fs = require('fs');
const { resolve } = require('./team-names');

// ═══════════════════════════════════════════════════════
// PREDICTION RUNNER v3 — FULL AUTO-ADVANCING BRACKET
//
// 1. Checks ESPN for completed tournament games
// 2. Records actual results
// 3. Advances winners into next-round matchups
// 4. Predicts ALL upcoming games (not just today)
// 5. Repeats every day through the championship
// ═══════════════════════════════════════════════════════

const data = JSON.parse(fs.readFileSync('data/latest.json', 'utf8'));
let teamDB = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));

let weights;
try { weights = JSON.parse(fs.readFileSync('data/weights.json', 'utf8')); }
catch { weights = { vegasBlend: 0.55, sigma: 11, recency: { em: 0.60 }, version: 1 }; }

// Load or init bracket state
const BRACKET_FILE = 'data/bracket-state.json';
let bracketState;
try { bracketState = JSON.parse(fs.readFileSync(BRACKET_FILE, 'utf8')); }
catch { bracketState = { results: {}, advancedTo: {} }; }

console.log('\n🧠 Prediction Runner v3 — Auto-Advancing Bracket');
console.log(`   Data from: ${data.timestamp}`);
console.log(`   Weights v${weights.version || 1}, Vegas blend: ${(weights.vegasBlend * 100).toFixed(1)}%\n`);

// ═══════════════════════════════════════════════════════
// BRACKET STRUCTURE
// Each game has a slot ID. The "feedsInto" field says
// which next-round slot the winner advances to, and
// whether they're team A or B in that next game.
// ═══════════════════════════════════════════════════════

const BRACKET = [
  // ── FIRST FOUR ──
  { id: "FF1", a: "UMBC", b: "Howard", round: "First Four", region: "Midwest", feedsInto: "MW1", feedsAs: "a" },
  { id: "FF2", a: "Texas", b: "NC State", round: "First Four", region: "West", feedsInto: "W5", feedsAs: "b" },
  { id: "FF3", a: "Lehigh", b: "Prairie View", round: "First Four", region: "South", feedsInto: "S1", feedsAs: "b" },
  { id: "FF4", a: "SMU", b: "Miami OH", round: "First Four", region: "Midwest", feedsInto: "MW5", feedsAs: "b" },

  // ── EAST R64 ──
  { id: "E1", a: "Duke", b: "Siena", round: "R64", region: "East", feedsInto: "E_R32_1", feedsAs: "a" },
  { id: "E2", a: "Ohio State", b: "TCU", round: "R64", region: "East", feedsInto: "E_R32_1", feedsAs: "b" },
  { id: "E3", a: "St. John's", b: "N. Iowa", round: "R64", region: "East", feedsInto: "E_R32_2", feedsAs: "a" },
  { id: "E4", a: "Kansas", b: "Cal Baptist", round: "R64", region: "East", feedsInto: "E_R32_2", feedsAs: "b" },
  { id: "E5", a: "Louisville", b: "S. Florida", round: "R64", region: "East", feedsInto: "E_R32_3", feedsAs: "a" },
  { id: "E6", a: "Michigan St.", b: "N. Dakota St.", round: "R64", region: "East", feedsInto: "E_R32_3", feedsAs: "b" },
  { id: "E7", a: "UCLA", b: "UCF", round: "R64", region: "East", feedsInto: "E_R32_4", feedsAs: "a" },
  { id: "E8", a: "UConn", b: "Furman", round: "R64", region: "East", feedsInto: "E_R32_4", feedsAs: "b" },

  // ── SOUTH R64 ──
  { id: "S1", a: "Florida", b: null, round: "R64", region: "South", feedsInto: "S_R32_1", feedsAs: "a" },  // b = FF3 winner
  { id: "S2", a: "Clemson", b: "Iowa", round: "R64", region: "South", feedsInto: "S_R32_1", feedsAs: "b" },
  { id: "S3", a: "Vanderbilt", b: "McNeese", round: "R64", region: "South", feedsInto: "S_R32_2", feedsAs: "a" },
  { id: "S4", a: "Nebraska", b: "Troy", round: "R64", region: "South", feedsInto: "S_R32_2", feedsAs: "b" },
  { id: "S5", a: "N. Carolina", b: "VCU", round: "R64", region: "South", feedsInto: "S_R32_3", feedsAs: "a" },
  { id: "S6", a: "Illinois", b: "Penn", round: "R64", region: "South", feedsInto: "S_R32_3", feedsAs: "b" },
  { id: "S7", a: "St. Mary's", b: "Texas A&M", round: "R64", region: "South", feedsInto: "S_R32_4", feedsAs: "a" },
  { id: "S8", a: "Houston", b: "Idaho", round: "R64", region: "South", feedsInto: "S_R32_4", feedsAs: "b" },

  // ── WEST R64 ──
  { id: "W1", a: "Arizona", b: "LIU", round: "R64", region: "West", feedsInto: "W_R32_1", feedsAs: "a" },
  { id: "W2", a: "Villanova", b: "Utah State", round: "R64", region: "West", feedsInto: "W_R32_1", feedsAs: "b" },
  { id: "W3", a: "Wisconsin", b: "High Point", round: "R64", region: "West", feedsInto: "W_R32_2", feedsAs: "a" },
  { id: "W4", a: "Arkansas", b: "Hawaii", round: "R64", region: "West", feedsInto: "W_R32_2", feedsAs: "b" },
  { id: "W5", a: "BYU", b: null, round: "R64", region: "West", feedsInto: "W_R32_3", feedsAs: "a" },  // b = FF2 winner
  { id: "W6", a: "Gonzaga", b: "Kennesaw St.", round: "R64", region: "West", feedsInto: "W_R32_3", feedsAs: "b" },
  { id: "W7", a: "Miami FL", b: "Missouri", round: "R64", region: "West", feedsInto: "W_R32_4", feedsAs: "a" },
  { id: "W8", a: "Purdue", b: "Queens", round: "R64", region: "West", feedsInto: "W_R32_4", feedsAs: "b" },

  // ── MIDWEST R64 ──
  { id: "MW1", a: "Michigan", b: null, round: "R64", region: "Midwest", feedsInto: "MW_R32_1", feedsAs: "a" },  // b = FF1 winner
  { id: "MW2", a: "Georgia", b: "Saint Louis", round: "R64", region: "Midwest", feedsInto: "MW_R32_1", feedsAs: "b" },
  { id: "MW3", a: "Texas Tech", b: "Akron", round: "R64", region: "Midwest", feedsInto: "MW_R32_2", feedsAs: "a" },
  { id: "MW4", a: "Alabama", b: "Hofstra", round: "R64", region: "Midwest", feedsInto: "MW_R32_2", feedsAs: "b" },
  { id: "MW5", a: "Tennessee", b: null, round: "R64", region: "Midwest", feedsInto: "MW_R32_3", feedsAs: "a" },  // b = FF4 winner
  { id: "MW6", a: "Virginia", b: "Wright St.", round: "R64", region: "Midwest", feedsInto: "MW_R32_3", feedsAs: "b" },
  { id: "MW7", a: "Kentucky", b: "Santa Clara", round: "R64", region: "Midwest", feedsInto: "MW_R32_4", feedsAs: "a" },
  { id: "MW8", a: "Iowa State", b: "Tennessee St.", round: "R64", region: "Midwest", feedsInto: "MW_R32_4", feedsAs: "b" },

  // ── R32 (teams TBD — filled by winners) ──
  { id: "E_R32_1", a: null, b: null, round: "R32", region: "East", feedsInto: "E_S16_1", feedsAs: "a" },
  { id: "E_R32_2", a: null, b: null, round: "R32", region: "East", feedsInto: "E_S16_1", feedsAs: "b" },
  { id: "E_R32_3", a: null, b: null, round: "R32", region: "East", feedsInto: "E_S16_2", feedsAs: "a" },
  { id: "E_R32_4", a: null, b: null, round: "R32", region: "East", feedsInto: "E_S16_2", feedsAs: "b" },

  { id: "S_R32_1", a: null, b: null, round: "R32", region: "South", feedsInto: "S_S16_1", feedsAs: "a" },
  { id: "S_R32_2", a: null, b: null, round: "R32", region: "South", feedsInto: "S_S16_1", feedsAs: "b" },
  { id: "S_R32_3", a: null, b: null, round: "R32", region: "South", feedsInto: "S_S16_2", feedsAs: "a" },
  { id: "S_R32_4", a: null, b: null, round: "R32", region: "South", feedsInto: "S_S16_2", feedsAs: "b" },

  { id: "W_R32_1", a: null, b: null, round: "R32", region: "West", feedsInto: "W_S16_1", feedsAs: "a" },
  { id: "W_R32_2", a: null, b: null, round: "R32", region: "West", feedsInto: "W_S16_1", feedsAs: "b" },
  { id: "W_R32_3", a: null, b: null, round: "R32", region: "West", feedsInto: "W_S16_2", feedsAs: "a" },
  { id: "W_R32_4", a: null, b: null, round: "R32", region: "West", feedsInto: "W_S16_2", feedsAs: "b" },

  { id: "MW_R32_1", a: null, b: null, round: "R32", region: "Midwest", feedsInto: "MW_S16_1", feedsAs: "a" },
  { id: "MW_R32_2", a: null, b: null, round: "R32", region: "Midwest", feedsInto: "MW_S16_1", feedsAs: "b" },
  { id: "MW_R32_3", a: null, b: null, round: "R32", region: "Midwest", feedsInto: "MW_S16_2", feedsAs: "a" },
  { id: "MW_R32_4", a: null, b: null, round: "R32", region: "Midwest", feedsInto: "MW_S16_2", feedsAs: "b" },

  // ── Sweet 16 ──
  { id: "E_S16_1", a: null, b: null, round: "S16", region: "East", feedsInto: "E_E8", feedsAs: "a" },
  { id: "E_S16_2", a: null, b: null, round: "S16", region: "East", feedsInto: "E_E8", feedsAs: "b" },
  { id: "S_S16_1", a: null, b: null, round: "S16", region: "South", feedsInto: "S_E8", feedsAs: "a" },
  { id: "S_S16_2", a: null, b: null, round: "S16", region: "South", feedsInto: "S_E8", feedsAs: "b" },
  { id: "W_S16_1", a: null, b: null, round: "S16", region: "West", feedsInto: "W_E8", feedsAs: "a" },
  { id: "W_S16_2", a: null, b: null, round: "S16", region: "West", feedsInto: "W_E8", feedsAs: "b" },
  { id: "MW_S16_1", a: null, b: null, round: "S16", region: "Midwest", feedsInto: "MW_E8", feedsAs: "a" },
  { id: "MW_S16_2", a: null, b: null, round: "S16", region: "Midwest", feedsInto: "MW_E8", feedsAs: "b" },

  // ── Elite 8 ──
  { id: "E_E8", a: null, b: null, round: "E8", region: "East", feedsInto: "F4_1", feedsAs: "a" },
  { id: "S_E8", a: null, b: null, round: "E8", region: "South", feedsInto: "F4_1", feedsAs: "b" },
  { id: "W_E8", a: null, b: null, round: "E8", region: "West", feedsInto: "F4_2", feedsAs: "a" },
  { id: "MW_E8", a: null, b: null, round: "E8", region: "Midwest", feedsInto: "F4_2", feedsAs: "b" },

  // ── Final Four ──
  { id: "F4_1", a: null, b: null, round: "F4", region: "Final Four", feedsInto: "CHAMP", feedsAs: "a" },
  { id: "F4_2", a: null, b: null, round: "F4", region: "Final Four", feedsInto: "CHAMP", feedsAs: "b" },

  // ── Championship ──
  { id: "CHAMP", a: null, b: null, round: "Championship", region: "Final", feedsInto: null, feedsAs: null },
];

// Index by ID for fast lookup
const slotMap = {};
BRACKET.forEach(g => slotMap[g.id] = g);

// ═══════════════════════════════════════════════════════
// STEP 1: Check for completed games and advance winners
// ═══════════════════════════════════════════════════════

// Pull all completed tournament games from ESPN results + yesterday's results
const allResults = [...(data.yesterdayResults || []), ...(data.games || []).filter(g => g.status === 'Final')];

console.log(`📋 Found ${allResults.length} completed/final games to check\n`);

let newAdvances = 0;
for (const result of allResults) {
  const aName = resolve(result.teamA, teamDB) || result.teamA;
  const bName = resolve(result.teamB, teamDB) || result.teamB;
  const scoreA = parseInt(result.scoreA);
  const scoreB = parseInt(result.scoreB);
  if (isNaN(scoreA) || isNaN(scoreB)) continue;

  const actualWinner = scoreA > scoreB ? aName : bName;
  const actualLoser = scoreA > scoreB ? bName : aName;

  // Find this game in the bracket
  for (const slot of BRACKET) {
    if (bracketState.results[slot.id]) continue; // already recorded
    if (!slot.a || !slot.b) continue; // teams not yet known

    const matchA = slot.a === aName || slot.a === bName;
    const matchB = slot.b === aName || slot.b === bName;

    if (matchA && matchB) {
      // Record result
      bracketState.results[slot.id] = {
        winner: actualWinner,
        loser: actualLoser,
        scoreW: Math.max(scoreA, scoreB),
        scoreL: Math.min(scoreA, scoreB),
        date: new Date().toISOString().slice(0, 10),
      };

      // Advance winner to next round
      if (slot.feedsInto && slotMap[slot.feedsInto]) {
        const nextSlot = slotMap[slot.feedsInto];
        if (slot.feedsAs === 'a') nextSlot.a = actualWinner;
        else nextSlot.b = actualWinner;

        bracketState.advancedTo[slot.feedsInto] = bracketState.advancedTo[slot.feedsInto] || {};
        bracketState.advancedTo[slot.feedsInto][slot.feedsAs] = actualWinner;
      }

      console.log(`   ✅ ${slot.id}: ${actualWinner} beat ${actualLoser} ${Math.max(scoreA, scoreB)}-${Math.min(scoreA, scoreB)} → advances to ${slot.feedsInto || 'CHAMPION'}`);
      newAdvances++;
      break;
    }
  }
}

// Apply any previously saved advances to the bracket
for (const [slotId, teams] of Object.entries(bracketState.advancedTo)) {
  if (slotMap[slotId]) {
    if (teams.a) slotMap[slotId].a = teams.a;
    if (teams.b) slotMap[slotId].b = teams.b;
  }
}

console.log(`\n🔄 ${newAdvances} new advances this run. ${Object.keys(bracketState.results).length} total games completed.\n`);

// ═══════════════════════════════════════════════════════
// STEP 2: Update Elo from results
// ═══════════════════════════════════════════════════════
let eloUpdates = 0;
for (const result of data.yesterdayResults || []) {
  const aName = resolve(result.teamA, teamDB);
  const bName = resolve(result.teamB, teamDB);
  const a = aName ? teamDB[aName] : null;
  const b = bName ? teamDB[bName] : null;
  if (!a || !b) continue;
  const K = 20;
  const expected = 1 / (1 + Math.pow(10, ((b.elo || 1500) - (a.elo || 1500)) / 400));
  const actual = result.scoreA > result.scoreB ? 1 : 0;
  const mov = Math.min(Math.abs(result.scoreA - result.scoreB), 25);
  const movMult = Math.log(mov + 1) * 0.8;
  a.elo = Math.round((a.elo || 1500) + K * movMult * (actual - expected));
  b.elo = Math.round((b.elo || 1500) + K * movMult * (expected - actual));
  eloUpdates++;
}
console.log(`⚡ Updated Elo for ${eloUpdates} games`);

// ═══════════════════════════════════════════════════════
// STEP 3: Build Vegas lines map
// ═══════════════════════════════════════════════════════
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
console.log(`📊 Loaded ${Object.keys(data.odds).length} Vegas lines`);

// ═══════════════════════════════════════════════════════
// STEP 4: Injury flags
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// STEP 5: Predict all UPCOMING games (not yet played)
// ═══════════════════════════════════════════════════════
function rw(season, recent, weight) { return season * (1 - weight) + recent * weight; }
function Phi(x) {
  const s = x < 0 ? -1 : 1, a = Math.abs(x) / 1.414;
  const t = 1 / (1 + 0.3275911 * a);
  return 0.5 * (1 + s * (1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a))));
}

const rwEm = weights.recency?.em || 0.60;
const predictions = [];
const completed = [];

for (const slot of BRACKET) {
  // Already played
  if (bracketState.results[slot.id]) {
    const r = bracketState.results[slot.id];
    completed.push({ id: slot.id, round: slot.round, region: slot.region, ...r, status: 'FINAL' });
    continue;
  }

  // Both teams known?
  if (!slot.a || !slot.b) continue;

  const a = teamDB[slot.a];
  const b = teamDB[slot.b];
  if (!a || !b) {
    console.log(`   ⚠️ ${slot.id}: Can't predict ${slot.a} vs ${slot.b} — missing team data`);
    continue;
  }

  const aEM = rw(a.em, a.em_r, rwEm);
  const bEM = rw(b.em, b.em_r, rwEm);
  const avgTempo = (a.t + b.t) / 200;

  const L1 = 1.1 * (aEM - bEM) * avgTempo;
  const eloDiff = ((a.elo || 1500) - (b.elo || 1500)) / 25 * 0.3;
  const injDiff = (a.ij || 0) - (b.ij || 0);
  const coachDiff = ((a.cAdj || 0) - (b.cAdj || 0)) * 0.6;

  const modelSpread = L1 + eloDiff + injDiff + coachDiff;

  const vKey = `${slot.a} vs ${slot.b}`;
  const vegasLine = vegasLines[vKey] ?? null;

  const blend = weights.vegasBlend || 0.55;
  const blended = vegasLine !== null ? modelSpread * (1 - blend) + vegasLine * blend : modelSpread;

  const sigma = weights.sigma || 11;
  const rawP = Phi(blended / sigma);
  const winner = blended >= 0 ? slot.a : slot.b;
  const loser = blended >= 0 ? slot.b : slot.a;
  const wp = Math.round(Math.max(rawP, 1 - rawP) * 1000) / 10;

  const avgPts = ((a.t + b.t) / 2) * ((rw(a.o, a.o_r, rwEm) + rw(b.d, b.d_r, rwEm)) / 200 + (rw(b.o, b.o_r, rwEm) + rw(a.d, a.d_r, rwEm)) / 200) / 2;
  const scoreW = Math.round(avgPts + Math.abs(blended) / 2);
  const scoreL = Math.round(avgPts - Math.abs(blended) / 2);
  const edge = vegasLine !== null ? Math.round((modelSpread - vegasLine) * 10) / 10 : null;

  predictions.push({
    id: slot.id, teamA: slot.a, teamB: slot.b,
    round: slot.round, region: slot.region,
    modelSpread: Math.round(modelSpread * 10) / 10,
    vegasLine: vegasLine !== null ? Math.round(vegasLine * 10) / 10 : null,
    blendedSpread: Math.round(blended * 10) / 10,
    edge, winner, loser, winProb: wp, scoreW, scoreL,
    injuryFlagA: injuredTeams[slot.a] ? injuredTeams[slot.a].length + ' articles' : null,
    injuryFlagB: injuredTeams[slot.b] ? injuredTeams[slot.b].length + ' articles' : null,
    status: 'UPCOMING',
  });
}

// ═══════════════════════════════════════════════════════
// STEP 6: Save everything
// ═══════════════════════════════════════════════════════
const fullOutput = {
  timestamp: new Date().toISOString(),
  weightsVersion: weights.version || 1,
  completed,
  predictions,
  bracketProgress: {
    gamesPlayed: Object.keys(bracketState.results).length,
    gamesRemaining: BRACKET.length - Object.keys(bracketState.results).length,
    currentRound: predictions.length > 0 ? predictions[0].round : 'Tournament Complete',
  },
};

fs.writeFileSync('data/predictions.json', JSON.stringify(fullOutput, null, 2));
fs.writeFileSync('data/teams.json', JSON.stringify(teamDB, null, 2));
fs.writeFileSync(BRACKET_FILE, JSON.stringify(bracketState, null, 2));

// ═══════════════════════════════════════════════════════
// STEP 7: Print summary
// ═══════════════════════════════════════════════════════
console.log(`\n════════════════════════════════`);
console.log(`📊 BRACKET STATUS`);
console.log(`   Completed: ${completed.length} games`);
console.log(`   Upcoming:  ${predictions.length} predictions`);
console.log(`   Waiting:   ${BRACKET.length - completed.length - predictions.length} games (teams TBD)`);
console.log(`════════════════════════════════`);

if (completed.length > 0) {
  console.log(`\n✅ COMPLETED GAMES:`);
  completed.forEach(g => console.log(`   ${g.id}: ${g.winner} ${g.scoreW}-${g.scoreL} ${g.loser}`));
}

const roundOrder = ['First Four', 'R64', 'R32', 'S16', 'E8', 'F4', 'Championship'];
const byRound = {};
predictions.forEach(p => { if (!byRound[p.round]) byRound[p.round] = []; byRound[p.round].push(p); });

for (const round of roundOrder) {
  const games = byRound[round];
  if (!games) continue;
  console.log(`\n📋 ${round} (${games.length} games):`);
  games.forEach(p => {
    const edgeStr = p.edge !== null ? ` | edge: ${Math.abs(p.edge)}` : '';
    const injStr = (p.injuryFlagA || p.injuryFlagB) ? ' 🏥' : '';
    console.log(`   ${p.winner} ${p.scoreW}-${p.scoreL} over ${p.loser} (${p.winProb}%)${edgeStr}${injStr}`);
  });
}

const edges = predictions.filter(p => p.edge !== null).sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
if (edges.length > 0) {
  console.log('\n🔥 TOP 5 BETTING EDGES:');
  edges.slice(0, 5).forEach(p => {
    console.log(`   ${p.teamA} vs ${p.teamB}: model ${p.modelSpread > 0 ? '+' : ''}${p.modelSpread} / vegas ${p.vegasLine > 0 ? '+' : ''}${p.vegasLine} → edge ${Math.abs(p.edge)}`);
  });
}

console.log('\n✅ Done.\n');