// src/ui.js

/**
 * @fileoverview Manages all user interface rendering and interactions for WebX Journal.
 * This module is responsible for dynamically updating the DOM based on application state.
 */

import * as auth from './auth.js';
import * as utils from './utils.js'; // For utility functions like displayMessage

// CurrentEditingEntryId and mainJournalApp methods will now communicate via window.WebXJournal
let currentEditingEntryId = null; // To store the ID of the entry being edited

// --- Global UI Elements (now including form inputs and session timer) ---
let journalEntryTitleInput;   // Declared globally
let journalEntryContentInput; // Declared globally
let sessionTimerInterval;
let sessionTimeoutId; // For the inactivity timeout

const SESSION_DURATION_SECONDS = 300; // Changed to 5 minutes (300 seconds)
let timeLeft = SESSION_DURATION_SECONDS;
let warningShown = false; // Flag to ensure warning is shown only once per session

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

// New element for timeout warning popup
const warningPopup = document.createElement('div');
warningPopup.id = 'timeout-warning-popup';
warningPopup.className = 'fixed bottom-4 right-4 bg-yellow-800 text-white p-4 rounded-lg shadow-xl z-50 hidden';
warningPopup.innerHTML = `
    <p class="font-bold mb-2">Session expiring soon!</p>
    <p class="text-sm">Your session will end in <span id="warning-countdown"></span>. Please save any unsaved work.</p>
    <button id="dismiss-warning" class="mt-3 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-xs">Dismiss</button>
`;
document.body.appendChild(warningPopup);

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
 * Generates the default journal entry title with date and time.
 * @returns {string} The default title in "Journal_Entry_YYYYMMDD_HHMMSS" format.
 */
