const fetch = require('node-fetch');
const fs = require('fs');

// ═══════════════════════════════════════════════════════
// MASTER DATA FETCHER v2 — runs daily at 7am CST
// Pulls from: ESPN scores, ESPN team stats, Odds API, injury news
// ═══════════════════════════════════════════════════════

const ODDS_KEY = process.env.ODDS_API_KEY || '';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══ 1. TODAY'S GAMES (ESPN — free, no key) ═══
async function fetchGames() {
  console.log("📅 Fetching today's games...");
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const data = await fetchJSON(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${today}&limit=100`
  );
  const games = data.events.map(e => ({
    id: e.id,
    teamA: e.competitions[0].competitors[0].team.displayName,
    teamB: e.competitions[0].competitors[1].team.displayName,
    teamAId: e.competitions[0].competitors[0].team.id,
    teamBId: e.competitions[0].competitors[1].team.id,
    time: e.date,
    venue: e.competitions[0].venue?.fullName || 'TBD',
    city: e.competitions[0].venue?.address?.city || '',
    status: e.status.type.description,
    scoreA: e.competitions[0].competitors[0].score || null,
    scoreB: e.competitions[0].competitors[1].score || null,
  }));
  console.log(`   Found ${games.length} games`);
  return games;
}

// ═══ 2. VEGAS LINES (Odds API — free, 500 req/month) ═══
async function fetchOdds() {
  console.log('💰 Fetching Vegas lines...');
  if (!ODDS_KEY) {
    console.log('   ⚠️ No ODDS_API_KEY set — skipping');
    return {};
  }
  try {
    const data = await fetchJSON(
      `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/?apiKey=${ODDS_KEY}&regions=us&markets=spreads,h2h&oddsFormat=american`
    );
    const odds = {};
    for (const game of data) {
      const key = game.home_team + ' vs ' + game.away_team;
      const dk = game.bookmakers.find(b => b.key === 'draftkings')
        || game.bookmakers.find(b => b.key === 'fanduel')
        || game.bookmakers[0];
      if (!dk) continue;
      const spread = dk.markets.find(m => m.key === 'spreads');
      const ml = dk.markets.find(m => m.key === 'h2h');
      const homeSpreadOutcome = spread?.outcomes?.find(o => o.name === game.home_team);
      const awaySpreadOutcome = spread?.outcomes?.find(o => o.name === game.away_team);
      const homeML = ml?.outcomes?.find(o => o.name === game.home_team);
      const awayML = ml?.outcomes?.find(o => o.name === game.away_team);
      odds[key] = {
        spread: homeSpreadOutcome?.point ?? null,
        spreadOdds: homeSpreadOutcome?.price ?? -110,
        mlHome: homeML?.price ?? null,
        mlAway: awayML?.price ?? null,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        book: dk.key,
        updated: dk.last_update,
      };
    }
    console.log(`   Found odds for ${Object.keys(odds).length} games`);
    return odds;
  } catch (e) {
    console.log('   ⚠️ Odds API failed:', e.message);
    return {};
  }
}

// ═══ 3. INJURY REPORTS (ESPN — free) ═══
async function fetchInjuries() {
  console.log('🏥 Fetching injury reports...');
  try {
    const data = await fetchJSON(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/news?limit=50'
    );
    const injuryNews = data.articles
      .filter(a => /injur|out |questionable|doubtful|day-to-day|ACL|fracture|surgery|concussion/i.test(a.headline + ' ' + (a.description || '')))
      .map(a => ({
        headline: a.headline,
        description: a.description,
        published: a.published,
      }));
    console.log(`   Found ${injuryNews.length} injury-related articles`);
    return injuryNews;
  } catch (e) {
    console.log('   ⚠️ Injury fetch failed:', e.message);
    return [];
  }
}

// ═══ 4. YESTERDAY'S RESULTS (for Elo updates) ═══
async function fetchYesterdayResults() {
  console.log("📊 Fetching yesterday's results...");
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const data = await fetchJSON(
    `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?dates=${yesterday}&limit=200`
  );
  const results = data.events
    .filter(e => e.status.type.completed)
    .map(e => ({
      teamA: e.competitions[0].competitors[0].team.displayName,
      teamB: e.competitions[0].competitors[1].team.displayName,
      scoreA: parseInt(e.competitions[0].competitors[0].score),
      scoreB: parseInt(e.competitions[0].competitors[1].score),
      neutral: e.competitions[0].neutralSite || false,
    }));
  console.log(`   Found ${results.length} completed games`);
  return results;
}

// ═══ 5. LIVE TEAM STATS (ESPN — free) ═══
// ESPN team IDs for all 68 tournament teams
const ESPN_IDS = {
  "Duke":150,"Arizona":12,"Michigan":130,"Florida":57,
  "UConn":41,"Houston":248,"Iowa State":66,"Purdue":2509,
  "Michigan St.":127,"Illinois":356,"Gonzaga":2250,"Virginia":258,
  "Kansas":2305,"Nebraska":158,"Arkansas":8,"Alabama":333,
  "St. John's":2599,"Vanderbilt":238,"Texas Tech":2641,"Wisconsin":275,
  "Louisville":97,"N. Carolina":153,"BYU":252,"Tennessee":2633,
  "UCLA":26,"St. Mary's":2608,"Kentucky":96,"Miami FL":2390,
  "Ohio State":194,"Clemson":228,"Iowa":2294,"Georgia":61,
  "Villanova":222,"Utah State":328,"TCU":2628,"Saint Louis":139,
  "VCU":2670,"S. Florida":58,"UCF":2116,"Texas A&M":245,
  "Santa Clara":2488,"Missouri":142,"SMU":2567,"Texas":251,
  "N. Iowa":2460,"McNeese":2377,"Akron":2006,"High Point":2272,
  "Cal Baptist":2856,"Troy":2653,"Hofstra":2275,"Hawaii":62,
  "N. Dakota St.":2449,"Penn":219,"Wright St.":2750,"Kennesaw St.":2320,
  "Furman":231,"Idaho":70,"Queens":472610,"Tennessee St.":2634,
  "Siena":2561,"LIU":2335,"UMBC":2378,"Lehigh":2329,
  "Howard":47,"Prairie View":2504,"NC State":152,"Miami OH":193,
};

async function fetchTeamStats() {
  console.log('📈 Fetching live team stats from ESPN...');
  const teamStats = {};
  const teamNames = Object.keys(ESPN_IDS);
  let fetched = 0, failed = 0;

  for (const name of teamNames) {
    const id = ESPN_IDS[name];
    try {
      const data = await fetchJSON(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/${id}/statistics`
      );

      const stats = {};
      // Parse the ESPN stats response
      // ESPN returns stats in categories with displayName and stats array
      const allStats = [];
      if (data.results?.stats) {
        for (const cat of data.results.stats) {
          if (cat.stats) allStats.push(...cat.stats);
        }
      }
      // Also check splits format
      if (data.splits?.categories) {
        for (const cat of data.splits.categories) {
          if (cat.stats) allStats.push(...cat.stats);
        }
      }
      // Also try direct stats array
      if (data.statistics?.splits?.categories) {
        for (const cat of data.statistics.splits.categories) {
          if (cat.stats) allStats.push(...cat.stats);
        }
      }

      // Build a name→value map
      for (const s of allStats) {
        if (s.name && s.value !== undefined) stats[s.name] = parseFloat(s.value);
        if (s.abbreviation && s.value !== undefined) stats[s.abbreviation] = parseFloat(s.value);
      }

      // Extract what we need
      const record = data.results?.displayRecord || data.team?.record?.items?.[0]?.summary || '';

      teamStats[name] = {
        // Raw per-game stats
        ppg: stats.avgPoints || stats.PTS || 0,
        oppg: stats.avgPointsAllowed || stats.OPPG || 0,
        fgPct: stats.fieldGoalPct || stats.FG_PCT || stats['FG%'] || 0,
        threePct: stats.threePointFieldGoalPct || stats['3P_PCT'] || stats['3P%'] || stats.threePointPct || 0,
        ftPct: stats.freeThrowPct || stats.FT_PCT || stats['FT%'] || 0,
        rpg: stats.avgRebounds || stats.REB || 0,
        orpg: stats.avgOffensiveRebounds || stats.OREB || 0,
        apg: stats.avgAssists || stats.AST || 0,
        tpg: stats.avgTurnovers || stats.TO || 0,
        spg: stats.avgSteals || stats.STL || 0,
        bpg: stats.avgBlocks || stats.BLK || 0,
        fta: stats.avgFreeThrowsAttempted || stats.FTA || 0,
        fga: stats.avgFieldGoalsAttempted || stats.FGA || 0,
        threePA: stats.avgThreePointFieldGoalsAttempted || stats['3PA'] || 0,
        threePM: stats.avgThreePointFieldGoalsMade || stats['3PM'] || 0,
        fgm: stats.avgFieldGoalsMade || stats.FGM || 0,

        // Computed
        margin: (stats.avgPoints || 0) - (stats.avgPointsAllowed || 0),
        record: record,

        // If ESPN provides advanced stats (sometimes available)
        pace: stats.pace || stats.possessions || 0,
        offRating: stats.offensiveRating || stats.adjOE || 0,
        defRating: stats.defensiveRating || stats.adjDE || 0,

        _raw: stats, // keep raw for debugging
      };
      fetched++;
    } catch (e) {
      console.log(`   ⚠️ Stats failed for ${name} (ID ${id}): ${e.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    if (fetched % 10 === 0) await sleep(200);
  }

  console.log(`   Fetched stats for ${fetched} teams (${failed} failed)`);
  return teamStats;
}

// ═══ 6. COMPUTE ADVANCED STATS FROM RAW ESPN DATA ═══
function computeAdvancedStats(raw) {
  if (!raw || !raw.ppg) return null;

  // Estimate possessions per game (rough formula)
  const fga = raw.fga || 65;
  const tpg = raw.tpg || 13;
  const orpg = raw.orpg || 10;
  const fta = raw.fta || 18;
  const estPoss = fga - orpg + tpg + 0.44 * fta;
  const tempo = estPoss || 68;

  // Offensive/defensive efficiency (points per 100 possessions)
  const oEff = raw.offRating || (raw.ppg > 0 && tempo > 0 ? (raw.ppg / tempo) * 100 : 105);
  const dEff = raw.defRating || (raw.oppg > 0 && tempo > 0 ? (raw.oppg / tempo) * 100 : 95);
  const em = oEff - dEff;

  // Effective FG% = (FGM + 0.5 * 3PM) / FGA
  const fgm = raw.fgm || (fga * (raw.fgPct / 100));
  const threePM = raw.threePM || (raw.threePA * (raw.threePct / 100));
  const efg = fga > 0 ? ((fgm + 0.5 * threePM) / fga) * 100 : 50;

  // Turnover rate = turnovers per 100 possessions
  const tor = tempo > 0 ? (tpg / tempo) * 100 : 16;

  // Offensive rebound % (rough: OR / (OR + opponent DR))
  // We approximate opponent defensive rebounds as their total rebounds minus our offensive rebounds
  const orb = raw.rpg > 0 ? (orpg / (raw.rpg * 0.7)) * 100 : 30;

  // Free throw rate = FTA / FGA
  const ftr = fga > 0 ? (fta / fga) * 100 : 35;

  // 3PT%
  const tpt = raw.threePct || 35;

  // Assist rate (assists per FGM)
  const astRate = fgm > 0 ? (raw.apg / fgm) * 100 : 50;

  return {
    em: Math.round(em * 10) / 10,
    efg: Math.round(efg * 10) / 10,
    tor: Math.round(tor * 10) / 10,
    orb: Math.round(Math.min(orb, 40) * 10) / 10,
    ftr: Math.round(ftr * 10) / 10,
    tpt: Math.round(tpt * 10) / 10,
    ast: Math.round(astRate * 10) / 10,
    mg: Math.round(raw.margin * 10) / 10,
    o: Math.round(oEff * 10) / 10,
    d: Math.round(dEff * 10) / 10,
    t: Math.round(tempo * 10) / 10,
    record: raw.record,
  };
}

// ═══ MAIN ═══
async function main() {
  console.log('\n🏀 NCAA Prediction Engine — Data Update v2');
  console.log('Time:', new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }), 'CST');
  console.log('════════════════════════════════════════\n');

  const [games, odds, injuries, results] = await Promise.all([
    fetchGames(),
    fetchOdds(),
    fetchInjuries(),
    fetchYesterdayResults(),
  ]);

  // Fetch live team stats (sequential to avoid rate limits)
  const liveStats = await fetchTeamStats();

  // Compute advanced stats from raw ESPN data
  const advancedStats = {};
  for (const [name, raw] of Object.entries(liveStats)) {
    const adv = computeAdvancedStats(raw);
    if (adv) advancedStats[name] = adv;
  }
  console.log(`📊 Computed advanced stats for ${Object.keys(advancedStats).length} teams`);

  // Update teams.json with live stats as "recent" values
  try {
    const teamDB = JSON.parse(fs.readFileSync('data/teams.json', 'utf8'));
    let updated = 0;
    for (const [name, adv] of Object.entries(advancedStats)) {
      if (teamDB[name]) {
        // Update "recent" stats (the _r variants) with live data
        // Keep season stats as anchors, update recent with ESPN live
        teamDB[name].em_r = adv.em;
        teamDB[name].efg_r = adv.efg;
        teamDB[name].tor_r = adv.tor;
        teamDB[name].orb_r = adv.orb;
        teamDB[name].ftr_r = adv.ftr;
        teamDB[name].tpt_r = adv.tpt;
        teamDB[name].ast_r = adv.ast;
        teamDB[name].mg_r = adv.mg;
        teamDB[name].o_r = adv.o;
        teamDB[name].d_r = adv.d;
        if (adv.t > 50 && adv.t < 85) teamDB[name].t = adv.t; // sanity check tempo
        if (adv.record) teamDB[name].rec = adv.record;
        teamDB[name].lastStatsUpdate = new Date().toISOString();
        updated++;
      }
    }
    fs.writeFileSync('data/teams.json', JSON.stringify(teamDB, null, 2));
    console.log(`✅ Updated teams.json with live stats for ${updated} teams`);
  } catch (e) {
    console.log(`   ⚠️ Could not update teams.json: ${e.message}`);
  }

  const timestamp = new Date().toISOString();
  const dataBundle = {
    timestamp, games, odds, injuries,
    yesterdayResults: results,
    liveStats: advancedStats,
  };

  fs.mkdirSync('data', { recursive: true });
  fs.mkdirSync('data/archive', { recursive: true });
  fs.writeFileSync('data/latest.json', JSON.stringify(dataBundle, null, 2));
  fs.writeFileSync(`data/archive/${timestamp.slice(0, 10)}-${timestamp.slice(11, 13)}.json`,
    JSON.stringify(dataBundle, null, 2));

  console.log('\n✅ All data saved to data/latest.json');
  console.log(`   Games: ${games.length}`);
  console.log(`   Odds: ${Object.keys(odds).length}`);
  console.log(`   Injuries: ${injuries.length}`);
  console.log(`   Yesterday results: ${results.length}`);
  console.log(`   Live team stats: ${Object.keys(advancedStats).length}`);
}

main().catch(e => { console.error('❌ Update failed:', e); process.exit(1); });