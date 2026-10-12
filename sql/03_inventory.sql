-- Soal 2: implementasi minimal sesuai instruksi 2.1.
BEGIN;
CREATE TABLE public.inventory_items (
    item_id VARCHAR(10) PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    unit_cost NUMERIC(15,2) NOT NULL CHECK (unit_cost >= 0 AND unit_cost <> 'NaN'::numeric)
);
CREATE TABLE public.inventory_transactions (
    trx_id SERIAL PRIMARY KEY,
    item_id VARCHAR(10) NOT NULL REFERENCES public.inventory_items(item_id) ON DELETE RESTRICT,
    trx_type VARCHAR(10) NOT NULL CHECK (trx_type IN ('PURCHASE','SALE','ADJUSTMENT')),
    qty INT NOT NULL,
    trx_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_inventory_qty CHECK (
        (trx_type IN ('PURCHASE','SALE') AND qty > 0)
        OR (trx_type = 'ADJUSTMENT' AND qty <> 0)
    )
);
CREATE INDEX inventory_transactions_item_idx ON public.inventory_transactions(item_id);

CREATE FUNCTION public.trg_update_stock_and_journal() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE current_qty BIGINT; delta_qty BIGINT; next_qty BIGINT;
BEGIN
    -- BEFORE INSERT: validasi lebih awal sebelum melakukan mutasi stok.
    IF NEW.trx_type IS NULL OR NEW.qty IS NULL OR NEW.item_id IS NULL THEN
        RAISE EXCEPTION 'Item, jenis transaksi, dan kuantitas wajib diisi';
    END IF;
    IF NEW.trx_type IN ('PURCHASE','SALE') THEN
        IF NEW.qty <= 0 THEN RAISE EXCEPTION 'Kuantitas pembelian/penjualan harus positif'; END IF;
    ELSIF NEW.trx_type = 'ADJUSTMENT' THEN
        IF NEW.qty = 0 THEN RAISE EXCEPTION 'Adjustment tidak boleh nol'; END IF;
    ELSE RAISE EXCEPTION 'Jenis transaksi tidak valid'; END IF;

    -- Tidak mengubah key item; NO KEY UPDATE menghindari konflik tidak perlu
    -- dengan lock KEY SHARE dari pengecekan foreign key.
    SELECT stock_qty INTO current_qty FROM public.inventory_items
    WHERE item_id = NEW.item_id FOR NO KEY UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item % tidak ditemukan', NEW.item_id; END IF;
    delta_qty := CASE WHEN NEW.trx_type = 'SALE' THEN -(NEW.qty::bigint) ELSE NEW.qty::bigint END;
    next_qty := current_qty + delta_qty;
    IF next_qty < 0 THEN
        RAISE EXCEPTION 'Stok tidak cukup untuk %: tersedia %, perubahan %',
            NEW.item_id,current_qty,delta_qty;
    END IF;
    IF next_qty > 2147483647 THEN RAISE EXCEPTION 'Kuantitas melebihi kapasitas INT'; END IF;
    UPDATE public.inventory_items SET stock_qty = next_qty::int WHERE item_id = NEW.item_id;
    RETURN NEW;
END $$;
CREATE TRIGGER trg_update_stock_and_journal
BEFORE INSERT ON public.inventory_transactions FOR EACH ROW
EXECUTE FUNCTION public.trg_update_stock_and_journal();

-- Riwayat mutasi hanya ditambah; koreksi memakai transaksi kompensasi.
CREATE FUNCTION public.guard_inventory_history() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'Riwayat stok tidak boleh diubah/dihapus; gunakan transaksi kompensasi'; END $$;
CREATE TRIGGER guard_inventory_history BEFORE UPDATE OR DELETE
ON public.inventory_transactions FOR EACH ROW EXECUTE FUNCTION public.guard_inventory_history();
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inventory_items,public.inventory_transactions FROM anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_update_stock_and_journal(),public.guard_inventory_history() FROM PUBLIC;
COMMIT;
