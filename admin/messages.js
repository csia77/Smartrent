// admin/messages.js
import { db } from "../js/firebase-config.js";
import { guardPage, setupLogout } from "../js/auth-guard.js";
import {
    collection,
    onSnapshot,
    orderBy,
    query
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM References
const container = document.getElementById("messages-container");

// Auth Guard
guardPage("admin", (user, userData) => {
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    listenToMessages();
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

// Listen to Anonymous Messages
const listenToMessages = () => {
    const q = query(collection(db, "anonymousMessages"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-envelope-open"></i>
                    <div class="empty-title">No messages yet</div>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">Anonymous messages from tenants will appear here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();

            const dateStr = msg.createdAt?.toDate
                ? msg.createdAt.toDate().toLocaleDateString("en-KE", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit"
                })
                : "N/A";

            const card = document.createElement("div");
            card.className = "white-card";
            card.innerHTML = `
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-blue-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fa-solid fa-envelope" style="color: var(--primary-blue); font-size: 1rem;"></i>
                    </div>
                    <div style="flex: 1;">
                        <p style="color: var(--text-main); margin-bottom: 0.5rem; white-space: pre-wrap;">${msg.message}</p>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            <i class="fa-regular fa-clock"></i> ${dateStr}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error listening to messages:", error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <div class="empty-title">Error loading messages</div>
            </div>
        `;
    });
};
