-- Pengamanan tambahan konteks Soal 1; akan dilengkapi audit log pada Soal 3.
BEGIN;
CREATE FUNCTION public.guard_journal_header() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE n BIGINT; d NUMERIC; c NUMERIC;
BEGIN
    IF TG_OP <> 'INSERT' AND OLD.status_posting = 'POSTED' THEN
        RAISE EXCEPTION 'Jurnal POSTED tidak boleh diubah atau dihapus; gunakan jurnal pembalik';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF TG_OP = 'INSERT' AND NEW.status_posting <> 'DRAFT' THEN
        RAISE EXCEPTION 'Jurnal baru wajib berstatus DRAFT';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'ID jurnal tidak boleh diubah';
    END IF;
    IF NEW.status_posting = 'POSTED' THEN
        SELECT count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
        INTO n,d,c FROM public.journal_lines WHERE header_id = NEW.id;
        IF n < 2 OR d <= 0 OR d <> c THEN
            RAISE EXCEPTION 'Posting ditolak: minimal dua baris dan total debit = kredit > 0';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_journal_header BEFORE INSERT OR UPDATE OR DELETE
ON public.journal_headers FOR EACH ROW EXECUTE FUNCTION public.guard_journal_header();

CREATE FUNCTION public.guard_journal_line() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE target_id BIGINT; s TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.header_id <> OLD.header_id THEN
        RAISE EXCEPTION 'Baris tidak boleh dipindahkan ke header lain';
    END IF;
    IF TG_OP = 'DELETE' THEN target_id := OLD.header_id;
    ELSE target_id := NEW.header_id; END IF;
    -- Semua perubahan baris menggunakan lock header yang sama dengan posting.
    SELECT status_posting INTO s FROM public.journal_headers
        WHERE id = target_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Header jurnal tidak ditemukan'; END IF;
    IF s <> 'DRAFT' THEN RAISE EXCEPTION 'Baris jurnal POSTED tidak boleh diubah'; END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guard_journal_line BEFORE INSERT OR UPDATE OR DELETE
ON public.journal_lines FOR EACH ROW EXECUTE FUNCTION public.guard_journal_line();
REVOKE EXECUTE ON FUNCTION public.guard_journal_header(),public.guard_journal_line() FROM PUBLIC;
COMMIT;
