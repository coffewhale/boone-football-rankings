#!/usr/bin/env python3
"""
Simple Automated Boone Rankings Scraper

Workflow:
1. You provide Yahoo article URL + Datawrapper URLs once per week
2. System monitors Yahoo article timestamp automatically
3. When timestamp changes, automatically scrapes the Datawrapper URLs
4. Updates rankings.json and timestamp

Best of both worlds - simple setup, full automation
"""

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleAutomatedScraper:
    """Simple automated scraper with manual URL setup, automatic monitoring"""
    
    def __init__(self, config_file: str = "simple_automation_config.json"):
        self.config_file = config_file
        self.config = self.load_config()
        self.scraped_data = {}
        
    def load_config(self) -> Dict:
        """Load automation configuration"""
        default_config = {
            "monitor_url": "",
            "last_stored_timestamp": None,
            "week_number": 1,
            "datawrapper_urls": {
                "qb": [],
                "rb": [],
                "wr": [],
                "te": [],
                "flex": [],
                "def": [],
                "k": []
            },
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
    
    def setup_weekly_urls(self):
        """Interactive setup for weekly URLs"""
        print("\n🔧 Weekly URL Setup")
        print("=" * 40)
        
        # Get Yahoo article URL
        current_url = self.config.get("monitor_url", "")
        print(f"Current Yahoo URL: {current_url}")
        
        new_url = input("\nEnter new Yahoo article URL (or press Enter to keep current): ").strip()
        if new_url:
            self.config["monitor_url"] = new_url
            print(f"✅ Updated Yahoo URL")
        
        # Get week number
        current_week = self.config.get("week_number", 1)
        week_input = input(f"\nEnter week number (current: {current_week}): ").strip()
        if week_input.isdigit():
            self.config["week_number"] = int(week_input)
        
        # Get Datawrapper URLs
        print("\n📊 Datawrapper URLs Setup")
        print("Enter Datawrapper URLs for each position (press Enter to skip)")
        print("You can enter multiple URLs separated by commas")
        
        positions = [
            ("qb", "Quarterbacks"),
            ("rb", "Running Backs"), 
            ("wr", "Wide Receivers"),
            ("te", "Tight Ends"),
            ("flex", "FLEX"),
            ("def", "Defense/ST"),
            ("k", "Kickers")
        ]
        
        datawrapper_urls = self.config.get("datawrapper_urls", {})
        
        for position, name in positions:
            current_urls = datawrapper_urls.get(position, [])
            current_str = ", ".join(current_urls) if current_urls else "None"
            print(f"\n{name} ({position.upper()})")
            print(f"Current: {current_str}")
            
            url_input = input("Enter URL(s) [comma-separated or press Enter to keep current]: ").strip()
            
            if url_input:
                urls = [url.strip() for url in url_input.split(',') if url.strip()]
                datawrapper_urls[position] = urls
                print(f"✅ Updated {name}: {len(urls)} URL(s)")
            elif not current_urls:
                datawrapper_urls[position] = []
        
        self.config["datawrapper_urls"] = datawrapper_urls
        
        # Reset timestamp to force update detection
        self.config["last_stored_timestamp"] = None
        
        # Save config
        self.save_config()
        print(f"\n✅ Configuration saved to {self.config_file}")
        
        # Show summary
        total_urls = sum(len(urls) for urls in datawrapper_urls.values())
        print(f"\n📊 Setup Summary:")
        print(f"   Yahoo URL: {'✅' if self.config['monitor_url'] else '❌'}")
        print(f"   Week: {self.config['week_number']}")
        print(f"   Total Datawrapper URLs: {total_urls}")
        
        for position, name in positions:
            count = len(datawrapper_urls.get(position, []))
            status = "✅" if count > 0 else "❌"
            print(f"   {status} {name}: {count} URL(s)")
    
    def check_for_updates(self) -> Tuple[bool, Optional[str]]:
        """Check if the Yahoo article has been updated"""
        monitor_url = self.config.get("monitor_url")
        if not monitor_url:
            logger.error("Monitor URL not configured. Run setup first.")
            return False, None
        
        try:
            logger.info(f"Checking for updates at: {monitor_url}")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(monitor_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Look for timestamp
            timestamp_selectors = [
                '.content-timestamp time',
                'time[datetime]',
                '[data-timestamp]'
            ]
            
            current_timestamp = None
            for selector in timestamp_selectors:
                element = soup.select_one(selector)
                if element:
                    current_timestamp = element.get('datetime') or element.get('data-timestamp')
                    if current_timestamp:
                        break
            
            if not current_timestamp:
                logger.warning("Could not find timestamp on page")
                return False, None
            
            last_stored = self.config.get("last_stored_timestamp")
            update_needed = not last_stored or current_timestamp != last_stored
            
            logger.info(f"Timestamp comparison:")
            logger.info(f"  Current: {current_timestamp}")
            logger.info(f"  Stored: {last_stored or 'None'}")
            logger.info(f"  Update needed: {'YES' if update_needed else 'NO'}")
            
            return update_needed, current_timestamp
            
        except Exception as e:
            logger.error(f"Error checking for updates: {e}")
            return False, None
    
    def scrape_position(self, position: str, urls: List[str]) -> List[Dict]:
        """Scrape a single position from URLs (reusing working scraper logic)"""
        if not urls:
            return []
            
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
                        time.sleep(5)
                    continue
        
        logger.error(f"❌ Failed to scrape {position.upper()} from all URLs")
        return []
    
    def _scrape_datawrapper_url(self, url: str, position: str) -> List[Dict]:
        """Scrape a single Datawrapper URL (reusing working logic)"""
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
        """Extract data from table row (reusing working logic)"""
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
        rb_keywords = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Barkley', 'Robinson', 'Gibbs']
        wr_keywords = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Evans', 'Brown', 'Lamb']
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
        return "RB"
    
    def scrape_all_configured_positions(self) -> Dict:
        """Scrape all configured positions"""
        logger.info("Starting scraping for all configured positions...")
        results = {}
        
        datawrapper_urls = self.config.get("datawrapper_urls", {})
        
        for position, urls in datawrapper_urls.items():
            rankings = self.scrape_position(position, urls)
            results[position] = rankings
            time.sleep(2)  # Brief pause
        
        self.scraped_data = results
        return results
    
    def update_rankings_file(self) -> bool:
        """Update rankings.json file"""
        try:
            output_file = self.config.get("output_file", "rankings.json")
            
            # Create backup
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
        """Print summary"""
        print("\n" + "="*50)
        print("AUTOMATED SCRAPING SUMMARY")
        print("="*50)
        
        total = 0
        for position, rankings in self.scraped_data.items():
            count = len(rankings)
            total += count
            status = "✅" if count > 0 else "❌"
            print(f"{status} {position.upper()}: {count} players")
        
        print(f"\nTotal: {total} players")
        print(f"Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*50)
    
    def run_automated_check(self) -> bool:
        """Run the automated check and scrape process"""
        logger.info("🤖 Starting automated rankings check...")
        
        try:
            # Check for updates
            update_needed, current_timestamp = self.check_for_updates()
            
            if not update_needed:
                logger.info("✅ No update needed - rankings are current")
                return False
            
            logger.info("🚨 Update detected! Starting automated scraping...")
            
            # Scrape all configured positions
            results = self.scrape_all_configured_positions()
            
            # Check if we got any data
            total_scraped = sum(len(rankings) for rankings in results.values())
            if total_scraped == 0:
                logger.warning("❌ No data was scraped from any position")
                return False
            
            # Update rankings file
            success = self.update_rankings_file()
            
            if success:
                # Update stored timestamp
                self.config["last_stored_timestamp"] = current_timestamp
                self.save_config()
                
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
    parser = argparse.ArgumentParser(description='Simple Automated Boone Rankings Scraper')
    parser.add_argument('--config', '-c', default='simple_automation_config.json', help='Configuration file')
    parser.add_argument('--setup', action='store_true', help='Run weekly setup to configure URLs')
    parser.add_argument('--force', action='store_true', help='Force scraping even if timestamp unchanged')
    parser.add_argument('--dry-run', action='store_true', help='Check for updates but don\'t scrape')
    
    args = parser.parse_args()
    
    print("🤖 Simple Automated Boone Rankings Scraper")
    print("=" * 50)
    
    try:
        scraper = SimpleAutomatedScraper(config_file=args.config)
        
        if args.setup:
            scraper.setup_weekly_urls()
            return
        
        if args.dry_run:
            update_needed, timestamp = scraper.check_for_updates()
            print(f"\n🔍 DRY RUN RESULTS:")
            print(f"Update needed: {'YES' if update_needed else 'NO'}")
            print(f"Current timestamp: {timestamp}")
            return
        
        if args.force:
            logger.info("🔧 FORCE MODE - Scraping regardless of timestamp")
            results = scraper.scrape_all_configured_positions()
            scraper.update_rankings_file()
            print("\n🎉 Forced scraping completed!")
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
    import os
    main()