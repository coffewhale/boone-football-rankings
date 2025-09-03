#!/usr/bin/env python3
"""
Look for JSON data embedded in Yahoo Sports pages
"""

import requests
from bs4 import BeautifulSoup
import json
import re

test_url = "https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html"

print(f"Analyzing JSON data in: {test_url}")

try:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    response = session.get(test_url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Look for script tags with JSON
    scripts = soup.find_all('script')
    
    for i, script in enumerate(scripts):
        if script.string:
            script_content = script.string.strip()
            
            # Look for script tags that contain article content or rankings
            if any(keyword in script_content.lower() for keyword in ['ranking', 'player', 'quarterback', 'content', 'article']):
                print(f"\n=== SCRIPT TAG {i+1} (contains relevant keywords) ===")
                print(f"Length: {len(script_content)} chars")
                
                # Try to find JSON objects
                json_matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', script_content)
                
                for j, json_match in enumerate(json_matches[:3]):  # Show first 3 JSON objects
                    try:
                        parsed = json.loads(json_match)
                        print(f"  JSON Object {j+1}:")
                        print(f"    Keys: {list(parsed.keys()) if isinstance(parsed, dict) else 'Not a dict'}")
                        
                        # Look for content or text fields
                        if isinstance(parsed, dict):
                            for key, value in parsed.items():
                                if isinstance(value, str) and any(word in value.lower() for word in ['josh', 'allen', 'ranking', 'quarterback']):
                                    print(f"    {key}: {value[:200]}...")
                                    
                    except json.JSONDecodeError:
                        continue
                
                # Show first part of script
                print(f"  First 500 chars: {script_content[:500]}...")
                
                # Look for specific patterns
                if 'window.' in script_content or '__INITIAL_STATE__' in script_content:
                    print(f"  Contains window/state data!")
    
    # Look for Next.js data
    nextjs_data = soup.find('script', {'id': '__NEXT_DATA__'})
    if nextjs_data and nextjs_data.string:
        print(f"\n=== NEXT.JS DATA FOUND ===")
        try:
            next_json = json.loads(nextjs_data.string)
            print(f"Next.js data keys: {list(next_json.keys())}")
            
            # Explore the structure
            if 'props' in next_json:
                print(f"Props keys: {list(next_json['props'].keys())}")
                if 'pageProps' in next_json['props']:
                    print(f"PageProps keys: {list(next_json['props']['pageProps'].keys())}")
        except:
            print("Failed to parse Next.js JSON")
    
    # Look for any data attributes or inline JSON
    elements_with_data = soup.find_all(attrs={'data-reactroot': True})
    if elements_with_data:
        print(f"\n=== FOUND {len(elements_with_data)} REACT ROOT ELEMENTS ===")

except Exception as e:
    print(f"Error: {e}")