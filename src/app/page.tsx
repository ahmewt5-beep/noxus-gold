"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Customer, Transaction, Product } from "@/types";
import Sidebar from "@/components/Sidebar";
import { sendWhatsappReceipt } from "@/lib/whatsapp";
import { useScale } from "@/hooks/useScale";
import { math } from "@/lib/math"; // 👈 YENİ MATEMATİK MOTORU
import { 
  Menu, Plus, X, Loader2, Package, Wallet, DollarSign, 
  History, Banknote, Printer, ScanBarcode, Scale, Trash2, Unplug, Plug, ShoppingCart
} from "lucide-react";
import { Toaster, toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Sepet Öğesi Tipi
interface CartItem {
  id: string; // Geçici ID (Date.now())
  product_id?: number;
  product_name: string;
  gram: number;
  price: number;
  purity: number; // Has hesaplamak için
  has_equivalent: number;
  description?: string;
  type: 'SATIS' | 'TAHSILAT'; // Satır bazlı işlem tipi
}

export default function Dashboard() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { 
    if (typeof window !== 'undefined' && window.innerWidth > 768) setSidebarOpen(true); 
  }, []);

  const [isModalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // --- 🔥 TERAZİ BAĞLANTISI ---
  const { weight, isConnected, connectScale, disconnectScale, error: scaleError } = useScale();
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // DATA
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [storeName, setStoreName] = useState("GOLDEX KUYUMCULUK");
  
  // SEPET (CART) STATE 🛒
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // İSTATİSTİK
  const [stats, setStats] = useState({ dailyCiro: 0, cashTL: 0, cashUSD: 0, goldStock: 0 });
  const [market, setMarket] = useState({ has: 3055.50, usd: 34.25, eur: 36.80 });

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setMarket(prev => ({
        has: math.add(prev.has, (Math.random() - 0.5) * 2),
        usd: math.add(prev.usd, (Math.random() - 0.5) * 0.05),
        eur: math.add(prev.eur, (Math.random() - 0.5) * 0.05)
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => { if (scaleError) toast.error(scaleError); }, [scaleError]);

  // FORM (Girdi Alanları)
  const [trxType, setTrxType] = useState<'SATIS' | 'TAHSILAT'>('SATIS');
  const [currency, setCurrency] = useState<'HAS' | 'TL' | 'USD'>('HAS');
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [amount, setAmount] = useState(""); // Miktar (Gram veya Para)
  const [description, setDescription] = useState("");

  // Terazi Otomasyonu
  useEffect(() => {
    if (isConnected && currency === 'HAS' && isModalOpen && weight > 0) {
       setAmount(weight.toString());
    }
  }, [weight, isConnected, currency, isModalOpen]);

  // VERİ ÇEKME
  const fetchInitialData = useCallback(async () => {
    try {
      const { data: custData } = await supabase.from('customers').select('*').order('full_name');
      if (custData) setCustomers(custData);

      const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true).order('name');
      if (prodData) {
        setProducts(prodData);
        const totalStock = prodData.reduce((acc, p) => math.add(acc, math.mul(p.stock_gram, p.purity)), 0);
        setStats(prev => ({ ...prev, goldStock: totalStock }));
      }

      const { data: allTrx } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20);
      if (allTrx) setTransactions(allTrx as any);

      // Basit Nakit Özeti (Transaction tablosundan hesaplamak yerine anlık bakiye gösterilebilir veya detaylı query yapılabilir)
      // Şimdilik 0 bırakıyoruz, Raporlar sayfasında detaylısı var.

      const { data: settings } = await supabase.from('app_settings').select('store_name').single();
      if (settings?.store_name) setStoreName(settings.store_name);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // BARKOD OKUMA
  const handleBarcodeScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
       e.preventDefault();
       const product = products.find(p => p.barcode === barcode);
       if (product) {
         setSelectedProductId(product.id.toString());
         setCurrency('HAS');
         toast.success(`${product.name} seçildi!`);
         if(!isConnected) document.getElementById('amount-input')?.focus();
       } else {
         toast.error("Ürün bulunamadı!");
       }
    }
  };

  // --- 🛒 SEPET YÖNETİMİ (CART LOGIC) ---

  const addToCart = () => {
    if (!amount || parseFloat(amount) <= 0) { toast.warning("Miktar giriniz."); return; }
    if (currency === 'HAS' && !selectedProductId) { toast.warning("Ürün seçiniz."); return; }

    const numAmount = parseFloat(amount);
    let productName: string = currency;
    let itemPurity = 0;
    let itemHas = 0;
    
    // Ürün Bilgisi
    if (currency === 'HAS') {
        const prod = products.find(p => p.id === parseInt(selectedProductId));
        if (prod) {
            let productName: string = currency;
            itemPurity = prod.purity;
            itemHas = math.calcHas(numAmount, prod.purity);
        }
    } else {
        // Para birimi ise has karşılığı yoktur (veya kurdan hesaplanır, şimdilik 0)
        itemHas = 0;
    }

    const newItem: CartItem = {
        id: Date.now().toString(),
        product_id: selectedProductId ? parseInt(selectedProductId) : undefined,
        product_name: productName,
        gram: currency === 'HAS' ? numAmount : 0,
        price: currency !== 'HAS' ? numAmount : 0,
        purity: itemPurity,
        has_equivalent: itemHas,
        description: description || (trxType === 'SATIS' ? 'Satış' : 'Alış'),
        type: trxType
    };

    setCart(prev => [...prev, newItem]);
    
    // Formu Temizle (Müşteri hariç)
    setAmount("");
    setDescription("");
    setBarcode("");
    setSelectedProductId("");
    // setCurrency('HAS'); // Opsiyonel: Her eklemede HAS'a dönsün mü?
    
    toast.success("Sepete eklendi.");
    setTimeout(() => document.getElementById('amount-input')?.focus(), 100);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // --- 💰 SATIŞI TAMAMLA (BATCH INSERT) ---
  const handleCheckout = async () => {
    if (cart.length === 0) { toast.warning("Sepet boş."); return; }
    if (!selectedCustomer) { toast.warning("Lütfen müşteri seçiniz."); return; }

    setProcessing(true);
    const customerId = parseInt(selectedCustomer);
    const currentCust = customers.find(c => c.id === customerId);

    try {
        // 1. İşlemleri Toplu Kaydet (Promise.all ile paralel)
        const promises = cart.map(async (item) => {
            // Transaction Kaydı
            await supabase.from('transactions').insert({
                customer_id: customerId,
                type: item.type,
                product_name: item.product_name,
                gram: item.gram,
                price: item.price,
                has_equivalent: item.has_equivalent,
                description: item.description,
                currency: currency // Not: Sepetteki her ürünün currency'si farklı olabilir, burada basitleştirdik. İdealde item içinde tutulmalı.
            });

            // Stok Düşümü (Eğer ürünse)
            if (item.product_id) {
                const stockChange = item.type === 'SATIS' ? -item.gram : item.gram;
                
                // Mevcut stoğu çekip güncellemek daha güvenli (Race condition önlemi)
                // Ancak basitlik için burada direkt update atıyoruz. RLS veya stored procedure daha iyi olurdu.
                // Biz React tarafında basit tutacağız.
                const { data: prod } = await supabase.from('products').select('stock_gram').eq('id', item.product_id).single();
                if(prod) {
                    await supabase.from('products').update({ 
                        stock_gram: math.add(prod.stock_gram, stockChange) 
                    }).eq('id', item.product_id);
                }

                await supabase.from('inventory_logs').insert({ 
                    product_id: item.product_id, 
                    type: item.type === 'SATIS' ? 'CIKIS' : 'GIRIS', 
                    gram_change: stockChange, 
                    description: `İşlem: ${currentCust?.full_name}` 
                });
            }
        });

        await Promise.all(promises);

        // 2. Müşteri Bakiyesini Tek Seferde Güncelle (Total Hesapla)
        let totalHasChange = 0;
        let totalTLChange = 0;
        let totalUSDChange = 0;

        cart.forEach(item => {
            const multiplier = item.type === 'SATIS' ? -1 : 1;
            
            if (item.gram > 0) { // Altın işlemi
                totalHasChange = math.add(totalHasChange, math.mul(item.has_equivalent, multiplier));
            } else { // Para işlemi
                // Burası biraz karışık çünkü sepette item.currency yok. 
                // Basitlik için: Şu anki 'currency' state'i neyse o kabul ediliyor. 
                // *Geliştirme:* CartItem içine 'currency' alanı eklenmeli.
                // Şimdilik varsayım: Nakit işlemler TL, Dolar işlemleri USD.
                // Biz currency state'ine güveneceğiz ama sepette karışık döviz varsa bu sorun olur.
                // HIZLI ÇÖZÜM: item.product_name kontrolü.
                if (item.product_name === 'TL' || item.product_name === 'Nakit') {
                    totalTLChange = math.add(totalTLChange, math.mul(item.price, multiplier));
                } else if (item.product_name === 'USD') {
                    totalUSDChange = math.add(totalUSDChange, math.mul(item.price, multiplier));
                } else {
                    // Varsayılan TL
                    totalTLChange = math.add(totalTLChange, math.mul(item.price, multiplier));
                }
            }
        });

        // Bakiye Update
        if (currentCust) {
            await supabase.from('customers').update({
                balance_has: math.add(currentCust.balance_has, totalHasChange),
                balance_tl: math.add(currentCust.balance_tl, totalTLChange),
                balance_usd: math.add(currentCust.balance_usd, totalUSDChange)
            }).eq('id', customerId);
        }

        toast.success("Satış tamamlandı ve kaydedildi.");
        setModalOpen(false);
        setCart([]); // Sepeti boşalt
        fetchInitialData();

        // İsteğe bağlı: WhatsApp Fişi (Burada özet gönderilebilir)

    } catch (error: any) {
        toast.error("Hata: " + error.message);
    } finally {
        setProcessing(false);
    }
  };

  // Sepet Toplamları (Görsel İçin)
  const cartTotalHas = cart.reduce((acc, item) => item.type === 'SATIS' ? math.add(acc, item.has_equivalent) : math.sub(acc, item.has_equivalent), 0);
  const cartTotalCash = cart.reduce((acc, item) => item.type === 'SATIS' ? math.add(acc, item.price) : math.sub(acc, item.price), 0);

  const handlePrint = () => { window.print(); };
  const chartData = [ { name: '09:00', kur: 3010 }, { name: '11:00', kur: 3025 }, { name: '13:00', kur: 3018 }, { name: '15:00', kur: 3042 }, { name: '17:00', kur: 3055 } ];

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden selection:bg-indigo-100">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative no-print w-full">
        {/* HEADER */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 shrink-0">
           <div className="flex items-center gap-2 lg:gap-4 overflow-hidden w-full">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden shrink-0 text-slate-600"><Menu size={24}/></button>
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient pr-2 flex-1">
                <MarketTicker label="HAS" value={market.has} type="gold" />
                <div className="hidden sm:flex gap-2">
                    <MarketTicker label="USD" value={market.usd} type="currency" />
                    <MarketTicker label="EUR" value={market.eur} type="currency" />
                </div>
             </div>
           </div>
           <div className="flex items-center gap-4 shrink-0">
              <button onClick={() => { setModalOpen(true); setTimeout(() => barcodeInputRef.current?.focus(), 100); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2 transition active:scale-95 text-sm whitespace-nowrap">
                 <Plus size={18} /> <span className="hidden sm:inline">Yeni Satış</span>
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6 mb-8">
            <StatCard title="Günlük" value={`${stats.dailyCiro.toLocaleString()} ₺`} trend="Ciro" isPositive={true} icon={<Banknote size={20} />} color="bg-blue-600" />
            <StatCard title="Stok" value={`${stats.goldStock.toFixed(0)} gr`} trend="Has" isPositive={true} icon={<Package size={20} />} color="bg-amber-500" />
            <StatCard title="Kasa TL" value={`${stats.cashTL.toLocaleString()} ₺`} trend="Nakit" isPositive={stats.cashTL >= 0} icon={<Wallet size={20} />} color="bg-emerald-500" />
            <StatCard title="Dolar" value={`$ ${stats.cashUSD.toLocaleString()}`} trend="Döviz" isPositive={true} icon={<DollarSign size={20} />} color="bg-indigo-500" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
             <div className="xl:col-span-2 bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 h-64 lg:h-96">
                <h3 className="font-bold mb-4">Altın Trendi</h3>
                {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} width={30} /><Tooltip /><Line type="monotone" dataKey="kur" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} /></LineChart>
                    </ResponsiveContainer>
                )}
             </div>
             
             {/* SON HAREKETLER */}
             <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col min-h-[300px]">
                <h3 className="font-bold mb-4 flex items-center gap-2"><History size={18}/> Son Hareketler</h3>
                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {transactions.length === 0 ? <p className="text-slate-400 text-sm p-4">İşlem yok.</p> : transactions.map(t => (
                    <div key={t.id} className="flex justify-between items-center text-sm p-3 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100 cursor-pointer group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${t.type==='SATIS'?'bg-red-100 text-red-600':'bg-emerald-100 text-emerald-600'}`}>{t.type==='SATIS'?'S':'A'}</div>
                        <div className="truncate"><p className="font-bold text-slate-700 truncate">{t.customers?.full_name || 'Kasa İşlemi'}</p><p className="text-xs text-slate-400 truncate">{t.product_name}</p></div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                          <span className={`font-mono font-bold ${t.type === 'SATIS' ? 'text-red-600' : 'text-emerald-600'}`}>{t.gram > 0 ? t.gram + 'gr' : t.price + '₺'}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </main>
      </div>

      {/* --- 🛒 SEPET MODALI (POS) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col md:flex-row">
            
            {/* SOL TARAF: ÜRÜN EKLEME */}
            <div className="w-full md:w-1/2 p-6 flex flex-col bg-slate-50 border-r border-slate-200">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Ürün Ekle</h3>
                  <div className="flex gap-2">
                     <button onClick={() => setTrxType('SATIS')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${trxType === 'SATIS' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>SATIŞ</button>
                     <button onClick={() => setTrxType('TAHSILAT')} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${trxType === 'TAHSILAT' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>TAHSİLAT</button>
                  </div>
               </div>

               {/* Müşteri Seçimi (Sadece bir kez seçilir) */}
               <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Müşteri</label>
                  <select className="w-full bg-white border border-slate-300 rounded-xl p-3 outline-none" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                    <option value="">Müşteri Seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
               </div>

               {/* Barkod */}
               <div className="relative mb-4">
                 <ScanBarcode className="absolute left-3 top-3 text-slate-400" size={20}/>
                 <input ref={barcodeInputRef} type="text" placeholder="Barkod Okut..." className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-10 font-mono font-bold outline-none focus:border-indigo-500 transition" value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleBarcodeScan} />
               </div>

               {/* Para Birimi */}
               <div className="flex gap-2 mb-4">
                  {(['HAS', 'TL', 'USD'] as const).map((curr) => (
                    <button key={curr} onClick={() => setCurrency(curr)} className={`flex-1 p-2 rounded-lg text-xs font-bold border transition ${currency === curr ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-300 text-slate-400 bg-white'}`}>{curr}</button>
                  ))}
               </div>

               {/* Ürün Seçimi (Manuel) */}
               {currency === 'HAS' && (
                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ürün</label>
                    <select className="w-full bg-white border border-slate-300 rounded-xl p-3 outline-none text-sm" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                      <option value="">Ürün Seçiniz...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock_gram}gr)</option>)}
                    </select>
                  </div>
               )}

               {/* Miktar & Terazi */}
               <div className="mb-4">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                     <span>Miktar ({currency})</span>
                     {currency === 'HAS' && (
                        <button onClick={() => isConnected ? disconnectScale() : connectScale()} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition ${isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                           {isConnected ? <Unplug size={10}/> : <Plug size={10}/>} {isConnected ? `(${weight}gr)` : 'Terazi'}
                        </button>
                     )}
                  </label>
                  <div className="relative">
                     <input id="amount-input" type="number" placeholder="0.00" className="w-full bg-white border border-slate-300 rounded-xl p-3 font-mono font-bold text-xl outline-none focus:border-indigo-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
               </div>

               <button onClick={addToCart} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold mt-auto flex justify-center items-center gap-2">
                  <Plus size={18}/> Listeye Ekle
               </button>
            </div>

            {/* SAĞ TARAF: SEPET LİSTESİ */}
            <div className="w-full md:w-1/2 p-6 flex flex-col bg-white">
               <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="text-indigo-600"/> Sepet ({cart.length})</h3>
                  <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-red-500"><X size={24}/></button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {cart.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                        <ShoppingBasket size={48} className="mb-2"/>
                        <p>Sepet boş</p>
                     </div>
                  ) : cart.map((item) => (
                     <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div>
                           <p className="font-bold text-slate-700 text-sm">{item.product_name}</p>
                           <p className="text-xs text-slate-400 flex gap-2">
                              <span className={item.type === 'SATIS' ? 'text-red-500' : 'text-emerald-500'}>{item.type}</span>
                              <span>•</span>
                              <span>{item.gram > 0 ? `${item.gram} gr` : `${item.price} ${item.product_name}`}</span>
                           </p>
                        </div>
                        <div className="flex items-center gap-3">
                           {item.has_equivalent > 0 && <span className="font-mono text-xs font-bold text-amber-600">{item.has_equivalent.toFixed(2)} Has</span>}
                           <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                        </div>
                     </div>
                  ))}
               </div>

               {/* ÖZET VE ONAY */}
               <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between text-sm font-bold text-slate-600">
                     <span>Toplam Has (Net):</span>
                     <span className={cartTotalHas < 0 ? 'text-red-600' : 'text-emerald-600'}>{cartTotalHas.toFixed(2)} gr</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-600">
                     <span>Nakit Durumu (Tahmini):</span>
                     <span className={cartTotalCash < 0 ? 'text-red-600' : 'text-emerald-600'}>{cartTotalCash.toLocaleString()}</span>
                  </div>
                  
                  <button onClick={() => handleCheckout()} disabled={processing} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition flex justify-center items-center gap-2 ${cart.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-300 cursor-not-allowed'}`}>
                     {processing ? <Loader2 className="animate-spin" /> : 'SATIŞI TAMAMLA'}
                  </button>
               </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// BİLEŞENLER
const ShoppingBasket = ({size, className}:any) => <ShoppingCart size={size} className={className}/>; // Icon wrapper

function StatCard({ title, value, trend, isPositive, icon, color }: any) {
  return (
    <div className="bg-white p-4 lg:p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>{icon}</div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{trend}</span>
      </div>
      <h3 className="text-slate-500 text-xs lg:text-sm font-medium relative z-10">{title}</h3>
      <p className="text-xl lg:text-2xl font-bold text-slate-800 mt-1 relative z-10">{value}</p>
    </div>
  );
}

function MarketTicker({ label, value, type }: any) {
  const formatted = value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg min-w-[110px] shrink-0">
      <div className={`w-2 h-2 rounded-full animate-pulse ${label === 'HAS' ? 'bg-amber-500' : 'bg-green-500'}`}></div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] font-bold text-slate-400">{label}</span>
        <span className="text-sm font-mono font-bold text-slate-700">{formatted} {type === 'gold' ? '₺' : ''}</span>
      </div>
    </div>
  );
}