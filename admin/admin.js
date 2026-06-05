// admin/admin.js
import { auth, db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Auth guard
guardPage("admin", (user, userData) => {
    // Update sidebar name
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    loadStats();
    loadRecentActivity();
});

setupLogout();

// Mobile sidebar toggle
const toggleBtn = document.querySelector(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

// Load dashboard stats
const loadStats = async () => {
    try {
        // Total houses
        const housesSnap = await getDocs(collection(db, "houses"));
        document.getElementById("stat-houses").textContent = housesSnap.size;

        // Total tenants
        const tenantsQuery = query(collection(db, "users"), where("role", "==", "tenant"));
        const tenantsSnap = await getDocs(tenantsQuery);
        document.getElementById("stat-tenants").textContent = tenantsSnap.size;

        // Pending maintenance requests
        const maintenanceQuery = query(
            collection(db, "maintenanceRequests"),
            where("status", "==", "pending")
        );
        const maintenanceSnap = await getDocs(maintenanceQuery);
        document.getElementById("stat-maintenance").textContent = maintenanceSnap.size;

        // Pending payments
        const paymentsQuery = query(
            collection(db, "payments"),
            where("status", "==", "pending")
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        document.getElementById("stat-payments").textContent = paymentsSnap.size;

    } catch (error) {
        console.error("Error loading stats:", error);
        showToast("Failed to load dashboard stats", "error");
    }
};

// Load recent activity
const loadRecentActivity = () => {
    const tbody = document.getElementById("recent-activity-body");

    const recentPaymentsQuery = query(
        collection(db, "payments"),
        orderBy("date", "desc"),
        limit(10)
    );

    onSnapshot(recentPaymentsQuery, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="3">No recent activity</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = document.createElement("tr");

            const statusBadge = data.status === "approved"
                ? `<span class="badge badge-approved">Approved</span>`
                : data.status === "rejected"
                    ? `<span class="badge badge-rejected">Rejected</span>`
                    : `<span class="badge badge-pending">Pending</span>`;

            const dateStr = data.date?.toDate
                ? data.date.toDate().toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit"
                })
                : "N/A";

            row.innerHTML = `
                <td>Payment ${statusBadge}</td>
                <td>KES ${Number(data.amount).toLocaleString()} - Ref: ${data.refCode || "N/A"}</td>
                <td>${dateStr}</td>
            `;
            tbody.appendChild(row);
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading recent activity:", error);
        tbody.innerHTML = `<tr class="empty-row"><td colspan="3">Error loading activity</td></tr>`;
    });
};