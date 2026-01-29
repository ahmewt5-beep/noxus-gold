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
  // Tezgahtar sadece 'tezgahtar'dır.

  // Yetki Grupları
  const canManageTeam = isSuperAdmin || isAdmin; // Ekip yönetimi
  const canViewVault = isSuperAdmin || isAdmin; // Kasa ve Rapor
  const isStaff = isSuperAdmin || isAdmin || isPersonel; // Stok yönetimi

  useEffect(() => {
    // 1. Mevcut Oturumu Kontrol Et
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          // 🔥 KRİTİK: Rolü Metadata'dan değil, Canlı Tablodan Çek
          await fetchRoleFromProfile(session.user.id);
        } else {
          setRole(null);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // 2. Oturum Değişikliklerini Dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchRoleFromProfile(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        router.push("/login");
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Profil tablosundan ROL çekme fonksiyonu
  const fetchRoleFromProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (data) {
      console.log("🔥 GÜNCEL ROL:", data.role); // Konsoldan kontrol et
      setRole(data.role);
    } else {
      console.error("Profil bulunamadı:", error);
      setRole("tezgahtar"); // Güvenlik için varsayılan en düşük
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
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