"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Hexagon, Lock, Loader2, ArrowRight } from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Giriş Başarısız", { description: error.message });
        setLoading(false); // Hata varsa loading'i kapat
      } else {
        toast.success("Giriş Başarılı! Yönlendiriliyorsunuz...");
        
        // 1. Önce router'ı yenile (Auth durumunu algılaması için şart)
        router.refresh(); 
        
        // 2. Kısa bir gecikmeyle ana sayfaya at
        // (Next.js'in cookie'yi işlemesi için minik bir süre tanıyoruz)
        setTimeout(() => {
             router.replace('/'); 
        }, 500); 
      }
    } catch (error: any) {
      toast.error("Beklenmedik Hata", { description: error.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster position="top-center" richColors />
      
      {/* Arka Plan Efekti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-amber-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
        
        {/* Sol Şerit (Dekoratif) */}
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-600 to-amber-500"></div>

        <div className="p-8 md:p-10">
          
          {/* LOGO */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
               <Hexagon fill="white" className="text-indigo-600" size={32} />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">NOXUS GOLD</h1>
            <p className="text-slate-500 text-sm mt-1">Güvenli Yönetim Paneli</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1.5 block">Kullanıcı Adı (Email)</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-700"
                  placeholder="admin@goldex.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1.5 block">Şifre</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 pl-10 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition font-medium text-slate-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={20} />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:shadow-indigo-600/30 transition-all duration-300 flex items-center justify-center gap-2 group transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <>Giriş Yap <ArrowRight size={20} className="group-hover:translate-x-1 transition" /></>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              © 2026 Noxus Software Solutions. <br/>
              Sistem güvenliği 256-bit SSL ile korunmaktadır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}