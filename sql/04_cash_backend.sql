BEGIN;
ALTER FUNCTION public.guard_inventory_history() SET search_path = pg_catalog, public;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.chart_of_accounts ADD COLUMN is_cash BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.journal_headers
 ADD COLUMN created_by UUID DEFAULT auth.uid(),
 ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 ADD COLUMN hash_checksum TEXT,
 ADD COLUMN reversal_of BIGINT UNIQUE REFERENCES public.journal_headers(id) ON DELETE RESTRICT;
CREATE INDEX journal_headers_created_by_idx ON public.journal_headers(created_by);
CREATE TABLE public.audit_logs (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 table_name TEXT NOT NULL,
 record_id BIGINT NOT NULL,
 operation TEXT NOT NULL,
 actor_id UUID,
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 before_data JSONB,
 after_data JSONB
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM anon, authenticated;

CREATE FUNCTION private.journal_digest(h public.journal_headers) RETURNS TEXT
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT encode(extensions.digest(convert_to(jsonb_build_object(
   'version',1,'id',h.id,'date',h.transaction_date,'reference',h.reference_no,
   'description',h.description,'status',h.status_posting,'created_by',h.created_by,
   'created_at_epoch',extract(epoch FROM h.created_at),'reversal_of',h.reversal_of,
   'lines',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id,'account',l.account_id,
     'debit',l.debit,'credit',l.credit) ORDER BY l.id),'[]'::jsonb)
     FROM public.journal_lines l WHERE l.header_id=h.id)
 )::text,'UTF8'),'sha256'),'hex');
$$;
-- Trigger menghitung checksum, bukan menerima checksum dari frontend.
CREATE FUNCTION private.stamp_journal() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   NEW.created_by := auth.uid(); NEW.created_at := clock_timestamp(); NEW.hash_checksum := NULL;
   IF NEW.reversal_of IS NOT NULL THEN
     IF NOT EXISTS(SELECT 1 FROM public.journal_headers WHERE id=NEW.reversal_of
       AND status_posting='POSTED' AND created_by=auth.uid()) THEN
       RAISE EXCEPTION 'Jurnal asal pembalik tidak valid';
     END IF;
   END IF;
 ELSE
   IF NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.reversal_of IS DISTINCT FROM OLD.reversal_of THEN
     RAISE EXCEPTION 'Metadata pembuat dan referensi pembalik tidak boleh diubah';
   END IF;
   IF NEW.status_posting='POSTED' AND OLD.status_posting='DRAFT' THEN
     NEW.hash_checksum := private.journal_digest(NEW);
   ELSE NEW.hash_checksum := OLD.hash_checksum; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER a_stamp_journal BEFORE INSERT OR UPDATE ON public.journal_headers
FOR EACH ROW EXECUTE FUNCTION private.stamp_journal();

-- SECURITY DEFINER terbatas untuk menulis audit log yang tidak writable oleh klien.
CREATE FUNCTION private.capture_journal_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.audit_logs(table_name,record_id,operation,actor_id,before_data,after_data)
 VALUES(TG_TABLE_NAME,CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END,TG_OP,auth.uid(),
   CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END);
 RETURN NULL;
END $$;
CREATE TRIGGER capture_header_audit AFTER INSERT OR UPDATE OR DELETE ON public.journal_headers
FOR EACH ROW EXECUTE FUNCTION private.capture_journal_audit();
CREATE TRIGGER capture_line_audit AFTER INSERT OR UPDATE OR DELETE ON public.journal_lines
FOR EACH ROW EXECUTE FUNCTION private.capture_journal_audit();
CREATE FUNCTION private.reject_audit_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN RAISE EXCEPTION 'Audit log append-only'; END $$;
CREATE TRIGGER reject_audit_change BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION private.reject_audit_change();

GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.journal_digest(public.journal_headers) TO authenticated;
-- Pemanggilan trigger tidak memerlukan EXECUTE langsung dari klien.
GRANT SELECT ON public.chart_of_accounts TO authenticated;
CREATE POLICY read_accounts ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_headers,public.journal_lines TO authenticated;
GRANT USAGE ON SEQUENCE public.journal_headers_id_seq, public.journal_lines_id_seq TO authenticated;
CREATE POLICY read_own_headers ON public.journal_headers FOR SELECT TO authenticated USING(created_by=(SELECT auth.uid()));
CREATE POLICY insert_own_headers ON public.journal_headers FOR INSERT TO authenticated WITH CHECK(created_by=(SELECT auth.uid()) AND status_posting='DRAFT');
CREATE POLICY update_own_headers ON public.journal_headers FOR UPDATE TO authenticated
 USING(created_by=(SELECT auth.uid()) AND status_posting='DRAFT') WITH CHECK(created_by=(SELECT auth.uid()));
CREATE POLICY delete_own_drafts ON public.journal_headers FOR DELETE TO authenticated
 USING(created_by=(SELECT auth.uid()) AND status_posting='DRAFT');
