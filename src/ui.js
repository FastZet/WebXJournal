// src/ui.js

/**
 * @fileoverview Manages all user interface rendering functions for WebX Journal.
 * This module is responsible for dynamically injecting HTML forms and other UI elements
 * into the main application container.
 */

import { registerUser, loginUser } from './auth.js'; // Will be created next
import { displayMessage } from './utils.js'; // A new utility for messages

/**
 * Renders the user registration form into the specified container.
 * @param {HTMLElement} container The DOM element where the form should be rendered.
 */
export function renderRegisterForm(container) {
    container.innerHTML = `
        <div class="bg-gray-700 p-8 rounded-xl shadow-lg w-full max-w-sm mx-auto border border-gray-600">
            <h2 class="text-3xl font-bold text-white mb-6 text-center">Create Your Account</h2>
            <p class="text-gray-400 text-sm mb-6 text-center">
                This account is local to your device. Your Master Password encrypts everything.
                <span class="font-bold text-yellow-300">There is no recovery if forgotten!</span>
            </p>
            <form id="register-form" class="space-y-4">
                <div>
                    <label for="reg-username" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Username:</label>
                    <input type="text" id="reg-username" name="username"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Choose a username" required minlength="3">
                </div>
                <div>
                    <label for="reg-password" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Master Password:</label>
                    <input type="password" id="reg-password" name="password"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter a strong master password" required minlength="8">
                </div>
                <div>
                    <label for="reg-confirm-password" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Confirm Master Password:</label>
                    <input type="password" id="reg-confirm-password" name="confirmPassword"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Confirm your master password" required minlength="8">
                </div>
                <button type="submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 mt-4">
                    Register & Begin Journaling
                </button>
            </form>
            <div class="mt-6 text-center text-sm text-gray-400">
                Already have an account? <a href="#" id="show-login" class="text-blue-400 hover:text-blue-300 font-semibold transition duration-200">Log In</a>
            </div>
            <div class="mt-4 text-center text-sm text-gray-400">
                Or, <a href="#" id="show-import-register" class="text-yellow-400 hover:text-yellow-300 font-semibold transition duration-200">Import Existing Data</a>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        if (password !== confirmPassword) {
            displayMessage('Passwords do not match.', 'text-red-400 bg-red-800');
            return;
        }

        // Basic password strength check (can be expanded)
        if (password.length < 8) {
            displayMessage('Master Password must be at least 8 characters long.', 'text-red-400 bg-red-800');
            return;
        }

        displayMessage('Registering user...', 'text-blue-300');
        try {
            await registerUser(username, password);
            displayMessage('Registration successful! Redirecting to journal...', 'text-green-400 bg-green-800');
            // TODO: Redirect to main journal view
            console.log('User registered. Next: show main journal app.');
            renderMainJournalApp(container, username); // Temporary redirect to journal app
        } catch (error) {
            console.error('Registration error:', error);
            displayMessage(`Registration failed: ${error.message}`, 'text-red-400 bg-red-800');
        }
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        renderLoginForm(container);
    });

    document.getElementById('show-import-register').addEventListener('click', (e) => {
        e.preventDefault();
        renderImportForm(container); // Will be created later
    });
}

/**
 * Renders the user login form into the specified container.
 * @param {HTMLElement} container The DOM element where the form should be rendered.
 */
export function renderLoginForm(container) {
    container.innerHTML = `
        <div class="bg-gray-700 p-8 rounded-xl shadow-lg w-full max-w-sm mx-auto border border-gray-600">
            <h2 class="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h2>
            <p class="text-gray-400 text-sm mb-6 text-center">
                Enter your Master Password to decrypt and access your journal.
            </p>
            <form id="login-form" class="space-y-4">
                <div>
                    <label for="login-username" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Username:</label>
                    <input type="text" id="login-username" name="username"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Your username" required minlength="3">
                </div>
                <div>
                    <label for="login-password" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Master Password:</label>
                    <input type="password" id="login-password" name="password"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Your master password" required minlength="8">
                </div>
                <button type="submit"
                        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 mt-4">
                    Unlock Journal
                </button>
            </form>
            <div class="mt-6 text-center text-sm text-gray-400">
                New user? <a href="#" id="show-register" class="text-blue-400 hover:text-blue-300 font-semibold transition duration-200">Create Account</a>
            </div>
            <div class="mt-4 text-center text-sm text-gray-400">
                Or, <a href="#" id="show-import-login" class="text-yellow-400 hover:text-yellow-300 font-semibold transition duration-200">Import Existing Data</a>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        displayMessage('Attempting login...', 'text-blue-300');
        try {
            await loginUser(username, password);
            displayMessage('Login successful! Redirecting to journal...', 'text-green-400 bg-green-800');
            // TODO: Redirect to main journal view
            console.log('User logged in. Next: show main journal app.');
            renderMainJournalApp(container, username); // Temporary redirect
        } catch (error) {
            console.error('Login error:', error);
            displayMessage(`Login failed: ${error.message}`, 'text-red-400 bg-red-800');
        }
    });

    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        renderRegisterForm(container);
    });

    document.getElementById('show-import-login').addEventListener('click', (e) => {
        e.preventDefault();
        renderImportForm(container); // Will be created later
    });
}


/**
 * Renders a placeholder for the main journal application content.
 * This function will be expanded significantly in future steps.
 * @param {HTMLElement} container The DOM element where the app should be rendered.
 * @param {string} username The username of the currently logged-in user.
 */
