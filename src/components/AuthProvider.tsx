"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// Rol Tanımları
type Role = 'super_admin' | 'admin' | 'personel' | 'tezgahtar' | null;

interface AuthContextType {
  user: any;
  role: Role;
  loading: boolean;
  isSuperAdmin: boolean; // SEN (Platform Sahibi)
  isStoreAdmin: boolean; // MAĞAZA SAHİBİ (Admin)
  isStaff: boolean;      // Personel
  canViewVault: boolean; // Kasa Yetkisi (Super Admin + Admin)
  canManageTeam: boolean; // Ekip Kurma Yetkisi (Super Admin + Admin)
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, role: null, loading: true, 
  isSuperAdmin: false, isStoreAdmin: false, isStaff: false,
  canViewVault: false, canManageTeam: false
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Profil tablosundan rolü çek
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setRole(data?.role as Role || 'tezgahtar');
      }
      setLoading(false);
    }
    getUser();
  }, []);

  // YETKİ MATRİSİ
  const isSuperAdmin = role === 'super_admin';
  const isStoreAdmin = role === 'admin';
  const isStaff = role === 'personel';
  
  // Kasa ve Raporları kim görür? -> Sen ve Mağaza Sahibi
  const canViewVault = isSuperAdmin || isStoreAdmin;

  // Kim eleman ekleyebilir? -> Sen ve Mağaza Sahibi
  const canManageTeam = isSuperAdmin || isStoreAdmin;

  const value = {
    user, role, loading,
    isSuperAdmin, isStoreAdmin, isStaff,
    canViewVault, canManageTeam
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);