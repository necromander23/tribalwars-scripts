// Home Defensive Counter for Tribal Wars
// Load via: javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/homeDefensiveCounter.js");

// Check if we're on the overview page
if (window.location.href.indexOf('screen=overview_villages') < 0) {
    // Strip current screen parameter and add overview_villages
    const baseUrl = window.location.href.split('&screen=')[0].split('#')[0];
    window.location.assign(baseUrl + "&screen=overview_villages");
    throw new Error("Redirecting to overview page");
}

// Configuration
const CONFIG = {
    hasArchers: true, // Will be loaded from localStorage
    spearExcludePerVillage: 2000
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('hdc_settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            CONFIG.hasArchers = settings.hasArchers !== undefined ? settings.hasArchers : true;
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        hasArchers: CONFIG.hasArchers
    };
    localStorage.setItem('hdc_settings', JSON.stringify(settings));
}

loadSettings();

// Greek unit names for display
const UNIT_NAMES_GR = {
    spear: 'Δορατοφόρος',
    sword: 'Ξιφομάχος',
    archer: 'Τοξότης',
    heavy: 'Βαρύ ιππικό'
};

// Data storage
const DATA = {
    villages: [],
    unitIcons: {},
    totals: {
        spear: 0,
        sword: 0,
        archer: 0,
        heavy: 0
    }
};

// Utility function to add thousands separators
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Extract unit icons from the first table row
function extractUnitIcons() {
    const icons = {};
    const $table = $('table.vis.overview_table');
    const $headerRow = $table.find('tr').first();
    
    $headerRow.find('th img[src*="unit_"]').each(function() {
        const $img = $(this);
        const src = $img.attr('src');
        const title = $img.attr('data-title') || '';
        
        // Extract unit type from URL (e.g., unit_spear.webp -> spear)
        const match = src.match(/unit_(\w+)\.(?:webp|png)/);
        if (match) {
            const unitType = match[1];
            icons[unitType] = src;
        }
    });
    
    return icons;
}

// Parse number from text (handles "?" and empty values)
function parseUnitCount(text) {
    const trimmed = text.trim();
    if (trimmed === '' || trimmed === '?') {
        return 0;
    }
    // Remove dots used as thousand separators
    const cleaned = trimmed.replace(/\./g, '');
    return parseInt(cleaned) || 0;
}

// Count defensive troops from overview table
function countDefensiveTroops() {
    const $table = $('table.vis.overview_table');
    const $rows = $table.find('tr');
    
    // Process each village row (rows with nowrap class)
    $rows.each(function() {
        const $row = $(this);
        
        // Check if row has nowrap class
        if (!$row.attr('class') || $row.attr('class').indexOf('nowrap') < 0) {
            return;
        }
        
        const $cells = $row.find('td');
        
        // Skip if not enough cells
        if ($cells.length < 16) {
            return;
        }
        
        // Get village name from first cell
        const villageName = $cells.eq(0).text().trim();
        
        // Determine column indices based on archer mode
        let spearIndex, swordIndex, archerIndex, heavyIndex;
        
        if (CONFIG.hasArchers) {
            // With archers: spear(8), sword(9), axe(10), archer(11), spy(12), light(13), marcher(14), heavy(15)
            spearIndex = 8;
            swordIndex = 9;
            archerIndex = 11;
            heavyIndex = 15;
        } else {
            // Without archers: spear(8), sword(9), axe(10), spy(11), light(12), heavy(13)
            spearIndex = 8;
            swordIndex = 9;
            archerIndex = -1; // No archers
            heavyIndex = 13;
        }
        
        // Parse troop counts
        let spearCount = parseUnitCount($cells.eq(spearIndex).text());
        const swordCount = parseUnitCount($cells.eq(swordIndex).text());
        const archerCount = CONFIG.hasArchers ? parseUnitCount($cells.eq(archerIndex).text()) : 0;
        const heavyCount = parseUnitCount($cells.eq(heavyIndex).text());
        
        // Exclude 2000 spears per village
        if (spearCount > CONFIG.spearExcludePerVillage) {
            spearCount -= CONFIG.spearExcludePerVillage;
        } else {
            spearCount = 0;
        }
        
        // Store village data
        DATA.villages.push({
            name: villageName,
            spear: spearCount,
            sword: swordCount,
            archer: archerCount,
            heavy: heavyCount
        });
        
        // Add to totals
        DATA.totals.spear += spearCount;
        DATA.totals.sword += swordCount;
        DATA.totals.archer += archerCount;
        DATA.totals.heavy += heavyCount;
    });
}

