class RankingsApp {
    constructor() {
        this.currentPosition = 'qb';
        this.rankings = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTimestamp();
        this.loadRankings();
    }

    bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const position = e.target.dataset.position;
                this.switchPosition(position);
            });
        });
    }

    async loadTimestamp() {
        try {
            const response = await fetch('/.netlify/functions/get-timestamp');
            if (response && response.ok) {
                const result = await response.json();
                if (result.success && result.timestamp) {
                    this.updateArticlePublishedDisplay(result.timestamp);
                }
            }
        } catch (error) {
            console.log('Failed to fetch timestamp:', error);
            // Fallback to hardcoded timestamp if API fails
            this.updateArticlePublishedDisplay('2025-09-02T18:16:43.000Z');
        }
    }

    switchPosition(position) {
        // Update active button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-position="${position}"]`).classList.add('active');
        
        this.currentPosition = position;
        this.displayRankings();
    }

    async loadRankings() {
        try {
            // Try to fetch local rankings.json first
            const response = await fetch('./rankings.json');
            if (response && response.ok) {
                const rankings = await response.json();
                this.rankings = rankings;
                
                // Update published timestamp and week from rankings.json
                if (rankings.lastUpdated) {
                    this.updateArticlePublishedDisplay(rankings.lastUpdated);
                }
                if (rankings.week) {
                    this.currentWeek = rankings.week;
                }
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('rankings-table').style.display = 'block';
                this.displayRankings();
                return;
            }
        } catch (error) {
            console.log('Failed to fetch rankings.json, trying live data:', error);
        }

        try {
            // Try to fetch live data from Netlify function
            const response = await fetch('/.netlify/functions/update-rankings');
            if (response && response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    this.rankings = result.data;
                    
                    // Show article timestamp
                    this.updateArticlePublishedDisplay(result.articleTimestamp);
                    
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('rankings-table').style.display = 'block';
                    this.displayRankings();
                    return;
                }
            }
        } catch (error) {
            console.log('Failed to fetch live data, using mock data:', error);
        }

        // Fallback to mock data if both fail
        this.loadMockData();
        
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('rankings-table').style.display = 'block';
        this.displayRankings();
    }
    
    loadMockData() {
        this.rankings = {
            qb: [
                { rank: 1, player: 'Josh Allen', opponent: 'vs ARI' },
                { rank: 2, player: 'Lamar Jackson', opponent: 'vs KC' },
                { rank: 3, player: 'Dak Prescott', opponent: 'vs CLE' },
                { rank: 4, player: 'Jalen Hurts', opponent: 'vs GB' },
                { rank: 5, player: 'Joe Burrow', opponent: 'vs NE' },
                { rank: 6, player: 'Kyler Murray', opponent: '@ BUF' },
                { rank: 7, player: 'Tua Tagovailoa', opponent: 'vs JAX' },
                { rank: 8, player: 'Jayden Daniels', opponent: 'vs TB' },
                { rank: 9, player: 'Brock Purdy', opponent: 'vs NYJ' },
                { rank: 10, player: 'C.J. Stroud', opponent: 'vs IND' }
            ],
            rb: [
                { rank: 1, player: 'Christian McCaffrey', opponent: 'vs NYJ' },
                { rank: 2, player: 'Bijan Robinson', opponent: 'vs PIT' },
                { rank: 3, player: 'Breece Hall', opponent: '@ SF' },
                { rank: 4, player: 'Saquon Barkley', opponent: 'vs GB' },
                { rank: 5, player: 'Josh Jacobs', opponent: '@ PHI' }
            ],
            wr: [
                { rank: 1, player: 'Tyreek Hill', opponent: 'vs JAX' },
                { rank: 2, player: 'CeeDee Lamb', opponent: 'vs CLE' },
                { rank: 3, player: 'A.J. Brown', opponent: 'vs GB' },
                { rank: 4, player: 'Ja\'Marr Chase', opponent: 'vs NE' },
                { rank: 5, player: 'Amon-Ra St. Brown', opponent: 'vs LAR' }
            ],
            te: [
                { rank: 1, player: 'Travis Kelce', opponent: '@ BAL' },
                { rank: 2, player: 'Mark Andrews', opponent: 'vs KC' },
                { rank: 3, player: 'Sam LaPorta', opponent: 'vs LAR' },
                { rank: 4, player: 'George Kittle', opponent: 'vs NYJ' },
                { rank: 5, player: 'Trey McBride', opponent: '@ BUF' }
            ],
            flex: [
                { rank: 1, player: 'Christian McCaffrey', opponent: 'vs NYJ' },
                { rank: 2, player: 'Tyreek Hill', opponent: 'vs JAX' },
                { rank: 3, player: 'CeeDee Lamb', opponent: 'vs CLE' },
                { rank: 4, player: 'Bijan Robinson', opponent: 'vs PIT' },
                { rank: 5, player: 'A.J. Brown', opponent: 'vs GB' }
            ],
            def: [
                { rank: 1, player: 'San Francisco 49ers', opponent: 'vs NYJ' },
                { rank: 2, player: 'Dallas Cowboys', opponent: 'vs CLE' },
                { rank: 3, player: 'Buffalo Bills', opponent: 'vs ARI' },
                { rank: 4, player: 'Miami Dolphins', opponent: 'vs JAX' },
                { rank: 5, player: 'Pittsburgh Steelers', opponent: '@ ATL' }
            ],
            k: [
                { rank: 1, player: 'Justin Tucker', opponent: 'vs KC' },
                { rank: 2, player: 'Tyler Bass', opponent: 'vs ARI' },
                { rank: 3, player: 'Brandon McManus', opponent: 'vs GB' },
                { rank: 4, player: 'Harrison Butker', opponent: '@ BAL' },
                { rank: 5, player: 'Jake Moody', opponent: 'vs NYJ' }
            ]
        };
    }

    displayRankings() {
        const position = this.currentPosition;
        const rankings = this.rankings[position] || [];
        const positionNames = {
            qb: 'Quarterback',
            rb: 'Running Back',
            wr: 'Wide Receiver',
            te: 'Tight End',
            flex: 'FLEX (RB/WR/TE)',
            def: 'Defense/Special Teams',
            k: 'Kicker'
        };

        const weekNumber = this.getCurrentWeekNumber();
        document.getElementById('position-title').textContent = 
            `${positionNames[position]} Rankings - Week ${weekNumber}`;
        
        const tbody = document.getElementById('rankings-body');
        tbody.innerHTML = '';

        rankings.forEach(player => {
            const row = document.createElement('tr');
            
            // For FLEX, show position rank if available
            const playerDisplay = position === 'flex' && player.positionRank
                ? `${player.player} <span class="position-rank">(${player.positionRank})</span>`
                : player.player;
            
            row.innerHTML = `
                <td class="rank-cell">${player.preGameRank || player.rank}</td>
                <td class="player-cell">${playerDisplay}</td>
                <td>${player.opponent}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    getCurrentWeekNumber() {
        // Use week from rankings.json if available, otherwise calculate
        if (this.currentWeek) {
            return this.currentWeek;
        }
        
        // Calculate current NFL week based on season start
        const seasonStart = new Date('2025-09-05'); // Adjust for actual season start
        const now = new Date();
        const weeksDiff = Math.floor((now - seasonStart) / (7 * 24 * 60 * 60 * 1000));
        return Math.max(1, Math.min(18, weeksDiff + 1));
    }

    
    updateArticlePublishedDisplay(articleTimestamp) {
        const articleEl = document.getElementById('article-published');
        if (articleTimestamp && articleEl) {
            const date = new Date(articleTimestamp);
            const options = {
                year: 'numeric',
                month: 'long', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            };
            const formattedDate = date.toLocaleDateString('en-US', options);
            articleEl.innerHTML = `📝 Published: <time datetime="${articleTimestamp}">${formattedDate}</time>`;
        }
    }
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'just now';
    }

    // Auto-refresh functionality (silent background updates)
    startAutoRefresh() {
        setInterval(() => {
            console.log('Background refresh check...');
            this.loadRankings(); // Silent update
        }, 3600000); // 1 hour
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.rankingsApp = new RankingsApp();
    
    // Start auto-refresh after initial load
    setTimeout(() => {
        window.rankingsApp.startAutoRefresh();
    }, 5000);
});