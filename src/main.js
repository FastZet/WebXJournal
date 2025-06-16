// src/main.js

/**
 * @fileoverview Main entry point for the WebX Journal PWA.
 * Handles Service Worker registration and initializes the local authentication flow.
 */

// Import necessary modules (will be created in subsequent steps)
import { renderLoginForm, renderRegisterForm, displayMessage } from './ui.js'; // UI rendering functions
import { getAuthStatus } from './auth.js'; // Function to check if a user profile exists
import { initializeIndexedDB } from './storage.js'; // IndexedDB initialization

// --- PWA Service Worker Registration ---
// Register the service worker for offline capabilities and PWA features.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
} else {
    console.warn('Service Workers are not supported in this browser. Offline features will be limited.');
    displayMessage('Your browser does not fully support PWA features. Offline mode may be limited.', 'text-yellow-400 bg-gray-700');
}

// --- Application Initialization ---

/**
 * Initializes the main application flow.
 * Checks for existing user profiles and renders appropriate UI (login or registration).
 */
async function initializeApp() {
    console.log('Initializing WebX Journal application...');
    const appContentContainer = document.getElementById('app-content-container');
    if (!appContentContainer) {
        console.error('App content container not found!');
        displayMessage('Critical error: Application container missing.', 'text-red-400 bg-red-800');
        return;
    }

    try {
        // Initialize IndexedDB first
        await initializeIndexedDB();
        console.log('IndexedDB initialized.');

        // Check if a user profile exists in IndexedDB
        const authStatus = await getAuthStatus();

        if (authStatus.isRegistered) {
            console.log('Existing user detected. Rendering login form.');
            appContentContainer.innerHTML = ''; // Clear loading message
            renderLoginForm(appContentContainer);
        } else {
            console.log('No user profile found. Rendering registration form.');
            appContentContainer.innerHTML = ''; // Clear loading message
            renderRegisterForm(appContentContainer);
        }
    } catch (error) {
        console.error('Application initialization failed:', error);
        displayMessage(`Application failed to load: ${error.message}. Please try again.`, 'text-red-400 bg-red-800');
    }
}

// Call the initialization function when the window loads
window.addEventListener('load', initializeApp);
