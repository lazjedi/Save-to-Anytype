// Localization is stored in localization/localizations.json
// To add a new language, simply add it to localizations.json
// "languageCode": "en" - the language code, it should match (navigator.language).split('-')[0]
// "countryCode": "GB" - needed to get the flag, take the country code from https://flagsapi.com/
//
// From popup code use t('KEY') (src/popup/core/i18n.js), elsewhere localize('KEY', languageCode).
// To localize something in HTML: <span data-locale-key="OpenAnytype">OpenAnytype</span>
// To localize a placeholder in HTML: <input data-locale-placeholder="EnterYourAPIKey">
//
// A key missing in the selected language falls back to English, then to the key itself.

const FALLBACK_LANGUAGE = 'en';

let languagesByCode = {};
let loadingPromise = null;

export function loadLocalization() {
    if (!loadingPromise) {
        loadingPromise = fetch(chrome.runtime.getURL('localization/localizations.json'))
            .then(response => response.json())
            .then(data => {
                languagesByCode = {};
                for (const language of data.languages) {
                    languagesByCode[language.languageCode] = language;
                }
            })
            .catch(error => {
                // allow a retry on the next call
                loadingPromise = null;
                throw error;
            });
    }

    return loadingPromise;
}

export function languageExists(languageCode) {
    return languageCode in languagesByCode;
}

export function detectBrowserLanguage() {
    const languageShort = (navigator.language || '').split('-')[0];
    return languageExists(languageShort) ? languageShort : FALLBACK_LANGUAGE;
}

export function localize(key, languageCode) {
    return languagesByCode[languageCode]?.[key]
        ?? languagesByCode[FALLBACK_LANGUAGE]?.[key]
        ?? key;
}

export function getLanguages() {
    return Object.values(languagesByCode).map(language => ({
        languageName: language.languageName,
        languageCode: language.languageCode,
        countryCode: language.countryCode
    }));
}
