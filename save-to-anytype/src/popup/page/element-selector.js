// Selecting an element on the page as a source of a property value (see src/content/element-selector.js)
import { t } from '../core/i18n.js';
import { getPageTab } from './page-data.js';

// fieldKey -> { elementClass, elementText, elementDOM }
const selectedElements = new Map();
const selectionListeners = new Map();
let activeFieldKey = null;

export function getSelectedElement(fieldKey) {
    return selectedElements.get(fieldKey) || null;
}

export function clearSelectedElements() {
    selectedElements.clear();
    selectionListeners.clear();
    activeFieldKey = null;
}

// onSelected(selectedElement) is called when the user clicks an element on the page
export async function startElementSelection(fieldKey, onSelected) {
    activeFieldKey = fieldKey;
    selectionListeners.set(fieldKey, onSelected);

    const response = await chrome.runtime.sendMessage({
        action: "START_PAGE_ELEMENT_SELECTION",
        tabId: getPageTab()?.id,
        localization: {
            class: t("element_selector_class"),
            text: t("element_selector_text")
        }
    });

    if (!response?.success) throw new Error(response?.error || 'Element selection could not be started');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== "ELEMENT_SELECTED" || activeFieldKey === null) return;

    const selectedElement = {
        elementClass: request.elementClass,
        elementText: request.elementText,
        elementDOM: request.elementDOM
    };

    selectedElements.set(activeFieldKey, selectedElement);
    selectionListeners.get(activeFieldKey)?.(selectedElement);
    activeFieldKey = null;

    sendResponse({ received: true });
});
