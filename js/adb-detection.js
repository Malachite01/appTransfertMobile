const terminal = require('child_process').exec;

function checkAdb() {
    return new Promise((resolve, reject) => {
        terminal('C://adb/adb version', (error, stdout, stderr) => {
            if (error) {
                //ADB n'est pas installé
                resolve(false);
            } else {
                //ADB est installé donc on ajoute la variable d'environnement
                const { spawn } = require('child_process');
                const pathToAdd = 'C://adb';
                spawn('cmd.exe', ['/c', `setx path "%path%;${pathToAdd}" /m`]);
                resolve(true);
            }
        });
    });
}


function installAdb() {
    console.log('Starting ADB installation...');
    terminal('adb-setup-1.4.4.exe', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
    });
    //envoyer un signal au renderer.js pour afficher le bon wrapper
    console.log(`ADB has been successfully installed.`);
}

module.exports = {
    checkAdb: checkAdb,
    installAdb: installAdb
};