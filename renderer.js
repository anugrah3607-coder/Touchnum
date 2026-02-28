// renderer.js
// Logika UI untuk Lomopad 3×4 dengan 3 memori + editor tombol tanpa window.prompt()

let profilesData = {
  activeProfile: 1,
  profiles: {
    "1": [],
    "2": [],
    "3": []
  }
};

const DEFAULT_PROFILE = [
  // index 0..11 (sesuai mapping di main.js)
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

// ---------- util ----------
function cloneProfileTemplate() {
  return DEFAULT_PROFILE.map(p => ({ ...p }));
}

function ensureProfilesShape(data) {
  if (!data || typeof data !== "object") return;

  if (typeof data.activeProfile !== "number") {
    data.activeProfile = 1;
  }
  if (!data.profiles || typeof data.profiles !== "object") {
    data.profiles = {};
  }
  for (const key of ["1", "2", "3"]) {
    if (!Array.isArray(data.profiles[key]) || data.profiles[key].length !== 12) {
      data.profiles[key] = cloneProfileTemplate();
    }
  }
}

// ---------- DOM ----------
const gridEl = document.getElementById("button-grid");
const memoryButtons = Array.from(document.querySelectorAll(".memory-btn"));
const activeMemoryText = document.getElementById("active-memory-text");
const resetBtn = document.getElementById("reset-profile-btn");
const lastLabelEl = document.getElementById("last-action-label");
const lastDetailEl = document.getElementById("last-action-detail");

// dialog
const dlgBackdrop = document.getElementById("edit-backdrop");
const dlgPositionText = document.getElementById("edit-position-text");
const dlgLabelInput = document.getElementById("edit-label-input");
const dlgTypeSelect = document.getElementById("edit-type-select");
const dlgValueInput = document.getElementById("edit-value-input");
const dlgValueLabel = document.getElementById("edit-value-label");
const dlgCancelBtn = document.getElementById("edit-cancel-btn");
const dlgSaveBtn = document.getElementById("edit-save-btn");

let currentEditIndex = null;
let gridButtons = [];

// ---------- render grid ----------
function buildGridIfNeeded() {
  if (gridButtons.length === 12) return;

  gridEl.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const btn = document.createElement("button");
    btn.className = "grid-button";
    btn.dataset.index = String(i);
    btn.textContent = "-";

    btn.addEventListener("click", () => {
      handleEditButton(i);
    });

    gridEl.appendChild(btn);
    gridButtons.push(btn);
  }
}

function updateMemoryButtonsUI() {
  const active = profilesData.activeProfile;
  memoryButtons.forEach(btn => {
    const mem = Number(btn.dataset.memory);
    btn.classList.toggle("active", mem === active);
  });
  activeMemoryText.textContent = String(active);
}

function updateGridUI() {
  buildGridIfNeeded();

  const activeKey = String(profilesData.activeProfile);
  const profileArr = profilesData.profiles[activeKey];

  for (let i = 0; i < 12; i++) {
    const cfg = profileArr[i];
    const btn = gridButtons[i];

    if (!cfg || !cfg.label) {
      btn.textContent = "-";
      btn.classList.add("is-empty");
    } else {
      btn.textContent = cfg.label;
      btn.classList.remove("is-empty");
    }
  }
}

// ---------- dialog logic ----------
function openEditDialog(index) {
  currentEditIndex = index;

  const activeKey = String(profilesData.activeProfile);
  const cfg = profilesData.profiles[activeKey][index];

  dlgPositionText.textContent = `Memori ${activeKey}, tombol #${index + 1}`;
  dlgLabelInput.value = cfg.label || "";
  const type = cfg.type || "sendKeys";
  dlgTypeSelect.value = type;

  if (type === "launchApp") {
    dlgValueLabel.textContent = "Path aplikasi (.exe) yang akan dijalankan";
    dlgValueInput.placeholder = "Contoh: C:\\Program Files\\App\\app.exe";
    dlgValueInput.value = cfg.appPath || "";
  } else {
    dlgValueLabel.textContent = "SendKeys untuk dikirim ke Windows";
    dlgValueInput.placeholder = "Contoh: 7, {ENTER}, {BACKSPACE}, ^c, ^v, dll";
    dlgValueInput.value = cfg.keys || "";
  }

  dlgBackdrop.classList.add("show");
  dlgLabelInput.focus();
}

