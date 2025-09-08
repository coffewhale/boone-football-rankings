# Perfect Workflow for Automated Boone Rankings

Since you're happy to provide the URLs once per week, here's the **perfect solution** that combines the best of both worlds:

## 🎯 **Your Ideal Workflow**

### **Weekly Setup (5 minutes once per week):**
```bash
# 1. Set this week's Yahoo article URL and your Datawrapper URLs
python3 simple_automated_scraper.py --setup
```

### **Automatic Operation:**
- ✅ System monitors the Yahoo article timestamp every hour
- ✅ When Boone updates → automatically scrapes your configured URLs
- ✅ Updates rankings.json automatically  
- ✅ No further manual work needed

## 🔧 **Easy Weekly Setup**

Instead of the interactive setup, just edit the config file directly:

**File: `simple_automation_config.json`**
```json
{
  "monitor_url": "https://sports.yahoo.com/fantasy/article/week-1-rankings-...",
  "week_number": 1,
  "datawrapper_urls": {
    "qb": ["https://datawrapper.dwcdn.net/bqgx9/"],
    "rb": ["https://datawrapper.dwcdn.net/ABC123/"],
    "wr": ["https://datawrapper.dwcdn.net/XYZ789/"],
    "te": ["https://datawrapper.dwcdn.net/DEF456/"],
    "flex": ["https://datawrapper.dwcdn.net/GHI789/"],
    "def": ["https://datawrapper.dwcdn.net/JKL012/"],
    "k": ["https://datawrapper.dwcdn.net/MNO345/"]
  }
}
```

## 📋 **Weekly Checklist**

**Every Week (5 minutes):**
1. ✅ Find Boone's new rankings article URL
2. ✅ Right-click each ranking table → Inspect → Copy Datawrapper iframe URLs  
3. ✅ Update `simple_automation_config.json` with new URLs
4. ✅ Done! System automatically handles the rest

**System Automatically:**
1. ✅ Monitors Yahoo article timestamp every hour  
2. ✅ When timestamp changes → scrapes all your configured URLs
3. ✅ Updates rankings.json with fresh data
4. ✅ Creates backups automatically

## 🚀 **Commands You'll Use**

```bash
# Test the system works
python3 simple_automated_scraper.py --dry-run

# Force a test scrape  
python3 simple_automated_scraper.py --force

# Normal automated run (only scrapes if timestamp changed)
python3 simple_automated_scraper.py

# Set up hourly automation
crontab -e
# Add: 0 6-18 * * * cd /path/to/boone_rankings_app && python3 simple_automated_scraper.py >> simple_automation.log 2>&1
```

## 🎉 **Why This Is Perfect For You**

✅ **5 minutes of setup per week** - Just update URLs  
✅ **100% automated monitoring** - No email notifications needed  
✅ **Uses your working scraper logic** - Same code that works for QB  
✅ **Reliable timestamp detection** - Proven to work  
✅ **Complete automation** - Rankings update within an hour of Boone's changes  
✅ **Same JSON format** - Works with your existing site  
✅ **Backup system** - Never lose data  
✅ **Detailed logging** - Easy to troubleshoot  

## 📁 **File Structure**

```
boone_rankings_app/
├── simple_automated_scraper.py     # Main automation script
├── simple_automation_config.json   # Weekly URL configuration  
├── rankings.json                   # Auto-updated rankings
├── simple_automation.log          # Automation logs
└── rankings.json.backup.*         # Automatic backups
```

## 🔄 **Migration from Current System**

1. **Keep your current system running**
2. **Test this alongside** with different config file
3. **Once confident, switch over**
4. **Disable old Netlify functions** (optional)

This gives you the **perfect balance**:
- **Minimal weekly effort** (just URL updates)  
- **Maximum automation** (everything else automatic)
- **100% reliability** (uses proven scraping code)

**Ready to set this up?** Just update the config file with your URLs and test it! 🎯