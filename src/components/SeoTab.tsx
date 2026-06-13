import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, Sparkles, RotateCcw, Trash2, 
  AlertCircle, FileText, Check, Copy, Tags, Music 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const formatBgmTimeRange = (timeStr: string) => {
  if (!timeStr) return "";
  if (timeStr.includes("phút") || timeStr.includes("giây")) {
    return timeStr;
  }
  const parts = timeStr.split("-").map(p => p.trim());
  if (parts.length === 2) {
    const parsePart = (p: string) => {
      const cleanStr = p.split(/[.,]/)[0].trim();
      const subParts = cleanStr.split(":").map(Number);
      if (subParts.length === 2) {
        const [m, s] = subParts;
        if (!isNaN(m) && !isNaN(s)) {
          return `${m} phút ${s} giây`;
        }
      } else if (subParts.length === 3) {
        const [h, m, s] = subParts;
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
          if (h === 0) {
            return `${m} phút ${s} giây`;
          }
          return `${h} giờ ${m} phút ${s} giây`;
        }
      }
      return p;
    };
    return `Từ ${parsePart(parts[0])} đến ${parsePart(parts[1])}`;
  }
  return timeStr;
};

interface SeoTabProps {
  seoSection1: string;
  seoSection2: string;
  seoBgmPrompts: any[];
  seoSrtInput1: string;
  isGeneratingSeo1: boolean;
  seoError1: string | null;
  syncSrtToSeo1: () => void;
  setSeoSrtInput1: (value: string) => void;
  handleGenerateSEO: () => void;
  downloadSEOFile: () => Promise<void> | void;
  downloadBgmFile: () => Promise<void> | void;
}

