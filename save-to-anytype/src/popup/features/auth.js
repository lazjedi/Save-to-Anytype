// Connecting to Anytype: challenge (4-digit code) or API key; checking the saved key on start
import { elements, runWithBusyButton, setHidden } from '../core/dom.js';
import { state, saveState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { consoleError } from '../core/logger.js';
import { anytypeApi, isConnectionError } from '../api/anytype-api.js';
import { showSection, showBlockedSection, SECTIONS } from '../ui/sections.js';
import { showStatus } from '../ui/status.js';
import { showMainSection } from './forms-list.js';

// A key approved for selected spaces only, /v1 rejects such keys
const SCOPED_KEY_ERROR_CODE = "v1_not_available_for_scoped_keys";

export function initAuth() {
    initAuthTabs();

    elements.connectBtn.addEventListener('click', connectWithApiKey);
    elements.startChallengeBtn.addEventListener('click', startChallenge);
    elements.verifyCodeBtn.addEventListener('click', verifyChallengeCode);
    elements.disconnectBtn.addEventListener('click', disconnectAnytype);
    elements.loadingDisconnectBtn.addEventListener('click', disconnectAnytype);
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('#authSection .tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(otherTab => otherTab.classList.toggle('active', otherTab === tab));

            document.querySelectorAll('#authSection .tab-content').forEach(content => {
                content.classList.toggle('active', content.id === `${tab.dataset.tab}Tab`);
            });
        });
    });
}

async function onConnected(apiKey) {
    state.apiKey = apiKey;
    await saveState();

    showStatus(t('SuccessfullyConnected'), 'success');
    showMainSection();
}

async function connectWithApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus(t('PleaseEnterYourAPIKey'), 'error');
        return;
    }

    await runWithBusyButton(elements.connectBtn, t('Connecting'), async () => {
        try {
            // Test the key
            await anytypeApi.listSpaces(apiKey);
            await onConnected(apiKey);
        } catch (error) {
            consoleError('API Key test failed:', error);

            if (error.code === SCOPED_KEY_ERROR_CODE)
                showStatus(t('ScopedKeyNotSupported'), 'error');
            else if (isConnectionError(error))
                showStatus(t('ConnectionError') + error.message, 'error');
            else
                showStatus(t('InvalidAPIKey') + error.status, 'error');
        }
    });
}

async function startChallenge() {
    const appName = elements.appNameInput.value.trim() || 'Save To Anytype';

    await runWithBusyButton(elements.startChallengeBtn, t('ChallengeIsStarting'), async () => {
        try {
            state.challengeId = await anytypeApi.createChallenge(appName);

            setHidden(elements.codeSection, false);
            showStatus(t('Enter4digit'), 'info');
            elements.codeInput.focus();
        } catch (error) {
            consoleError('Challenge could not be started:', error);
            showStatus(isConnectionError(error) ? t('ConnectionError') + error.message : t('ChallengeCouldNotBeStarted'), 'error');
        }
    });
}

async function verifyChallengeCode() {
    const code = elements.codeInput.value.trim();

    if (!/^\d{4}$/.test(code)) {
        showStatus(t('Enter4digit'), 'error');
        return;
    }

    await runWithBusyButton(elements.verifyCodeBtn, t('Verifying'), async () => {
        try {
            const apiKey = await anytypeApi.createApiKey(state.challengeId, code);
            if (!apiKey) throw new Error('No api_key in the response');

            await onConnected(apiKey);
        } catch (error) {
            consoleError('Code could not be verified:', error);
            showStatus(isConnectionError(error) ? t('ConnectionError') + error.message : t('CodeCouldNotBeVerified'), 'error');
        }
    });
}

export async function disconnectAnytype() {
    state.apiKey = null;
    state.challengeId = null;
    // selectedSpaceId is not used anymore, removed for old installs
    await chrome.storage.local.remove(['apiKey', 'selectedSpaceId']);

    elements.apiKeyInput.value = '';
    elements.codeInput.value = '';
    setHidden(elements.codeSection, true);
    showSection(SECTIONS.auth);

    showStatus(t('ConnectionLost'), 'info');
}

// Checks the saved API key on start. The request starts at once, the result is applied later (when the page data is ready)
export function startConnectionCheck() {
    return anytypeApi.listSpaces().then(spaces => ({ spaces }), error => ({ error }));
}

// Shows the main section, or explains what is wrong with the connection
export async function applyConnectionCheck({ spaces, error }) {
    if (!error) {
        showMainSection();

        if (spaces.length === 0)
            showStatus(t('NoSpaceFound'), 'error');
        return;
    }

    consoleError('Space load error:', error);

    if (error.code === SCOPED_KEY_ERROR_CODE) {
        await disconnectAnytype();
        showStatus(t('ScopedKeyNotSupported'), 'error');
    }
    else if (isConnectionError(error)) {
        showStatus(t('SpaceListCouldntBeLoaded') + error.message, 'error');
        showBlockedSection(false);
    }
    else {
        // The saved key doesn't work (revoked, invalid...) - let the user disconnect right from the loading screen
        setHidden(elements.loadingDisconnectGroup, false);
        showStatus(t('SpaceListCouldntBeLoaded') + error.status, 'error');
    }
}
