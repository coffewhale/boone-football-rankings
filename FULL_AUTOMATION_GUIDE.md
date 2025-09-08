# Full Automation Guide for Boone Rankings

This system completely eliminates manual work. Once set up, it will:

1. ✅ **Monitor the Yahoo article timestamp automatically**
2. ✅ **Detect when Boone updates his rankings** 
3. ✅ **Automatically find all Datawrapper URLs**
4. ✅ **Scrape all position rankings**
5. ✅ **Update rankings.json**
6. ✅ **Update the stored timestamp**
7. ✅ **Run on a schedule (hourly during active hours)**

## Quick Setup

```bash
./setup_automation.sh
```

This will:
- Install dependencies
- Set up configuration  
- Test the scraper
- Optionally set up automatic cron scheduling

## Manual Setup

### 1. Install Dependencies
```bash
pip3 install requests beautifulsoup4 playwright
playwright install chromium
```

### 2. Configure the Monitor URL
Edit `automation_config.json`:
```json
{
  "monitor_url": "https://sports.yahoo.com/fantasy/article/week-X-rankings-...",
  "positions_to_scrape": ["qb", "rb", "wr", "te", "flex", "def", "k"]
}
```

### 3. Test the System
```bash
# Check if update is needed
python3 fully_automated_scraper.py --dry-run

# Force a test scrape
python3 fully_automated_scraper.py --force

# Normal run (only scrapes if timestamp changed)
python3 fully_automated_scraper.py
```

### 4. Set Up Automatic Scheduling

Add to crontab (`crontab -e`):
```bash
# Run every hour from 6 AM to 6 PM ET
0 6-18 * * * cd /path/to/boone_rankings_app && python3 fully_automated_scraper.py >> automation.log 2>&1
```

## How It Works

### Timestamp Monitoring
- Checks the Yahoo article's `<time datetime="...">` attribute
- Compares with stored timestamp in `automation_config.json`
- Only proceeds if timestamp has changed

### URL Discovery
- Scans the Yahoo article HTML for all `iframe` elements
- Finds Datawrapper URLs (`https://datawrapper.dwcdn.net/XXXXX/`)
- Intelligently categorizes URLs by position based on player names

### Automated Scraping
- Scrapes each discovered URL using Playwright
- Extracts player names, ranks, and opponents
- Generates the same JSON format as your manual process

### Smart Features
- **Backup system**: Automatically backs up existing rankings.json
- **Retry logic**: Retries failed scrapes up to 3 times
- **Position detection**: Automatically identifies QB vs RB vs WR etc.
- **Error handling**: Continues scraping other positions if one fails
- **Logging**: Detailed logs for monitoring and debugging

## Weekly Workflow

### Old Workflow:
1. Get email notification
2. Open Yahoo article  
3. Find and copy Datawrapper URLs
4. Run scraper with URLs
5. Update rankings.json
6. Commit and deploy

### New Workflow:
1. **Update the monitor URL** (once per week)
2. **Everything else happens automatically**

That's it! The system runs every hour and automatically updates when Boone publishes new rankings.

## Configuration Options

### `automation_config.json`
```json
{
  "monitor_url": "https://sports.yahoo.com/fantasy/article/...",
  "last_stored_timestamp": null,  // Auto-updated
  "positions_to_scrape": ["qb", "rb", "wr", "te", "flex", "def", "k"],
  "backup_existing": true,
  "output_file": "rankings.json",
  "scraper_settings": {
    "headless": true,       // Set to false to see browser
    "timeout": 30000,       // Page load timeout
    "max_retries": 3        // Retries per position
  }
}
```

## Command Line Options

```bash
# Normal run (only scrapes if timestamp changed)
python3 fully_automated_scraper.py

# Force scrape regardless of timestamp  
python3 fully_automated_scraper.py --force

# Check for updates without scraping
python3 fully_automated_scraper.py --dry-run

# Set monitor URL from command line
python3 fully_automated_scraper.py --monitor-url "https://sports.yahoo.com/..."
```

## Monitoring and Logs

### View Logs
```bash
# Real-time log monitoring
tail -f automation.log

# View recent logs
cat automation.log | tail -50
```

### Check Cron Status
```bash
# View scheduled jobs
crontab -l

# Check cron service (macOS)
sudo launchctl list | grep cron

# Check cron service (Linux)
systemctl status cron
```

## Integration with Existing System

This automation **replaces** your Netlify functions but maintains compatibility:

- ✅ Same `rankings.json` format
- ✅ Same backup system
- ✅ Works with your existing website
- ✅ Works with your analysis tools

You can **keep your existing monitoring** or **switch to this system**.

## Troubleshooting

### No URLs Found
- Check that the monitor URL is correct
- Verify the Yahoo article contains Datawrapper iframes
- Try running with `--force` to see detailed logs

### Scraping Fails
- Check internet connection
- Verify Datawrapper URLs are accessible
- Try running with `headless: false` to see browser

### Cron Not Running
```bash
# Check cron is running
ps aux | grep cron

# Check cron logs (macOS)
log show --predicate 'process == "cron"' --last 1h

# Check cron logs (Linux)
sudo journalctl -u cron
```

### Permission Issues
```bash
chmod +x fully_automated_scraper.py
chmod +x setup_automation.sh
```

## Advanced: Multiple Weeks/URLs

You can monitor multiple articles by running separate instances:

```bash
# Week 1
python3 fully_automated_scraper.py --config week1_config.json

# Week 2  
python3 fully_automated_scraper.py --config week2_config.json
```

## Migration from Manual System

1. **Keep your current system running**
2. **Test the automation with `--dry-run` and `--force`**
3. **Once confident, update the monitor URL weekly**
4. **Optionally disable old Netlify functions**

The beauty of this system is it produces identical output to your manual process, so there's no risk in testing it alongside your current system.

## Summary

This gives you a **completely hands-off** rankings system:

1. **Set the Yahoo URL once per week**
2. **Everything else happens automatically**
3. **Rankings update within an hour of Boone's publication**
4. **Same reliability and format as your manual process**

Perfect for busy fantasy seasons! 🏈✨