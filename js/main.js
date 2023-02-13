//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const adbkit = require('adbkit');
let win;
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');
var client = adbkit.createClient({bin: 'C://adb/adb.exe'});

//Variables globales nécessitant une transmission vers renderer.js
var mainProcessVars = {
  isAdbInstalled: false,
  deviceId: null,
  fileList: []
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
//? |_____BEGIN_DIR_LIST_____|
var Promise = require('bluebird');
let idDeviceDetection;

idDeviceDetection = setInterval(() => {
  if (mainProcessVars.isAdbInstalled == true) {
    if (deviceId != null) {
      mainProcessVars.deviceId = deviceId;


      client.listDevices()
      .then(function(devices) {
        //Retour de la promesse d'appareils connectés
        return Promise.map(devices, function(device) {
          //Retour de la promesse de lecture du répertoire
          return client.readdir(device.id, '/sdcard')
      
          .then(function(files) {
            //Liste de tous les fichiers avec leur nom, type et deviceId
            var fileList = [];
            files.forEach(function(file) {
              var fileType = 'unknown';
              if (file.isFile()) {
                if (file.name.endsWith('.jpg') || file.name.endsWith('.jpeg') || file.name.endsWith('.png') || 
                file.name.endsWith('.gif') || file.name.endsWith('.bmp') || file.name.endsWith('.webp') || 
                file.name.endsWith('.tiff') || file.name.endsWith('.cr2') || file.name.endsWith('.arw') || 
                file.name.endsWith('.nef') || file.name.endsWith('.raw')) {
                  fileType = 'image';
                } else {
                  fileType = 'file';
                }
              } else {
                fileType = 'folder';
              }
              fileList.push({
                name: file.name,
                type: fileType,
                lastModified: file.mtime,
                size: file.size,
                deviceId: device.id
              });
            });

            // Call the callback function with the file list
            onFilesReceived(fileList);
          })
        })
      })

      .catch(function(err) {
        console.error('Il y a eu un problème :', err.stack);
      });
    } else {
      mainProcessVars.deviceId = null;
    }
  }
}, 2000);

function onFilesReceived(fileList) {
  fileList.sort(function(elementA, elementB) {
    var nomFichier1 = elementA.name.toUpperCase();
    var nomFichier2 = elementB.name.toUpperCase();
    return (nomFichier1 < nomFichier2 ? (nomFichier1 == nomFichier2 ? 0:-1) : (nomFichier1 == nomFichier2 ? 0:1));
  });
  mainProcessVars.fileList = fileList;
  // console.log(mainProcessVars.fileList);
}

//?  _________________________
//? |_____SEND_VARIABLES_____|
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