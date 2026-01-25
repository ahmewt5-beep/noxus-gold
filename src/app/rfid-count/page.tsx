"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { useRFID } from "@/hooks/useRFID"; 
import { 
  Radio, Play, Square, Trash2, Save, 
  AlertCircle, CheckCircle2, Menu, Loader2 
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function RfidCountPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  const { tags, isConnected, isScanning, connectRFID, startScanning, stopScanning, clearTags } = useRFID();
  const [foundProducts, setFoundProducts] = useState<any[]>([]);
  const [unknownTags, setUnknownTags] = useState<string[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Masaüstünde otomatik aç
  useEffect(() => {
    if (window.innerWidth > 768) setSidebarOpen(true);
  }, []);

  // Sayfadan çıkarken taramayı durdur
  useEffect(() => {
    return () => {
      // Cleanup sırasında async çağrı yapamayız, o yüzden sadece state'i temizlemesi yeterli
      if (isScanning) {
         // stopScanning(); // Cleanup'ta async çağırmak race condition yaratabilir
      }
    };
  }, [isScanning]);

  // 🔄 DÜZELTME: Sonsuz döngüyü engellemek için dependency güncellendi
  useEffect(() => {
    if (tags.length > 0) {
       fetchProductsByRFID(tags);
    } else {
       // State'i sadece doluysa boşalt (Gereksiz render'ı önle)
       setFoundProducts(prev => prev.length > 0 ? [] : prev);
       setUnknownTags(prev => prev.length > 0 ? [] : prev);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags.join(',')]); // 👈 KRİTİK HAMLE: Dizinin referansına değil, içeriğine (string) bak.

  async function fetchProductsByRFID(scannedTags: string[]) {
    const existingCodes = foundProducts.map(p => p.rfid_code);
    const newTags = scannedTags.filter(t => !existingCodes.includes(t));

    if (newTags.length === 0) return;

    setLoadingProducts(true);
    
    // Supabase'den veri çek
    const { data } = await supabase.from('products').select('*').in('rfid_code', newTags);

    if (data) {
       setFoundProducts(prev => [...prev, ...data]);
       const foundCodes = data.map(p => p.rfid_code);
       const unknown = scannedTags.filter(t => !foundCodes.includes(t) && !existingCodes.includes(t));
       setUnknownTags(unknown);
    }
    setLoadingProducts(false);
  }

  const totalCount = foundProducts.length;
  const totalGram = foundProducts.reduce((sum, p) => sum + p.stock_gram, 0);
  const totalValue = foundProducts.reduce((sum, p) => sum + (p.stock_gram * p.purity * 3050), 0);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* SIDEBAR */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full min-w-0 z-0">
         
         {/* HEADER */}
         <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0 z-20">
            <div className="flex items-center gap-3">
               <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600">
                  <Menu size={24}/>
               </button>
               
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isScanning ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                     <Radio size={24} className={isScanning ? 'animate-ping absolute opacity-50' : ''}/>
                     <Radio size={24} className="relative z-10"/>
                  </div>
                  <div>
                     <h1 className="text-xl font-bold text-slate-800 leading-tight">RFID Tepsi Sayımı</h1>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {isConnected ? <span className="text-emerald-600">● Cihaz Bağlı</span> : <span className="text-red-500">● Cihaz Yok</span>}
                     </p>
                  </div>
               </div>
            </div>

            <div className="flex gap-2">
               {!isConnected ? (
                  /* 👇 DÜZELTME 1: onClick={() => connectRFID()} */
                  <button onClick={() => connectRFID()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 text-sm whitespace-nowrap">
                     <Radio size={18}/> Bağla
                  </button>
               ) : (
                  <>
                     {/* 👇 DÜZELTME 2: onClick içleri wrap edildi */}
                     <button 
                        onClick={() => isScanning ? stopScanning() : startScanning()} 
                        className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 text-sm shadow-lg whitespace-nowrap
                        ${isScanning ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                        {isScanning ? <><Square size={18}/> Durdur</> : <><Play size={18}/> Başlat</>}
                     </button>
                     <button onClick={() => clearTags()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl transition" title="Temizle">
                        <Trash2 size={18}/>
                     </button>
                  </>
               )}
            </div>
         </header>

         {/* İSTATİSTİK BAR */}
         <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 z-10 overflow-x-auto">
             <div className="flex justify-around items-center min-w-[350px]">
                <div className="text-center">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Adet</div>
                   <div className="text-2xl font-mono font-bold text-indigo-700">{totalCount}</div>
                </div>
                <div className="w-px h-8 bg-slate-300"></div>
                <div className="text-center">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Gram</div>
                   <div className="text-2xl font-mono font-bold text-amber-600">{totalGram.toFixed(2)}</div>
                </div>
                <div className="w-px h-8 bg-slate-300"></div>
                <div className="text-center">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Değer (Tahmini)</div>
                   <div className="text-2xl font-mono font-bold text-emerald-600">{totalValue.toLocaleString()}</div>
                </div>
             </div>
         </div>

         {/* LİSTE ALANI */}
         <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-0">
            
            {/* SOL: BULUNANLAR */}
            <div className="flex-1 bg-white p-4 overflow-y-auto border-r border-slate-100">
               <h3 className="font-bold text-slate-600 mb-3 text-sm flex items-center gap-2 sticky top-0 bg-white py-2 z-10">
                  <CheckCircle2 size={16} className="text-emerald-500"/> Eşleşen Ürünler
                  {loadingProducts && <Loader2 size={14} className="animate-spin text-indigo-600"/>}
               </h3>
               
               <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {foundProducts.map((product, i) => (
                     <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-slate-400 shrink-0 text-xs shadow-sm border border-slate-100">
                           {i+1}
                        </div>
                        <div className="overflow-hidden min-w-0">
                           <h4 className="font-bold text-slate-700 text-sm truncate">{product.name}</h4>
                           <div className="flex gap-2 text-[10px] text-slate-500 mt-1">
                              <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{product.stock_gram}gr</span>
                              <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded truncate max-w-[80px]">{product.rfid_code}</span>
                           </div>
                        </div>
                     </div>
                  ))}
                  {foundProducts.length === 0 && (
                     <div className="col-span-full text-center py-10 text-slate-400 text-sm italic">
                        Henüz ürün okunmadı.
                     </div>
                  )}
               </div>
            </div>

            {/* SAĞ: TANIMSIZLAR */}
            {unknownTags.length > 0 && (
               <div className="w-full md:w-72 bg-red-50 border-l border-red-100 p-4 overflow-y-auto shrink-0 shadow-inner">
                  <h3 className="font-bold text-red-700 mb-3 text-sm flex items-center gap-2 sticky top-0 bg-red-50 py-2">
                     <AlertCircle size={16}/> Tanımsız ({unknownTags.length})
                  </h3>
                  <div className="space-y-2">
                     {unknownTags.map((tag, i) => (
                        <div key={i} className="bg-white p-2 rounded-lg border border-red-100 text-[10px] font-mono text-red-500 shadow-sm flex justify-between items-center">
                           <span className="truncate max-w-[180px]">{tag}</span>
                           <span className="font-bold text-red-300 px-2">?</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* FOOTER */}
         <div className="bg-white p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0 z-20">
            <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
               <Save size={20}/> KAYDET
            </button>
         </div>

      </main>
    </div>
  );
}