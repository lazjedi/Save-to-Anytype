// Anytype API Base URL
const API_BASE_URL = 'http://localhost:31009/v1';
const API_VERSION = '2025-11-08';

// constants
const DEFAULT_ACCENT_COLOR = '#ff3030ff';

// State
let state = {
    apiKey: null,
    challengeId: null,
    theme: null,
    language: null,
    accentColor: null,
    whatDoOnStart: null,
    LastUsedForm: null,
    zoom: null,
    forms: []
};

let WasJustOpened = true;

let themeSelectChoices = null;
let languageSelectChoices = null;
let whatDoOnStartSelectChoices = null;
let spaceSelectChoices = null;
let typeSelectChoices = null;
let collectionSelectChoices = null;
let templateSelectChoices = null;

let selectedSpaceId = null;

let selectedType = null;

let propertiesListForSaving = [];

let propertiesListSpawned = [];

let SelectedSpaceName = null;
let AllSpaces = null;
let allObjects = [];
let allCollections = [];
let allTemplatesForObject = [];
let currentForm = null;

let CashedTypes = null;

let URLWasRejected = false;

// DOM Elements
const elements = {
    status: document.getElementById('status'),
    authSection: document.getElementById('authSection'),
    mainSection: document.getElementById('mainSection'),
    settingsSection: document.getElementById('settingsSection'),
    createFormSection: document.getElementById('createFormSection'),
    propertiesSection: document.getElementById('propertiesSection'),
    objectTemplateSection: document.getElementById('objectTemplateSection'),
    settingsButton: document.getElementById('settingsButton'),
    mainSectionButton: document.getElementById('mainSectionButton'),
    mainSectionButton2: document.getElementById('mainSectionButton2'),
    mainSectionButton3: document.getElementById('mainSectionButton3'),
    mainSectionButton4: document.getElementById('mainSectionButton4'),
    saveFormBtn: document.getElementById('saveFormBtn'),
    createFormButton: document.getElementById('createFormButton'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    propertiesListHandler: document.getElementById('propertiesListHandler'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    spaceSelect: document.getElementById('spaceSelect'),
    collectionSection: document.getElementById('collectionSection'),
    typeSection: document.getElementById('typeSection'),
    collectionsList: document.getElementById('collectionsList'),
    objectName: document.getElementById('objectName'),
    typeSelect: document.getElementById('typeSelect'),
    objectTemplateSectionSelect: document.getElementById('objectTemplateSectionSelect'),
    saveObjectBtn: document.getElementById('saveObjectBtn'),
    saveObjectBtnText: document.getElementById('saveObjectBtnText'),
    appNameInput: document.getElementById('appNameInput'),
    startChallengeBtn: document.getElementById('startChallengeBtn'),
    codeSection: document.getElementById('codeSection'),
    codeInput: document.getElementById('codeInput'),
    verifyCodeBtn: document.getElementById('verifyCodeBtn'),
    handlerForLoadedForms: document.getElementById('handlerForLoadedForms'),
    confirmDeleteFormSection: document.getElementById('confirmDeleteFormSection'),
    deleteFormBtn: document.getElementById('deleteFormBtn'),
    themeSelect: document.getElementById('themeSelect'),
    openGitHubBtn: document.getElementById('openGitHubBtn'),
    languageSelect: document.getElementById('languageSelect'),
    colorInput: document.getElementById('colorInput'),
    objectNameToSave: document.getElementById('objectNameToSave'),
    saveObjectSection: document.getElementById('saveObjectSection'),
    propertiesSaveObjectListWithDefaultValueHandler: document.getElementById('propertiesSaveObjectListWithDefaultValueHandler'),
    propertiesSaveObjectListWithoutDefaultValueHandler: document.getElementById('propertiesSaveObjectListWithoutDefaultValueHandler'),
    objectSavedSection: document.getElementById('objectSavedSection'),
    OpenInAnytypeBtn: document.getElementById('OpenInAnytypeBtn'),
    OpenAnytypeBtn: document.getElementById('OpenAnytypeBtn'),
    SaveToAnytypeVersion: document.getElementById('SaveToAnytypeVersion'),
    FormNameInput: document.getElementById('FormNameInput'),
    FormNameInputSection: document.getElementById('FormNameInputSection'),
    createFormTipButton: document.getElementById('createFormTipButton'),
    blockedSection: document.getElementById('blockedSection'),
    blockedSectionText: document.getElementById('blockedSectionText'),
    loadingSection: document.getElementById('loadingSection'),
    whatDoOnStartSelect: document.getElementById('whatDoOnStartSelect'),
    zoomRangeValue: document.getElementById('zoomRangeValue'),
    zoomCurrentRange: document.getElementById('zoomCurrentRange'),
    zoomContainer: document.getElementById('zoomContainer')
};

// Tab management
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;

        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

function generateRandomId() {
    const now = new Date();

    // Форматируем дату и время: YYYYMMDDHHMMSS
    const dateTime = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

    // Случайное 5-значное число
    const randomNumber = Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, '0');

    return dateTime + randomNumber;
}

// Show status message
function showStatus(message, type = 'info') {
    elements.status.textContent = message;
    elements.status.className = `status ${type}`;
    elements.status.classList.remove('hidden');

    if (type !== 'error') {
        setTimeout(() => {
            elements.status.classList.add('hidden');
        }, 3000);
    }
}

consoleLog = function (messageText, ...argsL) {
    chrome.runtime.sendMessage({ message: messageText, type: "log", args: argsL });
}

consoleError = function (messageText, ...argsL) {
    chrome.runtime.sendMessage({ message: messageText, type: "error", args: argsL });
}

UpdateTheTranslation = function () {
    loadLocalization().then(() => {
        document.querySelectorAll('[data-locale-key]').forEach(el => {
            const key = el.dataset.localeKey;
            el.textContent = Localize(key, state.language);
        });
        document.querySelectorAll('[data-locale-placeholder]').forEach(el => {
            const key = el.dataset.localePlaceholder;
            el.placeholder = Localize(key, state.language);
        });

        chrome.runtime.sendMessage({
            action: "CreateContextMenusButtons",
            menuOption1: Localize("SaveToAnytypemenuOption1", state.language),
            menuOption2: Localize("SaveSelectedTextAnytypeOption2", state.language)
        });
    });
}

window.LocalizeGlobal = function (key) {
    return Localize(key, state.language);
}

//#region Work with WebPage

// To add a new page property, you need to add its object to the WebPagePropierties sheet and also add processing 
// in the method document.addEventListener('DOMContentLoaded', async () => {

let WebPagePropierties = [
    { id: "tab_title", nameKey: "tab_title", value: "null o_O" },
    { id: "page_url", nameKey: "page_url", value: "null o_O" },
    { id: "page_image", nameKey: "page_image", value: "null o_O" },
    { id: "page_description", nameKey: "page_description", value: "null o_O" },
    { id: "page_content", nameKey: "page_content", value: "" },
    { id: "selected_text_page", nameKey: "selected_text_page", value: "" }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadState();

        if (state.apiKey) {
            await loadSpaces(true);
            showLoadingSection();
        }

        // Get current tab info
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            WebPagePropierties.find(p => p.id == "tab_title").value = tab.title || '';
            WebPagePropierties.find(p => p.id == "page_url").value = tab.url || '';

            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: findLargestVisibleImage
            });

            const largestImgSrc = result[0].result;
            consoleLog("largestImgSrc: " + largestImgSrc);

            WebPagePropierties.find(p => p.id == "page_image").value = largestImgSrc || '';

            const resultDescription = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: findDescription
            });

            consoleLog("Founded description: " + resultDescription[0].result);

            WebPagePropierties.find(p => p.id == "page_description").value = resultDescription[0].result || '';

            const resultExtractPageText = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractPageText
            });

            consoleLog("Founded content: " + resultExtractPageText[0].result);

            WebPagePropierties.find(p => p.id == "page_content").value = resultExtractPageText[0].result || '';
        }

        elements.SaveToAnytypeVersion.innerText = chrome.runtime.getManifest().version;

        // Check for selected text from context menu
        await loadSelectedText();
    }
    catch (error) {
        console.error(error);
        URLWasRejected = true;
        showBlockSection(true);
    }
});

