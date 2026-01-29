import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Gidilen yol (Path)
  const path = request.nextUrl.pathname;

  // Başlangıç yanıtı
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        // 👇 DÜZELTME BURADA:
        set(name: string, value: string, options: CookieOptions) {
          // Request'e yazarken obje formatı zorunlu
          request.cookies.set({ name, value, ...options });
          
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          
          // Response'a yazarken 3 parametreli kullanarak Type hatasını aşıyoruz
          response.cookies.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          // Request'ten silerken boş değer atıyoruz
          request.cookies.set({ name, value: "", ...options });
          
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          
          // Response'dan silerken yine 3 parametreli yöntem
          response.cookies.set(name, "", options);
        },
      },
    }
  );

  // Kullanıcıyı kontrol et
  const { data: { user } } = await supabase.auth.getUser();

  // --- 🛡️ GÜVENLİK KURALLARI 🛡️ ---

  // 1. Eğer kullanıcı ZATEN giriş yapmışsa ve Login sayfasına gitmeye çalışıyorsa
  // Onu direkt içeri (Dashboard'a) al.
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Eğer kullanıcı GİRİŞ YAPMAMIŞSA ve şu an Login sayfasında DEĞİLSE
  // Onu zorla Login sayfasına gönder.
  if (!user && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Diğer durumlarda geçişe izin ver
  return response;
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler HARİÇ tüm yollarda bu korumayı çalıştır:
     * - _next/static (statik dosyalar)
     * - _next/image (resim optimizasyonu)
     * - favicon.ico (ikon)
     * - public klasöründeki resimler (.png, .jpg vs.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};