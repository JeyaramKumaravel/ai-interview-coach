/**
 * Cloud Database Service for AI Interview Coach
 * Provides Firestore operations for documents and settings sync
 */

import {
    initFirebase,
    isFirebaseConfigured,
    db,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc
} from './firebase-config.js';

const CloudDB = {
    /**
     * Check if cloud sync is available
     */
    async isAvailable() {
        if (!isFirebaseConfigured()) return false;
        const firebase = await initFirebase();
        return firebase !== null;
    },

    /**
     * Get user's document collection path
     */
    getUserDocPath() {
        // Use a device-specific ID stored locally for anonymous sync
        return 'knowledge_base';
    },

    // ==================== Document Operations ====================

    /**
     * Save a document to Firestore
     */
    async saveDocument(title, content, chunks = []) {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            const docRef = doc(firebase.db, this.getUserDocPath(), title);
            await setDoc(docRef, {
                title,
                content,
                chunks,
                chunkCount: chunks.length,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString()
            });

            return { success: true, chunks: chunks.length };
        } catch (error) {
            console.error("CloudDB saveDocument error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get all documents from Firestore
     */
    async getDocuments() {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            const querySnapshot = await getDocs(collection(firebase.db, this.getUserDocPath()));
            const documents = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                documents.push({
                    title: data.title,
                    chunks: data.chunkCount || data.chunks?.length || 0,
                    updatedAt: data.updatedAt
                });
            });

            return { success: true, documents };
        } catch (error) {
            console.error("CloudDB getDocuments error:", error);
            return { success: false, error: error.message, documents: [] };
        }
    },

    /**
     * Get a specific document with full content
     */
    async getDocument(title) {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            const docRef = doc(firebase.db, this.getUserDocPath(), title);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { success: true, document: docSnap.data() };
            } else {
                return { success: false, error: "Document not found" };
            }
        } catch (error) {
            console.error("CloudDB getDocument error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete a document from Firestore
     */
    async deleteDocument(title) {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            await deleteDoc(doc(firebase.db, this.getUserDocPath(), title));
            return { success: true };
        } catch (error) {
            console.error("CloudDB deleteDocument error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Search documents (basic text search in titles)
     */
    async searchDocuments(query) {
        try {
            const result = await this.getDocuments();
            if (!result.success) return result;

            const searchLower = query.toLowerCase();
            const matches = result.documents.filter(doc =>
                doc.title.toLowerCase().includes(searchLower)
            );

            return { success: true, results: matches };
        } catch (error) {
            console.error("CloudDB searchDocuments error:", error);
            return { success: false, error: error.message, results: [] };
        }
    },

    // ==================== Settings Sync ====================

    /**
     * Sync settings to cloud
     */
    async syncSettings(settings) {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            const docRef = doc(firebase.db, 'user_settings', 'config');
            await setDoc(docRef, {
                ...settings,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return { success: true };
        } catch (error) {
            console.error("CloudDB syncSettings error:", error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Load settings from cloud
     */
    async loadSettings() {
        try {
            const firebase = await initFirebase();
            if (!firebase || !firebase.db) {
                throw new Error("Firebase not initialized");
            }

            const docRef = doc(firebase.db, 'user_settings', 'config');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return { success: true, settings: docSnap.data() };
            } else {
                return { success: true, settings: null };
            }
        } catch (error) {
            console.error("CloudDB loadSettings error:", error);
            return { success: false, error: error.message };
        }
    },

    // ==================== Health Check ====================

    /**
     * Check cloud connection status
     */
    async healthCheck() {
        try {
            if (!isFirebaseConfigured()) {
                return { success: false, status: "not_configured", message: "Firebase not configured" };
            }

            const firebase = await initFirebase();
            if (!firebase) {
                return { success: false, status: "init_failed", message: "Firebase init failed" };
            }

            // Try to read a test collection
            const result = await this.getDocuments();
            return {
                success: true,
                status: "connected",
                message: "Cloud connected",
                documents: result.documents?.length || 0
            };
        } catch (error) {
            return { success: false, status: "error", message: error.message };
        }
    }
};

// Export for use in other modules
export { CloudDB };
