# NCAA Prediction Engine v9.0 — Monte Carlo

## What's New in v9

- **Monte Carlo simulation**: 10,000 iterations per game with noise on every variable
- **Streamlined codebase**: 4 scripts (was 6), 3 data files (was 12+)
- **Win probability from actual simulations**, not a normal CDF approximation
- **Per-team volatility**: Alabama (chaotic) gets wider noise than Virginia (stable)
- **Rich output**: spread distributions, close-game %, blowout %, cover probability
- **v8 learned weights preserved**: layer weights, Vegas blend, recency, teamK all carried forward

## File Structure

```
scripts/
  engine.js          ← Monte Carlo core. All basketball math lives here.
  pipeline.js        ← Fetches data + runs engine + builds display. Replaces 3 v8 scripts.
  learn.js           ← Grades games + tunes weights. Simplified from v8 self-improve.
  config.js          ← Static bracket structure, venues, locations.
  team-names.js      ← ESPN → DB name mapper (unchanged from v8).
  migrate-v8-to-v9.js ← Run ONCE before deploying.

app/
  bracket.js         ← Display component (reads bracket-display.json, no prediction logic)
  report/page.js     ← Performance report
  page.js            ← Root page
  layout.js          ← Next.js layout

data/
  teams.json         ← All 68 teams with stats, Elo, styles, V8 extended data
  bracket-state.json ← Completed games + advances
  weights.json       ← Learned parameters (seeded from v8)
  learning-state.json ← Enhancement trackers (teamK, layer accuracy, etc.)
  accuracy-history.json ← Cumulative grading results
  predictions-snapshot.json ← Immutable pre-game predictions
  v8-archive/        ← Frozen v8 performance for comparison
```

## Deployment (Same Repo)

### Step 1: Create v9 branch
```bash
cd Bball
git checkout -b v9
```

### Step 2: Delete old v8 scripts
```bash
rm scripts/fetch-all-data.js
rm scripts/run-predictions.js
rm scripts/self-improve.js
rm scripts/delta-report.js
rm scripts/fix-bracket-state.js
```

### Step 3: Copy v9 files
Extract the v9 archive and copy all files into the repo:
```bash
# Copy scripts/engine.js, pipeline.js, learn.js, config.js, migrate-v8-to-v9.js
# Copy .github/workflows/pipeline.yml (replaces old workflow)
# Copy package.json
# Copy next.config.js
# Copy data/v8-archive/ directory
# app/ files stay mostly the same — bracket.js was already updated
```

### Step 4: Run migration
```bash
node scripts/migrate-v8-to-v9.js
```

### Step 5: Test locally
```bash
npm install
node scripts/pipeline.js  # Should show Monte Carlo output
node scripts/learn.js     # Should grade games
```

### Step 6: Deploy
```bash
git add -A
git commit -m "v9.0: Monte Carlo engine (10k sims), streamlined pipeline"
git push origin v9

# Merge to main (Vercel auto-deploys)
git checkout main
git merge v9
git push
```

### Step 7: Verify
- Run GitHub Actions workflow manually
- Check ncaaball.vercel.app shows updated predictions
- Check /report shows v8 baseline comparison

## Pipeline Schedule

Same as v8: daily at 7am CST via GitHub Actions + manual trigger.

Pipeline order:
1. `learn.js` — grade completed games, tune weights
2. `pipeline.js` — fetch data, run Monte Carlo, build display

## v8 Performance Baseline

| Metric | v8 Result |
|--------|-----------|
| Straight-Up | 76.5% (26/34) |
| vs Spread | 50.0% (17/34) |
| Avg Error | ~9 pts |
| Games Graded | 34 (through R32) |
