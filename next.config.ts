/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Geliştirme modunda (Localhost) PWA'yı kapat ki Turbopack ile çakışmasın
  disable: process.env.NODE_ENV === 'development', 
});

const nextConfig = {
  // Turbopack hatasını susturmak için boş konfigürasyon (Hata mesajının önerisi)
  experimental: {
     turbopack: {} 
  }
};

module.exports = withPWA(nextConfig);
// next.config.js
module.exports = {
  images: {
    domains: ['https://wlgogttqsdovqiqwhcuy.supabase.co'],
  },
  // ... diğer ayarlar
}