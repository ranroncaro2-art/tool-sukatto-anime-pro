const { app, BrowserWindow, ipcMain, dialog, protocol, net, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Đăng ký custom protocol 'app' và 'safe-file' trước khi ứng dụng ready để hỗ trợ fetch, cookies, etc.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'safe-file', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#09090b',
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Mở DevTools ở chế độ phát triển
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://localhost/index.html');
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  // Đăng ký bộ xử lý cho protocol 'app://' để nạp đúng file tĩnh trong out/
  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url);
      let pathname = url.pathname;
      if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
      }
      const decodedPath = decodeURIComponent(pathname);
      const filePath = path.normalize(path.join(__dirname, '../out', decodedPath));
      const fileUrl = pathToFileURL(filePath).href;
      return net.fetch(fileUrl);
    } catch (error) {
      console.error('Failed to handle app protocol:', error);
    }
  });

  // Đăng ký bộ xử lý cho protocol 'safe-file://' để nạp file từ bất kỳ thư mục nào cục bộ
  protocol.handle('safe-file', (request) => {
    try {
      const decodedUrl = decodeURIComponent(request.url);
      let filePath = decodedUrl.substring(12); // Remove 'safe-file://'
      if (filePath.startsWith('localhost/')) {
        filePath = filePath.substring(10);
      }
      filePath = path.normalize(filePath);
      
      const fileUrl = pathToFileURL(filePath).href;
      return net.fetch(fileUrl);
    } catch (error) {
      console.error('Failed to handle safe-file protocol:', error);
    }
  });

  createWindow();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Xử lý sự kiện IPC để biên dịch video
ipcMain.on('compile-video', (event, projectData, srtText, customOutputDir) => {
  const isDev = process.env.NODE_ENV === 'development';
  
  // Tạo thư mục tạm thời để biên dịch nếu chưa có
  const tempDir = path.join(app.getPath('userData'), 'sukatto-temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Ghi dữ liệu cấu hình dự án ra JSON và SRT ra file để Python đọc
  const configPath = path.join(tempDir, 'config.json');
  const srtPath = path.join(tempDir, 'subtitles.srt');

  fs.writeFileSync(configPath, JSON.stringify(projectData, null, 2), 'utf-8');
  fs.writeFileSync(srtPath, srtText, 'utf-8');

  // Xác định đường dẫn output video đích
  const outputDir = customOutputDir || tempDir;
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let runner;
  let args = [];

  // Đường dẫn đến file thực thi .exe của Python khi đóng gói
  const exePath = path.join(process.resourcesPath, 'videoCompiler.exe');
  const localExePath = path.join(__dirname, '../resources/videoCompiler.exe');
  
  if (!isDev && fs.existsSync(exePath)) {
    runner = exePath;
    args = [configPath, srtPath, outputDir];
  } else if (fs.existsSync(localExePath)) {
    runner = localExePath;
    args = [configPath, srtPath, outputDir];
  } else {
    // Chế độ phát triển: Chạy trực tiếp script python
    runner = 'python';
    const scriptPath = path.join(__dirname, '../backend/videoCompiler.py');
    args = [scriptPath, configPath, srtPath, outputDir];
  }

  event.reply('compile-log', `[System] Khởi chạy bộ biên dịch: ${runner}`);
  event.reply('compile-log', `[System] Tham số: ${args.slice(1).join(' ')}`);

  const child = spawn(runner, args);

  let stdoutBuffer = '';
  child.stdout.on('data', (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split(/\r?\n/);
    stdoutBuffer = lines.pop(); // Giữ lại phần chưa hoàn chỉnh ở cuối

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const progressMatch = trimmedLine.match(/^PROGRESS:\s*(\d+)$/i);
      if (progressMatch) {
        const percent = parseInt(progressMatch[1], 10);
        event.reply('compile-progress', percent);
      } else {
        event.reply('compile-log', trimmedLine);
      }
    }
  });

  let stderrBuffer = '';
  child.stderr.on('data', (data) => {
    stderrBuffer += data.toString();
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      event.reply('compile-log', `[Warning/Error] ${trimmedLine}`);
    }
  });

  child.on('close', (code) => {
    if (stdoutBuffer.trim()) {
      const trimmedLine = stdoutBuffer.trim();
      const progressMatch = trimmedLine.match(/^PROGRESS:\s*(\d+)$/i);
      if (progressMatch) {
        const percent = parseInt(progressMatch[1], 10);
        event.reply('compile-progress', percent);
      } else {
        event.reply('compile-log', trimmedLine);
      }
    }
    if (stderrBuffer.trim()) {
      event.reply('compile-log', `[Warning/Error] ${stderrBuffer.trim()}`);
    }
    event.reply('compile-finished', code, outputDir);
  });
});

