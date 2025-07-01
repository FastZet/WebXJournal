// src/ui.js

const selectors = {
    appContentContainer: '#app-content-container', // New selector for the main app content area
    authSection: '#authSection',
    mainJournalSection: '#mainJournalSection',
    journalEntryListSection: '#journalEntryListSection',
    journalEntryEditorSection: '#journalEntryEditorSection',
    journalEntriesList: '#journalEntriesList',
    journalEntryForm: '#journalEntryForm',
    journalEntryTitle: '#journalEntryTitle',
    journalEntryContent: '#journalEntryContent',
    messageContainer: '#messageContainer',
    loadingOverlay: '#loadingOverlay',
    loginRegisterContainer: '#loginRegisterContainer', // Selector for the form container
    registerForm: '#registerForm',
    loginForm: '#loginForm',
    showLoginLink: '#showLogin',
    showRegisterLink: '#showRegister'
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
 * This function now also injects the HTML for the forms.
 * @param {boolean} showRegisterDefault - If true, shows register form by default; otherwise, login.
 */
export function renderAuthForms(showRegisterDefault = true) {
    hideElement(selectors.loadingOverlay); // Ensure loading overlay is hidden

    // Show the main app content container
    showElement(selectors.appContentContainer);

    hideElement(selectors.mainJournalSection);
    showElement(selectors.authSection);

    const container = document.querySelector(selectors.loginRegisterContainer);
    if (container) {
        container.innerHTML = `
            <form id="registerForm" class="space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-white">Register</h2>
                <input type="password" id="registerMasterPassword" name="masterPassword" required class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Master Password">
                <input type="password" id="registerConfirmPassword" name="confirmPassword" required class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Confirm Password">
                <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Register</button>
                <p class="text-center text-sm text-gray-400">Already have an account? <a href="#" id="showLogin" class="font-medium text-blue-500 hover:text-blue-400">Log In</a></p>
            </form>

            <form id="loginForm" class="space-y-6 bg-gray-800 p-8 rounded-lg shadow-xl border border-gray-700 hidden">
                <h2 class="mt-6 text-center text-3xl font-extrabold text-white">Login</h2>
                <input type="password" id="loginMasterPassword" name="masterPassword" required class="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-400 text-white bg-gray-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Master Password">
                <button type="submit" class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Login</button>
                <p class="text-center text-sm text-gray-400">Don't have an account? <a href="#" id="showRegister" class="font-medium text-blue-500 hover:text-blue-400">Register</a></p>
            </form>
        `;

        // Set initial form visibility
        const registerForm = document.querySelector(selectors.registerForm);
        const loginForm = document.querySelector(selectors.loginForm);

        if (showRegisterDefault) {
            showElement(selectors.registerForm);
            hideElement(selectors.loginForm);
        } else {
            showElement(selectors.loginForm);
            hideElement(selectors.registerForm);
        }

        // Add event listeners for toggling forms
        document.querySelector(selectors.showLoginLink)?.addEventListener('click', (e) => {
            e.preventDefault();
            showElement(selectors.loginForm);
            hideElement(selectors.registerForm);
            displayMessage('', 'info'); // Clear any previous messages
        });

        document.querySelector(selectors.showRegisterLink)?.addEventListener('click', (e) => {
            e.preventDefault();
            showElement(selectors.registerForm);
            hideElement(selectors.loginForm);
            displayMessage('', 'info'); // Clear any previous messages
        });
    }
}

/**
 * Renders the main journal application interface.
 */
export function renderMainJournalApp() {
    hideElement(selectors.loadingOverlay); // Ensure loading overlay is hidden
    showElement(selectors.appContentContainer); // Show the main app content container

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
    // Remove previous type classes
    container.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500', 'text-white');
    container.classList.add(
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500',
        'text-white'
    );
    showElement(selectors.messageContainer);

    // Auto-hide messages after 5 seconds, except for errors
    if (type !== 'error' && message !== '') { // Only hide if message is not empty
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
    hideElement(selectors.appContentContainer); // Hide app content when loading
}

/**
 * Hides the loading overlay.
 */
export function hideLoadingOverlay() {
    hideElement(selectors.loadingOverlay);
    // Note: appContentContainer is shown by renderAuthForms or renderMainJournalApp
}
