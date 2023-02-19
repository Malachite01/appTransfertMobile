//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const adbkit = require('adbkit');
const Promise = require('bluebird');
let win;
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');
var client;
var directoryIsRead = false;

//Liste de tous les fichiers avec leur nom, type, date de modif, taille et deviceId
var fileList = [];
//Variables globales nécessitant une transmission vers renderer.js
var mainProcessVars = {
  isAdbInstalled: false,
  deviceId: null,
  actualPath: ''
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
//? |______PATH_CHANGE_______|
//Chemin du dossier à lire au demarrage
mainProcessVars.actualPath = '/sdcard';

ipcMain.on('changePath', (event, arg) => {
  if(arg == 'goBack') {
    if(mainProcessVars.actualPath != '/sdcard') {
      mainProcessVars.actualPath = mainProcessVars.actualPath.substring(0, mainProcessVars.actualPath.lastIndexOf('/'));
      directoryIsRead = false;
    }
  } else {
    mainProcessVars.actualPath = mainProcessVars.actualPath + "/" + arg;
    directoryIsRead = false;
  }
});

//fonction qui renvoie le type d'un fichier
function getFileType(file) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.cr2', '.arw', '.nef', '.raw'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.3gp', '.m4v','.3g2', '.asf', '.avchd', '.f4v', '.m2ts', '.mpe', '.mpeg', '.mpg', '.mts', '.tod', '.ts', '.vob'];
  const soundExtensions = ['.mp3', '.wav', '.aiff', '.aac', '.flac', '.alac', '.dsd', '.wma', '.ogg', '.m4a'];
  if (file.isFile()) {
    if (imageExtensions.some(extension => file.name.endsWith(extension))) {
      return 'Image';
    } else if(videoExtensions.some(extension => file.name.endsWith(extension))) {
      return 'Video';
    } else if(soundExtensions.some(extension => file.name.endsWith(extension))) {
      return 'Sons';
    } else {
      return 'Fichier';
    }
  } else if(file.isDirectory()) {
    return 'Dossier';
  } else {
    return 'Inconnu';
  }
}

async function getFileSize(deviceId, path) {
  const files = await client.readdir(deviceId, path);
  let size = 0;
  for (const file of files) {
    const filePath = `${path}/${file.name}`;
    if (file.isDirectory()) {
      size += await getFileSize(deviceId, filePath);
    } else {
      size += file.size;
    }
  }
  return size;
}

async function fileAlreadyExist(file) {
  // Verifier si le fichier existe déjà dans la liste
  var isDuplicate = fileList.some(f => f.name === file.name);
  return isDuplicate;
}


//?  _________________________
//? |_____BEGIN_DIR_LIST_____|

let idDeviceDetection;
idDeviceDetection = setInterval(() => {
  if (!mainProcessVars.isAdbInstalled || deviceId == null) {
    mainProcessVars.deviceId = null;
    return;
  } else if (directoryIsRead) {
    return;
  }

  mainProcessVars.deviceId = deviceId;
  fileList = [];

  client.listDevices()
    .then(function(devices) {
      //Retour de la promesse d'appareils connectés
      return Promise.map(devices, async function(device) {
        //Retour de la promesse de lecture du répertoire
        return client.readdir(device.id, mainProcessVars.actualPath)
          .then(async function(files) {
            for (const file of files) {
              // Eviter les doublons
              var isDuplicate = await fileAlreadyExist(file);
              if (!isDuplicate) {
                if(!file.isDirectory()) {
                  fileList.push({
                    name: file.name,
                    type: getFileType(file),
                    lastModified: file.mtime,
                    size: file.size,
                    deviceId: device.id
                  });
                } else {
                  const filePath = `${mainProcessVars.actualPath}/${file.name}`;
                  var size = await getFileSize(device.id, filePath);
                  fileList.push({
                    name: file.name,
                    type: getFileType(file),
                    lastModified: file.mtime,
                    size: size,
                    deviceId: device.id
                  });
                }
              }
            }
            //Appel à la fonction de callback de la liste des fichiers
            onFilesReceived(fileList);
            directoryIsRead = true;
          });
      });
    })
    .catch(function(err) {
      console.error('Il y a eu un problème :', err.stack);
    });
}, 2000);

function onFilesReceived(fileList) {
  fileList.sort(function(elementA, elementB) {
    if (elementA.type === 'Dossier' && elementB.type !== 'Dossier') {
      return -1;
    } else if (elementA.type !== 'Dossier' && elementB.type === 'Dossier') {
      return 1;
    } else {
      var nomFichier1 = elementA.name.toUpperCase();
      var nomFichier2 = elementB.name.toUpperCase();
      return (nomFichier1 < nomFichier2 ? (nomFichier1 == nomFichier2 ? 0:-1) : (nomFichier1 == nomFichier2 ? 0:1));
    }
  });
  // console.log(fileList);
  //Envoi des fichiers au renderer process via le channel getFileList
  win.webContents.send('getFileList', fileList);
  win.webContents.send('wantsToUpdate', true);
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