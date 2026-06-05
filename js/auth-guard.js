import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Protects a page by checking auth state and role.
export function guardPage(requiredRole, onReady) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Not logged in -> go to login page
            console.log("Auth Guard: No user found. Redirecting to login.");
            window.location.href = getLoginPath();
            return;
        }

        try {
            // Fetch the user's profile from Firestore
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                console.error("Auth Guard: User profile missing in Firestore.");
                await signOut(auth);
                window.location.href = getLoginPath();
                return;
            }

            const userData = userSnap.data();

            // Check if user has the required role
            if (userData.role !== requiredRole) {
                console.warn(`Auth Guard: User role is '${userData.role}', but '${requiredRole}' is required.`);
                // Redirect to their correct dashboard
                if (userData.role === "admin") {
                    window.location.href = getAdminDashPath();
                } else if (userData.role === "tenant") {
                    window.location.href = getTenantDashPath();
                } else {
                    // Unknown role -> sign out
                    await signOut(auth);
                    window.location.href = getLoginPath();
                }
                return;
            }

            // All good! Call the onReady callback
            console.log(`Auth Guard: ${userData.role} authorized - ${user.email}`);

            const sidebarName = document.getElementById("sidebar-username");
            if (sidebarName) {
                sidebarName.textContent = userData.name || (userData.role === "admin" ? "Admin" : "Tenant");
            }
            const sidebarAvatar = document.getElementById("sidebar-avatar");
            if (sidebarAvatar) {
                if (userData.profilePicture) {
                    sidebarAvatar.src = userData.profilePicture;
                } else {
                    const avatarName = userData.name || user.email || (userData.role === "admin" ? "Admin" : "Tenant");
                    sidebarAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random`;
                }
            }

            // Add visual pointer cursor to logo header
            const sidebarHeader = document.querySelector(".sidebar-header");
            if (sidebarHeader) {
                sidebarHeader.style.cursor = "pointer";
                sidebarHeader.title = "Click to view property photo catalogue";
            }

            if (userData.role === "admin") {
                setupAdminBadges();
            }
            setupSearchFilter();
            loadSidebarBrandName();
            onReady(user, userData);

        } catch (error) {
            console.error("Auth Guard: Error checking user role:", error);
            showToast("Authentication error. Please log in again.", "error");
            await signOut(auth);
            window.location.href = getLoginPath();
        }
    });
}

async function loadSidebarBrandName() {
    try {
        const logoEl = document.getElementById("logo-text");
        const settingsSnap = await getDoc(doc(db, "settings", "system"));
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            if (logoEl && data.propertyName) {
                logoEl.textContent = data.propertyName.toUpperCase();
            }
            if (data.themeColor) {
                applyThemeColor(data.themeColor);
            }
        }
    } catch (error) {
        console.error("Auth Guard: Error loading system settings in guard:", error);
    }
}

function applyThemeColor(theme) {
    const root = document.documentElement;
    const colors = {
        blue: { primary: "#4361ee", hover: "#3a56d4", light: "rgba(67, 97, 238, 0.1)" },
        teal: { primary: "#14b8a6", hover: "#0f9f90", light: "rgba(20, 184, 166, 0.1)" },
        terracotta: { primary: "#e76f51", hover: "#d95f43", light: "rgba(231, 111, 81, 0.1)" },
        indigo: { primary: "#6366f1", hover: "#4f46e5", light: "rgba(99, 102, 241, 0.1)" },
        green: { primary: "#10b981", hover: "#059669", light: "rgba(16, 185, 129, 0.1)" }
    };
    const selected = colors[theme] || colors.blue;
    root.style.setProperty("--primary-blue", selected.primary);
    root.style.setProperty("--primary-blue-hover", selected.hover);
    root.style.setProperty("--primary-blue-light", selected.light);
}

// Sets up the logout button. Call this on every dashboard page.
export function setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.href = getLoginPath();
            } catch (error) {
                console.error("Logout error:", error);
                showToast("Logout failed. Please try again.", "error");
            }
        });
    }
}

// Toast notifications
// Shows a brief popup message at the top-right corner.

export function showToast(message, type = "info", duration = 4000) {
    // Create the container if it doesn't exist yet
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    // Pick an icon based on type
    const icons = {
        success: "fa-circle-check",
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info}"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    // Close button
    toast.querySelector(".toast-close").addEventListener("click", () => {
        toast.remove();
    });

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Path helpers
// Figures out the correct relative paths depending on which
// folder we're currently in (root, admin/, or tenant/).

function getCurrentDepth() {
    const path = window.location.pathname;
    if (path.includes("/admin/") || path.includes("/tenant/")) {
        return "subfolder";
    }
    return "root";
}

function getLoginPath() {
    return getCurrentDepth() === "subfolder" ? "../index.html" : "index.html";
}

function getAdminDashPath() {
    return getCurrentDepth() === "subfolder" ? "../admin/dashboard.html" : "admin/dashboard.html";
}

function getTenantDashPath() {
    return getCurrentDepth() === "subfolder" ? "../tenant/dashboard.html" : "tenant/dashboard.html";
}

function setupAdminBadges() {
    // 1. Pending Payments
    const payQuery = query(collection(db, "payments"), where("status", "==", "pending"));
    onSnapshot(payQuery, (snapshot) => {
        const count = snapshot.size;
        const el = document.getElementById("badge-payments");
        if (el) {
            el.textContent = count;
            el.style.display = count > 0 ? "inline-flex" : "none";
        }
    }, (error) => {
        console.error("Error updating payment badge:", error);
    });

    // 2. Pending Maintenance
    const maintQuery = query(collection(db, "maintenanceRequests"), where("status", "==", "pending"));
    onSnapshot(maintQuery, (snapshot) => {
        const count = snapshot.size;
        const el = document.getElementById("badge-maintenance");
        if (el) {
            el.textContent = count;
            el.style.display = count > 0 ? "inline-flex" : "none";
        }
    }, (error) => {
        console.error("Error updating maintenance badge:", error);
    });

    // 3. Anonymous Messages (total count)
    const msgQuery = collection(db, "anonymousMessages");
    onSnapshot(msgQuery, (snapshot) => {
        const count = snapshot.size;
        const el = document.getElementById("badge-messages");
        if (el) {
            el.textContent = count;
            el.style.display = count > 0 ? "inline-flex" : "none";
        }
    }, (error) => {
        console.error("Error updating messages badge:", error);
    });
}

function setupSearchFilter() {
    const searchInput = document.querySelector(".search-bar input");
    if (!searchInput) return;

    window.filterPageContent = function() {
        const query = (searchInput.value || "").toLowerCase().trim();

        // Filter table rows
        const rows = document.querySelectorAll(".data-table tbody tr:not(.empty-row)");
        rows.forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(query) ? "" : "none";
        });

        // Filter announcement cards
        const cards = document.querySelectorAll("#announcements-container .white-card");
        cards.forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(query) ? "" : "none";
        });

        // Filter message cards
        const msgCards = document.querySelectorAll("#messages-container .white-card");
        msgCards.forEach(card => {
            card.style.display = card.textContent.toLowerCase().includes(query) ? "" : "none";
        });
    };

    searchInput.addEventListener("input", window.filterPageContent);
}

// --- PROPERTY PHOTO CATALOGUE (GALLERY MODAL) ---
let cataloguePhotos = [];
let currentCatalogueIndex = 0;

function injectCatalogueModal() {
    if (document.getElementById("catalogue-modal")) return;

    const modalHtml = `
    <div class="modal-overlay" id="catalogue-modal" style="z-index: 10000;">
        <div class="modal" style="max-width: 600px; width: 90%;">
            <div class="modal-header">
                <h3><i class="fa-solid fa-images" style="color: var(--primary-blue); margin-right: 0.5rem;"></i>Property Gallery</h3>
                <button class="modal-close" id="close-catalogue-modal">&times;</button>
            </div>
            <div class="modal-body" style="padding: 1.5rem; text-align: center;">
                <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <div style="width: 100%; min-height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color);">
                        <img id="catalogue-img" src="" style="max-width: 100%; max-height: 300px; object-fit: contain; display: none;">
                        <div id="catalogue-empty" style="color: var(--text-muted);"><i class="fa-solid fa-images" style="font-size: 3rem; display: block; margin-bottom: 0.5rem;"></i>No photos in catalogue.</div>
                    </div>
                    <div id="catalogue-caption" style="font-weight: 600; color: var(--text-dark); font-size: 1.1rem; min-height: 1.6rem;"></div>
                    
                    <div style="display: flex; gap: 1rem; align-items: center; margin-top: 0.5rem;">
                        <button class="btn btn-outline btn-sm" id="btn-catalogue-prev" style="padding: 0.4rem 0.8rem;"><i class="fa-solid fa-chevron-left"></i> Prev</button>
                        <span id="catalogue-index-indicator" style="font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">0 / 0</span>
                        <button class="btn btn-outline btn-sm" id="btn-catalogue-next" style="padding: 0.4rem 0.8rem;">Next <i class="fa-solid fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    setupCatalogueModalListeners();
}

function setupCatalogueModalListeners() {
    const modal = document.getElementById("catalogue-modal");
    const closeBtn = document.getElementById("close-catalogue-modal");
    const prevBtn = document.getElementById("btn-catalogue-prev");
    const nextBtn = document.getElementById("btn-catalogue-next");

    if (closeBtn) {
        closeBtn.addEventListener("click", () => modal.classList.remove("active"));
    }
    
    modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("active");
    });

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (cataloguePhotos.length === 0) return;
            currentCatalogueIndex = (currentCatalogueIndex - 1 + cataloguePhotos.length) % cataloguePhotos.length;
            showCataloguePhoto(currentCatalogueIndex);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (cataloguePhotos.length === 0) return;
            currentCatalogueIndex = (currentCatalogueIndex + 1) % cataloguePhotos.length;
            showCataloguePhoto(currentCatalogueIndex);
        });
    }
}

