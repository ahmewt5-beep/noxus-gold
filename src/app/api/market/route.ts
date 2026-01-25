import { NextResponse } from 'next/server';

// Harem Altın veya Genelsek Piyasa Verileri
// Not: Harem'in resmi API'si ücretli olabilir veya token isteyebilir.
// Şimdilik herkesin kullandığı 'genelpara' veya benzeri açık kaynakları simüle eden
// bir yapı kuruyoruz. Eğer elinde Harem API Linki varsa buraya yapıştıracağız.

export async function GET() {
  try {
    // ÖRNEK KAYNAK (Genel Para veya Harem benzeri JSON dönen bir yer)
    // Burası sunucu tarafı olduğu için CORS hatası yemez.
    const response = await fetch('https://api.genelpara.com/embed/altin.json', {
      next: { revalidate: 10 } // 10 saniyede bir veriyi tazele (Cache)
    });

    if (!response.ok) {
      throw new Error('Piyasa verisi alınamadı');
    }

    const data = await response.json();

    // Gelen veriyi bizim formatımıza çevirelim (Standardizasyon)
    // Noxus Gold Formatı: { has: 3000, usd: 34, eur: 36 }
    
    // Gelen veri yapısına göre buraları ayarlıyoruz:
    // (GenelPara yapısı: data.GA (Gram Altın), data.USD (Dolar), data.EUR (Euro))
    
    const marketData = {
      has: parseFloat(data.GA?.satis || 0), // Gram Altın Satış
      usd: parseFloat(data.USD?.satis || 0),
      eur: parseFloat(data.EUR?.satis || 0),
      lastUpdate: new Date().toISOString()
    };

    return NextResponse.json(marketData);

  } catch (error: any) {
    console.error("Market API Hatası:", error.message);
    
    // Hata olursa sistem çökmesin, son bilinen güvenli değerleri döndür
    return NextResponse.json({
      has: 3055.00, 
      usd: 34.50, 
      eur: 37.20, 
      error: true 
    });
  }
}