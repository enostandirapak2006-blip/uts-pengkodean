# Jawaban Soal 3

## 3.1 Form kas keluar dan orkestrasi AI

Prototipe frontend React terdapat pada frontend/. Form memuat tanggal, nomor bukti, deskripsi, dan baris akun yang dapat ditambah/dihapus. Total debit/kredit dihitung langsung; Submit hanya aktif jika minimal dua baris, nominal valid, total debit = kredit > 0, satu akun kas/bank di kredit dan akun lawan di debit. Nominal frontend dihitung dalam sen menggunakan BigInt untuk menghindari selisih floating point. Database memakai NUMERIC dan tetap memvalidasi semua input, sehingga bypass frontend tidak menghilangkan pemeriksaan.

Frontend saat ini dibuat dalam sesi pengerjaan ini, BELUM melalui Gemini Canvas. Penggunaan Gemini Canvas dan NotebookLM belum dilakukan. Prompt siap pakai tersedia pada docs/prompt-ai.md; hasil nyata dan sumber yang digunakan harus dilampirkan sebelum jawaban final dikumpulkan. Jangan menganggap bagian ini sudah memenuhi persyaratan orkestrasi AI.

## 3.2 Backend dan pengendalian audit

SQL lengkap pada sql/04_cash_backend.sql. Supabase RPC submit_cash_voucher menerima tanggal, nomor bukti, deskripsi dan array baris. Fungsi SECURITY INVOKER memeriksa auth.uid(), memvalidasi input, membuat header DRAFT, menambahkan baris, lalu melakukan posting. Semua langkah dalam satu transaksi; kegagalan membatalkan keseluruhan voucher. RLS membatasi akses jurnal pada pembuatnya. Akun master dapat dibaca pengguna login tetapi tidak diubah lewat frontend. Pengguna anonim tidak diberi akses jurnal maupun RPC.

Trigger database menolak UPDATE/DELETE header POSTED dan perubahan barisnya. RLS juga membatasi update/delete pada DRAFT; pada API pengguna, upaya perubahan POSTED dapat menghasilkan nol baris terpengaruh. Aplikasi tidak boleh menafsirkannya sebagai perubahan berhasil. Koreksi dilakukan lewat reverse_journal: membuat header baru dengan reversal_of mengacu jurnal asli, menukar debit/kredit seluruh baris, lalu memposting jurnal baru. UNIQUE pada reversal_of mencegah dua pembalik langsung untuk jurnal asal yang sama.

created_by diisi dari identitas login yang diverifikasi Supabase Auth, bukan ID yang dikirim klien. created_at ditetapkan oleh database dan kedua field tidak dapat diubah. Audit AFTER trigger mencatat INSERT/UPDATE/DELETE header dan baris dengan actor_id, waktu, data lama serta data baru. Audit log append-only untuk role aplikasi; perubahan log juga ditolak trigger. Aksi SQL administratif dapat memiliki actor_id NULL, sehingga tetap perlu log administrasi eksternal.

Audit trigger SECURITY DEFINER diperlukan khusus agar log bisa ditulis meski klien hanya punya akses baca. Fungsi itu berada di schema private, mempunyai search_path kosong dan hak EXECUTE langsung dicabut. RPC bisnis tetap SECURITY INVOKER dan mengikuti RLS. Fungsi checksum private mendapat izin execute untuk role authenticated, tetapi pembacaan baris tetap mengikuti RLS.

hash_checksum menggunakan SHA-256 atas JSONB dengan versi format, atribut header serta baris yang diurutkan berdasarkan id. created_at direpresentasikan sebagai epoch supaya timezone sesi tidak mengubah digest. Hash dihitung saat posting dan verify_journal menghitung ulang untuk membandingkan. Digest membantu mendeteksi perubahan isi setelah posting; bukan tanda tangan digital atau perlindungan terhadap administrator yang dapat mengubah isi dan hash sekaligus. Perubahan master akun tidak tercakup dalam digest, sehingga master akun juga harus dikendalikan dan diaudit pada sistem produksi.

## Cara menjalankan prototipe

Jalankan `python3 -m http.server 8000 --directory frontend` dari root repo, lalu buka http://localhost:8000. React/React DOM dipatok versi 19.2.0 melalui CDN; memerlukan internet. Tidak menggunakan package manager atau bundler.

Di Supabase Dashboard, buat pengguna aplikasi lewat Authentication > Users. Akun dashboard Supabase tidak otomatis menjadi pengguna aplikasi. Ambil Publishable key proyek melalui pengaturan API, kemudian masukkan pada form login bersama email/password pengguna aplikasi. Jangan memakai secret/service_role key. Key dan access token hanya disimpan pada state memori halaman. Prototipe tidak melakukan refresh session otomatis; bila token kedaluwarsa, keluar lalu login ulang. Gunakan HTTPS saat dihosting selain localhost.

Daftar akun awal telah disediakan, termasuk Kas, Bank, Persediaan, Utang, HPP, dan Beban Operasional. Penandaan is_cash dikendalikan administrator. Klasifikasi kas/setara kas harus ditinjau terhadap sumber akuntansi melalui NotebookLM sebelum penggunaan final. Prototipe kas keluar tidak mencakup transfer antarkas, valuta asing, pajak, approval berjenjang, atau periode tutup buku.

## Batas verifikasi saat ini

Backend diuji pada PostgreSQL Supabase 17.11 menggunakan role authenticated dan klaim identitas uji melalui SQL administratif, bukan token login pengguna nyata. Browser frontend dan alur login end-to-end belum diuji. Advisor terakhir tidak melaporkan warning fungsi; dua info RLS tanpa policy pada tabel stok disengaja karena tabel itu hanya digunakan melalui SQL administratif pada tahap ini. Detail hasil ada pada docs/hasil-pengujian.md.
