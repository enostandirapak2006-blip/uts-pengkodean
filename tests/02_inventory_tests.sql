-- Jalankan setelah 03_inventory.sql di database tugas, bukan produksi.
-- Semua data pengujian di-rollback. Nomor sequence dapat tetap bertambah.
BEGIN;
DO $$
DECLARE q INT; n BIGINT;
BEGIN
    INSERT INTO public.inventory_items VALUES ('TEST02','Item uji',0,10000);
    INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02','PURCHASE',5);
    SELECT stock_qty INTO q FROM public.inventory_items WHERE item_id='TEST02';
    IF q <> 5 THEN RAISE EXCEPTION 'FAIL purchase'; END IF;
    INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02','SALE',2);
    SELECT stock_qty INTO q FROM public.inventory_items WHERE item_id='TEST02';
    IF q <> 3 THEN RAISE EXCEPTION 'FAIL sale'; END IF;
    BEGIN
        INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02','SALE',4);
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL overselling accepted';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    SELECT stock_qty INTO q FROM public.inventory_items WHERE item_id='TEST02';
    SELECT count(*) INTO n FROM public.inventory_transactions WHERE item_id='TEST02';
    IF q <> 3 OR n <> 2 THEN RAISE EXCEPTION 'FAIL rejected sale changed data'; END IF;
    INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02','ADJUSTMENT',-1),('TEST02','ADJUSTMENT',2);
    SELECT stock_qty INTO q FROM public.inventory_items WHERE item_id='TEST02';
    IF q <> 4 THEN RAISE EXCEPTION 'FAIL adjustment'; END IF;
    BEGIN
        INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02','SALE',-1);
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL negative sale accepted';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    BEGIN
        INSERT INTO public.inventory_transactions(item_id,trx_type,qty) VALUES ('TEST02',NULL,1);
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL null type accepted';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    BEGIN
        INSERT INTO public.inventory_transactions(item_id,trx_type,qty,trx_date) VALUES ('TEST02','PURCHASE',9,NULL);
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL null date accepted';
    EXCEPTION WHEN not_null_violation THEN NULL; END;
    SELECT stock_qty INTO q FROM public.inventory_items WHERE item_id='TEST02';
    IF q <> 4 THEN RAISE EXCEPTION 'FAIL failed insert did not roll back stock'; END IF;
    BEGIN
        UPDATE public.inventory_transactions SET qty=99 WHERE item_id='TEST02';
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL history update accepted';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    BEGIN
        DELETE FROM public.inventory_transactions WHERE item_id='TEST02';
        RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL history delete accepted';
    EXCEPTION WHEN raise_exception THEN NULL; END;
    RAISE NOTICE 'PASS: inventory assertions';
END $$;
ROLLBACK;
