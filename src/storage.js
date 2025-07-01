// src/storage.js

const DB_NAME = 'WebXJournalDB';
const DB_VERSION = 1;
export const USER_PROFILE_STORE = 'user-profile';
export const JOURNAL_ENTRIES_STORE = 'journal-entries';

let db; // IndexedDB database instance

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<void>}
 */
export function initDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(USER_PROFILE_STORE)) {
                db.createObjectStore(USER_PROFILE_STORE, { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains(JOURNAL_ENTRIES_STORE)) {
                db.createObjectStore(JOURNAL_ENTRIES_STORE, { keyPath: 'id' });
            }
            console.log('IndexedDB upgrade complete.');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully.');
            resolve();
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(new Error(`IndexedDB error: ${event.target.errorCode}`));
        };
    });
}

/**
 * Adds a user profile to IndexedDB.
 * @param {object} profile - The user profile object.
 * @returns {Promise<void>}
 */
export function addUserProfile(profile) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_PROFILE_STORE], 'readwrite');
        const store = transaction.objectStore(USER_PROFILE_STORE);
        const request = store.add(profile);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Add user profile error: ${event.target.error}`));
    });
}

/**
 * Retrieves a user profile from IndexedDB.
 * @param {string} username - The username to retrieve.
 * @returns {Promise<object|undefined>} - The user profile or undefined if not found.
 */
export function getUserProfile(username) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([USER_PROFILE_STORE], 'readonly');
        const store = transaction.objectStore(USER_PROFILE_STORE);
        const request = store.get(username);

        request.onsuccess = (event) => {
            console.log(`User profile for ${username} retrieved.`, event.target.result);
            resolve(event.target.result);
        };
        request.onerror = (event) => reject(new Error(`Get user profile error: ${event.target.error}`));
    });
}

/**
 * Clears all data from a specific object store.
 * @param {string} storeName - The name of the object store to clear.
 * @returns {Promise<void>}
 */
export function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Clear store ${storeName} error: ${event.target.error}`));
    });
}

/**
 * Adds a new journal entry to IndexedDB.
 * @param {object} entry - The journal entry object.
 * @returns {Promise<void>}
 */
export function addJournalEntry(entry) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([JOURNAL_ENTRIES_STORE], 'readwrite');
        const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
        const request = store.add(entry);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Add journal entry error: ${event.target.error}`));
    });
}

/**
 * Retrieves a specific journal entry by its ID.
 * @param {string} id - The ID of the journal entry.
 * @returns {Promise<object|undefined>} - The journal entry or undefined if not found.
 */
export function getJournalEntry(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([JOURNAL_ENTRIES_STORE], 'readonly');
        const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
        const request = store.get(id);

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(new Error(`Get journal entry error: ${event.target.error}`));
    });
}

/**
 * Retrieves all journal entries from IndexedDB.
 * @returns {Promise<Array<object>>} - An array of journal entries.
 */
export function getAllJournalEntries() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([JOURNAL_ENTRIES_STORE], 'readonly');
        const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(new Error(`Get all journal entries error: ${event.target.error}`));
    });
}

/**
 * Updates an existing journal entry in IndexedDB.
 * @param {object} entry - The updated journal entry object.
 * @returns {Promise<void>}
 */
export function updateJournalEntry(entry) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([JOURNAL_ENTRIES_STORE], 'readwrite');
        const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
        const request = store.put(entry); // put() updates if key exists, adds if not

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Update journal entry error: ${event.target.error}`));
    });
}

/**
 * Deletes a journal entry from IndexedDB.
 * @param {string} id - The ID of the journal entry to delete.
 * @returns {Promise<void>}
 */
export function deleteJournalEntry(id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([JOURNAL_ENTRIES_STORE], 'readwrite');
        const store = transaction.objectStore(JOURNAL_ENTRIES_STORE);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Delete journal entry error: ${event.target.error}`));
    });
}

/**
 * Clears all user data (profile and journal entries) from IndexedDB.
 * @returns {Promise<void>}
 */
export function clearAllData() {
    return Promise.all([
        clearStore(USER_PROFILE_STORE),
        clearStore(JOURNAL_ENTRIES_STORE)
    ]);
}
