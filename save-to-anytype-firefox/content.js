// Content script for capturing selected text

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getSelection") {
        const selectedText = window.getSelection().toString().trim();
        sendResponse({ selectedText: selectedText });
    }
    else if (request.action === "TOGGLE_OVERLAY") {
        toggleOverlay();
    }
    else if (request.action === "OPEN_OVERLAY") {
        openOverlay();
    }
    return true;
});

function openOverlay() {
    let existing = document.getElementById("save-to-anytype-overlay");
    if (existing) {
        return;
    }

    toggleOverlay();
}

function toggleOverlay() {
    let existing = document.getElementById("save-to-anytype-overlay");
    if (existing) {
        existing.remove();
        return;
    }

    const overlay = document.createElement("iframe");
    overlay.id = "save-to-anytype-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "10px";
    overlay.style.right = "10px";
    overlay.style.zIndex = "999999";
    overlay.style.width = "470px";
    overlay.style.height = "70%";
    overlay.style.border = "2px solid #000";
    overlay.style.borderRadius = "11px";
    overlay.src = chrome.runtime.getURL("popup.html");

    document.body.appendChild(overlay);

    function onClickOutside(event) {
        if (!overlay.contains(event.target)) {
            console.log("deleted-save-to-anytype");
            overlay.remove();
            document.removeEventListener('mousedown', onClickOutside);
        }
    }

    document.addEventListener('mousedown', onClickOutside);

    SetHeight(overlay);
}

async function SetHeight(overlay) {
    let saved = await chrome.storage.local.get(
        ['height', 'width']
    );

    if (!saved || !saved.height) {
        overlay.style.height = "70%";
    }
    else if (saved) {
        overlay.style.height = saved.height.toString() + "%";
    }

    if (!saved || !saved.width) {
        overlay.style.width = "24%";
    }
    else if (saved) {
        overlay.style.width = saved.width.toString() + "%";
    }
}
