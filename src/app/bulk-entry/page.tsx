"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useScale } from "@/hooks/useScale"; 
import { Scale, Zap, Trash2, Save, ScanBarcode, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function BulkEntryPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const { weight, isConnected, connectScale, disconnectScale, error: scaleError } = useScale();
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInterval = setInterval(() => {
      if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "BUTTON") {
         inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusInterval);
  }, []);

  useEffect(() => { if (scaleError) toast.error(scaleError); }, [scaleError]);

  const handleScan = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const code = barcodeInput.trim();
      if (!code) return;

      if (scannedItems.find(i => i.barcode === code)) {
        toast.warning("Bu ürün zaten listede!");
        setBarcodeInput("");
        return;
      }

      const { data } = await supabase.from('products').select('*').or(`barcode.eq.${code},rfid_code.eq.${code}`).single();

      if (data) {
        const itemWeight = isConnected && weight > 0 ? weight : data.stock_gram;
        setScannedItems(prev => [{ ...data, scanned_weight: itemWeight, is_weight_match: Math.abs(itemWeight - data.stock_gram) < 0.05 }, ...prev]);
        playBeep(true);
      } else {
        toast.error("Ürün bulunamadı!");
        playBeep(false);
      }
      setBarcodeInput("");
    }
  };

  const playBeep = (success: boolean) => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 1000 : 300;
    osc.type = success ? 'sine' : 'sawtooth';
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const removeItem = (id: number) => {
    setScannedItems(prev => prev.filter(i => i.id !== id));
  };

  const handleBatchSave = async () => {
      if(scannedItems.length === 0) return;
      if(!confirm(`${scannedItems.length} adet ürün stoğa işlensin mi?`)) return;

      setSaving(true);
      try {
          const promises = scannedItems.map(async (item) => {
              await supabase.from('products').update({ stock_gram: item.scanned_weight }).eq('id', item.id);
              await supabase.from('inventory_logs').insert({ product_id: item.id, type: 'GIRIS', gram_change: item.scanned_weight - item.stock_gram, description: 'Hızlı Toplu Giriş/Sayım' });
          });
          await Promise.all(promises);
          toast.success("Tüm ürünler güncellendi!");
          setScannedItems([]); 
      } catch (error: any) {
          toast.error("Hata oluştu: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  const totalCount = scannedItems.length;
  const totalWeight = scannedItems.reduce((sum, item) => sum + (item.scanned_weight || 0), 0);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col h-full relative">
         <div className="bg-white border-b p-6 shadow-sm flex items-center gap-6 shrink-0 z-10">
            <div className={`w-64 p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${isConnected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
               <div className="flex items-center gap-2 mb-1"><Scale size={20} className={isConnected ? "text-emerald-600" : "text-slate-400"} /><span className="text-xs font-bold uppercase text-slate-500">Dijital Terazi</span></div>
               <div className="text-4xl font-mono font-bold text-slate-800 tracking-tighter">{weight.toFixed(2)} <span className="text-lg text-slate-400">gr</span></div>
               {/* 👇 onClick DÜZELTİLDİ */}
               <button onClick={() => isConnected ? disconnectScale() : connectScale()} className={`mt-2 text-xs font-bold px-3 py-1 rounded-full transition ${isConnected ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'}`}>{isConnected ? 'Bağlantıyı Kes' : 'Teraziyi Bağla'}</button>
            </div>
            <div className="flex-1">
               <div className="relative">
                  <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={32}/>
                  <input ref={inputRef} type="text" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={handleScan} placeholder="Ürün barkodunu okutun..." className="w-full h-24 pl-16 text-3xl font-bold bg-white border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-500 focus:shadow-xl transition placeholder:text-slate-200" autoFocus />
               </div>
            </div>
            <div className="flex gap-4">
               <div className="bg-slate-800 text-white p-4 rounded-xl text-center min-w-[120px]"><div className="text-xs font-bold text-slate-400 uppercase">Adet</div><div className="text-3xl font-bold">{totalCount}</div></div>
               <div className="bg-amber-500 text-white p-4 rounded-xl text-center min-w-[140px]"><div className="text-xs font-bold text-amber-100 uppercase">Toplam Gram</div><div className="text-3xl font-bold">{totalWeight.toFixed(2)}</div></div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {scannedItems.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-300"><Zap size={64} className="mb-4 opacity-50"/><p className="text-xl font-bold">Hızlı Tarama Modu Hazır</p><p className="text-sm">Barkod okuyucu veya RFID ile ürünleri tarayın.</p></div>
            ) : (
               <div className="grid grid-cols-1 gap-3">
                  {scannedItems.map((item, index) => (
                     <div key={`${item.id}-${index}`} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold">{scannedItems.length - index}</div>
                           <div><p className="font-bold text-lg text-slate-800">{item.name}</p><p className="text-xs text-slate-400 font-mono">{item.barcode}</p></div>
                        </div>
                        <div className="flex items-center gap-8">
                           <div className="text-right"><span className="block text-xs font-bold text-slate-400">GRAM</span><div className="flex items-center gap-2"><span className="text-xl font-bold font-mono text-slate-700">{item.scanned_weight}</span>{!item.is_weight_match && (<span className="text-xs text-red-500 font-bold bg-red-50 px-1 rounded" title={`Sistemde: ${item.stock_gram}`}>FARKLI!</span>)}</div></div>
                           <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={20}/></button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
         </div>

         {scannedItems.length > 0 && (
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
               {/* 👇 onClick DÜZELTİLDİ */}
               <button onClick={() => handleBatchSave()} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-1">
                  {saving ? <Loader2 className="animate-spin"/> : <Save size={24}/>}
                  {saving ? 'KAYDEDİLİYOR...' : `BU GRUBU KAYDET (${totalCount})`}
               </button>
            </div>
         )}
      </main>
    </div>
  );
}