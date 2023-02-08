const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
var receivedAdbInstalled = false;

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

window.addEventListener('DOMContentLoaded', () => {
  getVariable('isAdbInstalled').then(result => {receivedAdbInstalled = result;});
  if (!receivedAdbInstalled) {
    idUpdateRenderer = setInterval(() => {
      getVariable('isAdbInstalled').then(result => {receivedAdbInstalled = result;});
      console.log(receivedAdbInstalled);
      changeScreen(wrapperIddle, wrapperAdbNotInstalled);
    }, 2000);
  } else {
    changeScreen(wrapperAdbNotInstalled, wrapperIddle);
    (idUpdateRenderer ? clearInterval(idUpdateRenderer) : "");
  }
});