// HTML of property fields, shared by the form editor and the save object section
import { getPropertyIconSVG } from '../../shared/property-icons.js';
import { escapeHtml } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { MAX_FILE_NAME_LENGTH } from '../core/constants.js';

// Icon and name of a property
export function propertyTitleHtml(iconFormat, title) {
    return `
        ${getPropertyIconSVG(iconFormat)}
        <div class="section-title">${escapeHtml(title)}</div>`;
}

export function propertyHeadHtml(iconFormat, title) {
    return `<div class="poperty-head">${propertyTitleHtml(iconFormat, title)}</div>`;
}

// items: [{ value, label, selected?, color? }]
export function optionsHtml(items) {
    return items.map(item => `
        <option value="${escapeHtml(item.value)}"${item.color !== undefined ? ` prefered-color="${escapeHtml(item.color || '')}"` : ''}${item.selected ? ' selected' : ''}>${escapeHtml(item.label)}</option>`
    ).join('');
}

export function selectFieldHtml({ id, iconFormat, title, options, multiple = false }) {
    return `
        ${propertyHeadHtml(iconFormat, title)}
        <div class="form-group">
            <select id="${escapeHtml(id)}"${multiple ? ' multiple' : ''}>${optionsHtml(options)}
            </select>
        </div>`;
}

// The "files" property: a file source select and a file name format input
export function fileFieldHtml({ selectId, inputId, title, options, fileNameFormat }) {
    return `
        <div class="file-selector-group">
            ${selectFieldHtml({ id: selectId, iconFormat: 'files', title, options })}
            <div class="poperty-head">
                ${getPropertyIconSVG("editable")}
                <div class="section-title-with-tooltip">${escapeHtml(t("FileNameFormat"))}
                    <div class="btn-file-name-top-tip" data-tooltip-key="FileNameTooltip">?</div>
                </div>
            </div>
            <div class="form-group">
                <input
                    type="text"
                    id="${escapeHtml(inputId)}"
                    placeholder="${escapeHtml(t("FileNameFormatPlaceholder"))}"
                    value="${escapeHtml(fileNameFormat)}"
                    required
                    minlength="1"
                    maxlength="${MAX_FILE_NAME_LENGTH}"
                    size="10" />
            </div>
        </div>`;
}

export function checkboxLabelHtml(id) {
    return `
        <label for="${escapeHtml(id)}">
            <svg class="checkbox-rect-icon" viewBox="1 3 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <path d="M4 12.6111L8.92308 17.5L20 6.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                </g>
            </svg>
        </label>`;
}

// Whether a saved form value (a string or an array of ids) contains the value
export function savedValueIncludes(savedValue, value) {
    return Array.isArray(savedValue) ? savedValue.includes(value) : savedValue === value;
}
