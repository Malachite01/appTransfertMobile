const { app } = require('electron');
const { spawn } = require('child_process');
const terminal = require('child_process').exec;
const path = require('path');
const log = require('electron-log');


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
        log.error(error);
        console.error(error);
    });
}

function installAdb() {
    const adbInstallerPath = path.join(app.getAppPath(), '../adb-setup-1.4.4.exe');
    console.log('Starting ADB installation...');
    const adbInstaller = spawn(adbInstallerPath);

    adbInstaller.on('error', (error) => {
        log.error(error);
        console.error(`ADB installation error: ${error}`);
        return;
    });
    adbInstaller.on('close', (code) => {
        log.debug(`ADB has been successfully installed, process exited with code ${code}`);
        console.log(`ADB has been successfully installed, process exited with code ${code}`);
        return;
    });
}

module.exports = {
    checkAdb: checkAdb,
    installAdb: installAdb
};