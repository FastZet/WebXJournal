// src/utils.js

const MESSAGE_TIMEOUT = 5000; // Messages disappear after 5 seconds
let messageTimer = null; // To clear previous timers

// Function to convert a string to Uint8Array (useful for crypto operations)
export function stringToUint8Array(str) {
    return new TextEncoder().encode(str);
}

// Function to convert Uint8Array to string
export function uint8ArrayToString(arr) {
    return new TextDecoder().decode(arr);
}

// Function to convert Uint8Array to Base64 string
export function uint8ArrayToBase64(arr) {
    return btoa(String.fromCharCode.apply(null, arr));
}

// Function to convert Base64 string to Uint8Array
export function base64ToUint8Array(str) {
    return new Uint8Array(atob(str).split('').map(char => char.charCodeAt(0)));
}

// Function to display messages to the user (e.g., success, error, info)
export function displayMessage(message, type = 'text-blue-300 bg-gray-700') {
    const messageContainer = document.getElementById('message-container');

    // If the message container doesn't exist, log to console as a fallback
    // This is for scenarios where the UI might not be fully loaded or has been replaced.
    if (!messageContainer) {
        console.warn("Message container not initialized. Message will be logged only:", message);
        console.log(`Message: ${message} (Type: ${type})`);
        return;
    }

    // Clear any previous timer to ensure the new message is displayed for the full duration
    if (messageTimer) {
        clearTimeout(messageTimer);
    }

    messageContainer.textContent = message;
    messageContainer.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-opacity duration-500 ${type}`;
    messageContainer.style.opacity = '1';
    messageContainer.style.pointerEvents = 'auto'; // Make it clickable/visible

    // Set a timer to hide the message after MESSAGE_TIMEOUT
    messageTimer = setTimeout(() => {
        messageContainer.style.opacity = '0';
        messageContainer.style.pointerEvents = 'none'; // Make it non-clickable
        // Optional: clear text content after transition to prevent lingering
        setTimeout(() => messageContainer.textContent = '', 500); // Wait for fade out
    }, MESSAGE_TIMEOUT);
}

// Function to set up a debounced input listener
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
