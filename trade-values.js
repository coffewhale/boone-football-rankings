class TradeValuesApp {
    constructor() {
        this.currentPosition = 'qb';
        this.tradeValues = {};
        
        // CSV URLs for trade values (update these URLs as needed)
        this.csvUrls = {
            qb: 'https://datawrapper.dwcdn.net/55HXy/2/dataset.csv',
            rb: 'https://datawrapper.dwcdn.net/NDAon/3/dataset.csv', // Replace ADD_RB_ID
            wr: 'https://datawrapper.dwcdn.net/1z4ZP/2/dataset.csv', // Replace ADD_WR_ID  
            te: 'https://datawrapper.dwcdn.net/6w0UZ/3/dataset.csv'
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
        
        // Parse header to get all column names
        const headerFields = this.parseCSVLine(lines[0]);
        const cleanedHeaders = headerFields.map(h => this.cleanText(h));
        
        console.log(`📋 CSV Headers: ${cleanedHeaders.join(', ')}`);
        
        // Find key columns with flexible matching
        const fieldMap = {
            rank: this.findFieldIndex(cleanedHeaders, ['rank', '#', 'ranking']),
            player: this.findFieldIndex(cleanedHeaders, ['player', 'name', 'team']),
            value: this.findFieldIndex(cleanedHeaders, ['value', 'trade value', 'points', 'score'])
        };
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const fields = this.parseCSVLine(lines[i]);
                if (fields.length < 2) continue;
                
                // Create player object with all available data
                const playerData = {
                    rank: null,
                    player: null,
                    allColumns: {}
                };
                
                // Map all columns to the player object
                fields.forEach((field, index) => {
                    const cleanField = this.cleanText(field);
                    const columnName = cleanedHeaders[index] || `Column${index}`;
                    playerData.allColumns[columnName] = cleanField;
                });
                
                // Extract key fields
                let rank = this.extractField(fields, fieldMap.rank) || this.extractField(fields, [0, 1, 2]);
                let player = this.extractField(fields, fieldMap.player) || this.extractField(fields, [1, 2, 3]);
                
                rank = parseInt(rank);
                player = this.cleanText(player);
                
                if (!rank || !player || rank < 1 || rank > 500) continue;
                
                playerData.rank = rank;
                playerData.player = player;
                
                players.push(playerData);
                
            } catch (e) {
                console.log(`Parse error on line ${i}:`, e);
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
        const thead = document.querySelector('.rankings-table thead tr');
        const positionTitle = document.getElementById('position-title');
        
        // Update title
        const positionName = this.currentPosition.toUpperCase();
        positionTitle.textContent = `${positionName} Trade Values`;
        
        // Clear existing content
        tbody.innerHTML = '';
        
        if (values.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">No trade values available for this position</td></tr>';
            return;
        }
        
        // Get all available columns from first player
        const firstPlayer = values[0];
        const availableColumns = Object.keys(firstPlayer.allColumns || {});
        
        // Update table headers dynamically
        thead.innerHTML = `
            <th>Rank</th>
            <th>Player</th>
            ${availableColumns
                .filter(col => !['rank', 'player', 'name'].some(excluded => col.toLowerCase().includes(excluded)))
                .map(col => `<th>${col}</th>`)
                .join('')}
        `;
        
        // Populate table with all columns
        values.forEach(player => {
            const row = document.createElement('tr');
            
            const additionalColumns = availableColumns
                .filter(col => !['rank', 'player', 'name'].some(excluded => col.toLowerCase().includes(excluded)))
                .map(col => `<td class="data-cell">${player.allColumns[col] || ''}</td>`)
                .join('');
            
            row.innerHTML = `
                <td class="rank-cell">${player.rank}</td>
                <td class="player-cell">${player.player}</td>
                ${additionalColumns}
            `;
            tbody.appendChild(row);
        });
        
        console.log(`📊 Displayed ${values.length} ${positionName} trade values with columns:`, availableColumns);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradeValuesApp();
});