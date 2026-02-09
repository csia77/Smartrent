import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById("login-form");
const errorDisplay = document.getElementById("error-message");

function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.replace("error-hidden", "error-visible");
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // 1. Log in
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Check the database for the user's role
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role;

            // 3. Redirect based on roles 
            if (role === "admin") {
                window.location.href = "admin/dashboard.html";
            } else if (role === "tenant") {
                window.location.href = "tenant/dashboard.html";
            } else {
                showError("Error: User has no assigned role.");
            }
        } else {
            showError("No profile found for this user.");
        }

    } catch (error) {
        console.error("Login Error:", error);
        showError("Login failed: " + error.message);
    }
});