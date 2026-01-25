const { contextBridge, ipcRenderer } = require('electron');

// Web sitesine (Vercel) "NoxusDesktop" adında bir nesne gönderiyoruz.
contextBridge.exposeInMainWorld('NoxusDesktop', {
  // Web sitesinden gelen "Yazdır" emrini ana programa ilet
  printSilent: (options) => ipcRenderer.send('print-silent', options),
  
  // (İleride buraya terazi okuma fonksiyonu da ekleyeceğiz)
  isElectron: true
});