// src/ui.js

/**
 * @fileoverview Manages all user interface rendering and interactions for WebX Journal.
 * This module is responsible for dynamically updating the DOM based on application state.
 */

import * as auth from './auth.js';
// Removed: import * as main from './main.js'; // No longer directly importing main.js
import * as utils from './utils.js'; // For utility functions like displayMessage

// CurrentEditingEntryId and mainJournalApp methods will now communicate via window.WebXJournal
let currentEditingEntryId = null; // To store the ID of the entry being edited

// --- Global UI Elements ---
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 hidden';
loadingOverlay.innerHTML = `
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl flex flex-col items-center">
        <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
        <p id="loading-message" class="text-white text-lg">Loading...</p>
    </div>
`;
document.body.appendChild(loadingOverlay);

const messageContainer = document.createElement('div');
messageContainer.id = 'message-container';
messageContainer.className = 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2 max-w-xs sm:max-w-md';
document.body.appendChild(messageContainer);


/**
 * Shows the loading overlay with an optional message.
 * @param {string} message The message to display on the loading overlay.
 */
export function showLoadingOverlay(message = 'Loading...') {
    const loadingMessageElement = document.getElementById('loading-message');
    if (loadingMessageElement) {
        loadingMessageElement.textContent = message;
    }
    loadingOverlay.classList.remove('hidden');
}

/**
 * Hides the loading overlay.
 */
export function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
}

/**
 * Generates the default journal entry title.
 * @returns {string} The default title in "Journal_Entry_YYYYMMDD" format.
 */
function getDefaultJournalTitle() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `Journal_Entry_${year}${month}${day}`;
}


/**
 * Renders the registration form.
 * @param {HTMLElement} container The DOM element to render the form into.
 */
export function renderRegisterForm(container) {
    container.innerHTML = `
        <div class="max-w-md mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-white">
            <h2 class="text-3xl font-bold mb-6 text-center">Register New Account</h2>
            <form id="register-form" class="space-y-4">
                <div>
                    <label for="reg-username" class="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" id="reg-username" name="username" required
                           class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100">
                </div>
                <div>
                    <label for="reg-password" class="block text-sm font-medium text-gray-300">Master Password</label>
                    <input type="password" id="reg-password" name="password" required
                           class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100">
                    <p class="mt-1 text-sm text-gray-400">Min 8 characters. This password encrypts all your data.</p>
                </div>
                <button type="submit"
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Register
                </button>
            </form>
            <p class="mt-6 text-center text-gray-400">
                Already have an account? <a href="#" id="show-login-link" class="font-medium text-indigo-400 hover:text-indigo-300">Login here</a>
            </p>
        </div>
    `;
    utils.initializeMessageContainer(messageContainer); // Initialize message container for this view

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const success = await auth.registerUser(username, password);
        if (success) {
            // UI update handled by registerUser -> renderMainJournalApp
        }
    });

    document.getElementById('show-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderLoginForm(container);
    });
}

/**
 * Renders the login form.
 * @param {HTMLElement} container The DOM element to render the form into.
 */
export function renderLoginForm(container) {
    container.innerHTML = `
        <div class="max-w-md mx-auto p-8 bg-gray-800 rounded-lg shadow-xl text-white">
            <h2 class="text-3xl font-bold mb-6 text-center">Login to WebX Journal</h2>
            <form id="login-form" class="space-y-4">
                <div>
                    <label for="login-username" class="block text-sm font-medium text-gray-300">Username</label>
                    <input type="text" id="login-username" name="username" required
                           class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100">
                </div>
                <div>
                    <label for="login-password" class="block text-sm font-medium text-gray-300">Master Password</label>
                    <input type="password" id="login-password" name="password" required
                           class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100">
                </div>
                <button type="submit"
                        class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Login
                </button>
            </form>
            <p class="mt-6 text-center text-gray-400">
                Don't have an account? <a href="#" id="show-register-link" class="font-medium text-indigo-400 hover:text-indigo-300">Register now</a>
            </p>
        </div>
    `;
    utils.initializeMessageContainer(messageContainer); // Initialize message container for this view

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        await auth.loginUser(username, password);
    });

    document.getElementById('show-register-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderRegisterForm(container);
    });
}

/**
 * Renders the main journal application interface after successful login/registration.
 * @param {HTMLElement} container The DOM element to render the app into.
 * @param {string} username The username of the logged-in user.
 */
