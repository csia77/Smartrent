// tenants.js - tenant management
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    onSnapshot,
    query,
    where,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";

const firebaseConfig = {
    apiKey: "AIzaSyCQDKELJbF8O6jCVG2VnVEhhuhxQEwPzKs",
    authDomain: "smart-rent-5fe3d.firebaseapp.com",
    projectId: "smart-rent-5fe3d",
    storageBucket: "smart-rent-5fe3d.firebasestorage.app",
    messagingSenderId: "731695067009",
    appId: "1:731695067009:web:f5e99292759873eaf30280"
};

// DOM refs
const tbody = document.getElementById("tenants-table-body");
const addModal = document.getElementById("add-tenant-modal");
const addBtn = document.getElementById("add-tenant-btn");
const closeTenantModal = document.getElementById("close-tenant-modal");
const cancelTenantModal = document.getElementById("cancel-tenant-modal");
const submitTenantBtn = document.getElementById("submit-tenant-btn");
const nameInput = document.getElementById("tenant-name-input");
const emailInput = document.getElementById("tenant-email-input");
const passwordInput = document.getElementById("tenant-password-input");
const houseSelect = document.getElementById("tenant-house-select");

// Edit rent modal
const rentModal = document.getElementById("edit-rent-modal");
const closeRentModal = document.getElementById("close-rent-modal");
const cancelRentModal = document.getElementById("cancel-rent-modal");
const saveRentBtn = document.getElementById("save-rent-btn");
const currentRentDisplay = document.getElementById("current-rent-display");
const editRentInput = document.getElementById("edit-rent-input");

// State
const housesMap = new Map(); // houseId to house data
let editingTenantId = null;

