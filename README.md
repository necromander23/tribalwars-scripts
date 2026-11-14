# Tribal Wars Scripts

A collection of JavaScript scripts to enhance your Tribal Wars gameplay experience.

## Scripts

### 1. Home Defensive Counter (`homeDefensiveCounter.js`)

Counts defensive troops (spears, swords, archers, heavy cavalry) from all your villages in the overview page.

**Features:**
- Automatically redirects to the overview page if you're on a different screen
- Counts defensive troops: Spears, Swords, Archers, Heavy Cavalry
- Excludes 2000 spears per village (reserved troops)
- Shows totals and per-village breakdown in a popup
- Toggle for servers with/without archers
- Settings saved in localStorage

**How to use:**
1. Create a bookmark with the CDN loader (see Installation section)
2. Navigate to any page in your Tribal Wars account
3. Click the bookmark to run the script
4. The script will automatically redirect to the overview page and show the results in a popup

**Settings:**
- Check/uncheck "Server has archers" if your world has archer units
- Click "Recalculate" to refresh the count with the new setting

### 2. Tribe Members Troop Calculator (`tribeMembersTroopCalculator.js`)

Analyzes all tribe members' troops and categorizes villages by offensive/defensive strength.

**Features:**
- Counts all offensive and defensive villages for each tribe member
- Categorizes villages by strength (Full, 3/4, 1/2, 1/4)
- Shows unit totals per player
- Distance analysis from a reference village
- Excel-ready export for offensive villages
- Toggle for servers with/without archers

**How to use:**
1. Create a bookmark with the CDN loader (see Installation section)
2. Navigate to Tribe → Members → Troops page (or any page - it will redirect)
3. Click the bookmark
4. Wait for the script to analyze all members (progress bar shown)
5. View results with collapsible sections for each member

### 3. Other Scripts

- `attackFormatter.js` - Format attack commands
- `coordinateExtractor.js` - Extract coordinates from text
- `defensiveTroopsCalculator.js` - Calculate defensive troop requirements
- `defensiveTroopsChecker.js` - Check defensive troop availability
- `fakeScript.js` - Automate fake attacks
- `reportCoordsExtractor.js` - Extract coordinates from reports
- `relicPlacementOptimizer.js` - Suggest in which villages to place relics (Orange r4 / Blue r3 / Green r2) to cover as many target villages as possible
- `singleAttackFinder.js` - Find single attack opportunities
- `villageNote.js` - Manage village notes

## Installation

All scripts are bookmarklets - they run directly in your browser without any installation.

### Method 1: Load from GitHub CDN (Recommended)

This method loads the latest version from GitHub automatically.

1. Create a new bookmark in your browser
2. Name it (e.g., "Defensive Counter")
3. Use this as the URL (replace `YOUR_GITHUB_USERNAME` with the actual GitHub username):

**For Home Defensive Counter:**
```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/homeDefensiveCounter.js");
```

**For Tribe Members Troop Calculator:**
```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/tribeMembersTroopCalculator.js");
```

**Advantages:**
- Always loads the latest version
- No need to update bookmarks when script changes
- Cleaner and shorter bookmarks
- CDN is fast and reliable

### Method 2: Inline Bookmark (Alternative)

If you prefer, you can copy the entire script code:

**Chrome/Edge:**
1. Press `Ctrl + Shift + O` to open bookmark manager
2. Right-click → "Add new bookmark"
3. Name: Give it a descriptive name
4. URL: Paste `javascript:` followed by the entire script code
5. Save

**Firefox:**
1. Press `Ctrl + Shift + B` to show bookmarks toolbar
2. Right-click on toolbar → "New Bookmark"
3. Name: Give it a descriptive name
4. Location: Paste `javascript:` followed by the entire script code
5. Save

**Note:** For Method 2, add `javascript:` prefix to the script code manually.

## Requirements

- Modern web browser (Chrome, Firefox, Edge)
- Active Tribal Wars account
- JavaScript enabled

## Notes

- All scripts store settings in localStorage (saved per browser/domain)
- Scripts are read-only - they don't modify game data, only read and display information
- Some scripts may need to fetch data from multiple pages (e.g., tribe member analysis)

## Author

Scripts by antonistsam

## License

Free to use and modify for personal use.
