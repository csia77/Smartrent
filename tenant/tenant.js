// tenant.js - tenant dashboard logic

import { auth, db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    doc, getDoc, updateDoc, collection, addDoc, query, where,
    onSnapshot, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// State
let currentUserId = null;
let currentHouseId = null;

// Auth guard
guardPage("tenant", (user, userData) => {
    currentUserId = user.uid;
    currentHouseId = userData.houseId || null;

    const displayName = userData.name || user.email;
    document.getElementById("sidebar-username").textContent = displayName;
    document.getElementById("welcome-msg").textContent = `Welcome back, ${userData.name || "Tenant"}`;

    const avatarEl = document.getElementById("sidebar-avatar");
    if (avatarEl) {
        avatarEl.src = userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
    }

    loadApartmentDetails(userData);
    loadAnnouncements();
    loadPaymentHistory(user.uid);
    loadMaintenanceRequests(user.uid);

    // Load new interactive modules
    loadSystemSettings();
    loadServiceDirectory();
    setupProfileForm(userData);
    setupTenantAnnouncements(userData);
});

setupLogout();

// Load apartment details
async function loadApartmentDetails(userData) {
    const container = document.getElementById("house-details-container");
    const noHouseMsg = document.getElementById("no-house-msg");

    if (!userData.houseId) {
        noHouseMsg.style.display = "block";
        container.style.display = "none";
        return;
    }

    try {
        const houseSnap = await getDoc(doc(db, "houses", userData.houseId));

        if (houseSnap.exists()) {
            const house = houseSnap.data();

            document.getElementById("house-name").textContent = house.name || "-";
            document.getElementById("house-rent").textContent = `KES ${Number(house.rent || 0).toLocaleString()}`;

            const statusEl = document.getElementById("house-status");
            statusEl.textContent = house.status || "Occupied";
            statusEl.className = `badge ${getBadgeClass(house.status || "occupied")}`;

            container.style.display = "block";
            noHouseMsg.style.display = "none";
        } else {
            if (noHouseMsg.querySelector("p")) {
                noHouseMsg.querySelector("p").textContent = "Error: Your linked house no longer exists in the system.";
            }
            noHouseMsg.style.display = "block";
            container.style.display = "none";
        }
    } catch (error) {
        console.error("Error loading apartment details:", error);
        showToast("Failed to load apartment details.", "error");
    }
}

// Load announcements
function loadAnnouncements() {
    const listEl = document.getElementById("announcements-list");

    const q = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-bullhorn"></i>
                    <div class="empty-title">No Announcements</div>
                    <div class="empty-desc">There are no announcements from your landlord yet.</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const card = document.createElement("div");
            card.className = "white-card"; // updated class for standard polish styling
            
            const author = data.authorName || "Caretaker / Admin";
            
            card.innerHTML = `
                <div class="announcement-title" style="font-size: 1.05rem; font-weight: 600; color: var(--text-dark); margin-bottom: 0.5rem;">${escapeHtml(data.title || "Announcement")}</div>
                <div class="announcement-body" style="color: var(--text-main); margin-bottom: 0.75rem; white-space: pre-wrap;">${escapeHtml(data.message || "")}</div>
                <div class="announcement-meta" style="display: flex; gap: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                    <div><i class="fa-solid fa-user"></i> By: ${escapeHtml(author)}</div>
                    <div><i class="fa-regular fa-calendar"></i> ${formatDate(data.createdAt)}</div>
                </div>
            `;
            listEl.appendChild(card);
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading announcements:", error);
        listEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <div class="empty-title">Error Loading Announcements</div>
            </div>
        `;
    });
}

// Payment form submission with simulated M-Pesa processing
const paymentForm = document.getElementById("payment-form");
if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentHouseId) {
            showToast("You must be linked to a house first.", "warning");
            return;
        }

        const amountInput = document.getElementById("pay-amount");
        const refInput = document.getElementById("pay-ref");
        const amount = amountInput.value.trim();

        if (!amount || Number(amount) <= 0) {
            showToast("Enter a valid amount.", "warning");
            return;
        }

        const submitBtn = paymentForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Processing M-Pesa...';

        // Simulate M-Pesa processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate a mock transaction code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'QXJ';
        for (let i = 0; i < 7; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        refInput.value = code;

        try {
            await addDoc(collection(db, "payments"), {
                tenantId: currentUserId,
                houseId: currentHouseId,
                amount: Number(amount),
                refCode: code,
                status: "pending",
                date: serverTimestamp()
            });

            showToast("Payment submitted! Ref: " + code, "success");
            amountInput.value = "";
            refInput.value = "";
        } catch (error) {
            console.error('[tenant] payment error:', error);
            showToast("Payment failed. Try again.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right: 0.4rem;"></i>Pay via M-Pesa';
        }
    });
}

// Load payment history
function loadPaymentHistory(userId) {
    const listEl = document.getElementById("payment-list");

    const q = query(
        collection(db, "payments"),
        where("tenantId", "==", userId),
        orderBy("date", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">No payments recorded.</td>
                </tr>
            `;
            return;
        }

        listEl.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = document.createElement("tr");

            const statusClass = getBadgeClass(data.status || "pending");

            row.innerHTML = `
                <td>${formatDate(data.date)}</td>
                <td><code>${escapeHtml(data.refCode || "-")}</code></td>
                <td>KES ${Number(data.amount || 0).toLocaleString()}</td>
                <td><span class="badge ${statusClass}">${data.status || "pending"}</span></td>
            `;
            listEl.appendChild(row);
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading payment history:", error);
        listEl.innerHTML = `
            <tr class="empty-row">
                <td colspan="4">Error loading payment records.</td>
            </tr>
        `;
    });
}

