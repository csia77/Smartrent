# Nyumbani Rental Management System

Nyumbani is a modern web-based rental management portal designed to streamline communications, payments, and maintenance between property admins (landlords) and tenants. It is built as a modular application using vanilla HTML, CSS, JavaScript, and Firebase services.

## Core Features

### For Admins
* **Dashboard Overview:** Monitor total property revenue, active occupancy rate, pending maintenance requests, and unpaid balances.
* **Property Catalogue Manager:** Add, preview, and remove property showcase photos with optional captions (supporting local image compression via canvas or web URLs).
* **House & Tenant Management:** Add new houses, generate unique entry codes, and manage tenant details, roles, and balances.
* **Payment Approvals:** Track and verify rental payments submitted by tenants.
* **Announcements Board:** Post property bulletins and view announcements.
* **Maintenance & Repair Tracking:** Track maintenance tasks requested by tenants.
* **Anonymous Message Inbox:** Read private feedback sent by tenants.
* **Service Directory:** Maintain a database of vetted local tradespeople (plumbers, electricians, etc.).

### For Tenants
* **Personalized Dashboard:** View current monthly rent, total outstanding balance, and billing breakdowns (garbage fee, security charge, water rate).
* **Payment Submissions:** Log rent payments with transaction codes and billing details.
* **Maintenance Logs:** Submit maintenance requests with description, category (plumbing, electrical, structural), and priority level.
* **Bulletin Board:** View admin updates and anonymously post announcements or community updates.
* **Tradespeople Referrals:** View the directory of vetted specialists and copy their formatted contact details to the clipboard.
* **Account Customization:** Upload custom profile pictures from local storage or specify a web link.

### Global Features
* **Authentication & Role Guards:** Page-specific route guarding ensuring only authenticated users with correct permissions (admin or tenant) can access dashboard routes.
* **Property Gallery Modal:** A responsive, dynamically injected gallery carousel accessible to both admins and tenants by clicking the sidebar brand header.
* **Dynamic Custom Styling:** Admin-configurable accent themes (Classic Blue, Forest Teal, Terracotta, Royal Indigo, Emerald Green) applied dynamically across the interface.

## Tech Stack
* **Frontend:** HTML5, CSS3 (CSS Variables for dynamic styling), Vanilla JavaScript (ES modules)
* **Icons & Typography:** FontAwesome, Google Fonts (Outfit, Inter)
* **Backend Database:** Cloud Firestore
* **Authentication:** Firebase Authentication
* **Hosting:** Firebase Hosting

## File Structure

```text
├── admin/                  # Admin-specific dashboards and settings
├── tenant/                 # Tenant-specific dashboards
├── css/                    # Main stylesheet and layout systems
│   ├── style.css           # Global typography, resets, variables
│   └── dashboard.css       # Layouts, navigation sidebars, and cards
├── js/                     # Core JavaScript modules
│   ├── firebase-config.js  # Firebase SDK initialisation
│   ├── auth-guard.js       # Route guards, modal injection, common utilities
│   ├── auth.js             # Login and password reset handling
│   └── register.js         # Tenant signup logic using house codes
├── firestore.rules         # Security access rules for Firestore collections
└── firestore.indexes.json  # Multi-field database query indexes
```

## Setup and Installation

### Prerequisites
1. Install [Node.js](https://nodejs.org/).
2. Install the Firebase CLI tool:
   ```bash
   npm install -g firebase-tools
   ```

### Local Setup
1. Clone the repository to your local machine.
2. In the `js/firebase-config.js` file, replace the config values with your own Firebase project configuration:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```
3. Log in to Firebase in your terminal:
   ```bash
   firebase login
   ```
4. Bind the project to your Firebase instance:
   ```bash
   firebase use --add
   ```

### Deploying Database Rules & Indexes
Deploy the Firestore security rules and composite indexes to your active Firebase project:
```bash
firebase deploy --only firestore
```

### Running Locally
To run a local web server to test changes:
```bash
firebase serve
```

### Production Deployment
To deploy the client application live to Firebase Hosting:
```bash
firebase deploy --only hosting
```
