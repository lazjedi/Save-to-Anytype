import { DEFAULT_ACCENT_COLOR, TEXTAREA_HEIGHT_PX } from './constants.js';

// Settings persisted in chrome.storage.local. Key names are kept as they were for compatibility with saved data
const DEFAULT_SETTINGS = Object.freeze({
    apiKey: null,
    theme: 'dark',
    language: 'en',
    accentColor: DEFAULT_ACCENT_COLOR,
    whatDoOnStart: 'Nothing',
    LastUsedForm: null, // formId of the last used form
    zoom: 1,
    height: 70,
    width: 24,
    textAreaHeightPx: TEXTAREA_HEIGHT_PX.DEFAULT,
    collapseOnOpenForm: 'false',
    stringsRemovedFromTabTitle: '',
    forms: []
});

const PERSISTED_KEYS = Object.keys(DEFAULT_SETTINGS);

export const state = {
    ...DEFAULT_SETTINGS,
    forms: [],
    // not persisted
    challengeId: null
};

export function normalizeTextAreaHeightPx(value) {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isNaN(parsedValue)) return TEXTAREA_HEIGHT_PX.DEFAULT;

    return Math.max(TEXTAREA_HEIGHT_PX.MIN, Math.min(TEXTAREA_HEIGHT_PX.MAX, parsedValue));
}

// Older versions stored the whole form object (or the string "null")
function normalizeLastUsedForm(value) {
    if (!value || value === 'null') return null;
    if (typeof value === 'object') return value.formId ?? null;
    return String(value);
}

// Returns true when the language was saved by the user before
export async function loadState() {
    const saved = await chrome.storage.local.get(PERSISTED_KEYS);

    for (const key of PERSISTED_KEYS) {
        state[key] = saved[key] || DEFAULT_SETTINGS[key];
    }

    state.forms = Array.isArray(saved.forms) ? saved.forms.filter(Boolean) : [];
    state.textAreaHeightPx = normalizeTextAreaHeightPx(saved.textAreaHeightPx);
    state.LastUsedForm = normalizeLastUsedForm(saved.LastUsedForm);

    return Boolean(saved.language);
}

export async function saveState() {
    const data = {};
    for (const key of PERSISTED_KEYS) {
        data[key] = state[key];
    }

    await chrome.storage.local.set(data);
}

export function findForm(formId) {
    return state.forms.find(form => String(form.formId) === String(formId)) || null;
}
