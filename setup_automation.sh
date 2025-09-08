#!/bin/bash

# Setup script for fully automated Boone rankings scraper

echo "🤖 Setting up Fully Automated Boone Rankings Scraper"
echo "====================================================="

# Get the absolute path of the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "📂 Script directory: $SCRIPT_DIR"

# Check dependencies
echo ""
echo "📋 Checking dependencies..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3."
    exit 1
fi
echo "✅ Python 3 found"

# Check pip packages
python3 -c "import requests, bs4, playwright; print('✅ All Python packages available')" 2>/dev/null || {
    echo "📦 Installing missing Python packages..."
    pip3 install requests beautifulsoup4 playwright
    playwright install chromium
}

# Make scripts executable
echo ""
echo "🔧 Setting up scripts..."
chmod +x "$SCRIPT_DIR/fully_automated_scraper.py"
chmod +x "$SCRIPT_DIR/setup_automation.sh"

# Ask for Yahoo article URL
echo ""
echo "🔗 Setup Configuration"
read -p "Enter the Yahoo article URL for this week: " yahoo_url

if [ -z "$yahoo_url" ]; then
    echo "❌ No URL provided. You can set it later in automation_config.json"
else
    # Update config file
    python3 -c "
import json
try:
    with open('$SCRIPT_DIR/automation_config.json', 'r') as f:
        config = json.load(f)
    config['monitor_url'] = '$yahoo_url'
    with open('$SCRIPT_DIR/automation_config.json', 'w') as f:
        json.dump(config, f, indent=2)
    print('✅ Updated automation_config.json with URL')
except Exception as e:
    print(f'❌ Error updating config: {e}')
"
fi

# Test the scraper
echo ""
echo "🧪 Testing the scraper..."
read -p "Run a test scrape? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd "$SCRIPT_DIR"
    python3 fully_automated_scraper.py --dry-run
fi

# Setup cron job
echo ""
echo "⏰ Cron Job Setup"
echo "The scraper can run automatically every hour during active hours (6 AM - 6 PM ET)"

read -p "Set up automatic cron job? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Create cron job
    CRON_JOB="0 6-18 * * * cd $SCRIPT_DIR && python3 fully_automated_scraper.py >> automation.log 2>&1"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    
    echo "✅ Cron job added!"
    echo "📅 Will run every hour from 6 AM to 6 PM ET"
    echo "📝 Logs will be written to automation.log"
    echo ""
    echo "To view current cron jobs: crontab -l"
    echo "To remove the cron job: crontab -e (then delete the line)"
else
    echo "📝 Manual cron job setup:"
    echo "Run: crontab -e"
    echo "Add: 0 6-18 * * * cd $SCRIPT_DIR && python3 fully_automated_scraper.py >> automation.log 2>&1"
fi

# Summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📁 Files created/updated:"
echo "   - fully_automated_scraper.py (main scraper)"
echo "   - automation_config.json (configuration)"
echo "   - automation.log (will contain logs)"
echo ""
echo "🔧 Usage:"
echo "   - Test: python3 fully_automated_scraper.py --dry-run"
echo "   - Force scrape: python3 fully_automated_scraper.py --force" 
echo "   - Normal run: python3 fully_automated_scraper.py"
echo ""
echo "📊 Monitoring:"
echo "   - Check logs: tail -f automation.log"
echo "   - Check cron: crontab -l"
echo ""
echo "🔄 Weekly setup:"
echo "   1. Update automation_config.json with new Yahoo URL"
echo "   2. The system will automatically detect changes and scrape"
echo ""
echo "✨ Your rankings will now update automatically!"