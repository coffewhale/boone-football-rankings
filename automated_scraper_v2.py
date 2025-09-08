#!/usr/bin/env python3
"""
Automated Rankings Scraper v2 for Justin Boone Fantasy Football Rankings

This script automates the scraping of all position rankings from Yahoo Sports/Datawrapper
using configuration from scraper_config.json and generates the rankings.json file automatically.
"""

from playwright.sync_api import sync_playwright
import pandas as pd
import json
import time
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import argparse
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ScrapingConfig:
    """Configuration for scraping different positions"""
    position: str
    name: str
    urls: List[str]
    enabled: bool = True
    note: str = ""

class RankingsScraper:
    """Main scraper class that handles all positions"""
    
    def __init__(self, config_file: str = "scraper_config.json"):
        self.config_file = config_file
        self.configs = []
        self.settings = {}
        self.output_settings = {}
        self.scraped_data = {}
        self.load_config()
        
    def load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
            
            # Load scraping configurations
            for config_dict in config_data.get('scraping_configs', []):
                config = ScrapingConfig(
                    position=config_dict['position'],
                    name=config_dict['name'],
                    urls=config_dict['urls'],
                    enabled=config_dict.get('enabled', True),
                    note=config_dict.get('note', '')
                )
                self.configs.append(config)
            
            self.settings = config_data.get('scraper_settings', {})
            self.output_settings = config_data.get('output_settings', {})
            
            logger.info(f"Loaded configuration for {len(self.configs)} positions")
            enabled_count = sum(1 for c in self.configs if c.enabled)
            logger.info(f"Enabled positions: {enabled_count}/{len(self.configs)}")
            
        except FileNotFoundError:
            logger.error(f"Configuration file {self.config_file} not found!")
            raise
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise
    
    def scrape_position_datawrapper(self, config: ScrapingConfig) -> List[Dict]:
        """Scrape rankings for a specific position from Datawrapper iframes"""
        if not config.enabled:
            logger.info(f"Skipping {config.name} ({config.position}) - disabled in config")
            return []
            
        logger.info(f"Starting scrape for {config.name} ({config.position})")
        
        max_retries = self.settings.get('max_retries', 3)
        
        for url in config.urls:
            try:
                if "REPLACE_WITH" in url:
                    logger.warning(f"Skipping {config.position} - URL not configured: {url}")
                    if config.note:
                        logger.info(f"Note: {config.note}")
                    continue
                    
                logger.info(f"Attempting to scrape {config.position} from: {url}")
                
                # Retry logic
                for attempt in range(max_retries):
                    try:
                        rankings = self._scrape_datawrapper_url(url, config)
                        if rankings:
                            logger.info(f"Successfully scraped {len(rankings)} {config.name}")
                            return rankings
                        else:
                            logger.warning(f"No data found for {config.position} from {url} (attempt {attempt + 1})")
                    except Exception as e:
                        logger.warning(f"Attempt {attempt + 1} failed for {config.position}: {e}")
                        if attempt < max_retries - 1:
                            time.sleep(5)  # Wait before retry
                        else:
                            raise
                    
            except Exception as e:
                logger.error(f"Error scraping {config.position} from {url}: {e}")
                continue
                
        logger.error(f"Failed to scrape {config.name} from all configured URLs")
        return []
    
    def _scrape_datawrapper_url(self, url: str, config: ScrapingConfig) -> List[Dict]:
        """Scrape a single Datawrapper URL"""
        headless = self.settings.get('headless', True)
        timeout = self.settings.get('timeout', 30000)
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            page = browser.new_page()
            
            try:
                logger.info(f"Loading {url}...")
                response = page.goto(url, timeout=timeout)
                logger.info(f"Response status: {response.status}")
                
                # Wait for table to load
                page.wait_for_selector('table', timeout=15000)
                time.sleep(3)  # Additional wait for dynamic content
                
                rankings = []
                rows = page.locator('tbody tr[class*="svelte"]').all()
                logger.info(f"Found {len(rows)} data rows")
                
                for i, row in enumerate(rows):
                    try:
                        ranking_data = self._extract_row_data(row, config.position)
                        if ranking_data:
                            rankings.append(ranking_data)
                            logger.debug(f"  {ranking_data['preGameRank']}. {ranking_data['player']} {ranking_data['opponent']}")
                    
                    except Exception as e:
                        logger.warning(f"Error processing row {i}: {e}")
                        continue
                
                return rankings
                
            except Exception as e:
                logger.error(f"Error scraping {url}: {e}")
                return []
                
            finally:
                browser.close()
    
    def _extract_row_data(self, row, position: str) -> Optional[Dict]:
        """Extract data from a single table row"""
        try:
            # Get rank from th element
            rank_elem = row.locator('th[class*="svelte"]').first
            rank = rank_elem.inner_text().strip() if rank_elem.count() > 0 else ""
            
            # Get all td elements
            td_elements = row.locator('td[class*="svelte"]').all()
            
            if len(td_elements) < 2:
                return None
                
            player = td_elements[0].inner_text().strip()
            opponent = td_elements[-1].inner_text().strip() if len(td_elements) > 1 else ""
            
            # Extract team info if available
            team = ""
            if len(td_elements) >= 3:
                team_elem = td_elements[1]
                img = team_elem.locator('img').first
                if img.count() > 0:
                    img_src = img.get_attribute('src')
                    team = self._extract_team_from_url(img_src)
            
            # Only return valid data
            if rank and player and rank.isdigit():
                ranking_data = {
                    'preGameRank': int(rank),
                    'player': player,
                    'opponent': opponent
                }
                
                # Add position rank for FLEX
                if position == "flex" and team:
                    ranking_data['positionRank'] = f"{self._guess_position(player)}{rank}"
                
                return ranking_data
                
        except Exception as e:
            logger.warning(f"Error extracting row data: {e}")
            
        return None
    
    def _extract_team_from_url(self, img_src: str) -> str:
        """Extract team abbreviation from image URL"""
        if not img_src:
            return ""
            
        url_parts = img_src.split('/')
        for part in url_parts:
            if '.png' in part or '.webp' in part:
                team_part = part.split('.')[0]
                if '_' in team_part:
                    return team_part.split('_')[-1].upper()
                elif '2019_' in part:
                    return part.split('2019_')[-1].split('.')[0].upper()
        return ""
    
    def _guess_position(self, player_name: str) -> str:
        """Guess position based on player name - basic implementation"""
        # This is a simplified approach - you might want to maintain a player database
        # or use more sophisticated logic
        common_rb_names = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Jones', 'Taylor', 'Robinson', 'Gibbs', 'Achane']
        common_wr_names = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Hopkins', 'Evans', 'Brown', 'Kupp', 'Diggs']
        common_te_names = ['Kelce', 'Andrews', 'Kittle', 'Waller', 'Hockenson']
        
        for rb_name in common_rb_names:
            if rb_name in player_name:
                return "RB"
                
        for wr_name in common_wr_names:
            if wr_name in player_name:
                return "WR"
                
        for te_name in common_te_names:
            if te_name in player_name:
                return "TE"
                
        return "RB"  # Default assumption
    
    def scrape_all_positions(self) -> Dict:
        """Scrape all configured positions"""
        logger.info("Starting automated scraping for all positions...")
        results = {}
        
        wait_time = self.settings.get('wait_between_positions', 2)
        
        for config in self.configs:
            rankings = self.scrape_position_datawrapper(config)
            results[config.position] = rankings
            
            if rankings:
                logger.info(f"✅ {config.name}: {len(rankings)} players")
            else:
                logger.warning(f"❌ {config.name}: No data scraped")
                
            # Brief pause between positions
            if wait_time > 0:
                time.sleep(wait_time)
        
        self.scraped_data = results
        return results
    
    def merge_with_existing_data(self, existing_file: str = None) -> Dict:
        """Merge scraped data with existing rankings.json, keeping unscraped positions"""
        if existing_file is None:
            existing_file = self.output_settings.get('output_file', 'rankings.json')
        
        try:
            with open(existing_file, 'r') as f:
                existing_data = json.load(f)
            logger.info(f"Loaded existing data from {existing_file}")
        except FileNotFoundError:
            logger.info(f"No existing file {existing_file} found, using scraped data only")
            return self.scraped_data
        except Exception as e:
            logger.error(f"Error loading existing file {existing_file}: {e}")
            return self.scraped_data
        
        # Merge data: prioritize scraped data, fall back to existing
        merged_data = existing_data.copy()
        
        for position, rankings in self.scraped_data.items():
            if rankings:  # Only update if we successfully scraped data
                merged_data[position] = rankings
                logger.info(f"Updated {position} with {len(rankings)} new rankings")
            else:
                logger.info(f"Kept existing {position} data ({len(merged_data.get(position, []))} rankings)")
        
        return merged_data
    
    def generate_rankings_json(self, output_file: str = None, merge_existing: bool = True) -> bool:
        """Generate the rankings.json file from scraped data"""
        try:
            if not self.scraped_data:
                logger.error("No scraped data available. Run scrape_all_positions() first.")
                return False
            
            if output_file is None:
                output_file = self.output_settings.get('output_file', 'rankings.json')
            
            # Create backup of existing file if requested
            if self.output_settings.get('backup_existing', True):
                try:
                    with open(output_file, 'r') as f:
                        existing_data = f.read()
                    backup_file = f"{output_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    with open(backup_file, 'w') as f:
                        f.write(existing_data)
                    logger.info(f"Created backup: {backup_file}")
                except FileNotFoundError:
                    logger.info("No existing rankings.json file to backup")
            
            # Determine final data to write
            if merge_existing:
                final_data = self.merge_with_existing_data(output_file)
            else:
                final_data = self.scraped_data
            
            # Write new rankings
            with open(output_file, 'w') as f:
                json.dump(final_data, f, indent=2)
                
            logger.info(f"✅ Successfully generated {output_file}")
            
            # Print summary
            self._print_summary(final_data)
            return True
            
        except Exception as e:
            logger.error(f"Error generating rankings JSON: {e}")
            return False
    
    def _print_summary(self, data: Dict = None):
        """Print a summary of scraped data"""
        if data is None:
            data = self.scraped_data
            
        print("\n" + "="*50)
        print("SCRAPING SUMMARY")
        print("="*50)
        
        total_players = 0
        for position, rankings in data.items():
            count = len(rankings)
            total_players += count
            
            # Check if this position was successfully scraped
            scraped_this_run = position in self.scraped_data and len(self.scraped_data[position]) > 0
            status = "🆕" if scraped_this_run else "📂"
            source = "(scraped)" if scraped_this_run else "(existing)"
            
            print(f"{status} {position.upper()}: {count} players {source}")
        
        print(f"\nTotal players: {total_players}")
        print("="*50)

