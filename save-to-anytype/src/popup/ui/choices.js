// Helpers around Choices.js (lib/choices.min.js is loaded as a global)
import { t } from '../core/i18n.js';
import { isAnytypeFileUrl, getAuthorizedImageUrl } from '../api/anytype-api.js';

// Background colors for Anytype tag colors
const TAG_COLORS = {
    grey: '#414141',
    yellow: '#6c630f',
    orange: '#5c2a06',
    red: '#4a0a08',
    pink: '#4a0828',
    purple: '#3d0e68',
    blue: '#162060',
    ice: '#023a58',
    teal: '#0b4f4a',
    lime: '#1a3a0a'
};

export function normalizeColor(colorValue) {
    if (!colorValue) return null;
    return TAG_COLORS[colorValue.toLowerCase()] || colorValue;
}

// Icon of a space / type / object: an image url or an emoji
export function getIconSource(item) {
    return item?.icon?.file || item?.icon?.emoji || null;
}

export function createChoices(selectElement, options = {}) {
    return new Choices(selectElement, {
        removeItemButton: false,
        searchEnabled: false,
        shouldSort: false,
        loadingText: t("Loading"),
        noResultsText: t("NoResultsFound"),
        noChoicesText: t("NoChoicesToChooseFrom"),
        itemSelectText: t("PressToSelect"),
        uniqueItemText: t("OnlyUniqueValuesCanBeAdded"),
        customAddItemText: t("OnlyValuesMatchingSpecific"),
        ...options
    });
}

// Always returns null, so a destroyed instance is never used again: instance = destroyChoices(instance)
export function destroyChoices(choicesInstance) {
    choicesInstance?.destroy();
    return null;
}

// Selected value(s) of a Choices instance, or null when nothing is selected
export function getChoicesValue(choicesInstance) {
    const value = choicesInstance?.getValue(true);
    if (value === undefined || value === null || value === '') return null;
    if (Array.isArray(value) && value.length === 0) return null;
    return value;
}

//#region Icons

// choicesData items may have customProperties.img with an image url or an emoji
export function createChoicesWithIcons(selectElement, choicesData, options = {}) {
    const choicesInstance = createChoices(selectElement, { choices: choicesData, ...options });

    for (const choice of choicesData) {
        const img = choice?.customProperties?.img;
        if (img && img !== "null") registerChoiceIcon(img, String(choice.value ?? ""));
    }

    return choicesInstance;
}

// Icons of Anytype objects (spaces, types, collections, templates...) shown in Choices items with their ids
export function registerItemIcons(items) {
    for (const item of items) {
        const icon = getIconSource(item);
        if (icon) registerChoiceIcon(icon, String(item.id ?? ""));
    }
}

// Shows an image or emoji after every Choices item with this value (with a css rule)
export function registerChoiceIcon(img, value, withHoverPreview = false) {
    if (!img) return;

    if (isAnytypeFileUrl(img)) {
        getAuthorizedImageUrl(img).then(blobUrl => {
            if (blobUrl) registerChoiceIcon(blobUrl, value, withHoverPreview);
        });
        return;
    }

    const rawValue = String(value ?? '');
    const escapedValue = CSS.escape(rawValue);
    const isImageUrl = /^(https?:)?\/\//.test(img) || img.startsWith('data:') || img.startsWith('blob:');

    if (withHoverPreview) {
        const previewSource = isImageUrl ? img : emojiPreviewSource(img);
        if (previewSource) {
            ensureHoverPreviewHandlers();
            previewByValue.set(rawValue, previewSource);
        }
    }

    if (document.head.querySelector(`style[data-choices-value="${escapedValue}"]`)) return;

    const style = document.createElement("style");
    style.dataset.choicesValue = escapedValue;
    style.textContent = isImageUrl
        ? `.choices__item[data-value="${escapedValue}"]::after {
                content: "";
                background-image: url(${JSON.stringify(img)});
            }`
        : `.choices__item[data-value="${escapedValue}"]::after {
                content: ${JSON.stringify(img)} !important;
                background-image: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }`;

    document.head.appendChild(style);
}

