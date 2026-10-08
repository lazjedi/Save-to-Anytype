import { consoleLog } from './log.js';

// Set to true to download files instead of uploading them to Anytype (debugging).
// Requires the "downloads" permission in manifest.json
const DEBUG_DOWNLOAD_INSTEAD_OF_UPLOAD = false;

/*
    HOW TO ADD A NEW FILE SOURCE:
    1) Add a loader to FILE_LOADERS below: it receives the upload request and returns a File
    2) Add the source to FILE_SOURCES in src/popup/page/file-sources.js (id must match the loader key)
*/
const FILE_LOADERS = {
    image_by_url: async ({ sourceUrl, fileName }) => {
        consoleLog("Get image from URL: ", sourceUrl);
        const blob = await fetchBlob(sourceUrl, "Failed to download image");
        const extension = extensionFromMimeType(blob.type) || "png";

        return new File([blob], `${fileName || "image"}.${extension}`, { type: blob.type });
    },

    html_file: async ({ sourceUrl, fileName }) => {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`Failed to download html page: ${response.status}`);

        const html = await response.text();
        return new File([html], `${fileName || "page"}.html`, { type: "application/octet-stream" });
    },

    screenshot: async ({ sourceUrl, fileName }) => {
        if (!sourceUrl) throw new Error("No screenshot was taken for this tab");

        const blob = await fetchBlob(sourceUrl, "Failed to read screenshot");
        return new File([blob], `${fileName || "screenshot"}.png`, { type: "image/png" });
    }
};

async function fetchBlob(url, errorMessage) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${errorMessage}: ${response.status}`);
    return await response.blob();
}

function extensionFromMimeType(mimeType) {
    const subtype = String(mimeType || "").split("/")[1]?.split(/[+;]/)[0];
    if (!subtype) return "";
    return subtype === "jpeg" ? "jpg" : subtype;
}

// request: { source, uploadUrl, token, apiVersion, fileName, sourceUrl }
export async function uploadFileFromSource(request) {
    const loader = FILE_LOADERS[request.source];
    if (!loader) throw new Error(`Unknown file source: ${request.source}`);

    const file = await loader(request);

    if (DEBUG_DOWNLOAD_INSTEAD_OF_UPLOAD)
        return await downloadFileForDebug(file);

    return await uploadFile(request.uploadUrl, file, request.token, request.apiVersion);
}

async function uploadFile(uploadUrl, file, token, apiVersion) {
    const formData = new FormData();
    formData.append("file", file);

    // Content-Type is set by fetch itself (multipart boundary)
    const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Anytype-Version': apiVersion
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`File upload failed: status: ${response.status}, errorText: ${errorText}, uploadUrl: ${uploadUrl}`);
    }

    return await response.json();
}

async function downloadFileForDebug(file) {
    if (!chrome.downloads?.download)
        throw new Error('chrome.downloads API is not available, add the "downloads" permission to manifest.json');

    // FileReader isn't available in a service worker
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${btoa(binary)}`;

    console.log(`[TEST DOWNLOAD] file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);

    await chrome.downloads.download({ url: dataUrl, filename: file.name, saveAs: false, conflictAction: "uniquify" });

    return { testDownload: true, fileName: file.name };
}
