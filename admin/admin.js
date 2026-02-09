// admin/admin.js
console.log("1. Admin JS file has started loading...");

// 1. IMPORT CONFIG (Added 'db' here)
import { auth, db } from "../js/firebase-config.js";

// 2. IMPORT AUTH FUNCTIONS
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 3. IMPORT FIRESTORE FUNCTIONS (This was missing!)
import { 
    collection, 
    addDoc, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("2. Imports successful. Firebase Auth & Firestore loaded.");

// --- LOGOUT LOGIC ---
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        console.log("Logout Clicked");
        try {
            await signOut(auth);
            alert("Logged out successfully.");
            window.location.href = "../index.html"; 
        } catch (error) {
            console.error("Logout Error:", error);
            alert("Logout failed: " + error.message);
        }
    });
} else {
    console.error("CRITICAL: Logout button not found.");
}

// --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Admin logged in:", user.email);
    } else {
        console.log("No user. Redirecting...");
        window.location.href = "../index.html";
    }
});

// --- HOUSE MANAGEMENT LOGIC ---

const addHouseForm = document.getElementById("add-house-form");
const houseListBody = document.getElementById("house-list-body");

// 1. CREATE HOUSE
if (addHouseForm) {
    addHouseForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("house-name").value;
        const rent = document.getElementById("house-rent").value;
        const code = document.getElementById("house-code").value;

        try {
            console.log("Attempting to add house...");
            
            // Add to "houses" collection in Firestore
            const docRef = await addDoc(collection(db, "houses"), {
                name: name,
                rent: Number(rent),
                code: code,
                status: "vacant", // Default status
                tenantIds: []     // No tenants yet
            });

            console.log("House created with ID: ", docRef.id);
            alert(`Success! House ${name} created. Code: ${code}`);
            
            // Clear form
            addHouseForm.reset();
            
            // Refresh the list immediately
            loadHouses(); 

        } catch (error) {
            console.error("Error adding house: ", error);
            alert("Error creating house. Check console.");
        }
    });
} else {
    console.error("CRITICAL: Add House Form not found in HTML");
}

// 2. READ HOUSES (Display them in the table)
async function loadHouses() {
    if (!houseListBody) return; // Safety check

    houseListBody.innerHTML = ""; // Clear current list
    
    try {
        const querySnapshot = await getDocs(collection(db, "houses"));
        
        querySnapshot.forEach((doc) => {
            const house = doc.data();
            
            const row = `
                <tr>
                    <td>${house.name}</td>
                    <td><span class="badge" style="background:#eee; padding: 2px 6px; border-radius: 4px;">${house.code}</span></td>
                    <td>KES ${house.rent}</td>
                    <td>${house.status}</td>
                </tr>
            `;
            houseListBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading houses:", error);
    }
}

// 3. Load houses when page opens
loadHouses();