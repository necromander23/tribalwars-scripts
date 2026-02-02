javascript:

// Check if we're on the correct page
if (window.location.href.indexOf('screen=ally&mode=members_defense') < 0) {
    window.location.assign(game_data.link_base_pure + "ally&mode=members_defense");
    throw new Error("Redirecting to correct page");
}

// Configuration
const CONFIG = {
    hasArchers: true // Will be loaded from localStorage
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('dtc_settings');
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
    localStorage.setItem('dtc_settings', JSON.stringify(settings));
}

loadSettings();

// Unit names
const DEFENSIVE_UNITS = ['spear', 'sword', 'archer', 'heavy'];

const UNIT_NAMES_GR = {
    spear: 'Δορατοφόρος',
    sword: 'Ξιφομάχος',
    archer: 'Τοξότης',
    heavy: 'Βαρύ ιππικό'
};

// Global data storage
const DATA = {
    players: [],
    playerStats: {},
    unitIcons: {}
};

// Clean up any previous script runs
$(".defensive-troop-counter").remove();
$("#progressbar").remove();

// Inject CSS styles
const CSS_STYLES = `
<style>
.defensive-troop-counter {
    margin: 10px 0;
}

.dtc-header {
    background-color: #202225;
    color: white;
    padding: 15px;
    font-size: 20px;
    font-weight: bold;
    border-radius: 5px 5px 0 0;
}

.dtc-author {
    text-align: right;
    font-size: 12px;
    color: #99AAB5;
    font-style: italic;
    margin-top: 5px;
}

.dtc-settings {
    background-color: #40444B;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #202225;
}

.dtc-settings label {
    color: white;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.dtc-settings input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
}

.dtc-settings button {
    background-color: #5865F2;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.dtc-settings button:hover {
    background-color: #4752C4;
}

.dtc-tribe-totals {
    background-color: #2C2F33;
    margin-bottom: 20px;
    border-radius: 5px;
    overflow: hidden;
    border: 2px solid #43B581;
}

.dtc-tribe-header {
    background-color: #43B581;
    color: white;
    padding: 10px 15px;
    font-size: 18px;
    font-weight: bold;
    text-align: center;
}

.dtc-player-section {
    background-color: #2C2F33;
    margin-bottom: 15px;
    border-radius: 5px;
    overflow: hidden;
}

.dtc-player-name {
    background-color: #23272A;
    color: white;
    padding: 12px 15px;
    font-size: 16px;
    font-weight: bold;
}

.dtc-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    padding: 15px;
    background-color: #36393F;
}

.dtc-stat-row {
    color: white;
    padding: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #40444B;
    border-radius: 3px;
}

.dtc-stat-label {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.dtc-stat-value {
    font-weight: bold;
    color: #43B581;
    font-size: 16px;
}

.dtc-unit-icon {
    width: 24px;
    height: 24px;
}

.dtc-collapsible {
    background-color: #40444B;
    color: white;
    cursor: pointer;
    padding: 12px 15px;
    width: 100%;
    border: none;
    text-align: left;
    outline: none;
    font-size: 14px;
    font-weight: 500;
    transition: background-color 0.2s;
}

.dtc-collapsible:hover {
    background-color: #484C52;
}

.dtc-collapsible:after {
    content: '+';
    color: white;
    font-weight: bold;
    float: right;
    font-size: 18px;
}

.dtc-collapsible.active:after {
    content: '-';
}

.dtc-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out;
    background-color: #2C2F33;
}

.dtc-villages-list {
    padding: 15px;
}

.dtc-village-item {
    padding: 10px;
    margin: 5px 0;
    background-color: #40444B;
    border-radius: 3px;
    color: white;
}

.dtc-village-name {
    font-weight: bold;
    color: #7289DA;
    margin-bottom: 5px;
}

.dtc-village-troops {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5px;
    font-size: 13px;
    margin-top: 5px;
}

.dtc-troop-detail {
    display: flex;
    align-items: center;
    gap: 5px;
}

.dtc-progressbar {
    width: 100%;
    background-color: #2C2F33;
    border-radius: 5px;
    margin: 10px 0;
    overflow: hidden;
}

.dtc-progress {
    height: 30px;
    background: linear-gradient(90deg, #43B581 0%, #5EC97D 100%);
    text-align: center;
    line-height: 30px;
    color: white;
    font-weight: bold;
    transition: width 0.3s ease;
    width: 0%;
}

.dtc-loading {
    text-align: center;
    padding: 20px;
    color: white;
    background-color: #36393F;
    border-radius: 5px;
    margin: 10px 0;
}

.dtc-info-box {
    background-color: #5865F2;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    margin-bottom: 15px;
    font-size: 14px;
}

.dtc-village-count {
    font-size: 14px;
    color: #99AAB5;
    margin-left: 10px;
}
</style>`;

