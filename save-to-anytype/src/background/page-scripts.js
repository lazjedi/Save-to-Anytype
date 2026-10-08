// Functions injected into the web page with chrome.scripting.executeScript.
// They are serialized and run in the page context, so they must not use anything from this module scope.

function findLargestVisibleImage() {
    const overlayId = "save-to-anytype-overlay";

    const isValidImageSource = (source) => {
        if (!source || typeof source !== "string") return false;
        const normalized = source.trim();

        // Only regular network image URLs, without svg and scripts
        if (!/^https?:\/\//i.test(normalized)) return false;
        if (/\.(svg|js)([?#].*)?$/i.test(normalized)) return false;

        return true;
    };

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    let bestVisibleSource = "";
    let bestVisibleArea = 0;

    for (const img of document.querySelectorAll("img")) {
        const imageSource = img.currentSrc || img.src || "";
        if (!isValidImageSource(imageSource)) continue;

        // Only actually loaded images
        if (img.naturalWidth <= 1 || img.naturalHeight <= 1) continue;

        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;

        // The image must intersect the viewport
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        if (visibleWidth <= 0 || visibleHeight <= 0) continue;

        const style = window.getComputedStyle(img);
        if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) === 0) continue;

        // Check that the center of the visible region is not covered by another element
        const visibleCenterX = Math.max(rect.left, 0) + visibleWidth / 2;
        const visibleCenterY = Math.max(rect.top, 0) + visibleHeight / 2;
        let topElement = document.elementFromPoint(visibleCenterX, visibleCenterY);

        // Our own overlay doesn't count
        const overlay = document.getElementById(overlayId);
        if (overlay && (topElement === overlay || overlay.contains(topElement))) {
            const previousPointerEvents = overlay.style.pointerEvents;
            overlay.style.pointerEvents = "none";
            topElement = document.elementFromPoint(visibleCenterX, visibleCenterY);
            overlay.style.pointerEvents = previousPointerEvents;
        }

        if (topElement && topElement !== img && !img.contains(topElement)) continue;

        const visibleArea = visibleWidth * visibleHeight;
        if (visibleArea > bestVisibleArea) {
            bestVisibleArea = visibleArea;
            bestVisibleSource = imageSource;
        }
    }

    return bestVisibleSource;
}

function findDescription() {
    const metaSelectors = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]'
    ];

    for (const selector of metaSelectors) {
        const content = document.querySelector(selector)?.content?.trim();
        if (content) return content;
    }

    // First meaningful paragraph
    const paragraph = Array.from(document.querySelectorAll("p"))
        .map(p => p.innerText.trim())
        .find(text => text.length > 30 && text.length < 100);
    if (paragraph) return paragraph;

    return document.title?.trim() || "";
}

// Web clipping: needs lib/Defuddle.js injected before
function extractPageContentHtml() {
    try {
        if (!document.body) throw new Error("Document body not found");
        if (typeof Defuddle === "undefined") throw new Error("Defuddle is not loaded");

        const result = new Defuddle(document.cloneNode(true)).parse();
        if (!result?.content) throw new Error("Defuddle could not parse the page");

        return result.content;
    } catch (error) {
        console.error("Content Extraction Error: ", error);
        return "PAGE PARSE ERROR";
    }
}

// name -> { func, files injected before the function }
export const PAGE_SCRIPTS = Object.freeze({
    largestImage: { func: findLargestVisibleImage },
    description: { func: findDescription },
    contentHtml: { func: extractPageContentHtml, files: ["lib/Defuddle.js"] }
});

export async function runPageScript(tabId, scriptName) {
    const script = PAGE_SCRIPTS[scriptName];
    if (!script) throw new Error(`Unknown page script: ${scriptName}`);

    if (script.files)
        await chrome.scripting.executeScript({ target: { tabId }, files: script.files });

    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: script.func });
    return injection?.result;
}
