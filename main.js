// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let tpadProcess = null;

// ---------- PROFIL (DEFAULT) ----------
const DEFAULT_PROFILE = [
  { label: "7",  type: "sendKeys", keys: "7" },
  { label: "8",  type: "sendKeys", keys: "8" },
  { label: "9",  type: "sendKeys", keys: "9" },
  { label: "Enter", type: "sendKeys", keys: "{ENTER}" },

  { label: "4",  type: "sendKeys", keys: "4" },
  { label: "5",  type: "sendKeys", keys: "5" },
  { label: "6",  type: "sendKeys", keys: "6" },
  { label: "Hapus", type: "sendKeys", keys: "{BACKSPACE}" },

  { label: "1",  type: "sendKeys", keys: "1" },
  { label: "2",  type: "sendKeys", keys: "2" },
  { label: "3",  type: "sendKeys", keys: "3" },
  { label: "0",  type: "sendKeys", keys: "0" }
];

function cloneProfileTemplate() {
  return DEFAULT_PROFILE.map(p => ({ ...p }));
}

// profilesData default
let profilesData = {
  activeProfile: 1,
  profiles: {
    "1": cloneProfileTemplate(),
    "2": cloneProfileTemplate(),
    "3": cloneProfileTemplate()
  }
};

// IMPORTANT: PATH PROFIL HARUS DI userData (bukan __dirname)
let PROFILES_PATH = null;

function initPaths() {
  // userData: contoh Windows => C:\Users\<you>\AppData\Roaming\LOMOPAD
  const userDataDir = app.getPath('userData');
  PROFILES_PATH = path.join(userDataDir, 'lomopad_profiles.json');
  console.log('[PATH] userDataDir =', userDataDir);
  console.log('[PATH] PROFILES_PATH =', PROFILES_PATH);
}

function ensureProfilesShape(obj) {
  if (!obj || typeof obj !== 'object') return;

  if (typeof obj.activeProfile !== 'number') {
    obj.activeProfile = 1;
  }
  if (!obj.profiles || typeof obj.profiles !== 'object') {
    obj.profiles = {};
  }
  for (const key of ["1", "2", "3"]) {
    if (!Array.isArray(obj.profiles[key]) || obj.profiles[key].length !== 12) {
      obj.profiles[key] = cloneProfileTemplate();
    }
  }
}

function loadProfilesFromDisk() {
  try {
    if (!PROFILES_PATH) throw new Error('PROFILES_PATH not initialized');

    if (fs.existsSync(PROFILES_PATH)) {
      const raw = fs.readFileSync(PROFILES_PATH, 'utf-8');
      const data = JSON.parse(raw);
      ensureProfilesShape(data);
      profilesData = data;
      console.log('[PROFILE] Loaded from', PROFILES_PATH);
    } else {
      ensureProfilesShape(profilesData);

      // pastikan folder userData ada
      fs.mkdirSync(path.dirname(PROFILES_PATH), { recursive: true });

      fs.writeFileSync(PROFILES_PATH, JSON.stringify(profilesData, null, 2), 'utf-8');
      console.log('[PROFILE] Created default at', PROFILES_PATH);
    }
  } catch (err) {
    console.error('[PROFILE] Failed to load profile, using defaults', err);
    profilesData = {
      activeProfile: 1,
      profiles: {
        "1": cloneProfileTemplate(),
        "2": cloneProfileTemplate(),
        "3": cloneProfileTemplate()
      }
    };
  }
}

function saveProfilesToDisk() {
  try {
    if (!PROFILES_PATH) throw new Error('PROFILES_PATH not initialized');

    fs.mkdirSync(path.dirname(PROFILES_PATH), { recursive: true });

    // tulis atomic (lebih aman)
    const tmpPath = PROFILES_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(profilesData, null, 2), 'utf-8');
    fs.renameSync(tmpPath, PROFILES_PATH);

    console.log('[PROFILE] Saved to', PROFILES_PATH);
  } catch (err) {
    console.error('[PROFILE] Failed to save profiles', err);
  }
}

// ---------- TOUCHPAD ENGINE ----------

// mapping raw button_id -> lomopad index 0..11
const RAW_TO_LOMO = {
  0: 0,  1: 1,  2: 2,  3: 3,
  4: 4,  5: 5,  6: 6,  7: 7,
  8: 8,  9: 9,  10: 10, 11: 11
};

function getEngineExePath() {
  // DEV: project/engine/precision_touchpad_detector.exe
  // PACKAGED (electron-builder extraResources): resources/engine/precision_touchpad_detector.exe
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'engine', 'precision_touchpad_detector.exe');
  }
  return path.join(__dirname, 'engine', 'precision_touchpad_detector.exe');
}

