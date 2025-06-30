// src/utils.js

/**
 * @fileoverview Utility functions for WebX Journal, including message display
 * and unique ID generation.
 */

// A simple global container for messages (populated by ui.js)
// This is accessed directly by displayMessage to ensure messages appear consistently.
let globalMessageContainer = null;

/**
 * Initializes the global message container. This should be called once,
 * preferably by ui.js when the main app structure is rendered.
 * @param {HTMLElement} container The DOM element designated for messages.
 */
export function initializeMessageContainer(container) {
    globalMessageContainer = container;
}

/**
 * Displays a temporary message to the user.
 * @param {string} message The message content.
 * @param {string} typeClasses CSS classes for styling the message (e.g., 'bg-green-500', 'text-red-400').
 * @param {string} [targetElementId] Optional ID of an element to append the message to, instead of the global container.
 * Useful for contextual messages within a specific UI component.
 */
export function displayMessage(message, typeClasses = 'text-gray-100 bg-gray-700', targetElementId = null) {
    let container = globalMessageContainer;

    if (targetElementId) {
        const specificTarget = document.getElementById(targetElementId);
        if (specificTarget) {
            container = specificTarget;
        } else {
            console.warn(`Target element with ID '${targetElementId}' not found for message.`);
            // Fallback to global container if specific target not found
        }
    }

    if (!container) {
        console.warn('Message container not initialized. Message will be logged only:', message);
        console.log(`Message: ${message} (Type: ${typeClasses})`);
        return;
    }

    const messageElement = document.createElement('div');
    messageElement.className = `p-3 rounded-md shadow-lg mb-2 text-sm transition-all duration-300 ease-out transform translate-x-0 opacity-100 ${typeClasses}`;
    messageElement.textContent = message;

    // Add a fade-out animation and then remove
    setTimeout(() => {
        messageElement.classList.add('opacity-0', 'translate-x-full');
        messageElement.addEventListener('transitionend', () => {
            messageElement.remove();
        });
    }, 5000); // Message visible for 5 seconds

    // Prepend to show newest messages at the top
    container.prepend(messageElement);
}

/**
 * Generates a simple unique ID using timestamp and a random number.
 * Not cryptographically secure, but sufficient for local IndexedDB keys.
 * @returns {string} A unique ID string.
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Escapes HTML to prevent XSS attacks when displaying user-generated content.
 * @param {string} text The text to escape.
 * @returns {string} The HTML-escaped string.
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}
