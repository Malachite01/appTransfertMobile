const { contextBridge, ipcRenderer } = require("electron");

//Authoriser une partie de ipcRenderer dans le render process
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {
            //Authorisation des channels dans l'array
            let validChannels = ["getVariable"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            //Authorisation des channels dans l'array
            let validChannels = ["getAnswer"];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
);