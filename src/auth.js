// src/auth.js

/**
 * @fileoverview Handles user authentication (registration, login, logout)
 * and secure key management for WebX Journal.
 */

import * as storage from './storage.js'; // This line needs to be correctly parsed and executed
import * as crypto from './crypto.js';
import * as utils from './utils.js';
import * as ui from './ui.js';

// Current user's authentication state and encryption key
let currentAuth = {
    username: null,
    encryptionKey: null, // CryptoKey object
    kdfSalt: null, // Uint8Array
    encryptedIdentity: null, // {ciphertext, iv, authTag}
};

// Data version for user profile encryption
export const CURRENT_DATA_VERSION = 1;

/**
 * Helper to get the full currentAuth object. Used internally for deletion/export.
 * @returns {object} The current authentication object.
 */
export function getCurrentAuth() {
    return currentAuth;
}

/**
 * Retrieves the current authentication status.
 * @returns {Promise<{isLoggedIn: boolean, isRegistered: boolean, username: string|null}>}
 */
export async function getAuthStatus() {
    // The error occurs here if 'storage' is not defined
    const allProfileKeys = await storage.getAllProfileKeys();
    const isRegistered = allProfileKeys.length > 0;
    const username = currentAuth.username; // Get from current session

    return {
        isLoggedIn: !!currentAuth.username && !!currentAuth.encryptionKey,
        isRegistered: isRegistered,
        username: username
    };
}

/**
 * Returns the current user's username.
 * @returns {string|null}
 */
export function getCurrentUsername() {
    return currentAuth.username;
}

/**
 * Returns the current user's encryption key.
 * @returns {CryptoKey|null}
 */
export function getCurrentEncryptionKey() {
    return currentAuth.encryptionKey;
}


/**
 * Registers a new user.
 * @param {string} username The desired username.
 * @param {string} masterPassword The master password for encryption.
 * @returns {Promise<boolean>} True if registration is successful, false otherwise.
 */
