const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    exportFile: (content, defaultFileName, fileType) => ipcRenderer.invoke('export-file-dialog', content, defaultFileName, fileType)
});
