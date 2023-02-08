const terminal = require('child_process').exec;
const { spawn } = require('child_process');

function checkAdb() {
    return new Promise((resolve, reject) => {
        terminal('C://adb/adb version', (error, stdout, stderr) => {
            if (error) {
                //ADB n'est pas installé
                resolve(false);
            } else {
                //ADB est installé
                resolve(true);
            }
        });
    })
    .catch((error) => {
        console.error(error);
    });
}


function installAdb() {
    console.log('Starting ADB installation...');
    const adbInstaller = spawn('adb-setup-1.4.4.exe');
   
    adbInstaller.on('error', (error) => {
        console.error(`ADB installation error: ${error}`);
        return;
    });
    adbInstaller.on('close', (code) => {
        console.log(`ADB has been successfully installed, process exited with code ${code}`);
        return;
    });
}

module.exports = {
    checkAdb: checkAdb,
    installAdb: installAdb
};