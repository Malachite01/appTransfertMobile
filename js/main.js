//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
const adbkit = require('adbkit');
const fs = require('fs');
const Promise = require('bluebird');
let win;
const adbDetection = require('./adb-detection.js');
const usbDetection = require('./usb-detection.js');
var client;
var directoryIsRead = false;

//Liste de tous les fichiers avec leur nom, type, date de modif, taille et deviceId
var fileList = [];
//liste des fichiers à télécharger
var filesToDownload = [];
//Variables globales nécessitant une transmission vers renderer.js
var mainProcessVars = {
  isAdbInstalled: false,
  deviceId: null,
  actualPath: '/sdcard'
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
function getFileType(file, type) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.cr2', '.arw', '.nef', '.raw'];
  const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.3gp', '.m4v','.3g2', '.asf', '.avchd', '.f4v', '.m2ts', '.mpe', '.mpeg', '.mpg', '.mts', '.tod', '.ts', '.vob'];
  const soundExtensions = ['.mp3', '.wav', '.aiff', '.aac', '.flac', '.alac', '.dsd', '.wma', '.ogg', '.m4a'];
  if(type == "Affichage") {
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
  } else if(type == "Téléchargement") {
    if(imageExtensions.some(extension => path.extname(file) === extension)) {
      return 'Images';
    } else if(videoExtensions.some(extension => path.extname(file) === extension)) {
      return 'Videos';
    } else if(soundExtensions.some(extension => path.extname(file) === extension)) {
      return 'Sons';
    } else {
      return 'Fichiers';
    }
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
                    type: getFileType(file, 'Affichage'),
                    lastModified: file.mtime,
                    size: file.size,
                    deviceId: device.id
                  });
                } else {
                  const filePath = `${mainProcessVars.actualPath}/${file.name}`;
                  var size = await getFileSize(device.id, filePath);
                  fileList.push({
                    name: file.name,
                    type: getFileType(file, 'Affichage'),
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
//? |_DIR_SELECTION/DOWNLOAD_|

// Fonction pour télécharger un fichier
async function downloadFile(src, dest) {
  try {
    const stat = await client.stat(mainProcessVars.deviceId, src);
    if (!stat.isFile()) {
      console.error(`Erreur: ${src} n'est pas un fichier`);
      return;
    }
    // Créer le dossier de destination si il n'existe pas
    const fileType = getFileType(src, 'Téléchargement');
    const destFolder = `${dest}/${fileType}/`;
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    const destPath = path.join(destFolder, path.basename(src));
    const adbStream = await client.pull(mainProcessVars.deviceId, src);
    const fileStream = fs.createWriteStream(destPath);

    adbStream.pipe(fileStream);
    await new Promise((resolve, reject) => {
      adbStream.on('end', resolve);
      adbStream.on('error', reject);
    });
  } catch (err) {
    console.error(`Erreur pour le fichier ${src}: ${err.message}`);
  }
}

// Function pour télécharger un dossier récursivement
async function downloadFolder(src, dest) {
  try {
    const files = await client.readdir(mainProcessVars.deviceId, src);
    for (let file of files) {
      const srcPath = `${src}/${file.name}`;
      const destPath = `${dest}`;
      //Si le fichier est un dossier, on rappelle la fonction
      if (file.isDirectory()) {
        await downloadFolder(srcPath, destPath);
      } else {
        await downloadFile(srcPath, dest);
      }
    }
  } catch (err) {
    console.error(`Error downloading folder ${src}: ${err.message}`);
  }
}

// Fonction pour lancer le téléchargement
async function download(src, dest) {
  try {
    const stat = await client.stat(mainProcessVars.deviceId, src);
    if (stat.isDirectory()) {
      await downloadFolder(src, dest);
    } else {
      await downloadFile(src, dest);
    }
  } catch (err) {
    console.error(`Error downloading ${src}: ${err.message}`);
  }
}

//Réception de la liste des fichiers à télécharger
ipcMain.on('filesToDownload', async (event, arg) => {
  filesToDownload = Object.keys(arg);
  //Choix du répertoire de destination
  let destPath = '';
  while (destPath == '') {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      destPath = result.filePaths[0];
    }
  }
  try {
    for (let src of filesToDownload) {
      await download(src, destPath);
    }
    console.log('Download completed!');
    win.webContents.send('finishedDownloading', true);
    win.webContents.send('getFileList', fileList);
  } catch (err) {
    console.error(err);
  }
}); 

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