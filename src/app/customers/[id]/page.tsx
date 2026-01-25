"use client";
import { useEffect, useState, useCallback, use } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import { sendWhatsappReceipt } from "@/lib/whatsapp"; 
import { 
  ArrowLeft, Wallet, Printer, Plus, Minus, X, Loader2, 
  Calculator, History
} from "lucide-react";
import { Toaster, toast } from "sonner";

// Next.js 15+ için params type çözümü
export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  // Params'ı unwrap et (Next.js 15 kuralı)
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      setSidebarOpen(true);
    }
  }, []);

  const [customer, setCustomer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL & İŞLEM STATES ---
  const [storeName, setStoreName] = useState("GOLDEX KUYUMCULUK"); 
  const [isModalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Form Değişkenleri
  const [trxType, setTrxType] = useState<'SATIS' | 'TAHSILAT'>('SATIS');
  const [currency, setCurrency] = useState<'HAS' | 'TL' | 'USD'>('HAS');
  const [amount, setAmount] = useState("");
  const [productType, setProductType] = useState("22 Ayar Bilezik");
  const [description, setDescription] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    
    try {
      // 1. Müşteri
      const { data: cust, error: custError } = await supabase.from('customers').select('*').eq('id', id).single();
      if (custError) throw custError;
      setCustomer(cust);

      // 2. İşlemler
      const { data: trx, error: trxError } = await supabase
        .from('transactions')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      
      if (trxError) throw trxError;
      setTransactions(trx || []);

      // 3. Ayarlar
      const { data: setts } = await supabase.from('app_settings').select('store_name').single();
      if (setts?.store_name) {
        setStoreName(setts.store_name);
      }

    } catch (error) {
      toast.error("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openTransactionModal = (type: 'SATIS' | 'TAHSILAT', curr: 'HAS' | 'TL' | 'USD') => {
    setTrxType(type);
    setCurrency(curr);
    setAmount("");
    setDescription("");
    setModalOpen(true);
  };

  const calculateHas = () => {
    if (currency !== 'HAS') return 0;
    const val = parseFloat(amount) || 0;
    let milyem = 0;
    if (productType === "22 Ayar Bilezik") milyem = 0.916;
    if (productType === "24 Ayar Has") milyem = 0.995;
    if (productType === "Çeyrek Altın") milyem = 0.916;
    if (productType === "14 Ayar") milyem = 0.585;
    return (val * milyem).toFixed(2);
  };

  async function handleTransaction() {
    if (!amount) { toast.warning("Miktar giriniz."); return; }

    setProcessing(true);
    const numAmount = parseFloat(amount);
    const hasVal = calculateHas();

    let autoDesc = description;
    if (!autoDesc) {
      if (currency === 'HAS') autoDesc = `${productType}`;
      if (currency === 'TL') autoDesc = `Nakit ${trxType === 'SATIS' ? 'Ödeme' : 'Tahsilat'}`;
      if (currency === 'USD') autoDesc = `Dolar ${trxType === 'SATIS' ? 'Satışı' : 'Alışı'}`;
    }

    try {
      const { error: trxError } = await supabase.from('transactions').insert({
        customer_id: id,
        type: trxType,
        product_name: currency === 'HAS' ? productType : currency,
        gram: currency === 'HAS' ? numAmount : 0,
        price: currency === 'TL' ? numAmount : 0,
        has_equivalent: currency === 'HAS' ? parseFloat(hasVal as string) : 0,
        description: autoDesc,
        currency: currency
      });
      if (trxError) throw trxError;

      const multiplier = trxType === 'SATIS' ? -1 : 1; 
      let updateData = {};

      if (currency === 'HAS') {
         const change = parseFloat(hasVal as string) * multiplier;
         updateData = { balance_has: (customer.balance_has || 0) + change };
      } else if (currency === 'TL') {
         const change = numAmount * multiplier;
         updateData = { balance_tl: (customer.balance_tl || 0) + change };
      } else if (currency === 'USD') {
         const change = numAmount * multiplier;
         updateData = { balance_usd: (customer.balance_usd || 0) + change };
      }

      const { error: balError } = await supabase.from('customers').update(updateData).eq('id', id);
      if (balError) throw balError;

      const _phone = customer.phone || "";
      const _name = customer.full_name || "Sayın Müşteri";
      const _productName = currency === 'HAS' ? productType : currency;
      const _amountInfo = currency === 'HAS' ? `${numAmount} gr` : `${numAmount} ${currency}`;
      const _balanceInfo = "Bakiyeniz Güncellendi"; 

      toast.success("İşlem başarıyla işlendi.", {
        description: "Müşteriye fiş gönderilsin mi?",
        action: {
          label: "WhatsApp Gönder 📲",
          onClick: () => {
            if (!_phone || _phone.length < 10) {
              toast.error("Geçerli bir telefon numarası bulunamadı.");
              return;
            }
            sendWhatsappReceipt(_phone, _name, trxType, _productName, _amountInfo, _balanceInfo, storeName);
          }
        },
        duration: 8000,
      });

      setModalOpen(false);
      fetchData(); 

    } catch (error: any) {
      toast.error("Hata:", { description: error.message });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!customer) return <div className="p-10 text-center">Müşteri bulunamadı.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} /></button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{customer.full_name}</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center gap-2">
                 <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">ID: #{customer.id}</span>
                 <span>{customer.phone || 'Tel Yok'}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition">
                <Printer size={18} /> Ekstre Yazdır
             </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* 1. BAKİYE KARTLARI */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             {/* HAS ALTIN */}
             <div className="bg-gradient-to-br from-amber-500 to-yellow-500 p-6 rounded-2xl text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={60} /></div>
                <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Has Bakiye</p>
                <h3 className="text-3xl font-mono font-bold">{customer.balance_has?.toFixed(2)} <span className="text-lg">gr</span></h3>
                <div className="mt-4 flex gap-2 relative z-10">
                   <button onClick={() => openTransactionModal('SATIS', 'HAS')} className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 backdrop-blur-sm transition"><Plus size={14} /> Borç Ekle</button>
                   <button onClick={() => openTransactionModal('TAHSILAT', 'HAS')} className="flex-1 bg-white text-amber-600 hover:bg-amber-50 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition"><Minus size={14} /> Tahsilat</button>
                </div>
             </div>

             {/* TL BAKİYE */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">TL Bakiye</p>
                <h3 className={`text-3xl font-mono font-bold ${customer.balance_tl < 0 ? 'text-red-600' : 'text-slate-800'}`}>{customer.balance_tl?.toLocaleString()} <span className="text-lg">₺</span></h3>
                <div className="mt-4 flex gap-2">
                   <button onClick={() => openTransactionModal('SATIS', 'TL')} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-lg text-xs font-bold transition">Borç (-)</button>
                   <button onClick={() => openTransactionModal('TAHSILAT', 'TL')} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2.5 rounded-lg text-xs font-bold transition">Tahsilat (+)</button>
                </div>
             </div>

             {/* USD BAKİYE */}
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Dolar Bakiye</p>
                <h3 className={`text-3xl font-mono font-bold ${customer.balance_usd < 0 ? 'text-red-600' : 'text-slate-800'}`}>{customer.balance_usd?.toLocaleString()} <span className="text-lg">$</span></h3>
                <div className="mt-4 flex gap-2">
                   <button onClick={() => openTransactionModal('SATIS', 'USD')} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-lg text-xs font-bold transition">Ver (-)</button>
                   <button onClick={() => openTransactionModal('TAHSILAT', 'USD')} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2.5 rounded-lg text-xs font-bold transition">Al (+)</button>
                </div>
             </div>
          </div>

          {/* 2. GEÇMİŞ HAREKETLER */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><History size={18}/> Hesap Hareketleri</h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{transactions.length} Kayıt</span>
             </div>
             
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                 <tr><th className="p-4">Tarih</th><th className="p-4">İşlem</th><th className="p-4">Açıklama</th><th className="p-4 text-right">Tutar</th></tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-sm">
                 {transactions.length === 0 ? (
                   <tr><td colSpan={5} className="p-8 text-center text-slate-400">Henüz işlem yok.</td></tr>
                 ) : transactions.map((trx) => (
                   <tr key={trx.id} className="hover:bg-slate-50/50 transition">
                     <td className="p-4 text-slate-500 font-mono text-xs">{new Date(trx.created_at).toLocaleDateString('tr-TR')} {new Date(trx.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</td>
                     <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${trx.type === 'SATIS' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{trx.type}</span></td>
                     <td className="p-4 font-medium text-slate-700">{trx.product_name} <span className="block text-xs text-slate-400 font-normal">{trx.description}</span></td>
                     <td className="p-4 text-right font-bold font-mono">{trx.gram > 0 && <span className="block">{trx.gram} gr</span>}{trx.price > 0 && <span className="block">{trx.price} TL</span>}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      </main>

      {/* --- İŞLEM MODALI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`p-6 flex justify-between items-center text-white transition-colors duration-300 ${trxType === 'SATIS' ? 'bg-red-600' : 'bg-emerald-600'}`}>
              <div><h3 className="text-xl font-bold flex items-center gap-2">{trxType === 'SATIS' ? 'Satış' : 'Alış'}</h3><p className="text-white/80 text-xs">{currency} bakiyesi {trxType === 'SATIS' ? 'azalacak' : 'artacak'}</p></div>
              <button onClick={() => setModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition"><X size={20} /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                 {(['HAS', 'TL', 'USD'] as const).map((curr) => (
                   <button key={curr} onClick={() => setCurrency(curr)} className={`flex-1 p-2 rounded-lg text-xs font-bold border transition ${currency === curr ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-400'}`}>{curr}</button>
                 ))}
              </div>

              <div className="space-y-3">
                 {currency === 'HAS' && (
                   <div><label className="text-xs font-bold text-slate-500 block mb-1">Ürün</label><select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none" value={productType} onChange={(e) => setProductType(e.target.value)}><option>22 Ayar Bilezik</option><option>24 Ayar Has</option><option>Çeyrek Altın</option><option>14 Ayar</option></select></div>
                 )}
                 <div><label className="text-xs font-bold text-slate-500 block mb-1">Miktar ({currency})</label><input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-xl outline-none focus:border-indigo-500" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
              </div>

              {currency === 'HAS' && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex justify-between items-center">
                   <div className="text-xs text-amber-800 font-bold flex items-center gap-2"><Calculator size={14}/> Has Karşılığı:</div>
                   <div className="text-xl font-bold text-slate-800">{calculateHas()} <span className="text-xs text-slate-500">gr</span></div>
                </div>
              )}

              <input type="text" placeholder="Açıklama (Opsiyonel)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="bg-slate-50 p-6 border-t border-slate-100">
              {/* 👇 KRİTİK DÜZELTME: onClick wrap edildi */}
              <button onClick={() => handleTransaction()} disabled={processing} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition flex justify-center items-center gap-2 ${trxType === 'SATIS' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{processing ? <Loader2 className="animate-spin" /> : 'ONAYLA'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}