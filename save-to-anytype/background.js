let consoleLog = function (messageText, ...argsL) {
    if (argsL !== undefined && argsL.length > 0)
        console.log("[SaveToAnytype] %c[Back]%c " + messageText + " %c[Params]%c", "color: green; font-weight: bold;", "", "color: blue; font-weight: bold;", "", argsL);
    else
        console.log("[SaveToAnytype] %c[Back]%c " + messageText, "color: green; font-weight: bold;", "");
}

let consoleError = function (messageText, ...argsL) {
    if (argsL !== undefined && argsL.length > 0)
        console.error("[SaveToAnytype] %c[Back]%c " + messageText + " %c[Params]%c", "color: green; font-weight: bold;", "", "color: blue; font-weight: bold;", "", argsL);
    else
        console.error("[SaveToAnytype] %c[Back]%c " + messageText, "color: green; font-weight: bold;", "");
}

consoleLog('Background script loading...');

//#region Work with page data

function findLargestVisibleImage() {
    const imgs = Array.from(document.querySelectorAll("img"));

    const isValidImageSource = (source) => {
        if (!source || typeof source !== "string") return false;
        const normalized = source.trim();
        if (!normalized) return false;

        // Skip obvious non-image and unsupported image formats for this use case.
        if (normalized.startsWith("data:image/svg+xml") || /\.svg([?#].*)?$/i.test(normalized)) return false;
        if (/\.js([?#].*)?$/i.test(normalized)) return false;

        // Accept data image urls and common raster sources.
        if (normalized.startsWith("data:image/")) return true;
        return /\.(png|jpe?g|webp|gif|bmp|avif)([?#].*)?$/i.test(normalized) || /^https?:\/\//i.test(normalized);
    };

    let bestVisibleSource = "";
    let bestVisibleArea = 0;

    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

    imgs.forEach((img) => {
        const imageSource = img.currentSrc || img.src || "";
        if (!isValidImageSource(imageSource)) return;

        // Only use actual loaded image elements.
        if (img.naturalWidth <= 1 || img.naturalHeight <= 1) return;

        const rect = img.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        // Strictly visible on screen: element must intersect viewport.
        const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
        if (visibleWidth <= 0 || visibleHeight <= 0) return;

        const renderedVisibleArea = visibleWidth * visibleHeight;

        const style = window.getComputedStyle(img);
        if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            parseFloat(style.opacity) === 0
        ) return;

        // Verify visibility at the center of visible region (not just element center).
        const visibleCenterX = Math.max(0, Math.min(viewportWidth, Math.max(rect.left, 0) + visibleWidth / 2));
        const visibleCenterY = Math.max(0, Math.min(viewportHeight, Math.max(rect.top, 0) + visibleHeight / 2));
        let topElement = document.elementFromPoint(visibleCenterX, visibleCenterY);

        // Ignore our own overlay when checking if image is occluded.
        if (topElement?.id === "save-to-anytype-overlay" || topElement?.closest?.("#save-to-anytype-overlay")) {
            const overlay = document.getElementById("save-to-anytype-overlay");
            if (overlay) {
                const prevPointerEvents = overlay.style.pointerEvents;
                overlay.style.pointerEvents = "none";
                topElement = document.elementFromPoint(visibleCenterX, visibleCenterY);
                overlay.style.pointerEvents = prevPointerEvents;
            }
        }

        if (topElement && !img.contains(topElement) && topElement !== img) return;

        if (renderedVisibleArea > bestVisibleArea) {
            bestVisibleArea = renderedVisibleArea;
            bestVisibleSource = imageSource;
        }
    });

    return bestVisibleSource || "";
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

function extractPageText() {
    try {
        if (!document || !document.body) {
            throw new Error('Document body not found');
        }

        const getIframeContent = (iframe) => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!iframeDoc || !iframeDoc.body) return '';
                const iframeClone = iframeDoc.body.cloneNode(true);
                iframeClone.querySelectorAll('script, style, nav, footer, aside, .ads, .comments').forEach(el => el.remove());
                return `<div class="iframe-content">${iframeClone.innerHTML}</div>`;
            } catch (e) {
                return '';
            }
        };

        const bodyClone = document.body.cloneNode(true);

        const iframes = document.querySelectorAll('iframe');
        let iframeContents = [];
        iframes.forEach((iframe) => {
            const content = getIframeContent(iframe);
            if (content) iframeContents.push(content);
        });

        const unwanted = bodyClone.querySelectorAll(
            'script, style, nav, footer, aside, .ads, .comments, [role="complementary"], .cookie-banner, .popup, .overlay, .modal, #save-to-anytype-overlay'
        );
        unwanted.forEach(el => el.remove());

        const mainSelectors = ['main', 'article', '.content', '.post', '.entry', '[role="main"]', '#content', '.main'];
        let mainContent = null;

        for (const selector of mainSelectors) {
            const found = bodyClone.querySelector(selector);
            if (found && found.innerHTML.trim().length > 100) {
                mainContent = found;
                break;
            }
        }

        let finalContent = mainContent ? mainContent.innerHTML : bodyClone.innerHTML;

        if (iframeContents.length > 0) {
            finalContent += '<h2>Embedded Content</h2>' + iframeContents.join('<hr>');
        }

        return finalContent;

    } catch (error) {
        return "PAGE PARSE ERROR";
    }
}

async function uploadFile(uploadUrl, file, token, apiVersion) {

    const formData = new FormData();

    formData.append("file", file);

    // You can test the files by simply downloading them
    const testFileDownloading = true;
    if (testFileDownloading) {
        try {
            if (!chrome.downloads || typeof chrome.downloads.download !== "function") {
                const currentPermissions = chrome?.runtime?.getManifest?.()?.permissions || [];
                console.error(
                    '[TEST DOWNLOAD] chrome.downloads API is not available. ' +
                    'Add permission "downloads" to save-to-anytype/manifest.json -> permissions[]. ' +
                    `Current permissions: ${JSON.stringify(currentPermissions)}`
                );
                throw new Error("chrome.downloads API is not available");
            }

            const toDataUrl = async (blob) => {
                if (typeof FileReader !== "undefined") {
                    return await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(reader.error || new Error("FileReader failed"));
                        reader.readAsDataURL(blob);
                    });
                }

                const arrayBuffer = await blob.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i += 1) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);
                const mime = blob.type || "application/octet-stream";
                return `data:${mime};base64,${base64}`;
            };

            const downloadUrl = await toDataUrl(file);
            const downloadFileName = file?.name || "save-to-anytype-test-file.bin";

            console.log(`[TEST DOWNLOAD] Starting test download for file: ${downloadFileName}, size: ${file.size} bytes, type: ${file.type}`);

            await chrome.downloads.download({
                url: downloadUrl,
                filename: downloadFileName,
                saveAs: false,
                conflictAction: "uniquify"
            });

            return {
                success: true,
                testDownload: true,
                fileName: downloadFileName
            };
        } catch (error) {
            throw new Error(`Test file download failed: ${error?.message || error}`);
        }
    }

    const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
            'Accept': 'application/json',
            'Anytype-Version': apiVersion
        },
        body: formData
    });

    if (!response.ok) {

        const errorText =
            await response.text();

        throw new Error(
            `File upload failed: status: ${response.status}, errorText: ${errorText}, uploadUrl: ${uploadUrl}`
        );
    }

    return await response.json();
}

