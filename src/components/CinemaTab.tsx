import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Play, Pause, Volume2, VolumeX, Download, Film, RotateCcw,
  AlertCircle, CheckCircle2, ListVideo, Sparkles, MonitorPlay,
  Scissors, Loader2, ChevronRight, RefreshCw, ExternalLink,
  Cpu, Music, User, HelpCircle
} from "lucide-react";
import { ProjectData, Shot, SRTBlock, BgmSuggestion } from "../types";
import { useProjectStore } from "../store/useProjectStore";
import { splitLongSubtitleBlock, containsCjk, formatSecondsToSrtTime, getSplitSubDuration } from "../utils/parsers";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CinemaTabProps {
  project: ProjectData;
  srtData: SRTBlock[];
  handleSrtChange: (text: string) => void;
  systemLogs: string[];
  setSystemLogs: React.Dispatch<React.SetStateAction<string[]>>;
  generatingVideos?: Record<number, boolean>;
  generateVideo?: (index: number, customPrompt?: string) => void;
  isGenerating?: boolean;
  selectedDirectoryHandle?: any;
  apiKey?: string;
  selectedModel?: string;
  apiBaseUrl?: string;
  setProject?: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  projectPath?: string;
}

const parseTimeToSeconds = (timeStr: string): number => {
  try {
    const cleaned = timeStr.replace(",", ".");
    const parts = cleaned.split(":");
    if (parts.length < 3) return 0;
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } catch (e) {
    return 0;
  }
};

const parseTimeRangeToSeconds = (rangeStr: string): { start: number; end: number } => {
  try {
    const parts = rangeStr.split("-").map(p => p.trim());
    if (parts.length < 2) return { start: 0, end: 99999 };
    
    const parsePart = (t: string): number => {
      if (t.includes(":")) {
        const tParts = t.split(":");
        if (tParts.length === 2) {
          return parseFloat(tParts[0]) * 60 + parseFloat(tParts[1]);
        } else if (tParts.length === 3) {
          return parseFloat(tParts[0]) * 3600 + parseFloat(tParts[1]) * 60 + parseFloat(tParts[2]);
        }
      }
      return parseFloat(t);
    };

    return {
      start: parsePart(parts[0]),
      end: parsePart(parts[1])
    };
  } catch (e) {
    return { start: 0, end: 99999 };
  }
};

const wrapTextClient = (text: string, maxLen: number): string => {
  if (!text || text.length <= maxLen) return text;
  const containsCjk = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text);
  if (containsCjk) {
    const lines = [];
    for (let i = 0; i < text.length; i += maxLen) {
      lines.push(text.slice(i, i + maxLen));
    }
    return lines.join("\n");
  }
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxLen) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.join("\n");
};

const getAudioPosition = (
  activeBlock: SRTBlock,
  masterTime: number,
  totalDur: number,
  srtBlocks: SRTBlock[]
): number => {
  const activeId = parseInt(activeBlock.index, 10);
  if (isNaN(activeId)) return 0;
  const origId = activeId >= 1000 ? Math.floor(activeId / 1000) : activeId;

  // Filter parts with the same origId, sorted by index ascending
  const parts = srtBlocks
    .filter(b => {
      const bId = parseInt(b.index, 10);
      return !isNaN(bId) && (bId >= 1000 ? Math.floor(bId / 1000) : bId) === origId;
    })
    .sort((a, b) => a.index.localeCompare(b.index, undefined, { numeric: true, sensitivity: 'base' }));

  const totalChars = parts.reduce((sum, p) => sum + p.text.length, 0);
  if (totalChars === 0) return 0;

  // Find preceding duration in audio
  let precedingAudioDur = 0;
  for (const part of parts) {
    if (part.index === activeBlock.index) {
      break;
    }
    precedingAudioDur += getSplitSubDuration(part, totalDur, srtBlocks);
  }

  // Calculate position within active block
  const timeParts = activeBlock.time.split("-->").map(p => p.trim());
  const startSec = timeParts.length > 0 ? parseTimeToSeconds(timeParts[0]) : 0;
  const endSec = timeParts.length > 1 ? parseTimeToSeconds(timeParts[1]) : startSec + 4;
  const blockTimelineDur = Math.max(0.1, endSec - startSec);
  
  const elapsedInBlock = Math.max(0, masterTime - startSec);
  const ratio = Math.min(1, elapsedInBlock / blockTimelineDur);
  const activeAudioDur = getSplitSubDuration(activeBlock, totalDur, srtBlocks);

  return precedingAudioDur + ratio * activeAudioDur;
};

const getCssFontFamily = (familyKey: string) => {
  switch (familyKey) {
    case 'msgothic':
      return 'MS Gothic, "ＭＳ ゴシック", sans-serif';
    case 'meiryo':
      return 'Meiryo, "メイリオ", sans-serif';
    case 'msmincho':
      return 'MS Mincho, "ＭＳ 明朝", serif';
    case 'yugothic':
      return 'Yu Gothic, "游ゴシック", YuGothic, sans-serif';
    case 'yumin':
      return 'Yu Mincho, "游明朝", YuMincho, serif';
    case 'bizudgothic':
      return '"BIZ UDGothic", "BIZ UDゴシック", sans-serif';
    case 'bizudmincho':
      return '"BIZ UDMincho", "BIZ UD明朝", serif';
    case 'togegothic':
      return '"TogeGothic", "とげゴシック-Bd", "とげゴシック", sans-serif';
    default:
      return familyKey; // sans-serif, serif, monospace, cursive
  }
};

