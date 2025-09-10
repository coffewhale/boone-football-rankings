# 🏈 Boone Football Rankings - Complete System Overview

## 📊 **What This App Does**

A **fully automated fantasy football rankings aggregator** that:
- **Monitors Justin Boone's Yahoo Sports articles** for new rankings
- **Automatically scrapes player data** from embedded Datawrapper charts  
- **Updates your site instantly** when new rankings are published
- **Serves 487+ players** across 7 positions (QB, RB, WR, TE, FLEX, DEF, K)
- **Provides instant page loads** by serving static JSON data

---

## 🎯 **Core Architecture**

### **Data Flow:**
```
Justin Boone publishes → Yahoo article timestamp changes → 
System detects change → Scrapes Datawrapper CSVs → 
Commits to GitHub → Static site updates instantly
```

### **Key Components:**
1. **Static Frontend** - Fast loading HTML/CSS/JS
2. **Netlify Functions** - Serverless backend automation  
3. **GitHub Repository** - Data storage & version control
4. **Timestamp System** - Smart update detection
5. **CSV Scraping** - Direct data extraction from Datawrapper

---

## ⚡ **Automation System**

### **🕘 Scheduled Updates (Every 3 Hours)**
- **Function**: `working-timestamp-updater` 
- **Schedule**: `0 6,9,12,15,18 * * *` (6am-6pm ET)
- **Process**: Checks timestamp → Scrapes if changed → Commits automatically

### **🔧 Manual Updates (On-Demand)**
- **URL**: `/.netlify/functions/manual-timestamp-updater-json`
- **Use**: Bookmark for instant manual updates
- **Process**: Same as scheduled, but triggered by you

### **📊 Smart Timestamp Detection**
- **Monitors**: `timestamp.json` file in repository
- **Compares**: Stored timestamp vs Yahoo article timestamp
- **Updates**: Only when Justin Boone publishes new content
- **Efficient**: No wasted scraping or API calls

---

## 🛠 **Technical Implementation**

### **Frontend Stack**
- **HTML/CSS/JavaScript** - Vanilla JS for speed
- **Static hosting** on Netlify
- **Cache busting** for instant updates
- **Responsive design** for mobile/desktop

### **Backend Functions**
```
netlify/functions/
├── scrape-and-serve.js          # Core scraping engine
├── manual-timestamp-updater-json.js  # HTTP-callable updater  
├── working-timestamp-updater.js      # Scheduled updater
├── test-*.js                    # Various testing functions
└── *.backup                     # Safety backups
```

### **Data Storage**
```
Repository Files:
├── rankings.json    # 487+ players across all positions
├── timestamp.json   # Tracks last update timestamp  
├── script.js        # Frontend rendering logic
├── index.html       # Main website
└── netlify.toml     # Deployment configuration
```

---

## 🔄 **How Updates Work**

### **1. Detection Phase**
```javascript
// Checks Yahoo article timestamp vs stored timestamp
const timestampResult = await checkTimestamp();
if (!timestampResult.updateNeeded) {
    return "No update needed";
}
```

### **2. Scraping Phase**  
```javascript
// Discovers CSV URLs from Datawrapper embeds
const csvUrls = await findCSVUrls(datawrapperUrl);
// Parses player data with position-specific logic
const rankings = parseFlexibleCSV(csvText, position);
```

### **3. Processing Phase**
```javascript  
// Fixes FLEX position ranks using actual WR/RB/TE data
if (results.flex && results.flex.length > 0) {
    results.flex = calculateCorrectFlexRanks(results.flex, results);
}
```

### **4. Commit Phase**
```javascript
// Commits both files atomically to GitHub
await commitBothFiles(rankingsData, timestampResult, githubToken, repo);
// Creates: rankings.json + timestamp.json commits
```

---

## 🎮 **How to Use**

### **For Users (Viewing Rankings)**
1. Visit your site URL
2. See instant rankings (no loading delays)  
3. Data is automatically fresh when Boone publishes

### **For Admin (Managing Updates)**

#### **Automatic (Recommended)**
- ✅ **Nothing to do!** System updates every 3 hours automatically
- ✅ **Only scrapes** when Boone publishes new content  
- ✅ **Zero manual work** required

#### **Manual Trigger (When Impatient)**
- 🔗 **Bookmark**: `https://boone-football-rankings.netlify.app/.netlify/functions/manual-timestamp-updater-json`
- 📱 **One-click**: Visit URL to trigger immediate update
- 📊 **Response**: JSON showing what happened (updated or no change)

---

## 📋 **Environment Variables**

