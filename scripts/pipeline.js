const fs = require('fs');
const fetch = require('node-fetch');
const { simulate, toV8Format } = require('./engine');
const { resolve, NAME_MAP } = require('./team-names');
const { VENUES, VENUE_TIMEZONES, LOCATIONS, VENUE_MAP, BRACKET, ROUND_NAMES, ESPN_IDS } = require('./config');

// ═══════════════════════════════════════════════════════
// v9 PIPELINE — single script, runs daily
//
// 1. Fetch live data (ESPN scores, Odds API, injuries, team stats)
// 2. Update teams.json with live stats
// 3. Detect completed games → update bracket-state
// 4. Run Monte Carlo engine for all upcoming games
// 5. Project full bracket
// 6. Write display.json for website
// ═══════════════════════════════════════════════════════

const ODDS_KEY = process.env.ODDS_API_KEY || '';
const STATE_FILE = 'data/state.json';

function loadJSON(path, fallback) {
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch { return typeof fallback === 'function' ? fallback() : JSON.parse(JSON.stringify(fallback)); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

// ═══ STEP 1: FETCH LIVE DATA ═══
async function fetchGames() {
  console.log("📅 Fetching today's games + yesterday's results...");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');

  const [todayData, yestData] = await Promise.all([
    fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${today}&limit=100`),
    fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${yesterday}&limit=200`),
  ]);

  const parseGames = data => data.events.map(e => ({
    id: e.id,
    teamA: e.competitions[0].competitors[0].team.displayName,
    teamB: e.competitions[0].competitors[1].team.displayName,
    scoreA: parseInt(e.competitions[0].competitors[0].score) || 0,
    scoreB: parseInt(e.competitions[0].competitors[1].score) || 0,
    status: e.status.type.description,
    completed: e.status.type.completed,
    venue: e.competitions[0].venue?.fullName || 'TBD',
    time: e.date,
  }));

  const games = parseGames(todayData);
  const yesterdayResults = parseGames(yestData).filter(g => g.completed);
  console.log(`   Today: ${games.length} games, Yesterday: ${yesterdayResults.length} results`);
  return { games, yesterdayResults };
}

async function fetchOdds() {
  console.log('💰 Fetching odds...');
  if (!ODDS_KEY) { console.log('   ⚠️ No ODDS_API_KEY'); return {}; }
  try {
    const data = await fetchJSON(
      `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/?apiKey=${ODDS_KEY}&regions=us&markets=spreads,h2h&oddsFormat=american`
    );
    const odds = {};
    for (const game of data) {
      const bk = game.bookmakers.find(b => b.key === 'draftkings') || game.bookmakers.find(b => b.key === 'fanduel') || game.bookmakers[0];
      if (!bk) continue;
      const spread = bk.markets.find(m => m.key === 'spreads');
      const ml = bk.markets.find(m => m.key === 'h2h');
      const homeSp = spread?.outcomes?.find(o => o.name === game.home_team);
      const homeML = ml?.outcomes?.find(o => o.name === game.home_team);
      const awayML = ml?.outcomes?.find(o => o.name === game.away_team);
      odds[`${game.home_team} vs ${game.away_team}`] = {
        spread: homeSp?.point ?? null,
        mlHome: homeML?.price ?? null, mlAway: awayML?.price ?? null,
        homeTeam: game.home_team, awayTeam: game.away_team,
      };
    }
    console.log(`   ${Object.keys(odds).length} games with odds`);
    return odds;
  } catch (e) { console.log(`   ⚠️ Odds failed: ${e.message}`); return {}; }
}

async function fetchInjuries() {
  console.log('🏥 Fetching injuries...');
  try {
    const data = await fetchJSON('https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news?limit=50');
    const articles = data.articles.filter(a =>
      /injur|out |questionable|doubtful|ACL|fracture|surgery|concussion/i.test(a.headline + ' ' + (a.description || ''))
    ).map(a => ({ headline: a.headline, description: a.description }));
    console.log(`   ${articles.length} injury articles`);
    return articles;
  } catch (e) { console.log(`   ⚠️ Injuries failed: ${e.message}`); return []; }
}

async function fetchTeamStats(teamDB) {
  console.log('📈 Fetching live team stats...');
  let fetched = 0, failed = 0;
  for (const [name, id] of Object.entries(ESPN_IDS)) {
    if (!teamDB[name]) continue;
    try {
      const data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${id}/statistics`);
      // Recursively extract stats from ESPN's nested response
      const allStats = [];
      function extract(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { for (const item of obj) { if (item?.name && item?.displayValue !== undefined) allStats.push({ name: item.name, value: parseFloat(item.displayValue) || 0 }); extract(item); } return; }
        for (const key of Object.keys(obj)) {
          if (key === 'stats' && Array.isArray(obj[key])) { for (const s of obj[key]) { if (s?.name && s?.displayValue !== undefined) allStats.push({ name: s.name, value: parseFloat(s.displayValue) || 0 }); else extract(s); } }
          else extract(obj[key]);
        }
      }
      extract(data);
      const s = {};
      for (const st of allStats) s[st.name] = st.value;

      // Compute advanced stats
      const fga = s.avgFieldGoalsAttempted || s.FGA || 65;
      const tpg = s.avgTurnovers || s.TO || 13;
      const orpg = s.avgOffensiveRebounds || s.OREB || 10;
      const fta = s.avgFreeThrowsAttempted || s.FTA || 18;
      const fgm = s.avgFieldGoalsMade || s.FGM || (fga * 0.44);
      const tpm = s.avgThreePointFieldGoalsMade || s['3PM'] || 7;
      const tempo = fga - orpg + tpg + 0.44 * fta;
      const ppg = s.avgPoints || s.PTS || 70;
      const oppg = s.avgPointsAllowed || s.OPPG || 70;
      const oEff = tempo > 0 ? (ppg / tempo) * 100 : 105;
      const dEff = tempo > 0 ? (oppg / tempo) * 100 : 95;
      const efg = fga > 0 ? ((fgm + 0.5 * tpm) / fga) * 100 : 50;
      const tor = tempo > 0 ? (tpg / tempo) * 100 : 16;
      const ftr = fga > 0 ? (fta / fga) * 100 : 35;

      // Update recent stats in teamDB
      teamDB[name].em_r = Math.round((oEff - dEff) * 10) / 10;
      teamDB[name].efg_r = Math.round(efg * 10) / 10;
      teamDB[name].tor_r = Math.round(tor * 10) / 10;
      teamDB[name].ftr_r = Math.round(ftr * 10) / 10;
      teamDB[name].o_r = Math.round(oEff * 10) / 10;
      teamDB[name].d_r = Math.round(dEff * 10) / 10;
      if (tempo > 50 && tempo < 85) teamDB[name].t = Math.round(tempo * 10) / 10;
      teamDB[name].mg_r = Math.round((ppg - oppg) * 10) / 10;
      teamDB[name].lastStatsUpdate = new Date().toISOString();
      fetched++;
    } catch (e) { failed++; }
    if (fetched % 10 === 0) await sleep(200);
  }
  console.log(`   ${fetched} updated, ${failed} failed`);
}

// ═══ STEP 2: RESOLVE ODDS INTO DB NAMES ═══
function resolveOdds(rawOdds, teamDB) {
  const vegasLines = {}, moneyLines = {};
  for (const [key, val] of Object.entries(rawOdds)) {
    const parts = key.split(' vs ');
    if (parts.length !== 2) continue;
    const a = resolve(parts[0].trim(), teamDB) || parts[0].trim();
    const b = resolve(parts[1].trim(), teamDB) || parts[1].trim();
    if (val.spread !== null) {
      vegasLines[`${a} vs ${b}`] = -val.spread;
      vegasLines[`${b} vs ${a}`] = val.spread;
    }
    if (val.mlHome !== null || val.mlAway !== null) {
      moneyLines[`${a} vs ${b}`] = [val.mlHome || 0, val.mlAway || 0];
      moneyLines[`${b} vs ${a}`] = [val.mlAway || 0, val.mlHome || 0];
    }
  }
  return { vegasLines, moneyLines };
}

// ═══ STEP 3: UPDATE BRACKET STATE ═══
function updateBracketState(bracketState, allResults, teamDB, slotMap) {
  let newAdvances = 0;
  for (const result of allResults) {
    const aName = resolve(result.teamA, teamDB) || result.teamA;
    const bName = resolve(result.teamB, teamDB) || result.teamB;
    if (!result.completed && result.status !== 'Final') continue;
    const scoreA = parseInt(result.scoreA), scoreB = parseInt(result.scoreB);
    if (isNaN(scoreA) || isNaN(scoreB) || scoreA === 0) continue;
    const winner = scoreA > scoreB ? aName : bName;
    const loser = scoreA > scoreB ? bName : aName;

    for (const slot of Object.values(slotMap)) {
      if (bracketState.results[slot.id]) continue;
      if (!slot.a || !slot.b) continue;
      if ((slot.a === aName || slot.a === bName) && (slot.b === aName || slot.b === bName)) {
        bracketState.results[slot.id] = { winner, loser, scoreW: Math.max(scoreA, scoreB), scoreL: Math.min(scoreA, scoreB), date: new Date().toISOString().slice(0, 10) };
        if (slot.feedsInto && slotMap[slot.feedsInto]) {
          if (slot.feedsAs === 'a') slotMap[slot.feedsInto].a = winner;
          else slotMap[slot.feedsInto].b = winner;
          bracketState.advancedTo[slot.feedsInto] = bracketState.advancedTo[slot.feedsInto] || {};
          bracketState.advancedTo[slot.feedsInto][slot.feedsAs] = winner;
        }
        console.log(`   ✅ ${slot.id}: ${winner} beat ${loser}`);
        newAdvances++;
        break;
      }
    }
  }
  return newAdvances;
}

// ═══ STEP 4: UPDATE ELO ═══
function updateElo(teamDB, allResults, learning) {
  let updates = 0;
  for (const g of allResults) {
    if (!g.completed && g.status !== 'Final') continue;
    const aName = resolve(g.teamA, teamDB) || g.teamA;
    const bName = resolve(g.teamB, teamDB) || g.teamB;
    const a = teamDB[aName], b = teamDB[bName];
    if (!a || !b) continue;
    const K = ((learning?.teamK?.[aName]?.k || 20) + (learning?.teamK?.[bName]?.k || 20)) / 2;
    const expected = 1 / (1 + Math.pow(10, ((b.elo || 1500) - (a.elo || 1500)) / 400));
    const actual = g.scoreA > g.scoreB ? 1 : 0;
    const mov = Math.min(Math.abs(g.scoreA - g.scoreB), 25);
    const movMult = Math.log(mov + 1) * 0.8;
    a.elo = Math.round((a.elo || 1500) + K * movMult * (actual - expected));
    b.elo = Math.round((b.elo || 1500) + K * movMult * (expected - actual));
    updates++;
  }
  return updates;
}

// ═══ STEP 5: RUN ENGINE + BUILD DISPLAY ═══
function runPredictions(teamDB, bracketState, slotMap, vegasLines, moneyLines, weights, learning) {
  const config = { locations: LOCATIONS, venues: VENUES, venueTimezones: VENUE_TIMEZONES };
  const predictions = [], completed = [];

  // Apply saved advances to bracket
  for (const [slotId, teams] of Object.entries(bracketState.advancedTo)) {
    if (slotMap[slotId]) {
      if (teams.a) slotMap[slotId].a = teams.a;
      if (teams.b) slotMap[slotId].b = teams.b;
    }
  }

  // Process each bracket slot
  for (const slot of Object.values(slotMap)) {
    if (bracketState.results[slot.id]) {
      completed.push({ id: slot.id, ...bracketState.results[slot.id], status: 'FINAL', rd: slot.rd });
      continue;
    }
    if (!slot.a || !slot.b) continue;

    const tA = teamDB[slot.a], tB = teamDB[slot.b];
    if (!tA || !tB) { console.log(`   ⚠️ Missing team data: ${slot.a} or ${slot.b}`); continue; }

    // Inject internal name + v8 teamK volatility
    tA._name = slot.a; tB._name = slot.b;
    tA._teamK = learning?.teamK?.[slot.a]?.k || 20;
    tB._teamK = learning?.teamK?.[slot.b]?.k || 20;

    const venue = VENUE_MAP[slot.id] || 'Indianapolis';
    const vKey1 = `${slot.a} vs ${slot.b}`, vKey2 = `${slot.b} vs ${slot.a}`;
    const vegasLine = vegasLines[vKey1] ?? (vegasLines[vKey2] != null ? -vegasLines[vKey2] : null);
    const ml = moneyLines[vKey1] || moneyLines[vKey2] || null;

    const result = simulate(tA, tB, { venue, round: slot.rd, weights, config, vegasLine, moneyline: ml });
    const formatted = toV8Format(result);
    formatted.id = slot.id;
    formatted.status = 'UPCOMING';
    predictions.push(formatted);
  }

  return { predictions, completed };
}

function buildDisplay(teamDB, bracketState, slotMap, predictions, completed, weights, vegasLines, moneyLines) {
  const config = { locations: LOCATIONS, venues: VENUES, venueTimezones: VENUE_TIMEZONES };

  // Deep copy bracket for projection
  const projSlots = JSON.parse(JSON.stringify(Object.values(slotMap)));
  const projMap = {};
  projSlots.forEach(s => projMap[s.id] = s);

  // Apply results + advances
  for (const [id, res] of Object.entries(bracketState.results)) {
    if (projMap[id]) projMap[id].actualResult = res;
  }
  for (const [id, teams] of Object.entries(bracketState.advancedTo)) {
    if (projMap[id]) { if (teams.a) projMap[id].a = teams.a; if (teams.b) projMap[id].b = teams.b; }
  }

  const displayRounds = [];
  for (let rd = 0; rd <= 6; rd++) {
    const roundSlots = projSlots.filter(s => s.rd === rd);
    const games = [];

    for (const slot of roundSlots) {
      if (slot.actualResult) {
        const res = slot.actualResult;
        // Build minimal profiles for FINAL games so details view doesn't crash
        const mkProf = (name) => {
          const t = teamDB[name];
          if (!t) return { name, em: 0, efg: 0, tor: 0, orb: 0, ftr: 0, tpt: 0, ast: 0, mg: 0, o: 0, d: 0, t: 0, elo: 0, s: 0, kp: 0, rec: '', coach: '', cAdj: 0, cNote: '', lk: 0, st: 0, ci: 0, ij: 0, hb: 0, sty: {} };
          return {
            name, em: t.em, efg: t.efg, tor: t.tor, orb: t.orb, ftr: t.ftr,
            tpt: t.tpt, ast: t.ast, mg: t.mg, o: t.o, d: t.d, t: t.t,
            elo: t.elo, s: t.s, kp: t.kp, rec: t.rec, coach: t.coach,
            cAdj: t.cAdj || 0, cNote: t.cNote || '', lk: t.lk || 0,
            st: t.st || 0, ci: t.ci || 0, ij: t.ij || 0, hb: t.hb || 3.3, sty: t.style || {},
          };
        };
        games.push({
          id: slot.id, status: 'FINAL', rd: slot.rd,
          w: res.winner, l: res.loser, sW: res.scoreW, sL: res.scoreL,
          winner: res.winner, loser: res.loser, scoreW: res.scoreW, scoreL: res.scoreL,
          seedW: teamDB[res.winner]?.s || 0, seedL: teamDB[res.loser]?.s || 0,
          sW2: teamDB[res.winner]?.s || 0, sL2: teamDB[res.loser]?.s || 0,
          wp: 100, sp: res.scoreW - res.scoreL, ven: VENUE_MAP[slot.id] || 'TBD',
          mu: { det: [] }, cDiff: 0, L1: 0, L2: 0, L3: 0, L4: 0, L5: 0,
          fatA: { pts: 0 }, fatB: { pts: 0 },
          v8: { ref: 0, gs: 0, sharp: 0, cont: 0, tz: 0, foul: 0, total: 0, ens: { avg: 0, agree: true, m1: 0, m2: 0, m3: 0 } },
          adjStats: { aEfg: 0, bEfg: 0, aTor: 0, bTor: 0, aOrb: 0, bOrb: 0, aFtr: 0, bFtr: 0 },
          modelSp: 0, modelSpread: 0, vegasSp: null, vegasLine: null, rawSp: 0, ha: null, hb: 0,
          a: mkProf(slot.a || res.winner), b: mkProf(slot.b || res.loser),
          teamA: slot.a || res.winner, teamB: slot.b || res.loser,
          sim: null,
        });
        if (slot.feedsInto && projMap[slot.feedsInto]) {
          if (slot.feedsAs === 'a') projMap[slot.feedsInto].a = res.winner;
          else projMap[slot.feedsInto].b = res.winner;
        }
        continue;
      }

      if (!slot.a || !slot.b) continue;
      const tA = teamDB[slot.a], tB = teamDB[slot.b];
      if (!tA || !tB) continue;

      tA._name = slot.a; tB._name = slot.b;
      tA._teamK = 20; tB._teamK = 20;

      const venue = VENUE_MAP[slot.id] || 'Indianapolis';
      const vKey1 = `${slot.a} vs ${slot.b}`;
      const vegasLine = vegasLines[vKey1] ?? null;
      const ml = moneyLines[vKey1] || null;

      const result = simulate(tA, tB, { venue, round: slot.rd, weights, config, vegasLine, moneyline: ml });
      games.push({ ...toV8Format(result), id: slot.id, status: 'PROJECTED' });

      if (slot.feedsInto && projMap[slot.feedsInto]) {
        if (slot.feedsAs === 'a') projMap[slot.feedsInto].a = result.winner;
        else projMap[slot.feedsInto].b = result.winner;
      }
    }

    if (games.length > 0) displayRounds.push({ n: ROUND_NAMES[rd] || `Round ${rd}`, g: games });
  }

  return {
    timestamp: new Date().toISOString(),
    timestampCST: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
    engineVersion: 'v9.0-montecarlo',
    rounds: displayRounds,
  };
}

// ═══ SNAPSHOT (immutable predictions) ═══
function saveSnapshot(predictions) {
  let locked = {};
  try { const snap = JSON.parse(fs.readFileSync('data/predictions-snapshot.json', 'utf8')); for (const p of snap) { if (p.teamA && p.teamB) locked[`${p.teamA}|${p.teamB}`] = p; } } catch {}
  let added = 0;
  for (const p of predictions) {
    const key = `${p.teamA}|${p.teamB}`, keyRev = `${p.teamB}|${p.teamA}`;
    if (!locked[key] && !locked[keyRev]) { p.predictedAt = new Date().toISOString(); locked[key] = p; added++; }
  }
  fs.writeFileSync('data/predictions-snapshot.json', JSON.stringify(Object.values(locked), null, 2));
  console.log(`📸 Snapshot: ${Object.keys(locked).length} total (${added} new)`);
}

// ═══ MAIN ═══
async function main() {
  console.log('\n🏀 NCAA v9 Pipeline — Monte Carlo Engine');
  console.log(`   ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CST`);
  console.log('═══════════════════════════════════════\n');

  // Load state
  const teamDB = loadJSON('data/teams.json', {});
  const bracketState = loadJSON('data/bracket-state.json', { results: {}, advancedTo: {} });
  const weights = loadJSON('data/weights.json', { layers: { L1: .42, L2: .28, L3: .18, L4: .08, L5: .04 }, recency: { em: .60, mg: .62, efg: .55, ast: .52, ftr: .47, orb: .47, tor: .42, tpt: .37 }, vegasBlend: 0.55, sigma: 11, version: 1 });
  const learning = loadJSON('data/learning-state.json', {});

  // Fetch live data
  const { games, yesterdayResults } = await fetchGames();
  const rawOdds = await fetchOdds();
  const injuries = await fetchInjuries();
  await fetchTeamStats(teamDB);

  // Resolve odds
  const { vegasLines, moneyLines } = resolveOdds(rawOdds, teamDB);
  console.log(`📊 ${Object.keys(rawOdds).length} odds resolved\n`);

  // Build slot map
  const slots = JSON.parse(JSON.stringify(BRACKET));
  const slotMap = {};
  slots.forEach(s => slotMap[s.id] = s);

  // Apply saved advances
  for (const [slotId, teams] of Object.entries(bracketState.advancedTo)) {
    if (slotMap[slotId]) { if (teams.a) slotMap[slotId].a = teams.a; if (teams.b) slotMap[slotId].b = teams.b; }
  }

  // Detect new results
  const allResults = [...yesterdayResults, ...games.filter(g => g.completed || g.status === 'Final')];
  const newAdv = updateBracketState(bracketState, allResults, teamDB, slotMap);
  console.log(`🔄 ${newAdv} new advances, ${Object.keys(bracketState.results).length} total completed\n`);

  // Update Elo
  const eloUpdates = updateElo(teamDB, allResults, learning);
  console.log(`⚡ Elo updated for ${eloUpdates} games\n`);

  // Run Monte Carlo engine
  console.log('🎲 Running Monte Carlo simulations (10,000 per game)...');
  const { predictions, completed } = runPredictions(teamDB, bracketState, slotMap, vegasLines, moneyLines, weights, learning);
  console.log(`   ${completed.length} completed, ${predictions.length} predicted\n`);

  // Save snapshot
  saveSnapshot(predictions);

  // Build display
  console.log('🏆 Building bracket display...');
  const display = buildDisplay(teamDB, bracketState, slotMap, predictions, completed, weights, vegasLines, moneyLines);
  console.log(`   ${display.rounds.reduce((s, r) => s + r.g.length, 0)} games across ${display.rounds.length} rounds`);

  // Write everything
  fs.writeFileSync('data/teams.json', JSON.stringify(teamDB, null, 2));
  fs.writeFileSync('data/bracket-state.json', JSON.stringify(bracketState, null, 2));
  fs.writeFileSync('data/predictions.json', JSON.stringify({ timestamp: new Date().toISOString(), completed, predictions }, null, 2));
  fs.mkdirSync('public/data', { recursive: true });
  fs.mkdirSync('public/data/reports', { recursive: true });
  fs.writeFileSync('public/data/bracket-display.json', JSON.stringify(display));
  fs.writeFileSync('data/bracket-display.json', JSON.stringify(display));
  // Copy data files to public so client pages can fetch them
  try { fs.copyFileSync('data/reports/latest.json', 'public/data/reports/latest.json'); } catch {}
  try { fs.copyFileSync('data/weights.json', 'public/data/weights.json'); } catch {}
  try { fs.copyFileSync('data/learning-state.json', 'public/data/learning-state.json'); } catch {}
  try { fs.copyFileSync('data/predictions-snapshot.json', 'public/data/predictions-snapshot.json'); } catch {}

  // Run delta report
  console.log('\n📊 Running delta report...');
  try { require('./delta-report'); } catch (e) { console.log('   ⚠️ Delta report skipped:', e.message); }

  console.log(`\n✅ v9 pipeline complete. Champion: ${display.rounds[display.rounds.length - 1]?.g[0]?.w || display.rounds[display.rounds.length - 1]?.g[0]?.winner || 'TBD'}\n`);
}

main().catch(e => { console.error('❌ Pipeline failed:', e); process.exit(1); });