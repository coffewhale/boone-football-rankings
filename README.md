# Justin Boone Fantasy Football Rankings

A simple, clean web app that displays Justin Boone's current fantasy football rankings from Yahoo Sports.

## 🏈 Live Site

**[View Current Rankings](https://your-site-name.netlify.app)** *(update after deployment)*

## Features

- **All Positions**: QB, RB, WR, TE, FLEX, DEF, K rankings
- **Auto-Updates**: Refreshes every 6 hours when new rankings are published
- **Smart Scraping**: Only updates when Justin publishes new content
- **Clean Design**: Focused on essential ranking data (Rank, Player, Opponent)
- **Mobile Responsive**: Works perfectly on all devices
- **Fast Loading**: Efficient caching system

## Tech Stack

- **Frontend**: Static HTML/CSS/JavaScript
- **Scraper**: Python with BeautifulSoup
- **Hosting**: Netlify with scheduled functions
- **Deployment**: Auto-deploy from GitHub

## How It Works

1. **Smart Timestamp Check**: Only checks if Justin has published new rankings
2. **Efficient Scraping**: Updates all 7 positions only when content changes
3. **Auto-Schedule**: Runs every 6 hours via Netlify functions
4. **Cached Data**: Serves fast responses when no updates are needed

## For Site Owner

See `DEPLOYMENT.md` for complete setup and management instructions including:
- Environment variable configuration
- Admin tools for manual updates
- Weekly maintenance tasks
- Troubleshooting guide

---

*This site is not affiliated with Yahoo Sports or Justin Boone. Rankings data is sourced from publicly available Yahoo Sports articles.*