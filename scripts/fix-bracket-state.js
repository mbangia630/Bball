// Run this in PyCharm Terminal: node scripts/fix-bracket-state.js
const fs = require('fs');

const BRACKET_FILE = 'data/bracket-state.json';
const state = JSON.parse(fs.readFileSync(BRACKET_FILE, 'utf8'));

// Missing R64 results (played Thu/Fri but ESPN feed rotated them out)
const missing = {
  "S5":  { winner: "VCU", loser: "N. Carolina", scoreW: 82, scoreL: 78, date: "2026-03-19" },
  "S6":  { winner: "Illinois", loser: "Penn", scoreW: 105, scoreL: 70, date: "2026-03-19" },
  "S7":  { winner: "Texas A&M", loser: "St. Mary's", scoreW: 63, scoreL: 50, date: "2026-03-19" },
  "S8":  { winner: "Houston", loser: "Idaho", scoreW: 78, scoreL: 47, date: "2026-03-19" },
  "W1":  { winner: "Arizona", loser: "LIU", scoreW: 92, scoreL: 58, date: "2026-03-20" },
  "W5":  { winner: "Texas", loser: "BYU", scoreW: 79, scoreL: 71, date: "2026-03-20" },
  "W6":  { winner: "Gonzaga", loser: "Kennesaw St.", scoreW: 73, scoreL: 64, date: "2026-03-19" },
  "MW1": { winner: "Michigan", loser: "Howard", scoreW: 101, scoreL: 80, date: "2026-03-19" },
  "MW2": { winner: "Saint Louis", loser: "Georgia", scoreW: 102, scoreL: 77, date: "2026-03-19" },
};

// Bracket structure: which slot feeds where
const feeds = {
  "S5":  { into: "S_R32_3", as: "a" },
  "S6":  { into: "S_R32_3", as: "b" },
  "S7":  { into: "S_R32_4", as: "a" },
  "S8":  { into: "S_R32_4", as: "b" },
  "W1":  { into: "W_R32_1", as: "a" },
  "W5":  { into: "W_R32_3", as: "a" },
  "W6":  { into: "W_R32_3", as: "b" },
  "MW1": { into: "MW_R32_1", as: "a" },
  "MW2": { into: "MW_R32_1", as: "b" },
};

let added = 0;
for (const [slotId, result] of Object.entries(missing)) {
  if (state.results[slotId]) {
    console.log(`   ⏭️ ${slotId} already exists: ${state.results[slotId].winner}`);
    continue;
  }
  state.results[slotId] = result;
  console.log(`   ✅ ${slotId}: ${result.winner} ${result.scoreW}-${result.scoreL} ${result.loser}`);
  added++;

  // Advance winner
  const feed = feeds[slotId];
  if (feed) {
    if (!state.advancedTo[feed.into]) state.advancedTo[feed.into] = {};
    state.advancedTo[feed.into][feed.as] = result.winner;
    console.log(`      → ${result.winner} advances to ${feed.into} (${feed.as})`);
  }
}

fs.writeFileSync(BRACKET_FILE, JSON.stringify(state, null, 2));
console.log(`\n✅ Added ${added} missing results. Total: ${Object.keys(state.results).length} completed games.`);
