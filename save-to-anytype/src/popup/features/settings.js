import { ThemeConfig } from '../../shared/theme-config.js';
import { getLanguages } from '../../../localization/localization-service.js';
import { GITHUB_URL, ANYTYPE_APP_URL } from '../core/constants.js';
import { elements, escapeHtml, openExternal } from '../core/dom.js';
import { state, saveState, normalizeTextAreaHeightPx } from '../core/state.js';
import { t, applyTranslations, updateContextMenus } from '../core/i18n.js';
import { showSection, SECTIONS } from '../ui/sections.js';
import { showStatus } from '../ui/status.js';
import { applyAppearance } from '../ui/theme.js';
import { attachTooltip } from '../ui/tooltip.js';
import { createChoices, createChoicesWithIcons } from '../ui/choices.js';

let themeChoices = null;
let languageChoices = null;
let whatDoOnStartChoices = null;

function updateSetting(key, value) {
    state[key] = value;
    saveState();
    applyAppearance();
}

// A range input bound to a numeric setting
function bindRange(input, key, normalize = (value) => value) {
    input.addEventListener('input', () => {
        const value = normalize(input.value);
        input.value = value;
        updateSetting(key, value);
    });
}

function isHexColor(value) {
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
}

export function initSettings() {
    bindRange(elements.zoomRangeValue, 'zoom');
    bindRange(elements.heightRangeValue, 'height');
    bindRange(elements.widthRangeValue, 'width');
    bindRange(elements.textAreaHeightRangeValue, 'textAreaHeightPx', normalizeTextAreaHeightPx);

    elements.collapseInputSettings.addEventListener('input', () => {
        updateSetting('collapseOnOpenForm', elements.collapseInputSettings.checked.toString());
    });

    elements.colorInput.addEventListener('change', () => {
        const value = elements.colorInput.value;
        const color = isHexColor(value) ? value : isHexColor('#' + value) ? '#' + value : null;

        if (color) updateSetting('accentColor', color);
        else showStatus(t('ColorInvalid'), 'error');
    });

    elements.themeSelect.addEventListener('change', () => updateSetting('theme', elements.themeSelect.value));

    elements.whatDoOnStartSelect.addEventListener('change', () => {
        state.whatDoOnStart = elements.whatDoOnStartSelect.value;
        saveState();
    });

    elements.languageSelect.addEventListener('change', () => {
        state.language = elements.languageSelect.value;
        saveState();
        applyTranslations();
        updateContextMenus();
    });

    elements.stringsRemovedFromTabTitleInput.addEventListener('input', () => {
        state.stringsRemovedFromTabTitle = elements.stringsRemovedFromTabTitleInput.value;
        saveState();
    });

    elements.openGitHubBtn.addEventListener('click', () => openExternal(GITHUB_URL));
    elements.OpenAnytypeBtn.addEventListener('click', () => openExternal(ANYTYPE_APP_URL));

    elements.SaveToAnytypeVersion.innerText = chrome.runtime.getManifest().version;

    attachTooltip(elements.stringsRemovedFromTabTitleTipButton, "StringsRemovedFromTabTitleTooltip", 180);
}

export function openSettings() {
    showSection(SECTIONS.settings);

    if (!themeChoices) {
        elements.themeSelect.innerHTML = Object.entries(ThemeConfig.themes).map(([themeName, theme]) => {
            const label = themeName === 'dark' ? t('Dark') : themeName === 'light' ? t('Light') : theme.label;
            return `<option value="${escapeHtml(themeName)}">${escapeHtml(label)}</option>`;
        }).join('');

        themeChoices = createChoices(elements.themeSelect);
    }
    themeChoices.setChoiceByValue(state.theme);

    whatDoOnStartChoices ??= createChoices(elements.whatDoOnStartSelect);
    whatDoOnStartChoices.setChoiceByValue(state.whatDoOnStart);

    languageChoices ??= createChoicesWithIcons(elements.languageSelect, getLanguages().map(language => ({
        value: language.languageCode,
        label: language.languageName,
        customProperties: { img: `https://flagsapi.com/${language.countryCode}/flat/64.png` }
    })));
    languageChoices.setChoiceByValue(state.language);

    elements.collapseInputSettings.checked = state.collapseOnOpenForm === "true";
    elements.stringsRemovedFromTabTitleInput.value = state.stringsRemovedFromTabTitle || "";
}
