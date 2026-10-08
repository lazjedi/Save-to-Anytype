// Anytype local API client. Reference: https://developers.anytype.io/docs/reference/2025-11-08/anytype-api/
import { API_BASE_URL, API_VERSION, MAX_OBJECTS_IN_LIST } from '../core/constants.js';
import { state } from '../core/state.js';

// The API maximum for paginated endpoints
const PAGE_LIMIT = 1000;

export class AnytypeApiError extends Error {
    constructor(status, code, message) {
        super(message || `Anytype API error ${status}`);
        this.name = 'AnytypeApiError';
        this.status = status;
        this.code = code;
    }
}

// fetch() throws a TypeError when Anytype isn't running (connection refused)
export function isConnectionError(error) {
    return error instanceof TypeError;
}

const encode = encodeURIComponent;

async function request(path, { method = 'GET', query, body, apiKey = state.apiKey, auth = true } = {}) {
    const url = new URL(API_BASE_URL + path);
    for (const [name, value] of Object.entries(query || {})) {
        if (value !== undefined && value !== null) url.searchParams.set(name, value);
    }

    const headers = { 'Anytype-Version': API_VERSION };
    if (auth) headers['Authorization'] = `Bearer ${apiKey}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok)
        throw new AnytypeApiError(response.status, data?.code, data?.message || data?.error || text || response.statusText);

    return data;
}

// Paginated endpoints return { data: [], pagination: { has_more } }; loads every page (up to maxItems)
async function requestAllPages(path, { maxItems = Infinity, ...options } = {}) {
    const items = [];
    let offset = 0;

    while (items.length < maxItems) {
        const page = await request(path, {
            ...options,
            query: { ...options.query, offset, limit: Math.min(PAGE_LIMIT, maxItems - items.length) }
        });

        const pageItems = Array.isArray(page?.data) ? page.data : [];
        items.push(...pageItems);

        if (!page?.pagination?.has_more || pageItems.length === 0) break;
        offset += pageItems.length;
    }

    return items;
}

const byName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { numeric: true, sensitivity: 'base' });

export const anytypeApi = {
    //#region Auth

    async createChallenge(appName) {
        const data = await request('/auth/challenges', { method: 'POST', auth: false, body: { app_name: appName } });
        return data.challenge_id;
    },

    async createApiKey(challengeId, code) {
        const data = await request('/auth/api_keys', { method: 'POST', auth: false, body: { challenge_id: challengeId, code } });
        return data.api_key;
    },

    //#endregion

    listSpaces(apiKey = state.apiKey) {
        return requestAllPages('/spaces', { apiKey });
    },

    async listTypes(spaceId) {
        const types = await requestAllPages(`/spaces/${encode(spaceId)}/types`);
        return types.filter(type => type && !type.archived);
    },

    async getType(spaceId, typeId) {
        const data = await request(`/spaces/${encode(spaceId)}/types/${encode(typeId)}`);
        return data.type;
    },

    async listTemplates(spaceId, typeId) {
        const templates = await requestAllPages(`/spaces/${encode(spaceId)}/types/${encode(typeId)}/templates`);
        return templates.sort(byName);
    },

    // The API returns tags unordered (Anytype's own order isn't exposed), keep them stable by name
    async listTags(spaceId, propertyId) {
        const tags = await requestAllPages(`/spaces/${encode(spaceId)}/properties/${encode(propertyId)}/tags`);
        return tags.sort(byName);
    },

    // The most recently modified objects
    listObjects(spaceId) {
        return requestAllPages(`/spaces/${encode(spaceId)}/objects`, { maxItems: MAX_OBJECTS_IN_LIST });
    },

    async getObject(spaceId, objectId) {
        const data = await request(`/spaces/${encode(spaceId)}/objects/${encode(objectId)}`);
        return data?.object ?? null;
    },

    // The API has no endpoint listing collections - search for objects of collection-layout types instead
    listCollections(spaceId, collectionTypeKeys) {
        return requestAllPages(`/spaces/${encode(spaceId)}/search`, {
            method: 'POST',
            body: {
                types: collectionTypeKeys.length > 0 ? collectionTypeKeys : ['collection'],
                sort: { property_key: 'name', direction: 'asc' }
            }
        });
    },

    async createObject(spaceId, objectData) {
        const data = await request(`/spaces/${encode(spaceId)}/objects`, { method: 'POST', body: objectData });
        return data?.object ?? null;
    },

    addObjectsToList(spaceId, listId, objectIds) {
        return request(`/spaces/${encode(spaceId)}/lists/${encode(listId)}/objects`, { method: 'POST', body: { objects: objectIds } });
    },

    fileUploadUrl(spaceId) {
        return `${API_BASE_URL}/spaces/${encode(spaceId)}/files`;
    }
};

// Anytype file urls need the Authorization header, which css/img can't send - load them via fetch into blob urls
const authorizedImageCache = new Map();

export function isAnytypeFileUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1):31009\/v\d+\/spaces\/[^/]+\/files\//.test(String(url ?? ''));
}

export function getAuthorizedImageUrl(url) {
    if (!authorizedImageCache.has(url)) {
        const requestUrl = new URL(url);
        if (!requestUrl.searchParams.has('width'))
            requestUrl.searchParams.set('width', '320');

        authorizedImageCache.set(url, fetch(requestUrl, {
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Anytype-Version': API_VERSION
            }
        })
            .then(response => response.ok ? response.blob() : null)
            .then(blob => blob ? URL.createObjectURL(blob) : null)
            .catch(() => null));
    }

    return authorizedImageCache.get(url);
}
