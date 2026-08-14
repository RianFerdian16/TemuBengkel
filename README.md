# TEMUBENGKEL

TEMUBENGKEL adalah web app mobile-first untuk mencari bengkel motor berdasarkan nama, area, alamat, atau lokasi perangkat. Hasil publik menggabungkan Google Places dengan listing pemilik yang sudah melalui moderasi TemuBengkel.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 / CSS feature styles
- Google Maps JavaScript API + Places API (New)
- Neon PostgreSQL
- Prisma ORM 7 + `@prisma/adapter-neon`
- Auth internal: `scrypt`, opaque HTTP-only sessions, hashed one-time auth tokens
- Vercel Analytics

## Environment variables utama

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
GOOGLE_MAPS_SERVER_API_KEY=
DATABASE_URL=
DIRECT_URL=
```

Untuk production password recovery + email verification, V30 juga mendukung:

```env
APP_URL=https://temubengkel.vercel.app
RESEND_API_KEY=
EMAIL_FROM=TemuBengkel <sender@your-verified-domain.example>
```

Tanpa konfigurasi email, registration tetap backward-compatible agar owner tidak terkunci. Untuk production penuh, konfigurasi email sangat disarankan.

## Install / migration

```bash
npm install
npm run db:generate
npm run db:deploy
npm run dev
```

V30 menambahkan migration untuk timezone listing, email verification/password-reset token, dan persistent rate limiting.

## Public flow

`Home search → List/Map → Detail → WhatsApp / Telepon / Google Maps`

Public user tidak perlu login. Search dapat menerima nama bengkel, area, atau alamat, dan dapat memakai lokasi perangkat.

## Owner flow

1. Register/login owner.
2. Tambah atau edit listing bengkel.
3. Pilih lokasi dengan pencarian alamat, GPS, dan map picker; alamat mengikuti titik map melalui reverse geocoding.
4. Submission masuk `pending`.
5. Admin approve/reject.
6. Hanya listing `approved` yang masuk hasil publik.
7. Edit listing yang sudah approved mengembalikan status ke `pending`.

Jam buka owner dihitung menggunakan timezone listing (`Asia/Jakarta`, `Asia/Makassar`, atau `Asia/Jayapura`).

## Admin flow

Admin Console memiliki session terpisah dan server-side role checks. Admin dapat melihat ringkasan, pending review, seluruh listing, owner directory, lalu approve/reject submission dengan alasan.

## Security

- Password menggunakan Node.js `scrypt`.
- Session token mentah hanya berada di HTTP-only cookie; database menyimpan hash.
- Owner hanya dapat mengubah listing miliknya sendiri.
- Owner tidak dapat self-approve.
- Login owner/admin, registration, password recovery, dan geocoding memiliki database-backed throttling.
- Password-reset dan email-verification token disimpan dalam bentuk hash dan memiliki expiry.
- Password reset mencabut seluruh session lama.
- `.env.local` tidak boleh di-commit.

## Catatan Google data

TEMUBENGKEL hanya meminta field Google Places yang benar-benar dirender pada flow saat ini. Foto dan review individual tidak diambil pada normal detail flow; rating dan jumlah review tetap dapat ditampilkan bila tersedia dari API resmi.

Lihat `V30_PRODUCT_HARDENING_NOTES.md` untuk rincian perubahan V30 dan smoke-test checklist.
