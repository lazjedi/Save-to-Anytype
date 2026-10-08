import { consoleLog, consoleError } from './log.js';
import { writeLog, LOG_SOURCES } from '../shared/logger.js';
import { runPageScript } from './page-scripts.js';
import { uploadFileFromSource } from './file-upload.js';
import { createContextMenus, createContextMenusForSavedLanguage, MENU_SAVE_PAGE, MENU_SAVE_SELECTION } from './context-menu.js';

consoleLog('Background script loading...');

const POPUP_BLOCKED_PATH = "src/popup-blocked/popup-blocked.html";

// The same files as content_scripts in manifest.json, used when the content script isn't on the page yet
// (tabs opened before the extension was installed or updated)
const CONTENT_SCRIPT_FILES = ["src/content/overlay.js", "src/content/element-selector.js", "src/content/content.js"];

// Pages where extensions can't run scripts
const BLOCKED_URL_PREFIXES = [
    "chrome://",
    "edge://",
    "arc://",
    "about:",
    "view-source:",
    "devtools:",
    "chrome-extension://",
    "https://chrome.google.com/webstore",
    "https://chromewebstore.google.com/",
    "https://microsoftedge.microsoft.com/addons",
    "https://www.homedepot.com"
];

function isBlockedUrl(url) {
    return !url || BLOCKED_URL_PREFIXES.some(prefix => url.startsWith(prefix));
}

//#region Screenshot

// The screenshot of the visible part of the tab, taken right before the overlay is opened.
// Kept in session storage, because the service worker can be stopped while the popup is open
const SCREENSHOT_STORAGE_KEY = 'lastScreenshot';
let lastScreenshot = null;

async function captureScreenshot(tab) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
        lastScreenshot = { tabId: tab.id, dataUrl };
        await chrome.storage.session.set({ [SCREENSHOT_STORAGE_KEY]: lastScreenshot }).catch(() => { });
    } catch (error) {
        consoleError('Screenshot could not be taken:', error?.message || error);
        lastScreenshot = null;
        await chrome.storage.session.remove(SCREENSHOT_STORAGE_KEY).catch(() => { });
    }
}

async function getScreenshot(tabId) {
    if (!lastScreenshot) {
        const stored = await chrome.storage.session.get(SCREENSHOT_STORAGE_KEY).catch(() => ({}));
        lastScreenshot = stored[SCREENSHOT_STORAGE_KEY] || null;
    }

    return lastScreenshot && lastScreenshot.tabId === tabId ? lastScreenshot.dataUrl : null;
}

//#endregion

//#region Overlay

async function sendToContentScript(tabId, message) {
    try {
        return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
        // "Receiving end does not exist" - inject the content script and try again
        consoleLog('Content script is not available, injecting it:', error?.message);
        await chrome.scripting.executeScript({ target: { tabId }, files: CONTENT_SCRIPT_FILES });
        return await chrome.tabs.sendMessage(tabId, message);
    }
}

async function showOverlay(tab, action) {
    await captureScreenshot(tab);

    try {
        await sendToContentScript(tab.id, { action });
    } catch (error) {
        consoleError('Could not open overlay:', error?.message || error);
    }
}

async function openBlockedPopup(tab) {
    await chrome.action.setPopup({ popup: POPUP_BLOCKED_PATH, tabId: tab.id });
    await chrome.action.openPopup();
}

chrome.action.onClicked.addListener(async (tab) => {
    if (isBlockedUrl(tab.url))
        await openBlockedPopup(tab);
    else
        await showOverlay(tab, "TOGGLE_OVERLAY");
});

// A tab that showed the "blocked" popup gets the overlay again after it navigates to a regular page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url && !isBlockedUrl(changeInfo.url))
        chrome.action.setPopup({ popup: '', tabId }).catch(() => { });
});

//#endregion

//#region Context menu

chrome.runtime.onInstalled.addListener(() => {
    createContextMenusForSavedLanguage();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    consoleLog('Context menu clicked:', info.menuItemId);

    if (!tab?.id) return;

    if (info.menuItemId === MENU_SAVE_SELECTION) {
        // The content script keeps line breaks, info.selectionText doesn't
        let selectedText = info.selectionText || '';
        try {
            const response = await sendToContentScript(tab.id, { action: "getSelection" });
            selectedText = response?.selectedText || selectedText;
        } catch (error) {
            consoleError("Selection could not be read from the page:", error?.message || error);
        }

        if (selectedText) {
            await chrome.storage.local.set({ selectedText, selectedTextTimestamp: Date.now() });
            consoleLog('Selected text saved to storage');
        }
    }

    if (info.menuItemId === MENU_SAVE_PAGE || info.menuItemId === MENU_SAVE_SELECTION)
        await showOverlay(tab, "OPEN_OVERLAY");
});

//#endregion

//#region Messages from the popup

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
}

// Every handler returns a value (or a promise) that is sent back as the response
const MESSAGE_HANDLERS = {
    // The overlay is an iframe in the tab, so the sender tab is the page; the side panel has no tab
    GET_PAGE_TAB: async (request, sender) => sender.tab || await getActiveTab(),

    GET_SCREENSHOT: (request) => getScreenshot(request.tabId),

    CREATE_CONTEXT_MENUS: (request) => {
        createContextMenus(request.titles);
        return { success: true };
    },

    RUN_PAGE_SCRIPT: async (request) => ({
        success: true,
        result: await runPageScript(request.tabId, request.script)
    }),

    GET_ELEMENT_BY_CLASS_NAME: (request) =>
        chrome.tabs.sendMessage(request.tabId, { action: "GET_ELEMENT_BY_CLASS_NAME", classNameAndDom: request.classNameAndDom }),

    START_PAGE_ELEMENT_SELECTION: async (request) => {
        await chrome.tabs.sendMessage(request.tabId, { action: "START_PAGE_ELEMENT_SELECTION", localization: request.localization });
        return { success: true };
    },

    UPLOAD_FILE: async (request, sender) => {
        const sourceUrl = request.source === "screenshot"
            ? await getScreenshot(request.tabId)
            : request.sourceUrl;

        return { success: true, data: await uploadFileFromSource({ ...request, sourceUrl }) };
    }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "log" || request.type === "error") {
        writeLog(request.type, LOG_SOURCES.popup, request.message, request.args);
        return;
    }

    const handler = MESSAGE_HANDLERS[request.action];
    if (!handler) return;

    Promise.resolve()
        .then(() => handler(request, sender))
        .then(sendResponse, (error) => {
            consoleError(`${request.action} failed:`, error?.message || error);
            sendResponse({ success: false, error: String(error?.message || error) });
        });

    return true; // keep the channel open for the async response
});

//#endregion

// Keep service worker alive
chrome.alarms.create('keep-alive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keep-alive') consoleLog('Service worker keep-alive ping');
});

consoleLog('Background script loaded successfully');
