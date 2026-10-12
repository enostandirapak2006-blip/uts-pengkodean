# Panduan verifikasi NotebookLM

Gunakan akun Google yang telah dipilih pengguna. Buat notebook untuk UTS Coding Akuntansi.

## Sumber akuntansi

Tambahkan URL berikut sebagai sumber terpisah:

1. IAI, halaman PSAK 207 Laporan Arus Kas: https://web.iaiglobal.or.id/PSAK-Umum/8
2. IAI, Modul CAFB Akuntansi Keuangan 2025, halaman web 163 (halaman tercetak 151), definisi kas dan setara kas: https://web.iaiglobal.or.id/assets/materi/Sertifikasi/CA/modul/ak/files/basic-html/page163.html
3. IFRS Foundation, ringkasan IAS 7 (sumber pendukung internasional): https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/

Halaman di atas telah dibaca dalam sesi pengerjaan. PSAK 2 berganti penomoran menjadi PSAK 207 efektif 1 Januari 2024 menurut halaman IAI. Ringkasan publik/modul bukan teks standar lengkap. Tambahkan materi PSAK dari dosen atau akses berlisensi jika tersedia. IAS 7 adalah pendukung, bukan pengganti otomatis semua ketentuan PSAK versi yang berlaku.

## Sumber implementasi

Unggah docs/notebooklm-kode.txt (atau salin isinya sebagai sumber teks). Jangan masukkan password, secret key, access token, atau informasi pribadi.

## Pemeriksaan

Jalankan prompt NotebookLM pada docs/prompt-ai.md. Periksa apakah semua sumber benar-benar berhasil diimpor. Simpan respons lengkap, daftar sumber, dan screenshot kutipan sumber yang dibuka, lalu kirim hasil kepada penyusun jawaban untuk tinjauan manual.

Fokus tinjauan: klasifikasi kas dan setara kas, apakah akun Bank benar-benar memenuhi karakteristik kas, pengeluaran kas dibanding transfer antarkas/nonkas, cakupan prototipe, serta pembedaan ketentuan standar dari kontrol teknis debit-kredit/checksum/immutability. Jangan menyimpulkan kepatuhan penuh hanya dari label is_cash atau keseimbangan jurnal.

Status hasil NotebookLM: belum tersedia. Panduan ini tidak merupakan hasil verifikasi NotebookLM.
