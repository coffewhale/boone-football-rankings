# 🏈 Boone Fantasy Football Rankings Automation Project

## What This Project Does

This project automatically monitors and scrapes **Justin Boone's weekly fantasy football rankings** from Yahoo Sports, converting them into a clean JSON format for easy consumption by your fantasy football tools.

**Key Features:**
- ✅ **Fully Automated** - Runs every hour in the cloud (6 AM - 6 PM ET)  
- ✅ **Smart Change Detection** - Only scrapes when new rankings are actually published
- ✅ **All Positions Supported** - QB, RB, WR, TE, FLEX, DEF, K
- ✅ **No Computer Required** - Runs on Netlify's serverless platform
- ✅ **Minimal Weekly Setup** - Just update URLs once per week

## How It Works

1. **Monitor Phase**: Checks Yahoo article timestamp for potential updates
2. **Verification Phase**: Uses FLEX rankings as "canary" to detect real changes  
3. **Scraping Phase**: Only runs when actual new data is detected
4. **Output**: Updates `rankings.json` with all player rankings in structured format

## Architecture

```
Yahoo Sports Article → Datawrapper iframes → Playwright scraping → rankings.json
     ↓                    ↓                      ↓                     ↓
Monitor timestamp    Extract table URLs    Browser automation    Clean JSON output
```

## Current File Structure

### 🔧 Core Files (Active)
- **`netlify/functions/smart-automated-scraper.js`** - Main automation function
- **`netlify/functions/test-config.js`** - Tests environment variable setup  
- **`netlify/functions/test-scraping.js`** - Tests basic scraping functionality
- **`netlify.toml`** - Netlify configuration with hourly scheduling
- **`package.json`** - Node.js dependencies (includes playwright-chromium)

### 📊 Data Files (Active)
- **`rankings.json`** - Current week's player rankings (auto-updated)
- **`rankings.json.backup.*`** - Automatic backups of previous rankings

### 🎯 Manual Tools (Still Useful)
- **`rankings-entry.html`** - Manual entry interface (backup method)
- **`boon.py`** - Original QB-only scraper (reference/testing)
- **`index.html`** - Main web interface for viewing rankings

### 📚 Documentation (Reference)
- **`DEPLOYMENT_CHECKLIST.md`** - Step-by-step deployment guide
- **`WORKFLOW.md`** - Original manual workflow documentation  
- **`README.md`** - Basic project information

### 🗂️ Supporting Files
- **`styles.css`** - Web interface styling
- **`script.js`** - Frontend JavaScript for ranking display
- **`analysis.html`** - Tool for analyzing ranking accuracy
- **`data/`** - Directory containing historical data and analysis

## Environment Variables (Set in Netlify Dashboard)

### Required for Monitoring:
```
MONITOR_URL = https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html
LAST_STORED_TIMESTAMP = 2025-09-07T16:02:06.000Z
```

### Required for Scraping (Update Weekly):
```
QB_URLS = https://datawrapper.dwcdn.net/bqgx9/
RB_URLS = https://www.datawrapper.de/_/hPdJB/
WR_URLS = https://www.datawrapper.de/_/LBvt2/
TE_URLS = https://www.datawrapper.de/_/fDdoY/
FLEX_URLS = https://www.datawrapper.de/_/FpqPP
DEF_URLS = https://www.datawrapper.de/_/V27sf
K_URLS = https://www.datawrapper.de/_/t1sdx
```

## Your Weekly Workflow (5 minutes)

1. **Find New Yahoo Article** - Boone publishes new rankings weekly
2. **Extract Datawrapper URLs** - Open article, find embedded ranking tables
3. **Update Environment Variables** - Paste new URLs into Netlify Dashboard
4. **Done!** - System handles everything else automatically

## When New Rankings Are Detected

1. **Function runs automatically** (every hour, 6 AM - 6 PM ET)
2. **Scrapes all 7 positions** from your configured URLs
3. **Updates rankings.json** with new player data  
4. **Returns new timestamp** for you to update `LAST_STORED_TIMESTAMP`

## Function URLs (For Testing)

- **Main Function**: `https://boone-football-rankings.netlify.app/.netlify/functions/smart-automated-scraper`
- **Config Test**: `https://boone-football-rankings.netlify.app/.netlify/functions/test-config`  
- **Scraping Test**: `https://boone-football-rankings.netlify.app/.netlify/functions/test-scraping`

## Technical Details

**Language**: Node.js (serverless functions), Python (local tools)  
**Browser Automation**: Playwright Chromium for JavaScript-heavy scraping  
**Hosting**: Netlify Functions (serverless, scheduled execution)  
**Change Detection**: Multi-layer validation using timestamps + FLEX content comparison  
**Data Format**: Clean JSON with player names, positions, ranks, and matchup info

## Troubleshooting

**Function not running?** Check Netlify Functions tab for errors and verify environment variables  
**No data scraped?** Test individual Datawrapper URLs and verify they're still valid  
**Function times out?** Netlify functions have 10-second limit for scheduled functions  

## Success Indicators

✅ Function appears in Netlify Functions dashboard with "Scheduled" status  
✅ Hourly execution logs show successful runs  
✅ FLEX change detection prevents unnecessary scraping  
✅ rankings.json gets updated only when real changes occur  
✅ You only need to update timestamp when changes actually happen  

---

**This system now runs your fantasy football rankings completely in the cloud!** 🚀

No more manual scraping, no more leaving your computer on, no more forgetting to check for updates. Just update URLs weekly and let automation handle the rest.