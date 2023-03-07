const adbkit = require('adbkit');
const client = adbkit.createClient({bin: 'C://adb/adb.exe'});
const log = require('electron-log');

function trackDevices() {
    return client.listDevices()
      .then((devices) => {
        if (devices.length > 0) {
          return devices[0].id;
        }
        return null;
      })
      .catch((err) => {
        log.error('Erreur pendant le tracking des appareils:', err.stack);
        console.error('Erreur pendant le tracking des appareils:', err.stack);
        return null;
      });
  }

module.exports = {
    trackDevices: trackDevices
};