// admin/maintenance.js
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    orderBy,
    query,
    serverTimestamp,
    getDocs,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM References
const tbody = document.getElementById("maintenance-table-body");
const filterBtns = document.querySelectorAll(".filter-btn");

// State
let allRequests = [];
let currentFilter = "all";
const tenantsCache = {};

// Auth Guard
guardPage("admin", async (user, userData) => {
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    // Load tenants into cache
    try {
        const snap = await getDocs(query(collection(db, "users"), where("role", "==", "tenant")));
        snap.forEach((d) => {
            tenantsCache[d.id] = d.data().name;
        });
    } catch (e) {
        console.error("Error loading tenants cache:", e);
    }

    listenToRequests();
});

setupLogout();

// Mobile Sidebar Toggle
const toggleBtn = document.querySelector(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}

// Filter Badges
filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
        filterBtns.forEach((b) => {
            b.classList.remove("active-filter");
            b.className = b.className.replace("btn-primary", "btn-outline");
        });
        btn.classList.add("active-filter");
        btn.className = btn.className.replace("btn-outline", "btn-primary");

        currentFilter = btn.dataset.filter;
        renderTable();
    });
});

// Listen to Maintenance Requests
const listenToRequests = () => {
    const q = query(collection(db, "maintenanceRequests"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allRequests = [];
        snapshot.forEach((docSnap) => {
            allRequests.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderTable();
    }, (error) => {
        console.error("Error listening to maintenance requests:", error);
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Error loading requests</td></tr>`;
    });
};

// Render Table
const renderTable = () => {
    const filtered = currentFilter === "all"
        ? allRequests
        : allRequests.filter((r) => r.status === currentFilter);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No ${currentFilter === "all" ? "" : currentFilter} maintenance requests found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    filtered.forEach((req, index) => {
        const row = document.createElement("tr");

        const badgeClass = req.status === "pending"
            ? "badge-pending"
            : req.status === "in-progress"
                ? "badge-in-progress"
                : "badge-resolved";

        const dateStr = req.createdAt?.toDate
            ? req.createdAt.toDate().toLocaleDateString("en-KE", {
                year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit"
            })
            : "N/A";

        const tenantName = tenantsCache[req.tenantUid] || "Unknown Tenant";

        const shortDesc = req.description && req.description.length > 80
            ? req.description.substring(0, 80) + "..."
            : req.description || "-";

        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${tenantName}</strong></td>
            <td><strong>${req.issue}</strong></td>
            <td>${shortDesc}</td>
            <td><span class="badge ${badgeClass}">${req.status}</span></td>
            <td>${dateStr}</td>
            <td>
                <select class="form-control status-select" data-id="${req.id}" style="width: auto; padding: 0.35rem 0.6rem; font-size: 0.8rem;">
                    <option value="pending" ${req.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="in-progress" ${req.status === "in-progress" ? "selected" : ""}>In Progress</option>
                    <option value="resolved" ${req.status === "resolved" ? "selected" : ""}>Resolved</option>
                </select>
            </td>
        `;
        tbody.appendChild(row);
    });

    // Attach status change handlers
    document.querySelectorAll(".status-select").forEach((select) => {
        select.addEventListener("change", (e) => {
            updateStatus(select.dataset.id, e.target.value);
        });
    });

    if (typeof window.filterPageContent === "function") {
        window.filterPageContent();
    }
};

// Update Request Status
const updateStatus = async (requestId, newStatus) => {
    try {
        await updateDoc(doc(db, "maintenanceRequests", requestId), {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        showToast(`Status updated to "${newStatus}"`, "success");
    } catch (error) {
        console.error("Error updating status:", error);
        showToast("Failed to update status", "error");
    }
};
