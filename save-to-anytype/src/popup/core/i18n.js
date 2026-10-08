import { localize, loadLocalization } from '../../../localization/localization-service.js';
import { state } from './state.js';

// Localized text for the current language
export function t(key) {
    return localize(key, state.language);
}

// Updates every [data-locale-key] / [data-locale-placeholder] element of the popup
export function applyTranslations(root = document) {
    root.querySelectorAll('[data-locale-key]').forEach(element => {
        element.textContent = t(element.dataset.localeKey);
    });

    root.querySelectorAll('[data-locale-placeholder]').forEach(element => {
        element.placeholder = t(element.dataset.localePlaceholder);
    });
}

export function updateContextMenus() {
    chrome.runtime.sendMessage({
        action: "CREATE_CONTEXT_MENUS",
        titles: {
            savePage: t("SaveToAnytypemenuOption1"),
            saveSelection: t("SaveSelectedTextAnytypeOption2")
        }
    }).catch(() => { });
}

export { loadLocalization };
