# Bookmarklet Quick Reference

Copy and paste these as browser bookmarks to run scripts from GitHub CDN.

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username (e.g., `necromander23`).

## Home Defensive Counter

Count all defensive troops from overview page.

```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/homeDefensiveCounter.js");
```

## Tribe Members Troop Calculator

Analyze all tribe members' offensive and defensive villages.

```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/tribeMembersTroopCalculator.js");
```

## Coordinate Extractor

Extract coordinates from text.

```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/coordinateExtractor.js");
```

## Relic Placement Optimizer

Paste your villages, the villages to cover and how many relics you have; it tells you where to place each relic.

```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/relicPlacementOptimizer.js");
```

## Other Scripts

For other scripts in this repository, use the same pattern:

```
javascript:$.getScript("https://cdn.jsdelivr.net/gh/YOUR_GITHUB_USERNAME/tribalwars-scripts@main/SCRIPT_NAME.js");
```

---

## How to Create a Bookmark

### Chrome/Edge
1. Press `Ctrl + D` or `Ctrl + Shift + O` to open bookmark manager
2. Right-click → "Add new bookmark"
3. **Name:** Give it a descriptive name (e.g., "TW: Defensive Counter")
4. **URL:** Paste one of the bookmarklets above
5. Click Save

### Firefox
1. Press `Ctrl + Shift + B` to show bookmarks toolbar
2. Right-click on toolbar → "New Bookmark"
3. **Name:** Give it a descriptive name (e.g., "TW: Defensive Counter")
4. **Location:** Paste one of the bookmarklets above
5. Click Save

## Notes

- **CDN Cache:** jsDelivr CDN may cache for up to 7 days. To force update, add `?v=TIMESTAMP` to the URL
- **Branch:** Using `@main` loads from the main branch. Use `@v1.0.0` for specific versions
- **Purge Cache:** Visit https://www.jsdelivr.com/tools/purge to purge CDN cache manually
