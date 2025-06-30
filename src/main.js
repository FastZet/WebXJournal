// src/main.js

/**
 * @fileoverview Main application logic for WebX Journal.
 * Initializes the app, handles journal entry operations (save, load, delete),
 * and manages data export/import.
 */

import * as ui from './ui.js';
import * as auth from './auth.js';
import * as storage from './storage.js';
import * as crypto from './crypto.js';
import * as utils from './utils.js';

// --- Global Application State ---
let allJournalEntries = []; // Cached array of decrypted entries

/**
 * Initializes the WebX Journal application.
 * Checks authentication status and renders the appropriate UI.
 */
async function initializeJournalApp() {
    const appContentContainer = document.getElementById('app-content-container');
    if (!appContentContainer) {
        console.error('App content container not found!');
        return;
    }

    try {
        ui.showLoadingOverlay('Initializing database...');
        // --- FIX: Initialize IndexedDB BEFORE anything else tries to access it ---
        await storage.initializeIndexedDB(); // This line is crucial!
        console.log('IndexedDB initialized.'); // Confirmation log
        Force cache refresh: June 30, 2025 - V1 // <--- ADD THIS LINE

        ui.showLoadingOverlay('Checking authentication...');
        const authStatus = await auth.getAuthStatus();

        if (authStatus.isLoggedIn) {
            ui.renderMainJournalApp(appContentContainer, authStatus.username);
            // Entries will be loaded by ui.js calling loadJournalEntries via window.WebXJournal
        } else if (authStatus.isRegistered) {
            ui.renderLoginForm(appContentContainer);
        } else {
            ui.renderRegisterForm(appContentContainer);
        }
    } catch (error) {
        console.error('Failed to initialize application:', error);
        utils.displayMessage(`Failed to initialize: ${error.message}`, 'text-red-400 bg-red-800');
        // Fallback to login/register in case of initialization error
        ui.renderRegisterForm(appContentContainer);
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Saves a journal entry (new or existing).
 * @param {string|null} id The ID of the entry if editing, or null for a new entry.
 * @param {string} title The title of the journal entry.
 * @param {string} content The content of the journal entry.
 */
export async function saveJournalEntry(id, title, content) {
    console.log('Attempting to save entry:', { id, title, content });
    const encryptionKey = auth.getCurrentEncryptionKey();
    if (!encryptionKey) {
        utils.displayMessage('Not logged in. Please log in to save entries.', 'text-red-400 bg-red-800');
        return;
    }

    try {
        ui.showLoadingOverlay(id ? 'Updating entry...' : 'Saving new entry...');

        const timestamp = Date.now();
        const entryToEncrypt = {
            title: title,
            content: content,
            timestamp: timestamp
        };

        const encryptedData = await crypto.encrypt(JSON.stringify(entryToEncrypt), encryptionKey);

        const journalEntry = {
            id: id || utils.generateUniqueId(), // Generate new ID if not editing
            timestamp: timestamp,
            encrypted: encryptedData.ciphertext,
            iv: encryptedData.iv,
            authTag: encryptedData.authTag,
            version: auth.CURRENT_DATA_VERSION // Data version for this entry
        };

        await storage.saveJournalEntry(journalEntry);

        // Update local cache
        const existingIndex = allJournalEntries.findIndex(entry => entry.id === journalEntry.id);
        const decryptedEntry = { id: journalEntry.id, title, content, timestamp }; // Use current title/content for cached object

        if (existingIndex !== -1) {
            allJournalEntries[existingIndex] = decryptedEntry;
            ui.updateJournalEntryInList(decryptedEntry);
            utils.displayMessage('Entry updated successfully!', 'text-green-400 bg-green-800');
        } else {
            allJournalEntries.unshift(decryptedEntry); // Add new entry to the top
            ui.renderJournalEntry(decryptedEntry);
            utils.displayMessage('Entry saved successfully!', 'text-green-400 bg-green-800');
        }
        console.log('Entry saved successfully:', journalEntry.id);
    } catch (error) {
        console.error('Failed to save journal entry:', error);
        utils.displayMessage(`Failed to save entry: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Loads all journal entries for the current user.
 */
export async function loadJournalEntries() {
    console.log('Attempting to load entries.');
    const encryptionKey = auth.getCurrentEncryptionKey();
    if (!encryptionKey) {
        // This case should ideally not happen if login flow is correct,
        // but robustly handle it.
        console.warn('Cannot load entries: No encryption key available.');
        allJournalEntries = []; // Clear any old entries
        return;
    }

    try {
        ui.showLoadingOverlay('Loading entries...');
        const encryptedEntries = await storage.getAllJournalEntries();
        const decryptedEntries = [];

        for (const entry of encryptedEntries) {
            try {
                const decryptedContent = await crypto.decrypt(
                    entry.encrypted,
                    entry.iv,
                    entry.authTag,
                    encryptionKey
                );
                const parsedContent = JSON.parse(decryptedContent);
                decryptedEntries.push({
                    id: entry.id,
                    timestamp: entry.timestamp,
                    title: parsedContent.title,
                    content: parsedContent.content,
                });
            } catch (decryptError) {
                console.warn(`Could not decrypt entry ${entry.id}:`, decryptError);
                // Push a placeholder for corrupted entries
                decryptedEntries.push({
                    id: entry.id,
                    timestamp: entry.timestamp,
                    title: 'Corrupted or Undecryptable Entry',
                    content: 'This entry could not be decrypted. It might be corrupted or saved with a different master password.',
                    isCorrupted: true
                });
            }
        }
        // Sort entries by timestamp, newest first
        decryptedEntries.sort((a, b) => b.timestamp - a.timestamp);
        allJournalEntries = decryptedEntries;

        // Clear existing list and render all entries
        document.getElementById('journal-entries-list').innerHTML = ''; // Clear previous entries
        allJournalEntries.forEach(entry => ui.renderJournalEntry(entry));
        utils.displayMessage(`Loaded ${allJournalEntries.length} entries.`, 'text-blue-300 bg-gray-700');

    } catch (error) {
        console.error('Failed to load journal entries:', error);
        utils.displayMessage(`Failed to load entries: ${error.message}.`, 'text-red-400 bg-red-800`);
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Deletes a specific journal entry.
 * @param {string} id The ID of the entry to delete.
 */
export async function deleteJournalEntry(id) {
    if (!id) {
        utils.displayMessage('No entry selected for deletion.', 'text-red-400 bg-red-800');
        return;
    }

    try {
        ui.showLoadingOverlay('Deleting entry...');
        await storage.deleteJournalEntry(id);
        allJournalEntries = allJournalEntries.filter(entry => entry.id !== id);
        ui.removeJournalEntryFromList(id);
        utils.displayMessage('Entry deleted successfully.', 'text-green-400 bg-green-800');
    } catch (error) {
        console.error('Failed to delete journal entry:', error);
        utils.displayMessage(`Failed to delete entry: ${error.message}.`, 'text-red-400 bg-red-800');
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Exports all journal data (user profile and entries) as an encrypted JSON file.
 */
export async function exportJournalData() {
    const encryptionKey = auth.getCurrentEncryptionKey();
    const username = auth.getCurrentUsername();

    if (!encryptionKey || !username) {
        utils.displayMessage('Not logged in. Log in to export data.', 'text-red-400 bg-red-800');
        return;
    }

    const masterPassword = prompt('Enter your master password to encrypt the export file:');
    if (!masterPassword) {
        utils.displayMessage('Export cancelled: Master password not provided.', 'text-red-400 bg-red-800');
        return;
    }

    try {
        ui.showLoadingOverlay('Exporting data...');

        // Verify master password by re-deriving the key and comparing to current
        const kdfSalt = auth.getCurrentAuth().kdfSalt;
        const verifiedKey = await crypto.deriveKeyFromPassword(masterPassword, kdfSalt);

        // This comparison method is not ideal as CryptoKey objects cannot be directly compared
        // A better approach is to try decrypting the identity payload with the 'verifiedKey'
        // Let's re-decrypt the identity to confirm the password.
        const encryptedIdentity = auth.getCurrentAuth().encryptedIdentity;
        try {
            await crypto.decrypt(
                encryptedIdentity.ciphertext,
                encryptedIdentity.iv,
                encryptedIdentity.authTag,
                verifiedKey
            );
        } catch (error) {
            utils.displayMessage('Incorrect master password. Export cancelled.', 'text-red-400 bg-red-800');
            return;
        }

        const allEntries = await storage.getAllJournalEntries();
        const userProfile = await storage.getUserProfile(username);

        const exportData = {
            version: auth.CURRENT_DATA_VERSION,
            type: 'WebXJournalBackup',
            userProfile: userProfile,
            journalEntries: allEntries,
        };

        const exportString = JSON.stringify(exportData);
        const exportEncryptionKey = await crypto.deriveKeyFromPassword(masterPassword, utils.generateSalt()); // New key for export

        const encryptedExport = await crypto.encrypt(exportString, exportEncryptionKey);

        const exportBlob = new Blob([JSON.stringify(encryptedExport)], { type: 'application/json' });
        const url = URL.createObjectURL(exportBlob
