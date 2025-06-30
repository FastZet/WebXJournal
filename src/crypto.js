// src/crypto.js

// Function to derive a key from a password using PBKDF2
// Purpose can be 'hash' (for password verification) or 'encryption' (for data encryption/decryption)
export async function deriveKey(password, salt, purpose) {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);

    // Base key from password
    const baseKey = await window.crypto.subtle.importKey( // Changed to window.crypto.subtle
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derived key for specific purpose
    const derivedBits = await window.crypto.subtle.deriveBits( // Changed to window.crypto.subtle
        {
            name: 'PBKDF2',
            salt: salt, // Use the provided salt
            iterations: 100000, // Number of iterations (higher is more secure, but slower)
            hash: 'SHA-256',
        },
        baseKey,
        256 // 256 bits for derived key/hash
    );

    if (purpose === 'hash') {
        // Return the raw derived bits for hashing (password verification)
        return new Uint8Array(derivedBits);
    } else if (purpose === 'encryption') {
        // Import the derived bits as an AES-GCM key for encryption
        return await window.crypto.subtle.importKey( // Changed to window.crypto.subtle
            'raw',
            derivedBits,
            { name: 'AES-GCM', length: 256 },
            false, // Not extractable
            ['encrypt', 'decrypt']
        );
    } else {
        throw new Error('Invalid key derivation purpose. Must be "hash" or "encryption".');
    }
}

// Function to compare two hashes securely (prevents timing attacks)
export async function compareHashes(hash1, hash2) {
    // Ensure both are Uint8Array
    if (!(hash1 instanceof Uint8Array) || !(hash2 instanceof Uint8Array)) {
        throw new Error('Hashes must be Uint8Array for comparison.');
    }
    if (hash1.byteLength !== hash2.byteLength) {
        return false;
    }
    // This is the problematic line
    return window.crypto.subtle.timingSafeEqual(hash1, hash2); // Changed to window.crypto.subtle
}

// Function to encrypt data using AES-GCM
export async function encryptData(data, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Changed to window.crypto.getRandomValues
    const algorithm = { name: 'AES-GCM', iv: iv };
    const encryptedData = await window.crypto.subtle.encrypt( // Changed to window.crypto.subtle
        algorithm,
        key,
        new TextEncoder().encode(data)
    );
    return {
        data: new Uint8Array(encryptedData),
        iv: iv
    };
}

// Function to decrypt data using AES-GCM
export async function decryptData(encryptedData, key, iv) {
    const algorithm = { name: 'AES-GCM', iv: iv };
    const decryptedData = await window.crypto.subtle.decrypt( // Changed to window.crypto.subtle
        algorithm,
        key,
        encryptedData
    );
    return new TextDecoder().decode(decryptedData);
}
