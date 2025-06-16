// src/auth.js

/**
 * @fileoverview Manages local user authentication for WebX Journal.
 * Handles user registration, login, and checks for existing user profiles.
 */

import { getUserProfile, saveUserProfile, getAllJournalEntries } from './storage.js';
import { deriveKeyFromPassword, generateSalt, encrypt, decrypt } from './crypto.js';
import { displayMessage } from './utils.js'; // For displaying messages to the user

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
 * @returns {Promise<{success: boolean, username: string}>} A Promise that resolves
 * with success status and the username.
 */
export async function registerUser(username, masterPassword) {
    // Basic validation
    if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long.');
    }
    if (!masterPassword || masterPassword.length < 8) {
        throw new Error('Master Password must be at least 8 characters long.');
    }

    // Check if a user with this username already exists
    const existingUser = await getUserProfile(username);
    if (existingUser) {
        throw new Error(`Username '${username}' already exists. Please choose a different one or log in.`);
    }

    try {
        // Generate a unique salt for this user's password derivation
        const salt = generateSalt();
        const saltBase64 = btoa(String.fromCharCode(...salt)); // Store salt as base64 string

        // Derive the encryption key using the master password and salt
        const encryptionKey = await deriveKeyFromPassword(masterPassword, salt);
        currentAuth.encryptionKey = encryptionKey; // Store the key in memory for the session

        // Encrypt a simple user profile payload.
        // The salt is stored in the user profile, but encrypted with the master password,
        // so it's protected and required for key derivation on subsequent logins.
        const userProfileData = {
            username: username,
            salt: saltBase64, // Store the salt base64 encoded
            createdAt: new Date().toISOString(),
            version: CURRENT_DATA_VERSION
        };

        // Encrypt the user profile itself using the derived key
        const encryptedUserProfile = await encrypt(JSON.stringify(userProfileData), encryptionKey);

        // Save the encrypted profile to IndexedDB.
        // We add the username directly to the stored object for keyPath indexing.
        const profileToStore = {
            username: username, // Used as keyPath in IndexedDB
            encrypted: encryptedUserProfile,
            version: CURRENT_DATA_VERSION
        };
        await saveUserProfile(profileToStore);

        currentAuth.username = username;
        console.log(`User '${username}' successfully registered and profile saved.`);
        return { success: true, username: username };

    } catch (error) {
        console.error('Error during user registration:', error);
        throw new Error(`Registration failed: ${error.message}`);
    }
}

/**
 * Logs in an existing user.
 * This involves retrieving the user profile, deriving the key using the provided password and stored salt,
 * and attempting to decrypt the profile to verify the password.
 * @param {string} username The username to log in.
 * @param {string} masterPassword The master password provided by the user.
 * @returns {Promise<{success: boolean, username: string}>} A Promise that resolves
 * with success status and the username.
 */
export async function loginUser(username, masterPassword) {
    if (!username || !masterPassword) {
        throw new Error('Username and Master Password are required.');
    }

    try {
        const storedProfile = await getUserProfile(username);
        if (!storedProfile) {
            throw new Error('User not found. Please check your username.');
        }

        const encryptedProfile = storedProfile.encrypted;
        const saltBase64 = JSON.parse(await decrypt(encryptedProfile.ciphertext, encryptedProfile.iv, encryptedProfile.authTag, await deriveKeyFromPassword(masterPassword, new Uint8Array(0))))?.salt;
        
        if (!saltBase64) {
            throw new Error('Could not retrieve salt from user profile. Data might be corrupt.');
        }
        
        const salt = new Uint8Array(atob(saltBase64).split('').map(char => char.charCodeAt(0)));
        const encryptionKey = await deriveKeyFromPassword(masterPassword, salt);
        
        // Attempt to decrypt the user profile using the derived key.
        // If decryption fails (e.g., wrong password), it will throw an error.
        const decryptedUserProfileJson = await decrypt(
            encryptedProfile.ciphertext,
            encryptedProfile.iv,
            encryptedProfile.authTag,
            encryptionKey
        );
        const decryptedUserProfile = JSON.parse(decryptedUserProfileJson);

        // Basic verification that the decrypted profile is valid and matches the username
        if (decryptedUserProfile.username !== username) {
            // This should ideally not happen if decryption succeeds, but good for robustness
            throw new Error('Decrypted profile username mismatch.');
        }
        if (decryptedUserProfile.version !== CURRENT_DATA_VERSION) {
            console.warn(`User profile version mismatch. Expected ${CURRENT_DATA_VERSION}, got ${decryptedUserProfile.version}. Migration logic may be needed.`);
            // TODO: Implement data migration logic here for future versions
        }

        currentAuth.username = username;
        currentAuth.encryptionKey = encryptionKey; // Store the key in memory
        console.log(`User '${username}' successfully logged in.`);
        return { success: true, username: username };

    } catch (error) {
        console.error('Error during user login:', error);
        // Provide more user-friendly messages for common errors
        if (error.message.includes('Incorrect master password')) {
            throw new Error('Incorrect username or master password.');
        }
        throw new Error(`Login failed: ${error.message}`);
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
        const allProfiles = await getAllJournalEntries(); // Using getAllJournalEntries for a quick check
        // We assume if there are any entries, a user profile must exist.
        // A more robust check would be to look specifically for a user profile,
        // but for a single-user local app, this is sufficient for initial check.
        const userProfile = await getUserProfile('temp_username'); // Assuming a fixed username for now
        return { isRegistered: allProfiles.length > 0 || userProfile != undefined};
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