// Submit maintenance request
const maintenanceForm = document.getElementById("maintenance-form");
if (maintenanceForm) {
    maintenanceForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentHouseId) {
            showToast("You must be linked to a house first.", "warning");
            return;
        }

        const issueInput = document.getElementById("maint-issue");
        const descInput = document.getElementById("maint-desc");

        const issue = issueInput.value.trim();
        const description = descInput.value.trim();

        if (!issue || !description) {
            showToast("Please fill in all fields.", "warning");
            return;
        }

        const submitBtn = maintenanceForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

        try {
            await addDoc(collection(db, "maintenanceRequests"), {
                tenantUid: currentUserId,
                houseId: currentHouseId,
                issue: issue,
                category: issue,
                description: description,
                status: "pending",
                createdAt: serverTimestamp()
            });

            showToast("Maintenance request submitted!", "success");
            maintenanceForm.reset();
        } catch (error) {
            console.error('[tenant] maintenance error:', error);
            showToast("Failed to submit request.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right: 0.4rem;"></i>Submit Request';
        }
    });
}

// Load maintenance requests
function loadMaintenanceRequests(userId) {
    const listEl = document.getElementById("maintenance-list");

    const q = query(
        collection(db, "maintenanceRequests"),
        where("tenantUid", "==", userId),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            listEl.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-wrench"></i>
                    <div class="empty-title">No Requests</div>
                    <div class="empty-desc">You haven't submitted any maintenance requests yet.</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const card = document.createElement("div");
            card.className = "white-card";
            card.style.borderLeft = "4px solid var(--primary-blue)";
            card.style.marginBottom = "1rem";

            const statusClass = getBadgeClass(data.status || "pending");

            card.innerHTML = `
                <div class="flex-between" style="margin-bottom: 0.5rem;">
                    <strong>${escapeHtml(data.issue || "Issue")}</strong>
                    <span class="badge ${statusClass}">${data.status || "pending"}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                    Category: ${escapeHtml(data.category || "General")}
                </div>
                <p style="font-size: 0.9rem; color: var(--text-main); margin-bottom: 0.5rem;">
                    ${escapeHtml(data.description || "")}
                </p>
                <div style="font-size: 0.75rem; color: var(--text-light);">
                    Submitted: ${formatDate(data.createdAt)}
                </div>
            `;
            listEl.appendChild(card);
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading maintenance requests:", error);
        listEl.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <div class="empty-title">Error Loading Requests</div>
            </div>
        `;
    });
}

// Load system billing settings (mpesa paybill)
async function loadSystemSettings() {
    try {
        const snap = await getDoc(doc(db, "settings", "system"));
        if (snap.exists()) {
            const data = snap.data();
            const paybillEl = document.getElementById("instruction-paybill");
            const accountEl = document.getElementById("instruction-account");
            if (paybillEl) paybillEl.textContent = data.mpesaPaybill || "247247";
            if (accountEl) accountEl.textContent = data.mpesaAccount || "NYUMBANI APARTMENTS";
        }
    } catch (e) {
        console.error("Error loading system settings on tenant dashboard:", e);
    }
}

// Load service providers directory
function loadServiceDirectory() {
    const tbody = document.getElementById("directory-table-body");
    if (!tbody) return;

    onSnapshot(collection(db, "serviceDirectory"), (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No vetted service providers registered.</td></tr>';
            return;
        }

        tbody.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const row = document.createElement("tr");

            row.innerHTML = `
                <td><strong>${escapeHtml(data.name)}</strong></td>
                <td><span class="badge badge-in-progress">${escapeHtml(data.service)}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <a href="tel:${data.phone}"><code>${escapeHtml(data.phone)}</code></a>
                        <button class="btn btn-outline btn-sm copy-phone-btn" data-phone="${escapeHtml(data.phone)}" title="Copy phone number" style="padding: 2px 6px; font-size: 0.75rem; border-color: var(--border-color); background: none; cursor: pointer;">
                            <i class="fa-solid fa-copy"></i>
                        </button>
                    </div>
                </td>
                <td>${escapeHtml(data.skills || "-")}</td>
                <td>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                        <span>${escapeHtml(data.referrals || "-")}</span>
                        <button class="btn btn-outline btn-sm copy-all-btn" data-name="${escapeHtml(data.name)}" data-service="${escapeHtml(data.service)}" data-phone="${escapeHtml(data.phone)}" data-skills="${escapeHtml(data.skills || "-")}" data-referrals="${escapeHtml(data.referrals || "-")}" title="Copy all details" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.25rem; cursor: pointer;">
                            <i class="fa-solid fa-clipboard"></i> Copy Details
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Attach copy event handlers
        tbody.querySelectorAll(".copy-phone-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const phone = btn.dataset.phone;
                navigator.clipboard.writeText(phone).then(() => {
                    showToast("Phone number copied to clipboard", "success");
                }).catch(() => {
                    showToast("Failed to copy phone number", "error");
                });
            });
        });

        tbody.querySelectorAll(".copy-all-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const { name, service, phone, skills, referrals } = btn.dataset;
                const text = `${name} - ${service} (Phone: ${phone}). Skills: ${skills}. Referrals: ${referrals}`;
                navigator.clipboard.writeText(text).then(() => {
                    showToast("Service provider details copied to clipboard", "success");
                }).catch(() => {
                    showToast("Failed to copy details", "error");
                });
            });
        });

        if (typeof window.filterPageContent === "function") {
            window.filterPageContent();
        }
    }, (error) => {
        console.error("Error loading service directory:", error);
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Error loading directory.</td></tr>';
    });
}

