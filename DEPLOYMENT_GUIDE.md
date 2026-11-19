# Deployment Guide: Vercel & Supabase Setup

This guide provides instructions for deploying this Community Event Calendar to **Vercel** with a **Supabase (PostgreSQL)** database, completely within free tier limits.

---

## Architecture Overview

- **Frontend:** React + Tailwind CSS hosted on **Vercel** (Hobby Free Plan)
- **Backend / API:** Serverless Node / Express endpoints on Vercel Functions (`/api/*`)
- **Database:** **Supabase** Free Tier (500 MB PostgreSQL database, 50,000 monthly active users, no credit card required)

---

## 1. Supabase Setup (Free Tier)

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and name it `community-calendar`.
3. Choose your closest region and set a database password.
4. Open the **SQL Editor** in Supabase and run this schema migration:

```sql
-- Create events table
create table public.events (
  id text primary key,
  title text not null,
  date text not null, -- YYYY-MM-DD
  time text not null,
  location text not null,
  description text not null,
  contact_email text,
  status text not null default 'pending', -- 'pending' | 'approved' | 'rejected'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  reviewed_at timestamp with time zone,
  reviewed_by text,
  notes text
);

-- Index for public calendar queries (fast chronological retrieval)
create index idx_events_approved_date on public.events (date) where status = 'approved';

-- Enable Row Level Security (RLS)
alter table public.events enable row level security;

-- Public can view approved events
create policy "Public can view approved events"
  on public.events for select
  using (status = 'approved');

-- Anonymous submitters can insert new pending events
create policy "Anonymous can submit pending events"
  on public.events for insert
  with check (status = 'pending');

-- Service role / Admin has full access
create policy "Admin full access"
  on public.events for all
  using (true);
```

5. In **Project Settings** → **API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role secret` key (used by server for admin actions)

---

## 2. Deploying to Vercel

1. Push this repository to GitHub or GitLab.
2. Sign in to [vercel.com](https://vercel.com) and click **Add New...** → **Project**.
3. Select your repository and import it.
4. Under **Environment Variables**, add:
   - `ADMIN_PASSWORD` = `your-secure-admin-passphrase`
   - `SUPABASE_URL` = `https://your-project.supabase.co` (optional if using Supabase client)
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-role-key` (optional)
5. Click **Deploy**. Vercel will build the React SPA and serve the application with zero hosting costs.

---

## 3. Local Development

Run the development server locally:

```bash
npm install
npm run dev
```

The app will start on `http://localhost:3000` with the pre-loaded 8 sample approved events and 2 pending moderation events.
