"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { createStaffUser, deleteStaffUser, updateStaffUser } from "@/app/actions/auth"; 
import { 
  Users, UserPlus, Shield, Activity, 
  Menu, BadgeCheck, Clock, Pencil, Trash2, XCircle, Save
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

export default function TeamPage() {
  const { role, isSuperAdmin, canManageTeam } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false); 
  const [editingUser, setEditingUser] = useState<any>(null); 

  useEffect(() => {
    if (window.innerWidth > 768) setSidebarOpen(true);
    if (role) fetchTeam();
  }, [role]);

  useEffect(() => {
    if (selectedUser) fetchUserLogs(selectedUser.id);
  }, [selectedUser]);

  async function fetchTeam() {
    let query = supabase.from('profiles').select('*').order('role');

    if (isSuperAdmin) {
       query = query.eq('role', 'admin'); 
    } else {
       query = query.neq('role', 'super_admin').neq('role', 'admin'); 
    }

    const { data } = await query;
    if (data) {
      setUsers(data);
      if (data.length > 0 && !selectedUser) setSelectedUser(data[0]);
    }
    setLoading(false);
  }

  async function fetchUserLogs(userId: string) {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setLogs(data); else setLogs([]);
  }

  // --- FORM İŞLEMLERİ ---
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    let result;
    if (editingUser) {
      result = await updateStaffUser(editingUser.id, formData);
    } else {
      result = await createStaffUser(null, formData);
    }
    
    if (result.success) {
      toast.success(result.message);
      setIsFormOpen(false);
      setEditingUser(null);
      fetchTeam(); 
    } else {
      toast.error(result.message);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Bu personeli silmek istediğinize emin misiniz?")) return;

    const result = await deleteStaffUser(userId);
    if (result.success) {
      toast.success("Personel silindi.");
      if (selectedUser?.id === userId) setSelectedUser(null);
      fetchTeam();
    } else {
      toast.error(result.message);
    }
  }

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingUser(null);
  }

  if (!canManageTeam && !loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 text-red-600 font-bold p-10">🚫 YETKİSİZ ALAN</div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Toaster position="top-right" richColors />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
           <div className="flex items-center gap-3">
             <button onClick={() => setSidebarOpen(true)} className="md:hidden text-slate-600"><Menu/></button>
             <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
               <Users className="text-indigo-600" /> 
               {isSuperAdmin ? 'Mağaza Yöneticileri' : 'Personel Yönetimi'}
             </h1>
           </div>
           
           {!isFormOpen && (
             <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
               <UserPlus size={18}/> Yeni Kayıt
             </button>
           )}
        </header>

        <div className="flex-1 overflow-hidden p-6">
           
           {isFormOpen ? (
             <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-slate-200 mt-5 animate-in fade-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-700">
                    {editingUser ? <Pencil size={20}/> : <BadgeCheck size={20}/>}
                    {editingUser ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}
                  </h3>
                  <button onClick={handleCancel} className="text-slate-400 hover:text-red-500"><XCircle size={24}/></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ad Soyad</label>
                    <input name="fullName" type="text" defaultValue={editingUser?.full_name} required className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500"/>
                  </div>
                  
                  {!editingUser && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-Posta</label>
                      <input name="email" type="email" required className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500"/>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      {editingUser ? 'Yeni Şifre (Boş bırakılabilir)' : 'Şifre'}
                    </label>
                    <input name="password" type="text" required={!editingUser} minLength={6} placeholder={editingUser ? "******" : ""} className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500"/>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Yetki Seviyesi</label>
                    <select name="role" defaultValue={editingUser?.role || 'tezgahtar'} className="w-full bg-slate-50 border p-3 rounded-xl outline-none focus:border-indigo-500">
                      <option value="tezgahtar">Tezgahtar (Sadece Satış)</option>
                      <option value="personel">Personel (Stok + Satış)</option>
                      {isSuperAdmin && <option value="admin">MAĞAZA YÖNETİCİSİ</option>}
                    </select>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <button type="button" onClick={handleCancel} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">İptal</button>
                    <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex justify-center gap-2">
                       <Save size={20}/> {editingUser ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </form>
             </div>
           ) : (
             <div className="flex h-full gap-6">
                <div className="w-1/3 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                   <div className="p-4 bg-slate-50 border-b font-bold text-slate-500 text-xs uppercase flex justify-between">
                      <span>{isSuperAdmin ? 'Mağazalar' : 'Ekip Listesi'} ({users.length})</span>
                   </div>
                   <div className="overflow-y-auto flex-1 p-2 space-y-2">
                      {users.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-400">Kayıt bulunamadı.</div>
                      ) : users.map(user => (
                        <div key={user.id} className={`p-3 rounded-xl border transition flex items-center justify-between group cursor-pointer ${selectedUser?.id === user.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`} onClick={() => setSelectedUser(user)}>
                           <div>
                             <p className="font-bold text-slate-800">{user.full_name || 'İsimsiz'}</p>
                             <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'personel' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{user.role === 'admin' ? 'Mağaza Sahibi' : user.role}</span>
                           </div>
                           <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); handleEditClick(user); }} className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition"><Pencil size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"><Trash2 size={14}/></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
                    {selectedUser ? (
                      <>
                        <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                           <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">{selectedUser.full_name?.charAt(0).toUpperCase()}</div>
                           <div><h2 className="text-xl font-bold">{selectedUser.full_name}</h2><p className="text-sm text-slate-500 flex items-center gap-1"><Shield size={12}/> {selectedUser.role.toUpperCase()}</p></div>
                        </div>
                        <div className="p-4 bg-slate-50 border-b text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Clock size={14}/> Son Hareketler</div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                           {logs.length === 0 ? <div className="text-center text-slate-400 py-10 italic">İşlem kaydı yok.</div> : logs.map(log => (
                             <div key={log.id} className="flex gap-4 p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg transition">
                                <div className="text-xs font-mono text-slate-400 w-16 pt-1">{new Date(log.created_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</div>
                                <div><p className="font-bold text-sm text-slate-700">{log.action_type}</p><p className="text-sm text-slate-500">{log.description}</p></div>
                             </div>
                           ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3"><Activity size={48} className="opacity-20"/><p>Detayları görmek için listeden bir personel seçin.</p></div>
                    )}
                </div>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}