// Inject CSS styles
function injectStyles() {
    const CSS_STYLES = `
<style>
.hdc-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 9998;
    display: flex;
    align-items: center;
    justify-content: center;
}

.hdc-popup {
    background-color: #2C2F33;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    max-width: 900px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 9999;
}

.hdc-header {
    background-color: #5865F2;
    color: white;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hdc-title {
    font-size: 24px;
    font-weight: bold;
}

.hdc-author {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    font-style: italic;
}

.hdc-close {
    background: none;
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.hdc-close:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.hdc-settings {
    background-color: #40444B;
    padding: 15px 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid #202225;
}

.hdc-settings label {
    color: white;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.hdc-settings input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
}

.hdc-settings button {
    background-color: #3BA55D;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.hdc-settings button:hover {
    background-color: #2D7D46;
}

.hdc-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.hdc-totals {
    background-color: #36393F;
    border-radius: 6px;
    padding: 20px;
    margin-bottom: 20px;
}

.hdc-totals-title {
    color: #7289DA;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
}

.hdc-totals-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.hdc-total-item {
    background-color: #40444B;
    border-radius: 4px;
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.hdc-unit-icon {
    width: 40px;
    height: 40px;
}

.hdc-unit-info {
    flex: 1;
}

.hdc-unit-name {
    color: #99AAB5;
    font-size: 13px;
    margin-bottom: 4px;
}

.hdc-unit-count {
    color: white;
    font-size: 20px;
    font-weight: bold;
}

.hdc-villages {
    background-color: #36393F;
    border-radius: 6px;
    padding: 20px;
}

.hdc-villages-title {
    color: #7289DA;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hdc-village-count {
    color: #99AAB5;
    font-size: 14px;
    font-weight: normal;
}

.hdc-villages-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
}

.hdc-village-item {
    background-color: #40444B;
    border-radius: 4px;
    padding: 12px;
    color: white;
}

.hdc-village-name {
    font-weight: bold;
    margin-bottom: 8px;
    color: #7289DA;
}

.hdc-village-troops {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    font-size: 13px;
}

.hdc-village-troop {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    background-color: #2C2F33;
    border-radius: 3px;
}

.hdc-troop-label {
    color: #99AAB5;
}

.hdc-troop-value {
    color: white;
    font-weight: 600;
}

.hdc-note {
    background-color: #F26522;
    color: white;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 20px;
    font-size: 13px;
}

.hdc-note strong {
    display: block;
    margin-bottom: 4px;
}
</style>`;
    
    $("head").append(CSS_STYLES);
}

