// src/auth.js

/**
 * @fileoverview Manages local user authentication for WebX Journal.
 * Handles user registration, login, and checks for existing user profiles.
 */

import { getUserProfile, saveUserProfile, deleteUserProfile, clearAllData } from './storage.js';
import { deriveKeyFromPassword, generateSalt, encrypt, decrypt } from './crypto.js';
import { displayMessage } from './utils.js'; // For displaying messages to the user
import { showLoadingOverlay, hideLoadingOverlay, renderRegisterForm, renderLoginForm, renderMainJournalApp } from './ui.js';

// Global variable to store the actively logged-in user's data and derived key
let currentAuth = {
    username: null,
    encryptionKey: null // The CryptoKey derived from the master password
};

// --- Constants for Data Versioning ---
// This is crucial for future-proofing your data.
const CURRENT_DATA_VERSION = 1;

// --- Authentication Functions ---

/**
 * Registers a new user.
 * This involves generating a salt, deriving a key from the password,
 * encrypting a dummy user profile (or actual metadata), and saving it to IndexedDB.
 * @param {string} username The chosen username for the new account.
 * @param {string} masterPassword The master password chosen by the user.
 * @returns {Promise<boolean>} A Promise that resolves with success status.
 */
export async function registerUser(username, masterPassword) {
    showLoadingOverlay('Registering account...');
    try {
        // Basic validation
        if (!username || username.length < 3) {
            displayMessage('Username must be at least 3 characters long.', 'text-red-400 bg-red-800');
            return false;
        }
        if (!masterPassword || masterPassword.length < 8) {
            displayMessage('Master Password must be at least 8 characters long.', 'text-red-400 bg-red-800');
            return false;
        }

        // Check if a user with this username already exists
        const existingUser = await getUserProfile(username);
        if (existingUser) {
            displayMessage(`Registration failed: Username '${username}' already exists.`, 'text-red-400 bg-red-800');
            return false;
        }

        // Generate a unique salt for this user's password derivation.
        // This salt is NOT secret and can be stored alongside the encrypted data.
        const kdfSalt = generateSalt(); // Uint8Array

        // Derive the encryption key using the master password and the KDF salt
        const encryptionKey = await deriveKeyFromPassword(masterPassword, kdfSalt);

        // Prepare a minimal user identity payload to be encrypted.
        // This is just to verify the password upon decryption.
        const encryptedIdentityPayload = {
            username: username,
            version: CURRENT_DATA_VERSION,
            createdAt: new Date().toISOString()
        };

        // Encrypt the identity payload using the derived key
        const encryptedIdentity = await encrypt(JSON.stringify(encryptedIdentityPayload), encryptionKey);

        // Save the user profile data to IndexedDB.
        // kdfSalt is stored directly (as it's not secret and needed for future key derivation).
        // The encrypted identity payload (iv, ciphertext, authTag) is also stored.
        const profileToStore = {
            username: username, // Used as keyPath in IndexedDB
            kdfSalt: Array.from(kdfSalt), // Store the KDF salt (Uint8Array converted to Array)
            encryptedIdentity: {
                iv: encryptedIdentity.iv, // Base64 string
                ciphertext: encryptedIdentity.ciphertext, // Base64 string
                authTag: encryptedIdentity.authTag // Base64 string
            },
            version: CURRENT_DATA_VERSION // Version of the stored object structure itself
        };
        await saveUserProfile(profileToStore);

        currentAuth = {
            username: username,
            encryptionKey: encryptionKey
        };

        displayMessage('Registration successful! Redirecting to journal...', 'text-green-400 bg-green-800');
        renderMainJournalApp(document.getElementById('app-content-container'), username);
        return true;

    } catch (error) {
        console.error('Error during user registration:', error);
        displayMessage(`Registration failed: ${error.message}`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Logs in an existing user.
 * This involves retrieving the user profile, deriving the key using the provided password and stored salt,
 * and attempting to decrypt the profile to verify the password.
 * @param {string} username The username to log in.
 * @param {string} masterPassword The master password provided by the user.
 * @returns {Promise<boolean>} A Promise that resolves with success status.
 */
export async function loginUser(username, masterPassword) {
    showLoadingOverlay('Logging in...');
    try {
        if (!username || !masterPassword) {
            displayMessage('Username and Master Password are required.', 'text-red-400 bg-red-800');
            return false;
        }

        const storedProfile = await getUserProfile(username);
        if (!storedProfile) {
            displayMessage('Login failed: User not found.', 'text-red-400 bg-red-800');
            return false;
        }

        // Find the `kdfSalt` from the `storedProfile`
        const kdfSalt = new Uint8Array(storedProfile.kdfSalt); // This needs to be a Uint8Array for deriveKeyFromPassword

        const encryptionKey = await deriveKeyFromPassword(masterPassword, kdfSalt);

        let decryptedProfileData;
        try {
            // Decrypt the `encryptedIdentity` object which contains base64 strings
            decryptedProfileData = JSON.parse(await decrypt(
                storedProfile.encryptedIdentity.ciphertext,
                storedProfile.encryptedIdentity.iv,
                storedProfile.encryptedIdentity.authTag,
                encryptionKey
            ));
        } catch (decryptError) {
            console.error('Decryption failed during login (incorrect password or corrupted data):', decryptError);
            displayMessage('Login failed: Incorrect master password or corrupted data.', 'text-red-400 bg-red-800');
            return false;
        }

        // Verify the username and version from the decrypted profile data
        if (decryptedProfileData.username !== username) {
            displayMessage('Login failed: Username mismatch after decryption (data corrupted).', 'text-red-400 bg-red-800');
            return false;
        }
        if (decryptedProfileData.version !== CURRENT_DATA_VERSION) {
            console.warn(`User profile version mismatch. Expected ${CURRENT_DATA_VERSION}, got ${decryptedProfileData.version}. Migration logic may be needed.`);
            // TODO: Implement data migration logic for user profiles here
        }

        currentAuth = {
            username: username,
            encryptionKey: encryptionKey
        };

        displayMessage(`Welcome back, ${username}!`, 'text-green-400 bg-green-800');
        renderMainJournalApp(document.getElementById('app-content-container'), username);
        return true;

    } catch (error) {
        console.error('Error during user login:', error);
        displayMessage(`An unexpected error occurred during login: ${error.message}`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        hideLoadingOverlay();
    }
}

/**
 * Checks if any user profile exists in IndexedDB.
 * This determines whether to show the login or registration form initially.
 * @returns {Promise<{isRegistered: boolean}>} A Promise that resolves with a boolean
 * indicating if at least one user profile is registered.
 */
export async function getAuthStatus() {
    try {
        // Attempt to retrieve any user profile. In a single-user app,
        // if getUserProfile returns anything, we assume a user exists.
        // If your getUserProfile requires a specific username, this might need adjustment.
        // For now, let's assume if there are any profiles, it counts as registered.
        const allKeys = await storage.getAllProfileKeys(); // Assuming a new function in storage.js to get all keys
        return { isRegistered: allKeys && allKeys.length > 0 };
    } catch (error) {
        console.error('Error checking authentication status:', error);
        // If IndexedDB isn't initialized or any other error, assume no user is registered
        return { isRegistered: false };
    }
}

/**
 * Retrieves the currently active user's encryption key.
 * This key should only be available after a successful login/registration.
 * @returns {CryptoKey|null} The current CryptoKey, or null if not logged in.
 */
export function getCurrentEncryptionKey() {
    return currentAuth.encryptionKey;
}

/**
 * Retrieves the currently active user's username.
 * @returns {string|null} The current username, or null if not logged in.
 */
export function getCurrentUsername() {
    return currentAuth.username;
}

/**
 * Clears the current session data, effectively logging the user out.
 * This does NOT delete data from IndexedDB.
 */
export function logoutUser() {
    currentAuth.username = null;
    currentAuth.encryptionKey = null;
    console.log('User logged out. Session data cleared from memory.');
}

/**
 * Deletes a user account and all associated journal entries from IndexedDB.
 * Requires re-authentication with master password for security.
 * @param {string} username The username of the account to delete.
 * @param {string} masterPassword The master password for verification.
 * @returns {Promise<boolean>} A Promise that resolves to true if deletion is successful, false otherwise.
 */
export async function deleteAccount(username, masterPassword) {
    showLoadingOverlay('Deleting account...');
    try {
        // Authenticate the user before deletion
        const storedProfile = await getUserProfile(username);
        if (!storedProfile) {
            displayMessage('Account deletion failed: User not found.', 'text-red-400 bg-red-800');
            return false;
        }

        // Convert stored kdfSalt (Array to Uint8Array)
        const kdfSalt = new Uint8Array(storedProfile.kdfSalt);
        const encryptionKey = await deriveKeyFromPassword(masterPassword, kdfSalt);

        // Attempt to decrypt the identity payload to verify the master password
        try {
            const decryptedIdentityData = JSON.parse(await decrypt(
                storedProfile.encryptedIdentity.ciphertext,
                storedProfile.encryptedIdentity.iv,
                storedProfile.encryptedIdentity.authTag,
                encryptionKey
            ));
            if (decryptedIdentityData.username !== username) {
                // This indicates a severe data corruption or unexpected state
                displayMessage('Account deletion failed: Decrypted identity mismatch.', 'text-red-400 bg-red-800');
                return false;
            }
        } catch (decryptError) {
            console.error('Password verification failed during account deletion:', decryptError);
            displayMessage('Account deletion failed: Incorrect master password.', 'text-red-400 bg-red-800');
            return false;
        }

        // Use custom confirmation dialog instead of browser's `confirm`
        const confirmation = prompt(`Are you absolutely sure you want to delete the account "${username}" and ALL its journal entries? This action is irreversible. Type "DELETE" to confirm:`);
        if (confirmation !== 'DELETE') {
            displayMessage('Account deletion cancelled.', 'text-blue-300 bg-gray-700');
            return false;
        }

        // Delete the specific user profile
        await deleteUserProfile(username); // Your storage.js deleteUserProfile function
        // Clear all journal entries (assuming a single-user model where all entries belong to the deleted user)
        await clearAllData(); // Your storage.js clearAllData function

        logoutUser(); // Clear in-memory session
        displayMessage(`Account "${username}" and all associated data have been permanently deleted.`, 'text-green-400 bg-green-800');

        // Re-render the initial app state (login/register form)
        const appContentContainer = document.getElementById('app-content-container');
        appContentContainer.innerHTML = ''; // Clear current content
        const { getAuthStatus: getAuthStatusFromMain } = await import('./main.js'); // Dynamically import initializeJournalApp from main.js
        await getAuthStatusFromMain().then(status => {
            if (status.isRegistered) {
                renderLoginForm(appContentContainer);
            } else {
                renderRegisterForm(appContentContainer);
            }
        });
        return true;
    } catch (error) {
        console.error('Error deleting account:', error);
        displayMessage(`Failed to delete account: ${error.message}`, 'text-red-400 bg-red-800');
        return false;
    } finally {
        hideLoadingOverlay();
    }
}
