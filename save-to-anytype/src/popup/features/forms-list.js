// Main section: the list of saved forms (open, reorder, delete)
import { elements, escapeHtml, createElementFromHtml } from '../core/dom.js';
import { state, saveState, findForm } from '../core/state.js';
import { showSection, SECTIONS } from '../ui/sections.js';
import { getFormDisplayName } from './form-properties.js';
import { openSaveObject } from './object-saver.js';

let sortable = null;
let startActionDone = false;
let formIdToDelete = null;

export function initFormsList() {
    elements.deleteFormBtn.addEventListener('click', deletePendingForm);
}

export function showMainSection() {
    renderForms();
    showSection(SECTIONS.main);
    runStartActionOnce();
}

function renderForms() {
    sortable?.destroy();
    sortable = null;

    const container = elements.handlerForLoadedForms;
    container.innerHTML = '';

    const canReorder = state.forms.length > 1;

    for (const form of state.forms) {
        const item = createElementFromHtml(`
            <div class="formObject flex-space-between" data-form-id="${escapeHtml(form.formId)}">
                ${canReorder ? '<div class="reorderFormButton"><div class="dots-icon"></div></div>' : ''}
                <button class="btn-primary flex1">
                    <span>${escapeHtml(getFormDisplayName(form))}</span>
                </button>
                <div class="trash-icon"></div>
            </div>`);

        item.querySelector('button').addEventListener('click', () => openSaveObject(form));
        item.querySelector('.trash-icon').addEventListener('click', () => confirmDeleteForm(form));

        container.appendChild(item);
    }

    if (canReorder) {
        sortable = Sortable.create(container, {
            animation: 150,
            scroll: true,
            handle: '.reorderFormButton',
            onUpdate: () => {
                state.forms = Array.from(container.querySelectorAll('.formObject'))
                    .map(formElement => findForm(formElement.dataset.formId))
                    .filter(Boolean);

                saveState();
            }
        });
    }
}

// "What to do on start" setting, only when the popup is just opened
function runStartActionOnce() {
    if (startActionDone) return;
    startActionDone = true;

    let form = null;
    if (state.whatDoOnStart === "OpenFirstForm")
        form = state.forms[0] || null;
    else if (state.whatDoOnStart === "OpenLastUsedForm" && state.LastUsedForm)
        form = findForm(state.LastUsedForm);

    if (form) openSaveObject(form);
}

function confirmDeleteForm(form) {
    formIdToDelete = form.formId;
    showSection(SECTIONS.confirmDeleteForm);
}

async function deletePendingForm() {
    if (formIdToDelete === null) return;

    state.forms = state.forms.filter(form => String(form.formId) !== String(formIdToDelete));
    if (String(state.LastUsedForm) === String(formIdToDelete))
        state.LastUsedForm = null;

    formIdToDelete = null;
    await saveState();

    showMainSection();
}