// Display results in popup
function displayResults() {
    injectStyles();
    
    let html = '<div class="hdc-overlay">';
    html += '<div class="hdc-popup">';
    
    // Header
    html += '<div class="hdc-header">';
    html += '<div>';
    html += '<div class="hdc-title">Home Defensive Troops Counter</div>';
    html += '<div class="hdc-author">Script by antonistsam</div>';
    html += '</div>';
    html += '<button class="hdc-close" id="hdc-close">×</button>';
    html += '</div>';
    
    // Settings
    html += '<div class="hdc-settings">';
    html += '<label><input type="checkbox" id="hdc-archer-mode" ' + (CONFIG.hasArchers ? 'checked' : '') + '> Server has archers</label>';
    html += '<button id="hdc-recalculate">Recalculate</button>';
    html += '</div>';
    
    // Content
    html += '<div class="hdc-content">';
    
    // Note about excluded spears
    html += '<div class="hdc-note">';
    html += '<strong>📝 Note:</strong> ';
    html += `Excluding ${formatNumber(CONFIG.spearExcludePerVillage)} spears per village from the count (reserved troops).`;
    html += '</div>';
    
    // Totals
    html += '<div class="hdc-totals">';
    html += '<div class="hdc-totals-title">Total Defensive Troops</div>';
    html += '<div class="hdc-totals-grid">';
    
    // Spears
    html += '<div class="hdc-total-item">';
    if (DATA.unitIcons.spear) {
        html += `<img src="${DATA.unitIcons.spear}" class="hdc-unit-icon" alt="Spear">`;
    }
    html += '<div class="hdc-unit-info">';
    html += `<div class="hdc-unit-name">${UNIT_NAMES_GR.spear}</div>`;
    html += `<div class="hdc-unit-count">${formatNumber(DATA.totals.spear)}</div>`;
    html += '</div>';
    html += '</div>';
    
    // Swords
    html += '<div class="hdc-total-item">';
    if (DATA.unitIcons.sword) {
        html += `<img src="${DATA.unitIcons.sword}" class="hdc-unit-icon" alt="Sword">`;
    }
    html += '<div class="hdc-unit-info">';
    html += `<div class="hdc-unit-name">${UNIT_NAMES_GR.sword}</div>`;
    html += `<div class="hdc-unit-count">${formatNumber(DATA.totals.sword)}</div>`;
    html += '</div>';
    html += '</div>';
    
    // Archers (if applicable)
    if (CONFIG.hasArchers) {
        html += '<div class="hdc-total-item">';
        if (DATA.unitIcons.archer) {
            html += `<img src="${DATA.unitIcons.archer}" class="hdc-unit-icon" alt="Archer">`;
        }
        html += '<div class="hdc-unit-info">';
        html += `<div class="hdc-unit-name">${UNIT_NAMES_GR.archer}</div>`;
        html += `<div class="hdc-unit-count">${formatNumber(DATA.totals.archer)}</div>`;
        html += '</div>';
        html += '</div>';
    }
    
    // Heavy cavalry
    html += '<div class="hdc-total-item">';
    if (DATA.unitIcons.heavy) {
        html += `<img src="${DATA.unitIcons.heavy}" class="hdc-unit-icon" alt="Heavy">`;
    }
    html += '<div class="hdc-unit-info">';
    html += `<div class="hdc-unit-name">${UNIT_NAMES_GR.heavy}</div>`;
    html += `<div class="hdc-unit-count">${formatNumber(DATA.totals.heavy)}</div>`;
    html += '</div>';
    html += '</div>';
    
    html += '</div>'; // End totals grid
    html += '</div>'; // End totals
    
    // Villages breakdown
    html += '<div class="hdc-villages">';
    html += '<div class="hdc-villages-title">';
    html += 'Defensive Troops by Village';
    html += `<span class="hdc-village-count">${DATA.villages.length} villages</span>`;
    html += '</div>';
    html += '<div class="hdc-villages-grid">';
    
    DATA.villages.forEach(village => {
        html += '<div class="hdc-village-item">';
        html += `<div class="hdc-village-name">${village.name}</div>`;
        html += '<div class="hdc-village-troops">';
        
        html += '<div class="hdc-village-troop">';
        html += `<span class="hdc-troop-label">${UNIT_NAMES_GR.spear}:</span>`;
        html += `<span class="hdc-troop-value">${formatNumber(village.spear)}</span>`;
        html += '</div>';
        
        html += '<div class="hdc-village-troop">';
        html += `<span class="hdc-troop-label">${UNIT_NAMES_GR.sword}:</span>`;
        html += `<span class="hdc-troop-value">${formatNumber(village.sword)}</span>`;
        html += '</div>';
        
        if (CONFIG.hasArchers) {
            html += '<div class="hdc-village-troop">';
            html += `<span class="hdc-troop-label">${UNIT_NAMES_GR.archer}:</span>`;
            html += `<span class="hdc-troop-value">${formatNumber(village.archer)}</span>`;
            html += '</div>';
        }
        
        html += '<div class="hdc-village-troop">';
        html += `<span class="hdc-troop-label">${UNIT_NAMES_GR.heavy}:</span>`;
        html += `<span class="hdc-troop-value">${formatNumber(village.heavy)}</span>`;
        html += '</div>';
        
        html += '</div>'; // End troops
        html += '</div>'; // End village item
    });
    
    html += '</div>'; // End villages grid
    html += '</div>'; // End villages
    
    html += '</div>'; // End content
    html += '</div>'; // End popup
    html += '</div>'; // End overlay
    
    $('body').append(html);
    
    // Close button handler
    $('#hdc-close').on('click', function() {
        $('.hdc-overlay').remove();
    });
    
    // Click overlay to close
    $('.hdc-overlay').on('click', function(e) {
        if ($(e.target).hasClass('hdc-overlay')) {
            $('.hdc-overlay').remove();
        }
    });
    
    // Recalculate button handler
    $('#hdc-recalculate').on('click', function() {
        const hasArchers = $('#hdc-archer-mode').is(':checked');
        CONFIG.hasArchers = hasArchers;
        saveSettings();
        
        // Clear and recalculate
        $('.hdc-overlay').remove();
        DATA.villages = [];
        DATA.totals = { spear: 0, sword: 0, archer: 0, heavy: 0 };
        
        main();
    });
}

// Main execution
function main() {
    console.log("Starting Home Defensive Counter...");
    
    // Extract unit icons
    DATA.unitIcons = extractUnitIcons();
    console.log("Unit icons extracted:", DATA.unitIcons);
    
    // Count defensive troops
    countDefensiveTroops();
    console.log(`Processed ${DATA.villages.length} villages`);
    console.log("Totals:", DATA.totals);
    
    // Display results
    displayResults();
}

// Run the script
main();
