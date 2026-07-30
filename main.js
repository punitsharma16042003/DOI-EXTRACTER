const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 850,
        minWidth: 800,
        minHeight: 600,
        show: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        icon: path.join(__dirname, 'assets', 'logo.png'),
        title: "DOI EX — Bibliography DOI Extractor"
    });

    // Remove menu bar for clean app-like UI
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handler: Export File (TXT, CSV, JSON, BIB) via native save dialog
ipcMain.handle('export-file-dialog', async (event, content, defaultFileName, fileType) => {
    let filters = [];
    if (fileType === 'txt') {
        filters.push({ name: 'Text File', extensions: ['txt'] });
    } else if (fileType === 'csv') {
        filters.push({ name: 'CSV File', extensions: ['csv'] });
    } else if (fileType === 'json') {
        filters.push({ name: 'JSON File', extensions: ['json'] });
    } else if (fileType === 'bib') {
        filters.push({ name: 'BibTeX File', extensions: ['bib'] });
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFileName,
        filters: filters
    });

    if (canceled || !filePath) {
        return { success: false, canceled: true };
    }

    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true, filePath: filePath };
    } catch (err) {
        console.error("Error exporting file", err);
        return { success: false, error: err.message };
    }
});
