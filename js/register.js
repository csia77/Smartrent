// register.js - tenant registration handler

import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, query, where, getDocs,
    doc, setDoc, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from "./auth-guard.js";

// DOM elements
const registerForm = document.getElementById("register-form");
const errorDisplay = document.getElementById("error-message");
const submitBtn    = document.getElementById("btn-submit");

console.log("[register] module loaded");

// Helpers

// Show error and re-enable the submit button
const showError = (message) => {
    errorDisplay.textContent = message;
    errorDisplay.classList.replace("error-hidden", "error-visible");

    // Re-enable the button so the user can try again
    setLoading(false);
};

// Toggle button loading state
const setLoading = (loading) => {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating account...";
        submitBtn.classList.add("btn-loading");
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register & Join";
        submitBtn.classList.remove("btn-loading");
    }
};

// Map Firebase Auth error codes to friendly messages
const friendlyError = (code) => {
    const map = {
        "auth/email-already-in-use":     "This email is already registered. Try logging in instead.",
        "auth/invalid-email":            "Please enter a valid email address.",
        "auth/weak-password":            "Password is too weak. Use at least 6 characters.",
        "auth/network-request-failed":   "Network error. Check your internet connection.",
        "auth/too-many-requests":        "Too many attempts. Please wait a moment and try again.",
    };
    return map[code] || null;
};

// Register form submit handler
registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide any previous error
    errorDisplay.classList.replace("error-visible", "error-hidden");

    // 1. Collect form values
    const name     = document.getElementById("reg-name").value.trim();
    const email    = document.getElementById("reg-email").value.trim();
    const code     = document.getElementById("reg-code").value.trim();
    const password = document.getElementById("reg-password").value;

    console.log("[register] attempting signup");

    // Activate loading state
    setLoading(true);

    try {
        // 2. Validate House Code
        console.log("[register] checking house code...");
        const housesRef = collection(db, "houses");
        const q = query(housesRef, where("code", "==", code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid House Code. Please check with your landlord.");
        }

        // We found the house - grab its data
        const houseDoc  = querySnapshot.docs[0];
        const houseId   = houseDoc.id;
        const houseData = houseDoc.data();
        const houseName = houseData.name;

        console.log("[register] house found:", houseName, "(", houseId, ")");

        // 3. Create Firebase Auth User
        console.log("[register] creating auth user...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("[register] auth user created, uid:", user.uid);

        // 4. Create User Profile and Link to House (handle Firestore updates)
        try {
            console.log("[register] writing profile...");
            await setDoc(doc(db, "users", user.uid), {
                name:       name,
                email:      email,
                role:       "tenant",
                houseId:    houseId,        // Link tenant -> house
                balance:    0,              // Start with zero debt
                rentAmount: houseData.rent || 0,  // Copy rent for quick access
                createdAt:  new Date()      // Timestamp of account creation
            });
            console.log("[register] profile written");

            // 5. Update House Document
            console.log("[register] updating house...");
            await updateDoc(doc(db, "houses", houseId), {
                tenantIds: arrayUnion(user.uid),
                status:    "occupied"
            });
            console.log("[register] house updated");
        } catch (firestoreError) {
            console.error("[register] Firestore setup failed. Rolling back user creation:", firestoreError);
            try {
                await deleteUser(user);
                console.log("[register] rollback successful: auth user deleted");
            } catch (deleteError) {
                console.error("[register] rollback failed: could not delete auth user:", deleteError);
            }
            throw firestoreError;
        }

        // 6. Success - redirect
        showToast(`Welcome, ${name}! You have successfully joined ${houseName}.`, "success");
        setTimeout(() => {
            window.location.href = "tenant/dashboard.html";
        }, 1500);

    } catch (error) {
        console.error("[register] signup error:", error.code || "", error.message);

        // Use friendly message if available, otherwise fall back to raw message
        const friendly = error.code ? friendlyError(error.code) : null;
        showError(friendly || error.message);
    }
});