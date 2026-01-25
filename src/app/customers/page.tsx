"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Customer } from "@/types";
import { 
  Search, Plus, UserPlus, FileText, X, Loader2, Pencil, Coins, Menu 
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function CustomersPage() {
  const router = useRouter();
  
  // MOBİL UYUMLU SIDEBAR STATE
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
        setSidebarOpen(true);
    }
  }, []);

  const [isModalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Form Data
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    full_name: "", phone: "", notes: "", 
    balance_has: 0, balance_tl: 0, balance_usd: 0 
  });

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase.from('customers').select('*').order('full_name');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) { toast.error("Liste yüklenemedi"); } 
    finally { setLoading(false); }
  }

  // MODAL AÇMA (RESETLİ)
  const openAddModal = () => {
    setEditingId(null);
    setFormData({ full_name: "", phone: "", notes: "", balance_has: 0, balance_tl: 0, balance_usd: 0 });
    setModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      full_name: customer.full_name,
      phone: customer.phone || "",
      notes: customer.notes || "",
      balance_has: customer.balance_has || 0,
      balance_tl: customer.balance_tl || 0,
      balance_usd: customer.balance_usd || 0
    });
    setModalOpen(true);
  };

  // KAYDETME
  async function handleSave() {
    if (!formData.full_name) { toast.warning("İsim giriniz."); return; }
    setSubmitting(true);
    
    const payload = {
      full_name: formData.full_name,
      phone: formData.phone,
      notes: formData.notes,
      balance_has: formData.balance_has,
      balance_tl: formData.balance_tl,
      balance_usd: formData.balance_usd
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('customers').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success("Müşteri ve bakiye güncellendi.");
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
        toast.success("Yeni müşteri eklendi.");
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      toast.error("Hata:", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      
      {/* SIDEBAR GÜNCELLENDİ: setIsOpen eklendi */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm">
          <div className="flex items-center gap-3">
             {/* MOBİL MENÜ BUTONU */}
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600">
                <Menu size={24}/>
             </button>
             <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
               <UserPlus className="text-indigo-600 hidden sm:block" /> Cari Hesaplar
             </h1>
          </div>
          
          <div className="flex gap-2 lg:gap-4">
             <div className="relative w-40 lg:w-72">
               <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
               <input type="text" placeholder="Ara..." className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm lg:text-base" onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition text-sm lg:text-base">
               <Plus size={18} /> <span className="hidden sm:inline">Yeni Müşteri</span>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20">
          {loading ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-indigo-600" /></div> : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* MOBİLDE KAYDIRILABİLİR TABLO */}
              <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs uppercase">
                      <tr>
                        <th className="p-5">Müşteri</th>
                        <th className="p-5 text-right">Has Bakiye</th>
                        <th className="p-5 text-right">TL Bakiye</th>
                        <th className="p-5 text-right">USD Bakiye</th>
                        <th className="p-5 text-center">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-indigo-50/30 transition group">
                          <td className="p-5 font-bold text-slate-700">
                            {c.full_name}
                            <div className="text-xs text-slate-400 font-normal">{c.phone}</div>
                          </td>
                          <td className={`p-5 text-right font-mono font-bold ${c.balance_has < 0 ? 'text-red-600' : 'text-slate-700'}`}>{c.balance_has.toFixed(2)} gr</td>
                          <td className={`p-5 text-right font-mono font-bold ${c.balance_tl < 0 ? 'text-red-600' : 'text-slate-700'}`}>{c.balance_tl.toLocaleString()} ₺</td>
                          <td className={`p-5 text-right font-mono font-bold ${c.balance_usd < 0 ? 'text-red-600' : 'text-slate-700'}`}>{c.balance_usd.toLocaleString()} $</td>
                          <td className="p-5 text-center flex justify-center gap-2">
                            <button onClick={() => openEditModal(c)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition" title="Düzenle"><Pencil size={18} /></button>
                            <button onClick={() => router.push(`/customers/${c.id}`)} className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition" title="Ekstre Gör"><FileText size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? "Müşteriyi Düzenle" : "Yeni Müşteri"}</h3>
              <button onClick={() => setModalOpen(false)}><X className="text-slate-400" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs font-bold text-slate-500">Ad Soyad</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} /></div>
                 <div><label className="text-xs font-bold text-slate-500">Telefon</label><input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl space-y-3">
                 <p className="text-xs font-bold text-amber-800 flex items-center gap-1"><Coins size={12} /> BAŞLANGIÇ BAKİYELERİ (MANUEL)</p>
                 <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500">HAS (Gr)</label>
                        <input type="number" className="w-full bg-white border border-amber-200 rounded-lg p-2 text-right font-mono text-sm" value={formData.balance_has} onChange={(e) => setFormData({...formData, balance_has: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500">TL</label>
                        <input type="number" className="w-full bg-white border border-amber-200 rounded-lg p-2 text-right font-mono text-sm" value={formData.balance_tl} onChange={(e) => setFormData({...formData, balance_tl: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500">USD ($)</label>
                        <input type="number" className="w-full bg-white border border-amber-200 rounded-lg p-2 text-right font-mono text-sm" value={formData.balance_usd} onChange={(e) => setFormData({...formData, balance_usd: parseFloat(e.target.value)})} />
                    </div>
                 </div>
                 <p className="text-[10px] text-amber-600/70">* Eksi değer borç, artı değer alacak demektir.</p>
              </div>

              <div><label className="text-xs font-bold text-slate-500">Notlar</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500" rows={2} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} /></div>
            </div>

            {/* 👇 DÜZELTME: onClick wrap edildi */}
            <button onClick={() => handleSave()} disabled={submitting} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition">
              {submitting ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}