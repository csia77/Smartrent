// admin/directory.js
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM References
const tbody = document.getElementById("directory-table-body");
const modal = document.getElementById("provider-modal");
const modalTitle = document.getElementById("modal-title");
const addBtn = document.getElementById("add-provider-btn");
const closeBtn = document.getElementById("close-modal");
const cancelBtn = document.getElementById("cancel-modal");
const submitBtn = document.getElementById("submit-provider-btn");

const providerIdInput = document.getElementById("provider-id");
const nameInput = document.getElementById("provider-name");
const serviceInput = document.getElementById("provider-service");
const phoneInput = document.getElementById("provider-phone");
const skillsInput = document.getElementById("provider-skills");
const referralsInput = document.getElementById("provider-referrals");

let editingProviderId = null;

// Auth Guard
guardPage("admin", (user, userData) => {
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    listenToDirectory();
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

// Modal controls
const openModal = (editId = null, data = {}) => {
    editingProviderId = editId;
    providerIdInput.value = editId || "";

    if (editId) {
        modalTitle.textContent = "Edit Service Provider";
        submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Save Changes';
        nameInput.value = data.name || "";
        serviceInput.value = data.service || "";
        phoneInput.value = data.phone || "";
        skillsInput.value = data.skills || "";
        referralsInput.value = data.referrals || "";
    } else {
        modalTitle.textContent = "Add Service Provider";
        submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Provider';
        nameInput.value = "";
        serviceInput.value = "";
        phoneInput.value = "";
        skillsInput.value = "";
        referralsInput.value = "";
    }
    modal.classList.add("active");
};

const closeModal = () => {
    modal.classList.remove("active");
    editingProviderId = null;
    providerIdInput.value = "";
    nameInput.value = "";
    serviceInput.value = "";
    phoneInput.value = "";
    skillsInput.value = "";
    referralsInput.value = "";
};

addBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

// Listen to Service Directory
const listenToDirectory = () => {
    onSnapshot(collection(db, "serviceDirectory"), (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No service providers registered. Click Add to create one.</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><strong>${data.name}</strong></td>
                <td><span class="badge badge-in-progress">${data.service}</span></td>
                <td><a href="tel:${data.phone}"><code>${data.phone}</code></a></td>
                <td>${data.skills || "-"}</td>
                <td>${data.referrals || "-"}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-provider-btn" data-id="${id}" data-name="${data.name}" data-service="${data.service}" data-phone="${data.phone}" data-skills="${data.skills || ""}" data-referrals="${data.referrals || ""}">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="btn btn-danger btn-sm delete-provider-btn" data-id="${id}">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Edit handlers
        document.querySelectorAll(".edit-provider-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                openModal(btn.dataset.id, {
                    name: btn.dataset.name,
                    service: btn.dataset.service,
                    phone: btn.dataset.phone,
                    skills: btn.dataset.skills,
                    referrals: btn.dataset.referrals
                });
            });
        });

        // Delete handlers
        document.querySelectorAll(".delete-provider-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                deleteProvider(btn.dataset.id);
            });
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading service directory:", error);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Error loading service directory</td></tr>';
    });
};

// Submit Provider Form
submitBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const service = serviceInput.value.trim();
    const phone = phoneInput.value.trim();
    const skills = skillsInput.value.trim();
    const referrals = referralsInput.value.trim();

    if (!name || !service || !phone || !skills) {
        showToast("Please fill in all required fields", "warning");
        return;
    }

    submitBtn.disabled = true;

    try {
        const payload = {
            name,
            service,
            phone,
            skills,
            referrals,
            updatedAt: serverTimestamp()
        };

        if (editingProviderId) {
            await updateDoc(doc(db, "serviceDirectory", editingProviderId), payload);
            showToast("Service provider updated successfully", "success");
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, "serviceDirectory"), payload);
            showToast("Service provider added successfully", "success");
        }
        closeModal();
    } catch (error) {
        console.error("Error saving provider:", error);
        showToast("Failed to save service provider", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

// Delete Provider
const deleteProvider = async (providerId) => {
    if (!confirm("Are you sure you want to delete this service provider?")) return;
    try {
        await deleteDoc(doc(db, "serviceDirectory", providerId));
        showToast("Service provider removed", "success");
    } catch (error) {
        console.error("Error deleting provider:", error);
        showToast("Failed to remove service provider", "error");
    }
};
