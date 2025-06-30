// src/crypto.js

/**
 * @fileoverview Handles all cryptographic operations for WebX Journal.
 * This includes key derivation (KDF), encryption, and decryption using Web Crypto API.
 */

// Encryption algorithm and parameters
const ALGORITHM_AES_GCM = {
    name: 'AES-GCM',
    ivLength: 12 // 96-bit IV as recommended for AES-GCM
};

// Key Derivation Function (KDF) algorithm and parameters
const ALGORITHM_PBKDF2 = {
    name: 'PBKDF2',
    hash: 'SHA-256',
    iterations: 200000 // A high number of iterations for stronger security
};

// Key export format
const KEY_FORMAT = 'raw';

/**
 * Generates a cryptographically secure random salt for key derivation.
 * @returns {Uint8Array} A 16-byte (128-bit) salt.
 */
export function generateSalt() {
    return window.crypto.getRandomValues(new Uint8Array(16)); // 16 bytes for salt
}

/**
 * Generates a cryptographically secure random Initialization Vector (IV) for AES-GCM.
 * @returns {Uint8Array} A 12-byte (96-bit) IV.
 */
function generateIv() {
    return window.crypto.getRandomValues(new Uint8Array(ALGORITHM_AES_GCM.ivLength));
}

/**
 * Derives an encryption key from a master password using PBKDF2.
 * The derived key is suitable for AES-GCM encryption.
 * @param {string} password The user's master password.
 * @param {Uint8Array} salt A unique salt for key derivation.
 * @returns {Promise<CryptoKey>} A Promise that resolves with the derived CryptoKey.
 */
export async function deriveKeyFromPassword(password, salt) {
    // Encode password as UTF-8 Uint8Array
    const passwordBytes = new TextEncoder().encode(password);

    // Import the password as an unextractable raw key
    const baseKey = await window.crypto.subtle.importKey(
        KEY_FORMAT,
        passwordBytes,
        { name: ALGORITHM_PBKDF2.name },
        false, // Not extractable
        ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key using PBKDF2
    const derivedKey = await window.crypto.subtle.deriveKey(
        {
            name: ALGORITHM_PBKDF2.name,
            salt: salt,
            iterations: ALGORITHM_PBKDF2.iterations,
            hash: ALGORITHM_PBKDF2.hash,
        },
        baseKey,
        { name: ALGORITHM_AES_GCM.name, length: 256 }, // AES-256 GCM key
        false, // Not extractable
        ['encrypt', 'decrypt']
    );

    return derivedKey;
}

/**
 * Encrypts plaintext data using AES-GCM.
 * @param {string} plaintext The data to encrypt.
 * @param {CryptoKey} key The encryption key (derived from password).
 * @returns {Promise<{ iv: string, ciphertext: string, authTag: string }>}
 * A Promise that resolves with the IV, ciphertext, and authentication tag, all Base64 encoded.
 */
export async function encrypt(plaintext, key) {
    const iv = generateIv(); // Generate a new IV for each encryption

    // Encode plaintext as Uint8Array
    const encoded = new TextEncoder().encode(plaintext);

    const algorithm = {
        name: ALGORITHM_AES_GCM.name,
        iv: iv,
    };

    const ciphertextWithAuthTag = await window.crypto.subtle.encrypt(
        algorithm,
        key,
        encoded
    );

    // The result `ciphertextWithAuthTag` is an ArrayBuffer containing
    // the actual ciphertext followed by the 16-byte authentication tag.
    // We need to separate them.
    const tagLength = 16; // AES-GCM produces a 16-byte (128-bit) authentication tag
    const ciphertextBuffer = ciphertextWithAuthTag.slice(0, ciphertextWithAuthTag.byteLength - tagLength);
    const authTagBuffer = ciphertextWithAuthTag.slice(ciphertextWithAuthTag.byteLength - tagLength);

    // Convert ArrayBuffers to Base64 strings for storage
    return {
        iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        authTag: btoa(String.fromCharCode(...new Uint8Array(authTagBuffer)))
    };
}

/**
 * Decrypts data using AES-GCM.
 * @param {string} ciphertextBase64 The Base64-encoded ciphertext.
 * @param {string} ivBase64 The Base64-encoded Initialization Vector (IV).
 * @param {string} authTagBase64 The Base64-encoded authentication tag.
 * @param {CryptoKey} key The decryption key.
 * @returns {Promise<string>} A Promise that resolves with the decrypted plaintext.
 * @throws {DOMException} If decryption fails (e.g., incorrect key, corrupted data).
 */
export async function decrypt(ciphertextBase64, ivBase64, authTagBase64, key) {
    // Decode Base64 strings back to ArrayBuffers
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(authTagBase64), c => c.charCodeAt(0));

    // Combine ciphertext and authTag back into a single ArrayBuffer for decryption
    const combinedCiphertext = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    combinedCiphertext.set(ciphertext, 0);
    combinedCiphertext.set(authTag, ciphertext.byteLength);

    const algorithm = {
        name: ALGORITHM_AES_GCM.name,
        iv: iv,
    };

    const decrypted = await window.crypto.subtle.decrypt(
        algorithm,
        key,
        combinedCiphertext
    );

    // Decode decrypted ArrayBuffer back to string
    return new TextDecoder().decode(decrypted);
}
