#!/usr/bin/env python3
"""
Debug tool to see what's in the Yahoo article and help troubleshoot URL discovery
"""

import requests
from bs4 import BeautifulSoup
import re

def debug_yahoo_article(url):
    """Debug what's in the Yahoo article"""
    
    print(f"🔍 Debugging Yahoo article: {url}")
    print("=" * 80)
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        print("✅ Successfully loaded article")
        print(f"📄 Page title: {soup.title.string if soup.title else 'No title found'}")
        print()
        
        # Look for iframes
        print("🔍 Looking for iframes...")
        iframes = soup.find_all('iframe')
        print(f"Found {len(iframes)} iframe elements:")
        
        for i, iframe in enumerate(iframes):
            src = iframe.get('src', 'No src')
            print(f"  {i+1}. {src}")
            
            # Check if it's datawrapper
            if 'datawrapper' in src.lower():
                print(f"     ✅ DATAWRAPPER FOUND!")
            elif 'chart' in src.lower() or 'embed' in src.lower():
                print(f"     🤔 Possible chart/embed")
        print()
        
        # Look for any datawrapper mentions in the HTML
        print("🔍 Searching for 'datawrapper' in page source...")
        datawrapper_mentions = soup.find_all(string=re.compile(r'datawrapper', re.IGNORECASE))
        if datawrapper_mentions:
            print(f"Found {len(datawrapper_mentions)} mentions of 'datawrapper'")
            for mention in datawrapper_mentions[:5]:  # Show first 5
                print(f"  - {mention.strip()[:100]}...")
        else:
            print("❌ No 'datawrapper' text found anywhere in page")
        print()
        
        # Look for any embed or chart related content
        print("🔍 Looking for other embed/chart patterns...")
        
        # Check for script tags that might load charts dynamically
        scripts = soup.find_all('script')
        chart_scripts = []
        for script in scripts:
            if script.string:
                if any(keyword in script.string.lower() for keyword in ['chart', 'embed', 'datawrapper', 'visualization']):
                    chart_scripts.append(script.string[:200] + "..." if len(script.string) > 200 else script.string)
        
        if chart_scripts:
            print(f"Found {len(chart_scripts)} potentially relevant scripts:")
            for i, script in enumerate(chart_scripts[:3]):  # Show first 3
                print(f"  Script {i+1}: {script}")
        else:
            print("❌ No chart-related scripts found")
        print()
        
        # Look for any elements with chart/ranking related classes or IDs
        print("🔍 Looking for ranking/chart related elements...")
        
        ranking_elements = soup.find_all(attrs={
            'class': re.compile(r'(ranking|chart|embed|table)', re.IGNORECASE)
        })
        
        if ranking_elements:
            print(f"Found {len(ranking_elements)} elements with ranking/chart classes:")
            for elem in ranking_elements[:5]:
                print(f"  - {elem.name}: class='{elem.get('class')}' id='{elem.get('id')}'")
        else:
            print("❌ No obvious ranking/chart elements found")
        print()
        
        # Look for tables
        tables = soup.find_all('table')
        if tables:
            print(f"📊 Found {len(tables)} table elements:")
            for i, table in enumerate(tables):
                rows = table.find_all('tr')
                print(f"  Table {i+1}: {len(rows)} rows")
                if rows:
                    first_row_text = rows[0].get_text().strip()[:100]
                    print(f"    First row: {first_row_text}...")
        else:
            print("❌ No HTML tables found")
        print()
        
        # Check if this might be a JavaScript-heavy page
        print("🔍 Checking if content might be loaded dynamically...")
        
        # Look for common JS framework indicators
        js_indicators = ['react', 'vue', 'angular', 'ember', 'backbone']
        found_frameworks = []
        
        page_text = response.text.lower()
        for framework in js_indicators:
            if framework in page_text:
                found_frameworks.append(framework)
        
        if found_frameworks:
            print(f"⚠️  Detected JS frameworks: {', '.join(found_frameworks)}")
            print("   This suggests content might be loaded dynamically")
            print("   The scraper might need to use a browser (Playwright) instead of requests")
        else:
            print("✅ No major JS frameworks detected - static content likely")
        
        print()
        print("🎯 RECOMMENDATIONS:")
        print("=" * 40)
        
        if not iframes and not datawrapper_mentions:
            print("❌ This article doesn't appear to contain Datawrapper rankings")
            print("   Possible solutions:")
            print("   1. Double-check this is the correct article URL")
            print("   2. Look for a different Boone rankings article")
            print("   3. The rankings might be in a different format (not Datawrapper)")
        elif found_frameworks:
            print("⚠️  Content appears to be loaded dynamically")
            print("   The scraper may need browser automation to see the iframes")
        else:
            print("🤔 Investigate the script tags and embed elements above")
        
    except Exception as e:
        print(f"❌ Error loading article: {e}")

if __name__ == "__main__":
    # Read URL from config
    try:
        import json
        with open('automation_config.json', 'r') as f:
            config = json.load(f)
        url = config.get('monitor_url')
        
        if url and 'https://' in url:
            debug_yahoo_article(url)
        else:
            print("❌ No valid URL found in automation_config.json")
            print("Current URL:", url)
            
    except Exception as e:
        print(f"❌ Error reading config: {e}")
        print("Please run: python3 debug_url_discovery.py")