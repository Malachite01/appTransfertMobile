//!  _________________________
//! |_______VARIABLES________|
const wrapperIdle = document.getElementById('wrapper-idle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
const wrapperFiles = document.getElementById('wrapper-files');
const wrapperDownloading = document.getElementById('wrapper-download');
var receivedAdbInstalled = false;
var receivedDeviceId = null;
//Dossiers recommandés ou il y a habituellement des medias
const recommendedFolders = ['/sdcard/Camera', '/sdcard/DCIM', '/sdcard/Download', '/sdcard/Movies', '/sdcard/Pictures', '/sdcard/Snapchat', '/sdcard/WhatsApp', '/sdcard/Bluetooth', '/sdcard/Telegram', '/sdcard/Videos'];
var receivedFileList = [];
var downloadedFilesList = {};

//!  _________________________
//! |_______FUNCTIONS________|
function changeWhatsDisplayed(screen1, screen2,type) {
  screen1.style.display = 'none';
  screen2.style.display = type;
}

function getVariable(variableName) {
  return new Promise((resolve, reject) => {
    //Requete de la variable
    window.api.send('getVariable', variableName);
    //Reception de la variable
    window.api.receive('getAnswer', (arg) => {
      resolve(arg);
    });
  });
}

async function cleanDisplayedDirectories() {
  for(var i=0; i < receivedFileList.length; i++) {
    var ligne = document.getElementById(i);
    (ligne != null ? ligne.remove() : "");
  }
}

async function displayFiles(receivedFileList) {
  await cleanDisplayedDirectories();
  var table = document.getElementById('files');
  var fileNames = {};
  for(var i=0; i < receivedFileList.length; i++) {
    let file = receivedFileList[i];
    // Eviter les doublons
    if (file.name in fileNames) {
      continue; // Sauter ce fichier et passer a la prochaine iteration
    } else {
      fileNames[file.name] = true; // Ajout du nom du fichier
    }
    //EX: pas la même taille sur android et windows, un dossier de 825Mo android = 786Mo windows
    //Deux possibilités de calcul, sur android la taille est indiquée par 1000
    //Sur windows par 1024, j'ai choisi de faire pour windows
    //Calcul de la taille du fichier 
    var taille = file.size;
    let bytes = taille;
    if (bytes < 1000) {
      taille = bytes + ' o';
    } else if (bytes < 1000000) {
      taille = (bytes / 1024).toFixed(2) + ' Ko';
    } else if (bytes < 1000000000) {
      taille = (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
    } else {
      taille = (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' Go';
    }

    //Ajout de l'icone correspondant au type de fichier
    let iconPath = '';
    if(file.type == 'Dossier') {
      iconPath = 'images/folder.png';
    } else if (file.type == 'Fichier') {
      iconPath = 'images/file.png';
    } else if (file.type == 'Image') {
      iconPath = 'images/imageIcon.png';
    } else if (file.type == 'Video') {
      iconPath = 'images/video.png';
    } else if (file.type == 'Sons') {
      iconPath = 'images/sons.png';
    } else {
      iconPath = 'images/unknown.png';
    }

    //Date
    let date = file.lastModified.toLocaleDateString("fr-FR", {day: "2-digit",month: "2-digit",year: "numeric"});

    let icon = "<img src='" + iconPath + "' alt='file' width='20' height='20'>"
    var htmlBlock;
    var selectedPath;
    var isChecked = "";
    var fileName;
    await getVariable('actualPath').then(path => {
      selectedPath = path + "/" + file.name; 
      //Si fichier deja dans la liste des fichiers telechargés, on coche la case
      isChecked = (selectedPath in downloadedFilesList ? 'checked' : '');
      //Affichage du bouton retour ou du bouton select all
      (path == "/sdcard") ? changeWhatsDisplayed(document.getElementById('boutonRetour'),document.getElementById('boutonAllSelect'),'block') : changeWhatsDisplayed(document.getElementById('boutonAllSelect'),document.getElementById('boutonRetour'),'block');
      //Affichage du chemin actuel
      document.getElementById('actualPath').textContent = path;
    });
    (taille == "0 o" ? fileName = "empty" : fileName = "fileName");
    htmlBlock = "<tr id='"+i+"'><td><input type='checkbox' id='switch"+i+"' "+isChecked+"><label for='switch"+i+"'>Toggle</label></td><td>"+icon+"</td><td class='"+fileName+"'>"+file.name+"</td><td>"+taille+"</td><td>"+date+"</td></tr>";

    //!Ajout de la ligne 
    table.insertAdjacentHTML("beforeend", htmlBlock);

    var line = document.getElementById(i);
    line.addEventListener('mouseup', async function(event) {
      var td = event.target.closest('td');
      if (td && td.classList.contains('fileName')) {
        var nom = td.textContent.trim();
        var index = receivedFileList.findIndex(function(file) {
          return file.name === nom;
        });
        if (index !== -1 && receivedFileList[index].type === 'Dossier') {
          //loader animation
          await cleanDisplayedDirectories();
          window.api.send('changePath', nom);
          changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
        }
      }
    });
    line.addEventListener('change', function(event) {
      var td = event.target.closest('td');
      var tdNom = td.nextElementSibling.nextElementSibling;
      if (td && td.querySelector('input')) {
        var nom = tdNom.textContent.trim();
        getVariable('actualPath').then(path => {
          var selectedPath = path + "/" + nom;
          if (selectedPath in downloadedFilesList) {
            delete downloadedFilesList[selectedPath];
            if (Object.keys(downloadedFilesList).length === 0) {
              document.getElementById('boutonDownload').style.display = 'none';
              document.getElementById('boutonAnnuler').style.display = 'none';
            }
          } else {
            downloadedFilesList[selectedPath] = true;
            document.getElementById('boutonDownload').style.display = 'inline-block';
            document.getElementById('boutonAnnuler').style.display = 'inline-block';
          }
        });
      }
    });
  }
  document.getElementById('nbFichiers').textContent = Object.keys(fileNames).length + " fichier(s)";
}

//!  _________________________
//! |_________MAIN___________|
window.addEventListener('DOMContentLoaded', () => {
  //Update du renderer pour adbInstalled
  idUpdateRendererADB = setInterval(() => {
    getVariable('isAdbInstalled').then(result => {receivedAdbInstalled = result;});
    //Changement de wrapper
    if (receivedAdbInstalled) {
      changeWhatsDisplayed(wrapperAdbNotInstalled, wrapperIdle, 'block');
    } else {
      changeWhatsDisplayed(wrapperIdle, wrapperAdbNotInstalled, 'block');
    }
    //Stop MAJ si adb est installé pour ne pas surcharger le processeur
    if(receivedAdbInstalled) {
      (idUpdateRendererADB ? clearInterval(idUpdateRendererADB) : " ");
    }
  }, 2000);

  //Update du renderer pour les fichiers
  setInterval(() => {
    //Affichage du wrapperFiles
    getVariable('deviceId').then(result => {
      receivedDeviceId = result;
      if (typeof receivedDeviceId === 'string' && receivedDeviceId.length > 0 && !isDownloading) {
          (wrapperIdle.style.display == 'block' ? changeWhatsDisplayed(wrapperIdle, wrapperFiles, 'grid') : "");
      } else {
        //loader animation
        changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
        (wrapperFiles.style.display == 'grid' ? changeWhatsDisplayed(wrapperFiles, wrapperIdle, 'block') : "");
      }
    });
  }, 1900);


//?  _________________________
//? |___BUTTONS_LISTENERS____|
  //*  _________________________
  //* |________GO_BACK_________|
  var goBackButton = document.getElementById("boutonRetour");
  goBackButton.addEventListener('mouseup', async function(event) {
    const circle = document.getElementById('circle');
    const containerCircle = document.getElementById('containerCircle');
    containerCircle.style.display = 'block';
    circle.style.backgroundColor = '#e3dbdbe1';
    circle.style.display = 'inline-block';
    circle.addEventListener('animationend', () => {
      circle.style.display = 'none';
      containerCircle.style.display = 'none';
    });
    document.getElementById('boutonRetour').style.display = 'none';
    //loader animation
    changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
    await cleanDisplayedDirectories().then(() => {
      window.api.send('changePath', 'goBack');
    });
  });

  //*  _________________________
  //* |______RECOMMENDED_______|
  var recommendedButton = document.getElementById("boutonAllSelect");
  recommendedButton.addEventListener('mouseup', async function(event) {
    const circle = document.getElementById('circle');
    const containerCircle = document.getElementById('containerCircle');
    containerCircle.style.display = 'block';
    circle.style.backgroundColor = '#bed4dfe1';
    circle.style.display = 'inline-block';
    circle.addEventListener('animationend', () => {
      circle.style.display = 'none';
      containerCircle.style.display = 'none';
    });
    downloadedFilesList = {};
    //Liste des noms des fichiers reçus pour la vérification
    var receivedFileNames = [];
    for (let i = 0; i < receivedFileList.length; i++) {
      receivedFileNames.push(receivedFileList[i].name);
    }
    //Ajout dans le dossier de download
    for (var i = 0; i < recommendedFolders.length; i++) {
      var recommendedPath = recommendedFolders[i];
      var verif = recommendedFolders[i].replace('/sdcard/', '');
      //Vérification si le dossier existe via le nom des fichiers reçus
      if (receivedFileNames.includes(verif)) {
        downloadedFilesList[recommendedPath] = true;
      }
    }
    document.getElementById('boutonDownload').style.display = 'inline-block';
    document.getElementById('boutonAnnuler').style.display = 'inline-block';
    await cleanDisplayedDirectories().then(() => {
      displayFiles(receivedFileList);
    });
    console.log("Fichiers à télécharger :", downloadedFilesList);
  });

  //*  _________________________
  //* |________REFRESH_________|
  var refreshButton = document.getElementById("boutonRefresh");
  refreshButton.addEventListener('mouseup', async function(event) {
    changeWhatsDisplayed(document.getElementById('files'),document.getElementById('fileLoader'),'inline-block');
    await cleanDisplayedDirectories().then(() => {
      window.api.send('refresh', true);
    });
    const circle = document.getElementById('circle');
    const containerCircle = document.getElementById('containerCircle');
    containerCircle.style.display = 'block';
    circle.style.backgroundColor = '#e3dbdbe1';
    circle.style.display = 'inline-block';
    circle.addEventListener('animationend', () => {
      circle.style.display = 'none';
      containerCircle.style.display = 'none';
    });
    downloadedFilesList = {};
    document.getElementById('boutonDownload').style.display = 'none';
    document.getElementById('boutonAnnuler').style.display = 'none';
  });

  //*  _________________________
  //* |________CANCEL__________|
  var cancelButton = document.getElementById("boutonAnnuler");
  cancelButton.addEventListener('mouseup', async function(event) {
    const circle = document.getElementById('circle');
    const containerCircle = document.getElementById('containerCircle');
    containerCircle.style.display = 'block';
    circle.style.backgroundColor = '#d49999';
    circle.style.display = 'inline-block';
    circle.addEventListener('animationend', () => {
      circle.style.display = 'none';
      containerCircle.style.display = 'none';
    });
    downloadedFilesList = {};
    document.getElementById('boutonDownload').style.display = 'none';
    document.getElementById('boutonAnnuler').style.display = 'none';
    await cleanDisplayedDirectories().then(() => {
      displayFiles(receivedFileList);
    });
  });

  //*  _________________________
  //* |________DOWNLOAD________|
  var isDownloading = false;
  var filePathButton = document.getElementById('boutonDownload');
  filePathButton.addEventListener('mouseup', async (event) => {
    isDownloading = true;
    window.api.send('filesToDownload', downloadedFilesList);
    changeWhatsDisplayed(wrapperFiles, wrapperDownloading, 'block');
  });
  //Barre de progression
  window.api.receive('changeDownloadPercentage', async (arg) => {
    console.log(arg[0]+'%');
    document.getElementById('progressPercentage').style.width = arg[0].toString() +'%';
    document.getElementById('fileName').innerText = arg[1].toString();
    const fileNb = document.querySelector('#fileNb');
    fileNb.querySelector('span:first-child').innerText = arg[2]+1;
  });
  //nb de fichiers
  window.api.receive('nbOfFiles', async (arg) => {
    fileNb.querySelector('span:last-child').innerText = arg;
  });
  //fin du téléchargement
  window.api.receive('finishedDownloading', async (arg) => {
    alert('Téléchargement terminé !');
    changeWhatsDisplayed(wrapperDownloading, wrapperFiles, 'grid');
    isDownloading = false;
    document.getElementById('progressPercentage').style.width = '0%';
  });


  //?  _________________________
  //? |_______EASTER_EGG_______|
  function setRandomBackgroundColor() {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    document.body.style.backgroundColor = randomColor;
  }
  var eaButton = document.getElementById('logoWave');
  var eaCounter = 0;
  let idEa;
  eaButton.addEventListener('click',  (event) => {
    eaCounter++;
    if(eaCounter == 10) {
      idEa = setInterval(setRandomBackgroundColor, 100);
    } else if(eaCounter > 10){
      clearInterval(idEa);
      document.body.style.backgroundColor = "#ffffff";
      eaCounter = 0;
    }
  });
  //?  _________________________
  //? |_____DISPLAY_FILES______|
  //Reception de la liste des fichiers
  window.api.receive('getFileList', async (arg) => { 
    receivedFileList = arg;
  });
  //Reception de la variable wantsToUpdate
  window.api.receive('wantsToUpdate', async (arg) => {
    if(arg) {
      await cleanDisplayedDirectories().then(() => {
        displayFiles(receivedFileList);
        changeWhatsDisplayed(document.getElementById('fileLoader'), document.getElementById('files'),'');
      });
    };
  });

});