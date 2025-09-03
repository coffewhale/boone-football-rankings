#!/usr/bin/env python3
"""
Debug DataWrapper iframe content
"""

import requests
from bs4 import BeautifulSoup

# Test the QB DataWrapper iframe
datawrapper_url = "https://datawrapper.dwcdn.net/bqgx9/1/"

print(f"Fetching DataWrapper: {datawrapper_url}")

try:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    response = session.get(datawrapper_url)
    response.raise_for_status()
    
    print(f"Status Code: {response.status_code}")
    print(f"Content Length: {len(response.content)} bytes")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    print("\n=== HTML STRUCTURE ===")
    
    # Check for tables
    tables = soup.find_all('table')
    print(f"Found {len(tables)} tables")
    
    for i, table in enumerate(tables):
        print(f"\nTable {i+1}:")
        rows = table.find_all('tr')
        print(f"  Rows: {len(rows)}")
        
        # Show first few rows
        for j, row in enumerate(rows[:5]):
            cells = row.find_all(['td', 'th'])
            cell_texts = [cell.get_text().strip() for cell in cells]
            print(f"    Row {j+1}: {cell_texts}")
    
    # Check for divs with data
    divs = soup.find_all('div')
    print(f"\nFound {len(divs)} divs")
    
    # Look for divs that might contain player names
    player_divs = []
    for div in divs:
        text = div.get_text().strip()
        if text and any(name in text for name in ['Josh', 'Allen', 'Lamar', 'Jackson', 'quarterback']):
            player_divs.append(text[:100])
    
    if player_divs:
        print(f"Divs with player-like content:")
        for player_div in player_divs[:5]:
            print(f"  {player_div}...")
    
    # Check for JSON data in scripts
    scripts = soup.find_all('script')
    print(f"\nFound {len(scripts)} script tags")
    
    for i, script in enumerate(scripts):
        if script.string and len(script.string) > 100:
            script_content = script.string
            if any(keyword in script_content.lower() for keyword in ['data', 'josh', 'allen', 'ranking']):
                print(f"Script {i+1} (relevant):")
                print(f"  Length: {len(script_content)} chars")
                print(f"  First 300 chars: {script_content[:300]}...")
    
    # Save the raw HTML for inspection
    with open('datawrapper_debug.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    print(f"\nSaved DataWrapper HTML to datawrapper_debug.html")
    
    # Look for any element that contains player names
    all_text = soup.get_text()
    lines = [line.strip() for line in all_text.split('\n') if line.strip()]
    
    player_lines = []
    for line in lines:
        if any(name in line for name in ['Josh Allen', 'Lamar Jackson', 'Patrick Mahomes']):
            player_lines.append(line)
    
    if player_lines:
        print(f"\nLines containing known QB names:")
        for line in player_lines:
            print(f"  {line}")

except Exception as e:
    print(f"Error: {e}")