def main():
    """Main execution function"""
    parser = argparse.ArgumentParser(description='Automated Rankings Scraper for Justin Boone Fantasy Football')
    parser.add_argument('--config', '-c', default='scraper_config.json', help='Configuration file path')
    parser.add_argument('--output', '-o', help='Output file path (overrides config)')
    parser.add_argument('--no-merge', action='store_true', help='Don\'t merge with existing data')
    parser.add_argument('--dry-run', action='store_true', help='Scrape but don\'t write output file')
    
    args = parser.parse_args()
    
    print("🏈 Justin Boone Rankings Automated Scraper v2")
    print("=" * 50)
    
    try:
        # Create scraper instance
        scraper = RankingsScraper(config_file=args.config)
        
        # Scrape all enabled positions
        results = scraper.scrape_all_positions()
        
        if args.dry_run:
            print("\n🔍 DRY RUN - No files will be modified")
            scraper._print_summary()
            return
        
        # Generate rankings.json
        success = scraper.generate_rankings_json(
            output_file=args.output,
            merge_existing=not args.no_merge
        )
        
        if success:
            print("\n🎉 Automated scraping completed successfully!")
            print("📄 rankings.json has been updated with the latest data")
            print("\nNext steps:")
            print("1. Review the generated rankings.json file")
            print("2. Commit and push your changes to deploy")
            print("3. Update the environment variable LAST_STORED_TIMESTAMP")
        else:
            print("\n❌ Failed to generate rankings.json file")
            
    except KeyboardInterrupt:
        print("\n⚠️ Scraping interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        print(f"\n❌ Scraping failed: {e}")

if __name__ == "__main__":
    main()