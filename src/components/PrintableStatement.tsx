import React, { forwardRef } from 'react';

interface PrintableStatementProps {
  customer: any;
  transactions: any[];
  startDate: string;
  endDate: string;
  storeName: string;
}

export const PrintableStatement = forwardRef<HTMLDivElement, PrintableStatementProps>((props, ref) => {
  const { customer, transactions, startDate, endDate, storeName } = props;

  return (
    <div ref={ref} className="p-8 font-sans text-slate-900 bg-white" style={{ minHeight: '297mm', width: '210mm' }}>
      {/* BAŞLIK */}
      <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-widest">{storeName}</h1>
        <p className="text-sm text-slate-600 mt-1">MÜŞTERİ HESAP EKSTRESİ</p>
      </div>

      {/* MÜŞTERİ BİLGİLERİ */}
      <div className="flex justify-between mb-8 border border-slate-200 p-4 rounded-lg">
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">Müşteri</p>
          <h2 className="text-xl font-bold">{customer?.full_name}</h2>
          <p className="text-sm text-slate-600">{customer?.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-bold uppercase">Tarih Aralığı</p>
          <p className="font-mono font-medium">
            {new Date(startDate).toLocaleDateString('tr-TR')} - {new Date(endDate).toLocaleDateString('tr-TR')}
          </p>
          <p className="text-xs text-slate-400 mt-1">Rapor Tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>
      </div>

      {/* TABLO */}
      <table className="w-full text-left text-sm mb-8">
        <thead className="border-b-2 border-slate-800">
          <tr>
            <th className="py-2">Tarih</th>
            <th className="py-2">İşlem</th>
            <th className="py-2">Açıklama</th>
            <th className="py-2 text-right">Miktar/Tutar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {transactions.length === 0 ? (
             <tr><td colSpan={4} className="py-4 text-center text-slate-400">Bu tarih aralığında işlem yok.</td></tr>
          ) : (
            transactions.map((t, i) => (
              <tr key={i}>
                <td className="py-2 font-mono text-xs text-slate-500">
                  {new Date(t.created_at).toLocaleDateString('tr-TR')} {new Date(t.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
                </td>
                <td className="py-2 font-bold text-xs uppercase">{t.type}</td>
                <td className="py-2">{t.product_name} <span className="text-xs text-slate-400">({t.description})</span></td>
                <td className="py-2 text-right font-mono font-bold">
                  {t.currency === 'HAS' && `${t.gram} gr`}
                  {t.currency === 'TL' && `${t.price?.toLocaleString()} ₺`}
                  {t.currency === 'USD' && `${t.price?.toLocaleString()} $`}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* FİNAL BAKİYE ÖZETİ */}
      <div className="flex justify-end mt-10">
        <div className="w-1/2 bg-slate-50 border border-slate-200 p-4 rounded-lg">
          <h3 className="text-sm font-bold border-b border-slate-300 pb-2 mb-2 uppercase text-slate-500">Güncel Bakiyeler</h3>
          <div className="flex justify-between mb-1">
            <span>Has Altın:</span>
            <span className="font-mono font-bold">{customer?.balance_has?.toFixed(2)} gr</span>
          </div>
          <div className="flex justify-between mb-1">
            <span>TL Bakiye:</span>
            <span className="font-mono font-bold">{customer?.balance_tl?.toLocaleString()} ₺</span>
          </div>
          <div className="flex justify-between">
            <span>USD Bakiye:</span>
            <span className="font-mono font-bold">{customer?.balance_usd?.toLocaleString()} $</span>
          </div>
        </div>
      </div>

      {/* İMZA ALANI */}
      <div className="flex justify-between mt-20 text-xs text-slate-400 text-center">
        <div className="border-t border-slate-300 w-32 pt-2">Teslim Alan</div>
        <div className="border-t border-slate-300 w-32 pt-2">Teslim Eden</div>
      </div>
    </div>
  );
});

PrintableStatement.displayName = 'PrintableStatement';