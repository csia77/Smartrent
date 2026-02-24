// js/register.js
import { auth, db } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const registerForm = document.getElementById("register-form");
const errorDisplay = document.getElementById("error-message");

function showError(msg) {
    errorDisplay.textContent = msg;
    errorDisplay.classList.replace("error-hidden", "error-visible");
}

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 1. Get Values
    const name = document.getElementById("reg-name").value;
    const email = document.getElementById("reg-email").value;
    const code = document.getElementById("reg-code").value.trim(); // remove spaces
    const password = document.getElementById("reg-password").value;

    try {
        // 2. CHECK THE CODE: Does this house exist?
        const housesRef = collection(db, "houses");
        const q = query(housesRef, where("code", "==", code)); // Search for code
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid House Code. Please check with your landlord.");
        }

        // We found the house! Let's get its ID.
        const houseDoc = querySnapshot.docs[0]; // The first result
        const houseId = houseDoc.id;
        const houseName = houseDoc.data().name;

        console.log("Found House:", houseName);

        // 3. CREATE AUTH USER
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 4. CREATE USER PROFILE (Firestore)
        // We use setDoc to specify the ID (user.uid)
        
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            role: "tenant",
            houseId: houseId,   // LINKED!
            balance: 0          // Start with 0 debt
        }); 

        // 5. UPDATE HOUSE (Add tenant to the list)
        // arrayUnion ensures we don't add duplicates
        await updateDoc(doc(db, "houses", houseId), {
            tenantIds: arrayUnion(user.uid),
            status: "occupied"
        });

        alert(`Welcome, ${name}! You have successfully joined ${houseName}.`);
        window.location.href = "tenant/dashboard.html";

    } catch (error) {
        console.error("Registration Error:", error);
        
        if (error.code === "auth/email-already-in-use") {
            showError("This email is already registered.");
        } else {
            showError(error.message);
        }
    }
});