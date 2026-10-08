// The popup shows one section at a time
import { elements, setHidden } from '../core/dom.js';
import { consoleLog } from '../core/logger.js';
import { t } from '../core/i18n.js';

export const SECTIONS = Object.freeze({
    auth: 'authSection',
    main: 'mainSection',
    createForm: 'createFormSection',
    settings: 'settingsSection',
    confirmDeleteForm: 'confirmDeleteFormSection',
    saveObject: 'saveObjectSection',
    objectSaved: 'objectSavedSection',
    blocked: 'blockedSection',
    loading: 'loadingSection'
});

let currentSection = null;

export function getCurrentSection() {
    return currentSection;
}

export function showSection(sectionId) {
    consoleLog('show section: ' + sectionId);
    currentSection = sectionId;

    for (const id of Object.values(SECTIONS)) {
        setHidden(elements[id], id !== sectionId);
    }
}

export function showLoadingSection() {
    setHidden(elements.loadingDisconnectGroup, true);
    showSection(SECTIONS.loading);
}

// pageRejected: the extension can't work on this page, otherwise Anytype isn't running
export function showBlockedSection(pageRejected) {
    elements.blockedSectionText.innerText = t(pageRejected ? "blockedSectionURLRejected" : "blockedSectionAnytypeNotRunning");
    setHidden(elements.OpenAnytypeBtn, pageRejected);
    showSection(SECTIONS.blocked);
}
