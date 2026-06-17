// functions/index.js
// Firebase Cloud Functions for Nyumbani Rental Management

const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Email transport
// Credentials are set via Firebase Functions config:
//   firebase functions:config:set email.user="you@gmail.com" email.pass="app-password"
// ---------------------------------------------------------------------------
function createTransport() {
    const config = functions.config().email || {};
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.user || "",
            pass: config.pass || "",
        },
    });
}

async function sendMail({ to, subject, html }) {
    if (!to) return;
    const transport = createTransport();
    await transport.sendMail({
        from: `"Nyumbani Rental" <${functions.config().email?.user || "noreply@nyumbani.app"}>`,
        to,
        subject,
        html,
    });
}

// ---------------------------------------------------------------------------
// Helper: fetch a user document from Firestore
// ---------------------------------------------------------------------------
async function getUser(uid) {
    const snap = await db.collection("users").doc(uid).get();
    return snap.exists ? snap.data() : null;
}

// ---------------------------------------------------------------------------
// FUNCTION 1: setAdminClaim
// Callable function. Call once per admin user to write the custom claim.
// The caller must already have the admin role in their Firestore document.
// ---------------------------------------------------------------------------
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
    }

    const uid  = context.auth.uid;
    const user = await getUser(uid);

    if (!user || user.role !== "admin") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Only users with the admin role can set their own claim."
        );
    }

    await admin.auth().setCustomUserClaims(uid, { role: "admin" });

    return { success: true, message: "Admin claim set. Please sign out and sign back in." };
});

// ---------------------------------------------------------------------------
// FUNCTION 2: onPaymentStatusChange
// Fires when a payment document is updated.
// Sends an email to the tenant when status changes to approved or rejected.
// ---------------------------------------------------------------------------
exports.onPaymentStatusChange = functions.firestore
    .document("payments/{paymentId}")
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after  = change.after.data();

        // Only act when the status field actually changed
        if (before.status === after.status) return null;

        const newStatus = after.status;
        if (newStatus !== "approved" && newStatus !== "rejected") return null;

        const tenant = await getUser(after.tenantId);
        if (!tenant || !tenant.email) return null;

        const amount  = Number(after.amount || 0).toLocaleString("en-KE");
        const refCode = after.refCode || "N/A";

        let subject, html;

        if (newStatus === "approved") {
            subject = "Payment Approved - Nyumbani";
            html = `
                <p>Hi ${tenant.name || "Tenant"},</p>
                <p>Your payment of <strong>KES ${amount}</strong>
                   (Reference: <code>${refCode}</code>) has been
                   <strong style="color:#10b981;">approved</strong>.</p>
                <p>Your balance has been updated accordingly.</p>
                <p>Thank you,<br>Nyumbani Management</p>
            `;
        } else {
            subject = "Payment Not Verified - Nyumbani";
            html = `
                <p>Hi ${tenant.name || "Tenant"},</p>
                <p>Your payment of <strong>KES ${amount}</strong>
                   (Reference: <code>${refCode}</code>) could
                   <strong style="color:#ef4444;">not be verified</strong>.</p>
                <p>Please contact the admin to resolve this.</p>
                <p>Thank you,<br>Nyumbani Management</p>
            `;
        }

        try {
            await sendMail({ to: tenant.email, subject, html });
        } catch (err) {
            console.error("Failed to send payment status email:", err.message);
        }

        return null;
    });

// ---------------------------------------------------------------------------
// FUNCTION 3: onMaintenanceUpdated
// Fires when a maintenance request is updated.
// Notifies the tenant when the status changes.
// ---------------------------------------------------------------------------
exports.onMaintenanceUpdated = functions.firestore
    .document("maintenanceRequests/{requestId}")
    .onUpdate(async (change) => {
        const before = change.before.data();
        const after  = change.after.data();

        if (before.status === after.status) return null;

        const tenant = await getUser(after.tenantUid);
        if (!tenant || !tenant.email) return null;

        const statusLabel = {
            "in-progress": "In Progress",
            "resolved":    "Resolved",
            "pending":     "Pending",
        }[after.status] || after.status;

        const subject = `Maintenance Update: ${after.category || "Request"} - Nyumbani`;
        const html = `
            <p>Hi ${tenant.name || "Tenant"},</p>
            <p>Your maintenance request
               <strong>${after.description || ""}</strong>
               has been updated to
               <strong>${statusLabel}</strong>.</p>
            <p>Log in to your dashboard to view the details.</p>
            <p>Thank you,<br>Nyumbani Management</p>
        `;

        try {
            await sendMail({ to: tenant.email, subject, html });
        } catch (err) {
            console.error("Failed to send maintenance update email:", err.message);
        }

        return null;
    });

// ---------------------------------------------------------------------------
// FUNCTION 4: onNewTenantCreated
// Fires when a new user document is created with role = "tenant".
// Sends a welcome email with login instructions.
// ---------------------------------------------------------------------------
exports.onNewTenantCreated = functions.firestore
    .document("users/{userId}")
    .onCreate(async (snap) => {
        const data = snap.data();
        if (data.role !== "tenant") return null;
        if (!data.email) return null;

        const subject = "Welcome to Nyumbani - Your Account is Ready";
        const html = `
            <p>Hi ${data.name || "there"},</p>
            <p>Your tenant account has been created on Nyumbani Rental Management.</p>
            <ul>
                <li><strong>Email:</strong> ${data.email}</li>
                <li><strong>Login:</strong> <a href="https://smart-rent-5fe3d.web.app">smart-rent-5fe3d.web.app</a></li>
            </ul>
            <p>Use the password provided by your admin to sign in.
               You can change it from your dashboard settings.</p>
            <p>Welcome,<br>Nyumbani Management</p>
        `;

        try {
            await sendMail({ to: data.email, subject, html });
        } catch (err) {
            console.error("Failed to send welcome email:", err.message);
        }

        return null;
    });