function sendKeysWithPowerShell(keys) {
  if (!keys) return;

  const safeKeys = String(keys).replace(/'/g, "''");

  const psScript =
`$wshell = New-Object -ComObject wscript.shell;
Start-Sleep -Milliseconds 10;
$wshell.SendKeys('${safeKeys}');`;

  // tidak perlu print script panjang tiap kali (bikin spam log)
  console.log(`>> [SENDKEYS] ${safeKeys}`);

  const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    windowsHide: true,
    stdio: 'ignore'
  });

  // biar proses kecil ini gak nahan event-loop
  child.unref();
}

function launchApp(appPath) {
  if (!appPath) return;

  try {
    console.log(`>> [LAUNCH] ${appPath}`);

    // stdio ignore + unref agar tidak nahan proses utama
    const child = spawn(appPath, [], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    });
    child.unref();
  } catch (e) {
    console.error('>> [LAUNCH] Failed:', e);
  }
}

function handleTouchpadButton(eventObj) {
  const rawId = eventObj.button_id;
  const lomopadId = RAW_TO_LOMO[rawId];

  if (lomopadId === undefined) {
    console.log('>> [TOUCHPAD] Unknown rawId', rawId);
    return;
  }

  const mem = profilesData.activeProfile || 1;
  const profileArr = profilesData.profiles[String(mem)] || [];
  const cfg = profileArr[lomopadId];

  console.log(
    `>> [ENGINE] memory=${mem} lomopadId=${lomopadId} label=${cfg?.label} type=${cfg?.type}`
  );

  // kirim info ke renderer utk "Terakhir"
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('last-action', {
      memory: mem,
      lomopadId,
      label: cfg?.label,
      type: cfg?.type,
      keys: cfg?.keys,
      appPath: cfg?.appPath
    });
  }

  if (!cfg || !cfg.type) return;

  if (cfg.type === 'sendKeys') {
    sendKeysWithPowerShell(cfg.keys || '');
  } else if (cfg.type === 'launchApp') {
    launchApp(cfg.appPath || '');
  }
}

function startTouchpadEngine() {
  const exePath = getEngineExePath();
  console.log('>> [TPAD] Starting engine at:', exePath);

  if (!fs.existsSync(exePath)) {
    console.error('>> [TPAD] Engine EXE not found:', exePath);
    return;
  }

  // set cwd supaya kalau engine butuh relative file, lebih aman
  const cwd = path.dirname(exePath);

  tpadProcess = spawn(exePath, [], {
    cwd,
    windowsHide: true
  });

  const handleEngineData = (source) => (data) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const obj = JSON.parse(line);

        if (obj.type === 'status') {
          console.log(`>> [TPAD-STATUS] ${obj.message}`);
        } else if (obj.type === 'button' && obj.action === 'press') {
          console.log(`>> [TPAD] BUTTON press:`, obj);
          handleTouchpadButton(obj);
        } else {
          // info lain engine
          // console.log(`>> [TPAD-${source}]`, obj);
        }
      } catch (err) {
        // baris non-json
        // console.log(`>> [TPAD-ERR-${source}]`, line);
      }
    }
  };

  tpadProcess.stdout.on('data', handleEngineData('STDOUT'));
  tpadProcess.stderr.on('data', handleEngineData('STDERR'));

  tpadProcess.on('exit', (code, signal) => {
    console.log(`>> [TPAD] exited. code=${code} signal=${signal}`);
    tpadProcess = null;
  });
}

function stopTouchpadEngine() {
  if (tpadProcess) {
    try {
      tpadProcess.kill();
    } catch (_) {}
    tpadProcess = null;
  }
}

// ---------- ELECTRON WINDOW ----------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------- IPC ----------
ipcMain.handle('profiles:get', async () => {
  return profilesData;
});

ipcMain.on('profiles:save', (event, newData) => {
  if (newData && typeof newData === 'object') {
    ensureProfilesShape(newData);
    profilesData = newData;
    saveProfilesToDisk();
  }
});

ipcMain.on('profile:setActive', (event, mem) => {
  const n = Number(mem) || 1;
  profilesData.activeProfile = n;
  saveProfilesToDisk();
});

// ---------- APP LIFECYCLE ----------
app.whenReady().then(() => {
  initPaths();
  loadProfilesFromDisk();
  createWindow();
  startTouchpadEngine();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// pastikan engine mati saat app keluar
app.on('before-quit', () => {
  stopTouchpadEngine();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopTouchpadEngine();
    app.quit();
  }
});
