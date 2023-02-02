const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
var receivedAdbInstalled;

window.addEventListener('DOMContentLoaded', () => {

    //Requete de la variable isAdbInstalled
    window.api.send('get-variable', 'isAdbInstalled');
    //Reception de la variable isAdbInstalled
    window.api.receive('get-variable-response', (arg) => {
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