function GetPagePropiertie(propiertie_key) {
    return WebPagePropierties.find(p => p.id == propiertie_key).value;
}

function extractPageText(maxLength = 600) {
    const bodyClone = document.body.cloneNode(true);

    const selectorsToRemove = ['script', 'style', 'noscript', 'iframe', 'svg', 'img'];
    bodyClone.querySelectorAll(selectorsToRemove.join(',')).forEach(el => el.remove());

    let text = bodyClone.innerText || '';

    text = text.replace(/\s+/g, ' ').trim();

    if (text.length > maxLength) {
        text = text.slice(0, maxLength).trim();
        text += '...';
    }

    return text;
}

// Load selected text from storage
async function loadSelectedText() {
    try {
        const result = await chrome.storage.local.get(['selectedText', 'selectedTextTimestamp']);

        if (result.selectedText) {
            // Check if the selection is recent (within last 5 seconds)
            const now = Date.now();
            const timestamp = result.selectedTextTimestamp || 0;

            if (now - timestamp < 5000) {
                // Format the selected text as markdown quote
                const formattedText = result.selectedText
                    .split('\n')
                    .map(line => `> ${line}`)
                    .join('\n');

                WebPagePropierties.find(p => p.id == "selected_text_page").value = formattedText || '';

                // Clear the stored text
                await chrome.storage.local.remove(['selectedText', 'selectedTextTimestamp']);

                // Show a brief notification
                showStatus(Localize("SelectedTextHasBeenAdded", state.language), 'success');
            }
        }
    } catch (error) {
        console.error(error);
        consoleError('Selected text could not be loaded: ', error.messsage);
    }
}

function findLargestVisibleImage() {
    const imgs = Array.from(document.querySelectorAll("img"));

    let largestImg = null;
    let largestArea = 0;

    imgs.forEach(img => {
        const rect = img.getBoundingClientRect();

        // Пропускаем скрытые элементы
        if (rect.width <= 0 || rect.height <= 0) return;
        if (!img.src) return;

        const style = window.getComputedStyle(img);
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            parseFloat(style.opacity) === 0
        ) return;

        // Пропускаем “пустые” изображения
        if (img.naturalWidth <= 1 || img.naturalHeight <= 1) return;

        // Проверяем, что хотя бы центр изображения видим и не перекрыт
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const topElement = document.elementFromPoint(cx, cy);

        if (!img.contains(topElement) && topElement !== img) return;

        // Площадь на экране
        const area = rect.width * rect.height;

        if (area > largestArea) {
            largestArea = area;
            largestImg = img;
        }
    });

    return largestImg?.src || null;
}

function findDescription() {
    // 1. meta description
    let el = document.querySelector('meta[name="description"]');
    if (el?.content?.trim()) return el.content.trim();

    // 2. og:description
    el = document.querySelector('meta[property="og:description"]');
    if (el?.content?.trim()) return el.content.trim();

    // 3. twitter:description
    el = document.querySelector('meta[name="twitter:description"]');
    if (el?.content?.trim()) return el.content.trim();

    // 4. first meaningful <p>
    const p = Array.from(document.querySelectorAll("p"))
        .map(p => p.innerText.trim())
        .find(text => text.length > 30 && text.length < 100);
    if (p) return p;

    // 5. title
    if (document.title?.trim()) return document.title.trim();

    // 6. fallback
    return '';
}

//#endregion

//#region load and save data

// Load saved state
async function loadState() {
    const saved = await chrome.storage.local.get(
        ['apiKey', 'selectedSpaceId', 'theme', 'language', 'accentColor', 'whatDoOnStart', 'LastUsedForm', 'zoom', 'forms']
    );

    if (saved.apiKey) {
        state.apiKey = saved.apiKey;
    }

    if (saved.selectedSpaceId) {
        state.selectedSpaceId = saved.selectedSpaceId;
    }

    if (saved.theme) {
        state.theme = saved.theme;
    }
    else {
        state.theme = 'dark';
    }

    if (saved.language) {
        state.language = saved.language;
    }
    else {
        state.language = "en";

        loadLocalization().then(() => {
            const langShort = (navigator.language || navigator.userLanguage).split('-')[0];

            const languageExist = CheckLanguageExist(langShort);

            consoleLog("language: " + langShort + " , language exist: " + languageExist);

            if (languageExist)
                state.language = langShort;

            UpdateTheTranslation();
        });
    }

    if (saved.accentColor) {
        state.accentColor = saved.accentColor;
    }
    else {
        state.accentColor = DEFAULT_ACCENT_COLOR;
    }

    if (saved.whatDoOnStart) {
        state.whatDoOnStart = saved.whatDoOnStart;
    }
    else {
        state.whatDoOnStart = "Nothing";
    }

    if (saved.LastUsedForm) {
        state.LastUsedForm = saved.LastUsedForm;
    }
    else {
        state.LastUsedForm = "null";
    }

    if (saved.zoom) {
        state.zoom = saved.zoom;
    }
    else {
        state.zoom = 1;
    }

    if (saved.forms) {
        state.forms = saved.forms;
    }
    else {
        state.forms = [];
    }

    loadLocalization().then(() => {
        window.dispatchEvent(new Event('LocalizeGlobalReady'));
    });

    consoleLog("load saved state: ", saved);
    ChangeTheme();

    UpdateTheTranslation();
}

// Save state
async function saveState() {
    await chrome.storage.local.set({
        apiKey: state.apiKey,
        selectedSpaceId: state.selectedSpaceId,
        theme: state.theme,
        language: state.language,
        accentColor: state.accentColor,
        whatDoOnStart: state.whatDoOnStart,
        LastUsedForm: state.LastUsedForm,
        zoom: elements.zoomRangeValue.value,
        forms: state.forms
    });

    consoleLog("state saved");
}

//#endregion

//#region Themes

function isHexColor(str) {
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{8})$/.test(str);
}

ChangeTheme = function () {
    if (state.theme === "dark") { // dark mode
        document.documentElement.style.setProperty('--text-color', '#e0e0e0');
        document.documentElement.style.setProperty('--text-color-inverted', '#080808');
        document.documentElement.style.setProperty('--back-color', '#0f0f0f');
        document.documentElement.style.setProperty('--color1', '#101010');
        document.documentElement.style.setProperty('--color2', '#070707');
        document.documentElement.style.setProperty('--color3', '#1a1a1a');
        document.documentElement.style.setProperty('--color4', '#333333');
        document.documentElement.style.setProperty('--color5', '#363636');
        document.documentElement.style.setProperty('--card-color', '#000000');
        document.documentElement.style.setProperty('--icon-brightness', '255');
    }
    else { // light mode
        document.documentElement.style.setProperty('--background', '#ffffff');
        document.documentElement.style.setProperty('--background-focus', '#ecececff');
        document.documentElement.style.setProperty('--input-text-color', '#080808');
        document.documentElement.style.setProperty('--section-title-color', '#080808');
        document.documentElement.style.setProperty('--text-color', '#080808');
        document.documentElement.style.setProperty('--text-color-inverted', '#e0e0e0');
        document.documentElement.style.setProperty('--back-color', '#ebebeb');
        document.documentElement.style.setProperty('--color1', '#ddd');
        document.documentElement.style.setProperty('--color2', '#fff');
        document.documentElement.style.setProperty('--color3', '#f9f9f9');
        document.documentElement.style.setProperty('--color4', '#b7b7b7');
        document.documentElement.style.setProperty('--color5', '#f2f2f2');
        document.documentElement.style.setProperty('--card-color', '#ffffff');
        document.documentElement.style.setProperty('--icon-brightness', '0');
    }

    document.documentElement.style.setProperty('--accent-color', state.accentColor);
    elements.colorInput.jscolor.fromString(state.accentColor);

    elements.zoomRangeValue.value = state.zoom;
    elements.zoomContainer.style.zoom = state.zoom;
    elements.zoomCurrentRange.textContent = state.zoom;
}

