const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
```

Actually, simpler fix — just install node-fetch. In PyCharm's Terminal:
```
npm install node-fetch

const fetch = require('node-fetch');

const fs = require('fs');

// ═══════════════════════════════════════════════════════
// MASTER DATA FETCHER — runs daily at 7am CST
// Pulls from: ESPN, Odds API, injury news
// ═══════════════════════════════════════════════════════

const ODDS_KEY = process.env.ODDS_API_KEY || 'YOUR_FREE_KEY_HERE';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${url} (${res.status})`);
  return res.json();
}

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
  try {
    const data = await fetchJSON(
      `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/?apiKey=${b028dcbb6c7225951eb374e2d4e7a93a}&regions=us&markets=spreads,h2h&oddsFormat=american`
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

      odds[key] = {
        spread: spread?.outcomes?.[0]?.point || null,
        spreadOdds: spread?.outcomes?.[0]?.price || -110,
        mlHome: ml?.outcomes?.[0]?.price || null,
        mlAway: ml?.outcomes?.[1]?.price || null,
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

// ═══ MAIN: Run all fetchers and save ═══
async function main() {
  console.log('\n🏀 NCAA Prediction Engine — Data Update');
  console.log('Time:', new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }), 'CST');
  console.log('════════════════════════════════════════\n');

  const [games, odds, injuries, results] = await Promise.all([
    fetchGames(),
    fetchOdds(),
    fetchInjuries(),
    fetchYesterdayResults(),
  ]);

  // Save everything to data/ folder
  const timestamp = new Date().toISOString();
  const dataBundle = { timestamp, games, odds, injuries, yesterdayResults: results };

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
}

main().catch(e => { console.error('❌ Update failed:', e); process.exit(1); });
