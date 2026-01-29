"use client";
import { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, Zap, BarChart3, Lock, Smartphone, 
  Menu, X, CheckCircle2, ChevronRight, Siren, 
  Database, Globe, ArrowRight, LayoutDashboard, 
  Users, Scale, Wallet, FileText, Bot, Box, Activity
} from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-300 selection:bg-amber-500/30 overflow-x-hidden">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <span className="font-bold text-slate-900 text-xl">N</span>
            </div>
            <span className="text-xl font-bold text-white tracking-wide">NOXUS GOLD</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#modules" className="hover:text-amber-400 transition">Modüller</a>
            <a href="#radar" className="hover:text-red-400 transition flex items-center gap-1"><Siren size={14} className="text-red-500"/> Radar</a>
            <a href="#ai" className="hover:text-purple-400 transition flex items-center gap-1"><Bot size={14} className="text-purple-500"/> AI Asistan</a>
            <Link href="/login" className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700">Giriş Yap</Link>
            <Link href="/login" className="px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold transition shadow-lg shadow-amber-500/20">
              Ücretsiz Dene
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!isMenuOpen)} className="md:hidden text-white">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-4 shadow-2xl">
            <a href="#modules" className="block text-white p-2 hover:bg-slate-800 rounded" onClick={() => setMenuOpen(false)}>Modüller</a>
            <a href="#radar" className="block text-white p-2 hover:bg-slate-800 rounded" onClick={() => setMenuOpen(false)}>Radar Sistemi</a>
            <Link href="/login" className="block w-full text-center py-3 bg-slate-800 rounded-lg text-white">Giriş Yap</Link>
            <Link href="/login" className="block w-full text-center py-3 bg-amber-500 text-slate-900 font-bold rounded-lg">Hemen Başla</Link>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-amber-400 text-xs font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            v3.5 GÜNCELLEMESİ: YAPAY ZEKA DESTEĞİ
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
            Kuyumculuğun <br/>
            <span className="bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 bg-clip-text text-transparent">İşletim Sistemi.</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Stok, Cari, Kasa, Personel ve Güvenlik. Hepsi tek bir bulut platformunda. 
            Veresiye defterini bırakın, işletmenizi <strong>Noxus Gold</strong> ile yönetin.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/login" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-slate-900 font-bold text-lg hover:bg-slate-200 transition shadow-2xl shadow-white/10 flex items-center justify-center gap-2 group">
              Hemen Başlayın <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
            </Link>
            <a href="#modules" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-slate-800/50 border border-slate-700 text-white font-medium hover:bg-slate-800 transition backdrop-blur-sm">
              Sistemi Tanıyın
            </a>
          </div>

          {/* DASHBOARD PREVIEW */}
          <div className="relative mx-auto max-w-6xl group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-purple-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden aspect-[16/9] relative transform transition-transform duration-500 group-hover:scale-[1.01]">
                <img 
                  src="/dashboard.png" 
                  alt="Noxus Dashboard" 
                  className="w-full h-full object-cover object-top" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'bg-slate-900');
                    e.currentTarget.parentElement!.innerHTML += '<div class="text-center text-slate-600 font-mono">DASHBOARD.PNG EKLENMELİ</div>';
                  }}
                />
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS STRIP --- */}
      <div className="border-y border-slate-800 bg-slate-900/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatItem number="81" label="İlde Aktif Radar" />
            <StatItem number="24/7" label="Bulut Erişimi" />
            <StatItem number="AI" label="Akıllı Rehber" />
            <StatItem number="0" label="Kurulum Maliyeti" />
        </div>
      </div>

      {/* --- DETAYLI MODÜL TANITIMI (FOTOĞRAF DESTEKLİ) --- */}
      <section id="modules" className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24">
                <span className="text-amber-500 font-bold tracking-widest text-sm uppercase">Modüller</span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mt-3">İhtiyacınız Olan Her Şey.</h2>
                <p className="text-slate-400 mt-4 max-w-2xl mx-auto">Noxus Gold, bir kuyumcunun günlük hayatta karşılaştığı tüm sorunları çözmek için tasarlanmış 7 ana modülden oluşur.</p>
            </div>

            <div className="space-y-32">
                {/* 1. HIZLI SATIŞ & POS */}
                <ModuleSection 
                    align="left"
                    icon={<Zap className="text-amber-500" size={32}/>}
                    title="Hızlı Satış & Akıllı POS"
                    desc="Müşteri beklemeyi sevmez. Terazi ve Barkod okuyucu entegrasyonu ile saniyeler içinde satış yapın."
                    features={[
                        "Sepete aynı anda Gram Altın, Dolar ve TL ürün ekleyin.",
                        "Teraziye koyduğunuz an gramaj ekrana otomatik yansır.",
                        "Satış bittiği an stok düşer, kasa güncellenir.",
                        "Anlık fiş yazdırma desteği."
                    ]}
                    color="amber"
                    imageSrc="/pos.png" 
                />

                {/* 2. CARİ HESAPLAR */}
                <ModuleSection 
                    align="right"
                    icon={<Users className="text-blue-500" size={32}/>}
                    title="Cari Hesap Yönetimi"
                    desc="Veresiye defterleri arasında kaybolmayın. Müşterilerinizin borçlarını para birimine göre ayrı ayrı takip edin."
                    features={[
                        "Has Altın, Dolar ve TL borçlarını ayrı ayrı tutar.",
                        "Örn: Ahmet Bey'in 10 Gr Has, 500 Dolar borcu var.",
                        "Tek tıkla hesap ekstresi (PDF) oluşturun.",
                        "Müşteriye işlem sonrası otomatik bilgilendirme."
                    ]}
                    color="blue"
                    imageSrc="/customers.png"
                />

                {/* 3. STOK & MADEN */}
                <ModuleSection 
                    align="left"
                    icon={<Box className="text-emerald-500" size={32}/>}
                    title="Stok & Maden Takibi"
                    desc="Dükkanınızda tam olarak ne kadar mal var? Noxus size anlık olarak stok durumunuzu ve toplam Has karşılığını söyler."
                    features={[
                        "RFID ve Barkodlu ürün takibi.",
                        "Ürünlere fotoğraf ekleme özelliği.",
                        "Vitrin sayımı ile eksik ürünleri anında tespit edin.",
                        "Toptancıdan gelen malı 'Hızlı Giriş' ile saniyeler içinde işleyin."
                    ]}
                    color="emerald"
                    imageSrc="/stock.png"
                />

                {/* 4. KASA & FİNANS */}
                <ModuleSection 
                    align="right"
                    icon={<Wallet className="text-indigo-500" size={32}/>}
                    title="Kasa & Finansal Raporlar"
                    desc="Akşam olduğunda 'Bugün ne kazandık?' sorusunun cevabı tek ekranda. Gelir, Gider ve Net Kar analizi."
                    features={[
                        "TL, USD, EUR ve GBP kasaları ayrı ayrı yönetilir.",
                        "Gün Sonu Z Raporunu Excel olarak indirin.",
                        "Net Servet Analizi: Stok + Alacak - Borç = Gerçek Varlık.",
                        "Personel giderleri ve dükkan masraflarını düşün."
                    ]}
                    color="indigo"
                    imageSrc="/vault.png"
                />
                
                {/* 5. EKİP YÖNETİMİ */}
                <ModuleSection 
                    align="left"
                    icon={<ShieldCheck className="text-rose-500" size={32}/>}
                    title="Ekip & Yetki Yönetimi"
                    desc="Gözünüz arkada kalmasın. Personeliniz sadece satış yapsın, kasanızı ve kar oranınızı göremesin."
                    features={[
                        "Personel, Tezgahtar ve Yönetici yetki seviyeleri.",
                        "Kara Kutu Log Sistemi: Kim, ne zaman, neyi sildi?",
                        "Şehir bazlı personel ataması (Radar için).",
                        "Personel performans takibi."
                    ]}
                    color="rose"
                    imageSrc="/team.png"
                />
            </div>
        </div>
      </section>

      {/* --- RADAR BÖLÜMÜ (ÖZEL VURGU) --- */}
      <section id="radar" className="py-32 relative overflow-hidden bg-slate-900 border-y border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-red-900/10 blur-[100px] pointer-events-none"/>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="flex-1 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">
                    <Siren size={14} className="animate-pulse"/> CANLI İSTİHBARAT AĞI
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                    Dolandırıcılara Karşı <br/>
                    <span className="text-red-500">Dijital Kalkan.</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Noxus Radar, 81 ildeki kuyumcuları birbirine bağlar. Bölgenizdeki şüpheli şahısları, sahte altıncıları veya çalıntı malları anlık olarak öğrenin. 
                </p>
                <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-slate-300">
                        <CheckCircle2 className="text-red-500" size={20}/> <span>Fotoğraflı Şüpheli Bildirimi</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                        <CheckCircle2 className="text-red-500" size={20}/> <span>Şehir Bazlı Otomatik Filtreleme</span>
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                        <CheckCircle2 className="text-red-500" size={20}/> <span>Anlık Bildirim Ağı</span>
                    </li>
                </ul>
            </div>
            <div className="flex-1">
                {/* Radar Mockup */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Siren size={100} className="text-red-500"/></div>
                    <div className="space-y-4 relative z-10">
                        <div className="flex items-start gap-4 p-4 bg-red-950/20 rounded-xl border border-red-900/30">
                            <div className="w-12 h-12 bg-red-900/20 rounded-lg flex items-center justify-center shrink-0">
                                <Users className="text-red-500"/>
                            </div>
                            <div>
                                <h4 className="text-red-400 font-bold text-sm">Şüpheli Şahıs - Mardin</h4>
                                <p className="text-xs text-slate-400 mt-1">Cumhuriyet Meydanı civarında sahte bilezik bozdurmaya çalışan 2 kişi...</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                                <ShieldCheck className="text-slate-500"/>
                            </div>
                            <div>
                                <h4 className="text-slate-400 font-bold text-sm">Çalıntı İhbarı - Diyarbakır</h4>
                                <p className="text-xs text-slate-500 mt-1">Ofis semtinde vitrin hırsızlığı girişimi...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- AI ASİSTAN BÖLÜMÜ --- */}
      <section id="ai" className="py-24 bg-slate-950 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-purple-900/10 to-slate-950"/>
         <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-block p-4 rounded-full bg-purple-500/10 mb-6 border border-purple-500/20">
                <Bot size={48} className="text-purple-400"/>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Noxus AI Rehber</h2>
            <p className="text-xl text-slate-400 mb-10">
                Sistemin içinde, size her an yardım etmeye hazır bir yapay zeka var. 
                <br/>"Raporu nasıl alırım?", "Ahmet Bey'in borcu ne kadar?" diye sorun, o cevaplasın.
            </p>
            <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto text-left shadow-2xl">
                <div className="flex gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"/>
                    <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none text-slate-300 text-sm">
                        Gün sonu raporunu Excel olarak nasıl alabilirim?
                    </div>
                </div>
                <div className="flex gap-4 flex-row-reverse">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">AI</div>
                    <div className="bg-purple-900/30 border border-purple-500/30 p-3 rounded-2xl rounded-tr-none text-purple-200 text-sm shadow-lg shadow-purple-900/20">
                        Sol menüden <b>Raporlar</b> sayfasına gidin. Sağ üst köşedeki yeşil <b>"Gün Sonu (Excel)"</b> butonuna basmanız yeterli Komutan! 🦅
                    </div>
                </div>
            </div>
         </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" className="py-24 bg-slate-950 border-t border-slate-900">
        <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Sıkça Sorulan Sorular</h2>
            <div className="space-y-4">
                <FaqItem 
                    question="Verilerim güvende mi?"
                    answer="Kesinlikle. 256-bit SSL şifreleme ve günlük bulut yedekleme ile verileriniz banka kasası kadar güvendedir."
                    isOpen={openFaq === 0}
                    onClick={() => toggleFaq(0)}
                />
                <FaqItem 
                    question="İnternet kesilirse ne olur?"
                    answer="Mobil uyumludur. Dükkan interneti gitse bile telefonunuzun internetiyle (Hotspot) sorunsuz satış yapmaya devam edebilirsiniz."
                    isOpen={openFaq === 1}
                    onClick={() => toggleFaq(1)}
                />
                <FaqItem 
                    question="Eski veresiye defterimi aktarabilir miyim?"
                    answer="Evet. Müşterilerinizi sisteme eklerken 'Devir Bakiyesi' olarak eski borçlarını girebilirsiniz."
                    isOpen={openFaq === 2}
                    onClick={() => toggleFaq(2)}
                />
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-center">
         <p className="text-slate-500 text-sm">© 2026 Noxus Gold Teknolojileri. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}