async function uploadImageFromUrl(uploadUrl, imageUrl, token, apiVersion, fileName) {
    consoleLog("Get image from URL: ", imageUrl);
    const response =
        await fetch(imageUrl);

    if (!response.ok) {
        throw new Error(
            "Failed to download image"
        );
    }

    const blob =
        await response.blob();

    const extension =
        blob.type.split("/")[1] || "png";

    const file = new File(
        [blob],
        fileName ? `${fileName}.${extension}` : `image.${extension}`,
        {
            type: blob.type
        }
    );

    return await uploadFile(
        uploadUrl,
        file,
        token,
        apiVersion
    );
}

async function uploadHtmlPage(uploadUrl, pageUrl, token, apiVersion, fileName) {
    const response =
        await fetch(pageUrl);

    if (!response.ok) {
        throw new Error(
            "Failed to download html page"
        );
    }

    const html =
        await response.text();

    const file = new File(
        [html],
        fileName + ".html" || "page.html",
        {
            type: "text/html"
        }
    );

    return await uploadFile(
        uploadUrl,
        file,
        token,
        apiVersion
    );
}

async function uploadScreenshot(uploadUrl, token, apiVersion, fileName, screenshotUrl) {
    const response =
        await fetch(screenshotUrl);

    const blob =
        await response.blob();

    const file = new File(
        [blob],
        fileName + ".png" || "screenshot.png",
        {
            type: "image/png"
        }
    );

    return await uploadFile(
        uploadUrl,
        file,
        token,
        apiVersion
    );
}

