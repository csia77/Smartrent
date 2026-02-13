// tenant/tenant.js
import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// to handle the form submit and listen for history.
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    onSnapshot,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const welcomeMsg = document.getElementById("welcome-msg");
const houseContainer = document.getElementById("house-details-container");
const noHouseMsg = document.getElementById("no-house-msg");

const houseNameEl = document.getElementById("house-name");
const houseRentEl = document.getElementById("house-rent");
const houseStatusEl = document.getElementById("house-status");

// 1. AUTH CHECK
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Tenant found:", user.email);
        loadTenantData(user.uid);
    } else {
        window.location.href = "../index.html";
    }
});

// 2. MAIN LOGIC
async function loadTenantData(userId) {
    try {
        // A. Get User Profile to find the 'houseId'
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
            console.error("User profile missing!");
            return;
        }

        const userData = userSnap.data();
        welcomeMsg.innerText = `Welcome back, ${userData.name}`;

        // Check if they are actually linked to a house
        if (!userData.houseId) {
            noHouseMsg.style.display = "block";
            return;
        }

        // B. Get House Details using the 'houseId'
        const houseDocRef = doc(db, "houses", userData.houseId);
        const houseSnap = await getDoc(houseDocRef);

        if (houseSnap.exists()) {
            const houseData = houseSnap.data();
            
            // C. Update UI
            houseNameEl.innerText = houseData.name;
            houseRentEl.innerText = `KES ${houseData.rent}`;
            houseStatusEl.innerText = "Occupied"; // Since they are logged in, it's occupied by them!
            
            houseContainer.style.display = "block"; // Show the card
        } else {
            console.error("House data not found!");
            noHouseMsg.innerText = "Error: Your linked house no longer exists.";
            noHouseMsg.style.display = "block";
        }

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

//  PAYMENT SYSTEM logic

const paymentForm = document.getElementById("payment-form");
const paymentList = document.getElementById("payment-list");

// We need the global variable for currentUser ID from the auth listener
let currentUserId = null;
let currentHouseId = null; 

// Update your existing Auth Listener to save these IDs
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        // ... existing code loads user profile ...
        // INSIDE loadTenantData, make sure you save houseId to the global variable:
        // currentHouseId = userData.houseId;
        
        // AFTER loading user data, load payments
        loadPaymentHistory(user.uid);
    }
});

// 1. SUBMIT PAYMENT
if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const amount = document.getElementById("pay-amount").value;
        const ref = document.getElementById("pay-ref").value;

        if(!currentHouseId) {
            alert("Error: You are not assigned to a house!");
            return;
        }

        try {
            await addDoc(collection(db, "payments"), {
                tenantId: currentUserId,
                houseId: currentHouseId,
                amount: Number(amount),
                refCode: ref,
                status: "pending", // Pending admin approval
                date: new Date()
            });

            alert("Payment recorded! Waiting for approval.");
            paymentForm.reset();

        } catch (error) {
            console.error("Payment Error:", error);
            alert("Failed to submit payment.");
        }
    });
}

// 2. LISTEN FOR HISTORY (Real-time!)
function loadPaymentHistory(userId) {
    const q = query(
        collection(db, "payments"), 
        where("tenantId", "==", userId),
        orderBy("date", "desc")
    );

    // onSnapshot updates automatically when status changes!
    onSnapshot(q, (snapshot) => {
        paymentList.innerHTML = "";
        
        snapshot.forEach((doc) => {
            const pay = doc.data();
            const date = pay.date.toDate().toLocaleDateString();
            
            // Color code the status
            let statusColor = "orange";
            if (pay.status === "approved") statusColor = "green";
            if (pay.status === "rejected") statusColor = "red";

            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 0.8rem;">${date}</td>
                    <td style="padding: 0.8rem;">${pay.refCode}</td>
                    <td style="padding: 0.8rem;">KES ${pay.amount}</td>
                    <td style="padding: 0.8rem;">
                        <span style="color: ${statusColor}; font-weight: bold; text-transform: capitalize;">
                            ${pay.status}
                        </span>
                    </td>
                </tr>
            `;
            paymentList.innerHTML += row;
        });
    });
}
// 3. LOGOUT FUNCTION
document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => {
        window.location.href = "../index.html";
    });
});