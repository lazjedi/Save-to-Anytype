import { consoleLog, consoleError } from './log.js';
import { loadLocalization, localize, detectBrowserLanguage } from '../../localization/localization-service.js';

export const MENU_SAVE_PAGE = "save-to-Anytype";
export const MENU_SAVE_SELECTION = "save-selection-to-Anytype";

// titles: { savePage, saveSelection }
export function createContextMenus(titles) {
    chrome.contextMenus.removeAll(() => {
        createMenu({ id: MENU_SAVE_PAGE, title: titles.savePage, contexts: ["page", "link"] });
        createMenu({ id: MENU_SAVE_SELECTION, title: titles.saveSelection, contexts: ["selection"] });
    });
}

function createMenu(properties) {
    chrome.contextMenus.create(properties, () => {
        if (chrome.runtime.lastError)
            consoleError(`Error creating context menu ${properties.id}:`, chrome.runtime.lastError.message);
        else
            consoleLog(`Context menu "${properties.id}" created`);
    });
}

// Menus are created on install with the saved (or browser) language, the popup recreates them on language change
export async function createContextMenusForSavedLanguage() {
    try {
        await loadLocalization();
        const { language } = await chrome.storage.local.get('language');
        const languageCode = language || detectBrowserLanguage();

        createContextMenus({
            savePage: localize("SaveToAnytypemenuOption1", languageCode),
            saveSelection: localize("SaveSelectedTextAnytypeOption2", languageCode)
        });
    } catch (error) {
        consoleError('Context menus could not be created:', error?.message || error);
    }
}
