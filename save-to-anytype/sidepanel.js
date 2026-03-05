chrome.tabs.onActivated.addListener(() => {
    window.location.reload();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
        window.location.reload();
    }
});