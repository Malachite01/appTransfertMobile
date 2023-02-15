//!  _________________________
//! |_______VARIABLES________|
const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
const wrapperFiles = document.getElementById('wrapper-files');
var receivedAdbInstalled = false;
var receivedDeviceId = null;
var receivedFileList = [];
var oldReceivedFileList = [];

//!  _________________________
//! |_______FUNCTIONS________|
function changeScreen(screen1, screen2,type) {
  screen1.style.display = 'none';
  screen2.style.display = type;
}

function getVariable(variableName) {
  return new Promise((resolve, reject) => {
    //Requete de la variable isAdbInstalled
    window.api.send('getVariable', variableName);
    //Reception de la variable isAdbInstalled
    window.api.receive('getAnswer', (arg) => {
      resolve(arg);
    });
  });
}

function afficherFichiers(receivedFileList) {
  var table = document.getElementById('files');
  for(var i=0; i < receivedFileList.length; i++) {
    let file = receivedFileList[i];
    
    //Calcul de la taille du fichier
    var taille = file.size;
    let bytes = taille;
    if (bytes < 1000) {
      taille = bytes + ' o';
    } else if (bytes < 1000000) {
      taille = (bytes / 1000).toFixed(2) + ' Ko';
    } else if (bytes < 1000000000) {
      taille = (bytes / 1000000).toFixed(2) + ' Mo';
    } else {
      taille = (bytes / 1000000000).toFixed(2) + ' Go';
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
    let htmlBlock = "<tr id='"+i+"'><td><input type='checkbox' id='switch"+i+"'/><label for='switch"+i+"'>Toggle</label></td><td>"+icon+"</td><td>"+file.name+"</td><td>"+taille+"</td><td>"+date+"</td></tr>";
    table.insertAdjacentHTML("beforeend", htmlBlock); 
  }
}

function compareFileArrays(array1, array2) {
  var filesName1 = [];
  var filesName2 = [];
  for (var i = 0; i < array1.length; i++) {
    filesName1.push(array1[i].name);
  }
  for (var i = 0; i < array2.length; i++) {
    filesName2.push(array2[i].name);
  }
  return array1.length === array2.length && filesName1.every(function(value, index) { return value === filesName2[index]});
}

//!  _________________________
//! |_________MAIN___________|
window.addEventListener('DOMContentLoaded', () => {
  idUpdateRenderer = setInterval(() => {
    getVariable('isAdbInstalled').then(result => {receivedAdbInstalled = result;});
    //Changement de wrapper
    if (receivedAdbInstalled) {
      changeScreen(wrapperAdbNotInstalled, wrapperIddle, 'block');
    } else {
      changeScreen(wrapperIddle, wrapperAdbNotInstalled, 'block');
    }
    //Stop MAJ si adb est installé pour ne pas surcharger le processeur
    if(receivedAdbInstalled) {
      (idUpdateRenderer ? clearInterval(idUpdateRenderer) : " ");
    }
  }, 2000);
  
  setInterval(() => {
    getVariable('deviceId').then(result => {receivedDeviceId = result;});
    if (typeof receivedDeviceId === 'string' && receivedDeviceId.length > 0) {
      (wrapperIddle.style.display == 'block' ? changeScreen(wrapperIddle, wrapperFiles, 'grid') : "");
    } else {
      (wrapperFiles.style.display == 'grid' ? changeScreen(wrapperFiles, wrapperIddle, 'block') : "");
    }
  }, 2000);

  setInterval(() => {
    window.api.receive('getFileList', (arg) => { 
        receivedFileList = arg;
        console.log(receivedFileList);
        if(!compareFileArrays(receivedFileList, oldReceivedFileList)) {
          afficherFichiers(receivedFileList);
        }
        oldReceivedFileList = receivedFileList; 
    });
  },2000);

  });