// Xử lý sự kiện IPC để lấy dữ liệu kết xuất gần nhất
ipcMain.handle('get-last-compile-data', async () => {
  try {
    const tempDir = path.join(app.getPath('userData'), 'sukatto-temp');
    const configPath = path.join(tempDir, 'config.json');
    const srtPath = path.join(tempDir, 'subtitles.srt');
    
    let project = null;
    let srtText = "";
    
    if (fs.existsSync(configPath)) {
      project = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    if (fs.existsSync(srtPath)) {
      srtText = fs.readFileSync(srtPath, 'utf-8');
    }
    
    return { project, srtText };
  } catch (error) {
    console.error("Failed to get last compile data:", error);
    return null;
  }
});

// Xử lý sự kiện IPC để chọn thư mục lưu video
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) {
    return null;
  } else {
    const baseDir = result.filePaths[0];
    const subDirs = ['videos', 'bgm', 'voice', 'voices', 'images', 'intro', 'outro'];
    for (const subDir of subDirs) {
      const fullPath = path.join(baseDir, subDir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    return baseDir;
  }
});

function parseSRT(content) {
  if (!content) return [];
  const blocks = content.trim().split(/\r?\n\s*\r?\n/);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    if (lines.length < 2) return null;
    return {
      index: lines[0],
      time: lines[1],
      text: lines.slice(2).join(" ") || "",
    };
  }).filter((b) => b !== null && !!b.index && !!b.time);
}

function findAssetFile(filesList, stt) {
  const paddedStt = stt.toString().padStart(2, '0');
  const patterns = [
    new RegExp(`^shot_${stt}\\.`, 'i'),
    new RegExp(`^shot_${paddedStt}\\.`, 'i'),
    new RegExp(`^segment_${stt}\\.`, 'i'),
    new RegExp(`^segment_${paddedStt}\\.`, 'i'),
    new RegExp(`^${stt}\\.`, 'i'),
    new RegExp(`^${paddedStt}\\.`, 'i'),
  ];
  return filesList.some(file => patterns.some(pattern => pattern.test(file)));
}

