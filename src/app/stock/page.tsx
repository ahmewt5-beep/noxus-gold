"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Product } from "@/types";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import { useScale } from "@/hooks/useScale";
import { 
  Search, Plus, Package, Coins, X, Loader2, 
  Printer, Trash2, RefreshCw, ScanBarcode, ArrowDownToLine, 
  Camera, Image as ImageIcon, Menu, Scale, Plug, Unplug, Radio 
} from "lucide-react";
import { Toaster, toast } from "sonner";
import Image from "next/image"; 

export default function StockPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Masaüstünde otomatik aç
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      setSidebarOpen(true);
    }
  }, []);

  const { weight, isConnected, connectScale, disconnectScale, error: scaleError } = useScale();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isStockEntryOpen, setStockEntryOpen] = useState(false);
  const [isPrintModalOpen, setPrintModalOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Data (RFID Eklendi)
  const [formData, setFormData] = useState({ 
    name: "", category: "Bilezik", purity: "0.916", stock_gram: "", stock_quantity: "", 
    barcode: "", rfid_code: "" 
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stockFormData, setStockFormData] = useState({ gram: "", quantity: "" });

  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Noxus_Etiket",
    onAfterPrint: () => setPrintModalOpen(false)
  });

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (scaleError) toast.error(scaleError); }, [scaleError]);

  // Terazi Otomasyonu
  useEffect(() => {
    if (isConnected && weight > 0) {
        if (isProductModalOpen) setFormData(prev => ({ ...prev, stock_gram: weight.toString() }));
        if (isStockEntryOpen) setStockFormData(prev => ({ ...prev, gram: weight.toString() }));
    }
  }, [weight, isConnected, isProductModalOpen, isStockEntryOpen]);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) { toast.error("Veri hatası"); } 
    finally { setLoading(false); }
  }

  // Hesaplamalar
  const totalHasEquivalent = products.reduce((acc, p) => acc + (p.stock_gram * p.purity), 0);
  const totalItems = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);

  // --- 🔥 YENİ NESİL KOD ÜRETİCİ (RFID + BARKOD) ---
  const generateCodes = () => {
    const randomBarcode = Math.floor(10000000 + Math.random() * 90000000).toString();
    // E200 Standart Başlangıç (EPC Gen2)
    const uniqueHex = Math.random().toString(16).substring(2, 10).toUpperCase();
    const timestampHex = Date.now().toString(16).toUpperCase().substring(6);
    const rfidEPC = `E200${uniqueHex}${timestampHex}`; 

    setFormData({ ...formData, barcode: randomBarcode, rfid_code: rfidEPC });
    toast.success("Kimlikler oluşturuldu.");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  async function handleAddProduct() {
    if(!formData.name) { toast.warning("Ürün adı giriniz."); return; }
    
    setUploadingImage(true);
    let finalImageUrl = null;

    try {
      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, selectedImage);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        finalImageUrl = publicUrl;
      }

      // Kodlar boşsa otomatik üret
      let { barcode, rfid_code } = formData;
      if (!barcode) barcode = Math.floor(10000000 + Math.random() * 90000000).toString();
      if (!rfid_code) rfid_code = `E200${Math.random().toString(16).substring(2,10).toUpperCase()}`;

      const { error } = await supabase.from('products').insert({
        name: formData.name,
        category: formData.category,
        purity: parseFloat(formData.purity),
        stock_gram: parseFloat(formData.stock_gram) || 0,
        stock_quantity: parseFloat(formData.stock_quantity) || 0,
        barcode: barcode,
        rfid_code: rfid_code, // 🔥 YENİ ALAN
        image_url: finalImageUrl || "",
        is_active: true
      });
      if(error) throw error;
      
      toast.success("Ürün kaydedildi.");
      setProductModalOpen(false);
      setFormData({ name: "", category: "Bilezik", purity: "0.916", stock_gram: "", stock_quantity: "", barcode: "", rfid_code: "" });
      setSelectedImage(null);
      setImagePreview(null);
      fetchProducts();

    } catch(e:any) { toast.error("Hata: " + e.message); } 
    finally { setUploadingImage(false); }
  }

  async function handleAddStock() {
    if(!selectedProduct) return;
    const gramChange = parseFloat(stockFormData.gram) || 0;
    const qtyChange = parseFloat(stockFormData.quantity) || 0;
    if (gramChange === 0 && qtyChange === 0) { toast.warning("Miktar giriniz."); return; }

    try {
      await supabase.from('inventory_logs').insert({
        product_id: selectedProduct.id,
        type: 'GIRIS',
        gram_change: gramChange,
        quantity_change: qtyChange,
        description: 'Manuel Stok Girişi'
      });
      await supabase.from('products').update({
        stock_gram: selectedProduct.stock_gram + gramChange,
        stock_quantity: (selectedProduct.stock_quantity || 0) + qtyChange
      }).eq('id', selectedProduct.id);
      
      toast.success("Stok güncellendi.");
      setStockEntryOpen(false);
      setStockFormData({ gram: "", quantity: "" });
      fetchProducts();
    } catch(e:any) { toast.error(e.message); }
  }

  async function handleDelete(id: number) {
    if(!confirm("Silmek istediğine emin misin?")) return;
    try { await supabase.from('products').delete().eq('id', id); toast.success("Silindi"); fetchProducts(); } 
    catch(e) { toast.error("Silinemedi"); }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode?.includes(searchTerm) ||
    p.rfid_code?.includes(searchTerm) 
  );

  const getPurityLabel = (val: number) => {
    if(val === 0.995) return "Has"; if(val === 0.916) return "22K"; if(val === 0.750) return "18K"; if(val === 0.585) return "14K"; return "Diğer";
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600">
                <Menu size={24}/>
             </button>
             <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Package className="text-indigo-600 hidden sm:block" /> Stok Yönetimi
             </h1>
          </div>
          
          <div className="flex gap-2 lg:gap-4">
             <div className="relative w-40 lg:w-64">
               <Search className="absolute left-3 top-3 text-slate-400" size={18} />
               <input type="text" placeholder="Ara (Barkod/RFID)..." className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <button onClick={() => setProductModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition text-sm">
               <Plus size={18} /> <span className="hidden sm:inline">Yeni Stok Kartı</span>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20">
          {/* İSTATİSTİKLER */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 p-4 opacity-20"><Coins size={60}/></div>
               <p className="text-amber-100 text-xs font-bold uppercase">TOPLAM HAS STOK</p>
               <h3 className="text-3xl font-mono font-bold mt-1">{totalHasEquivalent.toFixed(2)} <span className="text-lg">gr</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <p className="text-slate-400 text-xs font-bold uppercase">TOPLAM ADET</p>
               <h3 className="text-3xl font-mono font-bold mt-1 text-slate-800">{totalItems} <span className="text-lg">adet</span></h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <p className="text-slate-400 text-xs font-bold uppercase">STOK KALEMİ</p>
               <h3 className="text-3xl font-mono font-bold mt-1 text-indigo-600">{products.length} <span className="text-lg">çeşit</span></h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs uppercase">
                    <tr>
                    <th className="p-5">Görsel</th>
                    <th className="p-5">Kimlik (Barkod / RFID)</th>
                    <th className="p-5">Ürün Adı</th>
                    <th className="p-5">Kategori</th>
                    <th className="p-5">Ayar</th>
                    <th className="p-5 text-right">Gram</th>
                    <th className="p-5 text-right">Adet</th>
                    <th className="p-5 text-center">İşlem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? <tr><td colSpan={8} className="p-10 text-center">Yükleniyor...</td></tr> : 
                    filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition group">
                        <td className="p-5">
                            <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden relative group-hover:scale-150 transition-transform origin-left border border-slate-200 shadow-sm z-10">
                            {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover" /> : <div className="flex items-center justify-center h-full text-slate-300"><ImageIcon size={20}/></div>}
                            </div>
                        </td>
                        <td className="p-5 w-40">
                            <div className="flex flex-col gap-1">
                                {p.barcode ? <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-mono text-[10px] text-slate-500 font-bold"><ScanBarcode size={10}/> {p.barcode}</span> : <span className="text-red-300 text-[10px]">Barkod Yok</span>}
                                {p.rfid_code ? <span className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono text-[10px] text-indigo-600 font-bold"><Radio size={10}/> {p.rfid_code.substring(0,8)}...</span> : <span className="text-slate-300 text-[10px]">-</span>}
                            </div>
                        </td>
                        <td className="p-5 font-bold text-slate-700">{p.name}</td>
                        <td className="p-5"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{p.category}</span></td>
                        <td className="p-5"><span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold border border-amber-100">{getPurityLabel(p.purity)}</span></td>
                        <td className="p-5 text-right font-mono font-bold text-amber-600">{p.stock_gram > 0 ? p.stock_gram.toFixed(2) + ' gr' : '-'}</td>
                        <td className="p-5 text-right font-mono font-bold text-indigo-600">{p.stock_quantity > 0 ? p.stock_quantity + ' ad' : '-'}</td>
                        <td className="p-5 text-center flex justify-center gap-2">
                            {/* 👇 DÜZELTME: onClick handler'ları () => ... içine alındı */}
                            <button onClick={() => { setSelectedProduct(p); setStockEntryOpen(true); }} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-2 rounded-lg text-xs font-bold transition" title="Stok Ekle"><ArrowDownToLine size={14}/></button>
                            <button onClick={() => { setSelectedProduct(p); setPrintModalOpen(true); }} className="text-slate-500 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50" title="Barkod Yazdır"><Printer size={18} /></button>
                            <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50" title="Sil"><Trash2 size={18} /></button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: YENİ ÜRÜN */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between mb-4">
                 <h3 className="font-bold text-lg">Yeni Stok Kartı</h3>
                 <button onClick={() => setProductModalOpen(false)}><X size={20}/></button>
              </div>
              <div className="space-y-3">
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 relative overflow-hidden group hover:border-indigo-500 transition cursor-pointer">
                       {imagePreview ? <Image src={imagePreview} alt="Preview" fill className="object-cover" /> : <Camera className="text-slate-400" />}
                       <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                    </div>
                    <div className="flex-1">
                       <p className="text-xs font-bold text-slate-600">Ürün Görseli</p>
                       <p className="text-[10px] text-slate-400">Jpg, Png formatında.</p>
                    </div>
                 </div>

                 <div><label className="text-xs font-bold text-slate-500">Ürün Adı</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-indigo-500" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} /></div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-slate-500">Kategori</label><select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})}><option>Bilezik</option><option>Sarrafiye</option><option>Kolye</option><option>Has</option><option>Alyans</option><option>Diğer</option></select></div>
                    <div><label className="text-xs font-bold text-slate-500">Milyem</label><select className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none" value={formData.purity} onChange={e=>setFormData({...formData, purity: e.target.value})}><option value="0.916">22K (0.916)</option><option value="0.995">Has (0.995)</option><option value="0.585">14K (0.585)</option><option value="0.750">18K (0.750)</option></select></div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-xs font-bold text-slate-500 flex justify-between items-center mb-1">Gramaj
                          {/* 👇 DÜZELTME: onClick wrap edildi */}
                          <button type="button" onClick={() => isConnected ? disconnectScale() : connectScale()} className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full transition border ${isConnected ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{isConnected ? <Unplug size={8}/> : <Plug size={8}/>}{isConnected ? 'Bağlı' : 'Bağla'}</button>
                       </label>
                       <div className="relative"><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none" value={formData.stock_gram} onChange={e=>setFormData({...formData, stock_gram: e.target.value})} />{isConnected && <Scale size={14} className="absolute right-2 top-2.5 text-emerald-500 animate-pulse"/>}</div>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 mt-0.5 block">Adet</label><input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none mt-1" value={formData.stock_quantity} onChange={e=>setFormData({...formData, stock_quantity: e.target.value})} /></div>
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-slate-500 flex justify-between">Barkod & RFID <span onClick={() => generateCodes()} className="text-indigo-600 cursor-pointer hover:underline flex items-center gap-1"><RefreshCw size={10}/> Kod Oluştur</span></label>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Görsel Barkod" className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-mono text-xs" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} />
                        <input type="text" placeholder="RFID EPC (Hex)" className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-mono text-xs text-indigo-600" value={formData.rfid_code} onChange={(e) => setFormData({...formData, rfid_code: e.target.value})} />
                    </div>
                 </div>

                 {/* 👇 DÜZELTME: onClick wrap edildi */}
                 <button onClick={() => handleAddProduct()} disabled={uploadingImage} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 flex justify-center items-center gap-2">{uploadingImage ? <Loader2 className="animate-spin" size={20} /> : "Kaydet"}</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL 2: STOK EKLE */}
      {isStockEntryOpen && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in">
              <div className="flex justify-between mb-4">
                 <div><h3 className="font-bold text-lg">Stok Ekleme</h3><p className="text-xs text-slate-500">{selectedProduct.name}</p></div>
                 <button onClick={() => setStockEntryOpen(false)}><X size={20}/></button>
              </div>
              <div className="space-y-4">
                 <div className="bg-indigo-50 p-3 rounded-lg flex justify-between"><span className="text-xs font-bold text-indigo-800">Mevcut:</span><span className="font-mono font-bold text-indigo-900">{selectedProduct.stock_gram > 0 ? selectedProduct.stock_gram.toFixed(2) + 'gr' : selectedProduct.stock_quantity + 'ad'}</span></div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 flex justify-between items-center mb-1">Eklenecek Gram (+)
                       {/* 👇 DÜZELTME: onClick wrap edildi */}
                       <button type="button" onClick={() => isConnected ? disconnectScale() : connectScale()} className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full transition border ${isConnected ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{isConnected ? <Unplug size={8}/> : <Plug size={8}/>}{isConnected ? 'Bağlı' : 'Bağla'}</button>
                    </label>
                    <div className="relative"><input type="number" placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-3 font-mono text-lg" value={stockFormData.gram} onChange={e=>setStockFormData({...stockFormData, gram: e.target.value})} />{isConnected && <Scale size={18} className="absolute right-3 top-3.5 text-emerald-500 animate-pulse"/>}</div>
                 </div>
                 <div><label className="text-xs font-bold text-slate-500">Eklenecek Adet (+)</label><input type="number" placeholder="0" className="w-full border border-slate-300 rounded-lg p-3 font-mono text-lg" value={stockFormData.quantity} onChange={e=>setStockFormData({...stockFormData, quantity: e.target.value})} /></div>
                 {/* 👇 DÜZELTME: onClick wrap edildi */}
                 <button onClick={() => handleAddStock()} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold">Onayla</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL 3: YAZDIRMA */}
      {isPrintModalOpen && selectedProduct && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in duration-200 w-full max-w-md">
               <h3 className="font-bold text-lg text-slate-600">Etiket Önizleme</h3>
               <div className="border-4 border-slate-200 p-2 rounded-lg bg-white">
                 <div ref={printRef} className="w-[300px] h-[150px] flex flex-col items-center justify-center border border-black p-2 bg-white text-black">
                    <h2 className="text-sm font-bold uppercase text-center leading-tight mb-1">{selectedProduct.name}</h2>
                    <div className="flex justify-between w-full px-4 text-xs font-bold mb-1"><span>{getPurityLabel(selectedProduct.purity)}</span><span>{selectedProduct.stock_gram > 0 ? selectedProduct.stock_gram + 'gr' : selectedProduct.stock_quantity + 'ad'}</span></div>
                    <div className="scale-90"><Barcode value={selectedProduct.barcode || "000000"} width={1.5} height={40} fontSize={12} /></div>
                    {selectedProduct.rfid_code && <div className="text-[9px] font-mono text-center mt-1 text-slate-500">{selectedProduct.rfid_code}</div>}
                 </div>
               </div>
               <div className="flex gap-3 w-full">
                  <button onClick={() => setPrintModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">Kapat</button>
                  {/* 👇 DÜZELTME: onClick wrap edildi */}
                  <button onClick={() => handlePrint()} className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center justify-center gap-2 transition"><Printer size={18}/> Yazdır</button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
}