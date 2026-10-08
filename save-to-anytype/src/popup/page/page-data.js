// Data of the web page the popup was opened for
import { SELECTED_TEXT_LIFETIME_MS } from '../core/constants.js';
import { consoleLog, consoleError } from '../core/logger.js';
import { htmlToMarkdown } from './markdown.js';

export const PAGE_SELECTOR = 'page_selector';
const PAGE_SELECTOR_PREFIX = PAGE_SELECTOR + '|';

/*
    Values that can be put into object properties.
    HOW TO ADD A NEW PAGE PROPERTY: add it here (id is also the localization key) and fill its value in collectPageData()
*/
export const PAGE_PROPERTIES = Object.freeze([
    { id: 'tab_title', nameKey: 'tab_title' },
    { id: 'page_url', nameKey: 'page_url' },
    { id: 'page_image', nameKey: 'page_image' },
    { id: 'page_description', nameKey: 'page_description' },
    { id: 'page_content', nameKey: 'page_content' },
    { id: 'selected_text_page', nameKey: 'selected_text_page' },
    // the value is read from the element selected by the user, see getPageProperty()
    { id: PAGE_SELECTOR, nameKey: 'page_selector' }
]);

const pageValues = Object.fromEntries(PAGE_PROPERTIES.map(property => [property.id, '']));

let pageTab = null;
let screenshotUrl = null;

export class PageAccessError extends Error { }

export function getPageTab() {
    return pageTab;
}

export function getScreenshotUrl() {
    return screenshotUrl;
}

export async function loadPageTab() {
    pageTab = await chrome.runtime.sendMessage({ action: "GET_PAGE_TAB" });
    return pageTab;
}

async function runPageScript(script) {
    const response = await chrome.runtime.sendMessage({ action: "RUN_PAGE_SCRIPT", tabId: pageTab.id, script });

    if (!response?.success)
        throw new PageAccessError(`Page script "${script}" failed: ${response?.error}`);

    return response.result;
}

// Throws PageAccessError when the extension can't read the page (browser pages, web store...)
export async function collectPageData() {
    if (!pageTab?.id) throw new PageAccessError('Page tab not found');

    pageValues.tab_title = pageTab.title || '';
    pageValues.page_url = pageTab.url || '';

    const [largestImage, description, contentHtml] = await Promise.all([
        runPageScript('largestImage'),
        runPageScript('description'),
        runPageScript('contentHtml')
    ]);

    pageValues.page_image = largestImage || '';
    pageValues.page_description = description || '';
    pageValues.page_content = htmlToMarkdown(contentHtml);

    consoleLog("Page data: ", { image: pageValues.page_image, description: pageValues.page_description, contentLength: pageValues.page_content.length });

    screenshotUrl = await chrome.runtime.sendMessage({ action: "GET_SCREENSHOT", tabId: pageTab.id }).catch(() => null);
}

// The text selected with the context menu "Save selected text" (only right after the click)
export async function consumeSelectedText() {
    try {
        const { selectedText, selectedTextTimestamp } = await chrome.storage.local.get(['selectedText', 'selectedTextTimestamp']);

        if (!selectedText) return false;

        await chrome.storage.local.remove(['selectedText', 'selectedTextTimestamp']);

        if (Date.now() - (selectedTextTimestamp || 0) >= SELECTED_TEXT_LIFETIME_MS) return false;

        pageValues.selected_text_page = selectedText;
        return true;
    } catch (error) {
        consoleError('Selected text could not be loaded: ', error);
        return false;
    }
}

export function makePageSelectorValue(selectedElement) {
    return PAGE_SELECTOR_PREFIX + (selectedElement?.elementClass || 'no-class') + '|' + (selectedElement?.elementDOM || '');
}

export function isPageSelectorValue(value) {
    return typeof value === 'string' && value.startsWith(PAGE_SELECTOR);
}

// key: a PAGE_PROPERTIES id or a saved page selector "page_selector|<class>|<dom path>"
export async function getPageProperty(key) {
    if (!isPageSelectorValue(key))
        return pageValues[key] ?? '';

    if (!key.startsWith(PAGE_SELECTOR_PREFIX) || !pageTab?.id) return '';

    try {
        const response = await chrome.runtime.sendMessage({
            action: "GET_ELEMENT_BY_CLASS_NAME",
            tabId: pageTab.id,
            classNameAndDom: key.slice(PAGE_SELECTOR_PREFIX.length)
        });

        if (response?.success) return response.data || '';

        consoleError("getPageProperty: element text could not be read", response?.error || "unknown error");
    } catch (error) {
        consoleError("getPageProperty: page_selector failed", error);
    }

    return '';
}