elements.colorInput.addEventListener("change", () => {
    consoleLog("Selected color:", elements.colorInput.value);


    if (isHexColor(elements.colorInput.value)) {
        state.accentColor = elements.colorInput.value;
        ChangeTheme();
        saveState();
    }
    else if (isHexColor("#" + elements.colorInput.value)) {

        elements.colorInput.jscolor.fromString("#" + elements.colorInput.value);

        state.accentColor = elements.colorInput.value;
        ChangeTheme();
        saveState();
    }
    else {
        showStatus(Localize('ColorInvalid', state.language), 'error');
    }
});

//#endregion

//#region settings

elements.zoomRangeValue.addEventListener('input', () => {
    elements.zoomCurrentRange.textContent = elements.zoomRangeValue.value;

    state.zoom = elements.zoomRangeValue.value;

    saveState();

    ChangeTheme();
});

elements.themeSelect.addEventListener('change', async (e) => {
    state.theme = themeSelectChoices.getValue(true);

    saveState();

    ChangeTheme();
});

elements.languageSelect.addEventListener('change', async (e) => {
    state.language = languageSelectChoices.getValue(true);

    UpdateTheTranslation();

    saveState();
});

elements.whatDoOnStartSelect.addEventListener('change', async (e) => {
    state.whatDoOnStart = whatDoOnStartSelectChoices.getValue(true);

    saveState();
});

//#endregion

//#region connect and disconnect Anytype

// API Key Connection
elements.connectBtn.addEventListener('click', async () => {
    const apiKey = elements.apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus(Localize('PleaseEnterYourAPIKey', state.language), 'error');
        return;
    }

    elements.connectBtn.innerHTML = ('<span class="loading"></span> ' + Localize('Connecting', state.language));
    elements.connectBtn.disabled = true;

    try {
        // Test the API key
        const response = await fetch(`${API_BASE_URL}/spaces`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (response.ok) {
            const responseData = await response.json();
            consoleLog('Initial API test response:', responseData);

            // Check if we got valid data
            if (responseData && (responseData.data || Array.isArray(responseData))) {
                state.apiKey = apiKey;
                await saveState();
                showStatus(Localize('SuccessfullyСonnected', state.language), 'success');
                showMainSection();
                await loadSpaces(true);
            } else {
                showStatus(Localize('APIResponseIsInAnUnexpectedFormat', state.language), 'error');
            }
        } else {
            const errorText = await response.text();
            console.error('API Key test failed:', response.status + " ," + errorText);
            consoleError('API Key test failed:', response.status + " ," + errorText);
            showStatus(Localize('InvalidAPIKey', state.language) + response.status, 'error');
        }

        UpdateTheTranslation();
    } catch (error) {
        console.error(error);
        consoleError('Connection error:', error.messsage);
        showStatus(Localize('ConnectionError', state.language) + error.message, 'error');
    } finally {
        elements.connectBtn.innerHTML = 'Connect';
        elements.connectBtn.disabled = false;
    }
});

// Challenge Authentication
elements.startChallengeBtn.addEventListener('click', async () => {
    const appName = elements.appNameInput.value.trim() || 'Save To Anytype';

    elements.startChallengeBtn.innerHTML = ('<span class="loading"></span> ' + Localize('ChallengeIsStarting', state.language));
    elements.startChallengeBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/challenges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Anytype-Version': API_VERSION
            },
            body: JSON.stringify({ app_name: appName })
        });

        if (response.ok) {
            const data = await response.json();
            state.challengeId = data.challenge_id;
            elements.codeSection.classList.remove('hidden');
            showStatus(Localize('Enter4digit', state.language), 'info');
            elements.codeInput.focus();
        } else {
            showStatus(Localize('ChallengeCouldNotBeStarted', state.language), 'error');
        }
    } catch (error) {
        showStatus(Localize('ConnectionError', state.language) + error.message, 'error');
    } finally {
        elements.startChallengeBtn.innerText = Localize('StartChallenge', state.language);
        elements.startChallengeBtn.disabled = false;
    }
});

// Verify Challenge Code
elements.verifyCodeBtn.addEventListener('click', async () => {
    const code = elements.codeInput.value.trim();

    if (!code || code.length !== 4) {
        showStatus(Localize('Enter4digit', state.language), 'error');
        return;
    }

    elements.verifyCodeBtn.innerHTML = ('<span class="loading"></span> ' + Localize('Verifying', state.language));
    elements.verifyCodeBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/api_keys`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Anytype-Version': API_VERSION
            },
            body: JSON.stringify({
                challenge_id: state.challengeId,
                code: code
            })
        });

        if (response.ok) {
            const data = await response.json();
            state.apiKey = data.api_key;
            await saveState();
            showStatus(Localize('SuccessfullyСonnected', state.language), 'success');
            showMainSection();
            await loadSpaces(true);
        } else {
            showStatus(Localize('CodeCouldNotBeVerified', state.language), 'error');
        }
    } catch (error) {
        showStatus(Localize('ConnectionError', state.language) + error.message, 'error');
    } finally {
        elements.verifyCodeBtn.innerHTML = 'Verify';
        elements.verifyCodeBtn.disabled = false;
    }
});

// Disconnect
elements.disconnectBtn.addEventListener('click', async () => {
    state.apiKey = null;
    selectedSpaceId = null;
    await chrome.storage.local.remove(['apiKey', 'selectedSpaceId']);

    authSection();
    elements.apiKeyInput.value = '';
    elements.codeInput.value = '';
    elements.codeSection.classList.add('hidden');

    showStatus(Localize('ConnectionLost', state.language), 'info');
});

//#endregion

//#region Change windows

function showBlockSection(URLRejected) {
    consoleLog('showBlockSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');
    elements.blockedSection.classList.remove('hidden');

    if (URLRejected) {
        elements.blockedSectionText.innerText = Localize("blockedSectionURLRejected", state.language);
        elements.OpenAnytypeBtn.classList.add('hidden');
    }
    else {
        elements.blockedSectionText.innerText = Localize("blockedSectionAnytypeNotRunning", state.language);
        elements.OpenAnytypeBtn.classList.remove('hidden');
    }
}

async function showMainSection() {
    consoleLog('showMainSection');

    LoadFormsForMainSection();

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.remove('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');
}

async function showLoadingSection() {
    consoleLog('showLoadingSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.remove('hidden');
}

function showCreateFormSection() {
    consoleLog('showCreateFormSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.remove('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');

    loadSpaces(false);
}

function settingsSection() {
    consoleLog('settingsSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.remove('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');

    if (themeSelectChoices === null) {
        themeSelectChoices = new Choices(elements.themeSelect, {
            removeItemButton: false,
            searchEnabled: false,
            shouldSort: false,
        });
    }

    themeSelectChoices.setChoiceByValue(state.theme);

    if (whatDoOnStartSelectChoices === null) {
        whatDoOnStartSelectChoices = new Choices(elements.whatDoOnStartSelect, {
            removeItemButton: false,
            searchEnabled: false,
            shouldSort: false,
        });
    }

    whatDoOnStartSelectChoices.setChoiceByValue(state.whatDoOnStart);

    if (languageSelectChoices === null) {
        const langs = GetLanguages();

        const choicesData = langs.map(lang => {
            return {
                value: lang.languageCode,
                label: lang.languageName,
                customProperties: {
                    img: `https://flagsapi.com/${lang.countryCode}/flat/64.png`
                }
            };
        });

        languageSelectChoices = new Choices(elements.languageSelect, {
            removeItemButton: false,
            searchEnabled: false,
            shouldSort: false,
            choices: choicesData
        });

        choicesData.forEach(x => {
            const url = x.customProperties.img;

            const style = document.createElement("style");
            style.textContent = `
            .choices__item[data-value="${x.value}"]::after {
                background-image: url("${url}");
            }
            `;
            document.head.appendChild(style);
        });
    }

    languageSelectChoices.setChoiceByValue(state.language);
}

function authSection() {
    consoleLog('authSection');

    elements.authSection.classList.remove('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');
}

