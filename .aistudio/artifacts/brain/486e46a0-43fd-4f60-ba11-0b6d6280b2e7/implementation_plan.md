# Cloud Firestore Multi-Device & GitHub Zero-Key Leakage Architecture Plan

A resilient, cloud-synchronized community event calendar for Kent State University Visual Communication Design (KSU VCD), architected with zero-exposure GitHub security, multi-computer persistence, and multi-moderator Google Authentication.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Strict GitHub Security & Zero-Key Exposure Guarantee**:
> 1. **No API Keys in Git**: Neither `firebase-applet-config.json` nor any `.env*` file will ever be tracked by Git. `.gitignore` strictly excludes `firebase-applet-config.json`, `.env`, `.env.local`, and all variations.
> 2. **Placeholder-Only Examples**: Only `firebase-applet-config.example.json` and `.env.example` with empty placeholder strings (`""` or `"your-api-key"`) exist in the repository.
> 3. **Clean Source Code**: No API keys, secret tokens, or private credentials are hardcoded into TypeScript/JavaScript source files (`src/*` or `server.ts`).
> 4. **Runtime-Safe Configuration**: The app will load configuration dynamically from ignored local files or environment variables at runtime. When deployed or cloned, credentials are provided via platform secrets (such as GitHub Secrets or host environment variables).

- **Database Location**: 100% Google Cloud Firestore (`ai-studio-vcdevents-486e46a0-43fd-4f60-ba11-0b6d6280b2e7`) — data never lives on local disks.
- **Git Security**: Strict `.gitignore` boundaries ensuring zero API keys are ever committed to GitHub.
- **Multi-Moderator Authentication**: Firebase Google Sign-In with an authorized moderator email registry (`ADMIN_EMAILS`) so any moderator can review and approve events from any computer without permission errors.

---

## 1. Overview & Core Concept

- **What It Does**: Provides an event calendar for KSU VCD. The public can view approved events with smooth, sticky month scrolling and submit new events anonymously. Authorized faculty and student moderators can sign in from any computer using their Google account to review, edit, approve, or reject event submissions in real time.
- **Security & Privacy First**: Designed so the repository can be safely published, cloned, or synced to GitHub publicly or privately without any risk of exposing Google Cloud / Firebase API keys, administrative passwords, or sensitive credentials.
- **Target Audience**:
  - **Community & Students**: Browsing upcoming design lectures, workshops, and exhibitions; submitting local events.
  - **Faculty & Student Moderators**: Moderating submissions across different campus computers, home setups, and mobile devices.

---

