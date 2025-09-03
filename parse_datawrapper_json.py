#!/usr/bin/env python3
"""
Parse the DataWrapper JSON data
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
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Find the script with __DW_SVELTE_PROPS__
    for script in soup.find_all('script'):
        if script.string and '__DW_SVELTE_PROPS__' in script.string:
            script_content = script.string
            
            # Extract the JSON data
            match = re.search(r'window\.__DW_SVELTE_PROPS__ = JSON\.parse\("(.+?)"\);', script_content)
            if match:
                json_string = match.group(1)
                
                # Decode the escaped JSON string
                json_string = json_string.encode().decode('unicode_escape')
                
                try:
                    data = json.loads(json_string)
                    
                    print("Successfully parsed DataWrapper JSON!")
                    print(f"Top-level keys: {list(data.keys())}")
                    
                    # Navigate the data structure
                    if 'chart' in data:
                        chart_data = data['chart']
                        print(f"Chart keys: {list(chart_data.keys())}")
                        
                        # Look for data or dataset
                        if 'data' in chart_data:
                            chart_dataset = chart_data['data']
                            print(f"Data keys: {list(chart_dataset.keys())}")
                            
                            # Look for the actual rankings data
                            if 'json' in chart_dataset:
                                rankings_data = chart_dataset['json']
                                print(f"Found {len(rankings_data)} data rows")
                                
                                # Show first few rows
                                for i, row in enumerate(rankings_data[:10]):
                                    print(f"Row {i+1}: {row}")
                                    
                            # Also check for csv data
                            if 'csv' in chart_dataset:
                                csv_data = chart_dataset['csv']
                                print(f"\nCSV data preview:")
                                print(csv_data[:500])
                    
                    # Save the parsed data
                    with open('datawrapper_parsed.json', 'w') as f:
                        json.dump(data, f, indent=2)
                    print(f"\nSaved parsed data to datawrapper_parsed.json")
                    
                except json.JSONDecodeError as e:
                    print(f"JSON parse error: {e}")
                    print(f"JSON string preview: {json_string[:500]}...")
                
            break
    else:
        print("Could not find __DW_SVELTE_PROPS__ script")

except Exception as e:
    print(f"Error: {e}")