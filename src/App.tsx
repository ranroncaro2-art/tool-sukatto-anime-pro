"use client";
import React, { useState } from "react";
import {
  Upload, RotateCcw, Play, AlertCircle, CheckCircle2,
  Image as ImageIcon, Camera, User, Download, Key, FolderOpen,
  Settings, Eye, EyeOff, FileText, Terminal, Cpu, Plus, Trash2, Database,
  ZoomIn, Maximize2, StopCircle, PlayCircle, AlertOctagon, X,
  Sparkles, Globe, Copy, Check, Tags, Music, ChevronLeft, ChevronRight, Save,
  Film, Clapperboard, Box, LogOut
} from "lucide-react";
import { parseSRT, parseScript, mergeShortSRTAndScript, detectCharacters } from "./utils/parsers";
import { SRTBlock, ScriptLine, ProjectData, PromptRule } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import { generateAssetPrompt, generateShotPrompt, generateThumbnailAnalysisPrompt, generateSEOPrompt } from "./prompts";
import { extractEmotion } from "./utils/parsers";
import { Character, Background, Shot, Situation, ShotRefImage, Prop } from "./types";
import { VisualStyle, defaultStyles } from "./styles";
import { ThumbnailTab } from "./components/ThumbnailTab";
import { SeoTab } from "./components/SeoTab";
import { CinemaTab } from "./components/CinemaTab";
import { CharactersTab } from "./components/CharactersTab";
import { BackgroundsTab } from "./components/BackgroundsTab";
import { PropsTab } from "./components/PropsTab";
import { ShotsTab } from "./components/ShotsTab";
import { LoginScreen } from "./components/LoginScreen";
const ShotsTabAny = ShotsTab as any;



function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fixUnescapedQuotes(jsonStr: string): string {
  let inString = false;
  let escaped = false;
  let result = "";
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }
    if (char === '\\') {
      result += char;
      if (inString) {
        escaped = true;
      }
      continue;
    }
    if (char === '"') {
      if (!inString) {
        inString = true;
        result += char;
      } else {
        // Lookahead delimiter check
        let isRealClose = false;
        let j = i + 1;
        while (j < jsonStr.length) {
          const nextChar = jsonStr[j];
          if (/\s/.test(nextChar)) {
            j++;
            continue;
          }
          if (nextChar === ':' || nextChar === ',' || nextChar === '}' || nextChar === ']') {
            isRealClose = true;
          }
          break;
        }
        if (j >= jsonStr.length) {
          isRealClose = true;
        }
        
        if (isRealClose) {
          inString = false;
          result += char;
        } else {
          result += '\\"';
        }
      }
    } else {
      result += char;
    }
  }
  return result;
}

export const getResponseText = (res: any): string => {
  if (!res) return "";
  if (typeof res.text === "string" && res.text) {
    return res.text;
  }
  if (res.candidates?.[0]?.content?.parts) {
    const text = res.candidates[0].content.parts
      .filter((p: any) => typeof p.text === 'string')
      .map((p: any) => p.text)
      .join('');
    if (text) return text;
  }
  return "";
};

export const safeJsonParse = (text: string, customErrorMsg?: string) => {
  if (!text) throw new Error("safeJsonParse: Dữ liệu JSON trống");
  let cleaned = text.replace(/```(?:json)?\n?|```/gi, "").trim();
  try {
    const fixed = cleaned.replace(/,\s*([\]}])/g, "$1");
    return JSON.parse(fixed);
  } catch (e: any) {
    try {
      const escapedQuotes = fixUnescapedQuotes(cleaned);
      const fixed = escapedQuotes.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(fixed);
    } catch (e2: any) {
      try {
        const fixedControl = cleaned
          .replace(/,\s*([\]}])/g, "$1")
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        return JSON.parse(fixedControl);
      } catch (e3: any) {
        console.error("JSON Parse Error. Raw text:", text);
        throw new Error(customErrorMsg || `AI Engine formatting error. Please try clicking 'Regenerate' or 'Initiate Production' again.`);
      }
    }
  }
};

const cleanBg = (text: string) => {
  const bgMatch = text.match(/^\[(.*?)\]/);
  let name = bgMatch ? bgMatch[1] : text.split(" + ")[0].split(",")[0];
  return name.split(/\s+(?:Medium|Close|Wide|Shot|Profile|OTS|Two-shot)/i)[0].trim();
};

const cleanPromptForAiModel = (rawPrompt: string, project?: any): string => {
  if (!rawPrompt) return "";
  let cleaned = rawPrompt;

  // 1. Remove underscores and location suffixes from character variant names.
  if (project?.characters) {
    project.characters.forEach((char: any) => {
      const name = char.name;
      const baseName = name.split(/[_\s]/)[0];
      if (baseName && baseName.length > 1) {
        const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
        cleaned = cleaned.replace(regex, baseName);
      }
    });
  }

  // Replace generic word_variant or word variant patterns just in case
  cleaned = cleaned.replace(/\b([a-zA-Z0-9]+)_(Home|Formal|Casual|Office|School|Work|Classroom|Night|Day|Evening|Morning|Interior|Exterior|Lounge)\b/g, "$1");
  cleaned = cleaned.replace(/\b([A-Z][a-zA-Z0-9]+)\s(Home|Formal|Casual|Office|School|Work|Classroom|Night|Day|Evening|Morning|Interior|Exterior|Lounge)\b/g, "$1");

  // 2. Append strict negative prompt / formatting safety keywords
  cleaned = `${cleaned.trim()} Clean cinematic frame, absolutely NO text on screen, NO labels, NO character name tags, NO words printed, NO subtitles, NO watermarks, NO overlays.`;

  return cleaned;
};

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

const getCleanFilename = (_type: string, name: string) => {
  // Remove file extension if present
  let nameWithoutExt = name.replace(/\.[^/.]+$/, "");
  
  // Replace spaces and special characters with underscore, preserve alphanumeric and Vietnamese/UTF-8 alphanumeric characters
  let normalized = nameWithoutExt
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u00C0-\u1EF9đĐ]/gi, "_")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "");
    
  return `${normalized}.jpg`;
};

