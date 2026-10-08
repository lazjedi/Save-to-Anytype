export const API_BASE_URL = 'http://localhost:31009/v1';
export const API_VERSION = '2025-11-08';

export const GITHUB_URL = 'https://github.com/lazjedi/Save-to-Anytype';
export const ANYTYPE_APP_URL = 'anytype://';

export const DEFAULT_ACCENT_COLOR = '#ff3030ff';
export const FILLED_FIELDS_TOGGLE_SYMBOL = '^';

export const TEXTAREA_HEIGHT_PX = Object.freeze({ DEFAULT: 140, MIN: 100, MAX: 600 });

export const DEFAULT_FILE_NAME_FORMAT = '<date>-<tab_title>';
export const MAX_FILE_NAME_LENGTH = 60;

// The text selected with the context menu is used only if the popup is opened right after it
export const SELECTED_TEXT_LIFETIME_MS = 5000;

// Pseudo-properties of a form, they are not Anytype properties. Ids and keys are stored in saved forms - don't change them
export const NAME_PROPERTY = Object.freeze({ id: 'nameId', key: 'nameKeySaveToAnytype', format: 'text' });
export const BODY_PROPERTY = Object.freeze({ id: 'objectBodyId', key: 'objectBodyKeySaveToAnytype', format: 'text' });
export const DESCRIPTION_PROPERTY = Object.freeze({ id: 'descriptionId', key: 'description', format: 'text' });
export const COLLECTION_FIELD = Object.freeze({ id: 'CollectionPrintedSaveToAnytype', key: 'CollectionPrintedSaveToAnytype' });
export const TEMPLATE_FIELD = Object.freeze({ id: 'TemplatePrintedSaveToAnytype', key: 'TemplatePrintedSaveToAnytype' });

// Read-only properties filled by Anytype itself, they can't be set when an object is created
export const READ_ONLY_PROPERTY_KEYS = new Set([
    'creator',
    'created_date',
    'last_modified_by',
    'last_modified_date',
    'last_opened_date',
    'added_date',
    'backlinks',
    'links'
]);

// Formats whose value is taken from the page (title, url, description...)
export const PAGE_VALUE_FORMATS = new Set(['text', 'email', 'number', 'url', 'date', 'checkbox', 'phone']);

export const COMMON_TYPE_KEYS = ['page', 'note', 'task', 'bookmark'];

// Maximum number of objects shown in "objects" properties (the most recently modified ones)
export const MAX_OBJECTS_IN_LIST = 1000;
