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

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isPersonel = role === 'personel';

  const canManageTeam = isSuperAdmin || isAdmin;
  const canViewVault = isSuperAdmin || isAdmin;
  const isStaff = isSuperAdmin || isAdmin || isPersonel;

  // --- Profil Çekme Fonksiyonu ---
  const fetchUserProfile = async (sessionUser: any) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', sessionUser.id)
        .maybeSingle(); // single() yerine maybeSingle() hata patlatmaz

      if (profile) {
        setRole(profile.role);
      } else {
        // Profil yoksa varsayılan
        setRole("personel");
      }
      setUser(sessionUser);
    } catch (err) {
      console.error("Profil hatası:", err);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 🔥 ZAMAN AYARLI BOMBA (TIMEOUT) 🔥
    // Eğer Supabase 3 saniye içinde cevap vermezse, yüklemeyi zorla kapat.
    const timeBomb = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth yanıt vermedi, yükleme zorla kapatılıyor...");
        setLoading(false);
      }
    }, 3000); // 3 Saniye bekleme süresi

    const initializeAuth = async () => {
      try {
        // 1. Session Kontrolü
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          // Oturum yok
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Auth Başlatma Hatası:", error);
        // Hata durumunda kullanıcıyı sil ki login'e atsın
        setUser(null);
      } finally {
        // İşlem bitti, bombayı iptal et ve loading'i kapat
        clearTimeout(timeBomb);
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // Listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Profil bilgisini burada tekrar çekmeye gerek yok, initialize yapıyor zaten.
        // Ama rol değişimi için gerekirse buraya eklenebilir.
      } else {
        setUser(null);
        setRole(null);
        router.refresh(); // Çıkış yapınca sayfayı yenile
      }
      // Listener tetiklendiğinde de loading kapat
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeBomb);
      authListener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
        setLoading(true);
        await supabase.auth.signOut();
        setUser(null);
        setRole(null);
        router.push("/login"); 
    } catch (error) {
        console.error("Çıkış hatası", error);
    } finally {
        setLoading(false);
    }
  };

  // --- LOADING EKRANI ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white gap-4 z-[9999] relative">
        <Loader2 className="animate-spin text-amber-500 w-12 h-12" />
        <p className="text-slate-400 text-sm font-mono animate-pulse">Sistem Bağlanıyor...</p>
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