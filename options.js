// options.js

// --- UI Elements ---
const statusDiv = document.getElementById('status');
const resetButton = document.getElementById('reset');
// Target & Submission
const targetTabIndexInput = document.getElementById('targetTabIndex');
const submitKeyRadios = document.querySelectorAll('input[name="submitKey"]');
// Position
const anchorRadios = document.querySelectorAll('input[name="anchor"]');
const offsetXSlider = document.getElementById('offsetX');
const offsetYSlider = document.getElementById('offsetY');
const offsetXValueSpan = document.getElementById('offsetXValue');
const offsetYValueSpan = document.getElementById('offsetYValue');

// --- Default Settings ---
const DEFAULTS = {
    targetTabIndex: 1,
    submitKey: 'ctrl-enter',
    position: {
        anchor: 'top-right',
        offsetX: 0,
        offsetY: 0
    }
};

// --- Core Functions ---

function saveOptions() {
    // Ensure the tab index is a positive integer
    const tabIndex = parseInt(targetTabIndexInput.value, 10);
    if (isNaN(tabIndex) || tabIndex < 1) {
        targetTabIndexInput.value = DEFAULTS.targetTabIndex; // Reset to default if invalid
    }

    const settings = {
        targetTabIndex: parseInt(targetTabIndexInput.value, 10),
        submitKey: document.querySelector('input[name="submitKey"]:checked').value,
        position: {
            anchor: document.querySelector('input[name="anchor"]:checked').value,
            offsetX: parseInt(offsetXSlider.value, 10),
            offsetY: parseInt(offsetYSlider.value, 10)
        }
    };

    chrome.storage.sync.set({ settings: settings }, () => {
        statusDiv.textContent = 'Options saved.';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 1500);
    });
}

function restoreOptions() {
    chrome.storage.sync.get({ settings: DEFAULTS }, (result) => {
        const settings = result.settings;

        // Restore Target & Submission
        targetTabIndexInput.value = settings.targetTabIndex;
        document.querySelector(`input[name="submitKey"][value="${settings.submitKey}"]`).checked = true;

        // Restore Position
        document.querySelector(`input[name="anchor"][value="${settings.position.anchor}"]`).checked = true;
        offsetXSlider.value = settings.position.offsetX;
        offsetYSlider.value = settings.position.offsetY;

        updateSliderValues();
    });
}

function resetToDefaults() {
    // Set UI to defaults
    targetTabIndexInput.value = DEFAULTS.targetTabIndex;
    document.querySelector(`input[name="submitKey"][value="${DEFAULTS.submitKey}"]`).checked = true;
    document.querySelector(`input[name="anchor"][value="${DEFAULTS.position.anchor}"]`).checked = true;
    offsetXSlider.value = DEFAULTS.position.offsetX;
    offsetYSlider.value = DEFAULTS.position.offsetY;

    updateSliderValues();
    saveOptions();
}

function updateSliderValues() {
    offsetXValueSpan.textContent = `${offsetXSlider.value} px`;
    offsetYValueSpan.textContent = `${offsetYSlider.value} px`;
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', restoreOptions);
resetButton.addEventListener('click', resetToDefaults);

// Listen for changes on all inputs to save
targetTabIndexInput.addEventListener('change', saveOptions);
submitKeyRadios.forEach(radio => radio.addEventListener('change', saveOptions));
anchorRadios.forEach(radio => radio.addEventListener('change', saveOptions));
offsetXSlider.addEventListener('change', saveOptions);
offsetYSlider.addEventListener('change', saveOptions);

// Real-time UI updates for sliders
offsetXSlider.addEventListener('input', updateSliderValues);
offsetYSlider.addEventListener('input', updateSliderValues);
