#!/usr/bin/env python3
"""
Weekly Scraper for Justin Boone Rankings

Simple, flexible scraper where you provide the URLs each week.
Designed for weekly updates with changing URLs.
"""

from playwright.sync_api import sync_playwright
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WeeklyRankingsScraper:
    """Flexible scraper for weekly URL updates"""
    
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.scraped_data = {}
        
    def scrape_position(self, position: str, urls: List[str], position_name: str = "") -> List[Dict]:
        """Scrape a single position from provided URLs"""
        if not position_name:
            position_name = position.upper()
            
        logger.info(f"Scraping {position_name} from {len(urls)} URL(s)")
        
        for i, url in enumerate(urls):
            try:
                logger.info(f"Attempting {position_name} URL {i+1}/{len(urls)}: {url}")
                rankings = self._scrape_datawrapper_url(url, position)
                
                if rankings:
                    logger.info(f"✅ Successfully scraped {len(rankings)} {position_name}")
                    return rankings
                else:
                    logger.warning(f"No data from {position_name} URL {i+1}")
                    
            except Exception as e:
                logger.error(f"Error with {position_name} URL {i+1}: {e}")
                continue
        
        logger.error(f"❌ Failed to scrape {position_name} from all URLs")
        return []
    
    def _scrape_datawrapper_url(self, url: str, position: str) -> List[Dict]:
        """Scrape a single Datawrapper URL"""
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=self.headless)
            page = browser.new_page()
            
            try:
                response = page.goto(url, timeout=30000)
                logger.debug(f"Page loaded with status: {response.status}")
                
                # Wait for table to load
                page.wait_for_selector('table', timeout=15000)
                time.sleep(3)  # Wait for dynamic content
                
                rankings = []
                rows = page.locator('tbody tr[class*="svelte"]').all()
                logger.debug(f"Found {len(rows)} table rows")
                
                for i, row in enumerate(rows):
                    try:
                        ranking_data = self._extract_row_data(row, position)
                        if ranking_data:
                            rankings.append(ranking_data)
                    except Exception as e:
                        logger.debug(f"Error processing row {i}: {e}")
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
            logger.debug(f"Error extracting row data: {e}")
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
    
    def scrape_from_input(self) -> Dict:
        """Interactive scraping with user input for URLs"""
        print("\n🏈 Weekly Rankings Scraper - Interactive Mode")
        print("=" * 50)
        print("Enter URLs for each position (press Enter to skip position)")
        print("You can enter multiple URLs separated by commas")
        print()
        
        positions = [
            ("qb", "Quarterbacks"),
            ("rb", "Running Backs"), 
            ("wr", "Wide Receivers"),
            ("te", "Tight Ends"),
            ("flex", "FLEX"),
            ("def", "Defense/ST"),
            ("k", "Kickers")
        ]
        
        results = {}
        
        for position, name in positions:
            print(f"\n📍 {name} ({position.upper()})")
            url_input = input("Enter URL(s) [comma-separated or press Enter to skip]: ").strip()
            
            if not url_input:
                print(f"Skipping {name}")
                results[position] = []
                continue
            
            urls = [url.strip() for url in url_input.split(',') if url.strip()]
            
            if urls:
                rankings = self.scrape_position(position, urls, name)
                results[position] = rankings
                
                if rankings:
                    print(f"✅ {name}: {len(rankings)} players")
                else:
                    print(f"❌ {name}: No data scraped")
            else:
                results[position] = []
        
        self.scraped_data = results
        return results
    
    def scrape_from_urls_dict(self, urls_dict: Dict[str, List[str]]) -> Dict:
        """Scrape from pre-defined URL dictionary"""
        position_names = {
            "qb": "Quarterbacks",
            "rb": "Running Backs", 
            "wr": "Wide Receivers",
            "te": "Tight Ends",
            "flex": "FLEX",
            "def": "Defense/ST",
            "k": "Kickers"
        }
        
        results = {}
        
        for position, urls in urls_dict.items():
            if not urls:
                results[position] = []
                continue
                
            name = position_names.get(position, position.upper())
            rankings = self.scrape_position(position, urls, name)
            results[position] = rankings
        
        self.scraped_data = results
        return results
    
    def generate_rankings_json(self, output_file: str = "rankings.json", backup: bool = True) -> bool:
        """Generate rankings.json file"""
        try:
            # Create backup
            if backup:
                try:
                    with open(output_file, 'r') as f:
                        existing = f.read()
                    backup_file = f"{output_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                    with open(backup_file, 'w') as f:
                        f.write(existing)
                    logger.info(f"Backup created: {backup_file}")
                except FileNotFoundError:
                    logger.info("No existing file to backup")
            
            # Write new data
            with open(output_file, 'w') as f:
                json.dump(self.scraped_data, f, indent=2)
            
            logger.info(f"✅ Generated {output_file}")
            self._print_summary()
            return True
            
        except Exception as e:
            logger.error(f"Error generating {output_file}: {e}")
            return False
    
    def _print_summary(self):
        """Print summary of scraped data"""
        print("\n" + "="*50)
        print("SCRAPING SUMMARY")
        print("="*50)
        
        total = 0
        for position, rankings in self.scraped_data.items():
            count = len(rankings)
            total += count
            status = "✅" if count > 0 else "❌"
            print(f"{status} {position.upper()}: {count} players")
        
        print(f"\nTotal: {total} players")
        print("="*50)

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Weekly Rankings Scraper')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--output', '-o', default='rankings.json', help='Output file')
    
    # Quick URL arguments for command line usage
    parser.add_argument('--qb', help='QB URL(s), comma-separated')
    parser.add_argument('--rb', help='RB URL(s), comma-separated') 
    parser.add_argument('--wr', help='WR URL(s), comma-separated')
    parser.add_argument('--te', help='TE URL(s), comma-separated')
    parser.add_argument('--flex', help='FLEX URL(s), comma-separated')
    parser.add_argument('--def', help='DEF URL(s), comma-separated')
    parser.add_argument('--k', help='K URL(s), comma-separated')
    
    args = parser.parse_args()
    
    print("🏈 Weekly Rankings Scraper")
    print("=" * 30)
    
    scraper = WeeklyRankingsScraper(headless=args.headless)
    
    try:
        # Check if URLs provided via command line
        urls_provided = any([args.qb, args.rb, args.wr, args.te, args.flex, getattr(args, 'def', None), args.k])
        
        if urls_provided:
            # Use command line URLs
            urls_dict = {}
            for pos in ['qb', 'rb', 'wr', 'te', 'flex', 'def', 'k']:
                url_arg = getattr(args, pos, None) or getattr(args, pos.replace('def', 'def'), None)
                if url_arg:
                    urls_dict[pos] = [url.strip() for url in url_arg.split(',')]
                else:
                    urls_dict[pos] = []
            
            results = scraper.scrape_from_urls_dict(urls_dict)
        else:
            # Interactive mode
            results = scraper.scrape_from_input()
        
        # Generate output
        success = scraper.generate_rankings_json(args.output)
        
        if success:
            print(f"\n🎉 Success! Updated {args.output}")
            print("\nNext steps:")
            print("1. Review the rankings.json file")
            print("2. git add rankings.json")
            print("3. git commit -m 'Update Week X rankings'")
            print("4. git push")
        else:
            print("\n❌ Failed to generate rankings file")
            
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()