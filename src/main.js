// src/main.js

import * as auth from './auth.js';
import * as ui from './ui.js';
import * as db from './storage.js';
import * as crypto from './crypto.js';
import * as utils from './utils.js';

// Expose modules to the global WebXJournal object for easier access and testing
// and to allow ui.js to call functions from other modules
window.WebXJournal = {
    auth: auth,
    ui: ui,
    db: db,
    crypto: crypto,
    utils: utils,
    // Functions that are called by UI events directly
    saveJournalEntry: async (id, title, content) => {
        ui.showLoadingOverlay(id ? 'Updating entry...' : 'Saving entry...');
        try {
            const success = await db.saveEntry(id, title, content);
            if (success) {
                utils.displayMessage(id ? 'Entry updated successfully!' : 'Entry saved successfully!', 'text-green-300 bg-green-800');
            }
        } catch (error) {
            console.error("Error saving entry:", error);
            utils.displayMessage(`Error saving entry: ${error.message}`, 'text-red-400 bg-red-800');
        } finally {
            ui.hideLoadingOverlay();
        }
    },
    loadJournalEntries: async () => {
        ui.showLoadingOverlay('Loading entries...');
        try {
            const entries = await db.getEntries();
            const journalList = document.getElementById('journal-entries-list');
            if (journalList) {
                journalList.innerHTML = ''; // Clear existing list
                if (entries.length === 0) {
                    journalList.innerHTML = `
                        <div class="text-center p-8 text-gray-400 border border-gray-700 rounded-lg">
                            <p class="text-lg mb-4">You don't have any journal entries yet.</p>
                            <p>Click "+ New Journal Entry" to write your first entry!</p>
                        </div>
                    `;
                } else {
                    // Sort entries by timestamp in descending order (most recent first)
                    entries.sort((a, b) => b.timestamp - a.timestamp);
                    entries.forEach(entry => ui.renderJournalEntry(entry));
                }
            }
        } catch (error) {
            console.error("Error loading entries:", error);
            utils.displayMessage(`Error loading entries: ${error.message}`, 'text-red-400 bg-red-800');
        } finally {
            ui.hideLoadingOverlay();
        }
    },
    deleteJournalEntry: async (id) => {
        ui.showLoadingOverlay('Deleting entry...');
        try {
            const success = await db.deleteEntry(id);
            if (success) {
                ui.removeJournalEntryFromList(id);
                utils.displayMessage('Entry deleted successfully!', 'text-green-300 bg-green-800');
            }
        } catch (error) {
            console.error("Error deleting entry:", error);
            utils.displayMessage(`Error deleting entry: ${error.message}`, 'text-red-400 bg-red-800');
        } finally {
            ui.hideLoadingOverlay();
        }
    },
    exportJournalData: async () => {
        ui.showLoadingOverlay('Preparing export...');
        try {
            const backupData = await db.exportAllData();
            if (backupData) {
                const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `webx_journal_backup_${new Date().toISOString().slice(0,10)}.webx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                utils.displayMessage('Journal data exported successfully!', 'text-green-300 bg-green-800');
            } else {
                utils.displayMessage('No data to export.', 'text-blue-300 bg-gray-700');
            }
        } catch (error) {
            console.error("Error exporting data:", error);
            utils.displayMessage(`Error exporting data: ${error.message}`, 'text-red-400 bg-red-800');
        } finally {
            ui.hideLoadingOverlay();
        }
    },
    importJournalData: async (file, password) => {
        ui.showLoadingOverlay('Importing data...');
        try {
            await db.importAllData(file, password);
            utils.displayMessage('Journal data imported successfully!', 'text-green-300 bg-green-800');
            // Re-render the main app to refresh the entries
            ui.renderMainJournalApp(document.getElementById('app-content-wrapper'), auth.getCurrentUsername());
        } catch (error) {
            console.error("Error importing data:", error);
            utils.displayMessage(`Error importing data: ${error.message}`, 'text-red-400 bg-red-800');
        } finally {
            ui.hideLoadingOverlay();
        }
    }
};


// --- Main Application Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // Get the main wrapper that contains both intro and the form/app area
    const appWrapper = document.getElementById('app-content-wrapper');
    if (!appWrapper) {
        console.error("Application wrapper not found!");
        return;
    }

    ui.showLoadingOverlay('Checking authentication...');
    try {
        const isLoggedIn = await auth.checkAuthStatus();
        if (isLoggedIn) {
            ui.renderMainJournalApp(appWrapper, auth.getCurrentUsername());
            utils.displayMessage('Welcome back!', 'text-green-300 bg-green-800');
        } else {
            // Render login form into the appWrapper
            ui.renderLoginForm(appWrapper);
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        utils.displayMessage(`Failed to initialize: ${error.message}`, 'text-red-400 bg-red-800');
        ui.renderLoginForm(appWrapper); // Fallback to login form on error
    } finally {
        ui.hideLoadingOverlay();
    }
});