// --- ZIG-ZAG MODULE COMPONENT (IMAGE ENABLED) ---
function ModuleSection({align, icon, title, desc, features, color, imageSrc}: any) {
    const isLeft = align === 'left';
    
    // Renk sınıfları
    const colors: any = {
        amber: 'bg-amber-500 text-amber-500 border-amber-500',
        blue: 'bg-blue-500 text-blue-500 border-blue-500',
        emerald: 'bg-emerald-500 text-emerald-500 border-emerald-500',
        indigo: 'bg-indigo-500 text-indigo-500 border-indigo-500',
        rose: 'bg-rose-500 text-rose-500 border-rose-500',
    };

    const currentColor = colors[color] || colors.amber;

    return (
        <div className={`flex flex-col md:flex-row items-center gap-12 ${!isLeft ? 'md:flex-row-reverse' : ''}`}>
            {/* TEXT SIDE */}
            <div className="flex-1 space-y-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-900 border border-slate-800 ${currentColor.replace('bg-', 'text-').replace('border-', 'border-opacity-50 ')}`}>
                    {icon}
                </div>
                <h3 className="text-3xl font-bold text-white">{title}</h3>
                <p className="text-lg text-slate-400 leading-relaxed">{desc}</p>
                <ul className="space-y-3">
                    {features.map((feature: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-slate-300">
                            <CheckCircle2 size={20} className={`shrink-0 ${currentColor.split(' ')[1]}`}/>
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* VISUAL SIDE (REAL SCREENSHOT) */}
            <div className="flex-1 w-full">
                <div className={`aspect-[4/3] bg-slate-950 rounded-3xl border border-slate-800 p-2 relative overflow-hidden group hover:border-opacity-50 transition duration-500 shadow-2xl ${currentColor.split(' ')[2]}`}>
                    {/* The Image */}
                    <div className="w-full h-full rounded-2xl overflow-hidden bg-slate-900 relative">
                        {imageSrc ? (
                            <img 
                                src={imageSrc} 
                                alt={`${title} Arayüzü`}
                                className="w-full h-full object-cover object-top hover:scale-105 transition duration-700"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML += `
                                        <div class="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs p-4 text-center border-2 border-dashed border-slate-800">
                                            ${imageSrc} EKLENMELİ
                                        </div>
                                    `;
                                }}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono">GÖRSEL YOK</div>
                        )}
                    </div>

                    {/* Fake Window Controls */}
                    <div className="absolute top-4 left-4 right-4 h-6 flex gap-1.5 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatItem({number, label}: {number: string, label: string}) {
    return (
        <div className="flex flex-col items-center">
            <span className="text-3xl md:text-5xl font-bold text-white mb-2">{number}</span>
            <span className="text-sm md:text-base text-slate-500 uppercase tracking-widest font-medium">{label}</span>
        </div>
    )
}

function FaqItem({question, answer, isOpen, onClick}: any) {
    return (
        <div className="border border-slate-800 rounded-2xl bg-slate-900/50 overflow-hidden transition-all duration-300">
            <button onClick={onClick} className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-900 transition">
                <span className="font-bold text-lg text-white">{question}</span>
                <ChevronRight className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48' : 'max-h-0'}`}>
                <div className="p-6 pt-0 text-slate-400 leading-relaxed border-t border-slate-800/50 mt-2">
                    {answer}
                </div>
            </div>
        </div>
    )
}