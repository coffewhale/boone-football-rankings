#!/usr/bin/env python3
"""
Yahoo Sports Fantasy Football Rankings Scraper
Scrapes Justin Boone's rankings and saves them as JSON
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
import time

class YahooRankingsScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def scrape_rankings(self, url):
        """Scrape rankings from a Yahoo Sports article URL"""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract article metadata
            title = soup.find('h1').get_text().strip() if soup.find('h1') else "Rankings"
            
            # Find position from title
            position = self.extract_position(title)
            
            # Yahoo Sports now uses DataWrapper iframes for rankings
            # Look for iframe src in the page source
            iframe_url = self.extract_datawrapper_url(response.text)
            
            rankings = []
            if iframe_url:
                print(f"Found DataWrapper iframe: {iframe_url}")
                rankings = self.scrape_datawrapper_rankings(iframe_url)
            else:
                # Fallback to old method
                rankings = self.extract_rankings_from_content(soup)
            
            return {
                'title': title,
                'position': position,
                'url': url,
                'scraped_at': datetime.now().isoformat(),
                'rankings': rankings
            }
            
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            return None
    
    def extract_position(self, title):
        """Extract position from article title"""
        title_lower = title.lower()
        if 'quarterback' in title_lower or 'qb' in title_lower:
            return 'qb'
        elif 'running back' in title_lower or 'rb' in title_lower:
            return 'rb'
        elif 'wide receiver' in title_lower or 'wr' in title_lower:
            return 'wr'
        elif 'tight end' in title_lower or 'te' in title_lower:
            return 'te'
        return 'unknown'
    
    def extract_rankings_from_content(self, soup):
        """Extract rankings from the page content"""
        rankings = []
        
        # Look for common ranking patterns
        # Method 1: Look for ordered lists
        ol_tags = soup.find_all('ol')
        for ol in ol_tags:
            items = ol.find_all('li')
            for i, item in enumerate(items, 1):
                text = item.get_text().strip()
                if self.looks_like_player_ranking(text):
                    player_data = self.parse_player_text(text, i)
                    if player_data:
                        rankings.append(player_data)
        
        # Method 2: Look for paragraphs with numbered rankings
        if not rankings:
            paragraphs = soup.find_all('p')
            for p in paragraphs:
                text = p.get_text().strip()
                if re.match(r'^\d+\.', text):
                    rank_match = re.match(r'^(\d+)\.', text)
                    if rank_match:
                        rank = int(rank_match.group(1))
                        player_data = self.parse_player_text(text, rank)
                        if player_data:
                            rankings.append(player_data)
        
        # Method 3: Look for table data
        if not rankings:
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 3:  # Rank, Player, Opponent
                        try:
                            rank_text = cells[0].get_text().strip()
                            if rank_text.isdigit():
                                rank = int(rank_text)
                                player = cells[1].get_text().strip()
                                opponent = cells[2].get_text().strip()
                                rankings.append({
                                    'rank': rank,
                                    'player': player,
                                    'opponent': opponent,
                                    'projected': None
                                })
                        except:
                            continue
        
        return rankings[:20]  # Limit to top 20
    
    def looks_like_player_ranking(self, text):
        """Check if text looks like a player ranking"""
        # Look for patterns like "Josh Allen" or "player vs opponent"
        return (len(text) > 5 and 
                any(keyword in text.lower() for keyword in ['vs', '@', 'against']) or
                re.search(r'[A-Z][a-z]+ [A-Z][a-z]+', text))
    
    def parse_player_text(self, text, rank):
        """Parse player information from text"""
        try:
            # Remove rank number if present
            text = re.sub(r'^\d+\.?\s*', '', text)
            
            # Look for player name (usually at the start)
            name_match = re.search(r'^([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', text)
            if not name_match:
                return None
                
            player = name_match.group(1).strip()
            
            # Look for opponent information
            opponent = ''
            vs_match = re.search(r'(vs\.?\s*[A-Z]{2,3}|@\s*[A-Z]{2,3}|against\s*[A-Z]{2,3})', text, re.IGNORECASE)
            if vs_match:
                opponent = vs_match.group(1)
            
            # Look for projected points
            points_match = re.search(r'(\d+\.?\d*)\s*points?', text)
            projected = float(points_match.group(1)) if points_match else None
            
            return {
                'rank': rank,
                'player': player,
                'opponent': opponent,
                'projected': projected
            }
        except:
            return None
    
    def extract_datawrapper_url(self, html_content):
        """Extract DataWrapper iframe URL from HTML content"""
        # Look for datawrapper.dwcdn.net URLs in the page source
        import re
        pattern = r'datawrapper\.dwcdn\.net/([^/\"]+)/\d+/'
        match = re.search(pattern, html_content)
        if match:
            chart_id = match.group(1)
            return f"https://datawrapper.dwcdn.net/{chart_id}/1/"
        return None
    
    def scrape_datawrapper_rankings(self, iframe_url):
        """Scrape rankings from DataWrapper iframe"""
        try:
            print(f"Scraping DataWrapper: {iframe_url}")
            response = self.session.get(iframe_url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            rankings = []
            
            # DataWrapper typically renders as a table or custom HTML
            # Look for table structure first
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')[1:]  # Skip header row
                
                for i, row in enumerate(rows, 1):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:  # Need at least rank and player
                        try:
                            # Try different cell structures
                            if len(cells) >= 3:
                                # Format: Rank | Player | Opponent
                                rank = i
                                player = cells[1].get_text().strip()
                                opponent = cells[2].get_text().strip() if len(cells) > 2 else ''
                            else:
                                # Format: Rank | Player
                                rank = i
                                player = cells[1].get_text().strip()
                                opponent = ''
                            
                            if player and not player.lower() in ['player', 'name', 'rank']:
                                rankings.append({
                                    'rank': rank,
                                    'player': player,
                                    'opponent': opponent,
                                    'projected': None
                                })
                                
                        except:
                            continue
            
            # If no table found, look for other structures
            if not rankings:
                # Look for divs or other elements that might contain player data
                player_elements = soup.find_all(['div', 'span', 'p'], string=re.compile(r'[A-Z][a-z]+ [A-Z][a-z]+'))
                for i, element in enumerate(player_elements, 1):
                    text = element.get_text().strip()
                    if self.looks_like_player_ranking(text):
                        player_data = self.parse_player_text(text, i)
                        if player_data:
                            rankings.append(player_data)
            
            return rankings[:25]  # Limit to top 25
            
        except Exception as e:
            print(f"Error scraping DataWrapper: {e}")
            return []

def main():
    scraper = YahooRankingsScraper()
    
    # Load URLs from config.json
    try:
        with open('config.json', 'r') as f:
            config = json.load(f)
        
        urls = {
            'qb': config['urls']['QB'],
            'rb': config['urls']['RB'],
            'wr': config['urls']['WR'],
            'te': config['urls']['TE'],
            'flex': config['urls']['FLEX'],
            'def': config['urls']['DEF'],
            'k': config['urls']['K']
        }
        
        print(f"Scraping Week {config['current_week']} rankings ({config['season_year']})")
        
    except FileNotFoundError:
        print("Error: config.json not found. Please create config.json with URLs.")
        return
    except KeyError as e:
        print(f"Error: Missing key in config.json: {e}")
        return
    
    all_rankings = {}
    
    for position, url in urls.items():
        if '[ID]' in url:
            print(f"Skipping {position.upper()} - please update URL with actual article ID")
            continue
            
        print(f"Scraping {position.upper()}: {url}")
        result = scraper.scrape_rankings(url)
        
        if result and result['rankings']:
            # Format for our frontend structure
            formatted_rankings = []
            for i, ranking in enumerate(result['rankings'], 1):
                formatted_rankings.append({
                    'preGameRank': ranking.get('rank', i),
                    'player': ranking['player'],
                    'opponent': ranking.get('opponent', '')
                })
            
            all_rankings[position] = formatted_rankings
            print(f"Found {len(formatted_rankings)} {position.upper()} rankings")
        else:
            print(f"No rankings found for {position.upper()}")
        
        time.sleep(2)  # Be respectful with requests
    
    # Save to JSON file
    with open('rankings.json', 'w') as f:
        json.dump(all_rankings, f, indent=2)
    
    print(f"\nSaved rankings to rankings.json")
    print(f"Positions scraped: {list(all_rankings.keys())}")
    print("\nTo use in your website:")
    print("1. Update script.js to load from rankings.json")
    print("2. Or copy the rankings data into the script.js file")

if __name__ == "__main__":
    main()