ipcMain.handle('validate-assets', async (event, { project, srtText, projectPath, exportMode }) => {
  try {
    console.log("----------------------------------------");
    console.log("[Electron] validate-assets called!");
    console.log("[Electron] projectPath:", projectPath);
    console.log("[Electron] exportMode:", exportMode);
    
    if (!project || !projectPath) {
      return { error: "Thiếu dữ liệu dự án hoặc đường dẫn thư mục" };
    }

    const mode = exportMode || 'mixed';
    const srtBlocks = parseSRT(srtText || "");
    console.log("[Electron] Parsed srtBlocks count:", srtBlocks.length);
    if (srtBlocks.length > 0) {
      console.log("[Electron] First 5 block indices:", srtBlocks.slice(0, 5).map(b => b.index));
      console.log("[Electron] Last 5 block indices:", srtBlocks.slice(-5).map(b => b.index));
    }

    // 1. Voice check
    const voiceDir = path.join(projectPath, 'voice');
    let voiceFiles = [];
    try {
      const allFiles = fs.readdirSync(voiceDir);
      voiceFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
      });
    } catch (e) {}
    console.log("[Electron] Found voiceFiles count:", voiceFiles.length);

    const uniqueOrigIds = new Set();
    srtBlocks.forEach(b => {
      const idNum = parseInt(b.index, 10);
      const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
      uniqueOrigIds.add(origId);
    });
    const requiredVoiceCount = uniqueOrigIds.size;
    console.log("[Electron] uniqueOrigIds size (requiredVoiceCount):", requiredVoiceCount);
    console.log("[Electron] uniqueOrigIds members (first 20):", Array.from(uniqueOrigIds).slice(0, 20));
    
    let missingVoices = "";
    if (voiceFiles.length < requiredVoiceCount) {
      missingVoices = `Thiếu tệp âm thanh thuyết minh: Có ${voiceFiles.length}/${requiredVoiceCount} file`;
    }

    // 2. Scene check
    let imageFiles = [];
    let videoFiles = [];
    try {
      imageFiles = fs.readdirSync(path.join(projectPath, 'images'));
    } catch (e) {}
    try {
      videoFiles = fs.readdirSync(path.join(projectPath, 'videos'));
    } catch (e) {}

    const missingSceneList = [];
    for (let idx = 0; idx < project.shots.length; idx++) {
      const stt = idx + 1;
      let ok = false;
      if (mode === 'images_only') {
        ok = findAssetFile(imageFiles, stt);
      } else if (mode === 'videos_only') {
        ok = findAssetFile(videoFiles, stt);
      } else {
        ok = findAssetFile(videoFiles, stt) || findAssetFile(imageFiles, stt);
      }
      if (!ok) {
        missingSceneList.push(stt);
      }
    }

    let missingScenes = "";
    if (missingSceneList.length > 0) {
      const assetName = mode === 'images_only' ? 'ảnh' : mode === 'videos_only' ? 'video' : 'ảnh/video';
      missingScenes = `Thiếu ${assetName} cho phân cảnh STT: ${missingSceneList.join(', ')}`;
    }

    // 3. BGM check
    let missingBgm = "";
    const suggestions = project.bgmSuggestions || [];
    let bgmFiles = [];
    try {
      bgmFiles = fs.readdirSync(path.join(projectPath, 'bgm'));
    } catch (e) {}

    const missingBgmFiles = [];
    for (const sugg of suggestions) {
      if (sugg.audioFile && !bgmFiles.includes(sugg.audioFile)) {
        missingBgmFiles.push(sugg.audioFile);
      }
    }
    if (missingBgmFiles.length > 0) {
      missingBgm = `Thiếu nhạc nền BGM: Tệp nhạc "${missingBgmFiles.join(', ')}" không tồn tại cục bộ.`;
    }

    const success = !missingVoices && !missingScenes && !missingBgm;
    return {
      success,
      missingVoices,
      missingScenes,
      missingBgm
    };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('scan-bgm', async (event, projectPath) => {
  try {
    if (!projectPath) {
      return { error: "Missing projectPath" };
    }
    const bgmDir = path.join(projectPath, 'bgm');
    try {
      const files = fs.readdirSync(bgmDir);
      const audioFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
      });
      return { files: audioFiles };
    } catch (err) {
      if (err.code === 'ENOENT') {
        return { files: [] };
      }
      throw err;
    }
  } catch (error) {
    return { error: error.message };
  }
});

function getMacAddress() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const connection of networkInterface) {
      if (connection.mac && connection.mac !== '00:00:00:00:00:00' && !connection.internal) {
        return connection.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
}

ipcMain.handle('get-mac-address', () => {
  return getMacAddress();
});

ipcMain.handle('open-path', async (event, pathStr) => {
  try {
    if (fs.existsSync(pathStr)) {
      await shell.openPath(pathStr);
      return true;
    }
  } catch (err) {
    console.error("Failed to open path:", err);
  }
  return false;
});

ipcMain.handle('list-files-in-dir', async (event, dirPath) => {
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      return { success: true, files };
    }
    return { success: false, error: "Thư mục không tồn tại" };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-file', async (event, { projectPath, subDir, filename, dataBase64, textData }) => {
  try {
    if (!projectPath) {
      return { success: false, error: "Missing projectPath" };
    }
    
    // Determine target directory
    let targetDir = projectPath;
    if (subDir) {
      targetDir = path.join(projectPath, subDir);
    }
    
    // Create directory if not exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const targetPath = path.join(targetDir, filename);
    
    if (dataBase64) {
      // Write binary data from base64
      const buffer = Buffer.from(dataBase64, 'base64');
      fs.writeFileSync(targetPath, buffer);
    } else if (textData !== undefined) {
      // Write text data
      fs.writeFileSync(targetPath, textData, 'utf-8');
    } else {
      return { success: false, error: "No data provided to save" };
    }
    
    return { success: true, filePath: targetPath };
  } catch (error) {
    console.error("Failed to save file via IPC:", error);
    return { success: false, error: error.message };
  }
});


