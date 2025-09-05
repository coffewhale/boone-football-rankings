# Justin Boone Fantasy Football Rankings Monitor

A clean web app that displays Justin Boone's fantasy football rankings with **automatic monitoring** that alerts you when he updates his Yahoo Sports articles.

## 🏈 Live Site

**[View Current Rankings](https://boonerankings.com)**

## Features

- **📊 All Positions**: QB, RB, WR, TE, FLEX, DEF, K rankings
- **🔍 Smart Monitoring**: Hourly timestamp checks during active hours (6 AM - 6 PM ET)
- **📧 Email Alerts**: Get notified immediately when Boone updates rankings
- **📝 Easy Updates**: Simple copy/paste interface for new rankings
- **📱 Mobile Responsive**: Works perfectly on all devices
- **⚡ Fast Loading**: Efficient static site performance

## Tech Stack

- **Frontend**: Static HTML/CSS/JavaScript
- **Monitoring**: Node.js serverless functions
- **Hosting**: Netlify with scheduled functions
- **Notifications**: Email via Netlify Forms (free)

## How It Works

1. **Set Weekly URL**: Enter the QB rankings URL to monitor in admin panel
2. **Automatic Monitoring**: System checks every hour (6 AM - 6 PM ET) for timestamp changes
3. **Email Alert**: You get notified when Boone updates his rankings
4. **Manual Update**: Copy/paste new rankings using the admin interface
5. **Live Site**: Your fans see the updated rankings immediately

## For Site Owner

### Setup
1. Deploy to Netlify
2. Add `ADMIN_EMAIL=your-email@example.com` to environment variables
3. Go to `/rankings-entry.html` to set weekly URL and manage rankings

### Weekly Workflow
1. System automatically monitors your set URL
2. Get email when Boone updates → Copy new rankings → Paste in admin panel → Done!

---

*This site is not affiliated with Yahoo Sports or Justin Boone. Rankings data is sourced from publicly available Yahoo Sports articles.*