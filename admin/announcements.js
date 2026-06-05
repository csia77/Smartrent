// announcements.js - admin announcements management
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM refs
const container = document.getElementById("announcements-container");
const modal = document.getElementById("announcement-modal");
const modalTitle = document.getElementById("ann-modal-title");
const newBtn = document.getElementById("new-announcement-btn");
const closeBtn = document.getElementById("close-ann-modal");
const cancelBtn = document.getElementById("cancel-ann-modal");
const submitBtn = document.getElementById("ann-submit-btn");
const titleInput = document.getElementById("ann-title-input");
const messageInput = document.getElementById("ann-message-input");
const editIdInput = document.getElementById("ann-edit-id");

let currentUser = null;
let currentUserName = "Caretaker / Admin";

// Auth
guardPage("admin", (user, userData) => {
    currentUser = user;
    currentUserName = userData.name || "Caretaker / Admin";
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = currentUserName;

    listenToAnnouncements();
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

// Modal controls
const openModal = (editId = "", title = "", message = "") => {
    editIdInput.value = editId;
    titleInput.value = title;
    messageInput.value = message;

    if (editId) {
        modalTitle.textContent = "Edit Announcement";
        submitBtn.innerHTML = `<i class="fa-solid fa-check"></i> Update`;
    } else {
        modalTitle.textContent = "New Announcement";
        submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Publish`;
    }

    modal.classList.add("active");
};

const closeModal = () => {
    modal.classList.remove("active");
    editIdInput.value = "";
    titleInput.value = "";
    messageInput.value = "";
};

newBtn.addEventListener("click", () => openModal());
closeBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
});

// Real-time announcements listener
const listenToAnnouncements = () => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-bullhorn"></i>
                    <div class="empty-title">No announcements yet</div>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">Click "New Announcement" to create one.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const ann = docSnap.data();
            const id = docSnap.id;

            const dateStr = ann.createdAt?.toDate
                ? ann.createdAt.toDate().toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit"
                })
                : "N/A";

            const author = ann.authorName || "Caretaker / Admin";
            const card = document.createElement("div");
            card.className = "white-card";
            card.innerHTML = `
                <div class="flex-between" style="margin-bottom: 0.75rem;">
                    <h3 style="font-size: 1.05rem; font-weight: 600; color: var(--text-dark);">
                        <i class="fa-solid fa-bullhorn" style="color: var(--primary-blue); margin-right: 0.5rem;"></i>
                        ${ann.title}
                    </h3>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-outline btn-sm edit-ann-btn" data-id="${id}" data-title="${ann.title}" data-message="${ann.message}">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm delete-ann-btn" data-id="${id}">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                <p style="color: var(--text-main); margin-bottom: 0.75rem; white-space: pre-wrap;">${ann.message}</p>
                <div style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                    <div><i class="fa-solid fa-user"></i> By: ${author}</div>
                    <div><i class="fa-regular fa-clock"></i> ${dateStr}</div>
                </div>
            `;
            container.appendChild(card);
        });

        // Edit handlers
        document.querySelectorAll(".edit-ann-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                openModal(btn.dataset.id, btn.dataset.title, btn.dataset.message);
            });
        });

        // Delete handlers
        document.querySelectorAll(".delete-ann-btn").forEach((btn) => {
            btn.addEventListener("click", () => deleteAnnouncement(btn.dataset.id));
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error listening to announcements:", error);
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><div class="empty-title">Error loading announcements</div></div>`;
    });
};

// Submit (Create or Update)
submitBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const message = messageInput.value.trim();
    const editId = editIdInput.value;

    if (!title || !message) {
        showToast("Please fill in all fields", "warning");
        return;
    }

    submitBtn.disabled = true;

    try {
        if (editId) {
            await updateDoc(doc(db, "announcements", editId), {
                title,
                message
            });
            showToast("Announcement updated!", "success");
        } else {
            await addDoc(collection(db, "announcements"), {
                title,
                message,
                authorName: currentUserName,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid
            });
            showToast("Announcement published!", "success");
        }
        closeModal();
    } catch (error) {
        console.error("Error saving announcement:", error);
        showToast("Failed to save announcement", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

// Delete Announcement
const deleteAnnouncement = async (annId) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
        await deleteDoc(doc(db, "announcements", annId));
        showToast("Announcement deleted", "success");
    } catch (error) {
        console.error("Error deleting announcement:", error);
        showToast("Failed to delete announcement", "error");
    }
};
