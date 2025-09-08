#!/usr/bin/env python3
"""
Fully Automated Boone Rankings Scraper

This script:
1. Checks the Yahoo article timestamp
2. If changed, automatically finds all Datawrapper URLs
3. Scrapes all position rankings
4. Updates rankings.json
5. Updates the stored timestamp
6. Can be run on a schedule (cron, etc.)
"""

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
import time
import logging
import re
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FullyAutomatedScraper:
    """Fully automated scraper that monitors timestamps and scrapes when needed"""
    
    def __init__(self, config_file: str = "automation_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.scraped_data = {}
        
    def load_config(self) -> Dict:
        """Load automation configuration"""
        default_config = {
            "monitor_url": "https://sports.yahoo.com/fantasy/article/...",
            "last_stored_timestamp": None,
            "week_number": 1,
            "positions_to_scrape": ["qb", "rb", "wr", "te", "flex", "def", "k"],
            "backup_existing": True,
            "output_file": "rankings.json",
            "scraper_settings": {
                "headless": True,
                "timeout": 30000,
                "max_retries": 3
            }
        }
        
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    loaded_config = json.load(f)
                    # Merge with defaults
                    for key, value in default_config.items():
                        if key not in loaded_config:
                            loaded_config[key] = value
                    return loaded_config
            else:
                logger.info(f"Config file {self.config_file} not found, creating with defaults")
                with open(self.config_file, 'w') as f:
                    json.dump(default_config, f, indent=2)
                return default_config
                
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return default_config
    
    def save_config(self):
        """Save current configuration"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def check_for_updates(self) -> Tuple[bool, Optional[str]]:
        """Check if the Yahoo article has been updated"""
        monitor_url = self.config.get("monitor_url")
        if not monitor_url or "..." in monitor_url:
            logger.error("Monitor URL not configured. Please set a valid Yahoo article URL.")
            return False, None
        
        try:
            logger.info(f"Checking for updates at: {monitor_url}")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(monitor_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for timestamp in various possible locations
            timestamp_selectors = [
                '.content-timestamp time',
                'time[datetime]',
                '[data-timestamp]',
                '.article-timestamp',
                '.publish-date'
            ]
            
            current_timestamp = None
            for selector in timestamp_selectors:
                element = soup.select_one(selector)
                if element:
                    current_timestamp = element.get('datetime') or element.get('data-timestamp') or element.get_text().strip()
                    if current_timestamp:
                        break
            
            if not current_timestamp:
                logger.warning("Could not find timestamp on page - page structure may have changed")
                return False, None
            
            last_stored = self.config.get("last_stored_timestamp")
            update_needed = not last_stored or current_timestamp != last_stored
            
            logger.info(f"Timestamp comparison:")
            logger.info(f"  Current: {current_timestamp}")
            logger.info(f"  Stored: {last_stored or 'None'}")
            logger.info(f"  Update needed: {'YES' if update_needed else 'NO'}")
            
            if update_needed:
                self.config["last_stored_timestamp"] = current_timestamp
                self.save_config()
            
            return update_needed, current_timestamp
            
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return False, None
    
    def discover_datawrapper_urls(self, yahoo_url: str) -> Dict[str, List[str]]:
        """Automatically discover Datawrapper URLs from Yahoo article using browser automation"""
        logger.info("Discovering Datawrapper URLs from Yahoo article...")
        
        try:
            # Use browser automation for JavaScript-heavy pages
            with sync_playwright() as p:
                settings = self.config.get("scraper_settings", {})
                headless = settings.get("headless", True)
                
                browser = p.chromium.launch(headless=headless)
                page = browser.new_page()
                
                try:
                    logger.info(f"Loading Yahoo article: {yahoo_url}")
                    response = page.goto(yahoo_url, timeout=30000)
                    
                    # Wait for content to load
                    page.wait_for_load_state('networkidle', timeout=15000)
                    time.sleep(3)  # Additional wait for dynamic content
                    
                    datawrapper_urls = []
                    
                    # Look for iframes first
                    iframes = page.locator('iframe').all()
                    logger.info(f"Found {len(iframes)} iframe elements")
                    
                    for iframe in iframes:
                        try:
                            src = iframe.get_attribute('src')
                            if src and 'datawrapper.dwcdn.net' in src:
                                if not src.startswith('http'):
                                    src = 'https:' + src if src.startswith('//') else 'https://' + src
                                datawrapper_urls.append(src)
                                logger.info(f"Found Datawrapper URL in iframe: {src}")
                        except Exception as e:
                            logger.debug(f"Error checking iframe: {e}")
                    
                    # If no iframes found, search page source
                    if not datawrapper_urls:
                        logger.info("No Datawrapper iframes found, searching page source...")
                        content = page.content()
                        
                        # Look for datawrapper URLs in the page source
                        import re
                        datawrapper_pattern = r'https?://(?:www\.)?datawrapper\.dwcdn\.net/[a-zA-Z0-9]+/?'
                        matches = re.findall(datawrapper_pattern, content)
                        
                        for match in matches:
                            if match not in datawrapper_urls:
                                datawrapper_urls.append(match)
                                logger.info(f"Found Datawrapper URL in source: {match}")
                    
                    if not datawrapper_urls:
                        logger.warning("No Datawrapper URLs found in article")
                        return {}
                    
                    # Categorize URLs by position
                    position_urls = self._categorize_datawrapper_urls(yahoo_url, datawrapper_urls)
                    
                    logger.info(f"Discovered URLs for positions: {list(position_urls.keys())}")
                    return position_urls
                    
                finally:
                    browser.close()
            
        except Exception as e:
            logger.error(f"Error discovering Datawrapper URLs: {e}")
            return {}
    
    def _categorize_datawrapper_urls(self, yahoo_url: str, urls: List[str]) -> Dict[str, List[str]]:
        """Try to categorize Datawrapper URLs by position based on surrounding content"""
        
        # For now, let's use a simple approach - test each URL and categorize by content
        position_urls = {}
        
        for url in urls:
            try:
                # Quick test scrape to see what position this might be
                position = self._identify_position_from_url(url)
                if position:
                    if position not in position_urls:
                        position_urls[position] = []
                    position_urls[position].append(url)
                    logger.info(f"Categorized {url} as {position}")
                else:
                    logger.warning(f"Could not categorize URL: {url}")
                    
            except Exception as e:
                logger.warning(f"Error categorizing URL {url}: {e}")
                continue
        
        return position_urls
    
    def _identify_position_from_url(self, url: str) -> Optional[str]:
        """Try to identify position type by quickly scraping the URL"""
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                try:
                    page.goto(url, timeout=15000)
                    page.wait_for_selector('table', timeout=10000)
                    
                    # Get first few player names to identify position
                    rows = page.locator('tbody tr').first
                    if rows.count() > 0:
                        first_cell = rows.locator('td').first
                        if first_cell.count() > 0:
                            player_text = first_cell.inner_text().strip()
                            
                            # Simple heuristics based on common player names
                            if any(qb in player_text for qb in ['Jackson', 'Allen', 'Mahomes', 'Hurts', 'Burrow']):
                                return 'qb'
                            elif any(rb in player_text for rb in ['McCaffrey', 'Henry', 'Barkley', 'Cook', 'Robinson']):
                                return 'rb'  
                            elif any(wr in player_text for wr in ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans']):
                                return 'wr'
                            elif any(te in player_text for te in ['Kelce', 'Andrews', 'Kittle', 'Waller']):
                                return 'te'
                            elif any(def_name in player_text for def_name in ['49ers', 'Bills', 'Ravens', 'Broncos']):
                                return 'def'
                            elif any(k in player_text for k in ['Tucker', 'Butker', 'Bass', 'McManus']):
                                return 'k'
                            else:
                                # Could be FLEX - check if it has position indicators
                                if 'RB' in player_text or 'WR' in player_text or 'TE' in player_text:
                                    return 'flex'
                                else:
                                    # Default to RB for unknown
                                    return 'rb'
                    
                finally:
                    browser.close()
                    
        except Exception as e:
            logger.debug(f"Error identifying position for {url}: {e}")
            
        return None
    
    def scrape_position(self, position: str, urls: List[str]) -> List[Dict]:
        """Scrape a single position from URLs"""
        logger.info(f"Scraping {position.upper()} from {len(urls)} URL(s)")
        
        settings = self.config.get("scraper_settings", {})
        max_retries = settings.get("max_retries", 3)
        
        for i, url in enumerate(urls):
            for attempt in range(max_retries):
                try:
                    logger.info(f"Attempting {position.upper()} URL {i+1}/{len(urls)}, attempt {attempt+1}")
                    rankings = self._scrape_datawrapper_url(url, position)
                    
                    if rankings:
                        logger.info(f"✅ Successfully scraped {len(rankings)} {position.upper()} players")
                        return rankings
                    else:
                        logger.warning(f"No data from {position.upper()} URL {i+1}, attempt {attempt+1}")
                        
                except Exception as e:
                    logger.warning(f"Error with {position.upper()} URL {i+1}, attempt {attempt+1}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(5)  # Wait before retry
                    continue
        
        logger.error(f"❌ Failed to scrape {position.upper()} from all URLs")
        return []
    
    def _scrape_datawrapper_url(self, url: str, position: str) -> List[Dict]:
        """Scrape a single Datawrapper URL"""
        settings = self.config.get("scraper_settings", {})
        headless = settings.get("headless", True)
        timeout = settings.get("timeout", 30000)
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            page = browser.new_page()
            
            try:
                response = page.goto(url, timeout=timeout)
                page.wait_for_selector('table', timeout=15000)
                time.sleep(3)
                
                rankings = []
                rows = page.locator('tbody tr[class*="svelte"]').all()
                
                for row in rows:
                    try:
                        ranking_data = self._extract_row_data(row, position)
                        if ranking_data:
                            rankings.append(ranking_data)
                    except Exception as e:
                        logger.debug(f"Error processing row: {e}")
                        continue
                
                return rankings
                
            finally:
                browser.close()
    
    def _extract_row_data(self, row, position: str) -> Optional[Dict]:
        """Extract data from table row"""
        try:
            # Get rank
            rank_elem = row.locator('th[class*="svelte"]').first
            rank = rank_elem.inner_text().strip() if rank_elem.count() > 0 else ""
            
            # Get data cells
            td_elements = row.locator('td[class*="svelte"]').all()
            
            if len(td_elements) < 2 or not rank or not rank.isdigit():
                return None
                
            player = td_elements[0].inner_text().strip()
            opponent = td_elements[-1].inner_text().strip()
            
            ranking_data = {
                'preGameRank': int(rank),
                'player': player,
                'opponent': opponent
            }
            
            # Add position rank for FLEX
            if position == "flex":
                ranking_data['positionRank'] = f"{self._guess_position(player)}{rank}"
            
            return ranking_data
            
        except Exception as e:
            return None
    
    def _guess_position(self, player_name: str) -> str:
        """Guess position for FLEX rankings"""
        rb_keywords = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Jones', 'Taylor', 'Robinson', 'Gibbs', 'Achane', 'Barkley']
        wr_keywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Hopkins', 'Evans', 'Brown', 'Kupp', 'Diggs', 'Lamb']
        te_keywords = ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Hockenson', 'LaPorta']
        
        player_upper = player_name.upper()
        
        for keyword in te_keywords:
            if keyword.upper() in player_upper:
                return "TE"
                
        for keyword in wr_keywords:
            if keyword.upper() in player_upper:
                return "WR"
                
        for keyword in rb_keywords:
            if keyword.upper() in player_upper:
                return "RB"
                
        return "RB"  # Default
    
    def scrape_all_positions(self, position_urls: Dict[str, List[str]]) -> Dict:
        """Scrape all positions from discovered URLs"""
        logger.info("Starting automated scraping for all discovered positions...")
        results = {}
        
        positions_to_scrape = self.config.get("positions_to_scrape", ["qb", "rb", "wr", "te", "flex", "def", "k"])
        
        for position in positions_to_scrape:
            if position in position_urls and position_urls[position]:
                rankings = self.scrape_position(position, position_urls[position])
                results[position] = rankings
            else:
                logger.warning(f"No URLs found for {position.upper()}")
                results[position] = []
                
            time.sleep(2)  # Brief pause between positions
        
        self.scraped_data = results
        return results
    
    def update_rankings_file(self) -> bool:
        """Update the rankings.json file with scraped data"""
        try:
            output_file = self.config.get("output_file", "rankings.json")
            
            # Create backup if requested
            if self.config.get("backup_existing", True):
                try:
                    with open(output_file, 'r') as f:
                        existing_data = f.read()
                    backup_file = f"{output_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    with open(backup_file, 'w') as f:
                        f.write(existing_data)
                    logger.info(f"Created backup: {backup_file}")
                except FileNotFoundError:
                    logger.info("No existing file to backup")
            
            # Write new rankings
            with open(output_file, 'w') as f:
                json.dump(self.scraped_data, f, indent=2)
                
            logger.info(f"✅ Successfully updated {output_file}")
            self._print_summary()
            return True
            
        except Exception as e:
            logger.error(f"Error updating rankings file: {e}")
            return False
    
    def _print_summary(self):
        """Print summary of scraped data"""
        print("\n" + "="*60)
        print("AUTOMATED SCRAPING SUMMARY")
        print("="*60)
        
        total = 0
        for position, rankings in self.scraped_data.items():
            count = len(rankings)
            total += count
            status = "✅" if count > 0 else "❌"
            print(f"{status} {position.upper()}: {count} players")
        
        print(f"\nTotal: {total} players")
        print(f"Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
    
    def run_automated_check(self) -> bool:
        """Run the full automated check and scrape process"""
        logger.info("🤖 Starting fully automated rankings check...")
        
        try:
            # Check for updates
            update_needed, current_timestamp = self.check_for_updates()
            
            if not update_needed:
                logger.info("✅ No update needed - rankings are current")
                return False
            
            logger.info("🚨 Update detected! Starting automated scraping...")
            
            # Discover Datawrapper URLs
            monitor_url = self.config.get("monitor_url")
            position_urls = self.discover_datawrapper_urls(monitor_url)
            
            if not position_urls:
                logger.error("❌ Could not discover any Datawrapper URLs")
                return False
            
            # Scrape all positions
            results = self.scrape_all_positions(position_urls)
            
            # Check if we got any data
            total_scraped = sum(len(rankings) for rankings in results.values())
            if total_scraped == 0:
                logger.error("❌ No data was scraped from any position")
                return False
            
            # Update rankings file
            success = self.update_rankings_file()
            
            if success:
                logger.info("🎉 Automated scraping completed successfully!")
                return True
            else:
                logger.error("❌ Failed to update rankings file")
                return False
                
        except Exception as e:
            logger.error(f"Error in automated check: {e}")
            return False

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Fully Automated Boone Rankings Scraper')
    parser.add_argument('--config', '-c', default='automation_config.json', help='Configuration file')
    parser.add_argument('--monitor-url', help='Yahoo article URL to monitor')
    parser.add_argument('--force', action='store_true', help='Force scraping even if timestamp unchanged')
    parser.add_argument('--dry-run', action='store_true', help='Check for updates but don\'t scrape')
    
    args = parser.parse_args()
    
    print("🤖 Fully Automated Boone Rankings Scraper")
    print("=" * 50)
    
    try:
        scraper = FullyAutomatedScraper(config_file=args.config)
        
        # Update config if URL provided
        if args.monitor_url:
            scraper.config["monitor_url"] = args.monitor_url
            scraper.save_config()
            logger.info(f"Updated monitor URL: {args.monitor_url}")
        
        if args.dry_run:
            update_needed, timestamp = scraper.check_for_updates()
            print(f"\n🔍 DRY RUN RESULTS:")
            print(f"Update needed: {'YES' if update_needed else 'NO'}")
            print(f"Current timestamp: {timestamp}")
            return
        
        # Force scraping if requested
        if args.force:
            logger.info("🔧 FORCE MODE - Scraping regardless of timestamp")
            monitor_url = scraper.config.get("monitor_url")
            position_urls = scraper.discover_datawrapper_urls(monitor_url)
            
            if position_urls:
                results = scraper.scrape_all_positions(position_urls)
                scraper.update_rankings_file()
                print("\n🎉 Forced scraping completed!")
            else:
                print("\n❌ Could not discover URLs for forced scraping")
            return
        
        # Normal automated check
        success = scraper.run_automated_check()
        
        if success:
            print("\n🎉 Automated update completed successfully!")
            print("📄 rankings.json has been updated automatically")
        else:
            print("\n✅ No action needed - rankings are current")
            
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()