const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1200,
    minHeight: 800,
    backgroundColor: "#f8fafc",
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

  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("desktop:select-base-folder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "Izaberi bazni folder za projekte",
  });

  if (result.canceled || !result.filePaths?.[0]) {
    return { canceled: true, folderPath: "" };
  }

  return { canceled: false, folderPath: result.filePaths[0] };
});

ipcMain.handle("desktop:create-project-folder", async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== "string") {
      throw new Error("Folder path nije prosleđen.");
    }

    fs.mkdirSync(folderPath, { recursive: true });

    const subfolders = [
      "01_Ponude",
      "02_Dokumentacija",
      "03_Projekat",
      "04_Uprava_za_zastitu_kulturnih_dobara",
      "05_Fotografije",
      "06_Izlazni_PDF",
    ];

    subfolders.forEach((folderName) => {
      fs.mkdirSync(path.join(folderPath, folderName), { recursive: true });
    });

    return { ok: true, folderPath };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Greška pri kreiranju foldera.",
    };
  }
});

ipcMain.handle("desktop:open-folder", async (_event, folderPath) => {
  try {
    if (!folderPath || typeof folderPath !== "string") {
      throw new Error("Folder path nije prosleđen.");
    }

    if (!fs.existsSync(folderPath)) {
      throw new Error("Folder ne postoji.");
    }

    await shell.openPath(folderPath);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Greška pri otvaranju foldera.",
    };
  }
});

ipcMain.handle("desktop:save-pdf", async (_event, payload) => {
  try {
    const { folderPath, fileName, bytes } = payload || {};

    if (!folderPath || !fileName || !bytes) {
      throw new Error("Nedostaju podaci za snimanje PDF-a.");
    }

    const pdfFolder = path.join(folderPath, "01_Ponude");

    fs.mkdirSync(pdfFolder, { recursive: true });

    const outputPath = path.join(pdfFolder, fileName);
    fs.writeFileSync(outputPath, Buffer.from(bytes));

    return { ok: true, outputPath };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "Greška pri snimanju PDF-a.",
    };
  }
});