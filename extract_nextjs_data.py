#!/usr/bin/env python3
"""
Extract the article content from Yahoo Sports Next.js data
"""

import requests
from bs4 import BeautifulSoup
import json
import re

test_url = "https://sports.yahoo.com/fantasy/article/2025-fantasy-football-rankings-justin-boones-top-quarterbacks-for-week-1-174915206.html"

print(f"Extracting Next.js data from: {test_url}")

try:
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    })
    
    response = session.get(test_url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Look for the large script tag that contains article data
    scripts = soup.find_all('script')
    
    article_content = ""
    for script in scripts:
        if script.string and len(script.string) > 30000:  # The big one
            script_content = script.string
            
            print(f"Found large script with {len(script_content)} chars")
            
            # Look for the article content section
            # The data structure seems to be in self.__next_f.push format
            
            # Try to extract JSON-like content from the script
            # Look for patterns that might contain the article body
            
            # Search for content that looks like article text
            if 'initialArticle' in script_content:
                print("Found initialArticle reference!")
                
                # Look for body content
                body_matches = re.findall(r'"body":\s*"([^"]*)"', script_content)
                for i, body in enumerate(body_matches[:3]):
                    print(f"Body match {i+1}: {body[:200]}...")
                
                # Look for content patterns
                content_matches = re.findall(r'"content":\s*"([^"]*)"', script_content)
                for i, content in enumerate(content_matches[:5]):
                    print(f"Content match {i+1}: {content[:200]}...")
                
                # Look for text patterns
                text_matches = re.findall(r'"text":\s*"([^"]*)"', script_content)
                for i, text in enumerate(text_matches[:5]):
                    if len(text) > 50:  # Only longer text
                        print(f"Text match {i+1}: {text[:200]}...")
                
                # Look for HTML content
                html_matches = re.findall(r'"html":\s*"([^"]*)"', script_content)
                for i, html in enumerate(html_matches[:3]):
                    print(f"HTML match {i+1}: {html[:200]}...")
                
                # Try to find ranking-specific content
                ranking_patterns = [
                    r'1\.\s*[A-Z][a-z]+\s+[A-Z][a-z]+',  # "1. Josh Allen"
                    r'"1".*?"[A-Z][a-z]+\s+[A-Z][a-z]+"',  # JSON with "1" and player name
                    r'Josh Allen',  # Direct search for known player
                    r'quarterback',  # Position reference
                ]
                
                for pattern in ranking_patterns:
                    matches = re.findall(pattern, script_content, re.IGNORECASE)
                    if matches:
                        print(f"Pattern '{pattern}' found {len(matches)} matches:")
                        for match in matches[:3]:
                            print(f"  {match}")
                
                # Save the large script for manual inspection
                with open('nextjs_data.txt', 'w', encoding='utf-8') as f:
                    f.write(script_content)
                print("Saved Next.js data to nextjs_data.txt")
                
                break
    
    # Also check if there's a __NEXT_DATA__ script tag
    next_data_script = soup.find('script', id='__NEXT_DATA__')
    if next_data_script:
        print("\nFound __NEXT_DATA__ script!")
        try:
            next_data = json.loads(next_data_script.string)
            print(f"Next data keys: {list(next_data.keys())}")
            
            # Navigate through the structure to find article content
            if 'props' in next_data and 'pageProps' in next_data['props']:
                page_props = next_data['props']['pageProps']
                print(f"Page props keys: {list(page_props.keys())}")
                
                # Look for article or content data
                for key, value in page_props.items():
                    if isinstance(value, dict) and any(k in key.lower() for k in ['article', 'content', 'story']):
                        print(f"Found potential article data in key: {key}")
                        print(f"  Structure: {list(value.keys()) if isinstance(value, dict) else type(value)}")
        except:
            print("Could not parse __NEXT_DATA__")

except Exception as e:
    print(f"Error: {e}")