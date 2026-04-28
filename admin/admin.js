import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "../index.html"; }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "../index.html"; });
});

// --- DASHBOARD STATS LOGIC ---
const statHouses = document.getElementById("stat-houses");
const statTenants = document.getElementById("stat-tenants");
const statInvoices = document.getElementById("stat-invoices");
const recentActivityBody = document.getElementById("recent-activity-body");

async function loadDashboardStats() {
    try {
        // Get Houses Count
        const housesSnap = await getDocs(collection(db, "houses"));
        if(statHouses) statHouses.innerText = housesSnap.size;

        // Get Tenants Count
        const tenantsQuery = query(collection(db, "users"), where("role", "==", "tenant"));
        const tenantsSnap = await getDocs(tenantsQuery);
        if(statTenants) statTenants.innerText = tenantsSnap.size;

        // Get Invoices Count
        const invoicesSnap = await getDocs(collection(db, "invoices"));
        if(statInvoices) statInvoices.innerText = invoicesSnap.size;
        
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}

function loadRecentActivity() {
    if(!recentActivityBody) return;
    
    // We will show recent payments as "Transactions"
    const q = query(collection(db, "payments"), orderBy("date", "desc"), limit(5));
    
    onSnapshot(q, (snapshot) => {
        recentActivityBody.innerHTML = "";
        
        if(snapshot.empty) {
            recentActivityBody.innerHTML = "<tr><td colspan='2' style='padding: 1rem;'>No recent activity</td></tr>";
            return;
        }

        snapshot.forEach((docSnap) => {
            const pay = docSnap.data();
            const dateStr = pay.date ? pay.date.toDate().toLocaleString() : "Just now";
            
            const actionText = `Tenant submitted payment (Ref: ${pay.refCode}) for KES ${pay.amount}`;
            
            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${actionText}</td>
                    <td style="padding: 1rem; color: var(--text-muted);">${dateStr}</td>
                </tr>
            `;
            recentActivityBody.innerHTML += row;
        });
    });
}

// Init Dashboard
loadDashboardStats();
loadRecentActivity();