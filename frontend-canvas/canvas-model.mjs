import {cents,displayMoney} from '../frontend/money.mjs';
export const parseToCents=cents;
export const formatIDR=displayMoney;
export function decimalString(value){
 const amount=cents(value);
 if(amount===null)throw new Error('Nominal tidak valid');
 return (amount/100n).toString()+'.'+(amount%100n).toString().padStart(2,'0');
}
export function journalTotals(lines){
 let debit=0n,credit=0n,valid=true;
 for(const line of lines){
   const d=cents(line.debit),c=cents(line.credit);
   if(d===null||c===null){valid=false;continue;}
   debit+=d;credit+=c;
 }
 return {debit,credit,balanced:valid&&debit>0n&&debit===credit};
}
export function validateVoucher(lines,accounts,metadata){
 const errors=[];let cashCount=0;
 if(lines.length<2||lines.length>100)errors.push('Jumlah baris harus 2–100.');
 if(!metadata.date||!metadata.reference.trim()||!metadata.description.trim())errors.push('Tanggal, nomor bukti, dan deskripsi wajib diisi.');
 if(metadata.reference.length>50)errors.push('Nomor bukti maksimal 50 karakter.');
 for(const line of lines){
   const a=accounts.find(a=>a.id===line.account_id);
   const d=cents(line.debit),c=cents(line.credit);
   if(!a){errors.push('Pilih akun master yang valid.');continue;}
   if(d===null||c===null){errors.push('Nominal harus rupiah positif/nol dengan maksimal dua desimal, tanpa pemisah ribuan.');continue;}
   if(!((d>0n&&c===0n)||(c>0n&&d===0n)))errors.push('Setiap baris harus memiliki tepat satu nominal positif.');
   if(a.is_cash){cashCount++;if(!(d===0n&&c>0n))errors.push('Akun Kas/Bank wajib di kredit untuk voucher kas keluar.');}
   else if(!(d>0n&&c===0n))errors.push('Seluruh akun lawan wajib di debit.');
 }
 if(cashCount!==1)errors.push('Wajib tepat satu baris Kas/Bank.');
 if(!journalTotals(lines).balanced)errors.push('Total debit harus sama dengan kredit dan lebih dari nol.');
 return {isValid:errors.length===0,errors:[...new Set(errors)]};
}