export const SeoTab: React.FC<SeoTabProps> = ({
  seoSection1,
  seoSection2,
  seoBgmPrompts,
  seoSrtInput1,
  isGeneratingSeo1,
  seoError1,
  syncSrtToSeo1,
  setSeoSrtInput1,
  handleGenerateSEO,
  downloadSEOFile,
  downloadBgmFile
}) => {
  const [seoCopied1, setSeoCopied1] = useState(false);
  const [seoCopied2, setSeoCopied2] = useState(false);
  const [bgmCopiedStyleIndex, setBgmCopiedStyleIndex] = useState<number | null>(null);
  const [bgmCopiedPromptIndex, setBgmCopiedPromptIndex] = useState<number | null>(null);

  return (
    <motion.div
      key="seo"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-7xl mx-auto pb-32"
    >
      <div className="space-y-12">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-white/5 pb-8">
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">
              TỐI ƯU SEO & METADATA
            </h2>
            <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">
              Metadata Architect & Smart SEO Optimizer (Tiếng Nhật Chuẩn)
            </p>
          </div>
          <div className="flex items-center gap-4">
            {(seoSection1 || seoSection2) && (
              <button
                onClick={downloadSEOFile}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/20 rounded-xl font-bold uppercase tracking-wider text-[10px] text-white flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                Tải SEO.txt Về Máy
              </button>
            )}
            <div className="text-xs text-zinc-500 font-mono">
              SEO_ENGINE // ACTIVE
            </div>
          </div>
        </div>

        {/* SINGLE UNIFIED CARD: NHẬP DỮ LIỆU ĐẦU VÀO */}
        <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-violet-500" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Tạo Mô Tả & 10 Hashtags SEO Bằng AI</h3>
                <p className="text-[10px] font-mono text-zinc-400">Sinh đồng thời mô tả chuẩn SEO và 10 hashtags bằng Tiếng Nhật chuẩn</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={syncSrtToSeo1}
                title="Đồng bộ phụ đề từ Phân cảnh chính"
                className="px-3.5 py-1.5 bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-lg text-zinc-400 hover:text-indigo-400 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Đồng bộ phụ đề
              </button>
              <button
                onClick={() => setSeoSrtInput1("")}
                title="Xóa nội dung phụ đề"
                className="p-2 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 rounded-lg text-zinc-400 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block font-bold">Dữ Liệu Subtitles / SRT Đầu Vào</label>
            <textarea
              value={seoSrtInput1}
              onChange={(e) => setSeoSrtInput1(e.target.value)}
              placeholder="Dán phụ đề hoặc kịch bản ở đây..."
              className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 text-xs text-zinc-300 font-mono focus:outline-none focus:border-indigo-500/50 resize-y custom-scrollbar"
            />
          </div>

          <button
            onClick={handleGenerateSEO}
            disabled={isGeneratingSeo1}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-800 disabled:to-zinc-800 border border-indigo-500/20 rounded-xl font-bold uppercase tracking-wider text-[11px] text-white flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isGeneratingSeo1 ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang Tạo Mô Tả & Hashtags SEO Tiếng Nhật...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo Mô Tả & 10 Hashtags SEO Bằng AI (Tiếng Nhật Chuẩn)
              </>
            )}
          </button>

          {seoError1 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Lỗi tạo SEO:</span> {seoError1}
              </div>
            </div>
          )}
        </div>

        {/* TWO SIDE-BY-SIDE RESULT PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* RESULT 1: DESCRIPTION */}
          <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Mô Tả Video YouTube</h3>
                  <p className="text-[10px] font-mono text-zinc-400">Kết quả Mô tả bằng Tiếng Nhật chuẩn</p>
                </div>
              </div>
              
              {seoSection1 && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(seoSection1);
                    setSeoCopied1(true);
                    setTimeout(() => setSeoCopied1(false), 2000);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                    seoCopied1
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 text-zinc-300 hover:text-white"
                  )}
                >
                  {seoCopied1 ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      Đã Sao Chép
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Mô Tả
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="w-full min-h-[16rem] max-h-[30rem] overflow-y-auto bg-black/50 border border-white/5 rounded-xl p-5 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar selection:bg-indigo-500/30 selection:text-white">
              {seoSection1 || (
                <div className="text-zinc-500 italic text-center py-20">Chưa có kết quả mô tả</div>
              )}
            </div>
          </div>

          {/* RESULT 2: HASHTAGS */}
          <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Tags className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">10 Hashtags YouTube</h3>
                  <p className="text-[10px] font-mono text-zinc-400">Kết quả 10 Hashtags cách nhau bằng dấu phẩy</p>
                </div>
              </div>
              
              {seoSection2 && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(seoSection2);
                    setSeoCopied2(true);
                    setTimeout(() => setSeoCopied2(false), 2000);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all",
                    seoCopied2
                      ? "bg-green-500/10 border-green-500/30 text-green-400"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-violet-500/30 text-zinc-300 hover:text-white"
                  )}
                >
                  {seoCopied2 ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      Đã Sao Chép
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Hashtags
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="w-full min-h-[16rem] max-h-[30rem] overflow-y-auto bg-black/50 border border-white/5 rounded-xl p-5 text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed custom-scrollbar selection:bg-violet-500/30 selection:text-white">
              {seoSection2 || (
                <div className="text-zinc-500 italic text-center py-20">Chưa có kết quả hashtags</div>
              )}
            </div>
          </div>

        </div>

        {/* CARD 3: BGM MUSIC PROMPTS (SUNO/AI) */}
        {seoBgmPrompts && seoBgmPrompts.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden backdrop-blur-md shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Music className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Gợi Ý Nhạc Nền BGM Cho Từng Phân Cảnh (Suno/AI)</h3>
                  <p className="text-[10px] font-mono text-zinc-400">Tự động gợi ý Style & Prompts tạo nhạc cho Suno AI đồng bộ theo mốc thời gian phụ đề</p>
                </div>
              </div>

              <button
                onClick={downloadBgmFile}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-500/20 rounded-xl font-bold uppercase tracking-wider text-[10px] text-white flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                Tải BGM.txt Về Máy
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/40">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase font-mono tracking-widest text-zinc-400">
                    <th className="p-4 w-1/4">Thời Gian & Phân Cảnh</th>
                    <th className="p-4 w-1/6">Cảm Xúc</th>
                    <th className="p-4 w-1/4">Suno Style (Max 120 ký tự)</th>
                    <th className="p-4 w-1/3">Suno Music Prompt</th>
                  </tr>
                </thead>
                <tbody>
                  {seoBgmPrompts.map((item, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-all">
                      {/* Cột 1: Time & Scene */}
                      <td className="p-4 align-top space-y-2">
                        <div className="flex flex-col gap-1">
                          <div className="inline-block self-start px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono font-bold">
                            {item.time}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 font-semibold leading-relaxed">
                            ({formatBgmTimeRange(item.time)})
                          </div>
                        </div>
                        <div className="text-[11px] font-medium text-zinc-300 leading-normal">
                          {item.scene}
                        </div>
                      </td>

                      {/* Cột 2: Mood */}
                      <td className="p-4 align-top">
                        <span className={cn(
                          "inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border",
                          item.mood.toLowerCase().includes("căng thẳng") || item.mood.toLowerCase().includes("giận dữ")
                            ? "bg-red-500/10 border-red-500/20 text-red-400"
                            : item.mood.toLowerCase().includes("u uất") || item.mood.toLowerCase().includes("nhẫn nhục")
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : item.mood.toLowerCase().includes("sukatto") || item.mood.toLowerCase().includes("giải tỏa") || item.mood.toLowerCase().includes("đắc thắng")
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                        )}>
                          {item.mood}
                        </span>
                      </td>

                      {/* Cột 3: Suno Style */}
                      <td className="p-4 align-top space-y-2">
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[11px] text-zinc-300 leading-relaxed max-h-32 overflow-y-auto selection:bg-indigo-500/30 selection:text-white">
                          {item.suno_style}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.suno_style);
                              setBgmCopiedStyleIndex(idx);
                              setTimeout(() => setBgmCopiedStyleIndex(null), 2000);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                              bgmCopiedStyleIndex === idx
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 text-zinc-400 hover:text-white"
                            )}
                          >
                            {bgmCopiedStyleIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                Đã Copy Style
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Suno Style
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Cột 4: Suno Prompt */}
                      <td className="p-4 align-top space-y-2">
                        <div className="p-3 bg-black/40 border border-white/5 rounded-xl font-mono text-[11px] text-zinc-300 leading-relaxed max-h-32 overflow-y-auto selection:bg-indigo-500/30 selection:text-white">
                          {item.suno_prompt}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.suno_prompt);
                              setBgmCopiedPromptIndex(idx);
                              setTimeout(() => setBgmCopiedPromptIndex(null), 2000);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer",
                              bgmCopiedPromptIndex === idx
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/30 text-zinc-400 hover:text-white"
                            )}
                          >
                            {bgmCopiedPromptIndex === idx ? (
                              <>
                                <Check className="w-3 h-3 text-green-400" />
                                Đã Copy Prompt
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Suno Prompt
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </motion.div>
  );
};
