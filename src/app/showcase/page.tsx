"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Product } from "@/types";
import { 
  ScanBarcode, CheckCircle2, AlertTriangle, RefreshCw, 
  ShieldCheck, ShieldAlert, Menu, RotateCcw, Save
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function ShowcasePage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { if (window.innerWidth > 768) setSidebarOpen(true); }, []);

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  
  // UNDO İÇİN YENİ YAPI
  const [scannedBarcodes, setScannedBarcodes] = useState<Set<string>>(new Set());
  const [scanHistory, setScanHistory] = useState<string[]>([]); 
  
  const [inputBarcode, setInputBarcode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Ses Efekti
  const playBeep = (type: 'success' | 'error' | 'undo') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'undo') {
      oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.2);
    } else {
      oscillator.type = 'sawtooth'; oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      oscillator.start(); oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  async function fetchShowcaseProducts() {
    setLoading(true);
    // Sadece VITRIN'deki ve STOKTA olan ürünleri çek
    const { data } = await supabase.from('products').select('*').eq('location', 'VITRIN').gt('stock_quantity', 0);
    if (data) setProducts(data);
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 500);
  }

  useEffect(() => { fetchShowcaseProducts(); }, []);

  const handleScan = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = inputBarcode.trim();
      if (!code) return;

      if (scannedBarcodes.has(code)) {
        toast.warning("Bu ürün zaten sayıldı.");
        setInputBarcode("");
        return;
      }

      const product = products.find(p => p.barcode === code);
      if (product) {
        // OKUMA BAŞARILI
        const newSet = new Set(scannedBarcodes);
        newSet.add(code);
        setScannedBarcodes(newSet);
        setScanHistory(prev => [...prev, code]); 
        playBeep('success');
        toast.success(`${product.name} doğrulandı.`);
      } else {
        playBeep('error');
        toast.error("⚠️ BU ÜRÜN VİTRİNDE YOK!");
      }
      setInputBarcode("");
    }
  };

  const handleUndo = () => {
    if (scanHistory.length === 0) return;

    const lastCode = scanHistory[scanHistory.length - 1]; 
    const newHistory = scanHistory.slice(0, -1); 
    
    const newSet = new Set(scannedBarcodes);
    newSet.delete(lastCode); 
    
    setScanHistory(newHistory);
    setScannedBarcodes(newSet);
    
    playBeep('undo');
    toast.info("Son okutma geri alındı.");
    inputRef.current?.focus();
  };

  const totalItems = products.length;
  const scannedCount = scannedBarcodes.size;
  const missingCount = totalItems - scannedCount;
  const missingProducts = products.filter(p => !scannedBarcodes.has(p.barcode || ""));
  const scannedProducts = products.filter(p => scannedBarcodes.has(p.barcode || ""));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600"><Menu size={24}/></button>
             <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
               <ShieldCheck className="text-emerald-600" /> Vitrin Denetçisi
             </h1>
           </div>
           <div className="flex gap-2">
               <button onClick={handleUndo} disabled={scanHistory.length === 0} className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-lg font-bold text-xs transition disabled:opacity-50">
                 <RotateCcw size={16}/> Geri Al
               </button>
               <button onClick={() => { setScannedBarcodes(new Set()); setScanHistory([]); fetchShowcaseProducts(); }} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs transition">
                 <RefreshCw size={16}/> Sıfırla
               </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col gap-6">
           <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-indigo-100 flex flex-col items-center justify-center text-center">
              <label className="text-sm font-bold text-slate-400 uppercase mb-2">Barkod Okuyucu Hazır</label>
              <div className="relative w-full max-w-lg">
                 <ScanBarcode className="absolute left-4 top-4 text-indigo-500 animate-pulse" size={24}/>
                 <input 
                   ref={inputRef} type="text" value={inputBarcode} onChange={(e) => setInputBarcode(e.target.value)} onKeyDown={handleScan}
                   placeholder="Ürünü Okut..." autoFocus
                   className="w-full bg-indigo-50 border-2 border-indigo-200 rounded-2xl py-4 pl-14 text-2xl font-mono font-bold text-indigo-900 outline-none focus:border-indigo-500 transition"
                   onBlur={(e) => setTimeout(() => e.target.focus(), 100)} 
                 />
              </div>
           </div>

           <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                 <p className="text-xs font-bold text-slate-400 uppercase">Toplam</p>
                 <p className="text-3xl font-bold text-slate-800">{totalItems}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm text-center">
                 <p className="text-xs font-bold text-emerald-600 uppercase">Sayılan</p>
                 <p className="text-3xl font-bold text-emerald-700">{scannedCount}</p>
              </div>
              <div className={`p-4 rounded-xl border shadow-sm text-center transition-colors ${missingCount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                 <p className={`text-xs font-bold uppercase ${missingCount > 0 ? 'text-red-600' : 'text-green-600'}`}>Eksik</p>
                 <p className={`text-3xl font-bold ${missingCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{missingCount}</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
              {/* EKSİKLER */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[500px]">
                 <div className="p-4 border-b border-slate-100 bg-red-50 flex justify-between items-center">
                    <h3 className="font-bold text-red-700 flex items-center gap-2"><ShieldAlert size={18}/> Eksik ({missingCount})</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {missingProducts.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                             <div>
                                <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                                <p className="text-xs text-slate-400 font-mono">{p.barcode}</p>
                             </div>
                             <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">KAYIP</span>
                          </div>
                    ))}
                 </div>
              </div>
              {/* SAYILANLAR */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[500px]">
                 <div className="p-4 border-b border-slate-100 bg-emerald-50 flex justify-between items-center">
                    <h3 className="font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={18}/> Tamam ({scannedCount})</h3>
                 </div>
                 <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {scannedProducts.map(p => (
                       <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl">
                          <div>
                             <p className="font-bold text-slate-700 text-sm">{p.name}</p>
                             <p className="text-xs text-slate-400 font-mono">{p.barcode}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-600">OK</span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}