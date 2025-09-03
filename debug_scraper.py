#!/usr/bin/env python3
"""
Debug script to examine Yahoo Sports HTML structure
"""

import requests
from bs4 import BeautifulSoup
import json

# Test with the QB URL first
test_url = "https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html"

print(f"Fetching: {test_url}")

try:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    response = session.get(test_url)
    response.raise_for_status()
    
    print(f"Status Code: {response.status_code}")
    print(f"Content Length: {len(response.content)} bytes")
    
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Check title
    title = soup.find('h1')
    print(f"Title: {title.get_text().strip() if title else 'No title found'}")
    
    # Look for various ranking structures
    print("\n=== DEBUGGING HTML STRUCTURE ===")
    
    # Check for ordered lists
    ol_tags = soup.find_all('ol')
    print(f"Found {len(ol_tags)} <ol> tags")
    for i, ol in enumerate(ol_tags[:3]):  # Show first 3
        items = ol.find_all('li')
        print(f"  OL {i+1}: {len(items)} items")
        if items:
            print(f"    First item: {items[0].get_text().strip()[:100]}...")
    
    # Check for unordered lists
    ul_tags = soup.find_all('ul')
    print(f"Found {len(ul_tags)} <ul> tags")
    
    # Check for numbered paragraphs
    paragraphs = soup.find_all('p')
    numbered_ps = [p for p in paragraphs if p.get_text().strip().startswith(('1.', '2.', '3.'))]
    print(f"Found {len(numbered_ps)} numbered paragraphs")
    if numbered_ps:
        print(f"  First numbered p: {numbered_ps[0].get_text().strip()[:100]}...")
    
    # Check for tables
    tables = soup.find_all('table')
    print(f"Found {len(tables)} <table> tags")
    
    # Look for div containers that might hold rankings
    divs_with_text = soup.find_all('div', string=lambda text: text and any(num in text for num in ['1.', '2.', '3.']))
    print(f"Found {len(divs_with_text)} divs with numbered content")
    
    # Look for common ranking patterns in all text
    all_text = soup.get_text()
    lines = [line.strip() for line in all_text.split('\n') if line.strip()]
    
    # Find lines that look like rankings (start with numbers)
    ranking_lines = []
    for line in lines:
        if line and line[0].isdigit() and '.' in line[:5]:
            ranking_lines.append(line)
    
    print(f"\nFound {len(ranking_lines)} potential ranking lines:")
    for i, line in enumerate(ranking_lines[:10]):  # Show first 10
        print(f"  {i+1}: {line[:100]}...")
    
    # Save a snippet of HTML for manual inspection
    print(f"\n=== SAVING HTML SNIPPET ===")
    with open('debug_html_snippet.html', 'w', encoding='utf-8') as f:
        # Save first 10000 chars of body content
        body = soup.find('body')
        if body:
            f.write(str(body)[:10000])
        else:
            f.write(str(soup)[:10000])
    
    print("Saved HTML snippet to debug_html_snippet.html")
    
    # Look for specific Yahoo patterns
    print(f"\n=== YAHOO-SPECIFIC PATTERNS ===")
    
    # Look for content areas
    content_areas = soup.find_all(['div'], class_=lambda x: x and any(word in x.lower() for word in ['content', 'article', 'story', 'rankings', 'list']))
    print(f"Found {len(content_areas)} potential content areas")
    
    # Look for script tags that might contain JSON data
    scripts = soup.find_all('script')
    json_scripts = []
    for script in scripts:
        if script.string and ('{' in script.string and '"' in script.string):
            json_scripts.append(script)
    print(f"Found {len(json_scripts)} scripts with potential JSON data")
    
except Exception as e:
    print(f"Error: {e}")