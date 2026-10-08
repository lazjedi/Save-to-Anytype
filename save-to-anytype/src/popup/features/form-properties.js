// Logic shared by the form editor and the save object section
import { NAME_PROPERTY, BODY_PROPERTY, DESCRIPTION_PROPERTY, READ_ONLY_PROPERTY_KEYS, PAGE_VALUE_FORMATS } from '../core/constants.js';
import { t } from '../core/i18n.js';
import { anytypeApi } from '../api/anytype-api.js';
import { consoleError } from '../core/logger.js';

// Older versions skipped these by their (english) names
const READ_ONLY_PROPERTY_NAMES = new Set(['Created by', 'Creation date']);

function isReadOnlyProperty(property) {
    return READ_ONLY_PROPERTY_KEYS.has(property.key) || READ_ONLY_PROPERTY_NAMES.has(property.name);
}

// Properties shown in a form: name, description, body, then the properties of the type
export function buildFormProperties(typeProperties) {
    const properties = (typeProperties || []).filter(property => property && !isReadOnlyProperty(property));

    const descriptionIndex = properties.findIndex(property => property.key === DESCRIPTION_PROPERTY.key);
    const description = descriptionIndex !== -1
        ? properties.splice(descriptionIndex, 1)[0]
        : { object: "property", ...DESCRIPTION_PROPERTY, name: t("Description") };

    return [
        { object: "property", ...NAME_PROPERTY, name: t("NameOfObject") },
        description,
        { object: "property", ...BODY_PROPERTY, name: t("objectBodyName") },
        ...properties
    ];
}

// Properties whose value is taken from the page (title, url, selected element...)
export function isPageValueProperty(property) {
    return PAGE_VALUE_FORMATS.has(property.format) || property.key === DESCRIPTION_PROPERTY.key;
}

// The page property selected by default in a new form
export function getDefaultPageValue(property) {
    const key = String(property.key || '').toLowerCase();
    const name = String(property.name || '').toLowerCase();

    if (property.id === NAME_PROPERTY.id) return "tab_title";
    if (property.format === "url" || ["url", "page_url"].includes(key) || ["url", "page_url"].includes(name)) return "page_url";
    return null;
}

export function getTypeKey(type) {
    return type.key || type.type_key || type.id;
}

export function getFormDisplayName(form) {
    if (form.formName) return form.formName;

    const emoji = form.type?.icon?.format === "emoji" ? form.type.icon.emoji + " " : "";
    return emoji + (form.type?.name || '');
}

export function hasSavedValue(value) {
    return value !== null && value !== undefined && value !== "null" && value.length > 0;
}

// Objects for "objects" properties, loaded once per rendering of a form
export function createObjectsLoader(spaceId) {
    let objectsPromise = null;

    return () => {
        objectsPromise ??= anytypeApi.listObjects(spaceId);

        return objectsPromise;
    };
}

// Collections of a space (objects of collection-layout types); types can be passed if they are already loaded
export async function loadSpaceCollections(spaceId, types = null) {
    try {
        types ??= await anytypeApi.listTypes(spaceId);
        const collectionTypeKeys = types.filter(type => type.layout === "collection").map(type => type.key);
        return await anytypeApi.listCollections(spaceId, collectionTypeKeys);
    } catch (error) {
        consoleError('Collections could not be loaded:', error);
        return [];
    }
}