export async function registerUser(username, masterPassword) {
    if (!username || !masterPassword) {
        utils.displayMessage('Username and master password are required.', 'text-red-400 bg-red-800');
        return false;
    }
    if (masterPassword.length < 8) {
        utils.displayMessage('Master password must be at least 8 characters long.', 'text-red-400 bg-red-800');
        return false;
    }

    // Check if username already exists
    const existingProfile = await storage.getUserProfile(username);
    if (existingProfile) {
        utils.displayMessage('Username already exists. Please choose a different one or log in.', 'text-red-400 bg-red-800');
        return false;
    }

    try {
        ui.showLoadingOverlay('Registering user...');
        const kdfSalt = crypto.generateSalt(); // Generate salt for KDF
        const encryptionKey = await crypto.deriveKeyFromPassword(masterPassword, kdfSalt);

        // Encrypt a simple identity payload (e.g., username) with the derived key
        // This is used for integrity checking during login and ensuring the key is correct.
        const identityPayload = {
            username: username,
            timestamp: Date.now(),
            version: CURRENT_DATA_VERSION // Version of the identity payload data structure
        };
        const encryptedIdentity = await crypto.encrypt(JSON.stringify(identityPayload), encryptionKey);

        const userProfile = {
            username: username,
            kdfSalt: Array.from(kdfSalt), // Store as array for IndexedDB compatibility
            encryptedIdentity: encryptedIdentity, // Store Base64 strings
            version: CURRENT_DATA_VERSION // Version of the user profile object itself
        };

        await storage.saveUserProfile(userProfile);

        // Set current authentication state
        currentAuth.username = username;
        currentAuth.encryptionKey = encryptionKey;
        currentAuth.kdfSalt = kdfSalt;
        currentAuth.encryptedIdentity = encryptedIdentity;

        utils.displayMessage('Registration successful! Logging you in...', 'text-green-400 bg-green-800');

        // Render main journal app after successful registration and login
        ui.renderMainJournalApp(document.getElementById('app-content-container'), username);

        return true;
    } catch (error) {
        console.error('Registration failed:', error);
        utils.displayMessage(`Registration failed: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Logs in an existing user.
 * @param {string} username The username.
 * @param {string} masterPassword The master password.
 * @returns {Promise<boolean>} True if login is successful, false otherwise.
 */
export async function loginUser(username, masterPassword) {
    if (!username || !masterPassword) {
        utils.displayMessage('Username and master password are required.', 'text-red-400 bg-red-800');
        return false;
    }

    try {
        ui.showLoadingOverlay('Logging in...');
        const userProfile = await storage.getUserProfile(username);

        if (!userProfile) {
            utils.displayMessage('User not found. Please register.', 'text-red-400 bg-red-800');
            return false;
        }

        // Convert kdfSalt back to Uint8Array for key derivation
        const kdfSalt = new Uint8Array(userProfile.kdfSalt);
        const derivedKey = await crypto.deriveKeyFromPassword(masterPassword, kdfSalt);

        // Attempt to decrypt the identity payload to verify the master password
        let decryptedIdentity;
        try {
            decryptedIdentity = JSON.parse(await crypto.decrypt(
                userProfile.encryptedIdentity.ciphertext,
                userProfile.encryptedIdentity.iv,
                userProfile.encryptedIdentity.authTag,
                derivedKey
            ));
        } catch (decryptError) {
            console.error('Decryption failed during login:', decryptError);
            utils.displayMessage('Invalid username or master password.', 'text-red-400 bg-red-800');
            return false;
        }

        // Basic sanity check: ensure decrypted username matches
        if (decryptedIdentity.username !== username) {
            console.error('Decrypted identity username mismatch.', decryptedIdentity, username);
            utils.displayMessage('Login failed: Corrupted user profile.', 'text-red-400 bg-red-800');
            return false;
        }

        // Set current authentication state
        currentAuth.username = username;
        currentAuth.encryptionKey = derivedKey;
        currentAuth.kdfSalt = kdfSalt; // Store as Uint8Array for consistency
        currentAuth.encryptedIdentity = userProfile.encryptedIdentity; // Store as is

        utils.displayMessage('Login successful!', 'text-green-400 bg-green-800');

        // Render main journal app after successful login
        ui.renderMainJournalApp(document.getElementById('app-content-container'), username);

        return true;
    } catch (error) {
        console.error('Login failed:', error);
        utils.displayMessage(`An unexpected error occurred during login: ${error.message}`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        ui.hideLoadingOverlay();
    }
}

/**
 * Logs out the current user. Clears in-memory session data.
 */
export function logoutUser() {
    currentAuth.username = null;
    currentAuth.encryptionKey = null;
    currentAuth.kdfSalt = null;
    currentAuth.encryptedIdentity = null;
    utils.displayMessage('You have been logged out.', 'text-blue-300 bg-gray-700');
    console.log('User logged out.');
}

/**
 * Deletes the user account and all associated data from IndexedDB.
 * Requires re-entering the master password for confirmation.
 * @param {string} username The username of the account to delete.
 * @param {string} masterPassword The master password for confirmation.
 * @returns {Promise<boolean>} True if deletion is successful, false otherwise.
 */
export async function deleteAccount(username, masterPassword) {
    if (!username || !masterPassword) {
        utils.displayMessage('Username and master password are required for deletion.', 'text-red-400 bg-red-800');
        return false;
    }

    try {
        ui.showLoadingOverlay('Deleting account...');
        const userProfile = await storage.getUserProfile(username);

        if (!userProfile) {
            utils.displayMessage('Account not found.', 'text-red-400 bg-red-800');
            return false;
        }

        // Verify master password before deletion
        const kdfSalt = new Uint8Array(userProfile.kdfSalt);
        const derivedKey = await crypto.deriveKeyFromPassword(masterPassword, kdfSalt);

        // Attempt to decrypt identity payload to verify key
        try {
            await crypto.decrypt(
                userProfile.encryptedIdentity.ciphertext,
                userProfile.encryptedIdentity.iv,
                userProfile.encryptedIdentity.authTag,
                derivedKey
            );
        } catch (decryptError) {
            console.error('Master password verification failed during deletion:', decryptError);
            utils.displayMessage('Incorrect master password. Account deletion cancelled.', 'text-red-400 bg-red-800');
            return false;
        }

        // Master password verified, proceed with deletion
        await storage.clearAllData(); // Clears user profile AND all journal entries
        logoutUser(); // Clear current session
        ui.renderLoginForm(document.getElementById('app-content-container')); // Go back to login/register screen

        utils.displayMessage('Account and all data successfully deleted.', 'text-green-400 bg-green-800');
        return true;
    } catch (error) {
        console.error('Account deletion failed:', error);
        utils.displayMessage(`Account deletion failed: ${error.message}.`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        ui.hideLoadingOverlay();
    }
}
