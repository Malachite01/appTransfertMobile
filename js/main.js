const { app, BrowserWindow, ipcMain } = require('electron');
let win;
const path = require('path');
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');

//Requete des privileges administrateur
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function createWindow () {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, './preload.js')
    }
  })

  win.loadFile(path.join(__dirname, '../index.html'))
}

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


//vérification de l'installation de adb
var isAdbInstalled = adbDetection.checkAdb();
if(!isAdbInstalled) {
  adbDetection.installAdb();
} else {
  //liste les appareils connectés et ecoute connection déconnection
  setInterval(function(){ 
    usbDetection.trackDevices();   
  }, 100);
}

//Variables globales étant transmise vers renderer.js
var mainProcessVars = {
  isAdbInstalled: isAdbInstalled
}

// Ecoute si jamais le renderer process envoie une requête pour récupérer une variable
ipcMain.on('get-variable', (event, arg) => {
  // Renvoie la variable demandée
  win.webContents.send('get-variable-response', mainProcessVars[arg]);
});

// Si toutes les fenêtres sont fermées, ferme l'application (sauf sur Mac où le comportement est différent)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})