# Tinjauan dan perbaikan kode Gemini Canvas

Pengguna memberikan prompt aktual, kode prototipe_voucher_kas_keluar.tsx, dan tiga screenshot hasil Canvas. Kode original disimpan tanpa perubahan pada evidence/gemini/original.tsx; versi hasil tinjauan pada frontend-canvas/CashVoucherApp.tsx. Tampilan hijau, tabel baris dinamis, ikon, indikator balance dan penjelasan UI dipertahankan dari hasil Gemini.

| Temuan pada kode asli | Perbaikan |
| --- | --- |
| parseToCents menganggap digit input sebagai sen, tetapi kolom berlabel Rp; 5000000 dikirim sebagai 50000.00 | Rupiah dibaca sebagai string desimal kemudian dikalikan 100 menggunakan BigInt; payload 5000000.00 |
| Parser membuang semua karakter nondigit sehingga -100 menjadi 100 dan format desimal dapat berubah makna | Parser ketat menolak negatif, teks, pemisah ribuan, dan lebih dari dua desimal |
| Number/parseInt dapat kehilangan presisi untuk nominal besar | BigInt dan konversi payload string tanpa pembagian floating point |
| account_id berupa acc_kas/acc_bank dan ID contoh lain, sedangkan backend memakai BIGINT | Akun dimuat dari chart_of_accounts setelah login dan ID dikirim sebagai string ID aktual |
| Authorization menggunakan anon key sebagai Bearer; tidak ada login pengguna | Login Supabase Auth, apikey memakai publishable key, Bearer memakai access_token pengguna; sesi hanya di memori |
| Pemeriksaan hanya menghitung kas di kredit dan memastikan ada satu lawan debit, tanpa melarang kas tambahan debit/lawan tambahan kredit | Seluruh baris diperiksa; tepat satu kas kredit dan seluruh akun nonkas debit |
| Tidak ada validasi metadata dalam logika tombol Submit | Tanggal, nomor bukti, deskripsi dan batas 50 karakter referensi diperiksa |
| Jumlah baris tanpa batas dan ID baris dari Date.now() | Maksimal 100 baris sesuai RPC dan UUID untuk baris tambahan |
| Tanggal awal memakai UTC | Tanggal awal memakai zona Asia/Jakarta |

Script tests/canvas.test.mjs memeriksa konversi Rp5.000.000, string payload, presisi desimal, input tidak valid, keseimbangan, metadata kosong, akun tidak dikenal, serta tambahan kas debit/lawan kredit. Uji ini lulus. Build esbuild/Tailwind berhasil menghasilkan bundle React dan CSS. Pengujian browser/login belum dilakukan; lolos build tidak membuktikan login dan penyimpanan cloud berhasil.

Frontend Canvas yang diperbaiki menjadi form utama hasil orkestrasi Gemini. Frontend sederhana pada frontend/ tetap tersedia sebagai alat pemeriksaan audit log, checksum dan jurnal pembalik; backend RPC keduanya sama. Pemisahan ini dicatat agar fitur audit yang dibuat dalam sesi coding tidak keliru diklaim sebagai output Gemini.

Konfigurasi login: pengguna Supabase Auth aplikasi harus dibuat dahulu. Pemeriksaan auth.users saat tinjauan menunjukkan belum ada pengguna aplikasi. Akun pemilik dashboard tidak otomatis menjadi akun aplikasi. Jangan memakai password utama Google sebagai password demonstrasi aplikasi atau mengunggah kredensial ke repo.
