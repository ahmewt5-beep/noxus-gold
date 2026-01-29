"use client";
import { 
  LayoutDashboard, Users, Package, Wallet, PieChart, 
  Settings, LogOut, Hexagon, X, ShieldCheck, UserCog,
  ScanBarcode, Radio, Siren, Contact
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider"; 

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>> | ((val: boolean) => void);
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Auth'dan rolü çekiyoruz. (Eğer useAuth hook'unda role dönmüyorsa eklemen gerekir)
  // Şimdilik senin yolladığın kodda rol yoksa diye güvenli bir fallback yapıyorum.
  const { role } = useAuth(); 

  // --- 🛡️ MENÜ YAPILANDIRMASI ---
  const menuConfig = [
    {
      title: "Genel",
      items: [
        { 
          text: "Genel Bakış", 
          href: "/", 
          icon: LayoutDashboard, 
          roles: ['super_admin', 'admin', 'personel', 'tezgahtar'] // Herkes
        },
        { 
          text: "Cari Hesaplar", 
          href: "/customers", 
          icon: Users, 
          roles: ['super_admin', 'admin', 'personel', 'tezgahtar'] // Herkes
        },
        { 
          text: "Vitrin Sayımı", 
          href: "/showcase", 
          icon: ShieldCheck, 
          roles: ['super_admin', 'admin', 'personel'] // Tezgahtar yapamaz
        },
      ]
    },
    {
      title: "Operasyonel",
      items: [
        { 
          text: "Stok & Maden", 
          href: "/stock", 
          icon: Package, 
          roles: ['super_admin', 'admin', 'personel'] // Tezgahtar göremez
        },
        { 
          text: "RFID Sayım", 
          href: "/rfid-count", 
          icon: Radio, 
          roles: ['super_admin', 'admin', 'personel'] 
        },
        { 
          text: "Hızlı Giriş", 
          href: "/bulk-entry", 
          icon: ScanBarcode, 
          roles: ['super_admin', 'admin', 'personel'] 
        },
      ]
    },
    {
      title: "Finans & Yönetim",
      items: [
        { 
          text: "Kasa İşlemleri", 
          href: "/vault", 
          icon: Wallet, 
          roles: ['super_admin', 'admin'] // Sadece Yöneticiler
        },
        { 
          text: "Raporlar", 
          href: "/reports", 
          icon: PieChart, 
          roles: ['super_admin', 'admin'] 
        },
        { 
          text: "Radar (İstihbarat)", 
          href: "/radar", 
          icon: Siren, 
          className: "text-red-500 animate-pulse", // Özel stil
          roles: ['super_admin', 'admin', 'personel', 'tezgahtar'] 
        },
      ]
    },
    {
      title: "Sistem",
      items: [
        { 
          text: "Ekip Yönetimi", 
          href: "/team", 
          icon: UserCog, 
          roles: ['super_admin', 'admin'] 
        },
        { 
          text: "Ayarlar", 
          href: "/settings", 
          icon: Settings, 
          roles: ['super_admin', 'admin'] 
        },
      ]
    }
  ];

  // --- LOGOUT FONKSİYONU (Senin kodun, hata vermez) ---
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Çıkış yapıldı.");
      router.push('/login');
      router.refresh(); 
    } catch (error) { toast.error("Hata oluştu."); }
  };

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname.startsWith(path));
  
  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsOpen(false);
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-[49] transition-opacity duration-300 md:hidden ${isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`fixed md:relative inset-y-0 left-0 z-[50] bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl shrink-0 h-screen ${isOpen ? 'translate-x-0 w-72 p-4' : '-translate-x-full md:translate-x-0 md:w-20 md:p-2 md:items-center'}`}>
        
        {/* HEADER & LOGO */}
        <div className={`flex items-center justify-between mb-10 px-2 ${!isOpen && 'md:justify-center'}`}>
            <Link href="/" className="flex items-center gap-3 cursor-pointer group">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition shrink-0">
                    <Hexagon fill="white" className="text-indigo-600" size={24} />
                </div>
                {isOpen && (
                    <div className="animate-in fade-in duration-300">
                        <h1 className="font-bold text-xl tracking-wide">NOXUS</h1>
                        <p className="text-[10px] text-slate-400 font-medium tracking-widest">GOLDEX PANEL</p>
                    </div>
                )}
            </Link>
            <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={24}/></button>
        </div>

        {/* --- DİNAMİK MENÜ ALANI --- */}
        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar">
          {menuConfig.map((group, groupIndex) => {
            // Bu grupta, kullanıcının rolüne uygun en az 1 item var mı?
            const visibleItems = group.items.filter(item => item.roles.includes(role || ''));
            
            if (visibleItems.length === 0) return null; // Eğer yoksa grup başlığını da gösterme

            return (
              <div key={groupIndex}>
                {isOpen && <p className="px-4 text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">{group.title}</p>}
                <div className="space-y-2">
                  {visibleItems.map((item, itemIndex) => (
                    <SidebarItem 
                      key={itemIndex}
                      icon={<item.icon size={20} className={item.className} />} 
                      text={item.text} 
                      href={item.href} 
                      isOpen={isOpen} 
                      active={isActive(item.href)} 
                      onClick={handleLinkClick} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* FOOTER (LOGOUT) */}
        <div className="border-t border-slate-800 pt-4 space-y-2 shrink-0">
          <button onClick={() => handleLogout()} className={`w-full flex items-center gap-4 p-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group ${!isOpen && 'justify-center'}`}>
            <LogOut size={20} />
            {isOpen && <span className="font-medium text-sm animate-in fade-in">Çıkış Yap</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({ icon, text, active = false, isOpen, href = "#", onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="block">
      <div className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200 group relative ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <div className={`${!active && 'group-hover:scale-110 transition'} relative z-10 shrink-0`}>{icon}</div>
        {isOpen && <span className="font-medium text-sm whitespace-nowrap relative z-10 animate-in fade-in">{text}</span>}
        {!isOpen && <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none hidden md:block">{text}</div>}
      </div>
    </Link>
  );
}