// Popup shown on pages where the extension can't work (browser pages, web stores...)
import { loadLocalization, localize, detectBrowserLanguage } from '../../localization/localization-service.js';
import { applyThemeVariables } from '../shared/theme-config.js';

const DEFAULT_ACCENT_COLOR = '#ff3030ff';

async function init() {
    const saved = await chrome.storage.local.get(['theme', 'language', 'accentColor', 'zoom']);

    applyThemeVariables(saved.theme || 'dark', saved.accentColor || DEFAULT_ACCENT_COLOR);
    document.getElementById('zoomContainer').style.zoom = saved.zoom || 1;

    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('blockedSection').classList.remove('hidden');
    document.getElementById('OpenAnytypeBtn').classList.add('hidden');

    await loadLocalization();
    const language = saved.language || detectBrowserLanguage();
    document.getElementById('blockedSectionText').innerText = localize("blockedSectionURLRejected", language);
}

init();
