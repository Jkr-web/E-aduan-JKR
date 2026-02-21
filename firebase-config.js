/**
 * FIREBASE CONFIGURATION & INITIALIZATION
 * Sila gantikan config di bawah dengan maklumat dari Firebase Console anda.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCC16kU5T8x5jNgoh7_aQezXER-auwEIEQ",
    authDomain: "webauth-ac4d4.firebaseapp.com",
    projectId: "webauth-ac4d4",
    storageBucket: "webauth-ac4d4.firebasestorage.app",
    messagingSenderId: "369336608148",
    appId: "1:369336608148:web:3f069dfdf915ae98e09b81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Secondary App for creating users (as Admin)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export { auth, db, secondaryAuth, firebaseConfig };
