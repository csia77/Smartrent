import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- AUTH LISTENER & LOGOUT ---
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "../index.html"; }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "../index.html"; });
});

// --- TENANTS LOGIC ---
const tenantListBody = document.getElementById("tenant-list-body");

async function loadTenants() {
    if (!tenantListBody) return;
    tenantListBody.innerHTML = ""; 

    try {
        const q = query(collection(db, "users"), where("role", "==", "tenant"));
        const querySnapshot = await getDocs(q);
        
        // Use a for...of loop so we can await inside it
        for (const userDoc of querySnapshot.docs) {
            const tenant = userDoc.data();
            
            // Get house details if assigned
            let houseName = "Not Assigned";
            if (tenant.houseId) {
                const houseSnap = await getDoc(doc(db, "houses", tenant.houseId));
                if (houseSnap.exists()) {
                    houseName = houseSnap.data().name;
                }
            }

            const status = tenant.houseId ? "Active" : "Pending Assignment";
            const statusColor = tenant.houseId ? "var(--primary-green)" : "var(--primary-orange)";

            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem; font-weight: 500;">${tenant.name || 'Unknown'}</td>
                    <td style="padding: 1rem; color: var(--text-muted);">${tenant.email || 'Unknown'}</td>
                    <td style="padding: 1rem;">${houseName}</td>
                    <td style="padding: 1rem;">
                        <span style="color: ${statusColor}; font-weight: 500;">${status}</span>
                    </td>
                </tr>
            `;
            tenantListBody.innerHTML += row;
        }
    } catch (error) {
        console.error("Error loading tenants:", error);
    }
}

loadTenants();
