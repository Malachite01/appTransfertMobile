//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const adbkit = require('adbkit');
let win;
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');

//Variables globales nécessitant une transmission vers renderer.js
var mainProcessVars = {
  isAdbInstalled: false,
  deviceId: null
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
let deviceId;
adbDetection.checkAdb()
  .then(
    function(isAdbInstalled) {
      mainProcessVars.isAdbInstalled = isAdbInstalled;
      if (!isAdbInstalled) {
        return adbDetection.installAdb();
      } else {
        //Création du client adb du main process
        client = adbkit.createClient({bin: 'C://adb/adb.exe'});
        //?  _________________________
        //? |____DEVICE_DETECTION____|
        idUsbDetection = setInterval(() => {usbDetection.trackDevices().then((id) => {deviceId = id;});}, 2000);
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
//si !isAdbInstalled, alors update toutes les secondes, sinon on arrête la mise à jour
if (!mainProcessVars.isAdbInstalled) {
  idUpdateRendererVar = setInterval(() => {updateRendererVar();}, 2000);
} else {
  (idUpdateRendererVar ? clearInterval(idUpdateRendererVar) : "");
}

//?  _________________________
//? |_____SEND_VARIABLES_____|
// Ecoute si jamais le renderer process envoie une requête pour récupérer une variable
ipcMain.on('getVariable', (event, arg) => {
  // Renvoie la variable demandée
  win.webContents.send('getAnswer', mainProcessVars[arg]);
});

//?  _________________________
//? |_____BEGIN_DIR_LIST_____|
var Promise = require('bluebird');
let idDeviceDetection;

idDeviceDetection = setInterval(() => {
  if (mainProcessVars.isAdbInstalled == true) {
    if (deviceId != null) {
      mainProcessVars.deviceId = deviceId;
      // Detection of files on the device
      var client = adbkit.createClient({bin: 'C://adb/adb.exe'});
      client.listDevices()

      .then(function(devices) {
      return Promise.map(devices, function(device) {
        return client.readdir(device.id, '/sdcard')
      
        .then(function(files) {
          var fileList = [];
          files.forEach(function(file) {
            fileList.push({
              name: file.name,
              type: file.isFile() ? 'file' : 'folder',
              deviceId: device.id
            });
          });

          // Call the callback function with the file list
          onFilesReceived(fileList);
        })
      })
      })

      .catch(function(err) {
        console.error('Something went wrong:', err.stack);
      });
    } else {
      mainProcessVars.deviceId = null;
    }
  }
}, 2000);

// Callback function that receives the file list
function onFilesReceived(fileList) {
  console.log(fileList);
  // Do something with the file list
}
  
//!  _________________________
//! |_________QUIT___________|
// Si toutes les fenêtres sont fermées, ferme l'application (sauf sur Mac où le comportement est différent)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})