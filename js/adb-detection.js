const terminal = require('child_process').exec;

function checkAdb() {
    terminal('adb version', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return false;
        }
        return true;
    });
}

function installAdb() {
    console.log('Starting ADB installation...');
    terminal('adb-setup-1.4.4.exe', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        console.log(`ADB has been successfully installed.`);
    });
}

module.exports = {
    checkAdb: checkAdb,
    installAdb: installAdb
};