export function renderMainJournalApp(container, username) {
    container.innerHTML = `
        <div class="flex flex-col h-screen bg-gray-900 text-gray-100">
            <header class="bg-gray-800 p-4 shadow-md flex justify-between items-center">
                <h1 class="text-2xl font-bold">WebX Journal</h1>
                <div class="flex items-center space-x-4">
                    <span class="text-gray-400">Logged in as: <span class="font-semibold text-white">${username}</span></span>
                    <button id="logout-button" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm">Logout</button>
                    <button id="export-button" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">Export Data</button>
                    <label for="import-file-input" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm cursor-pointer">
                        Import Data
                    </label>
                    <input type="file" id="import-file-input" accept=".webx, application/json" class="hidden">
                    <button id="delete-account-button" class="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm">Delete Account</button>
                </div>
            </header>

            <main class="flex flex-1 overflow-hidden">
                <section class="w-full lg:w-1/3 p-4 border-r border-gray-700 overflow-y-auto">
                    <h2 class="text-xl font-semibold mb-4">New Journal Entry</h2>
                    <form id="journal-entry-form" class="space-y-4">
                        <div>
                            <label for="journal-entry-title" class="block text-sm font-medium text-gray-300">Title</label>
                            <input type="text" id="journal-entry-title" required
                                   class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100">
                        </div>
                        <div>
                            <label for="journal-entry-content" class="block text-sm font-medium text-gray-300">Content</label>
                            <textarea id="journal-entry-content" rows="10" required
                                      class="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-100"></textarea>
                        </div>
                        <div class="flex space-x-2">
                            <button type="submit" id="save-entry-button"
                                    class="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Save Entry
                            </button>
                            <button type="button" id="clear-form-button"
                                    class="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-800 bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                Clear Form
                            </button>
                        </div>
                    </form>
                </section>

                <section class="w-full lg:w-2/3 p-4 overflow-y-auto">
                    <h2 class="text-xl font-semibold mb-4">Your Entries</h2>
                    <div id="journal-entries-list" class="space-y-4">
                        </div>
                </section>
            </main>
        </div>
    `;
    utils.initializeMessageContainer(messageContainer); // Initialize message container for this view

    // Cache element references after rendering
    const journalEntryForm = document.getElementById('journal-entry-form');
    const journalEntryTitleInput = document.getElementById('journal-entry-title');
    const journalEntryContentInput = document.getElementById('journal-entry-content');

    // Set default journal entry title
    journalEntryTitleInput.value = getDefaultJournalTitle();

    // Attach event listeners
    document.getElementById('logout-button').addEventListener('click', () => {
        auth.logoutUser();
        renderLoginForm(container); // Go back to login screen
        utils.displayMessage('You have been logged out.', 'text-blue-300 bg-gray-700');
    });

    document.getElementById('export-button').addEventListener('click', window.WebXJournal.exportJournalData);

    const importFileInput = document.getElementById('import-file-input');
    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            const password = prompt('Enter the master password for the backup file:');
            if (password) {
                await window.WebXJournal.importJournalData(file, password);
                importFileInput.value = ''; // Clear file input
            } else {
                utils.displayMessage('Import cancelled: Master password not provided.', 'text-red-400 bg-red-800');
            }
        }
    });

    document.getElementById('delete-account-button').addEventListener('click', async () => {
        const username = auth.getCurrentUsername();
        if (!username) {
            utils.displayMessage('No user is currently logged in.', 'text-red-400 bg-red-800');
            return;
        }
        const masterPassword = prompt(`To confirm account deletion for "${username}", please enter your master password:`);
        if (masterPassword) {
            await auth.deleteAccount(username, masterPassword);
        } else {
            utils.displayMessage('Account deletion cancelled: Master password not provided.', 'text-blue-300 bg-gray-700');
        }
    });

    journalEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = journalEntryTitleInput.value;
        const content = journalEntryContentInput.value;
        // THIS LINE IS THE FIX:
        await window.WebXJournal.saveJournalEntry(currentEditingEntryId, title, content);
        currentEditingEntryId = null; // Clear editing state after save
        document.getElementById('save-entry-button').textContent = 'Save Entry';
        // Re-set default title after saving a new entry
        journalEntryTitleInput.value = getDefaultJournalTitle();
        journalEntryContentInput.value = ''; // Clear content too for new entry
    });

    document.getElementById('clear-form-button').addEventListener('click', () => {
        journalEntryForm.reset();
        currentEditingEntryId = null;
        document.getElementById('save-entry-button').textContent = 'Save Entry';
        // Set default title on clear
        journalEntryTitleInput.value = getDefaultJournalTitle();
        journalEntryContentInput.value = '';
        utils.displayMessage('Form cleared.', 'text-blue-300 bg-gray-700');
    });

    // Load existing entries after rendering the main app
    // IMPORTANT: This call now correctly uses window.WebXJournal
    window.WebXJournal.loadJournalEntries();
}

