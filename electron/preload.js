const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  compileVideo: (projectData, srtText, customOutputDir) => {
    ipcRenderer.send('compile-video', projectData, srtText, customOutputDir);
  },
  onCompileLog: (callback) => {
    // Clean up listener to prevent memory leak
    ipcRenderer.removeAllListeners('compile-log');
    ipcRenderer.on('compile-log', (event, value) => callback(value));
  },
  onCompileProgress: (callback) => {
    ipcRenderer.removeAllListeners('compile-progress');
    ipcRenderer.on('compile-progress', (event, value) => callback(value));
  },
  onCompileFinished: (callback) => {
    ipcRenderer.removeAllListeners('compile-finished');
    ipcRenderer.on('compile-finished', (event, code, outputDir) => callback(code, outputDir));
  },
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getMacAddress: () => ipcRenderer.invoke('get-mac-address'),
  validateAssets: (args) => ipcRenderer.invoke('validate-assets', args),
  scanBgm: (projectPath) => ipcRenderer.invoke('scan-bgm', projectPath),
  getLastCompileData: () => ipcRenderer.invoke('get-last-compile-data'),
  openPath: (pathStr) => ipcRenderer.invoke('open-path', pathStr),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files-in-dir', dirPath),
  saveFile: (args) => ipcRenderer.invoke('save-file', args),
  listFonts: () => ipcRenderer.invoke('list-fonts'),
  reloadWindow: () => ipcRenderer.send('reload-window')
});