function showConfirmDeleteFormSection(form) {
    consoleLog('showConfirmDeleteFormSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.remove('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');

    elements.deleteFormBtn.addEventListener('click', async () => {
        DeleteForm(form);
    });
}

function showSaveObjectSection(form) {
    consoleLog('showSaveObjectSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.remove('hidden');
    elements.loadingSection.classList.add('hidden');

    loadObjectTypeToSave(form);
}

function showobjectSavedSection() {
    consoleLog('showobjectSavedSection');

    elements.authSection.classList.add('hidden');
    elements.mainSection.classList.add('hidden');
    elements.createFormSection.classList.add('hidden');
    elements.settingsSection.classList.add('hidden');
    elements.confirmDeleteFormSection.classList.add('hidden');
    elements.saveObjectSection.classList.add('hidden');
    elements.objectSavedSection.classList.remove('hidden');
    elements.loadingSection.classList.add('hidden');
}

elements.createFormButton.addEventListener('click', async () => {
    showCreateFormSection();
});

elements.settingsButton.addEventListener('click', async () => {
    settingsSection();
});

elements.mainSectionButton.addEventListener('click', async () => {
    showMainSection();
});

elements.mainSectionButton2.addEventListener('click', async () => {
    showMainSection();
});

elements.mainSectionButton3.addEventListener('click', async () => {
    showMainSection();
});

elements.mainSectionButton4.addEventListener('click', async () => {
    showMainSection();
});

elements.openGitHubBtn.addEventListener('click', async () => {
    open("https://github.com/lazjedi/Save-to-Anytype", "_blank");
});

elements.OpenAnytypeBtn.addEventListener('click', async () => {
    open("Anytype://", "_blank");
});

//#endregion

//#region Create form

function SetNameForForm() {
    const emoji = selectedType.icon?.format === "emoji" ? selectedType.icon?.emoji : "";

    elements.FormNameInput.value = emoji + " " + selectedType.name + " | " + SelectedSpaceName;
}

elements.saveFormBtn.addEventListener('click', async () => {
    try {
        let propertiesList = [];

        for (let index = 0; index < propertiesListForSaving.length; index++) {
            const obj = propertiesListForSaving[index];

            propertiesList.push(
                {
                    AnytypeProperty: obj?.AnytypeProperty,
                    SelectedValueByUser: obj?.choice?.getValue(true)
                }
            );
        }

        const form = {
            formId: generateRandomId(),
            formName: elements.FormNameInput?.value,
            spaceId: selectedSpaceId,
            type: selectedType,
            collectionId: collectionSelectChoices?.getValue(true),
            templateId: templateSelectChoices?.getValue(true),
            properties: propertiesList
        }

        consoleLog("saving form: ", form);

        state.forms.push(form);

        saveState();
        showMainSection();
    }
    catch (error) {
        console.log(error);
    }
});

// Space selection change
elements.spaceSelect.addEventListener('change', async (e) => {
    selectedSpaceId = e.target.value;

    SelectedSpaceName = AllSpaces.find(s => s.id == selectedSpaceId).name;

    if (typeSelectChoices !== null)
        typeSelectChoices.destroy();

    if (collectionSelectChoices !== null)
        collectionSelectChoices.destroy();

    if (templateSelectChoices !== null)
        templateSelectChoices.destroy();

    elements.objectTemplateSection.classList.add('hidden');

    if (selectedSpaceId) {
        elements.typeSection.classList.remove('hidden');
        elements.saveFormBtn.classList.remove('hidden');
        elements.FormNameInputSection.classList.remove('hidden');

        await saveState();
        await loadCollections(selectedSpaceId);
        await loadTypes(selectedSpaceId);
    } else {
        selectedSpaceId = null;
        elements.collectionSection.classList.add('hidden');
        elements.typeSection.classList.add('hidden');
        elements.FormNameInputSection.classList.add('hidden');
        elements.propertiesSection.classList.add('hidden');
        elements.saveFormBtn.classList.add('hidden');
    }
});

// Type selection change
elements.typeSelect.addEventListener('change', (e) => {
    for (let i = 0; i < CashedTypes.length; i++) {
        const type = CashedTypes[i];
        if (e.target.value === type.key) {
            selectedType = type;
            break;
        }
    }

    if (templateSelectChoices !== null)
        templateSelectChoices.destroy();

    elements.objectTemplateSection.classList.add('hidden');

    loadObjectTemplates(selectedType.id);
    loadObjectProperties();

    SetNameForForm();

    elements.propertiesSection.classList.remove('hidden');
    elements.objectTemplateSection.classList.add('hidden');
});

async function loadSpaces(needToShowMainSection) {
    loadLocalization().then(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/spaces`, {
                headers: {
                    'Authorization': `Bearer ${state.apiKey}`,
                    'Anytype-Version': API_VERSION
                }
            });

            selectedSpaceId = null;

            selectedType = null;

            propertiesListSpawned = [];
            allObjects = [];

            CashedTypes = null;

            elements.objectTemplateSection.classList.add('hidden');
            elements.collectionSection.classList.add('hidden');
            elements.typeSection.classList.add('hidden');
            elements.FormNameInputSection.classList.add('hidden');
            elements.propertiesSection.classList.add('hidden');
            elements.saveFormBtn.classList.add('hidden');

            if (spaceSelectChoices !== null)
                spaceSelectChoices.destroy();

            elements.spaceSelect.innerHTML = '<option value="">' + Localize("SelectSpace", state.language) + '</option>';

            if (response.ok) {
                const responseData = await response.json();
                consoleLog('Spaces API response:', responseData);

                let spaces = responseData.data || responseData.spaces || responseData.items || [];

                if (Array.isArray(responseData)) {
                    spaces = responseData;
                }

                if (!Array.isArray(spaces)) {
                    console.error('Unexpected spaces format:', responseData);
                    consoleError('Unexpected spaces format:', responseData);
                    showStatus(Localize('SpaceListInUnexpectedFormat', state.language), 'error');
                    return;
                }

                if (spaces.length === 0) {
                    showStatus(Localize('NoSpaceFound', state.language), 'error');
                    return;
                }

                spaces.forEach(space => {
                    const option = document.createElement('option');
                    option.value = space.id;
                    option.textContent = space.name || space.title || space.id || Localize('UntitledSpace', state.language);
                    if (space.id === selectedSpaceId) {
                        option.selected = true;
                    }
                    elements.spaceSelect.appendChild(option);
                });

                AllSpaces = spaces;

                spaceSelectChoices = new Choices(document.getElementById("spaceSelect"), {
                    removeItemButton: false,
                    searchEnabled: true,
                    shouldSort: false,
                });

                if (!URLWasRejected && needToShowMainSection)
                    showMainSection();

                if (selectedSpaceId) {
                    await loadCollections(selectedSpaceId);
                    await loadTypes(selectedSpaceId);
                }
            } else {
                const errorText = await response.text();
                console.error('Space load error:', response.status + " ," + errorText);
                consoleError('Space load error:', response.status + " ," + errorText);
                showStatus(Localize('SpaceListCouldntBeLoaded', state.language) + response.status, 'error');
            }
        } catch (error) {
            console.error(error);
            consoleError('Space load exception:', error.messsage);
            showStatus(Localize('SpaceListCouldntBeLoaded', state.language) + error.message, 'error');
            showBlockSection(false);
        }
    });
}

async function loadTypes() {
    try {
        consoleLog('Loading types for space:', selectedSpaceId);

        // Update type select dropdown
        elements.typeSelect.innerHTML = '';

        const response = await chrome.tabs.query({ active: true, currentWindow: true });

        const typesResponse = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/types`, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (typesResponse.ok) {
            const data = await typesResponse.json();
            consoleLog('Types API response:', data);

            let types = data.data || data.types || (Array.isArray(data) ? data : []);

            if (!Array.isArray(types)) {
                console.error('Unexpected types format:', data);
                consoleError('Unexpected types format:', data);
                types = [];
            }

            if (typeSelectChoices !== null)
                typeSelectChoices.destroy();

            elements.typeSelect.innerHTML = ``;

            if (types.length === 0) {
                // Fallback to default types
                elements.typeSelect.innerHTML = `
                    <option value="page" selected>Page</option>
                    <option value="note">Note</option>
                    <option value="task">Task</option>
                    <option value="bookmark">Bookmark</option>
                `;
                consoleLog('No types found, using defaults');
            } else {
                consoleLog('Found types:', types.length);

                // Sort types: put common ones first
                const commonTypes = ['page', 'note', 'task', 'bookmark'];
                const sortedTypes = types.sort((a, b) => {
                    const aKey = a.key || a.type_key || '';
                    const bKey = b.key || b.type_key || '';
                    const aIndex = commonTypes.indexOf(aKey);
                    const bIndex = commonTypes.indexOf(bKey);

                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                });

                CashedTypes = sortedTypes;

                sortedTypes.forEach(type => {
                    const option = document.createElement('option');
                    const typeKey = type.key || type.type_key || type.id;
                    const typeName = type.name || type.title || typeKey;

                    option.value = typeKey;
                    option.textContent = typeName;

                    elements.typeSelect.appendChild(option);
                });

                selectedType = sortedTypes[0];

                SetNameForForm();
            }

            typeSelectChoices = new Choices(document.getElementById("typeSelect"), {
                removeItemButton: false,
                searchEnabled: true,
                shouldSort: false,
            });

            loadObjectProperties();
            loadObjectTemplates(selectedType.id);

            elements.propertiesSection.classList.remove('hidden');

        } else {
            console.error('Types load error:', typesResponse.status);
            consoleError('Types load error:', typesResponse.status);
            // Use default types on error
            elements.typeSelect.innerHTML = `
                <option value="page" selected>Page</option>
                <option value="note">Note</option>
                <option value="task">Task</option>
                <option value="bookmark">Bookmark</option>
            `;
        }
    } catch (error) {
        console.error(error);
        consoleError('Types could not be loaded:', error.messsage);
        // Use default types on error
        elements.typeSelect.innerHTML = `
            <option value="page" selected>Page</option>
            <option value="note">Note</option>
            <option value="task">Task</option>
            <option value="bookmark">Bookmark</option>
        `;
    }
}

async function loadCollections() {
    try {
        let collections = [];

        consoleLog('loadCollections for space id: ', selectedSpaceId);

        elements.collectionsList.innerHTML = '';

        // Primary method: Try lists endpoint
        try {
            const response = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/lists`, {
                headers: {
                    'Authorization': `Bearer ${state.apiKey}`,
                    'Anytype-Version': API_VERSION
                }
            });

            if (response.ok) {
                const data = await response.json();
                consoleLog('Lists endpoint response:', data);
                collections = data.data || data.lists || (Array.isArray(data) ? data : []);

                if (collections.length > 0) {
                    consoleLog('Found lists/sets:', collections.map(c => ({ id: c.id, name: c.name })));
                }
            }
        } catch (e) {
            consoleLog('Lists endpoint error:', e);
        }

        // If no lists found, try getting all objects and filter for sets
        if (collections.length === 0) {
            try {
                const response = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/objects`, {
                    headers: {
                        'Authorization': `Bearer ${state.apiKey}`,
                        'Anytype-Version': API_VERSION
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const objects = data.data || data.objects || (Array.isArray(data) ? data : []);

                    const uniqueTypes = [...new Set(objects.map(o => o.type || o.type_key || 'unknown'))];
                    consoleLog('Unique object types in space:', uniqueTypes);

                    collections = objects.filter(obj => {
                        const isSet =
                            obj.type === 'set' ||
                            obj.type === 'collection' ||
                            obj.type_key === 'set' ||
                            obj.type_key === 'collection' ||
                            obj.layout === 'set' ||
                            obj.layout === 'collection' ||
                            obj.layout === 'gallery' ||
                            obj.layout === 'grid' ||
                            obj.layout === 'list' ||
                            obj.layout === 'kanban' ||
                            (obj.view && obj.view.type) ||
                            (obj.name && obj.name.toLowerCase().includes('set'));

                        if (isSet) {
                            consoleLog('Identified as set/collection:', obj.name, {
                                id: obj.id,
                                type: obj.type,
                                type_key: obj.type_key,
                                layout: obj.layout
                            });
                        }

                        return isSet;
                    });

                    allCollections = collections;
                }
            } catch (e) {
                consoleLog('Objects endpoint error:', e);
            }
        }

        if (collectionSelectChoices !== null)
            collectionSelectChoices.destroy();

        if (!collections || collections.length === 0) {
            elements.collectionsList.innerHTML = `
                <div class="collection-item" style="font-size: 12px; color: #666;">
                    Sets/Collections not founded<br>
                    <small style="color: #999;">You can also save directly to Space</small>
                </div>`;
            elements.collectionSection.classList.add('hidden');
        } else {
            elements.collectionSection.classList.remove('hidden');
            consoleLog('Displaying collections:', collections.length);

            elements.collectionsList.innerHTML = `
                <select id="collectionSelect">
                </select>`;

            allCollections = collections;

            collections.forEach(collection => {
                const option = document.createElement('option');
                const typeKey = collection.id;
                const typeName = collection.name || collection.title || collection.id || 'Untitled Set';

                option.value = typeKey;
                option.textContent = typeName;

                document.getElementById("collectionSelect").appendChild(option);
            });

            collectionSelectChoices = new Choices(document.getElementById("collectionSelect"), {
                removeItemButton: true,
                searchEnabled: true,
                shouldSort: false,
            });

            collectionSelectChoices.removeActiveItems();
        }

        elements.typeSection.classList.remove('hidden');
        elements.FormNameInputSection.classList.remove('hidden');
    } catch (error) {
        consoleLog('Collections could not be loaded:', error);
        elements.collectionSection.classList.add('hidden');
        elements.collectionsList.innerHTML = `
            <div class="collection-item" style="font-size: 12px; color: #666;">
                Set/Collection yüklenemedi<br>
                <small style="color: #999;">You can also save directly to Space</small>
            </div>`;
    }
}

async function loadObjectTemplates(selectedTypeId) {
    try {
        const response = await chrome.tabs.query({ active: true, currentWindow: true });

        consoleLog('Loading Templates for space: ' + selectedSpaceId + " , type.id " + selectedTypeId);

        const typesTemplatesResponse = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/types/${selectedTypeId}/templates`, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (templateSelectChoices !== null)
            templateSelectChoices.destroy();

        // Update type select dropdown
        elements.objectTemplateSectionSelect.innerHTML = '';

        if (typesTemplatesResponse.ok) {
            const data = await typesTemplatesResponse.json();
            consoleLog('Types templates API response:', data);

            let typesTemplates = data.data || data.types || (Array.isArray(data) ? data : []);

            if (!Array.isArray(typesTemplates)) {
                console.error('Unexpected types templates format:', data);
                consoleError('Unexpected types templates format:', data);
                typesTemplates = [];
            }

            if (typesTemplates.length === 0) {
                consoleLog('No types templates found, using defaults');
            } else {
                consoleLog('Found types templates:', typesTemplates.length);

                // Sort types: put common ones first
                let sortedTypes = []

                sortedTypes = sortedTypes.concat(typesTemplates.sort((a, b) => {
                    const aKey = a.key || a.type_key || '';
                    const bKey = b.key || b.type_key || '';

                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                }));

                allTemplatesForObject = sortedTypes;

                consoleLog("sortedTypes: ", sortedTypes);

                sortedTypes.forEach(type => {
                    const option = document.createElement('option');
                    const typeKey = type.key || type.type_key || type.id;
                    const typeName = type.name || type.title || typeKey;

                    option.value = typeKey;
                    option.textContent = typeName;

                    elements.objectTemplateSectionSelect.appendChild(option);
                });

                templateSelectChoices = new Choices(elements.objectTemplateSectionSelect, {
                    removeItemButton: true,
                    searchEnabled: true,
                    shouldSort: false,
                });

                templateSelectChoices.removeActiveItems();

                elements.objectTemplateSection.classList.remove('hidden');
            }
        } else {
            console.error('Types templates load error:', typesTemplatesResponse.status);
            consoleError('Types templates load error:', typesTemplatesResponse.status);
        }
    } catch (error) {
        console.error(error);
        consoleError('Types templates could not be loaded:', error.messsage);
    }
}

async function loadAllObjects() {
    try {
        consoleLog("loading all objects");
        const response = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/objects?limit=300' `, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (response.ok) {
            allObjects = await response.json();
            allObjects = allObjects.data;
            consoleLog("all objects response ", allObjects);
        }
        else {
            allObjects = [];
        }

    } catch (error) {
        console.error(error);
        consoleError('loadAllObjects could not be loaded:', error.messsage);
    }
}

async function loadPropertieTags(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/properties/${propertyId}/tags`, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (response.ok) {
            let result = await response.json();
            result = result.data;
            return result;
        }
        else {
            return [];
        }

    } catch (error) {
        console.error(error);
        consoleError('loadPropertieTags could not be loaded:', error.messsage);
    }
}

async function loadObjectProperties() {
    try {
        consoleLog('Loading Properties for space:', selectedSpaceId);

        const response = await chrome.tabs.query({ active: true, currentWindow: true });

        elements.propertiesListHandler.innerHTML = "";
        propertiesListSpawned = [];

        let properties = [
            { object: "property", id: "nameId", key: "nameKeySaveToAnytype", name: Localize("NameOfObject", state.language), format: "text" },
            { object: "property", id: "objectBodyId", key: "objectBodyKeySaveToAnytype", name: Localize("objectBodyName", state.language), format: "text" }
        ];

        if (selectedType !== null && selectedType.properties !== null) {
            properties = properties.concat(selectedType.properties);

            let description = properties.find(p => p.key == "description");

            if (description === null || description === undefined)
                properties.push(
                    { object: "property", id: "descriptionId", key: "description", name: Localize("Description", state.language), format: "text" }
                );

            description = properties.find(p => p.key == "description");
            const index = properties.indexOf(description);
            if (index !== -1 && index !== 1) {
                properties.splice(index, 1);
                properties.splice(1, 0, description);
            }
        }

        consoleLog("currentTypeProperties: ", properties);

        propertiesListForSaving = [];

        for (const property of properties) {

            if (property.format === "files") continue; // images will be added later
            if (property.name === "Created by") continue; // we don't need this
            if (property.name === "Creation date") continue; // we don't need this

            let propertyHTML = document.createElement(`div`);

            if (property.format === "text" || property.format === "email"
                || property.format === "number" || property.format === "url"
                || property.format === "date" || property.format === "checkbox" || property.key === "description"
                || property.format === "phone") {
                propertyHTML.innerHTML = `
                                <div class="section-title">` + property.name + `</div>
                                <div class="form-group">
                                    <select id="` + property.key + `">
                                        ${WebPagePropierties.map(o => `
                                            <option value="${o.id}">${Localize(o.nameKey, state.language) || o.id}</option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;
            }
            else if (property.format === "objects") {
                await loadAllObjects();

                propertyHTML.innerHTML = `
                                <div class="section-title">` + property.name + `</div>
                                <div class="form-group">
                                    <select id="` + property.key + `">
                                        ${allObjects.map(o => `
                                            <option value="${o.id}">${o.name || o.id}</option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;
            }
            else if (property.format === "select" || property.format === "multi_select") {
                const tags = await loadPropertieTags(property.id);

                propertyHTML.innerHTML = `
                                <div class="section-title">` + property.name + `</div>
                                <div class="form-group">
                                    <select id="` + property.key + `" ` + (property.format === "multi_select" ? `multiple` : ``) + `>
                                        ${tags.map(o => `
                                            <option value="${o.id}">${o.name || o.id}</option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;
            }

            elements.propertiesListHandler.appendChild(propertyHTML);
            propertiesListSpawned.push(propertyHTML);

            const choice = new Choices(document.getElementById(property.key), {
                removeItemButton: true,
                searchEnabled: true,
                shouldSort: false,
            });

            propertiesListForSaving.push(
                { AnytypeProperty: property, choice: choice }
            );

            if (property.id === "nameId") {
                choice.setChoiceByValue(property.id);
            }
            else {
                choice.removeActiveItems();
            }

        }
    } catch (error) {
        console.error(error);
        consoleError('loadObjectProperties could not be loaded:', error.message);
    }
}

//#endregion

//#region ManageFormsOnMainSection

function LoadFormsForMainSection() {
    elements.handlerForLoadedForms.innerHTML = '';

    let firstFormInList = null;

    for (let index = 0; index < state.forms.length; index++) {
        const form = state.forms[index];

        const formObj = document.createElement('div');

        const name = (form.formName) || ((form.type.icon.format === "emoji" ? (form.type.icon.emoji + " ") : "") + form.type.name);

        if (index === 0)
            firstFormInList = form;

        formObj.innerHTML = `
            <div id="formObject` + form.formId + `" class="formObject flex-space-between">
                ` + ((state.forms.length !== 1) ? (`
                <div id="reorderFormButton` + form.formId + `" class="reorderFormButton"><div class="dots-icon"></div></div>
                `) : (``)) + `
                <button id="selectFormButton` + form.formId + `" class="btn-primary flex1">
                    <span id="selectFormButtonText` + form.formId + `">` + name + `</span>
                </button>
                <div id="deleteFormButton` + form.formId + `" class="trash-icon"></div>
            </div>
        `;

        elements.handlerForLoadedForms.appendChild(formObj);

        document.getElementById("deleteFormButton" + form.formId).addEventListener('click', async () => {
            showConfirmDeleteFormSection(form);
        });

        document.getElementById("selectFormButton" + form.formId).addEventListener('click', async () => {
            showSaveObjectSection(form);
        });
    }

    if (state.forms.length !== 1) {
        Sortable.create(
            elements.handlerForLoadedForms,
            {
                animation: 150,
                scroll: true,
                handle: '.reorderFormButton',
                onUpdate: function (evt) {
                    let formObjects = document.querySelectorAll(".formObject");

                    let newFormsOrder = [];

                    for (let index = 0; index < formObjects.length; index++) {
                        const formObj = formObjects[index];

                        const number = formObj.id.replace('formObject', '');

                        newFormsOrder.push(state.forms[number]);
                    }

                    state.forms = newFormsOrder;
                    saveState();
                }
            }
        );
    }

    if (WasJustOpened) {
        WasJustOpened = false;

        if (state.whatDoOnStart == "OpenFirstForm" && firstFormInList !== null && firstFormInList !== "null") {
            setTimeout(() => {
                showSaveObjectSection(firstFormInList);
            }, 0);
        }
        else if (state.whatDoOnStart == "OpenLastUsedForm" && state.LastUsedForm !== null && state.LastUsedForm !== undefined && state.LastUsedForm !== "null") {
            setTimeout(() => {
                showSaveObjectSection(state.LastUsedForm);
            }, 0);
        }
    }
}

function DeleteForm(form) {
    const formInState = state.forms.find(f => f.formId == form.formId);

    const index = state.forms.indexOf(formInState);
    if (index !== -1) {
        state.forms.splice(index, 1);
    }

    saveState();
    loadState();

    showMainSection();
}

//#endregion

//#region Save object to Anytype

async function loadObjectTypeToSave(form) {
    try {
        consoleLog('Loading type object for save in space: ' + form.spaceId + ' , type.id: ' + form.type.id);

        elements.propertiesSaveObjectListWithoutDefaultValueHandler.innerHTML = '';
        elements.propertiesSaveObjectListWithDefaultValueHandler.innerHTML = '';

        const response = await chrome.tabs.query({ active: true, currentWindow: true });

        currentForm = form;
        propertiesListForSaving = [];

        const typesResponse = await fetch(`${API_BASE_URL}/spaces/${form.spaceId}/types/${form.type.id}`, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        });

        if (typesResponse.ok) {

            const data = await typesResponse.json();

            consoleLog('Type object for save response: ', data);
            consoleLog('Form to save this object: ', form);

            let properties = [
                { format: 'text', id: 'nameId', key: 'nameKeySaveToAnytype', name: Localize("NameOfObject", state.language), object: 'property' }
            ];

            properties.push(
                { format: "text", id: "objectBodyId", key: "objectBodyKeySaveToAnytype", name: Localize("objectBodyName", state.language), object: "property" }
            );

            properties = properties.concat(data.type.properties);

            const description = properties.find(p => p.key == "description");

            if (description === null || description === undefined) {
                const index = properties.length > 1 ? 1 : properties.length;
                properties.splice(index, 0,
                    { object: "property", id: "descriptionId", key: "description", name: Localize("Description", state.language), format: "text" }
                );
            }
            else {
                const index = properties.indexOf(description);
                if (index !== -1 && index !== 1) {
                    properties.splice(index, 1);
                    properties.splice(1, 0, description);
                }
            }

            selectedSpaceId = form.spaceId;

            const name = (form.formName) || ((form.type.icon.format === "emoji" ? (form.type.icon.emoji + " ") : "") + form.type.name);
            elements.objectNameToSave.innerText = name;

            let propertiesForPrintWithoutDefaultValue = [];
            let propertiesForPrintWithDefaultValue = [];

            for (const property of properties) {

                let needToCreateChoices = false;

                const savedProperty = form.properties.find(p => p.AnytypeProperty.id === property.id);
                const savedPropertyValueExist = savedProperty !== null && savedProperty !== undefined
                    && savedProperty.SelectedValueByUser !== null && savedProperty.SelectedValueByUser !== "null"
                    && savedProperty.SelectedValueByUser !== undefined && savedProperty.SelectedValueByUser.length > 0;

                consoleLog('Found saved property: ', savedProperty);

                if (property.format === "files") continue; // images will be added later
                if (property.name === "Created by") continue; // we don't need this
                if (property.name === "Creation date") continue; // we don't need this

                let propertyHTML = document.createElement(`div`);

                if (property.format === "text" || property.format === "email"
                    || property.format === "number" || property.format === "url"
                    || property.format === "date" || property.format === "checkbox"
                    || property.key === "description" || property.format === "phone") {

                    needToCreateChoices = false;

                    let value = null;
                    const printTextarea = property.key === "description" || property.key === "objectBodyKeySaveToAnytype";

                    if (savedPropertyValueExist) {
                        value = GetPagePropiertie(savedProperty.SelectedValueByUser);
                    }

                    propertyHTML.innerHTML = `
                                    <div class="section-title">` + property.name + `</div>
                                    <div class="form-group">
                                        <` + (printTextarea ? "textarea " : "input") + ` 
                                            id="` + property.id + `_SO" 
                                            type="` + (property.format !== "phone" ? property.format : "tel") + `" 
                                            placeholder="` + property.name + `" `
                        + (savedPropertyValueExist && !printTextarea ? (`value="` + value + `" `) : (` `)) + `
                                        >` + (printTextarea ? (savedPropertyValueExist ? (value + "</textarea>") : "</textarea>") : "") + `
                                    </div>
                                `;
                }
                else if (property.format === "objects") {
                    needToCreateChoices = true;

                    await loadAllObjects();

                    propertyHTML.innerHTML = `
                                    <div class="section-title">` + property.name + `</div>
                                    <div class="form-group">
                                        <select id="` + property.id + `_SO">
                                            ${allObjects.map(o => `
                                                <option 
                                                    value="${o.id}" 
                                                    ` + ((savedPropertyValueExist && savedProperty.SelectedValueByUser == o.id) ? "selected" : "") + `
                                                >
                                                    ${o.name || o.id}
                                                </option>
                                                `).join("")}
                                        </select>
                                    </div>
                                `;
                }
                else if (property.format === "select" || property.format === "multi_select") {
                    needToCreateChoices = true;
                    const tags = await loadPropertieTags(property.id);

                    propertyHTML.innerHTML = `
                                    <div class="section-title">` + property.name + `</div>
                                    <div class="form-group">
                                        <select id="` + property.id + `_SO" ` + (property.format === "multi_select" ? `multiple` : ``) + `>
                                            ${tags.map(o => `
                                                <option 
                                                    value="${o.id}" 
                                                    ` + ((savedPropertyValueExist && savedProperty.SelectedValueByUser.includes(o.id)) ? "selected" : "") + `
                                                >
                                                    ${o.name || o.id}
                                                </option>
                                                `).join("")}
                                        </select>
                                    </div>
                                `;
                }

                if (savedPropertyValueExist && property.id !== "nameId")
                    propertiesForPrintWithDefaultValue.push({ needToCreateChoices: needToCreateChoices, needToDisableChoice: !savedPropertyValueExist, propertyHTML: propertyHTML, propertyId: property.id, propertyKey: property.key, value_type: property.format });
                else
                    propertiesForPrintWithoutDefaultValue.push({ needToCreateChoices: needToCreateChoices, needToDisableChoice: !savedPropertyValueExist, propertyHTML: propertyHTML, propertyId: property.id, propertyKey: property.key, value_type: property.format });
            }

            await loadCollections();

            if (allCollections != null && allCollections != undefined && allCollections.length > 0) {
                let propertyHTML = document.createElement(`div`);

                const savedCollectionExist = form.collectionId !== null && form.collectionId !== undefined;

                propertyHTML.innerHTML = `
                                <div class="section-title">` + Localize("SelectCollection", state.language) + `</div>
                                <div class="form-group">
                                    <select id="CollectionPrintedSaveToAnytype_SO" >
                                        ${allCollections.map(o => `
                                            <option 
                                                value="${o.id}" 
                                                ` + ((savedCollectionExist && form.collectionId === o.id) ? "selected" : "") + `
                                            >
                                                ${o.name || o.id}
                                            </option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;

                propertiesForPrintWithDefaultValue.push({ needToCreateChoices: true, needToDisableChoice: !savedCollectionExist, propertyHTML: propertyHTML, propertyId: "CollectionPrintedSaveToAnytype", propertyKey: "CollectionPrintedSaveToAnytype" });
            }

            await loadObjectTemplates(form.type.id);

            if (allTemplatesForObject != null && allTemplatesForObject != undefined && allTemplatesForObject.length > 0) {
                let propertyHTML = document.createElement(`div`);

                const savedTemplateExist = form.templateId !== null && form.templateId !== undefined;

                propertyHTML.innerHTML = `
                                <div class="section-title">` + Localize("SelectObjectTemplate", state.language) + `</div>
                                <div class="form-group">
                                    <select id="TemplatePrintedSaveToAnytype_SO" >
                                        ${allTemplatesForObject.map(o => `
                                            <option 
                                                value="${o.id}" 
                                                ` + ((savedTemplateExist && form.templateId === o.id) ? "selected" : "") + `
                                            >
                                                ${o.name || o.id}
                                            </option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;

                propertiesForPrintWithDefaultValue.push({ needToCreateChoices: true, needToDisableChoice: !savedTemplateExist, propertyHTML: propertyHTML, propertyId: "TemplatePrintedSaveToAnytype", propertyKey: "TemplatePrintedSaveToAnytype" });
            }

            if (propertiesForPrintWithoutDefaultValue.length > 0) {
                elements.propertiesSaveObjectListWithoutDefaultValueHandler.classList.remove('hidden');
            }
            else {
                elements.propertiesSaveObjectListWithoutDefaultValueHandler.classList.add('hidden');
            }

            if (propertiesForPrintWithDefaultValue.length > 0) {
                elements.propertiesSaveObjectListWithDefaultValueHandler.classList.remove('hidden');
            }
            else {
                elements.propertiesSaveObjectListWithDefaultValueHandler.classList.add('hidden');
            }

            for (let index = 0; index < propertiesForPrintWithoutDefaultValue.length; index++) {
                const propertieForPrint = propertiesForPrintWithoutDefaultValue[index];

                elements.propertiesSaveObjectListWithoutDefaultValueHandler.appendChild(propertieForPrint.propertyHTML);

                propertiesListForSaving.push({ KeyForAnytypeAPI: propertieForPrint.propertyKey, IdInHTML: propertieForPrint.propertyId + "_SO", value_type: propertieForPrint.value_type });

                if (propertieForPrint.needToCreateChoices) {
                    const choice = new Choices(document.getElementById(propertieForPrint.propertyId + "_SO"), {
                        removeItemButton: true,
                        searchEnabled: true,
                        shouldSort: false,
                    });

                    if (propertieForPrint.needToDisableChoice)
                        choice.removeActiveItems();
                }
            }

            for (let index = 0; index < propertiesForPrintWithDefaultValue.length; index++) {
                const propertieForPrint = propertiesForPrintWithDefaultValue[index];

                elements.propertiesSaveObjectListWithDefaultValueHandler.appendChild(propertieForPrint.propertyHTML);

                propertiesListForSaving.push({ KeyForAnytypeAPI: propertieForPrint.propertyKey, IdInHTML: propertieForPrint.propertyId + "_SO", value_type: propertieForPrint.value_type });

                if (propertieForPrint.needToCreateChoices) {
                    const choice = new Choices(document.getElementById(propertieForPrint.propertyId + "_SO"), {
                        removeItemButton: true,
                        searchEnabled: true,
                        shouldSort: false,
                    });

                    if (propertieForPrint.needToDisableChoice)
                        choice.removeActiveItems();
                }
            }


        } else {
            console.error('Type object for save could not be loaded: ', typesResponse.status);
            consoleError('Type object for save could not be loaded: ', typesResponse.status);
            showStatus(Localize("FailedToLoadObject", state.language) + typesResponse.status, "error")
        }
    } catch (error) {
        console.error(error);
        consoleError('Type object for save could not be loaded: ', error);
        showStatus(Localize("FailedToLoadObject", state.language) + error.messsage, "error")
    }
}

elements.saveObjectBtn.addEventListener('click', async () => {
    consoleLog("Start saving object");

    elements.saveObjectBtnText.innerHTML = '<span class="loading"></span> ' + Localize("Saving", state.language);
    elements.saveObjectBtn.disabled = true;

    try {
        let properties_final_list = [];
        let objectName = null;
        let objectBody = null;
        let ObjectCollectionId = null;
        let ObjectTemplateId = null;

        for (let index = 0; index < propertiesListForSaving.length; index++) {
            const propiertyPrinted = propertiesListForSaving[index];

            if (propiertyPrinted.KeyForAnytypeAPI !== "nameKeySaveToAnytype"
                && propiertyPrinted.KeyForAnytypeAPI !== "CollectionPrintedSaveToAnytype"
                && propiertyPrinted.KeyForAnytypeAPI !== "TemplatePrintedSaveToAnytype"
                && propiertyPrinted.KeyForAnytypeAPI !== "objectBodyKeySaveToAnytype"
            ) {
                let value = null;

                if (propiertyPrinted.value_type === "checkbox")
                    value = document.getElementById(propiertyPrinted.IdInHTML).checked;
                else if (propiertyPrinted.value_type === "multi_select" || propiertyPrinted.value_type === "objects")
                    value = Array.from(document.getElementById(propiertyPrinted.IdInHTML).options).filter(opt => opt.selected).map(opt => opt.value);
                else
                    value = document.getElementById(propiertyPrinted.IdInHTML).value;

                if (value !== null && value !== undefined && value !== "" && value.length > 0)
                    properties_final_list.push({ key: propiertyPrinted.KeyForAnytypeAPI, [propiertyPrinted.value_type]: value });
            }
            else if (propiertyPrinted.KeyForAnytypeAPI === "nameKeySaveToAnytype") {
                objectName = document.getElementById(propiertyPrinted.IdInHTML).value;
            }
            else if (propiertyPrinted.KeyForAnytypeAPI === "CollectionPrintedSaveToAnytype") {
                ObjectCollectionId = document.getElementById(propiertyPrinted.IdInHTML).value;
            }
            else if (propiertyPrinted.KeyForAnytypeAPI === "TemplatePrintedSaveToAnytype") {
                ObjectTemplateId = document.getElementById(propiertyPrinted.IdInHTML).value;
            }
            else if (propiertyPrinted.KeyForAnytypeAPI === "objectBodyKeySaveToAnytype") {
                objectBody = document.getElementById(propiertyPrinted.IdInHTML).value;
            }
        }

        consoleLog("properties_final_list: " + properties_final_list);
        consoleLog("objectName: " + objectName);
        consoleLog("objectBody: " + objectBody);
        consoleLog("ObjectCollectionId: " + ObjectCollectionId);
        consoleLog("ObjectTemplateId: " + ObjectTemplateId);

        // Create object in Anytype
        let objectData = {
            name: objectName,
            body: objectBody,
            type_key: currentForm.type.key || 'page',
            properties: properties_final_list
        };

        if (ObjectTemplateId !== null && ObjectTemplateId !== undefined && ObjectTemplateId !== '')
            objectData["template_id"] = ObjectTemplateId;

        consoleLog('Sending object data:', objectData);
        consoleLog('Using type_key:', currentForm.type.key || 'page');

        const response = await fetch(`${API_BASE_URL}/spaces/${selectedSpaceId}/objects`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Content-Type': 'application/json',
                'Anytype-Version': API_VERSION
            },
            body: JSON.stringify(objectData)
        });

        const responseText = await response.text();
        consoleLog('Create object response:', response.status, responseText);

        if (response.ok) {
            let createdObjectId = null;
            try {
                const data = JSON.parse(responseText);
                createdObjectId = data?.object?.id || null;
            } catch (e) {
                consoleLog('Response is not JSON:', responseText);
            }

            consoleLog('Object created:', createdObjectId);

            state.LastUsedForm = currentForm;
            saveState();

            // If a collection is selected, try to add the object to it
            if (ObjectCollectionId !== null && ObjectCollectionId !== undefined && ObjectCollectionId !== '' && createdObjectId) {
                try {
                    consoleLog('Adding to collection:', ObjectCollectionId, 'Object ID:', createdObjectId);

                    const collectionResponse = await fetch(
                        `${API_BASE_URL}/spaces/${selectedSpaceId}/lists/${ObjectCollectionId}/objects`,
                        {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${state.apiKey}`,
                                'Content-Type': 'application/json',
                                'Anytype-Version': API_VERSION
                            },
                            body: JSON.stringify({ objects: [createdObjectId] })
                        }
                    );

                    const collectionResponseText = await collectionResponse.text();
                    consoleLog('Add to collection response:', collectionResponse.status, collectionResponseText);

                    if (!collectionResponse.ok) {
                        consoleLog('Could not add to collection. Status:', collectionResponse.status, 'Response:', collectionResponseText);
                    } else {
                        consoleLog('Successfully added to collection');
                    }
                } catch (error) {
                    consoleLog('Could not add to collection:', error);
                }
            }

            elements.OpenInAnytypeBtn.addEventListener('click', async () => {
                open("Anytype://object?objectId=" + createdObjectId + "&spaceId=" + selectedSpaceId, "_blank");
            });

            showobjectSavedSection();

        } else {
            let erroressage = 'Save error';
            try {
                const errorData = JSON.parse(responseText);
                erroressage = errorData.message || errorData.error || responseText;
            } catch (e) {
                erroressage = responseText;
            }

            showStatus(`Save error: ${erroressage}`, 'error');
        }
    } catch (error) {
        console.error(error);
        consoleError('Save error:', error.messsage);
        showStatus('Connection error: ' + error.message, 'error');
    } finally {
        elements.saveObjectBtnText.innerHTML = 'Save';
        elements.saveObjectBtn.disabled = false;
    }
});

//#endregion

//#region Tips

function attachTooltip(element, textKey) {
    let tooltip = null;

    element.addEventListener("mouseenter", () => {
        tooltip = document.createElement("div");
        tooltip.className = "custom-tooltip";
        tooltip.innerText = Localize(textKey, state.language);
        document.body.appendChild(tooltip);

        const updatePosition = (e) => {
            tooltip.style.left = (e.clientX - 10) + "px";
            tooltip.style.top = (e.clientY + 30) + "px";
        };

        element._tooltipMoveHandler = updatePosition;

        element.addEventListener("mousemove", updatePosition);
        setTimeout(() => tooltip.style.opacity = "1", 10);
    });

    element.addEventListener("mouseleave", () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null;
        }
        element.removeEventListener("mousemove", element._tooltipMoveHandler);
    });
}

attachTooltip(elements.createFormTipButton, "CreateFormTip");

//#endregion