$("head").append(CSS_STYLES);

// Utility function to add thousands separators
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Parse coordinates from village name
function parseCoordinates(villageName) {
    const match = villageName.match(/(\d+)\|(\d+)/);
    if (match) {
        return {
            x: parseInt(match[1]),
            y: parseInt(match[2])
        };
    }
    return null;
}

// Sequential request handler with delay
function fetchSequentially(urls, onEach, onComplete, onError) {
    let index = 0;
    const delay = 200; // ms between requests

    function fetchNext() {
        if (index >= urls.length) {
            onComplete();
            return;
        }

        const currentIndex = index;
        const url = urls[index];
        index++;

        $.get(url)
            .done(function(data) {
                try {
                    onEach(currentIndex, data);
                    updateProgress(index, urls.length);
                    setTimeout(fetchNext, delay);
                } catch (e) {
                    console.error(`Error processing data for index ${currentIndex}:`, e);
                    onError(e);
                }
            })
            .fail(function(xhr) {
                onError(xhr);
            });
    }

    fetchNext();
}

// Update progress bar
function updateProgress(current, total) {
    const percentage = Math.round((current / total) * 100);
    $(".dtc-progress").css("width", percentage + "%").text(percentage + "%");
}

// Show progress bar
function showProgress() {
    const progressHTML = `
        <div class="dtc-progressbar">
            <div class="dtc-progress">0%</div>
        </div>
        <div class="dtc-loading">Loading player defense data...</div>
    `;
    $("#contentContainer").prepend(progressHTML);
}

// Hide progress bar
function hideProgress() {
    $(".dtc-progressbar").remove();
    $(".dtc-loading").remove();
}

// Step 1: Get all player IDs and names from the select element
function getPlayerList() {
    const players = [];
    $('select[name="player_id"] option').each(function() {
        const $option = $(this);
        // Skip hidden option (placeholder)
        if ($option.attr('hidden') !== undefined) {
            return;
        }
        
        const playerId = $option.val();
        const playerName = $option.text().trim();
        
        if (playerId && playerName) {
            players.push({
                id: playerId,
                name: playerName
            });
        }
    });
    
    return players;
}

// Step 2: Extract unit icons from the table header
function extractUnitIcons($data) {
    const icons = {};
    const $table = $data.find('table.vis.w100');
    const $headerRow = $table.find('tr').first();
    const $headerCells = $headerRow.find('th');
    
    // Based on user requirements:
    // th#3 = spear, th#4 = sword, th#6 = archer, th#10 = heavy
    const unitMapping = [
        { index: 3, unit: 'spear' },
        { index: 4, unit: 'sword' },
        { index: 6, unit: 'archer' },
        { index: 10, unit: 'heavy' }
    ];
    
    unitMapping.forEach(mapping => {
        const $th = $headerCells.eq(mapping.index);
        const $img = $th.find('img[src*="unit_"]');
        if ($img.length > 0) {
            icons[mapping.unit] = $img.attr('src');
        }
    });
    
    return icons;
}

