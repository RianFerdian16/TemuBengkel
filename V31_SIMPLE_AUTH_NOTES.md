# TEMUBENGKEL V31 — Simple Auth

V31 menghapus fitur email verification dan forgot/reset password berbasis Resend.

## Perubahan
- Owner register langsung membuat session dan masuk ke dashboard.
- Owner login tidak lagi membutuhkan status email verified.
- Tombol `Lupa kata sandi?` di owner/admin login dihapus.
- Tombol `Kirim ulang email verifikasi` dihapus.
- Route forgot/reset/verify/resend verification dihapus.
- Integrasi Resend dan kebutuhan `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL` untuk auth dihapus.
- Rate limiting login/register tetap dipertahankan.
- Schema V30 tidak di-rollback secara destruktif; kolom/table auth-token lama boleh tetap ada agar aman untuk database yang sudah dimigrasikan.
- Installer juga membersihkan endpoint legacy `/api/places/photo` yang pernah menyebabkan production build gagal setelah fungsi foto Google dihapus.

## Catatan
Karena password recovery tidak tersedia, pemilik harus menyimpan kata sandi dengan aman. Fitur recovery dapat ditambahkan kembali nanti ketika domain/email production sudah siap.

Tidak ada migration database baru di V31.
