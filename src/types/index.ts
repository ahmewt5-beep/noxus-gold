// src/types/index.ts

export interface Customer {
  id: number;
  full_name: string;
  phone: string;
  balance_has: number;
  balance_tl: number;
  balance_usd: number;
  notes?: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  created_at: string;
  customer_id?: number; // Nullable (Kasa devri için)
  customers?: { full_name: string }; // Join ile gelen veri
  type: 'SATIS' | 'TAHSILAT' | 'GIRIS' | 'CIKIS';
  product_name: string;
  gram: number;
  price: number;
  has_equivalent: number;
  description?: string;
  currency?: string; // TL, USD, EUR, GBP
}

// 🛑 DÜZELTME: 3 Parça olan Product yapısı birleştirildi
export interface Product {
  id: number;
  name: string;
  category: string; // 'Bilezik', 'Sarrafiye', 'Kolye' vb.
  purity: number; // 0.916, 0.995
  stock_quantity: number; // Adet
  stock_gram: number; // Gram
  buy_price?: number; // Opsiyonel Maliyet
  sell_price?: number; // Opsiyonel Satış Fiyatı
  is_active: boolean;
  user_id?: string;
  barcode?: string;   // Görsel Barkod (EAN)
  rfid_code?: string; // 👇 RFID EPC Kodu (Hexadecimal)
  image_url?: string; // Ürün Fotosu
  location?: 'VITRIN' | 'KASA' | 'DEPO' | string; // Konum Takibi
}

export interface InventoryLog {
  id: number;
  created_at: string;
  product_id: number;
  type: 'GIRIS' | 'CIKIS';
  quantity_change: number;
  gram_change: number;
  description?: string;
}

export interface Expense {
  id: number;
  created_at: string;
  title: string;
  category: string;
  amount: number;
  currency: 'TL' | 'USD' | 'EUR' | 'GBP';
  description?: string;
}

export interface DailyReport {
  id: number;
  created_at: string;
  total_cash_tl: number;
  total_cash_usd: number;
  total_gold_stock: number;
  note?: string;
}