class TradeCalculator {
    constructor() {
        this.scoringFormat = 'ppr'; // 'ppr' or 'half'
        this.leagueType = '1qb'; // '1qb' or '2qb'
        this.givingPlayers = [];
        this.receivingPlayers = [];
        this.maxPlayers = 4;

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupSearch();
    }

    bindEvents() {
        // Scoring format buttons
        document.getElementById('ppr-btn').addEventListener('click', () => {
            this.setScoringFormat('ppr');
        });

        document.getElementById('half-ppr-btn').addEventListener('click', () => {
            this.setScoringFormat('half');
        });

        // League type buttons
        document.getElementById('1qb-btn').addEventListener('click', () => {
            this.setLeagueType('1qb');
        });

        document.getElementById('2qb-btn').addEventListener('click', () => {
            this.setLeagueType('2qb');
        });
    }

    setScoringFormat(format) {
        this.scoringFormat = format;

        // Update UI
        document.querySelectorAll('[data-scoring]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-scoring="${format}"]`).classList.add('active');

        // Recalculate if players are selected
        this.updateTotals();
    }

    setLeagueType(type) {
        this.leagueType = type;

        // Update UI
        document.querySelectorAll('[data-league]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-league="${type}"]`).classList.add('active');

        // Recalculate if players are selected
        this.updateTotals();
    }

    setupSearch() {
        const searchGiving = document.getElementById('search-giving');
        const searchReceiving = document.getElementById('search-receiving');
        const dropdownGiving = document.getElementById('dropdown-giving');
        const dropdownReceiving = document.getElementById('dropdown-receiving');

        // Setup search for giving side
        searchGiving.addEventListener('input', (e) => {
            this.handleSearch(e.target.value, dropdownGiving, 'giving');
        });

        searchGiving.addEventListener('focus', (e) => {
            if (e.target.value.trim()) {
                this.handleSearch(e.target.value, dropdownGiving, 'giving');
            }
        });

        // Setup search for receiving side
        searchReceiving.addEventListener('input', (e) => {
            this.handleSearch(e.target.value, dropdownReceiving, 'receiving');
        });

        searchReceiving.addEventListener('focus', (e) => {
            if (e.target.value.trim()) {
                this.handleSearch(e.target.value, dropdownReceiving, 'receiving');
            }
        });

        // Click outside to close dropdowns
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('search-input') && !e.target.closest('.search-dropdown')) {
                dropdownGiving.classList.remove('active');
                dropdownReceiving.classList.remove('active');
            }
        });
    }

    handleSearch(query, dropdown, side) {
        if (!query.trim()) {
            dropdown.classList.remove('active');
            return;
        }

        const results = this.searchPlayers(query);
        this.displaySearchResults(results, dropdown, side);
    }

    searchPlayers(query) {
        const searchTerm = query.toLowerCase();
        const results = [];

        // Search through all positions
        ['qb', 'rb', 'wr', 'te'].forEach(position => {
            const players = tradeValuesData[position] || [];
            players.forEach(player => {
                if (player.player.toLowerCase().includes(searchTerm)) {
                    results.push({
                        ...player,
                        position: position.toUpperCase()
                    });
                }
            });
        });

        // Sort by relevance (exact match first, then by rank)
        results.sort((a, b) => {
            const aExact = a.player.toLowerCase() === searchTerm;
            const bExact = b.player.toLowerCase() === searchTerm;
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.rank - b.rank;
        });

        return results.slice(0, 20); // Limit to 20 results
    }

    displaySearchResults(results, dropdown, side) {
        if (results.length === 0) {
            dropdown.innerHTML = '<div style="padding: 10px; color: #999;">No players found</div>';
            dropdown.classList.add('active');
            return;
        }

        dropdown.innerHTML = '';
        results.forEach(player => {
            const value = this.getPlayerValue(player);
            const isAlreadySelected = this.isPlayerSelected(player);

            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result';
            if (isAlreadySelected) {
                resultDiv.style.opacity = '0.5';
                resultDiv.style.cursor = 'not-allowed';
            }

            resultDiv.innerHTML = `
                <div class="player-info">
                    <div class="player-name">${player.player}</div>
                    <div class="player-position">${player.position} - Rank #${player.rank}</div>
                </div>
                <div class="player-value">${value}</div>
            `;

            if (!isAlreadySelected) {
                resultDiv.addEventListener('click', () => {
                    this.addPlayer(player, side);
                    dropdown.classList.remove('active');
                    document.getElementById(`search-${side}`).value = '';
                });
            }

            dropdown.appendChild(resultDiv);
        });

        dropdown.classList.add('active');
    }

    getPlayerValue(player) {
        const position = player.position.toLowerCase();

        if (position === 'qb') {
            return this.leagueType === '1qb' ? player.value1QB : player.value2QB;
        } else {
            // RB, WR, TE use PPR or Half-PPR values
            if (this.scoringFormat === 'ppr') {
                return player.valuePPR || 0;
            } else {
                return player.valueHALF || 0;
            }
        }
    }

    isPlayerSelected(player) {
        const allSelected = [...this.givingPlayers, ...this.receivingPlayers];
        return allSelected.some(p => p.player === player.player && p.position === player.position);
    }

    addPlayer(player, side) {
        const players = side === 'giving' ? this.givingPlayers : this.receivingPlayers;

        if (players.length >= this.maxPlayers) {
            alert(`You can only add up to ${this.maxPlayers} players per side`);
            return;
        }

        players.push(player);
        this.updatePlayerList(side);
        this.updateTotals();
    }

    removePlayer(playerIndex, side) {
        const players = side === 'giving' ? this.givingPlayers : this.receivingPlayers;
        players.splice(playerIndex, 1);
        this.updatePlayerList(side);
        this.updateTotals();
    }

    updatePlayerList(side) {
        const players = side === 'giving' ? this.givingPlayers : this.receivingPlayers;
        const container = document.getElementById(`${side}-players`);

        if (players.length === 0) {
            container.innerHTML = '<div class="empty-state">No players selected</div>';
            return;
        }

        container.innerHTML = '';
        players.forEach((player, index) => {
            const value = this.getPlayerValue(player);
            const playerDiv = document.createElement('div');
            playerDiv.className = 'selected-player';
            playerDiv.innerHTML = `
                <div>
                    <div style="font-weight: 600;">${player.player}</div>
                    <div style="font-size: 12px; color: #666;">${player.position} - Value: ${value}</div>
                </div>
                <button class="remove-player" onclick="tradeCalc.removePlayer(${index}, '${side}')">Remove</button>
            `;
            container.appendChild(playerDiv);
        });
    }

    updateTotals() {
        const givingTotal = this.calculateTotal(this.givingPlayers);
        const receivingTotal = this.calculateTotal(this.receivingPlayers);

        document.getElementById('giving-total').textContent = givingTotal;
        document.getElementById('receiving-total').textContent = receivingTotal;

        this.updateTradeResult(givingTotal, receivingTotal);
    }

    calculateTotal(players) {
        return players.reduce((total, player) => {
            return total + this.getPlayerValue(player);
        }, 0);
    }

    updateTradeResult(givingTotal, receivingTotal) {
        const resultDiv = document.getElementById('trade-result');
        const summaryDiv = document.getElementById('result-summary');
        const percentageDiv = document.getElementById('percentage-diff');

        if (givingTotal === 0 && receivingTotal === 0) {
            resultDiv.style.display = 'none';
            return;
        }

        resultDiv.style.display = 'block';

        const difference = receivingTotal - givingTotal;
        const percentDiff = givingTotal > 0 ? Math.abs((difference / givingTotal) * 100) : 0;

        if (difference > 0) {
            // Winning the trade
            summaryDiv.className = 'result-summary winning-trade';
            summaryDiv.textContent = '✅ You WIN this trade!';
            percentageDiv.innerHTML = `You're receiving <strong>${percentDiff.toFixed(1)}%</strong> more value (+${difference} points)`;
        } else if (difference < 0) {
            // Losing the trade
            summaryDiv.className = 'result-summary losing-trade';
            summaryDiv.textContent = '❌ You LOSE this trade';
            percentageDiv.innerHTML = `You're giving away <strong>${percentDiff.toFixed(1)}%</strong> more value (-${Math.abs(difference)} points)`;
        } else {
            // Even trade
            summaryDiv.className = 'result-summary even-trade';
            summaryDiv.textContent = '⚖️ This is an EVEN trade';
            percentageDiv.textContent = 'Both sides have equal value';
        }
    }
}

// Initialize the calculator when the page loads
let tradeCalc;
document.addEventListener('DOMContentLoaded', () => {
    tradeCalc = new TradeCalculator();
});