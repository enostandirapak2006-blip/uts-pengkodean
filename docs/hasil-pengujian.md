# Hasil pengujian

Database: Supabase proyek uts-pengkodean, PostgreSQL 17.11. Hasil di bawah berasal dari eksekusi SQL melalui koneksi administratif pada 12 Oktober 2026 UTC. Data uji voucher di-rollback; nomor identity/sequence tetap dapat bertambah. Dua item uji RACE01/RACE02 dan transaksi penjualannya masih disimpan sebagai data demonstrasi.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| DDL tabel dan trigger nomor 1–2 | Berhasil dipasang pada schema public yang semula kosong |
| Pembelian/penjualan dan adjustment bertanda | Lulus assertion SQL |
| Stok negatif dan input tidak valid | Ditolak; stok tidak berubah |
| INSERT gagal setelah trigger | Perubahan stok di-rollback |
| UPDATE/DELETE riwayat stok | Ditolak |
| Dua permintaan SALE, stok 1, RACE01 | Satu berhasil, satu error stok 0; saldo akhir 0 dan satu transaksi tersimpan |
| Skenario rollback permintaan pertama, RACE02 | Belum konklusif: urutan eksekusi konektor tidak terjamin; permintaan yang dimaksud sebagai sesi B justru selesai lebih dahulu |
| RPC voucher dengan role authenticated dan klaim uji | Berhasil POSTED |
| Jurnal tidak seimbang lewat RPC | Ditolak; header parsial tidak tersimpan |
| Checksum jurnal POSTED | verify_journal menghasilkan true |
| UPDATE header/DELETE baris POSTED sebagai pengguna | Nol baris terpengaruh oleh RLS; data tetap |
| Jurnal pembalik dan checksum pembalik | Lulus assertion SQL |
| Audit perubahan header/baris | Log tercatat dan lulus assertion jumlah minimum |
| Identitas uji pengguna kedua | Tidak dapat melihat header pengguna pertama (0 baris) |
| Frontend kalkulasi uang | Lulus Node assertion presisi 0.1 + 0.2, nominal besar, nol, negatif, dan ketidakseimbangan |
| JavaScript frontend | Lulus node --check |
| Advisor keamanan | Tidak ada warning pada hasil terakhir; 2 info tabel stok RLS tanpa policy karena akses aplikasi masih ditutup |
| Login dan UI browser | Belum diuji end-to-end |
| Gemini Canvas / NotebookLM | Belum dijalankan |

Uji RACE01 memakai dua permintaan konektor bersamaan dan penundaan singkat, tetapi waktu mulai sesi tidak terjamin. Hasil mendukung pencegahan overselling; bukti bahwa sesi benar-benar menunggu lock dan skenario rollback perlu diulang dengan dua koneksi terkontrol mengikuti tests/02_concurrency.md.
