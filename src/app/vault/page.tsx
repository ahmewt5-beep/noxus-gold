"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Expense } from "@/types";
import { 
  Wallet, TrendingDown, TrendingUp, Plus, FileText, 
  X, Loader2, DollarSign, Trash2, ArrowUpCircle, ArrowDownCircle,
  Calendar, Tag, AlignLeft, CheckCircle2, Menu, Euro, PoundSterling
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function VaultPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Masaüstünde otomatik aç
  useEffect(() => {
    if (window.innerWidth > 768) setSidebarOpen(true);
  }, []);

  const [loading, setLoading] = useState(true);
  
  // DATA
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    totalIncomeTL: 0, totalOutcomeTL: 0, totalExpensesTL: 0, netSafeTL: 0,
    totalIncomeUSD: 0, totalOutcomeUSD: 0, totalExpensesUSD: 0, netSafeUSD: 0,
    totalIncomeEUR: 0, totalOutcomeEUR: 0, totalExpensesEUR: 0, netSafeEUR: 0,
    totalIncomeGBP: 0, totalOutcomeGBP: 0, totalExpensesGBP: 0, netSafeGBP: 0
  });

  // MODAL & FORM
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'GIDER' | 'GELIR'>('GIDER'); 
  const [submitting, setSubmitting] = useState(false);
  
  // Form Verisi
  const [formData, setFormData] = useState({
    title: "", 
    category: "Fatura", 
    amount: "", 
    currency: "TL", 
    description: "",
    date: new Date().toISOString().split('T')[0] 
  });

  useEffect(() => { fetchFinanceData(); }, []);

  async function fetchFinanceData() {
    try {
      const { data: expData } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      setExpenses(expData || []);

      const { data: trxData } = await supabase.from('transactions').select('*').neq('price', 0);
      
      // Sayaçlar (Döviz Bazlı)
      const safe = {
          TL: { in: 0, out: 0, exp: 0 },
          USD: { in: 0, out: 0, exp: 0 },
          EUR: { in: 0, out: 0, exp: 0 },
          GBP: { in: 0, out: 0, exp: 0 }
      };

      // Giderleri Hesapla
      expData?.forEach(e => {
          if (e.currency === 'TL') safe.TL.exp += e.amount;
          else if (e.currency === 'USD') safe.USD.exp += e.amount;
          else if (e.currency === 'EUR') safe.EUR.exp += e.amount;
          else if (e.currency === 'GBP') safe.GBP.exp += e.amount;
      });

      // İşlemleri Hesapla
      trxData?.forEach(t => {
        // Para birimini belirle
        let curr = 'TL';
        if (t.currency) curr = t.currency; 
        else if (t.product_name === 'USD' || t.description?.includes('Dolar')) curr = 'USD';
        else if (t.product_name === 'EUR' || t.description?.includes('Euro')) curr = 'EUR';
        else if (t.product_name === 'GBP' || t.description?.includes('Sterlin')) curr = 'GBP';

        const val = t.price;
        
        // Hata toleransı: Bilinmeyen para birimini TL say
        const target = safe[curr as keyof typeof safe] || safe.TL;

        if (t.type === 'TAHSILAT' || t.type === 'GIRIS') target.in += val;
        else if (t.type === 'SATIS' || t.type === 'CIKIS') target.out += val;
      });

      setStats({
        // TL
        totalIncomeTL: safe.TL.in, totalOutcomeTL: safe.TL.out, totalExpensesTL: safe.TL.exp,
        netSafeTL: safe.TL.in - (safe.TL.out + safe.TL.exp),
        // USD
        totalIncomeUSD: safe.USD.in, totalOutcomeUSD: safe.USD.out, totalExpensesUSD: safe.USD.exp,
        netSafeUSD: safe.USD.in - (safe.USD.out + safe.USD.exp),
        // EUR
        totalIncomeEUR: safe.EUR.in, totalOutcomeEUR: safe.EUR.out, totalExpensesEUR: safe.EUR.exp,
        netSafeEUR: safe.EUR.in - (safe.EUR.out + safe.EUR.exp),
        // GBP
        totalIncomeGBP: safe.GBP.in, totalOutcomeGBP: safe.GBP.out, totalExpensesGBP: safe.GBP.exp,
        netSafeGBP: safe.GBP.in - (safe.GBP.out + safe.GBP.exp),
      });
      
      setLoading(false);
    } catch (error) { toast.error("Veri hatası"); }
  }

  async function handleSave() {
    if (!formData.title || !formData.amount) { toast.warning("Lütfen başlık ve tutar giriniz."); return; }
    setSubmitting(true);

    try {
      const amountVal = parseFloat(formData.amount);

      if (modalType === 'GIDER') {
        const { error } = await supabase.from('expenses').insert({
            title: formData.title, 
            category: formData.category,
            amount: amountVal, 
            currency: formData.currency, 
            description: formData.description,
        });
        if (error) throw error;
        toast.success("Gider işlendi, kasadan düşüldü.");
      } else {
        // NAKİT GİRİŞİ
        let prodName = 'Nakit Giriş';
        if (formData.currency === 'USD') prodName = 'Dolar Giriş';
        if (formData.currency === 'EUR') prodName = 'Euro Giriş';
        if (formData.currency === 'GBP') prodName = 'Sterlin Giriş';

        const { error } = await supabase.from('transactions').insert({
            customer_id: null, 
            type: 'GIRIS', 
            product_name: prodName,
            gram: 0,
            price: amountVal,
            description: `Kasa Girişi: ${formData.title} (${formData.description})`,
            currency: formData.currency 
        });
        if (error) throw error;
        toast.success("Tutar kasaya eklendi.");
      }

      setModalOpen(false);
      setFormData({ 
        title: "", category: "Fatura", amount: "", currency: "TL", description: "", date: new Date().toISOString().split('T')[0] 
      });
      fetchFinanceData();

    } catch (e: any) { toast.error(e.message); } 
    finally { setSubmitting(false); }
  }

  async function handleDeleteExpense(id: number) {
      if(!confirm("Bu gider kaydını silmek istediğinize emin misiniz?")) return;
      await supabase.from('expenses').delete().eq('id', id);
      toast.success("Kayıt silindi, bakiye güncellendi."); fetchFinanceData();
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* HEADER */}
        <header className="h-auto py-4 lg:h-20 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center justify-between px-4 lg:px-8 shadow-sm gap-4 shrink-0">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600">
                <Menu size={24}/>
             </button>
             <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="text-indigo-600" /> Kasa & Finans
             </h1>
          </div>
          
          <div className="flex w-full md:w-auto gap-2">
            <button 
                onClick={() => { setModalType('GELIR'); setFormData({...formData, category: 'Devir', title: 'Kasa Devri'}); setModalOpen(true); }}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 transition text-sm"
            >
                <ArrowUpCircle size={18} /> <span className="truncate">Nakit Giriş</span>
            </button>
            <button 
                onClick={() => { setModalType('GIDER'); setFormData({...formData, category: 'Fatura', title: ''}); setModalOpen(true); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/20 flex justify-center items-center gap-2 transition text-sm"
            >
                <Plus size={18} /> <span className="truncate">Gider Ekle</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20">
          
          {/* İSTATİSTİK KARTLARI (KASA DURUMLARI) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8">
             
             {/* 1. TL KASA */}
             <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={80}/></div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">NET TL KASA</p>
                <h3 className="text-3xl font-mono font-bold mt-2">{stats.netSafeTL.toLocaleString()} ₺</h3>
                <div className="mt-4 flex gap-2 text-[10px] font-bold opacity-80">
                   <span className="bg-emerald-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowUpCircle size={10}/> {stats.totalIncomeTL.toLocaleString()}</span>
                   <span className="bg-red-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowDownCircle size={10}/> {(stats.totalOutcomeTL + stats.totalExpensesTL).toLocaleString()}</span>
                </div>
             </div>
             
             {/* 2. USD KASA */}
             <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80}/></div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">DÖVİZ (USD)</p>
                <h3 className="text-3xl font-mono font-bold mt-2">$ {stats.netSafeUSD.toLocaleString()}</h3>
                <div className="mt-4 flex gap-2 text-[10px] font-bold opacity-80">
                   <span className="bg-indigo-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowUpCircle size={10}/> {stats.totalIncomeUSD.toLocaleString()}</span>
                   <span className="bg-red-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowDownCircle size={10}/> {stats.totalOutcomeUSD.toLocaleString()}</span>
                </div>
             </div>

             {/* 3. EURO KASA */}
             <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Euro size={80}/></div>
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">DÖVİZ (EURO)</p>
                <h3 className="text-3xl font-mono font-bold mt-2">€ {stats.netSafeEUR.toLocaleString()}</h3>
                <div className="mt-4 flex gap-2 text-[10px] font-bold opacity-80">
                   <span className="bg-blue-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowUpCircle size={10}/> {stats.totalIncomeEUR.toLocaleString()}</span>
                   <span className="bg-red-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowDownCircle size={10}/> {stats.totalOutcomeEUR.toLocaleString()}</span>
                </div>
             </div>

             {/* 4. STERLIN KASA */}
             <div className="bg-gradient-to-br from-violet-500 to-violet-700 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><PoundSterling size={80}/></div>
                <p className="text-violet-100 text-xs font-bold uppercase tracking-widest">DÖVİZ (GBP)</p>
                <h3 className="text-3xl font-mono font-bold mt-2">£ {stats.netSafeGBP.toLocaleString()}</h3>
                <div className="mt-4 flex gap-2 text-[10px] font-bold opacity-80">
                   <span className="bg-violet-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowUpCircle size={10}/> {stats.totalIncomeGBP.toLocaleString()}</span>
                   <span className="bg-red-800/50 px-2 py-1 rounded flex items-center gap-1"><ArrowDownCircle size={10}/> {stats.totalOutcomeGBP.toLocaleString()}</span>
                </div>
             </div>
          </div>

          {/* GİDER LİSTESİ */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18}/> Harcama Detayları</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                    <tr>
                        <th className="p-4 pl-6">Harcama</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Açıklama</th>
                        <th className="p-4 text-right">Tutar</th>
                        <th className="p-4 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {expenses.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-400">Kayıtlı gider bulunamadı.</td></tr>
                    ) : expenses.map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition group">
                        <td className="p-4 pl-6">
                            <div className="font-bold text-slate-700">{ex.title}</div>
                            <div className="text-[10px] text-slate-400">{new Date(ex.created_at).toLocaleDateString('tr-TR')}</div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold border 
                                ${ex.category === 'Personel' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                ex.category === 'Kira' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {ex.category}
                            </span>
                        </td>
                        <td className="p-4 text-slate-500 max-w-xs truncate">{ex.description || '-'}</td>
                        <td className="p-4 text-right font-mono font-bold text-red-600">-{ex.amount.toLocaleString()} {ex.currency}</td>
                        <td className="p-4 text-center">
                            <button onClick={() => handleDeleteExpense(ex.id)} className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Kaydı Sil">
                                <Trash2 size={16}/>
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        </div>
      </main>

      {/* --- DETAYLI MODAL (GİRİŞ / ÇIKIŞ) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] md:p-4">
           <div className={`bg-white w-full h-[85vh] md:h-auto md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in overflow-hidden border-t-8 flex flex-col ${modalType === 'GIDER' ? 'border-red-600' : 'border-emerald-600'}`}>
              
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className={`font-bold text-xl ${modalType === 'GIDER' ? 'text-red-700' : 'text-emerald-700'}`}>
                        {modalType === 'GIDER' ? 'Gider Kaydı' : 'Kasa Girişi'}
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                        {modalType === 'GIDER' ? 'Fatura, ödeme veya masraf giriniz.' : 'Kasaya giren nakit veya devir bakiyesi.'}
                    </p>
                 </div>
                 <button onClick={() => setModalOpen(false)} className="bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition"><X size={20} className="text-slate-500"/></button>
              </div>
              
              <div className="p-8 space-y-5 overflow-y-auto flex-1">
                 
                 <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1"><Tag size={12}/> Başlık / Konu</label>
                        <input type="text" placeholder={modalType === 'GIDER' ? "Örn: Elektrik Faturası" : "Örn: Kasa Devri"} 
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 focus:bg-white transition" 
                               value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1"><Calendar size={12}/> Tarih</label>
                        <input type="date" 
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none text-sm font-bold text-slate-600" 
                               value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} />
                    </div>
                 </div>
                 
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 block mb-1.5">İşlem Tutarı</label>
                    <div className="flex gap-2">
                        <input type="number" placeholder="0.00" 
                               className={`w-full bg-white border border-slate-300 rounded-xl p-3 text-2xl font-mono font-bold outline-none focus:ring-2 ${modalType === 'GIDER' ? 'text-red-600 focus:ring-red-200' : 'text-emerald-600 focus:ring-emerald-200'}`} 
                               value={formData.amount} onChange={e=>setFormData({...formData, amount: e.target.value})} />
                        
                        <select className="bg-white border border-slate-300 rounded-xl px-4 text-sm font-bold outline-none" 
                                value={formData.currency} onChange={e=>setFormData({...formData, currency: e.target.value})}>
                            <option value="TL">₺ TL</option>
                            <option value="USD">$ USD</option>
                            <option value="EUR">€ EUR</option>
                            <option value="GBP">£ GBP</option>
                        </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5">Kategori</label>
                        <div className="relative">
                            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none appearance-none font-medium text-slate-700" 
                                    value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}>
                                {modalType === 'GIDER' ? (
                                    <>
                                        <option>Fatura</option>
                                        <option>Personel</option>
                                        <option>Kira</option>
                                        <option>Mutfak</option>
                                        <option>Vergi</option>
                                        <option>Tedarik</option>
                                        <option>Diğer</option>
                                    </>
                                ) : (
                                    <>
                                        <option>Devir</option>
                                        <option>Sermaye</option>
                                        <option>Ek Gelir</option>
                                        <option>Borç Tahsilatı</option>
                                    </>
                                )}
                            </select>
                            <ArrowDownCircle size={16} className="absolute right-3 top-3.5 text-slate-400 pointer-events-none"/>
                        </div>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1.5 flex items-center gap-1"><AlignLeft size={12}/> Not (Opsiyonel)</label>
                        <input type="text" placeholder="..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
                     </div>
                 </div>

                 <button onClick={handleSave} disabled={submitting} 
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg mt-4 flex justify-center items-center gap-2 transform active:scale-95 transition-all
                    ${modalType === 'GIDER' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'}`}>
                    {submitting ? <Loader2 className="animate-spin" /> : (
                        <><CheckCircle2 size={20}/> {modalType === 'GIDER' ? 'Gideri Onayla' : 'Girişi Onayla'}</>
                    )}
                 </button>

              </div>
           </div>
        </div>
      )}

    </div>
  );
}