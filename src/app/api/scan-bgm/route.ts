export const dynamic = "force-static";
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { projectPath } = await request.json();
    if (!projectPath) {
      return NextResponse.json({ error: "Missing projectPath" }, { status: 400 });
    }

    const bgmDir = path.join(projectPath, 'bgm');
    try {
      const files = await fs.readdir(bgmDir);
      // Filter for audio files
      const audioFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext);
      });
      return NextResponse.json({ files: audioFiles });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return NextResponse.json({ files: [] });
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Error in scan-bgm route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