/**
 * Renders a single journal entry into the list.
 * @param {object} entry The journal entry object.
 * @param {string} entry.id
 * @param {number} entry.timestamp
 * @param {string} entry.title
 * @param {string} entry.content
 * @param {boolean} [entry.isCorrupted=false] If true, indicates decryption failed.
 */
export function renderJournalEntry(entry) {
    const journalList = document.getElementById('journal-entries-list');
    if (!journalList) {
        console.error('Journal entries list not found.');
        return;
    }

    const entryElement = document.createElement('div');
    entryElement.id = `entry-${entry.id}`;
    entryElement.className = `journal-entry-item bg-gray-800 p-4 rounded-lg shadow-md transition-all duration-200 ease-in-out ${entry.isCorrupted ? 'border-l-4 border-red-500' : 'border-l-4 border-indigo-500'}`;

    const date = new Date(entry.timestamp);
    const formattedDate = date.toLocaleString(); // Adjust as needed for specific format

    entryElement.innerHTML = `
        <h3 class="text-xl font-semibold mb-2 text-indigo-300">${utils.escapeHTML(entry.title)}</h3>
        <p class="text-sm text-gray-400 mb-3">${formattedDate}</p>
        <div class="journal-content-preview text-gray-300 mb-4 overflow-hidden max-h-24 leading-relaxed">${utils.escapeHTML(entry.content)}</div>
        ${entry.isCorrupted ? '<p class="text-red-400 font-bold">This entry could not be decrypted.</p>' : ''}
        <div class="flex space-x-2">
            <button class="view-entry-button bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">View Full</button>
            <button class="edit-entry-button bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm" data-id="${entry.id}">Edit</button>
            <button class="delete-entry-button bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm" data-id="${entry.id}">Delete</button>
        </div>
    `;

    // Add event listeners for buttons
    entryElement.querySelector('.view-entry-button').addEventListener('click', () => {
        // Simple modal or alert for full view
        alert(`Title: ${entry.title}\n\nDate: ${formattedDate}\n\nContent:\n${entry.content}`);
    });

    entryElement.querySelector('.edit-entry-button').addEventListener('click', () => {
        // Populate the form for editing
        journalEntryTitleInput.value = entry.title;
        journalEntryContentInput.value = entry.content;
        currentEditingEntryId = entry.id; // Set the ID of the entry being edited
        document.getElementById('save-entry-button').textContent = 'Update Entry';
        journalEntryTitleInput.focus();
        utils.displayMessage(`Editing entry: "${entry.title}"`, 'text-blue-300 bg-gray-700');
    });

    entryElement.querySelector('.delete-entry-button').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${entry.title}"?`)) {
            // IMPORTANT: This call now correctly uses window.WebXJournal
            await window.WebXJournal.deleteJournalEntry(entry.id);
        }
    });

    // Insert new entries at the top of the list
    journalList.prepend(entryElement);
}

/**
 * Updates an existing journal entry's display in the list.
 * @param {object} updatedEntry The updated journal entry object.
 * @param {string} updatedEntry.id
 * @param {number} updatedEntry.timestamp
 * @param {string} updatedEntry.title
 * @param {string} updatedEntry.content
 */
export function updateJournalEntryInList(updatedEntry) {
    const existingElement = document.getElementById(`entry-${updatedEntry.id}`);
    if (existingElement) {
        // Remove the old element
        existingElement.remove();
    }
    // Re-render the entry, which will add it to the top
    renderJournalEntry(updatedEntry);
}

/**
 * Removes a journal entry from the display list.
 * @param {string} id The ID of the entry to remove.
 */
export function removeJournalEntryFromList(id) {
    const entryElement = document.getElementById(`entry-${id}`);
    if (entryElement) {
        entryElement.remove();
    }
}
