// src/utils.js

/**
 * @fileoverview Provides general utility functions for WebX Journal.
 * This module includes helpers like message display and potentially other common tools.
 */

/**
 * Displays a message to the user in the designated app-message area.
 * The message will fade out after a few seconds.
 * @param {string} message The message text to display.
 * @param {string} [classes='text-gray-300'] Tailwind CSS classes for styling the message.
 */
export function displayMessage(message, classes = 'text-gray-300') {
    const messageContainer = document.getElementById('app-message');
    if (messageContainer) {
        messageContainer.textContent = message;
        // Apply dynamic classes and ensure it's visible
        messageContainer.className = `mt-4 p-3 rounded-lg text-center transition-opacity duration-300 ${classes}`;
        messageContainer.classList.remove('hidden', 'opacity-0');
        messageContainer.classList.add('opacity-100');

        // Optional: Hide message after a few seconds
        setTimeout(() => {
            if (messageContainer.textContent === message) { // Only hide if it's still the same message
                messageContainer.classList.remove('opacity-100');
                messageContainer.classList.add('opacity-0');
                setTimeout(() => {
                    messageContainer.classList.add('hidden'); // Fully hide after fade
                }, 300); // Match transition duration
            }
        }, 5000); // Hide after 5 seconds
    } else {
        console.warn('App message container not found. Message:', message);
    }
}
