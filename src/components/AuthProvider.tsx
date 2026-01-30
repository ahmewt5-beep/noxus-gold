"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: any;
  role: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isStaff: boolean;
  canManageTeam: boolean;
  canViewVault: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Rol Yetkileri
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isPersonel = role === 'personel';

  // Yetki Grupları
  const canManageTeam = isSuperAdmin || isAdmin;
  const canViewVault = isSuperAdmin || isAdmin;
  const isStaff = isSuperAdmin || isAdmin || isPersonel;

  // --- 1. Kullanıcı Bilgisini Getir ---
  const fetchUserProfile = async (sessionUser: any) => {
    try {
      // Profil tablosundan rolü çek
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .single();

      if (error || !profile) {
        console.error("Profil Bulunamadı (RLS veya Kayıt Yok):", error);
        // Eğer giriş yapmış ama profili yoksa, sistem bozulmasın diye varsayılan rol ver
        // Veya güvenlik istersen: await supabase.auth.signOut();
        setRole("personel"); 
      } else {
        setRole(profile.role);
      }
      
      setUser(sessionUser);

    } catch (err) {
      console.error("Auth Kritik Hata:", err);
      setRole(null);
    }
  };

  // --- 2. Başlangıç Kontrolü ---
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Mevcut oturumu al
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          // Oturum yoksa temizle
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Session hatası:", error);
      } finally {
        // 🔥 EN ÖNEMLİ KISIM: Ne olursa olsun loading'i kapat!
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // --- 3. Oturum Değişikliklerini Dinle ---
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log("Auth Olayı:", event); // Debug için açabilirsin

      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        // Sadece çıkış yapıldığında loading kapatılsın, 
        // yönlendirmeyi middleware veya sayfalar halleder.
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    router.replace("/login");
    setLoading(false);
  };

  // --- LOADING EKRANI ---
  // Eğer hala yükleniyorsa, tüm siteyi durdurup bunu göster
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-800 border-t-amber-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">N</div>
        </div>
        <p className="text-slate-400 text-sm animate-pulse">Sistem Başlatılıyor...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
        user, role, loading, signOut,
        isSuperAdmin, isStaff, canManageTeam, canViewVault
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);