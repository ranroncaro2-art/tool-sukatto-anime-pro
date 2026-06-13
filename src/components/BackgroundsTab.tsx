import React from "react";
import {
  Upload, RotateCcw, User, Download, FolderOpen, Trash2, Plus, ZoomIn, PlayCircle, AlertOctagon, StopCircle, Image as ImageIcon
} from "lucide-react";
import { ProjectData, Background } from "../types";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ImageSelectorTarget {
  type: 'character' | 'background' | 'shot';
  index: number;
  refIndex?: number;
  isMain?: boolean;
}

export interface FileUploadTarget {
  type: 'character' | 'background' | 'shot';
  index: number;
  refIndex?: number;
}

interface BackgroundsTabProps {
  project: ProjectData;
  selectedBackgrounds: Record<number, boolean>;
  setSelectedBackgrounds: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  selectedBgsCount: number;
  selectedCharsCount: number;
  allAssetsCount: number;
  selectedAllAssetsCount: number;
  isBatchGenerating: boolean;
  isImageGenerating: boolean;
  isGenerating: boolean;
  generatingImages: Record<string, boolean>;
  generationStatuses: Record<string, string>;
  generationErrors: Record<string, string>;
  imageSelectorTarget: ImageSelectorTarget | null;
  setImageSelectorTarget: React.Dispatch<React.SetStateAction<ImageSelectorTarget | null>>;
  fileUploadTarget: FileUploadTarget | null;
  setFileUploadTarget: React.Dispatch<React.SetStateAction<FileUploadTarget | null>>;
  refFileInputRef: React.RefObject<HTMLInputElement | null>;
  generateAllBackgrounds: () => void;
  handleSelectAllBackgrounds: (checked: boolean) => void;
  handleSelectAllAssets: (checked: boolean) => void;
  handleGenerateSelectedBackgrounds: () => void;
  handleGenerateAllSelectedAssets: () => void;
  handleRegenerateFailedBackgrounds: () => void;
  handleStopBatch: () => void;
  setZoomedImageUrl: (url: string) => void;
  setZoomedImageName: (name: string) => void;
  handleDeleteReferenceImage: (type: 'character' | 'background', index: number, refIdx: number) => void;
  downloadSingleImage: (url: string, filename: string) => void;
  getCleanFilename: (type: string, name: string) => string;
  updateBackground: (index: number, field: keyof Background, value: any) => void;
  toggleBackgroundInstruction: (index: number, instruction: string) => void;
  generateImage: (type: 'character' | 'background', index: number) => void;
  handleAddBackgroundManual: () => void;
  handleDeleteBackgroundManual: (index: number) => void;
}

