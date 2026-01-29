import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. Boş bir response oluşturuyoruz
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Supabase İstemcisini Oluştur (Cookie Yönetimi ile)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3. Kullanıcıyı Kontrol Et (Bu işlem Auth token'ı yeniler)
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // --- YÖNLENDİRME KURALLARI ---

  // KURAL A: Kullanıcı ZATEN giriş yapmışsa ve Login sayfasındaysa -> Ana Sayfaya at
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // KURAL B: Kullanıcı giriş YAPMAMIŞSA ve Login sayfasında DEĞİLSE -> Login'e at
  if (!user && path !== "/login") {
    // Burada sonsuz döngü olmaması için login sayfasına yönlendiriyoruz
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Güncellenmiş cookie'lerle cevabı gönder
  return response;
}

export const config = {
  matcher: [
    /*
     * Aşağıdaki yollar HARİÇ tüm yollarda middleware çalışsın:
     * - _next/static (statik dosyalar)
     * - _next/image (resim optimizasyonu)
     * - favicon.ico (ikon)
     * - .svg, .png, .jpg vb. (görseller)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};