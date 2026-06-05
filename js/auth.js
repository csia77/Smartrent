// auth.js - handles user login

import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM elements
const loginForm = document.getElementById("login-form");
const errorDisplay = document.getElementById("error-message");
const submitBtn = document.getElementById("btn-submit");

console.log("[auth] module loaded");

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
        submitBtn.textContent = "Signing in...";
        submitBtn.classList.add("btn-loading");
    } else {
        submitBtn.disabled = false;
        submitBtn.textContent = "Sign In";
        submitBtn.classList.remove("btn-loading");
    }
};

// Map Firebase error codes to friendly messages
const friendlyError = (code) => {
    const map = {
        "auth/invalid-email":            "Please enter a valid email address.",
        "auth/user-disabled":            "This account has been disabled. Contact your admin.",
        "auth/user-not-found":           "No account found with that email.",
        "auth/wrong-password":           "Incorrect password. Please try again.",
        "auth/invalid-credential":       "Invalid email or password. Please try again.",
        "auth/too-many-requests":        "Too many failed attempts. Please wait a moment and try again.",
        "auth/network-request-failed":   "Network error. Check your internet connection.",
    };
    return map[code] || "Login failed. Please try again.";
};

// Login form handler
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Hide any previous error
    errorDisplay.classList.replace("error-visible", "error-hidden");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    console.log("[auth] attempting login for:", email);

    // Activate loading state
    setLoading(true);

    try {
        // 1. Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("[auth] login ok, uid:", user.uid);

        // 2. Fetch user profile from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role;
            console.log("[auth] role:", role);

            // 3. Redirect based on role
            if (role === "admin") {
                window.location.href = "admin/dashboard.html";
            } else if (role === "tenant") {
                window.location.href = "tenant/dashboard.html";
            } else {
                showError("Your account has no assigned role. Contact your admin.");
            }
        } else {
            console.warn("[auth] no profile for uid:", user.uid);
            showError("No profile found for this user. Contact your admin.");
        }

    } catch (error) {
        console.error("[auth] login error:", error.code, error.message);
        showError(friendlyError(error.code));
    }
});

// Password reset
const forgotLink = document.getElementById("forgot-password-link");
const backToLogin = document.getElementById("back-to-login");
const resetSection = document.getElementById("reset-section");
const resetBtn = document.getElementById("reset-btn");
const resetEmailInput = document.getElementById("reset-email");
const resetMessage = document.getElementById("reset-message");

if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.style.display = "none";
        document.querySelector(".auth-footer").style.display = "none";
        resetSection.style.display = "block";
    });
}

if (backToLogin) {
    backToLogin.addEventListener("click", (e) => {
        e.preventDefault();
        resetSection.style.display = "none";
        loginForm.style.display = "block";
        document.querySelector(".auth-footer").style.display = "block";
    });
}

if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
        const email = resetEmailInput.value.trim();
        if (!email) {
            resetMessage.textContent = "Please enter your email address.";
            resetMessage.classList.replace("error-hidden", "error-visible");
            return;
        }

        resetBtn.disabled = true;
        resetBtn.textContent = "Sending...";
        resetBtn.classList.add("btn-loading");

        try {
            await sendPasswordResetEmail(auth, email);
            resetMessage.textContent = "Reset link sent! Check your inbox.";
            resetMessage.style.color = "#10b981";
            resetMessage.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            resetMessage.style.borderColor = "rgba(16, 185, 129, 0.15)";
            resetMessage.classList.replace("error-hidden", "error-visible");
        } catch (error) {
            console.error('[auth] password reset error:', error.code);
            resetMessage.textContent = error.code === "auth/user-not-found"
                ? "No account found with that email."
                : "Could not send reset email. Try again.";
            resetMessage.style.color = "";
            resetMessage.style.backgroundColor = "";
            resetMessage.style.borderColor = "";
            resetMessage.classList.replace("error-hidden", "error-visible");
        } finally {
            resetBtn.disabled = false;
            resetBtn.textContent = "Send Reset Link";
            resetBtn.classList.remove("btn-loading");
        }
    });
}