"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Save, Building, MapPin, Loader2, Settings as SettingsIcon, Menu } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function SettingsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      setSidebarOpen(true);
    }
  }, []);

  const [formData, setFormData] = useState({
    store_name: "",
    phone: "",
    address: "",
    default_purity: "0.916"
  });

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const { data, error } = await supabase.from('app_settings').select('*').single();
      if (error && error.code !== 'PGRST116') throw error; 
      
      if (data) {
        setFormData({
          store_name: data.store_name || "",
          phone: data.phone || "",
          address: data.address || "",
          default_purity: data.default_purity?.toString() || "0.916"
        });
      }
    } catch (error) {
      toast.error("Ayarlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: existingSettings } = await supabase.from('app_settings').select('id').single();

      if (existingSettings) {
        const { error } = await supabase.from('app_settings').update({
            store_name: formData.store_name,
            phone: formData.phone,
            address: formData.address,
            default_purity: parseFloat(formData.default_purity)
          }).eq('id', existingSettings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('app_settings').insert({
            store_name: formData.store_name,
            phone: formData.phone,
            address: formData.address,
            default_purity: parseFloat(formData.default_purity)
          });
        if (error) throw error;
      }
      toast.success("Ayarlar başarıyla kaydedildi.");
    } catch (error: any) {
      toast.error("Kaydedilemedi: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg md:hidden text-slate-600"><Menu size={24}/></button>
             <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
                <SettingsIcon className="text-indigo-600" /> Sistem Ayarları
             </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-8">
            {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600"/></div> : (
              <div className="space-y-6">
                
                <div className="pb-6 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Building size={20} className="text-slate-400"/> İşletme Bilgileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Dükkan Adı</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 transition" value={formData.store_name} onChange={(e) => setFormData({...formData, store_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">WhatsApp Hattı</label>
                      <input type="text" placeholder="90555..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 transition" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                      <p className="text-[10px] text-slate-400 mt-1">Başında + olmadan 90 ile başlayın.</p>
                    </div>
                  </div>
                </div>

                <div className="pb-6 border-b border-slate-100">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin size={20} className="text-slate-400"/> Adres & Konum</h3>
                   <div>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Açık Adres</label>
                     <textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 transition" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                   </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={handleSave} disabled={saving} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition active:scale-95">
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={18} /> Ayarları Kaydet</>}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}