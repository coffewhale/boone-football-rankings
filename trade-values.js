class TradeValuesApp {
    constructor() {
        this.currentPosition = 'qb';
        this.tradeValues = {};
        
        // CSV URLs for trade values (update these URLs as needed)
        this.csvUrls = {
            qb: 'https://datawrapper.dwcdn.net/1z4ZP/2/dataset.csv',
            rb: 'https://datawrapper.dwcdn.net/ADD_RB_ID/2/dataset.csv', // Replace ADD_RB_ID
            wr: 'https://datawrapper.dwcdn.net/ADD_WR_ID/2/dataset.csv', // Replace ADD_WR_ID  
            te: 'https://datawrapper.dwcdn.net/ADD_TE_ID/2/dataset.csv'  // Replace ADD_TE_ID
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadAllTradeValues();
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
        this.displayTradeValues();
    }

    async loadAllTradeValues() {
        const loadingEl = document.getElementById('loading');
        
        try {
            loadingEl.textContent = 'Loading trade values...';
            
            // Load all positions in parallel
            const promises = Object.entries(this.csvUrls).map(async ([position, url]) => {
                try {
                    const data = await this.fetchCSVData(url);
                    this.tradeValues[position] = data;
                    console.log(`✅ Loaded ${data.length} ${position.toUpperCase()} trade values`);
                } catch (error) {
                    console.error(`❌ Failed to load ${position} trade values:`, error);
                    this.tradeValues[position] = [];
                }
            });
            
            await Promise.all(promises);
            
            // Hide loading and show table
            loadingEl.style.display = 'none';
            document.getElementById('rankings-table').style.display = 'block';
            
            // Display initial position
            this.displayTradeValues();
            
        } catch (error) {
            console.error('Error loading trade values:', error);
            loadingEl.textContent = 'Failed to load trade values. Please refresh the page.';
        }
    }

    async fetchCSVData(csvUrl) {
        try {
            console.log(`📊 Fetching CSV: ${csvUrl}`);
            
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${csvUrl}`);
            }
            
            const csvText = await response.text();
            return this.parseCSV(csvText);
            
        } catch (error) {
            console.error(`Failed to fetch ${csvUrl}:`, error);
            return [];
        }
    }

    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const players = [];
        const header = lines[0].toLowerCase();
        
        // Parse header to find column positions
        const headerFields = this.parseCSVLine(header);
        const fieldMap = {
            rank: this.findFieldIndex(headerFields, ['rank', '#']),
            player: this.findFieldIndex(headerFields, ['player', 'name']),
            value: this.findFieldIndex(headerFields, ['value', 'trade value', 'points']),
        };
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const fields = this.parseCSVLine(lines[i]);
                if (fields.length < 3) continue;
                
                let rank = this.extractField(fields, fieldMap.rank) || this.extractField(fields, [0, 1, 2]);
                let player = this.extractField(fields, fieldMap.player) || this.extractField(fields, [1, 2, 3]);
                let value = this.extractField(fields, fieldMap.value) || this.extractField(fields, [-1, -2]);
                
                rank = parseInt(rank);
                player = this.cleanText(player);
                value = this.cleanText(value);
                
                if (!rank || !player || rank < 1 || rank > 200) continue;
                
                players.push({
                    rank: rank,
                    player: player,
                    value: value || 'N/A'
                });
                
            } catch (e) {
                continue;
            }
        }
        
        return players.sort((a, b) => a.rank - b.rank);
    }

    parseCSVLine(line) {
        const fields = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField);
        return fields;
    }

    findFieldIndex(headerFields, possibleNames) {
        for (let i = 0; i < headerFields.length; i++) {
            const field = headerFields[i].toLowerCase().trim();
            if (possibleNames.some(name => field.includes(name))) {
                return i;
            }
        }
        return -1;
    }

    extractField(fields, indexOrArray) {
        if (typeof indexOrArray === 'number') {
            if (indexOrArray < 0) {
                return fields[fields.length + indexOrArray];
            }
            return fields[indexOrArray];
        }
        
        if (Array.isArray(indexOrArray)) {
            for (const index of indexOrArray) {
                const value = this.extractField(fields, index);
                if (value && value.trim()) return value;
            }
        }
        
        return null;
    }

    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/!\\[.*?\\]\\(.*?\\)/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/\\r/g, '')
            .trim();
    }

    displayTradeValues() {
        const values = this.tradeValues[this.currentPosition] || [];
        const tbody = document.getElementById('rankings-body');
        const positionTitle = document.getElementById('position-title');
        
        // Update title
        const positionName = this.currentPosition.toUpperCase();
        positionTitle.textContent = `${positionName} Trade Values`;
        
        // Clear existing content
        tbody.innerHTML = '';
        
        if (values.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center;">No trade values available for this position</td></tr>';
            return;
        }
        
        // Populate table
        values.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-cell">${player.rank}</td>
                <td class="player-cell">${player.player}</td>
                <td class="opponent-cell">${player.value}</td>
            `;
            tbody.appendChild(row);
        });
        
        console.log(`📊 Displayed ${values.length} ${positionName} trade values`);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradeValuesApp();
});