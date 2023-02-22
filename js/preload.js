const { contextBridge, ipcRenderer } = require("electron");

//Authoriser une partie de ipcRenderer dans le render process
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {
            //Authorisation des channels ("getVariable") dans l'array
            let validChannels = ["getVariable", "changePath", "filesToDownload", "refresh"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, data);
            }
        },
        receive: (channel, func) => {
            //Authorisation des channels ("getAnswer") dans l'array
            let validChannels = ["getAnswer", "getFileList", "changePath", "wantsToUpdate", "filesToDownload", "finishedDownloading", "changeDownloadPercentage", "nbOfFiles"];
            if (validChannels.includes(channel)) {
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
);