// src/auth.js

// Import individual functions from storage.js
import {
    getUserProfile,
    addUserProfile,
    clearStore,
    USER_PROFILE_STORE
} from './storage.js';
// Import individual functions from crypto.js
import {
    deriveKey,
    encrypt,
    decrypt,
    generateSalt,
    bytesToBase64,
    base64ToBytes,
    exportCryptoKey,
    importCryptoKey
} from './crypto.js';


let encryptionKey = null; // Stored in memory after successful authentication
let currentUsername = null;

/**
 * Initializes the authentication state.
 * Checks if a user profile exists and attempts to auto-login.
 * @returns {Promise<boolean>} - True if authenticated, false otherwise.
 */
export async function init() {
    try {
        const userProfile = await getUserProfile('qwerty'); // Assuming 'qwerty' is the fixed username
        if (userProfile && userProfile.encryptedIdentity) {
            // Attempt to re-derive key from stored salt and master password if available in session
            // For simplicity, we won't auto-login without user interaction
            // A more robust app might try to use a session key or prompt for password
            console.log('User profile found. Ready for login.');
            return false; // User profile exists, but not auto-logged in
        } else {
            console.log('No user profile found. Ready for registration.');
            return false; // No user profile, not authenticated
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
        return false; // Error occurred, not authenticated
    }
}

/**
 * Registers a new user with a master password.
 * @param {string} masterPassword - The user's master password.
 * @returns {Promise<void>}
 */
export async function registerUser(masterPassword) {
    if (await getUserProfile('qwerty')) {
        throw new Error('User already registered.');
    }

    const salt = generateSalt();
    const encryptionKeyRaw = await deriveKey(masterPassword, salt);
    const exportedKey = await exportCryptoKey(encryptionKeyRaw);

    // Encrypt a dummy value to create an 'identity' that proves key derivation works
    const identityText = 'identity_check';
    const encryptedIdentity = await encrypt(identityText, encryptionKeyRaw);

    const userProfile = {
        username: 'qwerty', // Fixed username for simplicity
        kdfSalt: bytesToBase64(salt),
        encryptedIdentity: {
            ciphertext: bytesToBase64(encryptedIdentity.ciphertext),
            iv: bytesToBase64(encryptedIdentity.iv)
        },
        version: 1
    };

    await addUserProfile(userProfile);
    console.log('User registered successfully.');
}

/**
 * Logs in a user with the master password.
 * @param {string} masterPassword - The user's master password.
 * @returns {Promise<boolean>} - True if login is successful, false otherwise.
 */
export async function loginUser(masterPassword) {
    const userProfile = await getUserProfile('qwerty');
    if (!userProfile) {
        throw new Error('User not registered. Please register first.');
    }

    const salt = base64ToBytes(userProfile.kdfSalt);
    let derivedKey;
    try {
        derivedKey = await deriveKey(masterPassword, salt);
    } catch (e) {
        console.error("Key derivation failed:", e);
        return false; // Password likely incorrect or derivation issue
    }

    try {
        const iv = base64ToBytes(userProfile.encryptedIdentity.iv);
        const ciphertext = base64ToBytes(userProfile.encryptedIdentity.ciphertext);
        const decryptedIdentity = await decrypt({ ciphertext, iv }, derivedKey);

        if (decryptedIdentity === 'identity_check') {
            encryptionKey = derivedKey;
            currentUsername = userProfile.username;
            console.log('Login successful.');
            return true;
        } else {
            console.warn('Decrypted identity mismatch. Incorrect password.');
            return false;
        }
    } catch (error) {
        console.error('Decryption failed during login identity check:', error);
        return false; // Decryption failed, likely wrong password
    }
}

/**
 * Logs out the current user.
 */
export async function logout() {
    encryptionKey = null;
    currentUsername = null;
    console.log('Logged out.');
    // In a real app, you might clear session storage or cookies here.
}

/**
 * Retrieves the current in-memory encryption key.
 * @returns {CryptoKey|null} - The encryption key if authenticated, otherwise null.
 */
export function getCurrentEncryptionKey() {
    return encryptionKey;
}

/**
 * Exports user keys (for backup/migration).
 * Returns the raw user profile data that can be re-imported.
 * @param {CryptoKey} key - The current active encryption key.
 * @returns {Promise<object>} - An object containing the encrypted user profile.
 */
export async function exportKeys(key) {
    if (!currentUsername) {
        throw new Error("No user logged in to export keys.");
    }
    // We export the already encrypted user profile from storage
    const userProfile = await getUserProfile(currentUsername);
    if (!userProfile) {
        throw new Error("User profile not found for export.");
    }
    return {
        userProfile: userProfile
    };
}
