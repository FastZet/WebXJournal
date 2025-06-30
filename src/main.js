// src/main.js

/**
 * @fileoverview Main application logic for WebX Journal.
 * Handles overall application flow, data loading, saving, and interactions
 * between UI, authentication, storage, and crypto modules.
 */

import { renderLoginForm, renderRegisterForm, renderMainJournalApp, renderJournalEntry, updateJournalEntryInList, removeJournalEntryFromList, showLoadingOverlay, hideLoadingOverlay } from './ui.js';
import * as auth from './auth.js'; // Import all auth functions as 'auth' object
import * as storage from './storage.js'; // Import all storage functions as 'storage' object
import * as crypto from './crypto.js'; // Import all crypto functions as 'crypto' object
import * as utils from './utils.js'; // Import all utils functions as 'utils' object

// Main application container (global reference for convenience)
const appContentContainer = document.getElementById('app-content-container');

/**
 * Initializes the main application flow.
 * Checks for existing user profiles and renders appropriate UI (login or registration).
 * @returns {Promise<void>}
 */
export async function initializeJournalApp() {
    console.log('Initializing WebX Journal application...');
    if (!appContentContainer) {
        console.error('App content container not found!');
        utils.displayMessage('Critical error: Application container missing.', 'text-red-400 bg-red-800');
        return;
    }

    try {
        showLoadingOverlay('Initializing database...');
        await storage.initializeIndexedDB(); // Changed initDB to initializeIndexedDB
        console.log('IndexedDB initialized.');

        const authStatus = await auth.getAuthStatus();

        if (authStatus.isRegistered) {
            console.log('Existing user detected. Rendering login form.');
            appContentContainer.innerHTML = ''; // Clear loading message
            renderLoginForm(appContentContainer);
        } else {
            console.log('No user profile found. Rendering registration form.');
            appContentContainer.innerHTML = ''; // Clear loading message
            renderRegisterForm(appContentContainer);
        }
    } catch (error) {
        console.error('Application initialization failed:', error);
        utils.displayMessage(`Failed to load WebX Journal: ${error.message}. Please try again later.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Loads and displays all journal entries for the current user.
 * @returns {Promise<void>}
 */
async function loadJournalEntries() {
    showLoadingOverlay('Loading your journal...');
    try {
        const encryptionKey = auth.getCurrentEncryptionKey();
        if (!encryptionKey) {
            console.warn('No encryption key available, cannot load journal entries. User might be logged out.');
            appContentContainer.querySelector('#journal-entries-list').innerHTML = ''; // Clear existing
            utils.displayMessage('Please log in to view your journal.', 'text-blue-300 bg-gray-700');
            return;
        }

        const entries = await storage.getAllJournalEntries();
        const journalList = appContentContainer.querySelector('#journal-entries-list');
        journalList.innerHTML = ''; // Clear existing entries

        if (entries.length === 0) {
            utils.displayMessage('No entries yet. Start writing!', 'text-blue-300 bg-gray-700', 'journal-entries-list'); // Add to list for persistence
        } else {
            // Sort entries by timestamp in descending order (newest first)
            entries.sort((a, b) => b.timestamp - a.timestamp);

            for (const entry of entries) {
                try {
                    // Decrypt combined data using the base64 strings from storage
                    const decryptedPayload = JSON.parse(await crypto.decrypt(
                        entry.encryptedData,
                        entry.iv,
                        entry.authTag,
                        encryptionKey
                    ));

                    renderJournalEntry({
                        id: entry.id,
                        timestamp: entry.timestamp,
                        title: decryptedPayload.title,
                        content: decryptedPayload.content,
                        version: entry.version || 1 // Version of the stored object itself
                    });
                } catch (decryptError) {
                    console.error(`Failed to decrypt entry ${entry.id}:`, decryptError);
                    renderJournalEntry({
                        id: entry.id,
                        timestamp: entry.timestamp,
                        title: '[Encrypted/Corrupted Entry]',
                        content: 'This entry could not be decrypted. It might be corrupted or was created with a different master password.',
                        isCorrupted: true
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error loading journal entries:', error);
        utils.displayMessage(`Failed to load journal entries: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Saves a new or updates an existing journal entry.
 * @param {string|null} id The ID of the entry to update, or null for a new entry.
 * @param {string} title The title of the journal entry.
 * @param {string} content The content of the journal entry.
 * @returns {Promise<void>}
 */
async function saveJournalEntry(id, title, content) {
    showLoadingOverlay(id ? 'Updating entry...' : 'Saving new entry...');
    try {
        const encryptionKey = auth.getCurrentEncryptionKey();
        if (!encryptionKey) {
            utils.displayMessage('Error: Not authenticated. Please log in.', 'text-red-400 bg-red-800');
            return;
        }

        const entryPayload = {
            title: title,
            content: content,
            dataVersion: auth.CURRENT_DATA_VERSION // Version of the data structure within the encrypted payload
        };

        const encryptedEntry = await crypto.encrypt(JSON.stringify(entryPayload), encryptionKey);

        const timestamp = Date.now();
        const entryToSave = {
            id: id || utils.generateUniqueId(),
            timestamp: timestamp,
            encryptedData: encryptedEntry.ciphertext, // This will be the combined encrypted title+content
            iv: encryptedEntry.iv,
            authTag: encryptedEntry.authTag, // Store the authTag for decryption
            version: auth.CURRENT_DATA_VERSION // Version of the stored object itself
        };

        await storage.saveJournalEntry(entryToSave);

        // Update UI immediately with the plaintext data
        if (id) {
            updateJournalEntryInList({
                id: entryToSave.id,
                timestamp: entryToSave.timestamp,
                title: title,
                content: content
            });
            utils.displayMessage('Entry updated successfully!', 'text-green-400 bg-green-800');
        } else {
            renderJournalEntry({
                id: entryToSave.id,
                timestamp: entryToSave.timestamp,
                title: title,
                content: content
            });
            utils.displayMessage('Entry saved successfully!', 'text-green-400 bg-green-800');
            // Clear the form after saving new entry
            document.getElementById('journal-entry-form').reset();
            document.getElementById('journal-entry-title').value = '';
            document.getElementById('journal-entry-content').value = '';
        }

    } catch (error) {
        console.error('Error saving journal entry:', error);
        utils.displayMessage(`Failed to save entry: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Deletes a journal entry by its ID.
 * @param {string} id The ID of the journal entry to delete.
 * @returns {Promise<void>}
 */
async function deleteJournalEntry(id) {
    showLoadingOverlay('Deleting entry...');
    try {
        await storage.deleteJournalEntry(id);
        removeJournalEntryFromList(id);
        utils.displayMessage('Entry deleted successfully!', 'text-green-400 bg-green-800');
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        utils.displayMessage(`Failed to delete entry: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Exports all journal data (user profile and entries) as an encrypted JSON file.
 * @returns {Promise<void>}
 */
async function exportJournalData() {
    showLoadingOverlay('Preparing export...');
    try {
        const username = auth.getCurrentUsername();
        if (!username) {
            utils.displayMessage('Error: Not authenticated. Cannot export.', 'text-red-400 bg-red-800');
            return;
        }

        const userData = await storage.getUserProfile(username);
        const journalEntries = await storage.getAllJournalEntries();

        // Convert Uint8Array back to Array for JSON.stringify in export
        const exportData = {
            app: 'WebXJournal',
            version: '1.0.0', // App version
            dbVersion: storage.DB_VERSION, // IndexedDB schema version
            authVersion: auth.CURRENT_DATA_VERSION, // Auth data schema version
            user: {
                username: userData.username,
                kdfSalt: Array.from(new Uint8Array(userData.kdfSalt)), // Convert from Array back to Array for serialization
                encryptedIdentity: userData.encryptedIdentity, // Already contains base64 strings
                version: userData.version
            },
            entries: journalEntries.map(entry => ({
                id: entry.id,
                timestamp: entry.timestamp,
                encryptedData: entry.encryptedData, // Already base64 string
                iv: entry.iv, // Already base64 string
                authTag: entry.authTag, // Already base64 string
                version: entry.version || 1
            }))
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WebXJournal_Export_${new Date().toISOString().slice(0, 10)}.webx`; // Changed extension to .webx
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        utils.displayMessage('Journal data exported successfully!', 'text-green-400 bg-green-800');

    } catch (error) {
        console.error('Error exporting journal data:', error);
        utils.displayMessage(`Failed to export journal data: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Imports journal data from an encrypted JSON file.
 * @param {File} jsonFile The File object selected by the user.
 * @param {string} masterPassword The master password for the imported data.
 * @returns {Promise<void>}
 */
async function importJournalData(jsonFile, masterPassword) {
    showLoadingOverlay('Importing data...');
    try {
        if (!jsonFile) {
            utils.displayMessage('No file selected for import.', 'text-red-400 bg-red-800');
            return;
        }
        if (!masterPassword) {
            utils.displayMessage('Master password is required for import.', 'text-red-400 bg-red-800');
            return;
        }

        const fileContent = await jsonFile.text();
        const importedData = JSON.parse(fileContent);

        // Basic validation of imported data structure
        if (!importedData || importedData.app !== 'WebXJournal' || !importedData.user || !importedData.entries) {
            utils.displayMessage('Invalid WebXJournal export file. Missing required sections.', 'text-red-400 bg-red-800');
            return;
        }
        if (!importedData.user.username || !importedData.user.kdfSalt || !importedData.user.encryptedIdentity) {
            utils.displayMessage('Invalid WebXJournal export file. User data corrupted or incomplete.', 'text-red-400 bg-red-800');
            return;
        }

        // Convert kdfSalt from array to Uint8Array for deriveKeyFromPassword
        const importedKdfSalt = new Uint8Array(importedData.user.kdfSalt);
        const derivedKeyForImport = await crypto.deriveKeyFromPassword(masterPassword, importedKdfSalt);

        let decryptedImportedIdentity;
        try {
            // Decrypt the identity payload from the imported user data
            decryptedImportedIdentity = JSON.parse(await crypto.decrypt(
                importedData.user.encryptedIdentity.ciphertext,
                importedData.user.encryptedIdentity.iv,
                importedData.user.encryptedIdentity.authTag,
                derivedKeyForImport
            ));
        } catch (decryptError) {
            console.error('Decryption failed during import verification:', decryptError);
            utils.displayMessage('Import failed: Incorrect master password for the backup file.', 'text-red-400 bg-red-800');
            return;
        }

        // Verify the username from the decrypted imported identity
        if (decryptedImportedIdentity.username !== importedData.user.username) {
            utils.displayMessage('Import failed: Username mismatch in backup file. Data corrupted.', 'text-red-400 bg-red-800');
            return;
        }

        // If currently logged in, ask for confirmation to overwrite
        const currentUsername = auth.getCurrentUsername();
        if (currentUsername && currentUsername !== importedData.user.username) {
            if (!window.confirm(`You are logged in as "${currentUsername}". The imported data belongs to "${importedData.user.username}". Importing will OVERWRITE your current journal. Do you want to proceed?`)) {
                utils.displayMessage('Import cancelled by user.', 'text-blue-300 bg-gray-700');
                return;
            }
        }

        // Clear existing data (user profile and all entries) before importing to prevent conflicts
        await storage.clearAllData();

        // Save imported user profile (overwrite existing or save new)
        const profileToStore = {
            username: importedData.user.username,
            kdfSalt: importedKdfSalt, // Stored as Uint8Array, storage.js converts to Array
            encryptedIdentity: importedData.user.encryptedIdentity, // Already correct base64 format
            version: importedData.user.version
        };
        await storage.saveUserProfile(profileToStore);

        // Transform imported entries (ensure data types are correct for storage/crypto)
        const transformedEntries = importedData.entries.map(entry => ({
            id: entry.id,
            timestamp: entry.timestamp,
            // These are already base64 strings from export, so no Uint8Array conversion needed here
            encryptedData: entry.encryptedData,
            iv: entry.iv,
            authTag: entry.authTag,
            version: entry.version || 1
        }));

        // Bulk import entries
        await storage.bulkImportJournalEntries(transformedEntries);

        utils.displayMessage('Journal data imported successfully! Please re-login to see changes.', 'text-green-400 bg-green-800');

        // Reinitialize the app to ensure the correct user context is loaded
        // This will clear currentAuth and re-render login/register form
        auth.logoutUser(); // Ensure session is cleared
        await initializeJournalApp();

    } catch (error) {
        console.error('Error importing journal data:', error);
        utils.displayMessage(`Failed to import journal data: ${error.message}. Ensure it's a valid file and master password is correct.`, 'text-red-400 bg-red-800');
    } finally {
        hideLoadingOverlay();
    }
}

// Attach these functions to the global window object for easy access from UI event listeners in ui.js
// This creates a loose coupling but allows ui.js to call these central main.js functions.
window.WebXJournal = {
    auth, // exposing auth functions like logoutUser, getCurrentUsername etc.
    storage, // exposing storage functions (for debug/direct use from console mostly)
    crypto, // exposing crypto functions (for debug/direct use from console mostly)
    utils, // exposing utils functions
    loadJournalEntries,
    saveJournalEntry,
    deleteJournalEntry,
    exportJournalData,
    importJournalData,
    initializeJournalApp // Expose the initialization function
};

// Call initialize on page load
document.addEventListener('DOMContentLoaded', initializeJournalApp);
