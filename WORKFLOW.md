# Justin Boone Rankings Update Workflow

This document outlines the complete workflow for monitoring and updating Justin Boone's fantasy football rankings on your site.

## Overview

Your site automatically monitors Boone's rankings and sends email notifications when updates are detected. When you receive a notification, follow this workflow to update your site with the latest rankings.

## Initial Setup

### 1. Environment Variables (Netlify)
Set these in your Netlify site settings:

- **`LAST_STORED_TIMESTAMP`**: Current timestamp from Boone's article (e.g., `2025-09-04T23:46:25.000Z`)
- **`MONITOR_URL`**: URL to monitor (optional, can use rankings-entry.html interface)
- **`MONITOR_WEEK`**: Current NFL week number
- **`ADMIN_EMAIL`**: Your email for notifications

### 2. Monitoring System
- Runs automatically every hour (6 AM - 6 PM ET only)
- Compares current article timestamp with `LAST_STORED_TIMESTAMP`
- Sends email notifications when timestamps don't match

## Weekly Update Workflow

### Step 1: Receive Notification
When Boone updates his rankings, you'll receive an email with:
- Update timestamp
- Week number
- Link to the article

### Step 2: Update Rankings
1. **Open the rankings entry tool**: `rankings-entry.html` in your browser
2. **Copy rankings from Yahoo Sports** for each position
3. **Paste into the appropriate text areas** (one player per line)
   - Format: `Player Name vs OPP` or `Player Name @ OPP`
   - Example: `Josh Allen vs ARI`
4. **Click "Generate JSON"** button
5. **Copy the generated JSON output**

### Step 3: Save Weekly Snapshot (NEW)
1. **Before updating rankings.json**, save the current data as a snapshot:
   ```bash
   node -e "require('./snapshot-utility').saveWeeklySnapshot([WEEK_NUMBER])"
   ```
   Replace `[WEEK_NUMBER]` with the current NFL week (e.g., 1, 2, 3...)

### Step 4: Update Site Files
1. **Open `rankings.json`** in your code editor
2. **Replace entire contents** with the copied JSON
3. **Save the file**

### Step 5: Update Environment Variable
1. **Go to Netlify site settings** → Environment Variables
2. **Update `LAST_STORED_TIMESTAMP`** with the new timestamp from the notification
3. **Save and redeploy**

### Step 6: Deploy Changes
```bash
git add rankings.json
git commit -m "Update Week X rankings - [timestamp]"
git push
```

Your site will automatically update within a few minutes.

## File Structure

```
├── rankings.json           # Main rankings data (update this)
├── rankings-entry.html     # Rankings entry tool
├── script.js              # Site logic (reads rankings.json)
├── index.html             # Main site
├── analysis.html          # NEW: Performance analysis page
├── snapshot-utility.js    # NEW: Weekly snapshot management
├── analysis-utils.js      # NEW: Data analysis and CSV export
├── data/                  # NEW: Historical data storage
│   ├── snapshots/
│   │   └── 2025/          # Weekly snapshots by year
│   ├── analysis/          # Analysis results
│   └── archive.json       # Snapshot metadata
└── netlify/functions/     # Monitoring functions
    ├── hourly-monitor.js     # Automatic monitoring
    ├── get-timestamp.js      # Provides timestamp to frontend
    └── send-notification.js  # Email notifications
```

## Monitoring Features

### Automatic Monitoring
- **Frequency**: Every hour during active hours (6 AM - 6 PM ET)
- **What it checks**: Article timestamp on Boone's Yahoo Sports page
- **Notifications**: Email sent when timestamp changes

### Manual Monitoring
Use the rankings entry tool (`rankings-entry.html`) to:
- Set weekly monitoring URL
- Check for updates manually
- Get instant status updates

## Troubleshooting

### Not Receiving Email Notifications
1. Check that `LAST_STORED_TIMESTAMP` is set correctly
2. Verify monitoring is active (check function logs)
3. Ensure email settings are configured in Netlify

### Site Not Updating
1. Confirm `rankings.json` was updated and pushed
2. Check that timestamp in `LAST_STORED_TIMESTAMP` matches current article
3. Force refresh your browser (Cmd/Ctrl + Shift + R)

### Monitoring Says "Update Needed" But Rankings Are Current
1. Update `LAST_STORED_TIMESTAMP` to match current article timestamp
2. This will stop false positive notifications

## Tips

- **Monitor during active hours**: Boone typically updates between 6 AM - 6 PM ET
- **Check timestamps carefully**: Use exact format from Yahoo's datetime attribute
- **Keep `LAST_STORED_TIMESTAMP` current**: This prevents spam emails
- **Use rankings entry tool**: It handles formatting and JSON generation automatically

## Format Examples

### Player Entry Format
```
Josh Allen vs ARI
Lamar Jackson @ KC
Patrick Mahomes vs CIN
```

### FLEX Format (with position ranks)
```
Christian McCaffrey RB1 vs GB
Ja'Marr Chase WR1 @ KC
Tyler Lockett WR69 @ DEN
```

### Timestamp Format
```
2025-09-04T23:46:25.000Z
```

## NEW: Performance Analysis Features

### Weekly Snapshots
- **Purpose**: Store each week's rankings before updating for later analysis
- **Storage**: Automatically organized by year and week in `data/snapshots/`
- **Usage**: Run snapshot command before updating `rankings.json`

### Analysis Page
- **URL**: `analysis.html` (visit after deploying)
- **Features**: View historical snapshots, compare weekly changes
- **Future**: Will include accuracy analysis when final results are integrated

### CSV Export (Coming Soon)
- Export weekly rankings for external analysis
- Compare week-to-week player movement
- Generate season-long performance reports

### Integration with Final Results (Future Phase)
When you're ready to add final results analysis:
1. Create `final-results.json` with actual game performance data
2. Use `analysis-utils.js` to calculate accuracy metrics
3. Generate reports comparing Boone's predictions to actual outcomes

This enhanced workflow maintains your current process while building the foundation for comprehensive performance analysis.