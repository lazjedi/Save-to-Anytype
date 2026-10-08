// Elements of popup.html. Module scripts run after the document is parsed, so they all exist here
const byId = (id) => document.getElementById(id);

export const elements = {
    status: byId('status'),
    zoomContainer: byId('zoomContainer'),

    // sections
    authSection: byId('authSection'),
    mainSection: byId('mainSection'),
    createFormSection: byId('createFormSection'),
    settingsSection: byId('settingsSection'),
    confirmDeleteFormSection: byId('confirmDeleteFormSection'),
    saveObjectSection: byId('saveObjectSection'),
    objectSavedSection: byId('objectSavedSection'),
    blockedSection: byId('blockedSection'),
    loadingSection: byId('loadingSection'),

    // navigation
    settingsButton: byId('settingsButton'),
    closeSectionButtons: [byId('mainSectionButton'), byId('mainSectionButton2'), byId('mainSectionButton3'), byId('mainSectionButton4')],

    // auth
    appNameInput: byId('appNameInput'),
    startChallengeBtn: byId('startChallengeBtn'),
    codeSection: byId('codeSection'),
    codeInput: byId('codeInput'),
    verifyCodeBtn: byId('verifyCodeBtn'),
    apiKeyInput: byId('apiKeyInput'),
    connectBtn: byId('connectBtn'),
    disconnectBtn: byId('disconnectBtn'),
    loadingDisconnectGroup: byId('loadingDisconnectGroup'),
    loadingDisconnectBtn: byId('loadingDisconnectBtn'),

    // main section
    handlerForLoadedForms: byId('handlerForLoadedForms'),
    createFormButton: byId('createFormButton'),
    deleteFormBtn: byId('deleteFormBtn'),

    // form editor
    createFormTipButton: byId('createFormTipButton'),
    spaceSelect: byId('spaceSelect'),
    typeSection: byId('typeSection'),
    typeSelect: byId('typeSelect'),
    FormNameInputSection: byId('FormNameInputSection'),
    FormNameInput: byId('FormNameInput'),
    collectionSection: byId('collectionSection'),
    collectionsList: byId('collectionsList'),
    objectTemplateSection: byId('objectTemplateSection'),
    objectTemplateSectionSelect: byId('objectTemplateSectionSelect'),
    propertiesSection: byId('propertiesSection'),
    propertiesListHandler: byId('propertiesListHandler'),
    saveFormBtn: byId('saveFormBtn'),

    // save object
    objectNameToSave: byId('objectNameToSave'),
    propertiesWithoutDefaultValue: byId('propertiesSaveObjectListWithoutDefaultValueHandler'),
    propertiesWithDefaultValue: byId('propertiesSaveObjectListWithDefaultValueHandler'),
    propertiesWithDefaultValueContent: byId('propertiesSaveObjectListWithDefaultValueHandlerContent'),
    propertiesWithDefaultValueToggle: byId('propertiesSaveObjectListWithDefaultValueHandlerToggle'),
    propertiesWithDefaultValueToggleText: byId('propertiesSaveObjectListWithDefaultValueHandlerToggleText'),
    propertiesWithDefaultValueToggleSign: byId('propertiesSaveObjectListWithDefaultValueHandlerToggleSign'),
    saveObjectBtn: byId('saveObjectBtn'),
    OpenInAnytypeBtn: byId('OpenInAnytypeBtn'),

    // blocked
    blockedSectionText: byId('blockedSectionText'),
    OpenAnytypeBtn: byId('OpenAnytypeBtn'),

    // settings
    languageSelect: byId('languageSelect'),
    themeSelect: byId('themeSelect'),
    whatDoOnStartSelect: byId('whatDoOnStartSelect'),
    colorInput: byId('colorInput'),
    collapseInputSettings: byId('collapseInputSettings'),
    zoomRangeValue: byId('zoomRangeValue'),
    zoomCurrentRange: byId('zoomCurrentRange'),
    heightRangeValue: byId('heightRangeValue'),
    heightCurrentRange: byId('heightCurrentRange'),
    widthRangeValue: byId('widthRangeValue'),
    widthCurrentRange: byId('widthCurrentRange'),
    textAreaHeightRangeValue: byId('textAreaHeightRangeValue'),
    textAreaHeightCurrentRange: byId('textAreaHeightCurrentRange'),
    stringsRemovedFromTabTitleInput: byId('stringsRemovedFromTabTitleInput'),
    stringsRemovedFromTabTitleTipButton: byId('stringsRemovedFromTabTitleTipButton'),
    openGitHubBtn: byId('openGitHubBtn'),
    SaveToAnytypeVersion: byId('SaveToAnytypeVersion')
};

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Everything that comes from Anytype or from the page must be escaped before it is put into HTML
export function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

export function createElementFromHtml(html) {
    const element = document.createElement('div');
    element.innerHTML = html;
    return element;
}

export function setHidden(element, hidden) {
    element.classList.toggle('hidden', hidden);
}

// Button with a spinner while an async action is running; the original content (with its locale keys) is restored after
export async function runWithBusyButton(button, busyText, action) {
    const idleHtml = button.innerHTML;
    button.innerHTML = `<span class="loading"></span> ${escapeHtml(busyText)}`;
    button.disabled = true;

    try {
        return await action();
    } finally {
        button.innerHTML = idleHtml;
        button.disabled = false;
    }
}

export function openExternal(url) {
    window.open(url, '_blank');
}
