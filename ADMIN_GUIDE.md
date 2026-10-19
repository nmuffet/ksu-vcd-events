# Admin Guide & Moderation Handbook

This document outlines administration, moderation workflows, and credential management for the **Community Event Calendar** app.

---

## 1. Admin Credentials

- **Default Password:** `nick2025`
- **Dashboard Access:** Click **"Admin Queue"** in the top navigation bar or the lock icon in the footer.
- **Environment Variable:** In production (e.g., Vercel, Cloud Run, or custom host), configure:
  ```env
  ADMIN_PASSWORD="your-secure-custom-password"
  ```
  The backend will automatically authenticate against this environment variable.

---

## 2. Password Reset & Custom Passwords

### Option A: In-App Password Update
1. Open the app as Admin.
2. In the Admin Dashboard or top bar, click **"Admin Docs"** (or the key icon in the footer).
3. Under **"Set New Admin Password"**, enter your desired password and click **"Update Password"**.
4. You can also click **"Reset back to default"** at any time.

### Option B: Environment Variable (Hosting / Production)
Set `ADMIN_PASSWORD` in your hosting dashboard:
- **Vercel:** Project Settings → Environment Variables → `ADMIN_PASSWORD` = `...`
- **Docker / Cloud Run:** Add `ADMIN_PASSWORD` under Container Environment Variables.

---

## 3. Moderation Queue Workflow

1. **New Submissions:** When an anonymous user submits an event through the public form, it is automatically assigned `status: "pending"`.
2. **Reviewing Events:**
   - Go to the **Pending Queue** tab.
   - Inspect event title, date, time, venue/location, description, and contact email.
   - Click **"Edit"** to fix minor typos or adjust formatting before publishing.
   - Click **"Approve & Publish"** to immediately make the event visible on the public calendar.
   - Click **"Reject"** to decline off-topic submissions or commercial spam.
3. **Managing Published Events:**
   - Under the **"Published"** tab, you can edit or unpublish/delete any live event.
4. **History & Audit:**
   - The **"History"** tab tracks all submissions, review timestamps, and reviewer tags.
5. **Resetting Demo Data:**
   - Click **"Reset Demo Data"** to restore the pre-loaded 8 approved and 2 pending demo events.

---

## 4. Newsletter & Automation Feeds

- The app includes live JSON & Markdown endpoints for your weekly community digest:
  - `GET /api/events` — All approved events in chronological order.
  - `GET /api/newsletter/events.json?from=YYYY-MM-DD&to=YYYY-MM-DD` — Filtered JSON for automated email tools.
- Click **"Newsletter API"** in the top navigation to copy formatted Markdown ready for Mailchimp, Substack, or Beehiiv.
