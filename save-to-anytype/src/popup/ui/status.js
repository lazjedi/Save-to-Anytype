import { elements } from '../core/dom.js';

const STATUS_HIDE_DELAY_MS = 3000;
let hideTimer = null;

// Errors stay visible, other messages are hidden after a delay
export function showStatus(message, type = 'info') {
    const status = elements.status;

    status.textContent = message;
    status.className = `status ${type}`;

    clearTimeout(hideTimer);
    hideTimer = null;

    if (type !== 'error')
        hideTimer = setTimeout(() => status.classList.add('hidden'), STATUS_HIDE_DELAY_MS);
}
