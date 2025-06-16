// src/main.js

/**
 * @fileoverview Main entry point for the WebX Journal PWA.
 * Handles Service Worker registration and initial UI interactions.
 */

// --- PWA Service Worker Registration ---
// Register the service worker for offline capabilities and PWA features.
// This allows the app to cache assets and work even when offline.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration);
                // Optionally, inform the user about PWA installability
                // We'll add more sophisticated install prompt logic later.
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
} else {
    console.warn('Service Workers are not supported in this browser. Offline features will be limited.');
}

// --- UI Interaction Handling ---

// Get the Google Sign-In button element.
const googleSignInButton = document.getElementById('google-signin-button');

// Add an event listener to the Google Sign-In button.
if (googleSignInButton) {
    googleSignInButton.addEventListener('click', () => {
        console.log('Google Sign-In button clicked!');
        // TODO: Implement Google authentication logic here.
        // This will involve calling Google's OAuth API.
        // For now, it's just a placeholder to show interaction.

        // In a real scenario, you'd trigger Google's OAuth flow,
        // which might open a new window or redirect.
    });
} else {
    console.error('Google Sign-In button not found. Please ensure its ID is "google-signin-button".');
}

// TODO: Add other initialization logic here as the app grows,
// e.g., checking for existing user sessions, loading initial data.
