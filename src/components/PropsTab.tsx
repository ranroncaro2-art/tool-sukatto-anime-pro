import React from "react";
import {
  Upload, RotateCcw, Box, Download, FolderOpen, Trash2, Plus, ZoomIn, PlayCircle, AlertOctagon, StopCircle, Image as ImageIcon
} from "lucide-react";
import { ProjectData, Prop } from "../types";
import { motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ImageSelectorTarget {
  type: 'character' | 'background' | 'shot' | 'prop';
  index: number;
  refIndex?: number;
  isMain?: boolean;
}

export interface FileUploadTarget {
  type: 'character' | 'background' | 'shot' | 'prop';
  index: number;
  refIndex?: number;
}

interface PropsTabProps {
  project: ProjectData;
  selectedProps: Record<number, boolean>;
  setSelectedProps: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  selectedPropsCount: number;
  selectedCharsCount: number;
  selectedBgsCount: number;
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
  generateAllProps: () => void;
  handleSelectAllProps: (checked: boolean) => void;
  handleSelectAllAssets: (checked: boolean) => void;
  handleGenerateSelectedProps: () => void;
  handleGenerateAllSelectedAssets: () => void;
  handleRegenerateFailedProps: () => void;
  handleStopBatch: () => void;
  setZoomedImageUrl: (url: string) => void;
  setZoomedImageName: (name: string) => void;
  handleDeleteReferenceImage: (type: 'character' | 'background' | 'shot' | 'prop', index: number, refIdx: number) => void;
  downloadSingleImage: (url: string, filename: string) => void;
  getCleanFilename: (type: string, name: string) => string;
  updateProp: (index: number, field: keyof Prop, value: any) => void;
  togglePropInstruction: (index: number, instruction: string) => void;
  generateImage: (type: 'character' | 'background' | 'shot' | 'prop', index: number) => void;
  handleAddPropManual: () => void;
  handleDeletePropManual: (index: number) => void;
}

export const PropsTab: React.FC<PropsTabProps> = ({
  project,
  selectedProps,
  setSelectedProps,
  selectedPropsCount,
  selectedCharsCount,
  selectedBgsCount,
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
  generateAllProps,
  handleSelectAllProps,
  handleSelectAllAssets,
  handleGenerateSelectedProps,
  handleGenerateAllSelectedAssets,
  handleRegenerateFailedProps,
  handleStopBatch,
  setZoomedImageUrl,
  setZoomedImageName,
  handleDeleteReferenceImage,
  downloadSingleImage,
  getCleanFilename,
  updateProp,
  togglePropInstruction,
  generateImage,
  handleAddPropManual,
  handleDeletePropManual
}) => {
  const propsList = project.props || [];

  return (
    <div className="space-y-16">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">STORY PROPS</h2>
          <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">Main Props & Object Design</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleAddPropManual}
            disabled={!project}
            className="px-5 py-3 bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-inner"
          >
            <Plus className="w-4 h-4 text-indigo-400" /> Thêm Đạo Cụ Mới
          </button>
          <button
            onClick={generateAllProps}
            disabled={isImageGenerating || isGenerating}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-3 uppercase tracking-[0.2em] glow-indigo shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Box className="w-4 h-4 text-indigo-400" /> Construct Cinematic Props
          </button>
        </div>
      </div>

      {/* Batch Action Panel for Props */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={propsList.length > 0 && selectedPropsCount === propsList.length}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedPropsCount > 0 && selectedPropsCount < propsList.length;
                }
              }}
              onChange={(e) => handleSelectAllProps(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
            />
            Chọn tất cả đạo cụ
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
            Chọn tất cả NV, BG & Đạo cụ
          </label>
          <span className="text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
            Đã chọn: <span className="text-indigo-400 font-bold">{selectedPropsCount}</span> / {propsList.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateSelectedProps}
            disabled={selectedPropsCount === 0 || isBatchGenerating || isImageGenerating || isGenerating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Tạo tất cả đã chọn
          </button>

          <button
            onClick={handleGenerateAllSelectedAssets}
            disabled={(selectedCharsCount === 0 && selectedBgsCount === 0 && selectedPropsCount === 0) || isBatchGenerating || isImageGenerating || isGenerating}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-30 disabled:from-teal-600 disabled:to-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-teal-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Tạo liên tục toàn bộ
          </button>
          
          <button
            onClick={handleRegenerateFailedProps}
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
        {propsList.map((prop, index) => (
          <div key={index} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-500"></div>
            <div className="relative bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all duration-300">
              {/* Header bar inside the Prop card showing reference images */}
              <div className="flex items-center justify-between gap-3 px-5 py-2 bg-white/[0.01] border-b border-white/5 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold shrink-0">
                    Ảnh tham chiếu (Tối đa 10 ảnh):
                  </span>
                  <div className="flex items-center gap-2">
                    {prop.referenceImages && prop.referenceImages.length > 0 ? (
                      prop.referenceImages.map((ref, refIdx) => (
                        <div 
                          key={`prop-ref-${refIdx}`}
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
                                setZoomedImageName(`prop_${index}_ref_${refIdx + 1}.jpg`);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Phóng to"
                            >
                              <ZoomIn className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageSelectorTarget({ type: 'prop', index, refIndex: refIdx })}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Thay thế từ thư viện"
                            >
                              <FolderOpen className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFileUploadTarget({ type: 'prop', index, refIndex: refIdx });
                                setTimeout(() => refFileInputRef.current?.click(), 50);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Tải từ máy"
                            >
                              <Upload className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReferenceImage('prop', index, refIdx)}
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
                {(!prop.referenceImages || prop.referenceImages.length < 10) && (
                  <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-white/5">
                    <button
                      type="button"
                      onClick={() => setImageSelectorTarget({ type: 'prop', index })}
                      className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-md text-[7px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" /> Thư viện
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileUploadTarget({ type: 'prop', index });
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
                    checked={!!selectedProps[index]}
                    onChange={(e) => setSelectedProps(prev => ({ ...prev, [index]: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 2. HÌNH ẢNH */}
                <div className="w-32 bg-black/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center border-r border-white/10 group">
                  {generatingImages[`prop_${index}`] ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-2 text-center w-full">
                      <RotateCcw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span className="text-[8px] font-mono text-zinc-400 leading-tight uppercase font-bold animate-pulse break-words max-w-full">
                        {generationStatuses[`image_prop_${index}`] || "Veo..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      {prop.imageUrl ? (
                        <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center w-full h-full">
                          {generationErrors[`image_prop_${index}`] ? (
                            <div className="text-red-500/90 text-[8px] font-mono leading-tight break-words max-w-full font-bold">
                              Lỗi: {generationErrors[`image_prop_${index}`]}
                            </div>
                          ) : (
                            <Box className="w-10 h-10 text-zinc-700 opacity-30" />
                          )}
                        </div>
                      )}
                      
                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {prop.imageUrl && (
                          <>
                            <button
                              onClick={() => {
                                setZoomedImageUrl(prop.imageUrl!);
                                setZoomedImageName(getCleanFilename('prop', prop.name));
                              }}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Phóng to xem ảnh"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => downloadSingleImage(prop.imageUrl!, getCleanFilename('prop', prop.name))}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Tải ảnh về máy"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setImageSelectorTarget({ type: 'prop', index, isMain: true })}
                          className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                          title="Thay thế ảnh đạo cụ từ thư viện"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. TÊN ĐẠO CỤ */}
                <div className="w-56 border-r border-white/10 p-5 flex flex-col justify-center bg-black/10 gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-indigo-400 font-extrabold tracking-widest block">STORY_PROP_0{index + 1}</span>
                    <button
                      onClick={() => handleDeletePropManual(index)}
                      className="p-1 hover:bg-rose-500/10 rounded hover:text-rose-400 text-zinc-600 transition-colors cursor-pointer"
                      title="Xóa đạo cụ này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Tên Đạo Cụ</label>
                      <input
                        type="text"
                        value={prop.name}
                        onChange={(e) => updateProp(index, 'name', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-indigo-500/50 transition-all font-bold uppercase tracking-wider"
                        placeholder="E.g. Violin"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">Mô tả tóm tắt</label>
                      <input
                        type="text"
                        value={prop.appearance}
                        onChange={(e) => updateProp(index, 'appearance', e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] text-zinc-400 outline-none focus:border-indigo-500/50 transition-all font-bold"
                        placeholder="E.g. An old wooden violin"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. PROMPTS */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-3 border-r border-white/10">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Prompt Đạo Cụ (Prop Sheet Prompt)</span>
                    <textarea
                      value={prop.prompt}
                      onChange={(e) => updateProp(index, 'prompt', e.target.value)}
                      className="w-full text-[10px] font-mono p-2.5 bg-black/40 rounded-lg border border-white/5 text-zinc-400 outline-none focus:border-indigo-500/30 focus:text-zinc-200 resize-none h-14 transition-all scrollbar-hide"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">Yêu cầu vẽ lại đạo cụ (Nếu có ảnh tham chiếu)</span>
                    <input
                      type="text"
                      value={prop.appearanceInstruction || ""}
                      onChange={(e) => updateProp(index, 'appearanceInstruction', e.target.value)}
                      className="w-full bg-black/40 text-[10px] font-medium text-white border border-white/5 focus:border-indigo-500/30 rounded-lg px-2.5 py-1.5 outline-none transition-all"
                      placeholder="Nhập yêu cầu tinh chỉnh (E.g. Đặt trên bàn gỗ, Màu sắc ấm, Ánh sáng studio...)"
                    />
                    
                    {/* Quick tags for Props */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[
                        { label: "📦 Đặt trên bàn", val: "Placed on a wooden table" },
                        { label: "✨ Ánh sáng lung linh", val: "Soft atmospheric glow" },
                        { label: "📸 Ảnh Studio", val: "Studio product photography" },
                        { label: "⏳ Cổ kính / Cũ", val: "Vintage, weathered look" },
                        { label: "💡 Chi tiết sắc nét", val: "Ultra-sharp details focus" }
                      ].map((tag) => {
                        const active = (prop.appearanceInstruction || "").split(",").map(s => s.trim()).filter(Boolean).includes(tag.val);
                        return (
                          <button
                            key={tag.val}
                            type="button"
                            onClick={() => togglePropInstruction(index, tag.val)}
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
                    onClick={() => generateImage('prop', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Vẽ Đạo Cụ
                  </button>
                  <button
                    onClick={() => generateImage('prop', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-1.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" /> Vẽ Lại
                  </button>
                  {generationErrors[`image_prop_${index}`] && (
                    <div className="w-full mt-1.5 p-2 bg-red-950/30 border border-red-500/20 rounded-lg text-center">
                      <span className="text-[8px] font-mono text-red-400 leading-tight block break-words">
                        {generationErrors[`image_prop_${index}`]}
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
