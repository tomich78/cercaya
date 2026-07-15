# EstamosCerca

> A full-stack, production-grade local marketplace for Argentina — think Craigslist meets MercadoLibre, rebuilt from scratch with a modern stack.

🔗 **Live:** [www.estamoscerca.com.ar](https://www.estamoscerca.com.ar)

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Expo](https://img.shields.io/badge/Expo_SDK_56-000020?style=flat-square&logo=expo)
![Vercel](https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel)

## Screenshots
<img width="1892" height="907" alt="Feed" src="https://github.com/user-attachments/assets/f6bb4cd9-7d10-4698-b560-030a85dc848f" />
<img width="1895" height="901" alt="Feed2" src="https://github.com/user-attachments/assets/1c87f197-94a6-4d43-a423-674509020989" />
<img width="1894" height="898" alt="Negocio" src="https://github.com/user-attachments/assets/8f8766f9-1689-4502-801e-e715976abe6e" />
<img width="1879" height="894" alt="Publicacion" src="https://github.com/user-attachments/assets/1552fe47-8fa2-4c8e-a5b5-367c712669bd" />

---

## What it does

EstamosCerca lets people in the same neighborhood buy and sell without shipping — no middleman, no commission. Users browse a real-time feed of nearby listings, filter by type (products, services, properties, vehicles), and contact sellers directly.

Businesses get a dedicated storefront, analytics dashboard, and verified badge after CUIT (Argentine tax ID) verification.

---

## Features

### Core marketplace
- **4 listing types** — products, services, real estate, and vehicles, each with tailored fields and attributes
- **Infinite scroll** with real-time filter + search (no page reloads)
- **Distance-based sorting** via browser geolocation
- **Interactive map** powered by Leaflet showing nearby listings
- **Favorites / saved listings** — persisted per user
- **Image gallery** — up to 5 photos per listing, uploaded directly to Supabase Storage
- **Dark mode** — system-aware, toggle persisted in localStorage

### User accounts
- Email/password auth + Google OAuth via Supabase
- Required profile completion (DNI + location) after OAuth sign-up
- Password reset via transactional email (Resend, custom domain, DMARC/SPF/DKIM configured)
- Terms & conditions acceptance on registration

### Business accounts (Modo Negocio)
- Paid upgrade via Mercado Pago Checkout Pro
- Business sellers get a public slug-based storefront (`/negocio/[slug]`)
- CUIT verification for a "Negocio verificado" badge
- Analytics dashboard: total views, profile visits, messages received, top listing, active listings, conversion rate
- Seller OAuth integration (Mercado Pago OAuth) for future payment collection
- Promo code system for activation discounts
- Bulk product import via Excel (.xlsx) upload
- No listing limit (normal accounts: 20 max)

### Messaging
- Real-time buyer ↔ seller chat built on Supabase Realtime
- Unread badge count with 5s polling fallback
- Full conversation history

### PWA + push notifications
- Installable from the browser (service worker, Web App Manifest)
- Web Push notifications via VAPID keys for new messages and activity
- Offline support for cached content

### Native mobile app (in development)
- React Native with Expo SDK 56, built for Android + iOS
- Published via EAS Build (APK sideloaded for testing, Play Store submission pending)
- Camera and gallery integration for photo uploads
- Mirrors the web app's data — same Supabase backend, same real-time data

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC) |
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + Google OAuth) |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime (messaging) |
| Payments | Mercado Pago Checkout Pro + OAuth |
| Email | Resend (custom domain SMTP) |
| Maps | react-leaflet |
| Push notifications | web-push (VAPID) |
| Mobile | React Native, Expo SDK 56, EAS Build |
| Deploy | Vercel |

---

## Architecture notes

A few engineering decisions worth calling out:

**Performance — eliminating N+1 queries**
The home feed originally made one DB call per product card to check if the user had favorited it. Replaced with a single batch query that loads all favorite IDs upfront, passed down as a `Set<number>` prop. Combined with a Supabase JOIN (`profiles!user_id`) for seller metadata, the page now hits the DB twice total regardless of how many products are shown.

**Auth caching**
`getCurrentUser()` is called in multiple components (Navbar, ProductCard, page layouts). Added a module-level in-memory cache with a 1-minute TTL so repeated calls within a session hit memory instead of the network. Cache is invalidated on logout and profile updates.

**Infinite scroll**
Uses `IntersectionObserver` on a sentinel `<div>` at the bottom of the feed. A common footgun is conditionally rendering the sentinel (e.g. `{!loading && <div ref={sentinel} />}`) — the observer fires on mount when `ref.current` is null, then never re-fires. The sentinel is always mounted; loading state controls a spinner above it, not the sentinel itself.

**Email deliverability**
Configured custom domain SMTP via Resend with SPF, DKIM, and DMARC records (in Vercel DNS). Sender domain matches the app domain so messages land in inbox rather than spam.

**Mobile image uploads**
React Native's `fetch()` can read local `file://` URIs. The upload pipeline converts the URI to an `ArrayBuffer` via `blob.arrayBuffer()` and sends it directly to Supabase Storage — no base64 encoding, no extra dependencies.

---

## Running locally

```bash
git clone https://github.com/tomich78/cercaya.git
cd cercaya
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_MP_PUBLIC_KEY=...
MP_ACCESS_TOKEN=...
```

```bash
npm run dev
```

---

## Author

**Tomás Degano Sal** — [github.com/tomich78](https://github.com/tomich78)

Built and maintained solo: product design, frontend, backend, infrastructure, payments integration, email deliverability, and native mobile app.