## 2. GitHub Security & Secret Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Git Repository Boundary                      │
│                                                                 │
│   TRACKED IN GIT (100% Safe - No Keys)                          │
│   ├── src/                  (Clean source code, zero keys)      │
│   ├── .env.example          (Empty placeholder strings only)    │
│   ├── firebase-applet-config.example.json (Dummy template)      │
│   ├── .gitignore            (Explicit blocklist for all secrets)│
│   └── firestore.rules       (ABAC security rules)               │
│                                                                 │
│   ====================== .gitignore =========================== │
│                                                                 │
│   STRICTLY IGNORED (Never Synced to GitHub)                     │
│   ├── firebase-applet-config.json  <-- Blocked from Git         │
│   ├── .env                         <-- Blocked from Git         │
│   ├── .env.local                   <-- Blocked from Git         │
│   └── *.log, node_modules/         <-- Blocked from Git         │
└─────────────────────────────────────────────────────────────────┘
```

### Defense-in-Depth Measures
1. **Pre-Commit Verification**: Validate that `git status` reports `firebase-applet-config.json` and `.env` as ignored before any remote sync.
2. **Server-Side Config Bridge (Optional Fallback)**: The dev server can read environment variables securely and expose public client configs via a local endpoint `/api/firebase-config` if needed, avoiding filesystem fragility.
3. **Firestore Security Hardening**: Even with standard Firebase public web client identifiers, Firestore data is strictly guarded at the Google Cloud layer by `firestore.rules`:
   - Public can ONLY read documents where `status == 'approved'`.
   - Public can ONLY submit documents where `status == 'pending'`.
   - ONLY verified accounts in the moderator allowlist can mutate or delete events.

---

## 3. User Experience & Visual Design

### Key User Flows

1. **Public Visitor Flow**:
   - Accesses the calendar on mobile or desktop.
   - Sticky month headers dock cleanly at the top of the viewport during vertical scrolling.
   - Event cards display day and weekday with truncated preview text.
   - Submits events via a responsive modal with anti-bot honey-pot validation.

2. **Moderator Multi-Computer Access Flow**:
   - Moderator clicks "Admin Portal" in the top navigation.
   - Clicks "Sign in with Google" (using `nmuffet@gmail.com` or other approved moderator accounts).
   - Once signed in, Firebase Auth issues a cryptographically verified token.
   - The admin queue loads pending submissions, published events, and rejected items with live status badges.
   - When switching to a different computer, the moderator simply signs in with Google—no database migration, copy-pasting, or sync steps required.

3. **Event Moderation Flow**:
   - Click to inspect full event details and submission notes.
   - In-place quick action buttons to Approve, Edit, Reject, or Unpublish.
   - Immediate real-time sync across all connected viewports.

---

## 4. Key Product Decisions & Trade-Offs

### Decision 1: Keeping Secrets Out of GitHub
- **Chosen Approach**: Full `.gitignore` enforcement combined with placeholder `.example` templates.
- **Why**: Eliminates any possibility of GitHub Secret Scanner alerts, accidental leakage, or project credential compromise.
- **Alternatives Considered**: Storing encoded credentials in git was rejected as fundamentally insecure.

### Decision 2: Google Sign-In vs. Hardcoded Shared Password
- **Chosen Approach**: Google Sign-In with an authorized email list (`ADMIN_EMAILS`) checked against `request.auth.token.email`.
- **Why**:
  - Enables multiple people to moderate without sharing passwords.
  - Matches Firestore security rules directly, preventing the "Missing or insufficient permissions" errors caused by disconnected password state.
  - Avoids storing admin passwords in clear text or committing them to git.

### Decision 3: Cloud Firestore as Sole Source of Truth
- **Chosen Approach**: Google Cloud Firestore (`ai-studio-vcdevents-486e46a0-43fd-4f60-ba11-0b6d6280b2e7`).
- **Why**: Ensures that all event records live centrally in Google Cloud. Working on different computers or adding new team members is immediately seamless because everyone connects to the exact same cloud instance.

---

## 5. Technical Implementation Steps

1. **GitHub Secret Protection Audit**:
   - Inspect `.gitignore` to ensure `firebase-applet-config.json`, `.env`, and all `.env.*` variants are strictly blocked.
   - Verify that all committed example files (`.env.example`, `firebase-applet-config.example.json`) contain only placeholder strings.
   - Audit `src/` to confirm zero hardcoded credentials exist in source files.

2. **Firebase Client Config Loader**:
   - Update `src/lib/firebase.ts` to cleanly load connection metadata with automatic fallback:
     1. Local uncommitted `firebase-applet-config.json`
     2. Vite runtime env vars (`import.meta.env.VITE_FIREBASE_*`)
     3. Graceful setup notice if unconfigured, without crashing.

3. **Multi-Moderator Google Authentication**:
   - Integrate Google Sign-In directly in `src/components/AdminDashboard.tsx` and `src/App.tsx`.
   - Define an expandable moderator allowlist (`ADMIN_EMAILS: ['nmuffet@gmail.com']`).
   - Sync this list with `firestore.rules` so every authorized team member can moderate.

4. **Deploy & Verify Security Rules**:
   - Deploy hardened Firestore rules to Firebase Cloud using `DeployRules`.
   - Test that approving, editing, and rejecting events works smoothly with Google Sign-In.
   - Verify that guest users cannot modify records.

5. **Build & Quality Check**:
   - Run `compile_applet` and test the application build.
   - Ensure mobile sticky scrolling, touch targets, and truncated previews remain pristine.
