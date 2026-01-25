const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Noxus Gold - Desktop",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false, // Güvenlik için kapattık (Preload kullanıyoruz)
      contextIsolation: true, // Güvenlik için açtık (Preload kullanıyoruz)
      webSecurity: false,     // CORS (Harem API) için kapalı kalabilir
      preload: path.join(__dirname, 'preload.js') // 👈 KÖPRÜ DOSYASI BURADA
    }
  });

  const startUrl = process.env.ELECTRON_START_URL || 'https://noxus-gold.vercel.app';
  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => mainWindow = null);
}

// 🔥 SESSİZ YAZDIRMA EMRİ BURADA İŞLENİR
ipcMain.on('print-silent', (event, options) => {
  // options içinden yazıcı adı gelebilir, gelmezse varsayılanı kullanır
  const printerName = options?.printerName || ''; 

  // Mevcut pencerenin içeriğini yazdır
  const win = BrowserWindow.fromWebContents(event.sender);
  
  win.webContents.print({
    silent: true,            // 👈 İŞTE SİHİR BU: PENCERE AÇMA!
    printBackground: true,   // Renkleri/Arkaplanı bas
    deviceName: printerName  // Belirli bir yazıcı varsa ona gönder (yoksa varsayılan)
  }, (success, errorType) => {
    if (!success) console.log("Yazdırma hatası:", errorType);
  });
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});