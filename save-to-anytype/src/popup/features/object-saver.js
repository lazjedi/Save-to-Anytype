// "Save object" section: fills the fields of a form with page data and creates the object in Anytype
import { NAME_PROPERTY, BODY_PROPERTY, COLLECTION_FIELD, TEMPLATE_FIELD, DEFAULT_FILE_NAME_FORMAT, FILLED_FIELDS_TOGGLE_SYMBOL } from '../core/constants.js';
import { elements, escapeHtml, createElementFromHtml, setHidden, runWithBusyButton, openExternal } from '../core/dom.js';
import { state, saveState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { consoleLog, consoleError } from '../core/logger.js';
import { anytypeApi } from '../api/anytype-api.js';
import { showSection, SECTIONS } from '../ui/sections.js';
import { showStatus } from '../ui/status.js';
import { attachTooltipsIn } from '../ui/tooltip.js';
import { createChoices, createColoredChoices, registerItemIcons } from '../ui/choices.js';
import { propertyTitleHtml, propertyHeadHtml, selectFieldHtml, fileFieldHtml, checkboxLabelHtml, savedValueIncludes } from '../ui/property-fields.js';
import { getPageProperty } from '../page/page-data.js';
import { parsePageValue, parseNumber } from '../page/value-parsers.js';
import { FILE_SOURCES, NO_FILE, uploadFileFromSource } from '../page/file-sources.js';
import { attachFileNameFormatInputGuard, buildFileName, removeStringsFromTabTitle } from '../page/file-name.js';
import { buildFormProperties, isPageValueProperty, getFormDisplayName, hasSavedValue, createObjectsLoader, loadSpaceCollections } from './form-properties.js';

let currentForm = null;
let createdObject = null; // { spaceId, objectId } for "Open in Anytype"
let renderGeneration = 0;

/*
    Fields of the opened form:
    { kind: 'name' | 'body' | 'value' | 'files' | 'collection' | 'template', property, input, fileNameInput }
*/
let saveFields = [];

export function initObjectSaver() {
    elements.saveObjectBtn.addEventListener('click', saveObject);

    elements.OpenInAnytypeBtn.addEventListener('click', () => {
        if (createdObject)
            openExternal(`anytype://object?objectId=${encodeURIComponent(createdObject.objectId)}&spaceId=${encodeURIComponent(createdObject.spaceId)}`);
    });

    elements.propertiesWithDefaultValueToggle.addEventListener('click', () => {
        playToggleAnimation();
        elements.propertiesWithDefaultValue.classList.toggle('collapsed');
        updateToggleSign();
    });
}

export async function openSaveObject(form) {
    showSection(SECTIONS.saveObject);
    await renderForm(form);
}

//#region Rendering

async function renderForm(form) {
    const generation = ++renderGeneration;

    currentForm = form;
    saveFields = [];
    elements.propertiesWithoutDefaultValue.innerHTML = '';
    elements.propertiesWithDefaultValueContent.innerHTML = '';
    elements.objectNameToSave.innerText = getFormDisplayName(form);

    consoleLog('Form to save this object: ', form);

    let type;
    try {
        type = await anytypeApi.getType(form.spaceId, form.type.id);
    } catch (error) {
        consoleError('Type object for save could not be loaded: ', error);
        showStatus(t("FailedToLoadObject") + (error?.status ?? error?.message ?? ''), "error");
        return;
    }

    const loadObjects = createObjectsLoader(form.spaceId);

    // Fields are prepared in parallel and added in the order of properties
    const [propertyFields, collectionField, templateField] = await Promise.all([
        Promise.all(buildFormProperties(type.properties).map(property =>
            createPropertyField(form, property, loadObjects).catch(error => {
                consoleError(`Property ${property.key} could not be loaded:`, error);
                return null;
            }))),
        createCollectionField(form),
        createTemplateField(form)
    ]);

    if (generation !== renderGeneration) return;

    const fields = [...propertyFields, collectionField, templateField].filter(Boolean);

    for (const field of fields) {
        const container = field.filled ? elements.propertiesWithDefaultValueContent : elements.propertiesWithoutDefaultValue;
        container.appendChild(field.element);
        field.initChoices?.();
        saveFields.push(field);
    }

    setHidden(elements.propertiesWithoutDefaultValue, !fields.some(field => !field.filled));
    setHidden(elements.propertiesWithDefaultValue, !fields.some(field => field.filled));

    attachTooltipsIn(elements.saveObjectSection);

    elements.propertiesWithDefaultValueToggleText.textContent = t("FilledProperties");
    elements.propertiesWithDefaultValueToggleSign.textContent = FILLED_FIELDS_TOGGLE_SYMBOL;
    elements.propertiesWithDefaultValue.classList.toggle('collapsed', state.collapseOnOpenForm === "true");
    updateToggleSign();
}

// Returns a field or null for unsupported formats
async function createPropertyField(form, property, loadObjects) {
    const savedProperty = form.properties.find(p => p.AnytypeProperty?.id === property.id);
    const savedValue = hasSavedValue(savedProperty?.SelectedValueByUser) ? savedProperty.SelectedValueByUser : null;
    const id = `so_${property.id}`;

    // Fields with a value from the form go to the collapsible "Filled properties" block (the name is always on top)
    const filled = property.format === "files"
        ? savedValue !== null && savedValue !== NO_FILE
        : savedValue !== null && property.id !== NAME_PROPERTY.id;

    const kind = property.id === NAME_PROPERTY.id ? 'name'
        : property.id === BODY_PROPERTY.id ? 'body'
            : property.format === "files" ? 'files'
                : 'value';

    const field = { kind, property, filled };

    if (isPageValueProperty(property)) {
        const value = savedValue !== null ? await getPageValue(savedValue, property.format) : null;
        field.element = createElementFromHtml(pageValueFieldHtml(id, property, value));
        field.input = field.element.querySelector('input, textarea');

        if (property.format === "checkbox")
            field.element.classList.add("poperty-head", "margin-bottom15");

        return field;
    }

    if (property.format === "objects") {
        let objects = await loadObjects();

        // The saved object may be missing from the list (it is limited and sorted by last modification)
        if (savedValue !== null && !Array.isArray(savedValue) && !objects.some(object => object.id === savedValue)) {
            const savedObject = await anytypeApi.getObject(form.spaceId, savedValue).catch(() => null);
            if (savedObject) objects = [savedObject, ...objects];
        }

        registerItemIcons(objects);

        const options = [{ value: "", label: property.name }].concat(objects.map(object => ({
            value: object.id,
            label: object.name || object.id,
            selected: savedValue !== null && savedValueIncludes(savedValue, object.id)
        })));

        return withSelect(field, selectFieldHtml({ id, iconFormat: property.format, title: property.name, options }), savedValue === null);
    }

    if (property.format === "select" || property.format === "multi_select") {
        const tags = await anytypeApi.listTags(form.spaceId, property.id);
        const options = tags.map(tag => ({
            value: tag.id,
            label: tag.name || tag.id,
            color: tag.color,
            selected: savedValue !== null && savedValueIncludes(savedValue, tag.id)
        }));

        return withSelect(field, selectFieldHtml({ id, iconFormat: property.format, title: property.name, options, multiple: property.format === "multi_select" }), savedValue === null);
    }

    if (property.format === "files") {
        const options = FILE_SOURCES.map(source => ({ value: source.id, label: t(source.nameKey), selected: savedValue === source.id }));

        field.element = createElementFromHtml(fileFieldHtml({
            selectId: id,
            inputId: `${id}_file_name_format`,
            title: property.name,
            options,
            fileNameFormat: await buildFileName(savedProperty?.FileNameFormat || DEFAULT_FILE_NAME_FORMAT)
        }));
        field.input = field.element.querySelector('select');
        field.fileNameInput = field.element.querySelector('input');
        attachFileNameFormatInputGuard(field.fileNameInput);
        field.initChoices = () => createChoices(field.input);

        return field;
    }

    consoleLog(`Unsupported property format "${property.format}", skipped:`, property);
    return null;
}

function withSelect(field, html, clearSelection) {
    field.element = createElementFromHtml(html);
    field.input = field.element.querySelector('select');
    field.initChoices = () => createColoredChoices(field.input, { clearSelection });
    return field;
}

async function getPageValue(pageProperty, format) {
    let value = await getPageProperty(pageProperty);

    if (pageProperty === "tab_title")
        value = removeStringsFromTabTitle(value);

    return parsePageValue(format, value);
}

function pageValueFieldHtml(id, property, value) {
    const isCheckbox = property.format === "checkbox";
    const isTextarea = property.key === "description" || property.id === BODY_PROPERTY.id;
    const inputType = property.format === "phone" ? "tel" : property.format;
    // The whole checkbox field is a row (see "poperty-head" in createPropertyField)
    const head = isCheckbox
        ? propertyTitleHtml(property.format, property.name)
        : propertyHeadHtml(property.format, property.name);

    const control = isTextarea
        ? `<textarea id="${escapeHtml(id)}" placeholder="${escapeHtml(property.name)}">${escapeHtml(value ?? '')}</textarea>`
        : `<input id="${escapeHtml(id)}" type="${escapeHtml(inputType)}" placeholder="${escapeHtml(property.name)}"${value !== null && !isCheckbox ? ` value="${escapeHtml(value)}"` : ''}>`;

    return `
        ${head}
        <div class="form-group${isCheckbox ? ' checkbox-rect' : ''}">
            ${control}
            ${isCheckbox ? checkboxLabelHtml(id) : ''}
        </div>`;
}

async function createCollectionField(form) {
    const collections = await loadSpaceCollections(form.spaceId);
    return createListField(COLLECTION_FIELD, "collection", t("SelectCollection"), collections, form.collectionId);
}

async function createTemplateField(form) {
    const templates = await anytypeApi.listTemplates(form.spaceId, form.type.id).catch(error => {
        consoleError('Templates could not be loaded:', error);
        return [];
    });
    return createListField(TEMPLATE_FIELD, "template", t("SelectObjectTemplate"), templates, form.templateId);
}

// The collection / template select, always in the "Filled properties" block
function createListField(fieldInfo, iconFormat, title, items, savedId) {
    if (items.length === 0) return null;

    const hasSavedId = savedId !== null && savedId !== undefined && savedId !== '';
    registerItemIcons(items);
    const options = items.map(item => ({ value: item.id, label: item.name || item.id, selected: hasSavedId && item.id === savedId }));

    const field = { kind: fieldInfo === COLLECTION_FIELD ? 'collection' : 'template', property: fieldInfo, filled: true };
    return withSelect(field, selectFieldHtml({ id: `so_${fieldInfo.id}`, iconFormat, title, options }), !hasSavedId);
}

//#endregion

//#region "Filled properties" toggle

let toggleAnimationTimer = null;

function playToggleAnimation() {
    const sign = elements.propertiesWithDefaultValueToggleSign;
    sign.classList.add('animate-on-toggle');

    clearTimeout(toggleAnimationTimer);
    toggleAnimationTimer = setTimeout(() => sign.classList.remove('animate-on-toggle'), 260);
}

function updateToggleSign() {
    const isCollapsed = elements.propertiesWithDefaultValue.classList.contains('collapsed');
    elements.propertiesWithDefaultValueToggleSign.classList.toggle('is-expanded', !isCollapsed);
}

//#endregion

//#region Values

function getSelectedOptions(select) {
    return Array.from(select.selectedOptions).map(option => option.value).filter(value => value !== "");
}

// The value for the Anytype API in the format of the property, or null when the field is empty
function readFieldValue(field) {
    const { property, input } = field;

    switch (property.format) {
        case "checkbox":
            return input.checked;
        case "multi_select":
        case "objects": {
            const values = getSelectedOptions(input);
            return values.length > 0 ? values : null;
        }
        case "number":
            return parseNumber(input.value);
        default:
            return input.value.trim() === '' ? null : input.value.trim();
    }
}

//#endregion

//#region Saving

async function uploadFileField(field, spaceId) {
    const sourceId = field.input.value;
    if (!sourceId || sourceId === NO_FILE) return null;

    try {
        const fileName = await buildFileName(field.fileNameInput.value);
        consoleLog("file source: " + sourceId + ", file name: " + fileName);

        const result = await uploadFileFromSource(sourceId, spaceId, fileName);
        consoleLog("file upload result: ", result);

        return result?.object_id || null;
    } catch (error) {
        consoleError("File could not be uploaded:", error);
        showStatus(t("FileUploadFailed") + error.message, 'error');
        return null;
    }
}

async function saveObject() {
    const form = currentForm;
    if (!form) return;

    await runWithBusyButton(elements.saveObjectBtn, t("Saving"), async () => {
        try {
            const objectData = {
                name: '',
                body: '',
                type_key: form.type.key || 'page',
                properties: []
            };
            let collectionId = null;

            for (const field of saveFields) {
                switch (field.kind) {
                    case 'name':
                        objectData.name = field.input.value;
                        break;
                    case 'body':
                        objectData.body = field.input.value;
                        break;
                    case 'collection':
                        collectionId = field.input.value || null;
                        break;
                    case 'template':
                        if (field.input.value) objectData.template_id = field.input.value;
                        break;
                    case 'files': {
                        const fileObjectId = await uploadFileField(field, form.spaceId);
                        if (fileObjectId) objectData.properties.push({ key: field.property.key, files: [fileObjectId] });
                        break;
                    }
                    default: {
                        const value = readFieldValue(field);
                        if (value !== null) objectData.properties.push({ key: field.property.key, [field.property.format]: value });
                    }
                }
            }

            consoleLog('Sending object data:', objectData);

            const object = await anytypeApi.createObject(form.spaceId, objectData);
            consoleLog('Object created:', object?.id);

            state.LastUsedForm = form.formId;
            saveState();

            if (collectionId && object?.id)
                await addToCollection(form.spaceId, collectionId, object.id);

            createdObject = object?.id ? { spaceId: form.spaceId, objectId: object.id } : null;
            showSection(SECTIONS.objectSaved);
        } catch (error) {
            consoleError('Save error:', error);
            showStatus(t("SaveError") + error.message, 'error');
        }
    });
}

async function addToCollection(spaceId, collectionId, objectId) {
    try {
        await anytypeApi.addObjectsToList(spaceId, collectionId, [objectId]);
        consoleLog('Successfully added to collection');
    } catch (error) {
        consoleError('Could not add to collection:', error);
        showStatus(t("AddToCollectionFailed") + error.message, 'error');
    }
}

//#endregion
