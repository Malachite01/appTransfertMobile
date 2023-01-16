const { app, BrowserWindow } = require('electron');
const path = require('path');
const usbDetection = require('./usb-detection');

//Requete des privileges administrateur
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, './preload.js')
    }
  })

  win.loadFile(path.join(__dirname, '../index.html'))
}

// Ecouter les nouveaux périphériques USB qui sont connectés
usbDetection.detectDevice();

// Lorsque l'application est prête, créer une fenêtre
app.whenReady().then(() => {
  createWindow()
  // Si l'application est lancée mais aucune fenêtre n'est ouverte
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Si toutes les fenêtres sont fermées, ferme l'application (sauf sur Mac où le comportement est différent)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})