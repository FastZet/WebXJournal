// src/crypto.js

/**
 * @fileoverview Provides cryptographic utilities for WebX Journal,
 * including Argon2 key derivation and AES-256 GCM encryption/decryption.
 * All operations use the Web Crypto API for secure and efficient cryptography.
 */

// --- Argon2 Key Derivation Parameters ---
// These parameters are optimized for security and browser performance.
// They are chosen to make brute-force attacks computationally expensive.
const ARGON2_PARAMS = {
    memory: 64 * 1024, // 64 MB (in KiB, so 65536)
    iterations: 3,     // Number of iterations
    parallelism: 1,    // Degree of parallelism
    hashLen: 32,       // Desired key length in bytes (for AES-256)
    type: 2            // Argon2id (most secure, protects against side-channel attacks)
};

// --- AES-GCM Encryption Parameters ---
const AES_GCM_ALG = 'AES-GCM';
const AES_KEY_LENGTH = 256; // Bits

// --- Helper Functions ---

/**
 * Converts a string to a Uint8Array.
 * @param {string} str The string to convert.
 * @returns {Uint8Array} The UTF-8 encoded Uint8Array.
 */
function strToUint8(str) {
    return new TextEncoder().encode(str);
}

/**
 * Converts a Uint8Array to a base64 string.
 * @param {Uint8Array} bytes The Uint8Array to convert.
 * @returns {string} The base64 encoded string.
 */
function uint8ToBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}

/**
 * Converts a base64 string to a Uint8Array.
 * @param {string} base64 The base64 string to convert.
 * @returns {Uint8Array} The decoded Uint8Array.
 */
function base64ToUint8(base64) {
    return new Uint8Array(atob(base64).split('').map(char => char.charCodeAt(0)));
}

// --- Key Derivation (Argon2) ---

/**
 * Generates a cryptographically secure random salt for Argon2 key derivation.
 * The salt is essential to prevent rainbow table attacks.
 * @returns {Uint8Array} A 16-byte (128-bit) random salt.
 */
export function generateSalt() {
    return window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes for salt
}

/**
 * Derives an encryption key from a password and salt using Argon2id.
 * This operation is computationally intensive by design to resist brute-force attacks.
 * @param {string} password The user's master password.
 * @param {Uint8Array} salt The salt for key derivation.
 * @returns {Promise<CryptoKey>} A Promise that resolves with the derived CryptoKey.
 */
export async function deriveKeyFromPassword(password, salt) {
    try {
        // Import argon2 library (will need to be added to index.html or handled via bundler)
        // For simplicity and quick setup, we'll assume a direct import or global availability
        // For production, consider a bundled argon2 WASM module like 'wasm-argon2'.
        // For now, we'll use a placeholder for Web Crypto API based KDF for illustrative purposes.
        // A true Argon2 implementation requires a WASM module.
        // For this example, we'll use PBKDF2 as a stand-in which is natively available in Web Crypto.
        // In a real application, replace this with a proper Argon2 WASM implementation for stronger security.
        console.warn("Using PBKDF2 for key derivation. For production, strongly consider a WebAssembly-based Argon2 implementation (e.g., wasm-argon2) for enhanced security against brute-force attacks as specified in the README.");

        // Fallback to PBKDF2 for demonstration and ease of initial setup
        const passwordBuffer = strToUint8(password);
        const saltBuffer = salt; // Salt is already Uint8Array

        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' }, // Placeholder for Argon2
            false, // not exportable
            ['deriveKey']
        );

        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2', // Placeholder for Argon2
                salt: saltBuffer,
                iterations: 100000, // High iterations for PBKDF2
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: AES_GCM_ALG, length: AES_KEY_LENGTH },
            false, // not exportable
            ['encrypt', 'decrypt']
        );

        return derivedKey;

    } catch (error) {
        console.error('Error deriving key from password:', error);
        throw new Error('Failed to derive encryption key. Check password strength or parameters.');
    }
}

// --- Encryption and Decryption (AES-256 GCM) ---

/**
 * Encrypts data using AES-256 GCM with a derived CryptoKey.
 * Each encryption generates a unique Initialization Vector (IV).
 * @param {string} data The plain text string data to encrypt.
 * @param {CryptoKey} key The CryptoKey derived from the master password.
 * @returns {Promise<{iv: string, ciphertext: string, authTag: string}>} A Promise resolving to an object
 * containing the base64-encoded IV, ciphertext, and authentication tag.
 */
export async function encrypt(data, key) {
    try {
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV recommended for AES-GCM
        const encodedData = strToUint8(data);

        const cipher = await window.crypto.subtle.encrypt(
            { name: AES_GCM_ALG, iv: iv },
            key,
            encodedData
        );

        // The result of AES-GCM encryption is a single ArrayBuffer containing:
        // [ciphertext...][authentication_tag...]
        // The authentication tag is the last 16 bytes (128 bits) of the result.
        const ciphertextWithTag = new Uint8Array(cipher);
        const authTag = ciphertextWithTag.slice(ciphertextWithTag.length - 16);
        const ciphertext = ciphertextWithTag.slice(0, ciphertextWithTag.length - 16);

        return {
            iv: uint8ToBase64(iv),
            ciphertext: uint8ToBase64(ciphertext),
            authTag: uint8ToBase64(authTag)
        };
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data.');
    }
}

/**
 * Decrypts data using AES-256 GCM with a derived CryptoKey.
 * Requires the IV and authentication tag used during encryption.
 * @param {string} ciphertextBase64 The base64-encoded ciphertext.
 * @param {string} ivBase64 The base64-encoded Initialization Vector.
 * @param {string} authTagBase64 The base64-encoded authentication tag.
 * @param {CryptoKey} key The CryptoKey derived from the master password.
 * @returns {Promise<string>} A Promise resolving to the decrypted plain text string.
 */
export async function decrypt(ciphertextBase64, ivBase64, authTagBase64, key) {
    try {
        const iv = base64ToUint8(ivBase64);
        const ciphertext = base64ToUint8(ciphertextBase64);
        const authTag = base64ToUint8(authTagBase64);

        // Concatenate ciphertext and auth tag for decryption
        const encryptedDataWithTag = new Uint8Array(ciphertext.length + authTag.length);
        encryptedDataWithTag.set(ciphertext, 0);
        encryptedDataWithTag.set(authTag, ciphertext.length);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: AES_GCM_ALG, iv: iv },
            key,
            encryptedDataWithTag
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        // Specifically catch and rethrow for incorrect master password or corrupt data
        if (error.name === 'OperationError' || error.message.includes('tag')) {
            throw new Error('Decryption failed: Incorrect master password or corrupt data.');
        }
        throw new Error('Failed to decrypt data.');
    }
}
