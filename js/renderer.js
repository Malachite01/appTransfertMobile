//!  _________________________
//! |_______VARIABLES________|
const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
var receivedAdbInstalled = false;


//!  _________________________
//! |_______FUNCTIONS________|
function changeScreen(screen1, screen2) {
  screen1.style.display = 'none';
  screen2.style.display = 'block';
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
      changeScreen(wrapperAdbNotInstalled, wrapperIddle);
    } else {
      changeScreen(wrapperIddle, wrapperAdbNotInstalled);
    }
    //Stop MAJ si adb est installé pour ne pas surcharger le processeur
    if(receivedAdbInstalled) {
      (idUpdateRenderer ? clearInterval(idUpdateRenderer) : " ");
    }
  }, 1000);
});