//!  _________________________
//! |_______VARIABLES________|
const { app, BrowserWindow, ipcMain, dialog} = require('electron');
const path = require('path');
const adbkit = require('adbkit');
const fs = require('fs');
const Promise = require('bluebird');
const log = require('electron-log');
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

if (require('electron-squirrel-startup')) app.quit();

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
  win.loadFile(path.join(__dirname, '../index.html'));
  win.removeMenu();
  win.setIcon(path.join(__dirname, '../images/logo-wizard.png'));
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
  app.commandLine.appendSwitch('force_high_performance_gpu');
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
        idUsbDetection = setInterval(() => {
          usbDetection.trackDevices().then((id) => {
            deviceId = id;
            mainProcessVars.deviceId = deviceId;
          });
        }, 2000);
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

  if (type == "Affichage") { 
    if (file.isFile()) { 
      const fileExtension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (imageExtensions.some(extension => fileExtension.endsWith(extension.toLowerCase()))) { 
        return 'Image'; 
      } else if (videoExtensions.some(extension => fileExtension.endsWith(extension.toLowerCase()))) { 
        return 'Video'; 
      } else if (soundExtensions.some(extension => fileExtension.endsWith(extension.toLowerCase()))) { 
        return 'Sons'; 
      } else { 
        return 'Fichier'; 
      } 
    } else if (file.isDirectory()) { 
      return 'Dossier'; 
    } else { 
      return 'Inconnu'; 
    } 
  } else if (type == "Téléchargement") { 
    const fileExtension = path.extname(file).toLowerCase();
    if (imageExtensions.some(extension => fileExtension === extension.toLowerCase())) { 
      return 'Images'; 
    } else if (videoExtensions.some(extension => fileExtension === extension.toLowerCase())) { 
      return 'Videos'; 
    } else if (soundExtensions.some(extension => fileExtension === extension.toLowerCase())) { 
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
  return fileList.some(f => f.name === file.name);
}

//?  _________________________
//? |_____BEGIN_DIR_LIST_____|

let idDeviceDetection;
idDeviceDetection = setInterval(() => {
  if (!mainProcessVars.isAdbInstalled || deviceId == null) {
    directoryIsRead = false;
    mainProcessVars.deviceId = null;
    return;
  } else if (directoryIsRead) {
    return;
  }
  
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
              if (!await fileAlreadyExist(file)) {
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
            directoryIsRead = true;
            await sortFileList(fileList).then(() => {
              //Suppression des doublons
              const uniqueFileList = [...new Map(fileList.map((file) => [file.name, file])).values()];
              //Envoi des fichiers au renderer process via le channel getFileList
              win.webContents.send('getFileList', uniqueFileList);
              win.webContents.send('wantsToUpdate', true);
            });
          });
      });
    })
    .catch(function(err) {
      log.error(err.stack);
      console.error('Il y a eu un problème :', err.stack);
    });
}, 2000);

async function sortFileList(fileList) {
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
}

//Refresh de la liste des fichiers
ipcMain.on('refresh', async (event, arg) => {
  directoryIsRead = false;
}); 

//?  _________________________
//? |_DIR_SELECTION/DOWNLOAD_|

// Fonction qui permet de compter le nombre de fichiers a télécharger
async function countFiles(files) {
  let count = 0;
  for (let file of files) {
    try {
      const stat = await client.stat(mainProcessVars.deviceId, file);
      if (stat.isDirectory()) {
        const subfiles = await client.readdir(mainProcessVars.deviceId, file);
        const subfilePaths = subfiles.map((subfile) => `${file}/${subfile.name}`);
        const subCount = await countFiles(subfilePaths);
        count += subCount;
      } else {
        count++;
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        log.error(`Error counting files for ${file}: ${err.message}`);
        console.error(`Error counting files for ${file}: ${err.message}`);
      }
    }
  }
  return count;
}

async function countFile(src, count) {
  try {
    const stat = await client.stat(mainProcessVars.deviceId, src);
    if (!stat.isFile()) {
      log.error(`Error: ${src} is not a file`);
      console.error(`Error: ${src} is not a file`);
      return;
    }
    count++;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      log.error(`Error counting files for ${file}: ${err.message}`);
      console.error(`Error counting files for ${file}: ${err.message}`);
    }
  }
  return count;
}

