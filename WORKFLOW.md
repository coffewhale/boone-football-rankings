# Boone Rankings App - Automated Workflow Documentation

## Overview

This fantasy football rankings app automatically scrapes Justin Boone's weekly rankings from Yahoo Sports and serves them to users with instant page loads. The system only updates when new content is published, making it highly efficient and cost-effective.

## How It Works

### 1. Data Source
- **Primary Source**: Justin Boone's Yahoo Sports fantasy football articles
- **Data Format**: Embedded Datawrapper charts that expose CSV endpoints
- **Positions Tracked**: QB, RB, WR, TE, FLEX, DEF, K (7 total positions)
- **Update Frequency**: 4-5 times per week during NFL season

### 2. Automated Workflow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Yahoo Sports  │    │  Netlify Cron    │    │  Static JSON    │
│   (Timestamp)   │───▶│   (Every 3hrs)   │───▶│   (Instant)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────▼────────┐              │
         │              │ Timestamp Check  │              │
         │              │ Changed? Yes/No  │              │
         │              └─────────┬────────┘              │
         │                        │                        │
         │              ┌─────────▼────────┐              │
         └─────────────▶│   Scrape Data    │              │
                        │  (All Positions) │              │
                        └─────────┬────────┘              │
                                  │                        │
                        ┌─────────▼────────┐              │
                        │  Commit to Git   │─────────────▶│
                        │ (rankings.json)  │              │
                        └──────────────────┘              │
                                                          │
┌─────────────────┐                              ┌───────▼────────┐
│   User Visits   │─────────────────────────────▶│  Page Loads    │
│     Website     │                              │   (Instant)    │
└─────────────────┘                              └────────────────┘
```

### 3. Technical Components

#### A. Timestamp Monitor (`working-timestamp-updater.js`)
- **Scheduled**: Every 3 hours during active periods (6 AM - 6 PM ET)
- **Function**: Checks Yahoo article timestamp against last stored timestamp
- **Trigger**: Only scrapes when timestamp changes (new content published)

#### B. Data Scraper (`scrape-and-serve.js`)
- **Method**: Direct CSV access from Datawrapper endpoints
- **Speed**: ~30 seconds to scrape all 7 positions
- **Data**: Extracts rank, player name, opponent for each position

#### C. Static File Generation
- **Output**: `rankings.json` with all player data
- **Storage**: GitHub repository (free hosting)
- **Access**: Direct file serving (instant page loads)

#### D. Frontend (`script.js`)
- **Primary**: Loads static `rankings.json`
- **Fallback**: Live scraping if static file unavailable
- **Cache**: Busting with timestamp parameter

## Environment Variables Required

### Netlify Dashboard Configuration
```env
# Yahoo Monitoring
MONITOR_URL=https://sports.yahoo.com/fantasy/article/[current-week-qb-url]
LAST_STORED_TIMESTAMP=2025-09-09T21:09:04.000Z

# GitHub Integration
GITHUB_TOKEN=[your-github-personal-access-token]
GITHUB_REPO=coffewhale/boone-football-rankings

# Position URLs (Auto-discovered from QB URL)
QB_URL=https://sports.yahoo.com/fantasy/article/[qb-article-url]
RB_URL=https://sports.yahoo.com/fantasy/article/[rb-article-url]
WR_URL=https://sports.yahoo.com/fantasy/article/[wr-article-url]
TE_URL=https://sports.yahoo.com/fantasy/article/[te-article-url]
FLEX_URL=https://sports.yahoo.com/fantasy/article/[flex-article-url]
DEF_URL=https://sports.yahoo.com/fantasy/article/[def-article-url]
K_URL=https://sports.yahoo.com/fantasy/article/[k-article-url]
```

## Weekly Maintenance Required

### When Justin Boone Publishes New Week Rankings:

1. **Update MONITOR_URL** (Most Important)
   - Find the new week's QB rankings URL
   - Update `MONITOR_URL` in Netlify environment variables
   - Example: `https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-3-[ID].html`

2. **Update All Position URLs** (Optional - Auto-discovery usually works)
   - Only needed if auto-discovery fails
   - Update each position URL in Netlify environment variables

3. **Reset Timestamp** (Optional)
   - Update `LAST_STORED_TIMESTAMP` to force immediate update
   - Or let the system detect changes naturally

### Typical Weekly Process:
```
Tuesday/Wednesday: Justin publishes new week rankings
                 ↓
Update MONITOR_URL with new QB article URL
                 ↓
System automatically detects timestamp change within 3 hours
                 ↓
Scrapes all positions and updates rankings.json
                 ↓
Users see new rankings instantly
```

## Monitoring and Troubleshooting

### Check System Status
- **Netlify Functions**: View logs at Netlify Dashboard > Functions
- **GitHub Commits**: Check repository for automated commits
- **Test Endpoint**: `/.netlify/functions/minimal-timestamp-test`

### Common Issues

#### 1. No Updates Appearing
- **Check**: MONITOR_URL points to current week
- **Check**: LAST_STORED_TIMESTAMP is old enough
- **Fix**: Update environment variables in Netlify

#### 2. Scraping Fails
- **Cause**: Yahoo changed article structure
- **Check**: Manual test via `/.netlify/functions/scrape-and-serve`
- **Fix**: Update scraping selectors if needed

#### 3. Partial Data (Missing Positions)
- **Cause**: Auto-discovery failed for some positions
- **Check**: Netlify function logs for errors
- **Fix**: Manually set position URLs in environment variables

### Manual Triggers
- **Test Timestamp**: `/.netlify/functions/minimal-timestamp-test`
- **Force Scrape**: `/.netlify/functions/scrape-and-serve`
- **Full Update**: `/.netlify/functions/working-timestamp-updater`

## Cost Analysis

### Current Costs: $0/month
- **Netlify**: Free tier (100GB bandwidth, 125k requests)
- **GitHub**: Free public repository
- **Compute**: ~5 minutes/week of function execution

### Scaling Considerations
- **10k users**: Still free (static file serving)
- **100k users**: May need Netlify Pro ($19/month)
- **Data**: Always free (direct CSV access, GitHub hosting)

## Performance Metrics

- **Page Load**: <1 second (static file)
- **Update Time**: 30 seconds (full scrape)
- **Data Freshness**: Updated within 3 hours of publication
- **Reliability**: 99%+ (fallback to live scraping if static fails)

## Key Files

- `netlify/functions/working-timestamp-updater.js` - Main automation
- `netlify/functions/scrape-and-serve.js` - Data scraper  
- `script.js` - Frontend logic
- `rankings.json` - Static data file (auto-generated)
- `netlify.toml` - Deployment configuration

## Success Indicators

✅ **Working System**:
- GitHub shows recent automated commits
- Rankings.json contains 400-600 players
- Website loads all 7 positions instantly
- Netlify logs show successful timestamp checks

❌ **Needs Attention**:
- No GitHub commits for current week
- Rankings showing old data
- Missing positions on website
- Error logs in Netlify functions

---

**Remember**: The only regular maintenance needed is updating the MONITOR_URL when Justin Boone publishes new week rankings. Everything else runs automatically!