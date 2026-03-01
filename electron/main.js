const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');
const treeKill = require('tree-kill');

let mainWindow;
let djangoProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    mainWindow.loadFile(frontendPath);

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function startBackendAndLaunch() {
    const backendDir = path.join(__dirname, '../backend');
    const venvPython = process.platform === 'win32'
        ? path.join(backendDir, 'venv/Scripts/python.exe')
        : path.join(backendDir, 'venv/bin/python');

    // Start Django
    djangoProcess = spawn(venvPython, ['manage.py', 'runserver', '127.0.0.1:8000'], { cwd: backendDir });

    djangoProcess.stdout.on('data', (data) => console.log(`Django: ${data}`));
    djangoProcess.stderr.on('data', (data) => console.log(`Django Error: ${data}`));

    // Wait for Django to start
    waitOn({
        resources: ['http://127.0.0.1:8000/api/reports/dashboard/'],
        timeout: 15000,
        validateStatus: function (status) {
            return status >= 200 && status < 500;
        }
    }).then(() => {
        createWindow();
    }).catch((err) => {
        console.error("Failed to connect to backend", err);
        dialog.showErrorBox("Backend Error", "Failed to start the local Python server. Make sure dependencies are installed.");
        app.quit();
    });
}

app.on('ready', startBackendAndLaunch);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (djangoProcess && djangoProcess.pid) {
        treeKill(djangoProcess.pid);
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        startBackendAndLaunch();
    }
});
