// src/utils.js

/**
 * Displays a temporary message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message (e.g., 'success', 'error', 'info').
 */
export function displayMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    if (!messageContainer || !messageText) {
        console.warn('Message container not initialized. Message will be logged only:', message);
        console.warn(`Message: ${message} (Type: ${type})`);
        return;
    }

    messageText.textContent = message;
    messageContainer.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 text-white transition-opacity duration-300`;

    // Apply Tailwind CSS classes based on message type
    switch (type) {
        case 'success':
            messageContainer.classList.add('bg-green-600', 'text-white');
            break;
        case 'error':
            messageContainer.classList.add('bg-red-600', 'text-white');
            break;
        case 'info':
        default:
            messageContainer.classList.add('bg-blue-600', 'text-white');
            break;
    }

    messageContainer.classList.remove('opacity-0', 'hidden');
    messageContainer.classList.add('opacity-100');

    setTimeout(() => {
        messageContainer.classList.remove('opacity-100');
        messageContainer.classList.add('opacity-0');
        messageContainer.addEventListener('transitionend', () => {
            messageContainer.classList.add('hidden');
        }, { once: true });
    }, 3000); // Message disappears after 3 seconds
}

/**
 * Shows the loading overlay.
 */
export function showLoadingOverlay() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

/**
 * Hides the loading overlay.
 */
export function hideLoadingOverlay() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

/**
 * Gets the current timestamp.
 * @returns {number} - The current timestamp.
 */
export function getCurrentTimestamp() {
    return Date.now();
}

/**
 * Reads the content of a file.
 * @param {File} file - The file to read.
 * @returns {Promise<string>} - A promise that resolves with the file content.
 */
export function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

/**
 * Downloads content as a file.
 * @param {string} content - The content to download.
 * @param {string} filename - The name of the file.
 * @param {string} contentType - The MIME type of the file.
 */
export function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Safely parses JSON string.
 * @param {string} jsonString - The JSON string to parse.
 * @returns {object|null} - The parsed object or null if parsing fails.
 */
export function safeJSONParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        return null;
    }
}
