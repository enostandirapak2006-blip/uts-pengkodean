import React,{useState} from 'https://esm.sh/react@19.2.0';
import {createRoot} from 'https://esm.sh/react-dom@19.2.0/client?external=react';
import {totals,displayMoney} from './money.mjs';
const h=React.createElement;
const URL='https://gkcklzfvwwvzfxcrgmav.supabase.co';
const blank=()=>({account_id:'',debit:'0',credit:'0'});
function App(){
 const [key,setKey]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [session,setSession]=useState(null),[accounts,setAccounts]=useState([]),[journals,setJournals]=useState([]),[audit,setAudit]=useState([]);
 const [date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'})),[ref,setRef]=useState(''),[description,setDescription]=useState('');
 const [lines,setLines]=useState([blank(),blank()]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function request(path,{method='GET',body,token=session?.access_token}={}){
   const res=await fetch(URL+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   const data=await res.json().catch(()=>null);
   if(!res.ok)throw new Error(data?.message||data?.msg||data?.error_description||'Permintaan gagal ('+res.status+')');
   return data;
 }
 async function load(token=session?.access_token){
   const [a,j,l]=await Promise.all([request('/rest/v1/chart_of_accounts?select=*&order=account_code',{token}),request('/rest/v1/journal_headers?select=*&order=id.desc&limit=30',{token}),request('/rest/v1/audit_logs?select=id,table_name,record_id,operation,occurred_at&order=id.desc&limit=30',{token})]);
   setAccounts(a);setJournals(j);setAudit(l);
 }
 async function action(fn){setBusy(true);setMessage('');try{await fn()}catch(e){setMessage(e.message)}finally{setBusy(false)}}
 async function login(e){e.preventDefault();await action(async()=>{const s=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password},token:null});setSession(s);setPassword('');await load(s.access_token);setMessage('Login berhasil.');})}
 function change(i,field,value){setLines(lines.map((l,n)=>n===i?{...l,[field]:value}:l))}
 const sum=totals(lines);
 const cashLines=lines.filter(l=>accounts.find(a=>String(a.account_id)===l.account_id)?.is_cash);
 const cashValid=cashLines.length===1&&Number(cashLines[0].credit)>0&&Number(cashLines[0].debit)===0&&lines.filter(l=>!accounts.find(a=>String(a.account_id)===l.account_id)?.is_cash).every(l=>Number(l.debit)>0&&Number(l.credit)===0);
 async function submit(e){e.preventDefault();if(!sum.valid||!cashValid)return;await action(async()=>{
   const id=await request('/rest/v1/rpc/submit_cash_voucher',{method:'POST',body:{p_date:date,p_reference:ref,p_description:description,p_lines:lines}});
   setRef('');setDescription('');setLines([blank(),blank()]);setMessage('Voucher #'+id+' berhasil diposting.');await load();
 })}
 async function reverse(j){const reason=window.prompt('Alasan jurnal pembalik:');if(!reason?.trim())return;await action(async()=>{
   await request('/rest/v1/rpc/reverse_journal',{method:'POST',body:{p_original:j.id,p_date:date,p_reference:'REV-'+j.id+'-'+crypto.randomUUID().slice(0,8),p_reason:reason}});await load();setMessage('Jurnal pembalik berhasil dibuat.');
 })}
 function field(label,props){return h('label',null,label,h('input',props))}
 return h('main',null,
   h('header',null,h('span',{className:'eyebrow'},'GENERAL LEDGER · UTS CODING AKUNTANSI'),h('h1',null,'Voucher kas keluar'),h('p',null,'Catat transaksi seimbang, lalu telusuri riwayatnya.')),
   !session?h('section',null,h('h2',null,'Masuk ke aplikasi'),h('p',null,'Gunakan akun pengguna Supabase Auth untuk aplikasi ini.'),h('form',{onSubmit:login},
     field('Publishable key',{value:key,onChange:e=>setKey(e.target.value),required:true,placeholder:'sb_publishable_…',autoComplete:'off'}),
     field('Email',{type:'email',value:email,onChange:e=>setEmail(e.target.value),required:true,autoComplete:'username'}),
     field('Password',{type:'password',value:password,onChange:e=>setPassword(e.target.value),required:true,autoComplete:'current-password'}),
     h('button',{disabled:busy},busy?'Memproses…':'Masuk'))):h(React.Fragment,null,
     h('div',{className:'toolbar'},h('span',null,session.user.email),h('button',{className:'secondary',disabled:busy,onClick:()=>action(async()=>{await request('/auth/v1/logout',{method:'POST'});setSession(null);setAccounts([]);setJournals([]);setAudit([]);})},'Keluar')),
     h('section',null,h('h2',null,'Transaksi baru'),h('form',{onSubmit:submit},h('div',{className:'grid'},field('Tanggal',{type:'date',value:date,onChange:e=>setDate(e.target.value),required:true}),field('Nomor bukti',{value:ref,onChange:e=>setRef(e.target.value),maxLength:50,required:true})),field('Deskripsi',{value:description,onChange:e=>setDescription(e.target.value),required:true}),
       h('div',{className:'tablewrap'},h('table',null,h('thead',null,h('tr',null,...['Akun','Debit (Rp)','Kredit (Rp)',''].map(t=>h('th',{key:t},t)))),h('tbody',null,...lines.map((l,i)=>h('tr',{key:i},h('td',null,h('select',{'aria-label':'Akun baris '+(i+1),value:l.account_id,onChange:e=>change(i,'account_id',e.target.value),required:true},h('option',{value:''},'Pilih akun'),...accounts.map(a=>h('option',{key:a.account_id,value:String(a.account_id)},a.account_code+' · '+a.account_name)))),...['debit','credit'].map(f=>h('td',{key:f},h('input',{'aria-label':f+' baris '+(i+1),inputMode:'decimal',value:l[f],onChange:e=>change(i,f,e.target.value)}))),h('td',null,h('button',{type:'button',className:'secondary',disabled:lines.length<=2,onClick:()=>setLines(lines.filter((_,n)=>n!==i))},'Hapus'))))))),
       h('button',{type:'button',className:'secondary',disabled:lines.length>=100,onClick:()=>setLines([...lines,blank()])},'+ Tambah baris'),
       h('div',{className:'balance '+(sum.valid?'ok':''),'aria-live':'polite'},h('strong',null,sum.valid?'Debit dan kredit seimbang':'Periksa nominal dan keseimbangan'),h('p',null,'Debit '+displayMoney(sum.debit)+' · Kredit '+displayMoney(sum.credit))),
       h('p',null,'Gunakan satu akun kas/bank di kredit dan akun lawan di debit. Nominal ditulis tanpa pemisah ribuan, misalnya 100000.50.'),
       h('button',{disabled:busy||!sum.valid||!cashValid||!ref.trim()||!description.trim()},busy?'Memproses…':'Submit dan posting'))),
     h('section',null,h('h2',null,'Jurnal saya'),h('button',{className:'secondary',disabled:busy,onClick:()=>action(()=>load())},'Muat ulang'),...journals.map(j=>h('article',{key:j.id},h('strong',null,j.reference_no+' · '+j.status_posting),h('p',null,j.description),h('small',null,j.transaction_date+' · #'+j.id+(j.reversal_of?' · Pembalik #'+j.reversal_of:'')),h('div',{className:'toolbar'},h('button',{className:'secondary',disabled:busy||j.status_posting!=='POSTED',onClick:()=>action(async()=>{const valid=await request('/rest/v1/rpc/verify_journal',{method:'POST',body:{p_id:j.id}});setMessage(valid?'Checksum sesuai.':'Checksum tidak sesuai atau jurnal tidak ditemukan.')})},'Verifikasi checksum'),h('button',{className:'secondary',disabled:busy||j.status_posting!=='POSTED'||journals.some(x=>x.reversal_of===j.id),onClick:()=>reverse(j)},'Buat jurnal pembalik'))))),
     h('section',null,h('h2',null,'Riwayat audit'),...audit.map(a=>h('p',{key:a.id},a.operation+' · '+a.table_name+' #'+a.record_id+' · '+new Date(a.occurred_at).toLocaleString('id-ID'))))
   ),h('p',{role:'status',className:'message'},message));
}
createRoot(document.getElementById('root')).render(h(App));
