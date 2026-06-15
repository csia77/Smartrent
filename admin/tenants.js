// tenants.js - tenant management
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    addDoc,
    onSnapshot,
    query,
    where,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db, firebaseConfig } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";

// DOM refs
const tbody         = document.getElementById("tenants-table-body");
const addModal      = document.getElementById("add-tenant-modal");
const addBtn        = document.getElementById("add-tenant-btn");
const closeTenantModal  = document.getElementById("close-tenant-modal");
const cancelTenantModal = document.getElementById("cancel-tenant-modal");
const submitTenantBtn   = document.getElementById("submit-tenant-btn");
const nameInput     = document.getElementById("tenant-name-input");
const emailInput    = document.getElementById("tenant-email-input");
const passwordInput = document.getElementById("tenant-password-input");
const houseSelect   = document.getElementById("tenant-house-select");

// New-house sub-form refs
const newHousePanel = document.getElementById("new-house-panel");
const newHouseName  = document.getElementById("new-house-name");
const newHouseRent  = document.getElementById("new-house-rent");
const newHouseCode  = document.getElementById("new-house-code");

// Edit rent modal
const rentModal          = document.getElementById("edit-rent-modal");
const closeRentModal     = document.getElementById("close-rent-modal");
const cancelRentModal    = document.getElementById("cancel-rent-modal");
const saveRentBtn        = document.getElementById("save-rent-btn");
const currentRentDisplay = document.getElementById("current-rent-display");
const editRentInput      = document.getElementById("edit-rent-input");

// State
const housesMap = new Map(); // houseId to house data
let editingTenantId = null;

// Auth
// loadHousesForDropdown is awaited before listenToTenants so that housesMap is
// populated before the first snapshot fires. Without the await, tenants would
// show as "Unassigned" on the initial load.
guardPage("admin", async (user, userData) => {
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    await loadHousesForDropdown();
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
        // Reset to default options
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

        // Always add the "create new" option at the bottom, separated visually
        const newOption = document.createElement("option");
        newOption.value = "__new__";
        newOption.textContent = "+ Create a new unit";
        newOption.style.fontWeight = "600";
        newOption.style.color = "var(--primary-blue)";
        houseSelect.appendChild(newOption);

    } catch (error) {
        console.error("Error loading houses:", error);
        showToast("Failed to load houses", "error");
    }
};

// Show or hide the new-house sub-form based on the dropdown selection
houseSelect.addEventListener("change", () => {
    if (houseSelect.value === "__new__") {
        newHousePanel.style.display = "block";
    } else {
        newHousePanel.style.display = "none";
    }
});

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
    nameInput.value         = "";
    emailInput.value        = "";
    passwordInput.value     = "";
    houseSelect.value       = "";
    newHousePanel.style.display = "none";
    newHouseName.value      = "";
    newHouseRent.value      = "";
    newHouseCode.value      = "";
};

addBtn.addEventListener("click", openAddModal);
closeTenantModal.addEventListener("click", closeAddModal);
cancelTenantModal.addEventListener("click", closeAddModal);
addModal.addEventListener("click", (e) => {
    if (e.target === addModal) closeAddModal();
});

// Submit New Tenant
submitTenantBtn.addEventListener("click", async () => {
    const name     = nameInput.value.trim();
    const email    = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const selectedValue = houseSelect.value;
    const isNewHouse    = selectedValue === "__new__";

    if (!name || !email || !password || !selectedValue) {
        showToast("Please fill in all fields", "warning");
        return;
    }

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "warning");
        return;
    }

    // When creating a new house, validate its fields too
    if (isNewHouse) {
        const hn = newHouseName.value.trim();
        const hr = newHouseRent.value.trim();
        const hc = newHouseCode.value.trim();
        if (!hn || !hr || !hc) {
            showToast("Please fill in all new unit details", "warning");
            return;
        }
        if (Number(hr) <= 0) {
            showToast("Rent amount must be greater than zero", "warning");
            return;
        }
    } else {
        // Existing house -- verify it is still in the map
        if (!housesMap.get(selectedValue)) {
            showToast("Selected house is no longer valid. Please refresh.", "error");
            return;
        }
    }

    submitTenantBtn.disabled = true;
    submitTenantBtn.innerHTML = `<span class="spinner"></span> Creating...`;

    let tempApp  = null;
    let houseId  = selectedValue;
    let rentAmount = 0;

    try {
        // Step 1: if a new house was requested, create it first
        if (isNewHouse) {
            const hn = newHouseName.value.trim();
            const hr = Number(newHouseRent.value.trim());
            const hc = newHouseCode.value.trim();

            const houseRef = await addDoc(collection(db, "houses"), {
                name:      hn,
                rent:      hr,
                code:      hc,
                status:    "vacant",
                tenantIds: [],
                createdAt: serverTimestamp()
            });

            houseId    = houseRef.id;
            rentAmount = hr;

            // Keep the local map in sync so the table reflects this immediately
            housesMap.set(houseId, { name: hn, rent: hr, code: hc, status: "vacant" });
        } else {
            rentAmount = housesMap.get(houseId).rent;
        }

        // Step 2: create the Firebase Auth account using a secondary app instance
        // so the admin session is not interrupted
        tempApp = initializeApp(firebaseConfig, "temp-auth-" + Date.now());
        const tempAuth = getAuth(tempApp);
        const cred = await createUserWithEmailAndPassword(tempAuth, email, password);
        const tenantUid = cred.user.uid;

        // Step 3: write the tenant profile to Firestore
        await setDoc(doc(db, "users", tenantUid), {
            name,
            email,
            role:        "tenant",
            houseId,
            rentAmount,
            createdAt:   serverTimestamp(),
            balance:     0
        });

        // Step 4: mark the house as occupied and add the tenant to its list
        await updateDoc(doc(db, "houses", houseId), {
            tenantIds: arrayUnion(tenantUid),
            status:    "occupied"
        });

        showToast(`Tenant "${name}" created successfully!`, "success");
        closeAddModal();
        // Reload the dropdown so the new house appears for future adds
        await loadHousesForDropdown();

    } catch (error) {
        console.error("Error creating tenant:", error);
        if (error.code === "auth/email-already-in-use") {
            showToast("This email address is already in use", "error");
        } else if (error.code === "auth/invalid-email") {
            showToast("Invalid email address", "error");
        } else {
            showToast("Failed to create tenant: " + error.message, "error");
        }
    } finally {
        // Always tear down the temporary auth app
        if (tempApp) {
            try { await deleteApp(tempApp); } catch (e) { /* ignore cleanup errors */ }
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
