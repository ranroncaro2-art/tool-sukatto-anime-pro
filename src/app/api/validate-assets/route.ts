import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

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
    const { project, srtText, projectPath, exportMode } = await request.json();

    if (!project || !projectPath) {
      return NextResponse.json({ error: "Thiếu dữ liệu dự án hoặc đường dẫn thư mục" }, { status: 400 });
    }

    const mode = exportMode || 'mixed';
    const srtBlocks = parseSRT(srtText || "");

    // 1. Voice check
    const voiceDir = path.join(projectPath, 'voice');
    let voiceFiles: string[] = [];
    try {
      const allFiles = await fs.readdir(voiceDir);
      voiceFiles = allFiles.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
      });
    } catch (e) {}

    const uniqueOrigIds = new Set<number>();
    srtBlocks.forEach(b => {
      const idNum = parseInt(b.index, 10);
      const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
      uniqueOrigIds.add(origId);
    });
    const requiredVoiceCount = uniqueOrigIds.size;
    let missingVoices = "";
    if (voiceFiles.length < requiredVoiceCount) {
      missingVoices = `Thiếu tệp âm thanh thuyết minh: Có ${voiceFiles.length}/${requiredVoiceCount} file`;
    }

    // 2. Scene check
    let imageFiles: string[] = [];
    let videoFiles: string[] = [];
    try {
      imageFiles = await fs.readdir(path.join(projectPath, 'images'));
    } catch (e) {}
    try {
      videoFiles = await fs.readdir(path.join(projectPath, 'videos'));
    } catch (e) {}

    const missingSceneList: number[] = [];
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
    let bgmFiles: string[] = [];
    try {
      bgmFiles = await fs.readdir(path.join(projectPath, 'bgm'));
    } catch (e) {}

    const missingBgmFiles: string[] = [];
    for (const sugg of suggestions) {
      if (sugg.audioFile && !bgmFiles.includes(sugg.audioFile)) {
        missingBgmFiles.push(sugg.audioFile);
      }
    }
    if (missingBgmFiles.length > 0) {
      missingBgm = `Thiếu nhạc nền BGM: Tệp nhạc "${missingBgmFiles.join(', ')}" không tồn tại cục bộ.`;
    }

    const success = !missingVoices && !missingScenes && !missingBgm;
    return NextResponse.json({
      success,
      missingVoices,
      missingScenes,
      missingBgm
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
