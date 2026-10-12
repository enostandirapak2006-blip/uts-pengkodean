# Demo GitHub Pages

File aplikasi yang sudah dibuild tersedia pada branch gh-pages di repo ini. Branch memuat index.html, canvas.js, canvas.css, public-config.js dan .nojekyll. Public-config hanya memuat publishable key Supabase; tidak memuat password, access token pengguna, atau secret/service_role key. Database tetap memakai proyek Supabase yang sama.

## Aktivasi oleh pemilik repo

1. Login ke GitHub dan buka repo enostandirapak2006-blip/uts-pengkodean.
2. Settings > Pages.
3. Source: Deploy from a branch.
4. Branch: gh-pages; folder: /(root).
5. Save dan tunggu deployment GitHub Pages selesai. Tautan aktif akan ditampilkan pada halaman Pages.

Status: branch telah disiapkan dan berhasil dipush, tetapi hosting Pages belum diaktifkan/diverifikasi pada saat dokumen ini dibuat. Akses browser sesi pengerjaan belum login ke GitHub, dan konektor yang tersedia tidak memiliki operasi pengaturan Pages. Jangan menyatakan URL GitHub Pages sudah aktif sebelum deployment diverifikasi.

GitHub Pages menyajikan frontend statis. Autentikasi, validasi jurnal, penyimpanan, audit dan checksum tetap berjalan di Supabase melalui RPC dan RLS. Sumber kode tetap ada di branch main; branch gh-pages hanya menyimpan hasil build. Jika kode berubah, hasil build perlu dipush ulang ke gh-pages.

Setelah aktif, login memakai pengguna Supabase Auth aplikasi dan uji voucher UTS-TEST-001 (gunakan referensi baru bila sudah dipakai), Debit Beban Operasional 50000 dan Kredit Bank 50000. Screenshot pesan sukses atau error dapat digunakan untuk verifikasi akhir. Jangan menyertakan password.

Referensi pengaturan: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
