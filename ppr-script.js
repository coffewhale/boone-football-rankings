class PPRRankingsApp {
    constructor() {
        this.currentPosition = 'qb';
        this.rankings = {};
        this.init();
    }

    init() {
        this.bindEvents();
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
            // Try to fetch PPR rankings first
            const response = await fetch('./ppr-rankings.json?v=' + Date.now()); // Cache busting
            if (response && response.ok) {
                const data = await response.json();

                // Convert new structure to old structure for compatibility
                this.rankings = {};

                // Map the rankings data
                if (data.rankings) {
                    // Convert RB, WR, TE, FLEX from new format
                    ['RB', 'WR', 'TE', 'FLEX'].forEach(pos => {
                        if (data.rankings[pos]) {
                            this.rankings[pos.toLowerCase()] = data.rankings[pos].map(player => ({
                                preGameRank: player.rank,
                                player: player.name,
                                team: player.team,
                                opponent: '-' // No opponent data in new structure
                            }));
                        }
                    });
                }

                // Update published timestamp and week from PPR data if available
                if (data.lastUpdated) {
                    this.updateArticlePublishedDisplay(data.lastUpdated);
                }
                if (data.week) {
                    this.currentWeek = data.week;
                }

                // Get QB, DEF, K from regular rankings since they're not in PPR data yet
                try {
                    const halfPprResponse = await fetch('./rankings.json?v=' + Date.now());
                    if (halfPprResponse && halfPprResponse.ok) {
                        const halfPprData = await halfPprResponse.json();
                        this.rankings.qb = halfPprData.qb || [];
                        this.rankings.def = halfPprData.def || [];
                        this.rankings.k = halfPprData.k || [];

                        // Use timestamp from half-PPR only if not available in PPR data
                        if (!data.lastUpdated && halfPprData.lastUpdated) {
                            this.updateArticlePublishedDisplay(halfPprData.lastUpdated);
                        }
                        if (!data.week && halfPprData.week) {
                            this.currentWeek = halfPprData.week;
                        }
                    }
                } catch (fallbackError) {
                    console.log('Failed to fetch QB/DEF/K from half-PPR rankings:', fallbackError);
                }

                document.getElementById('loading').style.display = 'none';
                document.getElementById('rankings-table').style.display = 'block';
                this.displayRankings();
                return;
            }
        } catch (error) {
            console.log('Failed to fetch ppr-rankings.json:', error);
        }

        // Final fallback to mock data
        this.loadMockData();
    }

    displayRankings() {
        const position = this.currentPosition;
        const positionData = this.rankings[position] || [];

        // Update title
        const titles = {
            'qb': 'Quarterback',
            'rb': 'Running Back',
            'wr': 'Wide Receiver',
            'te': 'Tight End',
            'flex': 'FLEX',
            'def': 'Defense',
            'k': 'Kicker'
        };

        const weekText = this.currentWeek ? ` - Week ${this.currentWeek}` : '';
        document.getElementById('position-title').textContent = `${titles[position]} Rankings (PPR)${weekText}`;

        // Populate table
        const tbody = document.getElementById('rankings-body');
        tbody.innerHTML = '';

        positionData.forEach(item => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td class="rank">${item.preGameRank || item.rank || '-'}</td>
                <td class="player-name">${item.player || '-'}</td>
            `;
            tbody.appendChild(row);
        });
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

    loadMockData() {
        // Fallback mock data for PPR
        this.rankings = {
            'qb': [
                { preGameRank: 1, player: 'Josh Allen', opponent: 'vs MIA' },
                { preGameRank: 2, player: 'Lamar Jackson', opponent: '@ BUF' }
            ],
            'rb': [
                { preGameRank: 1, player: 'Christian McCaffrey', opponent: 'vs ARI' },
                { preGameRank: 2, player: 'Austin Ekeler', opponent: 'vs TEN' }
            ],
            'wr': [
                { preGameRank: 1, player: 'Tyreek Hill', opponent: '@ BUF' },
                { preGameRank: 2, player: 'Cooper Kupp', opponent: 'vs SEA' }
            ],
            'te': [
                { preGameRank: 1, player: 'Travis Kelce', opponent: 'vs DET' },
                { preGameRank: 2, player: 'Mark Andrews', opponent: '@ CLE' }
            ],
            'flex': [
                { preGameRank: 1, player: 'Christian McCaffrey', opponent: 'vs ARI' },
                { preGameRank: 2, player: 'Tyreek Hill', opponent: '@ BUF' }
            ],
            'def': [
                { preGameRank: 1, player: 'Cowboys DST', opponent: 'vs NYG' },
                { preGameRank: 2, player: '49ers DST', opponent: 'vs ARI' }
            ],
            'k': [
                { preGameRank: 1, player: 'Justin Tucker', opponent: '@ CLE' },
                { preGameRank: 2, player: 'Harrison Butker', opponent: 'vs DET' }
            ]
        };

        this.currentWeek = '4';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('rankings-table').style.display = 'block';
        this.displayRankings();
    }

    // Auto-refresh functionality (silent background updates)
    startAutoRefresh() {
        setInterval(() => {
            console.log('Background refresh check for PPR rankings...');
            this.loadRankings(); // Silent update
        }, 3600000); // 1 hour
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pprRankingsApp = new PPRRankingsApp();

    // Start auto-refresh after initial load
    setTimeout(() => {
        window.pprRankingsApp.startAutoRefresh();
    }, 5000);
});