export function renderMainJournalApp(container, username) {
    container.innerHTML = `
        <div class="bg-gray-700 p-8 rounded-xl shadow-lg w-full mx-auto border border-gray-600">
            <h2 class="text-3xl font-bold text-white mb-6 text-center">Hello, ${username}!</h2>
            <p class="text-gray-400 text-sm mb-6 text-center">
                Welcome to your private WebX Journal. This is where your entries will appear.
            </p>
            <div class="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button id="create-entry-button"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50">
                    Create New Entry
                </button>
                <button id="export-data-button"
                        class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-purple-500 focus:ring-opacity-50">
                    Export Data (.webx)
                </button>
                <button id="logout-button"
                        class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-red-500 focus:ring-opacity-50">
                    Logout
                </button>
            </div>

            <div id="journal-entries-list" class="mt-8 text-left space-y-4">
                <p class="text-gray-500">Your journal entries will be listed here...</p>
                <!-- Journal entries will be dynamically loaded here -->
            </div>
        </div>
    `;

    // Event Listeners for main app buttons
    document.getElementById('create-entry-button').addEventListener('click', () => {
        displayMessage('Create New Entry functionality coming soon!', 'text-yellow-300');
        // TODO: Implement journal entry creation form
    });

    document.getElementById('export-data-button').addEventListener('click', () => {
        displayMessage('Export Data functionality coming soon!', 'text-yellow-300');
        // TODO: Implement data export logic
    });

    document.getElementById('logout-button').addEventListener('click', () => {
        // Simple logout for now, will be more robust with session management
        displayMessage('Logging out...', 'text-blue-300');
        // Clear local session state (will be enhanced)
        // For now, simply reload to go back to login/register flow
        window.location.reload();
    });
}

/**
 * Renders the import data form into the specified container.
 * This form allows users to upload a .webx backup file.
 * @param {HTMLElement} container The DOM element where the form should be rendered.
 */
export function renderImportForm(container) {
    container.innerHTML = `
        <div class="bg-gray-700 p-8 rounded-xl shadow-lg w-full max-w-sm mx-auto border border-gray-600">
            <h2 class="text-3xl font-bold text-white mb-6 text-center">Import Journal Data</h2>
            <p class="text-gray-400 text-sm mb-6 text-center">
                Upload your encrypted `.webx` backup file and enter your Master Password.
            </p>
            <form id="import-form" class="space-y-4">
                <div>
                    <label for="import-file" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Select .webx File:</label>
                    <input type="file" id="import-file" name="importFile" accept=".webx"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                           required>
                </div>
                <div>
                    <label for="import-password" class="block text-gray-300 text-sm font-semibold mb-2 text-left">Master Password:</label>
                    <input type="password" id="import-password" name="masterPassword"
                           class="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500
                                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                           placeholder="Enter master password for the backup" required minlength="8">
                </div>
                <button type="submit"
                        class="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg
                               shadow-md transition duration-300 ease-in-out transform hover:scale-105
                               focus:outline-none focus:ring-4 focus:ring-yellow-500 focus:ring-opacity-50 mt-4">
                    Import Data
                </button>
            </form>
            <div class="mt-6 text-center text-sm text-gray-400">
                Go back to <a href="#" id="back-to-auth" class="text-blue-400 hover:text-blue-300 font-semibold transition duration-200">Login/Register</a>
            </div>
        </div>
    `;

    // Event listeners
    document.getElementById('import-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('import-file');
        const masterPassword = document.getElementById('import-password').value;

        if (fileInput.files.length === 0) {
            displayMessage('Please select a .webx backup file.', 'text-red-400 bg-red-800');
            return;
        }

        const file = fileInput.files[0];
        displayMessage('Importing data...', 'text-blue-300');

        try {
            // TODO: Implement the actual import logic using crypto and storage modules
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const encryptedBackupJson = event.target.result;
                    // For now, just log the content, actual decryption/import will come later
                    console.log('Encrypted backup content (raw):', encryptedBackupJson);
                    // This is where you'd call a function like `importEncryptedBackup(encryptedBackupJson, masterPassword)`
                    displayMessage('Backup file read. Decryption and data import logic coming soon!', 'text-yellow-300');
                    // After successful import, potentially redirect to the journal app
                    // renderMainJournalApp(container, "Imported User"); // Placeholder
                } catch (readError) {
                    displayMessage(`Error reading file: ${readError.message}`, 'text-red-400 bg-red-800');
                    console.error('File read error:', readError);
                }
            };
            reader.readAsText(file); // Read as text, assuming it's encrypted JSON string

        } catch (error) {
            console.error('Import process error:', error);
            displayMessage(`Import failed: ${error.message}`, 'text-red-400 bg-red-800');
        }
    });

    document.getElementById('back-to-auth').addEventListener('click', async (e) => {
        e.preventDefault();
        // Check if a profile exists and show appropriate form
        const appContentContainer = document.getElementById('app-content-container');
        const { getAuthStatus } = await import('./auth.js'); // Dynamically import to avoid circular dependency issues if auth.js uses ui.js
        const authStatus = await getAuthStatus();
        if (authStatus.isRegistered) {
            renderLoginForm(appContentContainer);
        } else {
            renderRegisterForm(appContentContainer);
        }
    });
}


/**
 * Displays a message to the user in the designated app-message area.
 * @param {string} message The message text to display.
 * @param {string} [classes='text-gray-300'] Tailwind CSS classes for styling the message.
 */
export function displayMessage(message, classes = 'text-gray-300') {
    const messageContainer = document.getElementById('app-message');
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = `mt-4 p-3 rounded-lg text-center ${classes}`;
        messageContainer.classList.remove('hidden');
        // Optional: Hide message after a few seconds
        setTimeout(() => {
            if (messageContainer.textContent === message) { // Only hide if it's still the same message
                 messageContainer.classList.add('hidden');
            }
        }, 5000); // Hide after 5 seconds
    } else {
        console.warn('App message container not found. Message:', message);
    }
}

// Ensure utility functions are accessible
export { displayMessage };
