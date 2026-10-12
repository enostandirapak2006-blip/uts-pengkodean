# Uji concurrency dua sesi

Gunakan dua koneksi PostgreSQL berbeda ke database tugas yang sama. Jangan menyimpulkan concurrency lulus dari dua INSERT berurutan pada satu koneksi.

Setup satu kali pada item uji baru:

```sql
INSERT INTO public.inventory_items VALUES ('RACE01','Item uji concurrency',1,10000);
```

Sesi A, jangan commit dulu:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('RACE01','SALE',1);
```

Sesi B:

```sql
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout = '30s';
INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('RACE01','SALE',1);
```

Dalam 30 detik, jalankan COMMIT pada sesi A. Sesi B seharusnya berhenti menunggu lalu memperoleh error stok tidak cukup, bukan berhasil atau lock timeout. Jalankan ROLLBACK pada B. Verifikasi stok RACE01 = 0 dan jumlah transaksi SALE RACE01 = 1. Ulangi dengan item baru RACE02, tetapi ROLLBACK pada A; B seharusnya berhasil, lalu COMMIT B. Verifikasi stok 0 dan hanya satu SALE tersimpan.

Status: belum dijalankan. Catat hasil aktual kedua skenario dan versi PostgreSQL setelah pengujian.
