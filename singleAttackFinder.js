// Script to identify single-source attacks and their destinations
(function() {
    // Check if the popup already exists
    if (document.getElementById('singleAttackFinderPopup')) {
        document.getElementById('singleAttackFinderPopup').remove();
    }

    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'singleAttackFinderPopup';
    popup.innerHTML = `
        <div class="single-attack-finder-overlay">
            <div class="single-attack-finder-modal">
                <div class="single-attack-finder-header">
                    <h2>Single Attack Finder</h2>
                    <button class="single-attack-finder-close">&times;</button>
                </div>
                <div class="single-attack-finder-body">
                    <div class="single-attack-finder-section">
                        <label>Input (Paste your text here):</label>
                        <textarea id="singleAttackFinderInput" placeholder="Paste your attack data here..."></textarea>
                    </div>
                    <div class="single-attack-finder-button-container">
                        <button id="singleAttackFinderProcess" class="single-attack-finder-btn-process">Find Singles</button>
                        <button id="singleAttackFinderClear" class="single-attack-finder-btn-clear">Clear</button>
                    </div>
                    <div class="single-attack-finder-section">
                        <label>Output (Single attacks):</label>
                        <textarea id="singleAttackFinderOutput" readonly placeholder="Single attacks will appear here..."></textarea>
                        <button id="singleAttackFinderCopy" class="single-attack-finder-btn-copy">Copy to Clipboard</button>
                    </div>
                </div>
                <div class="single-attack-finder-footer">
                    Script by antonistsam
                </div>
            </div>
        </div>
    `;

    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        .single-attack-finder-overlay {
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
        .single-attack-finder-modal {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            width: 700px;
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
        .single-attack-finder-header {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }
        .single-attack-finder-header h2 {
            margin: 0;
            color: #fff;
            font-size: 24px;
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .single-attack-finder-close {
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
        .single-attack-finder-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }
        .single-attack-finder-body {
            padding: 25px;
            background: #fff;
        }
        .single-attack-finder-section {
            margin-bottom: 20px;
        }
        .single-attack-finder-section label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }
        .single-attack-finder-section textarea {
            width: 100%;
            min-height: 200px;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            resize: vertical;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
        }
        .single-attack-finder-section textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .single-attack-finder-button-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .single-attack-finder-btn-process,
        .single-attack-finder-btn-clear,
        .single-attack-finder-btn-copy {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .single-attack-finder-btn-process {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            flex: 1;
        }
        .single-attack-finder-btn-process:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }
        .single-attack-finder-btn-clear {
            background: #f44336;
            color: #fff;
            flex: 0 0 auto;
        }
        .single-attack-finder-btn-clear:hover {
            background: #d32f2f;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(244, 67, 54, 0.4);
        }
        .single-attack-finder-btn-copy {
            background: #4CAF50;
            color: #fff;
            width: 100%;
            margin-top: 10px;
        }
        .single-attack-finder-btn-copy:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(76, 175, 80, 0.4);
        }
        .single-attack-finder-footer {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            text-align: center;
            color: #fff;
            font-size: 12px;
            font-style: italic;
            border-top: 2px solid rgba(255, 255, 255, 0.1);
        }
        #singleAttackFinderOutput {
            background: #f5f5f5;
        }
    `;

    // Add elements to document
    document.head.appendChild(style);
    document.body.appendChild(popup);

    // Get elements
    const closeBtn = popup.querySelector('.single-attack-finder-close');
    const processBtn = document.getElementById('singleAttackFinderProcess');
    const clearBtn = document.getElementById('singleAttackFinderClear');
    const copyBtn = document.getElementById('singleAttackFinderCopy');
    const inputArea = document.getElementById('singleAttackFinderInput');
    const outputArea = document.getElementById('singleAttackFinderOutput');

    // Main logic to find single attacks
    function findSingleAttacks() {
        const input = inputArea.value;
        if (!input.trim()) {
            outputArea.value = 'Please paste some text to process.';
            return;
        }
        // Split into lines
        const lines = input.split('\n');
        let currentTarget = null;
        const attacks = [];
        // Parse input
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Find target village
            const targetMatch = line.match(/^\[b\]Χωριό:\[\/b\] \[coord\](\d+\|\d+)\[\/coord\]/);
            if (targetMatch) {
                currentTarget = targetMatch[1];
                continue;
            }
            // Find attack line
            if (line.startsWith('[command]attack[/command]')) {
                // Find source coord
                const sourceMatch = line.match(/\[coord\](\d+\|\d+)\[\/coord\]/);
                if (sourceMatch && currentTarget) {
                    attacks.push({
                        source: sourceMatch[1],
                        target: currentTarget,
                        line: line
                    });
                }
            }
        }
        // Count sources
        const sourceCount = {};
        attacks.forEach(a => {
            sourceCount[a.source] = (sourceCount[a.source] || 0) + 1;
        });
        // Filter singles
        const singles = attacks.filter(a => sourceCount[a.source] === 1);
        // Format output
        if (singles.length === 0) {
            outputArea.value = 'No single attacks found.';
            return;
        }
        let result = singles.map(a => `Source: [coord]${a.source}[/coord]\nTarget: [coord]${a.target}[/coord]\nLine: ${a.line}\n`).join('\n---\n');
        outputArea.value = result;
    }

    // Event listeners
    closeBtn.addEventListener('click', () => {
        popup.remove();
        style.remove();
    });
    processBtn.addEventListener('click', findSingleAttacks);
    clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        outputArea.value = '';
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
    popup.querySelector('.single-attack-finder-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('single-attack-finder-overlay')) {
            popup.remove();
            style.remove();
        }
    });
    // Focus input on load
    inputArea.focus();
})();
