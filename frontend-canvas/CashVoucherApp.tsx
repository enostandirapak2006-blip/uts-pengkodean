import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, CheckCircle2, AlertCircle, FileText, 
  Calendar, Hash, FileEdit, ShieldCheck, Database, Info, RefreshCw
} from 'lucide-react';

import {parseToCents,formatIDR,decimalString,journalTotals,validateVoucher} from './canvas-model.mjs';

export default function App() {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', {timeZone:'Asia/Jakarta'}));
  const [reference, setReference] = useState('VKK-2026-001');
  const [description, setDescription] = useState('Pembayaran beban operasional bulan ini');
  
  /* Initial 2 rows for Kas Keluar (e.g., Expense Debit, Bank Credit) */
  const [lines, setLines] = useState([
    { id: 1, account_id: '', debit: '5000000', credit: '0' },
    { id: 2, account_id: '', debit: '0', credit: '5000000' }
  ]);

  /* Supabase Connection Config State */
  const supabaseUrl = 'https://gkcklzfvwwvzfxcrgmav.supabase.co';
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(globalThis.APP_CONFIG?.publishableKey || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [showConfig, setShowConfig] = useState(true);
  const [MASTER_ACCOUNTS, setAccounts] = useState([]);
  const KAS_BANK_IDS = MASTER_ACCOUNTS.filter(a => a.is_cash).map(a => a.id);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const handleLogin = async () => {
    if (!supabaseAnonKey.startsWith('sb_publishable_')) {
      setSubmitResult({success:false,message:'Gunakan publishable key sb_publishable_, bukan secret/service_role key.'}); return;
    }
    setIsLoggingIn(true);
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method:'POST',headers:{apikey:supabaseAnonKey,'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.error_description || data.msg || data.message || 'Login gagal');
      const accountsResponse=await fetch(`${supabaseUrl}/rest/v1/chart_of_accounts?select=*&order=account_code`, {
        headers:{apikey:supabaseAnonKey,Authorization:`Bearer ${data.access_token}`}
      });
      const accounts=await accountsResponse.json();
      if(!accountsResponse.ok)throw new Error(accounts.message || 'Gagal membaca akun');
      setAccounts(accounts.map(a=>({id:String(a.account_id),name:a.account_name,is_cash:a.is_cash})));
      setSession(data);setPassword('');
      setLines(current=>current.map((line,i)=>({...line,account_id:String(accounts.find(a=>a.account_code===(i===0?'5201':'1102'))?.account_id || '')})));
      setSubmitResult({success:true,message:'Login berhasil dan akun master dimuat.'});setShowConfig(false);
    } catch(err) {setSubmitResult({success:false,message:err.message});}
    finally {setIsLoggingIn(false);}
  };
  const logout = async () => {
    const token=session?.access_token;
    setSession(null);setAccounts([]);setPassword('');setShowConfig(true);
    setLines(current=>current.map(line=>({...line,account_id:''})));
    try {
      if(token){const response=await fetch(`${supabaseUrl}/auth/v1/logout`,{method:'POST',headers:{apikey:supabaseAnonKey,Authorization:`Bearer ${token}`}});
      if(!response.ok)throw new Error('Sesi lokal ditutup, tetapi pencabutan sesi server gagal.');}
      setSubmitResult({success:true,message:'Keluar dari aplikasi.'});
    } catch(err){setSubmitResult({success:false,message:err.message});}
  };

  const totals = useMemo(() => journalTotals(lines), [lines]);
  const validation = useMemo(() => validateVoucher(lines, MASTER_ACCOUNTS,
    {date,reference,description}), [lines,MASTER_ACCOUNTS,date,reference,description]);

  const addRow = () => {
    if(lines.length>=100)return;
    setLines([...lines, { id: crypto.randomUUID(), account_id: '', debit: '0', credit: '0' }]);
  };

  const removeRow = (id) => {
    if (lines.length <= 2) return; // Keep minimum 2 rows
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id, field, value) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      // Mutual exclusivity helper for UX convenience: if entering debit, clear credit and vice-versa
      if (field === 'debit' && (parseToCents(value) ?? 0n) > 0n) {
        updated.credit = '0';
      } else if (field === 'credit' && (parseToCents(value) ?? 0n) > 0n) {
        updated.debit = '0';
      }
      return updated;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validation.isValid || !session || isSubmitting) return;

    if (!supabaseUrl || !supabaseAnonKey) {
      setShowConfig(true);
      setSubmitResult({ 
        success: false, 
        message: 'Harap masukkan Supabase URL dan Publishable Key terlebih dahulu pada panel konfigurasi.' 
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      /* Formatting payload as decimal string for RPC */
      const p_lines = lines.map(l => ({
        account_id: l.account_id,
        debit: decimalString(l.debit),
        credit: decimalString(l.credit)
      }));

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_cash_voucher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          p_date: date,
          p_reference: reference,
          p_description: description,
          p_lines: p_lines
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Gagal mengirim ke server (HTTP ${response.status})`);
      }

      const id=await response.json();
      setReference('');
      setSubmitResult({success:true,message:`Voucher #${id} berhasil diposting via RPC Supabase.`});
    } catch (err) {
      setSubmitResult({
        success: false,
        message: `Error koneksi / RPC: ${err.message}. Pastikan fungsi RPC 'submit_cash_voucher' sudah dibuat di database Anda.`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 text-slate-800 pb-16 font-sans">
      {/* Header Banner */}
      <header className="bg-emerald-700 text-white shadow-md py-6 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-emerald-200" />
              <h1 className="text-2xl font-bold tracking-tight">Voucher Kas Keluar</h1>
            </div>
            <p className="text-emerald-100 text-sm mt-1">Sistem Akuntansi Keuangan Presisi Sen (Integer-based)</p>
          </div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="bg-emerald-800 hover:bg-emerald-900 text-emerald-100 text-xs px-3 py-2 rounded-lg border border-emerald-600 flex items-center gap-1.5 transition"
          >
            <Database className="w-4 h-4" />
            {showConfig ? 'Tutup Konfigurasi Supabase' : 'Konfigurasi Supabase RPC'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-8">
        
        {/* Supabase Configuration Drawer */}
        {showConfig && (
          <div className="bg-white border border-emerald-200 shadow-lg rounded-xl p-6 mb-8 transition-all">
            <h3 className="font-semibold text-emerald-900 flex items-center gap-2 mb-2">
              <Database className="w-5 h-5 text-emerald-600" />
              Pengaturan Koneksi Supabase RPC
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Masukkan URL proyek Supabase dan Publishable Key Anda untuk mengaktifkan pengiriman data ke fungsi database <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">submit_cash_voucher</code>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Supabase URL</label>
                <input 
                  type="text" 
                  placeholder="https://xxxx.supabase.co" 
                  value={supabaseUrl}
                  readOnly
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Supabase Publishable Key</label>
                <input 
                  type="password" 
                  placeholder="sb_publishable_..." 
                  value={supabaseAnonKey}
                  disabled={Boolean(session)}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            {!session ? <div className="grid gap-3 mt-4">
              <p className="text-sm">Masuk memakai pengguna Supabase Auth aplikasi, bukan akun dashboard. Sesi hanya disimpan dalam memori halaman.</p>
              <label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded p-2" /></label>
              <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border rounded p-2" /></label>
              <button type="button" disabled={isLoggingIn || !email || !password || !supabaseAnonKey} onClick={handleLogin} className="bg-emerald-700 text-white rounded p-2 disabled:opacity-50">{isLoggingIn?'Memproses...':'Masuk'}</button>
            </div> : <div className="mt-4"><p>{session.user.email}</p><button type="button" onClick={logout} className="border rounded p-2">Keluar</button></div>}
          </div>
        )}

        {/* Notification Banner */}
        {submitResult && (
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${submitResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
            {submitResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            <div className="text-sm">
              <span className="font-semibold block">{submitResult.success ? 'Berhasil' : 'Perhatian'}</span>
              {submitResult.message}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Metadata Section */}
          <div className="bg-white shadow-sm border border-emerald-100 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-emerald-900 mb-4 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-emerald-600" />
              Informasi Umum Voucher
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Tanggal Transaksi
                </label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-600" /> Nomor Bukti / Referensi
                </label>
                <input 
                  type="text" 
                  maxLength={50}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                  placeholder="Contoh: VKK-2026-001"
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Deskripsi / Keterangan Pengeluaran</label>
                <textarea 
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Jelaskan peruntukan pengeluaran kas ini..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Dynamic Journal Lines Section */}
          <div className="bg-white shadow-sm border border-emerald-100 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-base font-semibold text-emerald-900">Baris Jurnal Dinamis</h2>
                <p className="text-xs text-slate-500 mt-0.5">Masukkan rupiah tanpa pemisah ribuan, misalnya 5000000 atau 50000.50. Perhitungan internal menggunakan sen.</p>
              </div>
              <button 
                type="button" 
                onClick={addRow}
                disabled={lines.length>=100}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition font-medium"
              >
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 px-2 w-5/12">Akun Master</th>
                    <th className="pb-3 px-2 w-3/12">Debit (Rp)</th>
                    <th className="pb-3 px-2 w-3/12">Kredit (Rp)</th>
                    <th className="pb-3 px-2 w-1/12 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {lines.map((line, index) => (
                    <tr key={line.id} className="group hover:bg-emerald-50/30 transition">
                      <td className="py-3 px-2">
                        <select 
                          aria-label={`Akun baris ${index+1}`}
                          value={line.account_id}
                          onChange={(e) => updateLine(line.id, 'account_id', e.target.value)}
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="">Pilih akun</option>
                          {MASTER_ACCOUNTS.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} {KAS_BANK_IDS.includes(acc.id) ? '(Kas/Bank)' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-2">
                        <input 
                          type="text"
                          aria-label={`Debit baris ${index+1}`}
                          inputMode="decimal"
                          value={line.debit}
                          onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                          placeholder="0"
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 font-mono text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                      </td>
                      <td className="py-3 px-2">
                        <input 
                          type="text"
                          aria-label={`Kredit baris ${index+1}`}
                          inputMode="decimal"
                          value={line.credit}
                          onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                          placeholder="0"
                          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 font-mono text-right focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                        />
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button 
                          type="button"
                          onClick={() => removeRow(line.id)}
                          disabled={lines.length <= 2}
                          className={`p-2 rounded-lg transition ${lines.length <= 2 ? 'text-slate-300 cursor-not-allowed' : 'text-rose-500 hover:bg-rose-50'}`}
                          title="Hapus baris"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Accessible Balance & Summary Bar */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/70 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${totals.balanced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} aria-hidden="true" />
                <div aria-live="polite" className="text-sm">
                  <span className="font-medium text-slate-700">Status Saldo: </span>
                  {totals.balanced ? (
                    <span className="text-emerald-700 font-semibold">Seimbang (Balance)</span>
                  ) : (
                    <span className="text-amber-700 font-semibold">Belum Seimbang / Nol</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm font-mono">
                <div>
                  <span className="text-xs text-slate-500 font-sans block text-right">Total Debit</span>
                  <span className="font-bold text-slate-800">{formatIDR(totals.debit)}</span>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <span className="text-xs text-slate-500 font-sans block text-right">Total Kredit</span>
                  <span className="font-bold text-slate-800">{formatIDR(totals.credit)}</span>
                </div>
              </div>
            </div>

            {/* Validation Feedback Messages */}
            {!validation.isValid && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5" role="alert">
                <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-4 h-4 text-amber-600" />
                  Persyaratan Validasi Voucher Kas Keluar:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-amber-900/90">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!validation.isValid || isSubmitting || !session}
              className={`px-6 py-3 rounded-xl font-medium text-sm shadow-md transition flex items-center gap-2 ${
                validation.isValid && !isSubmitting && session 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {isSubmitting ? 'Mengirim Data...' : 'Submit Voucher Kas Keluar'}
            </button>
          </div>

        </form>

        {/* Documentation & Decision Notes */}
        <section className="mt-12 bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm text-sm text-slate-600 space-y-4">
          <h3 className="font-semibold text-emerald-900 text-base flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-600" />
            Keputusan Validasi dan Batasan Form (Accounting Rules)
          </h3>
          <ul className="list-disc list-inside space-y-2 text-xs md:text-sm">
            <li><strong>Aritmatika Sen Integer:</strong> Seluruh nominal keuangan dikonversi dan dihitung dalam satuan integer sen (dikalikan 100) untuk menghindari masalah pembulatan desimal floating-point standar JavaScript (IEEE 754).</li>
            <li><strong>Minimal 2 Baris:</strong> Jurnal akuntansi berpasangan (double-entry bookkeeping) minimal memerlukan satu baris debit dan satu baris kredit.</li>
            <li><strong>Aturan Kas Keluar:</strong> Karena ini adalah voucher pengeluaran kas, sistem wajib memastikan terdapat <strong>tepat satu baris akun Kas atau Bank di sisi kredit</strong> serta <strong>akun lawan (Beban/Utang/Persediaan) di sisi debit</strong>.</li>
            <li><strong>Validasi Balance:</strong> Tombol submit terkunci secara otomatis jika total debit tidak sama persis dengan total kredit atau bernilai nol.</li>
            <li><strong>Integrasi RPC:</strong> Data dikirimkan melalui Supabase RPC <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">submit_cash_voucher</code> dengan format payload desimal string untuk menjaga integritas backend SQL.</li>
          </ul>
        </section>

      </main>
    </div>
  );
}