-- Soal 1.2. Jalankan pada database/proyek tugas yang kosong.
BEGIN;
CREATE TABLE public.chart_of_accounts (
    account_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_code VARCHAR(20) NOT NULL UNIQUE CHECK (btrim(account_code) <> ''),
    account_name VARCHAR(150) NOT NULL CHECK (btrim(account_name) <> ''),
    normal_balance VARCHAR(6) NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    report_classification VARCHAR(10) NOT NULL
        CHECK (report_classification IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'))
);
CREATE TABLE public.journal_headers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_date DATE NOT NULL,
    reference_no VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(reference_no) <> ''),
    description TEXT NOT NULL CHECK (btrim(description) <> ''),
    status_posting VARCHAR(6) NOT NULL DEFAULT 'DRAFT'
        CHECK (status_posting IN ('DRAFT', 'POSTED'))
);
CREATE TABLE public.journal_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    header_id BIGINT NOT NULL REFERENCES public.journal_headers(id) ON DELETE RESTRICT,
    account_id BIGINT NOT NULL REFERENCES public.chart_of_accounts(account_id) ON DELETE RESTRICT,
    debit NUMERIC(18,2) NOT NULL DEFAULT 0,
    credit NUMERIC(18,2) NOT NULL DEFAULT 0,
    CONSTRAINT journal_amount_nonnegative CHECK (debit >= 0 AND credit >= 0),
    CONSTRAINT journal_amount_finite CHECK (debit <> 'NaN'::numeric AND credit <> 'NaN'::numeric),
    CONSTRAINT journal_amount_not_both_zero CHECK (debit > 0 OR credit > 0),
    CONSTRAINT journal_amount_one_side CHECK (debit = 0 OR credit = 0)
);
CREATE INDEX journal_lines_header_idx ON public.journal_lines(header_id);
CREATE INDEX journal_lines_account_idx ON public.journal_lines(account_id);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chart_of_accounts,public.journal_headers,public.journal_lines FROM anon,authenticated;
COMMIT;
