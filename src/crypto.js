// src/crypto.js

// Function to derive a key from a password using PBKDF2
// Purpose can be 'hash' (for password verification) or 'encryption' (for data encryption/decryption)
export async function deriveKey(password, salt, purpose) {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);
    
    // Base key from password
    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Derived key for specific purpose
    const derivedBits = await crypto.subtle.deriveBits(
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
        return await crypto.subtle.importKey(
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
    return crypto.subtle.timingSafeEqual(hash1, hash2);
}

// Function to encrypt data using AES-GCM
export async function encryptData(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV is standard for AES-GCM
    const algorithm = { name: 'AES-GCM', iv: iv };
    const encryptedData = await crypto.subtle.encrypt(
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
    const decryptedData = await crypto.subtle.decrypt(
        algorithm,
        key,
        encryptedData
    );
    return new TextDecoder().decode(decryptedData);
}