function showCataloguePhoto(index) {
    const imgEl = document.getElementById("catalogue-img");
    const captionEl = document.getElementById("catalogue-caption");
    const indicatorEl = document.getElementById("catalogue-index-indicator");
    const emptyEl = document.getElementById("catalogue-empty");

    if (cataloguePhotos.length === 0) {
        if (imgEl) imgEl.style.display = "none";
        if (emptyEl) emptyEl.style.display = "block";
        if (captionEl) captionEl.textContent = "";
        if (indicatorEl) indicatorEl.textContent = "0 / 0";
        return;
    }

    if (emptyEl) emptyEl.style.display = "none";
    if (imgEl) {
        imgEl.src = cataloguePhotos[index].url;
        imgEl.style.display = "block";
    }
    if (captionEl) {
        captionEl.textContent = cataloguePhotos[index].title || "Property Photo";
    }
    if (indicatorEl) {
        indicatorEl.textContent = `${index + 1} / ${cataloguePhotos.length}`;
    }
}

async function openCatalogue() {
    injectCatalogueModal();
    const modal = document.getElementById("catalogue-modal");
    if (!modal) return;
    
    modal.classList.add("active");
    
    try {
        const querySnapshot = await getDocs(collection(db, "propertyGallery"));
        cataloguePhotos = [];
        querySnapshot.forEach((doc) => {
            cataloguePhotos.push(doc.data());
        });
        currentCatalogueIndex = 0;
        showCataloguePhoto(currentCatalogueIndex);
    } catch (e) {
        console.error("Error loading catalogue photos:", e);
        showToast("Error loading photo catalogue", "error");
    }
}

