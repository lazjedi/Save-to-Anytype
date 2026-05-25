const API_BASE_URL = 'http://localhost:31009/v1';
const API_VERSION = '2025-11-08';

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
    height: null,
    width: null,
    collapseOnOpenForm: null,
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
let WasSubscribeToggleCollapsedButton = false;
let turndownService = undefined;
const choiceImagePreviewByValue = new Map();
let choiceImagePreviewElement = null;
let choiceImagePreviewImage = null;
let choiceImagePreviewBound = false;
let choiceImagePreviewCurrentValue = null;

// Running the extension's main method after loading the DOM
if (document.readyState === "complete" || document.readyState === "interactive") {
    localPopapInited();
} else {
    document.addEventListener("DOMContentLoaded", localPopapInited);
}

async function localPopapInited() {
    //#region Elements on page

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
        propertiesSaveObjectListWithDefaultValueHandlerContent: document.getElementById('propertiesSaveObjectListWithDefaultValueHandlerContent'),
        propertiesSaveObjectListWithDefaultValueHandlerToggle: document.getElementById('propertiesSaveObjectListWithDefaultValueHandlerToggle'),
        propertiesSaveObjectListWithoutDefaultValueHandler: document.getElementById('propertiesSaveObjectListWithoutDefaultValueHandler'),
        propertiesSaveObjectListWithDefaultValueHandlerToggleText: document.getElementById('propertiesSaveObjectListWithDefaultValueHandlerToggleText'),
        propertiesSaveObjectListWithDefaultValueHandlerToggleSign: document.getElementById('propertiesSaveObjectListWithDefaultValueHandlerToggleSign'),
        collapseInputSettings: document.getElementById('collapseInputSettings'),
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
        zoomContainer: document.getElementById('zoomContainer'),
        heightRangeValue: document.getElementById('heightRangeValue'),
        heightCurrentRange: document.getElementById('heightCurrentRange'),
        widthRangeValue: document.getElementById('widthRangeValue'),
        widthCurrentRange: document.getElementById('widthCurrentRange')
    };

    //#endregion

    // Inject SVG into collapseInputSettings label (only once)
    const collapseLabel = document.querySelector('label[for="collapseInputSettings"]');
    if (collapseLabel && collapseLabel.innerHTML.trim() === '') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = getCheckboxElement('collapseInputSettings');
        collapseLabel.innerHTML = tempDiv.querySelector('label').innerHTML;
    }

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

    //#region Helper Methods

    const chromeTABS = await chrome.runtime.sendMessage({
        action: "GET_TABS"
    });

    // Color normalization
    function normalizeColor(colorValue) {
        if (!colorValue) return null;

        const colorMap = {
            'grey': '#414141',
            'yellow': '#6c630f',
            'orange': '#5c2a06',
            'red': '#4a0a08',
            'pink': '#4a0828',
            'purple': '#3d0e68',
            'blue': '#162060',
            'ice': '#023a58',
            'teal': '#0b4f4a',
            'lime': '#1a3a0a'
        };

        return colorMap[colorValue.toLowerCase()] || colorValue;
    }

    function getCheckboxElement(id) {
        return `
            <label for="` + id + `">
                <svg class="checkbox-rect-icon" viewBox="1 3 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round">
                    </g>
                    <g> 
                        <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        </path> 
                    </g>
                </svg>
            </label>`;
    }

    function attachFileNameFormatInputGuard(inputOrId) {
        const input = typeof inputOrId === 'string'
            ? document.getElementById(inputOrId)
            : inputOrId;

        if (!input || input.dataset.fileNameFormatGuardAttached === 'true') return;

        input.dataset.fileNameFormatGuardAttached = 'true';

        const sanitizeValue = (value) => value
            .replace(/ /g, '-')
            .replace(/[^\p{L}0-9_<>+()\-]/gu, '');

        const insertSanitizedText = (text) => {
            const sanitizedText = sanitizeValue(text);

            if (!sanitizedText) return;

            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;

            input.setRangeText(sanitizedText, start, end, 'end');
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };

        input.addEventListener('beforeinput', (event) => {
            if (event.inputType && event.inputType.startsWith('insert') && typeof event.data === 'string') {
                const sanitizedData = sanitizeValue(event.data);

                if (sanitizedData !== event.data) {
                    event.preventDefault();
                    insertSanitizedText(event.data);
                }
            }
        });

        input.addEventListener('paste', (event) => {
            const pastedText = event.clipboardData?.getData('text') ?? '';
            const sanitizedText = sanitizeValue(pastedText);

            if (sanitizedText !== pastedText) {
                event.preventDefault();
                insertSanitizedText(pastedText);
            }
        });

        input.addEventListener('input', () => {
            const sanitizedValue = sanitizeValue(input.value);

            if (sanitizedValue !== input.value) {
                input.value = sanitizedValue;
            }
        });
    }

    function ReplaceDataInFileName(rawFileName) {
        const sourceValue = String(rawFileName ?? '');
        const now = new Date();
        const twoDigits = (value) => String(value).padStart(2, '0');

        const currentTime = `${twoDigits(now.getHours())}-${twoDigits(now.getMinutes())}`;
        const currentDate = `${twoDigits(now.getDate())}-${twoDigits(now.getMonth() + 1)}-${now.getFullYear()}`;
        const currentDateAlt = `${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}-${now.getFullYear()}`;

        const pageUrl = GetPagePropiertie("page_url") || '';
        const tabTitle = GetPagePropiertie("tab_title") || '';

        let siteName = '';
        try {
            siteName = new URL(pageUrl).hostname.replace(/^www\./i, '');
        } catch {
            siteName = '';
        }

        const tokenReplacements = {
            '<time>': currentTime,
            '<date>': currentDate,
            '<date_alt>': currentDateAlt,
            '<random_id>': generateRandomId(),
            '<site_name>': siteName,
            '<tab_title>': tabTitle
        };

        let result = sourceValue;
        for (const [token, replacementValue] of Object.entries(tokenReplacements)) {
            result = result.split(token).join(String(replacementValue ?? ''));
        }

        result = result
            .replace(/ /g, '-')
            .replace(/[^\p{L}0-9_<>+()\-]/gu, '')
            .replace(/[<>]/g, '');

        return result;
    }

    function createTurndownService() {
        const service = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            emDelimiter: '_'
        });

        service.keep(['iframe', 'script', 'style']);

        service.addRule('figures', {
            filter: 'figure',
            replacement: (content, node) => {
                const img = node.querySelector('img');
                const caption = node.querySelector('figcaption');
                if (img) {
                    const alt = img.getAttribute('alt') || '';
                    const src = img.getAttribute('src') || '';
                    const captionText = caption ? caption.textContent : '';
                    return `

![${alt}](${src})
${captionText}

`;
                }
                return content;
            }
        });

        return service;
    }

    function generateRandomId() {
        const now = new Date();

        const dateTime = now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

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

    // log message in console of service worker
    function consoleLog(messageText, ...argsL) {
        chrome.runtime.sendMessage({ message: messageText, type: "log", args: argsL });
    }

    // log error in console of service worker
    function consoleError(messageText, ...argsL) {
        chrome.runtime.sendMessage({ message: messageText, type: "error", args: argsL });
    }

    function ensureChoiceImageHoverPreviewHandlers() {
        if (choiceImagePreviewBound) return;
        choiceImagePreviewBound = true;

        const getChoiceItem = (target) => {
            if (!target || typeof target.closest !== 'function') return null;
            return target.closest('.choices__item[data-value]');
        };

        const ensurePreviewElement = () => {
            if (choiceImagePreviewElement) return;

            choiceImagePreviewElement = document.createElement('div');
            choiceImagePreviewElement.className = 'choice-image-preview';

            choiceImagePreviewImage = document.createElement('img');
            choiceImagePreviewImage.className = 'choice-image-preview-image';

            choiceImagePreviewElement.appendChild(choiceImagePreviewImage);
            document.body.appendChild(choiceImagePreviewElement);
        };

        const hidePreview = () => {
            if (!choiceImagePreviewElement) return;
            choiceImagePreviewElement.style.display = 'none';
            choiceImagePreviewCurrentValue = null;
        };

        const updatePreviewPosition = (event) => {
            if (!choiceImagePreviewElement || choiceImagePreviewElement.style.display === 'none') return;

            const offsetX = -50;
            const offsetY = 18;

            const maxLeft = Math.max(0, window.innerWidth - choiceImagePreviewElement.offsetWidth - 8);
            const maxTop = Math.max(0, window.innerHeight - choiceImagePreviewElement.offsetHeight - 8);

            const left = Math.min(maxLeft, event.clientX + offsetX);
            const top = Math.min(maxTop, event.clientY + offsetY);

            choiceImagePreviewElement.style.left = `${left}px`;
            choiceImagePreviewElement.style.top = `${top}px`;
        };

        document.addEventListener('mouseover', (event) => {
            const item = getChoiceItem(event.target);
            if (!item) return;

            const value = item.getAttribute('data-value') || '';
            const previewUrl = choiceImagePreviewByValue.get(value);
            if (!previewUrl) return;

            ensurePreviewElement();

            choiceImagePreviewCurrentValue = value;
            choiceImagePreviewImage.src = previewUrl;
            choiceImagePreviewElement.style.display = 'block';

            updatePreviewPosition(event);
        });

        document.addEventListener('mousemove', (event) => {
            updatePreviewPosition(event);
        });

        document.addEventListener('mouseout', (event) => {
            const item = getChoiceItem(event.target);
            if (!item) return;

            const relatedItem = getChoiceItem(event.relatedTarget);
            if (relatedItem === item) return;

            const value = item.getAttribute('data-value') || '';
            if (value === choiceImagePreviewCurrentValue) {
                hidePreview();
            }
        });
    }

    function CreateImageReferenceForChoices(img, value, createPopapOnHover) {
        const rawValue = String(value ?? '');
        const escapedValue = (typeof CSS !== 'undefined' && CSS.escape)
            ? CSS.escape(rawValue)
            : rawValue.replace(/"/g, '\\"');

        const isImageUrl = /^(https?:)?\/\//.test(img) || img.startsWith('data:');

        const getPreviewSource = () => {
            if (isImageUrl) return img;

            const previewText = String(img ?? '').trim();
            if (!previewText) return '';

            const escapedPreviewText = previewText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><rect width="320" height="220" rx="12" fill="#111827"/><text x="160" y="114" text-anchor="middle" dominant-baseline="middle" font-size="96" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${escapedPreviewText}</text></svg>`;
            return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        };

        if (createPopapOnHover) {
            ensureChoiceImageHoverPreviewHandlers();
            const previewSource = getPreviewSource();
            if (previewSource) {
                choiceImagePreviewByValue.set(rawValue, previewSource);
                choiceImagePreviewByValue.set(escapedValue, previewSource);
            }
        }

        if (document.head.querySelector(`style[data-choices-value="${escapedValue}"]`)) return;

        const style = document.createElement("style");
        style.dataset.choicesValue = escapedValue;
        if (isImageUrl) {
            style.textContent = `
                .choices__item[data-value="${escapedValue}"]::after {
                    content: "";
                    background-image: url("${img}");
                }
            `;
        } else {
            style.textContent = `
                .choices__item[data-value="${escapedValue}"]::after {
                    content: ${JSON.stringify(img)} !important;
                    background-image: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
            `;
        }

        document.head.appendChild(style);
    }

    function GenerateChoicesWithIcons(selectElement, choicesData, choicesOptions = {}) {
        const choicesInstance = new Choices(selectElement, {
            removeItemButton: false,
            searchEnabled: false,
            shouldSort: false,
            choices: choicesData,
            ...choicesOptions
        });

        choicesData.forEach(choice => {
            const img = choice?.customProperties?.img;
            if (!img || img === "null") return;

            CreateImageReferenceForChoices(img, String(choice.value ?? ""));
        });

        return choicesInstance;
    }

    function UpdateTheTranslation() {
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

    //#endregion

    //#region Files work

    // TODO: в файле локализации добавить перевод на все языки

    // TODO: тут описать, как добавлять новые типы файлов для сохранени
    let filesPropierties = [
        { id: "none_file", nameKey: "none_file", function: async () => null },
        { id: "image_by_url", nameKey: "image_by_url", function: UploadImageFromUrl },
        { id: "html_file", nameKey: "html_file", function: UploadHtmlPage },
        { id: "screenshot", nameKey: "screenshot", function: UploadScreenshot },
    ];

    async function UploadImageFromUrl(fileName) {
        const responce = await chrome.runtime.sendMessage({
            action: "executeScript_UploadImageFromUrl",
            uploadUrl: `${API_BASE_URL}/spaces/${selectedSpaceId}/files`,
            imageUrl: GetPagePropiertie("page_image"),
            token: state.apiKey,
            apiVersion: API_VERSION,
            fileName: fileName
        });

        return responce;
    }

    async function UploadHtmlPage(fileName) {
        const responce = await chrome.runtime.sendMessage({
            action: "executeScript_UploadHtmlFile",
            uploadUrl: `${API_BASE_URL}/spaces/${selectedSpaceId}/files`,
            pageUrl: GetPagePropiertie("page_url"),
            token: state.apiKey,
            apiVersion: API_VERSION,
            fileName: fileName
        });

        return responce;
    }

    async function UploadScreenshot(fileName) {
        const responce = await chrome.runtime.sendMessage({
            action: "executeScript_UploadScreenshot",
            uploadUrl: `${API_BASE_URL}/spaces/${selectedSpaceId}/files`,
            token: state.apiKey,
            apiVersion: API_VERSION,
            fileName: fileName
        });

        return responce;
    }

    //#endregion

    //#region Work with WebPage

    // To add a new page property, you need to add its object to the WebPagePropierties sheet and also add processing
    // in the method document.addEventListener('DOMContentLoaded', async () => {

    let WebPagePropierties = [
        { id: "tab_title", nameKey: "tab_title", value: "null o_O" },
        { id: "page_url", nameKey: "page_url", value: "null o_O" },
        { id: "page_image", nameKey: "page_image", value: "null o_O" },
        { id: "page_description", nameKey: "page_description", value: "null o_O" },
        { id: "page_content", nameKey: "page_content", value: "" },
        { id: "selected_text_page", nameKey: "selected_text_page", value: "" },
        { id: "page_screenshotUrl", nameKey: "page_screenshotUrl", value: "" }
    ];

    try {
        await loadState();

        if (state.apiKey) {
            await loadSpaces(true);
            showLoadingSection();
        }

        // Get current tab info
        const [tab] = chromeTABS;
        if (tab) {
            WebPagePropierties.find(p => p.id == "tab_title").value = tab.title || '';
            WebPagePropierties.find(p => p.id == "page_url").value = tab.url || '';

            const result = await chrome.runtime.sendMessage({
                action: "executeScript_findLargestVisibleImage",
                target: { tabId: tab.id }
            });

            const largestImgSrc = result[0].result;
            consoleLog("largestImgSrc: " + largestImgSrc);

            WebPagePropierties.find(p => p.id == "page_image").value = largestImgSrc || '';

            const resultDescription = await chrome.runtime.sendMessage({
                action: "executeScript_findDescription",
                target: { tabId: tab.id },
            });

            consoleLog("Founded description: " + resultDescription[0].result);

            WebPagePropierties.find(p => p.id == "page_description").value = resultDescription[0].result || '';

            const resultExtractPageText = await chrome.runtime.sendMessage({
                action: "executeScript_extractPageText",
                target: { tabId: tab.id },
            });

            if (turndownService == undefined)
                turndownService = createTurndownService();

            let markdown = turndownService.turndown(resultExtractPageText[0].result);

            // Post-processing: Collapse multiple newlines (3+) into max 2
            markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();

            consoleLog("Founded content: " + markdown);

            WebPagePropierties.find(p => p.id == "page_content").value = markdown || '';

            WebPagePropierties.find(p => p.id == "page_content").value = markdown || '';

            const resultScreenshotUrl = await chrome.runtime.sendMessage({
                action: "GET_screenshotUrl"
            });

            WebPagePropierties.find(p => p.id == "page_screenshotUrl").value = resultScreenshotUrl || '';
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

    for (let index = 0; index < filesPropierties.length; index++) {
        if (filesPropierties[index].id === "image_by_url") {
            CreateImageReferenceForChoices(
                GetPagePropiertie("page_image") || "",
                filesPropierties[index].id,
                true
            );
        }
        else if (filesPropierties[index].id === "screenshot") {
            CreateImageReferenceForChoices(
                GetPagePropiertie("page_screenshotUrl") || "",
                filesPropierties[index].id,
                true
            );
        }
    }

    function GetPagePropiertie(propiertie_key) {
        return WebPagePropierties.find(p => p.id == propiertie_key).value;
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
                        .map(line => `${line}`)
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

    //#endregion

    //#region Themes

    function isHexColor(str) {
        return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{8})$/.test(str);
    }

    function populateThemeSelectOptions() {
        elements.themeSelect.innerHTML = '';

        Object.entries(window.ThemeConfig.themes).forEach(([themeName, themeDefinition]) => {
            const option = document.createElement('option');
            option.value = themeName;

            if (themeName === 'dark') {
                option.textContent = Localize('Dark', state.language);
            } else if (themeName === 'light') {
                option.textContent = Localize('Light', state.language);
            }
            else {
                option.textContent = themeDefinition.label;
            }

            elements.themeSelect.appendChild(option);
        });
    }

    function ChangeTheme() {
        const linkCSS = document.documentElement;
        const themeConfig = window.ThemeConfig.getThemeConfig(state.theme, state.accentColor);

        Object.entries(themeConfig.variables).forEach(([variableName, variableValue]) => {
            linkCSS.style.setProperty(variableName, variableValue);
        });

        elements.colorInput.jscolor.fromString(themeConfig.accentColor);

        elements.zoomRangeValue.value = state.zoom;
        elements.zoomContainer.style.zoom = state.zoom;
        elements.zoomCurrentRange.textContent = state.zoom;

        elements.heightRangeValue.value = state.height;
        elements.heightCurrentRange.textContent = state.height;

        elements.widthRangeValue.value = state.width;
        elements.widthCurrentRange.textContent = state.width;
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

    //#region load and save data

    // Load saved state
    async function loadState() {
        const saved = await chrome.storage.local.get(
            ['apiKey', 'selectedSpaceId', 'theme', 'language', 'accentColor',
                'whatDoOnStart', 'LastUsedForm', 'zoom', 'height', 'width',
                'collapseOnOpenForm', 'forms']
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

        if (saved.height) {
            state.height = saved.height;
        }
        else {
            state.height = 70;
        }

        if (saved.width) {
            state.width = saved.width;
        }
        else {
            state.width = 24;
        }

        if (saved.collapseOnOpenForm) {
            state.collapseOnOpenForm = saved.collapseOnOpenForm;
        }
        else {
            state.collapseOnOpenForm = "false";
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
            zoom: state.zoom,
            height: state.height,
            width: state.width,
            collapseOnOpenForm: state.collapseOnOpenForm,
            forms: state.forms
        });

        consoleLog("state saved");
    }

    //#endregion

    //#region settings

    elements.collapseInputSettings.addEventListener('input', () => {
        state.collapseOnOpenForm = elements.collapseInputSettings.checked.toString();

        saveState();

        ChangeTheme();
    });

    elements.zoomRangeValue.addEventListener('input', () => {
        elements.zoomCurrentRange.textContent = elements.zoomRangeValue.value;

        state.zoom = elements.zoomRangeValue.value;

        saveState();

        ChangeTheme();
    });

    elements.heightRangeValue.addEventListener('input', () => {
        elements.heightCurrentRange.textContent = elements.heightRangeValue.value;

        state.height = elements.heightRangeValue.value;

        saveState();

        ChangeTheme();
    });

    elements.widthRangeValue.addEventListener('input', () => {
        elements.widthCurrentRange.textContent = elements.widthRangeValue.value;

        state.width = elements.widthRangeValue.value;

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
            populateThemeSelectOptions();

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

            languageSelectChoices = GenerateChoicesWithIcons(elements.languageSelect, choicesData);
        }

        languageSelectChoices.setChoiceByValue(state.language);

        elements.collapseInputSettings.checked = state.collapseOnOpenForm === "true";
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
                const fileNameFormatObj = document.getElementById(obj?.AnytypeProperty.key + "_file_name_format");
                const needToAddFileNameFormat = fileNameFormatObj && obj?.AnytypeProperty.format === "files";

                propertiesList.push(
                    {
                        AnytypeProperty: obj?.AnytypeProperty,
                        SelectedValueByUser: obj?.choice?.getValue(true),
                        ...(needToAddFileNameFormat ? { FileNameFormat: fileNameFormatObj.value } : {})
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
            console.error(error);
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

                    AllSpaces = spaces;

                    const choicesData = spaces.map(space => {
                        return {
                            value: space.id,
                            label: space.name || space.title || space.id || Localize('UntitledSpace', state.language),
                            customProperties: {
                                img: space?.icon?.file || space?.icon?.emoji
                            }
                        };
                    });

                    spaceSelectChoices = GenerateChoicesWithIcons(document.getElementById("spaceSelect"), choicesData, {
                        removeItemButton: false,
                        searchEnabled: true,
                        shouldSort: false
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

                    typeSelectChoices = new Choices(document.getElementById("typeSelect"), {
                        removeItemButton: false,
                        searchEnabled: true,
                        shouldSort: false,
                        choices: choicesData
                    });

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

                    const choicesData = sortedTypes.map(type => {
                        const typeKey = type.key || type.type_key || type.id;
                        const typeName = type.name || type.title || typeKey;

                        return {
                            value: typeKey,
                            label: typeName,
                            customProperties: {
                                img: type?.icon?.file || type?.icon?.emoji
                            }
                        };
                    });

                    typeSelectChoices = GenerateChoicesWithIcons(document.getElementById("typeSelect"), choicesData, {
                        removeItemButton: false,
                        searchEnabled: true,
                        shouldSort: false
                    });

                    selectedType = sortedTypes[0];

                    SetNameForForm();
                }

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
        }
    }

    async function loadObjectTemplates(selectedTypeId) {
        try {
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

                    let templatesForObject = []

                    templatesForObject = templatesForObject.concat(typesTemplates.sort((a, b) => {
                        const aKey = a.key || a.type_key || '';
                        const bKey = b.key || b.type_key || '';

                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                        if (aIndex !== -1) return -1;
                        if (bIndex !== -1) return 1;
                        return (a.name || '').localeCompare(b.name || '');
                    }));

                    allTemplatesForObject = templatesForObject;

                    consoleLog("allTemplatesForObject: ", allTemplatesForObject);

                    templatesForObject.forEach(type => {
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

                allObjects.forEach(element => {
                    if (element?.icon)
                        CreateImageReferenceForChoices(element?.icon?.file || element?.icon?.emoji, String(element?.id ?? ""));
                });

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

                if (property.name === "Created by") continue; // we don't need this
                if (property.name === "Creation date") continue; // we don't need this

                let propertyHTML = document.createElement(`div`);
                let choice = null;

                if (property.format === "text" || property.format === "email"
                    || property.format === "number" || property.format === "url"
                    || property.format === "date" || property.format === "checkbox" || property.key === "description"
                    || property.format === "phone") {
                    propertyHTML.innerHTML = `
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG(property.format) + `
                                    <div class="section-title">` + property.name + `</div>
                                </div>
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

                    const choicesData = allObjects.map(o => {
                        return {
                            value: o.id,
                            label: o.name || o.title || o.id,
                            customProperties: {
                                img: o?.icon?.file || o?.icon?.emoji
                            }
                        };
                    });

                    propertyHTML.innerHTML = `
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG(property.format) + `
                                    <div class="section-title">` + property.name + `</div>
                                </div>
                                <div class="form-group">
                                    <select id="` + property.key + `">
                                    </select>
                                </div>
                            `;

                    elements.propertiesListHandler.appendChild(propertyHTML);
                    propertiesListSpawned.push(propertyHTML);

                    choice = GenerateChoicesWithIcons(document.getElementById(property.key), choicesData, {
                        removeItemButton: false,
                        searchEnabled: true,
                        shouldSort: false
                    });
                }
                else if (property.format === "select" || property.format === "multi_select") {
                    const tags = await loadPropertieTags(property.id);

                    propertyHTML.innerHTML = `
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG(property.format) + `
                                    <div class="section-title">` + property.name + `</div>
                                </div>
                                <div class="form-group">
                                    <select id="` + property.key + `" ` + (property.format === "multi_select" ? `multiple` : ``) + `>
                                        ${tags.map(o => `
                                            <option value="${o.id}">${o.name || o.id}</option>
                                            `).join("")}
                                    </select>
                                </div>
                            `;
                }
                else if (property.format === "files") {
                    propertyHTML.innerHTML = `
                        <div class="file-selector-group">
                            <div class="poperty-head">
                                ` + GetPropertyIconSVG(property.format) + `
                                <div class="section-title">` + property.name + `</div>
                            </div>
                            <div class="form-group">
                                <select id="` + property.key + `">
                                    ${filesPropierties.map(o => `
                                        <option value="${o.id}">${Localize(o.nameKey, state.language) || o.id}</option>
                                        `).join("")}
                                </select>
                            </div>
                            <div class="poperty-head">
                                ` + GetPropertyIconSVG("editable") + `
                                <div class="section-title-with-tooltip">` + Localize("FileNameFormat", state.language) + `
                                    <div id="fileNameTipButton" class="btn-file-name-top-tip">
                                        ?
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <input
                                    type="text"
                                    id="` + property.key + `_file_name_format"
                                    name="` + property.key + `_file_name_format"
                                    placeholder="` + Localize("FileNameFormatPlaceholder", state.language) + `"
                                    value="<date>-<tab_title>"
                                    required
                                    minlength="1"
                                    maxlength="60"
                                    size="10" />
                            </div>
                        </div>
                    `;
                }

                if (property.format != "objects") {
                    elements.propertiesListHandler.appendChild(propertyHTML);
                    propertiesListSpawned.push(propertyHTML);

                    if (property.format === "files") {
                        attachFileNameFormatInputGuard(property.key + "_file_name_format");
                    }

                    choice = new Choices(document.getElementById(property.key), {
                        removeItemButton:
                            property.format === "files" ? false : true,
                        searchEnabled:
                            (property.format === "select" || property.format === "multi_select") ? true : false,
                        shouldSort:
                            false,
                    });
                }

                document.querySelectorAll('[id="fileNameTipButton"]').forEach((element) => {
                    attachTooltip(element, "FileNameTooltip", 200);
                });

                propertiesListForSaving.push(
                    { AnytypeProperty: property, choice: choice }
                );

                if (property.id === "nameId") {
                    choice.setChoiceByValue("tab_title");
                }
                else if (property.format === "url" || property.key.toLowerCase() === "url" || property.name.toLowerCase() === "url"
                    || property.key.toLowerCase() === "page_url" || property.name.toLowerCase() === "page_url") {
                    choice.setChoiceByValue("page_url");
                }
                else if (property.format === "files") {
                    choice.setChoiceByValue("none_file");
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

            if (form == null || form == undefined || !form) {
                showStatus(`Failed to load form with index ${index}`, "error");
                continue;
            }

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
                        const formsById = new Map(
                            state.forms
                                .filter(form => form && form.formId !== undefined && form.formId !== null)
                                .map(form => [String(form.formId), form])
                        );

                        for (let index = 0; index < formObjects.length; index++) {
                            const formObj = formObjects[index];

                            const formId = formObj.id.replace('formObject', '');
                            const form = formsById.get(String(formId));

                            if (form) {
                                newFormsOrder.push(form);
                            }
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
            elements.propertiesSaveObjectListWithDefaultValueHandlerContent.innerHTML = '';

            currentForm = form;
            propertiesListForSaving = [];

            const initializeChoicesWithColor = (selectElement, needToDisableChoice,
                useDeleteButtonInChoices = true, searchEnabled = true) => {

                const choice = new Choices(selectElement, {
                    removeItemButton: useDeleteButtonInChoices,
                    searchEnabled: searchEnabled,
                    shouldSort: false,
                });

                const applyColorToChoices = () => {
                    const items = selectElement.parentElement.parentElement.querySelectorAll('.choices__item');
                    items.forEach(item => {
                        const value = item.getAttribute('data-value');
                        const option = selectElement.querySelector(`option[value="${value}"]`);
                        if (option) {
                            const color = normalizeColor(option.getAttribute('prefered-color'));
                            if (color) {
                                if (item.hasAttribute('data-choice')) {
                                    let colorDot = item.querySelector('.choice-color-dot');
                                    if (!colorDot) {
                                        colorDot = document.createElement('span');
                                        colorDot.className = 'choice-color-dot';
                                        item.insertBefore(colorDot, item.firstChild);
                                    }
                                    colorDot.style.backgroundColor = color;
                                }
                                else {
                                    item.style.backgroundColor = color;
                                }
                            }
                        }
                    });
                };

                applyColorToChoices();

                const observer = new MutationObserver(applyColorToChoices);
                observer.observe(selectElement.parentElement, {
                    childList: true,
                    subtree: true
                });

                if (needToDisableChoice)
                    choice.removeActiveItems();

                return choice;
            };

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
                    let useDeleteButtonInChoices = true;
                    let searchEnabled = true;

                    const savedProperty = form.properties.find(p => p.AnytypeProperty.id === property.id);
                    const savedPropertyValueExist = savedProperty !== null && savedProperty !== undefined
                        && savedProperty.SelectedValueByUser !== null && savedProperty.SelectedValueByUser !== "null"
                        && savedProperty.SelectedValueByUser !== undefined && savedProperty.SelectedValueByUser.length > 0;

                    const savedPropertyFileFormatNameExist = savedProperty !== null && savedProperty !== undefined
                        && savedProperty.FileNameFormat !== null && savedProperty.FileNameFormat !== "null"
                        && savedProperty.FileNameFormat !== undefined && savedProperty.FileNameFormat.length > 0;

                    consoleLog('Found saved property: ', savedProperty);

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
                                    ` + (property.format != "checkbox" ? '<div class="poperty-head">' : "") + `
                                        ` + GetPropertyIconSVG(property.format) + `
                                        <div class="section-title">` + property.name + `</div>
                                    ` + (property.format != "checkbox" ? '</div>' : "") + `
                                    <div class="form-group ` + (property.format === "checkbox" ? "checkbox-rect" : "") + `">
                                        <` + (printTextarea ? "textarea " : "input") + ` 
                                            id="` + property.id + `_SO" 
                                            type="` + (property.format !== "phone" ? property.format : "tel") + `" 
                                            placeholder="` + property.name + `" `
                            + (savedPropertyValueExist && !printTextarea ? (`value="` + value + `" `) : (` `)) + `
                                        >` + (printTextarea ? (savedPropertyValueExist ? (value + "</textarea>") : "</textarea>") : "") + `
                                    ` + (property.format === "checkbox" ? getCheckboxElement(property.id + "_SO") : "") + `    
                                    </div>
                                `;
                    }
                    else if (property.format === "objects") {
                        needToCreateChoices = true;

                        await loadAllObjects();

                        propertyHTML.innerHTML = `
                                    <div class="poperty-head">
                                        ` + GetPropertyIconSVG(property.format) + `
                                        <div class="section-title">` + property.name + `</div>
                                    </div>
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
                        consoleLog(property.name + ' - variants: ', tags);

                        propertyHTML.innerHTML = `
                                    <div class="poperty-head">
                                        ` + GetPropertyIconSVG(property.format) + `
                                        <div class="section-title">` + property.name + `</div>
                                    </div>
                                    <div class="form-group">
                                        <select id="` + property.id + `_SO" ` + (property.format === "multi_select" ? `multiple` : ``) + `>
                                            ${tags.map(o => `
                                                <option 
                                                    value="${o.id}" 
                                                    prefered-color="${o.color || ''}"
                                                    ` + ((savedPropertyValueExist && savedProperty.SelectedValueByUser.includes(o.id)) ? "selected" : "") + `
                                                >
                                                    ${o.name || o.id}
                                                </option>
                                                `).join("")}
                                        </select>
                                    </div>
                                `;
                    }
                    else if (property.format === "files") {
                        needToCreateChoices = true;
                        useDeleteButtonInChoices = false;
                        searchEnabled = false;

                        // TODO: здесь добавляем предпоказ картинки
                        propertyHTML.innerHTML = `
                            <div class="file-selector-group">
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG(property.format) + `
                                    <div class="section-title">` + property.name + `</div>
                                </div>
                                <div class="form-group">
                                    <select id="` + property.id + `_SO">
                                        ${filesPropierties.map(o => `
                                            <option 
                                                value="${o.id}"
                                                ` + ((savedPropertyValueExist && savedProperty.SelectedValueByUser.includes(o.id)) ? "selected" : "") + `
                                            >
                                                ${Localize(o.nameKey, state.language) || o.id}
                                            </option>
                                            `).join("")}
                                    </select>
                                </div>
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG("editable") + `
                                    <div class="section-title-with-tooltip">` + Localize("FileNameFormat", state.language) + `
                                        <div id="fileNameTipButton" class="btn-file-name-top-tip">
                                            ?
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <input
                                        type="text"
                                        id="` + property.key + `_file_name_format_SO"
                                        name="` + property.key + `_file_name_format_SO"
                                        placeholder="` + Localize("FileNameFormatPlaceholder", state.language) + `"
                                        value="` + ReplaceDataInFileName(savedPropertyFileFormatNameExist ? savedProperty.FileNameFormat : "<date>-<tab_title>") + `"
                                        required
                                        minlength="1"
                                        maxlength="60"
                                        size="10" />
                                </div>
                            </div>
                        `;
                    }

                    if (property.format === "checkbox") {
                        propertyHTML.classList.add("poperty-head");
                        propertyHTML.classList.add("margin-bottom15");
                    }

                    if ((savedPropertyValueExist && property.id !== "nameId" && property.format !== "files") || (property.format === "files" && savedProperty.SelectedValueByUser !== "none_file"))
                        propertiesForPrintWithDefaultValue.push({ needToCreateChoices: needToCreateChoices, useDeleteButtonInChoices: useDeleteButtonInChoices, searchEnabled: searchEnabled, needToDisableChoice: !savedPropertyValueExist, propertyHTML: propertyHTML, propertyId: property.id, propertyKey: property.key, value_type: property.format });
                    else
                        propertiesForPrintWithoutDefaultValue.push({ needToCreateChoices: needToCreateChoices, useDeleteButtonInChoices: useDeleteButtonInChoices, searchEnabled: searchEnabled, needToDisableChoice: !savedPropertyValueExist, propertyHTML: propertyHTML, propertyId: property.id, propertyKey: property.key, value_type: property.format });
                }

                await loadCollections();

                if (allCollections != null && allCollections != undefined && allCollections.length > 0) {
                    let propertyHTML = document.createElement(`div`);

                    const savedCollectionExist = form.collectionId !== null && form.collectionId !== undefined;

                    propertyHTML.innerHTML = `
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG("collection") + `
                                    <div class="section-title">` + Localize("SelectCollection", state.language) + `</div>
                                </div>
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
                                <div class="poperty-head">
                                    ` + GetPropertyIconSVG("template") + `
                                    <div class="section-title">` + Localize("SelectObjectTemplate", state.language) + `</div>
                                </div>
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

                const appendPrintedProperty = (propertieForPrint, targetElement) => {
                    targetElement.appendChild(propertieForPrint.propertyHTML);

                    propertiesListForSaving.push({
                        KeyForAnytypeAPI: propertieForPrint.propertyKey,
                        IdInHTML: propertieForPrint.propertyId + "_SO",
                        value_type: propertieForPrint.value_type
                    });

                    if (propertieForPrint.value_type === "files") {
                        attachFileNameFormatInputGuard(propertieForPrint.propertyKey + "_file_name_format_SO");
                    }

                    // HERE
                    if (propertieForPrint.needToCreateChoices) {
                        if (propertieForPrint.value_type === "files") {
                            const choicesInstance = new Choices(document.getElementById(propertieForPrint.propertyId + "_SO"), {
                                removeItemButton: propertieForPrint.useDeleteButtonInChoices,
                                searchEnabled: propertieForPrint.searchEnabled,
                                shouldSort: false
                            });
                        }
                        else {
                            initializeChoicesWithColor(
                                document.getElementById(propertieForPrint.propertyId + "_SO"),
                                propertieForPrint.needToDisableChoice,
                                propertieForPrint.useDeleteButtonInChoices,
                                propertieForPrint.searchEnabled
                            );
                        }
                    }
                };

                for (let index = 0; index < propertiesForPrintWithoutDefaultValue.length; index++) {
                    const propertieForPrint = propertiesForPrintWithoutDefaultValue[index];

                    appendPrintedProperty(propertieForPrint, elements.propertiesSaveObjectListWithoutDefaultValueHandler);
                }

                for (let index = 0; index < propertiesForPrintWithDefaultValue.length; index++) {
                    const propertieForPrint = propertiesForPrintWithDefaultValue[index];

                    appendPrintedProperty(propertieForPrint, elements.propertiesSaveObjectListWithDefaultValueHandlerContent);
                }

                document.querySelectorAll('[id="fileNameTipButton"]').forEach((element) => {
                    attachTooltip(element, "FileNameTooltip", 200);
                });

                elements.propertiesSaveObjectListWithDefaultValueHandlerToggleText.textContent = Localize("FilledProperties", state.language);

                if (state.collapseOnOpenForm == "true") {
                    if (!elements.propertiesSaveObjectListWithDefaultValueHandler.classList.contains('collapsed'))
                        elements.propertiesSaveObjectListWithDefaultValueHandler.classList.add('collapsed');

                    elements.propertiesSaveObjectListWithDefaultValueHandlerToggleSign.textContent = "▼";
                }
                else {
                    if (elements.propertiesSaveObjectListWithDefaultValueHandler.classList.contains('collapsed'))
                        elements.propertiesSaveObjectListWithDefaultValueHandler.classList.remove('collapsed');

                    elements.propertiesSaveObjectListWithDefaultValueHandlerToggleSign.textContent = "▲";
                }

                if (!WasSubscribeToggleCollapsedButton) {
                    WasSubscribeToggleCollapsedButton = true;
                    elements.propertiesSaveObjectListWithDefaultValueHandlerToggle.addEventListener('click', () => {
                        elements.propertiesSaveObjectListWithDefaultValueHandler.classList.toggle('collapsed');

                        if (elements.propertiesSaveObjectListWithDefaultValueHandler.classList.contains('collapsed')) {
                            elements.propertiesSaveObjectListWithDefaultValueHandlerToggleSign.textContent = "▼";
                        } else {
                            elements.propertiesSaveObjectListWithDefaultValueHandlerToggleSign.textContent = "▲";
                        }
                    });
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
        consoleLog("properties List For Saving: ", propertiesListForSaving);

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
                    && propiertyPrinted.value_type !== "files"
                ) {
                    let value = null;

                    if (propiertyPrinted.value_type === "checkbox")
                        value = document.getElementById(propiertyPrinted.IdInHTML).checked;
                    else if (propiertyPrinted.value_type === "multi_select" || propiertyPrinted.value_type === "objects")
                        value = Array.from(document.getElementById(propiertyPrinted.IdInHTML).options).filter(opt => opt.selected).map(opt => opt.value);
                    else
                        value = document.getElementById(propiertyPrinted.IdInHTML).value;

                    if (value !== null && value !== undefined && value !== "")
                        properties_final_list.push({ key: propiertyPrinted.KeyForAnytypeAPI, [propiertyPrinted.value_type]: value });
                }
                else if (propiertyPrinted.value_type === "files") {
                    let selectedFileType = document.getElementById(propiertyPrinted.IdInHTML).value;

                    if (selectedFileType != "none_file") {
                        consoleLog("selected File Type: ", selectedFileType);

                        const fileName = ReplaceDataInFileName(document.getElementById(propiertyPrinted.KeyForAnytypeAPI + "_file_name_format_SO").value);

                        consoleLog("file name: ", fileName);

                        const selectedFilePropiertie = filesPropierties.find(p => p.id === selectedFileType);

                        if (selectedFilePropiertie?.function) {
                            const responce = await selectedFilePropiertie.function(fileName);
                            consoleLog("file function responce: ", responce);
                            console.error("ТУТ НАДО ЭТОТ ОТВЕТ ПРОКИНУТЬ В НУЖНОЕ СВОЙСТВО");
                            console.error(responce);
                            /*
                            properties_final_list.push(
                                { key: propiertyPrinted.KeyForAnytypeAPI, 
                                    [propiertyPrinted.value_type]: responce 
                                });
                            */
                        }
                    }
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

            consoleLog("properties_final_list: ", properties_final_list);
            consoleLog("objectName: ", objectName);
            consoleLog("objectBody: ", objectBody);
            consoleLog("ObjectCollectionId: ", ObjectCollectionId);
            consoleLog("ObjectTemplateId: ", ObjectTemplateId);

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

    function attachTooltip(element, textKey, xOffset = 10) {
        if (!element || element.dataset.tooltipAttached === 'true') return;

        element.dataset.tooltipAttached = 'true';

        let tooltip = null;

        element.addEventListener("mouseenter", () => {
            tooltip = document.createElement("div");
            tooltip.className = "custom-tooltip";
            tooltip.innerText = Localize(textKey, state.language);
            document.body.appendChild(tooltip);

            const updatePosition = (e) => {
                tooltip.style.left = (e.clientX - xOffset) + "px";
                tooltip.style.top = (e.clientY + 30) + "px";
            };

            element._tooltipMoveHandler = updatePosition;

            element.addEventListener("mousemove", updatePosition);
            setTimeout(() => {
                if (tooltip) {
                    tooltip.style.opacity = "1"
                }
            }, 10);
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

};