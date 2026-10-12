# Prompt dan bukti AI

Status: pengguna telah menjalankan Gemini Canvas dan NotebookLM. Prompt Gemini aktual, kode dan screenshot telah diterima. NotebookLM pada pemeriksaan ulang telah membaca notebooklm-kode.txt dan mengutip fungsi yang cocok dengan kode. Bukti kedua layanan berada pada evidence/gemini/ dan evidence/notebooklm/. Ringkasan NotebookLM serta tinjauan manual pada docs/notebooklm-hasil.md.

## Gemini Canvas

Prompt aktual yang digunakan pengguna:

> Buat dan tampilkan prototipe formulir Voucher Kas Keluar berbasis React dalam bahasa Indonesia. Form memiliki tanggal, nomor bukti, deskripsi, dan baris jurnal dinamis: akun, debit, kredit. Akun master: Kas, Bank, Persediaan, Utang Usaha, HPP, Beban Operasional. Hitung total secara langsung dengan aritmetika sen integer, jangan floating point untuk uang. Submit hanya aktif jika minimal dua baris, tiap baris memiliki tepat satu nominal positif, total debit sama dengan kredit dan lebih dari nol, tepat satu baris akun Kas/Bank di kredit, serta akun lawan di debit. Tambahkan indikator balance yang aksesibel dan pesan error. Gunakan tampilan bersih bernuansa hijau, responsif. Backend Supabase RPC submit_cash_voucher menerima p_date, p_reference, p_description, p_lines; setiap baris berisi account_id, debit, credit sebagai string desimal. Jangan gunakan service_role key atau mengklaim koneksi database sudah berhasil. Jelaskan keputusan validasi dan batasan form.

Tautan yang diberikan pengguna: https://share.gemini.google/cZaKYyU3zw8W. Isi tautan belum dapat diakses dari sesi ini. Kode hasil asli: evidence/gemini/original.tsx. Screenshot preview dan ringkasan respons: evidence/gemini/. Versi perbaikan: frontend-canvas/CashVoucherApp.tsx. Keputusan perubahan: docs/gemini-review.md. Waktu persis eksekusi Gemini tidak ditampilkan dalam bukti; tanggal pada form merupakan tanggal transaksi contoh.

## NotebookLM

Sumber yang perlu dimasukkan: materi resmi/berlisensi dari dosen atau IAI mengenai standar kas dan setara kas (gunakan penomoran dan versi yang berlaku dalam materi), serta docs/soal-3.md dan file kode frontend/backend. Verifikasi judul/versi sumber sebelum digunakan. Tidak mengunggah password, API secret, token pengguna, atau data transaksi pribadi.

Prompt yang akan digunakan:

> Berdasarkan hanya sumber yang dimasukkan, tinjau logika prototipe Voucher Kas Keluar ini terhadap ketentuan pengakuan dan klasifikasi kas serta setara kas. Untuk setiap kesimpulan, sertakan kutipan sumber/locator yang dapat diperiksa. Periksa definisi kas dan setara kas, batasan instrumen yang memenuhi klasifikasi, arah jurnal kas keluar, penggunaan akun lawan, perlakuan transaksi tanpa perubahan kas, koreksi melalui jurnal pembalik, dan aspek yang tidak bisa dipastikan hanya dari kode. Pisahkan aturan standar akuntansi dari kontrol teknis yang merupakan keputusan desain. Jangan menyatakan bahwa seluruh sistem patuh PSAK hanya karena jurnal seimbang. Buat tabel aturan, bukti kode, hasil memenuhi/belum memenuhi/tidak dapat dinilai, dan rekomendasi.

Pemeriksaan pertama belum membaca kode. Prompt tindak lanjut yang disiapkan pada docs/notebooklm-review-awal.md meminta konfirmasi fungsi dan penilaian kode final. Respons terbaru yang dikirim pengguna telah memenuhi konfirmasi fungsi tersebut; bukti kesamaan seluruh prompt yang benar-benar dikirim belum berupa screenshot percakapan. Respons lengkap dan screenshot sumber telah disimpan, dengan ringkasan serta batas verifikasi pada docs/notebooklm-hasil.md. Locator yang belum diperiksa terhadap sumber asli diberi status belum terverifikasi.
