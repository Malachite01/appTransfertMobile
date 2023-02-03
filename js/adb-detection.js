const terminal = require('child_process').exec;
const { spawn } = require('child_process');

function checkAdb() {
    return new Promise((resolve, reject) => {
        terminal('C://adb/adb version', (error, stdout, stderr) => {
            if (error) {
                //ADB n'est pas installé
                console.log("ADB PAS INSTALLE");
                resolve(false);
            } else {
                //ADB est installé
                console.log("ABD INSTALLE");
                resolve(true);
            }
        });
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
        
        const pathToAdd = 'C:\\adb';
        const checkForVariable = spawn('cmd.exe', ['/c', 'echo %PATH%']);

        checkForVariable.stdout.on('data', function(data) {
            const paths = data.toString().split(';');
            if (!paths.includes(pathToAdd)) {
                const addVariable = terminal(`cmd.exe /c setx PATH "${pathToAdd};%PATH%"`);
                addVariable.stdout.on('data', function(data) {
                    console.log('Environment variable added successfully');
                });
                addVariable.on('close', (code) => {
                    console.log(`Adding environment variable process exited with code ${code}`);
                });
                addVariable.on('error', (error) => {
                    console.error(`Error adding environment variable: ${error}`);
                });
            } else {
                console.log('Environment variable already exists');
            }
        });
        return;
    });
}

module.exports = {
    checkAdb: checkAdb,
    installAdb: installAdb
};