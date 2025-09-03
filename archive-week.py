#!/usr/bin/env python3
"""
Archive Week Script - Save completed week data with actual results
Run this after a week is completed to archive the results
"""

import json
import requests
from datetime import datetime

def archive_week(week_number, rankings_with_results):
    """
    Archive a completed week with actual fantasy results
    
    Args:
        week_number: Week number (1-18)
        rankings_with_results: Dictionary with position rankings including actual results
    """
    
    # Prepare the data for archiving
    archive_data = {
        'weekNumber': week_number,
        'weekData': rankings_with_results,
        'completed': True
    }
    
    # Save to local JSON file for backup
    filename = f'week_{week_number}_archive.json'
    with open(filename, 'w') as f:
        json.dump(archive_data, f, indent=2)
    
    print(f"✅ Week {week_number} archived to {filename}")
    
    # Also try to save to serverless function if deployed
    try:
        response = requests.post('YOUR_SITE_URL/.netlify/functions/save-week-data', 
                               json=archive_data)
        if response.ok:
            print(f"✅ Week {week_number} saved to cloud storage")
        else:
            print(f"❌ Failed to save to cloud: {response.text}")
    except Exception as e:
        print(f"⚠️  Cloud save failed (site not deployed?): {e}")

def create_sample_week_1_results():
    """
    Sample function showing how to create completed week data
    Replace with actual fantasy results
    """
    
    week_1_results = {
        'qb': [
            { 'preGameRank': 1, 'player': 'Josh Allen', 'opponent': 'vs ARI', 'actualPoints': 28.3, 'actualRank': 1 },
            { 'preGameRank': 2, 'player': 'Lamar Jackson', 'opponent': 'vs KC', 'actualPoints': 21.7, 'actualRank': 5 },
            { 'preGameRank': 3, 'player': 'Dak Prescott', 'opponent': 'vs CLE', 'actualPoints': 25.4, 'actualRank': 2 },
            { 'preGameRank': 4, 'player': 'Jalen Hurts', 'opponent': 'vs GB', 'actualPoints': 18.2, 'actualRank': 8 },
            { 'preGameRank': 5, 'player': 'Joe Burrow', 'opponent': 'vs NE', 'actualPoints': 22.9, 'actualRank': 4 },
            { 'preGameRank': 6, 'player': 'Kyler Murray', 'opponent': '@ BUF', 'actualPoints': 16.1, 'actualRank': 12 },
            { 'preGameRank': 7, 'player': 'Tua Tagovailoa', 'opponent': 'vs JAX', 'actualPoints': 24.8, 'actualRank': 3 },
            { 'preGameRank': 8, 'player': 'Jayden Daniels', 'opponent': 'vs TB', 'actualPoints': 19.5, 'actualRank': 7 },
            { 'preGameRank': 9, 'player': 'Brock Purdy', 'opponent': 'vs NYJ', 'actualPoints': 20.3, 'actualRank': 6 },
            { 'preGameRank': 10, 'player': 'C.J. Stroud', 'opponent': 'vs IND', 'actualPoints': 17.8, 'actualRank': 9 }
        ],
        'rb': [
            { 'preGameRank': 1, 'player': 'Christian McCaffrey', 'opponent': 'vs NYJ', 'actualPoints': 31.4, 'actualRank': 1 },
            { 'preGameRank': 2, 'player': 'Bijan Robinson', 'opponent': 'vs PIT', 'actualPoints': 18.7, 'actualRank': 4 },
            { 'preGameRank': 3, 'player': 'Breece Hall', 'opponent': '@ SF', 'actualPoints': 12.3, 'actualRank': 8 },
            { 'preGameRank': 4, 'player': 'Saquon Barkley', 'opponent': 'vs GB', 'actualPoints': 24.1, 'actualRank': 2 },
            { 'preGameRank': 5, 'player': 'Josh Jacobs', 'opponent': '@ PHI', 'actualPoints': 21.6, 'actualRank': 3 }
        ],
        'wr': [
            { 'preGameRank': 1, 'player': 'Tyreek Hill', 'opponent': 'vs JAX', 'actualPoints': 22.4, 'actualRank': 2 },
            { 'preGameRank': 2, 'player': 'CeeDee Lamb', 'opponent': 'vs CLE', 'actualPoints': 28.1, 'actualRank': 1 },
            { 'preGameRank': 3, 'player': 'A.J. Brown', 'opponent': 'vs GB', 'actualPoints': 15.8, 'actualRank': 6 },
            { 'preGameRank': 4, 'player': 'Ja\'Marr Chase', 'opponent': 'vs NE', 'actualPoints': 19.3, 'actualRank': 4 },
            { 'preGameRank': 5, 'player': 'Amon-Ra St. Brown', 'opponent': 'vs LAR', 'actualPoints': 17.2, 'actualRank': 5 }
        ],
        'te': [
            { 'preGameRank': 1, 'player': 'Travis Kelce', 'opponent': '@ BAL', 'actualPoints': 16.4, 'actualRank': 1 },
            { 'preGameRank': 2, 'player': 'Mark Andrews', 'opponent': 'vs KC', 'actualPoints': 8.7, 'actualRank': 8 },
            { 'preGameRank': 3, 'player': 'Sam LaPorta', 'opponent': 'vs LAR', 'actualPoints': 12.1, 'actualRank': 3 },
            { 'preGameRank': 4, 'player': 'George Kittle', 'opponent': 'vs NYJ', 'actualPoints': 14.2, 'actualRank': 2 },
            { 'preGameRank': 5, 'player': 'Trey McBride', 'opponent': '@ BUF', 'actualPoints': 11.8, 'actualRank': 4 }
        ],
        'flex': [
            { 'preGameRank': 1, 'player': 'Christian McCaffrey', 'opponent': 'vs NYJ', 'actualPoints': 31.4, 'actualRank': 1 },
            { 'preGameRank': 2, 'player': 'Tyreek Hill', 'opponent': 'vs JAX', 'actualPoints': 22.4, 'actualRank': 4 },
            { 'preGameRank': 3, 'player': 'CeeDee Lamb', 'opponent': 'vs CLE', 'actualPoints': 28.1, 'actualRank': 2 },
            { 'preGameRank': 4, 'player': 'Bijan Robinson', 'opponent': 'vs PIT', 'actualPoints': 18.7, 'actualRank': 6 },
            { 'preGameRank': 5, 'player': 'A.J. Brown', 'opponent': 'vs GB', 'actualPoints': 15.8, 'actualRank': 8 }
        ],
        'def': [
            { 'preGameRank': 1, 'player': 'San Francisco 49ers', 'opponent': 'vs NYJ', 'actualPoints': 18.0, 'actualRank': 1 },
            { 'preGameRank': 2, 'player': 'Dallas Cowboys', 'opponent': 'vs CLE', 'actualPoints': 12.0, 'actualRank': 4 },
            { 'preGameRank': 3, 'player': 'Buffalo Bills', 'opponent': 'vs ARI', 'actualPoints': 15.0, 'actualRank': 2 },
            { 'preGameRank': 4, 'player': 'Miami Dolphins', 'opponent': 'vs JAX', 'actualPoints': 8.0, 'actualRank': 8 },
            { 'preGameRank': 5, 'player': 'Pittsburgh Steelers', 'opponent': '@ ATL', 'actualPoints': 14.0, 'actualRank': 3 }
        ],
        'k': [
            { 'preGameRank': 1, 'player': 'Justin Tucker', 'opponent': 'vs KC', 'actualPoints': 12.0, 'actualRank': 2 },
            { 'preGameRank': 2, 'player': 'Tyler Bass', 'opponent': 'vs ARI', 'actualPoints': 15.0, 'actualRank': 1 },
            { 'preGameRank': 3, 'player': 'Brandon McManus', 'opponent': 'vs GB', 'actualPoints': 9.0, 'actualRank': 5 },
            { 'preGameRank': 4, 'player': 'Harrison Butker', 'opponent': '@ BAL', 'actualPoints': 11.0, 'actualRank': 3 },
            { 'preGameRank': 5, 'player': 'Jake Moody', 'opponent': 'vs NYJ', 'actualPoints': 10.0, 'actualRank': 4 }
        ]
    }
    
    return week_1_results

def main():
    print("🏈 Week Archive Tool")
    print("This tool archives completed week data with actual fantasy results.")
    print()
    
    # Example: Archive Week 1 with sample results
    week_number = 1
    sample_results = create_sample_week_1_results()
    
    print(f"Archiving sample Week {week_number} results...")
    archive_week(week_number, sample_results)
    
    print()
    print("📝 To archive real results:")
    print("1. Update the rankings data with actual fantasy points and ranks")
    print("2. Call archive_week(week_number, your_results_data)")
    print("3. The data will be saved locally and uploaded to your site")
    
    print()
    print("💡 Analysis for sample Week 1:")
    
    # Quick analysis of the sample data
    for position, rankings in sample_results.items():
        correct_predictions = sum(1 for p in rankings if p['preGameRank'] == p['actualRank'])
        total = len(rankings)
        accuracy = (correct_predictions / total) * 100
        
        avg_diff = sum(abs(p['preGameRank'] - p['actualRank']) for p in rankings) / total
        
        print(f"  {position.upper()}: {correct_predictions}/{total} exact ({accuracy:.1f}%), avg diff: ±{avg_diff:.1f}")

if __name__ == "__main__":
    main()