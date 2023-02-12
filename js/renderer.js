//!  _________________________
//! |_______VARIABLES________|
const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
const wrapperFiles = document.getElementById('wrapper-files');
var receivedAdbInstalled = false;
var receivedDeviceId = null;


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
    console.log(receivedDeviceId);
    if (typeof receivedDeviceId === 'string' && receivedDeviceId.length > 0) {
      (wrapperIddle.style.display == 'block' ? changeScreen(wrapperIddle, wrapperFiles, 'grid') : "");
    } else {
      (wrapperFiles.style.display == 'grid' ? changeScreen(wrapperFiles, wrapperIddle, 'block') : "");
    }
  }, 2000);

  });