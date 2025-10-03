// content.js

const icon = document.createElement('img');
icon.src = chrome.runtime.getURL('icon.png');
icon.style.position = 'absolute';
icon.style.cursor = 'pointer';
icon.style.zIndex = '10000';
icon.style.display = 'none';
icon.classList.add('send-text-icon');
document.body.appendChild(icon);

let currentSelection = '';

// Default settings object
const DEFAULTS = {
    anchor: 'top-right',
    offsetX: 0,
    offsetY: 0
};

// Variable to hold the current settings
let positionSettings = DEFAULTS;

// --- 1. Load settings from storage ---
function loadPositionSettings() {
    chrome.storage.sync.get({ iconPosition: DEFAULTS }, (result) => {
        // Ensure the loaded settings are a valid object, otherwise use defaults
        if (typeof result.iconPosition === 'object' && result.iconPosition !== null) {
            positionSettings = { ...DEFAULTS, ...result.iconPosition };
        } else {
            positionSettings = DEFAULTS;
        }
    });
}

// --- 2. Listen for real-time changes ---
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.iconPosition) {
        positionSettings = { ...DEFAULTS, ...changes.iconPosition.newValue };
    }
});

// Initial load of settings
loadPositionSettings();


// --- 3. Update position calculation logic ---
document.addEventListener('mouseup', (e) => {
    if (e.target.classList.contains('send-text-icon')) {
        return;
    }

    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectedText) {
            currentSelection = selectedText;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            let baseX, baseY;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const iconWidth = 16;
            const iconHeight = 16;

            // Determine base coordinates from the anchor point
            switch (positionSettings.anchor) {
                case 'top-left':
                    baseX = scrollX + rect.left;
                    baseY = scrollY + rect.top - iconHeight;
                    break;
                case 'bottom-right':
                    baseX = scrollX + rect.right - iconWidth;
                    baseY = scrollY + rect.bottom;
                    break;
                case 'bottom-left':
                    baseX = scrollX + rect.left;
                    baseY = scrollY + rect.bottom;
                    break;
                case 'top-right':
                default:
                    baseX = scrollX + rect.right - iconWidth;
                    baseY = scrollY + rect.top - iconHeight;
                    break;
            }

            // Apply user-defined offsets
            const finalX = baseX + positionSettings.offsetX;
            const finalY = baseY + positionSettings.offsetY;

            icon.style.left = `${finalX}px`;
            icon.style.top = `${finalY}px`;
            icon.style.display = 'block';

        } else {
            icon.style.display = 'none';
            currentSelection = '';
        }
    }, 10);
});

// Left-click sends to background
icon.addEventListener('click', () => {
    if (currentSelection) {
        // --- Copy to Clipboard ---
        navigator.clipboard.writeText(currentSelection).then(() => {
            // --- Send to Background ---
            chrome.runtime.sendMessage({
                action: "sendText",
                text: currentSelection,
                sendInForeground: false // Explicitly send in background
            });
            hideIcon();
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Still send text even if copying fails
            chrome.runtime.sendMessage({
                action: "sendText",
                text: currentSelection,
                sendInForeground: false
            });
            hideIcon();
        });
    }
});

// Right-click sends to foreground
icon.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // Prevent the default context menu
    if (currentSelection) {
        chrome.runtime.sendMessage({
            action: "sendText",
            text: currentSelection,
            sendInForeground: true // Send and make active
        });
        hideIcon();
    }
});

function hideIcon() {
    icon.style.display = 'none';
    currentSelection = '';
}
window.addEventListener('resize', hideIcon);
window.addEventListener('scroll', hideIcon);
