export const dynamic = "force-static";
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

interface SRTBlock {
  index: string;
  time: string;
  text: string;
}

function parseSRT(content: string): SRTBlock[] {
  const blocks = content.trim().split(/\r?\n\s*\r?\n/);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    if (lines.length < 2) return null;
    return {
      index: lines[0],
      time: lines[1],
      text: lines.slice(2).join(" ") || "",
    };
  }).filter((b): b is SRTBlock => b !== null && !!b.index && !!b.time);
}

function findAssetFile(filesList: string[], stt: number): boolean {
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

export async function POST(request: Request) {
  try {
    const { project, srtText, projectPath, exportMode, style } = await request.json();

    if (!project || !projectPath) {
      return NextResponse.json({ error: "Thiếu dữ liệu dự án hoặc đường dẫn thư mục" }, { status: 400 });
    }

    if (style) {
      project.style = style;
    }

    const mode = exportMode || 'mixed';
    project.exportMode = mode;

    // 1. Validate Voice files
    const srtBlocks = parseSRT(srtText || "");
    const voiceDir = path.join(projectPath, 'voice');
    let voiceCount = 0;
    try {
      const voiceFiles = await fs.readdir(voiceDir);
      const audioFiles = voiceFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
      });
      voiceCount = audioFiles.length;
    } catch (e) {
      // voice folder doesn't exist
      voiceCount = 0;
    }

    const uniqueOrigIds = new Set<number>();
    srtBlocks.forEach(b => {
      const idNum = parseInt(b.index, 10);
      const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
      uniqueOrigIds.add(origId);
    });
    const requiredVoiceCount = uniqueOrigIds.size;

    if (voiceCount < requiredVoiceCount) {
      return NextResponse.json({
        error: `Thiếu tệp âm thanh thuyết minh: Có ${voiceCount}/${requiredVoiceCount} file`
      }, { status: 400 });
    }

    // 2. Validate Scene Assets (images/videos)
    let imageFiles: string[] = [];
    let videoFiles: string[] = [];
    try {
      imageFiles = await fs.readdir(path.join(projectPath, 'images'));
    } catch (e) {}
    try {
      videoFiles = await fs.readdir(path.join(projectPath, 'videos'));
    } catch (e) {}

    for (let idx = 0; idx < project.shots.length; idx++) {
      const stt = idx + 1;
      let hasAsset = false;

      if (mode === 'images_only') {
        hasAsset = findAssetFile(imageFiles, stt);
      } else if (mode === 'videos_only') {
        hasAsset = findAssetFile(videoFiles, stt);
      } else {
        // mixed
        hasAsset = findAssetFile(videoFiles, stt) || findAssetFile(imageFiles, stt);
      }

      if (!hasAsset) {
        return NextResponse.json({
          error: `Thiếu tài nguyên phân cảnh: Cảnh ${stt} thiếu file ảnh/video tương ứng.`
        }, { status: 400 });
      }
    }

    // 3. Validate BGM files
    const bgmSuggestions = project.bgmSuggestions || [];
    for (const sugg of bgmSuggestions) {
      const audioFile = sugg.audioFile;
      if (audioFile) {
        const bgmPath = path.join(projectPath, 'bgm', audioFile);
        if (!existsSync(bgmPath)) {
          return NextResponse.json({
            error: `Thiếu nhạc nền BGM: Tệp nhạc "${audioFile}" không tồn tại cục bộ.`
          }, { status: 400 });
        }
      }
    }

    // 4. Trigger videoCompiler.py
    const tempDir = path.join(os.tmpdir(), 'sukatto-temp');
    await fs.mkdir(tempDir, { recursive: true });

    const configPath = path.join(tempDir, 'config.json');
    const srtPath = path.join(tempDir, 'subtitles.srt');
    const logPath = path.join(tempDir, 'compile.log');

    await fs.writeFile(configPath, JSON.stringify(project, null, 2), 'utf-8');
    await fs.writeFile(srtPath, srtText || "", 'utf-8');
    await fs.writeFile(logPath, `[System] Bắt đầu biên dịch video tại ${new Date().toLocaleTimeString()}\n`, 'utf-8');

    // Find script path
    const scriptPath = path.join(process.cwd(), 'backend', 'videoCompiler.py');

    const logStream = createWriteStream(logPath, { flags: 'a' });
    
    // Spawn python compiler process
    const child = spawn('python', [scriptPath, configPath, srtPath, projectPath]);

    child.stdout.on('data', (data) => {
      logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      logStream.write(`[Error/Warning] ${data}`);
    });

    child.on('close', (code) => {
      logStream.write(`\n[System] Tiến trình kết thúc với mã lỗi: ${code}\n`);
      logStream.end();
    });

    return NextResponse.json({
      success: true,
      message: "Tất cả dữ liệu hợp lệ. Bắt đầu tiến trình kết xuất video trong nền.",
      logPath
    });
  } catch (error: any) {
    console.error("Error in export route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