function getDefaultJournalTitle() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    const seconds = String(today.getSeconds()).padStart(2, '0');
    return `Journal_Entry_${year}${month}${day}_${hours}${minutes}${seconds}`;
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
                    <span id="session-timer" class="text-gray-400 text-sm">Session: --:--</span>
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

    // Assign global element references after rendering
    const journalEntryForm = document.getElementById('journal-entry-form'); // This is still local but used once
    journalEntryTitleInput = document.getElementById('journal-entry-title');   // Assign to global variable
    journalEntryContentInput = document.getElementById('journal-entry-content'); // Assign to global variable

    // Set default journal entry title
    journalEntryTitleInput.value = getDefaultJournalTitle();

    // Attach event listeners
    document.getElementById('logout-button').addEventListener('click', () => {
        auth.logoutUser();
        renderLoginForm(container); // Go back to login screen
        utils.displayMessage('You have been logged out.', 'text-blue-300 bg-gray-700');
        stopSessionTimer(); // Stop timer on logout
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

    // Start session timer when main app is rendered
    startSessionTimer();

    // Load existing entries after rendering the main app
    window.WebXJournal.loadJournalEntries();
}

/**
 * Starts the session timer and sets up inactivity logout.
 */
function startSessionTimer() {
    // Clear any existing timers
    clearInterval(sessionTimerInterval);
    clearTimeout(sessionTimeoutId);

    timeLeft = SESSION_DURATION_SECONDS; // Reset time
    warningShown = false; // Reset warning flag
    hideWarningPopup(); // Ensure warning is hidden on new session start

    const sessionTimerElement = document.getElementById('session-timer');
    if (sessionTimerElement) {
        // Initial display
        const initialMinutes = Math.floor(timeLeft / 60);
        const initialSeconds = timeLeft % 60;
        sessionTimerElement.textContent = `Session: ${String(initialMinutes).padStart(2, '0')}:${String(initialSeconds).padStart(2, '0')}`;
    }

    // Update timer display every second
    sessionTimerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            if (sessionTimerElement) {
                sessionTimerElement.textContent = `Session: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            // Show warning popup in the last minute
            if (timeLeft <= 60 && !warningShown) {
                showWarningPopup();
            }
        } else {
            clearInterval(sessionTimerInterval);
            if (auth.getAuthStatus().isLoggedIn) { // Only logout if still logged in
                auth.logoutUser();
                renderLoginForm(document.getElementById('app-content-container'));
                utils.displayMessage('Session timed out. Please log in again.', 'text-red-400 bg-red-800');
            }
            hideWarningPopup(); // Hide warning when session ends
        }
    }, 1000);

    // Set up inactivity reset
    resetSessionTimeout();

    // Add activity listeners to reset timeout
    document.addEventListener('mousemove', resetSessionTimeout);
    document.addEventListener('keydown', resetSessionTimeout);
    document.addEventListener('click', resetSessionTimeout);
    document.addEventListener('scroll', resetSessionTimeout);

    // Event listener for dismissing the warning
    document.getElementById('dismiss-warning').addEventListener('click', hideWarningPopup);
}

/**
 * Resets the inactivity timeout, extending the session.
 */
function resetSessionTimeout() {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = setTimeout(() => {
        // If the timer is still running and no activity for a while, trigger logout
        if (timeLeft > 0 && auth.getAuthStatus().isLoggedIn) {
            clearInterval(sessionTimerInterval); // Stop the display timer
            auth.logoutUser();
            renderLoginForm(document.getElementById('app-content-container'));
            utils.displayMessage('You were logged out due to inactivity.', 'text-red-400 bg-red-800');
            hideWarningPopup(); // Hide warning on actual logout
        }
    }, (SESSION_DURATION_SECONDS + 5) * 1000); // Give a small buffer (5 seconds) after display runs out

    // Also reset the display timer if activity happens before session ends
    if (timeLeft < SESSION_DURATION_SECONDS) { // Only reset if not already at full time
        timeLeft = SESSION_DURATION_SECONDS;
        warningShown = false; // Reset warning flag if user becomes active again
        hideWarningPopup();
        const sessionTimerElement = document.getElementById('session-timer');
        if (sessionTimerElement) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            sessionTimerElement.textContent = `Session: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }
}

/**
 * Displays the session timeout warning popup.
 */
function showWarningPopup() {
    warningPopup.classList.remove('hidden');
    warningShown = true;
    const countdownElement = document.getElementById('warning-countdown');
    if (countdownElement) {
        countdownElement.textContent = `${timeLeft} seconds`;
    }
    // Update countdown in popup
    const popupCountdownInterval = setInterval(() => {
        if (timeLeft > 0 && warningPopup.classList.contains('hidden') === false) {
            countdownElement.textContent = `${timeLeft} seconds`;
        } else {
            clearInterval(popupCountdownInterval);
        }
    }, 1000);
}

/**
 * Hides the session timeout warning popup.
 */
function hideWarningPopup() {
    warningPopup.classList.add('hidden');
}


/**
 * Stops the session timer. Call this on logout.
 */
function stopSessionTimer() {
    clearInterval(sessionTimerInterval);
    clearTimeout(sessionTimeoutId);
    const sessionTimerElement = document.getElementById('session-timer');
    if (sessionTimerElement) {
        sessionTimerElement.textContent = 'Session: --:--';
    }
    hideWarningPopup();
    warningShown = false; // Reset flag
    // Remove activity listeners to prevent memory leaks if app state changes significantly
    document.removeEventListener('mousemove', resetSessionTimeout);
    document.removeEventListener('keydown', resetSessionTimeout);
    document.removeEventListener('click', resetSessionTimeout);
    document.removeEventListener('scroll', resetSessionTimeout);
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
            <button class="view-entry-button bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm" data-id="${entry.id}">View Full</button>
            <button class="edit-entry-button bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-md text-sm" data-id="${entry.id}">Edit</button>
            <button class="delete-entry-button bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm" data-id="${entry.id}">Delete</button>
        </div>
    `;

    // Add event listeners for buttons
    entryElement.querySelector('.view-entry-button').addEventListener('click', () => {
        renderFullEntryView(entry); // Call new function for full view
    });

    entryElement.querySelector('.edit-entry-button').addEventListener('click', () => {
        // Populate the form for editing
        // These now refer to the globally declared variables
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
 * Renders the full view of a single journal entry in place of the list.
 * @param {object} entry The journal entry object to display.
 */
function renderFullEntryView(entry) {
    const journalListContainer = document.getElementById('journal-entries-list');
    if (!journalListContainer) {
        console.error('Journal entries list container not found for full view.');
        return;
    }

    const date = new Date(entry.timestamp);
    const formattedDate = date.toLocaleString();

    journalListContainer.innerHTML = `
        <div class="full-entry-view bg-gray-800 p-6 rounded-lg shadow-xl border-l-4 border-indigo-600">
            <button id="back-to-list-button" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm mb-4">
                ← Back to All Entries
            </button>
            <h3 class="text-3xl font-bold mb-4 text-indigo-300">${utils.escapeHTML(entry.title)}</h3>
            <p class="text-md text-gray-400 mb-6 border-b border-gray-700 pb-3">${formattedDate}</p>
            <div class="prose prose-invert text-gray-200 leading-relaxed mb-8">
                <p>${utils.escapeHTML(entry.content).replace(/\n/g, '<br>')}</p>
            </div>
            <div class="flex space-x-2">
                <button class="edit-entry-button-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm" data-id="${entry.id}">Edit This Entry</button>
                <button class="delete-entry-button-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm" data-id="${entry.id}">Delete This Entry</button>
            </div>
        </div>
    `;

    document.getElementById('back-to-list-button').addEventListener('click', () => {
        window.WebXJournal.loadJournalEntries(); // Re-load all entries to show the list again
    });

    // Attach edit/delete listeners for the full view as well
    document.querySelector('.edit-entry-button-full').addEventListener('click', () => {
        // Populate the form for editing
        journalEntryTitleInput.value = entry.title;
        journalEntryContentInput.value = entry.content;
        currentEditingEntryId = entry.id; // Set the ID of the entry being edited
        document.getElementById('save-entry-button').textContent = 'Update Entry';
        journalEntryTitleInput.focus();
        utils.displayMessage(`Editing entry: "${entry.title}"`, 'text-blue-300 bg-gray-700');
        // Scroll to top of the page or entry form if necessary
        document.getElementById('journal-entry-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.querySelector('.delete-entry-button-full').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete "${entry.title}"?`)) {
            await window.WebXJournal.deleteJournalEntry(entry.id);
            // After deletion, go back to the list view
            window.WebXJournal.loadJournalEntries();
        }
    });
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
