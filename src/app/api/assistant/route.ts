import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  // 1. OpenAI Kurulumu
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API Key yok" }, { status: 500 });
  
  const openai = new OpenAI({ apiKey: apiKey });

  try {
    const body = await req.json();
    const { message, userName } = body;

    const assistantId = process.env.ASSISTANT_ID;
    if (!assistantId) return NextResponse.json({ error: "Asistan ID yok" }, { status: 500 });

    // 2. Thread (Sohbet) Oluştur
    const thread = await openai.beta.threads.create();

    // 3. Mesajı Gönder (Kullanıcı Adıyla)
    const userMessageContent = userName ? `(Kullanıcı: ${userName}) ${message}` : message;
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessageContent,
    });

    // 4. ÇALIŞTIR VE BEKLE (createAndPoll) - İŞTE SİHİRLİ KOMUT BU ⚡️
    // Bu komut; çalıştırır, bekler ve sonucu döner. Döngü kurmaya gerek kalmaz.
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    // 5. Durumu Kontrol Et
    if (run.status === 'completed') {
      // Cevap hazırsa mesajları getir
      const messages = await openai.beta.threads.messages.list(run.thread_id);
      
      const lastMessage = messages.data
        .filter((msg) => msg.role === "assistant")
        .shift();

      let responseText = "Cevap yok.";
      if (lastMessage?.content?.[0]?.type === 'text') {
        responseText = lastMessage.content[0].text.value;
      }

      return NextResponse.json({ response: responseText });
    } else {
      // Hata veya tamamlanmama durumu
      console.error("Run Status:", run.status);
      return NextResponse.json({ error: `Asistan cevap veremedi. Durum: ${run.status}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error("KRİTİK HATA:", error);
    return NextResponse.json({ error: error.message || "Sunucu Hatası" }, { status: 500 });
  }
}