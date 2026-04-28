import { auth, db } from "../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "../index.html"; }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth).then(() => { window.location.href = "../index.html"; });
});

// --- INVOICES LOGIC ---
const generateInvoiceForm = document.getElementById("generate-invoice-form");
const tenantSelect = document.getElementById("invoice-tenant");
const invoicesListBody = document.getElementById("invoices-list-body");

let tenantsCache = {};

// 1. Populate Tenant Dropdown
async function loadTenantsForDropdown() {
    try {
        const q = query(collection(db, "users"), where("role", "==", "tenant"));
        const snapshot = await getDocs(q);
        
        tenantSelect.innerHTML = "<option value=''>-- Select Tenant --</option>";
        
        snapshot.forEach((doc) => {
            const tenant = doc.data();
            if(tenant.houseId) { // Only invoice assigned tenants
                tenantsCache[doc.id] = tenant.name;
                tenantSelect.innerHTML += `<option value="${doc.id}">${tenant.name}</option>`;
            }
        });
    } catch (error) {
        console.error("Error loading tenants for dropdown:", error);
    }
}

// 2. Generate Invoice
if (generateInvoiceForm) {
    generateInvoiceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const tenantId = tenantSelect.value;
        const amount = document.getElementById("invoice-amount").value;
        const dueDate = document.getElementById("invoice-date").value;
        
        if(!tenantId) {
            alert("Please select a tenant");
            return;
        }

        try {
            await addDoc(collection(db, "invoices"), {
                tenantId: tenantId,
                amount: Number(amount),
                dueDate: dueDate,
                status: "unpaid",
                dateCreated: new Date()
            });

            alert("Invoice generated successfully!");
            generateInvoiceForm.reset();
        } catch (error) {
            console.error("Error generating invoice:", error);
            alert("Failed to generate invoice.");
        }
    });
}

// 3. Load Invoices Table
function loadInvoices() {
    const q = query(collection(db, "invoices"), orderBy("dateCreated", "desc"));
    
    onSnapshot(q, (snapshot) => {
        invoicesListBody.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const invoice = docSnap.data();
            const tenantName = tenantsCache[invoice.tenantId] || "Unknown Tenant";
            
            const statusColor = invoice.status === 'paid' ? "var(--primary-green)" : "var(--primary-red)";

            const row = `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 1rem;">${tenantName}</td>
                    <td style="padding: 1rem;">KES ${invoice.amount}</td>
                    <td style="padding: 1rem;">${invoice.dueDate}</td>
                    <td style="padding: 1rem;">
                        <span style="color: ${statusColor}; font-weight: 500; text-transform: capitalize;">${invoice.status}</span>
                    </td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-primary" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;"><i class="fa-solid fa-bell"></i> Remind</button>
                    </td>
                </tr>
            `;
            invoicesListBody.innerHTML += row;
        });
    });
}

// Init
loadTenantsForDropdown().then(loadInvoices);
