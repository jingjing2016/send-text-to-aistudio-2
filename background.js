// background.js

const DEFAULTS = {
    settings: {
        targetTabIndex: 1,
        submitKey: 'ctrl-enter',
        position: {
            anchor: 'top-right',
            offsetX: 0,
            offsetY: 0
        }
    }
};

let offscreenDocumentPath = 'offscreen.html';

// --- Listen for Hotkey Commands ---
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'send_clipboard_content') {
        // Get clipboard content from the offscreen document
        const clipboardText = await getClipboardContent();
        if (clipboardText) {
            // Send the text to the target tab
            sendTextToTarget(clipboardText, false); // Don't bring to foreground
        } else {
            console.warn('Send Text: Clipboard was empty or could not be read.');
        }
    }
});


// --- Helper to get clipboard content ---
async function getClipboardContent() {
    // Ensure the offscreen document is available
    if (!await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.createDocument({
            url: offscreenDocumentPath,
            reasons: ['CLIPBOARD'],
            justification: 'Reading from the clipboard requires an offscreen document.'
        });
    }

    // Send a message to the offscreen document to read the clipboard
    const response = await chrome.runtime.sendMessage({
        action: 'read-from-clipboard'
    });

    if (response && response.success) {
        return response.text;
    } else {
        console.error('Failed to read from clipboard:', response.error);
        return null;
    }
}


// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sendText" && request.text) {
        sendTextToTarget(request.text, request.sendInForeground);
    }
    // Return true to indicate you wish to send a response asynchronously
    return true;
});

function sendTextToTarget(text, sendInForeground) {
    // First, get the user's settings from storage
    chrome.storage.sync.get(DEFAULTS, (data) => {
        const { settings } = data;
        // The user provides a 1-based index, but the API expects 0-based.
        const targetTabIndex = settings.targetTabIndex - 1;

        // 1. Find the target tab by its index
        chrome.tabs.query({ index: targetTabIndex }, (tabs) => {
            if (tabs.length > 0) {
                const targetTab = tabs[0];
                // 2. Execute script in the found tab
                chrome.scripting.executeScript({
                    target: { tabId: targetTab.id },
                    function: fillInputAndSubmit,
                    args: [text, settings.submitKey] // Pass text and submit key
                }, () => {
                    // 3. After script execution, check if we need to bring the tab to the foreground
                    if (sendInForeground) {
                        chrome.tabs.update(targetTab.id, { active: true });
                        chrome.windows.update(targetTab.windowId, { focused: true });
                    }
                });
            } else {
                // 3. If no tab is found, notify the user.
                // This is better than creating a new tab, which might not be what the user wants.
                console.warn(`Send Text: No tab found at index ${settings.targetTabIndex}.`);
                // Optionally, create a user-facing notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'Send Text Failed',
                    message: `Could not find a tab at position ${settings.targetTabIndex}.`
                });
            }
        });
    });
}


/**
 * This function is injected into the target page.
 * It fills an input field and simulates a keypress to submit.
 * @param {string} text - The text to fill.
 * @param {string} submitKey - The key to simulate ('enter' or 'ctrl-enter').
 */
function fillInputAndSubmit(text, submitKey) {
    const inputField = document.querySelector('textarea, [contenteditable="true"]');
    
    if (!inputField) {
        // If no input field is found, try again after a delay.
        setTimeout(() => {
            const fallbackInputField = document.querySelector('textarea, [contenteditable="true"]');
            if (fallbackInputField) {
                fillInputAndSubmit(text, submitKey);
            } else {
                alert("Could not find a suitable input field on the target page.");
            }
        }, 1000);
        return;
    }

    // --- Step 1: Fill the text ---
    if (inputField.isContentEditable) {
        inputField.focus();
        document.execCommand('insertText', false, text);
    } else {
        inputField.value = text;
        inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // --- Step 2: Simulate the keypress after a short delay ---
    // The delay gives frameworks like React time to process the input change
    // and enable/update any relevant UI elements like a submit button.
    setTimeout(() => {
        const useCtrlKey = submitKey === 'ctrl-enter';
        const useAltKey = submitKey === 'alt-enter';
        const commonEventProps = {
            key: 'Enter',
            code: 'Enter',
            ctrlKey: useCtrlKey,
            altKey: useAltKey,
            bubbles: true,
            cancelable: true
        };

        const keydownEvent = new KeyboardEvent('keydown', commonEventProps);
        inputField.dispatchEvent(keydownEvent);

        const keyupEvent = new KeyboardEvent('keyup', commonEventProps);
        inputField.dispatchEvent(keyupEvent);
    }, 100); // 100ms delay
}