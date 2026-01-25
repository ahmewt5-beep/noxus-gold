import Decimal from 'decimal.js';

// Global Hassasiyet Ayarı (Kuyumcular için genelde 999.99 formatı yeterlidir)
Decimal.set({ precision: 20 }); 

export const math = {
  // Toplama
  add: (a: number | string, b: number | string) => new Decimal(a).plus(b).toNumber(),
  
  // Çıkarma
  sub: (a: number | string, b: number | string) => new Decimal(a).minus(b).toNumber(),
  
  // Çarpma (Gram * Milyem * Fiyat)
  mul: (a: number | string, b: number | string) => new Decimal(a).times(b).toNumber(),
  
  // Bölme
  div: (a: number | string, b: number | string) => new Decimal(a).dividedBy(b).toNumber(),
  
  // Sabit Hassasiyet (2 basamak - Para birimi için)
  toFixed: (val: number | string, precision: number = 2) => new Decimal(val).toFixed(precision),

  // Kuyumcuya Özel: Has Karşılığı Hesapla (Gram * Milyem)
  calcHas: (gram: number, purity: number) => new Decimal(gram).times(purity).toNumber()
};