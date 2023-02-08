//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain } = require('electron');
let win;
const path = require('path');
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');
//Variables globales nécessitant une transmission vers renderer.js
var mainProcessVars = {
  isAdbInstalled: false
}

//!  _________________________
//! |_____INITIALISATION_____|
function createWindow () {
  win = new BrowserWindow({
    width: 1200,
    height: 700,
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


//!  _________________________
//! |_________MAIN___________|
//vérification de l'installation de adb
let idUsbDetection;
adbDetection.checkAdb()
  .then(
    function(isAdbInstalled) {
      mainProcessVars.isAdbInstalled = isAdbInstalled;
      if (!isAdbInstalled) {
        return adbDetection.installAdb();
      } else {
        idUsbDetection = setInterval(() => {usbDetection.trackDevices();}, 2000);
      }
    }
  );

//Update isAdbInstalled pour changer le wrapper affiché par renderer.js
function updateRendererVar() {
  adbDetection.checkAdb()
    .then(function(isAdbInstalled) {
      mainProcessVars.isAdbInstalled = isAdbInstalled;
    });
}

let idUpdateRendererVar;
//si !isAdbInstalled, alors update toutes les 2 secondes, sinon on arrête la mise à jour
if (!mainProcessVars.isAdbInstalled) {
  idUpdateRendererVar = setInterval(() => {updateRendererVar();}, 2000);
} else {
  (idUpdateRendererVar ? clearInterval(idUpdateRendererVar) : "");
}
// Ecoute si jamais le renderer process envoie une requête pour récupérer une variable
ipcMain.on('getVariable', (event, arg) => {
  // Renvoie la variable demandée
  win.webContents.send('getAnswer', mainProcessVars[arg]);
});




//!  _________________________
//! |_________QUIT___________|
// Si toutes les fenêtres sont fermées, ferme l'application (sauf sur Mac où le comportement est différent)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})