// Auth
guardPage("admin", (user, userData) => {
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    loadHousesForDropdown();
    listenToTenants();
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

// Load houses for dropdown
const loadHousesForDropdown = async () => {
    try {
        const snapshot = await getDocs(collection(db, "houses"));
        houseSelect.innerHTML = `<option value="">-- Select a house --</option>`;
        housesMap.clear();

        snapshot.forEach((docSnap) => {
            const house = docSnap.data();
            const id = docSnap.id;
            housesMap.set(id, house);

            const option = document.createElement("option");
            option.value = id;
            option.textContent = `${house.name} (${house.code}) - KES ${Number(house.rent).toLocaleString()}`;
            houseSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading houses:", error);
        showToast("Failed to load houses", "error");
    }
};

// Listen to tenants (Real-time)
const listenToTenants = () => {
    const tenantsQuery = query(collection(db, "users"), where("role", "==", "tenant"));

    onSnapshot(tenantsQuery, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No tenants found. Add one to get started.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const tenant = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement("tr");

            const house = housesMap.get(tenant.houseId);
            const houseName = house ? `${house.name} (${house.code})` : "Unassigned";

            const joinedDate = tenant.createdAt?.toDate
                ? tenant.createdAt.toDate().toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric"
                })
                : "N/A";

            row.innerHTML = `
                <td><strong>${tenant.name}</strong></td>
                <td>${tenant.email}</td>
                <td><span class="badge badge-in-progress">${houseName}</span></td>
                <td>KES ${Number(tenant.rentAmount || 0).toLocaleString()}</td>
                <td>${joinedDate}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-rent-btn" data-id="${id}" data-rent="${tenant.rentAmount || 0}" style="margin-right: 0.25rem;">
                        <i class="fa-solid fa-pen"></i> Edit Rent
                    </button>
                    <button class="btn btn-danger btn-sm delete-tenant-btn" data-id="${id}" data-house-id="${tenant.houseId || ""}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Attach edit rent handlers
        document.querySelectorAll(".edit-rent-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingTenantId = btn.dataset.id;
                const currentRent = btn.dataset.rent;
                currentRentDisplay.textContent = `KES ${Number(currentRent).toLocaleString()}`;
                editRentInput.value = currentRent;
                rentModal.classList.add("active");
            });
        });

        // Attach delete handlers
        document.querySelectorAll(".delete-tenant-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                deleteTenant(btn.dataset.id, btn.dataset.houseId);
            });
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error listening to tenants:", error);
        tbody.innerHTML = `<tr class="empty-row"><td colspan="6">Error loading tenants</td></tr>`;
    });
};

// Delete tenant
const deleteTenant = async (tenantId, houseId) => {
    if (!confirm("Delete this tenant? Their account will be deactivated.")) return;
    try {
        await deleteDoc(doc(db, "users", tenantId));
        if (houseId) {
            const houseRef = doc(db, "houses", houseId);
            await updateDoc(houseRef, { tenantIds: arrayRemove(tenantId) });
        }
        showToast("Tenant removed", "success");
    } catch (error) {
        console.error("Error deleting tenant:", error);
        showToast("Failed to delete tenant", "error");
    }
};

// Add Tenant Modal
const openAddModal = () => addModal.classList.add("active");
const closeAddModal = () => {
    addModal.classList.remove("active");
    nameInput.value = "";
    emailInput.value = "";
    passwordInput.value = "";
    houseSelect.value = "";
};

addBtn.addEventListener("click", openAddModal);
closeTenantModal.addEventListener("click", closeAddModal);
cancelTenantModal.addEventListener("click", closeAddModal);
addModal.addEventListener("click", (e) => {
    if (e.target === addModal) closeAddModal();
});

// Submit New Tenant
submitTenantBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const houseId = houseSelect.value;

    if (!name || !email || !password || !houseId) {
        showToast("Please fill in all fields", "warning");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "warning");
        return;
    }

    const house = housesMap.get(houseId);
    if (!house) {
        showToast("Invalid house selected", "error");
        return;
    }

    submitTenantBtn.disabled = true;
    submitTenantBtn.innerHTML = `<span class="spinner"></span> Creating...`;

    let tempApp = null;

    try {
        // Create a temporary Firebase app to avoid signing out the admin
        tempApp = initializeApp(firebaseConfig, "temp-auth");
        const tempAuth = getAuth(tempApp);

        // Create the user account
        const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
        const tenantUid = cred.user.uid;

        // Write user profile to Firestore
        await setDoc(doc(db, "users", tenantUid), {
            name,
            email,
            role: "tenant",
            houseId,
            rentAmount: house.rent,
            createdAt: serverTimestamp(),
            balance: 0
        });

        // Update house: add tenant and set status to occupied
        await updateDoc(doc(db, "houses", houseId), {
            tenantIds: arrayUnion(tenantUid),
            status: "occupied"
        });

        showToast(`Tenant "${name}" created successfully!`, "success");
        closeAddModal();

    } catch (error) {
        console.error("Error creating tenant:", error);
        if (error.code === "auth/email-already-in-use") {
            showToast("Email is already in use", "error");
        } else if (error.code === "auth/invalid-email") {
            showToast("Invalid email address", "error");
        } else {
            showToast("Failed to create tenant: " + error.message, "error");
        }
    } finally {
        // Always clean up the temp app
        if (tempApp) {
            try { await deleteApp(tempApp); } catch (e) { /* ignore */ }
        }
        submitTenantBtn.disabled = false;
        submitTenantBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Add Tenant`;
    }
});

// Edit Rent Modal
const closeEditRentModal = () => {
    rentModal.classList.remove("active");
    editingTenantId = null;
    editRentInput.value = "";
};

closeRentModal.addEventListener("click", closeEditRentModal);
cancelRentModal.addEventListener("click", closeEditRentModal);
rentModal.addEventListener("click", (e) => {
    if (e.target === rentModal) closeEditRentModal();
});

saveRentBtn.addEventListener("click", async () => {
    const newRent = editRentInput.value.trim();

    if (!newRent || !editingTenantId) {
        showToast("Please enter a valid rent amount", "warning");
        return;
    }

    saveRentBtn.disabled = true;
    saveRentBtn.innerHTML = `<span class="spinner"></span> Saving...`;

    try {
        await updateDoc(doc(db, "users", editingTenantId), {
            rentAmount: Number(newRent)
        });
        showToast("Rent updated successfully!", "success");
        closeEditRentModal();
    } catch (error) {
        console.error("Error updating rent:", error);
        showToast("Failed to update rent", "error");
    } finally {
        saveRentBtn.disabled = false;
        saveRentBtn.innerHTML = `<i class="fa-solid fa-check"></i> Save`;
    }
});
