# Netlify Automation Setup Guide

Perfect! Your Netlify function will handle all the automation without needing to keep your computer on 24/7.

## 🚀 **How Timestamp Storage Works**

### **Method 1: File-Based (Automatic)**
- Stores timestamp in `last_timestamp.txt` in your repo
- Gets committed and deployed automatically
- No manual intervention needed

### **Method 2: Environment Variable (Backup)**
- Uses `LAST_STORED_TIMESTAMP` environment variable
- You can manually update if needed
- Functions as a fallback

## 📋 **Netlify Environment Variables Setup**

In your Netlify dashboard, go to **Site Settings > Environment Variables** and add:

### **Required:**
```
MONITOR_URL = https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html

QB_URLS = https://datawrapper.dwcdn.net/bqgx9/
RB_URLS = https://www.datawrapper.de/_/hPdJB/
WR_URLS = https://www.datawrapper.de/_/LBvt2/
TE_URLS = https://www.datawrapper.de/_/fDdoY/
FLEX_URLS = https://www.datawrapper.de/_/FpqPP
DEF_URLS = https://www.datawrapper.de/_/V27sf
K_URLS = https://www.datawrapper.de/_/t1sdx
```

### **Optional:**
```
LAST_STORED_TIMESTAMP = 2025-09-07T16:02:06.000Z
BUILD_HOOK_URL = https://api.netlify.com/build_hooks/YOUR_BUILD_HOOK_ID
```

## 🔄 **Weekly Workflow**

### **What You Do (Once per week, 5 minutes):**
1. **Find new Datawrapper URLs** from Boone's article
2. **Update environment variables** in Netlify dashboard:
   - `MONITOR_URL` → New Yahoo article URL
   - `QB_URLS`, `RB_URLS`, etc. → New Datawrapper URLs
3. **Done!** 🎉

### **What Happens Automatically:**
1. ✅ **Function runs every hour** (6 AM - 6 PM ET)
2. ✅ **Checks Yahoo article timestamp**
3. ✅ **If changed → scrapes all your configured URLs**
4. ✅ **Updates rankings.json**
5. ✅ **Stores new timestamp in file**
6. ✅ **Triggers site rebuild** (if BUILD_HOOK_URL set)

## 🧪 **Testing the Function**

### **Manual Test:**
Visit: `https://your-site.netlify.app/.netlify/functions/update-rankings-automated`

### **Check Logs:**
1. Go to Netlify Dashboard → Functions
2. Find `update-rankings-automated` 
3. Click to view logs and see if it's working

## 📊 **Monitoring**

### **Success Indicators:**
- ✅ `rankings.json` file gets updated
- ✅ `last_timestamp.txt` file appears/updates
- ✅ Site rebuilds automatically
- ✅ Function logs show successful scraping

### **Function Response:**
```json
{
  "success": true,
  "updateNeeded": true,
  "totalPlayers": 245,
  "currentTimestamp": "2025-09-07T16:02:06.000Z",
  "message": "Rankings updated successfully!"
}
```

## 🔧 **Deployment Steps**

1. **Commit and push your changes:**
```bash
git add .
git commit -m "Add automated Netlify scraper function"
git push
```

2. **Set up environment variables** in Netlify dashboard

3. **Deploy and test:**
   - Function will be available at `/.netlify/functions/update-rankings-automated`
   - Scheduled to run every hour automatically

## 📁 **Files Created:**
- `netlify/functions/update-rankings-automated.js` - Main automation function
- Updated `netlify.toml` - Scheduled function configuration  
- `last_timestamp.txt` - Auto-created timestamp storage (after first run)

## 🎯 **Advantages of Netlify Automation:**

✅ **No computer needed** - Runs in the cloud  
✅ **Reliable scheduling** - Netlify handles the cron  
✅ **Automatic deployment** - Changes trigger site rebuild  
✅ **Persistent storage** - File-based timestamp storage  
✅ **Function logs** - Easy monitoring and debugging  
✅ **Environment variables** - Easy weekly URL updates  
✅ **Same scraping logic** - Reuses your working code  

## 🚨 **Important Notes:**

### **Weekly URL Updates:**
- Just update the environment variables in Netlify
- No need to redeploy code
- Changes take effect immediately

### **Timestamp Storage:**
- Primary: `last_timestamp.txt` file (automatic)
- Backup: `LAST_STORED_TIMESTAMP` env var (manual)
- Both methods ensure no duplicate scraping

### **Function Limits:**
- Netlify functions have a 10-second execution limit for scheduled functions
- Browser automation might need optimization for complex scraping
- Consider splitting into multiple functions if needed

**Your system is now fully automated and will run in the cloud! 🎉**