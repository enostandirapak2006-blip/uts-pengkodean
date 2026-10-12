# Jawaban Soal 2

## 2.1 Otomatisasi mutasi via database trigger

Implementasi lengkap FUNCTION dan TRIGGER bernama trg_update_stock_and_journal ada pada sql/03_inventory.sql. PURCHASE menambah stok; SALE mengurangi stok. Keduanya menerima qty positif. ADJUSTMENT menggunakan qty bertanda: positif menambah, negatif mengurangi. Asumsi ini diperlukan karena soal tidak menentukan arah adjustment atau jenis retur tersendiri.

Trigger BEFORE INSERT memvalidasi input, mengunci item, menghitung saldo baru, menolak saldo negatif dengan RAISE EXCEPTION, lalu memperbarui stock_qty. BIGINT digunakan untuk perhitungan antara agar penjumlahan INT tidak overflow sebelum pengecekan. Saldo akhirnya tetap INT sesuai struktur soal.

INSERT mutasi dan UPDATE stok berada dalam transaksi yang sama. Jika trigger atau constraint lain gagal, perubahan statement dibatalkan, termasuk stok yang sempat dimutakhirkan. Dalam transaksi eksplisit, error yang tidak ditangani membuat transaksi gagal sampai ROLLBACK. Bila aplikasi menggunakan savepoint/exception handler, hanya bagian transaksi dalam subtransaksi tersebut yang dibatalkan. Tidak ada COMMIT di dalam trigger.

Tambahan NOT NULL dan CHECK kuantitas mencegah jenis/qty kosong serta penjualan negatif yang justru menambah stok. Penolakan UPDATE/DELETE riwayat mencegah perubahan transaksi lama tanpa penyesuaian stok. Role aplikasi juga harus dilarang melakukan TRUNCATE, menonaktifkan trigger, dan mengubah stock_qty langsung; pembatasan hak akses akan dilengkapi pada Soal 3. Trigger stok tidak dipanggil manual dari aplikasi: aplikasi cukup INSERT inventory_transactions, tanpa UPDATE stok kedua kali.

Nama fungsi mengikuti soal. Instruksi 2.1 a-b hanya mewajibkan mutasi kuantitas dan pencegahan stok negatif; fungsi minimal ini belum membukukan nominal ke general ledger. Untuk memenuhi konteks sistem perpetual secara penuh, pengembangan berikutnya perlu menghasilkan jurnal terkait dalam transaksi yang sama. SALE menghasilkan Debit HPP dan Kredit Persediaan sebesar qty x biaya tercatat, sedangkan PURCHASE menghasilkan Debit Persediaan dan Kredit Utang/Kas. Sisi lawan PURCHASE memerlukan informasi pembayaran yang tidak diberikan soal; adjustment memerlukan alasan untuk memilih akun lawan. Retur pelanggan/pemasok juga memerlukan jenis dan referensi transaksi asli.

Jika digunakan unit_cost tetap sebagai asumsi prototipe, asumsi itu harus disebutkan. Sistem sebenarnya perlu menetapkan metode biaya (misalnya FIFO atau rata-rata tertimbang), biaya historis per mutasi, dan akun lawan. Saldo nominal tidak boleh diklaim sinkron dengan buku besar hanya karena stock_qty sudah diperbarui.

## 2.2 Penanganan concurrency

Pada READ COMMITTED, SELECT biasa dapat membuat dua kasir sama-sama membaca stok 1, lalu keduanya menjual 1. Trigger menggunakan SELECT FOR NO KEY UPDATE untuk item yang sama. Lock ini cukup karena hanya stock_qty yang diperbarui; SELECT FOR UPDATE juga dapat digunakan. Kasir B menunggu lock kasir A. Setelah A commit, B membaca versi terbaru dengan stok 0, sehingga penjualan B ditolak. Jika A rollback, B dapat menjual stok 1 tersebut. Lock ditahan sampai transaksi berakhir.

Kondisi ini merupakan perebutan baris stok dan risiko overselling, bukan phantom read dalam pengertian teknis penambahan baris hasil pencarian.

Contoh aplikasi tidak perlu membaca stok sebelum INSERT karena penguncian sudah dilakukan trigger:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
INSERT INTO public.inventory_transactions(item_id,trx_type,qty)
VALUES ('RACE01','SALE',1);
COMMIT;
```

Contoh eksplisit SELECT FOR UPDATE yang diminta soal:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SELECT stock_qty FROM public.inventory_items
WHERE item_id = 'RACE01' FOR UPDATE;
-- INSERT tetap diperiksa trigger; jangan mengurangi stok lagi di aplikasi.
INSERT INTO public.inventory_transactions(item_id,trx_type,qty)
VALUES ('RACE01','SALE',1);
COMMIT;
```

Alternatif SERIALIZABLE memerlukan retry seluruh transaksi untuk SQLSTATE 40001, dengan jumlah percobaan terbatas. Deadlock 40P01 juga dapat memerlukan retry. Untuk transaksi banyak item, ambil lock dengan urutan item_id yang konsisten dan buat transaksi singkat. Hindari interaksi pengguna saat lock ditahan. Idempotency key diperlukan pada API untuk mencegah pencatatan ulang saat retry jaringan dengan hasil commit yang tidak diketahui.

## Pengujian

tests/02_inventory_tests.sql menyediakan assertion pembelian, penjualan, penolakan stok negatif, adjustment, input tidak valid, riwayat immutable, dan rollback stok jika INSERT gagal setelah trigger. tests/02_concurrency.md menjelaskan uji dua sesi. Keduanya belum dieksekusi pada PostgreSQL; status ini harus diperbarui dengan hasil nyata sebelum pengumpulan final.

## Referensi

- https://www.postgresql.org/docs/current/plpgsql-trigger.html
- https://www.postgresql.org/docs/current/explicit-locking.html
- https://www.postgresql.org/docs/current/transaction-iso.html
