// js/firebase-config.js
// Import the functions you need from the SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
// REPLACE these values with your actual config from the Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCQDKELJbF8O6jCVG2VnVEhhuhxQEwPzKs",
  authDomain: "smart-rent-5fe3d.firebaseapp.com",
  projectId: "smart-rent-5fe3d",
  storageBucket: "smart-rent-5fe3d.firebasestorage.app",
  messagingSenderId: "731695067009",
  appId: "1:731695067009:web:f5e99292759873eaf30280"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export them so other files can use them
export { auth, db };