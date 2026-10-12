export function cents(value) {
  if (!/^\d{1,16}(\.\d{1,2})?$/.test(String(value))) return null;
  const [whole, fraction=''] = String(value).split('.');
  return BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
}
export function totals(lines) {
  let debit=0n,credit=0n;
  for (const line of lines) {
    const d=cents(line.debit),c=cents(line.credit);
    if(d===null||c===null||!line.account_id||!((d>0n&&c===0n)||(c>0n&&d===0n))) return {valid:false,debit,credit};
    debit+=d;credit+=c;
  }
  return {valid:lines.length>=2&&lines.length<=100&&debit>0n&&debit===credit,debit,credit};
}
export function displayMoney(value) {
  return 'Rp '+(value/100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+(value%100n).toString().padStart(2,'0');
}
