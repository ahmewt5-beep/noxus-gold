"use client";
import { useState, useRef, useCallback } from 'react';

// Gelişmiş Terazi Hook'u
// - Virgül/Nokta ayrımı yapmaz.
// - BaudRate ayarlanabilir.

export function useScale() {
  const [weight, setWeight] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const keepReadingRef = useRef(false);

  const connectScale = useCallback(async (baudRate: number = 9600) => {
    if (!("serial" in navigator)) {
      setError("Tarayıcınız Seri Port desteklemiyor. Chrome kullanın.");
      return;
    }

    try {
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: baudRate }); 
      
      portRef.current = port;
      setIsConnected(true);
      setError(null);
      keepReadingRef.current = true;

      readLoop(port);

    } catch (err: any) {
      console.error("Terazi Bağlantı Hatası:", err);
      setIsConnected(false);
      // Kullanıcı seçim yapmadan kapattıysa hata gösterme
      if (!err.message?.includes("No port selected")) {
         setError("Bağlantı kurulamadı.");
      }
    }
  }, []);

  const readLoop = async (port: any) => {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      let buffer = "";

      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read();
          if (done) break;
          
          if (value) {
            buffer += value;
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || ""; 

            for (const line of lines) {
               parseWeight(line);
            }
          }
        }
      } catch (error) {
        console.error("Okuma koptu:", error);
      } finally {
        reader.releaseLock();
      }
  };

  // Gelen Veriyi Ayıkla (Regex: Hem 12.34 hem 12,34 formatını tanır)
  const parseWeight = (dataString: string) => {
    // Virgülü noktaya çevir (Türkiye standardı düzeltmesi)
    const normalized = dataString.replace(',', '.');
    
    // Sayı yakalayıcı (Örn: +  12.34 g)
    const match = normalized.match(/[-+]?\s*(\d+\.\d+)/);
    
    if (match && match[1]) {
      const value = parseFloat(match[1]);
      if (!isNaN(value)) {
        setWeight(value);
      }
    }
  };

  const disconnectScale = useCallback(async () => {
    keepReadingRef.current = false;
    
    if (readerRef.current) {
      try { await readerRef.current.cancel(); } catch(e) {}
    }
    if (portRef.current) {
      try { await portRef.current.close(); } catch(e) {}
    }
    
    setIsConnected(false);
    setWeight(0);
    portRef.current = null;
  }, []);

  return { weight, isConnected, error, connectScale, disconnectScale };
}