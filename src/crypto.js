// src/crypto.js

const ALGORITHM = 'AES-GCM';
const ITERATIONS = 100000; // Number of iterations for PBKDF2
const KEY_LENGTH = 256;    // Key length in bits (256-bit key)
const SALT_LENGTH = 16;    // Salt length in bytes
const IV_LENGTH = 12;      // IV length in bytes for AES-GCM

/**
 * Generates a random salt.
 * @param {number} length - The length of the salt in bytes.
 * @returns {Uint8Array} - The generated salt.
 */
export function generateSalt(length = SALT_LENGTH) {
    return window.crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derives an encryption key from a password and salt using PBKDF2.
 * @param {string} password - The user's master password.
 * @param {Uint8Array} salt - The salt for key derivation.
 * @returns {Promise<CryptoKey>} - The derived encryption key.
 */
export async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data using AES-GCM.
 * @param {string} data - The data to encrypt.
 * @param {CryptoKey} key - The encryption key.
 * @returns {Promise<{ciphertext: Uint8Array, iv: Uint8Array}>} - The encrypted data (ciphertext and IV).
 */
export async function encrypt(data, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const enc = new TextEncoder();
    const encodedData = enc.encode(data);

    const ciphertext = await window.crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv: iv,
        },
        key,
        encodedData
    );

    return { ciphertext: new Uint8Array(ciphertext), iv: iv };
}

/**
 * Decrypts data using AES-GCM.
 * @param {{ciphertext: Uint8Array, iv: Uint8Array}} encryptedData - The encrypted data (ciphertext and IV).
 * @param {CryptoKey} key - The decryption key.
 * @returns {Promise<string>} - The decrypted data.
 */
export async function decrypt(encryptedData, key) {
    const dec = new TextDecoder();
    const decrypted = await window.crypto.subtle.decrypt(
        {
            name: ALGORITHM,
            iv: encryptedData.iv,
        },
        key,
        encryptedData.ciphertext
    );

    return dec.decode(decrypted);
}

/**
 * Converts a Uint8Array to a Base64 string.
 * @param {Uint8Array} bytes - The byte array to convert.
 * @returns {string} - The Base64 encoded string.
 */
export function bytesToBase64(bytes) {
    return btoa(String.fromCharCode.apply(null, bytes));
}

/**
 * Converts a Base64 string to a Uint8Array.
 * @param {string} base64 - The Base64 encoded string.
 * @returns {Uint8Array} - The decoded byte array.
 */
export function base64ToBytes(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Exports a CryptoKey to a JWK format (JSON Web Key).
 * @param {CryptoKey} key - The key to export.
 * @returns {Promise<JsonWebKey>} - The key in JWK format.
 */
export async function exportCryptoKey(key) {
    return window.crypto.subtle.exportKey('jwk', key);
}

/**
 * Imports a CryptoKey from a JWK format.
 * @param {JsonWebKey} jwk - The JWK to import.
 * @returns {Promise<CryptoKey>} - The imported CryptoKey.
 */
export async function importCryptoKey(jwk) {
    return window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}