CREATE POLICY read_own_lines ON public.journal_lines FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.journal_headers h WHERE h.id=header_id AND h.created_by=(SELECT auth.uid())));
CREATE POLICY insert_own_lines ON public.journal_lines FOR INSERT TO authenticated
 WITH CHECK(EXISTS(SELECT 1 FROM public.journal_headers h WHERE h.id=header_id AND h.created_by=(SELECT auth.uid()) AND h.status_posting='DRAFT'));
CREATE POLICY update_own_lines ON public.journal_lines FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.journal_headers h WHERE h.id=header_id AND h.created_by=(SELECT auth.uid()) AND h.status_posting='DRAFT'))
 WITH CHECK(EXISTS(SELECT 1 FROM public.journal_headers h WHERE h.id=header_id AND h.created_by=(SELECT auth.uid()) AND h.status_posting='DRAFT'));
CREATE POLICY delete_own_lines ON public.journal_lines FOR DELETE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.journal_headers h WHERE h.id=header_id AND h.created_by=(SELECT auth.uid()) AND h.status_posting='DRAFT'));
GRANT SELECT ON public.audit_logs TO authenticated;
CREATE POLICY read_own_audit ON public.audit_logs FOR SELECT TO authenticated USING(actor_id=(SELECT auth.uid()));

CREATE FUNCTION public.submit_cash_voucher(p_date DATE,p_reference TEXT,p_description TEXT,p_lines JSONB)
RETURNS BIGINT LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE h BIGINT; r JSONB; cash_count INT:=0; a public.chart_of_accounts; d NUMERIC; c NUMERIC;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
 IF jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Baris wajib array'; END IF;
 IF jsonb_array_length(p_lines)<2 OR jsonb_array_length(p_lines)>100 THEN RAISE EXCEPTION 'Jumlah baris harus 2-100'; END IF;
 INSERT INTO public.journal_headers(transaction_date,reference_no,description)
 VALUES(p_date,p_reference,p_description) RETURNING id INTO h;
 FOR r IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
   d:=(r->>'debit')::numeric; c:=(r->>'credit')::numeric;
   IF d IS NULL OR c IS NULL OR d<>round(d,2) OR c<>round(c,2) THEN RAISE EXCEPTION 'Nominal wajib maksimal dua desimal'; END IF;
   SELECT * INTO a FROM public.chart_of_accounts WHERE account_id=(r->>'account_id')::bigint;
   IF NOT FOUND THEN RAISE EXCEPTION 'Akun tidak ditemukan'; END IF;
   IF a.is_cash THEN
     IF c<=0 OR d<>0 THEN RAISE EXCEPTION 'Kas keluar harus di sisi kredit'; END IF;
     cash_count:=cash_count+1;
   ELSIF d<=0 OR c<>0 THEN RAISE EXCEPTION 'Akun lawan harus di sisi debit'; END IF;
   INSERT INTO public.journal_lines(header_id,account_id,debit,credit) VALUES(h,a.account_id,d,c);
 END LOOP;
 IF cash_count<>1 THEN RAISE EXCEPTION 'Voucher harus memiliki tepat satu baris kas kredit'; END IF;
 UPDATE public.journal_headers SET status_posting='POSTED' WHERE id=h;
 RETURN h;
END $$;

CREATE FUNCTION public.reverse_journal(p_original BIGINT,p_date DATE,p_reference TEXT,p_reason TEXT)
RETURNS BIGINT LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE h BIGINT; old_h public.journal_headers;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
 SELECT * INTO old_h FROM public.journal_headers WHERE id=p_original AND status_posting='POSTED';
 IF NOT FOUND THEN RAISE EXCEPTION 'Jurnal POSTED milik pengguna tidak ditemukan'; END IF;
 INSERT INTO public.journal_headers(transaction_date,reference_no,description,reversal_of)
 VALUES(p_date,p_reference,p_reason,p_original) RETURNING id INTO h;
 INSERT INTO public.journal_lines(header_id,account_id,debit,credit)
 SELECT h,account_id,credit,debit FROM public.journal_lines WHERE header_id=p_original ORDER BY id;
 UPDATE public.journal_headers SET status_posting='POSTED' WHERE id=h;
 RETURN h;
END $$;
CREATE FUNCTION public.verify_journal(p_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE SET search_path = '' AS $$
 SELECT h.hash_checksum=private.journal_digest(h) FROM public.journal_headers h
 WHERE h.id=p_id AND h.status_posting='POSTED';
$$;
REVOKE EXECUTE ON FUNCTION public.submit_cash_voucher(date,text,text,jsonb), public.reverse_journal(bigint,date,text,text),public.verify_journal(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_cash_voucher(date,text,text,jsonb), public.reverse_journal(bigint,date,text,text),public.verify_journal(bigint) TO authenticated;
INSERT INTO public.chart_of_accounts(account_code,account_name,normal_balance,report_classification,is_cash)
VALUES ('1101','Kas','DEBIT','ASSET',true),('1102','Bank','DEBIT','ASSET',true),
 ('1103','Persediaan Barang Dagang','DEBIT','ASSET',false),('2101','Utang Usaha','CREDIT','LIABILITY',false),
 ('5101','Beban Pokok Pendapatan','DEBIT','EXPENSE',false),('5201','Beban Operasional','DEBIT','EXPENSE',false);
COMMIT;
