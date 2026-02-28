// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // dipanggil sekali di renderer saat DOMContentLoaded
  onProfilesLoaded: (callback) => {
    ipcRenderer.invoke('profiles:get').then((data) => {
      if (callback) callback(data);
    });
  },

  saveProfiles: (profiles) => {
    ipcRenderer.send('profiles:save', profiles);
  },

  setActiveProfile: (memoryIndex) => {
    ipcRenderer.send('profile:setActive', memoryIndex);
  },

  onLastAction: (callback) => {
    ipcRenderer.on('last-action', (_event, info) => {
      if (callback) callback(info);
    });
  }
});
