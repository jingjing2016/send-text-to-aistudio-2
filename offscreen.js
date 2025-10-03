// offscreen.js

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'read-from-clipboard') {
        const textarea = document.getElementById('clipboard-helper');
        textarea.value = '';
        textarea.select();

        // The 'paste' action is synchronous and requires the document to be focused.
        // The offscreen document is not focused, but we can still use the clipboard API.
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(text => {
                sendResponse({ success: true, text: text });
            }).catch(err => {
                console.error('Offscreen: Could not read from clipboard:', err);
                sendResponse({ success: false, error: err.message });
            });
        } else {
            // Fallback for older browsers, though less likely to be needed in a modern extension
            document.execCommand('paste');
            sendResponse({ success: true, text: textarea.value });
        }

        // Return true to indicate that the response is sent asynchronously
        return true;
    }
});