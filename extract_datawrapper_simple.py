#!/usr/bin/env python3
"""
Simple extraction of DataWrapper data
"""

import requests
from bs4 import BeautifulSoup
import json
import re

datawrapper_url = "https://datawrapper.dwcdn.net/bqgx9/1/"

try:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    response = session.get(datawrapper_url)
    html_content = response.text
    
    # Look for the data in a simpler way
    # Search for patterns that look like CSV data or table data
    
    # Method 1: Look for Josh Allen, Lamar Jackson etc directly in the HTML
    players_found = []
    qb_names = ['Josh Allen', 'Lamar Jackson', 'Patrick Mahomes', 'Tua Tagovailoa', 'Jalen Hurts', 'Joe Burrow']
    
    for qb in qb_names:
        if qb in html_content:
            players_found.append(qb)
            print(f"Found {qb} in DataWrapper HTML")
    
    if players_found:
        print(f"\nFound {len(players_found)} QB names in the HTML")
        
        # Try to extract surrounding context for each player
        for qb in players_found:
            # Find the context around the player name
            start = html_content.find(qb)
            if start != -1:
                context = html_content[max(0, start-100):start+200]
                print(f"\nContext for {qb}:")
                print(f"  ...{context}...")
    
    # Method 2: Look for JSON patterns
    json_matches = re.findall(r'\[.*?\]', html_content)
    for i, match in enumerate(json_matches):
        if any(qb in match for qb in qb_names):
            print(f"\nJSON match {i+1} with QB data:")
            print(f"  {match[:300]}...")
    
    # Method 3: Look for CSV-like patterns
    csv_patterns = re.findall(r'["\']([^"\']*(?:Josh Allen|Lamar Jackson|Patrick Mahomes)[^"\']*)["\']', html_content)
    if csv_patterns:
        print(f"\nCSV-like patterns:")
        for pattern in csv_patterns[:5]:
            print(f"  {pattern}")

except Exception as e:
    print(f"Error: {e}")