// Step 3: Parse village defense data from a player's defense page
function parsePlayerDefense($data) {
    const villages = [];
    const $table = $data.find('table.vis.w100');
    const $rows = $table.find('tr');
    
    // Skip first row (header), then process pairs of rows
    for (let i = 1; i < $rows.length; i += 2) {
        const $evenRow = $rows.eq(i);     // Village name + troops in home
        const $oddRow = $rows.eq(i + 1);   // Troops outside
        
        // Skip if not enough rows
        if (i + 1 >= $rows.length) {
            break;
        }
        
        // Extract village name and coordinates from first td of even row
        const $villageCell = $evenRow.find('td').first();
        const $villageLink = $villageCell.find('a');
        const villageName = $villageLink.text().trim();
        
        // Only process villages with "*" in their name
        if (!villageName.includes('*')) {
            continue;
        }
        
        const village = {
            name: villageName,
            coords: parseCoordinates(villageName),
            inHome: {},
            outside: {},
            total: {}
        };
        
        // Get troops in home (even row)
        // td#3 = spear, td#4 = sword, td#6 = archer, td#10 = heavy
        const $evenCells = $evenRow.find('td');
        village.inHome.spear = parseInt($evenCells.eq(3).text().trim()) || 0;
        village.inHome.sword = parseInt($evenCells.eq(4).text().trim()) || 0;
        village.inHome.archer = CONFIG.hasArchers ? (parseInt($evenCells.eq(6).text().trim()) || 0) : 0;
        village.inHome.heavy = parseInt($evenCells.eq(10).text().trim()) || 0;
        
        // Get troops outside (odd row)
        // td#1 = spear, td#2 = sword, td#4 = archer, td#8 = heavy
        const $oddCells = $oddRow.find('td');
        village.outside.spear = parseInt($oddCells.eq(1).text().trim()) || 0;
        village.outside.sword = parseInt($oddCells.eq(2).text().trim()) || 0;
        village.outside.archer = CONFIG.hasArchers ? (parseInt($oddCells.eq(4).text().trim()) || 0) : 0;
        village.outside.heavy = parseInt($oddCells.eq(8).text().trim()) || 0;
        
        // Calculate totals
        DEFENSIVE_UNITS.forEach(unit => {
            if (unit === 'archer' && !CONFIG.hasArchers) {
                village.total[unit] = 0;
            } else {
                village.total[unit] = (village.inHome[unit] || 0) + (village.outside[unit] || 0);
            }
        });
        
        villages.push(village);
    }
    
    return villages;
}

// Step 4: Calculate player statistics
function calculatePlayerStats(villages) {
    const stats = {
        villageCount: villages.length,
        totalUnits: {
            spear: 0,
            sword: 0,
            archer: 0,
            heavy: 0
        },
        villages: villages
    };
    
    // Sum up all units from all villages
    villages.forEach(village => {
        DEFENSIVE_UNITS.forEach(unit => {
            if (unit === 'archer' && !CONFIG.hasArchers) {
                return;
            }
            stats.totalUnits[unit] += village.total[unit] || 0;
        });
    });
    
    return stats;
}

// Step 5: Display results
function displayResults() {
    let html = '<div class="defensive-troop-counter">';
    html += '<div class="dtc-header">Defensive Troops Calculator (* Villages Only)<div class="dtc-author">Script by antonistsam</div></div>';
    
    // Settings panel
    html += '<div class="dtc-settings">';
    html += '<label><input type="checkbox" id="dtc-archer-mode" ' + (CONFIG.hasArchers ? 'checked' : '') + '> Server has archers</label>';
    html += '<button id="dtc-reload-btn">Apply & Reload</button>';
    html += '</div>';
    
    // Info box
    html += '<div class="dtc-info-box">';
    html += '📊 Only counting villages with "*" character in their names';
    html += '</div>';
    
    // Calculate tribe totals
    const tribeTotals = {
        spear: 0,
        sword: 0,
        archer: 0,
        heavy: 0,
        villageCount: 0
    };
    
    DATA.players.forEach(player => {
        const stats = DATA.playerStats[player.name];
        if (stats) {
            tribeTotals.villageCount += stats.villageCount;
            DEFENSIVE_UNITS.forEach(unit => {
                if (unit === 'archer' && !CONFIG.hasArchers) {
                    return;
                }
                tribeTotals[unit] += stats.totalUnits[unit];
            });
        }
    });
    
    // Display tribe totals
    html += `<div class="dtc-tribe-totals">`;
    html += `<div class="dtc-tribe-header">Tribe Totals (${tribeTotals.villageCount} * villages)</div>`;
    html += `<div class="dtc-stats-grid">`;
    
    DEFENSIVE_UNITS.forEach(unit => {
        if (unit === 'archer' && !CONFIG.hasArchers) {
            return;
        }
        const iconSrc = DATA.unitIcons[unit] || '';
        html += `<div class="dtc-stat-row">`;
        html += `<span class="dtc-stat-label">`;
        if (iconSrc) {
            html += `<img src="${iconSrc}" class="dtc-unit-icon" />`;
        } else {
            html += `${UNIT_NAMES_GR[unit]}:`;
        }
        html += `</span>`;
        html += `<span class="dtc-stat-value">${formatNumber(tribeTotals[unit])}</span>`;
        html += `</div>`;
    });
    
    html += `</div>`; // End stats grid
    html += `</div>`; // End tribe totals
    
    // Display per-player stats
    DATA.players.forEach(player => {
        const stats = DATA.playerStats[player.name];
        if (!stats) return;
        
        html += `<div class="dtc-player-section">`;
        html += `<div class="dtc-player-name">${player.name}<span class="dtc-village-count">(${stats.villageCount} * villages)</span></div>`;
        
        // Stats grid
        html += `<div class="dtc-stats-grid">`;
        
        DEFENSIVE_UNITS.forEach(unit => {
            if (unit === 'archer' && !CONFIG.hasArchers) {
                return;
            }
            const iconSrc = DATA.unitIcons[unit] || '';
            html += `<div class="dtc-stat-row">`;
            html += `<span class="dtc-stat-label">`;
            if (iconSrc) {
                html += `<img src="${iconSrc}" class="dtc-unit-icon" />`;
            } else {
                html += `${UNIT_NAMES_GR[unit]}:`;
            }
            html += `</span>`;
            html += `<span class="dtc-stat-value">${formatNumber(stats.totalUnits[unit])}</span>`;
            html += `</div>`;
        });
        
        html += `</div>`; // End stats grid
        
        // Collapsible village details
        if (stats.villages.length > 0) {
            html += `<button class="dtc-collapsible">Show Villages (${stats.villages.length})</button>`;
            html += `<div class="dtc-content">`;
            html += `<div class="dtc-villages-list">`;
            
            stats.villages.forEach(village => {
                html += `<div class="dtc-village-item">`;
                html += `<div class="dtc-village-name">${village.name}</div>`;
                html += `<div class="dtc-village-troops">`;
                
                DEFENSIVE_UNITS.forEach(unit => {
                    if (unit === 'archer' && !CONFIG.hasArchers) {
                        return;
                    }
                    html += `<div class="dtc-troop-detail">`;
                    const iconSrc = DATA.unitIcons[unit] || '';
                    if (iconSrc) {
                        html += `<img src="${iconSrc}" class="dtc-unit-icon" />`;
                    }
                    html += `<strong>${formatNumber(village.total[unit])}</strong>`;
                    html += ` (Home: ${formatNumber(village.inHome[unit])}, Outside: ${formatNumber(village.outside[unit])})`;
                    html += `</div>`;
                });
                
                html += `</div>`; // End village troops
                html += `</div>`; // End village item
            });
            
            html += `</div>`; // End villages list
            html += `</div>`; // End content
        }
        
        html += `</div>`; // End player section
    });
    
    html += '</div>'; // End defensive-troop-counter
    
    $("#contentContainer").prepend(html);
    
    // Make collapsibles work
    makeCollapsible();
    
    // Setup settings change handler
    $('#dtc-reload-btn').on('click', function() {
        const hasArchers = $('#dtc-archer-mode').is(':checked');
        CONFIG.hasArchers = hasArchers;
        saveSettings();
        
        // Clear and reload
        $('.defensive-troop-counter').remove();
        DATA.players = [];
        DATA.playerStats = {};
        DATA.unitIcons = {};
        main();
    });
}

