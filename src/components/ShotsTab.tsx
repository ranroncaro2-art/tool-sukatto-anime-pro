import React, { useEffect } from "react";
import {
  Upload, RotateCcw, Download, Trash2, Plus, ZoomIn, PlayCircle, AlertOctagon, StopCircle,
  AlertCircle, Check, Eye, CheckCircle2, X, ChevronLeft, ChevronRight, Copy, Save, Play,
  Maximize2, Sparkles, FolderOpen, Image as ImageIcon
} from "lucide-react";
import { ProjectData, Shot, Situation, Character, Background } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ImageSelectorTarget, FileUploadTarget } from "./CharactersTab";
import { detectCharacters } from "../utils/parsers";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local helper to clean bg location name from prompt
const cleanBg = (text: string) => {
  const bgMatch = text.match(/^\[(.*?)\]/);
  let name = bgMatch ? bgMatch[1] : text.split(" + ")[0].split(",")[0];
  return name.split(/\s+(?:Medium|Close|Wide|Shot|Profile|OTS|Two-shot)/i)[0].trim();
};

const getMatchedCharacters = (shot: Shot, characters: Character[]) => {
  if (!characters || !shot) return [];
  const detectedNames = detectCharacters(shot.prompt, characters);
  
  const matched = characters.filter(char => {
    if (!char.imageUrl) return false;
    if (detectedNames.includes(char.name)) return true;
    
    if (shot.character) {
      const manualNames = shot.character.split(',').map(n => n.trim().toLowerCase());
      const charNameLower = char.name.toLowerCase();
      return manualNames.some(name => {
        if (!name) return false;
        return charNameLower.includes(name) || name.includes(charNameLower);
      }) || shot.character.toLowerCase().includes(charNameLower);
    }
    return false;
  });

  // Sort matched characters based on the order in shot.character or detectedNames
  matched.sort((a, b) => {
    if (shot.character) {
      const manualNames = shot.character.split(',').map(n => n.trim().toLowerCase());
      const idxA = manualNames.findIndex(name => a.name.toLowerCase().includes(name) || name.includes(a.name.toLowerCase()));
      const idxB = manualNames.findIndex(name => b.name.toLowerCase().includes(name) || name.includes(b.name.toLowerCase()));
      const valA = idxA !== -1 ? idxA : 999999;
      const valB = idxB !== -1 ? idxB : 999999;
      if (valA !== valB) return valA - valB;
    }
    
    const detIdxA = detectedNames.indexOf(a.name);
    const detIdxB = detectedNames.indexOf(b.name);
    const valDetA = detIdxA !== -1 ? detIdxA : 999999;
    const valDetB = detIdxB !== -1 ? detIdxB : 999999;
    return valDetA - valDetB;
  });

  return matched;
};

const getMatchedBackgrounds = (shot: Shot, backgrounds: Background[]) => {
  if (!backgrounds || !shot) return [];
  const backgroundName = shot.scene?.trim() || cleanBg(shot.prompt);
  const bgNameLower = backgroundName.toLowerCase();
  const sceneLower = (shot.scene || "").toLowerCase();
  const promptLower = (shot.prompt || "").toLowerCase();
  
  return backgrounds.filter(bg => {
    if (!bg.imageUrl) return false;
    const loc = bg.location.toLowerCase();
    
    return bgNameLower.includes(loc) || loc.includes(bgNameLower) ||
           sceneLower.includes(loc) || loc.includes(sceneLower) ||
           promptLower.includes(loc) || loc.includes(promptLower);
  });
};

interface ShotsTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  isImageGenerating: boolean;
  isGenerating: boolean;
  generatingVideos: Record<number, boolean>;
  generationStatuses: Record<string, string>;
  generationErrors: Record<string, string>;
  activeZoomedShotIndex: number | null;
  setActiveZoomedShotIndex: React.Dispatch<React.SetStateAction<number | null>>;
  zoomedPrompt: string;
  setZoomedPrompt: React.Dispatch<React.SetStateAction<string>>;
  isRefMappingApproved: boolean;
  isWritingShots: boolean;
  selectedShots: Record<number, boolean>;
  setSelectedShots: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  selectedShotsCount: number;
  eligibleShotsCount: number;
  isBatchRendering: boolean;
  videoStatusFilter: 'all' | 'success' | 'unrendered' | 'error' | 'pending';
  setVideoStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'success' | 'unrendered' | 'error' | 'pending'>>;
  filteredShots: Array<{ shot: Shot; index: number }>;
  showSituationsModal: boolean;
  setShowSituationsModal: React.Dispatch<React.SetStateAction<boolean>>;
  imageSelectorTarget: ImageSelectorTarget | null;
  setImageSelectorTarget: React.Dispatch<React.SetStateAction<ImageSelectorTarget | null>>;
  fileUploadTarget: FileUploadTarget | null;
  setFileUploadTarget: React.Dispatch<React.SetStateAction<FileUploadTarget | null>>;
  refFileInputRef: React.RefObject<HTMLInputElement | null>;
  
  handleAddSituation: () => void;
  handleDeleteSituation: (id: number) => void;
  handleUpdateSituation: (id: number, field: keyof Situation, value: any) => void;
  toggleCharacterInSituation: (id: number, charName: string, currentNames: string) => void;
  toggleBackgroundInSituation: (id: number, bgLocation: string, currentNames: string) => void;
  togglePropInSituation: (id: number, propName: string, currentNames: string) => void;
  handleAddOfficialBackground: (loc: string) => void;
  generateCinematicShots: () => void;
  handleLockAndReconfigure: () => void;
  handleSelectAllShots: (checked: boolean) => void;
  handleRenderAllSelectedShots: () => void;
  handleRetryFailedShots: () => void;
  downloadAllSuccessVideos: () => void;
  downloadProgress: { current: number; total: number; step: string } | null;
  autoDownloadVideos: boolean;
  setAutoDownloadVideos: React.Dispatch<React.SetStateAction<boolean>>;
  handleStopBatchRendering: () => void;
  generateVideo: (index: number, customPrompt?: string) => void;
  downloadSingleVideo: (index: number) => void;
  downloadSingleImage: (url: string, filename: string) => void;
  scriptName: string;
  setSystemLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setZoomedImageUrl: (url: string) => void;
  setZoomedImageName: (name: string) => void;
  updateShot: (index: number, value: string) => void;
  handleDeleteReferenceImage: (type: string, index: number, refIdx: number) => void;
}

