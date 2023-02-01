const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
var receivedAdbInstalled;

window.addEventListener('DOMContentLoaded', () => {
    // Envoie un message au main process pour récupérer la variable isAdbInstalled
    window.ipcRenderer.send('get-variable', 'isAdbInstalled');
    // Ecoute la réponse du main process
    window.ipcRenderer.on('get-variable-response', (event, arg) => {
        receivedAdbInstalled = arg;
    });
    
    //Affiche le bon wrapper en fonction de la valeur de receivedAdbInstalled
    if(!receivedAdbInstalled) {
        wrapperAdbNotInstalled.style.display = 'block';
        wrapperIddle.style.display = 'none';
    } else {
        wrapperAdbNotInstalled.style.display = 'none';
        wrapperIddle.style.display = 'block';
    }
});
