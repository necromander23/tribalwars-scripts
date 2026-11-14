// Relic Placement Optimizer
// Suggests in which of your villages to place relics so that as many target
// villages as possible fall inside at least one relic's area.
//
// Relic area: every village whose distance from the relic village is <= range,
// where distance = sqrt(dx^2 + dy^2) (the same circle the game draws on the map).
// e.g. range 4 reaches 4 fields straight up/down/left/right, but only 3|2 / 2|3
// diagonally (3|3 is 4.24 away and is outside).
(function () {
    'use strict';

    const POPUP_ID = 'relicOptimizerPopup';
    const STYLE_ID = 'relicOptimizerStyle';
    const STORAGE_KEY = 'relic_optimizer_inputs';

    const existingPopup = document.getElementById(POPUP_ID);
    if (existingPopup) existingPopup.remove();
    const existingStyle = document.getElementById(STYLE_ID);
    if (existingStyle) existingStyle.remove();

    const RELIC_TYPES = [
        { key: 'orange', name: 'Orange', defaultRange: 4, color: '#ff9800' },
        { key: 'blue', name: 'Blue', defaultRange: 3, color: '#2196f3' },
        { key: 'green', name: 'Green', defaultRange: 2, color: '#4caf50' }
    ];

    // === SOLVER START ===
    // Pure functions (no DOM) - kept together so they can be tested on their own.

    // Extracts unique coordinates (e.g. "507|418") from any text, keeping input order.
    function parseCoords(text) {
        const re = /(\d{1,3})\|(\d{1,3})/g;
        const seen = new Set();
        const out = [];
        let m;
        while ((m = re.exec(text)) !== null) {
            const x = parseInt(m[1], 10);
            const y = parseInt(m[2], 10);
            const id = x * 1000 + y;
            if (!seen.has(id)) {
                seen.add(id);
                out.push({ x: x, y: y, id: id, label: x + '|' + y });
            }
        }
        return out;
    }

    // All [dx, dy] offsets inside a relic of the given range (circle, centre included).
    function areaOffsets(range) {
        const offs = [];
        const r = Math.ceil(range);
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= range * range) offs.push([dx, dy]);
            }
        }
        return offs;
    }

    // cover[type][candidate] = Int32Array of target indices inside that relic's area.
    function buildCoverage(cands, targets, ranges) {
        const tIndex = new Map();
        targets.forEach((t, j) => tIndex.set(t.id, j));
        return ranges.map(range => {
            const offs = areaOffsets(range);
            return cands.map(c => {
                const list = [];
                for (let k = 0; k < offs.length; k++) {
                    const x = c.x + offs[k][0];
                    const y = c.y + offs[k][1];
                    if (x < 0 || y < 0 || x > 999 || y > 999) continue;
                    const j = tIndex.get(x * 1000 + y);
                    if (j !== undefined) list.push(j);
                }
                return Int32Array.from(list);
            });
        });
    }

    // Maximum-coverage search: randomized greedy construction + local search
    // (move one relic / re-place two relics), repeated until the time budget runs out
    // or a proven upper bound is reached.
    function optimizeRelics(opts) {
        const cover = opts.cover;
        const T = opts.nTargets;
        const N = opts.nCands;
        const counts = opts.counts;
        const ranges = opts.ranges;
        const onePerVillage = opts.onePerVillage;
        const timeMs = opts.timeMs == null ? 2000 : opts.timeMs;
        const rand = opts.random || Math.random;
        const nTypes = counts.length;
        const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const deadline = now() + timeMs;

        // Every single relic is a "slot" with a type.
        const slotTypes = [];
        for (let t = 0; t < nTypes; t++) {
            for (let k = 0; k < counts[t]; k++) slotTypes.push(t);
        }
        const S = slotTypes.length;

        // Upper bounds: targets reachable by any available relic, and
        // the sum of the biggest areas per type.
        const reachable = new Uint8Array(T);
        let reachableCount = 0;
        let sizeBound = 0;
        for (let t = 0; t < nTypes; t++) {
            if (counts[t] <= 0) continue;
            const sizes = [];
            for (let i = 0; i < N; i++) {
                const list = cover[t][i];
                sizes.push(list.length);
                for (let k = 0; k < list.length; k++) {
                    if (!reachable[list[k]]) { reachable[list[k]] = 1; reachableCount++; }
                }
            }
            sizes.sort((a, b) => b - a);
            const take = onePerVillage ? Math.min(counts[t], N) : counts[t];
            for (let k = 0; k < take && k < sizes.length; k++) sizeBound += sizes[k];
        }
        const upperBound = Math.min(reachableCount, sizeBound);

        function newState() {
            const pos = new Int32Array(S);
            pos.fill(-1);
            return { cc: new Int32Array(T), occ: new Int32Array(N), covered: 0, pos: pos };
        }
        function place(st, s, i) {
            const list = cover[slotTypes[s]][i];
            for (let k = 0; k < list.length; k++) {
                if (st.cc[list[k]]++ === 0) st.covered++;
            }
            st.occ[i]++;
            st.pos[s] = i;
        }
        function unplace(st, s) {
            const i = st.pos[s];
            if (i < 0) return;
            const list = cover[slotTypes[s]][i];
            for (let k = 0; k < list.length; k++) {
                if (--st.cc[list[k]] === 0) st.covered--;
            }
            st.occ[i]--;
            st.pos[s] = -1;
        }
        function gain(st, t, i) {
            const list = cover[t][i];
            let g = 0;
            for (let k = 0; k < list.length; k++) {
                if (st.cc[list[k]] === 0) g++;
            }
            return g;
        }
        function free(st, i) {
            return !onePerVillage || st.occ[i] === 0;
        }
        // Best village for one relic of type t; on ties keeps preferI (avoids cycling).
        function bestSpot(st, t, preferI) {
            let bestI = -1;
            let bestG = 0;
            for (let i = 0; i < N; i++) {
                if (!free(st, i)) continue;
                const g = gain(st, t, i);
                if (g > bestG || (g === bestG && g > 0 && i === preferI)) {
                    bestG = g;
                    bestI = i;
                }
            }
            return { i: bestI, g: bestG };
        }
        // Top-k villages for one relic of type t (by gain, gain > 0).
        function topSpots(st, t, k) {
            const top = [];
            for (let i = 0; i < N; i++) {
                if (!free(st, i)) continue;
                const g = gain(st, t, i);
                if (g <= 0) continue;
                if (top.length < k || g > top[top.length - 1].g) {
                    top.push({ i: i, g: g });
                    top.sort((a, b) => b.g - a.g);
                    if (top.length > k) top.pop();
                }
            }
            return top;
        }

        // alpha = 1: pure greedy; alpha < 1: random pick among options with gain >= alpha * best.
        function construct(alpha) {
            const st = newState();
            const freeByType = [];
            for (let t = 0; t < nTypes; t++) freeByType.push([]);
            slotTypes.forEach((t, s) => freeByType[t].push(s));
            for (;;) {
                let maxG = 0;
                const opt = []; // flat [t, i, g, ...]
                for (let t = 0; t < nTypes; t++) {
                    if (!freeByType[t].length) continue;
                    for (let i = 0; i < N; i++) {
                        if (!free(st, i)) continue;
                        const g = gain(st, t, i);
                        if (g <= 0) continue;
                        opt.push(t, i, g);
                        if (g > maxG) maxG = g;
                    }
                }
                if (maxG === 0) break;
                let pick = -1;
                if (alpha >= 1) {
                    // Best gain; on ties use the smaller relic and keep the big ones for later.
                    let bg = -1;
                    let br = Infinity;
                    for (let k = 0; k < opt.length; k += 3) {
                        const g = opt[k + 2];
                        const r = ranges[opt[k]];
                        if (g > bg || (g === bg && r < br)) { bg = g; br = r; pick = k; }
                    }
                } else {
                    const thr = maxG * alpha;
                    const rcl = [];
                    for (let k = 0; k < opt.length; k += 3) {
                        if (opt[k + 2] >= thr) rcl.push(k);
                    }
                    pick = rcl[Math.floor(rand() * rcl.length)];
                }
                const t = opt[pick];
                place(st, freeByType[t].pop(), opt[pick + 1]);
            }
            return st;
        }

        function localSearch(st) {
            let improved = true;
            while (improved) {
                improved = false;
                // 1) Move one relic to the best village for it.
                for (let s = 0; s < S; s++) {
                    const t = slotTypes[s];
                    const cur = st.pos[s];
                    let curG = 0;
                    if (cur >= 0) {
                        unplace(st, s);
                        curG = gain(st, t, cur);
                    }
                    const b = bestSpot(st, t, cur);
                    if (b.g > curG) {
                        place(st, s, b.i);
                        improved = true;
                    } else if (cur >= 0) {
                        place(st, s, cur);
                    }
                }
                if (improved) continue;
                if (now() > deadline) break;

                // 2) Pick up two relics and re-place both together.
                outer:
                for (let a = 0; a < S; a++) {
                    for (let b = a + 1; b < S; b++) {
                        const pa = st.pos[a];
                        const pb = st.pos[b];
                        if (pa < 0 && pb < 0) continue;
                        const before = st.covered;
                        unplace(st, a);
                        unplace(st, b);
                        const orders = slotTypes[a] === slotTypes[b] ? [[a, b]] : [[a, b], [b, a]];
                        let bestVal = before;
                        let bestMove = null;
                        for (let o = 0; o < orders.length; o++) {
                            const x = orders[o][0];
                            const y = orders[o][1];
                            const firsts = topSpots(st, slotTypes[x], 5);
                            for (let f = 0; f < firsts.length; f++) {
                                place(st, x, firsts[f].i);
                                const by = bestSpot(st, slotTypes[y], -1);
                                const val = st.covered + by.g;
                                unplace(st, x);
                                if (val > bestVal) {
                                    bestVal = val;
                                    bestMove = [x, firsts[f].i, y, by.i];
                                }
                            }
                        }
                        if (bestMove) {
                            place(st, bestMove[0], bestMove[1]);
                            if (bestMove[3] >= 0) place(st, bestMove[2], bestMove[3]);
                            improved = true;
                            break outer;
                        }
                        if (pa >= 0) place(st, a, pa);
                        if (pb >= 0) place(st, b, pb);
                        if (now() > deadline) break outer;
                    }
                }
            }
        }

        // Take back relics that add nothing (their whole area is covered by others).
        function dropRedundant(st) {
            for (let s = S - 1; s >= 0; s--) {
                const i = st.pos[s];
                if (i < 0) continue;
                unplace(st, s);
                if (gain(st, slotTypes[s], i) > 0) place(st, s, i);
            }
        }

        function usedCount(st) {
            let c = 0;
            for (let s = 0; s < S; s++) if (st.pos[s] >= 0) c++;
            return c;
        }
        function better(a, b) {
            if (!b) return true;
            if (a.covered !== b.covered) return a.covered > b.covered;
            return usedCount(a) < usedCount(b);
        }

        let best = null;
        let iterations = 0;
        do {
            const st = construct(iterations === 0 ? 1 : 0.5 + rand() * 0.5);
            localSearch(st);
            dropRedundant(st);
            if (better(st, best)) best = st;
            iterations++;
            if (best.covered >= upperBound) break;
        } while (now() < deadline);

        return {
            slotTypes: slotTypes,
            pos: Array.from(best.pos),
            cc: best.cc,
            covered: best.covered,
            reachable: reachable,
            reachableCount: reachableCount,
            upperBound: upperBound,
            optimal: best.covered >= upperBound,
            iterations: iterations
        };
    }
    // === SOLVER END ===

    // ---------------------------------------------------------------- UI

    function loadInputs() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    }
    function saveInputs(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) { /* storage unavailable - ignore */ }
    }

    const saved = loadInputs();
    const savedCounts = saved.counts || [];
    const savedRanges = saved.ranges || [];

    const relicInputsHtml = RELIC_TYPES.map((r, t) => `
        <div class="relic-opt-relic" style="border-color:${r.color}">
            <div class="relic-opt-relic-title"><span class="relic-opt-dot" style="background:${r.color}"></span>${r.name}</div>
            <label>Count <input type="number" min="0" step="1" id="relicOptCount${t}" value="${savedCounts[t] != null ? savedCounts[t] : 0}"></label>
            <label>Range <input type="number" min="0" step="0.1" id="relicOptRange${t}" value="${savedRanges[t] != null ? savedRanges[t] : r.defaultRange}"></label>
        </div>
    `).join('');

    const popup = document.createElement('div');
    popup.id = POPUP_ID;
    popup.innerHTML = `
        <div class="relic-opt-overlay">
            <div class="relic-opt-modal">
                <div class="relic-opt-header">
                    <h2>Relic Placement Optimizer</h2>
                    <button class="relic-opt-close">&times;</button>
                </div>
                <div class="relic-opt-body">
                    <div class="relic-opt-grid">
                        <div class="relic-opt-section">
                            <label>1. Your villages (where relics can be placed):</label>
                            <textarea id="relicOptOwn" placeholder="507|418&#10;507|419&#10;..."></textarea>
                            <div class="relic-opt-hint" id="relicOptOwnCount">0 villages</div>
                        </div>
                        <div class="relic-opt-section">
                            <label>2. Villages to cover:</label>
                            <textarea id="relicOptTargets" placeholder="506|420&#10;507|421&#10;..."></textarea>
                            <div class="relic-opt-hint" id="relicOptTargetsCount">0 villages</div>
                        </div>
                    </div>
                    <div class="relic-opt-section">
                        <label>3. Relics available:</label>
                        <div class="relic-opt-relics">${relicInputsHtml}</div>
                    </div>
                    <div class="relic-opt-options">
                        <label class="relic-opt-checkbox">
                            <input type="checkbox" id="relicOptOnePer" ${saved.onePerVillage === false ? '' : 'checked'}>
                            <span>Max one relic per village</span>
                        </label>
                        <label class="relic-opt-inline">
                            Search time (sec)
                            <input type="number" min="0.2" max="60" step="0.5" id="relicOptTime" value="${saved.timeSec || 3}">
                        </label>
                    </div>
                    <div class="relic-opt-button-container">
                        <button id="relicOptProcess" class="relic-opt-btn-process">Calculate</button>
                        <button id="relicOptClear" class="relic-opt-btn-clear">Clear</button>
                    </div>
                    <div id="relicOptResults"></div>
                </div>
                <div class="relic-opt-footer">
                    Script by antonistsam
                </div>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
        .relic-opt-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            animation: relicOptFadeIn 0.3s ease;
        }
        @keyframes relicOptFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .relic-opt-modal {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 960px;
            max-width: 95%;
            max-height: 92vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .relic-opt-header {
            background: rgba(0, 0, 0, 0.2);
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        .relic-opt-header h2 {
            margin: 0;
            color: #fff;
            font-size: 22px;
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .relic-opt-close {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: #fff;
            font-size: 28px;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        }
        .relic-opt-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
        .relic-opt-body {
            padding: 20px 25px;
            background: #fff;
            overflow-y: auto;
            color: #333;
            font-size: 13px;
        }
        .relic-opt-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .relic-opt-section {
            margin-bottom: 16px;
        }
        .relic-opt-section > label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        .relic-opt-section textarea {
            width: 100%;
            min-height: 140px;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: vertical;
            box-sizing: border-box;
        }
        .relic-opt-section textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .relic-opt-hint {
            margin-top: 4px;
            color: #777;
            font-size: 12px;
        }
        .relic-opt-relics {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        .relic-opt-relic {
            flex: 1 1 180px;
            border: 2px solid;
            border-radius: 8px;
            padding: 10px 12px;
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .relic-opt-relic-title {
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .relic-opt-relic label {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }
        .relic-opt-relic input, .relic-opt-inline input {
            width: 70px;
            padding: 4px 6px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .relic-opt-dot {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 1px solid rgba(0, 0, 0, 0.4);
        }
        .relic-opt-options {
            display: flex;
            gap: 24px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 14px;
        }
        .relic-opt-checkbox, .relic-opt-inline {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        .relic-opt-button-container {
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
        }
        .relic-opt-btn-process,
        .relic-opt-btn-clear,
        .relic-opt-btn-copy {
            padding: 11px 22px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .relic-opt-btn-process {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            flex: 1;
        }
        .relic-opt-btn-process:disabled {
            opacity: 0.6;
            cursor: wait;
        }
        .relic-opt-btn-clear {
            background: #f44336;
            color: #fff;
        }
        .relic-opt-btn-copy {
            background: #4CAF50;
            color: #fff;
            width: 100%;
            margin-top: 6px;
            padding: 8px 16px;
        }
        .relic-opt-summary {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 14px;
        }
        .relic-opt-card {
            flex: 1 1 150px;
            background: #f5f5f8;
            border-radius: 8px;
            padding: 10px 12px;
        }
        .relic-opt-card .v {
            font-size: 22px;
            font-weight: 700;
        }
        .relic-opt-card .l {
            color: #666;
            font-size: 12px;
        }
        .relic-opt-good { color: #2e7d32; }
        .relic-opt-bad { color: #c62828; }
        .relic-opt-note {
            background: #fff8e1;
            border-left: 4px solid #ffb300;
            padding: 8px 12px;
            margin-bottom: 14px;
            border-radius: 4px;
        }
        .relic-opt-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }
        .relic-opt-table th, .relic-opt-table td {
            border-bottom: 1px solid #eee;
            padding: 6px 8px;
            text-align: left;
        }
        .relic-opt-table th {
            background: #f5f5f8;
        }
        .relic-opt-outputs {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }
        .relic-opt-outputs textarea {
            min-height: 120px;
            background: #f5f5f5;
        }
        .relic-opt-map-wrap {
            position: relative;
            overflow: auto;
            border: 1px solid #ddd;
            border-radius: 8px;
            max-height: 620px;
        }
        .relic-opt-map-wrap canvas {
            display: block;
        }
        .relic-opt-legend {
            display: flex;
            gap: 14px;
            flex-wrap: wrap;
            margin: 6px 0;
            font-size: 12px;
            color: #555;
        }
        .relic-opt-legend span {
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .relic-opt-sq {
            display: inline-block;
            width: 11px;
            height: 11px;
        }
        .relic-opt-tip {
            min-height: 18px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #333;
            margin-top: 6px;
        }
        .relic-opt-footer {
            background: rgba(0, 0, 0, 0.2);
            padding: 12px;
            text-align: center;
            color: #fff;
            font-size: 12px;
            font-style: italic;
            border-top: 2px solid rgba(255, 255, 255, 0.1);
        }
        @media (max-width: 700px) {
            .relic-opt-grid, .relic-opt-outputs { grid-template-columns: 1fr; }
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(popup);

    const ownArea = document.getElementById('relicOptOwn');
    const targetsArea = document.getElementById('relicOptTargets');
    const ownCountEl = document.getElementById('relicOptOwnCount');
    const targetsCountEl = document.getElementById('relicOptTargetsCount');
    const onePerEl = document.getElementById('relicOptOnePer');
    const timeEl = document.getElementById('relicOptTime');
    const processBtn = document.getElementById('relicOptProcess');
    const clearBtn = document.getElementById('relicOptClear');
    const resultsEl = document.getElementById('relicOptResults');

    ownArea.value = saved.own || '';
    targetsArea.value = saved.targets || '';

    function updateCounts() {
        ownCountEl.textContent = parseCoords(ownArea.value).length + ' villages';
        targetsCountEl.textContent = parseCoords(targetsArea.value).length + ' villages';
    }
    ownArea.addEventListener('input', updateCounts);
    targetsArea.addEventListener('input', updateCounts);
    updateCounts();

    function readNumber(id, fallback) {
        const v = parseFloat(document.getElementById(id).value);
        return isNaN(v) || v < 0 ? fallback : v;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    }

    function copyText(text, btn) {
        const done = () => {
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            btn.style.background = '#2196F3';
            setTimeout(() => {
                btn.textContent = original;
                btn.style.background = '';
            }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
        } else {
            fallbackCopy(text, done);
        }
    }
    function fallbackCopy(text, done) {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        done();
    }

    function run() {
        const cands = parseCoords(ownArea.value);
        const targets = parseCoords(targetsArea.value);
        const counts = RELIC_TYPES.map((r, t) => Math.floor(readNumber('relicOptCount' + t, 0)));
        const ranges = RELIC_TYPES.map((r, t) => readNumber('relicOptRange' + t, r.defaultRange));
        const onePerVillage = onePerEl.checked;
        const timeSec = Math.min(60, Math.max(0.2, readNumber('relicOptTime', 3)));

        saveInputs({
            own: ownArea.value,
            targets: targetsArea.value,
            counts: counts,
            ranges: ranges,
            onePerVillage: onePerVillage,
            timeSec: timeSec
        });

        if (!cands.length) {
            resultsEl.innerHTML = '<div class="relic-opt-note">Paste at least one of your villages in list 1.</div>';
            return;
        }
        if (!targets.length) {
            resultsEl.innerHTML = '<div class="relic-opt-note">Paste at least one village to cover in list 2.</div>';
            return;
        }
        if (counts.every(c => c <= 0)) {
            resultsEl.innerHTML = '<div class="relic-opt-note">Set the number of relics you have (at least one).</div>';
            return;
        }

        processBtn.disabled = true;
        processBtn.textContent = 'Calculating...';
        resultsEl.innerHTML = '<div class="relic-opt-note">Searching for the best placement...</div>';

        // Let the browser paint "Calculating..." before the (blocking) search.
        setTimeout(() => {
            try {
                const cover = buildCoverage(cands, targets, ranges);
                const res = optimizeRelics({
                    cover: cover,
                    nTargets: targets.length,
                    nCands: cands.length,
                    counts: counts,
                    ranges: ranges,
                    onePerVillage: onePerVillage,
                    timeMs: timeSec * 1000
                });
                renderResults(cands, targets, counts, ranges, cover, res);
            } catch (e) {
                resultsEl.innerHTML = '<div class="relic-opt-note">Error: ' + escapeHtml(e.message) + '</div>';
                console.error(e);
            } finally {
                processBtn.disabled = false;
                processBtn.textContent = 'Calculate';
            }
        }, 30);
    }

    function renderResults(cands, targets, counts, ranges, cover, res) {
        const T = targets.length;
        const placements = [];
        res.pos.forEach((i, s) => {
            if (i < 0) return;
            const t = res.slotTypes[s];
            const list = cover[t][i];
            let unique = 0;
            for (let k = 0; k < list.length; k++) if (res.cc[list[k]] === 1) unique++;
            placements.push({ t: t, village: cands[i], inRange: list.length, unique: unique, list: list });
        });
        placements.sort((a, b) => a.t - b.t || a.village.x - b.village.x || a.village.y - b.village.y);

        const usedPerType = RELIC_TYPES.map(() => 0);
        placements.forEach(p => usedPerType[p.t]++);

        const coveredList = [];
        const uncoveredList = [];
        const unreachableList = [];
        for (let j = 0; j < T; j++) {
            if (res.cc[j] > 0) coveredList.push(targets[j].label);
            else {
                uncoveredList.push(targets[j].label);
                if (!res.reachable[j]) unreachableList.push(targets[j].label);
            }
        }
        const pct = T ? Math.round((coveredList.length / T) * 1000) / 10 : 0;

        const relicSummary = RELIC_TYPES.map((r, t) => counts[t] > 0
            ? `<span class="relic-opt-dot" style="background:${r.color}"></span> ${usedPerType[t]}/${counts[t]}`
            : '').filter(Boolean).join(' &nbsp; ');

        const notes = [];
        if (unreachableList.length) {
            notes.push(`${unreachableList.length} target village(s) are too far from all your villages and can never be covered.`);
        }
        const unused = RELIC_TYPES.map((r, t) => counts[t] - usedPerType[t]);
        if (unused.some(u => u > 0)) {
            const txt = RELIC_TYPES.map((r, t) => unused[t] > 0 ? `${unused[t]} ${r.name}` : '').filter(Boolean).join(', ');
            notes.push(`Not needed: ${txt} - every other placement would add no extra coverage.`);
        }
        notes.push(res.optimal
            ? 'This is the best possible result (proven).'
            : `Best result found in ${res.iterations} search round(s). Upper limit: ${res.upperBound}. Increase "Search time" to search more.`);

        const rows = placements.map((p, n) => {
            const r = RELIC_TYPES[p.t];
            return `<tr>
                <td>${n + 1}</td>
                <td><b>${p.village.label}</b></td>
                <td><span class="relic-opt-dot" style="background:${r.color}"></span> ${r.name} (${ranges[p.t]})</td>
                <td>${p.inRange}</td>
                <td>${p.unique}</td>
            </tr>`;
        }).join('');

        const placementsText = placements.map(p => `${p.village.label} - ${RELIC_TYPES[p.t].name} (range ${ranges[p.t]})`).join('\n');

        resultsEl.innerHTML = `
            <div class="relic-opt-summary">
                <div class="relic-opt-card"><div class="v relic-opt-good">${coveredList.length} / ${T}</div><div class="l">Covered (${pct}%)</div></div>
                <div class="relic-opt-card"><div class="v relic-opt-bad">${uncoveredList.length}</div><div class="l">Not covered</div></div>
                <div class="relic-opt-card"><div class="v">${relicSummary}</div><div class="l">Relics used / available</div></div>
            </div>
            ${notes.map(n => `<div class="relic-opt-note">${escapeHtml(n)}</div>`).join('')}
            <table class="relic-opt-table">
                <thead><tr><th>#</th><th>Place in village</th><th>Relic</th><th>Targets in range</th><th>Only covered by this relic</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="5">No placement covers any target.</td></tr>'}</tbody>
            </table>
            <div class="relic-opt-outputs">
                <div class="relic-opt-section">
                    <label>Placements (${placements.length})</label>
                    <textarea readonly id="relicOptOutPlacements">${escapeHtml(placementsText)}</textarea>
                    <button class="relic-opt-btn-copy" data-copy="relicOptOutPlacements">Copy</button>
                </div>
                <div class="relic-opt-section">
                    <label>Not covered (${uncoveredList.length})</label>
                    <textarea readonly id="relicOptOutUncovered">${uncoveredList.join('\n')}</textarea>
                    <button class="relic-opt-btn-copy" data-copy="relicOptOutUncovered">Copy</button>
                </div>
                <div class="relic-opt-section">
                    <label>Covered (${coveredList.length})</label>
                    <textarea readonly id="relicOptOutCovered">${coveredList.join('\n')}</textarea>
                    <button class="relic-opt-btn-copy" data-copy="relicOptOutCovered">Copy</button>
                </div>
            </div>
            <div class="relic-opt-section">
                <label>Map</label>
                <div class="relic-opt-legend">
                    ${RELIC_TYPES.map((r, t) => counts[t] > 0 ? `<span><span class="relic-opt-dot" style="background:${r.color}"></span>${r.name} relic</span>` : '').join('')}
                    <span><span class="relic-opt-sq" style="background:#2e7d32"></span>Target covered</span>
                    <span><span class="relic-opt-sq" style="background:#d32f2f"></span>Target not covered</span>
                    <span><span class="relic-opt-sq" style="background:#555"></span>Your village</span>
                </div>
                <div class="relic-opt-map-wrap"><canvas id="relicOptMap"></canvas></div>
                <div class="relic-opt-tip" id="relicOptTip">Hover the map to see coordinates.</div>
            </div>
        `;

        resultsEl.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', () => copyText(document.getElementById(btn.dataset.copy).value, btn));
        });

        drawMap(cands, targets, ranges, placements, res);
    }

    function drawMap(cands, targets, ranges, placements, res) {
        const canvas = document.getElementById('relicOptMap');
        const tip = document.getElementById('relicOptTip');
        const all = cands.concat(targets);
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        all.forEach(c => {
            minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
            minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
        });
        const pad = 2;
        minX -= pad; minY -= pad; maxX += pad; maxY += pad;
        const cols = maxX - minX + 1;
        const rows = maxY - minY + 1;
        const cell = Math.max(4, Math.min(22, Math.floor(880 / cols)));
        canvas.width = cols * cell;
        canvas.height = rows * cell;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#eef3e2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines (thicker every 10 fields, like the game map)
        for (let x = minX; x <= maxX + 1; x++) {
            const major = x % 10 === 0;
            if (!major && cell < 8) continue;
            ctx.strokeStyle = major ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)';
            ctx.beginPath();
            ctx.moveTo((x - minX) * cell + 0.5, 0);
            ctx.lineTo((x - minX) * cell + 0.5, canvas.height);
            ctx.stroke();
        }
        for (let y = minY; y <= maxY + 1; y++) {
            const major = y % 10 === 0;
            if (!major && cell < 8) continue;
            ctx.strokeStyle = major ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)';
            ctx.beginPath();
            ctx.moveTo(0, (y - minY) * cell + 0.5);
            ctx.lineTo(canvas.width, (y - minY) * cell + 0.5);
            ctx.stroke();
        }

        // Relic areas
        placements.forEach(p => {
            ctx.fillStyle = hexToRgba(RELIC_TYPES[p.t].color, 0.22);
            areaOffsets(ranges[p.t]).forEach(o => {
                ctx.fillRect((p.village.x + o[0] - minX) * cell, (p.village.y + o[1] - minY) * cell, cell, cell);
            });
        });

        const inset = Math.max(1, Math.round(cell * 0.18));
        const box = (c, color) => {
            ctx.fillStyle = color;
            ctx.fillRect((c.x - minX) * cell + inset, (c.y - minY) * cell + inset, cell - 2 * inset, cell - 2 * inset);
        };
        cands.forEach(c => box(c, '#555'));
        targets.forEach((c, j) => box(c, res.cc[j] > 0 ? '#2e7d32' : '#d32f2f'));

        // Relic markers
        placements.forEach(p => {
            const cx = (p.village.x - minX) * cell + cell / 2;
            const cy = (p.village.y - minY) * cell + cell / 2;
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(3, cell * 0.45), 0, Math.PI * 2);
            ctx.fillStyle = RELIC_TYPES[p.t].color;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#000';
            ctx.stroke();
        });

        // Hover info
        const ownSet = new Set(cands.map(c => c.id));
        const targetIdx = new Map(targets.map((t, j) => [t.id, j]));
        const relicAt = new Map(placements.map(p => [p.village.id, p]));
        const coveredBy = new Map();
        placements.forEach(p => {
            for (let k = 0; k < p.list.length; k++) {
                const id = targets[p.list[k]].id;
                if (!coveredBy.has(id)) coveredBy.set(id, []);
                coveredBy.get(id).push(RELIC_TYPES[p.t].name + ' @ ' + p.village.label);
            }
        });
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const x = minX + Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / cell);
            const y = minY + Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / cell);
            const id = x * 1000 + y;
            const parts = [x + '|' + y];
            if (ownSet.has(id)) parts.push('your village');
            if (relicAt.has(id)) parts.push('PLACE ' + RELIC_TYPES[relicAt.get(id).t].name.toUpperCase() + ' RELIC');
            if (targetIdx.has(id)) {
                const by = coveredBy.get(id);
                parts.push(by ? 'target, covered by ' + by.join(', ') : 'target, NOT covered');
            }
            tip.textContent = parts.join(' · ');
        });
    }

    function hexToRgba(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }

    // Events
    function close() {
        popup.remove();
        style.remove();
    }
    popup.querySelector('.relic-opt-close').addEventListener('click', close);
    popup.querySelector('.relic-opt-overlay').addEventListener('click', e => {
        if (e.target.classList.contains('relic-opt-overlay')) close();
    });
    processBtn.addEventListener('click', run);
    clearBtn.addEventListener('click', () => {
        ownArea.value = '';
        targetsArea.value = '';
        resultsEl.innerHTML = '';
        updateCounts();
    });
    ownArea.focus();
})();