// Global delegated event listener to open property catalogue on sidebar logo/header click
document.addEventListener("click", (e) => {
    const header = e.target.closest(".sidebar-header");
    if (header) {
        e.preventDefault();
        openCatalogue();
    }
});

// --- MOBILE SIDEBAR RESPONSIVE & BACKDROP OVERLAY ---
function injectSidebarBackdrop() {
    if (document.getElementById("sidebar-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.id = "sidebar-backdrop";
    backdrop.className = "sidebar-backdrop";
    document.body.appendChild(backdrop);
}

// Automatically label table columns for card-based display on mobile viewports
function autoLabelTables() {
    const tables = document.querySelectorAll(".data-table");
    tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll("thead th")).map(th => th.textContent.trim());
        const rows = table.querySelectorAll("tbody tr");
        rows.forEach((row) => {
            const cells = row.querySelectorAll("td");
            cells.forEach((cell, index) => {
                if (headers[index]) {
                    cell.setAttribute("data-label", headers[index]);
                }
            });
        });
    });
}

// Centralized observer to label dynamic table contents automatically
function setupTableAutoLabelObserver() {
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
        }
        if (shouldProcess) {
            autoLabelTables();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    autoLabelTables();
}

function initMobileResponsive() {
    injectSidebarBackdrop();
    setupTableAutoLabelObserver();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileResponsive);
} else {
    initMobileResponsive();
}

// Capture-phase listener to override page-level toggle listeners and handle backdrop transitions
document.addEventListener("click", (e) => {
    const toggle = e.target.closest(".sidebar-toggle");
    if (toggle) {
        e.stopImmediatePropagation();
        e.preventDefault();
        
        const sidebar = document.querySelector(".sidebar");
        const backdrop = document.getElementById("sidebar-backdrop");
        if (sidebar) {
            sidebar.classList.toggle("open");
            if (backdrop) {
                backdrop.classList.toggle("active");
            }
        }
        return;
    }

    const backdrop = e.target.closest("#sidebar-backdrop");
    if (backdrop) {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar) {
            sidebar.classList.remove("open");
        }
        backdrop.classList.remove("active");
        return;
    }
}, true); // True for Capture phase
