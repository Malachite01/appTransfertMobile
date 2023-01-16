const usb = require('usb');
exports.detectDevice = function() {
    setInterval(() => {
        let devices = usb.getDeviceList();
        devices.forEach((device) => {
            if (device.deviceDescriptor.idVendor === 0x18d1 && device.deviceDescriptor.idProduct === 0x4ee2) {
                console.log("Android Phone connected");
            }
        });
    }, 1000);
}