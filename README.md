# Event Registration — Lycée Qualifiant Tamansourte

A complete event registration web application built with **Next.js 14 App Router**, **Tailwind CSS**, **Supabase**, and **Resend**.

## Features

- 🎟️ **Public registration** with QR-coded pass sent by email
- 📱 **QR Scanner** for event check-in (camera-based, no library bloat)
- 📊 **Admin Dashboard** with real-time updates via Supabase Realtime
- 🔒 **Auth-protected admin routes** using Supabase Auth
- 📧 **Dark-themed HTML emails** sent via Resend
- 🌙 **Stunning dark design** with Syne + DM Sans fonts and particle animations

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase_schema.sql`
3. Go to **Database > Replication** and enable realtime for the `attendees` table
4. Create an admin user in **Authentication > Users**

### 3. Configure environment variables

Fill in `.env.local` with your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
RESEND_API_KEY=re_...
```

### 4. Configure Resend

- Create an account at [resend.com](https://resend.com)
- Verify your domain
- Update the `from:` address in `app/api/send-pass/route.ts`

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
app/
  page.tsx                     ← Landing + Registration
  layout.tsx                   ← Root layout with fonts
  globals.css                  ← Design system styles
  admin/
    login/page.tsx             ← Admin login
    dashboard/page.tsx         ← Protected dashboard
  api/
    send-pass/route.ts         ← QR + Email generation
    verify-qr/route.ts         ← Check-in verification

components/
  HeroSection.tsx              ← Animated hero
  RegisterForm.tsx             ← Registration modal  
  PassSuccessModal.tsx         ← Success feedback
  admin/
    StatsBar.tsx               ← Metric cards
    AttendeeTable.tsx          ← Searchable data table
    QRScanner.tsx              ← Camera QR scanner

lib/
  supabase.ts                  ← Browser, server & service role clients
  resend.ts                    ← Email client
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy — zero config needed

> ⚠️ HTTPS is required for camera access (QR scanner). Vercel automatically provides HTTPS.

---

## Customization

Replace the following placeholders:
- `EVENT NAME` → Your event name (in `HeroSection.tsx`, `app/api/send-pass/route.ts`)
- `EVENT DATE` → Actual event date
- `EVENT LOCATION` → Actual location
- `noreply@yourdomain.com` → Your verified Resend sender address
