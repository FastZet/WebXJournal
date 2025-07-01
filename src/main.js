// src/main.js

import * as auth from './auth.js';
// Corrected import: Import the 'storage' object directly
import { storage } from './storage.js'; // <--- CHANGE IS HERE
import * as ui from './ui.js';
import * as crypto from './crypto.js';
import {
    displayMessage,
    showLoadingOverlay,
    hideLoadingOverlay,
    getCurrentTimestamp,
    readFile,
    downloadFile,
    safeJSONParse
} from './utils.js';

let currentJournalEntryId = null; // Stores the ID of the currently selected entry for editing
let allJournalEntries = []; // Cache for all entries

const main = {
    /**
     * Initializes the application by setting up event listeners,
     * checking authentication status, and loading entries.
     */
    init: async function() {
        showLoadingOverlay();
        try {
            await storage.initDb(); // This call will now correctly reference the function
            await this.registerServiceWorker();

            // Corrected: Use auth.init() instead of auth.checkAuthStatus()
            const isAuthenticated = await auth.init();

            if (isAuthenticated) {
                await ui.renderMainJournalApp();
                await this.loadAllJournalEntries();
            } else {
                ui.renderAuthForms();
            }

            this.setupEventListeners(); // Setup general event listeners
        } catch (error) {
            console.error('Initialization failed:', error);
            displayMessage(`Failed to initialize: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Registers the service worker for PWA capabilities.
     */
    registerServiceWorker: async function() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./service-worker.js');
                console.log('Service Worker registered with scope:', registration.scope);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    },

    /**
     * Sets up global event listeners for the application.
     */
    setupEventListeners: function() {
        // Auth form submission
        document.addEventListener('submit', async (event) => {
            if (event.target.id === 'registerForm') {
                event.preventDefault();
                await this.handleRegister(event.target);
            } else if (event.target.id === 'loginForm') {
                event.preventDefault();
                await this.handleLogin(event.target);
            } else if (event.target.id === 'journalEntryForm') {
                event.preventDefault();
                await this.handleSaveJournalEntry(event.target);
            }
        });

        // Journal entry list item clicks (for editing)
        document.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-entry-btn')) {
                const entryId = event.target.dataset.id;
                await this.editJournalEntry(entryId);
            } else if (event.target.classList.contains('delete-entry-btn')) {
                const entryId = event.target.dataset.id;
                await this.deleteJournalEntry(entryId);
            } else if (event.target.id === 'newEntryBtn') {
                ui.showJournalEntryEditor('new');
                currentJournalEntryId = null; // Reset for new entry
            } else if (event.target.id === 'cancelEditBtn') {
                ui.showJournalEntriesList();
                currentJournalEntryId = null;
                ui.clearJournalEntryForm();
            } else if (event.target.id === 'exportDataBtn') {
                await this.handleExportData();
            } else if (event.target.id === 'importDataBtn') {
                document.getElementById('importFile').click(); // Trigger file input click
            } else if (event.target.id === 'logoutBtn') {
                await this.handleLogout();
            } else if (event.target.id === 'clearAllDataBtn') {
                if (confirm('Are you sure you want to delete ALL journal entries and user data? This action cannot be undone.')) {
                    await this.handleClearAllData();
                }
            }
        });

        // Handle file selection for import
        document.addEventListener('change', async (event) => {
            if (event.target.id === 'importFile') {
                const file = event.target.files[0];
                if (file) {
                    await this.handleImportData(file);
                }
            }
        });
    },

    /**
     * Handles user registration.
     * @param {HTMLFormElement} form - The registration form element.
     */
    handleRegister: async function(form) {
        showLoadingOverlay();
        const masterPassword = form.masterPassword.value;
        const confirmPassword = form.confirmPassword.value;

        if (masterPassword !== confirmPassword) {
            displayMessage('Passwords do not match!', 'error');
            hideLoadingOverlay();
            return;
        }

        try {
            await auth.registerUser(masterPassword);
            displayMessage('Registration successful! Please log in.', 'success');
            ui.renderAuthForms(); // Show login form
        } catch (error) {
            console.error('Registration failed:', error);
            displayMessage(`Registration failed: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles user login.
     * @param {HTMLFormElement} form - The login form element.
     */
    handleLogin: async function(form) {
        showLoadingOverlay();
        const masterPassword = form.masterPassword.value;

        try {
            const success = await auth.loginUser(masterPassword);
            if (success) {
                displayMessage('Login successful!', 'success');
                await ui.renderMainJournalApp();
                await this.loadAllJournalEntries();
            } else {
                displayMessage('Incorrect master password.', 'error');
            }
        } catch (error) {
            console.error('Login failed:', error);
            displayMessage(`Login failed: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles saving a new or updated journal entry.
     * @param {HTMLFormElement} form - The journal entry form.
     */
    handleSaveJournalEntry: async function(form) {
        showLoadingOverlay();
        const title = form.title.value;
        const content = form.content.value;

        if (!title.trim() || !content.trim()) {
            displayMessage('Title and content cannot be empty.', 'error');
            hideLoadingOverlay();
            return;
        }

        try {
            const encryptionKey = await auth.getCurrentEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Encryption key not available. Please log in again.");
            }

            const encryptedTitle = await crypto.encrypt(title, encryptionKey);
            const encryptedContent = await crypto.encrypt(content, encryptionKey);

            const entry = {
                id: currentJournalEntryId || getCurrentTimestamp(), // Use current ID for update, new timestamp for new
                timestamp: getCurrentTimestamp(),
                title: encryptedTitle,
                content: encryptedContent
            };

            if (currentJournalEntryId) {
                await storage.updateJournalEntry(entry);
                displayMessage('Entry updated successfully!', 'success');
            } else {
                await storage.addJournalEntry(entry);
                displayMessage('Entry saved successfully!', 'success');
            }

            ui.clearJournalEntryForm();
            ui.showJournalEntriesList();
            await this.loadAllJournalEntries();
            currentJournalEntryId = null; // Reset
        } catch (error) {
            console.error('Saving entry failed:', error);
            displayMessage(`Failed to save entry: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Loads and displays all journal entries.
     */
    loadAllJournalEntries: async function() {
        showLoadingOverlay();
        try {
            const encryptionKey = await auth.getCurrentEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Encryption key not available. Please log in again.");
            }

            const encryptedEntries = await storage.getAllJournalEntries();
            const decryptedEntries = await Promise.all(encryptedEntries.map(async (entry) => {
                try {
                    const decryptedTitle = await crypto.decrypt(entry.title, encryptionKey);
                    const decryptedContent = await crypto.decrypt(entry.content, encryptionKey);
                    return {
                        id: entry.id,
                        timestamp: entry.timestamp,
                        title: decryptedTitle,
                        content: decryptedContent
                    };
                } catch (decryptionError) {
                    console.warn(`Could not decrypt entry ${entry.id}:`, decryptionError);
                    // Return placeholder or partial data if decryption fails for one entry
                    return {
                        id: entry.id,
                        timestamp: entry.timestamp,
                        title: "[Decryption Failed]",
                        content: "[Content not available due to decryption error]"
                    };
                }
            }));
            allJournalEntries = decryptedEntries.sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
            ui.renderJournalEntriesList(allJournalEntries);
        } catch (error) {
            console.error('Loading entries failed:', error);
            displayMessage(`Failed to load entries: ${error.message}`, 'error');
            ui.renderJournalEntriesList([]); // Clear list on error
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Loads a specific journal entry into the editor.
     * @param {string} entryId - The ID of the entry to edit.
     */
    editJournalEntry: async function(entryId) {
        showLoadingOverlay();
        try {
            const encryptionKey = await auth.getCurrentEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Encryption key not available. Please log in again.");
            }
            const encryptedEntry = await storage.getJournalEntry(entryId);
            if (encryptedEntry) {
                const decryptedTitle = await crypto.decrypt(encryptedEntry.title, encryptionKey);
                const decryptedContent = await crypto.decrypt(encryptedEntry.content, encryptionKey);
                ui.populateJournalEntryForm(decryptedTitle, decryptedContent);
                ui.showJournalEntryEditor('edit');
                currentJournalEntryId = entryId;
            } else {
                displayMessage('Entry not found.', 'error');
            }
        } catch (error) {
            console.error('Editing entry failed:', error);
            displayMessage(`Failed to load entry for editing: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Deletes a journal entry.
     * @param {string} entryId - The ID of the entry to delete.
     */
    deleteJournalEntry: async function(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) {
            return;
        }
        showLoadingOverlay();
        try {
            await storage.deleteJournalEntry(entryId);
            displayMessage('Entry deleted successfully!', 'success');
            await this.loadAllJournalEntries();
            ui.clearJournalEntryForm();
            ui.showJournalEntriesList();
        } catch (error) {
            console.error('Deleting entry failed:', error);
            displayMessage(`Failed to delete entry: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles the export of all encrypted data.
     */
    handleExportData: async function() {
        showLoadingOverlay();
        try {
            const masterPassword = prompt("Please enter your master password to export data:");
            if (!masterPassword) {
                displayMessage("Export cancelled.", "info");
                return;
            }

            const isAuthenticated = await auth.loginUser(masterPassword); // Re-authenticate for export
            if (!isAuthenticated) {
                displayMessage("Incorrect master password. Export failed.", "error");
                return;
            }

            const encryptionKey = await auth.getCurrentEncryptionKey();
            if (!encryptionKey) {
                throw new Error("Encryption key not available after re-authentication.");
            }

            const exportedData = await auth.exportKeys(encryptionKey); // Get encrypted user profile
            exportedData.journalEntries = await storage.getAllJournalEntries(); // Get all encrypted entries

            const filename = `webx-journal-export-${getCurrentTimestamp()}.json`;
            downloadFile(JSON.stringify(exportedData, null, 2), filename, 'application/json');
            displayMessage('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            displayMessage(`Export failed: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles the import of encrypted data from a file.
     * @param {File} file - The file to import.
     */
    handleImportData: async function(file) {
        showLoadingOverlay();
        try {
            const fileContent = await readFile(file);
            const importedData = safeJSONParse(fileContent);

            if (!importedData || !importedData.userProfile || !importedData.journalEntries) {
                throw new Error("Invalid import file format.");
            }

            const masterPassword = prompt("Please enter your master password for the imported data:");
            if (!masterPassword) {
                displayMessage("Import cancelled.", "info");
                return;
            }

            // Temporarily import user profile to derive key, then delete
            await storage.clearStore(storage.USER_PROFILE_STORE); // Clear existing user profile
            await storage.addUserProfile(importedData.userProfile);

            const isAuthenticated = await auth.loginUser(masterPassword); // Try to login with imported profile
            if (!isAuthenticated) {
                await storage.clearStore(storage.USER_PROFILE_STORE); // Clean up if login fails
                throw new Error("Incorrect master password for imported data.");
            }

            // If login successful, clear all existing journal entries and import new ones
            await storage.clearStore(storage.JOURNAL_ENTRIES_STORE);
            for (const entry of importedData.journalEntries) {
                await storage.addJournalEntry(entry);
            }

            displayMessage('Data imported successfully! Please refresh or re-login.', 'success');
            // Force a reload or full re-initialization to ensure new data is loaded
            window.location.reload();

        } catch (error) {
            console.error('Import failed:', error);
            displayMessage(`Import failed: ${error.message}`, 'error');
            // Ensure UI state is consistent after failed import
            await auth.logout(); // Clear current session
            ui.renderAuthForms(); // Show login form
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles user logout.
     */
    handleLogout: async function() {
        if (!confirm('Are you sure you want to log out?')) {
            return;
        }
        showLoadingOverlay();
        try {
            await auth.logout();
            allJournalEntries = []; // Clear cached entries
            ui.renderAuthForms(); // Show login/register forms
            displayMessage('Logged out successfully.', 'info');
        } catch (error) {
            console.error('Logout failed:', error);
            displayMessage(`Logout failed: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    },

    /**
     * Handles clearing all application data (user profile and journal entries).
     */
    handleClearAllData: async function() {
        showLoadingOverlay();
        try {
            await storage.clearAllData();
            await auth.logout(); // Clear current session state
            allJournalEntries = []; // Clear cached entries
            ui.renderAuthForms(); // Show login/register forms
            displayMessage('All application data cleared successfully!', 'success');
        } catch (error) {
            console.error('Clearing all data failed:', error);
            displayMessage(`Failed to clear all data: ${error.message}`, 'error');
        } finally {
            hideLoadingOverlay();
        }
    }
};

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => main.init());
