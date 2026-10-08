// Sources of files for "files" properties. The upload itself runs in the service worker (src/background/file-upload.js)
import { API_VERSION } from '../core/constants.js';
import { state } from '../core/state.js';
import { anytypeApi } from '../api/anytype-api.js';
import { getPageProperty, getPageTab, getScreenshotUrl } from './page-data.js';

export const NO_FILE = 'none_file';

/*
    HOW TO ADD A NEW FILE SOURCE:
    1) Add it here: id (also the localization key) and getSourceUrl() if the loader needs an url
    2) Add a loader with the same id to FILE_LOADERS in src/background/file-upload.js
*/
export const FILE_SOURCES = Object.freeze([
    { id: NO_FILE, nameKey: 'none_file' },
    { id: 'image_by_url', nameKey: 'image_by_url', getSourceUrl: () => getPageProperty('page_image'), previewUrl: () => getPageProperty('page_image') },
    { id: 'html_file', nameKey: 'html_file', getSourceUrl: () => getPageProperty('page_url') },
    { id: 'screenshot', nameKey: 'screenshot', previewUrl: () => getScreenshotUrl() }
]);

export function findFileSource(sourceId) {
    return FILE_SOURCES.find(source => source.id === sourceId) || null;
}

// Returns the response of the files API ({ object_id, ... }) or null when there is nothing to upload
export async function uploadFileFromSource(sourceId, spaceId, fileName) {
    const source = findFileSource(sourceId);
    if (!source || source.id === NO_FILE) return null;

    const sourceUrl = source.getSourceUrl ? await source.getSourceUrl() : undefined;
    if (source.getSourceUrl && !sourceUrl) return null; // e.g. no image found on the page

    const response = await chrome.runtime.sendMessage({
        action: "UPLOAD_FILE",
        source: source.id,
        uploadUrl: anytypeApi.fileUploadUrl(spaceId),
        token: state.apiKey,
        apiVersion: API_VERSION,
        tabId: getPageTab()?.id,
        sourceUrl,
        fileName
    });

    if (!response?.success) throw new Error(response?.error || 'File upload failed');

    return response.data;
}
