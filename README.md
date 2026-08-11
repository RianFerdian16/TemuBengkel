# TEMUBENGKEL

TEMUBENGKEL adalah web app Next.js untuk mencari bengkel motor berdasarkan lokasi. Data publik bengkel (rating, review, foto, jam buka, telepon, dan Google Maps URL) berasal dari Google Maps/Places. Data tambahan dari pemilik bengkel (WhatsApp, layanan, deskripsi, montir panggilan, dan status moderasi) disimpan di Neon PostgreSQL.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- Google Maps JavaScript API + Places API (New)
- Neon PostgreSQL
- Prisma ORM 7 + `@prisma/adapter-neon`
- Auth owner internal: password `scrypt` + opaque session cookie HTTP-only
- Vercel Analytics

## 1. Environment variables

Copy `.env.example` menjadi `.env.local`.

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
GOOGLE_MAPS_SERVER_API_KEY=

DATABASE_URL=
DIRECT_URL=
```

Untuk Neon, buka project **Temu Bengkel** lalu klik **Connect**:

- `DATABASE_URL` = **Pooled connection** (hostname mengandung `-pooler`). Ini dipakai aplikasi saat runtime.
- `DIRECT_URL` = **Direct connection** (tanpa `-pooler`). Ini dipakai Prisma CLI untuk migration dan Prisma Studio.

Jangan commit `.env.local` ke Git/GitHub.

## 2. Install dependencies

Pakai package manager yang kamu nyaman gunakan.

```bash
npm install
```

atau:

```bash
pnpm install
```

`postinstall` otomatis menjalankan `prisma generate`.

## 3. Buat tabel di Neon

Migration awal sudah disertakan di folder `prisma/migrations`.

Setelah `DIRECT_URL` diisi:

```bash
npm run db:deploy
```

atau:

```bash
pnpm db:deploy
```

Migration akan membuat:

- `users` — akun pemilik/admin/customer untuk pengembangan berikutnya
- `sessions` — session login owner; token mentah hanya berada di cookie, database menyimpan hash SHA-256
- `workshops` — data tambahan TEMUBENGKEL dan status moderasi

Untuk melihat database dengan UI Prisma:

```bash
npm run db:studio
```

## 4. Jalankan development server

```bash
npm run dev
```

Lalu buka `http://localhost:3000`.

## 5. Alur owner

1. Owner membuka `/owner/register`.
2. Password di-hash menggunakan Node.js `scrypt` sebelum disimpan.
3. Setelah registrasi berhasil, owner langsung mendapat session HTTP-only dan masuk ke dashboard.
4. Owner menambahkan bengkel atau menghubungkan listing ke Google Place ID.
5. Listing baru/yang diedit selalu kembali ke status `pending`.
6. Listing baru tampil ke publik setelah status menjadi `approved`.

Untuk MVP, approval dapat dilakukan lewat Prisma Studio atau Neon SQL Editor. Contoh SQL:

```sql
UPDATE workshops
SET status = 'approved', updated_at = NOW()
WHERE id = 'UUID_BENGKEL';
```

## 6. Google Maps

Aktifkan minimal:

- Maps JavaScript API
- Places API (New)

Rekomendasi key:

- Browser key (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`): batasi dengan HTTP referrer dan hanya izinkan Maps JavaScript API.
- Server key (`GOOGLE_MAPS_SERVER_API_KEY`): simpan server-side dan batasi hanya ke Places API (New).

## 7. Struktur penting

```text
app/
  api/auth/                 register, login, logout, session
  api/owner/workshops/      CRUD milik owner
  api/places/               proxy Google Places/Photos
  owner/                    halaman owner
components/                 UI dan experiences
lib/
  auth.ts                   hashing + database-backed session
  db.ts                     Prisma + Neon adapter
  workshop-repository.ts    query PostgreSQL
  workshop-input.ts         validasi input bengkel
  workshop-data.ts          merge Google + data owner
prisma/
  schema.prisma
  migrations/
```

## 8. Catatan keamanan

- Endpoint owner tidak menerima `owner_id` dari client; owner selalu diambil dari session server.
- Query edit/get/delete bengkel selalu dibatasi ke `ownerId` yang sedang login.
- Password tidak pernah disimpan plaintext.
- Session cookie bersifat HTTP-only, `SameSite=Lax`, dan `Secure` di production.
- File `.env.local`, `.next`, `node_modules`, dan Prisma generated client tidak disimpan di Git.

Rate limiting, password reset/email verification, dan admin moderation UI masih merupakan pekerjaan tahap production berikutnya.
