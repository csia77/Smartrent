// admin/settings.js
import { auth, db } from "../js/firebase-config.js";
import { guardPage, setupLogout, showToast } from "../js/auth-guard.js";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    collection,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM References
const profileForm = document.getElementById("profile-form");
const nameInput = document.getElementById("admin-name");
const phoneInput = document.getElementById("admin-phone");
const resetPassBtn = document.getElementById("reset-password-btn");

const propNameInput = document.getElementById("prop-name");
const propCurrencyInput = document.getElementById("prop-currency");
const propDueDateInput = document.getElementById("prop-due-date");
const propLateFeeInput = document.getElementById("prop-late-fee");

const mpesaPaybillInput = document.getElementById("mpesa-paybill");
const mpesaAccountInput = document.getElementById("mpesa-account");
const saveSystemBtn = document.getElementById("save-system-btn");

// Image Upload DOM References
const profilePreview = document.getElementById("profile-preview");
const btnUploadPc = document.getElementById("btn-upload-pc");
const btnUploadUrl = document.getElementById("btn-upload-url");
const fileInput = document.getElementById("profile-file-input");
const urlInput = document.getElementById("profile-url-input");

let currentAdminId = null;
let profilePictureBase64 = null;

// Auth Guard
guardPage("admin", async (user, userData) => {
    currentAdminId = user.uid;
    const sidebarName = document.getElementById("sidebar-username");
    if (sidebarName) sidebarName.textContent = userData.name || "Admin";

    // Pre-fill profile fields
    nameInput.value = userData.name || "";
    phoneInput.value = userData.phone || "";

    if (userData.profilePicture) {
        profilePreview.src = userData.profilePicture;
        profilePictureBase64 = userData.profilePicture;
    } else {
        profilePreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "Admin")}&background=4361ee&color=fff`;
    }

    // Load System & Billing Settings
    await loadSystemSettings();
    listenToGallery();
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

// Image Uploader Handlers
if (btnUploadPc && fileInput) {
    btnUploadPc.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
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

function handleImageFile(file) {
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

// Load settings from Firestore
const loadSystemSettings = async () => {
    try {
        const settingsSnap = await getDoc(doc(db, "settings", "system"));
        if (settingsSnap.exists()) {
            const data = settingsSnap.data();
            propNameInput.value = data.propertyName || "";
            propCurrencyInput.value = data.currency || "";
            propDueDateInput.value = data.dueDate || "";
            propLateFeeInput.value = data.lateFee || "";
            
            document.getElementById("prop-garbage-fee").value = data.garbageFee || 0;
            document.getElementById("prop-security-fee").value = data.securityFee || 0;
            document.getElementById("prop-water-rate").value = data.waterRate || 0;
            document.getElementById("prop-grace-period").value = data.gracePeriod || 0;
            document.getElementById("prop-allow-partial").checked = !!data.allowPartial;
            document.getElementById("prop-theme-color").value = data.themeColor || "blue";

            mpesaPaybillInput.value = data.mpesaPaybill || "";
            mpesaAccountInput.value = data.mpesaAccount || "";

            updateSidebarLogo(data.propertyName);
        } else {
            propNameInput.value = "Nyumbani";
            propCurrencyInput.value = "KES";
            propDueDateInput.value = 5;
            propLateFeeInput.value = 0;
            
            document.getElementById("prop-garbage-fee").value = 500;
            document.getElementById("prop-security-fee").value = 1000;
            document.getElementById("prop-water-rate").value = 150;
            document.getElementById("prop-grace-period").value = 3;
            document.getElementById("prop-allow-partial").checked = true;
            document.getElementById("prop-theme-color").value = "blue";

            mpesaPaybillInput.value = "247247";
            mpesaAccountInput.value = "NYUMBANI APARTMENTS";
        }
    } catch (error) {
        console.error("Error loading system settings:", error);
        showToast("Error loading system configurations", "error");
    }
};

const updateSidebarLogo = (name) => {
    const logoEl = document.getElementById("logo-text");
    if (logoEl && name) {
        logoEl.textContent = name.toUpperCase();
    }
};

// Profile settings save
profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
        showToast("Full name is required", "warning");
        return;
    }

    const submitBtn = document.getElementById("save-profile-btn");
    submitBtn.disabled = true;

    try {
        const updatePayload = {
            name: name,
            phone: phone,
            updatedAt: serverTimestamp()
        };

        if (profilePictureBase64) {
            updatePayload.profilePicture = profilePictureBase64;
        }

        await updateDoc(doc(db, "users", currentAdminId), updatePayload);

        // Update sidebar label & image
        const sidebarName = document.getElementById("sidebar-username");
        if (sidebarName) sidebarName.textContent = name;

        const sidebarAvatar = document.getElementById("sidebar-avatar");
        if (sidebarAvatar && profilePictureBase64) {
            sidebarAvatar.src = profilePictureBase64;
        }

        showToast("Profile settings saved successfully", "success");
    } catch (error) {
        console.error("Error updating admin profile:", error);
        showToast("Failed to save profile", "error");
    } finally {
        submitBtn.disabled = false;
    }
});

// System Settings & M-Pesa save
const systemSettingsForm = document.getElementById("system-settings-form");
if (systemSettingsForm) {
    systemSettingsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const propName = propNameInput.value.trim();
        const currency = propCurrencyInput.value.trim();
        const dueDate = propDueDateInput.value.trim();
        const lateFee = propLateFeeInput.value.trim();
        const garbageFee = document.getElementById("prop-garbage-fee").value.trim();
        const securityFee = document.getElementById("prop-security-fee").value.trim();
        const waterRate = document.getElementById("prop-water-rate").value.trim();
        const gracePeriod = document.getElementById("prop-grace-period").value.trim();
        const allowPartial = document.getElementById("prop-allow-partial").checked;
        const themeColor = document.getElementById("prop-theme-color").value;

        const mpesaPaybill = mpesaPaybillInput.value.trim();
        const mpesaAccount = mpesaAccountInput.value.trim();

        saveSystemBtn.disabled = true;
        saveSystemBtn.innerHTML = '<span class="spinner"></span> Saving settings...';

        try {
            const payload = {
                propertyName: propName,
                currency: currency,
                dueDate: Number(dueDate),
                lateFee: Number(lateFee),
                garbageFee: Number(garbageFee || 0),
                securityFee: Number(securityFee || 0),
                waterRate: Number(waterRate || 0),
                gracePeriod: Number(gracePeriod || 0),
                allowPartial: allowPartial,
                themeColor: themeColor,
                mpesaPaybill: mpesaPaybill,
                mpesaAccount: mpesaAccount,
                updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, "settings", "system"), payload);
            showToast("Settings updated successfully", "success");
            updateSidebarLogo(propName);

            // Apply theme dynamically
            const root = document.documentElement;
            const colors = {
                blue: { primary: "#4361ee", hover: "#3a56d4", light: "rgba(67, 97, 238, 0.1)" },
                teal: { primary: "#14b8a6", hover: "#0f9f90", light: "rgba(20, 184, 166, 0.1)" },
                terracotta: { primary: "#e76f51", hover: "#d95f43", light: "rgba(231, 111, 81, 0.1)" },
                indigo: { primary: "#6366f1", hover: "#4f46e5", light: "rgba(99, 102, 241, 0.1)" },
                green: { primary: "#10b981", hover: "#059669", light: "rgba(16, 185, 129, 0.1)" }
            };
            const selected = colors[themeColor] || colors.blue;
            root.style.setProperty("--primary-blue", selected.primary);
            root.style.setProperty("--primary-blue-hover", selected.hover);
            root.style.setProperty("--primary-blue-light", selected.light);

        } catch (error) {
            console.error("Error saving system settings:", error);
            showToast("Failed to update system settings", "error");
        } finally {
            saveSystemBtn.disabled = false;
            saveSystemBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save System & Billing Settings';
        }
    });
}

// Password reset triggers
resetPassBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
        showToast("No active session found", "error");
        return;
    }

    resetPassBtn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, user.email);
        showToast("Password reset link sent to: " + user.email, "success");
    } catch (error) {
        console.error("Settings password reset error:", error);
        showToast("Failed to send reset link", "error");
    } finally {
        resetPassBtn.disabled = false;
    }
});

// --- Property Gallery Catalogue Logic ---
let galleryPhotoBase64 = null;

const galleryForm = document.getElementById("gallery-form");
const galleryPreview = document.getElementById("gallery-preview");
const galleryPlaceholder = document.getElementById("gallery-placeholder");
const btnGalleryPc = document.getElementById("btn-gallery-pc");
const btnGalleryUrl = document.getElementById("btn-gallery-url");
const galleryFileInput = document.getElementById("gallery-file-input");
const galleryUrlInput = document.getElementById("gallery-url-input");
const galleryTitleInput = document.getElementById("gallery-photo-title");
const adminGalleryList = document.getElementById("admin-gallery-list");

// Bind PC upload
if (btnGalleryPc && galleryFileInput) {
    btnGalleryPc.addEventListener("click", () => galleryFileInput.click());
    galleryFileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement("canvas");
                    const maxDim = 400; // larger dimension for catalogue view
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
                    
                    const base64 = canvas.toDataURL("image/jpeg", 0.8);
                    galleryPreview.src = base64;
                    galleryPreview.style.display = "block";
                    galleryPlaceholder.style.display = "none";
                    galleryPhotoBase64 = base64;
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// Bind URL upload
if (btnGalleryUrl && galleryUrlInput) {
    btnGalleryUrl.addEventListener("click", () => {
        galleryUrlInput.style.display = galleryUrlInput.style.display === "none" ? "block" : "none";
        if (galleryUrlInput.style.display === "block") galleryUrlInput.focus();
    });
    galleryUrlInput.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        if (url) {
            galleryPreview.src = url;
            galleryPreview.style.display = "block";
            galleryPlaceholder.style.display = "none";
            galleryPhotoBase64 = url;
        }
    });
}

// Save Gallery Item
if (galleryForm) {
    galleryForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = galleryTitleInput.value.trim();
        if (!galleryPhotoBase64) {
            showToast("Please upload a photo from PC or paste a web link first", "warning");
            return;
        }

        const submitBtn = document.getElementById("save-gallery-btn");
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Adding...';

        try {
            await addDoc(collection(db, "propertyGallery"), {
                title: title,
                url: galleryPhotoBase64,
                createdAt: serverTimestamp()
            });

            showToast("Photo added to property catalogue!", "success");
            
            // Reset form
            galleryForm.reset();
            galleryPreview.src = "";
            galleryPreview.style.display = "none";
            galleryPlaceholder.style.display = "block";
            galleryUrlInput.style.display = "none";
            galleryPhotoBase64 = null;
        } catch (error) {
            console.error("Error saving gallery photo:", error);
            showToast("Failed to add photo to catalogue", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add to Catalogue';
        }
    });
}

// Load Gallery items for Admin list
function listenToGallery() {
    if (!adminGalleryList) return;
    onSnapshot(collection(db, "propertyGallery"), (snapshot) => {
        adminGalleryList.innerHTML = "";
        if (snapshot.empty) {
            adminGalleryList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">No photos uploaded.</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            const item = document.createElement("div");
            item.style.cssText = "position: relative; border-radius: 4px; overflow: hidden; border: 1px solid var(--border-color); aspect-ratio: 1; display: flex; align-items: center; justify-content: center;";
            item.innerHTML = `
                <img src="${data.url}" style="width: 100%; height: 100%; object-fit: cover;">
                <button class="btn-delete-photo" data-id="${id}" style="position: absolute; top: 4px; right: 4px; background: rgba(239, 68, 68, 0.85); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 0.7rem; cursor: pointer; display: flex; align-items: center; justify-content: center;" title="Delete photo">&times;</button>
            `;
            adminGalleryList.appendChild(item);
        });

        // Bind delete buttons
        adminGalleryList.querySelectorAll(".btn-delete-photo").forEach((btn) => {
            btn.addEventListener("click", async () => {
                if (!confirm("Remove this photo from the catalogue?")) return;
                try {
                    await deleteDoc(doc(db, "propertyGallery", btn.dataset.id));
                    showToast("Photo deleted from catalogue", "success");
                } catch (e) {
                    console.error("Error deleting photo:", e);
                    showToast("Failed to delete photo", "error");
                }
            });
        });
    });
}
