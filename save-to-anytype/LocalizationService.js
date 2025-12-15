
// localization is stored in localizations.json
// To add a new language, simply add it to localizations.json file
// "languageCode": "en" - This is the language code, it should match what it outputs (navigator.language || navigator.userLanguage).split('-')[0]
// "countryCode": "GB" - The country code is needed to get the flag from the website, take the country code from there https://flagsapi.com/

// To localize something from popap.js, use: Localize('HERE IS THE LOCALIZATION KEY', state.language)
// If you need to use it from another script, use (make sure the language is already loaded and this method exists) before using: window.LocalizeGlobal("HERE IS THE LOCALIZATION KEY")
// If you need to localize something in HTML: <span id="OpenAnytypeBtnText" data-locale-key="OpenAnytype">OpenAnytype</span>
// If you need to localize a placeholder in HTML: <input type="password" id="apiKeyInput" data-locale-placeholder="EnterYourAPIKey" placeholder="Enter your API Key">

let localizationLoaded = false;
let localizationData = { languages: [] };

let languagesDict = {};

function CheckLanguageExist(lang) {
    return (lang in languagesDict);
}

async function loadLocalization() {

    if (localizationLoaded) return;

    const resp = await fetch(chrome.runtime.getURL('localizations.json'));
    localizationData = await resp.json();

    languagesDict = {};
    for (const lang of localizationData.languages) {
        languagesDict[lang.languageCode] = lang;
    }

    localizationLoaded = true;
}

loadLocalization();

function Localize(key, currentLanguage) {
    const lang = languagesDict[currentLanguage];

    if (!lang) return key;
    return lang[key] || key;
}

function GetLanguages() {
    return Object.values(languagesDict).map(l => ({
        languageName: l.languageName,
        languageCode: l.languageCode,
        countryCode: l.countryCode
    }));
}
