// "Create form" section: a form is a template that says how page data is put into an object of a type
import { COMMON_TYPE_KEYS, DEFAULT_FILE_NAME_FORMAT } from '../core/constants.js';
import { elements, escapeHtml, createElementFromHtml, setHidden } from '../core/dom.js';
import { state, saveState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { consoleLog, consoleError } from '../core/logger.js';
import { anytypeApi, isConnectionError } from '../api/anytype-api.js';
import { showSection, showBlockedSection, SECTIONS } from '../ui/sections.js';
import { showStatus } from '../ui/status.js';
import { attachTooltip, attachTooltipsIn, createTooltipButton } from '../ui/tooltip.js';
import { createChoices, createChoicesWithIcons, createColoredChoices, destroyChoices, getChoicesValue, getIconSource, registerItemIcons } from '../ui/choices.js';
import { selectFieldHtml, fileFieldHtml } from '../ui/property-fields.js';
import { PAGE_PROPERTIES, PAGE_SELECTOR, makePageSelectorValue } from '../page/page-data.js';
import { FILE_SOURCES, NO_FILE } from '../page/file-sources.js';
import { attachFileNameFormatInputGuard, generateRandomId } from '../page/file-name.js';
import { startElementSelection, getSelectedElement, clearSelectedElements } from '../page/element-selector.js';
import { buildFormProperties, isPageValueProperty, getDefaultPageValue, getTypeKey, createObjectsLoader, loadSpaceCollections } from './form-properties.js';
import { showMainSection } from './forms-list.js';

let spaces = [];
let selectedSpace = null;
let types = [];
let selectedType = null;

let spaceChoices = null;
let typeChoices = null;
let collectionChoices = null;
let templateChoices = null;

// { property, choices, fileNameInput }
let editorFields = [];

// Loads are async, a newer selection must win over a slower older one
let spaceGeneration = 0;
let typeGeneration = 0;

export function initFormEditor() {
    elements.spaceSelect.addEventListener('change', () => onSpaceSelected(elements.spaceSelect.value));
    elements.typeSelect.addEventListener('change', () => {
        const type = types.find(type => getTypeKey(type) === elements.typeSelect.value);
        if (type) onTypeSelected(type);
    });
    elements.saveFormBtn.addEventListener('click', saveForm);

    attachTooltip(elements.createFormTipButton, "CreateFormTip");
}

export async function openFormEditor() {
    showSection(SECTIONS.createForm);
    await loadSpaces();
}

function handleLoadError(messageKey, error) {
    consoleError(messageKey, error);
    showStatus(t(messageKey) + (error?.status ?? error?.message ?? ''), 'error');

    if (isConnectionError(error)) showBlockedSection(false);
}

function resetTypeDependentUi() {
    typeGeneration++;
    selectedType = null;
    editorFields = [];
    templateChoices = destroyChoices(templateChoices);
    elements.propertiesListHandler.innerHTML = '';
    clearSelectedElements();

    setHidden(elements.objectTemplateSection, true);
    setHidden(elements.propertiesSection, true);
}

function resetSpaceDependentUi() {
    spaceGeneration++;
    resetTypeDependentUi();
    types = [];
    typeChoices = destroyChoices(typeChoices);
    collectionChoices = destroyChoices(collectionChoices);
    elements.typeSelect.innerHTML = '';
    elements.collectionsList.innerHTML = '';

    setHidden(elements.collectionSection, true);
    setHidden(elements.typeSection, true);
    setHidden(elements.FormNameInputSection, true);
    setHidden(elements.saveFormBtn, true);
}

//#region Space

async function loadSpaces() {
    selectedSpace = null;
    resetSpaceDependentUi();
    const generation = spaceGeneration;

    spaceChoices = destroyChoices(spaceChoices);
    elements.spaceSelect.innerHTML = `<option value="">${escapeHtml(t("SelectSpace"))}</option>`;

    try {
        spaces = await anytypeApi.listSpaces();
    } catch (error) {
        handleLoadError('SpaceListCouldntBeLoaded', error);
        return;
    }

    if (generation !== spaceGeneration) return;

    if (spaces.length === 0) {
        showStatus(t('NoSpaceFound'), 'error');
        return;
    }

    spaceChoices = createChoicesWithIcons(elements.spaceSelect, spaces.map(space => ({
        value: space.id,
        label: space.name || space.id || t('UntitledSpace'),
        customProperties: { img: getIconSource(space) }
    })), { searchEnabled: true });
}

async function onSpaceSelected(spaceId) {
    resetSpaceDependentUi();
    const generation = spaceGeneration;

    selectedSpace = spaces.find(space => space.id === spaceId) || null;
    if (!selectedSpace) return;

    setHidden(elements.typeSection, false);
    setHidden(elements.FormNameInputSection, false);
    setHidden(elements.saveFormBtn, false);

    try {
        types = await anytypeApi.listTypes(selectedSpace.id);
    } catch (error) {
        handleLoadError('TypesCouldNotBeLoaded', error);
        return;
    }

    if (generation !== spaceGeneration) return;

    await Promise.all([
        renderCollections(generation),
        renderTypes()
    ]);
}

//#endregion

//#region Collections

async function renderCollections(generation) {
    const collections = await loadSpaceCollections(selectedSpace.id, types);

    if (generation !== spaceGeneration || collections.length === 0) return;

    elements.collectionsList.innerHTML = `<select id="collectionSelect">${collections.map(collection =>
        `<option value="${escapeHtml(collection.id)}">${escapeHtml(collection.name || collection.id)}</option>`).join('')}
    </select>`;

    registerItemIcons(collections);
    collectionChoices = createChoices(document.getElementById("collectionSelect"), { removeItemButton: true, searchEnabled: true });
    collectionChoices.removeActiveItems();

    setHidden(elements.collectionSection, false);
}

//#endregion

//#region Type

// Common types first, then by name
function sortTypes(typesToSort) {
    const commonIndex = (type) => {
        const index = COMMON_TYPE_KEYS.indexOf(type.key || type.type_key || '');
        return index === -1 ? COMMON_TYPE_KEYS.length : index;
    };

    return [...typesToSort].sort((a, b) => commonIndex(a) - commonIndex(b) || (a.name || '').localeCompare(b.name || ''));
}

async function renderTypes() {
    if (types.length === 0) {
        showStatus(t('NoTypesFound'), 'error');
        return;
    }

    types = sortTypes(types);

    typeChoices = createChoicesWithIcons(elements.typeSelect, types.map(type => ({
        value: getTypeKey(type),
        label: type.name || getTypeKey(type),
        customProperties: { img: getIconSource(type) }
    })), { searchEnabled: true });

    await onTypeSelected(types[0]);
}

async function onTypeSelected(type) {
    resetTypeDependentUi();
    const generation = typeGeneration;
    selectedType = type;

    const emoji = type.icon?.format === "emoji" ? type.icon.emoji : "";
    elements.FormNameInput.value = `${emoji} ${type.name} | ${selectedSpace.name}`;

    setHidden(elements.propertiesSection, false);

    await Promise.all([
        renderTemplates(generation),
        renderEditorFields(generation)
    ]);
}

async function renderTemplates(generation) {
    let templates = [];
    try {
        templates = await anytypeApi.listTemplates(selectedSpace.id, selectedType.id);
    } catch (error) {
        consoleError('Templates could not be loaded:', error);
    }

    if (generation !== typeGeneration || templates.length === 0) return;

    elements.objectTemplateSectionSelect.innerHTML = templates.map(template =>
        `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name || template.id)}</option>`).join('');

    registerItemIcons(templates);
    templateChoices = createChoices(elements.objectTemplateSectionSelect, { removeItemButton: true, searchEnabled: true });
    templateChoices.removeActiveItems();

    setHidden(elements.objectTemplateSection, false);
}

//#endregion

//#region Properties

async function renderEditorFields(generation) {
    const spaceId = selectedSpace.id;
    const loadObjects = createObjectsLoader(spaceId);
    const properties = buildFormProperties(selectedType.properties);

    consoleLog("currentTypeProperties: ", properties);

    // Data is loaded in parallel, then fields are added in the order of properties
    const fields = await Promise.all(properties.map(property =>
        createEditorField(property, spaceId, loadObjects).catch(error => {
            consoleError(`Property ${property.key} could not be loaded:`, error);
            return null;
        })));

    if (generation !== typeGeneration) return;

    for (const field of fields) {
        if (!field) continue;

        elements.propertiesListHandler.appendChild(field.element);
        field.choices = field.initChoices();
        selectDefaultValue(field);
        editorFields.push(field);
    }

    attachTooltipsIn(elements.propertiesListHandler);
}

// Returns { property, element, initChoices } or null for unsupported formats
async function createEditorField(property, spaceId, loadObjects) {
    const id = `cf_${property.key}`;
    const base = { id, iconFormat: property.format, title: property.name };

    if (isPageValueProperty(property)) {
        const options = PAGE_PROPERTIES.map(pageProperty => ({ value: pageProperty.id, label: t(pageProperty.nameKey) }));
        const element = createElementFromHtml(selectFieldHtml({ ...base, options }));
        const select = element.querySelector('select');

        addPageValueExtras(element, property, select);

        return { property, element, initChoices: () => createChoices(select, { removeItemButton: true }) };
    }

    if (property.format === "objects") {
        const objects = await loadObjects();
        const element = createElementFromHtml(selectFieldHtml({ ...base, options: [] }));
        const select = element.querySelector('select');

        // Empty first choice, otherwise the first (last edited) object is selected by default
        const choicesData = [{ value: "", label: property.name, placeholder: true, selected: true }].concat(objects.map(object => ({
            value: object.id,
            label: object.name || object.id,
            customProperties: { img: getIconSource(object) }
        })));

        return { property, element, initChoices: () => createChoicesWithIcons(select, choicesData, { searchEnabled: true }) };
    }

    if (property.format === "select" || property.format === "multi_select") {
        const tags = await anytypeApi.listTags(spaceId, property.id);
        const options = tags.map(tag => ({ value: tag.id, label: tag.name || tag.id, color: tag.color }));
        const element = createElementFromHtml(selectFieldHtml({ ...base, options, multiple: property.format === "multi_select" }));

        return { property, element, initChoices: () => createColoredChoices(element.querySelector('select'), { removeItemButton: true, searchEnabled: true }) };
    }

    if (property.format === "files") {
        const options = FILE_SOURCES.map(source => ({ value: source.id, label: t(source.nameKey) }));
        const element = createElementFromHtml(fileFieldHtml({
            selectId: id,
            inputId: `${id}_file_name_format`,
            title: property.name,
            options,
            fileNameFormat: DEFAULT_FILE_NAME_FORMAT
        }));
        const fileNameInput = element.querySelector('input');
        attachFileNameFormatInputGuard(fileNameInput);

        return { property, element, fileNameInput, initChoices: () => createChoices(element.querySelector('select')) };
    }

    consoleLog(`Unsupported property format "${property.format}", skipped:`, property);
    return null;
}

function selectDefaultValue(field) {
    if (field.property.format === "files") {
        field.choices.setChoiceByValue(NO_FILE);
        return;
    }

    const defaultValue = isPageValueProperty(field.property) ? getDefaultPageValue(field.property) : null;

    if (defaultValue) field.choices.setChoiceByValue(defaultValue);
    else field.choices.removeActiveItems();
}

// "page_selector" shows a button to pick an element on the page, "selected_text_page" a tooltip
function addPageValueExtras(element, property, select) {
    const head = element.querySelector('.poperty-head');
    const formGroup = element.querySelector('.form-group');
    let extras = [];

    select.addEventListener('change', () => {
        extras.forEach(extra => extra.remove());
        extras = [];

        if (select.value === PAGE_SELECTOR) {
            const selectedInfo = document.createElement("div");
            selectedInfo.className = "page-selector-selected-class";
            selectedInfo.style.cssText = "display: none; margin-top: -13px; font-size: 10px; color: var(--section-title-color); opacity: 0.8;";
            const selectedLabel = document.createElement("span");
            selectedLabel.textContent = t("element_selector_class") + " ";
            const selectedValue = document.createElement("div");
            selectedInfo.append(selectedLabel, selectedValue);

            // Elements without a class are shown by their text
            const showSelectedElement = (selectedElement) => {
                const hasClass = selectedElement.elementClass && selectedElement.elementClass !== "no-class";
                selectedLabel.textContent = (hasClass ? t("element_selector_class") : t("element_selector_text") + ":") + " ";
                selectedValue.textContent = hasClass ? selectedElement.elementClass : (selectedElement.elementText || "").slice(0, 60);
                selectedInfo.style.display = "block";
            };

            const button = document.createElement("button");
            button.className = "btn-page-selector";
            button.title = t("Select-element-on-page");
            button.textContent = "👆";
            button.addEventListener("click", (event) => {
                event.preventDefault();
                startElementSelection(property.key, showSelectedElement).catch(error => {
                    consoleError("Element selection could not be started:", error);
                    showStatus(t("ElementSelectorNotAvailable"), "error");
                });
            });

            const previous = getSelectedElement(property.key);
            if (previous) showSelectedElement(previous);

            const tooltipButton = createTooltipButton("PageSelectorTooltip", 180);
            head.append(button, tooltipButton);
            formGroup.appendChild(selectedInfo);
            extras = [button, tooltipButton, selectedInfo];
        }
        else if (select.value === "selected_text_page") {
            const tooltipButton = createTooltipButton("SelectedTextPageTooltip", 150);
            head.appendChild(tooltipButton);
            extras = [tooltipButton];
        }
    });
}

//#endregion

async function saveForm() {
    if (!selectedSpace || !selectedType) return;

    const properties = editorFields.map(({ property, choices, fileNameInput }) => {
        let value = getChoicesValue(choices);

        // For the page selector the selected element is saved instead of the page property id
        if (value === PAGE_SELECTOR)
            value = makePageSelectorValue(getSelectedElement(property.key));

        return {
            AnytypeProperty: property,
            SelectedValueByUser: value,
            ...(property.format === "files" && fileNameInput ? { FileNameFormat: fileNameInput.value } : {})
        };
    });

    const form = {
        formId: generateRandomId(),
        formName: elements.FormNameInput.value,
        spaceId: selectedSpace.id,
        type: selectedType,
        collectionId: getChoicesValue(collectionChoices),
        templateId: getChoicesValue(templateChoices),
        properties
    };

    consoleLog("saving form: ", form);

    state.forms.push(form);
    await saveState();

    showMainSection();
}
