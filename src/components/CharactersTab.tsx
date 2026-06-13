import React, { useState } from "react";
import {
  Upload, RotateCcw, User, Download, FolderOpen, Trash2, Plus, ZoomIn, PlayCircle, AlertOctagon, StopCircle, Image as ImageIcon, X, Sparkles, Check, Loader2
} from "lucide-react";
import { ProjectData, Character } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AGE_OPTIONS = [
  { id: "child", label: "Trẻ em (5-10 tuổi)", en: "child, 8 years old" },
  { id: "teenager", label: "Thiếu niên (13-18 tuổi)", en: "teenager, 15 years old" },
  { id: "young_adult", label: "Thanh niên (20-30 tuổi)", en: "young adult, 23 years old" },
  { id: "adult", label: "Người trưởng thành (30-40 tuổi)", en: "adult, 35 years old" },
  { id: "middle_aged", label: "Trung niên (40-50 tuổi)", en: "middle-aged, 45 years old" },
  { id: "elderly", label: "Cao tuổi (60+ tuổi)", en: "elderly, 65 years old" },
];

const GENDER_OPTIONS = [
  { id: "female", label: "Nữ", en: "female" },
  { id: "male", label: "Nam", en: "male" },
];

const CHARACTER_OPTIONS = {
  female: {
    body: [
      { label: "Mảnh mai, cân đối", en: "slender and well-balanced body" },
      { label: "Đồng hồ cát quyến rũ", en: "charming hourglass figure" },
      { label: "Nhỏ nhắn, đáng yêu", en: "petite and cute body" },
      { label: "Cao ráo, thanh mảnh", en: "tall and slender build" },
      { label: "Đầy đặn, phúc hậu", en: "plump and sweet body" },
    ],
    hair: [
      { label: "Tóc dài thẳng đen truyền thống", en: "long straight black hair" },
      { label: "Tóc dài uốn gợn sóng nâu hạt dẻ", en: "long wavy chestnut brown hair" },
      { label: "Tóc ngắn cá tính nâu sáng", en: "short stylish light brown hair" },
      { label: "Tóc bob thanh lịch đen", en: "elegant black bob hair" },
      { label: "Tóc dài buộc đuôi ngựa nâu hạt dẻ", en: "long brown ponytail hair" },
      { label: "Tóc hai bên đáng yêu vàng", en: "cute blonde twin tails" },
      { label: "Tóc ngang vai hạt dẻ", en: "shoulder-length chestnut hair" },
    ],
    face: [
      { label: "Trái xoan thanh tú", en: "elegant oval face" },
      { label: "Tròn trịa đáng yêu", en: "cute round face" },
      { label: "V-line thời thượng", en: "trendy V-line face" },
      { label: "Trái tim ngọt ngào", en: "sweet heart-shaped face" },
    ],
    nose: [
      { label: "Mũi dọc dừa cao thẳng", en: "high straight nose" },
      { label: "Mũi nhỏ nhắn thanh thoát", en: "small delicate nose" },
      { label: "Mũi cao kiểu Tây", en: "high Western-style nose" },
    ],
    eyes: [
      { label: "Mắt to tròn hai mí đen long lanh", en: "big round double-eyelid black eyes, sparkling" },
      { label: "Mắt phượng quyến rũ nâu hổ phách", en: "charming phoenix eyes, amber color" },
      { label: "Mắt cười híp mí đáng yêu hạt dẻ", en: "cute smiling chestnut eyes" },
      { label: "Mắt to tròn xanh dương cuốn hút", en: "big round attractive blue eyes" },
    ],
    mouth: [
      { label: "Môi trái tim chúm chím", en: "cherry heart-shaped lips" },
      { label: "Khuôn miệng nhỏ nhắn tươi tắn", en: "small cheerful mouth" },
      { label: "Môi hồng hào cười tươi", en: "rosy smiling lips" },
    ],
    outfit: [
      { label: "Đồng phục học sinh Nhật Bản hiện đại", en: "modern Japanese school uniform" },
      { label: "Váy voan trắng nhẹ nhàng thanh lịch", en: "gentle elegant white chiffon dress" },
      { label: "Đồ thường ngày năng động", en: "casual t-shirt and jeans" },
      { label: "Đồ công sở thanh lịch", en: "elegant formal business suit" },
      { label: "Kimono truyền thống sang trọng", en: "elegant traditional Kimono" },
      { label: "Hoodie cá tính và chân váy", en: "stylish hoodie and skirt" },
    ]
  },
  male: {
    body: [
      { label: "Cân đối, săn chắc", en: "fit and toned athletic body" },
      { label: "Cao ráo, vạm vỡ", en: "tall and muscular build with broad shoulders" },
      { label: "Thư sinh, thanh mảnh", en: "slender scholar build" },
      { label: "Đầy đặn, khỏe khoắn", en: "robust and strong body" },
    ],
    hair: [
      { label: "Tóc layer tự nhiên đen", en: "natural layered black hair" },
      { label: "Tóc undercut nam tính nâu tối", en: "masculine dark brown undercut hair" },
      { label: "Tóc xoăn nhẹ lãng tử hạt dẻ", en: "romantic wavy chestnut hair" },
      { label: "Tóc rẽ ngôi 7/3 thanh lịch đen", en: "elegant black parted hair" },
      { label: "Tóc ngắn vuốt dựng cá tính", en: "short spiky styled hair" },
    ],
    face: [
      { label: "Góc cạnh nam tính", en: "chiseled masculine face with angular features" },
      { label: "Trái xoan thư sinh", en: "scholar oval face" },
      { label: "Cằm vuông cương nghị", en: "resolute square jawline face" },
    ],
    nose: [
      { label: "Mũi cao thẳng tắp", en: "high straight nose" },
      { label: "Mũi cao, cánh mũi gọn", en: "high neat nose" },
      { label: "Mũi cao góc cạnh nam tính", en: "high angular nose" },
    ],
    eyes: [
      { label: "Mắt hai mí cương nghị đen", en: "resolute double-eyelid black eyes" },
      { label: "Mắt một mí lạnh lùng nâu hổ phách", en: "cool single-eyelid amber eyes" },
      { label: "Mắt sâu cuốn hút xám khói", en: "deep attractive smoky grey eyes" },
      { label: "Mắt sáng thông minh hạt dẻ", en: "bright intelligent chestnut eyes" },
    ],
    mouth: [
      { label: "Môi mỏng nam tính", en: "thin masculine lips" },
      { label: "Khuôn miệng góc cạnh, cười nhẹ", en: "angular mouth with a slight smile" },
      { label: "Môi tự nhiên, điềm tĩnh", en: "natural calm lips" },
    ],
    outfit: [
      { label: "Đồng phục học sinh nam hiện đại", en: "modern male school uniform" },
      { label: "Đồ thường ngày năng động", en: "casual jacket and t-shirt" },
      { label: "Vest công sở lịch lãm", en: "elegant classy suit" },
      { label: "Trang phục thể thao khỏe khoắn", en: "athletic sportswear" },
      { label: "Yukata truyền thống lịch lãm", en: "elegant traditional Yukata" },
      { label: "Áo sơ mi trắng quần tây thanh lịch", en: "elegant white shirt and trousers" },
    ]
  }
};

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

