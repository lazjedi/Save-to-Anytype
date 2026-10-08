// In the side panel the popup must follow the active tab, so it is reloaded when the tab changes.
// The overlay is an iframe inside one tab - it must not reload (the user would lose what was typed);
// popup.html opened as a regular tab would reload itself endlessly
async function isSidePanel() {
    if (window.top !== window) return false;

    const ownTab = await chrome.tabs.getCurrent();
    return !ownTab;
}

isSidePanel().then(sidePanel => {
    if (!sidePanel) return;

    chrome.tabs.onActivated.addListener(() => {
        window.location.reload();
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.active) {
            window.location.reload();
        }
    });
});
