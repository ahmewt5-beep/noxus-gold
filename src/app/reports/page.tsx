"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { 
  PieChart, BarChart, TrendingUp, TrendingDown, Printer, 
  AlertTriangle, ShieldCheck, Banknote, Coins, Loader2 
} from "lucide-react";
// Recharts importlarını alias ile alıyoruz
import { 
  PieChart as RePie, Pie, Cell, BarChart as ReBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Toaster, toast } from "sonner";

// 👇 DÜZELTME BURADA: Bu tanımları EN ÜSTE, importların altına taşıdık.
const RePieChart = RePie;
const ReBarChart = ReBar;

export default function ReportsPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (window.innerWidth > 768) setSidebarOpen(true);
  }, []);

  const [metrics, setMetrics] = useState({
    totalGoldStockValue: 0, totalCashTL: 0, receivablesGold: 0,    
    receivablesTL: 0, debtGold: 0, debtTL: 0, totalExpenses: 0, netWorth: 0             
  });

  const [topDebtors, setTopDebtors] = useState<any[]>([]); 
  const [expenseData, setExpenseData] = useState<any[]>([]);

  useEffect(() => { fetchIntelligence(); }, []);

  async function fetchIntelligence() {
    try {
      const { data: products } = await supabase.from('products').select('*').eq('is_active', true);
      const stockVal = products?.reduce((acc, p) => acc + (p.stock_gram * p.purity), 0) || 0;

      const { data: customers } = await supabase.from('customers').select('*');
      let recGold = 0, recTL = 0, dbtGold = 0, dbtTL = 0;
      
      customers?.forEach(c => {
        if (c.balance_has < 0) recGold += Math.abs(c.balance_has);
        else dbtGold += c.balance_has;
        if (c.balance_tl < 0) recTL += Math.abs(c.balance_tl);
        else dbtTL += c.balance_tl;
      });

      const riskyCustomers = customers
        ?.filter(c => c.balance_has < -1 || c.balance_tl < -1000)
        .sort((a, b) => a.balance_has - b.balance_has)
        .slice(0, 5);
      
      setTopDebtors(riskyCustomers || []);

      const netWorthInd = stockVal + recGold - dbtGold; 

      setMetrics({
        totalGoldStockValue: stockVal, totalCashTL: 0, 
        receivablesGold: recGold, receivablesTL: recTL,
        debtGold: dbtGold, debtTL: dbtTL, totalExpenses: 0, netWorth: netWorthInd
      });

      const { data: expenses } = await supabase.from('expenses').select('*');
      const expenseMap: any = {};
      expenses?.forEach(e => {
         expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
      });
      const formattedExp = Object.keys(expenseMap).map(k => ({ name: k, value: expenseMap[k] }));
      setExpenseData(formattedExp);

    } catch (error) { toast.error("Veri hatası."); } finally { setLoading(false); }
  }

  const assetData = [
    { name: 'Stoktaki Altın', value: metrics.totalGoldStockValue },
    { name: 'Piyasadaki Altın (Alacak)', value: metrics.receivablesGold },
  ];

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm print:hidden shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" /> İstihbarat & Raporlar
          </h1>
          <button onClick={() => window.print()} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 transition">
             <Printer size={18} /> Raporu Yazdır
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl mb-8 relative overflow-hidden print:bg-slate-900 print:text-white print:-webkit-print-color-adjust:exact">
             <div className="absolute top-0 right-0 p-8 opacity-10"><ShieldCheck size={150} /></div>
             <div className="relative z-10">
                <h2 className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">TOPLAM ALTIN VARLIĞI (NET SERVET)</h2>
                <div className="flex items-baseline gap-4">
                   <h1 className="text-5xl font-mono font-bold text-amber-400">{metrics.netWorth.toFixed(2)} <span className="text-2xl">gr HAS</span></h1>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:grid-cols-2">
             <ReportCard title="Vitrindeki Stok" value={`${metrics.totalGoldStockValue.toFixed(2)} gr`} sub="Fiziksel Altın" icon={<Coins size={24} />} color="bg-amber-500" />
             <ReportCard title="Piyasa Alacak (Altın)" value={`${metrics.receivablesGold.toFixed(2)} gr`} sub="Müşterideki Altın" icon={<TrendingUp size={24} />} color="bg-emerald-500" />
             <ReportCard title="Piyasa Alacak (TL)" value={`${metrics.receivablesTL.toLocaleString()} ₺`} sub="Müşterideki Nakit" icon={<Banknote size={24} />} color="bg-blue-500" />
             <ReportCard title="Piyasa Borç (Risk)" value={`${metrics.debtGold.toFixed(2)} gr`} sub="Müşteriye Borçlarımız" icon={<AlertTriangle size={24} />} color="bg-red-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:grid-cols-2">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96 print:border-2">
                <h3 className="font-bold text-slate-800 mb-4">Sermaye Dağılımı</h3>
                {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                       <RePieChart>
                          <Pie data={assetData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                            {assetData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#10b981'} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                       </RePieChart>
                    </ResponsiveContainer>
                )}
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-96 print:border-2">
                <h3 className="font-bold text-slate-800 mb-4">Gider Kalemleri</h3>
                {isMounted && expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={expenseData}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} />
                       <XAxis dataKey="name" tick={{fontSize: 12}} />
                       <YAxis tick={{fontSize: 12}} />
                       <Tooltip cursor={{fill: 'transparent'}} />
                       <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </ReBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">Veri yok.</div>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ReportCard({ title, value, sub, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between group hover:shadow-md transition print:border-slate-300">
       <div>
          <p className="text-slate-400 text-xs font-bold uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
       </div>
       <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100`}>{icon}</div>
    </div>
  );
}