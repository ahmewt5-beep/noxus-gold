import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string) => {
  // 1. Veriyi Çalışma Sayfasına Çevir
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. Sütun Genişliklerini Ayarla (Otomatik Güzellik)
  const colWidths = Object.keys(data[0] || {}).map((key) => ({ wch: 20 })); 
  worksheet['!cols'] = colWidths;

  // 3. Çalışma Kitabı Oluştur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rapor");

  // 4. İndir
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};