// Setup profile settings and password resets
function setupProfileForm(userData) {
    const profileForm = document.getElementById("tenant-profile-form");
    const nameInput = document.getElementById("tenant-profile-name");
    const phoneInput = document.getElementById("tenant-profile-phone");
    const resetBtn = document.getElementById("tenant-reset-pass-btn");

    const profilePreview = document.getElementById("profile-preview");
    const btnUploadPc = document.getElementById("btn-upload-pc");
    const btnUploadUrl = document.getElementById("btn-upload-url");
    const fileInput = document.getElementById("profile-file-input");
    const urlInput = document.getElementById("profile-url-input");

    let profilePictureBase64 = userData.profilePicture || null;

    if (nameInput) nameInput.value = userData.name || "";
    if (phoneInput) phoneInput.value = userData.phone || "";

    if (profilePreview) {
        profilePreview.src = userData.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "Tenant")}&background=random`;
    }

    if (btnUploadPc && fileInput) {
        btnUploadPc.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement("canvas");
                        const maxDim = 150;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                            if (width > maxDim) {
                                height *= maxDim / width;
                                width = maxDim;
                            }
                        } else {
                            if (height > maxDim) {
                                width *= maxDim / height;
                                height = maxDim;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const base64 = canvas.toDataURL("image/jpeg", 0.75);
                        profilePreview.src = base64;
                        profilePictureBase64 = base64;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnUploadUrl && urlInput) {
        btnUploadUrl.addEventListener("click", () => {
            urlInput.style.display = urlInput.style.display === "none" ? "block" : "none";
            if (urlInput.style.display === "block") urlInput.focus();
        });
        urlInput.addEventListener("input", (e) => {
            const url = e.target.value.trim();
            if (url) {
                profilePreview.src = url;
                profilePictureBase64 = url;
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();

            if (!name) {
                showToast("Name is required", "warning");
                return;
            }

            const saveBtn = document.getElementById("save-profile-btn");
            saveBtn.disabled = true;

            try {
                const payload = {
                    name,
                    phone,
                    updatedAt: serverTimestamp()
                };

                if (profilePictureBase64) {
                    payload.profilePicture = profilePictureBase64;
                }

                await updateDoc(doc(db, "users", currentUserId), payload);

                document.getElementById("sidebar-username").textContent = name;
                document.getElementById("welcome-msg").textContent = `Welcome back, ${name}`;

                const sidebarAvatar = document.getElementById("sidebar-avatar");
                if (sidebarAvatar && profilePictureBase64) {
                    sidebarAvatar.src = profilePictureBase64;
                }

                showToast("Profile updated successfully!", "success");
            } catch (error) {
                console.error("Error updating profile:", error);
                showToast("Failed to update profile", "error");
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user || !user.email) return;

            resetBtn.disabled = true;
            try {
                await sendPasswordResetEmail(auth, user.email);
                showToast("Password reset link sent to your email!", "success");
            } catch (error) {
                console.error("Error sending reset link:", error);
                showToast("Failed to send reset link", "error");
            } finally {
                resetBtn.disabled = false;
            }
        });
    }
}

// Setup Tenant Announcements (Bulletin Board notice modal)
function setupTenantAnnouncements(userData) {
    const newBtn = document.getElementById("new-tenant-ann-btn");
    const modal = document.getElementById("tenant-ann-modal");
    const closeBtn = document.getElementById("close-tenant-ann-modal");
    const cancelBtn = document.getElementById("cancel-tenant-ann-modal");
    const submitBtn = document.getElementById("tenant-ann-submit-btn");

    const titleInput = document.getElementById("tenant-ann-title");
    const messageInput = document.getElementById("tenant-ann-message");
    const anonymousCheck = document.getElementById("tenant-ann-anonymous");

    if (!newBtn || !modal) return;

    newBtn.addEventListener("click", () => {
        titleInput.value = "";
        messageInput.value = "";
        anonymousCheck.checked = false;
        modal.classList.add("active");
    });

    const closeModal = () => {
        modal.classList.remove("active");
    };

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    submitBtn.addEventListener("click", async () => {
        const title = titleInput.value.trim();
        const message = messageInput.value.trim();
        const anonymous = anonymousCheck.checked;

        if (!title || !message) {
            showToast("Please enter a title and message", "warning");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Posting...';

        try {
            const author = anonymous ? "Anonymous Tenant" : (userData.name || "Tenant");
            await addDoc(collection(db, "announcements"), {
                title,
                message,
                authorName: author,
                createdBy: currentUserId,
                anonymous: anonymous,
                createdAt: serverTimestamp()
            });

            showToast("Notice posted successfully!", "success");
            closeModal();
        } catch (error) {
            console.error("Error posting notice:", error);
            showToast("Failed to post notice. Try again.", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Post Notice';
        }
    });
}

// Mobile sidebar toggle
const sidebarToggle = document.querySelector(".sidebar-toggle");
if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
        document.querySelector(".sidebar").classList.toggle("open");
    });
}

// Close sidebar when a menu item is clicked (mobile UX)
document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            document.querySelector(".sidebar").classList.remove("open");
        }
    });
});

// Helper functions

function getBadgeClass(status) {
    const map = {
        "pending": "badge-pending",
        "approved": "badge-approved",
        "paid": "badge-paid",
        "rejected": "badge-rejected",
        "in-progress": "badge-in-progress",
        "resolved": "badge-resolved",
        "occupied": "badge-occupied",
        "vacant": "badge-vacant"
    };
    return map[(status || "").toLowerCase()] || "badge-pending";
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}