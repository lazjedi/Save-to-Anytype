// Content script entry: messages from the background script.
// Loaded after overlay.js and element-selector.js (see manifest.json)

(() => {
    const ns = (globalThis.__saveToAnytype ??= {});
    if (ns.messageListenerAdded) return; // already injected
    ns.messageListenerAdded = true;

    // All responses are synchronous, so the message channel doesn't need to stay open
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
            case "getSelection":
                sendResponse({ selectedText: window.getSelection().toString().trim() });
                break;

            case "TOGGLE_OVERLAY":
                ns.overlay.toggle();
                sendResponse({ success: true });
                break;

            case "OPEN_OVERLAY":
                ns.overlay.open();
                sendResponse({ success: true });
                break;

            case "START_PAGE_ELEMENT_SELECTION":
                ns.elementSelector.start(request.localization);
                sendResponse({ started: true });
                break;

            case "GET_ELEMENT_BY_CLASS_NAME":
                try {
                    sendResponse({ success: true, data: ns.elementSelector.getElementText(request.classNameAndDom) });
                } catch (error) {
                    sendResponse({ success: false, error: String(error?.message || error) });
                }
                break;
        }
    });
})();
