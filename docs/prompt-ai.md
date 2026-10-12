# Prompt dan bukti AI

Status: prompt berikut belum dijalankan di Gemini Canvas atau NotebookLM. Bagian respons sengaja belum diisi. Dokumentasi ini adalah persiapan, bukan bukti penggunaan.

## Gemini Canvas

Prompt yang akan digunakan:

> Buat dan tampilkan prototipe formulir Voucher Kas Keluar berbasis React dalam bahasa Indonesia. Form memiliki tanggal, nomor bukti, deskripsi, dan baris jurnal dinamis: akun, debit, kredit. Akun master: Kas, Bank, Persediaan, Utang Usaha, HPP, Beban Operasional. Hitung total secara langsung dengan aritmetika sen integer, jangan floating point untuk uang. Submit hanya aktif jika minimal dua baris, tiap baris memiliki tepat satu nominal positif, total debit sama dengan kredit dan lebih dari nol, tepat satu baris akun Kas/Bank di kredit, serta akun lawan di debit. Tambahkan indikator balance yang aksesibel dan pesan error. Gunakan tampilan bersih bernuansa hijau, responsif. Backend Supabase RPC submit_cash_voucher menerima p_date, p_reference, p_description, p_lines; setiap baris berisi account_id, debit, credit sebagai string desimal. Jangan gunakan service_role key atau mengklaim koneksi database sudah berhasil. Jelaskan keputusan validasi dan batasan form.

Setelah dijalankan: catat tanggal, prompt aktual jika diedit, respons, tautan/bukti Canvas, dan perubahan yang diadopsi. Bandingkan kode Canvas dengan frontend/app.mjs; jangan mengganti pengamanan backend dengan validasi frontend.

## NotebookLM

Sumber yang perlu dimasukkan: materi resmi/berlisensi dari dosen atau IAI mengenai standar kas dan setara kas (gunakan penomoran dan versi yang berlaku dalam materi), serta docs/soal-3.md dan file kode frontend/backend. Verifikasi judul/versi sumber sebelum digunakan. Tidak mengunggah password, API secret, token pengguna, atau data transaksi pribadi.

Prompt yang akan digunakan:

> Berdasarkan hanya sumber yang dimasukkan, tinjau logika prototipe Voucher Kas Keluar ini terhadap ketentuan pengakuan dan klasifikasi kas serta setara kas. Untuk setiap kesimpulan, sertakan kutipan sumber/locator yang dapat diperiksa. Periksa definisi kas dan setara kas, batasan instrumen yang memenuhi klasifikasi, arah jurnal kas keluar, penggunaan akun lawan, perlakuan transaksi tanpa perubahan kas, koreksi melalui jurnal pembalik, dan aspek yang tidak bisa dipastikan hanya dari kode. Pisahkan aturan standar akuntansi dari kontrol teknis yang merupakan keputusan desain. Jangan menyatakan bahwa seluruh sistem patuh PSAK hanya karena jurnal seimbang. Buat tabel aturan, bukti kode, hasil memenuhi/belum memenuhi/tidak dapat dinilai, dan rekomendasi.

Setelah dijalankan: simpan daftar sumber, prompt aktual, respons lengkap, ringkasan verifikasi, serta hasil cek manual kutipan. Jika sumber tidak mendukung suatu klaim, beri status belum terverifikasi. Ringkasan verifikasi aktual: BELUM TERSEDIA.
