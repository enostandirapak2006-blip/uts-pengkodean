# UTS Coding Akuntansi

Tahap saat ini: SQL nomor 1–2 dan backend/frontend awal nomor 3. Belum jawaban final seluruh soal; bukti Gemini Canvas, NotebookLM, login/UI browser, dan PDF final masih diperlukan.

Urutan SQL pada PostgreSQL/Supabase proyek tugas kosong:

1. sql/01_schema.sql
2. sql/02_posting_guard.sql
3. sql/03_inventory.sql
4. sql/04_cash_backend.sql

Jawaban Soal 2: docs/soal-2.md. Uji stok: tests/02_inventory_tests.sql dan tests/02_concurrency.md. Hasil terbaru pada docs/hasil-pengujian.md menggantikan status belum diuji dalam draf awal. Trigger persediaan minimal menangani kuantitas sesuai instruksi eksplisit; integrasi nominal jurnal memerlukan asumsi tambahan yang dijelaskan dalam jawaban.

Jawaban dan ERD: docs/soal-1.md. Jawaban backend, cara menjalankan frontend, serta batas verifikasi: docs/soal-3.md. Kode sudah dipasang dan diuji pada Supabase; status rinci pada docs/hasil-pengujian.md. Jalankan `node tests/money.test.mjs` untuk uji perhitungan frontend. Ini prototipe akademik, belum konfigurasi produksi.

Rencana lanjutan: uji browser/login dan concurrency terkontrol, bukti Gemini Canvas/NotebookLM, kemudian PDF. Kredensial tidak disimpan di repo. React melalui CDN dipatok ke 19.2.0; membutuhkan internet.
