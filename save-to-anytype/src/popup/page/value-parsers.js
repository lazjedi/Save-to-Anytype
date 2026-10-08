// Text taken from the page (an element, the title...) converted to the format of an Anytype property.
// The Anytype API accepts: number - a JSON number; date - "2006-01-02" or RFC3339; text, url, email, phone - any string

const twoDigits = (number) => String(number).padStart(2, '0');

//#region Number

// "456", "number with text 456", "1 234,5 USD", "1,234.56", "-12" -> number; null when there are no digits
export function parseNumber(value) {
    const text = String(value ?? '').replace(/[\s  ']/g, '');
    const match = text.match(/-?\d[\d.,]*/);
    if (!match) return null;

    let numberText = match[0].replace(/[.,]+$/, '');
    const lastComma = numberText.lastIndexOf(',');
    const lastDot = numberText.lastIndexOf('.');

    if (lastComma !== -1 && lastDot !== -1) {
        // Both separators: the last one is the decimal separator
        const decimalSeparator = lastComma > lastDot ? ',' : '.';
        const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
        numberText = numberText.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
    } else if (lastComma !== -1 || lastDot !== -1) {
        const separator = lastComma !== -1 ? ',' : '.';
        const groups = numberText.split(separator);

        // "1.234.567" or "1,234" are thousands, "1,5" and "3.14" are decimals
        const isThousands = groups.length > 2 || (separator === ',' && groups[1].length === 3 && !/^-?0$/.test(groups[0]));
        numberText = isThousands ? groups.join('') : groups.join('.');
    }

    const number = Number(numberText);
    return Number.isFinite(number) ? number : null;
}

//#endregion

//#region Date

function isValidDate(year, month, day) {
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function formatDate(year, month, day) {
    return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
}

function normalizeYear(year) {
    if (year >= 100) return year;
    return year < 70 ? 2000 + year : 1900 + year;
}

// Month first only for "/" dates in US-like locales, unless the numbers make it obvious
function isMonthFirst(first, second, separator) {
    if (first > 12) return false;
    if (second > 12) return true;
    return separator === '/' && /^en-(US|PH|CA)$/i.test(navigator.language || '');
}

// "22.05.2021", "22-08-2022", "2021-05-22", "5/22/2021", "22 May 2021", "May 22, 2021" -> "2021-05-22"; '' when not a date
export function parseDate(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';

    // year first: 2021-05-22, 2021.05.22, 2021/05/22 (also the start of RFC3339)
    let match = text.match(/(?<!\d)(\d{4})([-./])(\d{1,2})\2(\d{1,2})(?!\d)/);
    if (match) {
        const [year, month, day] = [Number(match[1]), Number(match[3]), Number(match[4])];
        if (isValidDate(year, month, day)) return formatDate(year, month, day);
    }

    // day / month first: 22.05.2021, 22-08-2022, 5/22/2021, 22.05.21
    match = text.match(/(?<!\d)(\d{1,2})([-./])(\d{1,2})\2(\d{4}|\d{2})(?!\d)/);
    if (match) {
        const first = Number(match[1]);
        const second = Number(match[3]);
        const year = normalizeYear(Number(match[4]));
        const [month, day] = isMonthFirst(first, second, match[2]) ? [first, second] : [second, first];
        if (isValidDate(year, month, day)) return formatDate(year, month, day);
    }

    // Dates with month names ("22 May 2021", "May 22, 2021") - only short texts, Date.parse accepts too much
    if (text.length <= 40 && /[a-z]{3,}/i.test(text) && /\d{4}/.test(text)) {
        const date = new Date(text);
        if (!Number.isNaN(date.getTime()))
            return formatDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    }

    return '';
}

//#endregion

//#region Text formats

// The first match of the pattern, or the whole trimmed text when there is no match
function extract(value, pattern) {
    const text = String(value ?? '').trim();
    return text.match(pattern)?.[0].trim() ?? text;
}

// "Phone: +7 (956) 357-43-51" -> "+7 (956) 357-43-51"
export function parsePhone(value) {
    return extract(value, /\+?\d[\d\s().-]{4,}\d/);
}

// "Mail me: test@gmail.com" -> "test@gmail.com"
export function parseEmail(value) {
    return extract(value, /[^\s@<>()[\]"',;:]+@[^\s@<>()[\]"',;:]+\.[a-z]{2,}/i);
}

// "Source: https://example.com/page." -> "https://example.com/page"
export function parseUrl(value) {
    return extract(value, /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)]/i);
}

//#endregion

// The value for an input of the property format (number and date inputs accept only valid values)
export function parsePageValue(format, value) {
    switch (format) {
        case 'number': return parseNumber(value) ?? '';
        case 'date': return parseDate(value);
        case 'phone': return parsePhone(value);
        case 'email': return parseEmail(value);
        case 'url': return parseUrl(value);
        default: return value;
    }
}
