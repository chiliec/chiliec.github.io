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
    <title>Virtual Keyboard API Test</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
        .status { padding: 12px; background: #e3f2fd; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .status.available { background: #e8f5e9; color: #2e7d32; }
        .status.unavailable { background: #ffebee; color: #c62828; }
        .section { margin-bottom: 24px; }
        button { padding: 12px 16px; border: none; border-radius: 8px; background: #2196f3; color: white; font-size: 14px; margin: 4px; cursor: pointer; }
        input, textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; }
        .log { background: #263238; color: #aed581; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Virtual Keyboard API Test</h1>
        <div class="status" id="apiStatus">Checking API...</div>
        <div class="section">
            <button onclick="showKeyboard()">Show Keyboard</button>
            <button onclick="hideKeyboard()">Hide Keyboard</button>
            <button onclick="enableKeyboard()">Enable</button>
            <button onclick="disableKeyboard()">Disable</button>
            <button onclick="reloadPage()">Restart Page</button>
        </div>
        <input type="text" placeholder="Test input">
        <textarea placeholder="Test textarea"></textarea>
        <div class="log" id="log"></div>
    </div>
    <script>
        function log(msg) {
            document.getElementById('log').innerHTML += msg + '\n';
        }
        if ('virtualKeyboard' in navigator) {
            document.getElementById('apiStatus').className = 'status available';
            document.getElementById('apiStatus').textContent = 'API Available';
            navigator.virtualKeyboard.addEventListener('geometrychange', () => {
                const r = navigator.virtualKeyboard.boundingRect;
                log('Keyboard: ' + r.width + 'x' + r.height);
            });
        } else {
            document.getElementById('apiStatus').className = 'status unavailable';
            document.getElementById('apiStatus').textContent = 'API Unavailable';
        }
        async function showKeyboard() { await navigator.virtualKeyboard.show(); log('Show called'); }
        async function hideKeyboard() { await navigator.virtualKeyboard.hide(); log('Hide called'); }
        async function enableKeyboard() { await navigator.virtualKeyboard.enable(); log('Enable called'); }
        async function disableKeyboard() { await navigator.virtualKeyboard.disable(); log('Disable called'); }
        async function reloadPage() { window.location.reload(); log('Page reloaded'); }
    </script>
</body>
</html>
