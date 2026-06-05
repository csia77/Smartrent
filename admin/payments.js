// payments.js - payment verification
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection, query, orderBy, onSnapshot, doc, updateDoc, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const tbody = document.getElementById("payments-list-body");
const tenantsCache = {};

guardPage("admin", async (user, userData) => {
    const name = document.getElementById("sidebar-username");
    if (name) name.textContent = userData.name || "Admin";

    // Load tenant names into cache
    try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "tenant")));
        snap.forEach(d => { tenantsCache[d.id] = d.data().name; });
    } catch (e) {
        console.error("Error loading tenants cache:", e);
    }

    loadPayments();
});

setupLogout();

// Mobile sidebar
const toggleBtn = document.querySelector(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
}

function loadPayments() {
    const q = query(collection(db, "payments"), orderBy("date", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No payments yet</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const pay = docSnap.data();
            const id = docSnap.id;
            const tenantName = tenantsCache[pay.tenantId] || "Unknown";
            const dateStr = pay.date?.toDate
                ? pay.date.toDate().toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })
                : "Just now";

            const badgeClass = pay.status === "approved" ? "badge-approved"
                : pay.status === "rejected" ? "badge-rejected"
                : "badge-pending";

            let actionsHtml = '';
            if (pay.status === "pending") {
                actionsHtml = `
                    <button class="btn btn-success btn-sm approve-btn" data-id="${id}" style="margin-right: 0.25rem;"><i class="fa-solid fa-check"></i> Approve</button>
                    <button class="btn btn-danger btn-sm reject-btn" data-id="${id}"><i class="fa-solid fa-xmark"></i> Reject</button>
                `;
            } else {
                actionsHtml = `<span class="badge ${badgeClass}">${pay.status}</span>`;
            }

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${tenantName}</strong></td>
                <td><code>${pay.refCode || "N/A"}</code></td>
                <td>KES ${Number(pay.amount).toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${pay.status}</span></td>
                <td>${actionsHtml}</td>
            `;
            tbody.appendChild(row);
        });

        // Approve handlers
        document.querySelectorAll(".approve-btn").forEach(btn => {
            btn.addEventListener("click", () => updatePayment(btn.dataset.id, "approved"));
        });

        // Reject handlers
        document.querySelectorAll(".reject-btn").forEach(btn => {
            btn.addEventListener("click", () => updatePayment(btn.dataset.id, "rejected"));
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading payments:", error);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading payments</td></tr>';
    });
}

async function updatePayment(paymentId, newStatus) {
    if (!confirm(`Mark this payment as ${newStatus}?`)) return;
    try {
        await updateDoc(doc(db, "payments", paymentId), { status: newStatus });
        showToast(`Payment ${newStatus}`, "success");
    } catch (error) {
        console.error("Error updating payment:", error);
        showToast("Failed to update payment", "error");
    }
}