//#endregion

// Utility function to get the appropriate browser API
function getAPI() {
    if (typeof chrome !== 'undefined' && chrome.contextMenus) {
        return chrome;
    }
    if (typeof browser !== 'undefined' && browser.contextMenus) {
        return browser;
    }
    consoleError('No browser API available!');
    return null;
}

// Create context menus on installation
function CreateContextMenusButtons(request) {
    consoleLog('CreateContextMenusButtons');

    const api = getAPI();
    if (!api) {
        consoleError('Browser API not available, cannot create context menus');
        return;
    }

    // Remove all existing context menus first
    api.contextMenus.removeAll(function () {
        consoleLog('Old context menus removed');
        consoleLog('request', request);

        // Create page context menu
        api.contextMenus.create({
            id: "save-to-Anytype",
            title: request.menuOption1,
            contexts: ["page", "link"]
        }, function () {
            if (chrome.runtime.lastError) {
                consoleError('Error creating save-to-Anytype menu:', chrome.runtime.lastError.message);
            } else {
                consoleLog('✓ Context menu "save-to-Anytype" created');
            }
        });

        // Create selection context menu
        chrome.contextMenus.create({
            id: "save-selection-to-Anytype",
            title: request.menuOption2,
            contexts: ["selection"]
        }, function () {
            if (chrome.runtime.lastError) {
                consoleError('Error creating save-selection menu:', chrome.runtime.lastError.message);
            } else {
                consoleLog('✓ Context menu "save-selection-to-Anytype" created');
            }
        });
    });
};

// Handle context menu clicks
if (chrome && chrome.contextMenus && chrome.contextMenus.onClicked) {
    chrome.contextMenus.onClicked.addListener(async function (info, tab) {
        consoleLog('Context menu clicked:', info.menuItemId);

        if (info.menuItemId === "save-to-Anytype") {
            // Normal page save - just open popup
            consoleLog('Opening popup for page save');
            try {
                await chrome.tabs.sendMessage(tab.id, { action: "OPEN_OVERLAY" });
            } catch (error) {
                consoleError('Could not open popup:', error);
            }
        }
        else if (info.menuItemId === "save-selection-to-Anytype") {
            // Save selected text
            consoleLog('Saving selected text');
            try {
                // Get selected text from content scriptlet response = null;
                let response = null;
                try {
                    response = await chrome.tabs.sendMessage(tab.id, { action: "getSelection" });
                } catch (err) {
                    consoleError("sendMessage failed — probably no content script on this tab:", err);
                }

                if (response && response.selectedText) {
                    // Save selected text to storage
                    await chrome.storage.local.set({
                        selectedText: response.selectedText,
                        selectedTextTimestamp: Date.now()
                    });
                    consoleLog('Selected text saved to storage');
                }

                // Open popup
                await chrome.tabs.sendMessage(tab.id, { action: "OPEN_OVERLAY" });
            } catch (error) {
                consoleError('Error handling selection:', error);
                // Still try to open popup
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: "OPEN_OVERLAY" });
                } catch (popupError) {
                    consoleError('Could not open popup:', popupError);
                }
            }
        }
    });
} else {
    consoleError('contextMenus API not available');
}