export const ShotsTab: React.FC<ShotsTabProps> = ({
  project,
  setProject,
  isImageGenerating,
  isGenerating,
  generatingVideos,
  generationStatuses,
  generationErrors,
  activeZoomedShotIndex,
  setActiveZoomedShotIndex,
  zoomedPrompt,
  setZoomedPrompt,
  isRefMappingApproved,
  isWritingShots,
  selectedShots,
  setSelectedShots,
  selectedShotsCount,
  eligibleShotsCount,
  isBatchRendering,
  videoStatusFilter,
  setVideoStatusFilter,
  filteredShots,
  showSituationsModal,
  setShowSituationsModal,
  imageSelectorTarget,
  setImageSelectorTarget,
  fileUploadTarget,
  setFileUploadTarget,
  refFileInputRef,
  handleAddSituation,
  handleDeleteSituation,
  handleUpdateSituation,
  toggleCharacterInSituation,
  toggleBackgroundInSituation,
  togglePropInSituation,
  handleAddOfficialBackground,
  generateCinematicShots,
  handleLockAndReconfigure,
  handleSelectAllShots,
  handleRenderAllSelectedShots,
  handleRetryFailedShots,
  downloadAllSuccessVideos,
  downloadProgress,
  autoDownloadVideos,
  setAutoDownloadVideos,
  handleStopBatchRendering,
  generateVideo,
  downloadSingleVideo,
  downloadSingleImage,
  scriptName,
  setSystemLogs,
  handleDeleteReferenceImage,
  updateShot,
  setZoomedImageUrl,
  setZoomedImageName
}) => {

  // Pagination State & Helpers
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [videoStatusFilter]);

  const totalPages = React.useMemo(() => {
    return Math.ceil(filteredShots.length / pageSize) || 1;
  }, [filteredShots.length, pageSize]);

  const paginatedShots = React.useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredShots.slice(startIndex, startIndex + pageSize);
  }, [filteredShots, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredShots.length, totalPages, currentPage]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxNeighbours = 1; // Show current page, 1 before, 1 after

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      const leftBound = Math.max(2, currentPage - maxNeighbours);
      const rightBound = Math.min(totalPages - 1, currentPage + maxNeighbours);

      if (leftBound > 2) {
        pages.push("...");
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(i);
      }

      if (rightBound < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageChange = (page: number, shouldScroll = false) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (shouldScroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderPagination = (scrollOnBtnClick = false) => {
    if (totalPages <= 1) return null;

    const pageNumbers = getPageNumbers();

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white/[0.01] border border-white/5 rounded-2xl animate-fade-in font-mono text-xs">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold">
          Trang <span className="text-zinc-300 font-bold font-mono">{currentPage}</span> / {totalPages} (Hiển thị {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredShots.length)} / {filteredShots.length} video)
        </div>

        <div className="flex items-center gap-1.5 select-none">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1, scrollOnBtnClick)}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed animate-all"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageNumbers.map((page, pIdx) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${pIdx}`}
                  className="px-3 py-1.5 text-zinc-600 font-bold text-[10px]"
                >
                  ...
                </span>
              );
            }

            const pageNum = page as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => handlePageChange(pageNum, scrollOnBtnClick)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all border cursor-pointer",
                  isActive
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.05]"
                )}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1, scrollOnBtnClick)}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed animate-all"
            title="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Local effect for zoomed shot keydown navigation
  useEffect(() => {
    if (activeZoomedShotIndex === null || !project) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is editing prompt input to prevent overriding natural text input controls
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        // Ctrl + Enter shortcut inside textarea to Save and Re-run
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          const saveBtn = document.getElementById("zoomed-save-run-btn");
          saveBtn?.click();
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIdx = activeZoomedShotIndex > 0 ? activeZoomedShotIndex - 1 : project.shots.length - 1;
        setActiveZoomedShotIndex(prevIdx);
        setZoomedPrompt(project.shots[prevIdx].prompt || "");
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIdx = activeZoomedShotIndex < project.shots.length - 1 ? activeZoomedShotIndex + 1 : 0;
        setActiveZoomedShotIndex(nextIdx);
        setZoomedPrompt(project.shots[nextIdx].prompt || "");
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveZoomedShotIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeZoomedShotIndex, project, zoomedPrompt, setActiveZoomedShotIndex, setZoomedPrompt]);

  return (
    <div className="space-y-16">
      {!isRefMappingApproved ? (
        <div className="space-y-10 animate-fade-in">
          {/* STAGE 1: BẢNG TÌNH HUỐNG TRUYỆN */}
          <div className="flex items-end justify-between border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">BẢNG TÌNH HUỐNG TRUYỆN</h2>
              <p className="text-[11px] font-mono text-emerald-400 uppercase tracking-[0.4em] font-black">Grounded Story Situation Mapping Board</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleAddSituation}
                className="px-5 py-2.5 bg-white/5 border border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" /> Thêm Tình Huống
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-4 text-xs">
            <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">HƯỚNG DẪN KIỂM SOÁT NHÂN VẬT & BỐI CẢNH</p>
              <p className="text-zinc-400 leading-relaxed">
                Hãy kiểm tra và điều chỉnh các tình huống truyện dưới đây. AI sẽ dựa vào bảng thống kê này để gán chính xác nhân vật tham chiếu và bối cảnh ở Giai đoạn 2. Điều này đảm bảo tính nhất quán hình ảnh và nội dung 100%, không bị sai sót nhân vật hoặc bối cảnh.
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-3xl border border-white/5 bg-white/[0.01] backdrop-blur-2xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-16">STT</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-32">Mốc Thời Gian</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-40">Địa Điểm / Bối Cảnh</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Mô Tả Tóm Tắt Tình Huống</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-72">Nhân Vật Xuất Hiện</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-72">Bối Cảnh Tham Chiếu</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-72">Đạo Cụ Tham Chiếu</th>
                  <th className="py-4 px-6 font-mono text-[10px] uppercase tracking-widest text-zinc-500 font-bold w-20 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(!project.situations || project.situations.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-500 uppercase tracking-wider font-mono text-[10px]">
                      Chưa có tình huống truyện nào được trích xuất. Vui lòng bấm nút "Phân Tích & Trích Xuất" từ Sidebar.
                    </td>
                  </tr>
                ) : (
                  project.situations.map((sit, index) => (
                    <tr key={sit.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="py-4 px-6 font-mono text-zinc-500 font-bold">{index + 1}</td>
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={sit.timeRange}
                          onChange={(e) => handleUpdateSituation(sit.id, "timeRange", e.target.value)}
                          placeholder="E.g., 00:00 - 04:00"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <input
                          type="text"
                          value={sit.location}
                          onChange={(e) => handleUpdateSituation(sit.id, "location", e.target.value)}
                          placeholder="E.g., Trong nhà bếp"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <textarea
                          value={sit.summary}
                          onChange={(e) => handleUpdateSituation(sit.id, "summary", e.target.value)}
                          placeholder="Tóm tắt sự việc..."
                          rows={2}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-y min-h-[50px]"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <textarea
                            value={sit.characterNames}
                            onChange={(e) => handleUpdateSituation(sit.id, "characterNames", e.target.value)}
                            placeholder="E.g., Aoi_Home, Sensei_Classroom"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono resize-y min-h-[50px]"
                          />
                          
                          {/* Warning System for Characters */}
                          {(() => {
                            const currentList = sit.characterNames
                              ? sit.characterNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                              : [];
                            
                            const unmatched = currentList.filter(name => {
                              return !project.characters.some(c => c.name.toLowerCase() === name.toLowerCase());
                            });

                            const hasGenericWarning = currentList.some(name => {
                              const exactMatch = project.characters.some(c => c.name.toLowerCase() === name.toLowerCase());
                              if (exactMatch) return false;
                              return project.characters.some(c => c.name.toLowerCase().startsWith(name.toLowerCase() + "_"));
                            });

                            if (unmatched.length > 0) {
                              return (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                                  <span>
                                    {hasGenericWarning 
                                      ? `Vui lòng chỉ định rõ biến thể trang phục (ví dụ: ${project.characters.find(c => c.name.toLowerCase().startsWith(unmatched[0].toLowerCase() + "_"))?.name || 'Aoi_Home'})`
                                      : `Không khớp biến thể chính thức: ${unmatched.join(', ')}`
                                    }
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Interactive Character Chips */}
                          {project.characters && project.characters.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 max-h-[120px] overflow-y-auto pr-1 select-none">
                              {project.characters.map((char, cIdx) => {
                                const currentList = sit.characterNames
                                  ? sit.characterNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                                  : [];
                                const isActive = currentList.some(name => name.toLowerCase() === char.name.toLowerCase());
                                
                                return (
                                  <button
                                    key={cIdx}
                                    type="button"
                                    onClick={() => toggleCharacterInSituation(sit.id, char.name, sit.characterNames)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer border",
                                      isActive
                                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                        : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.05]"
                                    )}
                                  >
                                    {char.imageUrl ? (
                                      <img
                                        src={char.imageUrl}
                                        alt={char.name}
                                        className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        {char.name.charAt(0)}
                                      </div>
                                    )}
                                    <span>{char.name}</span>
                                    {isActive && <Check className="w-2.5 h-2.5 ml-0.5 text-emerald-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <textarea
                            value={sit.backgroundNames}
                            onChange={(e) => handleUpdateSituation(sit.id, "backgroundNames", e.target.value)}
                            placeholder="E.g., Kitchen_Day, LivingRoom_Night"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono resize-y min-h-[50px]"
                          />

                          {/* Warning System for Backgrounds */}
                          {(() => {
                            const currentList = sit.backgroundNames
                              ? sit.backgroundNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                              : [];
                            
                            const unmatched = currentList.filter(loc => {
                              return !project.backgrounds.some(b => b.location.toLowerCase() === loc.toLowerCase());
                            });

                            if (unmatched.length > 0) {
                              return (
                                <div className="space-y-1.5">
                                  {unmatched.map((loc, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-2 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                      <div className="flex items-center gap-1.5 overflow-hidden">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                                        <span className="truncate">Chưa có bối cảnh: <strong className="font-mono">{loc}</strong></span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleAddOfficialBackground(loc)}
                                        className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded text-[8px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                                        title="Thêm bối cảnh này vào danh sách chính thức"
                                      >
                                        <Plus className="w-2.5 h-2.5" /> Thêm
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Interactive Background Chips */}
                          {project.backgrounds && project.backgrounds.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 max-h-[120px] overflow-y-auto pr-1 select-none">
                              {project.backgrounds.map((bg, bIdx) => {
                                const currentList = sit.backgroundNames
                                  ? sit.backgroundNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                                  : [];
                                const isActive = currentList.some(loc => loc.toLowerCase() === bg.location.toLowerCase());
                                
                                return (
                                  <button
                                    key={bIdx}
                                    type="button"
                                    onClick={() => toggleBackgroundInSituation(sit.id, bg.location, sit.backgroundNames)}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer border",
                                      isActive
                                        ? "bg-teal-500/10 border-teal-500/40 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                                        : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.05]"
                                    )}
                                  >
                                    {bg.imageUrl ? (
                                      <img
                                        src={bg.imageUrl}
                                        alt={bg.location}
                                        className="w-3.5 h-3.5 rounded-sm object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-sm bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        BG
                                      </div>
                                    )}
                                    <span>{bg.location}</span>
                                    {isActive && <Check className="w-2.5 h-2.5 ml-0.5 text-teal-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-2">
                          <textarea
                            value={sit.propNames || ""}
                            onChange={(e) => handleUpdateSituation(sit.id, "propNames", e.target.value)}
                            placeholder="E.g., Diary, Letter"
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono resize-y min-h-[50px]"
                          />

                          {/* Warning System for Props */}
                          {(() => {
                            const currentList = sit.propNames
                              ? sit.propNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                              : [];
                            
                            const unmatched = currentList.filter(name => {
                              return !project.props?.some(p => p.name.toLowerCase() === name.toLowerCase());
                            });

                            if (unmatched.length > 0) {
                              return (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                                  <span>
                                    Không khớp đạo cụ chính thức: {unmatched.join(', ')}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Interactive Prop Chips */}
                          {project.props && project.props.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 max-h-[120px] overflow-y-auto pr-1 select-none">
                              {project.props.map((prop, pIdx) => {
                                const currentList = sit.propNames
                                  ? sit.propNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
                                  : [];
                                const isActive = currentList.some(name => name.toLowerCase() === prop.name.toLowerCase());
                                
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => togglePropInSituation(sit.id, prop.name, sit.propNames || "")}
                                    className={cn(
                                      "flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all hover:scale-105 active:scale-95 cursor-pointer border",
                                      isActive
                                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.15)]"
                                        : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.05]"
                                    )}
                                  >
                                    {prop.imageUrl ? (
                                      <img
                                        src={prop.imageUrl}
                                        alt={prop.name}
                                        className="w-3.5 h-3.5 rounded-sm object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-sm bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        PROP
                                      </div>
                                    )}
                                    <span>{prop.name}</span>
                                    {isActive && <Check className="w-2.5 h-2.5 ml-0.5 text-indigo-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteSituation(sit.id)}
                          className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 p-2.5 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Action button */}
          {project.situations && project.situations.length > 0 && (
            <div className="pt-4 flex flex-col items-center">
              <button
                disabled={isGenerating || isWritingShots}
                onClick={generateCinematicShots}
                className={cn(
                  "w-full max-w-xl h-14 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-2xl cursor-pointer",
                  "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/20"
                )}
              >
                {isWritingShots ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin text-white" />
                    <span>Đang Viết Prompts Phân Cảnh (Giai Đoạn 2)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
                    <span>2. Xác Nhận & Sinh Prompt Chi Tiết</span>
                  </>
                )}
              </button>
              <p className="mt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">
                AI SẼ DỰA TRÊN THÔNG TIN KIỂM DUYỆT ĐỂ BẮT ĐẦU PHÂN TÍCH PROMPT CHI TIẾT CHO TỪNG PHÂN CẢNH
              </p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-8 gap-4">
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">PRODUCTION TIMELINE</h2>
              <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">Cinematic Shot Assembly & VEO Directives</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSituationsModal(!showSituationsModal)}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border cursor-pointer",
                  showSituationsModal 
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-white/10 text-zinc-300 hover:text-white"
                )}
              >
                <Eye className="w-3.5 h-3.5" /> {showSituationsModal ? "Ẩn Bản Đồ Tình Huống" : "Xem Bản Đồ Tình Huống"}
              </button>

              <button
                onClick={handleLockAndReconfigure}
                className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5" /> Khóa & Cấu Hình Lại
              </button>
            </div>
          </div>

          {showSituationsModal && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 font-heading">
                  BẢN ĐỒ TÌNH HUỐNG TRUYỆN (READ-ONLY)
                </h3>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                  ĐÃ DUYỆT & ĐANG ÁP DỤNG CHO PROMPTS
                </span>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-white/5">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-12">STT</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-32">Mốc Thời Gian</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-40">Địa Điểm</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold">Mô Tả Tóm Tắt Tình Huống</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-48">Nhân Vật</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-48">Bối Cảnh Tham Chiếu</th>
                      <th className="py-3 px-4 font-mono text-[9px] uppercase tracking-widest text-zinc-500 font-bold w-48">Đạo Cụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300 font-medium font-sans">
                    {project.situations.map((sit, index) => (
                      <tr key={sit.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500">{index + 1}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{sit.timeRange}</td>
                        <td className="py-3 px-4 text-zinc-300">{sit.location}</td>
                        <td className="py-3 px-4 text-zinc-400 leading-relaxed">{sit.summary}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {sit.characterNames ? (
                              sit.characterNames.split(',').map(s => s.trim()).filter(s => s.length > 0).map((name, cIdx) => {
                                const char = project.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
                                const isMatched = !!char;
                                
                                return (
                                  <span
                                    key={cIdx}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono border select-none",
                                      isMatched
                                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    )}
                                  >
                                    {isMatched && char.imageUrl ? (
                                      <img
                                        src={char.imageUrl}
                                        alt={name}
                                        className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        {isMatched ? name.charAt(0) : "?"}
                                      </div>
                                    )}
                                    <span>{name}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {sit.backgroundNames ? (
                              sit.backgroundNames.split(',').map(s => s.trim()).filter(s => s.length > 0).map((loc, bIdx) => {
                                const bg = project.backgrounds.find(b => b.location.toLowerCase() === loc.toLowerCase());
                                const isMatched = !!bg;
                                
                                return (
                                  <span
                                    key={bIdx}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono border select-none",
                                      isMatched
                                        ? "bg-teal-500/10 border-teal-500/20 text-teal-300"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    )}
                                  >
                                    {isMatched && bg.imageUrl ? (
                                      <img
                                        src={bg.imageUrl}
                                        alt={loc}
                                        className="w-3.5 h-3.5 rounded-sm object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-sm bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        BG
                                      </div>
                                    )}
                                    <span>{loc}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {sit.propNames ? (
                              sit.propNames.split(',').map(s => s.trim()).filter(s => s.length > 0).map((name, pIdx) => {
                                const prop = project.props?.find(p => p.name.toLowerCase() === name.toLowerCase());
                                const isMatched = !!prop;
                                
                                return (
                                  <span
                                    key={pIdx}
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono border select-none",
                                      isMatched
                                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-300"
                                        : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                    )}
                                  >
                                    {isMatched && prop.imageUrl ? (
                                      <img
                                        src={prop.imageUrl}
                                        alt={name}
                                        className="w-3.5 h-3.5 rounded-sm object-cover border border-white/20"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-sm bg-zinc-800 flex items-center justify-center text-[7px] border border-white/20 font-sans font-bold">
                                        PROP
                                      </div>
                                    )}
                                    <span>{name}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Batch Action Panel for Videos */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-300 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={eligibleShotsCount > 0 && selectedShotsCount === eligibleShotsCount}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedShotsCount > 0 && selectedShotsCount < eligibleShotsCount;
                    }
                  }}
                  onChange={(e) => handleSelectAllShots(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                />
                Chọn tất cả
              </label>
              <span className="text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                Đã chọn: <span className="text-indigo-400 font-bold">{selectedShotsCount}</span> / {project.shots.length} phân cảnh
              </span>

              <div className="flex items-center gap-2 border-l border-white/10 pl-4 h-6">
                <span className="text-[10px] font-mono font-bold text-emerald-400">Tự động tải video khi vẽ xong:</span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoDownloadVideos(!autoDownloadVideos);
                    localStorage.setItem("ai_auto_download_videos", !autoDownloadVideos ? "true" : "false");
                  }}
                  className={cn(
                    "relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    autoDownloadVideos ? "bg-emerald-500" : "bg-zinc-800"
                  )}
                  title="Bật/Tắt tự động tải từng video về máy sau khi vẽ xong"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      autoDownloadVideos ? "translate-x-3" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleRenderAllSelectedShots}
                disabled={selectedShotsCount === 0 || isBatchRendering || isGenerating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-md shadow-indigo-600/10 cursor-pointer disabled:cursor-not-allowed"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Render All (Đã Chọn)
              </button>
              
              <button
                onClick={handleRetryFailedShots}
                disabled={isBatchRendering || isGenerating}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-amber-500" /> Retry failed
              </button>

              <button
                onClick={downloadAllSuccessVideos}
                disabled={project.shots.filter(s => s.videoUrl).length === 0 || downloadProgress !== null}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
              >
                {downloadProgress ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang tải: {downloadProgress.current} / {downloadProgress.total} video</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải Tất Cả Video ({project.shots.filter(s => s.videoUrl).length})</span>
                  </>
                )}
              </button>

              <button
                onClick={handleStopBatchRendering}
                disabled={!isBatchRendering}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-30 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <StopCircle className="w-3.5 h-3.5" /> Dừng
              </button>
            </div>
          </div>

          {/* Video Status Filter Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-4 pt-2 gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Lọc trạng thái:</span>
              <div className="flex flex-wrap items-center bg-black/40 border border-white/5 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setVideoStatusFilter('all')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                    videoStatusFilter === 'all'
                      ? "bg-white/5 text-white border border-white/10"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Tổng ({project.shots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVideoStatusFilter('success')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    videoStatusFilter === 'success'
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "text-zinc-500 hover:text-emerald-500/50"
                  )}
                >
                  <CheckCircle2 className="w-3 h-3" /> Thành công ({project.shots.filter(s => s.videoUrl).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVideoStatusFilter('unrendered')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    videoStatusFilter === 'unrendered'
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      : "text-zinc-500 hover:text-amber-500/50"
                  )}
                >
                  Chưa có video ({project.shots.filter(s => !s.videoUrl).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVideoStatusFilter('error')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    videoStatusFilter === 'error'
                      ? "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      : "text-zinc-500 hover:text-rose-500/50"
                  )}
                >
                  <AlertCircle className="w-3 h-3" /> Lỗi ({
                    project.shots.filter((s, i) => {
                      const statusKey = `video_${i}`;
                      return (s.videoError || generationErrors[statusKey]) && !s.videoUrl && !generatingVideos[i];
                    }).length
                  })
                </button>
                <button
                  type="button"
                  onClick={() => setVideoStatusFilter('pending')}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5",
                    videoStatusFilter === 'pending'
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                      : "text-zinc-500 hover:text-indigo-500/50"
                  )}
                >
                  <RotateCcw className={cn("w-3 h-3", Object.values(generatingVideos).some(Boolean) && "animate-spin")} /> Đang chờ ({
                    Object.values(generatingVideos).filter(Boolean).length
                  })
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Premium Auto-download Toggle Switch */}
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-3 py-1.5 rounded-xl">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Tự động tải (VEO):</span>
                <button
                  type="button"
                  onClick={() => {
                    setAutoDownloadVideos(!autoDownloadVideos);
                    localStorage.setItem("ai_auto_download_videos", !autoDownloadVideos ? "true" : "false");
                  }}
                  className={cn(
                    "relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    autoDownloadVideos ? "bg-emerald-500" : "bg-zinc-800"
                  )}
                  title="Bật/Tắt tự động tải từng video về máy sau khi vẽ xong"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      autoDownloadVideos ? "translate-x-3" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Small informative stats */}
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Hiển thị: <span className="text-zinc-300 font-bold font-mono">{filteredShots.length}</span> phân cảnh
              </div>
            </div>
          </div>

          {/* Top Pagination Controls */}
          <div className="mb-4">
            {renderPagination(false)}
          </div>

          <div className="space-y-3">
            {paginatedShots.map(({ shot, index: idx }, pageIdx) => {
              const detected = detectCharacters(shot.prompt, project.characters);
              const defaultChars = detected.join(", ") || shot.character;

              const matchedChars = getMatchedCharacters(shot, project.characters);
              const matchedBgs = getMatchedBackgrounds(shot, project.backgrounds);
              const customRefs = shot.referenceImages || [];
              const hasRef = customRefs.length > 0 || matchedChars.length > 0 || matchedBgs.length > 0;

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: pageIdx * 0.02 }}
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-500"></div>
                  <div className="relative bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all duration-300">
                    {/* Header bar inside the card showing reference images */}
                    <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-white/[0.01] border-b border-white/5 overflow-x-auto custom-scrollbar">
                      <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold shrink-0">
                          Ảnh tham chiếu:
                        </span>
                        <div className="flex items-center gap-2">
                          {customRefs.length > 0 ? (
                            customRefs.map((ref, refIdx) => (
                              <div 
                                key={`custom-ref-${refIdx}`}
                                className="group/ref relative flex items-center gap-1.5 px-2 py-1 bg-indigo-500/5 border border-indigo-500/10 hover:border-indigo-500/30 rounded-lg transition-all duration-300 shrink-0"
                              >
                                <img 
                                  src={ref.url} 
                                  alt={`Tham chiếu #${refIdx + 1}`}
                                  className="w-8 h-8 rounded-md object-cover border border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-white leading-none">Tham chiếu #{refIdx + 1}</span>
                                  <span className="text-[7px] text-indigo-400 font-mono tracking-tighter leading-none mt-0.5">Tùy biến</span>
                                </div>

                                {/* Hover overlay with action buttons */}
                                <div className="absolute inset-0 bg-black/90 backdrop-blur-xs rounded-lg flex items-center justify-center gap-1 opacity-0 group-hover/ref:opacity-100 transition-opacity duration-200">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setZoomedImageUrl(ref.url);
                                      setZoomedImageName(`ref_image_${idx + 1}_${refIdx + 1}.jpg`);
                                    }}
                                    className="p-1 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                                    title="Phóng to"
                                  >
                                    <ZoomIn className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setImageSelectorTarget({ type: 'shot', index: idx, refIndex: refIdx })}
                                    className="p-1 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                                    title="Thay thế từ thư viện"
                                  >
                                    <FolderOpen className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFileUploadTarget({ type: 'shot', index: idx, refIndex: refIdx });
                                      setTimeout(() => refFileInputRef.current?.click(), 50);
                                    }}
                                    className="p-1 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                                    title="Tải từ máy"
                                  >
                                    <Upload className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReferenceImage('shot', idx, refIdx)}
                                    className="p-1 bg-white/10 hover:bg-rose-600 text-white rounded transition-all cursor-pointer"
                                    title="Xóa"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : null}
                          
                          {/* Fallback to auto-detected matched characters and backgrounds */}
                          {customRefs.length === 0 && matchedChars.length === 0 && matchedBgs.length === 0 && (
                            <span className="text-[9px] font-mono text-zinc-600 italic">
                              Chưa có ảnh tham chiếu
                            </span>
                          )}
                          
                          {matchedChars.map((char, cIdx) => (
                            <div 
                              key={`ref-char-${cIdx}`}
                              className="group/ref relative flex items-center gap-1.5 px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/30 rounded-lg transition-all duration-300 shrink-0 select-none"
                              title={`Tự động: ${char.name}`}
                            >
                              <img 
                                src={char.imageUrl} 
                                alt={char.name}
                                className="w-6 h-6 rounded-md object-cover border border-white/10"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-white leading-none">{char.name}</span>
                                <span className="text-[7px] text-indigo-400 font-mono tracking-tighter leading-none mt-0.5">Tự động NV</span>
                              </div>
                            </div>
                          ))}
                          {matchedBgs.map((bg, bIdx) => (
                            <div 
                              key={`ref-bg-${bIdx}`}
                              className="group/ref relative flex items-center gap-1.5 px-2 py-1 bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/10 hover:border-violet-500/30 rounded-lg transition-all duration-300 shrink-0 select-none"
                              title={`Tự động: ${bg.location}`}
                            >
                              <img 
                                src={bg.imageUrl} 
                                alt={bg.location}
                                className="w-6 h-6 rounded-md object-cover border border-white/10"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-white leading-none truncate max-w-[80px]">{bg.location}</span>
                                <span className="text-[7px] text-violet-400 font-mono tracking-tighter leading-none mt-0.5">Tự động BC</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add buttons side-by-side if customRefs < 10 */}
                      {customRefs.length < 10 && (
                        <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-white/5">
                          <button
                            type="button"
                            onClick={() => setImageSelectorTarget({ type: 'shot', index: idx })}
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-lg text-[8px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" /> Thư viện
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFileUploadTarget({ type: 'shot', index: idx });
                              setTimeout(() => refFileInputRef.current?.click(), 50);
                            }}
                            className="px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 hover:text-violet-300 rounded-lg text-[8px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-2.5 h-2.5" /> Tải từ máy
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch min-h-[8rem]">
                      {/* 1. STT & Checkbox */}
                      <div className="w-20 border-r border-white/10 flex flex-col items-center justify-center gap-3 bg-black/40 font-mono text-zinc-400 font-extrabold text-[12px] p-4 text-center">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            disabled={!hasRef}
                            checked={!!selectedShots[idx] && hasRef}
                            onChange={(e) => setSelectedShots(prev => ({ ...prev, [idx]: e.target.checked }))}
                            className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!hasRef ? "Chưa có ảnh tham chiếu" : "Chọn phân cảnh để Render"}
                          />
                          <span>{(idx + 1).toString().padStart(2, '0')}</span>
                        </div>
                        <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded tracking-tighter font-black">{shot.time}</span>
                      </div>

                      {/* 2. CHARACTERS */}
                      <div className="w-52 border-r border-white/10 p-5 flex flex-col justify-center bg-black/10 gap-2 shrink-0">
                        <span className="text-[8px] font-mono text-indigo-400 font-extrabold uppercase tracking-widest block leading-none">Nhân Vật (Characters)</span>
                        <input
                          type="text"
                          value={shot.character}
                          onChange={(e) => {
                            setProject(prev => {
                              if (!prev) return prev;
                              const newShots = [...prev.shots];
                              newShots[idx] = { ...newShots[idx], character: e.target.value };
                              return { ...prev, shots: newShots };
                            });
                          }}
                          className="w-full bg-black/40 text-xs font-bold text-white border border-white/5 rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500/30 transition-all break-words whitespace-normal overflow-wrap-anywhere"
                          placeholder="Tên nhân vật..."
                        />
                        <span className="text-[8px] font-mono text-zinc-500 font-bold block break-words whitespace-normal overflow-wrap-anywhere">Gợi ý: {defaultChars}</span>
                      </div>

                      {/* 3. DESCRIPTION */}
                      <div className="flex-1 p-5 flex flex-col justify-center gap-2 border-r border-white/10 min-w-0">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Mô tả phân cảnh & Lời thoại</span>
                          <p className="text-[11px] text-zinc-400 italic line-clamp-1 border-l border-white/10 pl-2 mb-1 break-words">{shot.scene}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Chỉ thị hình ảnh (VEO Prompt / Description)</span>
                          <textarea
                            value={shot.prompt}
                            onChange={(e) => updateShot(idx, e.target.value)}
                            className="w-full text-[10px] font-mono p-2.5 bg-black/40 rounded-lg border border-white/5 text-zinc-300 outline-none focus:border-indigo-500/30 resize-none h-16 transition-all scrollbar-hide break-words"
                            placeholder="Nhập mô tả hình ảnh cho phân cảnh..."
                          />
                        </div>
                      </div>

                      {/* 4. VEO VIDEO GENERATOR (w-96 expanded!) */}
                      <div className="w-96 border-l border-white/10 p-5 flex flex-col justify-center bg-black/40 gap-3 relative overflow-hidden group/vid shrink-0">
                        {generatingVideos[idx] ? (
                          /* STATE 1: LOADING */
                          <div className="w-full h-28 rounded-xl bg-indigo-500/[0.02] border border-indigo-500/20 flex flex-col items-center justify-center gap-2 px-3 text-center animate-pulse relative overflow-hidden">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 blur opacity-50" />
                            <RotateCcw className="w-5 h-5 animate-spin text-indigo-400 relative z-10" />
                            <span className="text-[9px] font-mono font-bold text-indigo-300 uppercase tracking-wider relative z-10 block leading-tight break-words max-w-full">
                              {generationStatuses[`video_${idx}`] || "ĐANG DỰNG VEO..."}
                            </span>
                          </div>
                        ) : shot.videoUrl ? (
                          /* STATE 2: COMPLETED */
                          <div className="relative w-full h-28 rounded-xl overflow-hidden border border-white/10 bg-black/60 group/play shadow-lg shadow-black/40">
                            <video 
                              src={shot.videoUrl} 
                              playsInline 
                              loop 
                              muted 
                              autoPlay
                              className="w-full h-full object-cover" 
                            />
                            
                            {/* Status Badge overlay (top-left) */}
                            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/90 backdrop-blur-md rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-emerald-400/20">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                              <span className="text-[7px] font-mono font-black text-white uppercase tracking-widest">Done</span>
                            </div>

                            {/* Glassmorphic Hover Action Overlay */}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-3.5 opacity-0 group-hover/play:opacity-100 transition-opacity duration-300 z-10">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveZoomedShotIndex(idx);
                                  setZoomedPrompt(shot.prompt || "");
                                }}
                                className="p-2.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                                title="Xem phóng to phân cảnh"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => generateVideo(idx)}
                                disabled={isImageGenerating || isGenerating || !hasRef}
                                className="p-2.5 bg-white/10 hover:bg-rose-600 border border-white/10 hover:border-rose-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Tạo lại video này (Recreate)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadSingleVideo(idx)}
                                className="p-2.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                                title="Tải video xuống"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (shot.videoError || generationErrors[`video_${idx}`]) ? (
                          /* STATE 3: ERROR */
                          <div className="w-full min-h-[7rem] p-3 rounded-xl bg-rose-500/[0.02] border border-rose-500/20 flex flex-col gap-2 justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-rose-400">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-wider font-mono">Lỗi Dựng Video</span>
                              </div>
                              <div className="p-1.5 bg-black/50 rounded-lg max-h-[4rem] overflow-y-auto custom-scrollbar border border-white/5">
                                <p className="text-[8px] font-mono text-zinc-500 leading-normal break-all">{shot.videoError || generationErrors[`video_${idx}`]}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => generateVideo(idx)}
                              disabled={!hasRef}
                              className="w-full py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 hover:text-rose-300 rounded-lg text-[8px] font-mono font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <RotateCcw className="w-3 h-3" /> Thử lại
                            </button>
                          </div>
                        ) : (
                          /* STATE 4: INITIAL */
                          <div className="w-full h-28 flex flex-col items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => generateVideo(idx)}
                              disabled={isImageGenerating || isGenerating || !hasRef}
                              className="w-full h-11 bg-gradient-to-r from-indigo-600/90 to-violet-600/90 hover:from-indigo-600 hover:to-violet-600 border border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                            >
                              <PlayCircle className="w-4 h-4 text-indigo-300" /> Tạo Video Veo
                            </button>
                            <span className={`text-[8px] font-mono font-bold uppercase tracking-wider text-center leading-normal ${hasRef ? "text-zinc-500" : "text-rose-400/80 animate-pulse"}`}>
                              {hasRef ? "Có ảnh tham chiếu (I2V)" : "Chưa có ảnh tham chiếu (Bị Khóa)"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Pagination Controls */}
          <div className="mt-6">
            {renderPagination(true)}
          </div>
        </>
      )}

      {/* Immersive Storyboard Lightbox Modal */}
      <AnimatePresence>
        {activeZoomedShotIndex !== null && project && project.shots[activeZoomedShotIndex] && (() => {
          const idx = activeZoomedShotIndex;
          const shot = project.shots[idx];
          const rangeText = shot.range ? shot.range : `Dòng ${idx + 1}`;
          
          let statusText = "Chưa tạo";
          let statusBadgeColor = "bg-zinc-800 text-zinc-500 border-zinc-700/50";
          let statusIcon = <AlertCircle className="w-2.5 h-2.5" />;
          
          if (shot.videoUrl) {
            statusText = "Thành công";
            statusBadgeColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
            statusIcon = <CheckCircle2 className="w-2.5 h-2.5" />;
          } else if (generatingVideos[idx]) {
            statusText = "Đang tạo...";
            statusBadgeColor = "bg-indigo-500/10 border-indigo-500/20 text-indigo-400";
            statusIcon = <RotateCcw className="w-2.5 h-2.5 animate-spin" />;
          } else if (shot.videoError || generationErrors[`video_${idx}`]) {
            statusText = "Lỗi";
            statusBadgeColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
            statusIcon = <AlertCircle className="w-2.5 h-2.5" />;
          }

          const matchedChars = getMatchedCharacters(shot, project.characters);
          const matchedBgs = getMatchedBackgrounds(shot, project.backgrounds);
          const customRefs = shot.referenceImages || [];
          const hasRef = customRefs.length > 0 || matchedChars.length > 0 || matchedBgs.length > 0;

          const handlePrev = () => {
            if (idx > 0) {
              setActiveZoomedShotIndex(idx - 1);
              setZoomedPrompt(project.shots[idx - 1].prompt || "");
            } else {
              const lastIdx = project.shots.length - 1;
              setActiveZoomedShotIndex(lastIdx);
              setZoomedPrompt(project.shots[lastIdx].prompt || "");
            }
          };

          const handleNext = () => {
            if (idx < project.shots.length - 1) {
              setActiveZoomedShotIndex(idx + 1);
              setZoomedPrompt(project.shots[idx + 1].prompt || "");
            } else {
              setActiveZoomedShotIndex(0);
              setZoomedPrompt(project.shots[0].prompt || "");
            }
          };

          const handleSavePromptOnly = () => {
            updateShot(idx, zoomedPrompt);
            setSystemLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] 💾 Đã lưu prompt mới cho phân cảnh #${idx + 1}`
            ]);
            alert("Đã lưu prompt phân cảnh thành công!");
          };

          const handleSaveAndRecreate = () => {
            updateShot(idx, zoomedPrompt);
            generateVideo(idx, zoomedPrompt);
            setSystemLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] 🚀 Khởi chạy dựng lại video cho phân cảnh #${idx + 1}...`
            ]);
          };

          const handleCopyPrompt = () => {
            navigator.clipboard.writeText(zoomedPrompt);
            setSystemLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] 📋 Đã copy prompt phân cảnh #${idx + 1} vào clipboard.`
            ]);
            alert("Đã copy prompt vào clipboard!");
          };

          const handleDownloadMedia = () => {
            if (shot.videoUrl) {
              downloadSingleVideo(idx);
            } else if (shot.imageUrl) {
              downloadSingleImage(shot.imageUrl, `${scriptName || 'shot'}_image_${idx + 1}.jpg`);
            } else {
              alert("Phân cảnh này chưa có video hoặc hình ảnh để tải về.");
            }
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#020203]/98 backdrop-blur-xl z-[150] flex flex-col justify-between p-6 select-none animate-fade-in"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wider uppercase text-white font-heading">
                      Xem tất cả - {rangeText} - Ô 1
                    </h3>
                  </div>
                </div>

                {/* Center pagination */}
                <div className="text-[12px] font-mono font-bold text-zinc-400 px-4 py-1.5 bg-white/5 border border-white/5 rounded-xl">
                  {idx + 1} / {project.shots.length}
                </div>

                <button
                  onClick={() => setActiveZoomedShotIndex(null)}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Media Body */}
              <div className="flex-1 flex items-center justify-between py-6 min-h-0 relative">
                {/* Left navigation arrow */}
                <button
                  onClick={handlePrev}
                  className="w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-indigo-600 border border-white/10 text-white rounded-full transition-all cursor-pointer shrink-0 z-20 hover:scale-105 active:scale-95"
                  title="Phân cảnh trước (◀)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Media Container */}
                <div className="flex-1 flex items-center justify-center px-8 h-full max-h-[55vh] min-h-0 relative">
                  <div className="relative max-h-full max-w-full rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center aspect-video">
                    {shot.videoUrl ? (
                      <video 
                        src={shot.videoUrl} 
                        playsInline 
                        loop 
                        autoPlay 
                        muted 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : shot.imageUrl ? (
                      <img 
                        src={shot.imageUrl} 
                        alt={`Khung hình #${idx + 1}`} 
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-zinc-600 gap-3 text-center">
                        <ImageIcon className="w-16 h-16 opacity-20" />
                        <span className="text-[10px] font-mono uppercase tracking-widest leading-relaxed">
                          Chưa tạo hình ảnh hoặc video cho phân cảnh này
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right navigation arrow */}
                <button
                  onClick={handleNext}
                  className="w-12 h-12 flex items-center justify-center bg-black/40 hover:bg-indigo-600 border border-white/10 text-white rounded-full transition-all cursor-pointer shrink-0 z-20 hover:scale-105 active:scale-95"
                  title="Phân cảnh tiếp theo (▶)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Bottom Control Panel */}
              <div className="max-w-4xl w-full mx-auto bg-[#0a0a0c]/90 border border-white/5 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col gap-3 flex-shrink-0">
                {/* Row 1: Prompt Title, Status, Action Buttons */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-extrabold">
                      PROMPT {rangeText.toUpperCase()}:
                    </span>
                    <div className={`px-2.5 py-0.5 border rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 ${statusBadgeColor}`}>
                      {statusIcon}
                      {statusText}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyPrompt}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      title="Copy prompt vào Clipboard"
                    >
                      <Copy className="w-3 h-3" /> Sao chép
                    </button>
                    
                    <button
                      onClick={handleDownloadMedia}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 hover:text-amber-300 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      title="Tải xuống tệp đa phương tiện"
                    >
                      <Download className="w-3 h-3" /> Tải Về
                    </button>

                    <button
                      onClick={handleSavePromptOnly}
                      className="px-2.5 py-1 bg-[#18181b] hover:bg-zinc-800 border border-zinc-700/50 text-zinc-300 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                      title="Lưu prompt lại vào kịch bản"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu Prompt
                    </button>

                    <button
                      id="zoomed-save-run-btn"
                      onClick={handleSaveAndRecreate}
                      disabled={isImageGenerating || isGenerating || !hasRef}
                      className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Lưu prompt & dựng lại video lập tức (Ctrl + Enter)"
                    >
                      <Play className="w-3 h-3 fill-current" /> Lưu & Chạy Lại
                    </button>
                  </div>
                </div>

                {/* Row 2: Prompt Textarea */}
                <div className="relative">
                  <textarea
                    value={zoomedPrompt}
                    onChange={(e) => setZoomedPrompt(e.target.value)}
                    className="w-full text-[11px] font-mono p-3 bg-black/60 rounded-xl border border-white/5 text-zinc-100 outline-none focus:border-indigo-500/30 resize-none h-20 transition-all scrollbar-hide font-sans leading-relaxed"
                    placeholder="Nhập prompt hoặc mô tả phân cảnh bằng Tiếng Việt hoặc Tiếng Anh..."
                  />
                </div>

                {/* Row 3: Shortcuts Tip */}
                <div className="flex items-center justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest pt-1">
                  <span>Ctrl + Enter: Lưu & Chạy nhanh</span>
                  <span>◀ ▶: Chuyển tiếp | Esc: Đóng</span>
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
