// Script to extract first coords from report list table on &screen=report pages
(function() {
    // Check if popup already exists
    if (document.getElementById('reportCoordsExtractorPopup')) {
        document.getElementById('reportCoordsExtractorPopup').remove();
    }

    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'reportCoordsExtractorPopup';
    popup.innerHTML = `
        <div class="report-coords-extractor-overlay">
            <div class="report-coords-extractor-modal">
                <div class="report-coords-extractor-header">
                    <h2>Report Coords Extractor</h2>
                    <button class="report-coords-extractor-close">&times;</button>
                </div>
                <div class="report-coords-extractor-body">
                    <div class="report-coords-extractor-section">
                        <label>Extracted Coords (first from each report):</label>
                        <textarea id="reportCoordsExtractorOutput" readonly placeholder="Coords will appear here..."></textarea>
                        <button id="reportCoordsExtractorCopy" class="report-coords-extractor-btn-copy">Copy to Clipboard</button>
                    </div>
                </div>
                <div class="report-coords-extractor-footer">
                    Script by antonistsam
                </div>
            </div>
        </div>
    `;

    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        .report-coords-extractor-overlay {
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
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .report-coords-extractor-modal {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 500px;
            max-width: 90%;
            max-height: 90vh;
            overflow: hidden;
            animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
            from { 
                transform: translateY(-50px);
                opacity: 0;
            }
            to { 
                transform: translateY(0);
                opacity: 1;
            }
        }
        .report-coords-extractor-header {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        .report-coords-extractor-header h2 {
            margin: 0;
            color: #fff;
            font-size: 24px;
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .report-coords-extractor-close {
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
        .report-coords-extractor-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
        .report-coords-extractor-body {
            padding: 25px;
            background: #fff;
        }
        .report-coords-extractor-section {
            margin-bottom: 20px;
        }
        .report-coords-extractor-section label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        .report-coords-extractor-section textarea {
            width: 100%;
            min-height: 300px;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: vertical;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }
        .report-coords-extractor-section textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .report-coords-extractor-btn-copy {
            background: #4CAF50;
            color: #fff;
            width: 100%;
            margin-top: 10px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .report-coords-extractor-btn-copy:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(76, 175, 80, 0.4);
        }
        .report-coords-extractor-footer {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            text-align: center;
            color: #fff;
            font-size: 12px;
            font-style: italic;
            border-top: 2px solid rgba(255, 255, 255, 0.1);
        }
        #reportCoordsExtractorOutput {
            background: #f5f5f5;
        }
    `;

    // Add elements to document
    document.head.appendChild(style);
    document.body.appendChild(popup);

    // Get elements
    const closeBtn = popup.querySelector('.report-coords-extractor-close');
    const copyBtn = document.getElementById('reportCoordsExtractorCopy');
    const outputArea = document.getElementById('reportCoordsExtractorOutput');

    // Main logic: extract coords
    function extractCoords() {
        const table = document.getElementById('report_list');
        if (!table) {
            outputArea.value = 'Could not find table with id="report_list".';
            return;
        }
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            outputArea.value = 'Could not find tbody in report_list table.';
            return;
        }
        const trs = Array.from(tbody.querySelectorAll('tr'));
        if (trs.length < 2) {
            outputArea.value = 'No report rows found.';
            return;
        }
        const coords = [];
        for (let i = 1; i < trs.length; i++) { // skip header row
            const tr = trs[i];
            const labelSpan = tr.querySelector('span.quickedit-label');
            if (labelSpan) {
                const text = labelSpan.textContent;
                // Find the coord before 'επιτίθεται' (allow whitespace, Greek, and any chars)
                // Pattern: (xxx|yyy) before 'επιτίθεται', robust to extra spaces
                // Example: Ο/Η nteluis (Jotunheim (525|586) K55) επιτίθεται στο ...
                // We want the last (xxx|yyy) before 'επιτίθεται'
                // Use a global regex to find all (xxx|yyy), then pick the last before 'επιτίθεται'
                const beforeAttack = text.split('επιτίθεται')[0];
                const coordMatches = [...beforeAttack.matchAll(/\((\d{3}\|\d{3})\)/g)];
                if (coordMatches.length > 0) {
                    coords.push(coordMatches[coordMatches.length - 1][1]);
                }
            }
        }
        if (coords.length === 0) {
            outputArea.value = 'No coords found.';
            return;
        }
        outputArea.value = coords.join('\n');
    }

    // Run extraction on load
    extractCoords();

    // Event listeners
    closeBtn.addEventListener('click', () => {
        popup.remove();
        style.remove();
    });
    copyBtn.addEventListener('click', () => {
        outputArea.select();
        document.execCommand('copy');
        // Visual feedback
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#2196F3';
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#4CAF50';
        }, 1500);
    });
    // Close on overlay click
    popup.querySelector('.report-coords-extractor-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('report-coords-extractor-overlay')) {
            popup.remove();
            style.remove();
        }
    });
})();
