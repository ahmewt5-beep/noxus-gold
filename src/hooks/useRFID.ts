"use client";
import { useState, useRef, useCallback, useEffect } from 'react';

export function useRFID() {
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const keepReadingRef = useRef(false);

  const connectRFID = useCallback(async (baudRate: number = 115200) => {
    if (!("serial" in navigator)) {
      alert("Tarayıcınız Seri Port desteklemiyor (Chrome kullanın).");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate }); 
      portRef.current = port;
      setIsConnected(true);
    } catch (err) {
      console.error("RFID Bağlantı Hatası:", err);
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (!portRef.current) return;
    
    setIsScanning(true);
    keepReadingRef.current = true;
    
    const currentSessionTags = new Set<string>();

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = portRef.current.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      while (keepReadingRef.current) {
        // 🛑 KRİTİK FREN SİSTEMİ: Tarayıcının nefes alması için 10ms bekle
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
            // Veri var mı diye kontrol et (Okuma işlemi)
            const { value, done } = await reader.read();
            if (done) break;
            
            if (value) {
              const lines = value.split(/\r?\n/);
              let newTagFound = false;

              for (const line of lines) {
                 const cleanTag = line.trim();
                 // EPC Kodları genelde uzundur, gürültüyü filtrele (en az 6 karakter)
                 if (cleanTag.length > 6) { 
                    if (!currentSessionTags.has(cleanTag)) {
                        currentSessionTags.add(cleanTag);
                        newTagFound = true;
                    }
                 }
              }

              // Sadece yeni etiket bulunduğunda React State'ini güncelle
              // (Sürekli setTags yaparsak sayfa donar)
              if (newTagFound) {
                 setTags(new Set(currentSessionTags));
              }
            }
        } catch (innerError) {
            // Okuma hatası olursa döngüyü kırma, devam et (Kablo temassızlığı vb.)
            console.warn("Anlık okuma hatası:", innerError);
        }
      }
    } catch (error) {
      console.error("RFID Genel Okuma hatası:", error);
    } finally {
      // Okuma bittiğinde kilitleri serbest bırak
      if (readerRef.current) {
          try { await readerRef.current.cancel(); } catch(e) {}
          readerRef.current.releaseLock();
      }
    }
  }, []);

  const stopScanning = useCallback(async () => {
    keepReadingRef.current = false;
    
    // Okumayı durdurmak biraz zaman alabilir, zorla iptal et
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch(e) {}
    }
    
    setIsScanning(false);
  }, []);

  const clearTags = () => {
    setTags(new Set());
  };

  // Sayfa değiştiğinde veya bileşen öldüğünde (Unmount) bağlantıyı temizle
  useEffect(() => {
      return () => {
          keepReadingRef.current = false;
          if (readerRef.current) readerRef.current.cancel().catch(() => {});
      };
  }, []);

  return { 
    tags: Array.from(tags),
    isConnected, 
    isScanning,
    connectRFID, 
    startScanning, 
    stopScanning,
    clearTags
  };
}