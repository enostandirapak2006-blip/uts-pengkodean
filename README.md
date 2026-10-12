# UTS Coding Akuntansi

Tahap saat ini: SQL nomor 1–2, backend nomor 3, hasil Gemini Canvas yang diperbaiki, dan penilaian kode melalui NotebookLM. Bukti pada evidence/gemini/ dan evidence/notebooklm/; prompt dan tinjauan manual pada docs/. Login/UI browser dan PDF final masih perlu diselesaikan.

Urutan SQL pada PostgreSQL/Supabase proyek tugas kosong:

1. sql/01_schema.sql
2. sql/02_posting_guard.sql
3. sql/03_inventory.sql
4. sql/04_cash_backend.sql

Jawaban Soal 2: docs/soal-2.md. Uji stok: tests/02_inventory_tests.sql dan tests/02_concurrency.md. Hasil terbaru pada docs/hasil-pengujian.md menggantikan status belum diuji dalam draf awal. Trigger persediaan minimal menangani kuantitas sesuai instruksi eksplisit; integrasi nominal jurnal memerlukan asumsi tambahan yang dijelaskan dalam jawaban.

Jawaban dan ERD: docs/soal-1.md. Jawaban backend, cara menjalankan frontend, serta batas verifikasi: docs/soal-3.md. Kode sudah dipasang dan diuji pada Supabase; status rinci pada docs/hasil-pengujian.md. Jalankan `node tests/money.test.mjs` untuk uji perhitungan frontend. Ini prototipe akademik, belum konfigurasi produksi.

Form Canvas: `npm ci`, `npm run build`, `npm run preview`, buka http://localhost:8000. Isi publishable key dan login memakai pengguna Supabase Auth aplikasi. Form ini berasal dari Gemini Canvas dan diperbaiki sesuai docs/gemini-review.md.

Frontend pemeriksaan audit/pembalik pada frontend/ tetap tersedia dengan cara menjalankan yang tercantum dalam docs/soal-3.md. `npm test` menjalankan assertion nominal serta aturan voucher. Kredensial tidak disimpan di repo.

Rencana lanjutan: uji browser/login dan concurrency terkontrol, kemudian PDF. Verifikasi AI tidak merupakan sertifikasi kepatuhan penuh PSAK; batas penilaian tercatat pada docs/notebooklm-hasil.md.
