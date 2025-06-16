# WebX Journal

## Secure, Self-Hostable, and Private Web-Based Journal PWA

WebX Journal is an innovative web application designed to provide a highly private and secure journaling experience. Built as a Progressive Web App (PWA), it prioritizes client-side data management and encryption, ensuring your personal thoughts remain exclusively yours without relying on central server storage for sensitive information. It aims to be easily self-hostable, allowing users full control over their application environment.

## Table of Contents

1.  [About WebX Journal](#about-webx-journal)
2.  [Features](#features)
3.  [Technology Stack](#technology-stack)
4.  [Security & Privacy](#security--privacy)
5.  [Getting Started (Self-Hosting)](#getting-started-self-hosting)
    * [Prerequisites](#prerequisites)
    * [Backend Setup (Stateless Verification)](#backend-setup-stateless-verification)
    * [Frontend Deployment](#frontend-deployment)
6.  [Usage Guide](#usage-guide)
    * [First-Time User Setup](#first-time-user-setup)
    * [Returning User (Same Device)](#returning-user-same-device)
    * [Returning User (New Device)](#returning-user-new-device)
7.  [Data Management & Portability](#data-management--portability)
    * [Local Storage (IndexedDB)](#local-storage-indexeddb)
    * [Google Drive Backup & Restore](#google-drive-backup--restore)
    * [Local File Export & Import](#local-file-export--import)
8.  [Modular Design & Future-Proofing](#modular-design--future-proofing)
9.  [Contributing](#contributing)
10. [License](#license)

## About WebX Journal

WebX Journal is a PWA designed for users who value privacy and control over their personal data. Unlike traditional journal apps that store your entries on a server, WebX Journal keeps your encrypted thoughts either directly on your device or in your personal Google Drive, making it an ideal solution for secure and private reflections. Its self-hostable nature ensures that the application code runs in an environment you control.

## Features

WebX Journal offers a robust set of features focused on security, privacy, and user control:

* **Zero Server-Side Persistent Data:** No journal entries, master passwords, or encryption keys are ever stored on the hosting server. The server's role is strictly limited to serving static PWA files and performing stateless authentication verification.
* **Client-Side Encryption:**
    * All journal entries are encrypted directly within the user's web browser before being saved or transmitted.
    * Uses the **AES-256-GCM** (Advanced Encryption Standard with Galois/Counter Mode) algorithm for strong confidentiality and data authenticity.
    * Encryption keys are securely derived from the user's master password using **Argon2**, a modern, computationally intensive Key Derivation Function (KDF) designed for strong resistance against brute-force attacks.
    * Optimized Argon2 parameters are utilized for security without hindering user experience.
    * The derived decryption key is held in the browser's memory only for the active session and is securely cleared upon logout or session expiry (e.g., after 10 minutes of inactivity).
* **Google Login (Mandatory Authentication):**
    * Users authenticate via **"Sign in with Google"** leveraging Google's secure OAuth 2.0 system.
    * This eliminates the need for WebX Journal's backend to manage user passwords or 2FA secrets, significantly enhancing security and simplifying user management for the self-hoster.
    * The backend performs only stateless verification of Google ID tokens.
* **Flexible Data Storage Options (Encrypted Data Only):**
    * **IndexedDB (Primary Local Storage):** Encrypted journal entries are primarily stored in the browser's IndexedDB. This offers robust local persistence, large storage capacity, asynchronous operations, and full offline access for PWAs.
    * **Google Drive (Optional Cloud Backup & Sync):** Users can explicitly choose to back up and synchronize their encrypted journal entries to their personal Google Drive account. This provides seamless cross-device access and a reliable cloud backup solution. Individual encrypted entry files and an encrypted "user profile" file are stored in a dedicated, unique folder in the user's Drive.
* **Data Portability & Backup:**
    * **Local File Export:** Users can export all their encrypted journal entries into a single, consolidated encrypted file. This file can be saved to any location on their device using the system's file picker.
    * **Local File Import:** Users can import a previously exported consolidated encrypted file, allowing for easy manual migration between devices or local restoration.
* **Structured Journaling:**
    * Supports creating multiple journal entries per day.
    * Entries are organized with a consistent naming convention: `YYYY-MM-DD-HH-MM-SS_UserDefinedTitle.enc`.
* **Future-Proof Data Format:**
    * All encrypted data objects (journal entries, user profile) include a **schema version number**. This ensures that the application can interpret and migrate older data formats correctly in future updates without risking data loss.
* **Robust User Experience:**
    * Clear, concise guidance is provided to users regarding data privacy, the critical role of the master password, and choices for data storage.
    * Comprehensive error handling is implemented for storage operations (IndexedDB, Google Drive API, file operations), providing actionable feedback to the user.
    * Data integrity verification (checksums/hashes) is performed on encrypted data during import/restore operations to ensure completeness and prevent silent corruption.

## Technology Stack

WebX Journal is built with a modern web technology stack to ensure a responsive, secure, and maintainable application:

* **Frontend (PWA):**
    * HTML, CSS, JavaScript
    * Service Workers for PWA functionality (offline access, push notifications - if implemented later).
    * **Web Crypto API:** For cryptographic operations (AES-GCM, key derivation).
    * **IndexedDB API:** For client-side data storage.
    * **File System Access API:** For local file export/import functionality.
    * Google APIs Client Library for JavaScript (for Google Drive integration).
* **Backend (Minimal & Stateless):**
    * Any lightweight framework or serverless function capable of serving static files and handling a single, stateless API endpoint for Google ID token verification (e.g., Node.js with Express, Python with Flask, Go, etc.). This component stores no persistent user data.

## Security & Privacy

The security and privacy of your journal are paramount to WebX Journal's design:

* **Zero Knowledge Principle:** Your master password is never sent to any server. Your decrypted journal entries never leave your device unencrypted. The application host has no access to your journal content.
* **End-to-End Encryption Concept:** While not strictly end-to-end between users, the principle applies to your data's journey: it's encrypted on your device and only decrypted by you using your master password. Neither Google (for Drive storage) nor your host can read your journal.
* **Strong Cryptography:** Utilizes industry-standard AES-256-GCM and Argon2 for robust encryption and key derivation.
* **Session Security:** Master password-derived keys are ephemeral, securely cleared from memory after use or session expiry.
* **No Central Data Honeypot:** By distributing encrypted data storage across user devices and personal cloud storage, WebX Journal avoids creating a large central database of sensitive information that could be targeted by attackers.

## Getting Started (Self-Hosting)

To self-host WebX Journal, you'll need to deploy both the static frontend PWA files and a small, stateless backend service.

### Prerequisites

* A web server or hosting platform capable of serving static files (e.g., Netlify, Vercel, GitHub Pages, Render Static Sites, any HTTP server).
* A platform for a minimal backend service (e.g., Render Web Services, Railway, AWS Lambda, Google Cloud Functions, etc.).
* A Google Cloud Project for Google Sign-In and Google Drive API credentials.
* Familiarity with web deployment processes.

### Backend Setup (Stateless Verification)

1.  **Create a Google Cloud Project:** Go to the Google Cloud Console and create a new project.
2.  **Enable APIs:** Enable the "Google People API" (for user verification) and "Google Drive API" (for Drive integration).
3.  **Create OAuth 2.0 Client IDs:**
    * For the Web Application type, configure authorized JavaScript origins (your PWA's URL) and authorized redirect URIs (for your backend's OAuth callback).
    * For the Web Server type (if your backend directly handles OAuth), configure redirect URIs.
4.  **Backend Implementation:**
    * Implement a minimal API endpoint that receives the Google ID token from the frontend.
    * This endpoint uses Google's libraries to verify the ID token's authenticity (e.g., `google-auth-library` for Node.js).
    * It should return a simple success/failure response to the frontend. This endpoint is stateless and does not store any user information persistently.
5.  **Deployment:** Deploy this minimal backend service to your chosen platform (e.g., Render Web Services, Railway).

### Frontend Deployment

1.  **Build the Frontend:** Compile the PWA's HTML, CSS, and JavaScript assets.
2.  **Configure Environment Variables:** Update the frontend's configuration with your Google OAuth client ID and the URL of your deployed backend's verification endpoint.
3.  **Deploy Static Files:** Deploy the compiled frontend assets to your chosen static hosting service (e.g., Netlify, Vercel, Render Static Sites). Ensure HTTPS is enabled.

## Usage Guide

### First-Time User Setup

1.  **Access WebX Journal:** Navigate to your deployed WebX Journal URL in a compatible web browser (or open the installed PWA).
2.  **Sign in with Google:** Click the "Sign in with Google" button and follow the prompts to authenticate with your Google account.
3.  **Create Master Password:** Upon successful Google sign-in, the app will prompt you to create a strong Master Password for your journal. **Remember this password, as there is no recovery mechanism.**
4.  **Start Journaling:** The app is now ready. Your encrypted entries will be saved locally to your browser's IndexedDB by default.
5.  **Connect to Google Drive (Optional):** Access the app's settings to link your Google Drive account for cloud backup and sync.

### Returning User (Same Device)

1.  **Open WebX Journal:** Launch the PWA or navigate to its URL.
2.  **Sign in with Google:** Authenticate with your Google account (if not already logged in).
3.  **Enter Master Password:** The app will prompt for your Master Password to decrypt and access your locally stored journal entries.

### Returning User (New Device)

1.  **Access WebX Journal:** Launch the PWA or navigate to its URL on your new device.
2.  **Sign in with Google:** Authenticate with the *same Google account* used previously.
3.  **Connect to Google Drive:** The app will guide you to connect to your Google Drive. Grant necessary permissions.
4.  **Enter Master Password:** The app will locate your encrypted journal entries in Google Drive and prompt you for your Master Password to decrypt and load them onto the new device.
5.  **Local Copy (Optional):** You can choose to keep a local copy of your journal on the new device (in IndexedDB) for offline access.

## Data Management & Portability

WebX Journal provides flexible options for managing your encrypted data:

### Local Storage (IndexedDB)

* Your encrypted journal entries are primarily stored in your browser's IndexedDB on the device you are using.
* This data is persistent and available offline.
* **Important:** Clearing your browser's site data for WebX Journal will delete your local IndexedDB content. Always ensure you have a Google Drive backup or a local file export.

### Google Drive Backup & Restore

* **Backup:** In the app's settings, click "Backup to Google Drive." All your encrypted journal entries and the encrypted user profile will be uploaded to a dedicated folder in your Google Drive.
* **Restore:** In the app's settings (or on a new device), click "Restore from Google Drive." The app will fetch your encrypted data from Drive, and after entering your Master Password, will load it into your local IndexedDB.

### Local File Export & Import

* **Export Data:** Access the export option in settings. All your encrypted journal entries will be bundled into a single, consolidated encrypted file. You can save this file anywhere on your device.
* **Import Data:** Access the import option. Select a previously exported consolidated file from your device. After entering your Master Password, the app will load these entries into your local IndexedDB.

## Modular Design & Future-Proofing

The application's architecture emphasizes modularity across all key components:

* **Authentication Module:** The Google Login integration is designed as a separate module, allowing for easy integration of additional authentication providers in the future (e.g., Microsoft Account, Apple ID) without affecting core logic.
* **Encryption Module:** The cryptographic operations are encapsulated in a dedicated module, facilitating updates to algorithms or key derivation practices.
* **Storage Drivers:** Separate modules handle interactions with IndexedDB, Google Drive API, and the File System Access API. This allows for seamless integration of new storage providers (e.g., Dropbox, OneDrive) or alternative local storage methods.
* **Data Versioning:** All stored data objects contain a version number. This forward-thinking approach ensures that any future changes to data schema or encryption methods will allow the application to gracefully handle and migrate older versions of your journal entries, preserving your data's integrity and accessibility for years to come.

## Contributing

Details on how to contribute to WebX Journal will be provided in a separate `CONTRIBUTING.md` file.

## License

This project is licensed under the [MIT License](LICENSE) - see the `LICENSE` file for details.

---
