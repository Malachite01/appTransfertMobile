const adbkit = require('adbkit');
const client = adbkit.createClient({bin: 'C://adb/adb.exe'});

function trackDevices() {
    return client.listDevices()
      .then((devices) => {
        if (devices.length > 0) {
          console.log('Appareil detecte:', devices[0].id);
          return devices[0].id;
        }
        return null;
      })
      .catch((err) => {
        console.error('Erreur pendant le tracking des appareils:', err.stack);
        return null;
      });
  }

module.exports = {
    trackDevices: trackDevices
};