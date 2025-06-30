// src/auth.js

import * as db from './storage.js'; // Import storage module to interact with IndexedDB
import * as crypto from './crypto.js'; // Import crypto module for hashing passwords and encryption
import * as utils from './utils.js'; // Import utils for message display

// Helper to get the current logged-in username from sessionStorage
export function getCurrentUsername() {
    return sessionStorage.getItem('webx_journal_username');
}

// Function to check if a user is currently authenticated
export async function checkAuthStatus() {
    const username = getCurrentUsername();
    // In a real app, you might also check for a valid session token here.
    // For now, we'll consider the user logged in if their username is in sessionStorage.
    return !!username; // Returns true if username exists, false otherwise
}

// Function to register a new user
export async function registerUser(username, masterPassword) {
    if (!username || !masterPassword) {
        throw new Error('Username and password are required.');
    }

    // Hash the master password using a secure, slow hashing algorithm (e.g., PBKDF2)
    // The salt should ideally be unique per user and stored alongside the hashed password.
    // For simplicity, we'll derive a consistent salt from the username for now,
    // but a random, stored salt is more secure.
    const salt = utils.stringToUint8Array(username); // Using username as salt for consistency
    const hashedPassword = await crypto.deriveKey(masterPassword, salt, 'hash');

    try {
        // Attempt to save the new user profile
        const userProfile = {
            username: username,
            hashedPassword: utils.uint8ArrayToBase64(hashedPassword), // Store hash as base64 string
            // In a real app, also store the salt used for hashing
        };
        
        // Check if user already exists
        const existingProfile = await db.getUserProfile(username);
        if (existingProfile) {
            throw new Error('User already exists.');
        }

        await db.saveUserProfile(userProfile);
        utils.displayMessage('Registration successful! Please log in.', 'text-green-300 bg-green-800');
        return true;
    } catch (error) {
        console.error("Registration error:", error);
        throw new Error(`Registration failed: ${error.message}`);
    }
}

// Function to log in a user
export async function loginUser(username, masterPassword) {
    if (!username || !masterPassword) {
        throw new Error('Username and password are required.');
    }

    try {
        const userProfile = await db.getUserProfile(username);

        if (!userProfile) {
            throw new Error('User not found.');
        }

        const storedHashedPassword = utils.base64ToUint8Array(userProfile.hashedPassword);
        const salt = utils.stringToUint8Array(username); // Re-derive salt as used during registration
        const inputHashedPassword = await crypto.deriveKey(masterPassword, salt, 'hash');

        // Compare the derived hash from input with the stored hash
        const passwordsMatch = await crypto.compareHashes(inputHashedPassword, storedHashedPassword);

        if (passwordsMatch) {
            // Store the master key (derived from masterPassword) in memory for current session
            const masterKey = await crypto.deriveKey(masterPassword, salt, 'encryption'); // Use same salt for key derivation
            sessionStorage.setItem('webx_journal_master_key', utils.uint8ArrayToBase64(new Uint8Array(masterKey)));
            sessionStorage.setItem('webx_journal_username', username);

            utils.displayMessage('Login successful!', 'text-green-300 bg-green-800');
            return true;
        } else {
            throw new Error('Incorrect password.');
        }
    } catch (error) {
        console.error("Login error:", error);
        throw new Error(`Login failed: ${error.message}`);
    }
}

// Function to log out a user
export function logoutUser() {
    sessionStorage.removeItem('webx_journal_master_key');
    sessionStorage.removeItem('webx_journal_username');
    utils.displayMessage('Logged out successfully.', 'text-green-300 bg-green-800');
    // Clear any existing UI and reload login form
    window.location.reload(); // Simple reload to go back to login state
}

// Function to change password (requires old password to derive old key and re-encrypt data)
export async function changePassword(username, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
        throw new Error('Both old and new passwords are required.');
    }
    if (oldPassword === newPassword) {
        throw new Error('New password cannot be the same as the old password.');
    }

    utils.displayMessage('Changing password...', 'text-blue-300 bg-blue-800');
    try {
        // 1. Verify old password
        const userProfile = await db.getUserProfile(username);
        if (!userProfile) {
            throw new Error('User profile not found.');
        }

        const storedHashedPassword = utils.base64ToUint8Array(userProfile.hashedPassword);
        const salt = utils.stringToUint8Array(username);
        const oldInputHashedPassword = await crypto.deriveKey(oldPassword, salt, 'hash');

        const passwordsMatch = await crypto.compareHashes(oldInputHashedPassword, storedHashedPassword);
        if (!passwordsMatch) {
            throw new Error('Incorrect old password.');
        }

        // 2. Derive new hashed password for storage
        const newHashedPassword = await crypto.deriveKey(newPassword, salt, 'hash');
        
        // 3. Update user profile with new hashed password
        userProfile.hashedPassword = utils.uint8ArrayToBase64(newHashedPassword);
        await db.saveUserProfile(userProfile); // Update the profile in IndexedDB

        // 4. Re-encrypt all journal entries with the new master key derived from the new password
        const oldMasterKey = await crypto.deriveKey(oldPassword, salt, 'encryption');
        const newMasterKey = await crypto.deriveKey(newPassword, salt, 'encryption');
        
        const entries = await db.getEntriesRaw(); // Get entries without decryption
        for (const entry of entries) {
            const decryptedContent = await crypto.decryptData(utils.base64ToUint8Array(entry.content), oldMasterKey, utils.base64ToUint8Array(entry.iv));
            const encryptedContent = await crypto.encryptData(decryptedContent, newMasterKey);
            entry.content = utils.uint8ArrayToBase64(encryptedContent.data);
            entry.iv = utils.uint8ArrayToBase64(encryptedContent.iv);
            await db.saveEntryRaw(entry); // Save updated entry
        }

        // 5. Update master key in sessionStorage
        sessionStorage.setItem('webx_journal_master_key', utils.uint8ArrayToBase64(new Uint8Array(newMasterKey)));

        utils.displayMessage('Password changed successfully and entries re-encrypted!', 'text-green-300 bg-green-800');
        return true;
    } catch (error) {
        console.error("Password change error:", error);
        throw new Error(`Password change failed: ${error.message}`);
    }
}
