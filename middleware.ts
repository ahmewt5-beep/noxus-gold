import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 1. Gidilmek istenen sayfa "landing" veya "login" ise KARIŞMA, GEÇSİN.
  const path = request.nextUrl.pathname;
  if (path.startsWith("/landing") || path.startsWith("/login") || path.startsWith("/auth")) {
    return NextResponse.next();
  }

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
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 2. Eğer kullanıcı YOKSA ve korumalı bir sayfadaysa -> Logine at
  if (!user && path !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Eğer kullanıcı VARSA ve Login sayfasına gitmeye çalışıyorsa -> Ana sayfaya at
  if (user && path === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  // Bu middleware hangi yollarda çalışsın?
  matcher: [
    /*
     * Aşağıdakiler HARİÇ tüm yollarda çalış:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public klasöründeki görseller (svg, png, jpg)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};