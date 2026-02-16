(function() {
    // Check if the popup already exists
    if (document.getElementById('attackFormatterPopup')) {
        document.getElementById('attackFormatterPopup').remove();
    }

    // Create popup HTML
    const popup = document.createElement('div');
    popup.id = 'attackFormatterPopup';
    popup.innerHTML = `
        <div class="attack-formatter-overlay">
            <div class="attack-formatter-modal">
                <div class="attack-formatter-header">
                    <h2>Attack Formatter</h2>
                    <button class="attack-formatter-close">&times;</button>
                </div>
                <div class="attack-formatter-body">
                    <div class="attack-formatter-section">
                        <label>Input (Paste your text here):</label>
                        <textarea id="attackFormatterInput" placeholder="Paste your attack data here..."></textarea>
                    </div>
                    <div class="attack-formatter-button-container">
                        <button id="attackFormatterProcess" class="attack-formatter-btn-process">Format Text</button>
                        <button id="attackFormatterClear" class="attack-formatter-btn-clear">Clear</button>
                    </div>
                    <div class="attack-formatter-section">
                        <label>Output (Formatted text):</label>
                        <textarea id="attackFormatterOutput" readonly placeholder="Formatted text will appear here..."></textarea>
                        <button id="attackFormatterCopy" class="attack-formatter-btn-copy">Copy to Clipboard</button>
                    </div>
                </div>
                <div class="attack-formatter-footer">
                    Script by antonistsam
                </div>
            </div>
        </div>
    `;

    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
        .attack-formatter-overlay {
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

        .attack-formatter-modal {
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

        .attack-formatter-header {
            background: rgba(0, 0, 0, 0.2);
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        .attack-formatter-header h2 {
            margin: 0;
            color: #fff;
            font-size: 24px;
            font-weight: 600;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .attack-formatter-close {
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

        .attack-formatter-close:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        .attack-formatter-body {
            padding: 25px;
            background: #fff;
        }

        .attack-formatter-section {
            margin-bottom: 20px;
        }

        .attack-formatter-section label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
            font-size: 14px;
        }

        .attack-formatter-section textarea {
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

        .attack-formatter-section textarea:focus {
            outline: none;
            border-color: #667eea;
        }

        .attack-formatter-button-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .attack-formatter-btn-process,
        .attack-formatter-btn-clear,
        .attack-formatter-btn-copy {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .attack-formatter-btn-process {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            flex: 1;
        }

        .attack-formatter-btn-process:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }

        .attack-formatter-btn-clear {
            background: #f44336;
            color: #fff;
            flex: 0 0 auto;
        }

        .attack-formatter-btn-clear:hover {
            background: #d32f2f;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(244, 67, 54, 0.4);
        }

        .attack-formatter-btn-copy {
            background: #4CAF50;
            color: #fff;
            width: 100%;
            margin-top: 10px;
        }

        .attack-formatter-btn-copy:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(76, 175, 80, 0.4);
        }

        .attack-formatter-footer {
            background: rgba(0, 0, 0, 0.2);
            padding: 15px;
            text-align: center;
            color: #fff;
            font-size: 12px;
            font-style: italic;
            border-top: 2px solid rgba(255, 255, 255, 0.1);
        }

        #attackFormatterOutput {
            background: #f5f5f5;
        }
    `;

    // Add elements to document
    document.head.appendChild(style);
    document.body.appendChild(popup);

    // Get elements
    const closeBtn = popup.querySelector('.attack-formatter-close');
    const processBtn = document.getElementById('attackFormatterProcess');
    const clearBtn = document.getElementById('attackFormatterClear');
    const copyBtn = document.getElementById('attackFormatterCopy');
    const inputArea = document.getElementById('attackFormatterInput');
    const outputArea = document.getElementById('attackFormatterOutput');

    // Format text function
    function formatText() {
        const input = inputArea.value;
        
        if (!input.trim()) {
            outputArea.value = 'Please paste some text to format.';
            return;
        }

        // Split text into lines
        let lines = input.split('\n');
        
        // Remove lines containing 'Αμυνόμενος'
        lines = lines.filter(line => !line.includes('Αμυνόμενος'));
        
        // Join back and replace 'Αριστοκράτης'
        let result = lines.join('\n');
        result = result.replace(/Αριστοκράτης/g, '[b][color=#ff0e0e]Αριστοκράτης[/color][/b]');
        
        outputArea.value = result;
    }

    // Event listeners
    closeBtn.addEventListener('click', () => {
        popup.remove();
        style.remove();
    });

    processBtn.addEventListener('click', formatText);

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
    popup.querySelector('.attack-formatter-overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('attack-formatter-overlay')) {
            popup.remove();
            style.remove();
        }
    });

    // Focus input on load
    inputArea.focus();
})();
