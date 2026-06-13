export const dynamic = "force-static";
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export async function GET() {
  try {
    const logPath = path.join(os.tmpdir(), 'sukatto-temp', 'compile.log');
    try {
      const logsContent = await fs.readFile(logPath, 'utf-8');
      const logsArray = logsContent.split('\n').filter(line => line.trim() !== "");
      return NextResponse.json({ success: true, logs: logsArray });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return NextResponse.json({ success: true, logs: [] });
      }
      throw err;
    }
  } catch (error: any) {
    console.error("Error in logs route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
