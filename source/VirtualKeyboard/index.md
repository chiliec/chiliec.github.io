---
title: Test virtual keyboard
date: 2026-03-04
layout: empty
---
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Virtual Keyboard API Test (Enhanced)</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        h1 {
            color: #333;
            margin-bottom: 24px;
            font-size: 28px;
            text-align: center;
        }

        .status {
            padding: 16px;
            background: #e3f2fd;
            border-radius: 12px;
            margin-bottom: 24px;
            font-size: 14px;
            border: 2px solid #90caf9;
        }

        .status.available {
            background: #e8f5e9;
            color: #2e7d32;
            border-color: #81c784;
        }

        .status.unavailable {
            background: #ffebee;
            color: #c62828;
            border-color: #e57373;
        }

        .section {
            margin-bottom: 24px;
            padding: 16px;
            background: #f5f5f5;
            border-radius: 12px;
        }

        .section-title {
            font-weight: 600;
            color: #555;
            margin-bottom: 12px;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            background: #2196f3;
            color: white;
            font-size: 14px;
            font-weight: 500;
            margin: 4px;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }

        button:active {
            transform: scale(0.95);
            box-shadow: 0 1px 4px rgba(33, 150, 243, 0.3);
        }

        button.danger {
            background: #f44336;
            box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
        }

        button.success {
            background: #4caf50;
            box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
        }

        button.secondary {
            background: #9c27b0;
            box-shadow: 0 2px 8px rgba(156, 39, 176, 0.3);
        }

        input, textarea {
            width: 100%;
            padding: 14px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            margin-bottom: 12px;
            font-size: 16px;
            transition: border-color 0.2s;
        }

        input:focus, textarea:focus {
            outline: none;
            border-color: #2196f3;
        }

        textarea {
            resize: vertical;
            min-height: 100px;
        }

        .log-container {
            background: #263238;
            border-radius: 12px;
            padding: 16px;
            margin-top: 20px;
            max-height: 300px;
            overflow-y: auto;
            border: 2px solid #37474f;
        }

        .log {
            color: #aed581;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 11px;
            line-height: 1.6;
        }

        .log-entry {
            margin-bottom: 4px;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);
        }

        .log-entry.error {
            color: #ef5350;
            background: rgba(244, 67, 54, 0.1);
        }

        .log-entry.success {
            color: #66bb6a;
            background: rgba(76, 175, 80, 0.1);
        }

        .log-entry.info {
            color: #42a5f5;
            background: rgba(33, 150, 243, 0.1);
        }

        .keyboard-info {
            background: #fff3e0;
            padding: 12px;
            border-radius: 8px;
            margin-top: 12px;
            font-size: 13px;
            border: 2px solid #ffb74d;
        }

        .keyboard-info strong {
            color: #e65100;
        }

        .clear-log {
            background: #607d8b;
            margin-top: 8px;
            width: 100%;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            background: #e0e0e0;
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
        }

        .badge.on {
            background: #4caf50;
            color: white;
        }

        .badge.off {
            background: #f44336;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎹 Virtual Keyboard API</h1>

        <div class="status" id="apiStatus">
            <strong>Checking API...</strong>
        </div>

        <!-- Keyboard Controls -->
        <div class="section">
            <div class="section-title">Keyboard Control</div>
            <button onclick="showKeyboard()">▶️ Show</button>
            <button onclick="hideKeyboard()" class="danger">⏹ Hide</button>
            <button onclick="enableKeyboard()" class="success">✅ Enable</button>
            <button onclick="disableKeyboard()" class="danger">🚫 Disable</button>
        </div>

        <!-- Accessory View Controls -->
        <div class="section">
            <div class="section-title">Accessory View</div>
            <button onclick="showAccessoryView()" class="secondary">Show Toolbar</button>
            <button onclick="hideAccessoryView()" class="secondary">Hide Toolbar</button>
        </div>

        <!-- Settings -->
        <div class="section">
            <div class="section-title">
                Settings
                <span class="badge" id="overlaysBadge">unknown</span>
            </div>
            <button onclick="setOverlaysContent(true)" class="success">
                overlaysContent = true
            </button>
            <button onclick="setOverlaysContent(false)" class="danger">
                overlaysContent = false
            </button>
        </div>

        <!-- Test Inputs -->
        <div class="section">
            <div class="section-title">Test Inputs</div>
            <input type="text" id="testInput" placeholder="Click to test keyboard">
            <textarea id="testTextarea" placeholder="Type something here..."></textarea>
        </div>

        <!-- Debug -->
        <div class="section">
            <div class="section-title">Debug</div>
            <button onclick="checkBridge()">🔍 Check Bridge</button>
            <button onclick="getKeyboardRect()">📏 Get Rect</button>
            <button onclick="reloadPage()">🔄 Reload</button>
        </div>

        <!-- Keyboard Info -->
        <div class="keyboard-info" id="keyboardInfo">
            <strong>Keyboard:</strong> <span id="kbSize">waiting...</span>
        </div>

        <!-- Log -->
        <div class="log-container">
            <div class="log" id="log"></div>
        </div>
        <button onclick="clearLog()" class="clear-log">Clear Log</button>
    </div>

    <script>
        let logCount = 0;
        const maxLogEntries = 100;

        function log(msg, type = 'info') {
            const logEl = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + type;
            entry.textContent = `[${timestamp}] ${msg}`;

            logEl.appendChild(entry);
            logCount++;

            // Auto-scroll to bottom
            logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;

            // Limit log entries
            if (logCount > maxLogEntries) {
                logEl.removeChild(logEl.firstChild);
                logCount--;
            }

            console.log(`[VK API] ${msg}`);
        }

        function clearLog() {
            document.getElementById('log').innerHTML = '';
            logCount = 0;
            log('Log cleared', 'info');
        }

        function updateOverlaysBadge() {
            const badge = document.getElementById('overlaysBadge');
            if (window.navigator.virtualKeyboard) {
                const value = window.navigator.virtualKeyboard.overlaysContent;
                badge.textContent = value ? 'ON' : 'OFF';
                badge.className = 'badge ' + (value ? 'on' : 'off');
            }
        }

        function updateKeyboardInfo(rect) {
            const sizeEl = document.getElementById('kbSize');
            if (rect && rect.height > 0) {
                sizeEl.textContent = `${rect.width}×${rect.height}px at top:${rect.top}`;
                sizeEl.style.color = '#2e7d32';
            } else {
                sizeEl.textContent = 'Hidden (height: 0)';
                sizeEl.style.color = '#d32f2f';
            }
        }

        // Check API availability
        if ('virtualKeyboard' in navigator) {
            document.getElementById('apiStatus').className = 'status available';
            document.getElementById('apiStatus').innerHTML = '<strong>✅ API Available</strong><br>Virtual Keyboard API is ready to use.';
            log('✅ Virtual Keyboard API detected', 'success');

            // Listen for keyboard changes
            navigator.virtualKeyboard.addEventListener('geometrychange', () => {
                const r = navigator.virtualKeyboard.boundingRect;
                log(`📐 geometrychange: ${r.width}×${r.height} at top:${r.top}`, 'info');
                updateKeyboardInfo(r);
            });

            // Listen for keyboard-inset events
            navigator.virtualKeyboard.addEventListener('keyboard-inset', (e) => {
                log(`📍 keyboard-inset: ${JSON.stringify(e.detail)}`, 'info');
            });

            updateOverlaysBadge();
            log('Event listeners registered', 'success');

        } else {
            document.getElementById('apiStatus').className = 'status unavailable';
            document.getElementById('apiStatus').innerHTML = '<strong>❌ API Unavailable</strong><br>Virtual Keyboard API is not supported in this browser/app.';
            log('❌ Virtual Keyboard API NOT detected', 'error');
        }

        // API Methods
        async function showKeyboard() {
            log('▶️ Calling show()...', 'info');
            try {
                await navigator.virtualKeyboard.show();
                log('✅ show() succeeded', 'success');
            } catch (error) {
                log('❌ show() failed: ' + error.message, 'error');
            }
        }

        async function hideKeyboard() {
            log('⏹ Calling hide()...', 'info');
            try {
                await navigator.virtualKeyboard.hide();
                log('✅ hide() succeeded', 'success');
            } catch (error) {
                log('❌ hide() failed: ' + error.message, 'error');
            }
        }

        async function enableKeyboard() {
            log('✅ Calling enable()...', 'info');
            try {
                await navigator.virtualKeyboard.enable();
                log('✅ enable() succeeded', 'success');
            } catch (error) {
                log('❌ enable() failed: ' + error.message, 'error');
            }
        }

        async function disableKeyboard() {
            log('🚫 Calling disable()...', 'info');
            try {
                await navigator.virtualKeyboard.disable();
                log('✅ disable() succeeded', 'success');
            } catch (error) {
                log('❌ disable() failed: ' + error.message, 'error');
            }
        }

        async function showAccessoryView() {
            log('🔧 Calling showAccessoryView()...', 'info');
            try {
                await navigator.virtualKeyboard.showAccessoryView();
                log('✅ showAccessoryView() succeeded', 'success');
            } catch (error) {
                log('❌ showAccessoryView() failed: ' + error.message, 'error');
            }
        }

        async function hideAccessoryView() {
            log('🔧 Calling hideAccessoryView()...', 'info');
            try {
                await navigator.virtualKeyboard.hideAccessoryView();
                log('✅ hideAccessoryView() succeeded', 'success');
            } catch (error) {
                log('❌ hideAccessoryView() failed: ' + error.message, 'error');
            }
        }

        function setOverlaysContent(value) {
            log(`⚙️ Setting overlaysContent = ${value}`, 'info');
            try {
                navigator.virtualKeyboard.overlaysContent = value;
                log(`✅ overlaysContent set to ${value}`, 'success');
                updateOverlaysBadge();
            } catch (error) {
                log('❌ Failed to set overlaysContent: ' + error.message, 'error');
            }
        }

        function getKeyboardRect() {
            log('📏 Getting boundingRect...', 'info');
            try {
                const rect = navigator.virtualKeyboard.boundingRect;
                log(`📏 boundingRect: ${JSON.stringify(rect)}`, 'info');
                updateKeyboardInfo(rect);
            } catch (error) {
                log('❌ Failed to get boundingRect: ' + error.message, 'error');
            }
        }

        function checkBridge() {
            log('🔍 Checking native bridge...', 'info');

            // Check webkit
            if (typeof window.webkit !== 'undefined') {
                log('✅ window.webkit exists', 'success');
            } else {
                log('❌ window.webkit not found', 'error');
                return;
            }

            // Check messageHandlers
            if (window.webkit.messageHandlers) {
                log('✅ window.webkit.messageHandlers exists', 'success');
            } else {
                log('❌ window.webkit.messageHandlers not found', 'error');
                return;
            }

            // Check loveapp handler
            if (window.webkit.messageHandlers.loveapp) {
                log('✅ window.webkit.messageHandlers.loveapp exists', 'success');
            } else {
                log('❌ window.webkit.messageHandlers.loveapp not found', 'error');
                return;
            }

            log('✅ Native bridge is properly configured', 'success');
        }

        function reloadPage() {
            log('🔄 Reloading page...', 'info');
            window.location.reload();
        }

        // Focus events for debugging
        document.getElementById('testInput').addEventListener('focus', () => {
            log('🎯 Input focused', 'info');
        });

        document.getElementById('testInput').addEventListener('blur', () => {
            log('👋 Input blurred', 'info');
        });

        document.getElementById('testTextarea').addEventListener('focus', () => {
            log('🎯 Textarea focused', 'info');
        });

        document.getElementById('testTextarea').addEventListener('blur', () => {
            log('👋 Textarea blurred', 'info');
        });

        // Initial check
        setTimeout(() => {
            checkBridge();
            getKeyboardRect();
        }, 500);
    </script>
</body>
</html>