// Make collapsible sections work
function makeCollapsible() {
    $(".dtc-collapsible").off('click').on('click', function() {
        $(this).toggleClass("active");
        const $content = $(this).next(".dtc-content");
        
        if ($content.css("max-height") !== "0px") {
            $content.css("max-height", "0px");
        } else {
            $content.css("max-height", $content[0].scrollHeight + "px");
        }
    });
}

// Main execution
function main() {
    console.log("Starting Defensive Troops Calculator...");
    
    // Step 1: Get player list
    DATA.players = getPlayerList();
    console.log(`Found ${DATA.players.length} players`);
    
    if (DATA.players.length === 0) {
        alert("No players found! Make sure you're on the ally members defense page.");
        return;
    }
    
    // Step 2: Extract unit icons from current page
    DATA.unitIcons = extractUnitIcons($(document));
    console.log("Unit icons extracted:", DATA.unitIcons);
    
    // Show progress
    showProgress();
    
    // Step 3: Fetch each player's defense data
    const playerUrls = DATA.players.map(player => 
        `${window.location.origin}${window.location.pathname}?screen=ally&mode=members_defense&player_id=${player.id}`
    );
    
    fetchSequentially(
        playerUrls,
        (index, data) => {
            const player = DATA.players[index];
            console.log(`Processing player ${index + 1}/${DATA.players.length}: ${player.name}`);
            
            const $data = $(data);
            const villages = parsePlayerDefense($data);
            const stats = calculatePlayerStats(villages);
            
            DATA.playerStats[player.name] = stats;
            
            updateProgress(index + 1, DATA.players.length);
        },
        () => {
            console.log("All players processed");
            hideProgress();
            displayResults();
        },
        (error) => {
            console.error("Error fetching data:", error);
            alert("An error occurred while fetching player data. Check console for details.");
            hideProgress();
        }
    );
}

// Run the script
main();
