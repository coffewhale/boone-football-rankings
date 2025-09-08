#!/bin/bash

# Update Rankings Script
# Simple script to run the weekly scraper and deploy changes

echo "🏈 Justin Boone Rankings Update Script"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "weekly_scraper.py" ]; then
    echo "❌ Error: weekly_scraper.py not found. Make sure you're in the correct directory."
    exit 1
fi

# Check if Python dependencies are installed
echo "📋 Checking dependencies..."
python3 -c "import playwright; print('✅ Playwright installed')" 2>/dev/null || {
    echo "❌ Playwright not found. Installing..."
    pip3 install playwright pandas
    playwright install chromium
}

# Run the scraper
echo ""
echo "🔄 Starting rankings scraper..."
python3 weekly_scraper.py

# Check if rankings.json was updated
if [ -f "rankings.json" ]; then
    echo ""
    echo "✅ Rankings updated successfully!"
    
    # Ask user if they want to commit changes
    echo ""
    read -p "Do you want to commit and push changes? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Get current week number
        read -p "Enter week number for commit message: " week_num
        
        # Commit changes
        git add rankings.json
        git commit -m "Update Week $week_num rankings - $(date '+%Y-%m-%d %H:%M')"
        
        echo ""
        read -p "Push to remote repository? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git push
            echo "🚀 Rankings deployed!"
            echo ""
            echo "Don't forget to:"
            echo "1. Update LAST_STORED_TIMESTAMP environment variable in Netlify"
            echo "2. Check that the site updated correctly"
        else
            echo "📝 Changes committed locally. Push manually when ready."
        fi
    else
        echo "📄 Rankings.json updated but not committed. Review changes manually."
    fi
else
    echo "❌ Rankings.json not found. Scraping may have failed."
fi

echo ""
echo "✨ Update process complete!"