async function countFolder(src, count) {
  try {
    const files = await client.readdir(mainProcessVars.deviceId, src);
    for (let file of files) {
      const srcPath = `${src}/${file.name}`;
      if (file.isDirectory()) {
        count = await countFolder(srcPath, count);
      } else {
        count = await countFile(srcPath, count);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error counting folder for ${file}: ${err.message}`);
    }
  }
  return count;
}

async function count(files) {
  let count = 0;
  try {
    for (let src of files) {
      const stat = await client.stat(mainProcessVars.deviceId, src);
      if (stat.isDirectory()) {
        count = await countFolder(src, count);
      } else {
        count = await countFile(src, count);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`Error counting ${src}: ${err.message}`);
    }
  }
  return count;
}

let errorDownload = false;
let downloadedCount = 0;
// Fonction de téléchargement d'un fichier
async function downloadFile(src, dest, totalSize, totalTransferred) {
  try {
    const stat = await client.stat(mainProcessVars.deviceId, src);
    if (!stat.isFile()) {
      console.error(`Erreur: ${src} n'est pas un fichier`);
      return;
    }
    // Créer le dossier de destination si il n'existe pas
    const fileType = getFileType(src, 'Téléchargement');
    const fileName = path.basename(src);
    const destFolder = `${dest}/${fileType}/`;
    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    const destPath = path.join(destFolder, path.basename(src));
    //Création du stream de téléchargement
    const adbStream = await client.pull(mainProcessVars.deviceId, src);
    const fileStream = fs.createWriteStream(destPath);
    //Calcul du pourcentage de téléchargement du fichier en cours
    adbStream.on('data', (chunk) => {
      totalTransferred += chunk.length;
      const percentage = ((totalTransferred / totalSize) * 100).toFixed();
      win.webContents.send('changeDownloadPercentage', [percentage,fileName,downloadedCount]);
    });
    //Téléchargement du fichier et transfert dans le dossier de destination
    adbStream.pipe(fileStream);
    await new Promise((resolve, reject) => {
      adbStream.on('end', () => {
        downloadedCount++;
        resolve();
      });
      adbStream.on('error', reject);
    });
  } catch (err) {
    if (err.message.includes('Premature end') || err.message.includes('Failure')) {
      log.error(`Download canceled`);
      console.error('Download canceled');
      win.webContents.send('finishedDownloading', false);
      errorDownload = true;
    } else {
      log.error(`Erreur pour le fichier ${src}: ${err.message}`);
      console.error(`Erreur pour le fichier ${src}: ${err.message}`);
    }
  }
}

//Fonction de téléchargement d'un dossier
async function downloadFolder(src, dest, totalSize, totalTransferred) {
  try {
    const files = await client.readdir(mainProcessVars.deviceId, src);
    for (let file of files) {
      const srcPath = `${src}/${file.name}`;
      const destPath = `${dest}`;
      //Si le fichier est un dossier, on rappelle la fonction
      if (file.isDirectory()) {
        await downloadFolder(srcPath, destPath, totalSize, totalTransferred);
      } else {
        const stat = await client.stat(mainProcessVars.deviceId, srcPath);
        totalSize += stat.size;
        await downloadFile(srcPath, dest, totalSize, totalTransferred);
      }
    }
  } catch (err) {
    log.error(`Error downloading folder ${src}: ${err.message}`);
    console.error(`Error downloading folder ${src}: ${err.message}`);
  }
}

//Fonction de téléchargement
async function download(filesToDownload, dest) {
  try {
    for (let src of filesToDownload) {
      const stat = await client.stat(mainProcessVars.deviceId, src);
      let totalSize = stat.size || 0;
      let totalTransferred = 0;
      if (stat.isDirectory()) {
        await downloadFolder(src, dest, totalSize, totalTransferred);
      } else {
        await downloadFile(src, dest, totalSize, totalTransferred);
      }
    }
  } catch (err) {
    log.error(`Error downloading ${src}: ${err.message}`);
    console.error(`Error downloading ${src}: ${err.message}`);
  }
}

//Lancement du téléchargement
ipcMain.on('filesToDownload', async (event, arg) => {
  let destPath = '';
  filesToDownload = Object.keys(arg);
  var totalFileNb = await count(filesToDownload);
  //Envoie du nb de fichiers a télécharger
  win.webContents.send('nbOfFiles', totalFileNb);
  //Choix du répertoire de destination
  while (destPath == '') {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      destPath = result.filePaths[0];
    }
  }
  try {
    await download(filesToDownload, destPath);

    if(!errorDownload) {
      win.webContents.send('finishedDownloading', true);
      log.info('Download completed!');
      console.log('Download completed!');
    }
    win.webContents.send('getFileList', fileList);
    downloadedCount = 0;
    errorDownload = false;
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