// Message handling for communication between popup and content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.type === "log") {
        if (request.args !== undefined && request.args.length > 0)
            console.log("[SaveToAnytype] %c[Popap]%c " + request.message + " %c[Params]%c", "color: yellow; font-weight: bold;", "", "color: blue; font-weight: bold;", "", request.args);
        else
            console.log("[SaveToAnytype] %c[Popap]%c " + request.message, "color: yellow; font-weight: bold;", "");
    }
    else if (request.type === "error") {
        if (request.args !== undefined && request.args.length > 0)
            console.error("[SaveToAnytype] %c[Popap]%c " + request.message + " %c[Params]%c", "color: yellow; font-weight: bold;", "", "color: blue; font-weight: bold;", "", request.args);
        else
            console.error("[SaveToAnytype] %c[Popap]%c " + request.message, "color: yellow; font-weight: bold;", "");
    }

    if (request.action === "getTabInfo") {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
                consoleLog('Sending tab info:', tabs[0].title);
                sendResponse({
                    title: tabs[0].title,
                    url: tabs[0].url
                });
            }
        });
        return true; // Keep the message channel open for async response
    }

    if (request.action === "CreateContextMenusButtons") {
        consoleLog('Saving to Anytype menu options ', request);
        CreateContextMenusButtons(request);
        return true;
    }

    if (request.action === "GET_TABS") {
        chrome.tabs.query(
            { active: true, currentWindow: true },
            (tabs) => {
                sendResponse(tabs);
            }
        );
        return true;
    }

    if (request.action === "GET_screenshotUrl") {
        sendResponse(screenshotUrl);
        return true;
    }

    if (request.action === "executeScript_findLargestVisibleImage") {
        chrome.scripting.executeScript(
            {
                target: request.target,
                func: findLargestVisibleImage
            },
            (result) => {
                consoleLog(result);
                sendResponse(result);
            }
        );
        return true;
    }

    if (request.action === "executeScript_findDescription") {
        chrome.scripting.executeScript(
            {
                target: request.target,
                func: findDescription
            },
            (result) => {
                consoleLog(result);
                sendResponse(result);
            }
        );
        return true;
    }

    if (request.action === "executeScript_extractPageText") {
        chrome.scripting.executeScript(
            {
                target: request.target,
                func: extractPageText
            },
            (result) => {
                consoleLog(result);
                sendResponse(result);
            }
        );
        return true;
    }

    if (request.action === "executeScript_UploadImageFromUrl") {
        (async () => {
            try {
                const result =
                    await uploadImageFromUrl(
                        request.uploadUrl,
                        request.imageUrl,
                        request.token,
                        request.apiVersion,
                        request.fileName
                    );

                sendResponse({
                    success: true,
                    data: result
                });
            } catch (error) {
                consoleError("executeScript_UploadImageFromUrl failed", error?.message || error);
                sendResponse({
                    success: false,
                    error: String(error?.message || error)
                });
            }
        })();
        return true;
    }

    if (request.action === "executeScript_UploadHtmlFile") {
        (async () => {
            try {
                const result =
                    await uploadHtmlPage(
                        request.uploadUrl,
                        request.pageUrl,
                        request.token,
                        request.apiVersion,
                        request.fileName
                    );

                sendResponse({
                    success: true,
                    data: result
                });
            } catch (error) {
                consoleError("executeScript_UploadHtmlFile failed", error?.message || error);
                sendResponse({
                    success: false,
                    error: String(error?.message || error)
                });
            }
        })();
        return true;
    }

    if (request.action === "executeScript_UploadScreenshot") {
        (async () => {
            try {
                const result =
                    await uploadScreenshot(
                        request.uploadUrl,
                        request.token,
                        request.apiVersion,
                        request.fileName,
                        screenshotUrl
                    );

                sendResponse({
                    success: true,
                    data: result
                });
            } catch (error) {
                consoleError("executeScript_UploadScreenshot failed", error?.message || error);
                sendResponse({
                    success: false,
                    error: String(error?.message || error)
                });
            }
        })();
        return true;
    }
});

let screenshotUrl = null;

chrome.action.onClicked.addListener(async (tab) => {
    const url = tab.url;

    const Qr = [
        "chrome://",
        "chrome.google.com/webstore'",
        "https://www.homedepot.com",
        "edge://",
        "arc://",
        "view-source:",
        "devtools:",
        "chrome-extension://",
        "about:",
        "about:",
        "https://chromewebstore.google.com/"
    ];

    if (url == undefined || Qr.some((t) => url.startsWith(t)) || url == "") {
        await chrome.action.setPopup({
            popup: "popupBlocked.html",
            tabId: tab.id,
        });
        await chrome.action.openPopup();
    } else {

        screenshotUrl =
            await chrome.tabs.captureVisibleTab(
                null,
                {
                    format: "png"
                }
            );

        chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_OVERLAY" });
    }
});

// Keep service worker alive
chrome.alarms.create('keep-alive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === 'keep-alive') {
        consoleLog('Service worker keep-alive ping');
    }
});

consoleLog('Background script loaded successfully');