export const CinemaTab: React.FC<CinemaTabProps> = ({
  project,
  srtData,
  handleSrtChange,
  systemLogs = [],
  setSystemLogs,
  generatingVideos = {},
  generateVideo,
  isGenerating = false,
  selectedDirectoryHandle,
  apiKey = "",
  selectedModel = "gemini-2.5-flash",
  apiBaseUrl = "http://127.0.0.1:5000",
  setProject,
  projectPath = ""
}) => {
  const [currentPlayIndex, setCurrentPlayIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(100);
  
  // Sub-tab switching in the right panel
  const [rightSubTab, setRightSubTab] = useState<"playlist" | "bgm">("playlist");

  // Voice & BGM Preloading/Cache
  const [voiceBlobUrls, setVoiceBlobUrls] = useState<Record<string, string>>({});
  const [bgmBlobUrls, setBgmBlobUrls] = useState<Record<string, string>>({});
  const [isPreloadingVoice, setIsPreloadingVoice] = useState(false);
  
  // Render / Stitching state
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatus, setRenderStatus] = useState<string>("");
  const [renderedBlobUrl, setRenderedBlobUrl] = useState<string | null>(null);

  // Export UI states
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportVideoType, setExportVideoType] = useState<"mixed" | "images_only" | "videos_only">("mixed");
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [isExportFullscreen, setIsExportFullscreen] = useState<boolean>(false);
  const [hasIntroVideo, setHasIntroVideo] = useState<boolean>(false);
  const [hasOutroVideo, setHasOutroVideo] = useState<boolean>(false);

  const scanIntroOutro = async () => {
    const isElectron = !!(window as any).electronAPI;
    if (isElectron && projectPath) {
      try {
        const introRes = await (window as any).electronAPI.listFiles(`${projectPath}/intro`);
        if (introRes && introRes.success && introRes.files) {
          const videos = introRes.files.filter((name: string) => {
            const ext = name.split('.').pop()?.toLowerCase() || "";
            return ['mp4', 'avi', 'mov', 'webm'].includes(ext);
          });
          setHasIntroVideo(videos.length > 0);
        } else {
          setHasIntroVideo(false);
        }
      } catch (err) {
        setHasIntroVideo(false);
      }

      try {
        const outroRes = await (window as any).electronAPI.listFiles(`${projectPath}/outro`);
        if (outroRes && outroRes.success && outroRes.files) {
          const videos = outroRes.files.filter((name: string) => {
            const ext = name.split('.').pop()?.toLowerCase() || "";
            return ['mp4', 'avi', 'mov', 'webm'].includes(ext);
          });
          setHasOutroVideo(videos.length > 0);
        } else {
          setHasOutroVideo(false);
        }
      } catch (err) {
        setHasOutroVideo(false);
      }
    }
  };

  const [validationStatus, setValidationStatus] = useState<{
    checked: boolean;
    success: boolean;
    errorMsg: string;
    missingVoices?: string;
    missingScenes?: string;
    missingBgm?: string;
  }>({ checked: false, success: false, errorMsg: "" });

  const [subtitleStyle, setSubtitleStyle] = useState(() => {
    const saved = localStorage.getItem("ai_subtitle_style");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.maxWordsLimit === undefined) {
          parsed.maxWordsLimit = 7;
        }
        if (parsed.bgFullWidth === undefined) {
          parsed.bgFullWidth = false;
        }
        if (parsed.bgHeight === undefined) {
          parsed.bgHeight = 80;
        }
        if (parsed.bottomMargin === undefined) {
          parsed.bottomMargin = 24;
        }
        if (parsed.bgColor === undefined) {
          parsed.bgColor = "#000000";
        }
        return parsed;
      } catch (e) {}
    }
    return {
      fontFamily: "sans-serif",
      fontSize: 24,
      textColor: "#ffffff",
      outlineColor: "#000000",
      outlineWidth: 2,
      verticalAlign: "bottom",
      bgOpacity: 0.4,
      maxLineLength: 38,
      maxWordsLimit: 7,
      bgFullWidth: false,
      bgHeight: 80,
      bottomMargin: 24,
      bgColor: "#000000"
    };
  });

  useEffect(() => {
    localStorage.setItem("ai_subtitle_style", JSON.stringify(subtitleStyle));
  }, [subtitleStyle]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);

  const lastPlayedVoiceIdRef = useRef<string | null>(null);
  const currentBgmFileRef = useRef<string | null>(null);

  // Zustand-like Project Store hook
  const {
    bgmSuggestions,
    localBgmFiles,
    isScanning,
    isGenerating: isGeneratingBgm,
    setBgmSuggestions,
    generateBgmSuggestions,
    scanLocalBgmFiles,
    regenerateBgmPrompt
  } = useProjectStore();

  // Sync store suggestions on project load
  useEffect(() => {
    if (project && project.bgmSuggestions) {
      setBgmSuggestions(project.bgmSuggestions);
    } else {
      setBgmSuggestions([]);
    }
  }, [project]);

  // Preload Voice files from directory handle or local path (Electron)
  const preloadAllVoiceFiles = async () => {
    setIsPreloadingVoice(true);
    try {
      const isElectron = !!(window as any).electronAPI;
      if (isElectron && projectPath) {
        const voiceDir = `${projectPath}/voice`;
        const res = await (window as any).electronAPI.listFiles(voiceDir);
        if (res && res.success && res.files) {
          const files = res.files.filter((name: string) => {
            const ext = name.split('.').pop()?.toLowerCase() || "";
            return ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext);
          });
          
          // Sort files naturally
          const getNum = (name: string) => {
            const m = name.match(/(\d+)/);
            return m ? parseInt(m[1], 10) : Infinity;
          };
          files.sort((a: string, b: string) => {
            const numA = getNum(a);
            const numB = getNum(b);
            if (numA !== numB) return numA - numB;
            return a.localeCompare(b);
          });
          
          // Extract unique original IDs from srtData in order of appearance
          const uniqueOrigIds: number[] = [];
          srtData.forEach(block => {
            const idNum = parseInt(block.index, 10);
            const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
            if (!uniqueOrigIds.includes(origId)) {
              uniqueOrigIds.push(origId);
            }
          });
          
          const urls: Record<string, string> = {};
          uniqueOrigIds.forEach((origId, index) => {
            if (index < files.length) {
              const fullFilePath = `${voiceDir}/${files[index]}`;
              urls[String(origId)] = `safe-file://${fullFilePath}`;
            }
          });
          
          setVoiceBlobUrls(urls);
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🗣️ Rạp Phim: Tải & ánh xạ 1-1 thành công ${Object.keys(urls).length} tệp giọng thuyết minh (Electron).`
          ]);
        }
      } else if (selectedDirectoryHandle && typeof selectedDirectoryHandle.getDirectoryHandle === 'function') {
        const voiceDir = await selectedDirectoryHandle.getDirectoryHandle("voice", { create: false });
        const files: { name: string; file: File }[] = [];
        for await (const entry of voiceDir.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            const ext = entry.name.split('.').pop()?.toLowerCase() || "";
            if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) {
              files.push({ name: entry.name, file });
            }
          }
        }

        // Sort files naturally by digits
        const getNum = (name: string) => {
          const m = name.match(/(\d+)/);
          return m ? parseInt(m[1], 10) : Infinity;
        };
        files.sort((a, b) => {
          const numA = getNum(a.name);
          const numB = getNum(b.name);
          if (numA !== numB) return numA - numB;
          return a.name.localeCompare(b.name);
        });

        // Extract unique original IDs from srtData in order of appearance
        const uniqueOrigIds: number[] = [];
        srtData.forEach(block => {
          const idNum = parseInt(block.index, 10);
          const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
          if (!uniqueOrigIds.includes(origId)) {
            uniqueOrigIds.push(origId);
          }
        });

        // Map 1-1
        const urls: Record<string, string> = {};
        uniqueOrigIds.forEach((origId, index) => {
          if (index < files.length) {
            urls[String(origId)] = URL.createObjectURL(files[index].file);
          }
        });

        setVoiceBlobUrls(urls);
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🗣️ Rạp Phim: Tải trước & ánh xạ 1-1 thành công ${Object.keys(urls).length} tệp giọng thuyết minh.`
        ]);
      }
    } catch (err: any) {
      console.warn("Failed to preload voice files:", err);
    } finally {
      setIsPreloadingVoice(false);
    }
  };

  // Preload BGM files from directory handle or local path (Electron)
  const preloadAllBgmFiles = async () => {
    try {
      const isElectron = !!(window as any).electronAPI;
      if (isElectron && projectPath) {
        const bgmDir = `${projectPath}/bgm`;
        const res = await (window as any).electronAPI.listFiles(bgmDir);
        if (res && res.success && res.files) {
          const urls: Record<string, string> = {};
          res.files.forEach((name: string) => {
            const ext = name.split('.').pop()?.toLowerCase() || "";
            if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) {
              urls[name] = `safe-file://${bgmDir}/${name}`;
            }
          });
          setBgmBlobUrls(urls);
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🎵 Rạp Phim: Tải thành công ${Object.keys(urls).length} tệp nhạc nền BGM (Electron).`
          ]);
        }
      } else if (selectedDirectoryHandle && typeof selectedDirectoryHandle.getDirectoryHandle === 'function') {
        const bgmDir = await selectedDirectoryHandle.getDirectoryHandle("bgm", { create: false });
        const urls: Record<string, string> = {};
        for await (const entry of bgmDir.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            const ext = entry.name.split('.').pop()?.toLowerCase() || "";
            if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) {
              urls[entry.name] = URL.createObjectURL(file);
            }
          }
        }
        setBgmBlobUrls(urls);
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🎵 Rạp Phim: Tải trước thành công ${Object.keys(urls).length} tệp nhạc nền BGM.`
        ]);
      }
    } catch (err: any) {
      console.warn("Failed to preload BGM files:", err);
    }
  };

  useEffect(() => {
    if (selectedDirectoryHandle || projectPath) {
      preloadAllVoiceFiles();
      preloadAllBgmFiles();
    }
  }, [selectedDirectoryHandle, projectPath, srtData]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(voiceBlobUrls).forEach(url => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
      Object.values(bgmBlobUrls).forEach(url => {
        if (url && url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [voiceBlobUrls, bgmBlobUrls]);

  // Filter shots that have successfully generated video or have images
  const validShots = useMemo(() => {
    if (!project || !project.shots) return [];
    return project.shots.map((shot, idx) => {
      const timeParts = shot.time ? shot.time.split("-->").map(p => p.trim()) : [];
      const startTime = timeParts.length > 0 ? parseTimeToSeconds(timeParts[0]) : 0;
      const endTime = timeParts.length > 1 ? parseTimeToSeconds(timeParts[1]) : startTime + 4;
      const duration = Math.max(0.5, endTime - startTime);
      
      return {
        ...shot,
        originalIndex: idx,
        startTime,
        endTime,
        duration
      };
    });
  }, [project]);

  // Total duration of successful videos or images combined
  const totalDuration = useMemo(() => {
    return validShots.reduce((acc, shot) => acc + ((shot.videoUrl || shot.imageUrl) ? shot.duration : 0), 0);
  }, [validShots]);

  const getTimelineMapping = (masterTime: number): { shotIndex: number; relativeTime: number } => {
    let accumulated = 0;
    for (let i = 0; i < validShots.length; i++) {
      const shot = validShots[i];
      if (!shot.videoUrl && !shot.imageUrl) continue;
      
      if (masterTime >= accumulated && masterTime <= accumulated + shot.duration) {
        return { shotIndex: i, relativeTime: masterTime - accumulated };
      }
      accumulated += shot.duration;
    }
    return { shotIndex: validShots.length > 0 ? 0 : -1, relativeTime: 0 };
  };

  const getMasterStartTime = (shotIndex: number): number => {
    let accumulated = 0;
    for (let i = 0; i < shotIndex; i++) {
      const shot = validShots[i];
      if (shot && (shot.videoUrl || shot.imageUrl)) {
        accumulated += shot.duration;
      }
    }
    return accumulated;
  };

  // Set default initial playable index
  useEffect(() => {
    if (currentPlayIndex === -1 && validShots.length > 0) {
      const firstPlayable = validShots.findIndex(s => !!s.videoUrl || !!s.imageUrl);
      if (firstPlayable !== -1) {
        setCurrentPlayIndex(firstPlayable);
      }
    }
  }, [validShots, currentPlayIndex]);

  // Sync video attributes when index changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (currentPlayIndex !== -1) {
      const activeShot = validShots[currentPlayIndex];
      if (activeShot?.videoUrl) {
        video.src = activeShot.videoUrl;
        video.volume = isMuted ? 0 : volume;
        
        if (isPlaying) {
          video.play().catch(() => {
            setIsPlaying(false);
          });
        }
      } else {
        video.src = "";
        video.pause();
      }
    }
  }, [currentPlayIndex]);

  // Sync play/pause state of voice and BGM audios when main player plays/pauses
  useEffect(() => {
    if (isPlaying) {
      if (voiceAudioRef.current && voiceAudioRef.current.paused && !voiceAudioRef.current.ended) {
        voiceAudioRef.current.play().catch(() => {});
      }
      if (bgmAudioRef.current && bgmAudioRef.current.paused) {
        bgmAudioRef.current.play().catch(() => {});
      }
    } else {
      if (voiceAudioRef.current) voiceAudioRef.current.pause();
      if (bgmAudioRef.current) bgmAudioRef.current.pause();
    }
  }, [isPlaying]);

  // Sync volume of voice and BGM audios
  useEffect(() => {
    const activeVol = isMuted ? 0 : volume;
    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = activeVol;
    }
    if (bgmAudioRef.current && currentBgmFileRef.current) {
      const activeBgm = bgmSuggestions.find(sugg => sugg.audioFile === currentBgmFileRef.current);
      const bgmVolumeDb = activeBgm?.volumeDb !== undefined ? activeBgm.volumeDb : -18;
      const linearVol = Math.pow(10, bgmVolumeDb / 20);
      bgmAudioRef.current.volume = activeVol * linearVol;
    }
  }, [volume, isMuted, bgmSuggestions]);

  const syncAudioAndBgm = (calculatedMasterTime: number) => {
    // 1. Sync Voice Audio based on Subtitle block start time
    const activeBlock = srtData.find(block => {
      const timeParts = block.time.split("-->").map(p => p.trim());
      const startTime = parseTimeToSeconds(timeParts[0]);
      const endTime = timeParts.length > 1 ? parseTimeToSeconds(timeParts[1]) : startTime + 4;
      return calculatedMasterTime >= startTime && calculatedMasterTime <= endTime;
    });

    if (activeBlock) {
      const idNum = parseInt(activeBlock.index, 10);
      const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;

      let audio = voiceAudioRef.current;
      const blobUrl = voiceBlobUrls[String(origId)];

      if (lastPlayedVoiceIdRef.current !== String(origId)) {
        // Stop any currently playing voice audio
        if (audio) {
          audio.pause();
        }
        
        if (blobUrl) {
          const newAudio = new Audio(blobUrl);
          audio = newAudio;
          voiceAudioRef.current = newAudio;
          newAudio.volume = isMuted ? 0 : volume;
          
          newAudio.addEventListener("loadedmetadata", () => {
            const totalDur = newAudio.duration;
            if (!isNaN(totalDur) && totalDur > 0) {
              const targetPos = getAudioPosition(activeBlock, calculatedMasterTime, totalDur, srtData);
              newAudio.currentTime = targetPos;
            }
          });

          if (isPlaying) {
            newAudio.play().catch(() => {});
          }
          lastPlayedVoiceIdRef.current = String(origId);
        }
      } else if (audio && !isNaN(audio.duration) && audio.duration > 0) {
        // Audio is already playing, check drift and sync
        const targetPos = getAudioPosition(activeBlock, calculatedMasterTime, audio.duration, srtData);
        if (Math.abs(audio.currentTime - targetPos) > 0.3) {
          audio.currentTime = targetPos;
        }
        
        // Ensure play state is correct
        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      }
    } else {
      // Stop voice when moving outside a subtitle block
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
      }
      lastPlayedVoiceIdRef.current = null;
    }

    // 2. Sync BGM Suggestions based on Time range
    const activeBgm = bgmSuggestions.find(sugg => {
      const { start, end } = parseTimeRangeToSeconds(sugg.timeRange);
      return calculatedMasterTime >= start && calculatedMasterTime <= end;
    });

    if (activeBgm && activeBgm.audioFile) {
      const audioFile = activeBgm.audioFile;
      if (currentBgmFileRef.current !== audioFile) {
        if (bgmAudioRef.current) {
          bgmAudioRef.current.pause();
        }

        const bgmBlobUrl = bgmBlobUrls[audioFile];
        if (bgmBlobUrl) {
          bgmAudioRef.current = new Audio(bgmBlobUrl);
          bgmAudioRef.current.loop = true;
          const bgmVolumeDb = activeBgm.volumeDb !== undefined ? activeBgm.volumeDb : -18;
          const linearVol = Math.pow(10, bgmVolumeDb / 20);
          bgmAudioRef.current.volume = (isMuted ? 0 : volume) * linearVol;
          if (isPlaying) {
            bgmAudioRef.current.play().catch(() => {});
          }
          currentBgmFileRef.current = audioFile;
        }
      } else {
        // Make sure BGM is playing if it was paused
        if (bgmAudioRef.current && isPlaying && bgmAudioRef.current.paused) {
          bgmAudioRef.current.play().catch(() => {});
        }
      }
    } else {
      // Pause BGM if no BGM suggested for this segment
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
      }
      currentBgmFileRef.current = null;
    }
  };

  // Handle Master Time tick update from active video tag
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || currentPlayIndex === -1) return;

    const accumulatedBefore = getMasterStartTime(currentPlayIndex);
    const calculatedMasterTime = accumulatedBefore + video.currentTime;
    setCurrentTime(calculatedMasterTime);
    syncAudioAndBgm(calculatedMasterTime);
  };

  // Image playback ticker
  useEffect(() => {
    let timerId: any = null;
    const activeShot = validShots[currentPlayIndex];
    
    if (isPlaying && activeShot && !activeShot.videoUrl && activeShot.imageUrl) {
      const startRealTime = Date.now();
      const masterStart = getMasterStartTime(currentPlayIndex);
      const startRelativeTime = Math.max(0, currentTime - masterStart);
      
      timerId = setInterval(() => {
        const elapsedSec = (Date.now() - startRealTime) / 1000;
        const newRelativeTime = startRelativeTime + elapsedSec;
        
        if (newRelativeTime >= activeShot.duration) {
          clearInterval(timerId);
          handleVideoEnded();
        } else {
          const calculatedMasterTime = masterStart + newRelativeTime;
          setCurrentTime(calculatedMasterTime);
          syncAudioAndBgm(calculatedMasterTime);
        }
      }, 33);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isPlaying, currentPlayIndex, currentTime]);

  const handleVideoEnded = () => {
    if (currentPlayIndex === -1) return;
    
    let nextIndex = -1;
    for (let i = currentPlayIndex + 1; i < validShots.length; i++) {
      if (validShots[i].videoUrl || validShots[i].imageUrl) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex !== -1) {
      setCurrentPlayIndex(nextIndex);
    } else {
      const firstPlayable = validShots.findIndex(s => !!s.videoUrl || !!s.imageUrl);
      if (firstPlayable !== -1) {
        setCurrentPlayIndex(firstPlayable);
        setIsPlaying(false);
        setCurrentTime(0);
        if (videoRef.current) videoRef.current.currentTime = 0;
      } else {
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (currentPlayIndex === -1) {
        const firstPlayable = validShots.findIndex(s => !!s.videoUrl);
        if (firstPlayable !== -1) {
          setCurrentPlayIndex(firstPlayable);
        }
      }
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
    if (val > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetMasterSecs = parseFloat(e.target.value);
    const { shotIndex, relativeTime } = getTimelineMapping(targetMasterSecs);

    if (voiceAudioRef.current) voiceAudioRef.current.pause();
    lastPlayedVoiceIdRef.current = null;

    if (shotIndex !== -1) {
      if (shotIndex === currentPlayIndex) {
        if (videoRef.current) {
          videoRef.current.currentTime = relativeTime;
        }
        setCurrentTime(targetMasterSecs);
      } else {
        setCurrentPlayIndex(shotIndex);
        setCurrentTime(targetMasterSecs);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = relativeTime;
          }
        }, 80);
      }
    }
  };

  const handlePlaySegment = (shotIndex: number) => {
    if (!validShots[shotIndex]?.videoUrl) return;
    const masterStart = getMasterStartTime(shotIndex);
    setCurrentPlayIndex(shotIndex);
    setCurrentTime(masterStart);
    setIsPlaying(true);
    if (voiceAudioRef.current) voiceAudioRef.current.pause();
    lastPlayedVoiceIdRef.current = null;
    
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const getSubtitlesText = (shot: Shot): string => {
    if (!shot.range || srtData.length === 0) {
      return shot.scene ? shot.scene.replace(/[\{\[\(].*?[\}\]\)]/g, "").trim() : "";
    }
    
    try {
      const parts = shot.range.split("-");
      if (parts.length === 0) return "";
      const startIdx = parseInt(parts[0], 10);
      const endIdx = parts.length > 1 ? parseInt(parts[1], 10) : startIdx;
      
      const matched = srtData.filter(b => {
        const idxNum = parseInt(b.index, 10);
        const origId = idxNum >= 1000 ? Math.floor(idxNum / 1000) : idxNum;
        return origId >= startIdx && origId <= endIdx;
      });
      return matched.map(b => b.text).join("　");
    } catch (e) {
      return shot.scene || "";
    }
  };

  const activeSubtitle = useMemo(() => {
    if (srtData.length === 0) return "";
    
    // Find the block in srtData that covers the current playback time
    const activeBlock = srtData.find(block => {
      const timeParts = block.time.split("-->").map(p => p.trim());
      const startTime = parseTimeToSeconds(timeParts[0]);
      const endTime = timeParts.length > 1 ? parseTimeToSeconds(timeParts[1]) : startTime + 4;
      return currentTime >= startTime && currentTime <= endTime;
    });

    if (activeBlock) {
      return activeBlock.text;
    }

    if (currentPlayIndex !== -1 && validShots[currentPlayIndex]) {
      return getSubtitlesText(validShots[currentPlayIndex]);
    }
    return "";
  }, [currentTime, currentPlayIndex, validShots, srtData]);

  const retrieveAndSyncSrt = () => {
    const originalSrtText = localStorage.getItem("ai_srt_text_original");
    if (originalSrtText) {
      handleSrtChange(originalSrtText);
      localStorage.removeItem("ai_srt_text_original"); // clear backup
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🍿 Rạp Phim: Khôi phục phụ đề SRT gốc ban đầu thành công (Hủy chia nhỏ).`
      ]);
      alert("Khôi phục phụ đề gốc thành công (đã hủy chia nhỏ phụ đề)!");
      return;
    }

    const localSrtText = localStorage.getItem("ai_srt_text");
    if (localSrtText) {
      handleSrtChange(localSrtText);
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🍿 Rạp Phim: Đồng bộ hóa phụ đề SRT từ hệ thống thành công.`
      ]);
      alert("Đồng bộ phụ đề SRT thành công!");
      return;
    }

    if (!project || project.shots.length === 0) {
      alert("Không có kịch bản hoặc phân cảnh nào để khôi phục SRT.");
      return;
    }

    let reconstructedText = "";
    project.shots.forEach((s, i) => {
      const idx = s.range ? s.range.split("-")[0] : (i + 1).toString();
      const timeRange = s.time || "00:00:00,000 --> 00:00:04,000";
      const dialog = s.scene ? s.scene.replace(/[\{\[\(].*?[\}\]\)]/g, "").trim() : s.prompt;
      reconstructedText += `${idx}\n${timeRange}\n${dialog}\n\n`;
    });

    handleSrtChange(reconstructedText.trim());
    setSystemLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 🍿 Rạp Phim: Khôi phục phụ đề SRT trực tiếp từ dòng thời gian phân cảnh.`
    ]);
    alert("Không tìm thấy tệp SRT tạm thời. Đã tự động tạo lại SRT từ Dòng thời gian phân cảnh thành công!");
  };

  const runAssetValidation = async (isUserGesture: boolean = false) => {
    // 1. Electron / Server-side validation
    if (projectPath) {
      setValidationStatus({ checked: false, success: false, errorMsg: "Đang kiểm tra..." });
      try {
        let reconstructedSrt = "";
        if (srtData && srtData.length > 0) {
          srtData.forEach(block => {
            reconstructedSrt += `${block.index}\n${block.time}\n${block.text}\n\n`;
          });
        } else {
          reconstructedSrt = localStorage.getItem("ai_srt_text") || "";
        }

        const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
        let data;

        if (isElectron && (window as any).electronAPI.validateAssets) {
          data = await (window as any).electronAPI.validateAssets({
            project,
            srtText: reconstructedSrt,
            projectPath,
            exportMode: exportVideoType
          });
          if (data.error) {
            throw new Error(data.error);
          }
        } else {
          const res = await fetch("/api/validate-assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project,
              srtText: reconstructedSrt,
              projectPath,
              exportMode: exportVideoType
            })
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Lỗi phản hồi từ server");
          }
          data = await res.json();
        }

        setValidationStatus({
          checked: true,
          success: data.success,
          errorMsg: data.success ? "" : "Xác thực tài nguyên thất bại.",
          missingVoices: data.missingVoices,
          missingScenes: data.missingScenes,
          missingBgm: data.missingBgm
        });
        return;
      } catch (err: any) {
        setValidationStatus({
          checked: true,
          success: false,
          errorMsg: `Lỗi quét tài nguyên: ${err.message}`
        });
        return;
      }
    }

    // 2. Browser fallback
    if (!selectedDirectoryHandle) {
      setValidationStatus({
        checked: true,
        success: false,
        errorMsg: "Vui lòng liên kết thư mục dự án trước."
      });
      return;
    }

    try {
      if (selectedDirectoryHandle.queryPermission) {
        const permission = await selectedDirectoryHandle.queryPermission({ mode: "readwrite" });
        if (permission !== "granted") {
          if (isUserGesture) {
            const req = await selectedDirectoryHandle.requestPermission({ mode: "readwrite" });
            if (req !== "granted") {
              setValidationStatus({
                checked: true,
                success: false,
                errorMsg: "Chưa cấp quyền truy cập/ghi thư mục. Vui lòng cấp quyền để quét tài nguyên."
              });
              return;
            }
          } else {
            setValidationStatus({
              checked: true,
              success: false,
              errorMsg: "Thư mục chưa được cấp quyền truy cập cho phiên này. Vui lòng bấm 'Quét lại' để cấp quyền."
            });
            return;
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed to check directory permission:", e);
    }

    setValidationStatus({ checked: false, success: false, errorMsg: "Đang kiểm tra..." });
    
    try {
      // 1. Voice check
      let voiceDir;
      try {
        voiceDir = await selectedDirectoryHandle.getDirectoryHandle("voice", { create: false });
      } catch (e) {}
      
      const voiceFiles: string[] = [];
      if (voiceDir) {
        for await (const entry of voiceDir.values()) {
          if (entry.kind === "file") {
            const ext = entry.name.split('.').pop()?.toLowerCase() || "";
            if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) {
              voiceFiles.push(entry.name);
            }
          }
        }
      }
      
      const uniqueOrigIds = new Set<number>();
      srtData.forEach(block => {
        const idNum = parseInt(block.index, 10);
        const origId = idNum >= 1000 ? Math.floor(idNum / 1000) : idNum;
        uniqueOrigIds.add(origId);
      });
      const requiredVoiceCount = uniqueOrigIds.size;
      let missingVoices = "";
      if (voiceFiles.length < requiredVoiceCount) {
        missingVoices = `Thiếu tệp âm thanh thuyết minh: Có ${voiceFiles.length}/${requiredVoiceCount} file`;
      }
      
      // 2. Scene assets check (images/videos)
      let imageFiles: string[] = [];
      let videoFiles: string[] = [];
      try {
        const imgDir = await selectedDirectoryHandle.getDirectoryHandle("images", { create: false });
        for await (const entry of imgDir.values()) {
          if (entry.kind === "file") imageFiles.push(entry.name);
        }
      } catch (e) {}
      
      try {
        const vidDir = await selectedDirectoryHandle.getDirectoryHandle("videos", { create: false });
        for await (const entry of vidDir.values()) {
          if (entry.kind === "file") videoFiles.push(entry.name);
        }
      } catch (e) {}
      
      const findAsset = (files: string[], stt: number): boolean => {
        const padded = stt.toString().padStart(2, '0');
        const patterns = [
          new RegExp(`^shot_${stt}\\.`, 'i'),
          new RegExp(`^shot_${padded}\\.`, 'i'),
          new RegExp(`^segment_${stt}\\.`, 'i'),
          new RegExp(`^segment_${padded}\\.`, 'i'),
          new RegExp(`^${stt}\\.`, 'i'),
          new RegExp(`^${padded}\\.`, 'i'),
        ];
        return files.some(f => patterns.some(p => p.test(f)));
      };
      
      const missingSceneList: number[] = [];
      for (let i = 0; i < project.shots.length; i++) {
        const stt = i + 1;
        let ok = false;
        if (exportVideoType === 'images_only') {
          ok = findAsset(imageFiles, stt);
        } else if (exportVideoType === 'videos_only') {
          ok = findAsset(videoFiles, stt);
        } else {
          ok = findAsset(videoFiles, stt) || findAsset(imageFiles, stt);
        }
        if (!ok) {
          missingSceneList.push(stt);
        }
      }
      
      let missingScenes = "";
      if (missingSceneList.length > 0) {
        const assetName = exportVideoType === 'images_only' ? 'ảnh' : exportVideoType === 'videos_only' ? 'video' : 'ảnh/video';
        missingScenes = `Thiếu ${assetName} cho phân cảnh STT: ${missingSceneList.join(', ')}`;
      }
      
      // 3. BGM check
      let missingBgm = "";
      const suggestions = project.bgmSuggestions || [];
      let bgmFiles: string[] = [];
      try {
        const bgmDir = await selectedDirectoryHandle.getDirectoryHandle("bgm", { create: false });
        for await (const entry of bgmDir.values()) {
          if (entry.kind === "file") bgmFiles.push(entry.name);
        }
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
      setValidationStatus({
        checked: true,
        success,
        errorMsg: success ? "" : "Xác thực tài nguyên thất bại.",
        missingVoices,
        missingScenes,
        missingBgm
      });
    } catch (err: any) {
      setValidationStatus({
        checked: true,
        success: false,
        errorMsg: `Lỗi xác thực: ${err.message}`
      });
    }
  };

  const handleSplitSubtitles = () => {
    if (!srtData || srtData.length === 0) {
      alert("Không có phụ đề để chia nhỏ!");
      return;
    }

    // Save the original SRT text to allow reverting the split
    const currentSrtText = localStorage.getItem("ai_srt_text") || "";
    if (currentSrtText) {
      localStorage.setItem("ai_srt_text_original", currentSrtText);
    }

    const maxWords = subtitleStyle.maxWordsLimit || 7;
    const splitBlocks: SRTBlock[] = [];
    srtData.forEach(block => {
      const split = splitLongSubtitleBlock(block, maxWords);
      splitBlocks.push(...split);
    });

    let srtText = "";
    splitBlocks.forEach(block => {
      srtText += `${block.index}\n${block.time}\n${block.text}\n\n`;
    });

    handleSrtChange(srtText.trim());
    setSystemLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 🍿 Rạp Phim: Đã chia nhỏ phụ đề thành ${splitBlocks.length} đoạn (Giới hạn: ${maxWords} từ).`
    ]);
    alert(`Đã chia nhỏ phụ đề thành công! Tổng số đoạn phụ đề mới: ${splitBlocks.length}`);
  };

  useEffect(() => {
    if (showExportModal) {
      runAssetValidation();
      scanIntroOutro();
    }
  }, [exportVideoType, showExportModal]);

  const stitchVideos = async () => {
    let outputDir = projectPath || "";

    // Reconstruct SRT content
    let reconstructedSrt = "";
    if (srtData && srtData.length > 0) {
      srtData.forEach(block => {
        reconstructedSrt += `${block.index}\n${block.time}\n${block.text}\n\n`;
      });
    } else {
      reconstructedSrt = localStorage.getItem("ai_srt_text") || "";
    }

    setIsRendering(true);
    setRenderProgress(0);
    setRenderStatus("Khởi tạo tiến trình Python...");
    setRenderedBlobUrl(null);
    setSystemLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 🎞️ Bắt đầu xuất video chất lượng cao sử dụng Python & FFmpeg...`
    ]);

    const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;

    if (isElectron) {
      try {
        const api = (window as any).electronAPI;

        // Set up compile log listener
        api.onCompileLog((line: string) => {
          setSystemLogs(prev => {
            if (!line.trim()) return prev;
            
            // Bỏ qua dòng tiến độ để không spam giao diện log
            if (/^PROGRESS:\s*\d+/i.test(line.trim())) {
              return prev;
            }
            
            const matchScene = line.match(/Processing Shot\s*(\d+)\/(\d+)/i);
            if (matchScene) {
              const currentScene = parseInt(matchScene[1], 10);
              const totalScenes = parseInt(matchScene[2], 10);
              if (totalScenes > 0) {
                setRenderProgress(Math.round((currentScene / totalScenes) * 60));
              }
            }
            return [...prev, line];
          });
        });

        // Set up progress listener
        api.onCompileProgress((percent: number) => {
          setRenderProgress(percent);
        });

        // Set up finish listener
        api.onCompileFinished((code: number, finalOutputDir: string) => {
          setIsRendering(false);
          if (code === 0) {
            setRenderStatus("Xuất phim thành công!");
            setSystemLogs(prev => [...prev, `[System] Thành công! File lưu tại: ${finalOutputDir}\\final_compiled_video.mp4`]);
            alert(`Dựng phim thành công! Video đã lưu tại: ${finalOutputDir}\\final_compiled_video.mp4`);
          } else {
            setRenderStatus("Dựng phim thất bại");
            alert(`Dựng phim thất bại với mã lỗi: ${code}`);
          }
        });

        // Trigger compilation
        const projectCopy: any = { ...project };
        if (subtitleStyle) {
          projectCopy.style = {
            ...subtitleStyle,
            burnSubtitles
          };
        }
        projectCopy.exportMode = exportVideoType;

        api.compileVideo(projectCopy, reconstructedSrt, outputDir);
      } catch (err: any) {
        setIsRendering(false);
        setRenderStatus("Lỗi kết xuất");
        alert(`Không thể bắt đầu tiến trình xuất video: ${err.message}`);
      }
    } else {
      try {
        const res = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            srtText: reconstructedSrt,
            projectPath: outputDir,
            exportMode: exportVideoType,
            style: {
              ...subtitleStyle,
              burnSubtitles
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        // Poll logs from `/api/logs` in real-time
        const pollInterval = setInterval(async () => {
          try {
            const logRes = await fetch("/api/logs");
            if (!logRes.ok) return;
            const logData = await logRes.json();
            if (logData.success && logData.logs) {
              let lastProgress = 0;
              let finished = false;
              let success = false;
              
              for (let i = logData.logs.length - 1; i >= 0; i--) {
                const line = logData.logs[i];
                
                const match = line.match(/PROGRESS:\s*(\d+)/i);
                if (match) {
                  lastProgress = Math.max(lastProgress, parseInt(match[1], 10));
                }
                
                const matchScene = line.match(/Processing Shot\s*(\d+)\/(\d+)/i);
                if (matchScene) {
                  const currentScene = parseInt(matchScene[1], 10);
                  const totalScenes = parseInt(matchScene[2], 10);
                  if (totalScenes > 0) {
                    lastProgress = Math.max(lastProgress, Math.round((currentScene / totalScenes) * 60));
                  }
                }
                
                if (line.includes("Success! Final video")) {
                  success = true;
                }
                if (line.includes("Tiến trình kết thúc với mã lỗi:")) {
                  finished = true;
                  if (line.includes("mã lỗi: 0")) {
                    success = true;
                  }
                }
              }
              
              // Lọc bỏ các dòng PROGRESS khi hiển thị ra hệ thống logs
              const filteredLogs = logData.logs.filter((line: string) => !/^PROGRESS:\s*\d+/i.test(line.trim()));
              setSystemLogs(filteredLogs);
              
              setRenderProgress(lastProgress || (success ? 100 : 0));
              
              if (finished || success) {
                clearInterval(pollInterval);
                setIsRendering(false);
                if (success) {
                  setRenderStatus("Xuất phim thành công!");
                  setSystemLogs(prev => [...prev, `[System] Thành công! File lưu tại: ${outputDir}\\final_compiled_video.mp4`]);
                } else {
                  setRenderStatus("Dựng phim thất bại");
                }
              }
            }
          } catch (err) {
            console.error("Error polling logs:", err);
          }
        }, 1000);

      } catch (err: any) {
        setIsRendering(false);
        setRenderStatus("Lỗi kết xuất");
        alert(`Không thể bắt đầu tiến trình xuất video: ${err.message}`);
      }
    }
  };



  // BGM suggestions AI trigger
  const handleGenerateBgm = async () => {
    if (!project || !apiKey) {
      alert("Vui lòng cấu hình API Key và nạp kịch bản dự án trước.");
      return;
    }
    
    // Build scene mapping from shots
    const sceneMapping = project.shots.map((shot, idx) => {
      const sit = project.situations?.find(s => s.id === shot.id);
      const emotionMatch = shot.scene ? shot.scene.match(/[\(\{\[（｛［](.*?)[\)\}\]）｝］]/) : null;
      return {
        stt: idx + 1,
        timeRange: shot.time || "",
        mainSituation: sit?.summary || shot.scene || "",
        mainEmotion: emotionMatch ? emotionMatch[1] : "neutral",
        sceneDescription: shot.prompt || "",
      };
    });

    try {
      const suggestions = await generateBgmSuggestions(
        sceneMapping,
        apiKey,
        selectedModel,
        apiBaseUrl
      );
      if (setProject) {
        setProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            bgmSuggestions: suggestions
          };
        });
      }
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🤖 BGM: Đã tạo thành công ${suggestions.length} gợi ý nhạc nền bằng AI.`
      ]);
      alert("Đã tạo gợi ý nhạc nền BGM thành công!");
    } catch (e: any) {
      alert(`Lỗi tạo gợi ý BGM: ${e.message}`);
    }
  };

  // Scan and auto-pair BGM files
  const handleScanBgm = async () => {
    if (!selectedDirectoryHandle) {
      alert("Vui lòng liên kết thư mục dự án trước.");
      return;
    }
    
    try {
      // 100% Client-side folder scanning for BGM matching
      const bgmDir = await selectedDirectoryHandle.getDirectoryHandle("bgm", { create: true });
      const files: string[] = [];
      for await (const entry of bgmDir.values()) {
        if (entry.kind === "file") {
          const ext = entry.name.split('.').pop()?.toLowerCase() || "";
          if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'].includes(ext)) {
            files.push(entry.name);
          }
        }
      }
      
      const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));
      
      const updated = bgmSuggestions.map((sugg, index) => {
        const segmentIndex = index + 1;
        let pairedFile = sugg.audioFile || "";

        // Pattern matching rules (e.g. bgm_1, bgm1, _1, -1)
        const patterns = [
          new RegExp(`bgm_${segmentIndex}\\b`, "i"),
          new RegExp(`bgm${segmentIndex}\\b`, "i"),
          new RegExp(`_${segmentIndex}\\.`, "i"),
          new RegExp(`\\b${segmentIndex}_`, "i"),
          new RegExp(`\\b${segmentIndex}-`, "i"),
          new RegExp(`-${segmentIndex}\\.`, "i"),
          new RegExp(`\\b${segmentIndex}\\.`, "i")
        ];

        const matched = files.find(f => patterns.some(p => p.test(f)));
        if (matched) {
          pairedFile = matched;
        } else if (sortedFiles[index]) {
          pairedFile = sortedFiles[index];
        }

        return {
          ...sugg,
          audioFile: pairedFile
        };
      });

      setBgmSuggestions(updated);
      
      if (setProject) {
        setProject(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            bgmSuggestions: updated
          };
        });
      }

      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🔄 BGM: Đã quét thư mục BGM và ghép nối thành công các tệp nhạc.`
      ]);
      alert(`Đã quét thư mục BGM và tự động ghép nối thành công (${files.length} tệp tìm thấy).`);
    } catch (e: any) {
      console.warn("Client BGM scan error, calling API fallback:", e);
      // Fallback via Next.js backend API if directories are not fully permitted
      try {
        const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
        let pPath = projectPath || "";
        if (isElectron && !pPath) {
          pPath = await (window as any).electronAPI.selectDirectory();
        }
        if (pPath) {
          const updated = await scanLocalBgmFiles(pPath, apiBaseUrl);
          if (setProject) {
            setProject(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                bgmSuggestions: updated
              };
            });
          }
          alert("Quét và tự động ghép nối nhạc BGM cục bộ bằng API thành công!");
        }
      } catch (err: any) {
        alert(`Không thể quét thư mục nhạc nền BGM: ${err.message}`);
      }
    }
  };

  // Regenerate prompt tags for Suno BGM suggestion card
  const handleRegenerateBgm = async (idx: number, sugg: BgmSuggestion) => {
    if (!apiKey) {
      alert("Vui lòng cấu hình API Key trước.");
      return;
    }
    const newGenre = prompt("Nhập Thể Loại mới:", sugg.genre) || sugg.genre;
    const newInst = prompt("Nhập Nhạc Cụ chính mới:", sugg.instrument) || sugg.instrument;
    const newTone = prompt("Nhập Tông Nhạc mới:", sugg.tone) || sugg.tone;

    try {
      const newPrompt = await regenerateBgmPrompt(
        idx,
        { genre: newGenre, instrument: newInst, tone: newTone },
        apiKey,
        selectedModel,
        apiBaseUrl
      );
      if (setProject) {
        setProject(prev => {
          if (!prev) return prev;
          const updated = [...(prev.bgmSuggestions || [])];
          if (updated[idx]) {
            updated[idx] = {
              ...updated[idx],
              genre: newGenre,
              instrument: newInst,
              tone: newTone,
              sunoPrompt: newPrompt
            };
          }
          return { ...prev, bgmSuggestions: updated };
        });
      }
      alert("Đã tạo lại prompt Suno mới thành công!");
    } catch (e: any) {
      alert(`Lỗi tạo lại prompt: ${e.message}`);
    }
  };

  const handleAssignBgmFile = (idx: number, fileName: string) => {
    const updated = bgmSuggestions.map((s, i) => i === idx ? { ...s, audioFile: fileName } : s);
    setBgmSuggestions(updated);
    if (setProject) {
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          bgmSuggestions: updated
        };
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950 overflow-y-auto custom-scrollbar p-6 lg:p-8">
      {/* Tab Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-black uppercase tracking-wider text-white">Rạp Chiếu Phim (Cinema Room)</h1>
            <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[8px] font-black uppercase tracking-widest rounded-md">V2.0.0 STITCHER ENGINE</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">
            Ghép nối toàn bộ phân cảnh video ngắn đã dựng thành phim hoàn chỉnh, tự động đồng bộ phụ đề SRT.
          </p>
        </div>

        {/* Action Header Button Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedDirectoryHandle && (
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] rounded-xl flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đã kết nối: {selectedDirectoryHandle.name}</span>
            </div>
          )}

          <button
            onClick={retrieveAndSyncSrt}
            className="px-3.5 py-2 bg-black/40 hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
            title="Đồng bộ lại kịch bản SRT gốc từ hệ thống kịch bản"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Lấy Lại SRT
          </button>

          <button
            onClick={() => {
              preloadAllVoiceFiles();
              preloadAllBgmFiles();
              alert("Đã làm mới/tải danh sách Voice và BGM thành công!");
            }}
            className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-lg animate-pulse"
            title="Tải lại toàn bộ tệp Voice và BGM từ thư mục dự án để xem trước"
          >
            <Music className="w-3.5 h-3.5" /> Tải Voice & BGM
          </button>

          <button
            onClick={handleSplitSubtitles}
            className="px-3.5 py-2 bg-black/40 hover:bg-white/5 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
            title="Chia nhỏ các đoạn phụ đề quá dài theo giới hạn số từ tối đa"
          >
            <Scissors className="w-3.5 h-3.5" /> Chia Nhỏ Phụ Đề
          </button>
          
          <button
            disabled={isRendering || validShots.filter(s => !!s.videoUrl || !!s.imageUrl).length === 0}
            onClick={() => {
              setShowExportModal(true);
              runAssetValidation();
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-500/20 hover:border-indigo-400/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-[0.98]"
            title="Dựng và xuất video gộp Full HD"
          >
            <Film className="w-3.5 h-3.5" /> Dựng & Ghép Phim
          </button>
        </div>
      </div>

      {/* Main Grid: Left (Player) vs Right (Playlist/BGM Suggestions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
        
        {/* LEFT COLUMN: Cinema Screen (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-5 min-h-[400px]">
          
          {/* Zoom Wrapper */}
          <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar py-1 flex items-center justify-center bg-zinc-950/20 rounded-2xl border border-white/5 p-2">
            {/* Cinema Screen Container */}
            <div 
              style={{ width: `${zoomScale}%`, maxWidth: 'none' }}
              className="aspect-video rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/80 overflow-hidden relative group/player flex items-center justify-center transition-all duration-300"
            >
              {/* Zoom Controller Overlay (top-right) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-md border border-white/5 rounded-xl shadow-lg select-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.max(50, prev - 25));
                  }}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer font-bold text-xs"
                  title="Thu nhỏ Preview"
                >
                  -
                </button>
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(100);
                  }}
                  className="text-[9px] font-mono font-black text-zinc-300 cursor-pointer hover:text-white px-1"
                  title="Click để reset về 100%"
                >
                  {zoomScale}%
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomScale(prev => Math.min(200, prev + 25));
                  }}
                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-all cursor-pointer font-bold text-xs"
                  title="Phóng to Preview"
                >
                  +
                </button>
              </div>

              {currentPlayIndex !== -1 && (validShots[currentPlayIndex]?.videoUrl || validShots[currentPlayIndex]?.imageUrl) ? (
              <>
                {validShots[currentPlayIndex].videoUrl ? (
                  <video
                    ref={videoRef}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleVideoEnded}
                    onClick={togglePlay}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                ) : (
                  <img
                    src={validShots[currentPlayIndex].imageUrl}
                    className="w-full h-full object-cover animate-kenburns"
                    style={{
                      '--kenburns-duration': `${validShots[currentPlayIndex].duration}s`,
                      animationPlayState: isPlaying ? 'running' : 'paused'
                    } as React.CSSProperties}
                    alt="Ken Burns shot"
                    onClick={togglePlay}
                  />
                )}
                
                {/* Subtitle Hardsubs Preview Overlay */}
                {showSubtitles && activeSubtitle && (() => {
                  const isFullWidth = subtitleStyle.bgFullWidth;
                  const bgOpacityVal = subtitleStyle.bgOpacity !== undefined ? subtitleStyle.bgOpacity : 0.4;
                  const bgHeightVal = (subtitleStyle.bgHeight !== undefined ? subtitleStyle.bgHeight : 80) * 0.8;
                  const bottomMarginVal = (subtitleStyle.bottomMargin !== undefined ? subtitleStyle.bottomMargin : 24) * 0.8;
                  
                  // Compute positioning styles
                  const positionStyle: React.CSSProperties = {};
                  if (subtitleStyle.verticalAlign === 'top') {
                    positionStyle.top = `${bottomMarginVal}px`;
                    positionStyle.bottom = 'auto';
                  } else if (subtitleStyle.verticalAlign === 'center') {
                    positionStyle.top = '50%';
                    positionStyle.bottom = 'auto';
                    positionStyle.transform = 'translateY(-50%)';
                  } else {
                    positionStyle.bottom = `${bottomMarginVal}px`;
                    positionStyle.top = 'auto';
                  }

                  const hexToRgba = (hex: string, opacity: number) => {
                    if (!hex) return `rgba(0,0,0,${opacity})`;
                    const cleaned = hex.replace('#', '');
                    const r = parseInt(cleaned.substring(0, 2), 16);
                    const g = parseInt(cleaned.substring(2, 4), 16);
                    const b = parseInt(cleaned.substring(4, 6), 16);
                    return `rgba(${r},${g},${b},${opacity})`;
                  };

                  if (isFullWidth) {
                    const fullWidthBoxStyle: React.CSSProperties = {
                      left: 0,
                      right: 0,
                      width: '100%',
                      height: `${bgHeightVal}px`,
                      backgroundColor: bgOpacityVal > 0 ? hexToRgba(subtitleStyle.bgColor || "#000000", bgOpacityVal) : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'absolute',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      zIndex: 10,
                    };

                    if (subtitleStyle.verticalAlign === 'top') {
                      fullWidthBoxStyle.top = 0;
                      fullWidthBoxStyle.bottom = 'auto';
                    } else if (subtitleStyle.verticalAlign === 'center') {
                      fullWidthBoxStyle.top = '50%';
                      fullWidthBoxStyle.bottom = 'auto';
                      fullWidthBoxStyle.transform = 'translateY(-50%)';
                    } else {
                      fullWidthBoxStyle.bottom = 0;
                      fullWidthBoxStyle.top = 'auto';
                    }

                    return (
                      <div 
                        style={fullWidthBoxStyle}
                        className="animate-fade-in"
                      >
                        <span 
                          style={{
                            color: subtitleStyle.textColor,
                            fontFamily: getCssFontFamily(subtitleStyle.fontFamily),
                            fontSize: `${subtitleStyle.fontSize * 0.8}px`,
                            textShadow: subtitleStyle.outlineWidth > 0 ? `
                              -${subtitleStyle.outlineWidth}px -${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},  
                               ${subtitleStyle.outlineWidth}px -${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                              -${subtitleStyle.outlineWidth}px  ${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                               ${subtitleStyle.outlineWidth}px  ${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                              -1px 0px 0px ${subtitleStyle.outlineColor},
                               1px 0px 0px ${subtitleStyle.outlineColor},
                               0px -1px 0px ${subtitleStyle.outlineColor},
                               0px  1px 0px ${subtitleStyle.outlineColor}
                            ` : 'none',
                            whiteSpace: 'pre-wrap',
                            textAlign: 'center',
                            maxWidth: '90%'
                          }}
                          className="font-semibold leading-relaxed"
                        >
                          {wrapTextClient(activeSubtitle, subtitleStyle.maxLineLength)}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        style={positionStyle}
                        className="absolute left-6 right-6 flex justify-center pointer-events-none select-none z-10 animate-fade-in"
                      >
                        <span 
                          style={{
                            color: subtitleStyle.textColor,
                            fontFamily: getCssFontFamily(subtitleStyle.fontFamily),
                            fontSize: `${subtitleStyle.fontSize * 0.8}px`,
                            backgroundColor: bgOpacityVal > 0 ? hexToRgba(subtitleStyle.bgColor || "#000000", bgOpacityVal) : 'transparent',
                            textShadow: subtitleStyle.outlineWidth > 0 ? `
                              -${subtitleStyle.outlineWidth}px -${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},  
                               ${subtitleStyle.outlineWidth}px -${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                              -${subtitleStyle.outlineWidth}px  ${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                               ${subtitleStyle.outlineWidth}px  ${subtitleStyle.outlineWidth}px 0 ${subtitleStyle.outlineColor},
                              -1px 0px 0px ${subtitleStyle.outlineColor},
                               1px 0px 0px ${subtitleStyle.outlineColor},
                               0px -1px 0px ${subtitleStyle.outlineColor},
                               0px  1px 0px ${subtitleStyle.outlineColor}
                            ` : 'none',
                            whiteSpace: 'pre-wrap'
                          }}
                          className="px-4.5 py-2.5 backdrop-blur-md border border-white/5 font-semibold rounded-xl text-center shadow-2xl max-w-[85%] leading-relaxed"
                        >
                          {wrapTextClient(activeSubtitle, subtitleStyle.maxLineLength)}
                        </span>
                      </div>
                    );
                  }
                })()}
                
                {/* Active Segment Badge Overlay (top-left) */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-white/5 rounded-full shadow-lg pointer-events-none">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                  <span className="text-[8px] font-mono font-black text-white uppercase tracking-widest">
                    Segment 0{validShots[currentPlayIndex].originalIndex + 1}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600">
                  <MonitorPlay className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-black uppercase text-zinc-400 tracking-wider">Awaiting Media Feed</h3>
                  <p className="text-[9px] text-zinc-600 font-mono mt-1 max-w-[280px] leading-relaxed">
                    Chọn phân cảnh có video ở danh sách bên phải hoặc hoàn thành vẽ/dựng video kịch bản để bắt đầu chiếu phim.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Master Timeline & Custom Control Bar */}
          {currentPlayIndex !== -1 && validShots[currentPlayIndex]?.videoUrl && (
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
              
              {/* Progress Slider (Master Seek Bar) */}
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-zinc-500 font-black">{currentTime.toFixed(1)}s</span>
                <input
                  type="range"
                  min="0"
                  max={totalDuration || 1}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                />
                <span className="text-[9px] font-mono text-indigo-400 font-black">/ {totalDuration.toFixed(1)}s</span>
              </div>

              {/* Action Control Panel */}
              <div className="flex items-center justify-between gap-4 pt-1">
                {/* Play/Pause Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-md active:scale-95 cursor-pointer"
                    title={isPlaying ? "Tạm dừng" : "Phát phim"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                  </button>
                  
                  <button
                    onClick={() => setShowSubtitles(!showSubtitles)}
                    className={`px-3 py-1.5 rounded-lg border text-[8px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                      showSubtitles 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20" 
                        : "bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300"
                    }`}
                    title="Bật/Tắt Phụ Đề Nổi"
                  >
                    CC Phụ Đề: {showSubtitles ? "ON" : "OFF"}
                  </button>

                  {isPreloadingVoice && (
                    <span className="text-[8px] font-mono text-zinc-500 animate-pulse flex items-center gap-1">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading voice cache...
                    </span>
                  )}
                </div>

                {/* Master Volume Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 hover:bg-white/5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-zinc-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtitle Configuration Panel */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-mono font-black text-white uppercase tracking-wider">Cấu Hình Phụ Đề (Subtitle Design)</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[8px] rounded uppercase font-black tracking-widest">Style Editor</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Font chữ (Font Family):</label>
                  <select
                    value={subtitleStyle.fontFamily}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, fontFamily: e.target.value })}
                    className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="sans-serif">Sans-Serif (Arial, Calibri)</option>
                    <option value="serif">Serif (Times New Roman)</option>
                    <option value="monospace">Monospace (Courier, Consolas)</option>
                    <option value="cursive">Cursive (Comic Sans)</option>
                    <option value="msgothic">MS Gothic (ＭＳ ゴシック)</option>
                    <option value="meiryo">Meiryo (メイリオ)</option>
                    <option value="msmincho">MS Mincho (ＭＳ 明朝)</option>
                    <option value="yugothic">Yu Gothic (游ゴシック)</option>
                    <option value="yumin">Yu Mincho (游明朝)</option>
                    <option value="bizudgothic">BIZ UD Gothic (BIZ UDゴシック)</option>
                    <option value="bizudmincho">BIZ UD Mincho (BIZ UD明朝)</option>
                    <option value="togegothic">Toge Gothic (とげゴシック-Bd)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                    <span>Cỡ chữ gốc (Font Size):</span>
                    <span className="text-indigo-400 font-bold">{subtitleStyle.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    step="1"
                    value={subtitleStyle.fontSize}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, fontSize: parseInt(e.target.value) })}
                    className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                    <span>Độ dài dòng tối đa (Max Line):</span>
                    <span className="text-indigo-400 font-bold">{subtitleStyle.maxLineLength} ký tự</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={subtitleStyle.maxLineLength}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, maxLineLength: parseInt(e.target.value) })}
                    className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                    <span>Số lượng từ tối đa (Max Words):</span>
                    <span className="text-indigo-400 font-bold">{subtitleStyle.maxWordsLimit || 7} từ</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="20"
                    step="1"
                    value={subtitleStyle.maxWordsLimit || 7}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, maxWordsLimit: parseInt(e.target.value) })}
                    className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Vị trí dọc (Align):</label>
                    <select
                      value={subtitleStyle.verticalAlign}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, verticalAlign: e.target.value })}
                      className="bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="top">Top (Trên)</option>
                      <option value="center">Center (Giữa)</option>
                      <option value="bottom">Bottom (Dưới)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                      <span>Nền mờ (Background):</span>
                      <span className="text-indigo-400 font-bold">{Math.round(subtitleStyle.bgOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={subtitleStyle.bgOpacity}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bgOpacity: parseFloat(e.target.value) })}
                      className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none mt-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <label className="flex items-center gap-2 bg-black/20 hover:bg-black/30 border border-white/5 rounded-lg p-2 cursor-pointer select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={subtitleStyle.bgFullWidth || false}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bgFullWidth: e.target.checked })}
                      className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 bg-zinc-950 accent-indigo-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-white leading-none">Nền rộng màn hình</span>
                    </div>
                  </label>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                      <span>Chiều cao nền:</span>
                      <span className="text-indigo-400 font-bold">{subtitleStyle.bgHeight !== undefined ? subtitleStyle.bgHeight : 80}px</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="250"
                      step="5"
                      disabled={!(subtitleStyle.bgFullWidth || false)}
                      value={subtitleStyle.bgHeight !== undefined ? subtitleStyle.bgHeight : 80}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bgHeight: parseInt(e.target.value) })}
                      className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none disabled:opacity-30"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                    <span>Cự ly lề dọc (Margin):</span>
                    <span className="text-indigo-400 font-bold">{subtitleStyle.bottomMargin !== undefined ? subtitleStyle.bottomMargin : 24}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="2"
                    disabled={subtitleStyle.verticalAlign === 'center'}
                    value={subtitleStyle.bottomMargin !== undefined ? subtitleStyle.bottomMargin : 24}
                    onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bottomMargin: parseInt(e.target.value) })}
                    className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none disabled:opacity-30"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Màu chữ:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={subtitleStyle.textColor}
                        onChange={(e) => setSubtitleStyle({ ...subtitleStyle, textColor: e.target.value })}
                        className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                      />
                      <span className="text-[8px] font-mono text-zinc-400 uppercase leading-none">{subtitleStyle.textColor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Màu viền:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={subtitleStyle.outlineColor}
                        onChange={(e) => setSubtitleStyle({ ...subtitleStyle, outlineColor: e.target.value })}
                        className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                      />
                      <span className="text-[8px] font-mono text-zinc-400 uppercase leading-none">{subtitleStyle.outlineColor}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Màu nền:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={subtitleStyle.bgColor || "#000000"}
                        onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bgColor: e.target.value })}
                        className="w-6 h-6 rounded border border-white/10 bg-transparent cursor-pointer"
                      />
                      <span className="text-[8px] font-mono text-zinc-400 uppercase leading-none">{subtitleStyle.bgColor || "#000000"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                      <span>Độ dày:</span>
                      <span className="text-indigo-400 font-bold">{subtitleStyle.outlineWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={subtitleStyle.outlineWidth}
                      onChange={(e) => setSubtitleStyle({ ...subtitleStyle, outlineWidth: parseInt(e.target.value) })}
                      className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rendering Stitched Video Progress Container */}
          {isRendering && (
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-5 flex flex-col gap-3.5 shadow-lg shadow-indigo-950/10 relative overflow-hidden animate-pulse">
              <div className="absolute top-0 left-0 bottom-0 bg-indigo-500/5 transition-all duration-300" style={{ width: `${renderProgress}%` }} />
              
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-[9px] font-black uppercase tracking-widest">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{renderStatus}</span>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 font-extrabold">{renderProgress}%</span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden relative z-10 border border-white/5">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300" style={{ width: `${renderProgress}%` }} />
              </div>

              {renderProgress === 100 && renderedBlobUrl && (
                <div className="flex items-center justify-between pt-1 relative z-10">
                  <span className="text-[8px] font-mono text-zinc-500 italic">Dựng phim gộp thành công!</span>
                  <a
                    href={renderedBlobUrl}
                    download={`movie_stitched_${Date.now()}.webm`}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-emerald-600/10"
                  >
                    <Download className="w-3 h-3" /> Tải Video Gộp Về Máy
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Shot Timing Playlist OR BGM Suggestions (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 min-h-[400px] bg-zinc-900/20 border border-white/5 rounded-2xl p-4.5">
          
          {/* Sub-tabs header */}
          <div className="flex border-b border-white/10 mb-2 bg-black/20 rounded-xl overflow-hidden p-0.5">
            <button
              onClick={() => setRightSubTab("playlist")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                rightSubTab === "playlist" 
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/25" 
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              <ListVideo className="w-3.5 h-3.5" />
              <span>Dòng thời gian ({validShots.length})</span>
            </button>
            <button
              onClick={() => setRightSubTab("bgm")}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                rightSubTab === "bgm" 
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/25" 
                  : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Gợi ý Nhạc nền ({bgmSuggestions.length})</span>
            </button>
          </div>

          {/* Sub-tab 1: Playlist Display */}
          {rightSubTab === "playlist" && (
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar gap-3 flex flex-col" style={{ maxHeight: "70vh" }}>
              {validShots.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-600 gap-2">
                  <AlertCircle className="w-8 h-8 opacity-30" />
                  <span className="text-[9px] font-mono uppercase tracking-widest">Không tìm thấy phân cảnh nào</span>
                </div>
              ) : (
                validShots.map((shot, i) => {
                  const isCurrent = i === currentPlayIndex;
                  const hasVideo = !!shot.videoUrl;
                  const subtitleText = getSubtitlesText(shot);

                  return (
                    <div
                      key={shot.id}
                      onClick={() => hasVideo && handlePlaySegment(i)}
                      className={`p-3.5 rounded-xl border transition-all duration-300 flex flex-col gap-2 relative ${
                        !hasVideo 
                          ? "bg-black/10 border-white/5 opacity-55 cursor-not-allowed"
                          : isCurrent
                            ? "bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-600/5 cursor-pointer scale-[1.01]"
                            : "bg-black/40 border-white/5 hover:border-white/15 cursor-pointer hover:bg-black/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-mono font-black rounded px-1.5 py-0.5 leading-none ${
                            isCurrent ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            #{ (shot.originalIndex + 1).toString().padStart(2, "0") }
                          </span>
                          
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-white font-mono leading-none tracking-tighter">
                              {shot.time ? shot.time.split("-->")[0].trim().substring(3, 11) : "00:00"}
                            </span>
                            <span className="text-[7px] text-zinc-500 font-mono leading-none mt-0.5 uppercase tracking-tighter">
                              Bắt đầu • Dài {shot.duration.toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {generatingVideos[shot.originalIndex] ? (
                            <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[7px] font-mono font-black uppercase tracking-widest flex items-center gap-1.5">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              Đang tạo
                            </span>
                          ) : (
                            <>
                              <span className={`px-2 py-0.5 border rounded text-[7px] font-mono font-black uppercase tracking-widest ${
                                hasVideo
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                  : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                              }`}>
                                {hasVideo ? "Done" : "Lock"}
                              </span>
                              
                              {hasVideo && generateVideo && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    generateVideo(shot.originalIndex);
                                  }}
                                  disabled={isGenerating}
                                  className="p-1 bg-white/5 hover:bg-rose-600/20 border border-white/10 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                                  title="Tạo lại video này (Recreate)"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {subtitleText ? (
                        <p className="text-[10px] text-zinc-300 font-medium leading-relaxed italic line-clamp-2 pl-2.5 border-l border-white/10 mt-1">
                          {subtitleText}
                        </p>
                      ) : (
                        <p className="text-[8px] text-zinc-600 font-mono italic mt-1">
                          Không có thoại phụ đề (Bối cảnh/Mô tả)
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sub-tab 2: BGM Suggestions Display */}
          {rightSubTab === "bgm" && (
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar gap-3 flex flex-col" style={{ maxHeight: "70vh" }}>
              {bgmSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
                  <Sparkles className="w-10 h-10 text-indigo-400 opacity-40 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">Chưa có gợi ý nhạc nền BGM</h4>
                    <p className="text-[9px] text-zinc-500 font-mono max-w-[280px] leading-relaxed">
                      Sử dụng AI đóng vai trò Đạo diễn âm nhạc để phân tích kịch bản và đề xuất phân đoạn nhạc nền phù hợp.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateBgm}
                    disabled={isGeneratingBgm || !apiKey}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    {isGeneratingBgm ? "Đang tạo gợi ý..." : "🤖 Đề Xuất BGM Bằng AI"}
                  </button>
                  {!apiKey && (
                    <p className="text-[8px] text-rose-400 italic">Vui lòng cấu hình API Key ở Sidebar/Cài đặt trước.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <span className="text-[9px] font-mono text-zinc-400 font-black uppercase tracking-wider">Đoạn nhạc đề xuất ({bgmSuggestions.length})</span>
                    <button
                      onClick={handleScanBgm}
                      disabled={isScanning || !selectedDirectoryHandle}
                      className="px-2.5 py-1 bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/30 text-zinc-300 hover:text-indigo-400 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Đang quét...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          <span>Quét & Tự động Ghép</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  {bgmSuggestions.map((sugg, idx) => (
                    <div key={idx} className="p-3 bg-black/30 border border-white/5 rounded-xl flex flex-col gap-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          Đoạn #{idx + 1} [${sugg.timeRange}]
                        </span>
                        <button
                          onClick={() => handleRegenerateBgm(idx, sugg)}
                          className="p-1 hover:bg-white/5 text-zinc-500 hover:text-zinc-300 rounded transition-colors cursor-pointer"
                          title="Tạo lại prompt Suno"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[8px] font-mono text-zinc-400 border-b border-white/5 pb-1.5">
                        <div><strong className="text-zinc-500">Thể loại:</strong> {sugg.genre}</div>
                        <div><strong className="text-zinc-500">Nhạc cụ:</strong> {sugg.instrument}</div>
                        <div><strong className="text-zinc-500">Tông:</strong> {sugg.tone}</div>
                      </div>

                      <p className="text-[9px] text-zinc-400 leading-relaxed font-sans italic">
                        {sugg.description}
                      </p>

                      {/* Suno Prompt Copy */}
                      <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 rounded-lg px-2 py-1 select-text">
                        <span className="text-[8px] font-mono text-zinc-400 truncate flex-1">{sugg.sunoPrompt}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(sugg.sunoPrompt);
                            alert("Đã sao chép prompt Suno!");
                          }}
                          className="p-1 hover:bg-white/10 text-indigo-400 hover:text-indigo-300 rounded transition-colors cursor-pointer"
                          title="Sao chép prompt Suno"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Local BGM Audio File Selector */}
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase">Nhạc nền gán cục bộ:</span>
                        <select
                          value={sugg.audioFile || ""}
                          onChange={(e) => handleAssignBgmFile(idx, e.target.value)}
                          className="bg-zinc-950 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">-- Chọn nhạc nền từ thư mục /bgm --</option>
                          {localBgmFiles.map(file => (
                            <option key={file} value={file}>{file}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1 mt-2">
                        <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
                          <span>Âm lượng (BGM Volume):</span>
                          <span className="text-indigo-400 font-bold">{sugg.volumeDb !== undefined ? sugg.volumeDb : -18} dB</span>
                        </div>
                        <input
                          type="range"
                          min="-40"
                          max="0"
                          step="1"
                          value={sugg.volumeDb !== undefined ? sugg.volumeDb : -18}
                          onChange={(e) => {
                            const updated = bgmSuggestions.map((s, i) => i === idx ? { ...s, volumeDb: parseInt(e.target.value) } : s);
                            setBgmSuggestions(updated);
                            if (setProject) {
                              setProject(prev => prev ? { ...prev, bgmSuggestions: updated } : prev);
                            }
                          }}
                          className="h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={handleGenerateBgm}
                    disabled={isGeneratingBgm || !apiKey}
                    className="w-full py-2 bg-black/40 hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Đề Xuất Lại Từ AI
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-black uppercase text-white tracking-wider">Cấu Hình Xuất Phim (Export Video)</h2>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-zinc-500 hover:text-white transition-colors text-xs font-mono font-bold cursor-pointer"
              >
                [ĐÓNG]
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Kiểu video xuất ra (Video Type):</label>
                <select
                  value={exportVideoType}
                  onChange={(e) => setExportVideoType(e.target.value as any)}
                  className="bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="mixed">Vừa ảnh vừa video (Mixed)</option>
                  <option value="images_only">Chỉ dùng hình ảnh (Images only)</option>
                  <option value="videos_only">Chỉ dùng video (Videos only)</option>
                </select>
              </div>

              {hasIntroVideo && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-zinc-400 font-bold uppercase">Vị trí chèn Video Intro (Intro Position):</label>
                  <select
                    value={project.introSubIndex || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (setProject) {
                        setProject(prev => prev ? { ...prev, introSubIndex: val || undefined } : null);
                      }
                    }}
                    className="bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Không chèn Intro --</option>
                    {srtData.map((block) => (
                      <option key={block.index} value={block.index}>
                        Sau Sub #{block.index} ({block.text.length > 30 ? block.text.slice(0, 30) + "..." : block.text})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {hasOutroVideo && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl p-3 flex items-start gap-2">
                  <Film className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase leading-none">Phát hiện Video Outro</span>
                    <p className="text-[9px] font-mono mt-1 text-zinc-400">
                      Video Outro từ thư mục /outro sẽ tự động được chèn vào cuối video.
                    </p>
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/10 rounded-xl p-3.5 cursor-pointer select-none transition-colors">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-zinc-950 accent-indigo-500"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-none">Gắn cứng phụ đề (Burn Subtitles)</span>
                  <span className="text-[9px] text-zinc-500 font-mono mt-1">Vẽ trực tiếp phụ đề lên khung hình video đầu ra.</span>
                </div>
              </label>

              <div className="flex flex-col gap-1 bg-black/20 border border-white/5 rounded-xl p-3.5">
                <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase leading-none">Đường dẫn thư mục voice:</span>
                <span className="text-[10px] text-zinc-300 font-mono mt-1.5 break-all select-all">
                  {projectPath ? `${projectPath}\\voice` : "\\voice"}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2">
                  <span className="text-[9px] font-mono text-zinc-400 font-black uppercase">Live Asset Validation</span>
                  <button
                    onClick={() => runAssetValidation(true)}
                    className="px-2.5 py-1 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Quét lại
                  </button>
                </div>

                {validationStatus.checked ? (
                  validationStatus.success ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-3.5 flex items-start gap-2 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider">✓ Sẵn sàng</span>
                        <p className="text-[9px] font-mono mt-1">Đầy đủ voice, bgm và hình ảnh/video!</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3.5 flex flex-col gap-2 animate-fade-in text-left max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="flex items-start gap-2 text-rose-400">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Tài nguyên chưa sẵn sàng:</span>
                      </div>
                      <div className="text-[9px] font-mono pl-6 flex flex-col gap-1 text-zinc-400">
                        {validationStatus.missingVoices && <p className="text-rose-400/90 font-semibold">• {validationStatus.missingVoices}</p>}
                        {validationStatus.missingScenes && <p className="text-rose-400/90 font-semibold">• {validationStatus.missingScenes}</p>}
                        {validationStatus.missingBgm && <p className="text-rose-400/90 font-semibold">• {validationStatus.missingBgm}</p>}
                        {validationStatus.errorMsg && !validationStatus.missingVoices && !validationStatus.missingScenes && !validationStatus.missingBgm && (
                          <p className="text-rose-400/90 font-semibold">• {validationStatus.errorMsg}</p>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="bg-black/10 border border-white/5 rounded-xl p-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                    <span className="text-[9px] font-mono text-zinc-500">Đang quét tài nguyên...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/5 bg-black/10 flex justify-end gap-2.5">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={!validationStatus.success}
                onClick={() => {
                  setShowExportModal(false);
                  setIsExportFullscreen(true);
                  stitchVideos();
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg hover:shadow-[0_0_15px_rgba(99,102,241,0.25)] active:scale-95"
              >
                Generate Video Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {isExportFullscreen && (
        <div className="fixed inset-0 bg-[#030712]/96 backdrop-blur-2xl flex flex-col items-center justify-center z-50 p-6">
          <div className="w-full max-w-2xl flex flex-col gap-6 text-center">
            <div className="flex justify-center">
              {isRendering ? (
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-dashed border-indigo-500 animate-spin duration-1000" />
                  <Film className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>
              ) : renderProgress === 100 ? (
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-8 h-8" />
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">
                {isRendering ? "Đang xuất phim chất lượng cao..." : renderProgress === 100 ? "Xuất phim thành công!" : "Xuất phim thất bại!"}
              </h2>
              <p className="text-xs text-zinc-500 font-mono mt-1.5">{renderStatus || "Đang kết xuất..."}</p>
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex justify-between text-[10px] font-mono text-zinc-400 font-bold uppercase px-1">
                <span>Tiến trình</span>
                <span className="text-indigo-400">{renderProgress}%</span>
              </div>
              <div className="w-full h-2 bg-black/40 border border-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${renderProgress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 w-full text-left">
              <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase">Hệ thống Logs:</span>
              <div className="bg-slate-950 border border-white/5 rounded-xl h-64 p-4 font-mono text-[10px] text-zinc-300 overflow-y-auto custom-scrollbar relative flex flex-col gap-0.5 select-text">
                {isRendering && (
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 text-[8px] font-mono font-black text-rose-500 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded-full uppercase tracking-widest pointer-events-none">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    <span>LIVE</span>
                  </div>
                )}
                {systemLogs.map((log, i) => (
                  <div key={i} className="break-all">{log}</div>
                ))}
                {systemLogs.length === 0 && <div className="text-zinc-600 italic">Chưa có nhật ký nào được ghi nhận...</div>}
              </div>
            </div>

            {!isRendering && (
              <div className="flex justify-center gap-4 animate-fade-in mt-2">
                {renderProgress === 100 ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left w-full select-all font-mono text-[10px]">
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-zinc-500 font-mono text-[8px] uppercase font-bold">Đường dẫn tệp video:</span>
                        <span className="text-zinc-300 mt-1 break-all">{projectPath}\\final_compiled_video.mp4</span>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${projectPath}\\final_compiled_video.mp4`);
                          alert("Đã sao chép đường dẫn!");
                        }}
                        className="px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-white rounded-lg text-[8px] font-bold uppercase transition-all shrink-0 cursor-pointer active:scale-95"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-3 w-full mt-2">
                      <button
                        onClick={async () => {
                          const api = (window as any).electronAPI;
                          if (api && api.openPath) {
                            await api.openPath(projectPath);
                          } else {
                            alert("Chức năng chỉ hoạt động trên phiên bản cài đặt máy tính.");
                          }
                        }}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center shadow-lg active:scale-95"
                      >
                        Mở thư mục chứa video
                      </button>
                      <button
                        onClick={() => {
                          setIsExportFullscreen(false);
                          setRenderProgress(0);
                          setRenderStatus("");
                        }}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center active:scale-95"
                      >
                        Đóng tiến trình
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsExportFullscreen(false);
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    Quay lại sửa lỗi
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