### **Required Settings** (Netlify Dashboard)
```bash
# Core functionality  
MONITOR_URL=https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-2-184357725.html
MONITOR_WEEK=2
GITHUB_TOKEN=your_token_with_repo_and_workflow_permissions
GITHUB_REPO=your-username/repo-name

# Datawrapper chart URLs (update weekly)
QB_URLS=https://www.datawrapper.de/_/3igBi/
RB_URLS=https://www.datawrapper.de/_/your_rb_id/
WR_URLS=https://www.datawrapper.de/_/your_wr_id/
TE_URLS=https://www.datawrapper.de/_/your_te_id/
FLEX_URLS=https://www.datawrapper.de/_/your_flex_id/
DEF_URLS=https://www.datawrapper.de/_/your_def_id/
K_URLS=https://www.datawrapper.de/_/your_k_id/
```

---

## 🔧 **Weekly Maintenance**

### **When Justin Boone Publishes New Week**
1. **Update environment variables** in Netlify dashboard:
   ```bash
   MONITOR_WEEK=3  # Increment week number
   MONITOR_URL=https://sports.yahoo.com/fantasy/article/[NEW_WEEK_URL]
   ```

2. **Update Datawrapper URLs** (if Boone creates new charts):
   ```bash  
   QB_URLS=https://www.datawrapper.de/_/[NEW_QB_ID]/
   # Update others as needed
   ```

3. **Test the system**:
   - Visit manual trigger URL
   - Verify rankings update correctly
   - Check FLEX position ranks display

---

## 🚨 **Troubleshooting**

### **Rankings Not Updating**
1. **Check manual trigger**: Visit the manual updater URL
2. **Check timestamp**: Look for timestamp changes in Yahoo article  
3. **Check environment variables**: Ensure MONITOR_URL is correct
4. **Check GitHub commits**: See if commits are being created

### **Missing Data for Positions**  
1. **Check Datawrapper URLs**: Ensure they're current week's charts
2. **Check CSV discovery**: Look at function logs for "No CSV URLs found"
3. **Check environment variables**: Verify all position URLs are set

### **FLEX Position Ranks Missing**
- ✅ **Already fixed** - Frontend displays (RB1, WR12, TE3) correctly
- Backend calculates using actual position rank lookups

### **Emergency Rollback**
```bash
# Restore previous version
git revert HEAD
git push

# Or restore from backup files  
cp netlify/functions/manual-timestamp-updater.js.backup netlify/functions/manual-timestamp-updater.js
```

---

## 📊 **Data Structure**

### **rankings.json Format**
```json
{
  "qb": [{"preGameRank": 1, "player": "Josh Allen", "opponent": "vs MIA"}],
  "rb": [{"preGameRank": 1, "player": "Christian McCaffrey", "opponent": "vs NYJ"}], 
  "wr": [{"preGameRank": 1, "player": "CeeDee Lamb", "opponent": "vs NYG"}],
  "te": [{"preGameRank": 1, "player": "Travis Kelce", "opponent": "vs CIN"}],
  "flex": [{"preGameRank": 1, "player": "Derrick Henry", "opponent": "vs CLE", "positionRank": "RB1"}],
  "def": [{"preGameRank": 1, "player": "San Francisco", "opponent": "vs NYJ"}],
  "k": [{"preGameRank": 1, "player": "Justin Tucker", "opponent": "vs LV"}],
  "lastUpdated": "2025-09-09T21:09:04.000Z",
  "week": 2,
  "scrapedAt": "2025-09-10T13:08:44.860Z", 
  "totalPlayers": 487
}
```

### **timestamp.json Format**
```json
{
  "lastStoredTimestamp": "2025-09-09T21:09:04.000Z",
  "lastUpdated": "2025-09-10T13:08:44.860Z",
  "source": "Yahoo Sports - Justin Boone Rankings", 
  "week": 2
}
```

---

## 🎯 **System Benefits**

### **For Users**
- ⚡ **Instant page loads** (static data serving)
- 📱 **Mobile responsive** design  
- 🔄 **Always current** data (auto-updates)
- 🎯 **Accurate FLEX ranks** (RB12, WR23, TE5 format)

### **For Admin**  
- 🤖 **100% automated** (no manual work)
- 💰 **Cost efficient** (only scrapes when needed)
- 🔒 **Safe updates** (atomic commits, rollback capable)
- 📊 **Complete visibility** (logs, commit history)

### **For Performance**
- 🚀 **Static site speed** (no database queries)
- 📈 **Scalable** (handles traffic spikes) 
- ⚡ **Smart caching** (only updates when changed)
- 🔧 **Reliable** (Netlify infrastructure)

---

## 🔮 **Future Weeks**

The system is **fully automated** for future weeks. You only need to:

1. **Update 2 environment variables** when Boone publishes new week
2. **System handles everything else** automatically  
3. **Monitor via commit history** for successful updates

**That's it!** The hard work is done - you have a fully automated fantasy football rankings system! 🏈🚀