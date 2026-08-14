# TEMUBENGKEL V26 — Admin Console + Console Navigation

## Yang ditambahkan
- Admin login terpisah di `/admin/login` dengan cookie `tb_admin_session` yang terpisah dari session owner.
- Server-side role check untuk seluruh halaman dan API moderasi admin.
- Sidebar admin: Ringkasan, Pending Review, Semua Bengkel, Pemilik, Pengaturan.
- Sidebar owner: Home, Bengkel, Pengaturan, Kembali ke pengguna, Keluar portal.
- Approve / Reject dengan alasan reject yang tampil ke owner.
- Owner edit listing selalu kembali ke Pending dan alasan reject lama dibersihkan.
- Owner settings: nama, password, logout semua perangkat, hapus akun dengan password + teks konfirmasi.
- Penghapusan owner bersifat soft/anonymized dan seluruh listing dikeluarkan dari publik.
- Shortcut Admin Console dari landing membuka tab baru.
- Responsive drawer untuk console pada layar kecil.

## Setelah apply V26
Jalankan:
`npm run db:generate`
`npm run db:deploy`

Migration: `20260814000100_add_admin_moderation`

## Membuat akun admin pertama
1. Buat akun khusus admin sementara lewat `/owner/register` menggunakan email admin khusus.
2. Buka Neon SQL Editor dan jalankan (ganti email):

```sql
BEGIN;
UPDATE users
SET role = 'admin', updated_at = NOW()
WHERE email = 'admin@contoh.com';

DELETE FROM sessions
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@contoh.com');
COMMIT;
```

3. Login lewat `/admin/login`.

Gunakan akun khusus admin; jangan promosikan akun owner produksi yang masih dipakai untuk mengelola bengkel.
