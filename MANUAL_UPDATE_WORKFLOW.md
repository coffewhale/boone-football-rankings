# Manual Rankings Update Workflow

## Overview
This document outlines the process for manually updating the Boone Rankings app after automatic updates have been disabled.

## Prerequisites
- Node.js installed locally
- Git configured with push access to the repository
- Access to update source data in `all_rankings_combined.json`

## Workflow Steps

### 1. Update Source Data
Edit `all_rankings_combined.json` with the latest rankings data in the following format:

```json
{
  "rankings": {
    "QB": [
      {"rank": 1, "name": "Lamar Jackson", "opponent": "vs DET"},
      {"rank": 2, "name": "Josh Allen", "opponent": "vs MIA"},
      ...
    ],
    "RB": [...],
    "WR": [...],
    "TE": [...],
    "FLEX": [...],
    "K": [...],
    "DST": [
      {"rank": 1, "name": "Denver Broncos", "opponent": "vs. CIN"},
      ...
    ]
  },
  "summary": {
    "total_players": 426,
    "position_counts": {
      "QB": 32,
      "RB": 60,
      "WR": 90,
      "TE": 30,
      "FLEX": 150,
      "K": 32,
      "DST": 32
    }
  }
}
```

### 2. Run the Conversion Script
Convert the source data to the website format:

```bash
node manual-update-rankings.js
```

This script will:
- Read `all_rankings_combined.json`
- Transform it to the correct format (removing opponent data for non-defense positions)
- Create a backup of the existing `rankings.json`
- Update `rankings.json` with the new data
- Update the timestamp

Expected output:
```
🚀 Starting manual rankings update...
📊 Found XXX total players
✅ rankings.json updated successfully!
```

### 3. Verify the Update
Check that the format is correct:

```bash
# View first few entries
head -50 rankings.json

# Check the timestamp and week number
grep -E "lastUpdated|week" rankings.json
```

### 4. Commit and Push Changes
```bash
git add rankings.json
git commit -m "Manual update Week X rankings - XXX players"
git push origin main
```

### 5. Verify Deployment
- Check Netlify dashboard for deployment status
- Visit the live site to confirm updates are showing
- Clear browser cache if needed (Cmd+Shift+R or Ctrl+Shift+R)

## File Structure

| File | Purpose |
|------|---------|
| `all_rankings_combined.json` | Source data file (you edit this) |
| `rankings.json` | Production data file (auto-generated, used by website) |
| `manual-update-rankings.js` | Conversion script |
| `rankings.backup.*.json` | Automatic backups (created by script) |

## Important Notes

### Disabled Automatic Updates
The following have been disabled to prevent automatic overwrites:
- ❌ `working-timestamp-updater` scheduled function (commented out in `netlify.toml`)
- ❌ `working-timestamp-updater.js` function file (deleted)

### Data Format Rules
- **Defense (DEF)**: Include `opponent` field
- **All other positions**: Do NOT include `opponent` field
- **Week number**: Update manually in the script or `rankings.json`
- **Timestamp**: Automatically updated by the script

### Backup Files
The script automatically creates backups with timestamp:
- Format: `rankings.backup.[timestamp].json`
- Consider cleaning up old backups periodically
- Keep at least 2-3 recent backups for safety

## Troubleshooting

### Updates Not Showing on Website
1. Check Netlify deployment status
2. Clear browser cache
3. Check browser console for errors
4. Verify `rankings.json` format is correct

### Script Errors
1. Ensure `all_rankings_combined.json` is valid JSON
2. Check Node.js is installed: `node --version`
3. Verify file permissions

### Git Push Issues
1. Ensure you have push access to the repository
2. Pull latest changes first: `git pull origin main`
3. Resolve any merge conflicts

## Quick Reference Commands

```bash
# Full update process
node manual-update-rankings.js
git add rankings.json
git commit -m "Manual update Week X rankings"
git push origin main

# Check current rankings
cat rankings.json | jq '.week, .lastUpdated'

# List backup files
ls -la rankings.backup.*

# Clean up old backups (keep last 3)
ls -t rankings.backup.* | tail -n +4 | xargs rm -f
```

## Contact
For issues with the manual update process, check:
- GitHub repository issues
- Netlify deployment logs
- Browser console for client-side errors