const wrapperIddle = document.getElementById('wrapper-iddle');
const wrapperAdbNotInstalled = document.getElementById('adb-not-installed');
var receivedAdbInstalled;

// window.addEventListener('DOMContentLoaded', () => {

// });

//Requete de la variable isAdbInstalled
window.api.send('getVariable', 'isAdbInstalled');
//Reception de la variable isAdbInstalled
window.api.receive('getAnswer', (arg) => {
    receivedAdbInstalled = arg;
});

const button = document.getElementById('my-button');
button.addEventListener('click', () => {
    //Requete de la variable isAdbInstalled
    window.api.send('getVariable', 'isAdbInstalled');
    //Reception de la variable isAdbInstalled
    window.api.receive('getAnswer', (arg) => {
        receivedAdbInstalled = arg;
    });
});

//Affiche le bon wrapper en fonction de la valeur de receivedAdbInstalled
if(!receivedAdbInstalled) {
    wrapperIddle.style.display = 'none';
    wrapperAdbNotInstalled.style.display = 'block';
} else {
    wrapperAdbNotInstalled.style.display = 'none';
    wrapperIddle.style.display = 'block';
}