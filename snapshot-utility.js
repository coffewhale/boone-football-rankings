const fs = require('fs');
const path = require('path');

/**
 * Save current rankings as a weekly snapshot before updating
 */
function saveWeeklySnapshot(weekNumber, year = new Date().getFullYear()) {
  try {
    // Read current rankings
    const rankingsPath = path.join(__dirname, 'rankings.json');
    const rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf8'));
    
    // Create snapshot with metadata
    const snapshot = {
      week: weekNumber,
      year: year,
      timestamp: new Date().toISOString(),
      data: rankings
    };
    
    // Save snapshot
    const snapshotPath = path.join(__dirname, 'data', 'snapshots', year.toString(), `week-${weekNumber}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    // Update archive metadata
    updateArchive(weekNumber, year, new Date().toISOString());
    
    console.log(`✅ Snapshot saved: Week ${weekNumber}, ${year}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving snapshot:', error.message);
    return false;
  }
}

function updateArchive(week, year, timestamp) {
  const archivePath = path.join(__dirname, 'data', 'archive.json');
  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  
  archive.snapshots.push({
    week,
    year,
    timestamp,
    file: `data/snapshots/${year}/week-${week}.json`
  });
  
  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
}

/**
 * Get all available snapshots
 */
function getAvailableSnapshots() {
  const archivePath = path.join(__dirname, 'data', 'archive.json');
  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  return archive.snapshots;
}

/**
 * Load a specific snapshot
 */
function loadSnapshot(week, year) {
  const snapshotPath = path.join(__dirname, 'data', 'snapshots', year.toString(), `week-${week}.json`);
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
}

module.exports = {
  saveWeeklySnapshot,
  getAvailableSnapshots,
  loadSnapshot
};