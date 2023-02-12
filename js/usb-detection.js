const adbkit = require('adbkit');
const client = adbkit.createClient({bin: 'C://adb/adb.exe'});

function trackDevices() {
    return client.listDevices()
      .then((devices) => {
        if (devices.length > 0) {
          console.log('Device found:', devices[0].id);
          return devices[0].id;
        }
        return null;
      })
      .catch((err) => {
        console.error('Error tracking devices:', err.stack);
        return null;
      });
  }

module.exports = {
    trackDevices: trackDevices
};