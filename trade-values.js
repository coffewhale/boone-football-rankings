class TradeValuesApp {
    constructor() {
        this.currentPosition = 'qb';
        this.tradeValues = {};
        this.articleTimestamp = null;

        // Yahoo article URL for timestamp
        this.articleUrl = 'https://sports.yahoo.com/fantasy/article/rest-of-season-trade-value-charts--justin-boones-fantasy-football-quarterback-breakdown-180401789.html';

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

            // Fetch article timestamp
            this.fetchArticleTimestamp();

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
            // Add timestamp to bypass cache - ensures fresh data every page load
            const urlWithCacheBust = `${csvUrl}?t=${Date.now()}`;
            console.log(`📊 Fetching CSV: ${urlWithCacheBust}`);
            
            const response = await fetch(urlWithCacheBust, {
                cache: 'no-store', // Forces browser to bypass cache
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
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
        
        const dataRows = [];
        
        // Parse header to get all column names
        const headerFields = this.parseCSVLine(lines[0]);
        const cleanedHeaders = headerFields.map(h => this.cleanText(h));
        
        console.log(`📋 CSV Headers: ${cleanedHeaders.join(', ')}`);
        
        // Parse all data rows - no filtering, no ranking logic
        for (let i = 1; i < lines.length; i++) {
            try {
                const fields = this.parseCSVLine(lines[i]);
                if (fields.length === 0) continue;
                
                // Create row object with all columns exactly as they appear
                const rowData = {
                    rowIndex: i,
                    allColumns: {}
                };
                
                // Map every column to the row object
                fields.forEach((field, index) => {
                    const cleanField = this.cleanText(field);
                    const columnName = cleanedHeaders[index] || `Column${index}`;
                    rowData.allColumns[columnName] = cleanField;
                });
                
                // Only skip completely empty rows
                const hasData = Object.values(rowData.allColumns).some(val => val && val.trim() !== '');
                if (hasData) {
                    dataRows.push(rowData);
                }
                
            } catch (e) {
                console.log(`Parse error on line ${i}:`, e);
                continue;
            }
        }
        
        console.log(`📊 Parsed ${dataRows.length} data rows`);
        return dataRows; // Return in original order, no sorting
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
        
        // Get all available columns from first row
        const firstRow = values[0];
        const availableColumns = Object.keys(firstRow.allColumns || {});
        
        // Update table headers to show ALL columns exactly as they appear in CSV
        thead.innerHTML = availableColumns.map(col => `<th>${col}</th>`).join('');
        
        // Populate table with ALL columns in original order
        values.forEach(row => {
            const tableRow = document.createElement('tr');
            
            const allColumns = availableColumns
                .map(col => `<td class="data-cell">${row.allColumns[col] || ''}</td>`)
                .join('');
            
            tableRow.innerHTML = allColumns;
            tbody.appendChild(tableRow);
        });
        
        console.log(`📊 Displayed ${values.length} rows for ${positionName} with columns:`, availableColumns);
    }

    async fetchArticleTimestamp() {
        // Since trade values update weekly and don't need automation,
        // we can just hardcode the date and update it manually
        // Update this date when new trade values are published
        const hardcodedDate = '2025-09-10T12:00:00Z'; // Update this date weekly

        this.articleTimestamp = hardcodedDate;
        this.displayPublishedDate(hardcodedDate);
    }

    displayPublishedDate(timestamp) {
        // Check if element exists, if not create it
        let dateElement = document.getElementById('article-published');
        if (!dateElement) {
            // Create the element and insert it after the h1
            const header = document.querySelector('header h1');
            dateElement = document.createElement('p');
            dateElement.id = 'article-published';
            dateElement.className = 'article-date';
            dateElement.style.cssText = 'text-align: center; margin: 10px 0; color: #666; font-size: 14px;';
            header.insertAdjacentElement('afterend', dateElement);
        }

        if (timestamp) {
            const date = new Date(timestamp);
            const options = {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            };
            const formattedDate = date.toLocaleDateString('en-US', options);
            dateElement.innerHTML = `📝 Published: <time datetime="${timestamp}">${formattedDate}</time>`;
        } else {
            dateElement.innerHTML = `📝 Rest of Season Trade Values`;
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradeValuesApp();
});