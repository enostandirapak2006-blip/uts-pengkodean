-- Test administratif dengan role aplikasi dan klaim identitas sintetis.
-- Bukan pengujian login Auth end-to-end. Semua data voucher di-rollback.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',true);
DO $$
DECLARE h BIGINT; r BIGINT; n BIGINT; cash_id BIGINT; expense_id BIGINT;
BEGIN
 SELECT account_id INTO cash_id FROM public.chart_of_accounts WHERE account_code='1101';
 SELECT account_id INTO expense_id FROM public.chart_of_accounts WHERE account_code='5201';
 BEGIN
   PERFORM public.submit_cash_voucher(current_date,'TEST-BAD','Tidak seimbang',jsonb_build_array(
     jsonb_build_object('account_id',expense_id,'debit','100','credit','0'),
     jsonb_build_object('account_id',cash_id,'debit','0','credit','90')));
   RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL unbalanced accepted';
 EXCEPTION WHEN raise_exception THEN NULL; END;
 SELECT count(*) INTO n FROM public.journal_headers WHERE reference_no='TEST-BAD';
 IF n<>0 THEN RAISE EXCEPTION 'FAIL partial voucher persisted'; END IF;
 h:=public.submit_cash_voucher(current_date,'TEST-OK','Seimbang',jsonb_build_array(
   jsonb_build_object('account_id',expense_id,'debit','100','credit','0'),
   jsonb_build_object('account_id',cash_id,'debit','0','credit','100')));
 IF public.verify_journal(h) IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL checksum'; END IF;
 UPDATE public.journal_headers SET description='tamper' WHERE id=h;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL posted update'; END IF;
 DELETE FROM public.journal_lines WHERE header_id=h;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n<>0 THEN RAISE EXCEPTION 'FAIL posted line delete'; END IF;
 r:=public.reverse_journal(h,current_date,'TEST-REV','Pembalik');
 IF public.verify_journal(r) IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL reversal checksum'; END IF;
 IF EXISTS(SELECT account_id,sum(debit-credit) FROM public.journal_lines WHERE header_id IN(h,r)
   GROUP BY account_id HAVING sum(debit-credit)<>0) THEN RAISE EXCEPTION 'FAIL reversal amounts'; END IF;
 BEGIN
   PERFORM public.reverse_journal(h,current_date,'TEST-REV2','Pembalik kedua');
   RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL duplicate reversal';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 SELECT count(*) INTO n FROM public.audit_logs WHERE actor_id=auth.uid();
 IF n<8 THEN RAISE EXCEPTION 'FAIL audit missing'; END IF;
 BEGIN
   UPDATE public.audit_logs SET operation='tamper' WHERE actor_id=auth.uid();
   RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL audit writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',true);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.journal_headers WHERE reference_no IN('TEST-OK','TEST-REV')) THEN
   RAISE EXCEPTION 'FAIL cross-user access';
 END IF;
END $$;
SET LOCAL ROLE anon;
DO $$
BEGIN
 BEGIN
   PERFORM public.verify_journal(1);
   RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL anonymous RPC access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   PERFORM 1 FROM public.journal_headers;
   RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='FAIL anonymous table access';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT 'PASS backend balance, reversal, checksum, audit, ownership and anonymous access tests' AS result;
ROLLBACK;
