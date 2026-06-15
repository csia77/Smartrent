# Nyumbani Rental Management System

A web-based rental management portal for landlords and tenants. Admins manage houses, tenants, payments, and maintenance. Tenants view their balance, submit payments, log repair requests, and communicate with the admin.

**Live app:** https://smart-rent-5fe3d.web.app

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [Security](#security)

---

## Features

### Admin

- Dashboard with live stat counters (houses, tenants, pending payments, open maintenance)
- House management: add, edit, and remove rental units with unique entry codes
- Tenant management: register tenants, assign them to houses, edit rent amounts
- Payment approvals: review and approve or reject tenant payment submissions
- Maintenance tracker: view and update repair request status
- Announcements board: post property bulletins visible to all tenants
- Anonymous message inbox: read private feedback from tenants
- Service directory: manage a list of vetted local tradespeople
- Property gallery: upload and showcase property photos in a modal carousel
- Theme customisation: switch accent colours across the whole interface

### Tenant

- Personal dashboard showing monthly rent, outstanding balance, and billing breakdown
- Payment submission with transaction code and billing details
- Maintenance request form with category and priority level
- Announcements board: read admin posts and add community updates
- Service directory: browse and copy tradesperson contact details
- Profile settings: upload a custom avatar

### Both roles

- Firebase Authentication with role-based route guards
- Real-time data via Firestore onSnapshot listeners
- Responsive layout across desktop, tablet, and mobile
- Toast notification system
- Animated login and registration pages

---

## Tech Stack

| Layer        | Technology |
|--------------|-----------|
| Frontend     | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Fonts        | Inter (Google Fonts) |
| Icons        | Font Awesome 6 |
| Database     | Cloud Firestore |
| Auth         | Firebase Authentication |
| Hosting      | Firebase Hosting |

### Why not Netlify or Vercel?

This project is built entirely on the Firebase platform. Firebase Hosting, Firestore, and Firebase Auth all work together within the same project console, share security rules, and deploy with a single command. Splitting hosting across Firebase and Netlify or Vercel would introduce two separate deploy pipelines and DNS configurations with no functional benefit. If serverless backend logic is needed in the future, Firebase Cloud Functions integrates directly with the existing Firestore data and Auth tokens without any additional configuration.

---

## File Structure

```
nyumbani/
├── admin/
│   ├── dashboard.html          # Admin overview with live stat widgets
│   ├── houses.html             # House management table and add form
│   ├── tenants.html            # Tenant management table and add form
│   ├── payments.html           # Payment review and approval
│   ├── maintenance.html        # Maintenance request tracker
│   ├── announcements.html      # Announcements board
│   ├── messages.html           # Anonymous message inbox
│   ├── directory.html          # Service provider directory
│   ├── settings.html           # System and theme settings
│   └── *.js                    # Page-specific JavaScript modules
├── tenant/
│   ├── dashboard.html          # Tenant overview and all tenant features
│   └── tenant.js               # Tenant dashboard logic
├── css/
│   ├── style.css               # Auth pages (login, register)
│   └── dashboard.css           # Dashboard layout, sidebar, components
├── js/
│   ├── firebase-config.js      # Firebase SDK initialisation
│   ├── auth-guard.js           # Route guards, sidebar, toast, table labels
│   ├── auth.js                 # Login and password reset logic
│   ├── register.js             # Tenant signup with house code validation
│   └── utils.js                # Shared helpers (escapeHtml)
├── index.html                  # Login page
├── register.html               # Tenant registration page
├── 404.html                    # Custom not-found page
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Composite query indexes
└── firebase.json               # Firebase Hosting and Firestore config
```

---

## Local Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- Firebase CLI

```bash
npm install -g firebase-tools
```

### 1. Clone the repository

```bash
git clone https://github.com/csia77/Smartrent.git
cd Smartrent
```

### 2. Connect to your Firebase project

Create a Firebase project at https://console.firebase.google.com, then replace the values in `js/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_AUTH_DOMAIN",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID"
};
```

### 3. Log in and link your project

```bash
firebase login
firebase use --add
```

### 4. Deploy Firestore rules and indexes

```bash
firebase deploy --only firestore
```

### 5. Run locally

```bash
firebase serve
```

The app will be available at `http://localhost:5000`.

---

## Deployment

Deploy the full app to Firebase Hosting:

```bash
firebase deploy --only hosting
```

Deploy everything (hosting + Firestore rules + indexes) in one command:

```bash
firebase deploy
```

**Live URL:** https://smart-rent-5fe3d.web.app

---

## Security

- Firestore rules restrict all reads and writes to authenticated users.
- Tenants can only read and write their own data.
- Tenants cannot modify their own `houseId`, `rentAmount`, or `balance` fields.
- Only admins can approve payments, update house records, or delete any document.
- Anonymous messages are write-only from any signed-in user and read-only by admins.
- All user-generated content displayed in the admin interface is escaped before rendering to prevent XSS.
- HTTP security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) are set via Firebase Hosting config.

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you would like to change.

---

## License

MIT