function closeEditDialog() {
  currentEditIndex = null;
  dlgBackdrop.classList.remove("show");
}

function handleEditButton(index) {
  // klik dari UI, bukan dari touchpad
  openEditDialog(index);
}

// ketika user ganti jenis aksi, update label input
dlgTypeSelect.addEventListener("change", () => {
  if (dlgTypeSelect.value === "launchApp") {
    dlgValueLabel.textContent = "Path aplikasi (.exe) yang akan dijalankan";
    dlgValueInput.placeholder = "Contoh: C:\\Program Files\\App\\app.exe";
  } else {
    dlgValueLabel.textContent = "SendKeys untuk dikirim ke Windows";
    dlgValueInput.placeholder = "Contoh: 7, {ENTER}, {BACKSPACE}, ^c, ^v, dll";
  }
});

dlgCancelBtn.addEventListener("click", () => {
  closeEditDialog();
});

dlgBackdrop.addEventListener("click", (e) => {
  if (e.target === dlgBackdrop) {
    closeEditDialog();
  }
});

dlgSaveBtn.addEventListener("click", () => {
  if (currentEditIndex == null) return;

  const label = dlgLabelInput.value.trim() || "-";
  const type = dlgTypeSelect.value;
  const value = dlgValueInput.value.trim();

  const activeKey = String(profilesData.activeProfile);
  const cfg = profilesData.profiles[activeKey][currentEditIndex];

  cfg.label = label;
  cfg.type = type;

  if (type === "launchApp") {
    cfg.appPath = value;
    delete cfg.keys;
  } else {
    cfg.keys = value;
    delete cfg.appPath;
  }

  updateGridUI();

  // kirim ke main process supaya disimpan & dipakai engine
  if (window.electronAPI && window.electronAPI.saveProfiles) {
    window.electronAPI.saveProfiles(profilesData);
  }

  closeEditDialog();
});

// ---------- memory buttons ----------
memoryButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const mem = Number(btn.dataset.memory);
    if (profilesData.activeProfile === mem) return;
    profilesData.activeProfile = mem;
    updateMemoryButtonsUI();
    updateGridUI();

    if (window.electronAPI && window.electronAPI.setActiveProfile) {
      window.electronAPI.setActiveProfile(mem);
    }
  });
});

// ---------- reset button ----------
resetBtn.addEventListener("click", () => {
  const activeKey = String(profilesData.activeProfile);
  profilesData.profiles[activeKey] = cloneProfileTemplate();
  updateGridUI();

  if (window.electronAPI && window.electronAPI.saveProfiles) {
    window.electronAPI.saveProfiles(profilesData);
  }
});

// ---------- IPC from main ----------
window.addEventListener("DOMContentLoaded", () => {
  buildGridIfNeeded();

  if (window.electronAPI && window.electronAPI.onProfilesLoaded) {
    window.electronAPI.onProfilesLoaded((data) => {
      // data: { activeProfile, profiles }
      profilesData = data || profilesData;
      ensureProfilesShape(profilesData);
      updateMemoryButtonsUI();
      updateGridUI();
    });
  } else {
    // fallback kalau belum ada file → pakai default
    profilesData.profiles["1"] = cloneProfileTemplate();
    profilesData.profiles["2"] = cloneProfileTemplate();
    profilesData.profiles["3"] = cloneProfileTemplate();
    ensureProfilesShape(profilesData);
    updateMemoryButtonsUI();
    updateGridUI();
  }

  if (window.electronAPI && window.electronAPI.onLastAction) {
    window.electronAPI.onLastAction((info) => {
      // info: { memory, lomopadId, label, type, keys, appPath }
      const memLabel = info.memory ?? profilesData.activeProfile;
      const label = info.label || "-";
      lastLabelEl.textContent = `${label}`;

      const typeText = info.type === "launchApp" ? "LaunchApp" : "SendKeys";
      const value = info.type === "launchApp" ? (info.appPath || "") : (info.keys || "");
      lastDetailEl.textContent = `Memori ${memLabel} • ${typeText}: ${value}`;
    });
  }
});
