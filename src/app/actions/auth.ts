"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

// ADMIN CLIENT (Yazma Yetkili - Super User)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// YENİ KULLANICI OLUŞTURMA
export async function createStaffUser(prevState: any, formData: FormData) {
  
  // 👇 KRİTİK DÜZELTME: 'await' EKLENDİ
  const cookieStore = await cookies(); 

  // SSR CLIENT (Okuma Yetkili - Kimin işlem yaptığını anlamak için)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  // 1. MEVCUT KULLANICIYI BUL
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  if (!currentUser) {
    return { success: false, message: "İşlem yapmak için oturum açmalısınız." };
  }

  // İşlemi yapanın rolünü sorgula
  const { data: currentProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', currentUser.id)
    .single();

  const creatorRole = currentProfile?.role;
  
  // 2. FORM VERİLERİNİ AL
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;
  const targetRole = formData.get("role") as string;

  if (!email || !password || !fullName) {
    return { success: false, message: "Eksik bilgi girdiniz." };
  }

  // --- HİYERARŞİ KONTROLLERİ ---
  
  // Sadece 'super_admin', 'admin' oluşturabilir.
  if (targetRole === 'admin' && creatorRole !== 'super_admin') {
    return { success: false, message: "YETKİSİZ: Sadece Platform Sahibi yeni mağaza (Admin) açabilir." };
  }

  // Kimse 'super_admin' oluşturamaz.
  if (targetRole === 'super_admin') {
    return { success: false, message: "HATA: Süper Admin rütbesi oluşturulamaz." };
  }

  try {
    // 3. KULLANICIYI OLUŞTUR
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;

    if (userData.user) {
      // 4. ROLÜ GÜNCELLE (Profiles Tablosu)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ role: targetRole, full_name: fullName })
        .eq('id', userData.user.id);

      if (profileError) {
          // Profil güncellenemezse (örneğin trigger çalışmazsa) elle eklemeyi dene
          await supabaseAdmin.from('profiles').insert({ id: userData.user.id, role: targetRole, full_name: fullName });
      }
    }

    revalidatePath("/team");
    return { success: true, message: "Kullanıcı başarıyla oluşturuldu." };

  } catch (error: any) {
    return { success: false, message: "Hata: " + error.message };
  }
}

// 🔥 PERSONEL SİLME (DELETE)
export async function deleteStaffUser(targetUserId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { success: false, message: "Oturum açmalısınız." };

  if (currentUser.id === targetUserId) {
    return { success: false, message: "Kendi hesabınızı silemezsiniz." };
  }

  try {
    // Auth tablosundan sil (Cascade ile profil de silinir)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (error) throw error;

    revalidatePath("/team");
    return { success: true, message: "Kullanıcı silindi." };
  } catch (error: any) {
    return { success: false, message: "Silme Hatası: " + error.message };
  }
}

// 🛠️ PERSONEL GÜNCELLEME (UPDATE)
export async function updateStaffUser(targetUserId: string, formData: FormData) {
  const fullName = formData.get("fullName") as string;
  const role = formData.get("role") as string;
  const password = formData.get("password") as string; 

  if (!fullName || !role) return { success: false, message: "İsim ve Rütbe zorunludur." };

  try {
    // 1. Profil Bilgilerini Güncelle
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName, role: role })
      .eq('id', targetUserId);

    if (profileError) throw profileError;

    // 2. Şifre Güncelleme (Varsa)
    if (password && password.length >= 6) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: password }
      );
      if (passwordError) throw passwordError;
    }

    revalidatePath("/team");
    return { success: true, message: "Kullanıcı güncellendi." };

  } catch (error: any) {
    return { success: false, message: "Güncelleme Hatası: " + error.message };
  }
}