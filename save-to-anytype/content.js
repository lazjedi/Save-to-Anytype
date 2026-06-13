// Inject CSS for element selector
const selectorStyles = document.createElement("style");
selectorStyles.textContent = `
    .page-element-selector-highlight {
        outline: 3px solid #ff3030 !important;
        background-color: rgba(255, 48, 48, 0.1) !important;
    }
    
    body.page-element-selector-active {
        cursor: crosshair !important;
    }
    
    body.page-element-selector-active * {
        cursor: crosshair !important;
    }
`;
document.head.appendChild(selectorStyles);

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
    else if (request.action === "START_PAGE_ELEMENT_SELECTION") {
        startElementSelection();
        sendResponse({ started: true });
    }
    else if (request.action === "SET_ELEMENT_SELECTOR_LOCALIZATION") {
        window.__elementSelectorLocalization = request.localization;
        sendResponse({ localizationSet: true });
    }
    else if (request.action === "GET_ELEMENT_BY_CLASS_NAME") {
        try {
            const html = GetElementByClassName(request.className);
            sendResponse({ success: true, data: html });
        } catch (error) {
            sendResponse({ success: false, error: String(error?.message || error) });
        }
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
    overlay.style.minWidth = "340px";
    overlay.style.height = "70%";
    overlay.style.border = "2px solid #000";
    overlay.style.borderRadius = "11px";
    overlay.src = chrome.runtime.getURL("popup.html");

    document.body.appendChild(overlay);

    function onClickOutside(event) {
        if (!overlay.contains(event.target)) {
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

//#region Element Selection Mode

let elementSelectorTooltip = null;
let elementSelectorOverlay = null;
let elementSelectorActive = false;
let elementSelectorLastElement = null;

function startElementSelection() {
    elementSelectorActive = true;

    // Hide the overlay
    const overlay = document.getElementById("save-to-anytype-overlay");
    if (overlay) {
        overlay.style.display = "none";
        elementSelectorOverlay = overlay;
    }

    // Add visual indicator
    document.body.classList.add("page-element-selector-active");
    document.body.style.cursor = "crosshair";

    // Handle hover
    document.addEventListener("mouseover", handleElementHover);
    document.addEventListener("mouseout", handleElementMouseOut);
    document.addEventListener("click", handleElementClick, true);
    document.addEventListener("keydown", handleElementSelectorKeyDown);

    // Prevent page interaction
    document.addEventListener("mousedown", preventPageInteraction, true);
    document.addEventListener("mouseup", preventPageInteraction, true);
}

function stopElementSelection() {
    elementSelectorActive = false;
    document.body.classList.remove("page-element-selector-active");
    document.body.style.cursor = "auto";

    // Remove event listeners
    document.removeEventListener("mouseover", handleElementHover);
    document.removeEventListener("mouseout", handleElementMouseOut);
    document.removeEventListener("click", handleElementClick, true);
    document.removeEventListener("keydown", handleElementSelectorKeyDown);
    document.removeEventListener("mousedown", preventPageInteraction, true);
    document.removeEventListener("mouseup", preventPageInteraction, true);

    // Remove tooltip
    if (elementSelectorTooltip) {
        elementSelectorTooltip.remove();
        elementSelectorTooltip = null;
    }

    // Restore overlay
    if (elementSelectorOverlay) {
        elementSelectorOverlay.style.display = "block";
    }

    // Remove selection highlight
    if (elementSelectorLastElement) {
        elementSelectorLastElement.classList.remove("page-element-selector-highlight");
        elementSelectorLastElement = null;
    }
}

function handleElementHover(e) {
    if (!elementSelectorActive) return;

    const element = e.target;

    // Remove highlight from previous element
    if (elementSelectorLastElement && elementSelectorLastElement !== element) {
        elementSelectorLastElement.classList.remove("page-element-selector-highlight");
    }

    // Add highlight to current element
    element.classList.add("page-element-selector-highlight");
    elementSelectorLastElement = element;

    // Show tooltip
    showElementSelectorTooltip(e, element);
}

function handleElementMouseOut(e) {
    if (!elementSelectorActive) return;

    const element = e.target;
    element.classList.remove("page-element-selector-highlight");

    if (elementSelectorTooltip) {
        elementSelectorTooltip.remove();
        elementSelectorTooltip = null;
    }
}

function handleElementClick(e) {
    if (!elementSelectorActive) return;

    try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const element = e.target;
        const elementClass = element.className.replace(" page-element-selector-highlight", "") || "no-class";
        const elementText = element.textContent.substring(0, 100).trim();

        // Send selected element class to popup
        chrome.runtime.sendMessage({
            action: "ELEMENT_SELECTED",
            elementClass: elementClass,
            elementText: elementText
        }, function (response) {
            if (chrome.runtime.lastError) {
                console.error("Error sending element selection:", chrome.runtime.lastError);
            }
        });

        // Stop element selection
        stopElementSelection();
    }
    catch (err) {
        return;
    }

    return false;
}

function GetElementByClassName(className) {
    const rawClassName = String(className || "").trim();

    if (!rawClassName || rawClassName === "no-class") {
        return "";
    }

    const classList = rawClassName.split(/\s+/).filter(Boolean);
    if (classList.length === 0) {
        return "";
    }

    const escapedClasses = classList.map((name) => {
        if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
            return CSS.escape(name);
        }
        return name.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    });

    // For multi-class values build a compound selector: .class1.class2
    const selector = "." + escapedClasses.join(".");
    const element = document.querySelector(selector);

    if (!element) {
        return "";
    }

    return element.innerHTML || "";
}

function handleElementSelectorKeyDown(e) {
    if (e.key === "Escape" && elementSelectorActive) {
        stopElementSelection();
    }
}

function preventPageInteraction(e) {
    if (elementSelectorActive) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
    }
}

function showElementSelectorTooltip(event, element) {
    // Remove existing tooltip
    if (elementSelectorTooltip) {
        elementSelectorTooltip.remove();
    }

    if (!element) return;
    if (!element.className) return;

    // Create tooltip
    elementSelectorTooltip = document.createElement("div");
    elementSelectorTooltip.style.cssText = `
        position: fixed;
        background: #2a2a2a;
        color: #e8e8e8;
        padding: 2px 5px;
        border-radius: 7px;
        font-size: 13px;
        border: 1px solid #4e4e4e;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 9999999;
        max-width: 280px;
        word-wrap: break-word;
        pointer-events: none;
    `;

    try {
        const elementClass = element?.className?.replace(" page-element-selector-highlight", "") || "no-class";
        const elementText = element?.textContent?.substring(0, 50).trim().replace(/\n/g, " ");
        const classLabel = window.__elementSelectorLocalization?.class || "Selected class:";
        const textLabel = window.__elementSelectorLocalization?.text || "Text";

        elementSelectorTooltip.innerHTML = `
            <div style="color: #b0b0b0; margin-bottom: 4px;"><strong>${classLabel}</strong> ${elementClass}</div>
            <div style="color: #e8e8e8; font-size: 16px;"><strong>${textLabel}:</strong> ${elementText}</div>
        `;

        document.body.appendChild(elementSelectorTooltip);

        // Position tooltip
        elementSelectorTooltip.style.left = (event.clientX + 10) + "px";
        elementSelectorTooltip.style.top = (event.clientY + 10) + "px";
    }
    catch (err) {
        return;
    }
}

//#endregion
