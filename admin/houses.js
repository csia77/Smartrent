// houses.js - house management
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM refs
const tbody = document.getElementById("houses-table-body");
const modal = document.getElementById("add-house-modal");
const modalTitle = document.getElementById("house-modal-title");
const addBtn = document.getElementById("add-house-btn");
const closeBtn = document.getElementById("close-house-modal");
const cancelBtn = document.getElementById("cancel-house-modal");
const submitBtn = document.getElementById("submit-house-btn");
const nameInput = document.getElementById("house-name-input");
const rentInput = document.getElementById("house-rent-input");
const codeInput = document.getElementById("house-code-input");

let editingHouseId = null;

// Auth
guardPage("admin", (user, userData) => {
    const name = document.getElementById("sidebar-username");
    if (name) name.textContent = userData.name || "Admin";
    listenToHouses();
});
setupLogout();

// Mobile sidebar
const toggleBtn = document.querySelector(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => sidebar.classList.toggle("open"));
}

// Modal controls
const openModal = (editId = null, data = {}) => {
    editingHouseId = editId;
    if (editId) {
        modalTitle.textContent = "Edit House";
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        nameInput.value = data.name || "";
        rentInput.value = data.rent || "";
        codeInput.value = data.code || "";
    } else {
        modalTitle.textContent = "Add New House";
        submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add House';
        nameInput.value = "";
        rentInput.value = "";
        codeInput.value = "";
    }
    modal.classList.add("active");
};

const closeModal = () => {
    modal.classList.remove("active");
    editingHouseId = null;
    nameInput.value = "";
    rentInput.value = "";
    codeInput.value = "";
};

addBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// Real-time houses listener
const listenToHouses = () => {
    onSnapshot(collection(db, "houses"), (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No houses yet. Add one to get started.</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const house = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement("tr");
            const statusClass = house.status === "occupied" ? "badge-occupied" : "badge-vacant";
            const tenantCount = house.tenantIds ? house.tenantIds.length : 0;

            row.innerHTML = `
                <td><strong>${house.name}</strong></td>
                <td><span class="badge badge-in-progress">${house.code}</span></td>
                <td>KES ${Number(house.rent).toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${house.status}</span></td>
                <td>${tenantCount}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-house-btn" data-id="${id}" data-name="${house.name}" data-rent="${house.rent}" data-code="${house.code}">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-house-btn" data-id="${id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Edit handlers
        document.querySelectorAll(".edit-house-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                openModal(btn.dataset.id, {
                    name: btn.dataset.name,
                    rent: btn.dataset.rent,
                    code: btn.dataset.code
                });
            });
        });

        // Delete handlers
        document.querySelectorAll(".delete-house-btn").forEach((btn) => {
            btn.addEventListener("click", () => deleteHouse(btn.dataset.id));
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading houses:", error);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading houses</td></tr>';
    });
};

// Add or edit house
submitBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const rent = rentInput.value.trim();
    const code = codeInput.value.trim();

    if (!name || !rent || !code) {
        showToast("Please fill in all fields", "warning");
        return;
    }

    submitBtn.disabled = true;

    try {
        if (editingHouseId) {
            await updateDoc(doc(db, "houses", editingHouseId), { name, rent: Number(rent), code });
            showToast("House updated!", "success");
        } else {
            await addDoc(collection(db, "houses"), {
                name, rent: Number(rent), code, status: "vacant", tenantIds: []
            });
            showToast("House added!", "success");
        }
        closeModal();
    } catch (error) {
        console.error("Error saving house:", error);
        showToast("Failed to save house", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

// Delete house
const deleteHouse = async (houseId) => {
    if (!confirm("Are you sure you want to delete this house?")) return;
    try {
        await deleteDoc(doc(db, "houses", houseId));
        showToast("House deleted", "success");
    } catch (error) {
        console.error("Error deleting house:", error);
        showToast("Failed to delete house", "error");
    }
};
