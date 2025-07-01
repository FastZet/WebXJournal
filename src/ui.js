// src/ui.js

const selectors = {
    authSection: '#authSection',
    mainJournalSection: '#mainJournalSection',
    journalEntryListSection: '#journalEntryListSection',
    journalEntryEditorSection: '#journalEntryEditorSection',
    journalEntriesList: '#journalEntriesList',
    journalEntryForm: '#journalEntryForm',
    journalEntryTitle: '#journalEntryTitle',
    journalEntryContent: '#journalEntryContent',
    messageContainer: '#messageContainer',
    loadingOverlay: '#loadingOverlay'
};

/**
 * Hides an HTML element.
 * @param {string} selector - The CSS selector of the element to hide.
 */
export function hideElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Shows an HTML element.
 * @param {string} selector - The CSS selector of the element to show.
 */
export function showElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Toggles the visibility of an HTML element.
 * @param {string} selector - The CSS selector of the element to toggle.
 */
export function toggleVisibility(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.classList.toggle('hidden');
    }
}

/**
 * Renders the authentication forms (login/register).
 */
export function renderAuthForms() {
    hideElement(selectors.mainJournalSection);
    showElement(selectors.authSection);
}

/**
 * Renders the main journal application interface.
 */
export function renderMainJournalApp() {
    hideElement(selectors.authSection);
    showElement(selectors.mainJournalSection);
    showElement(selectors.journalEntryListSection); // Default view
    hideElement(selectors.journalEntryEditorSection); // Hide editor by default
}

/**
 * Displays a message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('success', 'error', 'info').
 */
export function displayMessage(message, type = 'info') {
    const container = document.querySelector(selectors.messageContainer);
    if (!container) {
        console.warn('Message container not initialized. Message will be logged only:', message);
        console.log(`Message: ${message} (Type: ${type})`);
        return;
    }
    container.textContent = message;
    container.className = `p-3 rounded-md text-center text-sm ${type === 'success' ? 'bg-green-500 text-white' : type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`;
    showElement(selectors.messageContainer);

    // Auto-hide messages after 5 seconds, except for errors
    if (type !== 'error') {
        setTimeout(() => {
            hideElement(selectors.messageContainer);
        }, 5000);
    }
}

/**
 * Shows the journal entry editor.
 * @param {string} mode - 'new' for new entry, 'edit' for existing.
 */
export function showJournalEntryEditor(mode = 'new') {
    hideElement(selectors.journalEntryListSection);
    showElement(selectors.journalEntryEditorSection);
    const formTitle = document.getElementById('entryFormTitle');
    if (formTitle) {
        formTitle.textContent = mode === 'new' ? 'New Journal Entry' : 'Edit Journal Entry';
    }
}

/**
 * Clears the journal entry form.
 */
export function clearJournalEntryForm() {
    const form = document.querySelector(selectors.journalEntryForm);
    if (form) {
        form.reset();
    }
    const titleInput = document.querySelector(selectors.journalEntryTitle);
    const contentInput = document.querySelector(selectors.journalEntryContent);
    if (titleInput) titleInput.value = '';
    if (contentInput) contentInput.value = '';
}

/**
 * Shows the list of journal entries.
 */
export function showJournalEntriesList() {
    hideElement(selectors.journalEntryEditorSection);
    showElement(selectors.journalEntryListSection);
}

/**
 * Populates the journal entry form with data for editing.
 * @param {string} title - The title of the entry.
 * @param {string} content - The content of the entry.
 */
export function populateJournalEntryForm(title, content) {
    const titleInput = document.querySelector(selectors.journalEntryTitle);
    const contentInput = document.querySelector(selectors.journalEntryContent);
    if (titleInput) titleInput.value = title;
    if (contentInput) contentInput.value = content;
}

/**
 * Renders the list of journal entries.
 * @param {Array<object>} entries - An array of journal entry objects.
 */
export function renderJournalEntriesList(entries) {
    const listContainer = document.querySelector(selectors.journalEntriesList);
    if (!listContainer) {
        console.error('Journal entries list container not found.');
        return;
    }
    listContainer.innerHTML = ''; // Clear existing entries

    if (entries.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-400 text-center py-4">No entries yet. Click "New Entry" to add one.</p>';
        return;
    }

    entries.forEach(entry => {
        const entryDate = new Date(parseInt(entry.timestamp)).toLocaleString();
        const listItem = document.createElement('div');
        listItem.className = 'bg-gray-700 p-4 rounded-lg shadow-md mb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center';
        listItem.innerHTML = `
            <div class="flex-grow mb-2 sm:mb-0">
                <h3 class="text-lg font-semibold text-blue-300 break-words">${entry.title}</h3>
                <p class="text-sm text-gray-400">${entryDate}</p>
            </div>
            <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button class="edit-entry-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200" data-id="${entry.id}">Edit</button>
                <button class="delete-entry-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors duration-200" data-id="${entry.id}">Delete</button>
            </div>
        `;
        listContainer.appendChild(listItem);
    });
}

/**
 * Shows the loading overlay.
 */
export function showLoadingOverlay() {
    showElement(selectors.loadingOverlay);
}

/**
 * Hides the loading overlay.
 */
export function hideLoadingOverlay() {
    hideElement(selectors.loadingOverlay);
}
