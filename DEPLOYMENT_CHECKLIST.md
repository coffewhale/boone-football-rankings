# 🚀 Smart Automated Scraper Deployment Checklist

## Step 1: Deploy the Function
```bash
# Commit and push the new smart scraper
git add .
git commit -m "Add smart automated scraper with FLEX-based change detection"
git push
```

## Step 2: Configure Environment Variables in Netlify

Go to **Netlify Dashboard → Your Site → Site Settings → Environment Variables**

### Add these variables:

#### Monitor Configuration:
```
MONITOR_URL = https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html
LAST_STORED_TIMESTAMP = 2025-09-07T16:02:06.000Z
```

#### Datawrapper URLs (use your current ones):
```
QB_URLS = https://datawrapper.dwcdn.net/bqgx9/
RB_URLS = https://www.datawrapper.de/_/hPdJB/
WR_URLS = https://www.datawrapper.de/_/LBvt2/
TE_URLS = https://www.datawrapper.de/_/fDdoY/
FLEX_URLS = https://www.datawrapper.de/_/FpqPP
DEF_URLS = https://www.datawrapper.de/_/V27sf
K_URLS = https://www.datawrapper.de/_/t1sdx
```

## Step 3: Test the Function

After deployment, test manually:

### Test URL:
```
https://YOUR-SITE.netlify.app/.netlify/functions/smart-automated-scraper
```

### Expected Response (if no changes):
```json
{
  "success": true,
  "updateNeeded": false,
  "message": "FLEX data unchanged - timestamp change was false alarm",
  "note": "Consider updating LAST_STORED_TIMESTAMP to: ..."
}
```

### Expected Response (if changes detected):
```json
{
  "success": true,
  "updateNeeded": true,
  "totalPlayers": 245,
  "message": "Rankings successfully updated with new data!",
  "manualStep": "Update LAST_STORED_TIMESTAMP to: ..."
}
```

## Step 4: Monitor Function Logs

1. Go to **Netlify Dashboard → Functions**
2. Click **smart-automated-scraper**
3. View logs to ensure it's working

## Step 5: Verify Automatic Scheduling

The function will now run **automatically every hour from 6 AM - 6 PM ET**.

Check logs periodically to ensure it's running successfully.

## 🎯 Your New Workflow

### Weekly Setup (5 minutes):
1. **Update environment variables** in Netlify:
   - New `MONITOR_URL` 
   - New Datawrapper URLs for all positions
2. **Done!** System runs automatically

### When Function Finds Changes:
1. **Function scrapes and updates rankings.json automatically**
2. **You get notification with new timestamp**
3. **Update `LAST_STORED_TIMESTAMP`** environment variable (30 seconds)

### If You Forget to Update Timestamp:
- ✅ **No problem!** FLEX check prevents unnecessary work
- ✅ **System continues working efficiently**
- ✅ **No errors or duplicate data**

## 🔧 Troubleshooting

### Function Not Running:
- Check Netlify Functions tab for errors
- Verify environment variables are set
- Check function logs

### No Data Scraped:
- Test individual Datawrapper URLs manually
- Check if URLs are still valid
- Verify FLEX_URLS is set correctly

### Function Times Out:
- Netlify functions have 10-second limit for scheduled functions
- If scraping takes too long, we may need optimization

## 🎉 Success Indicators

✅ Function appears in Netlify Functions dashboard  
✅ Function runs hourly (check logs)  
✅ FLEX change detection works (prevents unnecessary scraping)  
✅ Rankings.json gets updated when real changes occur  
✅ You only need to update timestamp when changes happen  

## 📱 Monitoring

### Daily:
- Check if rankings.json was updated (if Boone posted new rankings)

### Weekly:
- Update environment variables with new URLs
- Update timestamp if function found changes

### Monthly:
- Review function logs for any issues
- Verify everything is working smoothly

**Your rankings will now update automatically in the cloud!** 🎉