function emojiPreviewSource(emoji) {
    const text = String(emoji ?? '').trim();
    if (!text) return '';

    const escapedText = text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><rect width="320" height="220" rx="12" fill="#111827"/><text x="160" y="114" text-anchor="middle" dominant-baseline="middle" font-size="96" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${escapedText}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

//#endregion

//#region Image preview on hover (file sources: page image, screenshot)

const previewByValue = new Map();
let hoverPreviewHandlersAdded = false;
let previewElement = null;
let previewImage = null;
let previewCurrentValue = null;

const getChoiceItem = (target) => target?.closest?.('.choices__item[data-value]') || null;

function ensureHoverPreviewHandlers() {
    if (hoverPreviewHandlersAdded) return;
    hoverPreviewHandlersAdded = true;

    document.addEventListener('mouseover', (event) => {
        const item = getChoiceItem(event.target);
        if (!item) return;

        const value = item.getAttribute('data-value') || '';
        const previewUrl = previewByValue.get(value);
        if (!previewUrl) return;

        if (!previewElement) {
            previewElement = document.createElement('div');
            previewElement.className = 'choice-image-preview';
            previewImage = document.createElement('img');
            previewImage.className = 'choice-image-preview-image';
            previewElement.appendChild(previewImage);
            document.body.appendChild(previewElement);
        }

        previewCurrentValue = value;
        previewImage.src = previewUrl;
        previewElement.style.display = 'block';
        updatePreviewPosition(event);
    });

    document.addEventListener('mousemove', updatePreviewPosition);

    document.addEventListener('mouseout', (event) => {
        const item = getChoiceItem(event.target);
        if (!item || getChoiceItem(event.relatedTarget) === item) return;

        if ((item.getAttribute('data-value') || '') === previewCurrentValue && previewElement) {
            previewElement.style.display = 'none';
            previewCurrentValue = null;
        }
    });
}

function updatePreviewPosition(event) {
    if (!previewElement || previewElement.style.display === 'none') return;

    const offsetX = -50;
    const offsetY = 18;
    const maxLeft = Math.max(0, window.innerWidth - previewElement.offsetWidth - 8);
    const maxTop = Math.max(0, window.innerHeight - previewElement.offsetHeight - 8);

    previewElement.style.left = `${Math.min(maxLeft, event.clientX + offsetX)}px`;
    previewElement.style.top = `${Math.min(maxTop, event.clientY + offsetY)}px`;
}

//#endregion

//#region Tag colors

// Choices with the Anytype tag color (option attribute "prefered-color"): a dot in the dropdown list, a background for selected items
export function createColoredChoices(selectElement, { clearSelection = false, removeItemButton = true, searchEnabled = true } = {}) {
    const choicesInstance = createChoices(selectElement, { removeItemButton, searchEnabled });

    const container = selectElement.closest('.choices') || selectElement.parentElement;

    const applyColors = () => {
        container.querySelectorAll('.choices__item[data-value]').forEach(item => {
            const option = selectElement.querySelector(`option[value="${CSS.escape(item.getAttribute('data-value'))}"]`);
            const color = normalizeColor(option?.getAttribute('prefered-color'));
            if (!color) return;

            if (item.hasAttribute('data-choice')) {
                let colorDot = item.querySelector('.choice-color-dot');
                if (!colorDot) {
                    colorDot = document.createElement('span');
                    colorDot.className = 'choice-color-dot';
                    item.insertBefore(colorDot, item.firstChild);
                }
                colorDot.style.backgroundColor = color;
            } else {
                item.style.backgroundColor = color;
            }
        });
    };

    applyColors();
    new MutationObserver(applyColors).observe(container, { childList: true, subtree: true });

    if (clearSelection) choicesInstance.removeActiveItems();

    return choicesInstance;
}

//#endregion
