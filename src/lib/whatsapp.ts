// src/lib/whatsapp.ts

export const sendWhatsappReceipt = (
  phone: string | null | undefined, 
  customerName: string, 
  trxType: 'SATIS' | 'TAHSILAT', 
  product: string, 
  amountInfo: string, 
  balanceInfo: string,
  storeName: string = "GOLDEX KUYUMCULUK" // 👈 YENİ PARAMETRE (Varsayılan değer korundu)
) => {
  if (!phone) return;

  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;

  const emoji = trxType === 'SATIS' ? '💎' : '✅';
  const title = trxType === 'SATIS' ? 'SATIŞ BİLGİLENDİRME' : 'ÖDEME ALINDI';
  
  const message = `*Sayın ${customerName},* %0A%0A` +
    `${emoji} *${title}* %0A` +
    `Mağazamızdan yaptığınız işlem detayları aşağıdadır:%0A%0A` +
    `📦 *İşlem:* ${product}%0A` +
    `💰 *Tutar:* ${amountInfo}%0A` +
    `----------------------------%0A` +
    `📊 *Güncel Bakiyeniz:* ${balanceInfo}%0A%0A` +
    `Bizi tercih ettiğiniz için teşekkür ederiz. 🙏%0A` +
    `*${storeName.toUpperCase()}*`; // 👈 ARTIK DİNAMİK OLDU

  const url = `https://wa.me/${cleanPhone}?text=${message}`;
  window.open(url, '_blank');
};