export const BackgroundsTab: React.FC<BackgroundsTabProps> = ({
  project,
  selectedBackgrounds,
  setSelectedBackgrounds,
  selectedBgsCount,
  selectedCharsCount,
  allAssetsCount,
  selectedAllAssetsCount,
  isBatchGenerating,
  isImageGenerating,
  isGenerating,
  generatingImages,
  generationStatuses,
  generationErrors,
  imageSelectorTarget,
  setImageSelectorTarget,
  fileUploadTarget,
  setFileUploadTarget,
  refFileInputRef,
  generateAllBackgrounds,
  handleSelectAllBackgrounds,
  handleSelectAllAssets,
  handleGenerateSelectedBackgrounds,
  handleGenerateAllSelectedAssets,
  handleRegenerateFailedBackgrounds,
  handleStopBatch,
  setZoomedImageUrl,
  setZoomedImageName,
  handleDeleteReferenceImage,
  downloadSingleImage,
  getCleanFilename,
  updateBackground,
  toggleBackgroundInstruction,
  generateImage,
  handleAddBackgroundManual,
  handleDeleteBackgroundManual
}) => {
  return (
    <div className="space-y-16">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">WORLD STAGING</h2>
          <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">Environmental Logic & Plate Design</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAddBackgroundManual}
            disabled={!project}
            className="px-5 py-3 bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-inner"
          >
            <Plus className="w-4 h-4 text-indigo-400" /> Thêm Bối Cảnh Mới
          </button>
          <button
            onClick={generateAllBackgrounds}
            disabled={isImageGenerating || isGenerating}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-3 uppercase tracking-[0.2em] glow-indigo shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" /> Construct Cinematic World
          </button>
        </div>
      </div>

      {/* Batch Action Panel for Backgrounds */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={project.backgrounds.length > 0 && selectedBgsCount === project.backgrounds.length}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedBgsCount > 0 && selectedBgsCount < project.backgrounds.length;
                }
              }}
              onChange={(e) => handleSelectAllBackgrounds(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
            />
            Chọn tất cả BG
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-teal-400 hover:text-teal-300 transition-colors">
            <input
              type="checkbox"
              checked={allAssetsCount > 0 && selectedAllAssetsCount === allAssetsCount}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedAllAssetsCount > 0 && selectedAllAssetsCount < allAssetsCount;
                }
              }}
              onChange={(e) => handleSelectAllAssets(e.target.checked)}
              className="w-4 h-4 rounded border-teal-500/20 bg-teal-500/10 accent-teal-500 cursor-pointer"
            />
            Chọn tất cả NV & BG
          </label>
          <span className="text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
            Đã chọn: <span className="text-indigo-400 font-bold">{selectedBgsCount}</span> / {project.backgrounds.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateSelectedBackgrounds}
            disabled={selectedBgsCount === 0 || isBatchGenerating || isImageGenerating || isGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Tạo tất cả đã chọn
          </button>

          <button
            onClick={handleGenerateAllSelectedAssets}
            disabled={(selectedCharsCount === 0 && selectedBgsCount === 0) || isBatchGenerating || isImageGenerating || isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-30 disabled:from-teal-600 disabled:to-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-teal-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Tạo liên tục NV & BG
          </button>
          
          <button
            onClick={handleRegenerateFailedBackgrounds}
            disabled={isBatchGenerating || isImageGenerating || isGenerating}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> Tạo lại ảnh Lỗi
          </button>

          <button
            onClick={handleStopBatch}
            disabled={!isBatchGenerating}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <StopCircle className="w-3.5 h-3.5" /> Dừng
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {project.backgrounds.map((bg, index) => (
          <div key={index} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-500"></div>
            <div className="relative bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all duration-300">
              {/* Header bar inside the Background card showing reference images */}
              <div className="flex items-center justify-between gap-3 px-5 py-2 bg-white/[0.01] border-b border-white/5 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold shrink-0">
                    Ảnh tham chiếu (Tối đa 10 ảnh):
                  </span>
                  <div className="flex items-center gap-2">
                    {bg.referenceImages && bg.referenceImages.length > 0 ? (
                      bg.referenceImages.map((ref, refIdx) => (
                        <div 
                          key={`bg-ref-${refIdx}`}
                          className="group/ref relative flex items-center gap-1.5 px-1.5 py-0.5 bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 rounded-lg transition-all duration-300 shrink-0"
                        >
                          <img 
                            src={ref.url} 
                            alt={`Tham chiếu #${refIdx + 1}`}
                            className="w-6 h-6 rounded-md object-cover border border-white/10"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-white leading-none"># {refIdx + 1}</span>
                          </div>

                          {/* Hover overlay with action buttons */}
                          <div className="absolute inset-0 bg-black/90 backdrop-blur-xs rounded-lg flex items-center justify-center gap-0.5 opacity-0 group-hover/ref:opacity-100 transition-opacity duration-200">
                            <button
                              type="button"
                              onClick={() => {
                                setZoomedImageUrl(ref.url);
                                setZoomedImageName(`bg_${index}_ref_${refIdx + 1}.jpg`);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Phóng to"
                            >
                              <ZoomIn className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageSelectorTarget({ type: 'background', index, refIndex: refIdx })}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Thay thế từ thư viện"
                            >
                              <FolderOpen className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFileUploadTarget({ type: 'background', index, refIndex: refIdx });
                                setTimeout(() => refFileInputRef.current?.click(), 50);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Tải từ máy"
                            >
                              <Upload className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReferenceImage('background', index, refIdx)}
                              className="p-0.5 bg-white/10 hover:bg-rose-600 text-white rounded transition-all cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[8px] font-mono text-zinc-600 italic">
                        Chưa có ảnh tham chiếu. Sẽ sinh ảnh từ Prompt (Text-to-Image)
                      </span>
                    )}
                  </div>
                </div>

                {/* Add buttons side-by-side if references < 10 */}
                {(!bg.referenceImages || bg.referenceImages.length < 10) && (
                  <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-white/5">
                    <button
                      type="button"
                      onClick={() => setImageSelectorTarget({ type: 'background', index })}
                      className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-md text-[7px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" /> Thư viện
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileUploadTarget({ type: 'background', index });
                        setTimeout(() => refFileInputRef.current?.click(), 50);
                      }}
                      className="px-1.5 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 hover:text-violet-300 rounded-md text-[7px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      <Upload className="w-2.5 h-2.5" /> Tải từ máy
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row items-stretch min-h-[9rem]">
                {/* 1. STT & Checkbox */}
                <div className="w-16 border-r border-white/10 flex flex-col items-center justify-center gap-3 bg-black/40 font-mono text-zinc-400 font-extrabold text-[12px]">
                  <span>{(index + 1).toString().padStart(2, '0')}</span>
                  <input
                    type="checkbox"
                    checked={!!selectedBackgrounds[index]}
                    onChange={(e) => setSelectedBackgrounds(prev => ({ ...prev, [index]: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 2. HÌNH ẢNH */}
                <div className="w-32 bg-black/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center border-r border-white/10 group">
                  {generatingImages[`background_${index}`] ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-2 text-center w-full">
                      <RotateCcw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span className="text-[8px] font-mono text-zinc-400 leading-tight uppercase font-bold animate-pulse break-words max-w-full">
                        {generationStatuses[`image_background_${index}`] || "Veo..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      {bg.imageUrl ? (
                        <img src={bg.imageUrl} alt={bg.location} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center w-full h-full">
                          {generationErrors[`image_background_${index}`] ? (
                            <div className="text-red-500/90 text-[8px] font-mono leading-tight break-words max-w-full font-bold">
                              Lỗi: {generationErrors[`image_background_${index}`]}
                            </div>
                          ) : (
                            <ImageIcon className="w-10 h-10 text-zinc-700 opacity-30" />
                          )}
                        </div>
                      )}
                      
                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {bg.imageUrl && (
                          <>
                            <button
                              onClick={() => {
                                setZoomedImageUrl(bg.imageUrl!);
                                setZoomedImageName(getCleanFilename('bg', bg.location));
                              }}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Phóng to xem ảnh"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => downloadSingleImage(bg.imageUrl!, getCleanFilename('bg', bg.location))}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Tải ảnh về máy"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setImageSelectorTarget({ type: 'background', index, isMain: true })}
                          className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                          title="Thay thế ảnh bối cảnh từ thư viện"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. TÊN BỐI CẢNH */}
                <div className="w-56 border-r border-white/10 p-5 flex flex-col justify-center bg-black/10 gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-indigo-400 font-extrabold tracking-widest block">STAGING_ENV_0{index + 1}</span>
                    <button
                      onClick={() => handleDeleteBackgroundManual(index)}
                      className="p-1 hover:bg-rose-500/10 rounded hover:text-rose-400 text-zinc-600 transition-colors cursor-pointer"
                      title="Xóa bối cảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Tên Bối Cảnh</label>
                      <input
                        type="text"
                        value={bg.location}
                        onChange={(e) => updateBackground(index, 'location', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500/50 transition-all font-bold uppercase tracking-wider"
                        placeholder="E.g. Kitchen_Day"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Góc Quay / Lens</label>
                      <input
                        type="text"
                        value={bg.angle}
                        onChange={(e) => updateBackground(index, 'angle', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-indigo-300 outline-none focus:border-indigo-500/50 transition-all uppercase tracking-wider font-mono font-bold"
                        placeholder="E.g. Wide Shot"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. PROMPTS */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-3 border-r border-white/10">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Prompt bối cảnh (Scene Geometry Prompt)</span>
                    <textarea
                      value={bg.prompt}
                      onChange={(e) => updateBackground(index, 'prompt', e.target.value)}
                      className="w-full text-[10px] font-mono p-2.5 bg-black/40 rounded-lg border border-white/5 text-zinc-400 outline-none focus:border-indigo-500/30 focus:text-zinc-200 resize-none h-14 transition-all scrollbar-hide"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">Yêu cầu vẽ lại bối cảnh (Nếu có ảnh tham chiếu)</span>
                    <input
                      type="text"
                      value={bg.appearanceInstruction || ""}
                      onChange={(e) => updateBackground(index, 'appearanceInstruction', e.target.value)}
                      className="w-full bg-black/40 text-[10px] font-medium text-white border border-white/5 focus:border-indigo-500/30 rounded-lg px-2.5 py-1.5 outline-none transition-all"
                      placeholder="Nhập yêu cầu tinh chỉnh (E.g. Chiều hoàng hôn, Trời mưa sương mù, Ánh sáng ấm...)"
                    />
                    
                    {/* Quick tags for Background */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[
                        { label: "☀️ Nắng rực rỡ", val: "Bright sunny day" },
                        { label: "🌧️ Trời mưa sương mù", val: "Rainy, misty weather" },
                        { label: "🌆 Hoàng hôn ấm", val: "Warm golden hour sunset" },
                        { label: "🌃 Ban đêm lung linh", val: "Sparkling night view" },
                        { label: "💡 Ánh sáng Dramatic", val: "Dramatic cinematic lighting" }
                      ].map((tag) => {
                        const active = (bg.appearanceInstruction || "").split(",").map(s => s.trim()).filter(Boolean).includes(tag.val);
                        return (
                          <button
                            key={tag.val}
                            type="button"
                            onClick={() => toggleBackgroundInstruction(index, tag.val)}
                            className={`px-1.5 py-0.5 rounded text-[8px] font-medium transition-all cursor-pointer ${
                              active 
                                ? "bg-indigo-600 border border-indigo-400 text-white shadow-sm shadow-indigo-500/20" 
                                : "bg-white/5 border border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            {tag.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. NÚT TẠO / TẠO LẠI */}
                <div className="w-44 p-6 flex flex-col items-center justify-center gap-2 bg-black/40">
                  <button
                    onClick={() => generateImage('background', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Vẽ Cảnh
                  </button>
                  <button
                    onClick={() => generateImage('background', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-1.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" /> Vẽ Lại
                  </button>
                  {generationErrors[`image_background_${index}`] && (
                    <div className="w-full mt-1.5 p-2 bg-red-950/30 border border-red-500/20 rounded-lg text-center">
                      <span className="text-[8px] font-mono text-red-400 leading-tight block break-words">
                        {generationErrors[`image_background_${index}`]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
