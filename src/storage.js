// src/storage.js

/**
 * @fileoverview Manages all IndexedDB operations for WebX Journal,
 * including user profiles and journal entries.
 */

const DB_NAME = 'WebXJournalDB';
const DB_VERSION = 1;
const STORE_USER_PROFILES = 'userProfiles';
const STORE_JOURNAL_ENTRIES = 'journalEntries';

let db = null; // Holds the IndexedDB database instance

/**
 * Initializes the IndexedDB database.
 * Creates object stores if they don't exist.
 * @returns {Promise<void>} A Promise that resolves when the database is initialized.
 */
export function initializeIndexedDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            console.log('IndexedDB already initialized.');
            resolve();
            return;
        }

        console.log(`[IndexedDB] Opening database: ${DB_NAME} (Version: ${DB_VERSION})`);
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            console.log('[IndexedDB] Upgrade needed or first time creation.');
            if (!tempDb.objectStoreNames.contains(STORE_USER_PROFILES)) {
                tempDb.createObjectStore(STORE_USER_PROFILES, { keyPath: 'username' });
                console.log(`[IndexedDB] Object store '${STORE_USER_PROFILES}' created.`);
            }
            if (!tempDb.objectStoreNames.contains(STORE_JOURNAL_ENTRIES)) {
                tempDb.createObjectStore(STORE_JOURNAL_ENTRIES, { keyPath: 'id' });
                console.log(`[IndexedDB] Object store '${STORE_JOURNAL_ENTRIES}' created.`);
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('[IndexedDB] Database opened successfully.');
            resolve();
        };

        request.onerror = (event) => {
            console.error('[IndexedDB] Database error:', event.target.error);
            reject(new Error(`IndexedDB initialization failed: ${event.target.error.message}`));
        };
    });
}

/**
 * Saves an encrypted user profile to IndexedDB.
 * @param {Object} userProfile The encrypted user profile object.
 * @param {string} userProfile.username The username (key for the store).
 * @returns {Promise<void>} A Promise that resolves when the profile is saved.
 */
export function saveUserProfile(userProfile) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_USER_PROFILES], 'readwrite');
        const store = transaction.objectStore(STORE_USER_PROFILES);
        const request = store.put(userProfile); // 'put' will add or update

        request.onsuccess = () => {
            console.log(`[IndexedDB] User profile for '${userProfile.username}' saved.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`[IndexedDB] Error saving user profile for '${userProfile.username}':`, event.target.error);
            reject(new Error(`Failed to save user profile: ${event.target.error.message}`));
        };
    });
}

/**
 * Retrieves an encrypted user profile from IndexedDB.
 * @param {string} username The username of the profile to retrieve.
 * @returns {Promise<Object|undefined>} A Promise that resolves with the user profile object, or undefined if not found.
 */
export function getUserProfile(username) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_USER_PROFILES], 'readonly');
        const store = transaction.objectStore(STORE_USER_PROFILES);
        const request = store.get(username);

        request.onsuccess = () => {
            console.log(`[IndexedDB] User profile for '${username}' retrieved:`, request.result ? 'found' : 'not found');
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`[IndexedDB] Error retrieving user profile for '${username}':`, event.target.error);
            reject(new Error(`Failed to retrieve user profile: ${event.target.error.message}`));
        };
    });
}

/**
 * Deletes a user profile from IndexedDB.
 * @param {string} username The username of the profile to delete.
 * @returns {Promise<void>} A Promise that resolves when the profile is deleted.
 */
export function deleteUserProfile(username) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_USER_PROFILES], 'readwrite');
        const store = transaction.objectStore(STORE_USER_PROFILES);
        const request = store.delete(username);

        request.onsuccess = () => {
            console.log(`[IndexedDB] User profile for '${username}' deleted.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`[IndexedDB] Error deleting user profile for '${username}':`, event.target.error);
            reject(new Error(`Failed to delete user profile: ${event.target.error.message}`));
        };
    });
}

/**
 * Saves an encrypted journal entry to IndexedDB.
 * @param {Object} entry The encrypted journal entry object.
 * @param {string} entry.id The unique ID for the entry (key for the store).
 * @returns {Promise<void>} A Promise that resolves when the entry is saved.
 */
export function saveJournalEntry(entry) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_JOURNAL_ENTRIES], 'readwrite');
        const store = transaction.objectStore(STORE_JOURNAL_ENTRIES);
        const request = store.put(entry);

        request.onsuccess = () => {
            console.log(`[IndexedDB] Journal entry '${entry.id}' saved.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`[IndexedDB] Error saving journal entry '${entry.id}':`, event.target.error);
            reject(new Error(`Failed to save journal entry: ${event.target.error.message}`));
        };
    });
}

/**
 * Retrieves a single encrypted journal entry by its ID from IndexedDB.
 * @param {string} id The ID of the journal entry to retrieve.
 * @returns {Promise<Object|undefined>} A Promise that resolves with the journal entry object, or undefined if not found.
 */
export function getJournalEntry(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_JOURNAL_ENTRIES], 'readonly');
        const store = transaction.objectStore(STORE_JOURNAL_ENTRIES);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`[IndexedDB] Error retrieving journal entry '${id}':`, event.target.error);
            reject(new Error(`Failed to retrieve journal entry: ${event.target.error.message}`));
        };
    });
}

/**
 * Retrieves all encrypted journal entries from IndexedDB.
 * @returns {Promise<Array<Object>>} A Promise that resolves with an array of all journal entries.
 */
export function getAllJournalEntries() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_JOURNAL_ENTRIES], 'readonly');
        const store = transaction.objectStore(STORE_JOURNAL_ENTRIES);
        const request = store.getAll();

        request.onsuccess = () => {
            console.log(`[IndexedDB] Retrieved ${request.result.length} journal entries.`);
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error('[IndexedDB] Error retrieving all journal entries:', event.target.error);
            reject(new Error(`Failed to retrieve all journal entries: ${event.target.error.message}`));
        };
    });
}

/**
 * Clears all data from all object stores in IndexedDB.
 * USE WITH CAUTION: This will delete all user profiles and journal entries.
 * @returns {Promise<void>} A Promise that resolves when all data is cleared.
 */
export function clearAllData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('IndexedDB not initialized.'));
            return;
        }
        const transaction = db.transaction([STORE_USER_PROFILES, STORE_JOURNAL_ENTRIES], 'readwrite');
        const userStore = transaction.objectStore(STORE_USER_PROFILES);
        const journalStore = transaction.objectStore(STORE_JOURNAL_ENTRIES);

        const userClearRequest = userStore.clear();
        const journalClearRequest = journalStore.clear();

        Promise.all([
            new Promise((res, rej) => { userClearRequest.onsuccess = res; userClearRequest.onerror = rej; }),
            new Promise((res, rej) => { journalClearRequest.onsuccess = res; journalClearRequest.onerror = rej; })
        ])
        .then(() => {
            console.log('[IndexedDB] All data cleared from all stores.');
            resolve();
        })
        .catch(error => {
            console.error('[IndexedDB] Error clearing all data:', error);
            reject(new Error(`Failed to clear all data: ${error.message}`));
        });
    });
}
