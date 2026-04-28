import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "../index.html"; }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "../index.html"; });
});

// --- PAYMENTS LOGIC ---
const paymentsListBody = document.getElementById("payments-list-body");

let tenantsCache = {};

// Load tenants into cache to resolve names quickly
async function populateTenantsCache() {
    // simplified version for the prototype - in production we might fetch on demand
    const q = query(collection(db, "users"));
    onSnapshot(q, (snap) => {
        snap.forEach(doc => {
            if(doc.data().role === 'tenant') {
                tenantsCache[doc.id] = doc.data().name;
            }
        });
    });
}

function loadPayments() {
    const q = query(collection(db, "payments"), orderBy("date", "desc"));
    
    onSnapshot(q, (snapshot) => {
        paymentsListBody.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const pay = docSnap.data();
            const payId = docSnap.id;
            const tenantName = tenantsCache[pay.tenantId] || "Loading...";
            const dateStr = pay.date ? pay.date.toDate().toLocaleString() : "Just now";
            
            let statusColor = "var(--primary-orange)";
            let actionsHtml = `
                <button class="btn btn-success verify-btn" data-id="${payId}" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; margin-right: 5px;"><i class="fa-solid fa-check"></i></button>
                <button class="btn reject-btn" data-id="${payId}" style="padding: 0.3rem 0.5rem; font-size: 0.8rem; background: var(--primary-red); color: white;"><i class="fa-solid fa-xmark"></i></button>
            `;

            if (pay.status === "approved") {
                statusColor = "var(--primary-green)";
                actionsHtml = `<span style="color: gray; font-size: 0.8rem;">Verified</span>`;
            } else if (pay.status === "rejected") {
                statusColor = "var(--primary-red)";
                actionsHtml = `<span style="color: gray; font-size: 0.8rem;">Rejected</span>`;
            }

            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${dateStr}</td>
                    <td style="padding: 1rem; font-weight: 500;">${tenantName}</td>
                    <td style="padding: 1rem;">${pay.refCode}</td>
                    <td style="padding: 1rem;">KES ${pay.amount}</td>
                    <td style="padding: 1rem;">
                        <span style="color: ${statusColor}; font-weight: 500; text-transform: capitalize;">${pay.status}</span>
                    </td>
                    <td style="padding: 1rem;">${actionsHtml}</td>
                </tr>
            `;
            paymentsListBody.innerHTML += row;
        });

        // Attach event listeners to buttons
        document.querySelectorAll(".verify-btn").forEach(btn => {
            btn.addEventListener("click", (e) => updatePaymentStatus(e.currentTarget.dataset.id, "approved"));
        });
        document.querySelectorAll(".reject-btn").forEach(btn => {
            btn.addEventListener("click", (e) => updatePaymentStatus(e.currentTarget.dataset.id, "rejected"));
        });
    });
}

async function updatePaymentStatus(paymentId, newStatus) {
    if(!confirm(`Are you sure you want to mark this payment as ${newStatus}?`)) return;

    try {
        await updateDoc(doc(db, "payments", paymentId), {
            status: newStatus
        });
    } catch (error) {
        console.error("Error updating payment:", error);
        alert("Failed to update status.");
    }
}

// Init
populateTenantsCache();
setTimeout(loadPayments, 500); // Give cache a split second to load
