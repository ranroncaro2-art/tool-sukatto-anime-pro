import React from "react";
import {
  Sparkles, RotateCcw, Cpu, Settings, Eye, Terminal, User,
  Plus, X, FileText, ZoomIn, Download, ImageIcon, Trash2
} from "lucide-react";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ART_PRESETS = [
  {
    id: "modern_manga",
    label: "Modern Dramatic Manga (Hiện đại - Mặc định)",
    tags: [
      "Japanese manga YouTube thumbnail aesthetic",
      "modern detailed manga illustration",
      "saturated dramatic colors",
      "high contrast speed lines",
      "professional comic art style",
      "dynamic expressive character shading",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  },
  {
    id: "retro_90s",
    label: "Classic Retro Manga (90s Retro)",
    tags: [
      "90s retro anime aesthetic",
      "hand-drawn cel shading",
      "grainy ink lines",
      "vintage manga cover art",
      "subtle vintage color grading",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk Webtoon (Giả tưởng Cyberpunk)",
    tags: [
      "neon saturated webtoon style",
      "glowing cyberpunk aesthetics",
      "sharp digital cel shading",
      "futuristic tech overlays",
      "intense cyan and magenta lighting",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  },
  {
    id: "dark_thriller",
    label: "Dark Gritty Thriller (Kinh dị đen tối)",
    tags: [
      "gritty noir manga illustration",
      "harsh chiaroscuro shadows",
      "desaturated moody color palette",
      "rough ink textures",
      "oppressive psychological drama atmosphere",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  },
  {
    id: "vibrant_shonen",
    label: "Vibrant Shonen Action (Hành động Shonen)",
    tags: [
      "dynamic shonen battle manga style",
      "vibrant explosion colors",
      "extreme action motion blur lines",
      "bold thick ink outlines",
      "heroic high-energy shading",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  },
  {
    id: "seinen_masterpiece",
    label: "Seinen Masterpiece (Siêu phẩm Seinen Điện ảnh)",
    tags: [
      "High-contrast cinematic lighting",
      "anime style",
      "seinen manga aesthetic",
      "8k resolution",
      "masterpiece",
      "ultra mobile readable",
      "split-screen contrast",
      "high CTR Sukatto thumbnail"
    ]
  }
];

export interface ThumbnailTabProps {
  thumbStoryInput: string;
  setThumbStoryInput: (val: string) => void;
  thumbTitlesInput: string;
  setThumbTitlesInput: (val: string) => void;
  selectedVersionIndex: number;
  setSelectedVersionIndex: (val: number) => void;
  thumbStyle: any;
  setThumbStyle: (val: any) => void;
  thumbData: any;
  setThumbData: (val: any) => void;
  thumbMasterPrompt: string;
  setThumbMasterPrompt: (val: string) => void;
  thumbImageUrl: string;
  setThumbImageUrl: (val: string) => void;
  isAnalyzingThumb: boolean;
  isGeneratingThumbImage: boolean;
  thumbJsonError: string | null;
  rawStyleJsonText: string;
  setRawStyleJsonText: (val: string) => void;
  styleEditorTab: 'visual' | 'json';
  setStyleEditorTab: (val: 'visual' | 'json') => void;
  scriptText: string;
  isImageGenerating: boolean;
  isGenerating: boolean;
  cleanApiUrl: string;
  project: any;
  analyzeThumbnailStory: () => Promise<void>;
  generateThumbnailImage: () => Promise<void>;
  handleBeforeSideChange: (side: 'left' | 'right') => void;
  updateStyleField: (path: string[], value: any) => void;
  downloadThumbnail: () => Promise<void>;
  setZoomedImageUrl: (val: string | null) => void;
  setZoomedImageName: (val: string | null) => void;
}

export const ThumbnailTab: React.FC<ThumbnailTabProps> = ({
  thumbStoryInput,
  setThumbStoryInput,
  thumbTitlesInput,
  setThumbTitlesInput,
  selectedVersionIndex,
  setSelectedVersionIndex,
  thumbStyle,
  setThumbStyle,
  thumbData,
  setThumbData,
  thumbMasterPrompt,
  setThumbMasterPrompt,
  thumbImageUrl,
  setThumbImageUrl,
  isAnalyzingThumb,
  isGeneratingThumbImage,
  thumbJsonError,
  rawStyleJsonText,
  setRawStyleJsonText,
  styleEditorTab,
  setStyleEditorTab,
  scriptText,
  isImageGenerating,
  isGenerating,
  cleanApiUrl,
  project,
  analyzeThumbnailStory,
  generateThumbnailImage,
  handleBeforeSideChange,
  updateStyleField,
  downloadThumbnail,
  setZoomedImageUrl,
  setZoomedImageName,
}) => {
  return (
    <motion.div
      key="thumb"
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
              THUMBNAIL LABS
            </h2>
            <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">
              CTR Architecture & Visual DNA System
            </p>
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            LAYER_COMPOSER // ACTIVE
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: LEFT SIDE (INPUTS & STYLE DNA) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. STORY SCRIPT INPUT CARD */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Story Input (Screenplay/Climax)
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (scriptText.trim()) {
                      setThumbStoryInput(scriptText);
                      alert("Đã đồng bộ kịch bản từ tab chính.");
                    } else {
                      alert("Không tìm thấy kịch bản ở phần chính. Vui lòng dán kịch bản thủ công.");
                    }
                  }}
                  className="px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[8px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Lấy từ Kịch bản
                </button>
              </div>
              
              <div className="relative group">
                <textarea
                  value={thumbStoryInput}
                  onChange={(e) => setThumbStoryInput(e.target.value)}
                  placeholder="Nhập kịch bản phân cảnh hoặc câu chuyện kịch tính ở đây..."
                  rows={8}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-4 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all resize-none custom-scrollbar"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest block">
                  3 Tựa Phim YouTube Tiếng Nhật (Mỗi tựa một dòng)
                </label>
                <textarea
                  value={thumbTitlesInput}
                  onChange={(e) => setThumbTitlesInput(e.target.value)}
                  placeholder="Ví dụ:&#10;不倫とモラハラを暴かれ借金地獄 của夫が会社解任＆無&#10;見下していた元妻は大企業CEOだった！&#10;無能と嘘をつかれ追い出された私は伝説の職人でした"
                  rows={3}
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-3 text-xs font-mono text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all resize-none custom-scrollbar"
                />
              </div>
              
              <button
                onClick={analyzeThumbnailStory}
                disabled={isAnalyzingThumb || !thumbStoryInput.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/10"
              >
                {isAnalyzingThumb ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-white" />
                    ĐANG PHÂN TÍCH DRAMA...
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    PHÂN TÍCH DRAMA (GEMINI)
                  </>
                )}
              </button>
              
              {thumbJsonError && (
                <div className="p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 leading-normal">
                  ⚠️ Lỗi phân tích: {thumbJsonError}
                </div>
              )}
            </div>

            {/* 2. LAYER 1: GLOBAL STYLE SETTINGS */}
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Layer 1 — Global Style DNA
                  </span>
                </div>
                
                {/* Tab Selection */}
                <div className="flex bg-black/40 border border-white/10 rounded-lg p-0.5">
                  <button
                    onClick={() => setStyleEditorTab('visual')}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all duration-200",
                      styleEditorTab === 'visual'
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Eye className="w-3 h-3" />
                    Trực quan
                  </button>
                  <button
                    onClick={() => setStyleEditorTab('json')}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all duration-200",
                      styleEditorTab === 'json'
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Terminal className="w-3 h-3" />
                    Mã JSON
                  </button>
                </div>
              </div>

              {styleEditorTab === 'visual' ? (
                <div className="space-y-5 text-left">
                  {/* 0. Phong cách nghệ thuật (Art Style Preset) */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1">
                      <span>Phong cách vẽ Thumbnail (Art Style)</span>
                    </h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Chọn phong cách nghệ thuật</label>
                      <select
                        value={thumbStyle.artPreset || "modern_manga"}
                        onChange={(e) => {
                          const presetId = e.target.value;
                          const preset = ART_PRESETS.find(p => p.id === presetId);
                          if (preset) {
                            setThumbStyle((prev: any) => ({
                              ...prev,
                              artPreset: presetId,
                              globalStyleLock: [...preset.tags]
                            }));
                          }
                        }}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 font-medium outline-none focus:border-indigo-500/50 cursor-pointer"
                      >
                        {ART_PRESETS.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                      <span className="text-[8px] text-zinc-500 block leading-normal pt-1">
                        * Lựa chọn phong cách vẽ sẽ tự động đồng bộ hóa danh sách các từ khóa thẩm mỹ chính (Style Tags) ở phía dưới.
                      </span>
                    </div>
                  </div>

                  {/* 1. Bố cục (Layout) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-1 flex items-center gap-1">
                      <span>Bố cục & Khung hình</span>
                    </h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase block">Biến thể bố cục (Layout Variant)</label>
                        <select
                          value={thumbStyle.layout?.variant || "split_center_panel"}
                          onChange={(e) => updateStyleField(['layout', 'variant'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 font-medium outline-none focus:border-indigo-500/50 cursor-pointer"
                        >
                          <option value="split_center_panel">Bố cục chia đôi + Bảng chữ ở GIỮA (Center Hook)</option>
                          <option value="split_corner_panels">Bố cục chia đôi + Bảng chữ ở 2 GÓC (Corner Hooks)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase block">Vị trí BEFORE (Trước)</label>
                          <select
                            value={thumbStyle.layout?.beforeSide || "right"}
                            onChange={(e) => handleBeforeSideChange(e.target.value as 'left' | 'right')}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 font-medium outline-none focus:border-indigo-500/50"
                          >
                            <option value="right">Bên Phải (Khuyên dùng)</option>
                            <option value="left">Bên Trái</option>
                          </select>
                        </div>
                        {thumbStyle.layout?.variant !== "split_corner_panels" && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase block">Bảng chữ ở giữa</label>
                            <select
                              value={thumbStyle.layout?.centerPanelWidth || "15%"}
                              onChange={(e) => updateStyleField(['layout', 'centerPanelWidth'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-200 font-medium outline-none focus:border-indigo-500/50"
                            >
                              <option value="10%">10% (Rất hẹp)</option>
                              <option value="15%">15% (Cân đối nhất)</option>
                              <option value="20%">20% (Nổi bật chữ)</option>
                              <option value="25%">25% (Rộng)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Tông màu & Ánh sáng (BEFORE & AFTER) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider border-b border-white/5 pb-1">
                      Tông màu & Ánh sáng
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BEFORE - Right */}
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 space-y-3">
                        <span className="text-[9px] font-extrabold text-amber-400 uppercase block tracking-wider">
                          BÊN TRƯỚC (BEFORE)
                        </span>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase">Ánh sáng (Lighting)</label>
                            <input
                              type="text"
                              value={thumbStyle.colorStyle?.beforeTone?.lighting || ""}
                              onChange={(e) => updateStyleField(['colorStyle', 'beforeTone', 'lighting'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-amber-500/50 font-medium"
                              placeholder="e.g. dark orange shadows"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase">Tâm trạng (Mood)</label>
                            <input
                              type="text"
                              value={thumbStyle.colorStyle?.beforeTone?.mood || ""}
                              onChange={(e) => updateStyleField(['colorStyle', 'beforeTone', 'mood'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-amber-500/50 font-medium"
                              placeholder="e.g. oppressive warm tone"
                            />
                          </div>
                        </div>
                      </div>

                      {/* AFTER - Left */}
                      <div className="bg-sky-500/5 border border-sky-500/10 rounded-xl p-3 space-y-3">
                        <span className="text-[9px] font-extrabold text-sky-400 uppercase block tracking-wider">
                          BÊN SAU (AFTER)
                        </span>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase">Ánh sáng (Lighting)</label>
                            <input
                              type="text"
                              value={thumbStyle.colorStyle?.afterTone?.lighting || ""}
                              onChange={(e) => updateStyleField(['colorStyle', 'afterTone', 'lighting'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-sky-500/50 font-medium"
                              placeholder="e.g. cold white corporate lighting"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-400 uppercase">Tâm trạng (Mood)</label>
                            <input
                              type="text"
                              value={thumbStyle.colorStyle?.afterTone?.mood || ""}
                              onChange={(e) => updateStyleField(['colorStyle', 'afterTone', 'mood'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-sky-500/50 font-medium"
                              placeholder="e.g. victorious cool tone"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Bảng chữ ở giữa & Chữ viết (Center Panel / Corner Panels Styling) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider border-b border-white/5 pb-1">
                      {thumbStyle.layout?.variant === "split_corner_panels" ? "Bảng Chữ Ở 2 Góc" : "Bảng Chữ Dọc Ở Giữa"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase">
                          {thumbStyle.layout?.variant === "split_corner_panels" ? "Nền bảng chữ Góc trên-phải (Bg)" : "Nền bảng (Background Style)"}
                        </label>
                        <input
                          type="text"
                          value={thumbStyle.centerPanel?.background || ""}
                          onChange={(e) => updateStyleField(['centerPanel', 'background'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-red-500/50 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase">Chữ chính (Main Text Color)</label>
                        <input
                          type="text"
                          value={thumbStyle.centerPanel?.mainTextColor || ""}
                          onChange={(e) => updateStyleField(['centerPanel', 'mainTextColor'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-red-500/50 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase">Từ khóa nổi bật (Highlight Color)</label>
                        <input
                          type="text"
                          value={thumbStyle.centerPanel?.highlightColor || ""}
                          onChange={(e) => updateStyleField(['centerPanel', 'highlightColor'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-red-500/50 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase">Viền chữ (Outline)</label>
                        <input
                          type="text"
                          value={thumbStyle.centerPanel?.outline || ""}
                          onChange={(e) => updateStyleField(['centerPanel', 'outline'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-red-500/50 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-zinc-400 uppercase">Hiệu ứng (Typography Effect)</label>
                        <input
                          type="text"
                          value={thumbStyle.centerPanel?.effect || ""}
                          onChange={(e) => updateStyleField(['centerPanel', 'effect'], e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-red-500/50 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Bong bóng thoại (Speech Bubbles) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider border-b border-white/5 pb-1">
                      Bong Bóng Thoại
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Villain Bubble */}
                      <div className="bg-zinc-850/60 border border-white/5 rounded-xl p-3 space-y-2">
                        <span className="text-[8px] font-extrabold text-red-400 uppercase block tracking-wider font-mono">
                          BONG BÓNG PHẢN DIỆN (BEFORE)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nền (Bg)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainBubble?.background || ""}
                              onChange={(e) => updateStyleField(['villainBubble', 'background'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Viền (Border)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainBubble?.border || ""}
                              onChange={(e) => updateStyleField(['villainBubble', 'border'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Chữ (Color)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainBubble?.textColor || ""}
                              onChange={(e) => updateStyleField(['villainBubble', 'textColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nổi bật (Highlight)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainBubble?.highlightColor || ""}
                              onChange={(e) => updateStyleField(['villainBubble', 'highlightColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kiểu bong bóng</label>
                            <select
                              value={thumbStyle.villainBubble?.shape || "smooth_round"}
                              onChange={(e) => updateStyleField(['villainBubble', 'shape'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            >
                              <option value="smooth_round" className="bg-zinc-900">Tròn mềm mại</option>
                              <option value="thought_cloud" className="bg-zinc-900">Suy nghĩ đám mây</option>
                              <option value="jagged_anger" className="bg-zinc-900">Phẫn nộ gai nhọn</option>
                              <option value="spiky_explosion" className="bg-zinc-900">Nổ tung bất ngờ</option>
                              <option value="shaky_spine" className="bg-zinc-900">Rung giật shock</option>
                              <option value="rectangular_box" className="bg-zinc-900">Hộp chữ nhật manga</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kích cỡ</label>
                            <select
                              value={thumbStyle.villainBubble?.size || "medium"}
                              onChange={(e) => updateStyleField(['villainBubble', 'size'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            >
                              <option value="small" className="bg-zinc-900">Nhỏ gọn</option>
                              <option value="medium" className="bg-zinc-900">Cân đối</option>
                              <option value="large" className="bg-zinc-900">Lớn nổi bật</option>
                              <option value="massive" className="bg-zinc-900">Khổng lồ kịch tính</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Hero Response Bubble */}
                      <div className="bg-zinc-850/60 border border-white/5 rounded-xl p-3 space-y-2">
                        <span className="text-[8px] font-extrabold text-blue-400 uppercase block tracking-wider font-mono">
                          BONG BÓNG PHẢN HỒI CHÍNH DIỆN (BEFORE)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nền (Bg)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroResponseBubble?.background || ""}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'background'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Viền (Border)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroResponseBubble?.border || ""}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'border'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Chữ (Color)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroResponseBubble?.textColor || ""}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'textColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nổi bật (Highlight)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroResponseBubble?.highlightColor || ""}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'highlightColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kiểu bong bóng</label>
                            <select
                              value={thumbStyle.heroResponseBubble?.shape || "smooth_round"}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'shape'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            >
                              <option value="smooth_round" className="bg-zinc-900">Tròn mềm mại</option>
                              <option value="thought_cloud" className="bg-zinc-900">Suy nghĩ đám mây</option>
                              <option value="jagged_anger" className="bg-zinc-900">Phẫn nộ gai nhọn</option>
                              <option value="spiky_explosion" className="bg-zinc-900">Nổ tung bất ngờ</option>
                              <option value="shaky_spine" className="bg-zinc-900">Rung giật shock</option>
                              <option value="rectangular_box" className="bg-zinc-900">Hộp chữ nhật manga</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kích cỡ</label>
                            <select
                              value={thumbStyle.heroResponseBubble?.size || "medium"}
                              onChange={(e) => updateStyleField(['heroResponseBubble', 'size'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                            >
                              <option value="small" className="bg-zinc-900">Nhỏ gọn</option>
                              <option value="medium" className="bg-zinc-900">Cân đối</option>
                              <option value="large" className="bg-zinc-900">Lớn nổi bật</option>
                              <option value="massive" className="bg-zinc-900">Khổng lồ kịch tính</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Hero Bubble */}
                      <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 space-y-2">
                        <span className="text-[8px] font-extrabold text-yellow-400 uppercase block tracking-wider font-mono">
                          BONG BÓNG CHÍNH DIỆN (AFTER)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nền (Bg)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroBubble?.background || ""}
                              onChange={(e) => updateStyleField(['heroBubble', 'background'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Viền (Border)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroBubble?.border || ""}
                              onChange={(e) => updateStyleField(['heroBubble', 'border'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Chữ (Color)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroBubble?.textColor || ""}
                              onChange={(e) => updateStyleField(['heroBubble', 'textColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nổi bật (Highlight)</label>
                            <input
                              type="text"
                              value={thumbStyle.heroBubble?.highlightColor || ""}
                              onChange={(e) => updateStyleField(['heroBubble', 'highlightColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kiểu bong bóng</label>
                            <select
                              value={thumbStyle.heroBubble?.shape || "smooth_round"}
                              onChange={(e) => updateStyleField(['heroBubble', 'shape'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            >
                              <option value="smooth_round" className="bg-zinc-900">Tròn mềm mại</option>
                              <option value="thought_cloud" className="bg-zinc-900">Suy nghĩ đám mây</option>
                              <option value="jagged_anger" className="bg-zinc-900">Phẫn nộ gai nhọn</option>
                              <option value="spiky_explosion" className="bg-zinc-900">Nổ tung bất ngờ</option>
                              <option value="shaky_spine" className="bg-zinc-900">Rung giật shock</option>
                              <option value="rectangular_box" className="bg-zinc-900">Hộp chữ nhật manga</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kích cỡ</label>
                            <select
                              value={thumbStyle.heroBubble?.size || "medium"}
                              onChange={(e) => updateStyleField(['heroBubble', 'size'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-yellow-500/50 font-medium"
                            >
                              <option value="small" className="bg-zinc-900">Nhỏ gọn</option>
                              <option value="medium" className="bg-zinc-900">Cân đối</option>
                              <option value="large" className="bg-zinc-900">Lớn nổi bật</option>
                              <option value="massive" className="bg-zinc-900">Khổng lồ kịch tính</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Villain Reaction Bubble */}
                      <div className="bg-zinc-850/60 border border-white/5 rounded-xl p-3 space-y-2">
                        <span className="text-[8px] font-extrabold text-rose-400 uppercase block tracking-wider font-mono">
                          BONG BÓNG PHẢN ỨNG PHẢN DIỆN (AFTER)
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nền (Bg)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainReactionBubble?.background || ""}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'background'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Viền (Border)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainReactionBubble?.border || ""}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'border'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Chữ (Color)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainReactionBubble?.textColor || ""}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'textColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Nổi bật (Highlight)</label>
                            <input
                              type="text"
                              value={thumbStyle.villainReactionBubble?.highlightColor || ""}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'highlightColor'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kiểu bong bóng</label>
                            <select
                              value={thumbStyle.villainReactionBubble?.shape || "smooth_round"}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'shape'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            >
                              <option value="smooth_round" className="bg-zinc-900">Tròn mềm mại</option>
                              <option value="thought_cloud" className="bg-zinc-900">Suy nghĩ đám mây</option>
                              <option value="jagged_anger" className="bg-zinc-900">Phẫn nộ gai nhọn</option>
                              <option value="spiky_explosion" className="bg-zinc-900">Nổ tung bất ngờ</option>
                              <option value="shaky_spine" className="bg-zinc-900">Rung giật shock</option>
                              <option value="rectangular_box" className="bg-zinc-900">Hộp chữ nhật manga</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-zinc-500 uppercase">Kích cỡ</label>
                            <select
                              value={thumbStyle.villainReactionBubble?.size || "medium"}
                              onChange={(e) => updateStyleField(['villainReactionBubble', 'size'], e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 outline-none focus:border-rose-500/50 font-medium"
                            >
                              <option value="small" className="bg-zinc-900">Nhỏ gọn</option>
                              <option value="medium" className="bg-zinc-900">Cân đối</option>
                              <option value="large" className="bg-zinc-900">Lớn nổi bật</option>
                              <option value="massive" className="bg-zinc-900">Khổng lồ kịch tính</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Thẩm mỹ chung (Global Suffix tags) */}
                  <div className="space-y-3 pt-1">
                    <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider border-b border-white/5 pb-1">
                      Từ khóa Thẩm Mỹ Toàn Cục (Global Suffix Tags)
                    </h4>
                    <div className="space-y-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(thumbStyle.globalStyleLock) && thumbStyle.globalStyleLock.map((tag: string, tagIdx: number) => (
                          <span
                            key={tagIdx}
                            className="inline-flex items-center gap-1 bg-black/40 text-indigo-300 border border-white/10 rounded-md px-2 py-0.5 text-[9px] font-bold hover:border-red-500/30 hover:text-red-400 group transition-all"
                          >
                            {tag}
                            <button
                              onClick={() => {
                                const updatedTags = thumbStyle.globalStyleLock.filter((_: any, idx: number) => idx !== tagIdx);
                                updateStyleField(['globalStyleLock'], updatedTags);
                              }}
                              className="text-zinc-500 group-hover:text-red-400 transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        {(!Array.isArray(thumbStyle.globalStyleLock) || thumbStyle.globalStyleLock.length === 0) && (
                          <span className="text-[9px] text-zinc-500 font-semibold italic">Chưa có tag nào</span>
                        )}
                      </div>
                      
                      {/* Add new tag inline */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="newStyleTagInput"
                          placeholder="Thêm từ khóa mới..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              const val = input.value.trim();
                              if (val) {
                                const currentTags = Array.isArray(thumbStyle.globalStyleLock) ? thumbStyle.globalStyleLock : [];
                                if (!currentTags.includes(val)) {
                                  updateStyleField(['globalStyleLock'], [...currentTags, val]);
                                }
                                input.value = "";
                              }
                            }
                          }}
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-200 outline-none focus:border-indigo-500/50 font-medium"
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById('newStyleTagInput') as HTMLInputElement;
                            if (input) {
                              const val = input.value.trim();
                              if (val) {
                                const currentTags = Array.isArray(thumbStyle.globalStyleLock) ? thumbStyle.globalStyleLock : [];
                                if (!currentTags.includes(val)) {
                                  updateStyleField(['globalStyleLock'], [...currentTags, val]);
                                }
                                input.value = "";
                              }
                            }
                          }}
                          className="flex items-center justify-center p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 text-[10px] font-bold"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Raw JSON input to let user customize or view style set */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                        Raw Style Config (JSON format)
                      </label>
                      <button
                        onClick={() => {
                          try {
                            const parsed = JSON.parse(rawStyleJsonText);
                            setThumbStyle(parsed);
                            alert("Đã cập nhật cấu hình visual style thành công!");
                          } catch (e) {
                            alert("Lỗi cú pháp JSON. Vui lòng kiểm tra dấu phẩy hoặc ngoặc.");
                          }
                        }}
                        className="text-[8px] font-extrabold uppercase text-emerald-400 hover:text-white"
                      >
                        Apply changes
                      </button>
                    </div>
                    <textarea
                      value={rawStyleJsonText}
                      onChange={(e) => setRawStyleJsonText(e.target.value)}
                      rows={22}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-[10px] font-mono text-indigo-300 outline-none focus:border-indigo-500/50 resize-y custom-scrollbar"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 2: RIGHT SIDE (GEMINI OUTPUT & PROMPT COMPOSER & IMAGE PREVIEW) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* LAYER 2: EXTRACTED STORY DATA */}
            {thumbData ? (
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Layer 2 — Gemini Story Analyzer (Director)
                    </span>
                  </div>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/25">
                    Semantic Data Extracted
                  </span>
                </div>

                {(() => {
                  const versions = thumbData.versions || [];
                  const activeVersion = versions[selectedVersionIndex] || thumbData || {};

                  // Helper to update a field in the active version of thumbData
                  const updateActiveVersionField = (fieldPath: string[], value: any) => {
                    const newVersions = [...versions];
                    if (newVersions.length === 0) {
                      // Seed initial 3 versions if missing
                      newVersions[0] = { ...thumbData };
                      newVersions[1] = { ...thumbData };
                      newVersions[2] = { ...thumbData };
                    }
                    
                    if (!newVersions[selectedVersionIndex]) {
                      newVersions[selectedVersionIndex] = { ...thumbData };
                    }

                    // Shallow copy target version
                    const target = { ...newVersions[selectedVersionIndex] };
                    newVersions[selectedVersionIndex] = target;

                    if (fieldPath.length === 1) {
                      target[fieldPath[0]] = value;
                    } else if (fieldPath.length === 2) {
                      target[fieldPath[0]] = {
                        ...target[fieldPath[0]],
                        [fieldPath[1]]: value
                      };
                    }

                    setThumbData({
                      ...thumbData,
                      versions: newVersions
                    });
                  };

                  return (
                    <div className="space-y-6">
                      {/* Version Selector Tabs */}
                      <div className="flex gap-2 border-b border-white/5 pb-4">
                        {[
                          { index: 0, label: "V1: Sỉ Nhục & Nỗi Đau", focus: "Humiliation & Pain" },
                          { index: 1, label: "V2: Sự Thật Gây Sốc", focus: "Shocking Truth" },
                          { index: 2, label: "V3: Phản Diện Sụp Đổ", focus: "Villain Downfall" }
                        ].map((v) => {
                          const isSelected = selectedVersionIndex === v.index;
                          const versionTitle = versions[v.index]?.title || `Phiên Bản ${v.index + 1}`;
                          return (
                            <button
                              key={v.index}
                              type="button"
                              onClick={() => setSelectedVersionIndex(v.index)}
                              className={cn(
                                "flex-1 py-2.5 px-3 rounded-xl text-left border transition-all cursor-pointer",
                                isSelected
                                  ? "bg-indigo-600/10 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/5"
                                  : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/10 hover:text-white"
                              )}
                            >
                              <div className="text-[9px] font-black uppercase tracking-wider mb-0.5 font-mono">
                                {v.label}
                              </div>
                              <div className="text-[8px] font-mono opacity-50 truncate max-w-[150px]">
                                {versionTitle || "Chưa có tiêu đề"}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Tựa YouTube Tiếng Nhật Cụ Thể (Mỗi version 1 tựa)</label>
                          <input
                            type="text"
                            value={activeVersion.title || ""}
                            onChange={(e) => updateActiveVersionField(['title'], e.target.value)}
                            className="w-full bg-black/40 text-xs font-bold text-white border border-white/5 rounded-lg px-3 py-2 outline-none focus:border-emerald-500/30 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Bản dịch Tiếng Việt (Tiêu đề)</label>
                          <input
                            type="text"
                            value={activeVersion.titleVi || ""}
                            onChange={(e) => updateActiveVersionField(['titleVi'], e.target.value)}
                            className="w-full bg-black/40 text-xs font-bold text-zinc-350 border border-white/5 rounded-lg px-3 py-2 outline-none focus:border-emerald-500/30 transition-all"
                            placeholder="Bản dịch tiếng Việt..."
                          />
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Focus Topic / Emotional Arc</label>
                          <input
                            type="text"
                            value={activeVersion.focus || ""}
                            onChange={(e) => updateActiveVersionField(['focus'], e.target.value)}
                            className="w-full bg-black/40 text-xs font-bold text-white border border-white/5 rounded-lg px-3 py-2 outline-none focus:border-emerald-500/30 transition-all"
                          />
                        </div>

                        {/* BEFORE SCENE DETAILS */}
                        <div className="p-4 bg-orange-500/[0.01] border border-orange-500/10 rounded-xl space-y-3">
                          <div className="text-[9px] font-mono text-orange-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                            BEFORE SCENE (RIGHT SIDE - BEFORE)
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Location</label>
                            <input
                              type="text"
                              value={activeVersion.beforeScene?.location || ""}
                              onChange={(e) => updateActiveVersionField(['beforeScene', 'location'], e.target.value)}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Action Description</label>
                            <textarea
                              value={activeVersion.beforeScene?.mainAction || ""}
                              onChange={(e) => updateActiveVersionField(['beforeScene', 'mainAction'], e.target.value)}
                              rows={2}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30 resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Villain Emotion (BEFORE)</label>
                            <input
                              type="text"
                              value={Array.isArray(activeVersion.beforeScene?.villainEmotion) ? activeVersion.beforeScene.villainEmotion.join(", ") : (activeVersion.beforeScene?.villainEmotion || "")}
                              onChange={(e) => updateActiveVersionField(['beforeScene', 'villainEmotion'], e.target.value.split(",").map((s: string) => s.trim()))}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Hero Emotion (BEFORE)</label>
                            <input
                              type="text"
                              value={Array.isArray(activeVersion.beforeScene?.heroEmotion) ? activeVersion.beforeScene.heroEmotion.join(", ") : (activeVersion.beforeScene?.heroEmotion || "")}
                              onChange={(e) => updateActiveVersionField(['beforeScene', 'heroEmotion'], e.target.value.split(",").map((s: string) => s.trim()))}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                        </div>

                        {/* AFTER SCENE DETAILS */}
                        <div className="p-4 bg-indigo-500/[0.01] border border-indigo-500/10 rounded-xl space-y-3">
                          <div className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                            AFTER SCENE (LEFT SIDE - AFTER)
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Location</label>
                            <input
                              type="text"
                              value={activeVersion.afterScene?.location || ""}
                              onChange={(e) => updateActiveVersionField(['afterScene', 'location'], e.target.value)}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Action Description</label>
                            <textarea
                              value={activeVersion.afterScene?.mainAction || ""}
                              onChange={(e) => updateActiveVersionField(['afterScene', 'mainAction'], e.target.value)}
                              rows={2}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30 resize-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Villain Collapse Emotion (AFTER)</label>
                            <input
                              type="text"
                              value={Array.isArray(activeVersion.afterScene?.villainEmotion) ? activeVersion.afterScene.villainEmotion.join(", ") : (activeVersion.afterScene?.villainEmotion || "")}
                              onChange={(e) => updateActiveVersionField(['afterScene', 'villainEmotion'], e.target.value.split(",").map((s: string) => s.trim()))}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] text-zinc-500 uppercase">Hero Dominance Emotion (AFTER)</label>
                            <input
                              type="text"
                              value={Array.isArray(activeVersion.afterScene?.heroEmotion) ? activeVersion.afterScene.heroEmotion.join(", ") : (activeVersion.afterScene?.heroEmotion || "")}
                              onChange={(e) => updateActiveVersionField(['afterScene', 'heroEmotion'], e.target.value.split(",").map((s: string) => s.trim()))}
                              className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                            />
                          </div>
                        </div>

                        {/* SPEECH BUBBLES & HOOKS */}
                        <div className="md:col-span-2 p-4 bg-zinc-950/40 border border-white/5 rounded-xl space-y-4">
                          <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                            Speech Bubbles & CTR Hooks
                          </div>
                          
                          <div className="space-y-4">
                            {/* Center text hook / Corner hooks conditional */}
                            {thumbStyle.layout?.variant === "split_corner_panels" ? (
                              <>
                                {/* Top-Right corner text panel */}
                                <div className="p-3 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl space-y-3">
                                  <div className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                                    Bảng chữ góc TRÊN-PHẢI (Bối cảnh / Mâu thuẫn)
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Text tiếng Nhật (Top-Right Hook)</label>
                                      <input
                                        type="text"
                                        value={activeVersion.topRightHook?.fullText || ""}
                                        onChange={(e) => updateActiveVersionField(['topRightHook', 'fullText'], e.target.value)}
                                        className="w-full bg-black/40 text-xs font-bold text-indigo-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Ví dụ: 「悪口の代償」..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                      <input
                                        type="text"
                                        value={activeVersion.topRightHook?.fullTextVi || ""}
                                        onChange={(e) => updateActiveVersionField(['topRightHook', 'fullTextVi'], e.target.value)}
                                        className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Bản dịch tiếng Việt..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Từ khóa nổi bật (Keywords)</label>
                                      <input
                                        type="text"
                                        value={Array.isArray(activeVersion.topRightHook?.highlightKeywords) ? activeVersion.topRightHook.highlightKeywords.join(", ") : (activeVersion.topRightHook?.highlightKeywords || "")}
                                        onChange={(e) => updateActiveVersionField(['topRightHook', 'highlightKeywords'], e.target.value.split(",").map((s: string) => s.trim()))}
                                        className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Ví dụ: 代償..."
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom-Left corner text panel */}
                                <div className="p-3 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl space-y-3">
                                  <div className="text-[8px] font-mono text-amber-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                                    Bảng chữ góc DƯỚI-TRÁI (Hậu quả / Kết mở)
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Text tiếng Nhật (Bottom-Left Hook)</label>
                                      <input
                                        type="text"
                                        value={activeVersion.bottomLeftHook?.fullText || ""}
                                        onChange={(e) => updateActiveVersionField(['bottomLeftHook', 'fullText'], e.target.value)}
                                        className="w-full bg-black/40 text-xs font-bold text-amber-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Ví dụ: 「スカッと崩壊」..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                      <input
                                        type="text"
                                        value={activeVersion.bottomLeftHook?.fullTextVi || ""}
                                        onChange={(e) => updateActiveVersionField(['bottomLeftHook', 'fullTextVi'], e.target.value)}
                                        className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Bản dịch tiếng Việt..."
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Từ khóa nổi bật (Keywords)</label>
                                      <input
                                        type="text"
                                        value={Array.isArray(activeVersion.bottomLeftHook?.highlightKeywords) ? activeVersion.bottomLeftHook.highlightKeywords.join(", ") : (activeVersion.bottomLeftHook?.highlightKeywords || "")}
                                        onChange={(e) => updateActiveVersionField(['bottomLeftHook', 'highlightKeywords'], e.target.value.split(",").map((s: string) => s.trim()))}
                                        className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                        placeholder="Ví dụ: 崩壊..."
                                      />
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* Center text hook */
                              <div className="p-3 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl space-y-3">
                                <div className="text-[8px] font-mono text-indigo-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                  <div className="w-1 h-1 bg-indigo-400 rounded-full" />
                                  CTR Center Hook (Chữ Dọc Giữa)
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">CTR Center Hook Text (Japanese)</label>
                                    <input
                                      type="text"
                                      value={activeVersion.centerHook?.fullText || ""}
                                      onChange={(e) => updateActiveVersionField(['centerHook', 'fullText'], e.target.value)}
                                      className="w-full bg-black/40 text-xs font-bold text-indigo-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                    <input
                                      type="text"
                                      value={activeVersion.centerHook?.fullTextVi || ""}
                                      onChange={(e) => updateActiveVersionField(['centerHook', 'fullTextVi'], e.target.value)}
                                      className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                      placeholder="Bản dịch tiếng Việt..."
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Center Hook Highlight Keywords</label>
                                    <input
                                      type="text"
                                      value={Array.isArray(activeVersion.centerHook?.highlightKeywords) ? activeVersion.centerHook.highlightKeywords.join(", ") : (activeVersion.centerHook?.highlightKeywords || "")}
                                      onChange={(e) => updateActiveVersionField(['centerHook', 'highlightKeywords'], e.target.value.split(",").map((s: string) => s.trim()))}
                                      className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Villain Bubble */}
                            <div className="p-3 bg-rose-500/[0.02] border border-rose-500/10 rounded-xl space-y-3">
                              <div className="text-[8px] font-mono text-rose-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
                                BEFORE Scene - Villain Speech Bubble (Bong thoại Phản Diện)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Speech Bubble Text (Japanese)</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainBubble?.text || ""}
                                    onChange={(e) => updateActiveVersionField(['villainBubble', 'text'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-rose-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainBubble?.textVi || ""}
                                    onChange={(e) => updateActiveVersionField(['villainBubble', 'textVi'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    placeholder="Bản dịch tiếng Việt..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Villain Highlight Phrase</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainBubble?.highlight || ""}
                                    onChange={(e) => updateActiveVersionField(['villainBubble', 'highlight'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-rose-400 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Hero Response Bubble */}
                            <div className="p-3 bg-blue-500/[0.02] border border-blue-500/10 rounded-xl space-y-3">
                              <div className="text-[8px] font-mono text-blue-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                BEFORE Scene - Hero Response Speech Bubble (Bong thoại Phản hồi Chính Diện)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Speech Bubble Text (Japanese)</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroResponseBubble?.text || ""}
                                    onChange={(e) => updateActiveVersionField(['heroResponseBubble', 'text'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-blue-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroResponseBubble?.textVi || ""}
                                    onChange={(e) => updateActiveVersionField(['heroResponseBubble', 'textVi'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    placeholder="Bản dịch tiếng Việt..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Hero Response Highlight Phrase</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroResponseBubble?.highlight || ""}
                                    onChange={(e) => updateActiveVersionField(['heroResponseBubble', 'highlight'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-blue-400 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Hero Bubble */}
                            <div className="p-3 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-3">
                              <div className="text-[8px] font-mono text-emerald-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                AFTER Scene - Hero Speech Bubble (Bong thoại Chính Diện)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Speech Bubble Text (Japanese)</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroBubble?.text || ""}
                                    onChange={(e) => updateActiveVersionField(['heroBubble', 'text'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-emerald-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroBubble?.textVi || ""}
                                    onChange={(e) => updateActiveVersionField(['heroBubble', 'textVi'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    placeholder="Bản dịch tiếng Việt..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Hero Highlight Phrase</label>
                                  <input
                                    type="text"
                                    value={activeVersion.heroBubble?.highlight || ""}
                                    onChange={(e) => updateActiveVersionField(['heroBubble', 'highlight'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-emerald-400 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Villain Reaction Bubble */}
                            <div className="p-3 bg-red-500/[0.02] border border-red-500/10 rounded-xl space-y-3">
                              <div className="text-[8px] font-mono text-red-400 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                                AFTER Scene - Villain Reaction Speech Bubble (Bong thoại Phản ứng Phản Diện)
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Speech Bubble Text (Japanese)</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainReactionBubble?.text || ""}
                                    onChange={(e) => updateActiveVersionField(['villainReactionBubble', 'text'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-red-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Bản dịch Tiếng Việt</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainReactionBubble?.textVi || ""}
                                    onChange={(e) => updateActiveVersionField(['villainReactionBubble', 'textVi'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-zinc-300 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                    placeholder="Bản dịch tiếng Việt..."
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[8px] text-zinc-500 uppercase font-bold font-mono">Villain Reaction Highlight Phrase</label>
                                  <input
                                    type="text"
                                    value={activeVersion.villainReactionBubble?.highlight || ""}
                                    onChange={(e) => updateActiveVersionField(['villainReactionBubble', 'highlight'], e.target.value)}
                                    className="w-full bg-black/40 text-xs text-red-400 border border-white/5 rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500/30"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-zinc-900/10 border border-dashed border-white/10 rounded-2xl p-12 text-center text-zinc-500 text-xs italic">
                Chưa có dữ liệu phân tích. Hãy điền kịch bản ở bên trái và bấm "Phân tích Drama (Gemini)".
              </div>
            )}

            {/* LAYER 3: PROMPT COMPOSER & IMAGE GENERATOR */}
            {thumbMasterPrompt && (
              <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      Layer 3 — Composed Master Prompt (Screenwriter)
                    </span>
                  </div>
                  <span className="text-[8px] bg-indigo-500/10 text-indigo-400 font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-indigo-500/25">
                    Unified Master Prompt
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold block">
                      Master CTR Prompt Description (Editable)
                    </span>
                    <textarea
                      value={thumbMasterPrompt}
                      onChange={(e) => setThumbMasterPrompt(e.target.value)}
                      rows={12}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-[11px] font-mono text-zinc-300 outline-none focus:border-indigo-500/50 resize-y custom-scrollbar leading-relaxed font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                    {/* Visual Image Render Box */}
                    <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col justify-center items-center min-h-[12rem] relative overflow-hidden group">
                      {isGeneratingThumbImage ? (
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RotateCcw className="w-8 h-8 animate-spin text-indigo-400" />
                          <span className="text-[9px] font-mono text-indigo-300 uppercase tracking-widest animate-pulse">
                            Rendering Thumbnail...
                          </span>
                        </div>
                      ) : thumbImageUrl ? (
                        <div className="relative w-full h-full aspect-video rounded-lg overflow-hidden border border-white/5">
                          <img
                            src={thumbImageUrl}
                            alt="Sukatto Thumbnail Result"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setZoomedImageUrl(thumbImageUrl);
                                const activeVersion = thumbData?.versions?.[selectedVersionIndex] || thumbData;
                                let title = activeVersion?.title || `sukatto_thumbnail_v${selectedVersionIndex + 1}`;
                                let cleanedTitle = title.trim().replace(/\s+/g, "_").replace(/[^\w\u00C0-\u1EF9đĐ]/gi, "_").replace(/__+/g, "_").replace(/^_+|_+$/g, "");
                                if (!cleanedTitle) cleanedTitle = `sukatto_thumbnail_v${selectedVersionIndex + 1}`;
                                setZoomedImageName(`${cleanedTitle}.jpg`);
                              }}
                              className="p-2.5 bg-white/10 hover:bg-indigo-600 border border-white/10 text-white rounded-xl transition-all shadow-lg cursor-pointer"
                              title="Phóng to"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                              onClick={downloadThumbnail}
                              className="p-2.5 bg-white/10 hover:bg-indigo-600 border border-white/10 text-white rounded-xl transition-all shadow-lg cursor-pointer"
                              title="Tải về"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center gap-2">
                          <ImageIcon className="w-12 h-12 text-zinc-700 opacity-20" />
                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider font-mono">
                            Ready to Render CTR Image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Render Buttons */}
                    <div className="flex flex-col justify-between gap-3">
                      <div className="p-4 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl space-y-2">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block font-mono">
                          VEO Image Engine
                        </span>
                        <p className="text-[9px] text-zinc-500 leading-normal">
                          Bấm nút vẽ ảnh bên dưới để gửi Master Prompt sang Veo API cục bộ. Kích thước tỷ lệ mặc định là <strong className="text-zinc-400">16:9 Landscape</strong>, tối ưu hóa tối đa cho giao diện YouTube CTR di động.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={generateThumbnailImage}
                          disabled={isGeneratingThumbImage || isImageGenerating || isGenerating}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/15 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-300" />
                          {isGeneratingThumbImage ? "ĐANG VẼ THUMBNAIL..." : "VẼ ẢNH THUMBNAIL"}
                        </button>
                        
                        {thumbImageUrl && (
                          <button
                            onClick={downloadThumbnail}
                            className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-300 hover:text-white text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            TẢI THUMBNAIL VỀ MÁY
                          </button>
                        )}

                        {/* Quick Version Switcher */}
                        <div className="pt-2.5 border-t border-white/5 mt-1">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold mb-1.5 text-center">
                            Chuyển nhanh phiên bản (Quick switch)
                          </span>
                          <div className="flex gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                            {[
                              { index: 0, label: "V1: Sỉ Nhục", title: "Sỉ nhục & Nỗi đau" },
                              { index: 1, label: "V2: Sự Thật", title: "Sự thật gây sốc" },
                              { index: 2, label: "V3: Sụp Đổ", title: "Phản diện sụp đổ" }
                            ].map((v) => {
                              const isSelected = selectedVersionIndex === v.index;
                              return (
                                <button
                                  key={v.index}
                                  type="button"
                                  onClick={() => setSelectedVersionIndex(v.index)}
                                  className={cn(
                                    "flex-1 py-2 px-1.5 rounded-lg text-center transition-all cursor-pointer text-[9px] font-black tracking-wide truncate",
                                    isSelected
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                                  )}
                                  title={v.title}
                                >
                                  {v.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </motion.div>
  );
};
