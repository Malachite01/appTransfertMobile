const { app, BrowserWindow, ipcMain } = require('electron');
let win;
var mainProcessVars = {};
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
  createWindow();
  // Si l'application est lancée mais aucune fenêtre n'est ouverte
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
})

//vérification de l'installation de adb
var isAdbInstalled = null;
adbDetection.checkAdb()
  .then(
    function(isAdbInstalled) {
      if (!isAdbInstalled) {
        return adbDetection.installAdb();
      } else {
        mainProcessVars = {
          isAdbInstalled: isAdbInstalled
        }
        setInterval(function() {
          usbDetection.trackDevices();
        }, 100);
      }
    }
  );

  //Variables globales nécessitant une transmission vers renderer.js
  mainProcessVars = {
    isAdbInstalled: isAdbInstalled
  }
  // Ecoute si jamais le renderer process envoie une requête pour récupérer une variable
  ipcMain.on('getVariable', (event, arg) => {
    // Renvoie la variable demandée
    win.webContents.send('getAnswer', mainProcessVars[arg]);
  });

// Si toutes les fenêtres sont fermées, ferme l'application (sauf sur Mac où le comportement est différent)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})