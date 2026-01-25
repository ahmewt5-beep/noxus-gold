import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider"; 

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 👇 ZOMBİ MODU: PWA İÇİN ZORUNLU AYARLAR
export const metadata: Metadata = {
  title: "Noxus Gold",
  description: "Profesyonel Kuyumcu Yönetim Paneli",
  manifest: "/manifest.json", // 👈 İŞTE BU EKSİKTİ!
  icons: {
    icon: "/icon-192x192.png", // (Bu dosyaları public'e koyman gerekecek)
    apple: "/icon-192x192.png",
  }
};

// 👇 MOBİL VE SIDEBAR SORUNUNU ÇÖZEN VİDEO AYARI
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Kullanıcı eliyle zoom yapıp bozmasın
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        <AuthProvider>
            {children}
        </AuthProvider>
      </body>
    </html>
  );
}