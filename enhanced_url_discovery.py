#!/usr/bin/env python3
"""
Enhanced URL discovery using Playwright to handle JavaScript-loaded content
"""

from playwright.sync_api import sync_playwright
import re
import time
import json

def discover_datawrapper_urls_with_browser(url):
    """Use browser automation to discover Datawrapper URLs from JavaScript-heavy pages"""
    
    print(f"🌐 Loading Yahoo article with browser automation...")
    print(f"🔗 URL: {url}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Visible browser for debugging
        page = browser.new_page()
        
        try:
            print("⏳ Loading page...")
            response = page.goto(url, timeout=30000)
            print(f"✅ Page loaded (status: {response.status})")
            
            # Wait for page to fully load
            print("⏳ Waiting for content to load...")
            page.wait_for_load_state('networkidle', timeout=15000)
            time.sleep(5)  # Additional wait for dynamic content
            
            print("🔍 Searching for iframes...")
            
            # Look for iframes
            iframes = page.locator('iframe').all()
            print(f"Found {len(iframes)} iframe elements")
            
            datawrapper_urls = []
            
            for i, iframe in enumerate(iframes):
                try:
                    src = iframe.get_attribute('src')
                    if src:
                        print(f"  Iframe {i+1}: {src}")
                        
                        if 'datawrapper' in src.lower():
                            # Ensure full URL
                            if not src.startswith('http'):
                                src = 'https:' + src if src.startswith('//') else 'https://' + src
                            datawrapper_urls.append(src)
                            print(f"    ✅ DATAWRAPPER URL FOUND!")
                        else:
                            print(f"    ❌ Not a Datawrapper URL")
                except Exception as e:
                    print(f"    ⚠️  Error getting iframe src: {e}")
            
            if not datawrapper_urls:
                print("\n🔍 No iframes found, checking page source for datawrapper URLs...")
                
                # Get page content and search for datawrapper URLs in JavaScript
                content = page.content()
                
                # Look for datawrapper URLs in the page source
                datawrapper_pattern = r'https?://(?:www\.)?datawrapper\.dwcdn\.net/[a-zA-Z0-9]+/?'
                matches = re.findall(datawrapper_pattern, content)
                
                if matches:
                    print(f"Found {len(matches)} Datawrapper URLs in page source:")
                    for match in matches:
                        if match not in datawrapper_urls:
                            datawrapper_urls.append(match)
                            print(f"  ✅ {match}")
                else:
                    print("❌ No Datawrapper URLs found in page source")
            
            print(f"\n📊 SUMMARY:")
            print(f"Found {len(datawrapper_urls)} Datawrapper URLs total:")
            for url in datawrapper_urls:
                print(f"  - {url}")
            
            return datawrapper_urls
            
        except Exception as e:
            print(f"❌ Error loading page: {e}")
            return []
            
        finally:
            input("Press Enter to close browser...")
            browser.close()

def test_discovered_urls(urls):
    """Test each discovered URL to see what it contains"""
    
    if not urls:
        print("❌ No URLs to test")
        return
    
    print(f"\n🧪 Testing {len(urls)} discovered URLs...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        for i, url in enumerate(urls):
            print(f"\n📊 Testing URL {i+1}: {url}")
            
            page = browser.new_page()
            try:
                response = page.goto(url, timeout=15000)
                print(f"  Status: {response.status}")
                
                # Wait for table to load
                page.wait_for_selector('table', timeout=10000)
                
                # Get first few rows to identify content
                rows = page.locator('tbody tr').all()
                print(f"  Found {len(rows)} data rows")
                
                if rows and len(rows) > 0:
                    # Get first player name
                    first_row = rows[0]
                    cells = first_row.locator('td').all()
                    
                    if cells and len(cells) > 0:
                        player_text = cells[0].inner_text().strip()
                        print(f"  First player: {player_text}")
                        
                        # Try to guess position
                        position = guess_position_from_player(player_text)
                        print(f"  Likely position: {position}")
                    else:
                        print("  ❌ No player data found")
                else:
                    print("  ❌ No table rows found")
                    
            except Exception as e:
                print(f"  ❌ Error testing URL: {e}")
            finally:
                page.close()
        
        browser.close()

def guess_position_from_player(player_name):
    """Guess position based on player name"""
    qb_names = ['Jackson', 'Allen', 'Mahomes', 'Hurts', 'Burrow', 'Herbert', 'Murray']
    rb_names = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Barkley', 'Robinson', 'Gibbs']
    wr_names = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans', 'Brown', 'Lamb']
    te_names = ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Hockenson', 'LaPorta']
    def_names = ['49ers', 'Bills', 'Ravens', 'Steelers', 'Cowboys', 'Eagles']
    k_names = ['Tucker', 'Butker', 'Bass', 'McManus', 'Elliott']
    
    player_upper = player_name.upper()
    
    for name in qb_names:
        if name.upper() in player_upper:
            return 'QB'
    for name in rb_names:
        if name.upper() in player_upper:
            return 'RB'
    for name in wr_names:
        if name.upper() in player_upper:
            return 'WR'
    for name in te_names:
        if name.upper() in player_upper:
            return 'TE'
    for name in def_names:
        if name.upper() in player_upper:
            return 'DEF'
    for name in k_names:
        if name.upper() in player_upper:
            return 'K'
    
    return 'UNKNOWN'

def main():
    try:
        # Load URL from config
        with open('automation_config.json', 'r') as f:
            config = json.load(f)
        
        url = config.get('monitor_url')
        
        if not url or 'https://' not in url:
            print("❌ No valid URL found in automation_config.json")
            return
        
        # Discover URLs
        discovered_urls = discover_datawrapper_urls_with_browser(url)
        
        if discovered_urls:
            print(f"\n🎉 SUCCESS! Found {len(discovered_urls)} Datawrapper URLs")
            
            # Test the URLs
            test_discovered_urls(discovered_urls)
            
            # Save results
            results = {
                'discovered_urls': discovered_urls,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            
            with open('discovered_urls.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            print(f"\n📄 Results saved to discovered_urls.json")
        else:
            print("\n❌ No Datawrapper URLs found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()