from playwright.sync_api import sync_playwright
import pandas as pd
import time

def scrape_datawrapper_direct():
    # Direct URL to the Datawrapper iframe
    url = "https://datawrapper.dwcdn.net/bqgx9/"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        try:
            print("Loading Datawrapper iframe directly...")
            response = page.goto(url, timeout=30000)
            print(f"Response status: {response.status}")
            
            # Wait for content to load
            print("Waiting for table to load...")
            page.wait_for_selector('table', timeout=15000)
            
            # Additional wait for dynamic content
            time.sleep(3)
            
            print("Extracting quarterback rankings...")
            rankings = []
            
            # Look for all table rows with the svelte classes we know exist
            rows = page.locator('tbody tr[class*="svelte"]').all()
            print(f"Found {len(rows)} data rows")
            
            for i, row in enumerate(rows):
                try:
                    # Get rank from th element
                    rank_elem = row.locator('th[class*="svelte"]').first
                    rank = rank_elem.inner_text().strip() if rank_elem.count() > 0 else ""
                    
                    # Get all td elements
                    td_elements = row.locator('td[class*="svelte"]').all()
                    
                    player = ""
                    team = ""
                    opponent = ""
                    
                    if len(td_elements) >= 3:
                        # Player name from first td
                        player = td_elements[0].inner_text().strip()
                        
                        # Team from second td (extract from image if present)
                        team_elem = td_elements[1]
                        img = team_elem.locator('img').first
                        if img.count() > 0:
                            img_src = img.get_attribute('src')
                            if img_src:
                                # Extract team abbreviation from image URL
                                url_parts = img_src.split('/')
                                for part in url_parts:
                                    if '.png' in part or '.webp' in part:
                                        team_part = part.split('.')[0]
                                        if '_' in team_part:
                                            team = team_part.split('_')[-1].upper()
                                        elif '2019_' in part:
                                            team = part.split('2019_')[-1].split('.')[0].upper()
                                        break
                        
                        # Opponent from last td
                        opponent = td_elements[-1].inner_text().strip()
                    
                    # Only add if we have valid data
                    if rank and player and rank.isdigit():
                        ranking_data = {
                            'Rank': int(rank),
                            'Player': player,
                            'Team': team,
                            'Opponent': opponent
                        }
                        rankings.append(ranking_data)
                        print(f"  {rank}. {player} ({team}) {opponent}")
                
                except Exception as e:
                    print(f"Error processing row {i}: {e}")
                    continue
            
            print(f"\nSuccessfully extracted {len(rankings)} QB rankings")
            return rankings
            
        except Exception as e:
            print(f"Error: {e}")
            return []
            
        finally:
            input("Press Enter to close browser...")
            browser.close()

def save_rankings(rankings, filename="qb_rankings.csv"):
    if rankings:
        df = pd.DataFrame(rankings)
        print(f"\nTop 10 QB Rankings:")
        print(df.head(10).to_string(index=False))
        
        # Save to CSV
        df.to_csv(filename, index=False)
        print(f"\nData saved to {filename}")
        return df
    else:
        print("No rankings to save")
        return None

def main():
    print("Scraping QB rankings directly from Datawrapper...")
    rankings = scrape_datawrapper_direct()
    
    if rankings:
        save_rankings(rankings)
        print(f"\nTotal quarterbacks ranked: {len(rankings)}")
    else:
        print("Failed to extract rankings")

if __name__ == "__main__":
    main()