interface CharactersTabProps {
  project: ProjectData;
  selectedCharacters: Record<number, boolean>;
  setSelectedCharacters: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
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
  generateAllCharacters: () => void;
  handleSelectAllCharacters: (checked: boolean) => void;
  handleSelectAllAssets: (checked: boolean) => void;
  handleGenerateSelectedCharacters: () => void;
  handleGenerateAllSelectedAssets: () => void;
  handleRegenerateFailedCharacters: () => void;
  handleStopBatch: () => void;
  setZoomedImageUrl: (url: string) => void;
  setZoomedImageName: (name: string) => void;
  handleDeleteReferenceImage: (type: 'character' | 'background', index: number, refIdx: number) => void;
  downloadSingleImage: (url: string, filename: string) => void;
  getCleanFilename: (type: string, name: string) => string;
  updateCharacter: (index: number, field: keyof Character, value: any) => void;
  toggleCharacterInstruction: (index: number, instruction: string) => void;
  generateImage: (type: 'character' | 'background', index: number, customPrompt?: string) => void;
  cleanApiUrl: string;
  activeStyleSuffix: string;
  selectedImageModel: string;
}

export const CharactersTab: React.FC<CharactersTabProps> = ({
  project,
  selectedCharacters,
  setSelectedCharacters,
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
  generateAllCharacters,
  handleSelectAllCharacters,
  handleSelectAllAssets,
  handleGenerateSelectedCharacters,
  handleGenerateAllSelectedAssets,
  handleRegenerateFailedCharacters,
  handleStopBatch,
  setZoomedImageUrl,
  setZoomedImageName,
  handleDeleteReferenceImage,
  downloadSingleImage,
  getCleanFilename,
  updateCharacter,
  toggleCharacterInstruction,
  generateImage,
  cleanApiUrl,
  activeStyleSuffix,
  selectedImageModel
}) => {
  // Helper to sanitize local media/server image URLs to avoid CORS or unresolved relative paths
  const sanitizeUrl = (url: any): string => {
    if (!url) return "";
    
    // Safeguard if url is an object (e.g. returned as {url: '...'} or similar)
    let urlStr = "";
    if (typeof url === "string") {
      urlStr = url;
    } else if (typeof url === "object") {
      if (typeof url.url === "string") {
        urlStr = url.url;
      } else if (typeof url.imageUrl === "string") {
        urlStr = url.imageUrl;
      } else {
        urlStr = String(url);
      }
    } else {
      urlStr = String(url);
    }

    if (!urlStr || urlStr === "[object Object]") return "";

    if (urlStr.startsWith("/")) {
      return `${cleanApiUrl}${urlStr}`;
    }
    try {
      const parsedUrl = new URL(urlStr);
      const host = parsedUrl.hostname;
      if (host === "0.0.0.0" || host === "127.0.0.1" || host === "localhost") {
        try {
          const apiOrigin = new URL(cleanApiUrl).origin;
          return `${apiOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        } catch (e) {
          const apiOrigin = cleanApiUrl.startsWith("http") ? new URL(cleanApiUrl).origin : `http://${cleanApiUrl}`;
          return `${apiOrigin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
      }
    } catch (e) {}
    return urlStr;
  };

  // States for Character Template Designer Modal
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [charName, setCharName] = useState("Mai");
  const [selectedVariants, setSelectedVariants] = useState<Record<number, boolean>>({});

  const [selectedGender, setSelectedGender] = useState<"female" | "male">("female");
  const [selectedAge, setSelectedAge] = useState<string>("young_adult");
  const [selectedBody, setSelectedBody] = useState<number>(0);
  const [selectedHair, setSelectedHair] = useState<number>(0);
  const [selectedFace, setSelectedFace] = useState<number>(0);
  const [selectedNose, setSelectedNose] = useState<number>(0);
  const [selectedEyes, setSelectedEyes] = useState<number>(0);
  const [selectedMouth, setSelectedMouth] = useState<number>(0);
  const [selectedOutfit, setSelectedOutfit] = useState<number>(0);
  const [customDetails, setCustomDetails] = useState<string>("");
  const [modalZoomUrl, setModalZoomUrl] = useState<string | null>(null);

  // States for text inputs
  const [hairVi, setHairVi] = useState<string>("");
  const [hairEn, setHairEn] = useState<string>("");
  const [faceVi, setFaceVi] = useState<string>("");
  const [faceEn, setFaceEn] = useState<string>("");
  const [noseVi, setNoseVi] = useState<string>("");
  const [noseEn, setNoseEn] = useState<string>("");
  const [eyesVi, setEyesVi] = useState<string>("");
  const [eyesEn, setEyesEn] = useState<string>("");
  const [mouthVi, setMouthVi] = useState<string>("");
  const [mouthEn, setMouthEn] = useState<string>("");

  // States for local image generation in the modal
  const [templateImageUrl, setTemplateImageUrl] = useState<string>("");
  const [templateMediaId, setTemplateMediaId] = useState<string>("");
  const [templateAccountId, setTemplateAccountId] = useState<string>("");
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [templateGenStatus, setTemplateGenStatus] = useState("");
  const [templateError, setTemplateError] = useState("");

  const openTemplateDesigner = () => {
    setIsDesignerOpen(true);
    setCharName("Mai");
    
    const initialSelections: Record<number, boolean> = {};
    project.characters.forEach((c, idx) => {
      initialSelections[idx] = false;
    });
    setSelectedVariants(initialSelections);
    
    setSelectedGender("female");
    setSelectedAge("young_adult");
    setSelectedBody(0);
    setSelectedHair(0);
    setSelectedFace(0);
    setSelectedNose(0);
    setSelectedEyes(0);
    setSelectedMouth(0);
    setSelectedOutfit(0);

    const opts = CHARACTER_OPTIONS["female"];
    setHairVi(opts.hair[0].label);
    setHairEn(opts.hair[0].en);
    setFaceVi(opts.face[0].label);
    setFaceEn(opts.face[0].en);
    setNoseVi(opts.nose[0].label);
    setNoseEn(opts.nose[0].en);
    setEyesVi(opts.eyes[0].label);
    setEyesEn(opts.eyes[0].en);
    setMouthVi(opts.mouth[0].label);
    setMouthEn(opts.mouth[0].en);

    setCustomDetails("");
    setTemplateImageUrl("");
    setTemplateMediaId("");
    setTemplateAccountId("");
    setTemplateError("");
    setIsGeneratingTemplate(false);
    setTemplateGenStatus("");
  };

  const handleGenderChange = (gender: "female" | "male") => {
    setSelectedGender(gender);
    setSelectedBody(0);
    setSelectedHair(0);
    setSelectedFace(0);
    setSelectedNose(0);
    setSelectedEyes(0);
    setSelectedMouth(0);
    setSelectedOutfit(0);

    const opts = CHARACTER_OPTIONS[gender];
    setHairVi(opts.hair[0].label);
    setHairEn(opts.hair[0].en);
    setFaceVi(opts.face[0].label);
    setFaceEn(opts.face[0].en);
    setNoseVi(opts.nose[0].label);
    setNoseEn(opts.nose[0].en);
    setEyesVi(opts.eyes[0].label);
    setEyesEn(opts.eyes[0].en);
    setMouthVi(opts.mouth[0].label);
    setMouthEn(opts.mouth[0].en);
  };

  const handleHairInputChange = (val: string) => {
    setHairVi(val);
    const matched = CHARACTER_OPTIONS[selectedGender].hair.find(h => h.label.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setHairEn(matched.en);
    } else {
      setHairEn(val);
    }
  };

  const handleFaceInputChange = (val: string) => {
    setFaceVi(val);
    const matched = CHARACTER_OPTIONS[selectedGender].face.find(f => f.label.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setFaceEn(matched.en);
    } else {
      setFaceEn(val);
    }
  };

  const handleNoseInputChange = (val: string) => {
    setNoseVi(val);
    const matched = CHARACTER_OPTIONS[selectedGender].nose.find(n => n.label.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setNoseEn(matched.en);
    } else {
      setNoseEn(val);
    }
  };

  const handleEyesInputChange = (val: string) => {
    setEyesVi(val);
    const matched = CHARACTER_OPTIONS[selectedGender].eyes.find(e => e.label.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setEyesEn(matched.en);
    } else {
      setEyesEn(val);
    }
  };

  const handleMouthInputChange = (val: string) => {
    setMouthVi(val);
    const matched = CHARACTER_OPTIONS[selectedGender].mouth.find(m => m.label.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      setMouthEn(matched.en);
    } else {
      setMouthEn(val);
    }
  };

  const handleGenerateTemplate = async () => {
    setIsGeneratingTemplate(true);
    setTemplateError("");
    setTemplateGenStatus("Đang gửi yêu cầu sinh ảnh đến API...");

    try {
      const modelsToTry = selectedImageModel === "auto" 
        ? ["GEM_PIX_2", "NARWHAL"] 
        : [selectedImageModel];
      let url = "";
      let mediaId = "";
      let accountId = "";
      let lastErrorMsg = "";

      for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        setTemplateGenStatus(`Đang gọi API (${currentModel})...`);

        try {
          const response = await fetch(`${cleanApiUrl}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt: `${enPrompt} Clean cinematic frame, absolutely NO text on screen, NO labels, NO character name tags, NO words printed, NO subtitles, NO watermarks, NO overlays. Visual Style: ${activeStyleSuffix || "high quality cinematic realism"}.`,
              count: 1,
              aspect_ratio: "IMAGE_ASPECT_RATIO_SQUARE",
              model: currentModel,
              for_video: true
            })
          });

          if (!response.ok) {
            let errorMsg = `HTTP Error: ${response.status}`;
            try {
              const errData = await response.json();
              if (errData && errData.error) errorMsg = errData.error;
            } catch (e) {}
            throw new Error(errorMsg);
          }

          const data = await response.json();
          if (data.success && data.images && data.images.length > 0) {
            const firstImg = data.images[0];
            url = sanitizeUrl(firstImg);
            if (firstImg && typeof firstImg === "object" && firstImg.media_id) {
              mediaId = firstImg.media_id;
            }
            if (data.account_id) {
              accountId = data.account_id;
            }
            break; // Succeeded!
          } else {
            throw new Error(data.message || "Không có ảnh trả về");
          }
        } catch (err: any) {
          console.warn(`Model ${currentModel} failed:`, err);
          lastErrorMsg = err.message;
        }
      }

      if (url) {
        setTemplateImageUrl(url);
        setTemplateMediaId(mediaId);
        setTemplateAccountId(accountId);
        setTemplateGenStatus("");
      } else {
        setTemplateError(lastErrorMsg || "Không thể tạo ảnh mẫu");
      }
    } catch (e: any) {
      let errorMsg = e.message || "Lỗi kết nối";
      if (errorMsg.includes("404")) {
        errorMsg = `${errorMsg}. LƯU Ý: Vui lòng kiểm tra lại "Địa chỉ Backend API (Local/LAN)" trong phần Cài đặt ở thanh công cụ bên trái. Đảm bảo cổng đang trỏ đến đúng máy chủ Python Backend (mặc định: http://127.0.0.1:5000), không phải cổng 3000 của giao diện Web App.`;
      }
      setTemplateError(errorMsg);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleApplyTemplate = () => {
    project.characters.forEach((c, idx) => {
      if (selectedVariants[idx]) {
        if (viDesc) {
          updateCharacter(idx, 'appearance', viDesc);
        }
        if (templateImageUrl) {
          const currentRefs = c.referenceImages || [];
          const exists = currentRefs.some(ref => ref.url === templateImageUrl);
          if (!exists && currentRefs.length < 10) {
            const updatedRefs = [
              ...currentRefs, 
              { 
                url: templateImageUrl, 
                name: `ref_${charName.toLowerCase()}_designed.jpg`,
                mediaId: templateMediaId || undefined,
                accountId: templateAccountId || undefined
              }
            ];
            updateCharacter(idx, 'referenceImages', updatedRefs);
          }
        }
      }
    });
    setIsDesignerOpen(false);
  };

  // Real-time calculated descriptions & prompts for the modal
  let viDesc = "";
  let enPrompt = "";
  if (isDesignerOpen) {
    const genderLabel = selectedGender === "female" ? "Nữ" : "Nam";
    const ageLabel = AGE_OPTIONS.find(a => a.id === selectedAge)?.label.split(" (")[0] || "";
    const ageEn = AGE_OPTIONS.find(a => a.id === selectedAge)?.en || "";
    const genderEn = selectedGender === "female" ? "female" : "male";

    viDesc = `Ảnh mẫu cận cảnh từ cổ trở lên của ${charName}, ${genderLabel.toLowerCase()}, ${ageLabel.toLowerCase()}, kiểu tóc ${hairVi.toLowerCase()}, khuôn mặt ${faceVi.toLowerCase()}, mũi ${noseVi.toLowerCase()}, mắt ${eyesVi.toLowerCase()}, miệng ${mouthVi.toLowerCase()}${customDetails.trim() ? `, ${customDetails.trim()}` : ""}, ảnh nền trắng.`;

    enPrompt = `A high-quality close-up headshot portrait of ${charName} from the neck up, front facing, a ${ageEn} ${genderEn}, ${hairEn}, ${faceEn}, ${noseEn}, ${eyesEn}, ${mouthEn}${customDetails.trim() ? `, ${customDetails.trim()}` : ""}. Plain solid white background, neutral expression, centered composition, clear studio lighting.`;
  }

  return (
    <div className="space-y-16">
      <div className="flex items-end justify-between border-b border-white/5 pb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">CHARACTER ARCHITECT</h2>
          <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">Visual Identity & DNA Mapping</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openTemplateDesigner}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl text-[10px] font-bold text-white transition-all flex items-center gap-3 uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            <Sparkles className="w-4 h-4 animate-pulse" /> Thiết kế ảnh mẫu
          </button>
          
          <button
            onClick={generateAllCharacters}
            disabled={isImageGenerating || isGenerating}
            className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-indigo-500/30 transition-all flex items-center gap-3 uppercase tracking-[0.2em] glow-indigo shadow-inner disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" /> Mass Render Casting
          </button>
        </div>
      </div>

      {/* Batch Action Panel for Characters */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-zinc-300 hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={project.characters.length > 0 && selectedCharsCount === project.characters.length}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedCharsCount > 0 && selectedCharsCount < project.characters.length;
                }
              }}
              onChange={(e) => handleSelectAllCharacters(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
            />
            Chọn tất cả NV
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
            Đã chọn: <span className="text-indigo-400 font-bold">{selectedCharsCount}</span> / {project.characters.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateSelectedCharacters}
            disabled={selectedCharsCount === 0 || isBatchGenerating || isImageGenerating || isGenerating}
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
            onClick={handleRegenerateFailedCharacters}
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
        {project.characters.map((char, index) => (
          <div key={index} className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl opacity-0 group-hover:opacity-10 blur transition duration-500"></div>
            <div className="relative bg-zinc-900/40 border border-white/10 rounded-2xl overflow-hidden hover:bg-zinc-900/60 transition-all duration-300">
              {/* Header bar inside the Character card showing reference images */}
              <div className="flex items-center justify-between gap-3 px-5 py-2 bg-white/[0.01] border-b border-white/5 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold shrink-0">
                    Ảnh tham chiếu (Tối đa 10 ảnh):
                  </span>
                  <div className="flex items-center gap-2">
                    {char.referenceImages && char.referenceImages.length > 0 ? (
                      char.referenceImages.map((ref, refIdx) => (
                        <div 
                          key={`char-ref-${refIdx}`}
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
                                setZoomedImageName(`char_${index}_ref_${refIdx + 1}.jpg`);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Phóng to"
                            >
                              <ZoomIn className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageSelectorTarget({ type: 'character', index, refIndex: refIdx })}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Thay thế từ thư viện"
                            >
                              <FolderOpen className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFileUploadTarget({ type: 'character', index, refIndex: refIdx });
                                setTimeout(() => refFileInputRef.current?.click(), 50);
                              }}
                              className="p-0.5 bg-white/10 hover:bg-indigo-600 text-white rounded transition-all cursor-pointer"
                              title="Tải từ máy"
                            >
                              <Upload className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReferenceImage('character', index, refIdx)}
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
                {(!char.referenceImages || char.referenceImages.length < 10) && (
                  <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-white/5">
                    <button
                      type="button"
                      onClick={() => setImageSelectorTarget({ type: 'character', index })}
                      className="px-1.5 py-0.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-indigo-300 rounded-md text-[7px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-2 h-2" /> Thư viện
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFileUploadTarget({ type: 'character', index });
                        setTimeout(() => refFileInputRef.current?.click(), 50);
                      }}
                      className="px-1.5 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 hover:text-violet-300 rounded-md text-[7px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer"
                    >
                      <Upload className="w-2 h-2" /> Tải từ máy
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
                    checked={!!selectedCharacters[index]}
                    onChange={(e) => setSelectedCharacters(prev => ({ ...prev, [index]: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                  />
                </div>

                {/* 2. HÌNH ẢNH */}
                <div className="w-32 bg-black/50 relative overflow-hidden flex-shrink-0 flex items-center justify-center border-r border-white/10 group">
                  {generatingImages[`character_${index}`] ? (
                    <div className="flex flex-col items-center justify-center gap-2 p-2 text-center w-full">
                      <RotateCcw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span className="text-[8px] font-mono text-zinc-400 leading-tight uppercase font-bold animate-pulse break-words max-w-full">
                        {generationStatuses[`image_character_${index}`] || "Veo..."}
                      </span>
                    </div>
                  ) : (
                    <>
                      {char.imageUrl ? (
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-3 text-center w-full h-full">
                          {generationErrors[`image_character_${index}`] ? (
                            <div className="text-red-500/90 text-[8px] font-mono leading-tight break-words max-w-full font-bold">
                              Lỗi: {generationErrors[`image_character_${index}`]}
                            </div>
                          ) : (
                            <User className="w-10 h-10 text-zinc-700 opacity-30" />
                          )}
                        </div>
                      )}
                      
                      {/* Hover Action Overlay */}
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        {char.imageUrl && (
                          <>
                            <button
                              onClick={() => {
                                setZoomedImageUrl(char.imageUrl!);
                                setZoomedImageName(getCleanFilename('char', char.name));
                              }}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Phóng to xem ảnh"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => downloadSingleImage(char.imageUrl!, getCleanFilename('char', char.name))}
                              className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Tải ảnh về máy"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setImageSelectorTarget({ type: 'character', index, isMain: true })}
                          className="p-1.5 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                          title="Thay thế ảnh đại diện chính từ thư viện"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 3. TÊN NHÂN VẬT */}
                <div className="w-48 border-r border-white/10 p-6 flex flex-col justify-center bg-black/10">
                  <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase tracking-widest block mb-1">CAST_MEMBER</span>
                  <h3 className="text-md font-black tracking-wider uppercase text-white italic glow-text font-heading break-words whitespace-normal overflow-wrap-anywhere">{char.name}</h3>
                </div>

                {/* 4. PROMPTS & DESCRIPTION */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-3 border-r border-white/10">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Mô tả đặc điểm</span>
                    <input
                      type="text"
                      value={char.appearance || ""}
                      onChange={(e) => updateCharacter(index, 'appearance', e.target.value)}
                      className="w-full bg-transparent text-xs text-zinc-300 border-none outline-none focus:ring-1 focus:ring-indigo-500/20 rounded px-2 py-1 hover:bg-white/[0.02] transition-all font-medium"
                      placeholder="Mô tả đặc điểm ngoại hình..."
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-indigo-400 uppercase tracking-widest block font-bold">Yêu cầu vẽ lại ngoại hình (Nếu có ảnh tham chiếu)</span>
                    <input
                      type="text"
                      value={char.appearanceInstruction !== undefined ? char.appearanceInstruction : "Maintain the identical facial features, facial identity, and hair style from the reference image, matching the character's appearance"}
                      onChange={(e) => updateCharacter(index, 'appearanceInstruction', e.target.value)}
                      className="w-full bg-black/40 text-[10px] font-medium text-white border border-white/5 focus:border-indigo-500/30 rounded-lg px-2.5 py-1.5 outline-none transition-all"
                      placeholder="Nhập yêu cầu tinh chỉnh (E.g. Tóc đen, Thêm mắt kính, Đồng phục học sinh...)"
                    />
                    
                    {/* Quick tags for Character */}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {[
                        { label: "📸 Vẽ 3 mặt từ ảnh mẫu", val: "Use reference ONLY for face/hair. Draw a clean 3-view full body sheet (front, side, back) with consistent appearance. Do NOT replicate the close-up composition." },
                        { label: "🏫 Đồng phục", val: "Modern Japanese school uniform" },
                        { label: "👔 Đồ công sở", val: "Formal business suit" },
                        { label: "🧥 Đồ thường ngày", val: "Casual Tokyo streetwear" },
                        { label: "🧥 Áo hoodie", val: "Casual hoodie jacket" },
                        { label: "🥋 Võ phục", val: "Traditional martial arts uniform" },
                        { label: "👓 Thêm kính", val: "Wearing glasses" },
                        { label: "🖤 Tóc đen", val: "Pure black hair" },
                        { label: "💛 Tóc vàng", val: "Blonde hair" },
                        { label: "🎒 Thêm ba lô", val: "With backpack" }
                      ].map((tag) => {
                        const active = (char.appearanceInstruction !== undefined ? char.appearanceInstruction : "Maintain the identical facial features, facial identity, and hair style from the reference image, matching the character's appearance").split(",").map(s => s.trim()).filter(Boolean).includes(tag.val);
                        return (
                          <button
                            key={tag.val}
                            type="button"
                            onClick={() => toggleCharacterInstruction(index, tag.val)}
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

                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Prompt hình ảnh (Lĩnh vực sinh ảnh)</span>
                    <textarea
                      value={char.prompt}
                      onChange={(e) => updateCharacter(index, 'prompt', e.target.value)}
                      className="w-full text-[10px] font-mono p-2.5 bg-black/40 rounded-lg border border-white/5 text-zinc-400 outline-none focus:border-indigo-500/30 focus:text-zinc-200 resize-none h-14 transition-all scrollbar-hide"
                    />
                  </div>
                </div>

                {/* 5. NÚT TẠO / TẠO LẠI */}
                <div className="w-44 p-6 flex flex-col items-center justify-center gap-2 bg-black/40">
                  <button
                    onClick={() => generateImage('character', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Vẽ Ảnh
                  </button>
                  <button
                    onClick={() => generateImage('character', index)}
                    disabled={isImageGenerating || isGenerating}
                    className="w-full py-1.5 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-3 h-3" /> Vẽ Lại
                  </button>
                  {generationErrors[`image_character_${index}`] && (
                    <div className="w-full mt-1.5 p-2 bg-red-950/30 border border-red-500/20 rounded-lg text-center">
                      <span className="text-[8px] font-mono text-red-400 leading-tight block break-words">
                        {generationErrors[`image_character_${index}`]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Character Template Designer Modal */}
      <AnimatePresence>
        {isDesignerOpen && (() => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#020203]/85 backdrop-blur-md z-[160] flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0b0c10] border border-white/10 rounded-3xl p-8 max-w-5xl w-full shadow-2xl relative my-8 max-h-[90vh] flex flex-col overflow-hidden text-left"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsDesignerOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6 shrink-0">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-wider uppercase text-white font-heading leading-tight">
                      Thiết kế ảnh mẫu nhân vật tự do
                    </h3>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                      Character DNA Creator & Consistency Reference Generator
                    </p>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 flex flex-col md:flex-row gap-8 custom-scrollbar">
                  
                  {/* Left Column: Customizing features */}
                  <div className="flex-1 space-y-6 overflow-y-auto pr-1 scrollbar-thin">
                    
                    {/* Character Name Input */}
                    <div className="space-y-2 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                      <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block">Tên nhân vật cơ bản</label>
                      <input
                        type="text"
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        placeholder="Ví dụ: Mai, Kenji..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-bold tracking-wider"
                      />
                    </div>

                    {/* Basic Info: Gender & Age */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block mb-2">Giới tính</label>
                        <div className="flex gap-2">
                          {GENDER_OPTIONS.map(g => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => handleGenderChange(g.id as any)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                selectedGender === g.id
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/10"
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block mb-2">Độ tuổi</label>
                        <div className="relative">
                          <select
                            value={selectedAge}
                            onChange={(e) => setSelectedAge(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50"
                          >
                            {AGE_OPTIONS.map(a => (
                              <option key={a.id} value={a.id}>{a.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Features Selectors */}
                    <div className="space-y-4">

                      {/* Hair Style */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">Kiểu tóc - màu sắc</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={hairVi}
                            onChange={(e) => handleHairInputChange(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-semibold"
                            placeholder="Nhập kiểu tóc tự do..."
                          />
                          <select
                            value={CHARACTER_OPTIONS[selectedGender].hair.findIndex(h => h.label === hairVi)}
                            onChange={(e) => {
                              const idx = parseInt(e.target.value);
                              if (idx >= 0) {
                                setSelectedHair(idx);
                                setHairVi(CHARACTER_OPTIONS[selectedGender].hair[idx].label);
                                setHairEn(CHARACTER_OPTIONS[selectedGender].hair[idx].en);
                              }
                            }}
                            className="w-48 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="-1">-- Chọn kiểu tóc mẫu --</option>
                            {CHARACTER_OPTIONS[selectedGender].hair.map((h, i) => (
                              <option key={i} value={i}>
                                {h.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Face Shape */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">Kiểu khuôn mặt</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={faceVi}
                            onChange={(e) => handleFaceInputChange(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-semibold"
                            placeholder="Nhập kiểu khuôn mặt tự do..."
                          />
                          <select
                            value={CHARACTER_OPTIONS[selectedGender].face.findIndex(f => f.label === faceVi)}
                            onChange={(e) => {
                              const idx = parseInt(e.target.value);
                              if (idx >= 0) {
                                setSelectedFace(idx);
                                setFaceVi(CHARACTER_OPTIONS[selectedGender].face[idx].label);
                                setFaceEn(CHARACTER_OPTIONS[selectedGender].face[idx].en);
                              }
                            }}
                            className="w-48 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="-1">-- Chọn kiểu mặt mẫu --</option>
                            {CHARACTER_OPTIONS[selectedGender].face.map((f, i) => (
                              <option key={i} value={i}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Nose Shape */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">Kiểu mũi</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noseVi}
                            onChange={(e) => handleNoseInputChange(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-semibold"
                            placeholder="Nhập kiểu mũi tự do..."
                          />
                          <select
                            value={CHARACTER_OPTIONS[selectedGender].nose.findIndex(n => n.label === noseVi)}
                            onChange={(e) => {
                              const idx = parseInt(e.target.value);
                              if (idx >= 0) {
                                setSelectedNose(idx);
                                setNoseVi(CHARACTER_OPTIONS[selectedGender].nose[idx].label);
                                setNoseEn(CHARACTER_OPTIONS[selectedGender].nose[idx].en);
                              }
                            }}
                            className="w-48 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="-1">-- Chọn kiểu mũi mẫu --</option>
                            {CHARACTER_OPTIONS[selectedGender].nose.map((n, i) => (
                              <option key={i} value={i}>
                                {n.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Eye Shape */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">Kiểu mắt - màu mắt</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={eyesVi}
                            onChange={(e) => handleEyesInputChange(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-semibold"
                            placeholder="Nhập kiểu mắt tự do..."
                          />
                          <select
                            value={CHARACTER_OPTIONS[selectedGender].eyes.findIndex(e => e.label === eyesVi)}
                            onChange={(e) => {
                              const idx = parseInt(e.target.value);
                              if (idx >= 0) {
                                setSelectedEyes(idx);
                                setEyesVi(CHARACTER_OPTIONS[selectedGender].eyes[idx].label);
                                setEyesEn(CHARACTER_OPTIONS[selectedGender].eyes[idx].en);
                              }
                            }}
                            className="w-48 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="-1">-- Chọn kiểu mắt mẫu --</option>
                            {CHARACTER_OPTIONS[selectedGender].eyes.map((eOpt, i) => (
                              <option key={i} value={i}>
                                {eOpt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Mouth */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">Miệng</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mouthVi}
                            onChange={(e) => handleMouthInputChange(e.target.value)}
                            className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-semibold"
                            placeholder="Nhập kiểu miệng tự do..."
                          />
                          <select
                            value={CHARACTER_OPTIONS[selectedGender].mouth.findIndex(m => m.label === mouthVi)}
                            onChange={(e) => {
                              const idx = parseInt(e.target.value);
                              if (idx >= 0) {
                                setSelectedMouth(idx);
                                setMouthVi(CHARACTER_OPTIONS[selectedGender].mouth[idx].label);
                                setMouthEn(CHARACTER_OPTIONS[selectedGender].mouth[idx].en);
                              }
                            }}
                            className="w-48 bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                          >
                            <option value="-1">-- Chọn kiểu miệng mẫu --</option>
                            {CHARACTER_OPTIONS[selectedGender].mouth.map((m, i) => (
                              <option key={i} value={i}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>


                    </div>

                    {/* Custom details */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest font-black block">Chi tiết bổ sung khác (Nếu có)</label>
                      <input
                        type="text"
                        value={customDetails}
                        onChange={(e) => setCustomDetails(e.target.value)}
                        placeholder="Ví dụ: đeo mắt kính tròn, tóc mái ngố, nốt ruồi dưới môi..."
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
                      />
                    </div>

                    {/* Application target list */}
                    <div className="space-y-3 bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block font-black mb-1">
                        Áp dụng cho các biến thể trong truyện
                      </span>
                      <p className="text-[9px] text-zinc-500 leading-normal mb-3">
                        Chọn các biến thể của nhân vật này để áp dụng mô tả đặc điểm & sử dụng ảnh mẫu làm ảnh tham chiếu (referenceImages):
                      </p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {project.characters.map((c, idx) => (
                          <label
                            key={idx}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              selectedVariants[idx]
                                ? "bg-indigo-500/10 border-indigo-500/30 text-white"
                                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={!!selectedVariants[idx]}
                                onChange={(e) => {
                                  setSelectedVariants(prev => ({
                                    ...prev,
                                    [idx]: e.target.checked
                                  }));
                                }}
                                className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                              />
                              {c.imageUrl && (
                                <img
                                  src={c.imageUrl}
                                  alt={c.name}
                                  className="w-6 h-6 rounded-md object-cover border border-white/10"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <span className="text-xs font-bold font-mono tracking-wider">{c.name}</span>
                            </div>
                            <span className="text-[9px] font-mono text-zinc-600 truncate max-w-[12rem] italic">
                              {c.appearance || "Chưa có mô tả"}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Live Preview & Image Generator */}
                  <div className="w-full md:w-96 flex flex-col gap-6 shrink-0 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                    
                    {/* Live Preview Text */}
                    <div className="space-y-4">
                      <div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold block mb-1">Mô tả tiếng Việt</span>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-zinc-300 leading-relaxed font-medium">
                          {viDesc}
                        </div>
                      </div>

                      <div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-bold block mb-1">Prompt tiếng Anh (Tối ưu AI)</span>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[9px] text-zinc-400 leading-relaxed font-mono select-all overflow-y-auto max-h-24 scrollbar-thin">
                          {enPrompt}
                        </div>
                      </div>
                    </div>

                    {/* Image Render Space */}
                    <div className="flex-1 flex flex-col justify-center items-center bg-black/50 border border-white/10 rounded-2xl relative overflow-hidden min-h-[16rem]">
                      {isGeneratingTemplate ? (
                        <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                          <span className="text-[10px] font-mono text-zinc-400 leading-tight uppercase font-bold animate-pulse">
                            {templateGenStatus || "Đang kết nối API..."}
                          </span>
                        </div>
                      ) : templateImageUrl ? (
                        <div className="relative w-full h-full group/modalimg">
                          <img
                            src={templateImageUrl}
                            alt="Generated template"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Image Actions Overlay */}
                          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center gap-2 opacity-0 group-hover/modalimg:opacity-100 transition-opacity duration-300">
                            <button
                              type="button"
                              onClick={() => setModalZoomUrl(templateImageUrl)}
                              className="p-2 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Phóng to"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadSingleImage(templateImageUrl, `${charName.toLowerCase()}_designed_template.jpg`)}
                              className="p-2 bg-white/10 hover:bg-indigo-600 border border-white/10 hover:border-indigo-400 text-white rounded-xl transition-all hover:scale-110 cursor-pointer shadow-lg"
                              title="Tải về máy"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-zinc-500">
                          {templateError ? (
                            <div className="text-red-500 text-[10px] font-mono leading-relaxed break-words font-bold px-4">
                              Lỗi sinh ảnh: {templateError}
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-12 h-12 opacity-20" />
                              <span className="text-[10px] font-mono leading-relaxed uppercase tracking-wider font-bold">Chưa có ảnh mẫu</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action buttons inside sidebar */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleGenerateTemplate}
                        disabled={isGeneratingTemplate}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isGeneratingTemplate ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Đang Vẽ...</span>
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-4 h-4" />
                            <span>Vẽ Ảnh Mẫu Nhân Vật</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDesignerOpen(false)}
                    className="px-5 py-2.5 bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyTemplate}
                    disabled={!templateImageUrl && !viDesc}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    <span>Áp dụng vào truyện</span>
                  </button>
                </div>

              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Modal Zoom Lightbox for designed image */}
      <AnimatePresence>
        {modalZoomUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalZoomUrl(null)}
            className="fixed inset-0 bg-[#020203]/95 backdrop-blur-md z-[170] flex flex-col items-center justify-center p-8 cursor-pointer select-none animate-fade-in"
          >
            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={modalZoomUrl}
                alt="Zoomed Designed Character"
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setModalZoomUrl(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => downloadSingleImage(modalZoomUrl, `${charName.toLowerCase()}_designed_template.jpg`)}
                className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải Xuống
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
