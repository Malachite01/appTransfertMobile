//!  _________________________
//! |_______VARIABLES________|
const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
const wrapperFiles = document.getElementById('wrapper-files');
var receivedAdbInstalled = false;
var receivedDeviceId = null;
var receivedFileList = [];
var oldReceivedFileList = [];
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
    if(ligne != null)
    ligne.remove();
  }
}

async function displayFiles(receivedFileList) {
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
    let date = file.lastModified.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    let icon = "<img src='" + iconPath + "' alt='file' width='20' height='20'>"
    var htmlBlock;
    var selectedPath;
    var isChecked = "";
    await getVariable('actualPath').then(path => {
      selectedPath = path + "/" + file.name; 
      isChecked = (selectedPath in downloadedFilesList ? 'checked' : '');
      //Affichage du bouton retour ou du bouton select all
      (path == "/sdcard") ? changeWhatsDisplayed(document.getElementById('boutonRetour'),document.getElementById('boutonAllSelect'),'block') : changeWhatsDisplayed(document.getElementById('boutonAllSelect'),document.getElementById('boutonRetour'),'block');
      //Affichage du chemin actuel
      document.getElementById('actualPath').textContent = path;
    });
    htmlBlock = "<tr id='"+i+"'><td><input type='checkbox' id='switch"+i+"' "+isChecked+"><label for='switch"+i+"'>Toggle</label></td><td>"+icon+"</td><td class='fileName'>"+file.name+"</td><td>"+taille+"</td><td>"+date+"</td></tr>";

    table.insertAdjacentHTML("beforeend", htmlBlock);

    var line = document.getElementById(i);
    line.addEventListener('click', async function(event) {
      var td = event.target.closest('td');
      if (td && td.classList.contains('fileName')) {
        var nom = td.textContent.trim();
        var index = receivedFileList.findIndex(function(file) {
          return file.name === nom;
        });
        if (index !== -1 && receivedFileList[index].type === 'Dossier') {
          //loader animation
          changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
          await cleanDisplayedDirectories();
          window.api.send('changePath', nom);
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
            }
          } else {
            downloadedFilesList[selectedPath] = true;
            document.getElementById('boutonDownload').style.display = 'inline-block';
          }
        });
        console.log(downloadedFilesList);
      }
    });
  }
  var fileNamesArray = Object.keys(fileNames);
  var fileNamesLength = fileNamesArray.length;
  document.getElementById('nbFichiers').textContent = fileNamesLength + " fichier(s)";
}

function compareFileArrays(array1, array2) {
  var filesName1 = array1.map(function(file) { return file.name; }).sort();
  var filesName2 = array2.map(function(file) { return file.name; }).sort();
  return filesName1.length === filesName2.length && filesName1.every(function(value, index) { return value === filesName2[index]});
}

//!  _________________________
//! |_________MAIN___________|
window.addEventListener('DOMContentLoaded', () => {
  //Update du renderer pour adbInstalled
  idUpdateRendererADB = setInterval(() => {
    getVariable('isAdbInstalled').then(result => {receivedAdbInstalled = result;});
    //Changement de wrapper
    if (receivedAdbInstalled) {
      changeWhatsDisplayed(wrapperAdbNotInstalled, wrapperIddle, 'block');
    } else {
      changeWhatsDisplayed(wrapperIddle, wrapperAdbNotInstalled, 'block');
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
      if (typeof receivedDeviceId === 'string' && receivedDeviceId.length > 0) {
        (wrapperIddle.style.display == 'block' ? changeWhatsDisplayed(wrapperIddle, wrapperFiles, 'grid') : "");
      } else {
        //loader animation
        changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
        (wrapperFiles.style.display == 'grid' ? changeWhatsDisplayed(wrapperFiles, wrapperIddle, 'block') : "");
      }
    });
  }, 1900);

  //Ajout du listener pour le bouton de retour
  var goBackButton = document.getElementById("boutonRetour");
  goBackButton.addEventListener('click', async function(event) {
      //loader animation
      changeWhatsDisplayed(document.getElementById('files'), document.getElementById('fileLoader'),'inline-block');
      await cleanDisplayedDirectories();
      window.api.send('changePath', 'goBack');
  });

  //?  _________________________
  //? |_____DISPLAY_FILES______|
  //Reception de la liste des fichiers
  window.api.receive('getFileList', async (arg) => { 
    receivedFileList = arg;
    // console.log(receivedFileList);
    changeWhatsDisplayed(document.getElementById('fileLoader'), document.getElementById('files'),'');
  });
  //Reception de la variable wantsToUpdate
  window.api.receive('wantsToUpdate', async (arg) => {
    if(arg) {
      await cleanDisplayedDirectories();
      displayFiles(receivedFileList);
    };
  });

});