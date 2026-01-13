/**
 * Firebase Configuration for AI Interview Coach
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Enable Firestore Database (Start in test mode for development)
 * 4. Go to Project Settings → General → Your apps → Add web app
 * 5. Copy your config below
 */

// Firebase SDK imports (using CDN for Chrome extension compatibility)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app = null;
let db = null;
let auth = null;
let currentUser = null;
let isInitialized = false;

async function initFirebase() {
    if (isInitialized) return { app, db, auth, currentUser };

    try {
        // Check if config is set
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            console.warn("Firebase: Config not set. Using local storage only.");
            return null;
        }

        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in anonymously for simple auth
        await signInAnonymously(auth);

        currentUser = auth.currentUser;
        isInitialized = true;

        console.log("Firebase initialized successfully");
        return { app, db, auth, currentUser };
    } catch (error) {
        console.error("Firebase initialization error:", error);
        return null;
    }
}

// Check if Firebase is configured
function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

// Export for use in other modules
export {
    initFirebase,
    isFirebaseConfigured,
    db,
    auth,
    currentUser,
    // Firestore helpers
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where
};
