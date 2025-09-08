#!/usr/bin/env python3
"""
Automated Rankings Scraper for Justin Boone Fantasy Football Rankings

This script automates the scraping of all position rankings from Yahoo Sports/Datawrapper
and generates the rankings.json file automatically.
"""

from playwright.sync_api import sync_playwright
import pandas as pd
import json
import time
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ScrapingConfig:
    """Configuration for scraping different positions"""
    position: str
    name: str
    urls: List[str]  # Multiple URLs to try if one fails
    datawrapper_selector: str = 'table'
    
# Configuration for all positions - UPDATE THESE URLs AS NEEDED
SCRAPING_CONFIGS = [
    ScrapingConfig(
        position="qb",
        name="Quarterbacks",
        urls=[
            "https://datawrapper.dwcdn.net/bqgx9/",  # Your current QB URL
            # Add backup URLs if available
        ]
    ),
    ScrapingConfig(
        position="rb", 
        name="Running Backs",
        urls=[
            # Add RB Datawrapper URLs here
            "https://datawrapper.dwcdn.net/REPLACE_WITH_RB_ID/",
        ]
    ),
    ScrapingConfig(
        position="wr",
        name="Wide Receivers", 
        urls=[
            # Add WR Datawrapper URLs here
            "https://datawrapper.dwcdn.net/REPLACE_WITH_WR_ID/",
        ]
    ),
    ScrapingConfig(
        position="te",
        name="Tight Ends",
        urls=[
            # Add TE Datawrapper URLs here
            "https://datawrapper.dwcdn.net/REPLACE_WITH_TE_ID/",
        ]
    ),
    ScrapingConfig(
        position="flex",
        name="FLEX",
        urls=[
            # Add FLEX Datawrapper URLs here
            "https://datawrapper.dwcdn.net/REPLACE_WITH_FLEX_ID/",
        ]
    ),
    ScrapingConfig(
        position="def",
        name="Defense/ST",
        urls=[
            # Add DEF Datawrapper URLs here  
            "https://datawrapper.dwcdn.net/REPLACE_WITH_DEF_ID/",
        ]
    ),
    ScrapingConfig(
        position="k",
        name="Kickers",
        urls=[
            # Add K Datawrapper URLs here
            "https://datawrapper.dwcdn.net/REPLACE_WITH_K_ID/",
        ]
    )
]

class RankingsScraper:
    """Main scraper class that handles all positions"""
    
    def __init__(self, headless: bool = True, timeout: int = 30000):
        self.headless = headless
        self.timeout = timeout
        self.scraped_data = {}
        
    def scrape_position_datawrapper(self, config: ScrapingConfig) -> List[Dict]:
        """Scrape rankings for a specific position from Datawrapper iframes"""
        logger.info(f"Starting scrape for {config.name} ({config.position})")
        
        for url in config.urls:
            try:
                if "REPLACE_WITH" in url:
                    logger.warning(f"Skipping {config.position} - URL not configured: {url}")
                    continue
                    
                logger.info(f"Attempting to scrape {config.position} from: {url}")
                rankings = self._scrape_datawrapper_url(url, config)
                
                if rankings:
                    logger.info(f"Successfully scraped {len(rankings)} {config.name}")
                    return rankings
                else:
                    logger.warning(f"No data found for {config.position} from {url}")
                    
            except Exception as e:
                logger.error(f"Error scraping {config.position} from {url}: {e}")
                continue
                
        logger.error(f"Failed to scrape {config.name} from all configured URLs")
        return []
    
    def _scrape_datawrapper_url(self, url: str, config: ScrapingConfig) -> List[Dict]:
        """Scrape a single Datawrapper URL"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            page = browser.new_page()
            
            try:
                logger.info(f"Loading {url}...")
                response = page.goto(url, timeout=self.timeout)
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
        common_rb_names = ['McCaffrey', 'Henry', 'Cook', 'Kamara', 'Jones', 'Taylor']
        common_wr_names = ['Chase', 'Jefferson', 'Hill', 'Adams', 'Hopkins', 'Evans']
        
        for rb_name in common_rb_names:
            if rb_name in player_name:
                return "RB"
                
        for wr_name in common_wr_names:
            if wr_name in player_name:
                return "WR"
                
        return "RB"  # Default assumption
    
    def scrape_all_positions(self) -> Dict:
        """Scrape all configured positions"""
        logger.info("Starting automated scraping for all positions...")
        results = {}
        
        for config in SCRAPING_CONFIGS:
            rankings = self.scrape_position_datawrapper(config)
            results[config.position] = rankings
            
            if rankings:
                logger.info(f"✅ {config.name}: {len(rankings)} players")
            else:
                logger.warning(f"❌ {config.name}: No data scraped")
                
            # Brief pause between positions
            time.sleep(2)
        
        self.scraped_data = results
        return results
    
    def generate_rankings_json(self, output_file: str = "rankings.json") -> bool:
        """Generate the rankings.json file from scraped data"""
        try:
            if not self.scraped_data:
                logger.error("No scraped data available. Run scrape_all_positions() first.")
                return False
            
            # Create backup of existing file
            try:
                with open(output_file, 'r') as f:
                    existing_data = f.read()
                backup_file = f"{output_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                with open(backup_file, 'w') as f:
                    f.write(existing_data)
                logger.info(f"Created backup: {backup_file}")
            except FileNotFoundError:
                logger.info("No existing rankings.json file to backup")
            
            # Write new rankings
            with open(output_file, 'w') as f:
                json.dump(self.scraped_data, f, indent=2)
                
            logger.info(f"✅ Successfully generated {output_file}")
            
            # Print summary
            self._print_summary()
            return True
            
        except Exception as e:
            logger.error(f"Error generating rankings JSON: {e}")
            return False
    
    def _print_summary(self):
        """Print a summary of scraped data"""
        print("\n" + "="*50)
        print("SCRAPING SUMMARY")
        print("="*50)
        
        total_players = 0
        for position, rankings in self.scraped_data.items():
            count = len(rankings)
            total_players += count
            status = "✅" if count > 0 else "❌"
            print(f"{status} {position.upper()}: {count} players")
        
        print(f"\nTotal players scraped: {total_players}")
        print("="*50)

def main():
    """Main execution function"""
    print("🏈 Justin Boone Rankings Automated Scraper")
    print("=" * 50)
    
    # Create scraper instance
    scraper = RankingsScraper(headless=False)  # Set to True for production
    
    try:
        # Scrape all positions
        results = scraper.scrape_all_positions()
        
        # Generate rankings.json
        success = scraper.generate_rankings_json()
        
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