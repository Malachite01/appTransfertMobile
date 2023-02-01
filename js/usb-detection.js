const adbkit = require('adbkit');
const client = adbkit.createClient();

function trackDevices() {
    client.listDevices()
        .then((devices) => {
            devices.forEach((device) => {
                console.log('Device:', device.id);
            });
        })
        .catch((err) => {
            console.error('Error tracking devices:', err.stack);
        });
}

module.exports = {
    trackDevices: trackDevices
};