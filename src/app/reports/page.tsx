"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { exportToExcel } from "@/lib/excel"; 
import { 
  BarChart3, TrendingUp, TrendingDown, Wallet, 
  FileSpreadsheet, Loader2, Calendar, ShieldCheck
} from "lucide-react";
import { toast, Toaster } from "sonner";

export default function ReportsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalAssetsHas: 0,
    totalDebtHas: 0,
    netWorthHas: 0,
    todayTransactionCount: 0
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) setSidebarOpen(true);
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const { data: customers } = await supabase.from('customers').select('balance_has');
      
      let assets = 0; 
      let debt = 0;   

      customers?.forEach(c => {
         if (c.balance_has > 0) debt += c.balance_has; 
         else assets += Math.abs(c.balance_has);      
      });

      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`);

      setReportData({
        totalAssetsHas: assets,
        totalDebtHas: debt,
        netWorthHas: assets - debt, 
        todayTransactionCount: count || 0
      });

    } catch (error) {
      console.error(error);
      toast.error("Raporlar hesaplanamadı.");
    } finally {
      setLoading(false);
    }
  }

  // --- EXCEL İNDİRME MOTORU (GÜNLÜK & AYLIK) ---
  async function handleDownloadExcel(type: 'DAILY' | 'MONTHLY') {
    const label = type === 'DAILY' ? 'Günlük' : 'Aylık';
    const loadToast = toast.loading(`${label} rapor hazırlanıyor...`);
    
    try {
        const today = new Date();
        let queryDate = "";

        if (type === 'DAILY') {
            // Sadece bugün (Gece 00:00'dan itibaren)
            queryDate = today.toISOString().split('T')[0] + 'T00:00:00';
        } else {
            // Ayın 1'inden itibaren (Bu Ay)
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            // Saat farkını önlemek için yerel saat dilimine dikkat ederek ISO string yapıyoruz veya basitçe string birleştiriyoruz
            queryDate = firstDay.toISOString().split('T')[0] + 'T00:00:00';
        }

        // 1. İşlemleri Çek
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
                created_at,
                type,
                product_name,
                gram,
                price,
                description,
                customers ( full_name ) 
            `) 
            .gte('created_at', queryDate)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!transactions || transactions.length === 0) {
            toast.dismiss(loadToast);
            toast.warning(`Bu ${type === 'DAILY' ? 'gün' : 'ay'} işlem bulunamadı.`);
            return;
        }

        // 2. Veriyi Excel için Formatla
        const formattedData = transactions.map((t: any) => ({
            'Tarih': new Date(t.created_at).toLocaleDateString('tr-TR') + ' ' + new Date(t.created_at).toLocaleTimeString('tr-TR'),
            'Müşteri': (t.customers as any)?.full_name || 'Misafir', // 👈 HATA DÜZELTİLDİ (as any eklendi)
            'İşlem Türü': t.type === 'SATIS' ? 'Satış (Çıkış)' : 'Tahsilat/Alış (Giriş)',
            'Ürün': t.product_name,
            'Miktar (Gr)': t.gram,
            'Tutar (TL)': t.price,
            'Açıklama': t.description
        }));

        // 3. Dosya İsmi
        const dateStr = today.toISOString().split('T')[0];
        const fileName = type === 'DAILY' 
            ? `Gun_Sonu_Raporu_${dateStr}` 
            : `Ay_Raporu_${today.getFullYear()}_${today.getMonth() + 1}`;

        // 4. İndir
        exportToExcel(formattedData, fileName);
        
        toast.dismiss(loadToast);
        toast.success(`${label} rapor indirildi. 📥`);

    } catch (error: any) {
        toast.dismiss(loadToast);
        toast.error("İndirme başarısız:", { description: error.message });
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm">
           <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
             <BarChart3 className="text-indigo-600" /> Finansal Raporlar
           </h1>
           
           {/* EXCEL BUTONLARI */}
           <div className="flex gap-2">
                <button 
                    onClick={() => handleDownloadExcel('DAILY')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-500/20 text-xs lg:text-sm"
                >
                    <FileSpreadsheet size={16} /> 
                    <span className="hidden sm:inline">Gün Sonu (Excel)</span>
                </button>

                <button 
                    onClick={() => handleDownloadExcel('MONTHLY')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-500/20 text-xs lg:text-sm"
                >
                    <Calendar size={16} /> 
                    <span className="hidden sm:inline">Bu Ay (Excel)</span>
                </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
           {loading ? <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-indigo-600"/></div> : (
             <div className="space-y-8">
                
                {/* ÖZET KARTLARI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* VARLIKLAR (ALACAKLAR) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><TrendingUp size={20}/></div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase">Piyasa Alacağı</h3>
                        </div>
                        <p className="text-3xl font-bold font-mono text-slate-800">{reportData.totalAssetsHas.toFixed(2)} <span className="text-sm text-slate-400">gr Has</span></p>
                        <p className="text-xs text-slate-400 mt-2">Müşterilerin size olan borçları</p>
                    </div>

                    {/* BORÇLAR (EMANETLER) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600"><TrendingDown size={20}/></div>
                            <h3 className="text-slate-500 font-bold text-sm uppercase">Müşteri Emanetleri</h3>
                        </div>
                        <p className="text-3xl font-bold font-mono text-red-600">{reportData.totalDebtHas.toFixed(2)} <span className="text-sm text-red-400">gr Has</span></p>
                        <p className="text-xs text-slate-400 mt-2">Müşterilerin sizdeki altınları</p>
                    </div>

                    {/* NET DURUM */}
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-lg text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={64}/></div>
                        <div className="flex items-center gap-3 mb-2 relative z-10">
                            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300"><Wallet size={20}/></div>
                            <h3 className="text-indigo-200 font-bold text-sm uppercase">Net İşletme Durumu</h3>
                        </div>
                        <p className={`text-3xl font-bold font-mono relative z-10 ${reportData.netWorthHas >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {reportData.netWorthHas > 0 ? '+' : ''}{reportData.netWorthHas.toFixed(2)} <span className="text-sm opacity-60">gr Has</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-2 relative z-10">Alacaklar - Borçlar (Stok Dahil Değil)</p>
                    </div>
                </div>

                {/* BUGÜNKÜ İŞLEM BİLGİSİ */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-full shadow-sm text-indigo-600"><Calendar size={24}/></div>
                        <div>
                            <h3 className="font-bold text-indigo-900">Raporlar Hazır</h3>
                            <p className="text-sm text-indigo-700/70">Bugün toplam <b>{reportData.todayTransactionCount}</b> adet işlem gerçekleşti.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleDownloadExcel('DAILY')} className="text-sm font-bold text-emerald-600 hover:text-emerald-800 underline">Günlük İndir</button>
                        <span className="text-slate-300">|</span>
                        <button onClick={() => handleDownloadExcel('MONTHLY')} className="text-sm font-bold text-blue-600 hover:text-blue-800 underline">Aylık İndir</button>
                    </div>
                </div>

             </div>
           )}
        </div>
      </main>
    </div>
  );
}