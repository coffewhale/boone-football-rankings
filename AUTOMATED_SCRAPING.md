# Automated Scraping System for Justin Boone Rankings

This system automates the scraping of fantasy football rankings from Justin Boone's articles, replacing the manual copy-paste process.

## Quick Start

### Option 1: Use the Update Script (Recommended)
```bash
./update_rankings.sh
```
This will run the scraper interactively and optionally commit/push changes.

### Option 2: Interactive Python Script
```bash
python3 weekly_scraper.py
```
Enter URLs when prompted for each position.

### Option 3: Command Line with URLs
```bash
python3 weekly_scraper.py \
  --qb "https://datawrapper.dwcdn.net/bqgx9/" \
  --rb "https://datawrapper.dwcdn.net/ABC123/" \
  --wr "https://datawrapper.dwcdn.net/XYZ789/"
```

## How It Works

1. **Find the Datawrapper URLs**: In Boone's Yahoo articles, right-click on the rankings tables and "Inspect Element" to find the iframe src URLs
2. **Run the scraper**: Provide URLs for each position you want to update
3. **Generate rankings.json**: The script automatically creates the properly formatted JSON
4. **Deploy**: Commit and push changes to update your site

## Weekly Workflow

1. **Get notification** that Boone updated rankings
2. **Find Datawrapper URLs** from the new article:
   - Open the article
   - Right-click on each rankings table → Inspect Element
   - Look for `<iframe src="https://datawrapper.dwcdn.net/XXXXX/">`
   - Copy these URLs
3. **Run the update script**: `./update_rankings.sh`
4. **Enter URLs** when prompted (one per position)
5. **Review and deploy** the generated rankings.json

## Files

- `weekly_scraper.py` - Main scraper script
- `update_rankings.sh` - Convenient update script
- `boon.py` - Original QB-only scraper (can be removed)
- `automated_scraper.py` - More complex version (optional)
- `scraper_config.json` - Configuration file (optional)

## URL Format

Datawrapper URLs typically look like:
```
https://datawrapper.dwcdn.net/bqgx9/
https://datawrapper.dwcdn.net/ABCD1/  
https://datawrapper.dwcdn.net/XYZ23/
```

The important part is the ID after the last slash (e.g., `bqgx9`).

## Position Mapping

The scraper expects these position keys:
- `qb` - Quarterbacks  
- `rb` - Running Backs
- `wr` - Wide Receivers
- `te` - Tight Ends
- `flex` - FLEX rankings
- `def` - Defense/ST
- `k` - Kickers

## Troubleshooting

### No data scraped
- Check that the URL is correct and accessible
- Make sure it's a Datawrapper iframe URL, not the Yahoo article URL
- Try running with `--headless` flag removed to see browser

### Missing dependencies
```bash
pip3 install playwright pandas
playwright install chromium
```

### Script won't run
```bash
chmod +x update_rankings.sh
```

## Backup System

The scraper automatically creates backups of your existing `rankings.json` with timestamps:
- `rankings.json.backup.20250908_143022`

## Integration with Existing System

This system generates the exact same `rankings.json` format as your manual process, so:
- Your monitoring system continues to work
- Your website display code doesn't change
- Your analysis tools still work

The only change is how the data gets into `rankings.json` - now automated instead of manual!