const getLogTime = (log: string): number => {
  const match = log.match(/^\[(\d{2}):(\d{2}):(\d{2})\]/);
  if (match) {
    const [_, hh, mm, ss] = match;
    const d = new Date();
    d.setHours(parseInt(hh, 10), parseInt(mm, 10), parseInt(ss, 10), 0);
    return d.getTime();
  }
  return Date.now();
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

const getMatchedProps = (shot: Shot, props: Prop[]) => {
  if (!props || !shot) return [];
  const promptLower = (shot.prompt || "").toLowerCase();
  
  return props.filter(prop => {
    if (!prop.imageUrl) return false;
    const nameLower = prop.name.toLowerCase();
    const regex = new RegExp(`\\b${nameLower.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(promptLower);
  });
};

const getShotHasRef = (shot: Shot, characters: Character[], backgrounds: Background[], props?: Prop[]) => {
  if (!shot) return false;
  if (shot.referenceImages && shot.referenceImages.length > 0) return true;
  const matchedChars = getMatchedCharacters(shot, characters);
  const matchedBgs = getMatchedBackgrounds(shot, backgrounds);
  const matchedProps = getMatchedProps(shot, props || []);
  return matchedChars.length > 0 || matchedBgs.length > 0 || matchedProps.length > 0;
};


const composeThumbnailPrompt = (style: any, data: any, projectCharacters?: Character[]): string => {
  if (!style || !data) return "";
  
  const sanitizeSafetyTriggers = (text: string): string => {
    if (!text) return "";
    let cleaned = text;

    // 1. Remove explicit minor age statements like "Age: 10", "Age: 12", etc.
    cleaned = cleaned.replace(/\bAge:\s*\d+\b/gi, "");
    cleaned = cleaned.replace(/\bage\s*\d+\b/gi, "");
    
    // 2. Replace minor-specific triggering words with safe equivalents
    cleaned = cleaned.replace(/\b10-year-old\b/gi, "young student");
    cleaned = cleaned.replace(/\b12-year-old\b/gi, "young student");
    cleaned = cleaned.replace(/\b8-year-old\b/gi, "young student");
    cleaned = cleaned.replace(/\bchild\b/gi, "student");
    cleaned = cleaned.replace(/\bkid\b/gi, "student");
    cleaned = cleaned.replace(/\bminors?\b/gi, "students");

    // 3. Replace safety filter red-flag words
    cleaned = cleaned.replace(/\bpredatory\b/gi, "sinister");
    cleaned = cleaned.replace(/\bpredatory intent\b/gi, "sinister scheme");
    
    // 4. Sanitize sensitive physical interactions
    cleaned = cleaned.replace(/reaches? out to touch/gi, "points demandingly towards");
    cleaned = cleaned.replace(/reach out to touch/gi, "point demandingly towards");
    cleaned = cleaned.replace(/touch(?:es)? Mina's blouse/gi, "glare aggressively at Mina");
    cleaned = cleaned.replace(/touch(?:es)? Minas blouse/gi, "glare aggressively at Mina");
    cleaned = cleaned.replace(/touch(?:es)? her blouse/gi, "points at her");
    cleaned = cleaned.replace(/touch(?:es)? her chest/gi, "points at her");
    cleaned = cleaned.replace(/touch(?:es)? her clothes/gi, "points at her");

    // 5. Soften extreme emotional states associated with children in conflict
    cleaned = cleaned.replace(/\bterrified\b/gi, "extremely distressed");
    cleaned = cleaned.replace(/\bdesperate\b/gi, "anxious");
    cleaned = cleaned.replace(/\bvulnerability and fear\b/gi, "anxiety and defiance");

    // Clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned;
  };

  const cleanSceneDescription = (desc: string): string => {
    if (!desc) return "";
    
    // 1. Strip double and single quotes along with their contents to prevent English translation dialogue from leaking into the scene
    let cleaned = desc.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
    
    // 2. Strip Japanese corner quotes and their contents
    cleaned = cleaned.replace(/「[^」]*」/g, "");
    
    // 3. Remove Japanese characters (Hiragana, Katakana, Kanji, and full-width symbols) to ensure only clean English descriptions are used
    cleaned = cleaned.replace(/[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF\u4E00-\u9FAF]+/g, "");
    
    // 4. Remove speech bubble and balloon references case-insensitively
    cleaned = cleaned.replace(/\b(?:speech bubble|speech bubbles|dialogue bubble|dialogue bubbles|dialogue box|dialogue boxes|speech balloon|speech balloons|bubble|bubbles|balloon|balloons|dialogue|dialogues|box|boxes)\b/gi, "");
    
    // 5. Remove dialogue/speaking verbs case-insensitively to prevent duplicate bubble generation
    cleaned = cleaned.replace(/\b(?:says|saying|yells|yelling|shouts|shouting|screams|screaming|whispers|whispering|asks|asking|replies|replying|tells|telling|speaks|speaking|talks|talking|states|stating|declares|declaring|demands|demanding|exclaims|exclaiming|expresses|expressing|warns|warning|promises|promising|answers|answering|responds|responding)\b/gi, "");
    
    // 6. Remove comparison label words case-insensitively to prevent visual labels on the image
    cleaned = cleaned.replace(/\b(?:before|after|previous|next|v1|v2|v3|label|labels|labeled|labelled|panel|panels|side|sides|left|right)\b/gi, "");
    
    // 7. Remove remaining quote characters
    cleaned = cleaned.replace(/[「」""'']/g, "");
    
    // 8. Clean up double spaces or trailing/leading punctuation
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    
    return cleaned;
  };

  const formatTextLines = (text: string): string => {
    if (!text) return "";
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return `「${text}」`;
    return `written exactly on these ${lines.length} sequential lines:\n` + lines.map((l, idx) => `Line ${idx + 1}: 「${l}」`).join("\n");
  };

  const getShapeDescription = (shape?: string): string => {
    switch (shape) {
      case "smooth_round": return "smooth round classic comic speech bubble";
      case "thought_cloud": return "fluffy thought-cloud comic bubble representing inner thoughts";
      case "jagged_anger": return "sharp jagged spiky anger comic speech bubble";
      case "spiky_explosion": return "explosive spiky comic action speech bubble";
      case "shaky_spine": return "shaky trembling spine dynamic shock comic bubble";
      case "rectangular_box": return "prominent vertical rectangular manga narrative text box";
      default: return "comic-style speech bubble";
    }
  };

  const getSizeDescription = (size?: string): string => {
    switch (size) {
      case "small": return "small and unobtrusive";
      case "medium": return "perfectly balanced medium-sized";
      case "large": return "bold and large";
      case "massive": return "massive and highly dramatic, dominating the panel space";
      default: return "clear and readable";
    }
  };

  const beforeSceneDescription = cleanSceneDescription(data.beforeScene?.mainAction || "");
  const beforeLocation = data.beforeScene?.location ? `at ${cleanSceneDescription(data.beforeScene.location)}` : "";
  const beforeSceneStr = `${beforeSceneDescription} ${beforeLocation}`.trim();
  
  // Look up characters in BEFORE scene
  const beforeCharNames = data.beforeScene?.characterNames || [];
  let beforeCharPrompts = "";
  if (projectCharacters && beforeCharNames.length > 0) {
    const chars = projectCharacters.filter(c => 
      beforeCharNames.some((name: string) => 
        c.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(c.name.toLowerCase())
      )
    );
    if (chars.length > 0) {
      beforeCharPrompts = "\nCharacters in the right panel:\n" + chars.map(c => `- ${c.name}: ${c.appearance || c.prompt}`).join("\n");
    }
  }

  const beforeLighting = `${style.colorStyle?.beforeTone?.lighting || ""} (${style.colorStyle?.beforeTone?.mood || ""})`;
  const villainEmotion = Array.isArray(data.beforeScene?.villainEmotion) ? cleanSceneDescription(data.beforeScene.villainEmotion.join(", ")) : cleanSceneDescription(data.beforeScene?.villainEmotion || "");
  const heroEmotion = Array.isArray(data.beforeScene?.heroEmotion) ? cleanSceneDescription(data.beforeScene.heroEmotion.join(", ")) : cleanSceneDescription(data.beforeScene?.heroEmotion || "");
  
  const villainShape = getShapeDescription(style.villainBubble?.shape);
  const villainSize = getSizeDescription(style.villainBubble?.size);
  const villainBubbleStyle = `Background: ${style.villainBubble?.background || ""}, Border: ${style.villainBubble?.border || ""}, TextColor: ${style.villainBubble?.textColor || ""}, HighlightColor: ${style.villainBubble?.highlightColor || ""}`;
  const villainBubbleText = data.villainBubble?.text || "";
  const villainBubbleHighlight = data.villainBubble?.highlight || "";
  
  const heroResponseShape = getShapeDescription(style.heroResponseBubble?.shape);
  const heroResponseSize = getSizeDescription(style.heroResponseBubble?.size);
  const heroResponseBubbleStyle = `Background: ${style.heroResponseBubble?.background || ""}, Border: ${style.heroResponseBubble?.border || ""}, TextColor: ${style.heroResponseBubble?.textColor || ""}, HighlightColor: ${style.heroResponseBubble?.highlightColor || ""}`;
  const heroResponseBubbleText = data.heroResponseBubble?.text || "";
  const heroResponseBubbleHighlight = data.heroResponseBubble?.highlight || "";
  
  const afterSceneDescription = cleanSceneDescription(data.afterScene?.mainAction || "");
  const afterLocation = data.afterScene?.location ? `at ${cleanSceneDescription(data.afterScene.location)}` : "";
  const afterSceneStr = `${afterSceneDescription} ${afterLocation}`.trim();
  
  // Look up characters in AFTER scene
  const afterCharNames = data.afterScene?.characterNames || [];
  let afterCharPrompts = "";
  if (projectCharacters && afterCharNames.length > 0) {
    const chars = projectCharacters.filter(c => 
      afterCharNames.some((name: string) => 
        c.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(c.name.toLowerCase())
      )
    );
    if (chars.length > 0) {
      afterCharPrompts = "\nCharacters in the left panel:\n" + chars.map(c => `- ${c.name}: ${c.appearance || c.prompt}`).join("\n");
    }
  }

  const afterLighting = `${style.colorStyle?.afterTone?.lighting || ""} (${style.colorStyle?.afterTone?.mood || ""})`;
  const heroAfterEmotion = Array.isArray(data.afterScene?.heroEmotion) ? cleanSceneDescription(data.afterScene.heroEmotion.join(", ")) : cleanSceneDescription(data.afterScene?.heroEmotion || "");
  const villainAfterEmotion = Array.isArray(data.afterScene?.villainEmotion) ? cleanSceneDescription(data.afterScene.villainEmotion.join(", ")) : cleanSceneDescription(data.afterScene?.villainEmotion || "");
  
  const heroShape = getShapeDescription(style.heroBubble?.shape);
  const heroSize = getSizeDescription(style.heroBubble?.size);
  const heroBubbleStyle = `Background: ${style.heroBubble?.background || ""}, Border: ${style.heroBubble?.border || ""}, TextColor: ${style.heroBubble?.textColor || ""}, HighlightColor: ${style.heroBubble?.highlightColor || ""}`;
  const heroBubbleText = data.heroBubble?.text || "";
  const heroBubbleHighlight = data.heroBubble?.highlight || "";

  const villainReactionShape = getShapeDescription(style.villainReactionBubble?.shape);
  const villainReactionSize = getSizeDescription(style.villainReactionBubble?.size);
  const villainReactionBubbleStyle = `Background: ${style.villainReactionBubble?.background || ""}, Border: ${style.villainReactionBubble?.border || ""}, TextColor: ${style.villainReactionBubble?.textColor || ""}, HighlightColor: ${style.villainReactionBubble?.highlightColor || ""}`;
  const villainReactionBubbleText = data.villainReactionBubble?.text || "";
  const villainReactionBubbleHighlight = data.villainReactionBubble?.highlight || "";
  
  const isCornerVariant = style.layout?.variant === "split_corner_panels";

  const centerPanelStyle = `Center panel hook with width: ${style.layout?.centerPanelWidth || "15%"}, Background: ${style.centerPanel?.background || ""}, MainTextColor: ${style.centerPanel?.mainTextColor || ""}, HighlightColor: ${style.centerPanel?.highlightColor || ""}, Outline: ${style.centerPanel?.outline || ""}, Effect: ${style.centerPanel?.effect || ""}`;
  const centerText = data.centerHook?.fullText || "";
  const centerKeywords = Array.isArray(data.centerHook?.highlightKeywords) ? data.centerHook.highlightKeywords.join(", ") : (data.centerHook?.highlightKeywords || "");

  const topRightText = data.topRightHook?.fullText || data.centerHook?.fullText || "";
  const topRightKeywords = Array.isArray(data.topRightHook?.highlightKeywords) ? data.topRightHook.highlightKeywords.join(", ") : (data.topRightHook?.highlightKeywords || data.centerHook?.highlightKeywords || "");

  const bottomLeftText = data.bottomLeftHook?.fullText || data.centerHook?.fullText || "";
  const bottomLeftKeywords = Array.isArray(data.bottomLeftHook?.highlightKeywords) ? data.bottomLeftHook.highlightKeywords.join(", ") : (data.bottomLeftHook?.highlightKeywords || data.centerHook?.highlightKeywords || "");

  const globalStyleLockStr = Array.isArray(style.globalStyleLock) ? style.globalStyleLock.join(", ") : (style.globalStyleLock || "");
  
  let middleSectionStr = "";
  let textRulesStr = "";
  let layoutStyleTag = "";

  if (isCornerVariant) {
    middleSectionStr = `No center dividing panel or vertical center strip. The split-screen transition between the two halves is a clean, sharp boundary line.

Top-right corner text panel (Buildup & Context):
Draw a prominent rectangular text box located at the top-right corner/margin of the image. Text box style: Background: ${style.centerPanel?.background || "vertical black rectangle with red speed lines"}, MainTextColor: ${style.centerPanel?.mainTextColor || "white"}, HighlightColor: ${style.centerPanel?.highlightColor || "blood red"}, Outline: ${style.centerPanel?.outline || "thick white outline"}, Effect: ${style.centerPanel?.effect || "3D manga typography"}. The text box must contain ONLY the bold vertical Japanese text, ${formatTextLines(topRightText)} with the specific phrase 「${topRightKeywords}」 heavily emphasized in the highlight color.

Bottom-left corner text panel (Consequence & Outcome):
Draw a prominent rectangular text box located at the bottom-left corner/margin of the image. Text box style: Background: ${style.heroBubble?.background || "yellow"}, MainTextColor: ${style.heroBubble?.textColor || "bold black"}, HighlightColor: ${style.heroBubble?.highlightColor || "bright red"}, Outline: ${style.heroBubble?.border || "thick red"}, Effect: 3D manga typography. The text box must contain ONLY the bold vertical Japanese text, ${formatTextLines(bottomLeftText)} with the specific phrase 「${bottomLeftKeywords}」 heavily emphasized in the highlight color.`;

    textRulesStr = `Only Japanese manga typography is allowed in the top-right and bottom-left corner text boxes and inside the speech bubbles. No other text or letters anywhere.`;
    layoutStyleTag = "split-screen with two corner text panels, no center panel";
  } else {
    middleSectionStr = `Vertical separating center panel:
${centerPanelStyle}
Massive vertical Japanese text inside the center panel, ${formatTextLines(centerText)}
Highlighted keywords:
${centerKeywords}`;

    textRulesStr = `Only Japanese manga typography is allowed in the vertical center panel and inside the speech bubbles. No other text or letters anywhere.`;
    layoutStyleTag = "vertical center text panel";
  }

  return sanitizeSafetyTriggers(`A high-CTR Sukatto manga YouTube thumbnail focusing on ${data.focus || ""}, using a sharp split-screen format.

The right half of the split-screen image depicts the starting scenario of conflict (dynamic physical scolding):
${beforeSceneStr}${beforeCharPrompts}
Lighting style:
${beforeLighting}
Villain expression & physical action (aggressive scolding, positioned on the right side of this right panel, facing left):
${villainEmotion}
Hero expression & physical action (patiently enduring or looking down, positioned on the left side of this right panel, facing right):
${heroEmotion}
Speech bubbles on the right half (exactly two distinct bubbles, strictly mapped to each character's relative position):
1. Villain main speech bubble (scolding): Draw a ${villainSize} ${villainShape} placed on the right side of this panel. The bubble's tail/pointer must point directly and cleanly to the mouth of the villain standing on the right. Style details: ${villainBubbleStyle}. The bubble must contain ONLY the Japanese text, ${formatTextLines(villainBubbleText)} with the specific key phrase 「${villainBubbleHighlight}」 heavily emphasized in bright highlighted color. Ensure no duplicate words and no repeated characters on line wraps.
2. Hero response speech bubble (enduring or inner thought): Draw a ${heroResponseSize} ${heroResponseShape} placed on the left side of this panel. The bubble's tail/pointer must point directly and cleanly to the head/mouth of the hero on the left. Style details: ${heroResponseBubbleStyle}. The bubble must contain ONLY the Japanese text, ${formatTextLines(heroResponseBubbleText)} with the specific phrase 「${heroResponseBubbleHighlight}」 rendered in thin style. Ensure no duplicate words and no repeated characters on line wraps.

The left half of the split-screen image depicts the subsequent resolution scenario of confrontation (active 3D dynamic counter-attack):
⚠️ CRITICAL: The characters must actively interact in a 3D space, pointing at or quailing from each other. No posing or staring straight at the camera.
${afterSceneStr}${afterCharPrompts}
Lighting style:
${afterLighting}
Hero dominance expression & physical action (accusingly pointing or presenting evidence at the villain, positioned on the left side of this left panel, facing right):
${heroAfterEmotion}
Villain collapse expression & physical action (cowering in fear, sweat drops, wide eyes or dropping to knees, positioned on the right side of this left panel, facing left):
${villainAfterEmotion}
Speech bubbles on the left half (exactly two distinct bubbles, strictly mapped to each character's relative position):
1. Hero main speech bubble (climax counter-attack): Draw a ${heroSize} ${heroShape} placed on the left side of this panel. The bubble's tail/pointer must point directly and cleanly to the mouth of the hero standing/accusing on the left. Style details: ${heroBubbleStyle}. The bubble must contain ONLY the Japanese text, ${formatTextLines(heroBubbleText)} with the specific key phrase 「${heroBubbleHighlight}」 heavily emphasized in bright highlighted color. Ensure no duplicate words and no repeated characters on line wraps.
2. Villain reaction speech bubble (trembling shock): Draw a ${villainReactionSize} ${villainReactionShape} placed on the right side of this panel. The bubble's tail/pointer must point directly and cleanly to the mouth of the cowering/kneeling villain on the right. Style details: ${villainReactionBubbleStyle}. The bubble must contain ONLY the Japanese text, ${formatTextLines(villainReactionBubbleText)} with the phrase 「${villainReactionBubbleHighlight}」 rendered in shaky style. Ensure no duplicate words and no repeated characters on line wraps.

${middleSectionStr}

Global style markers:
${globalStyleLockStr}

CRITICAL RULES:
1. The image must be a clean illustration, completely free of any English letters, Latin words, status cards, or comparison panels. There must be absolutely NO alphabetic characters, NO English text overlays, and NO comparison label cards in the corners or margins of the image.
2. ${textRulesStr}
3. Draw exactly two distinct speech bubbles on the right half (one pointing to the villain, one pointing to the hero) and exactly two distinct speech bubbles on the left half (one pointing to the hero, one pointing to the villain), making exactly four bubbles in total on the image. Never repeat or duplicate speech bubbles or dialogue text on the same side. Absolutely no floating text bubbles.
4. SPEECH BUBBLE & POINTER ALIGNMENT INTEGRITY:
- Every speech bubble's tail/pointer must point to the mouth/head of the correct character who is actually speaking that line. Never let a bubble pointer point to the wrong character or point away from the character.
- The speech bubble text must contain ONLY the specified Japanese dialogue. Absolutely NO text repetition, NO duplicate words, and NO repeated phrases when text wraps into vertical lines. Prevent any duplicate or ghost bubbles.
5. VERTICAL CENTER TEXT ACCURACY:
- The vertical center text hook must be rendered cleanly. Do not repeat words or phrases inside the center vertical text hook. Each character and word must appear exactly once as specified in the text.

Japanese manga YouTube thumbnail aesthetic, ultra mobile-friendly readable layout, focus on main characters, characters occupying 1/2 to 2/3 of thumbnail height, emotion-dense composition, exaggerated manga expressions, bold Japanese typography, intense split-screen contrast, ${layoutStyleTag}, story-driven blurred background, explosive comic speech bubbles, high-CTR Sukatto revenge manga thumbnail style, 16:9 aspect ratio`);
};


// IndexedDB persistence for FileSystemDirectoryHandle
const DB_NAME = "FolderPickerDB";
const STORE_NAME = "handles";
const KEY_NAME = "directoryHandle";

const saveDirectoryHandleToDB = async (handle: any) => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.put(handle, KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log("Directory handle saved to IndexedDB successfully.");
  } catch (err) {
    console.error("Failed to save directory handle to IndexedDB:", err);
  }
};

const loadDirectoryHandleFromDB = async (): Promise<any | null> => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const handle = await new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return handle || null;
  } catch (err) {
    console.error("Failed to load directory handle from IndexedDB:", err);
    return null;
  }
};


// IndexedDB persistence for Project Cache to avoid QuotaExceededError from large base64 reference images
const PROJECT_DB_NAME = "ProjectCacheDB";
const PROJECT_STORE_NAME = "project_store";
const PROJECT_KEY_NAME = "project_cache";

const saveProjectCacheToDB = async (projectData: any) => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(PROJECT_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(PROJECT_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite");
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const req = store.put(projectData, PROJECT_KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log("Project cache saved to IndexedDB successfully.");
  } catch (err) {
    console.error("Failed to save project cache to IndexedDB:", err);
  }
};

const loadProjectCacheFromDB = async (): Promise<any | null> => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(PROJECT_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(PROJECT_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const projectData = await new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(PROJECT_STORE_NAME, "readonly");
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const req = store.get(PROJECT_KEY_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return projectData || null;
  } catch (err) {
    console.error("Failed to load project cache from IndexedDB:", err);
    return null;
  }
};

const removeProjectCacheFromDB = async () => {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(PROJECT_DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(PROJECT_STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(PROJECT_STORE_NAME, "readwrite");
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const req = store.delete(PROJECT_KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log("Project cache removed from IndexedDB.");
  } catch (err) {
    console.error("Failed to remove project cache from IndexedDB:", err);
  }
};


export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem("login_session_active") === "true");
  const [srtText, setSrtText] = useState(() => localStorage.getItem("ai_srt_text") || "");
  const [scriptText, setScriptText] = useState(() => localStorage.getItem("ai_script_text") || "");
  const [srtData, setSrtData] = useState<SRTBlock[]>(() => {
    const saved = localStorage.getItem("ai_srt_text") || "";
    return saved ? parseSRT(saved) : [];
  });
  const [scriptData, setScriptData] = useState<ScriptLine[]>(() => {
    const saved = localStorage.getItem("ai_script_text") || "";
    return saved ? parseScript(saved) : [];
  });
  const [maxDuration, setMaxDuration] = useState(() => {
    const saved = localStorage.getItem("ai_max_duration");
    return saved ? parseInt(saved, 10) : 10;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefMappingApproved, setIsRefMappingApproved] = useState(() => {
    return localStorage.getItem("ai_ref_mapping_approved") === "true";
  });
  const [isGeneratingSituations, setIsGeneratingSituations] = useState(false);
  const [isWritingShots, setIsWritingShots] = useState(false);
  const [progress, setProgress] = useState<{ step: string; percent: number; currentShot?: number; totalShots?: number }>({ step: "", percent: 0, currentShot: 0, totalShots: 0 });
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; step: string } | null>(null);
  const [autoDownloadVideos, setAutoDownloadVideos] = useState(() => {
    return localStorage.getItem("ai_auto_download_videos") !== "false";
  });
  const [showSituationsModal, setShowSituationsModal] = useState(false);
  
  // Local state for image generation & logs integration
  const [generatingImages, setGeneratingImages] = useState<Record<string, boolean>>({});
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [isPollingLogs, setIsPollingLogs] = useState(true);

  // Automatically clear logs that are older than 15 minutes to save memory
  React.useEffect(() => {
    const interval = setInterval(() => {
      const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
      setSystemLogs(prev => {
        const filtered = prev.filter(log => getLogTime(log) >= fifteenMinsAgo);
        if (filtered.length !== prev.length) {
          return filtered;
        }
        return prev;
      });
    }, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Load project cache from IndexedDB asynchronously on mount
  React.useEffect(() => {
    const loadCache = async () => {
      try {
        const dbCache = await loadProjectCacheFromDB();
        let currentProject = dbCache;
        
        if (!currentProject) {
          // Fallback to localStorage migration
          const lsCache = localStorage.getItem("ai_project_cache");
          if (lsCache) {
            currentProject = JSON.parse(lsCache);
          }
        }
        
        // If still no project, try to load from the last compile files in Electron
        if (!currentProject && (window as any).electronAPI && (window as any).electronAPI.getLastCompileData) {
          console.log("No project in cache, attempting to restore from last compile data...");
          const lastData = await (window as any).electronAPI.getLastCompileData();
          if (lastData && lastData.project) {
            currentProject = lastData.project;
            if (lastData.srtText) {
              setSrtText(lastData.srtText);
              localStorage.setItem("ai_srt_text", lastData.srtText);
            }
            console.log("Restored project from last compile data successfully.");
          }
        }
        
        if (currentProject) {
          // Guarantee all shots have a unique stable ID in state
          const sanitized = {
            ...currentProject,
            props: currentProject.props || [],
            shots: (currentProject.shots || []).map((s: any, idx: number) => ({
              ...s,
              id: s.id !== undefined ? s.id : idx + 1
            }))
          };
          setProject(sanitized);
          await saveProjectCacheToDB(sanitized);
        }
      } catch (err) {
        console.error("Error loading project cache on mount:", err);
      }
    };
    loadCache();
  }, []);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reference_images' | 'characters' | 'backgrounds' | 'props' | 'shots' | 'logs' | 'thumb' | 'seo' | 'cinema'>(() => {
    const saved = localStorage.getItem("ai_active_tab");
    if (saved === 'characters' || saved === 'backgrounds' || saved === 'props') {
      return 'reference_images';
    }
    return (saved as any) || 'reference_images';
  });
  const [referenceSubTab, setReferenceSubTab] = useState<'characters' | 'backgrounds' | 'props'>(() => {
    const saved = localStorage.getItem("ai_active_tab");
    if (saved === 'characters' || saved === 'backgrounds' || saved === 'props') {
      return saved;
    }
    const savedSub = localStorage.getItem("ai_reference_sub_tab");
    return (savedSub as any) || 'characters';
  });

  React.useEffect(() => {
    localStorage.setItem("ai_reference_sub_tab", referenceSubTab);
  }, [referenceSubTab]);

  const [videoStatusFilter, setVideoStatusFilter] = useState<'all' | 'success' | 'error' | 'pending' | 'unrendered'>('all');

  // ==========================================
  // THUMBNAIL DESIGN TAB STATES
  // ==========================================
  const [thumbStoryInput, setThumbStoryInput] = useState(() => localStorage.getItem("ai_thumb_story_input") || "");
  const [thumbTitlesInput, setThumbTitlesInput] = useState(() => localStorage.getItem("ai_thumb_titles_input") || "");
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(() => {
    const saved = localStorage.getItem("ai_thumb_selected_version");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [thumbStyle, setThumbStyle] = useState(() => {
    const saved = localStorage.getItem("ai_thumb_style");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      "layout": {
        "splitScreen": true,
        "variant": "split_center_panel",
        "beforeSide": "right",
        "afterSide": "left",
        "centerPanelWidth": "15%",
        "aspectRatio": "16:9"
      },
      "colorStyle": {
        "beforeTone": {
          "lighting": "dark orange shadows",
          "mood": "oppressive warm tone"
        },
        "afterTone": {
          "lighting": "cold white corporate lighting",
          "mood": "victorious cool tone"
        }
      },
      "centerPanel": {
        "background": "vertical black rectangle with red speed lines",
        "mainTextColor": "white",
        "highlightColor": "blood red",
        "outline": "thick white outline",
        "effect": "3D manga typography"
      },
      "villainBubble": {
        "background": "black",
        "border": "thick white",
        "textColor": "deep red",
        "highlightColor": "bright violent red",
        "shape": "jagged_anger",
        "size": "large"
      },
      "heroResponseBubble": {
        "background": "white",
        "border": "thin black",
        "textColor": "dark gray",
        "highlightColor": "bold black",
        "shape": "thought_cloud",
        "size": "small"
      },
      "heroBubble": {
        "background": "yellow",
        "border": "thick red",
        "textColor": "bold black",
        "highlightColor": "bright red",
        "shape": "smooth_round",
        "size": "large"
      },
      "villainReactionBubble": {
        "background": "black",
        "border": "thick black jagged dynamic shock bubble",
        "textColor": "bright red",
        "highlightColor": "neon yellow",
        "shape": "shaky_spine",
        "size": "medium"
      },
      "globalStyleLock": [
        "Japanese manga YouTube thumbnail aesthetic",
        "ultra mobile readable",
        "dense emotional composition",
        "split-screen contrast",
        "high CTR Sukatto thumbnail"
      ]
    };
  });
  
  const [thumbData, setThumbData] = useState<any>(() => {
    const saved = localStorage.getItem("ai_thumb_data");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.versions) {
          // Legacy migration
          return {
            versions: [
              { ...parsed, id: 1, title: "Title 1 (Legacy)" },
              { ...parsed, id: 2, title: "Title 2 (Legacy)" },
              { ...parsed, id: 3, title: "Title 3 (Legacy)" }
            ]
          };
        }
        return parsed;
      } catch (e) {}
    }
    return null;
  });

  const [thumbMasterPrompt, setThumbMasterPrompt] = useState(() => localStorage.getItem("ai_thumb_master_prompt") || "");
  const [thumbImageUrl, setThumbImageUrl] = useState(() => localStorage.getItem("ai_thumb_image_url") || "");
  const [isAnalyzingThumb, setIsAnalyzingThumb] = useState(false);
  const [isGeneratingThumbImage, setIsGeneratingThumbImage] = useState(false);
  const [thumbJsonError, setThumbJsonError] = useState<string | null>(null);
  const [rawStyleJsonText, setRawStyleJsonText] = useState(() => localStorage.getItem("ai_raw_style_json_text") || "");
  const [styleEditorTab, setStyleEditorTab] = useState<'visual' | 'json'>('visual');

  // ==========================================
  // SEO OPTIMIZATION TAB STATES
  // ==========================================
  const [seoSrtInput1, setSeoSrtInput1] = useState(() => localStorage.getItem("ai_seo_srt_input1") || localStorage.getItem("ai_seo_srt_input") || "");
  const [seoSrtInput2, setSeoSrtInput2] = useState(() => localStorage.getItem("ai_seo_srt_input2") || localStorage.getItem("ai_seo_srt_input") || "");
  const [seoSection1, setSeoSection1] = useState(() => localStorage.getItem("ai_seo_section1") || "");
  const [seoSection2, setSeoSection2] = useState(() => localStorage.getItem("ai_seo_section2") || "");
  const [seoBgmPrompts, setSeoBgmPrompts] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("ai_seo_bgm_prompts");
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [isGeneratingSeo1, setIsGeneratingSeo1] = useState(false);
  const [isGeneratingSeo2, setIsGeneratingSeo2] = useState(false);
  const [seoError1, setSeoError1] = useState<string | null>(null);
  const [seoError2, setSeoError2] = useState<string | null>(null);

  const updateStyleField = (path: string[], value: any) => {
    setThumbStyle((prev: any) => {
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]] || typeof current[path[i]] !== 'object') {
          current[path[i]] = {};
        }
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const handleBeforeSideChange = (side: 'left' | 'right') => {
    setThumbStyle((prev: any) => ({
      ...prev,
      layout: {
        ...prev.layout,
        beforeSide: side,
        afterSide: side === 'left' ? 'right' : 'left'
      }
    }));
  };


  const isImageGenerating = Object.values(generatingImages).some(Boolean);

  // Zoom & Batch Controls States
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomedImageName, setZoomedImageName] = useState<string | null>(null);
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderPathInput, setFolderPathInput] = useState(() => localStorage.getItem("ai_image_folder_path") || "");
  const [selectedDirectoryHandle, setSelectedDirectoryHandle] = useState<any | null>(null);
  const [dirPermissionGranted, setDirPermissionGranted] = useState<boolean>(false);

  React.useEffect(() => {
    if ((window as any).electronAPI && folderPathInput) {
      setDirPermissionGranted(true);
      setSelectedDirectoryHandle({ name: folderPathInput.split(/[\\/]/).pop() || folderPathInput });
      return;
    }
    const restoreHandle = async () => {
      const handle = await loadDirectoryHandleFromDB();
      if (handle) {
        setSelectedDirectoryHandle(handle);
        setFolderPathInput(prev => prev || handle.name);
        try {
          const permission = await handle.queryPermission({ mode: "readwrite" });
          setDirPermissionGranted(permission === 'granted');
        } catch (e) {
          console.error("Error querying restored directory permission:", e);
          setDirPermissionGranted(false);
        }
      }
    };
    restoreHandle();
  }, [folderPathInput]);

  React.useEffect(() => {
    if (selectedDirectoryHandle) {
      if (!(window as any).electronAPI) {
        saveDirectoryHandleToDB(selectedDirectoryHandle);
        const check = async () => {
          try {
            const permission = await selectedDirectoryHandle.queryPermission({ mode: "readwrite" });
            setDirPermissionGranted(permission === 'granted');
          } catch (e) {
            setDirPermissionGranted(false);
          }
        };
        check();
      }
    }
  }, [selectedDirectoryHandle]);

  const handlePickDirectory = async () => {
    try {
      if ((window as any).electronAPI && (window as any).electronAPI.selectDirectory) {
        const baseDir = await (window as any).electronAPI.selectDirectory();
        if (baseDir) {
          setFolderPathInput(baseDir);
          localStorage.setItem("ai_image_folder_path", baseDir);
          setDirPermissionGranted(true);
          setSelectedDirectoryHandle({ name: baseDir.split(/[\\/]/).pop() || baseDir });
          alert(`Đã liên kết thành công với thư mục: "${baseDir}".`);
        }
        return;
      }

      if (!('showDirectoryPicker' in window)) {
        alert("Trình duyệt của bạn không hỗ trợ chọn thư mục trực tiếp. Vui lòng nhập đường dẫn thủ công.");
        return;
      }
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      try {
        await dirHandle.getDirectoryHandle("videos", { create: true });
        await dirHandle.getDirectoryHandle("bgm", { create: true });
        await dirHandle.getDirectoryHandle("voice", { create: true });
        await dirHandle.getDirectoryHandle("voices", { create: true });
        await dirHandle.getDirectoryHandle("images", { create: true });
      } catch (subErr) {
        console.warn("Failed to create subdirectories inside directory handle:", subErr);
      }
      setSelectedDirectoryHandle(dirHandle);
      setDirPermissionGranted(true);
      if (!folderPathInput.trim()) {
        setFolderPathInput(dirHandle.name);
        localStorage.setItem("ai_image_folder_path", dirHandle.name);
      }
      alert(`Đã liên kết thành công với thư mục: "${dirHandle.name}".`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        alert(`Lỗi khi chọn thư mục: ${err.message}`);
      }
    }
  };
  const [selectedCharacters, setSelectedCharacters] = useState<Record<number, boolean>>(() => {
    const saved = localStorage.getItem("ai_selected_characters");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<Record<number, boolean>>(() => {
    const saved = localStorage.getItem("ai_selected_backgrounds");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedProps, setSelectedProps] = useState<Record<number, boolean>>(() => {
    const saved = localStorage.getItem("ai_selected_props");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedShots, setSelectedShots] = useState<Record<number, boolean>>(() => {
    const saved = localStorage.getItem("ai_selected_shots");
    return saved ? JSON.parse(saved) : {};
  });
  const [generatingVideos, setGeneratingVideos] = useState<Record<number, boolean>>({});
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const abortBatchRef = React.useRef(false);

  const [zoomedVideoUrl, setZoomedVideoUrl] = useState<string | null>(null);
  const [zoomedVideoName, setZoomedVideoName] = useState<string | null>(null);
  const [zoomedVideoIndex, setZoomedVideoIndex] = useState<number | null>(null);
  const [activeZoomedShotIndex, setActiveZoomedShotIndex] = useState<number | null>(null);
  const [zoomedPrompt, setZoomedPrompt] = useState<string>("");

  const [videoCountPerPrompt, setVideoCountPerPrompt] = useState<number>(() => {
    const saved = localStorage.getItem("ai_video_count_per_prompt");
    return saved ? parseInt(saved, 10) : 1;
  });
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(() => {
    return localStorage.getItem("ai_video_aspect_ratio") || "VIDEO_ASPECT_RATIO_LANDSCAPE";
  });
  const [videoModelR2V, setVideoModelR2V] = useState<string>(() => {
    return localStorage.getItem("ai_video_model_r2v") || "veo_3_generate_video_ultra_relaxed";
  });
  const [videoModelT2V, setVideoModelT2V] = useState<string>(() => {
    return localStorage.getItem("ai_video_model_t2v") || "veo_3_generate_video_ultra_relaxed";
  });
  const [defaultImageAspect, setDefaultImageAspect] = useState<string>(() => {
    return localStorage.getItem("ai_default_image_aspect") || "IMAGE_ASPECT_RATIO_LANDSCAPE";
  });

  const [project, setProject] = useState<ProjectData | null>(null);

  // Reference Image Management States
  const [imageSelectorTarget, setImageSelectorTarget] = useState<{ type: 'character' | 'background' | 'shot' | 'prop'; index: number; refIndex?: number; isMain?: boolean } | null>(null);
  const [fileUploadTarget, setFileUploadTarget] = useState<{ type: 'character' | 'background' | 'shot' | 'prop'; index: number; refIndex?: number } | null>(null);
  const [selectorCategory, setSelectorCategory] = useState<'all' | 'characters' | 'backgrounds' | 'props' | 'shots' | 'uploads'>('all');
  const refFileInputRef = React.useRef<HTMLInputElement>(null);

  // Active Generation Status and Error Tracking
  const [generationStatuses, setGenerationStatuses] = useState<Record<string, string>>({});
  const [generationErrors, setGenerationErrors] = useState<Record<string, string>>({});

  const filteredSelectorImages = React.useMemo(() => {
    if (!project) return [];
    const list: { url: string; name: string; type: 'Nhân vật' | 'Bối cảnh' | 'Đạo cụ' | 'Phân cảnh' | 'Ảnh tải lên'; rawType: string }[] = [];
    const seenUrls = new Set<string>();

    if (selectorCategory === 'all' || selectorCategory === 'characters') {
      project.characters.forEach((c) => {
        if (c.imageUrl) {
          list.push({ url: c.imageUrl, name: c.name, type: 'Nhân vật', rawType: 'character' });
          seenUrls.add(c.imageUrl);
        }
      });
    }
    if (selectorCategory === 'all' || selectorCategory === 'backgrounds') {
      project.backgrounds.forEach((b) => {
        if (b.imageUrl) {
          list.push({ url: b.imageUrl, name: b.location, type: 'Bối cảnh', rawType: 'background' });
          seenUrls.add(b.imageUrl);
        }
      });
    }
    if (selectorCategory === 'all' || selectorCategory === 'props') {
      (project.props || []).forEach((p) => {
        if (p.imageUrl) {
          list.push({ url: p.imageUrl, name: p.name, type: 'Đạo cụ', rawType: 'prop' });
          seenUrls.add(p.imageUrl);
        }
      });
    }
    if (selectorCategory === 'all' || selectorCategory === 'shots') {
      project.shots.forEach((s, idx) => {
        if (s.imageUrl) {
          list.push({ url: s.imageUrl, name: `Khung hình #${idx + 1}`, type: 'Phân cảnh', rawType: 'shot' });
          seenUrls.add(s.imageUrl);
        }
      });
    }
    if (selectorCategory === 'all' || selectorCategory === 'uploads') {
      const processRefs = (refs?: ShotRefImage[], parentName?: string) => {
        if (!refs) return;
        refs.forEach((ref) => {
          if (ref.url && !seenUrls.has(ref.url)) {
            list.push({
              url: ref.url,
              name: ref.name || `Ảnh tham chiếu ${parentName || 'PC'}`,
              type: 'Ảnh tải lên',
              rawType: 'uploads'
            });
            seenUrls.add(ref.url);
          }
        });
      };

      project.characters.forEach(c => processRefs(c.referenceImages, c.name));
      project.backgrounds.forEach(b => processRefs(b.referenceImages, b.location));
      (project.props || []).forEach(p => processRefs(p.referenceImages, p.name));
      project.shots.forEach((s, idx) => processRefs(s.referenceImages, `Phân cảnh #${idx + 1}`));
    }
    return list;
  }, [project, selectorCategory]);

  const filteredShots = React.useMemo(() => {
    if (!project) return [];
    return project.shots.map((shot, index) => ({ shot, index })).filter(({ shot, index }) => {
      const statusKey = `video_${index}`;
      const isGenerating = generatingVideos[index];
      const hasSuccess = !!shot.videoUrl;
      const hasError = !!(shot.videoError || generationErrors[statusKey]) && !hasSuccess && !isGenerating;
      const isUnrendered = !hasSuccess;
      
      if (videoStatusFilter === 'success') return hasSuccess;
      if (videoStatusFilter === 'error') return hasError;
      if (videoStatusFilter === 'pending') return isGenerating;
      if (videoStatusFilter === 'unrendered') return isUnrendered;
      return true; // 'all'
    });
  }, [project, videoStatusFilter, generatingVideos, generationErrors]);


  const selectedCharsCount = Object.keys(selectedCharacters).filter(k => selectedCharacters[Number(k)]).length;
  const selectedBgsCount = Object.keys(selectedBackgrounds).filter(k => selectedBackgrounds[Number(k)]).length;
  const selectedPropsCount = Object.keys(selectedProps).filter(k => selectedProps[Number(k)]).length;

  const allAssetsCount = (project?.characters.length || 0) + (project?.backgrounds.length || 0) + (project?.props?.length || 0);
  const selectedAllAssetsCount = selectedCharsCount + selectedBgsCount + selectedPropsCount;

  const eligibleShotsCount = React.useMemo(() => {
    if (!project) return 0;
    return filteredShots.filter(({ shot }) => getShotHasRef(shot, project.characters, project.backgrounds, project.props)).length;
  }, [project, filteredShots]);

  const selectedShotsCount = React.useMemo(() => {
    if (!project) return 0;
    return filteredShots.filter(({ index }) => selectedShots[index] && getShotHasRef(project.shots[index], project.characters, project.backgrounds, project.props)).length;
  }, [project, filteredShots, selectedShots]);

  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("ai_api_key") || "");
  const [apiMode, setApiMode] = useState<'single' | 'parallel'>(() => {
    return (localStorage.getItem("ai_api_mode") as 'single' | 'parallel') || 'single';
  });
  const [apiKeysList, setApiKeysList] = useState(() => localStorage.getItem("ai_api_keys_list") || "");
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("ai_selected_model") || "gemini-2.5-flash");
  
  const [selectedImageModel, setSelectedImageModel] = useState<"auto" | "GEM_PIX_2" | "NARWHAL">(() => {
    return (localStorage.getItem("ai_selected_image_model") as any) || "NARWHAL";
  });

  const [skipExistingInBatch, setSkipExistingInBatch] = useState<boolean>(() => {
    return localStorage.getItem("ai_skip_existing_in_batch") !== "false";
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(() => {
    const saved = localStorage.getItem("ai_concurrency_limit");
    return saved ? Math.max(1, parseInt(saved, 10)) : 1;
  });
  const [videoConcurrencyLimit, setVideoConcurrencyLimit] = useState<number>(() => {
    const saved = localStorage.getItem("ai_video_concurrency_limit");
    return saved ? Math.max(1, parseInt(saved, 10)) : 1;
  });
  const [maxAttempts, setMaxAttempts] = useState<number>(() => {
    const saved = localStorage.getItem("ai_max_attempts");
    return saved ? Math.max(1, parseInt(saved, 10)) : 3;
  });
  const [retryDelay, setRetryDelay] = useState<number>(() => {
    const saved = localStorage.getItem("ai_retry_delay");
    return saved ? Math.max(0, parseInt(saved, 10)) : 3;
  });
  const [imageBatchDelay, setImageBatchDelay] = useState<number>(() => {
    const saved = localStorage.getItem("ai_image_batch_delay");
    return saved ? Math.max(0, parseInt(saved, 10)) : 200;
  });
  const [videoBatchDelay, setVideoBatchDelay] = useState<number>(() => {
    const saved = localStorage.getItem("ai_video_batch_delay");
    return saved ? Math.max(0, parseInt(saved, 10)) : 200;
  });
  const [styles, setStyles] = useState<VisualStyle[]>(() => {
    const saved = localStorage.getItem("ai_styles_config");
    return saved ? JSON.parse(saved) : defaultStyles;
  });
  const [selectedStyleId, setSelectedStyleId] = useState(() => localStorage.getItem("ai_selected_style_id") || defaultStyles[0].id);
  const [isStyleEditing, setIsStyleEditing] = useState(false);
  const [customEditTab, setCustomEditTab] = useState<"content" | "manage">("content");
  const [scriptName, setScriptName] = useState(() => localStorage.getItem("ai_script_name") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacterGuidelines, setShowCharacterGuidelines] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"engine" | "rules">("engine");
  const [mergeShortLines, setMergeShortLines] = useState(() => {
    return localStorage.getItem("ai_merge_short_lines") === "true";
  });
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem("ai_api_base_url") || "http://127.0.0.1:5000";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return localStorage.getItem("ai_sidebar_open") !== "false";
  });
  const cleanApiUrl = apiBaseUrl.trim().replace(/\/$/, "");

  const sanitizeUrl = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("/")) {
      return `${cleanApiUrl}${url}`;
    }
    try {
      const parsedUrl = new URL(url);
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
    return url;
  };

  // Auto-migrate old absolute non-routable URLs (e.g., 0.0.0.0 / 127.0.0.1) in project state to current cleanApiUrl
  React.useEffect(() => {
    if (!project) return;
    let modified = false;

    const newCharacters = project.characters.map(char => {
      if (char.imageUrl) {
        const sanitized = sanitizeUrl(char.imageUrl);
        if (sanitized !== char.imageUrl) {
          modified = true;
          return { ...char, imageUrl: sanitized };
        }
      }
      return char;
    });

    const newBackgrounds = project.backgrounds.map(bg => {
      if (bg.imageUrl) {
        const sanitized = sanitizeUrl(bg.imageUrl);
        if (sanitized !== bg.imageUrl) {
          modified = true;
          return { ...bg, imageUrl: sanitized };
        }
      }
      return bg;
    });

    const newShots = project.shots.map(shot => {
      let updated = false;
      const updatedShot = { ...shot };
      if (shot.videoUrl) {
        const sanitizedVideo = sanitizeUrl(shot.videoUrl);
        if (sanitizedVideo !== shot.videoUrl) {
          updatedShot.videoUrl = sanitizedVideo;
          updated = true;
        }
      }
      if (shot.imageUrl) {
        const sanitizedImg = sanitizeUrl(shot.imageUrl);
        if (sanitizedImg !== shot.imageUrl) {
          updatedShot.imageUrl = sanitizedImg;
          updated = true;
        }
      }
      if (updated) {
        modified = true;
        return updatedShot;
      }
      return shot;
    });

    if (modified) {
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          characters: newCharacters,
          backgrounds: newBackgrounds,
          shots: newShots
        };
      });
      console.log("Auto-migrated old non-routable project URLs in local cache.");
    }
  }, [project === null, cleanApiUrl]);

  const [promptRules, setPromptRules] = useState<PromptRule[]>(() => {
    const saved = localStorage.getItem("ai_prompt_rules");
    return saved ? JSON.parse(saved) : [
      { id: "rule-1", text: "Tên nhân vật và tạo hình nhân vật phải viết bằng chữ Romaji không dấu (ví dụ: Asami, Kenji).", enabled: true },
      { id: "rule-2", text: "Bối cảnh ngoại / nội (Exterior / Interior) trong phần mô tả cảnh và không gian phải khớp hoàn hảo với tên bối cảnh gốc (ví dụ: Mami_Home_LivingRoom_Night_1).", enabled: true },
      { id: "rule-3", text: "Tránh mô tả cảm xúc chung chung trực tiếp, thay vào đó hãy dùng các cử chỉ hành động micro-behavior vật lý cụ thể.", enabled: true },
      { id: "rule-4", text: "Không tự ý thêm bớt nhân vật phụ hoặc quần chúng ngoài các nhân vật chính được liệt kê trong phân cảnh.", enabled: true },
      { id: "rule-5", text: "Khi mô tả prompts phân cảnh, nếu có nhân vật xuất hiện (kể cả cảnh quay qua vai OTS hay xuất hiện thấp thoáng) thì bắt buộc phải ghi rõ tên các nhân vật đó trong mô tả prompt và liệt kê đầy đủ vào cột Characters (tách nhau bằng dấu phẩy, ví dụ: Kenji_Casual, Aoi_Home). Tối đa trong cảnh chỉ có 2 người.", enabled: true }
    ];
  });

  // Persist settings
  React.useEffect(() => {
    localStorage.setItem("ai_api_key", apiKey);
  }, [apiKey]);

  React.useEffect(() => {
    localStorage.setItem("ai_api_mode", apiMode);
  }, [apiMode]);

  React.useEffect(() => {
    localStorage.setItem("ai_api_keys_list", apiKeysList);
  }, [apiKeysList]);

  React.useEffect(() => {
    localStorage.setItem("ai_concurrency_limit", concurrencyLimit.toString());
  }, [concurrencyLimit]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_concurrency_limit", videoConcurrencyLimit.toString());
  }, [videoConcurrencyLimit]);

  React.useEffect(() => {
    localStorage.setItem("ai_max_attempts", maxAttempts.toString());
  }, [maxAttempts]);

  React.useEffect(() => {
    localStorage.setItem("ai_retry_delay", retryDelay.toString());
  }, [retryDelay]);

  React.useEffect(() => {
    localStorage.setItem("ai_image_batch_delay", imageBatchDelay.toString());
  }, [imageBatchDelay]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_batch_delay", videoBatchDelay.toString());
  }, [videoBatchDelay]);

  React.useEffect(() => {
    localStorage.setItem("ai_prompt_rules", JSON.stringify(promptRules));
  }, [promptRules]);

  React.useEffect(() => {
    localStorage.setItem("ai_script_name", scriptName);
  }, [scriptName]);

  React.useEffect(() => {
    localStorage.setItem("ai_max_duration", maxDuration.toString());
  }, [maxDuration]);

  React.useEffect(() => {
    localStorage.setItem("ai_active_tab", activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_characters", JSON.stringify(selectedCharacters));
  }, [selectedCharacters]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_backgrounds", JSON.stringify(selectedBackgrounds));
  }, [selectedBackgrounds]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_props", JSON.stringify(selectedProps));
  }, [selectedProps]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_shots", JSON.stringify(selectedShots));
  }, [selectedShots]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_count_per_prompt", videoCountPerPrompt.toString());
  }, [videoCountPerPrompt]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_aspect_ratio", videoAspectRatio);
  }, [videoAspectRatio]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_model_r2v", videoModelR2V);
  }, [videoModelR2V]);

  React.useEffect(() => {
    localStorage.setItem("ai_video_model_t2v", videoModelT2V);
  }, [videoModelT2V]);

  React.useEffect(() => {
    localStorage.setItem("ai_default_image_aspect", defaultImageAspect);
  }, [defaultImageAspect]);

  const toggleRule = (id: string) => {
    setPromptRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRuleText = (id: string, text: string) => {
    setPromptRules(prev => prev.map(r => r.id === id ? { ...r, text } : r));
  };

  const addRule = () => {
    const newId = `rule-${Date.now()}`;
    setPromptRules(prev => [...prev, { id: newId, text: "", enabled: true }]);
  };

  const deleteRule = (id: string) => {
    setPromptRules(prev => prev.filter(r => r.id !== id));
  };

  React.useEffect(() => {
    localStorage.setItem("ai_selected_model", selectedModel);
  }, [selectedModel]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_image_model", selectedImageModel);
  }, [selectedImageModel]);

  React.useEffect(() => {
    localStorage.setItem("ai_skip_existing_in_batch", String(skipExistingInBatch));
  }, [skipExistingInBatch]);

  React.useEffect(() => {
    localStorage.setItem("ai_styles_config", JSON.stringify(styles));
  }, [styles]);

  React.useEffect(() => {
    localStorage.setItem("ai_selected_style_id", selectedStyleId);
  }, [selectedStyleId]);

  React.useEffect(() => {
    localStorage.setItem("ai_merge_short_lines", String(mergeShortLines));
  }, [mergeShortLines]);

  React.useEffect(() => {
    localStorage.setItem("ai_api_base_url", apiBaseUrl);
  }, [apiBaseUrl]);

  // Persist project cache to IndexedDB asynchronously to avoid localStorage QuotaExceededErrors
  React.useEffect(() => {
    if (project) {
      saveProjectCacheToDB(project);
      // Clean up localStorage project cache to prevent 5MB browser quota crashes from Base64 images
      localStorage.removeItem("ai_project_cache");
    } else {
      removeProjectCacheFromDB();
      localStorage.removeItem("ai_project_cache");
    }
  }, [project]);

  // Persist thumbnail states
  React.useEffect(() => {
    localStorage.setItem("ai_thumb_story_input", thumbStoryInput);
  }, [thumbStoryInput]);

  React.useEffect(() => {
    localStorage.setItem("ai_thumb_titles_input", thumbTitlesInput);
  }, [thumbTitlesInput]);

  React.useEffect(() => {
    localStorage.setItem("ai_thumb_selected_version", selectedVersionIndex.toString());
  }, [selectedVersionIndex]);

  React.useEffect(() => {
    localStorage.setItem("ai_thumb_style", JSON.stringify(thumbStyle));
    setRawStyleJsonText(JSON.stringify(thumbStyle, null, 2));
  }, [thumbStyle]);

  React.useEffect(() => {
    localStorage.setItem("ai_raw_style_json_text", rawStyleJsonText);
  }, [rawStyleJsonText]);

  React.useEffect(() => {
    if (thumbData) {
      localStorage.setItem("ai_thumb_data", JSON.stringify(thumbData));
    } else {
      localStorage.removeItem("ai_thumb_data");
    }
  }, [thumbData]);

  React.useEffect(() => {
    localStorage.setItem("ai_thumb_master_prompt", thumbMasterPrompt);
  }, [thumbMasterPrompt]);

  React.useEffect(() => {
    localStorage.setItem("ai_thumb_image_url", thumbImageUrl);
  }, [thumbImageUrl]);

  // Persist SEO states
  React.useEffect(() => {
    localStorage.setItem("ai_seo_srt_input1", seoSrtInput1);
  }, [seoSrtInput1]);

  React.useEffect(() => {
    localStorage.setItem("ai_seo_srt_input2", seoSrtInput2);
  }, [seoSrtInput2]);

  React.useEffect(() => {
    localStorage.setItem("ai_seo_section1", seoSection1);
  }, [seoSection1]);

  React.useEffect(() => {
    localStorage.setItem("ai_seo_section2", seoSection2);
  }, [seoSection2]);

  React.useEffect(() => {
    localStorage.setItem("ai_seo_bgm_prompts", JSON.stringify(seoBgmPrompts));
  }, [seoBgmPrompts]);

  // Auto-sync subtitle content to SEO inputs when inputs are empty and main subtitles change
  React.useEffect(() => {
    if (srtText) {
      if (!seoSrtInput1) setSeoSrtInput1(srtText);
      if (!seoSrtInput2) setSeoSrtInput2(srtText);
    }
  }, [srtText]);

  // Dynamically synchronize thumbImageUrl with active version's imageUrl when selected version or thumbData changes
  React.useEffect(() => {
    if (thumbData) {
      const versions = thumbData.versions || [];
      const activeVersion = versions[selectedVersionIndex] || thumbData;
      setThumbImageUrl(activeVersion?.imageUrl || "");
    } else {
      setThumbImageUrl("");
    }
  }, [selectedVersionIndex, thumbData]);

  // Auto-compose Final Master Prompt when thumbStyle, thumbData or selectedVersionIndex changes
  React.useEffect(() => {
    if (thumbStyle && thumbData) {
      const activeData = thumbData.versions?.[selectedVersionIndex] || thumbData;
      setThumbMasterPrompt(composeThumbnailPrompt(thumbStyle, activeData, project?.characters));
    }
  }, [thumbStyle, thumbData, selectedVersionIndex, project?.characters]);



  const handleSrtChange = (text: string) => {
    setSrtText(text);
    localStorage.setItem("ai_srt_text", text);
    if (!text.trim()) {
      setSrtData([]);
      setError(null);
      return;
    }
    const parsed = parseSRT(text);
    if (parsed.length === 0) {
      setError("Could not parse SRT content. Please check the format.");
      setSrtData([]);
    } else {
      setSrtData(parsed);
      setError(null);
    }
  };

  const handleScriptChange = (text: string) => {
    setScriptText(text);
    localStorage.setItem("ai_script_text", text);
    if (!text.trim()) {
      setScriptData([]);
      setError(null);
      return;
    }
    const parsed = parseScript(text);
    if (parsed.length === 0) {
      setError("Could not parse Script content. Ensure lines follow the format 'Character: Dialogue'.");
      setScriptData([]);
    } else {
      setScriptData(parsed);
      setError(null);
    }
  };

  const validate = () => {
    if (srtData.length > 0 && scriptData.length > 0) {
      if (srtData.length !== scriptData.length) {
        return `Mismatch: SRT has ${srtData.length} lines, Script has ${scriptData.length} lines.`;
      }
      return null;
    }
    return null;
  };

  const validationError = validate();
  const isReady = srtData.length > 0 && scriptData.length > 0 && !validationError;

  const extractAssetsAndSituations = async () => {
    setIsGenerating(true);
    setIsGeneratingSituations(true);
    setError(null);
    setProgress({ step: "Initializing AI Production Engine...", percent: 5 });

    if (!apiKey) {
      setError("Please enter an API Key in the settings.");
      setIsGenerating(false);
      setIsGeneratingSituations(false);
      return;
    }

    try {
      // PHASE 1: COMPACT DATA & EXTRACT GLOBAL ASSETS & SITUATIONS
      setProgress({ step: "Phase 1: Compacting & Extracting Global Assets & Situations...", percent: 10 });

      let finalSrt = srtData;
      let finalScript = scriptData;
      if (mergeShortLines) {
        const merged = mergeShortSRTAndScript(srtData, scriptData, 2.0, maxDuration);
        finalSrt = merged.srt;
        finalScript = merged.script;
      }

      const compactData = finalSrt.map((s, i) => ({
        id: i + 1,
        char: finalScript[i]?.character || "Unknown",
        text: (finalScript[i]?.dialogue || s.text).slice(0, 150) // Truncate long dialogues
      }));

      const activeRulesText = promptRules
        .filter(r => r.enabled && r.text.trim())
        .map(r => r.text.trim())
        .join("\n- ");

      const currentStyle = styles.find(s => s.id === selectedStyleId) || styles[0];
      const assetPrompt = generateAssetPrompt(compactData, currentStyle, activeRulesText);

      let assetsJson = "";
      let tokenUsage = { prompt: 0, completion: 0, total: 0 };
      if (selectedModel.startsWith("gemini")) {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const res = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: `${assetPrompt}\n\n📊 OUTPUT FORMAT (STRICT JSON - ESCAPE ALL DOUBLE QUOTES INSIDE STRINGS WITH \\")\n{\n  "characters": [{ "name": "Name", "appearance": "...", "prompt": "..." }],\n  "backgrounds": [{ "location": "Location_Name_1", "angle": "Angle Description", "prompt": "..." }],\n  "props": [{ "name": "PropName", "appearance": "...", "prompt": "..." }],\n  "situations": [{ "id": 1, "timeRange": "00:00 - 01:15", "location": "Location", "summary": "Summary", "characterNames": "A, B", "backgroundNames": "BG1" }]\n}` }] }],
          config: { 
            responseMimeType: "application/json",
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });
        assetsJson = getResponseText(res);
        if (!assetsJson) {
          let reason = "Không có phản hồi hoặc bị chặn bởi bộ lọc an toàn.";
          if (res.candidates?.[0]?.finishReason) {
            reason = `Lý do dừng: ${res.candidates[0].finishReason}`;
          } else if (res.promptFeedback?.blockReason) {
            reason = `Bị chặn bởi bộ lọc: ${res.promptFeedback.blockReason}`;
          }
          throw new Error(`Không nhận được phản hồi văn bản từ AI. Vui lòng kiểm tra lại API Key hoặc mẫu AI bạn đã chọn. (${reason})`);
        }
        if (res.usageMetadata) {
          tokenUsage.prompt = res.usageMetadata.promptTokenCount || 0;
          tokenUsage.completion = res.usageMetadata.candidatesTokenCount || 0;
          tokenUsage.total = res.usageMetadata.totalTokenCount || 0;
        }
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: assetPrompt }],
            response_format: { type: "json_object" }
          })
        });
        
        if (!res.ok) {
          let errorMsg = `API Error: ${res.status} ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData?.error?.message) {
              errorMsg = errData.error.message;
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }
        
        const data = await res.json();
        if (!data.choices || data.choices.length === 0) {
          throw new Error("Không nhận được dữ liệu phản hồi (choices) từ OpenAI API.");
        }
        assetsJson = data.choices[0].message?.content;
        if (data.usage) {
          tokenUsage.prompt = data.usage.prompt_tokens || 0;
          tokenUsage.completion = data.usage.completion_tokens || 0;
          tokenUsage.total = data.usage.total_tokens || 0;
        }
      }

      // assetsJson check is handled immediately above for Gemini and below for OpenAI
      if (!assetsJson) {
        throw new Error("Không nhận được phản hồi văn bản từ AI. Vui lòng kiểm tra lại API Key hoặc mẫu AI bạn đã chọn.");
      }

      const assets = safeJsonParse(assetsJson);

      // Smart character and background prompt/appearance check & correction (swap safeguard)
      const processedCharacters = (assets.characters || []).map((char: any) => {
        let appearance = (char.appearance || "").trim();
        let prompt = (char.prompt || "").trim();

        // Swap if LLM mixed up prompt and appearance:
        // If appearance contains character sheet instructions, or if appearance is significantly longer than prompt, swap them!
        const hasCharSheetInstructions = appearance.toLowerCase().includes("character sheet") || 
                                         appearance.toLowerCase().includes("3-view reference") || 
                                         appearance.toLowerCase().includes("reference sheet");
                                         
        if (hasCharSheetInstructions || (appearance.length > prompt.length + 30 && prompt.length > 0)) {
          // Swap
          const temp = appearance;
          appearance = prompt;
          prompt = temp;
        }

        return {
          ...char,
          appearance,
          prompt
        };
      });

      const processedBackgrounds = (assets.backgrounds || []).map((bg: any) => {
        let angle = (bg.angle || "").trim();
        let prompt = (bg.prompt || "").trim();

        // Swap/clean if background prompt is empty or mixed
        const hasBgPromptInstructions = angle.toLowerCase().includes("background of") || 
                                        angle.toLowerCase().includes("production-ready background plate") ||
                                        angle.toLowerCase().includes("empty scene");
        if (hasBgPromptInstructions || (angle.length > prompt.length + 30 && prompt.length > 0)) {
          const temp = angle;
          angle = prompt;
          prompt = temp;
        }

        return {
          ...bg,
          angle,
          prompt
        };
      });

      const processedProps = (assets.props || []).map((prop: any) => {
        let name = (prop.name || "").trim();
        let appearance = (prop.appearance || "").trim();
        let prompt = (prop.prompt || "").trim();

        // Swap safeguard if LLM mixed up prompt and appearance
        const hasPropSheetInstructions = appearance.toLowerCase().includes("prop sheet") ||
                                         appearance.toLowerCase().includes("isolated on") ||
                                         appearance.toLowerCase().includes("product photography");
        if (hasPropSheetInstructions || (appearance.length > prompt.length + 30 && prompt.length > 0)) {
          const temp = appearance;
          appearance = prompt;
          prompt = temp;
        }

        return {
          ...prop,
          name,
          appearance,
          prompt
        };
      });

      const finalProject: ProjectData = {
        characters: processedCharacters,
        backgrounds: processedBackgrounds,
        props: processedProps,
        situations: (assets.situations || []).map((sit: any) => ({
          ...sit,
          propNames: sit.propNames || ""
        })),
        shots: []
      };

      // Smart Auto-Resolution: pre-arrange costume variants (reference images) in the situation's characterNames cell
      if (finalProject.situations && finalProject.characters) {
        finalProject.situations = finalProject.situations.map(sit => {
          if (!sit.characterNames) return sit;
          
          const names = sit.characterNames.split(',').map(n => n.trim()).filter(n => n.length > 0);
          const resolvedNames = names.map(name => {
            // If the name is already a specific variant (contains an underscore like Aoi_Home), keep it!
            if (name.includes('_')) {
              return name;
            }
            
            // Otherwise, it is a generic name (e.g. "Aoi"). Let's search for all variants of this character.
            // A variant name starts with the generic name followed by an underscore, e.g. "Aoi_Home", "Aoi_Office"
            const variants = finalProject.characters.filter(c => 
              c.name.toLowerCase().startsWith(name.toLowerCase() + '_')
            );
            
            if (variants.length === 0) {
              // If no specific variants exist in the extracted character sheet, keep the generic name
              return name;
            }
            
            // If variants exist, let's auto-select the best costume variant based on the context of the situation!
            const contextText = `${sit.location} ${sit.summary}`.toLowerCase();
            
            // Check for home / casual context
            const isHomeContext = contextText.includes('nhà') || 
                                  contextText.includes('home') || 
                                  contextText.includes('kitchen') || 
                                  contextText.includes('living') || 
                                  contextText.includes('bếp') || 
                                  contextText.includes('ngủ') ||
                                  contextText.includes('bedroom') || 
                                  contextText.includes('tắm') ||
                                  contextText.includes('night') ||
                                  contextText.includes('tối');
            
            // Check for office / school / formal context
            const isFormalContext = contextText.includes('văn phòng') || 
                                    contextText.includes('office') || 
                                    contextText.includes('công sở') || 
                                    contextText.includes('trường') || 
                                    contextText.includes('lớp') || 
                                    contextText.includes('school') || 
                                    contextText.includes('class') || 
                                    contextText.includes('formal') || 
                                    contextText.includes('work') ||
                                    contextText.includes('làm');
            
            if (isHomeContext) {
              const homeVar = variants.find(v => {
                const lname = v.name.toLowerCase();
                return lname.includes('home') || lname.includes('casual') || lname.includes('nhà') || lname.includes('indoor');
              });
              if (homeVar) return homeVar.name;
            }
            
            if (isFormalContext) {
              const formalVar = variants.find(v => {
                const lname = v.name.toLowerCase();
                return lname.includes('office') || lname.includes('formal') || lname.includes('work') || lname.includes('sở') || lname.includes('trường') || lname.includes('outdoor');
              });
              if (formalVar) return formalVar.name;
            }
            
            // Fallback: Default to the first matching variant found
            return variants[0].name;
          });
          
          return {
            ...sit,
            characterNames: resolvedNames.join(', ')
          };
        });
      }

      if (tokenUsage.total > 0) {
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 📊 [Token Usage - Bóc Tách] Model: ${selectedModel} | Input: ${tokenUsage.prompt} tokens | Output: ${tokenUsage.completion} tokens | Tổng: ${tokenUsage.total} tokens`
        ]);
      } else {
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 📊 [Token Usage - Bóc Tách] Model: ${selectedModel} | Không có thông tin token usage từ API.`
        ]);
      }

      setProgress({ step: "Asset & Situation Extraction Complete!", percent: 100 });
      await new Promise(r => setTimeout(r, 500));
      
      setProject(finalProject);
      saveProjectCacheToDB(finalProject);

      setIsRefMappingApproved(false);
      localStorage.setItem("ai_ref_mapping_approved", "false");

      setActiveTab('shots');
      localStorage.setItem("ai_active_tab", "shots");

    } catch (err: any) {
      console.error("AI asset extraction error:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setIsGeneratingSituations(false);
      setProgress({ step: "", percent: 0, currentShot: 0, totalShots: 0 });
    }
  };

  const generateCinematicShots = async () => {
    if (!project) return;
    setIsGenerating(true);
    setIsWritingShots(true);
    setError(null);
    setProgress({ step: "Initializing cinematic shot direction...", percent: 5 });

    const activeKeys = apiMode === 'parallel' 
      ? apiKeysList.split(/[\n,]+/).map(k => k.trim()).filter(Boolean)
      : [apiKey].map(k => k.trim()).filter(Boolean);

    if (activeKeys.length === 0) {
      setError(apiMode === 'parallel' ? "Vui lòng nhập ít nhất một API Key trong phần cấu hình song song." : "Vui lòng nhập API Key trong phần cấu hình.");
      setIsGenerating(false);
      setIsWritingShots(false);
      return;
    }

    try {
      let finalSrt = srtData;
      let finalScript = scriptData;
      if (mergeShortLines) {
        const merged = mergeShortSRTAndScript(srtData, scriptData, 2.0, maxDuration);
        finalSrt = merged.srt;
        finalScript = merged.script;
      }

      const activeRulesText = promptRules
        .filter(r => r.enabled && r.text.trim())
        .map(r => r.text.trim())
        .join("\n- ");

      const currentStyle = styles.find(s => s.id === selectedStyleId) || styles[0];

      // PHASE 2: INDIVIDUAL SHOT GENERATION (1 Line = 1 Shot)
      const chunkSize = 25; // Still chunking for API efficiency, but prompts are per-line
      const totalLines = finalSrt.length;
      const totalChunks = Math.ceil(totalLines / chunkSize);
      let totalTokenUsage = { prompt: 0, completion: 0, total: 0 };

      // Helper function to process a single chunk task
      const processChunk = async (i: number, chunkIdx: number, totalChunks: number, keyToUse: string) => {
        const chunkData = finalSrt.slice(i, i + chunkSize).map((s, idx) => ({
          id: i + idx + 1,
          time: s.time,
          char: finalScript[i + idx]?.character || "Unknown",
          text: finalScript[i + idx]?.dialogue || s.text,
          type: finalScript[i + idx]?.type || "spoken",
          emotion: finalScript[i + idx]?.emotion || "neutral"
        }));

        const shotPrompt = generateShotPrompt(
          chunkData, 
          {
            characters: project.characters.map((c: any) => c.name),
            backgrounds: project.backgrounds.map((b: any) => b.location)
          }, 
          activeRulesText,
          project.situations
        );

        let chunkResText = "";
        let chunkTokenUsage = { prompt: 0, completion: 0, total: 0 };
        if (selectedModel.startsWith("gemini")) {
          const ai = new GoogleGenAI({ apiKey: keyToUse.trim() });
          const res = await ai.models.generateContent({
            model: selectedModel,
            contents: [{ role: "user", parts: [{ text: shotPrompt }] }],
            config: { 
              responseMimeType: "application/json",
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
              ]
            }
          });
          chunkResText = getResponseText(res);
          if (!chunkResText) {
            let reason = "Không có phản hồi hoặc bị chặn bởi bộ lọc an toàn.";
            if (res.candidates?.[0]?.finishReason) {
              reason = `Lý do dừng: ${res.candidates[0].finishReason}`;
            } else if (res.promptFeedback?.blockReason) {
              reason = `Bị chặn bởi bộ lọc: ${res.promptFeedback.blockReason}`;
            }
            throw new Error(`Không nhận được phản hồi văn bản từ AI cho phân khúc này. Vui lòng kiểm tra lại API Key. (${reason})`);
          }
          if (res.usageMetadata) {
            chunkTokenUsage.prompt = res.usageMetadata.promptTokenCount || 0;
            chunkTokenUsage.completion = res.usageMetadata.candidatesTokenCount || 0;
            chunkTokenUsage.total = res.usageMetadata.totalTokenCount || 0;
          }
        } else {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keyToUse.trim()}` },
            body: JSON.stringify({
              model: selectedModel,
              messages: [{ role: "user", content: shotPrompt }],
              response_format: { type: "json_object" }
            })
          });
          
          if (!res.ok) {
            let errorMsg = `API Error: ${res.status} ${res.statusText}`;
            try {
              const errData = await res.json();
              if (errData?.error?.message) {
                errorMsg = errData.error.message;
              }
            } catch (e) {}
            throw new Error(errorMsg);
          }
          
          const data = await res.json();
          if (!data.choices || data.choices.length === 0) {
            throw new Error("Không nhận được dữ liệu phản hồi (choices) từ OpenAI API.");
          }
          chunkResText = data.choices[0].message?.content;
          if (data.usage) {
            chunkTokenUsage.prompt = data.usage.prompt_tokens || 0;
            chunkTokenUsage.completion = data.usage.completion_tokens || 0;
            chunkTokenUsage.total = data.usage.total_tokens || 0;
          }
        }

        // chunkResText check is handled immediately above for Gemini and below for OpenAI
        if (!chunkResText) {
          throw new Error("Không nhận được phản hồi văn bản từ AI cho phân khúc này. Vui lòng kiểm tra lại API Key.");
        }

        if (chunkTokenUsage.total > 0) {
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 📊 [Token Usage - Viết Prompts - Chunk ${chunkIdx}/${totalChunks}] Model: ${selectedModel} | Input: ${chunkTokenUsage.prompt} tokens | Output: ${chunkTokenUsage.completion} tokens | Tổng chunk: ${chunkTokenUsage.total} tokens`
          ]);
        }

        const chunkRes = safeJsonParse(chunkResText);
        const styledShots = chunkRes.shots.map((shot: Shot, idx: number) => {
          let finalPrompt = shot.prompt.trim();
          if (!finalPrompt.endsWith('.')) finalPrompt += '.';
          const fullPrompt = `${finalPrompt} Visual Style: ${currentStyle.characterSuffix}, ${currentStyle.backgroundSuffix}.`;
          
          // Auto-detect the correct characters present in the scene
          const detected = detectCharacters(fullPrompt, project.characters);
          const initialCharacter = detected.join(", ") || shot.character;
          
          const srtBlock = finalSrt[i + idx];
          const range = srtBlock ? (srtBlock.index.includes("-") ? srtBlock.index : `${srtBlock.index}-${srtBlock.index}`) : `${shot.id}-${shot.id}`;

          return {
            ...shot,
            id: shot.id || (i + idx + 1), // Guarantee stable unique ID
            character: initialCharacter,
            prompt: fullPrompt,
            range: range
          };
        });

        return {
          styledShots,
          tokenUsage: chunkTokenUsage
        };
      };

      // Collect task lists
      const tasks: Array<{ i: number; chunkIdx: number }> = [];
      for (let i = 0; i < totalLines; i += chunkSize) {
        tasks.push({ i, chunkIdx: Math.floor(i / chunkSize) + 1 });
      }

      const finalShots: Shot[] = new Array(totalLines);
      let completedChunks = 0;
      let nextTaskIdx = 0;

      // Define worker pull loop
      const runWorker = async (workerId: number) => {
        const workerKey = activeKeys[workerId % activeKeys.length];
        while (nextTaskIdx < tasks.length) {
          const currentIdx = nextTaskIdx++;
          const task = tasks[currentIdx];
          
          const result = await processChunk(task.i, task.chunkIdx, totalChunks, workerKey);
          
          // Place shots in pre-allocated array at correct chronological index
          for (let idx = 0; idx < result.styledShots.length; idx++) {
            finalShots[task.i + idx] = result.styledShots[idx];
          }

          totalTokenUsage.prompt += result.tokenUsage.prompt;
          totalTokenUsage.completion += result.tokenUsage.completion;
          totalTokenUsage.total += result.tokenUsage.total;

          completedChunks++;
          setProgress({
            step: `Generating Cinematic Prompts (Stage 2 - ${apiMode === 'parallel' ? 'Parallel' : 'Sequential'})...`,
            percent: 10 + Math.floor((completedChunks / totalChunks) * 85),
            currentShot: Math.min(completedChunks * chunkSize, totalLines),
            totalShots: totalLines
          });
        }
      };

      // Launch concurrent workers (concurrency level = number of active keys)
      const concurrency = Math.min(activeKeys.length, tasks.length);
      const workers: Promise<void>[] = [];
      for (let w = 0; w < concurrency; w++) {
        workers.push(runWorker(w));
      }

      await Promise.all(workers);

      // Clean/filter results to make sure no gaps
      const cleanShots = finalShots.filter(Boolean);

      if (totalTokenUsage.total > 0) {
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 📊 ✅ [Tổng Token Usage - Viết Prompts] Model: ${selectedModel} | Tổng Input: ${totalTokenUsage.prompt} tokens | Tổng Output: ${totalTokenUsage.completion} tokens | Tổng cộng: ${totalTokenUsage.total} tokens`
        ]);
      }

      const updatedProject: ProjectData = {
        ...project,
        shots: cleanShots
      };

      setProgress({ step: "Finalizing Production Package...", percent: 100, currentShot: totalLines, totalShots: totalLines });
      await new Promise(r => setTimeout(r, 500));
      
      setProject(updatedProject);
      saveProjectCacheToDB(updatedProject);

      setIsRefMappingApproved(true);
      localStorage.setItem("ai_ref_mapping_approved", "true");

    } catch (err: any) {
      console.error("AI Stage 2 shot writing error:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setIsWritingShots(false);
      setProgress({ step: "", percent: 0, currentShot: 0, totalShots: 0 });
    }
  };

  const handleUpdateSituation = (id: number, field: keyof Situation, value: any) => {
    if (!project) return;
    const updatedSituations = project.situations.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    const updatedProject = { ...project, situations: updatedSituations };
    setProject(updatedProject);
    saveProjectCacheToDB(updatedProject);
  };

  const toggleCharacterInSituation = (id: number, charName: string, currentNames: string) => {
    const currentList = currentNames
      ? currentNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    let updatedList;
    if (currentList.includes(charName)) {
      updatedList = currentList.filter(name => name !== charName);
    } else {
      updatedList = [...currentList, charName];
    }
    handleUpdateSituation(id, "characterNames", updatedList.join(", "));
  };

  const toggleBackgroundInSituation = (id: number, bgLocation: string, currentNames: string) => {
    const currentList = currentNames
      ? currentNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    let updatedList;
    if (currentList.includes(bgLocation)) {
      updatedList = currentList.filter(name => name !== bgLocation);
    } else {
      updatedList = [...currentList, bgLocation];
    }
    handleUpdateSituation(id, "backgroundNames", updatedList.join(", "));
  };

  const togglePropInSituation = (id: number, propName: string, currentNames: string) => {
    const currentList = currentNames
      ? currentNames.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];
    let updatedList;
    if (currentList.includes(propName)) {
      updatedList = currentList.filter(name => name !== propName);
    } else {
      updatedList = [...currentList, propName];
    }
    handleUpdateSituation(id, "propNames", updatedList.join(", "));
  };

  const handleAddSituation = () => {
    if (!project) return;
    const newId = project.situations && project.situations.length > 0 
      ? Math.max(...project.situations.map(s => s.id)) + 1 
      : 1;
    const newSituation: Situation = {
      id: newId,
      timeRange: "00:00 - 00:00",
      location: "Bối cảnh mới",
      summary: "Mô tả tình huống mới",
      characterNames: "",
      backgroundNames: "",
      propNames: ""
    };
    const updatedProject = { 
      ...project, 
      situations: [...(project.situations || []), newSituation] 
    };
    setProject(updatedProject);
    saveProjectCacheToDB(updatedProject);
  };

  const handleDeleteSituation = (id: number) => {
    if (!project) return;
    const updatedSituations = (project.situations || []).filter(s => s.id !== id);
    const updatedProject = { ...project, situations: updatedSituations };
    setProject(updatedProject);
    saveProjectCacheToDB(updatedProject);
  };

  const handleLockAndReconfigure = () => {
    const isConfirmed = window.confirm("Bạn có chắc chắn muốn khóa và cấu hình lại tình huống không? Hành động này sẽ làm sạch các prompts phân cảnh đã sinh ở giai đoạn 2.");
    if (!isConfirmed) return;
    setIsRefMappingApproved(false);
    localStorage.setItem("ai_ref_mapping_approved", "false");
    
    // Clear shots in project
    if (project) {
      const updated = { ...project, shots: [] };
      setProject(updated);
      saveProjectCacheToDB(updated);
    }
  };

  const analyzeThumbnailStory = async () => {
    if (!thumbStoryInput.trim()) {
      alert("Vui lòng nhập kịch bản hoặc bấm 'Lấy kịch bản' trước khi phân tích.");
      return;
    }
    if (!apiKey) {
      alert("Vui lòng điền API Key trong phần cài đặt.");
      return;
    }
    
    setIsAnalyzingThumb(true);
    setThumbJsonError(null);
    
    try {
      const prompt = generateThumbnailAnalysisPrompt(thumbStoryInput, thumbTitlesInput);
      let resText = "";
      
      if (selectedModel.startsWith("gemini")) {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const res = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { 
            responseMimeType: "application/json",
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });
        resText = getResponseText(res);
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        const data = await res.json();
        resText = data.choices[0].message.content;
      }
      
      const extractedData = safeJsonParse(resText, "Không thể phân tích dữ liệu JSON trả về từ AI. Hãy thử phân tích lại.");
      setThumbData(extractedData);
      
    } catch (err: any) {
      console.error("Thumbnail analysis error:", err);
      setThumbJsonError(err.message);
    } finally {
      setIsAnalyzingThumb(false);
    }
  };

  const syncSrtToSeo1 = () => {
    if (srtText) {
      setSeoSrtInput1(srtText);
      alert("Đồng bộ thành công phụ đề vào Ô 1.");
    } else {
      alert("Không tìm thấy phụ đề chính để đồng bộ.");
    }
  };

  const syncSrtToSeo2 = () => {
    if (srtText) {
      setSeoSrtInput2(srtText);
      alert("Đồng bộ thành công phụ đề vào Ô 2.");
    } else {
      alert("Không tìm thấy phụ đề chính để đồng bộ.");
    }
  };

    const handleGenerateSEO = async () => {
    if (!seoSrtInput1.trim()) {
      alert("Vui lòng nhập phụ đề hoặc kịch bản ở ô Phụ đề trước khi tạo.");
      return;
    }
    if (!apiKey) {
      alert("Vui lòng điền API Key trong phần cài đặt.");
      return;
    }

    setIsGeneratingSeo1(true);
    setIsGeneratingSeo2(true);
    setSeoError1(null);
    setSeoError2(null);

    try {
      const prompt = generateSEOPrompt(seoSrtInput1);
      let resText = "";

      if (selectedModel.startsWith("gemini")) {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const res = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { 
            responseMimeType: "application/json",
            safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
            ]
          }
        });
        resText = getResponseText(res);
      } else {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        const data = await res.json();
        resText = data.choices[0].message.content;
      }

      const parsed = safeJsonParse(resText, "Không thể phân tích dữ liệu JSON trả về từ AI. Hãy thử tạo lại.");
      if (parsed && (parsed.section1 || parsed.section2 || parsed.bgm_music_prompts)) {
        if (parsed.section1) setSeoSection1(parsed.section1);
        if (parsed.section2) setSeoSection2(parsed.section2);
        if (parsed.bgm_music_prompts) setSeoBgmPrompts(parsed.bgm_music_prompts);
      } else {
        throw new Error("AI không trả về đúng cấu trúc JSON hợp lệ.");
      }
    } catch (err: any) {
      console.error(err);
      setSeoError1(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setIsGeneratingSeo1(false);
      setIsGeneratingSeo2(false);
    }
  };


  const generateThumbnailImage = async () => {
    if (!thumbMasterPrompt.trim()) {
      alert("Vui lòng tạo final master prompt trước.");
      return;
    }
    
    setIsGeneratingThumbImage(true);
    
    // Clear active version's image URL in thumbData so placeholder shows during render
    if (thumbData) {
      const versions = [...(thumbData.versions || [])];
      if (versions.length === 0) {
        versions[0] = { ...thumbData };
        versions[1] = { ...thumbData };
        versions[2] = { ...thumbData };
      }
      if (!versions[selectedVersionIndex]) {
        versions[selectedVersionIndex] = { ...thumbData };
      }
      versions[selectedVersionIndex] = {
        ...versions[selectedVersionIndex],
        imageUrl: ""
      };
      setThumbData({
        ...thumbData,
        versions
      });
    }
    setThumbImageUrl("");
    
    let url = "";
    let lastErrorMsg = "";
    const modelsToTry = selectedImageModel === "auto" 
      ? ["GEM_PIX_2", "NARWHAL"] 
      : [selectedImageModel];

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        const response = await fetch(`${cleanApiUrl}/api/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: thumbMasterPrompt,
            count: 1,
            aspect_ratio: "IMAGE_ASPECT_RATIO_LANDSCAPE",
            model: currentModel
          })
        });

        if (!response.ok) {
          let errorMsg = `Mã lỗi HTTP: ${response.status}`;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errorMsg = errData.error;
            }
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const data = await response.json();
        if (!data.success || !data.images || data.images.length === 0) {
          throw new Error(data.message || "Không thể tạo ảnh từ Veo API");
        }

        url = sanitizeUrl(data.images[0].url);
        break; // Success!
      } catch (err: any) {
        lastErrorMsg = err.message;
        if (i < modelsToTry.length - 1) {
          console.warn(`Model ${currentModel} thất bại (${err.message}). Đang chuyển sang model dự phòng ${modelsToTry[i+1]}...`);
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🔄 Vẽ Thumb: Model ${currentModel} gặp lỗi (${err.message}). Tự động chuyển đổi sang model dự phòng ${modelsToTry[i+1]}...`
          ]);
        }
      }
    }

    try {
      if (!url) {
        throw new Error(lastErrorMsg || "Tất cả các Model AI đều không thể tạo được ảnh.");
      }
      
      // Save image to active version in thumbData
      if (thumbData) {
        const versions = [...(thumbData.versions || [])];
        if (versions.length === 0) {
          versions[0] = { ...thumbData };
          versions[1] = { ...thumbData };
          versions[2] = { ...thumbData };
        }
        if (!versions[selectedVersionIndex]) {
          versions[selectedVersionIndex] = { ...thumbData };
        }
        versions[selectedVersionIndex] = {
          ...versions[selectedVersionIndex],
          imageUrl: url
        };
        setThumbData({
          ...thumbData,
          versions
        });
      }
      setThumbImageUrl(url);
      
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Vẽ ảnh Thumbnail thành công! URL: ${url}`
      ]);
    } catch (err: any) {
      console.error("Error generating thumbnail image:", err);
      alert(`Lỗi vẽ ảnh thumbnail: ${err.message}. Đảm bảo Veo Automation API đang chạy ở ${cleanApiUrl}`);
    } finally {
      setIsGeneratingThumbImage(false);
    }
  };

  const uploadImageForVeo = async (imageUrl: string, filename: string, targetAccountId?: string): Promise<{ mediaId: string; accountId?: string }> => {
    try {
      console.log(`Starting upload for VEO reference image: ${imageUrl}`);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: "image/jpeg" });
      
      const formData = new FormData();
      formData.append("file", file);
      if (targetAccountId) {
        formData.append("account_id", targetAccountId);
      }
      
      const uploadRes = await fetch(`${cleanApiUrl}/api/upload_image`, {
        method: "POST",
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Mã lỗi HTTP upload: ${uploadRes.status}`);
      }
      
      const data = await uploadRes.json();
      if (!data.success || !data.media_id) {
        throw new Error(data.message || "Không thể upload ảnh lên Veo");
      }
      
      console.log(`Successfully uploaded ${filename}. Media ID: ${data.media_id}, Account ID: ${data.account_id}`);
      return { mediaId: data.media_id, accountId: data.account_id };
    } catch (err: any) {
      console.error(`Error uploading image to Veo: ${err.message}`);
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Lỗi upload ảnh tham chiếu ${filename}: ${err.message}`
      ]);
      throw err;
    }
  };

  const generateImage = async (type: 'character' | 'background' | 'shot' | 'prop', index: number, customPrompt?: string) => {
    if (!project) return;
    const key = `${type}_${index}`;
    const statusKey = `image_${type}_${index}`;
    
    setGeneratingImages(prev => ({ ...prev, [key]: true }));
    setError(null);
    setGenerationErrors(prev => {
      const next = { ...prev };
      delete next[statusKey];
      return next;
    });

    const asset = type === 'character' 
      ? project.characters[index] 
      : type === 'background' 
      ? project.backgrounds[index]
      : type === 'prop'
      ? project.props?.[index]
      : project.shots[index];

    if (!asset) return;

    // Clean existing style strings and dynamically append current selected style
    const currentStyle = styles.find(s => s.id === selectedStyleId) || styles[0];
    let basePrompt = customPrompt !== undefined ? customPrompt.trim() : (asset.prompt || "").trim();

    // Swap safeguard: if appearance contains character sheet keywords but prompt doesn't, use appearance
    if (type === 'character' && (asset as any).appearance && customPrompt === undefined) {
      const appearanceLower = (asset as any).appearance.toLowerCase();
      const promptLower = basePrompt.toLowerCase();
      const appearanceHasSheet = appearanceLower.includes("character sheet") || 
                                 appearanceLower.includes("3-view reference") || 
                                 appearanceLower.includes("reference sheet");
      const promptHasSheet = promptLower.includes("character sheet") || 
                             promptLower.includes("3-view reference") || 
                             promptLower.includes("reference sheet");
                             
      if (appearanceHasSheet && !promptHasSheet) {
        basePrompt = (asset as any).appearance.trim();
      }
    } else if (type === 'background' && (asset as any).angle) {
      const angleLower = (asset as any).angle.toLowerCase();
      const promptLower = basePrompt.toLowerCase();
      const angleHasPlate = angleLower.includes("background of") || 
                            angleLower.includes("background plate") || 
                            angleLower.includes("empty scene") ||
                            angleLower.includes("4-angle") ||
                            angleLower.includes("reference sheet");
      const promptHasPlate = promptLower.includes("background of") || 
                             promptLower.includes("background plate") || 
                             promptLower.includes("empty scene") ||
                             promptLower.includes("4-angle") ||
                             promptLower.includes("reference sheet");
                             
      if (angleHasPlate && !promptHasPlate) {
        basePrompt = (asset as any).angle.trim();
      }
    } else if (type === 'prop' && (asset as any).appearance && customPrompt === undefined) {
      const appearanceLower = (asset as any).appearance.toLowerCase();
      const promptLower = basePrompt.toLowerCase();
      const appearanceHasSheet = appearanceLower.includes("prop sheet") || 
                                 appearanceLower.includes("isolated on") || 
                                 appearanceLower.includes("studio photography");
      const promptHasSheet = promptLower.includes("prop sheet") || 
                             promptLower.includes("isolated on") || 
                             promptLower.includes("studio photography");
                             
      if (appearanceHasSheet && !promptHasSheet) {
        basePrompt = (asset as any).appearance.trim();
      }
    }
    
    // Regex matches "Visual Style: ..." case-insensitively, possibly with dots or spaces
    basePrompt = basePrompt.replace(/\s*Visual\s+Style:\s*.*$/i, "").trim();
    if (basePrompt.endsWith('.')) {
      basePrompt = basePrompt.slice(0, -1).trim();
    }

    let prompt = basePrompt;
    if (type === 'character') {
      const suffix = currentStyle.characterSuffix;
      const rawInst = (asset as any).appearanceInstruction;
      const instruction = rawInst !== undefined 
        ? rawInst.trim() 
        : "Maintain the identical facial features, facial identity, and hair style from the reference image, matching the character's appearance";
      const redrawText = instruction ? `, Redraw Modification: ${instruction}` : "";
      prompt = `${basePrompt}${redrawText}. Visual Style: ${suffix}.`;
    } else if (type === 'background') {
      const suffix = currentStyle.backgroundSuffix;
      const instruction = (asset as any).appearanceInstruction ? (asset as any).appearanceInstruction.trim() : "";
      const redrawText = instruction ? `, Redraw Modification: ${instruction}` : "";
      prompt = `${basePrompt}${redrawText}. Visual Style: ${suffix}.`;
    } else if (type === 'prop') {
      const suffix = currentStyle.backgroundSuffix;
      const instruction = (asset as any).appearanceInstruction ? (asset as any).appearanceInstruction.trim() : "";
      const redrawText = instruction ? `, Redraw Modification: ${instruction}` : "";
      prompt = `${basePrompt}${redrawText}. Visual Style: ${suffix}.`;
    } else if (type === 'shot') {
      prompt = `${basePrompt}. Visual Style: ${currentStyle.characterSuffix}, ${currentStyle.backgroundSuffix}.`;
    }
    const aspect_ratio = (type === 'character' || type === 'prop')
      ? "IMAGE_ASPECT_RATIO_SQUARE" 
      : "IMAGE_ASPECT_RATIO_LANDSCAPE";

    let url = "";
    let mediaId = "";
    let accountId = "";
    let lastErrorMsg = "";
    const modelsToTry = selectedImageModel === "auto" 
      ? ["GEM_PIX_2", "NARWHAL"] 
      : [selectedImageModel];

    // 1. Gather all candidates up to 10 references
    let media_ids: string[] = [];
    let account_id: string | undefined = undefined;

    const explicitRefs = asset.referenceImages || [];

    // Determine target account_id
    for (const ref of explicitRefs) {
      if (ref.accountId) {
        account_id = ref.accountId;
        break;
      }
    }

    if (!account_id && asset.accountId) {
      account_id = asset.accountId;
    }

    // 2. Process candidates and ensure they are all in the same account
    for (let i = 0; i < explicitRefs.length; i++) {
      const ref = explicitRefs[i];
      if (!ref.url) continue;

      const isCompatible = ref.mediaId && (!account_id || ref.accountId === account_id);

      if (isCompatible) {
        media_ids.push(ref.mediaId!);
        if (!account_id && ref.accountId) {
          account_id = ref.accountId;
        }
      } else {
        const filename = `${type}_${index}_ref_${i}.jpg`;
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] 🔄 ${type === 'character' ? 'Nhân vật' : type === 'background' ? 'Bối cảnh' : 'Phân cảnh'} #${index + 1}: ${ref.mediaId ? 'Tài khoản không khớp' : 'Chưa có Media ID'}. Đang upload ảnh tham chiếu #${i + 1} lên tài khoản ${account_id || 'mới'}...`
        ]);

        setGenerationStatuses(prev => ({
          ...prev,
          [statusKey]: `Đang tải ảnh tham chiếu #${i + 1}...`
        }));

        try {
          const uploadRes = await uploadImageForVeo(ref.url, filename, account_id);
          media_ids.push(uploadRes.mediaId);
          
          if (!account_id && uploadRes.accountId) {
            account_id = uploadRes.accountId;
          }

          // Persist the media ID and account ID in application state
          setProject(prev => {
            if (!prev) return null;
            const newProject = { ...prev };
            const targetAccId = uploadRes.accountId || account_id || undefined;

            if (type === 'character') {
              const newChars = [...prev.characters];
              const c = { ...newChars[index] };
              const cRefs = [...(c.referenceImages || [])];
              if (cRefs[i]) {
                cRefs[i] = {
                  ...cRefs[i],
                  mediaId: uploadRes.mediaId,
                  accountId: targetAccId
                };
              }
              c.referenceImages = cRefs;
              newChars[index] = c;
              newProject.characters = newChars;
            } else if (type === 'background') {
              const newBgs = [...prev.backgrounds];
              const b = { ...newBgs[index] };
              const bRefs = [...(b.referenceImages || [])];
              if (bRefs[i]) {
                bRefs[i] = {
                  ...bRefs[i],
                  mediaId: uploadRes.mediaId,
                  accountId: targetAccId
                };
              }
              b.referenceImages = bRefs;
              newBgs[index] = b;
              newProject.backgrounds = newBgs;
            } else if (type === 'prop') {
              const newProps = [...(prev.props || [])];
              const p = { ...newProps[index] };
              const pRefs = [...(p.referenceImages || [])];
              if (pRefs[i]) {
                pRefs[i] = {
                  ...pRefs[i],
                  mediaId: uploadRes.mediaId,
                  accountId: targetAccId
                };
              }
              p.referenceImages = pRefs;
              newProps[index] = p;
              newProject.props = newProps;
            } else {
              const newShots = [...prev.shots];
              const s = { ...newShots[index] };
              const sRefs = [...(s.referenceImages || [])];
              if (sRefs[i]) {
                sRefs[i] = {
                  ...sRefs[i],
                  mediaId: uploadRes.mediaId,
                  accountId: targetAccId
                };
              }
              s.referenceImages = sRefs;
              newShots[index] = s;
              newProject.shots = newShots;
            }
            return newProject;
          });

          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ ${type === 'character' ? 'Nhân vật' : type === 'background' ? 'Bối cảnh' : 'Phân cảnh'} #${index + 1}: Upload ảnh tham chiếu #${i + 1} thành công. Media ID: ${uploadRes.mediaId}`
          ]);
        } catch (e: any) {
          console.error(`Upload reference failed:`, e);
          throw new Error(`Lỗi tải ảnh tham chiếu #${i + 1}: ${e.message}`);
        }
      }
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⏳ Thử lại vẽ ảnh lần ${attempt}/${maxAttempts} cho ${type === 'character' ? 'Nhân vật' : type === 'background' ? 'Bối cảnh' : 'Phân cảnh'} #${index + 1} sau ${retryDelay} giây...`
        ]);
        setGenerationStatuses(prev => ({
          ...prev,
          [statusKey]: `Thử lại ${attempt}/${maxAttempts} (chờ ${retryDelay}s)...`
        }));
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
      }

      let attemptSuccess = false;
      for (let i = 0; i < modelsToTry.length; i++) {
        const currentModel = modelsToTry[i];
        setGenerationStatuses(prev => ({
          ...prev,
          [statusKey]: `Đang gọi API (${currentModel}, lần ${attempt}/${maxAttempts})...`
        }));

        try {
          const reqBody: any = {
            prompt: cleanPromptForAiModel(prompt, project),
            count: 1,
            aspect_ratio,
            model: currentModel,
            for_video: true
          };
          if (media_ids.length > 0) {
            reqBody.media_ids = media_ids;
            reqBody.account_id = account_id;
          }

          const response = await fetch(`${cleanApiUrl}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(reqBody)
          });

          if (!response.ok) {
            let errorMsg = `Mã lỗi HTTP: ${response.status}`;
            try {
              const errData = await response.json();
              if (errData && errData.error) {
                errorMsg = errData.error;
              }
            } catch (e) {
              // Fallback to HTTP error if response is not JSON
            }
            throw new Error(errorMsg);
          }

          const data = await response.json();
          if (!data.success || !data.images || data.images.length === 0) {
            throw new Error(data.message || "Không thể tạo ảnh từ Veo API");
          }

          url = sanitizeUrl(data.images[0].url);
          mediaId = data.images[0].media_id || "";
          accountId = data.account_id || "";
          attemptSuccess = true;
          break; // Success!
        } catch (err: any) {
          lastErrorMsg = err.message;
          if (i < modelsToTry.length - 1) {
            console.warn(`Model ${currentModel} thất bại (${err.message}). Đang chuyển sang model dự phòng ${modelsToTry[i+1]}...`);
            setSystemLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] 🔄 Model ${currentModel} gặp lỗi (${err.message}). Tự động chuyển đổi sang model dự phòng ${modelsToTry[i+1]}...`
            ]);
          }
        }
      }

      if (attemptSuccess) {
        break; // Success!
      }
    }

    try {
      if (!url) {
        throw new Error(lastErrorMsg || "Tất cả các Model AI đều không thể tạo được ảnh.");
      }

      if (!mediaId && (type === 'character' || type === 'background')) {
        try {
          const cleanName = getCleanFilename(type === 'character' ? 'char' : 'bg', type === 'character' ? (asset as any).name : (asset as any).location);
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🔄 Đang tự động upload ảnh tham chiếu ${cleanName} lên Google Veo...`
          ]);
          setGenerationStatuses(prev => ({
            ...prev,
            [statusKey]: "Đang upload lên Veo..."
          }));
          const uploadRes = await uploadImageForVeo(url, cleanName);
          mediaId = uploadRes.mediaId;
          accountId = uploadRes.accountId || "";
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Tự động upload ảnh tham chiếu ${cleanName} thành công. Media ID: ${mediaId}`
          ]);
        } catch (uploadErr: any) {
          console.error("Proactive upload failed:", uploadErr);
        }
      }

      setProject(prev => {
        if (!prev) return prev;
        const newProject = { ...prev };

        if (type === 'character') {
          const newChars = [...prev.characters];
          newChars[index] = { 
            ...newChars[index], 
            imageUrl: url, 
            mediaId: mediaId || undefined,
            accountId: accountId || undefined
          };
          newProject.characters = newChars;
        } else if (type === 'background') {
          const newBgs = [...prev.backgrounds];
          newBgs[index] = { 
            ...newBgs[index], 
            imageUrl: url, 
            mediaId: mediaId || undefined,
            accountId: accountId || undefined
          };
          newProject.backgrounds = newBgs;
        } else if (type === 'prop') {
          const newProps = [...(prev.props || [])];
          newProps[index] = { 
            ...newProps[index], 
            imageUrl: url, 
            mediaId: mediaId || undefined,
            accountId: accountId || undefined
          };
          newProject.props = newProps;
        } else {
          const newShots = [...prev.shots];
          newShots[index] = { 
            ...newShots[index], 
            imageUrl: url,
            mediaId: mediaId || undefined,
            accountId: accountId || undefined
          };
          newProject.shots = newShots;
        }
        return newProject;
      });

      // Automatically save successfully generated image directly to local linked directory if in Electron
      if ((window as any).electronAPI) {
        let saveSubDir: string | null = null;
        let saveName = "";
        if (type === 'shot') {
          saveSubDir = "images";
          saveName = `shot_${index + 1}.jpg`;
        } else if (type === 'character') {
          saveName = getCleanFilename('char', (asset as any).name);
        } else if (type === 'background') {
          saveName = getCleanFilename('bg', (asset as any).location);
        } else if (type === 'prop') {
          saveName = getCleanFilename('prop', (asset as any).name);
        }

        if (saveName) {
          fetch(url)
            .then(res => res.blob())
            .then(blob => {
              saveFileToProject(saveSubDir, saveName, blob);
            })
            .catch(err => console.error("Auto-save image failed:", err));
        }
      }

      // Clear generation error on success
      setGenerationErrors(prev => {
        const next = { ...prev };
        delete next[statusKey];
        return next;
      });
    } catch (err: any) {
      console.error("Error generating image:", err);
      setError(`Lỗi vẽ ảnh (${type === 'character' ? 'Nhân vật' : type === 'background' ? 'Bối cảnh' : 'Đạo cụ'} #${index + 1}): ${err.message}. Đảm bảo Veo Automation API đang chạy ở ${cleanApiUrl}`);
      setGenerationErrors(prev => ({
        ...prev,
        [statusKey]: err.message
      }));
    } finally {
      setGeneratingImages(prev => ({ ...prev, [key]: false }));
      setGenerationStatuses(prev => {
        const next = { ...prev };
        delete next[statusKey];
        return next;
      });
    }
  };

  const saveFileToProject = async (
    subDir: string | null, 
    filename: string, 
    blob: Blob | null, 
    textData?: string
  ): Promise<boolean> => {
    if (!(window as any).electronAPI) {
      console.warn("saveFileToProject is only supported in Electron environment.");
      return false;
    }
    try {
      const folderPath = localStorage.getItem("ai_image_folder_path") || folderPathInput;
      if (!folderPath) {
        console.warn("No local directory is selected/linked yet.");
        return false;
      }
      
      let dataBase64 = "";
      if (blob) {
        // Convert blob to base64 string
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g. "data:image/jpeg;base64,")
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        dataBase64 = await base64Promise;
      }

      const result = await (window as any).electronAPI.saveFile({
        projectPath: folderPath,
        subDir,
        filename,
        dataBase64,
        textData
      });
      
      if (result && result.success) {
        return true;
      } else {
        console.error("IPC saveFile failed:", result?.error);
        return false;
      }
    } catch (e) {
      console.error("Error in saveFileToProject:", e);
      return false;
    }
  };

  const ensureDirectoryPermission = async (): Promise<boolean> => {
    if ((window as any).electronAPI) {
      if (!folderPathInput) {
        const confirmFolder = window.confirm("Tự động tải file về PC: Bạn chưa liên kết thư mục PC để tự động lưu. Vui lòng chọn và liên kết thư mục PC ngay bây giờ.");
        if (confirmFolder) {
          await handlePickDirectory();
          return !!localStorage.getItem("ai_image_folder_path");
        }
        return false;
      }
      setDirPermissionGranted(true);
      return true;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if ('showDirectoryPicker' in window) {
          const confirmFolder = window.confirm("Tự động tải video về PC: Bạn chưa liên kết thư mục PC để tự động lưu video. Vui lòng chọn và liên kết thư mục PC ngay bây giờ.");
          if (confirmFolder) {
            dirHandle = await (window as any).showDirectoryPicker({
              mode: "readwrite"
            });
            setSelectedDirectoryHandle(dirHandle);
            setDirPermissionGranted(true);
            return true;
          }
          return false;
        }
        return false;
      }

      // If handle exists, check/request write permission
      const permission = await dirHandle.queryPermission({ mode: "readwrite" });
      if (permission !== 'granted') {
        const request = await dirHandle.requestPermission({ mode: "readwrite" });
        if (request !== 'granted') {
          setDirPermissionGranted(false);
          alert("Lưu ý: Chưa cấp quyền ghi vào thư mục. Video sẽ không được tự động tải về PC.");
          return false;
        }
      }
      setDirPermissionGranted(true);
      return true;
    } catch (e: any) {
      console.error("Error ensuring directory permissions:", e);
      setDirPermissionGranted(false);
      return false;
    }
  };

  const generateVideo = async (index: number, overridePrompt?: string) => {
    if (!project) return;
    
    // Ensure directory permissions under active user click gesture
    await ensureDirectoryPermission();

    const shot = project.shots[index];
    const promptToSend = overridePrompt !== undefined ? overridePrompt : shot.prompt;
    const key = index;
    const statusKey = `video_${index}`;

    setGeneratingVideos(prev => ({ ...prev, [key]: true }));
    setGenerationErrors(prev => {
      const next = { ...prev };
      delete next[statusKey];
      return next;
    });
    
    // Clear any previous error
    const updateShotError = (errStr: string | null) => {
      setProject(prev => {
        if (!prev) return null;
        const newShots = [...prev.shots];
        newShots[index] = { ...newShots[index], videoError: errStr || undefined };
        return { ...prev, shots: newShots };
      });
    };

    updateShotError(null);

    try {
      // Find matched Character reference
      const matchedChars = getMatchedCharacters(shot, project.characters);

      // Find matched Background reference
      const matchedBgs = getMatchedBackgrounds(shot, project.backgrounds);

      // 1. Gather all candidates up to 3 references
      const candidates: Array<{
        url: string;
        mediaId?: string;
        accountId?: string;
        source: 'explicit' | 'character' | 'background' | 'prop';
        refIndex?: number;
        nameOrLocation?: string;
      }> = [];

      // A. Explicit reference images
      const explicitRefs = shot.referenceImages || [];
      explicitRefs.forEach((ref, i) => {
        if (ref.url && candidates.length < 3) {
          candidates.push({
            url: ref.url,
            mediaId: ref.mediaId,
            accountId: ref.accountId,
            source: 'explicit',
            refIndex: i
          });
        }
      });

      // B. Auto-detected characters
      matchedChars.forEach(char => {
        if (char.imageUrl && candidates.length < 3) {
          const exists = candidates.some(c => c.url === char.imageUrl);
          if (!exists) {
            candidates.push({
              url: char.imageUrl,
              mediaId: char.mediaId,
              accountId: char.accountId,
              source: 'character',
              nameOrLocation: char.name
            });
          }
        }
      });

      // C. Auto-detected backgrounds
      matchedBgs.forEach(bg => {
        if (bg.imageUrl && candidates.length < 3) {
          const exists = candidates.some(c => c.url === bg.imageUrl);
          if (!exists) {
            candidates.push({
              url: bg.imageUrl,
              mediaId: bg.mediaId,
              accountId: bg.accountId,
              source: 'background',
              nameOrLocation: bg.location
            });
          }
        }
      });

      // D. Auto-detected props
      const matchedProps = getMatchedProps(shot, project.props || []);
      matchedProps.forEach(prop => {
        if (prop.imageUrl && candidates.length < 3) {
          const exists = candidates.some(c => c.url === prop.imageUrl);
          if (!exists) {
            candidates.push({
              url: prop.imageUrl,
              mediaId: prop.mediaId,
              accountId: prop.accountId,
              source: 'prop',
              nameOrLocation: prop.name
            });
          }
        }
      });

      const hasRefs = candidates.length > 0;
      if (!hasRefs) {
        throw new Error("Không thể tạo video: Phân cảnh này chưa có bất kỳ ảnh tham chiếu nào.");
      }

      let media_ids: string[] = [];
      let account_id: string | undefined = undefined;

      // 2. Scan candidates to determine the target account_id
      for (const c of candidates) {
        if (c.accountId) {
          account_id = c.accountId;
          break;
        }
      }

      if (!account_id && shot.accountId) {
        account_id = shot.accountId;
      }

      // 3. Process candidates and ensure they are all in the same account
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const isCompatible = c.mediaId && (!account_id || c.accountId === account_id);

        if (isCompatible) {
          media_ids.push(c.mediaId!);
          if (!account_id && c.accountId) {
            account_id = c.accountId;
          }
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 💾 Phân cảnh #${index + 1}: Sử dụng cached Media ID [${c.source}] #${i + 1}: ${c.mediaId}`
          ]);
        } else if (c.url) {
          let filename = `shot_${index}_ref_${i}.jpg`;
          if (c.source === 'explicit' && c.refIndex !== undefined) {
            filename = `shot_${index}_ref_${c.refIndex}.jpg`;
          } else if (c.source === 'character' && c.nameOrLocation) {
            filename = getCleanFilename('char', c.nameOrLocation);
          } else if (c.source === 'background' && c.nameOrLocation) {
            filename = getCleanFilename('bg', c.nameOrLocation);
          } else if (c.source === 'prop' && c.nameOrLocation) {
            filename = getCleanFilename('prop', c.nameOrLocation);
          }

          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 🔄 Phân cảnh #${index + 1}: ${c.mediaId ? 'Tài khoản không khớp' : 'Chưa có Media ID'}. Đang upload [${c.source}] #${i + 1} lên tài khoản ${account_id || 'mới'}...`
          ]);

          setGenerationStatuses(prev => ({
            ...prev,
            [statusKey]: `Đang tải ảnh [${c.source}] #${i + 1}...`
          }));

          try {
            const uploadRes = await uploadImageForVeo(c.url, filename, account_id);
            media_ids.push(uploadRes.mediaId);
            
            if (!account_id && uploadRes.accountId) {
              account_id = uploadRes.accountId;
            }

            // Persist the media ID and account ID in application state
            setProject(prev => {
              if (!prev) return null;
              const newProject = { ...prev };
              const targetAccId = uploadRes.accountId || account_id || undefined;

              if (c.source === 'explicit' && c.refIndex !== undefined) {
                const newShots = [...prev.shots];
                const s = { ...newShots[index] };
                const sRefs = [...(s.referenceImages || [])];
                if (sRefs[c.refIndex]) {
                  sRefs[c.refIndex] = {
                    ...sRefs[c.refIndex],
                    mediaId: uploadRes.mediaId,
                    accountId: targetAccId
                  };
                }
                s.referenceImages = sRefs;
                newShots[index] = s;
                newProject.shots = newShots;
              } else if (c.source === 'character') {
                const charIdx = prev.characters.findIndex(ch => ch.name === c.nameOrLocation);
                if (charIdx !== -1) {
                  const newChars = [...prev.characters];
                  newChars[charIdx] = {
                    ...newChars[charIdx],
                    mediaId: uploadRes.mediaId,
                    accountId: targetAccId
                  };
                  newProject.characters = newChars;
                }
              } else if (c.source === 'background') {
                const bgIdx = prev.backgrounds.findIndex(bg => bg.location === c.nameOrLocation);
                if (bgIdx !== -1) {
                  const newBgs = [...prev.backgrounds];
                  newBgs[bgIdx] = {
                    ...newBgs[bgIdx],
                    mediaId: uploadRes.mediaId,
                    accountId: targetAccId
                  };
                  newProject.backgrounds = newBgs;
                }
              } else if (c.source === 'prop') {
                const propIdx = (prev.props || []).findIndex(p => p.name === c.nameOrLocation);
                if (propIdx !== -1) {
                  const newProps = [...(prev.props || [])];
                  newProps[propIdx] = {
                    ...newProps[propIdx],
                    mediaId: uploadRes.mediaId,
                    accountId: targetAccId
                  };
                  newProject.props = newProps;
                }
              }
              return newProject;
            });

            setSystemLogs(prev => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] ✅ Phân cảnh #${index + 1}: Upload ảnh [${c.source}] #${i + 1} thành công. Media ID: ${uploadRes.mediaId}`
            ]);
          } catch (e: any) {
            console.error(`Upload candidate ref failed:`, e);
            throw new Error(`Lỗi tải ảnh tham chiếu [${c.source}] #${i + 1}: ${e.message}`);
          }
        }
      }

      // Decide which model to use
      const hasReference = media_ids.length > 0;
      const chosenModel = hasReference ? videoModelR2V : videoModelT2V;

      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎬 Phân cảnh #${index + 1}: Đang khởi tạo dựng VEO Video (${hasReference ? 'I2V' : 'T2V'} Mode)...`
      ]);

      const reqBody: any = {
        prompt: cleanPromptForAiModel(promptToSend, project),
        aspect_ratio: videoAspectRatio,
        model: chosenModel
      };
      if (hasReference) {
        reqBody.media_ids = media_ids;
      }
      if (account_id) {
        reqBody.account_id = account_id;
      }

      let videoUrl = "";
      let lastVideoErrorMsg = "";

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt > 1) {
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ⏳ Thử lại dựng video lần ${attempt}/${maxAttempts} cho Phân cảnh #${index + 1} sau ${retryDelay} giây...`
          ]);
          setGenerationStatuses(prev => ({
            ...prev,
            [statusKey]: `Thử lại ${attempt}/${maxAttempts} (chờ ${retryDelay}s)...`
          }));
          await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        }

        setGenerationStatuses(prev => ({
          ...prev,
          [statusKey]: `Đang gọi API video (lần ${attempt}/${maxAttempts})...`
        }));

        try {
          const response = await fetch(`${cleanApiUrl}/api/generate_video`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(reqBody)
          });

          if (!response.ok) {
            let errorMsg = `Mã lỗi HTTP video: ${response.status}`;
            try {
              const errData = await response.json();
              if (errData && errData.error) errorMsg = errData.error;
            } catch (e) {}
            throw new Error(errorMsg);
          }

          const data = await response.json();
          if (!data.success || !data.videos || data.videos.length === 0) {
            throw new Error(data.message || "Không thể tạo video từ VEO API");
          }

          videoUrl = sanitizeUrl(data.videos[0].url);
          break; // Success!
        } catch (err: any) {
          lastVideoErrorMsg = err.message;
        }
      }

      if (!videoUrl) {
        throw new Error(lastVideoErrorMsg || "Không thể tạo video từ VEO API sau mọi lượt thử.");
      }

      setProject(prev => {
        if (!prev) return null;
        const newShots = [...prev.shots];
        newShots[index] = { ...newShots[index], videoUrl, videoError: undefined };
        return { ...prev, shots: newShots };
      });

      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎥 Phân cảnh #${index + 1}: Dựng video VEO thành công! URL: ${videoUrl}`
      ]);

      // Automatically save successfully generated video directly to local linked directory if auto-download is enabled
      if (autoDownloadVideos || (window as any).electronAPI) {
        downloadSingleVideo(index, false, videoUrl);
      }

      // Clear generation error on success
      setGenerationErrors(prev => {
        const next = { ...prev };
        delete next[statusKey];
        return next;
      });

    } catch (err: any) {
      console.error(`Error generating video for shot #${index + 1}:`, err);
      updateShotError(err.message);
      setGenerationErrors(prev => ({
        ...prev,
        [statusKey]: err.message
      }));
      setSystemLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Dựng video phân cảnh #${index + 1} thất bại: ${err.message}`
      ]);
    } finally {
      setGeneratingVideos(prev => ({ ...prev, [key]: false }));
      setGenerationStatuses(prev => {
        const next = { ...prev };
        delete next[statusKey];
        return next;
      });
    }
  };

  const generateVideoBatch = async (indices: number[]) => {
    if (!project || indices.length === 0) return;
    
    // Ensure directory handle and write permissions are fully set up before starting batch rendering (user gesture active)
    await ensureDirectoryPermission();

    setIsBatchRendering(true);
    abortBatchRef.current = false;

    const queue = [...indices];
    const runWorker = async () => {
      while (queue.length > 0) {
        if (abortBatchRef.current) {
          break;
        }
        const index = queue.shift();
        if (index === undefined) break;

        await generateVideo(index);
        await new Promise(r => setTimeout(r, videoBatchDelay));
      }
    };

    const workersCount = Math.min(videoConcurrencyLimit, queue.length);
    const workers = Array.from({ length: workersCount }, () => runWorker());

    await Promise.all(workers);
    setIsBatchRendering(false);
  };

  const handleSelectAllShots = (checked: boolean) => {
    if (!project) return;
    const newSelected = { ...selectedShots };
    if (checked) {
      // Select only the currently filtered/visible shots
      filteredShots.forEach(({ shot, index }) => {
        if (getShotHasRef(shot, project.characters, project.backgrounds, project.props)) {
          newSelected[index] = true;
        }
      });
    } else {
      // Deselect only the currently filtered/visible shots
      filteredShots.forEach(({ index }) => {
        delete newSelected[index];
      });
    }
    setSelectedShots(newSelected);
  };

  const handleRenderAllSelectedShots = () => {
    if (!project) return;
    const selectedIndices = Object.keys(selectedShots)
      .map(Number)
      .filter(i => {
        if (!selectedShots[i]) return false;
        const shot = project.shots[i];
        if (!shot) return false;
        return getShotHasRef(shot, project.characters, project.backgrounds, project.props);
      });
    generateVideoBatch(selectedIndices);
  };

  const handleRetryFailedShots = () => {
    if (!project) return;
    const selectedIndices = Object.keys(selectedShots)
      .map(Number)
      .filter(i => {
        if (!selectedShots[i]) return false;
        const shot = project.shots[i];
        if (!shot) return false;
        return getShotHasRef(shot, project.characters, project.backgrounds, project.props);
      });
    
    const targets = selectedIndices.length > 0 
      ? selectedIndices.filter(i => !project.shots[i].videoUrl)
      : project.shots.map((_, i) => i).filter(i => {
          const shot = project.shots[i];
          return !shot.videoUrl && getShotHasRef(shot, project.characters, project.backgrounds, project.props);
        });
    
    generateVideoBatch(targets);
  };

  const handleStopBatchRendering = () => {
    abortBatchRef.current = true;
  };

  const downloadAllSuccessVideos = async () => {
    if (!project) return;
    const successShots = project.shots
      .map((shot, index) => ({ shot, index }))
      .filter(({ shot }) => !!shot.videoUrl);

    if (successShots.length === 0) {
      alert("Không có video nào thành công để tải về.");
      return;
    }

    // Ensure directory permission first under active user gesture
    await ensureDirectoryPermission();

    setSystemLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] 📥 Bắt đầu tải hàng loạt ${successShots.length} video thành công về thư mục đã chọn...`
    ]);

    setDownloadProgress({ current: 0, total: successShots.length, step: "Khởi tạo thư mục..." });

    try {
      let current = 0;
      for (const { shot, index } of successShots) {
        current++;
        setDownloadProgress({ 
          current, 
          total: successShots.length, 
          step: `Đang tải video ${current}/${successShots.length}: ${index + 1}.mp4...` 
        });
        await downloadSingleVideo(index, false, shot.videoUrl);
      }
      alert(`Đã hoàn thành tải ${successShots.length} video về thư mục PC của bạn!`);
    } catch (err: any) {
      console.error("Lỗi khi tải hàng loạt video:", err);
      alert(`Có lỗi xảy ra khi tải video: ${err.message || err}`);
    } finally {
      setDownloadProgress(null);
    }
  };

  const downloadSingleImage = async (url: string, defaultFilename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, defaultFilename);
    } catch (err) {
      console.error("Direct download failed, opening URL instead:", err);
      window.open(url, "_blank");
    }
  };

  const downloadSingleVideo = async (index: number, showSuccessAlert = true, overrideUrl?: string) => {
    if (!project) return;
    const shot = project.shots[index];
    const url = overrideUrl || (shot ? shot.videoUrl : undefined);
    if (!url) return;
    const filename = `${index + 1}.mp4`;

    if ((window as any).electronAPI) {
      try {
        setProgress({ step: `Đang tải ${filename}...`, percent: 30 });
        const response = await fetch(url);
        const blob = await response.blob();
        const ok = await saveFileToProject("videos", filename, blob);
        if (ok) {
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công video ${filename} vào thư mục videos.`
          ]);
          if (showSuccessAlert) {
            alert(`Đã lưu thành công video trực tiếp vào thư mục videos/${filename}`);
          }
        } else {
          throw new Error("Lỗi lưu file qua IPC.");
        }
      } catch (err: any) {
        console.error("Electron video save failed, using fallback:", err);
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          saveAs(blob, filename);
        } catch (fallbackErr) {
          window.open(url, "_blank");
        }
      } finally {
        setProgress({ step: "", percent: 0 });
      }
      return;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if ('showDirectoryPicker' in window) {
          setProgress({ step: "Đang yêu cầu chọn thư mục lưu...", percent: 10 });
          dirHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite"
          });
          setSelectedDirectoryHandle(dirHandle);
          setDirPermissionGranted(true);
        }
      }

      if (dirHandle) {
        // Query/request permission
        const permission = await dirHandle.queryPermission({ mode: "readwrite" });
        if (permission !== 'granted') {
          setProgress({ step: "Đang yêu cầu cấp quyền ghi thư mục...", percent: 10 });
          const request = await dirHandle.requestPermission({ mode: "readwrite" });
          if (request !== 'granted') {
            setDirPermissionGranted(false);
            throw new Error("Chưa cấp quyền ghi vào thư mục.");
          }
        }
        setDirPermissionGranted(true);

        setProgress({ step: `Đang tạo thư mục videos và tải ${filename}...`, percent: 30 });
        
        // 1. Get or create a subdirectory named "videos" inside the saved directory
        const videosDirHandle = await dirHandle.getDirectoryHandle("videos", { create: true });
        
        // 2. Fetch the video blob
        const response = await fetch(url);
        const blob = await response.blob();

        // 3. Write video blob to videos/[index].mp4
        const fileHandle = await videosDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công video ${filename} vào thư mục videos.`
        ]);
        if (showSuccessAlert) {
          alert(`Đã lưu thành công video trực tiếp vào thư mục videos/${filename}`);
        }
        return;
      }
    } catch (err: any) {
      console.error("Direct video save failed, using fallback:", err);
      if (err.name === 'SecurityError') {
        setDirPermissionGranted(false);
      }
    }

    // Fallback to standard saveAs download
    setProgress({ step: `Đang tải video ${filename}...`, percent: 50 });
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      saveAs(blob, filename);
    } catch (err) {
      console.error("Direct download failed, opening URL instead:", err);
      window.open(url, "_blank");
    } finally {
      setProgress({ step: "", percent: 0 });
    }
  };

  const downloadThumbnail = async () => {
    if (!thumbImageUrl) {
      alert("Chưa có ảnh thumbnail nào được vẽ.");
      return;
    }

    const activeVersion = thumbData?.versions?.[selectedVersionIndex] || thumbData;
    let title = activeVersion?.title || `sukatto_thumbnail_v${selectedVersionIndex + 1}`;
    let cleanedTitle = title
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u00C0-\u1EF9đĐ]/gi, "_")
      .replace(/__+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!cleanedTitle) {
      cleanedTitle = `sukatto_thumbnail_v${selectedVersionIndex + 1}`;
    }
    const filename = `${cleanedTitle}.jpg`;

    if ((window as any).electronAPI) {
      try {
        setProgress({ step: `Đang tải thumbnail ${filename}...`, percent: 30 });
        const response = await fetch(thumbImageUrl);
        const blob = await response.blob();
        
        // Write to root
        await saveFileToProject(null, filename, blob);
        // Write to Thumb/
        await saveFileToProject("Thumb", filename, blob);

        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công thumbnail ${filename} vào thư mục đã lưu.`
        ]);
        alert(`Đã lưu thành công thumbnail trực tiếp vào thư mục đã lưu:\n${folderPathInput}/${filename}`);
      } catch (err: any) {
        console.error("Electron thumbnail save failed:", err);
      } finally {
        setProgress({ step: "", percent: 0 });
      }
      return;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if ('showDirectoryPicker' in window) {
          setProgress({ step: "Đang yêu cầu chọn thư mục lưu...", percent: 10 });
          dirHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite"
          });
          setSelectedDirectoryHandle(dirHandle);
        }
      }

      if (dirHandle) {
        // Query/request permission
        const permission = await dirHandle.queryPermission({ mode: "readwrite" });
        if (permission !== 'granted') {
          setProgress({ step: "Đang yêu cầu cấp quyền ghi thư mục...", percent: 10 });
          const request = await dirHandle.requestPermission({ mode: "readwrite" });
          if (request !== 'granted') {
            throw new Error("Chưa cấp quyền ghi vào thư mục.");
          }
        }

        setProgress({ step: `Đang tải thumbnail ${filename} vào thư mục...`, percent: 30 });
        
        // 1. Fetch the image blob
        const response = await fetch(thumbImageUrl);
        const blob = await response.blob();

        // 2. Write image blob directly to the root of the saved directory
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        // 3. Also write to a subdirectory named "Thumb" for backward compatibility
        try {
          const thumbDirHandle = await dirHandle.getDirectoryHandle("Thumb", { create: true });
          const thumbFileHandle = await thumbDirHandle.getFileHandle(filename, { create: true });
          const thumbWritable = await thumbFileHandle.createWritable();
          await thumbWritable.write(blob);
          await thumbWritable.close();
        } catch (subErr) {
          console.warn("Could not write to Thumb/ subdirectory:", subErr);
        }

        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công thumbnail ${filename} vào thư mục đã lưu.`
        ]);
        alert(`Đã lưu thành công thumbnail trực tiếp vào thư mục đã lưu:\n${folderPathInput || dirHandle.name}/${filename}`);
        return;
      }
    } catch (err: any) {
      console.error("Direct thumbnail save failed, using fallback:", err);
    }

    // Fallback to standard saveAs download
    setProgress({ step: `Đang tải thumbnail ${filename}...`, percent: 50 });
    try {
      const response = await fetch(thumbImageUrl);
      const blob = await response.blob();
      saveAs(blob, filename);
    } catch (err) {
      console.error("Direct download failed, opening URL instead:", err);
      window.open(thumbImageUrl, "_blank");
    } finally {
      setProgress({ step: "", percent: 0 });
    }
  };

  const downloadSEOFile = async () => {
    if (!seoSection1 && !seoSection2) {
      alert("Chưa có nội dung SEO nào được tạo.");
      return;
    }

    let fileContent = "";
    if (seoSection1) {
      fileContent += "=== MÔ TẢ VIDEO YOUTUBE ===\n\n" + seoSection1 + "\n\n";
    }
    if (seoSection2) {
      fileContent += "==================================================\n\n=== 10 HASHTAGS SEO ===\n\n" + seoSection2 + "\n";
    }

    const filename = "SEO.txt";
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });

    if ((window as any).electronAPI) {
      try {
        setProgress({ step: `Đang tải ${filename} vào thư mục gốc...`, percent: 30 });
        await saveFileToProject(null, filename, null, fileContent);
        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công ${filename} vào thư mục gốc.`
        ]);
        alert(`Đã lưu thành công ${filename} trực tiếp vào thư mục gốc.`);
      } catch (err: any) {
        console.error("Electron SEO save failed:", err);
      } finally {
        setProgress({ step: "", percent: 0 });
      }
      return;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if ('showDirectoryPicker' in window) {
          setProgress({ step: "Đang yêu cầu chọn thư mục lưu...", percent: 10 });
          dirHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite"
          });
          setSelectedDirectoryHandle(dirHandle);
        }
      }

      if (dirHandle) {
        // Query/request permission
        const permission = await dirHandle.queryPermission({ mode: "readwrite" });
        if (permission !== 'granted') {
          setProgress({ step: "Đang yêu cầu cấp quyền ghi thư mục...", percent: 10 });
          const request = await dirHandle.requestPermission({ mode: "readwrite" });
          if (request !== 'granted') {
            throw new Error("Chưa cấp quyền ghi vào thư mục.");
          }
        }

        setProgress({ step: `Đang tải ${filename} vào thư mục gốc...`, percent: 30 });
        
        // Write SEO.txt directly to root folder
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công ${filename} vào thư mục gốc.`
        ]);
        alert(`Đã lưu thành công ${filename} trực tiếp vào thư mục gốc.`);
        return;
      }
    } catch (err: any) {
      console.error("Direct SEO save failed, using fallback:", err);
    }

    // Fallback to standard saveAs download
    setProgress({ step: `Đang tải ${filename}...`, percent: 50 });
    try {
      saveAs(blob, filename);
    } catch (err) {
      console.error("Direct download failed:", err);
    } finally {
      setProgress({ step: "", percent: 0 });
    }
  };

  const downloadBgmFile = async () => {
    if (!seoBgmPrompts || seoBgmPrompts.length === 0) {
      alert("Chưa có gợi ý nhạc BGM nào được tạo.");
      return;
    }

    let fileContent = "=== GỢI Ý NHẠC NỀN BGM CHO TỪNG PHÂN CẢNH (SUNO/AI MUSIC) ===\n\n";
    seoBgmPrompts.forEach((item, idx) => {
      fileContent += `Phân đoạn #${idx + 1} [${item.time}] (${formatBgmTimeRange(item.time)})\n`;
      fileContent += `- Diễn biến: ${item.scene}\n`;
      fileContent += `- Cảm xúc: ${item.mood}\n`;
      fileContent += `- Suno Style Tags: ${item.suno_style}\n`;
      fileContent += `- Suno Music Prompt: ${item.suno_prompt}\n\n`;
    });

    const filename = "BGM_Prompts.txt";
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });

    if ((window as any).electronAPI) {
      try {
        setProgress({ step: `Đang tải ${filename} vào thư mục gốc...`, percent: 30 });
        await saveFileToProject(null, filename, null, fileContent);
        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công ${filename} vào thư mục gốc.`
        ]);
        alert(`Đã lưu thành công ${filename} trực tiếp vào thư mục gốc.`);
      } catch (err: any) {
        console.error("Electron BGM save failed:", err);
      } finally {
        setProgress({ step: "", percent: 0 });
      }
      return;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if ('showDirectoryPicker' in window) {
          setProgress({ step: "Đang yêu cầu chọn thư mục lưu...", percent: 10 });
          dirHandle = await (window as any).showDirectoryPicker({
            mode: "readwrite"
          });
          setSelectedDirectoryHandle(dirHandle);
        }
      }

      if (dirHandle) {
        // Query/request permission
        const permission = await dirHandle.queryPermission({ mode: "readwrite" });
        if (permission !== 'granted') {
          setProgress({ step: "Đang yêu cầu cấp quyền ghi thư mục...", percent: 10 });
          const request = await dirHandle.requestPermission({ mode: "readwrite" });
          if (request !== 'granted') {
            throw new Error("Chưa cấp quyền ghi vào thư mục.");
          }
        }

        setProgress({ step: `Đang tải ${filename} vào thư mục gốc...`, percent: 30 });
        
        // Write BGM_Prompts.txt directly to root folder
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setProgress({ step: "", percent: 0 });
        setSystemLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Đã lưu thành công ${filename} vào thư mục gốc.`
        ]);
        alert(`Đã lưu thành công ${filename} trực tiếp vào thư mục gốc.`);
        return;
      }
    } catch (err: any) {
      console.error("Direct BGM save failed, using fallback:", err);
    }

    // Fallback to standard saveAs download
    setProgress({ step: `Đang tải ${filename}...`, percent: 50 });
    try {
      saveAs(blob, filename);
    } catch (err) {
      console.error("Direct download failed:", err);
    } finally {
      setProgress({ step: "", percent: 0 });
    }
  };

  const generateBatch = async (type: 'character' | 'background' | 'prop', indices: number[]) => {
    if (!project || indices.length === 0) return;
    setIsBatchGenerating(true);
    abortBatchRef.current = false;

    const queue = [...indices];
    const runWorker = async () => {
      while (queue.length > 0) {
        if (abortBatchRef.current) {
          break;
        }
        const index = queue.shift();
        if (index === undefined) break;

        const asset = type === 'character' 
          ? project.characters[index] 
          : type === 'background' 
          ? project.backgrounds[index]
          : project.props?.[index];
        if (skipExistingInBatch && asset && asset.imageUrl) {
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 💾 Bỏ qua ${type === 'character' ? 'Nhân vật' : type === 'background' ? 'Bối cảnh' : 'Đạo cụ'} #${index + 1} vì đã vẽ ảnh thành công (Cost Saving).`
          ]);
          continue;
        }

        await generateImage(type, index);
        await new Promise(r => setTimeout(r, imageBatchDelay));
      }
    };

    const workersCount = Math.min(concurrencyLimit, queue.length);
    const workers = Array.from({ length: workersCount }, () => runWorker());

    await Promise.all(workers);
    setIsBatchGenerating(false);
  };

  const generateBatchAll = async (items: { type: 'character' | 'background' | 'prop', index: number }[]) => {
    if (!project || items.length === 0) return;
    setIsBatchGenerating(true);
    abortBatchRef.current = false;

    const queue = [...items];
    const runWorker = async () => {
      while (queue.length > 0) {
        if (abortBatchRef.current) {
          break;
        }
        const item = queue.shift();
        if (item === undefined) break;

        const asset = item.type === 'character' 
          ? project.characters[item.index] 
          : item.type === 'background' 
          ? project.backgrounds[item.index]
          : project.props?.[item.index];
        if (skipExistingInBatch && asset && asset.imageUrl) {
          setSystemLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] 💾 Bỏ qua ${item.type === 'character' ? 'Nhân vật' : item.type === 'background' ? 'Bối cảnh' : 'Đạo cụ'} #${item.index + 1} vì đã vẽ ảnh thành công (Cost Saving).`
          ]);
          continue;
        }

        await generateImage(item.type, item.index);
        await new Promise(r => setTimeout(r, imageBatchDelay));
      }
    };

    const workersCount = Math.min(concurrencyLimit, queue.length);
    const workers = Array.from({ length: workersCount }, () => runWorker());

    await Promise.all(workers);
    setIsBatchGenerating(false);
  };

  const handleGenerateAllSelectedAssets = () => {
    if (!project) return;
    const selectedCharIndices = Object.keys(selectedCharacters)
      .map(Number)
      .filter(i => selectedCharacters[i]);

    const selectedBgIndices = Object.keys(selectedBackgrounds)
      .map(Number)
      .filter(i => selectedBackgrounds[i]);

    const selectedPropIndices = Object.keys(selectedProps)
      .map(Number)
      .filter(i => selectedProps[i]);

    const items: { type: 'character' | 'background' | 'prop', index: number }[] = [];
    selectedCharIndices.forEach(i => items.push({ type: 'character', index: i }));
    selectedBgIndices.forEach(i => items.push({ type: 'background', index: i }));
    selectedPropIndices.forEach(i => items.push({ type: 'prop', index: i }));

    generateBatchAll(items);
  };

  const handleSelectAllAssets = (checked: boolean) => {
    if (!project) return;
    const newSelectedChars: Record<number, boolean> = {};
    const newSelectedBgs: Record<number, boolean> = {};
    const newSelectedProps: Record<number, boolean> = {};
    if (checked) {
      project.characters.forEach((_, i) => {
        newSelectedChars[i] = true;
      });
      project.backgrounds.forEach((_, i) => {
        newSelectedBgs[i] = true;
      });
      if (project.props) {
        project.props.forEach((_, i) => {
          newSelectedProps[i] = true;
        });
      }
    }
    setSelectedCharacters(newSelectedChars);
    setSelectedBackgrounds(newSelectedBgs);
    setSelectedProps(newSelectedProps);
  };

  const handleSelectAllCharacters = (checked: boolean) => {
    if (!project) return;
    const newSelected: Record<number, boolean> = {};
    if (checked) {
      project.characters.forEach((_, i) => {
        newSelected[i] = true;
      });
    }
    setSelectedCharacters(newSelected);
  };

  const handleGenerateSelectedCharacters = () => {
    const selectedIndices = Object.keys(selectedCharacters)
      .map(Number)
      .filter(i => selectedCharacters[i]);
    generateBatch('character', selectedIndices);
  };

  const handleStopBatch = () => {
    abortBatchRef.current = true;
  };

  const handleRegenerateFailedCharacters = () => {
    if (!project) return;
    const selectedIndices = Object.keys(selectedCharacters)
      .map(Number)
      .filter(i => selectedCharacters[i]);
    
    const targets = selectedIndices.length > 0 
      ? selectedIndices.filter(i => !project.characters[i].imageUrl)
      : project.characters.map((_, i) => i).filter(i => !project.characters[i].imageUrl);
    
    generateBatch('character', targets);
  };

  const handleSelectAllBackgrounds = (checked: boolean) => {
    if (!project) return;
    const newSelected: Record<number, boolean> = {};
    if (checked) {
      project.backgrounds.forEach((_, i) => {
        newSelected[i] = true;
      });
    }
    setSelectedBackgrounds(newSelected);
  };

  const handleGenerateSelectedBackgrounds = () => {
    const selectedIndices = Object.keys(selectedBackgrounds)
      .map(Number)
      .filter(i => selectedBackgrounds[i]);
    generateBatch('background', selectedIndices);
  };

  const handleRegenerateFailedBackgrounds = () => {
    if (!project) return;
    const selectedIndices = Object.keys(selectedBackgrounds)
      .map(Number)
      .filter(i => selectedBackgrounds[i]);
    
    const targets = selectedIndices.length > 0 
      ? selectedIndices.filter(i => !project.backgrounds[i].imageUrl)
      : project.backgrounds.map((_, i) => i).filter(i => !project.backgrounds[i].imageUrl);
    
    generateBatch('background', targets);
  };

  const handleSelectAllProps = (checked: boolean) => {
    if (!project) return;
    const newSelected: Record<number, boolean> = {};
    if (checked && project.props) {
      project.props.forEach((_, i) => {
        newSelected[i] = true;
      });
    }
    setSelectedProps(newSelected);
  };

  const handleGenerateSelectedProps = () => {
    const selectedIndices = Object.keys(selectedProps)
      .map(Number)
      .filter(i => selectedProps[i]);
    generateBatch('prop', selectedIndices);
  };

  const handleRegenerateFailedProps = () => {
    if (!project || !project.props) return;
    const selectedIndices = Object.keys(selectedProps)
      .map(Number)
      .filter(i => selectedProps[i]);
    
    const targets = selectedIndices.length > 0 
      ? selectedIndices.filter(i => !project.props![i].imageUrl)
      : project.props.map((_, i) => i).filter(i => !project.props![i].imageUrl);
    
    generateBatch('prop', targets);
  };

  // Poll system logs every 3 seconds when logs tab is active
  React.useEffect(() => {
    if (activeTab !== 'logs' || !isPollingLogs) return;

    let isMounted = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${cleanApiUrl}/api/logs`);
        if (!res.ok) throw new Error("Could not fetch logs");
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.logs) {
            setSystemLogs(prev => {
              const combined = [...prev];
              data.logs.forEach((log: string) => {
                if (!combined.includes(log)) {
                  combined.push(log);
                }
              });
              return combined.sort((a, b) => getLogTime(a) - getLogTime(b));
            });
          }
          setLogsError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setLogsError(`Không thể kết nối đến máy chủ logs (${cleanApiUrl}). Đang thử lại...`);
        }
      }
    };

    fetchLogs(); // initial fetch
    const interval = setInterval(fetchLogs, 3000);

  }, [activeTab, isPollingLogs]);


  const updateCharacter = (index: number, field: keyof Character, value: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const newChars = [...prev.characters];
      newChars[index] = { ...newChars[index], [field]: value };
      return { ...prev, characters: newChars };
    });
  };

  const updateBackground = (index: number, field: keyof Background, value: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const newBgs = [...prev.backgrounds];
      newBgs[index] = { ...newBgs[index], [field]: value };
      return { ...prev, backgrounds: newBgs };
    });
  };

  const toggleCharacterInstruction = (index: number, tagText: string) => {
    if (!project) return;
    const char = project.characters[index];
    const current = char.appearanceInstruction !== undefined 
      ? char.appearanceInstruction 
      : "Vẽ lại khuôn mặt, kiểu tóc, dáng người trông giống ảnh tham chiếu";
    let items = current.split(",").map(s => s.trim()).filter(Boolean);
    if (items.includes(tagText)) {
      items = items.filter(s => s !== tagText);
    } else {
      items.push(tagText);
    }
    updateCharacter(index, 'appearanceInstruction', items.join(", "));
  };

  const toggleBackgroundInstruction = (index: number, tagText: string) => {
    if (!project) return;
    const bg = project.backgrounds[index];
    const current = bg.appearanceInstruction || "";
    let items = current.split(",").map(s => s.trim()).filter(Boolean);
    if (items.includes(tagText)) {
      items = items.filter(s => s !== tagText);
    } else {
      items.push(tagText);
    }
    updateBackground(index, 'appearanceInstruction', items.join(", "));
  };

  const handleAddBackgroundManual = () => {
    setProject(prev => {
      if (!prev) return prev;
      const newBgs = [...prev.backgrounds, {
        location: "NewBackground_" + (prev.backgrounds.length + 1),
        angle: "4-camera-angle sheet (front, reverse, left, right) in a 2x2 grid",
        prompt: "Background layout sheet of NewBackground, 4-camera-angle sheet showing 4 different viewpoints/angles in a 2x2 grid layout, empty scene, no people, grounded Japanese apartment realism, production-ready environment design reference sheet.",
        imageUrl: ""
      }];
      return { ...prev, backgrounds: newBgs };
    });
  };

  const handleAddOfficialBackground = (locationName: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const trimmed = locationName.trim();
      if (!trimmed) return prev;
      if (prev.backgrounds.some(b => b.location.toLowerCase() === trimmed.toLowerCase())) return prev;
      const newBgs = [...prev.backgrounds, {
        location: trimmed,
        angle: "4-camera-angle sheet (front, reverse, left, right) in a 2x2 grid",
        prompt: `Background layout sheet of ${trimmed}, 4-camera-angle sheet showing 4 different viewpoints/angles (front angle, reverse angle, side angle, high angle) of the same scene in a 2x2 grid layout, empty scene, no people, grounded Japanese apartment realism, realistic practical lighting, subtle emotional atmosphere, believable lived-in details, cinematic depth, production-ready environment design reference sheet.`,
        imageUrl: ""
      }];
      return { ...prev, backgrounds: newBgs };
    });
  };

  const handleDeleteBackgroundManual = (index: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bối cảnh này không?")) return;
    setProject(prev => {
      if (!prev) return prev;
      const newBgs = prev.backgrounds.filter((_, i) => i !== index);
      return { ...prev, backgrounds: newBgs };
    });
  };

  const updateProp = (index: number, field: keyof Prop, value: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const newProps = [...(prev.props || [])];
      newProps[index] = { ...newProps[index], [field]: value };
      return { ...prev, props: newProps };
    });
  };

  const togglePropInstruction = (index: number, tagText: string) => {
    if (!project || !project.props) return;
    const prop = project.props[index];
    const current = prop.appearanceInstruction || "";
    let items = current.split(",").map(s => s.trim()).filter(Boolean);
    if (items.includes(tagText)) {
      items = items.filter(s => s !== tagText);
    } else {
      items.push(tagText);
    }
    updateProp(index, 'appearanceInstruction', items.join(", "));
  };

  const handleAddPropManual = () => {
    setProject(prev => {
      if (!prev) return prev;
      const currentProps = prev.props || [];
      const currentStyle = styles.find(s => s.id === selectedStyleId) || styles[0];
      const newProps = [...currentProps, {
        name: "NewProp_" + (currentProps.length + 1),
        appearance: "A description of the prop",
        prompt: `Prop Sheet of NewProp_${currentProps.length + 1}, solo item, isolated on white background, modern present-day Japan (year 2026) realism, ${currentStyle.backgroundSuffix}, an old vintage object, studio product photography, clean background`,
        imageUrl: ""
      }];
      return { ...prev, props: newProps };
    });
  };

  const handleDeletePropManual = (index: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đạo cụ này không?")) return;
    setProject(prev => {
      if (!prev) return prev;
      const newProps = (prev.props || []).filter((_, i) => i !== index);
      return { ...prev, props: newProps };
    });
  };

  const updateShot = (index: number, value: string) => {
    setProject(prev => {
      if (!prev) return prev;
      const newShots = [...prev.shots];
      newShots[index] = { ...newShots[index], prompt: value };
      return { ...prev, shots: newShots };
    });
  };

  const handleSelectReferenceUrl = (
    type: 'character' | 'background' | 'shot' | 'prop',
    targetIndex: number,
    url: string,
    refIndex?: number,
    name?: string,
    isMain?: boolean
  ) => {
    setProject(prev => {
      if (!prev) return null;

      let foundMediaId: string | undefined = undefined;
      let foundAccountId: string | undefined = undefined;

      // Exhaustive search across characters, backgrounds, props, shots, and all their nested reference images arrays!
      for (const c of prev.characters) {
        if (c.imageUrl === url) {
          foundMediaId = c.mediaId;
          foundAccountId = c.accountId;
          break;
        }
        const refMatch = c.referenceImages?.find(ref => ref.url === url);
        if (refMatch) {
          foundMediaId = refMatch.mediaId;
          foundAccountId = refMatch.accountId;
          break;
        }
      }

      if (!foundMediaId) {
        for (const b of prev.backgrounds) {
          if (b.imageUrl === url) {
            foundMediaId = b.mediaId;
            foundAccountId = b.accountId;
            break;
          }
          const refMatch = b.referenceImages?.find(ref => ref.url === url);
          if (refMatch) {
            foundMediaId = refMatch.mediaId;
            foundAccountId = refMatch.accountId;
            break;
          }
        }
      }

      if (!foundMediaId && prev.props) {
        for (const p of prev.props) {
          if (p.imageUrl === url) {
            foundMediaId = p.mediaId;
            foundAccountId = p.accountId;
            break;
          }
          const refMatch = p.referenceImages?.find(ref => ref.url === url);
          if (refMatch) {
            foundMediaId = refMatch.mediaId;
            foundAccountId = refMatch.accountId;
            break;
          }
        }
      }

      if (!foundMediaId) {
        for (const s of prev.shots) {
          if (s.imageUrl === url) {
            foundMediaId = s.mediaId;
            foundAccountId = s.accountId;
            break;
          }
          const refMatch = s.referenceImages?.find(ref => ref.url === url);
          if (refMatch) {
            foundMediaId = refMatch.mediaId;
            foundAccountId = refMatch.accountId;
            break;
          }
        }
      }

      const newProject = { ...prev };
      const newRef = {
        url,
        mediaId: foundMediaId,
        accountId: foundAccountId,
        name
      };

      if (isMain) {
        if (type === 'character') {
          const newChars = [...prev.characters];
          newChars[targetIndex] = {
            ...newChars[targetIndex],
            imageUrl: url,
            mediaId: foundMediaId,
            accountId: foundAccountId
          };
          newProject.characters = newChars;
        } else if (type === 'background') {
          const newBgs = [...prev.backgrounds];
          newBgs[targetIndex] = {
            ...newBgs[targetIndex],
            imageUrl: url,
            mediaId: foundMediaId,
            accountId: foundAccountId
          };
          newProject.backgrounds = newBgs;
        } else if (type === 'prop') {
          const newProps = [...(prev.props || [])];
          newProps[targetIndex] = {
            ...newProps[targetIndex],
            imageUrl: url,
            mediaId: foundMediaId,
            accountId: foundAccountId
          };
          newProject.props = newProps;
        } else if (type === 'shot') {
          const newShots = [...prev.shots];
          newShots[targetIndex] = {
            ...newShots[targetIndex],
            imageUrl: url,
            mediaId: foundMediaId,
            accountId: foundAccountId
          };
          newProject.shots = newShots;
        }
      } else {
        if (type === 'character') {
          const newChars = [...prev.characters];
          const char = { ...newChars[targetIndex] };
          const refs = [...(char.referenceImages || [])];
          if (refIndex !== undefined) {
            refs[refIndex] = newRef;
          } else {
            if (refs.length >= 10) return prev;
            refs.push(newRef);
          }
          char.referenceImages = refs;
          newChars[targetIndex] = char;
          newProject.characters = newChars;
        } else if (type === 'background') {
          const newBgs = [...prev.backgrounds];
          const bg = { ...newBgs[targetIndex] };
          const refs = [...(bg.referenceImages || [])];
          if (refIndex !== undefined) {
            refs[refIndex] = newRef;
          } else {
            if (refs.length >= 10) return prev;
            refs.push(newRef);
          }
          bg.referenceImages = refs;
          newBgs[targetIndex] = bg;
          newProject.backgrounds = newBgs;
        } else if (type === 'prop') {
          const newProps = [...(prev.props || [])];
          const p = { ...newProps[targetIndex] };
          const refs = [...(p.referenceImages || [])];
          if (refIndex !== undefined) {
            refs[refIndex] = newRef;
          } else {
            if (refs.length >= 10) return prev;
            refs.push(newRef);
          }
          p.referenceImages = refs;
          newProps[targetIndex] = p;
          newProject.props = newProps;
        } else {
          const newShots = [...prev.shots];
          const shot = { ...newShots[targetIndex] };
          const refs = [...(shot.referenceImages || [])];
          if (refIndex !== undefined) {
            refs[refIndex] = newRef;
          } else {
            if (refs.length >= 10) return prev;
            refs.push(newRef);
          }
          shot.referenceImages = refs;
          newShots[targetIndex] = shot;
          newProject.shots = newShots;
        }
      }

      return newProject;
    });
  };

  const handleDeleteReferenceImage = (
    type: 'character' | 'background' | 'shot' | 'prop',
    targetIndex: number,
    refIndex: number
  ) => {
    setProject(prev => {
      if (!prev) return null;
      const newProject = { ...prev };

      if (type === 'character') {
        const newChars = [...prev.characters];
        const char = { ...newChars[targetIndex] };
        const refs = [...(char.referenceImages || [])];
        refs.splice(refIndex, 1);
        char.referenceImages = refs;
        newChars[targetIndex] = char;
        newProject.characters = newChars;
      } else if (type === 'background') {
        const newBgs = [...prev.backgrounds];
        const bg = { ...newBgs[targetIndex] };
        const refs = [...(bg.referenceImages || [])];
        refs.splice(refIndex, 1);
        bg.referenceImages = refs;
        newBgs[targetIndex] = bg;
        newProject.backgrounds = newBgs;
      } else if (type === 'prop') {
        const newProps = [...(prev.props || [])];
        const p = { ...newProps[targetIndex] };
        const refs = [...(p.referenceImages || [])];
        refs.splice(refIndex, 1);
        p.referenceImages = refs;
        newProps[targetIndex] = p;
        newProject.props = newProps;
      } else {
        const newShots = [...prev.shots];
        const shot = { ...newShots[targetIndex] };
        const refs = [...(shot.referenceImages || [])];
        refs.splice(refIndex, 1);
        shot.referenceImages = refs;
        newShots[targetIndex] = shot;
        newProject.shots = newShots;
      }
      return newProject;
    });
  };

  const handleRefFileUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !fileUploadTarget) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        handleSelectReferenceUrl(
          fileUploadTarget.type,
          fileUploadTarget.index,
          event.target.result,
          fileUploadTarget.refIndex,
          file.name
        );
      }
      // Reset target and input
      setFileUploadTarget(null);
      if (refFileInputRef.current) refFileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };


  const generateAllCharacters = async () => {
    if (!project) return;
    for (let i = 0; i < project.characters.length; i++) {
      if (!project.characters[i].imageUrl) {
        await generateImage('character', i);
        await new Promise(r => setTimeout(r, imageBatchDelay));
      }
    }
  };

  const generateAllBackgrounds = async () => {
    if (!project) return;
    for (let i = 0; i < project.backgrounds.length; i++) {
      if (!project.backgrounds[i].imageUrl) {
        await generateImage('background', i);
        await new Promise(r => setTimeout(r, imageBatchDelay));
      }
    }
  };

  const generateAllProps = async () => {
    if (!project || !project.props) return;
    for (let i = 0; i < project.props.length; i++) {
      if (!project.props[i].imageUrl) {
        await generateImage('prop', i);
        await new Promise(r => setTimeout(r, imageBatchDelay));
      }
    }
  };

  const saveFileWithDialog = async (blob: Blob, defaultFilename: string) => {
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFilename,
          types: [{
            description: 'ZIP Archive',
            accept: { 'application/zip': ['.zip'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        saveAs(blob, defaultFilename);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Save failed:', err);
        saveAs(blob, defaultFilename);
      }
    }
  };

  const handleExportProjectState = () => {
    if (!project) {
      alert("Không có dữ liệu dự án hiện tại để xuất.");
      return;
    }
    const projectState = {
      version: "VEO3-SUKATTO-PRO-v1",
      scriptName,
      folderPathInput,
      apiBaseUrl,
      selectedModel,
      apiKey,
      concurrencyLimit,
      videoConcurrencyLimit,
      maxAttempts,
      retryDelay,
      imageBatchDelay,
      videoBatchDelay,
      promptRules,
      selectedStyleId,
      videoModelR2V,
      videoModelT2V,
      videoCountPerPrompt,
      videoAspectRatio,
      srtText,
      scriptText,
      project
    };
    const blob = new Blob([JSON.stringify(projectState, null, 2)], { type: "application/json" });
    const prefix = scriptName.trim() ? `${scriptName.trim()}_` : "";
    saveAs(blob, `${prefix}project_state.json`);
  };

  const handleImportProjectState = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const state = JSON.parse(text);
        if (state.version !== "VEO3-SUKATTO-PRO-v1" || !state.project) {
          throw new Error("Tệp JSON không đúng định dạng khôi phục dự án VEO.");
        }

        // Restore all states!
        if (state.scriptName !== undefined) setScriptName(state.scriptName);
        if (state.folderPathInput !== undefined) {
          setFolderPathInput(state.folderPathInput);
          localStorage.setItem("ai_image_folder_path", state.folderPathInput);
        }
        if (state.apiBaseUrl !== undefined) setApiBaseUrl(state.apiBaseUrl);
        if (state.selectedModel !== undefined) setSelectedModel(state.selectedModel);
        if (state.apiKey !== undefined) {
          setApiKey(state.apiKey);
          localStorage.setItem("ai_api_key", state.apiKey);
        }
        if (state.concurrencyLimit !== undefined) {
          setConcurrencyLimit(state.concurrencyLimit);
          localStorage.setItem("ai_concurrency_limit", String(state.concurrencyLimit));
        }
        if (state.videoConcurrencyLimit !== undefined) {
          setVideoConcurrencyLimit(state.videoConcurrencyLimit);
          localStorage.setItem("ai_video_concurrency_limit", String(state.videoConcurrencyLimit));
        }
        if (state.maxAttempts !== undefined) {
          setMaxAttempts(state.maxAttempts);
          localStorage.setItem("ai_max_attempts", String(state.maxAttempts));
        }
        if (state.retryDelay !== undefined) {
          setRetryDelay(state.retryDelay);
          localStorage.setItem("ai_retry_delay", String(state.retryDelay));
        }
        if (state.imageBatchDelay !== undefined) {
          setImageBatchDelay(state.imageBatchDelay);
          localStorage.setItem("ai_image_batch_delay", String(state.imageBatchDelay));
        }
        if (state.videoBatchDelay !== undefined) {
          setVideoBatchDelay(state.videoBatchDelay);
          localStorage.setItem("ai_video_batch_delay", String(state.videoBatchDelay));
        }
        if (state.promptRules !== undefined) {
          setPromptRules(state.promptRules);
          localStorage.setItem("ai_prompt_rules", JSON.stringify(state.promptRules));
        }
        if (state.selectedStyleId !== undefined) setSelectedStyleId(state.selectedStyleId);
        if (state.videoModelR2V !== undefined) setVideoModelR2V(state.videoModelR2V);
        if (state.videoModelT2V !== undefined) setVideoModelT2V(state.videoModelT2V);
        if (state.videoCountPerPrompt !== undefined) {
          setVideoCountPerPrompt(state.videoCountPerPrompt);
          localStorage.setItem("ai_video_count_per_prompt", String(state.videoCountPerPrompt));
        }
        if (state.videoAspectRatio !== undefined) setVideoAspectRatio(state.videoAspectRatio);
        
        if (state.srtText !== undefined) {
          setSrtText(state.srtText);
          localStorage.setItem("ai_srt_text", state.srtText);
          setSrtData(parseSRT(state.srtText));
        }
        if (state.scriptText !== undefined) {
          setScriptText(state.scriptText);
          localStorage.setItem("ai_script_text", state.scriptText);
          setScriptData(parseScript(state.scriptText));
        }

        if (state.project) {
          setProject(state.project);
          await saveProjectCacheToDB(state.project);
        }

        alert("Khôi phục dự án thành công! Toàn bộ kịch bản, ảnh tham chiếu, mediaID và liên kết đã được khôi phục nguyên vẹn.");
      } catch (err: any) {
        alert(`Lỗi phục hồi dự án: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const exportProjectPackage = async () => {
    if (!project) return;
    const zip = new JSZip();
    const prefix = scriptName.trim() ? `${scriptName.trim()}_` : "";

    // 1. Excel
    const cleanBg = (text: string) => {
      const bgMatch = text.match(/^\[(.*?)\]/);
      let name = bgMatch ? bgMatch[1] : text.split(" + ")[0].split(",")[0];
      return name.split(/\s+(?:Medium|Close|Wide|Shot|Profile|OTS|Two-shot)/i)[0].trim();
    };

    const excelData = project.shots.map((s, idx) => {
      // Respect the user's manual edits in s.character if it's already set.
      // Otherwise, use the robust detectCharacters helper as a fallback.
      let shotChars = s.character?.trim();
      if (!shotChars) {
        const detected = detectCharacters(s.prompt, project.characters);
        shotChars = detected.join(", ");
      }

      const backgroundName = s.scene?.trim() || cleanBg(s.prompt);

      return {
        "STT": idx + 1,
        "CHARACTERS": shotChars,
        "DESCRIPTION": s.prompt,
        "exterior": backgroundName
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Shots");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    zip.file(`${prefix}MANGA3_EXCEL.xlsx`, excelBuffer);

    // 2. Mapping
    let mappingContent = "";
    let simpleMappingContent = "";

    project.shots.forEach((shot, idx) => {
      const videoIndex = idx + 1;
      const range = shot.range || `${videoIndex}-${videoIndex}`;
      mappingContent += `video${videoIndex}: ${range}\n`;
      simpleMappingContent += `${range}\n`;
    });

    zip.file(`${prefix}MANGA3_MAPPING.txt`, mappingContent);
    zip.file(`${prefix}mapping_manga_sub.txt`, simpleMappingContent);

    // 3. Text Summary
    let legacyContent = "=== PRODUCTION PROMPTS PACKAGE ===\n\n🎬 SHOT LIST\n-----------------------------------\n";
    project.shots.forEach((s) => {
      legacyContent += `[${s.time}] ${s.character} @ ${s.scene}\n   VEO Prompt: ${s.prompt}\n\n`;
    });
    zip.file(`${prefix}production_prompts_summary.txt`, legacyContent);

    // 4. Assets Prompts Excel
    const assetsData = [
      ...project.characters.map(c => ({ Name: c.name, Description: c.prompt })),
      ...project.backgrounds.map(b => ({ Name: b.location, Description: b.prompt }))
    ].map((item, index) => ({
      STT: index + 1,
      Name: item.Name,
      Description: item.Description
    }));

    const assetsWorksheet = XLSX.utils.json_to_sheet(assetsData);
    const assetsWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(assetsWorkbook, assetsWorksheet, "Assets");
    const assetsBuffer = XLSX.write(assetsWorkbook, { bookType: 'xlsx', type: 'array' });
    zip.file(`${prefix}ASSETS_PROMPTS.xlsx`, assetsBuffer);

    // 5. Full Project JSON State for restoration
    const projectState = {
      version: "VEO3-SUKATTO-PRO-v1",
      scriptName,
      folderPathInput,
      apiBaseUrl,
      selectedModel,
      apiKey,
      concurrencyLimit,
      videoConcurrencyLimit,
      maxAttempts,
      retryDelay,
      imageBatchDelay,
      videoBatchDelay,
      promptRules,
      selectedStyleId,
      videoModelR2V,
      videoModelT2V,
      videoCountPerPrompt,
      videoAspectRatio,
      srtText,
      scriptText,
      project
    };
    zip.file(`${prefix}project_state.json`, JSON.stringify(projectState, null, 2));

    // Generate ZIP
    setProgress({ step: "Zipping project prompts...", percent: 50 });
    const content = await zip.generateAsync({ type: "blob" });
    await saveFileWithDialog(content, `${prefix}project_prompts.zip`);
    setProgress({ step: "", percent: 0 });
  };

  const downloadAllImages = async () => {
    if (!project) return;
    const assets = [
      ...project.characters.filter(c => c.imageUrl).map(c => ({ url: c.imageUrl!, name: getCleanFilename('char', c.name) })),
      ...project.backgrounds.filter(b => b.imageUrl).map(b => ({ url: b.imageUrl!, name: getCleanFilename('bg', b.location) })),
      ...(project.props || []).filter(p => p.imageUrl).map(p => ({ url: p.imageUrl!, name: getCleanFilename('prop', p.name) }))
    ];

    if (assets.length === 0) {
      setError("Không có hình ảnh nào được tạo. Vui lòng vẽ ảnh trước.");
      return;
    }

    setShowFolderDialog(true);
  };

  const handleConfirmFolder = async () => {
    if (!project) return;
    setShowFolderDialog(false);

    localStorage.setItem("ai_image_folder_path", folderPathInput);

    const assets = [
      ...project.characters.filter(c => c.imageUrl).map(c => ({ url: c.imageUrl!, name: getCleanFilename('char', c.name) })),
      ...project.backgrounds.filter(b => b.imageUrl).map(b => ({ url: b.imageUrl!, name: getCleanFilename('bg', b.location) })),
      ...(project.props || []).filter(p => p.imageUrl).map(p => ({ url: p.imageUrl!, name: getCleanFilename('prop', p.name) }))
    ];

    const cleanAssets = assets.map(asset => {
      const baseName = asset.name.replace(/\.[^/.]+$/, "");
      const ext = ".jpg";
      const cleanName = baseName.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9đĐ]/g, "_").replace(/__+/g, "_") + ext;
      return { url: asset.url, name: cleanName };
    });

    if ((window as any).electronAPI) {
      try {
        setProgress({ step: "Bắt đầu lưu ảnh vào thư mục...", percent: 20 });
        let i = 0;
        for (const asset of cleanAssets) {
          setProgress({ step: `Đang ghi ${asset.name}...`, percent: 20 + Math.floor((i / cleanAssets.length) * 60) });
          const response = await fetch(asset.url);
          const blob = await response.blob();
          await saveFileToProject(null, asset.name, blob);
          i++;
        }

        // Write project_state.json directly to the folder as well!
        const projectState = {
          version: "VEO3-SUKATTO-PRO-v1",
          scriptName,
          folderPathInput,
          apiBaseUrl,
          selectedModel,
          apiKey,
          concurrencyLimit,
          videoConcurrencyLimit,
          maxAttempts,
          retryDelay,
          imageBatchDelay,
          videoBatchDelay,
          promptRules,
          selectedStyleId,
          videoModelR2V,
          videoModelT2V,
          videoCountPerPrompt,
          videoAspectRatio,
          srtText,
          scriptText,
          project
        };
        await saveFileToProject(null, `${scriptName || "project"}_project_state.json`, null, JSON.stringify(projectState, null, 2));

        setProgress({ step: "", percent: 0 });
        alert(`Đã lưu thành công ${cleanAssets.length} ảnh và tệp khôi phục dự án (project_state.json) trực tiếp vào thư mục cục bộ:\n${folderPathInput}`);
      } catch (err: any) {
        console.error("Electron save folder failed:", err);
        setError(`Lưu trực tiếp thất bại: ${err.message}.`);
        setProgress({ step: "", percent: 0 });
      }
      return;
    }

    try {
      let dirHandle = selectedDirectoryHandle;
      if (!dirHandle) {
        if (!('showDirectoryPicker' in window)) {
          throw new Error("Trình duyệt không hỗ trợ chọn thư mục trực tiếp.");
        }

        setProgress({ step: "Đang yêu cầu chọn thư mục lưu...", percent: 10 });
        dirHandle = await (window as any).showDirectoryPicker({
          mode: "readwrite"
        });
        setSelectedDirectoryHandle(dirHandle);
        setDirPermissionGranted(true);
      } else {
        const permission = await dirHandle.queryPermission({ mode: "readwrite" });
        if (permission !== 'granted') {
          setProgress({ step: "Đang yêu cầu cấp quyền ghi thư mục...", percent: 10 });
          const request = await dirHandle.requestPermission({ mode: "readwrite" });
          if (request !== 'granted') {
            setDirPermissionGranted(false);
            throw new Error("Chưa cấp quyền ghi vào thư mục.");
          }
        }
        setDirPermissionGranted(true);
      }

      setProgress({ step: "Bắt đầu lưu ảnh vào thư mục...", percent: 20 });

      let i = 0;
      for (const asset of cleanAssets) {
        setProgress({ step: `Đang ghi ${asset.name}...`, percent: 20 + Math.floor((i / cleanAssets.length) * 80) });
        
        const response = await fetch(asset.url);
        const blob = await response.blob();

        const fileHandle = await dirHandle.getFileHandle(asset.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        i++;
      }

      // Write project_state.json directly to the folder as well!
      const projectState = {
        version: "VEO3-SUKATTO-PRO-v1",
        scriptName,
        folderPathInput,
        apiBaseUrl,
        selectedModel,
        apiKey,
        concurrencyLimit,
        videoConcurrencyLimit,
        maxAttempts,
        retryDelay,
        imageBatchDelay,
        videoBatchDelay,
        promptRules,
        selectedStyleId,
        videoModelR2V,
        videoModelT2V,
        videoCountPerPrompt,
        videoAspectRatio,
        srtText,
        scriptText,
        project
      };
      const jsonBlob = new Blob([JSON.stringify(projectState, null, 2)], { type: "application/json" });
      const metadataFileHandle = await dirHandle.getFileHandle(`${scriptName || "project"}_project_state.json`, { create: true });
      const metadataWritable = await metadataFileHandle.createWritable();
      await metadataWritable.write(jsonBlob);
      await metadataWritable.close();

      setProgress({ step: "", percent: 0 });
      alert(`Đã lưu thành công ${cleanAssets.length} ảnh và tệp khôi phục dự án (project_state.json) trực tiếp vào thư mục cục bộ:\n${folderPathInput}`);
    } catch (err: any) {
      console.error("Directory save failed:", err);
      if (err.name === 'AbortError') {
        setProgress({ step: "", percent: 0 });
        return;
      }

      setError(`Lưu trực tiếp thất bại: ${err.message}. Đang chuyển sang tải ZIP dự phòng...`);
      setProgress({ step: "Đang nén ZIP dự phòng...", percent: 30 });

      try {
        const zip = new JSZip();
        const folder = zip.folder("production_assets");
        
        let i = 0;
        for (const asset of cleanAssets) {
          setProgress({ step: `Đang nén ${asset.name}...`, percent: 30 + Math.floor((i / cleanAssets.length) * 60) });
          const response = await fetch(asset.url);
          const blob = await response.blob();
          folder?.file(asset.name, blob);
          i++;
        }

        // Also add project_state.json inside the fallback ZIP
        const projectState = {
          version: "VEO3-SUKATTO-PRO-v1",
          scriptName,
          folderPathInput,
          apiBaseUrl,
          selectedModel,
          apiKey,
          concurrencyLimit,
          videoConcurrencyLimit,
          maxAttempts,
          retryDelay,
          imageBatchDelay,
          videoBatchDelay,
          promptRules,
          selectedStyleId,
          videoModelR2V,
          videoModelT2V,
          videoCountPerPrompt,
          videoAspectRatio,
          srtText,
          scriptText,
          project
        };
        zip.file(`${scriptName || "project"}_project_state.json`, JSON.stringify(projectState, null, 2));

        const prefix = scriptName.trim() ? `${scriptName.trim()}_` : "";
        const zipBlob = await zip.generateAsync({ type: "blob" });
        await saveFileWithDialog(zipBlob, `${prefix}production_images.zip`);
      } catch (zipErr: any) {
        console.error("ZIP fallback failed:", zipErr);
        setError(`Tải tệp ZIP dự phòng thất bại: ${zipErr.message}`);
      } finally {
        setProgress({ step: "", percent: 0 });
      }
    }
  };

  const resetAll = () => {
    const isConfirmed = window.confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu dự án hiện tại không? Thao tác này sẽ làm sạch tất cả các dữ liệu đã phân tích, cache và kết quả SEO của dự án.");
    if (!isConfirmed) return;

    setSrtData([]);
    setScriptData([]);
    setSrtText("");
    setScriptText("");
    setScriptName("");
    setProject(null);
    setError(null);
    setSelectedCharacters({});
    setSelectedBackgrounds({});
    setSelectedShots({});
    
    // Clear SEO states
    setSeoSrtInput1("");
    setSeoSrtInput2("");
    setSeoSection1("");
    setSeoSection2("");
    setSeoBgmPrompts([]);
    setSeoError1(null);
    setSeoError2(null);

    localStorage.removeItem("ai_srt_text");
    localStorage.removeItem("ai_script_text");
    localStorage.removeItem("ai_script_name");
    localStorage.removeItem("ai_project_cache");
    removeProjectCacheFromDB();
    localStorage.removeItem("ai_selected_characters");
    localStorage.removeItem("ai_selected_backgrounds");
    localStorage.removeItem("ai_selected_shots");
    setIsRefMappingApproved(false);
    localStorage.removeItem("ai_ref_mapping_approved");
    
    // Clear SEO cache
    localStorage.removeItem("ai_seo_srt_input");
    localStorage.removeItem("ai_seo_srt_input1");
    localStorage.removeItem("ai_seo_srt_input2");
    localStorage.removeItem("ai_seo_section1");
    localStorage.removeItem("ai_seo_section2");
    localStorage.removeItem("ai_seo_bgm_prompts");
  };

  const updateStyle = (id: string, field: keyof VisualStyle, value: string) => {
    setStyles(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const currentStyle = styles.find(s => s.id === selectedStyleId) || styles[0];

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#020203] text-zinc-300 font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[5%] w-[40%] h-[50%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Top Bar */}
      <header className="h-16 border-b border-white/15 flex items-center justify-between px-8 bg-black/50 backdrop-blur-2xl flex-shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
            <Camera className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-tight font-heading">
              VEOPRO <span className="text-indigo-400 font-bold">STUDIO</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em] font-bold">Production Environment v2.5</p>
          </div>

          <button
            onClick={() => {
              setIsSidebarOpen(prev => {
                const next = !prev;
                localStorage.setItem("ai_sidebar_open", String(next));
                return next;
              });
            }}
            className="p-2 ml-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl hover:border-indigo-500/30 transition-all text-zinc-400 hover:text-white flex items-center justify-center shadow-lg active:scale-95 group"
            title={isSidebarOpen ? "Ẩn thanh bên" : "Hiện thanh bên"}
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:-translate-x-0.5">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 transition-transform group-hover:translate-x-0.5 text-indigo-400">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m14 9 3 3-3 3" />
              </svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {isReady && !validationError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-widest"
              >
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                Engine Ready
              </motion.div>
            )}
          </AnimatePresence>

          <div className="h-6 w-px bg-white/10 mx-2" />

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/5">
            <button
              onClick={exportProjectPackage}
              disabled={!project}
              className="px-4 py-2 text-[10px] font-bold text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-md uppercase tracking-widest disabled:opacity-20 transition-all flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" /> Tải Prompts dự án
            </button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={downloadAllImages}
              disabled={!project}
              className="px-4 py-2 bg-indigo-600 text-[10px] font-bold hover:bg-indigo-500 rounded-md uppercase tracking-widest text-white disabled:opacity-30 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" /> Tải tất cả ảnh
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2.5 rounded-lg transition-all group border",
                showSettings 
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]" 
                  : "text-zinc-500 hover:text-white hover:bg-white/5 border-transparent"
              )}
              title="API & Model Configuration"
            >
              <Settings className={cn("w-4 h-4 transition-transform group-hover:rotate-45 duration-300")} />
            </button>
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ maxHeight: "min(620px, 85vh)" }}
                  className="absolute right-0 top-12 w-[calc(100vw-32px)] sm:w-[480px] bg-zinc-950/95 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-4 animate-fade-in overflow-hidden"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Cấu hình Hệ thống</span>
                    </div>
                  </div>

                  {/* Tabs Selector */}
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setActiveSettingsTab("engine")}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                        activeSettingsTab === "engine"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <Cpu className="w-3.5 h-3.5" /> Động cơ AI
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab("rules")}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
                        activeSettingsTab === "rules"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      <Terminal className="w-3.5 h-3.5" /> Quản lý Rules
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-4 min-h-0">

                  {/* Tab 1: AI Engine */}
                  {activeSettingsTab === "engine" && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1">AI Model Engine</label>
                        <div className="relative">
                          <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none appearance-none hover:border-white/20 focus:border-indigo-500/50 transition-all cursor-pointer shadow-inner"
                          >
                            <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="gemini-2.5-flash">Gemini 2.5 Flash (Optimized)</option>
                            <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="gemini-2.5-pro">Gemini 2.5 Pro (Extreme)</option>
                            <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="gpt-4o-mini">GPT-4o Mini</option>
                            <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="gpt-4o">GPT-4o Production</option>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                            <Play className="w-2 h-2 rotate-90 fill-current" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1">
                          Chế độ API Key (Viết Prompts)
                        </label>
                        <div className="flex bg-black/40 p-1 rounded-xl gap-1 border border-white/5">
                          <button
                            type="button"
                            onClick={() => setApiMode('single')}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center",
                              apiMode === 'single'
                                ? "bg-white/5 text-white border border-white/10"
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            Đơn luồng (1 Key)
                          </button>
                          <button
                            type="button"
                            onClick={() => setApiMode('parallel')}
                            className={cn(
                              "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center",
                              apiMode === 'parallel'
                                ? "bg-white/5 text-white border border-white/10"
                                : "text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            Song song (Nhiều Keys)
                          </button>
                        </div>
                      </div>

                      {apiMode === 'single' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1 flex justify-between items-center">
                            Secret Key
                            <span className="text-[8px] text-indigo-400 font-mono font-bold">LOCAL_ENCRYPT</span>
                          </label>
                          <div className="relative group">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="Enter API Access Token..."
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 pl-9 pr-10 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors animate-fade-in"
                            >
                              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1 flex justify-between items-center">
                            Danh sách Secret Keys
                            <span className="text-[8px] text-indigo-400 font-mono font-bold">MULTI_KEYS_PARALLEL</span>
                          </label>
                          <div className="relative group">
                            <textarea
                              value={apiKeysList}
                              onChange={(e) => setApiKeysList(e.target.value)}
                              placeholder="Nhập mỗi API Key trên một dòng hoặc phân tách bằng dấu phẩy..."
                              rows={3}
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono resize-y min-h-[80px]"
                            />
                          </div>
                          <p className="text-[9px] text-zinc-500 leading-normal ml-1">
                            AI sẽ tự động chia các phân khúc để chạy song song tương ứng với số key trên, giúp tăng tốc độ viết prompts lên gấp nhiều lần.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1 flex justify-between items-center">
                          Số luồng chạy song song (Images)
                          <span className="text-[8px] text-indigo-400 font-mono font-bold">CONCURRENCY_LIMIT</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={concurrencyLimit}
                            onChange={(e) => setConcurrencyLimit(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                          />
                        </div>
                      </div>

                      {/* VEO Video Configuration Grid */}
                      <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">Cấu hình Video Veo</span>
                        <div className="grid grid-cols-2 gap-3">
                          {/* 1. Số lượng video per prompt */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5">Số video / prompt</label>
                            <div className="relative">
                              <select
                                value={videoCountPerPrompt}
                                onChange={(e) => setVideoCountPerPrompt(parseInt(e.target.value, 10))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none appearance-none hover:border-white/20 focus:border-indigo-500/50 transition-all cursor-pointer shadow-inner"
                              >
                                {[1, 2, 3, 4].map(n => (
                                  <option key={n} style={{ backgroundColor: '#18181b', color: '#ffffff' }} value={n}>{n}</option>
                                ))}
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                <Play className="w-2 h-2 rotate-90 fill-current" />
                              </div>
                            </div>
                          </div>

                          {/* 2. Khung hình Aspect Ratio */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5">Khung hình video</label>
                            <div className="relative">
                              <select
                                value={videoAspectRatio}
                                onChange={(e) => setVideoAspectRatio(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none appearance-none hover:border-white/20 focus:border-indigo-500/50 transition-all cursor-pointer shadow-inner"
                              >
                                <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="VIDEO_ASPECT_RATIO_LANDSCAPE">Ngang 16:9</option>
                                <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="VIDEO_ASPECT_RATIO_PORTRAIT">Dọc 9:16</option>
                                <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="VIDEO_ASPECT_RATIO_SQUARE">Vuông 1:1</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                <Play className="w-2 h-2 rotate-90 fill-current" />
                              </div>
                            </div>
                          </div>

                          {/* 3. Reference -> Video (R2V) model */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5">Model R2V (Ảnh→Video)</label>
                            <div className="relative">
                              <select
                                value={videoModelR2V}
                                onChange={(e) => setVideoModelR2V(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none appearance-none hover:border-white/20 focus:border-indigo-500/50 transition-all cursor-pointer shadow-inner"
                              >
                                <optgroup label="Reference -> Video" style={{ backgroundColor: '#18181b', color: '#818cf8', fontWeight: 'bold' }}>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_ultra_relaxed">Ảnh→Video 16:9 - 0 credit</option>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_relaxed">Ảnh→Video 16:9 - 1 credit</option>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_standard">Ảnh→Video 16:9 - 2 credit</option>
                                </optgroup>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                <Play className="w-2 h-2 rotate-90 fill-current" />
                              </div>
                            </div>
                          </div>

                          {/* 4. Text -> Video (T2V) model */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5">Model T2V (Chữ→Video)</label>
                            <div className="relative">
                              <select
                                value={videoModelT2V}
                                onChange={(e) => setVideoModelT2V(e.target.value)}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none appearance-none hover:border-white/20 focus:border-indigo-500/50 transition-all cursor-pointer shadow-inner"
                              >
                                <optgroup label="Text -> Video" style={{ backgroundColor: '#18181b', color: '#818cf8', fontWeight: 'bold' }}>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_ultra_relaxed">Text→Video 16:9 - 0 credit</option>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_relaxed">Text→Video 16:9 - 1 credit</option>
                                  <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} value="veo_3_generate_video_standard">Text→Video 16:9 - 2 credit</option>
                                </optgroup>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                                <Play className="w-2 h-2 rotate-90 fill-current" />
                              </div>
                            </div>
                          </div>

                          {/* 5. Giới hạn luồng (Video) */}
                          <div className="space-y-1.5 col-span-2">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Số luồng chạy song song (Video)</span>
                              <span className="text-[8px] text-indigo-400 font-mono font-bold">VIDEO_CONCURRENCY_LIMIT</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={videoConcurrencyLimit}
                                onChange={(e) => setVideoConcurrencyLimit(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                              />
                            </div>
                          </div>

                          {/* 6. Tự động tải video khi vẽ xong */}
                          <div className="space-y-1.5 col-span-2 pt-3 border-t border-white/5 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">Tự động tải video (VEO)</span>
                              <span className="text-[8px] text-zinc-500 font-mono leading-relaxed">Tự động lưu file video về PC khi render thành công</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAutoDownloadVideos(!autoDownloadVideos);
                                localStorage.setItem("ai_auto_download_videos", !autoDownloadVideos ? "true" : "false");
                              }}
                              className={cn(
                                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                autoDownloadVideos ? "bg-emerald-500" : "bg-zinc-800"
                              )}
                              title="Bật/Tắt chế độ tự động tải từng video"
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  autoDownloadVideos ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Image Generation Model & Cost Optimization */}
                      <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">Cấu hình Sinh Ảnh & Tối ưu Chi Phí</span>
                        <div className="space-y-3">
                          {/* Model Select */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Chọn Model Sinh Ảnh</span>
                              <span className="text-[7px] text-indigo-400 font-mono font-bold">IMAGE_GENERATION_MODEL</span>
                            </label>
                            <select
                              value={selectedImageModel}
                              onChange={(e) => setSelectedImageModel(e.target.value as any)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 cursor-pointer animate-fade-in"
                            >
                              <option disabled value="">Tạo Ảnh (Image Models)</option>
                              <option value="GEM_PIX_2">Nano Banana Pro (GEM_PIX_2)</option>
                              <option value="NARWHAL">Nano Banana 2 (NARWHAL)</option>
                            </select>
                            <p className="text-[9px] text-zinc-500 leading-normal ml-0.5">
                              Chọn <span className="text-indigo-400 font-bold">Nano Banana 2 (NARWHAL)</span> để tiết kiệm chi phí và tăng tốc độ vẽ gấp 3 lần khi đang thử nghiệm!
                            </p>
                          </div>

                          {/* Skip successfully generated */}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <div className="space-y-0.5">
                              <span className="text-[9px] font-bold text-white uppercase tracking-wider block">Bỏ qua ảnh đã tạo</span>
                              <p className="text-[8px] text-zinc-500 leading-normal">
                                Tự động bỏ qua nhân vật/bối cảnh đã vẽ ảnh thành công khi chạy hàng loạt để tiết kiệm API.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSkipExistingInBatch(!skipExistingInBatch)}
                              className={cn(
                                "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                skipExistingInBatch ? "bg-indigo-600" : "bg-white/10"
                              )}
                            >
                              <span
                                className={cn(
                                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                  skipExistingInBatch ? "translate-x-4" : "translate-x-0"
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Retry and Delay Configuration Grid */}
                      <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">Cơ chế Thử lại (Auto-Retry Mechanism)</span>
                        <div className="grid grid-cols-2 gap-3">
                          {/* 1. Số lần thử tối đa */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Số lần thử tối đa</span>
                              <span className="text-[7px] text-indigo-400 font-mono font-bold">MAX_ATTEMPTS</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                              />
                            </div>
                          </div>

                          {/* 2. Thời gian chờ (giây) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Thời gian chờ (giây)</span>
                              <span className="text-[7px] text-indigo-400 font-mono font-bold">DELAY_TIME_S</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                value={retryDelay}
                                onChange={(e) => setRetryDelay(Math.max(0, Math.min(60, parseInt(e.target.value, 10) || 0)))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* API Request Delay Configuration */}
                      <div className="space-y-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">Thời gian trễ gửi API (Batch Request Delays)</span>
                        <div className="grid grid-cols-2 gap-3">
                          {/* 1. Trễ tạo ảnh (ms) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Trễ tạo ảnh (mili-giây)</span>
                              <span className="text-[7px] text-indigo-400 font-mono font-bold">IMAGE_DELAY_MS</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={10000}
                                value={imageBatchDelay}
                                onChange={(e) => setImageBatchDelay(Math.max(0, Math.min(10000, parseInt(e.target.value, 10) || 0)))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                              />
                            </div>
                          </div>

                          {/* 2. Trễ tạo video (ms) */}
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider ml-0.5 flex justify-between items-center">
                              <span>Trễ tạo video (mili-giây)</span>
                              <span className="text-[7px] text-indigo-400 font-mono font-bold">VIDEO_DELAY_MS</span>
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={10000}
                                value={videoBatchDelay}
                                onChange={(e) => setVideoBatchDelay(Math.max(0, Math.min(10000, parseInt(e.target.value, 10) || 0)))}
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>



                      {/* Configurable Backend API URL */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider ml-1 flex justify-between items-center text-wrap gap-2">
                          <span>Địa chỉ Backend API (Local/LAN)</span>
                          <span className="text-[8px] text-indigo-400 font-mono font-bold">BACKEND_API_URL</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={apiBaseUrl}
                            onChange={(e) => setApiBaseUrl(e.target.value)}
                            placeholder="Ví dụ: http://192.168.1.10:5000"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all shadow-inner font-mono"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-normal ml-1">
                          Nhập địa chỉ máy chủ chạy Python Backend để vẽ ảnh/video (mặc định là <code className="text-indigo-400/80">http://127.0.0.1:5000</code>).
                        </p>
                      </div>

                      <div className="h-px bg-white/5 my-2" />

                      <div className="p-4 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-2xl relative overflow-hidden group/veo hover:border-indigo-500/25 transition-all animate-fade-in">
                        {/* Glow effect on hover */}
                        <div className="absolute -right-10 -bottom-10 w-24 h-24 bg-indigo-500/5 blur-xl rounded-full group-hover/veo:bg-indigo-500/10 transition-all duration-500" />
                        
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 mt-0.5 flex-shrink-0 group-hover/veo:scale-105 transition-transform duration-300">
                            <Cpu className="w-4 h-4" />
                          </div>
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Veo Automation API (Local)</span>
                              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-widest">Active</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-normal">
                              Hệ thống kết nối trực tiếp với máy chủ Google Veo cục bộ tại <code className="text-indigo-300 font-mono">{cleanApiUrl}</code>.
                            </p>
                            <div className="flex gap-4 pt-1 text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-500/50 rounded-full" /> HOST: {cleanApiUrl.replace(/^https?:\/\//i, '').split(':')[0]}</span>
                              <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-500/50 rounded-full" /> PORT: {cleanApiUrl.replace(/^https?:\/\//i, '').split(':')[1] || '80'}</span>
                              <span className="flex items-center gap-1"><span className="w-1 h-1 bg-indigo-500/50 rounded-full" /> SYNC: 15-20s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Rules Management */}
                  {activeSettingsTab === "rules" && (
                    <div className="space-y-4 animate-fade-in flex flex-col">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Danh sách luật prompt</label>
                        <span className="text-[8px] text-zinc-500 font-mono">ACTIVE: {promptRules.filter(r => r.enabled).length} / {promptRules.length}</span>
                      </div>
                      
                      <div className="overflow-y-auto pr-1 space-y-2.5 custom-scrollbar max-h-[240px]">
                        {promptRules.map((rule) => (
                          <div key={rule.id} className="flex items-start gap-3 bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl p-2.5 transition-colors group">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={() => toggleRule(rule.id)}
                              className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer mt-1 flex-shrink-0"
                            />
                            <textarea
                              value={rule.text}
                              onChange={(e) => updateRuleText(rule.id, e.target.value)}
                              rows={2}
                              placeholder="Nhập luật nhắc lệnh bổ sung..."
                              className="flex-1 bg-transparent text-xs text-zinc-200 outline-none resize-none leading-relaxed font-mono custom-scrollbar"
                            />
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="p-1 text-zinc-600 hover:text-rose-400 rounded transition-colors mt-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Xóa luật này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        {promptRules.length === 0 && (
                          <div className="text-center py-6 text-zinc-600 text-xs italic">
                            Chưa có luật prompt nào. Hãy bấm nút bên dưới để thêm!
                          </div>
                        )}
                      </div>

                      <button
                        onClick={addRule}
                        className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-indigo-400 rounded-xl transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm Rule Mới
                      </button>
                    </div>
                  )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={resetAll}
            className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all group"
            title="Purge Project Data"
          >
            <RotateCcw className="w-4 h-4 group-hover:rotate-[-90deg] transition-transform duration-500" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={cn(
          "border-r border-white/15 bg-black/30 backdrop-blur-xl flex flex-col gap-10 overflow-y-auto custom-scrollbar z-40 relative transition-all duration-300 ease-in-out select-none",
          isSidebarOpen ? "w-96 p-8 opacity-100" : "w-0 p-0 opacity-0 overflow-hidden border-r-0 invisible"
        )}>
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-400 font-extrabold drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
                <FileText className="w-3.5 h-3.5" />
                <label className="text-[10px] uppercase tracking-[0.3em] font-black">01 // SOURCE_ASSETS</label>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[11px] text-zinc-200 font-extrabold ml-1">Script Name / Project ID</label>
                <input
                  type="text"
                  value={scriptName}
                  onChange={(e) => setScriptName(e.target.value)}
                  placeholder="e.g. kb1"
                  className="w-full bg-black/40 border border-white/15 rounded-xl p-3.5 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all shadow-inner font-mono font-bold"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[11px] text-zinc-200 font-extrabold ml-1 flex justify-between items-center text-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    Đường dẫn thư mục lưu ảnh (Cục bộ)
                    {selectedDirectoryHandle && (
                      dirPermissionGranted ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase font-mono tracking-widest bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                          Linked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase font-mono tracking-widest bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                          <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                          Needs Auth
                        </span>
                      )
                    )}
                  </span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={folderPathInput}
                      onChange={(e) => {
                        setFolderPathInput(e.target.value);
                        localStorage.setItem("ai_image_folder_path", e.target.value);
                      }}
                      placeholder="Ví dụ: C:\VeoProject\Images"
                      className="w-full bg-black/40 border border-white/15 rounded-xl p-3.5 pr-8 text-xs text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all shadow-inner font-mono"
                    />
                    {selectedDirectoryHandle && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {dirPermissionGranted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePickDirectory}
                    className="px-3 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-[110px]"
                    title="Chọn thư mục trên máy tính của bạn"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Chọn thư mục</span>
                  </button>
                </div>

                {selectedDirectoryHandle && !dirPermissionGranted && (
                  <div className="mt-2 p-2.5 bg-amber-500/[0.03] border border-amber-500/10 rounded-lg flex flex-col gap-1.5">
                    <p className="text-[9px] text-zinc-400 leading-normal flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Thư mục <strong>"{selectedDirectoryHandle.name}"</strong> đã liên kết nhưng chưa cấp quyền ghi.</span>
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const request = await selectedDirectoryHandle.requestPermission({ mode: "readwrite" });
                          setDirPermissionGranted(request === 'granted');
                          if (request === 'granted') {
                            alert("Đã cấp quyền ghi vào thư mục thành công!");
                          }
                        } catch (e: any) {
                          alert(`Lỗi cấp quyền: ${e.message}`);
                        }
                      }}
                      className="py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      🔑 Cấp quyền ghi thư mục
                    </button>
                  </div>
                )}
              </div>

              {/* Project State Import/Export Controls */}
              <div className="space-y-2.5 p-3.5 bg-indigo-500/[0.02] border border-indigo-500/10 hover:border-indigo-500/25 rounded-2xl transition-all">
                <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block mb-1 flex items-center gap-1.5 text-indigo-400">
                  <Database className="w-3.5 h-3.5" />
                  <span>Quản lý Dự án (Restoration)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportProjectState}
                    disabled={!project}
                    className="py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/40 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Xuất toàn bộ cấu hình kịch bản, ảnh tham chiếu, mediaID và liên kết ra file JSON để tái sử dụng"
                  >
                    <Download className="w-3 h-3 text-indigo-400" />
                    <span>Xuất Dự Án</span>
                  </button>
                  <label
                    className="py-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    title="Nhập lại file JSON dự án đã lưu trước đó để tiếp tục làm việc mà không cần tạo lại"
                  >
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportProjectState(file);
                        e.target.value = ""; // Reset file input
                      }}
                      className="hidden"
                    />
                    <Upload className="w-3 h-3 text-emerald-400" />
                    <span>Nhập Dự Án</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-zinc-200 font-extrabold">Subtitles (SRT)</label>
                    <label className="cursor-pointer text-zinc-400 hover:text-indigo-400 transition-all p-1 hover:bg-white/10 rounded border border-white/15 bg-black/40 flex items-center justify-center">
                      <input type="file" accept=".srt" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const text = await file.text();
                          handleSrtChange(text);
                        }
                      }} className="hidden" />
                      <Upload className="w-3 h-3" />
                    </label>
                  </div>
                  {srtData.length > 0 && (
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> {srtData.length} Blocks
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <textarea
                    value={srtText}
                    onChange={(e) => handleSrtChange(e.target.value)}
                    placeholder="Paste subtitle timing data..."
                    className={cn(
                      "w-full h-32 bg-black/40 border border-white/15 rounded-2xl p-4 text-[11px] font-mono text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all resize-none custom-scrollbar shadow-inner leading-relaxed",
                      srtData.length > 0 && "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                    )}
                  />
                  {!srtText && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                      <FileText className="w-8 h-8 mb-2 text-zinc-300" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-300">Awaiting SRT Payload</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-zinc-200 font-extrabold">Script (TXT)</label>
                    <label className="cursor-pointer text-zinc-400 hover:text-indigo-400 transition-all p-1 hover:bg-white/10 rounded border border-white/15 bg-black/40 flex items-center justify-center">
                      <input type="file" accept=".txt" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const text = await file.text();
                          handleScriptChange(text);
                        }
                      }} className="hidden" />
                      <Upload className="w-3 h-3" />
                    </label>
                  </div>
                  {scriptData.length > 0 && (
                    <span className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> {scriptData.length} Lines
                    </span>
                  )}
                </div>
                <div className="relative group">
                  <textarea
                    value={scriptText}
                    onChange={(e) => handleScriptChange(e.target.value)}
                    placeholder="Character: Dialogue structure..."
                    className={cn(
                      "w-full h-40 bg-black/40 border border-white/15 rounded-2xl p-4 text-[11px] font-mono text-zinc-200 outline-none focus:border-indigo-500/60 focus:bg-black/60 transition-all resize-none custom-scrollbar shadow-inner leading-relaxed",
                      scriptData.length > 0 && "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                    )}
                  />
                  {!scriptText && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-10 group-hover:opacity-20 transition-opacity">
                      <FileText className="w-8 h-8 mb-2" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold">Awaiting Script Payload</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="flex items-center gap-2 text-indigo-400 font-extrabold drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]">
              <Play className="w-3.5 h-3.5" />
              <label className="text-[10px] uppercase tracking-[0.3em] font-black">02 // SHOT_PARAM</label>
            </div>
            <div className="space-y-8 px-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-200 font-extrabold">Global Shot Tempo</span>
                  <span className="text-white font-black font-mono tracking-tighter bg-indigo-500 px-2 py-0.5 rounded shadow-[0_0_15px_rgba(99,102,241,0.5)]">{maxDuration}s</span>
                </div>
                <div className="relative h-6 flex items-center">
                  <div className="absolute w-full h-1 bg-white/5 rounded-full" />
                  <div className="absolute h-1 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${((maxDuration - 5) / 10) * 100}%` }} />
                  <input
                    type="range" min="5" max="15" step="1" value={maxDuration}
                    onChange={(e) => setMaxDuration(parseInt(e.target.value))}
                    className="absolute w-full h-6 bg-transparent appearance-none cursor-pointer accent-white outline-none z-10"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-zinc-700 uppercase tracking-widest">
                  <span>Adagio (5s)</span>
                  <span>Presto (15s)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/15 space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-zinc-200 hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    checked={mergeShortLines}
                    onChange={(e) => setMergeShortLines(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 accent-indigo-500 cursor-pointer"
                  />
                  Gộp các câu ngắn (&lt; 2s)
                </label>
                <p className="text-[10px] text-zinc-400 leading-normal ml-6 italic">
                  Tự động phân tích thời gian trong file SRT để gộp các câu thoại ngắn hơn 2 giây, giúp tránh việc chia nhỏ video quá vụn.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-zinc-200 font-extrabold block ml-1">Cinematic Visual Style</label>
                  <button
                    onClick={() => setIsStyleEditing(!isStyleEditing)}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded transition-all",
                      isStyleEditing ? "bg-indigo-500 text-white shadow-glow" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {isStyleEditing ? "Save & Lock" : "Custom Edit"}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative group">
                    <select
                      value={selectedStyleId}
                      onChange={(e) => setSelectedStyleId(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/20 rounded-xl p-3.5 text-xs text-white outline-none appearance-none hover:border-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer shadow-inner"
                    >
                      {styles.map(s => (
                        <option style={{ backgroundColor: '#18181b', color: '#ffffff' }} key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                      <Play className="w-2.5 h-2.5 rotate-90 fill-current" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isStyleEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden border border-white/10 p-3.5 rounded-xl bg-white/[0.01]"
                      >
                        {/* Custom Edit Tab Headers */}
                        <div className="flex border-b border-white/10 pb-1 gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomEditTab("content")}
                            className={cn(
                              "flex-1 pb-1.5 text-[9px] font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer",
                              customEditTab === "content" 
                                ? "border-indigo-500 text-white font-black" 
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            Nội dung Style
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomEditTab("manage")}
                            className={cn(
                              "flex-1 pb-1.5 text-[9px] font-black uppercase tracking-wider text-center border-b-2 transition-all cursor-pointer",
                              customEditTab === "manage" 
                                ? "border-indigo-500 text-white font-black" 
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                            )}
                          >
                            Quản lý Style
                          </button>
                        </div>

                        {customEditTab === "content" ? (
                          <div className="space-y-4 pt-1">
                            <div className="space-y-1.5">
                              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Hậu Tố Nhân Vật (Character Suffix)</label>
                              <textarea
                                value={currentStyle.characterSuffix}
                                onChange={(e) => updateStyle(currentStyle.id, "characterSuffix", e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-zinc-300 font-mono resize-none h-20 focus:border-indigo-500/50 outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Hậu Tố Bối Cảnh (Background Suffix)</label>
                              <textarea
                                value={currentStyle.backgroundSuffix}
                                onChange={(e) => updateStyle(currentStyle.id, "backgroundSuffix", e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[10px] text-zinc-300 font-mono resize-none h-20 focus:border-indigo-500/50 outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 pt-1">
                            {/* 1. Sửa tên Style hiện tại */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Đổi tên Style hiện tại</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={currentStyle.name}
                                  onChange={(e) => updateStyle(currentStyle.id, "name", e.target.value)}
                                  placeholder="Nhập tên style..."
                                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500/50 outline-none font-sans"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (styles.length <= 1) {
                                      alert("Không thể xóa style duy nhất còn lại!");
                                      return;
                                    }
                                    if (window.confirm(`Bạn có chắc chắn muốn xóa style "${currentStyle.name}" không?`)) {
                                      const remainingStyles = styles.filter(s => s.id !== currentStyle.id);
                                      setStyles(remainingStyles);
                                      setSelectedStyleId(remainingStyles[0].id);
                                    }
                                  }}
                                  className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/25 hover:border-red-500/40 text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                  title="Xóa style hiện tại"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa</span>
                                </button>
                              </div>
                            </div>

                            <div className="h-px bg-white/5 my-1" />

                            {/* 2. Thêm Style mới */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest ml-1">Thêm Style Mới</label>
                              <div className="flex gap-2">
                                <input
                                  id="new-style-name-input"
                                  type="text"
                                  placeholder="Tên style mới... (ví dụ: 3D Pixar)"
                                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500/50 outline-none font-sans"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.currentTarget;
                                      const name = input.value.trim();
                                      if (!name) return;
                                      const newId = `style-${Date.now()}`;
                                      const newStyleObj = {
                                        id: newId,
                                        name,
                                        description: "",
                                        characterSuffix: "high quality, detailed",
                                        backgroundSuffix: "high quality, detailed"
                                      };
                                      setStyles(prev => [...prev, newStyleObj]);
                                      setSelectedStyleId(newId);
                                      input.value = "";
                                      alert(`Đã thêm style "${name}" thành công!`);
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.getElementById("new-style-name-input") as HTMLInputElement;
                                    const name = input?.value.trim();
                                    if (!name) {
                                      alert("Vui lòng nhập tên style mới!");
                                      return;
                                    }
                                    const newId = `style-${Date.now()}`;
                                    const newStyleObj = {
                                      id: newId,
                                      name,
                                      description: "",
                                      characterSuffix: "high quality, detailed",
                                      backgroundSuffix: "high quality, detailed"
                                    };
                                    setStyles(prev => [...prev, newStyleObj]);
                                    setSelectedStyleId(newId);
                                    if (input) input.value = "";
                                    alert(`Đã thêm style "${name}" thành công!`);
                                  }}
                                  className="px-3 py-2 bg-indigo-600 border border-white/10 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Thêm</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>

          {/* Validation/Errors */}
          <div className="space-y-4">
            <AnimatePresence>
              {validationError && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex gap-4">
                  <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Schema Conflict</p>
                    <p className="text-[11px] font-medium text-rose-300/80 leading-relaxed italic line-clamp-3">{validationError}</p>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="p-5 bg-orange-500/5 border border-orange-500/20 rounded-2xl flex gap-4">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Engine Exception</p>
                    <p className="text-[11px] font-medium text-orange-300/80 leading-relaxed italic line-clamp-3">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pt-8 border-t border-white/15 space-y-4 relative z-50">
            <button
              disabled={!isReady || isGenerating}
              onClick={extractAssetsAndSituations}
              className={cn(
                "w-full h-16 rounded-2xl font-bold uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-3 transition-all relative overflow-hidden group shadow-2xl",
                isReady && !isGenerating
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed opacity-50"
              )}
            >
              {isGeneratingSituations ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white/40" />
                  <span className="text-white/40 font-bold uppercase tracking-widest">Đang Phân Tích...</span>
                </>
              ) : isWritingShots ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white/40" />
                  <span className="text-white/40 font-bold uppercase tracking-widest">Đang Tạo Prompts...</span>
                </>
              ) : isGenerating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white/40" />
                  <span className="text-white/40 font-bold uppercase tracking-widest">Đang Xử Lý...</span>
                </>
              ) : (
                <>
                  <Play className={cn("w-4 h-4 fill-current transition-transform group-hover:scale-110", isReady ? "text-white" : "text-zinc-700")} />
                  Phân Tích & Trích Xuất
                </>
              )}
            </button>

            {project && (
              <button
                disabled={isGenerating}
                onClick={extractAssetsAndSituations}
                className="w-full h-12 rounded-xl border border-white/15 bg-black/40 font-bold uppercase tracking-widest text-[9px] text-zinc-400 flex items-center justify-center gap-2 hover:bg-white/10 hover:text-white transition-all group"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-700" />
                Trích Xuất Lại Tài Nguyên
              </button>
            )}

            <button
              onClick={() => {
                localStorage.removeItem("login_session_active");
                localStorage.removeItem("login_saved_username");
                localStorage.removeItem("login_deploy_link");
                setIsLoggedIn(false);
              }}
              className="w-full h-12 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 text-rose-400 font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Đăng Xuất Thiết Bị
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-zinc-950/20 overflow-hidden relative">
          {/* Active Work Background */}
          <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.02]">
            <Camera className="w-[500px] h-[500px]" />
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/15 px-12 bg-black/20 backdrop-blur-3xl flex-shrink-0 z-10 relative">
            {[
              { id: 'reference_images', label: 'Ảnh Tham Chiếu', icon: ImageIcon },
              { id: 'shots', label: 'Kịch Bản & Phân Cảnh', icon: Camera },
              { id: 'cinema', label: 'Rạp Chiếu Phim', icon: Film },
              { id: 'thumb', label: 'Thiết Kế Thumb', icon: Sparkles },
              { id: 'seo', label: 'Tối Ưu SEO', icon: Globe },
              { id: 'logs', label: 'Nhật Ký Hệ Thống', icon: Terminal }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-10 py-6 text-[11px] font-bold uppercase tracking-[0.2em] flex items-center gap-3.5 transition-all relative group",
                  activeTab === tab.id
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <tab.icon className={cn("w-4 h-4 transition-all", activeTab === tab.id ? "text-indigo-400 scale-110" : "opacity-30 group-hover:opacity-50")} />
                {tab.label}
                {project && tab.id === 'shots' && (
                  <span className="text-[10px] font-mono text-indigo-500/50 ml-1">({project.shots.length})</span>
                )}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-4 right-4 h-0.5 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>


          <div className="flex-1 overflow-y-auto px-6 py-10 custom-scrollbar z-10 relative">
            <AnimatePresence mode="wait">
              {activeTab === 'logs' ? (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="max-w-[1700px] mx-auto pb-32"
                >
                  <div className="space-y-16">
                    <div className="flex items-end justify-between border-b border-white/5 pb-8">
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black tracking-tighter text-white italic font-heading [text-shadow:0_0_30px_rgba(255,255,255,0.1)]">SYSTEM LOGS</h2>
                        <p className="text-[11px] font-mono text-indigo-400 uppercase tracking-[0.4em] font-black">Real-time Automation Stream</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setIsPollingLogs(!isPollingLogs)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border flex items-center gap-2 cursor-pointer",
                            isPollingLogs 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                              : "bg-white/5 text-zinc-400 border-white/10"
                          )}
                        >
                          <div className={cn("w-1.5 h-1.5 rounded-full shadow-lg", isPollingLogs ? "bg-emerald-400 animate-pulse" : "bg-zinc-500")} />
                          {isPollingLogs ? "Tự Động Cập Nhật (ON)" : "Tự Động Cập Nhật (OFF)"}
                        </button>
                        
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${cleanApiUrl}/api/logs`);
                              const data = await res.json();
                              if (data.success && data.logs) {
                                setSystemLogs(prev => {
                                  const combined = [...prev];
                                  data.logs.forEach((log: string) => {
                                    if (!combined.includes(log)) {
                                      combined.push(log);
                                    }
                                  });
                                  return combined.sort((a, b) => getLogTime(a) - getLogTime(b));
                                });
                              }
                              setLogsError(null);
                            } catch (err) {
                              setLogsError(`Không thể kết nối đến máy chủ logs (${cleanApiUrl}). Vui lòng kiểm tra backend.`);
                            }
                          }}
                          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 uppercase tracking-widest cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Làm mới
                        </button>
                      </div>
                    </div>

                    {logsError && (
                      <div className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex gap-4">
                        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Lỗi Kết Nối Máy Chủ Logs</p>
                          <p className="text-[11px] font-medium text-rose-300/80 leading-relaxed italic">{logsError}</p>
                        </div>
                      </div>
                    )}

                    {/* Terminal Display */}
                    <div className="relative group">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-[2rem] blur opacity-70"></div>
                      <div className="relative bg-black/90 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl">
                        {/* Terminal Header */}
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 font-mono text-[10px] text-zinc-500">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1.5">
                              <span className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/50 block"></span>
                              <span className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/50 block"></span>
                              <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50 block"></span>
                            </div>
                            <span className="ml-2 text-zinc-400 tracking-wider">veo_automation_stream.sh</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-indigo-400 font-bold uppercase tracking-wider">STATUS: CONNECTED</span>
                          </div>
                        </div>

                        {/* Logs Content */}
                        <div className="font-mono text-xs leading-relaxed space-y-2 h-[480px] overflow-y-auto custom-scrollbar pr-2 select-text selection:bg-indigo-500/30">
                          {(() => {
                            const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
                            const filtered = systemLogs.filter(log => getLogTime(log) >= fifteenMinsAgo);
                            const displayLogs = [...filtered].reverse();
                            
                            if (displayLogs.length > 0) {
                              return displayLogs.map((log, index) => {
                                // Color helper based on content
                                let logColor = "text-zinc-300";
                                if (log.includes("❌") || log.toLowerCase().includes("[error]")) {
                                  logColor = "text-rose-400 font-semibold";
                                } else if (log.includes("✅") || log.toLowerCase().includes("success")) {
                                  logColor = "text-emerald-400 font-semibold";
                                } else if (log.includes("🚀") || log.toLowerCase().includes("started") || log.toLowerCase().includes("initiate")) {
                                  logColor = "text-indigo-400 font-semibold";
                                } else if (log.includes("⚠️") || log.toLowerCase().includes("[warning]") || log.toLowerCase().includes("warn")) {
                                  logColor = "text-amber-400 font-semibold";
                                }

                                const originalIndex = filtered.indexOf(log) + 1;

                                return (
                                  <div key={index} className={cn("hover:bg-white/[0.02] px-2 py-1 rounded transition-colors flex items-start gap-2", logColor)}>
                                    <span className="text-zinc-600 select-none">{originalIndex.toString().padStart(3, '0')}</span>
                                    <span>{log}</span>
                                  </div>
                                );
                              });
                            } else {
                              return (
                                <div className="text-center py-24 text-zinc-600 italic">
                                  {logsError ? "Đang chờ kết nối lại đến backend..." : "Chưa có log hệ thống nào. Vui lòng bắt đầu các tác vụ tạo ảnh hoặc chạy kịch bản."}
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'thumb' ? (
                <ThumbnailTab
                  thumbStoryInput={thumbStoryInput}
                  setThumbStoryInput={setThumbStoryInput}
                  thumbTitlesInput={thumbTitlesInput}
                  setThumbTitlesInput={setThumbTitlesInput}
                  selectedVersionIndex={selectedVersionIndex}
                  setSelectedVersionIndex={setSelectedVersionIndex}
                  thumbStyle={thumbStyle}
                  setThumbStyle={setThumbStyle}
                  thumbData={thumbData}
                  setThumbData={setThumbData}
                  thumbMasterPrompt={thumbMasterPrompt}
                  setThumbMasterPrompt={setThumbMasterPrompt}
                  thumbImageUrl={thumbImageUrl}
                  setThumbImageUrl={setThumbImageUrl}
                  isAnalyzingThumb={isAnalyzingThumb}
                  isGeneratingThumbImage={isGeneratingThumbImage}
                  thumbJsonError={thumbJsonError}
                  rawStyleJsonText={rawStyleJsonText}
                  setRawStyleJsonText={setRawStyleJsonText}
                  styleEditorTab={styleEditorTab}
                  setStyleEditorTab={setStyleEditorTab}
                  scriptText={scriptText}
                  isImageGenerating={isImageGenerating}
                  isGenerating={isGenerating}
                  cleanApiUrl={cleanApiUrl}
                  project={project}
                  analyzeThumbnailStory={analyzeThumbnailStory}
                  generateThumbnailImage={generateThumbnailImage}
                  handleBeforeSideChange={handleBeforeSideChange}
                  updateStyleField={updateStyleField}
                  downloadThumbnail={downloadThumbnail}
                  setZoomedImageUrl={setZoomedImageUrl}
                  setZoomedImageName={setZoomedImageName}
                />
              ) : !project && !isGenerating ? (

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                  className="h-full flex flex-col items-center justify-center"
                >
                  <div className="w-24 h-24 border border-white/10 rounded-3xl flex items-center justify-center mb-8 bg-white/[0.01] shadow-2xl animate-float">
                    <Play className="w-8 h-8 text-indigo-500/40" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-[0.4em] mb-3 text-white/40 italic font-heading">Studio Idle</h3>
                  <p className="text-[11px] font-mono tracking-[0.2em] text-center max-w-sm uppercase leading-loose text-zinc-400 font-bold">
                    Hydrate source assets and initialize the production sequence from the sidebar.
                  </p>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="max-w-[1700px] mx-auto space-y-16"
                >
                  <div className="flex items-center gap-6 mb-12">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center border border-indigo-500/30">
                      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold uppercase tracking-widest text-white font-heading">Synthesizing Scene Logic</h4>
                      <p className="text-[10px] font-mono text-indigo-400/50 uppercase tracking-widest animate-pulse">{progress.step}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-10 opacity-30 pointer-events-none">
                    <div className="aspect-[16/10] bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
                    </div>
                    <div className="aspect-[16/10] bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-bl from-violet-500/10 to-transparent" />
                    </div>
                  </div>
                </motion.div>
              ) : activeTab === 'seo' ? (
                <SeoTab
                  seoSection1={seoSection1}
                  seoSection2={seoSection2}
                  seoBgmPrompts={seoBgmPrompts}
                  seoSrtInput1={seoSrtInput1}
                  isGeneratingSeo1={isGeneratingSeo1}
                  seoError1={seoError1}
                  syncSrtToSeo1={syncSrtToSeo1}
                  setSeoSrtInput1={setSeoSrtInput1}
                  handleGenerateSEO={handleGenerateSEO}
                  downloadSEOFile={downloadSEOFile}
                  downloadBgmFile={downloadBgmFile}
                />
              ) : activeTab === 'cinema' ? (
                project ? (
                  <CinemaTab
                    project={project}
                    srtData={srtData}
                    handleSrtChange={handleSrtChange}
                    systemLogs={systemLogs}
                    setSystemLogs={setSystemLogs}
                    generatingVideos={generatingVideos}
                    generateVideo={generateVideo}
                    isGenerating={isGenerating}
                    selectedDirectoryHandle={selectedDirectoryHandle}
                    apiKey={apiKey}
                    selectedModel={selectedModel}
                    apiBaseUrl={apiBaseUrl}
                    setProject={setProject}
                    projectPath={folderPathInput}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-20 text-center gap-4 bg-zinc-950/20">
                    <Film className="w-16 h-16 text-zinc-700 opacity-30 animate-pulse" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-mono font-black text-zinc-400 uppercase tracking-widest">Chưa Khởi Tạo Dự Án</h3>
                      <p className="text-[10px] text-zinc-500 font-mono max-w-[320px] leading-relaxed">
                        Rạp chiếu phim đang trống. Hãy nhập file SRT và phân tích Kịch Bản để kích hoạt rạp chiếu!
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="max-w-[1700px] mx-auto pb-32"
                >
                  {activeTab === 'reference_images' && (
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-2 p-1.5 bg-zinc-900/60 border border-white/5 rounded-2xl w-fit self-start backdrop-blur-md shadow-lg">
                        {[
                          { id: 'characters', label: 'Nhân Vật & Tạo Hình', icon: User },
                          { id: 'backgrounds', label: 'Bối Cảnh & Không Gian', icon: ImageIcon },
                          { id: 'props', label: 'Đạo Cụ Chính', icon: Box }
                        ].map((subTab) => {
                          const Icon = subTab.icon;
                          const isSubActive = referenceSubTab === subTab.id;
                          return (
                            <button
                              key={subTab.id}
                              onClick={() => setReferenceSubTab(subTab.id as any)}
                              className={cn(
                                "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer",
                                isSubActive
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 border border-indigo-500/30"
                                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{subTab.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="min-h-0">
                        {referenceSubTab === 'characters' && (
                          <CharactersTab
                            project={project!}
                            selectedCharacters={selectedCharacters}
                            setSelectedCharacters={setSelectedCharacters}
                            selectedCharsCount={selectedCharsCount}
                            selectedBgsCount={selectedBgsCount}
                            allAssetsCount={allAssetsCount}
                            selectedAllAssetsCount={selectedAllAssetsCount}
                            isBatchGenerating={isBatchGenerating}
                            isImageGenerating={isImageGenerating}
                            isGenerating={isGenerating}
                            generatingImages={generatingImages}
                            generationStatuses={generationStatuses}
                            generationErrors={generationErrors}
                            imageSelectorTarget={imageSelectorTarget as any}
                            setImageSelectorTarget={setImageSelectorTarget as any}
                            fileUploadTarget={fileUploadTarget as any}
                            setFileUploadTarget={setFileUploadTarget as any}
                            refFileInputRef={refFileInputRef}
                            generateAllCharacters={generateAllCharacters}
                            handleSelectAllCharacters={handleSelectAllCharacters}
                            handleSelectAllAssets={handleSelectAllAssets}
                            handleGenerateSelectedCharacters={handleGenerateSelectedCharacters}
                            handleGenerateAllSelectedAssets={handleGenerateAllSelectedAssets}
                            handleRegenerateFailedCharacters={handleRegenerateFailedCharacters}
                            handleStopBatch={handleStopBatch}
                            setZoomedImageUrl={setZoomedImageUrl}
                            setZoomedImageName={setZoomedImageName}
                            handleDeleteReferenceImage={handleDeleteReferenceImage}
                            downloadSingleImage={downloadSingleImage}
                            getCleanFilename={getCleanFilename}
                            updateCharacter={updateCharacter}
                            toggleCharacterInstruction={toggleCharacterInstruction}
                            generateImage={generateImage}
                            cleanApiUrl={cleanApiUrl}
                            activeStyleSuffix={styles.find(s => s.id === selectedStyleId)?.characterSuffix || styles[0].characterSuffix}
                            selectedImageModel={selectedImageModel}
                          />
                        )}

                        {referenceSubTab === 'backgrounds' && (
                          <BackgroundsTab
                            project={project!}
                            selectedBackgrounds={selectedBackgrounds}
                            setSelectedBackgrounds={setSelectedBackgrounds}
                            selectedBgsCount={selectedBgsCount}
                            selectedCharsCount={selectedCharsCount}
                            allAssetsCount={allAssetsCount}
                            selectedAllAssetsCount={selectedAllAssetsCount}
                            isBatchGenerating={isBatchGenerating}
                            isImageGenerating={isImageGenerating}
                            isGenerating={isGenerating}
                            generatingImages={generatingImages}
                            generationStatuses={generationStatuses}
                            generationErrors={generationErrors}
                            imageSelectorTarget={imageSelectorTarget as any}
                            setImageSelectorTarget={setImageSelectorTarget as any}
                            fileUploadTarget={fileUploadTarget as any}
                            setFileUploadTarget={setFileUploadTarget as any}
                            refFileInputRef={refFileInputRef}
                            generateAllBackgrounds={generateAllBackgrounds}
                            handleSelectAllBackgrounds={handleSelectAllBackgrounds}
                            handleSelectAllAssets={handleSelectAllAssets}
                            handleGenerateSelectedBackgrounds={handleGenerateSelectedBackgrounds}
                            handleGenerateAllSelectedAssets={handleGenerateAllSelectedAssets}
                            handleRegenerateFailedBackgrounds={handleRegenerateFailedBackgrounds}
                            handleStopBatch={handleStopBatch}
                            setZoomedImageUrl={setZoomedImageUrl}
                            setZoomedImageName={setZoomedImageName}
                            handleDeleteReferenceImage={handleDeleteReferenceImage}
                            downloadSingleImage={downloadSingleImage}
                            getCleanFilename={getCleanFilename}
                            updateBackground={updateBackground}
                            toggleBackgroundInstruction={toggleBackgroundInstruction}
                            generateImage={generateImage}
                            handleAddBackgroundManual={handleAddBackgroundManual}
                            handleDeleteBackgroundManual={handleDeleteBackgroundManual}
                          />
                        )}

                        {referenceSubTab === 'props' && project && (
                          <PropsTab
                            project={project}
                            selectedProps={selectedProps}
                            setSelectedProps={setSelectedProps}
                            selectedPropsCount={selectedPropsCount}
                            selectedCharsCount={selectedCharsCount}
                            selectedBgsCount={selectedBgsCount}
                            allAssetsCount={allAssetsCount}
                            selectedAllAssetsCount={selectedAllAssetsCount}
                            isBatchGenerating={isBatchGenerating}
                            isImageGenerating={isImageGenerating}
                            isGenerating={isGenerating}
                            generatingImages={generatingImages}
                            generationStatuses={generationStatuses}
                            generationErrors={generationErrors}
                            imageSelectorTarget={imageSelectorTarget}
                            setImageSelectorTarget={setImageSelectorTarget}
                            fileUploadTarget={fileUploadTarget}
                            setFileUploadTarget={setFileUploadTarget}
                            refFileInputRef={refFileInputRef}
                            generateAllProps={generateAllProps}
                            handleSelectAllProps={handleSelectAllProps}
                            handleSelectAllAssets={handleSelectAllAssets}
                            handleGenerateSelectedProps={handleGenerateSelectedProps}
                            handleGenerateAllSelectedAssets={handleGenerateAllSelectedAssets}
                            handleRegenerateFailedProps={handleRegenerateFailedProps}
                            handleStopBatch={handleStopBatch}
                            setZoomedImageUrl={setZoomedImageUrl}
                            setZoomedImageName={setZoomedImageName}
                            handleDeleteReferenceImage={handleDeleteReferenceImage}
                            downloadSingleImage={downloadSingleImage}
                            getCleanFilename={getCleanFilename}
                            updateProp={updateProp}
                            togglePropInstruction={togglePropInstruction}
                            generateImage={generateImage}
                            handleAddPropManual={handleAddPropManual}
                            handleDeletePropManual={handleDeletePropManual}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'shots' && project && (
                    <ShotsTabAny
                      project={project}
                      setProject={setProject}
                      isImageGenerating={isImageGenerating}
                      isGenerating={isGenerating}
                      generatingVideos={generatingVideos}
                      generationStatuses={generationStatuses}
                      generationErrors={generationErrors}
                      activeZoomedShotIndex={activeZoomedShotIndex}
                      setActiveZoomedShotIndex={setActiveZoomedShotIndex}
                      zoomedPrompt={zoomedPrompt}
                      setZoomedPrompt={setZoomedPrompt}
                      isRefMappingApproved={isRefMappingApproved}
                      isWritingShots={isWritingShots}
                      selectedShots={selectedShots}
                      setSelectedShots={setSelectedShots}
                      selectedShotsCount={selectedShotsCount}
                      eligibleShotsCount={eligibleShotsCount}
                      isBatchRendering={isBatchRendering}
                      videoStatusFilter={videoStatusFilter}
                      setVideoStatusFilter={setVideoStatusFilter}
                      filteredShots={filteredShots}
                      showSituationsModal={showSituationsModal}
                      setShowSituationsModal={setShowSituationsModal}
                      imageSelectorTarget={imageSelectorTarget as any}
                      setImageSelectorTarget={setImageSelectorTarget as any}
                      fileUploadTarget={fileUploadTarget as any}
                      setFileUploadTarget={setFileUploadTarget as any}
                      refFileInputRef={refFileInputRef}
                      handleAddSituation={handleAddSituation}
                      handleDeleteSituation={handleDeleteSituation}
                      handleUpdateSituation={handleUpdateSituation}
                      toggleCharacterInSituation={toggleCharacterInSituation}
                      toggleBackgroundInSituation={toggleBackgroundInSituation}
                      togglePropInSituation={togglePropInSituation}
                      handleAddOfficialBackground={handleAddOfficialBackground}
                      generateCinematicShots={generateCinematicShots}
                      handleLockAndReconfigure={handleLockAndReconfigure}
                      handleSelectAllShots={handleSelectAllShots}
                      handleRenderAllSelectedShots={handleRenderAllSelectedShots}
                      handleRetryFailedShots={handleRetryFailedShots}
                      downloadAllSuccessVideos={downloadAllSuccessVideos}
                      downloadProgress={downloadProgress}
                      autoDownloadVideos={autoDownloadVideos}
                      setAutoDownloadVideos={setAutoDownloadVideos}
                      handleStopBatchRendering={handleStopBatchRendering}
                      generateVideo={generateVideo}
                      downloadSingleVideo={downloadSingleVideo}
                      downloadSingleImage={downloadSingleImage}
                      scriptName={scriptName}
                      setSystemLogs={setSystemLogs}
                      handleDeleteReferenceImage={handleDeleteReferenceImage}
                      updateShot={updateShot}
                      setZoomedImageUrl={setZoomedImageUrl}
                      setZoomedImageName={setZoomedImageName}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status Bar */}
          <footer className="h-10 border-t border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-between px-8 text-[9px] font-mono text-zinc-600 uppercase tracking-widest z-50">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>System Health: Nominal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-700">// Node: VEO-PRD-01</span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 opacity-40" />
                <span>Latency: 42ms</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-400/60">
                <Terminal className="w-3 h-3" />
                <span>Kernel v0.98a-Stable</span>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Generation Overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020203]/90 backdrop-blur-xl"
          >
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute -inset-20 bg-indigo-600/10 blur-[100px] rounded-full group-hover:bg-indigo-600/20 transition-all duration-1000" />

              <div className="w-[600px] p-16 glass-panel rounded-[3rem] border border-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.5)]" />

                <div className="flex flex-col items-center gap-12 text-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/30 animate-[spin_10s_linear_infinite]">
                      <Cpu className="w-10 h-10 text-indigo-400" />
                    </div>
                    <div className="absolute -inset-4 border border-indigo-500/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase font-heading">Synchronizing Production</h2>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[11px] font-mono text-indigo-400/60 uppercase tracking-[0.4em] h-6">{progress.step}</p>
                      {progress.totalShots !== undefined && progress.totalShots > 0 && (
                        <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
                          <span className="text-[10px] font-mono text-zinc-500">PROMPTS:</span>
                          <span className="text-[12px] font-black font-mono text-white">
                            <span className="text-indigo-400">{progress.currentShot}</span> / {progress.totalShots}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full space-y-6">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.percent}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                      />
                    </div>

                    <div className="flex justify-between items-center font-mono text-[10px] font-black uppercase tracking-widest">
                      <span className="text-indigo-400">{progress.percent}%</span>
                      <span className="text-zinc-600">Assembly in progress</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsGenerating(false)}
              className="mt-12 px-10 py-3 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 transition-all active:scale-95"
            >
              Abort Operation
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download All Videos Overlay */}
      <AnimatePresence>
        {downloadProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#020203]/95 backdrop-blur-xl"
          >
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute -inset-20 bg-emerald-600/10 blur-[100px] rounded-full group-hover:bg-emerald-600/20 transition-all duration-1000" />

              <div className="w-[600px] p-16 glass-panel rounded-[3rem] border border-emerald-500/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

                <div className="flex flex-col items-center gap-12 text-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 animate-[pulse_2s_infinite]">
                      <Download className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="absolute -inset-4 border border-emerald-500/10 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  </div>

                  <div className="space-y-4">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase font-heading">
                      Đang Tải Video Về Máy
                    </h2>
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[11px] font-mono text-emerald-400/60 uppercase tracking-[0.2em] h-6 text-center max-w-md truncate">
                        {downloadProgress.step}
                      </p>
                      <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10 flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-500">TIẾN TRÌNH:</span>
                        <span className="text-[12px] font-black font-mono text-white">
                          <span className="text-emerald-400">{downloadProgress.current}</span> / {downloadProgress.total} video
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-6">
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      />
                    </div>

                    <div className="flex justify-between items-center font-mono text-[10px] font-black uppercase tracking-widest">
                      <span className="text-emerald-400">
                        {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                      </span>
                      <span className="text-zinc-600">Đang lưu vào thư mục PC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {zoomedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setZoomedImageUrl(null); setZoomedImageName(null); }}
            className="fixed inset-0 bg-[#020203]/95 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-8 cursor-pointer select-none animate-fade-in"
          >
            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <motion.img
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={zoomedImageUrl}
                alt="Zoomed Asset"
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => { setZoomedImageUrl(null); setZoomedImageName(null); }}
                className="absolute top-4 right-4 p-2 bg-black/60 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => downloadSingleImage(zoomedImageUrl!, zoomedImageName || `zoomed_image_${Date.now()}.jpg`)}
                className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải Xuống
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Lightbox Modal */}
      <AnimatePresence>
        {zoomedVideoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setZoomedVideoUrl(null); setZoomedVideoName(null); setZoomedVideoIndex(null); }}
            className="fixed inset-0 bg-[#020203]/95 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-8 cursor-pointer select-none animate-fade-in"
          >
            <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <motion.video
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                src={zoomedVideoUrl}
                autoPlay
                loop
                controls
                playsInline
                className="max-w-[90vw] max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
              />
              <button
                onClick={() => { setZoomedVideoUrl(null); setZoomedVideoName(null); setZoomedVideoIndex(null); }}
                className="absolute top-4 right-4 p-2 bg-black/60 border border-white/10 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => {
                  const idx = zoomedVideoIndex !== null ? zoomedVideoIndex : (project ? project.shots.findIndex(s => s.videoUrl === zoomedVideoUrl) : -1);
                  if (idx !== -1) {
                    generateVideo(idx);
                    setZoomedVideoUrl(null);
                    setZoomedVideoName(null);
                    setZoomedVideoIndex(null);
                  }
                }}
                disabled={isImageGenerating || isGenerating}
                className="absolute bottom-4 left-4 px-4 py-2 bg-white/10 border border-white/10 text-white hover:bg-indigo-600 hover:border-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
                title="Tạo lại video này"
              >
                <RotateCcw className="w-3.5 h-3.5 animate-pulse" /> Tạo Lại Video
              </button>

              <button
                onClick={() => {
                  if (zoomedVideoIndex !== null) {
                    downloadSingleVideo(zoomedVideoIndex);
                  } else {
                    const idx = project ? project.shots.findIndex(s => s.videoUrl === zoomedVideoUrl) : -1;
                    if (idx !== -1) downloadSingleVideo(idx);
                  }
                }}
                className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 border border-white/10 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-indigo-500 transition-colors shadow-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Tải Xuống
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Folder Picker Dialog */}
      <AnimatePresence>
        {showFolderDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020203]/85 backdrop-blur-md z-[160] flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0c10] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black tracking-wider uppercase text-white font-heading">
                  Cấu hình thư mục lưu ảnh
                </h3>
              </div>

              <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                Vui lòng nhập đường dẫn thư mục tuyệt đối trên máy tính của bạn (để lưu cấu hình phục vụ cho việc tạo video Veo sau này):
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={folderPathInput}
                      onChange={(e) => setFolderPathInput(e.target.value)}
                      placeholder="Ví dụ: C:\VeoProject\Images"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all font-mono pr-8"
                    />
                    {selectedDirectoryHandle && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {dirPermissionGranted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePickDirectory}
                    className="px-3 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 hover:text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Chọn thư mục PC</span>
                  </button>
                </div>
                
                {selectedDirectoryHandle ? (
                  dirPermissionGranted ? (
                    <div className="p-3 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl flex gap-2.5 items-start">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                      <p className="text-[9px] text-zinc-500 leading-normal">
                        <strong className="text-emerald-400">Đã liên kết & ủy quyền:</strong> Thư mục <code className="text-emerald-300">"{selectedDirectoryHandle.name}"</code> đã được chọn và ủy quyền ghi. Ảnh/Video sẽ được lưu trực tiếp vào thư mục này.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/[0.03] border border-amber-500/10 rounded-xl flex flex-col gap-2">
                      <div className="flex gap-2.5 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                        <p className="text-[9px] text-zinc-500 leading-normal">
                          <strong className="text-amber-500">Chưa cấp quyền:</strong> Thư mục <code className="text-amber-300">"{selectedDirectoryHandle.name}"</code> đã liên kết nhưng chưa cấp quyền ghi cho phiên này. Hãy bấm nút dưới đây để cấp quyền trước khi tiếp tục.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const request = await selectedDirectoryHandle.requestPermission({ mode: "readwrite" });
                            setDirPermissionGranted(request === 'granted');
                            if (request === 'granted') {
                              alert("Đã cấp quyền ghi vào thư mục thành công!");
                            }
                          } catch (e: any) {
                            alert(`Lỗi cấp quyền: ${e.message}`);
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 hover:text-amber-300 text-[10px] font-bold transition-all cursor-pointer text-center"
                      >
                        🔑 Cấp quyền ghi thư mục
                      </button>
                    </div>
                  )
                ) : (
                  <div className="p-3 bg-amber-500/[0.03] border border-amber-500/10 rounded-xl flex gap-2.5 items-start">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-zinc-500 leading-normal">
                      <strong className="text-amber-500">Lưu ý:</strong> Sau khi bấm tiếp tục, nếu chưa liên kết thư mục PC, trình duyệt sẽ mở hộp thoại cấp quyền ghi. Hãy chọn đúng thư mục khớp với đường dẫn bạn đã nhập ở trên để lưu ảnh trực tiếp.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFolderDialog(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] font-extrabold uppercase tracking-wider transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmFolder}
                  disabled={!folderPathInput.trim()}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/10"
                >
                  Xác nhận & Chọn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Selector Modal */}
      <AnimatePresence>
        {imageSelectorTarget && project && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#020203]/85 backdrop-blur-md z-[160] flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0c10] border border-white/10 rounded-3xl p-6 max-w-3xl w-full shadow-2xl relative flex flex-col"
              style={{ maxHeight: "90vh" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-wider uppercase text-white font-heading">
                      Chọn ảnh tham chiếu từ thư viện
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {imageSelectorTarget.isMain
                        ? `Thay thế ảnh đại diện chính của ${imageSelectorTarget.type === 'character' ? 'Nhân vật' : imageSelectorTarget.type === 'background' ? 'Bối cảnh' : imageSelectorTarget.type === 'prop' ? 'Đạo cụ' : 'Phân cảnh'} #${imageSelectorTarget.index + 1}`
                        : imageSelectorTarget.refIndex !== undefined 
                          ? `Thay thế ảnh tham chiếu #${imageSelectorTarget.refIndex + 1} của ${imageSelectorTarget.type === 'character' ? 'Nhân vật' : imageSelectorTarget.type === 'background' ? 'Bối cảnh' : imageSelectorTarget.type === 'prop' ? 'Đạo cụ' : 'Phân cảnh'} #${imageSelectorTarget.index + 1}`
                          : `Thêm ảnh tham chiếu mới cho ${imageSelectorTarget.type === 'character' ? 'Nhân vật' : imageSelectorTarget.type === 'background' ? 'Bối cảnh' : imageSelectorTarget.type === 'prop' ? 'Đạo cụ' : 'Phân cảnh'} #${imageSelectorTarget.index + 1}`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setImageSelectorTarget(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs for Category filtering */}
              <div className="flex gap-2 mb-4 bg-black/45 p-1 rounded-xl border border-white/5 w-fit">
                {['all', 'characters', 'backgrounds', 'props', 'shots', 'uploads'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectorCategory(cat as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      selectorCategory === cat
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {cat === 'all' ? 'Tất cả' : cat === 'characters' ? 'Nhân vật' : cat === 'backgrounds' ? 'Bối cảnh' : cat === 'props' ? 'Đạo cụ' : cat === 'shots' ? 'Phân cảnh' : 'Ảnh tải lên'}
                  </button>
                ))}
              </div>

              {/* Image Grid Container */}
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]" style={{ maxHeight: "60vh" }}>
                {filteredSelectorImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-600 gap-2">
                    <ImageIcon className="w-12 h-12 opacity-30" />
                    <span className="text-xs font-mono uppercase tracking-widest">Không tìm thấy ảnh nào trong thư viện</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                    {filteredSelectorImages.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          handleSelectReferenceUrl(
                            imageSelectorTarget.type,
                            imageSelectorTarget.index,
                            img.url,
                            imageSelectorTarget.refIndex,
                            img.name,
                            imageSelectorTarget.isMain
                          );
                          setImageSelectorTarget(null);
                        }}
                        className="group/item relative rounded-xl overflow-hidden bg-black/40 border border-white/5 hover:border-indigo-500/50 cursor-pointer shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col"
                      >
                        <div className="aspect-square bg-zinc-950 overflow-hidden relative">
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-xl text-[9px] font-black text-white uppercase tracking-wider border border-white/10">
                              Chọn ảnh này
                            </span>
                          </div>
                        </div>
                        <div className="p-2 border-t border-white/5 bg-black/25 flex flex-col gap-0.5">
                          <span className="text-[7px] font-mono text-indigo-400 font-extrabold uppercase tracking-widest">{img.type}</span>
                          <span className="text-[10px] text-zinc-300 font-bold truncate leading-tight">{img.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input for PC Uploads */}
      <input
        type="file"
        ref={refFileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleRefFileUploaded}
      />
    </div>
  );
}
