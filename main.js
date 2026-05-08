const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

function sendUpdateStatus(message) {
  if (mainWindow) {
    mainWindow.webContents.send("update-message", message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: "#f0eee8",
    autoHideMenuBar: false,
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) { mainWindow.loadURL(startUrl); }
  else { mainWindow.loadFile(path.join(__dirname, "dist", "index.html")); }
}

app.whenReady().then(() => {
  createWindow();
  if (!process.env.ELECTRON_START_URL) { autoUpdater.checkForUpdatesAndNotify(); }
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

autoUpdater.on("checking-for-update", () => sendUpdateStatus("Provjera dostupnih ažuriranja..."));
autoUpdater.on("update-available", () => sendUpdateStatus("Dostupno je novo ažuriranje. Preuzimanje je u toku..."));
autoUpdater.on("update-not-available", () => sendUpdateStatus("Aplikacija je ažurna."));
autoUpdater.on("error", (error) => sendUpdateStatus(`Greška pri ažuriranju: ${error.message}`));
autoUpdater.on("download-progress", (progress) => sendUpdateStatus(`Preuzimanje ažuriranja: ${Math.round(progress.percent)}%`));
autoUpdater.on("update-downloaded", () => {
  sendUpdateStatus("Ažuriranje je preuzeto. Aplikacija će se restartovati.");
  setTimeout(() => autoUpdater.quitAndInstall(), 1500);
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

ipcMain.handle("desktop:select-base-folder", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"], title: "Izaberi bazni folder za projekte" });
  if (result.canceled || !result.filePaths?.[0]) return { canceled: true, folderPath: "" };
  return { canceled: false, folderPath: result.filePaths[0] };
});

// SAMO kreira dati folder - BEZ automatskih podfoldera
ipcMain.handle("desktop:create-project-folder", async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== "string") throw new Error("Folder path nije prosleđen.");
    fs.mkdirSync(folderPath, { recursive: true });
    return { ok: true, folderPath };
  } catch (error) {
    return { ok: false, error: error.message || "Greška pri kreiranju foldera." };
  }
});

ipcMain.handle("desktop:open-folder", async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== "string") throw new Error("Folder path nije prosleđen.");
    if (!fs.existsSync(folderPath)) throw new Error("Folder ne postoji.");
    await shell.openPath(folderPath);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Greška pri otvaranju foldera." };
  }
});

// PDF se snima u godišnji Ponude folder
ipcMain.handle("desktop:save-pdf", async (_event, payload) => {
  try {
    const { folderPath, fileName, bytes } = payload || {};
    if (!folderPath || !fileName || !bytes) throw new Error("Nedostaju podaci za snimanje PDF-a.");
    fs.mkdirSync(folderPath, { recursive: true });
    const outputPath = path.join(folderPath, fileName);
    fs.writeFileSync(outputPath, Buffer.from(bytes));
    return { ok: true, outputPath };
  } catch (error) {
    return { ok: false, error: error.message || "Greška pri snimanju PDF-a." };
  }
});
