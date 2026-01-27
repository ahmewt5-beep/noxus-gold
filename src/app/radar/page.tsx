"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { TURKEY_CITIES } from "@/lib/constants"; // 👈 ŞEHİR LİSTESİNİ ÇAĞIRDIK
import { 
  ShieldAlert, Siren, MapPin, Plus, Camera, Lock, User, 
  Calendar, Eye, Filter, Loader2, Megaphone, AlertTriangle,X, Search
} from "lucide-react";
import { toast, Toaster } from "sonner";


// İhbar Tipleri ve Renkleri
const ALERT_TYPES = {
  'DOLANDIRICILIK': { label: 'Dolandırıcılık', color: 'bg-red-100 text-red-700 border-red-200', icon: Siren },
  'CALINTI': { label: 'Çalıntı Mal', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: ShieldAlert },
  'SAHTE_URUN': { label: 'Sahte Ürün', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
  'SUPHELI_SAHIS': { label: 'Şüpheli Şahıs', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: User },
  'DUYURU': { label: 'Genel Duyuru', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Megaphone },
};

export default function RadarPage() {
  const { user, role } = useAuth(); // Kullanıcı ve Rol bilgisi
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // States
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Varsayılan şehir İstanbul, ama getUserInfo ile kullanıcının gerçek şehrini çekeceğiz
  const [userCity, setUserCity] = useState("İstanbul"); 
  const [filterMode, setFilterMode] = useState<'ALL' | 'CITY'>('CITY'); // Varsayılan: Şehir Filtresi
  
  // Modal & Form
  const [isModalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", type: "SUPHELI_SAHIS",
    city: "İstanbul", district: "", is_anonymous: false, image_file: null as File | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) setSidebarOpen(true);
  }, []);

  // Kullanıcı giriş yapınca bilgilerini çek
  useEffect(() => {
    if (user) {
        getUserInfo();
    }
  }, [user]);

  // Filtre veya Şehir değişince verileri yenile
  useEffect(() => {
    fetchAlerts();
  }, [filterMode, userCity]); 

  // Kullanıcının kayıtlı şehrini bul (profiles tablosundan)
  async function getUserInfo() {
    if (!user) return;
    try {
        const { data, error } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();

        if (data?.city) {
            setUserCity(data.city); // Kullanıcının şehri neyse onu ayarla
            // Form verisindeki şehri de güncelle
            setFormData(prev => ({ ...prev, city: data.city }));
        }
    } catch (err) {
        console.log("Şehir bilgisi çekilemedi.");
    }
  }

  async function fetchAlerts() {
    setLoading(true);
    try {
      let query = supabase
        .from('radar_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      // Eğer mod 'CITY' ise ve 'Tüm İller' seçili DEĞİLSE filtrele
      if (filterMode === 'CITY' && userCity !== 'Tüm İller') {
        query = query.ilike('city', `%${userCity}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      toast.error("İstihbarat verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!formData.title || !formData.city) {
      toast.warning("Başlık ve Şehir zorunludur.");
      return;
    }

    setUploading(true);
    let imageUrl = null;

    try {
      // 1. Fotoğraf Yükleme (Varsa)
      if (formData.image_file) {
        const fileExt = formData.image_file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('radar-images')
          .upload(fileName, formData.image_file);

        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = supabase.storage
          .from('radar-images')
          .getPublicUrl(fileName);
          
        imageUrl = publicUrl.publicUrl;
      }

      // 2. Veritabanına Kayıt
      const { error } = await supabase.from('radar_alerts').insert({
        user_id: user?.id,
        store_name: formData.is_anonymous ? null : (user?.user_metadata?.full_name || "Bilinmeyen Mağaza"),
        city: formData.city,
        district: formData.district,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        image_url: imageUrl,
        is_anonymous: formData.is_anonymous
      });

      if (error) throw error;

      toast.success("İhbar sisteme düştü. Tüm ağ bilgilendirildi.");
      setModalOpen(false);
      // Formu sıfırla ama şehri koru
      setFormData({
        title: "", description: "", type: "SUPHELI_SAHIS",
        city: userCity, district: "", is_anonymous: false, image_file: null
      });
      fetchAlerts();

    } catch (error: any) {
      toast.error("Hata:", { description: error.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* HEADER */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-red-100 p-2 rounded-lg text-red-600 animate-pulse">
                <Siren size={24} />
             </div>
             <div>
                <h1 className="text-xl font-bold text-slate-800 hidden sm:block">NOXUS RADAR</h1>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">Ulusal İstihbarat ve Uyarı Ağı</p>
                <h1 className="text-xl font-bold text-slate-800 sm:hidden">RADAR</h1>
             </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {/* FİLTRE BUTONLARI */}
            <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
               <button 
                 onClick={() => setFilterMode('CITY')} 
                 className={`px-2 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 ${filterMode === 'CITY' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <MapPin size={14} /> <span className="hidden sm:inline">Şehrim ({userCity})</span><span className="sm:hidden">Şehir</span>
               </button>
               <button 
                 onClick={() => setFilterMode('ALL')} 
                 className={`px-2 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 ${filterMode === 'ALL' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Eye size={14} /> <span className="hidden sm:inline">Tüm Türkiye</span><span className="sm:hidden">Tümü</span>
               </button>
            </div>

            {/* SADECE ADMİNLER İHBAR OLUŞTURABİLİR */}
            {(role === 'admin' || role === 'super_admin') && (
                <button onClick={() => setModalOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 transition animate-in zoom-in">
                    <Plus size={18} /> <span className="hidden sm:inline">İhbar Et</span>
                </button>
            )}
          </div>
        </header>

        {/* FEED (AKIŞ) ALANI */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
           <div className="max-w-4xl mx-auto space-y-6">
              
              {/* ŞEHİR SEÇİMİ (MOBİL VE MASAÜSTÜ İÇİN FİLTRE) */}
              {filterMode === 'CITY' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600">
                        <Filter size={18} />
                        <span className="text-sm font-bold">Konum Filtresi:</span>
                    </div>
                    <select 
                        value={userCity} 
                        onChange={(e) => setUserCity(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                    >
                        <option value="Tüm İller">Tüm İller (Filtresiz)</option>
                        {TURKEY_CITIES.map((city) => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                    <p className="text-slate-400 text-sm font-medium animate-pulse">Ağ taranıyor...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <ShieldAlert size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500">Bölge Temiz</h3>
                    <p className="text-sm text-slate-400">"{userCity}" için rapor edilmiş bir tehdit yok.</p>
                    <p className="text-xs text-slate-300 mt-2">İstihbarat girildiğinde burada görünecek.</p>
                </div>
              ) : (
                alerts.map((alert) => {
                    const typeInfo = ALERT_TYPES[alert.type as keyof typeof ALERT_TYPES] || ALERT_TYPES['SUPHELI_SAHIS'];
                    const Icon = typeInfo.icon;
                    return (
                        <div key={alert.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition group">
                            <div className="flex flex-col md:flex-row">
                                {/* RESİM ALANI */}
                                {alert.image_url && (
                                    <div className="md:w-64 h-64 md:h-auto bg-slate-100 shrink-0 relative overflow-hidden cursor-pointer group" onClick={() => window.open(alert.image_url, '_blank')}>
                                        <img src={alert.image_url} alt="Kanıt" className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition"/>
                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
                                            <Camera size={12} /> Büyüt
                                        </div>
                                    </div>
                                )}
                                
                                {/* İÇERİK ALANI */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${typeInfo.color}`}>
                                            <Icon size={14} /> {typeInfo.label}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {new Date(alert.created_at).toLocaleDateString('tr-TR')} {new Date(alert.created_at).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{alert.title}</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-1">{alert.description}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                            <MapPin size={14} className="text-red-500" /> {alert.city} {alert.district && `/ ${alert.district}`}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                            {alert.is_anonymous ? (
                                                <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-500"><Lock size={12} /> Gizli Kaynak</div>
                                            ) : (
                                                <span className="text-indigo-600 font-bold flex items-center gap-1"><User size={12}/> {alert.store_name}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
              )}
           </div>
        </div>
      </main>

      {/* --- İHBAR OLUŞTURMA MODALI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-bold flex items-center gap-2"><Siren className="text-red-500" /> Yeni İstihbarat Gir</h3>
                    <button onClick={() => setModalOpen(false)}><X className="text-slate-400 hover:text-white transition" /></button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    
                    {/* TİP SEÇİMİ */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(ALERT_TYPES).map(([key, val]) => (
                            <button 
                                key={key}
                                onClick={() => setFormData({...formData, type: key})}
                                className={`p-2 rounded-lg text-xs font-bold border transition text-center ${formData.type === key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                {val.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Olay Başlığı</label>
                        <input type="text" placeholder="Örn: Çarşıda sahte çeyrek altın geziyor" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500 font-bold text-slate-700" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                         {/* ŞEHİR SEÇİMİ (OTOMATİK LİSTE) */}
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Şehir</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none cursor-pointer text-sm" 
                                value={formData.city} 
                                onChange={(e) => setFormData({...formData, city: e.target.value})}
                            >
                                {TURKEY_CITIES.map((city) => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">İlçe / Bölge</label>
                            <input type="text" placeholder="Örn: Midyat" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none text-sm" value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} />
                         </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Detaylı Açıklama</label>
                        <textarea rows={3} placeholder="Şahsın eşgali, olay saati vb..." className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:border-indigo-500 text-sm" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>

                    {/* FOTOĞRAF YÜKLEME */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Fotoğraf Kanıtı (Opsiyonel)</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden" 
                            onChange={(e) => setFormData({...formData, image_file: e.target.files ? e.target.files[0] : null})}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-slate-500 text-sm font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2">
                            {formData.image_file ? (
                                <span className="text-emerald-600 flex items-center gap-2"><Camera size={18}/> {formData.image_file.name} Seçildi</span>
                            ) : (
                                <><Camera size={18}/> Fotoğraf Seç / Yükle</>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 cursor-pointer p-2 hover:bg-slate-50 rounded-lg transition" onClick={() => setFormData({...formData, is_anonymous: !formData.is_anonymous})}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${formData.is_anonymous ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                            {formData.is_anonymous && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-xs font-bold text-slate-600">Bu ihbarı "Gizli Kaynak" olarak paylaş (İsmim görünmesin)</span>
                    </div>

                    <button onClick={handleSubmit} disabled={uploading} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-500/30 transition flex justify-center gap-2 items-center">
                        {uploading ? <Loader2 className="animate-spin"/> : <><Siren size={18} /> İHBARI YAYINLA</>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}