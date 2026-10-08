// Entry point of the popup (shown as an overlay iframe on the page or in the side panel)
//
//  core/      constants, persisted state, DOM elements, i18n, logging
//  api/       Anytype API client
//  page/      data of the web page: properties, markdown, file sources, element selector
//  ui/        sections, status, tooltips, theme, Choices helpers, property field markup
//  features/  auth, settings, forms list, form editor, saving an object
import { detectBrowserLanguage } from '../../localization/localization-service.js';
import { elements } from './core/dom.js';
import { state, loadState } from './core/state.js';
import { t, applyTranslations, loadLocalization } from './core/i18n.js';
import { consoleError } from './core/logger.js';
import { showSection, showLoadingSection, showBlockedSection, SECTIONS } from './ui/sections.js';
import { showStatus } from './ui/status.js';
import { applyAppearance } from './ui/theme.js';
import { registerChoiceIcon } from './ui/choices.js';
import { checkboxLabelHtml } from './ui/property-fields.js';
import { loadPageTab, collectPageData, consumeSelectedText } from './page/page-data.js';
import { FILE_SOURCES } from './page/file-sources.js';
import { initAuth, startConnectionCheck, applyConnectionCheck } from './features/auth.js';
import { initSettings, openSettings } from './features/settings.js';
import { initFormsList, showMainSection } from './features/forms-list.js';
import { initFormEditor, openFormEditor } from './features/form-editor.js';
import { initObjectSaver } from './features/object-saver.js';
import './side-panel.js';

function initNavigation() {
    elements.settingsButton.addEventListener('click', openSettings);
    elements.createFormButton.addEventListener('click', openFormEditor);
    elements.closeSectionButtons.forEach(button => button.addEventListener('click', showMainSection));
}

function initCollapseSettingCheckbox() {
    const label = document.querySelector('label[for="collapseInputSettings"]');
    if (label && label.innerHTML.trim() === '')
        label.outerHTML = checkboxLabelHtml('collapseInputSettings');
}

// Previews of the page image and the screenshot in the file source lists
async function registerFileSourcePreviews() {
    for (const source of FILE_SOURCES) {
        const previewUrl = await source.previewUrl?.();
        if (previewUrl) registerChoiceIcon(previewUrl, source.id, true);
    }
}

async function init() {
    // jscolor initializes itself on DOMContentLoaded, which fires after module scripts; the color input is needed now
    jscolor.init();

    await loadLocalization().catch(error => consoleError('Localization could not be loaded:', error));

    const languageSaved = await loadState();
    if (!languageSaved) state.language = detectBrowserLanguage();

    applyAppearance();
    applyTranslations();
    initCollapseSettingCheckbox();

    initNavigation();
    initAuth();
    initSettings();
    initFormsList();
    initFormEditor();
    initObjectSaver();

    if (state.apiKey) showLoadingSection();
    else showSection(SECTIONS.auth);

    // The connection is checked while the page is read, but forms are shown only when the page data is ready
    const connectionCheck = state.apiKey ? startConnectionCheck() : null;

    try {
        await loadPageTab();
        await collectPageData();
    } catch (error) {
        consoleError('Page data could not be read:', error);
        showBlockedSection(true);
        return;
    }

    registerFileSourcePreviews();

    if (await consumeSelectedText())
        showStatus(t("SelectedTextHasBeenAdded"), 'success');

    if (connectionCheck) await applyConnectionCheck(await connectionCheck);
}

init().catch(error => {
    consoleError('Popup initialization failed:', error);
    showStatus(String(error?.message || error), 'error');
});
