import { MAX_FILE_NAME_LENGTH } from '../core/constants.js';
import { state } from '../core/state.js';
import { getPageProperty } from './page-data.js';

const twoDigits = (value) => String(value).padStart(2, '0');

// Allowed in a file name format: letters, digits, _ + ( ) - and <token> brackets; spaces become "-"
export function sanitizeFileNameFormat(value) {
    return String(value ?? '')
        .replace(/ /g, '-')
        .replace(/[^\p{L}0-9_<>+()\-]/gu, '');
}

export function generateRandomId() {
    const now = new Date();

    const dateTime = now.getFullYear().toString()
        + twoDigits(now.getMonth() + 1)
        + twoDigits(now.getDate())
        + twoDigits(now.getHours())
        + twoDigits(now.getMinutes())
        + twoDigits(now.getSeconds());

    const randomNumber = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

    return dateTime + randomNumber;
}

// The setting is a list of quoted strings: "string1", "string2"
export function removeStringsFromTabTitle(tabTitle) {
    const setting = state.stringsRemovedFromTabTitle;
    let result = String(tabTitle ?? '');

    if (!setting || setting.trim().length === 0) return result;

    const quotedStringsRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
    for (const match of setting.matchAll(quotedStringsRegex)) {
        if (match[1]) result = result.split(match[1]).join('');
    }

    return result;
}

// Replaces <time>, <date>, <date_alt>, <random_id>, <site_name>, <tab_title> in a file name format
export async function buildFileName(fileNameFormat) {
    const now = new Date();
    const currentDate = `${twoDigits(now.getDate())}-${twoDigits(now.getMonth() + 1)}-${now.getFullYear()}`;

    const pageUrl = await getPageProperty('page_url');
    const tabTitle = removeStringsFromTabTitle(await getPageProperty('tab_title'));

    let siteName = '';
    try {
        siteName = new URL(pageUrl).hostname.replace(/^www\./i, '');
    } catch {
        siteName = '';
    }

    const tokenReplacements = {
        '<time>': `${twoDigits(now.getHours())}-${twoDigits(now.getMinutes())}`,
        '<date>': currentDate,
        '<date_alt>': `${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}-${now.getFullYear()}`,
        '<random_id>': generateRandomId(),
        '<site_name>': siteName,
        '<tab_title>': tabTitle
    };

    let result = String(fileNameFormat ?? '');
    for (const [token, replacement] of Object.entries(tokenReplacements)) {
        result = result.split(token).join(replacement);
    }

    result = sanitizeFileNameFormat(result).replace(/[<>]/g, '');

    return result ? result.slice(0, MAX_FILE_NAME_LENGTH) : currentDate;
}

// Keeps a file name format input valid while the user types or pastes
export function attachFileNameFormatInputGuard(input) {
    if (!input || input.dataset.fileNameFormatGuardAttached === 'true') return;
    input.dataset.fileNameFormatGuardAttached = 'true';

    const insertSanitizedText = (text) => {
        const sanitizedText = sanitizeFileNameFormat(text);
        if (!sanitizedText) return;

        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;

        input.setRangeText(sanitizedText, start, end, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    input.addEventListener('beforeinput', (event) => {
        if (event.inputType?.startsWith('insert') && typeof event.data === 'string' && sanitizeFileNameFormat(event.data) !== event.data) {
            event.preventDefault();
            insertSanitizedText(event.data);
        }
    });

    input.addEventListener('paste', (event) => {
        const pastedText = event.clipboardData?.getData('text') ?? '';

        if (sanitizeFileNameFormat(pastedText) !== pastedText) {
            event.preventDefault();
            insertSanitizedText(pastedText);
        }
    });

    input.addEventListener('input', () => {
        const sanitizedValue = sanitizeFileNameFormat(input.value);
        if (sanitizedValue !== input.value) input.value = sanitizedValue;
    });
}
