import { SRTBlock, ScriptLine, Character } from "../types";

export function mergeShortSRTAndScript(
  srtData: SRTBlock[],
  scriptData: ScriptLine[],
  minDuration: number = 2.0,
  maxDuration: number = 10.0
): { srt: SRTBlock[]; script: ScriptLine[] } {
  if (srtData.length === 0 || scriptData.length === 0) {
    return { srt: srtData, script: scriptData };
  }

  const mergedSRT: SRTBlock[] = [];
  const mergedScript: ScriptLine[] = [];

  let currentSRTGroup: SRTBlock[] = [];
  let currentScriptGroup: ScriptLine[] = [];
  let currentGroupDuration = 0;

  const parseTime = (t: string) => {
    const cleaned = t.replace(",", ".");
    const hmsParts = cleaned.split(":");
    if (hmsParts.length < 3) return 0;
    const hours = parseFloat(hmsParts[0]);
    const minutes = parseFloat(hmsParts[1]);
    const seconds = parseFloat(hmsParts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const getDuration = (timeStr: string) => {
    const parts = timeStr.split("-->").map(p => p.trim());
    if (parts.length < 2) return 0;
    const start = parseTime(parts[0]);
    const end = parseTime(parts[1]);
    return Math.max(0, end - start);
  };

  const flushGroup = (srtGroup: SRTBlock[], scriptGroup: ScriptLine[]): { srt: SRTBlock; script: ScriptLine } => {
    if (srtGroup.length === 1) {
      return { srt: srtGroup[0], script: scriptGroup[0] };
    }

    const firstTimeStr = srtGroup[0].time;
    const lastTimeStr = srtGroup[srtGroup.length - 1].time;
    const firstStart = firstTimeStr.split("-->")[0].trim();
    const lastEnd = lastTimeStr.split("-->")[1]?.trim() || firstTimeStr.split("-->")[1]?.trim();
    const mergedTime = `${firstStart} --> ${lastEnd}`;

    const mergedSrtText = srtGroup.map(s => s.text).join("　");

    const uniqueChars: string[] = [];
    scriptGroup.forEach(s => {
      if (s.character && !uniqueChars.includes(s.character)) {
        uniqueChars.push(s.character);
      }
    });
    const mergedChar = uniqueChars.join(" + ") || "Unknown";

    const mergedDialogue = scriptGroup.map(s => {
      if (uniqueChars.length > 1) {
        return `${s.character}: ${s.dialogue}`;
      } else {
        return s.dialogue;
      }
    }).join("　");

    let mergedType = "narration";
    if (scriptGroup.some(s => s.type === "spoken")) mergedType = "spoken";
    else if (scriptGroup.some(s => s.type === "shouted")) mergedType = "shouted";
    else if (scriptGroup.some(s => s.type === "thought")) mergedType = "thought";

    const uniqueEmotions: string[] = [];
    scriptGroup.forEach(s => {
      if (s.emotion && s.emotion !== "neutral" && !uniqueEmotions.includes(s.emotion)) {
        uniqueEmotions.push(s.emotion);
      }
    });
    const mergedEmotion = uniqueEmotions.join(", ") || "neutral";

    return {
      srt: {
        index: srtGroup.length > 1 ? `${srtGroup[0].index}-${srtGroup[srtGroup.length - 1].index}` : srtGroup[0].index,
        time: mergedTime,
        text: mergedSrtText
      },
      script: {
        character: mergedChar,
        dialogue: mergedDialogue,
        type: mergedType as any,
        emotion: mergedEmotion
      }
    };
  };

  for (let i = 0; i < srtData.length; i++) {
    const srt = srtData[i];
    const script = scriptData[i] || { character: "Unknown", dialogue: "", type: "narration" };

    const duration = getDuration(srt.time);

    const isNarration = script.type === "narration";
    const groupHasNarration = currentScriptGroup.length > 0 && currentScriptGroup[0].type === "narration";
    const groupHasDialogue = currentScriptGroup.length > 0 && currentScriptGroup[0].type !== "narration";

    if ((isNarration && groupHasDialogue) || (!isNarration && groupHasNarration)) {
      if (currentSRTGroup.length > 0) {
        const flushed = flushGroup(currentSRTGroup, currentScriptGroup);
        mergedSRT.push(flushed.srt);
        mergedScript.push(flushed.script);
      }
      currentSRTGroup = [srt];
      currentScriptGroup = [script];
      currentGroupDuration = duration;
    } else {
      if (currentSRTGroup.length > 0 && currentGroupDuration + duration > maxDuration) {
        const flushed = flushGroup(currentSRTGroup, currentScriptGroup);
        mergedSRT.push(flushed.srt);
        mergedScript.push(flushed.script);
        currentSRTGroup = [srt];
        currentScriptGroup = [script];
        currentGroupDuration = duration;
      } else {
        currentSRTGroup.push(srt);
        currentScriptGroup.push(script);
        currentGroupDuration += duration;
      }
    }

    if (currentGroupDuration >= minDuration) {
      const flushed = flushGroup(currentSRTGroup, currentScriptGroup);
      mergedSRT.push(flushed.srt);
      mergedScript.push(flushed.script);
      currentSRTGroup = [];
      currentScriptGroup = [];
      currentGroupDuration = 0;
    }
  }

  if (currentSRTGroup.length > 0) {
    const flushed = flushGroup(currentSRTGroup, currentScriptGroup);
    mergedSRT.push(flushed.srt);
    mergedScript.push(flushed.script);
  }

  return { srt: mergedSRT, script: mergedScript };
}

export function parseSRT(content: string): SRTBlock[] {
  // Split by double newlines, but be careful with different line endings
  const blocks = content.trim().split(/\r?\n\s*\r?\n/);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    if (lines.length < 2) return null; // Must at least have index and time
    
    return {
      index: lines[0],
      time: lines[1],
      text: lines.slice(2).join(" ") || "", // Text can be empty
    };
  }).filter((b): b is SRTBlock => b !== null && !!b.index && !!b.time);
}

export function parseScript(content: string): ScriptLine[] {
  let lastCharacter = "Unknown";
  
  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return null;
      
      // Supports standard colon (:), full-width colon (：), and dash (-)
      const match = trimmedLine.match(/^([^:：-]+)[:：-]\s*(.*)$/);
      
      let character = lastCharacter;
      let rawDialogue = trimmedLine;

      if (match) {
        character = match[1].trim();
        rawDialogue = match[2].trim();
        lastCharacter = character;
      }

      const { type, dialogue } = detectDialogueType(rawDialogue);
      const emotion = extractEmotion(dialogue);
      const cleanedDialogue = dialogue.replace(/[\(\{\[（｛［].*?[\)\}\]）｝］]/g, "").trim();
      
      return {
        character,
        dialogue: cleanedDialogue || dialogue,
        emotion: emotion,
        type: type as any
      } as ScriptLine;
    })
    .filter((line): line is ScriptLine => line !== null);
}

function detectDialogueType(text: string): { type: string, dialogue: string } {
  const trimmed = text.trim();
  // Spoken: 「...」
  if (trimmed.startsWith("「") && trimmed.endsWith("」")) {
    return { type: "spoken", dialogue: trimmed.slice(1, -1).trim() };
  }
  // Shouted: ＜...＞ or <...>
  if ((trimmed.startsWith("＜") && trimmed.endsWith("＞")) || (trimmed.startsWith("<") && trimmed.endsWith(">"))) {
    return { type: "shouted", dialogue: trimmed.slice(1, -1).trim() };
  }
  // Thought: （...） or (...)
  if ((trimmed.startsWith("（") && trimmed.endsWith("）")) || (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
    return { type: "thought", dialogue: trimmed.slice(1, -1).trim() };
  }
  // Narration: No brackets
  return { type: "narration", dialogue: text };
}

export function extractEmotion(dialogue: string): string {
  // Supports (), {}, [], and full-width counterparts （）, ｛｝, ［］
  const emotionMatch = dialogue.match(/[\(\{\[（｛［](.*?)[\)\}\]）｝］]/);
  return emotionMatch ? emotionMatch[1] : "neutral";
}

/**
 * Robustly detects characters in a shot description prompt.
 * Avoids:
 * - Matching name substrings of other variant/longer names (e.g. matching "Asami" because of "Asami_Confrontation")
 * - Matching names inside background location names (e.g. "AsamiHome_LivingRoom_Night_1")
 * - Matching names mentioned in negative context (e.g. "Asami is not visible" or "Asami is off-screen")
 */
export function detectCharacters(prompt: string, characters: Character[]): string[] {
  if (!prompt || !characters || characters.length === 0) {
    return [];
  }

  // 1. Remove the background part of the prompt (everything before the first comma)
  // because background names like AsamiHome_LivingRoom_Night_1 contain character names
  let searchPrompt = prompt;
  const firstCommaIdx = prompt.indexOf(',');
  if (firstCommaIdx !== -1) {
    searchPrompt = prompt.substring(firstCommaIdx + 1);
  }

  // 2. Sort characters by name length in descending order to match longer variant names first
  const sortedChars = [...characters].sort((a, b) => b.name.length - a.name.length);

  const matchedNamesWithIndex: { name: string; index: number }[] = [];
  
  // We'll track matched substrings by replacing them with a placeholder in a temp string
  let tempPrompt = searchPrompt;

  for (const char of sortedChars) {
    const name = char.name;
    if (!name) continue;

    // Use regular expression with word boundaries to match exact names
    const escapedName = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');

    let matched = false;
    let matchIndex = -1;

    if (regex.test(tempPrompt)) {
      matched = true;
      matchIndex = searchPrompt.toLowerCase().indexOf(name.toLowerCase());
      // Replace with placeholder in temp string to avoid matching shorter substrings later
      tempPrompt = tempPrompt.replace(regex, ' __MATCHED_CHAR__ ');
    } else if (name.includes('_')) {
      // If the full name with suffix wasn't found, try matching the base name (before the underscore)
      const baseName = name.split('_')[0];
      if (baseName) {
        const escapedBase = baseName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const baseRegex = new RegExp(`\\b${escapedBase}\\b`, 'gi');
        if (baseRegex.test(tempPrompt)) {
          matched = true;
          matchIndex = searchPrompt.toLowerCase().indexOf(baseName.toLowerCase());
          // Replace with placeholder in temp string to avoid matching shorter substrings later
          tempPrompt = tempPrompt.replace(baseRegex, ' __MATCHED_CHAR__ ');
        }
      }
    }

    if (matched) {
      // Check for negative context: e.g. "Name is not visible", "Name is off-screen", etc.
      const checkName = name.includes('_') ? name.split('_')[0] : name;
      const escapedCheckName = checkName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const negativeRegex = new RegExp(`\\b${escapedCheckName}\\b[^.]*?\\b(not visible|not present|invisible|not in the frame|not in frame|off-screen)\\b`, 'i');
      if (negativeRegex.test(searchPrompt)) {
        continue;
      }

      matchedNamesWithIndex.push({ name, index: matchIndex !== -1 ? matchIndex : 999999 });
    }
  }

  // Sort matched characters by their first index of appearance in ascending order
  matchedNamesWithIndex.sort((a, b) => a.index - b.index);

  return matchedNamesWithIndex.map(item => item.name);
}

export function containsCjk(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text);
}

export function formatSecondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return (
    String(h).padStart(2, "0") +
    ":" +
    String(m).padStart(2, "0") +
    ":" +
    String(s).padStart(2, "0") +
    "," +
    String(ms).padStart(2, "0")
  );
}

export function parseTimeToSeconds(timeStr: string): number {
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
}

export function splitLongSubtitleBlock(block: SRTBlock, maxWords: number): SRTBlock[] {
  const text = block.text.trim();
  if (!text) return [block];

  const isCjk = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
  const limit = Math.max(10, maxWords * 3);

  const punctuation = "、。！？，．？！,.:!?：；;";
  const whitespace = " 　\t\r\n";
  const closeBrackets = "」』）)\"']］";

  const segments: string[] = [];
  let current = "";

  for (let idx = 0; idx < text.length; idx++) {
    const c = text[idx];
    current += c;
    if (punctuation.includes(c) || whitespace.includes(c)) {
      // Look ahead for close brackets
      if (idx + 1 < text.length && closeBrackets.includes(text[idx + 1])) {
        current += text[idx + 1];
        idx++;
      }
      segments.push(current);
      current = "";
    }
  }
  if (current) {
    segments.push(current);
  }

  const chunkTexts: string[] = [];
  let currentChunk = "";

  const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

  for (const seg of segments) {
    if (!currentChunk) {
      currentChunk = seg;
    } else {
      const wouldExceed = isCjk 
        ? (currentChunk.length + seg.length > limit)
        : (countWords(currentChunk) + countWords(seg) > maxWords);

      if (wouldExceed) {
        chunkTexts.push(currentChunk.trim());
        currentChunk = seg;
      } else {
        currentChunk += seg;
      }
    }
  }
  if (currentChunk) {
    chunkTexts.push(currentChunk.trim());
  }

  const cleanedChunks = chunkTexts.filter(Boolean);

  if (cleanedChunks.length <= 1) {
    return [block];
  }

  // 2. Generate timing and indices
  const timeParts = block.time.split("-->").map(p => p.trim());
  const startSec = timeParts.length > 0 ? parseTimeToSeconds(timeParts[0]) : 0;
  const endSec = timeParts.length > 1 ? parseTimeToSeconds(timeParts[1]) : startSec + 4;
  const totalDuration = Math.max(0.1, endSec - startSec);
  
  const rawId = parseInt(block.index, 10);
  const origId = rawId >= 1000 ? Math.floor(rawId / 1000) : rawId;

  const totalChars = cleanedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result: SRTBlock[] = [];
  let currentStartSec = startSec;

  const getAlphabetSuffix = (num: number): string => {
    let suffix = "";
    let temp = num;
    while (temp >= 0) {
      suffix = String.fromCharCode((temp % 26) + 65) + suffix;
      temp = Math.floor(temp / 26) - 1;
    }
    return suffix;
  };

  for (let i = 0; i < cleanedChunks.length; i++) {
    const chunkText = cleanedChunks[i];
    const chunkDuration = totalChars > 0 ? totalDuration * (chunkText.length / totalChars) : totalDuration / cleanedChunks.length;
    const chunkEndSec = i === cleanedChunks.length - 1 ? endSec : currentStartSec + chunkDuration;

    result.push({
      index: `${origId}${getAlphabetSuffix(i)}`,
      time: `${formatSecondsToSrtTime(currentStartSec)} --> ${formatSecondsToSrtTime(chunkEndSec)}`,
      text: chunkText
    });
    currentStartSec = chunkEndSec;
  }

  return result;
}

export function getSplitSubDuration(
  sub: { id?: number; index?: string; text: string },
  totalDur: number,
  srtBlocks: { id?: number; index?: string; text: string }[]
): number {
  const getId = (s: { id?: number; index?: string }) => {
    if (s.id !== undefined) return s.id;
    if (s.index !== undefined) return parseInt(s.index, 10);
    return NaN;
  };

  const subId = getId(sub);
  if (isNaN(subId)) return 0;

  const origId = subId >= 1000 ? Math.floor(subId / 1000) : subId;

  const parts = srtBlocks.filter(b => {
    const bId = getId(b);
    return !isNaN(bId) && (bId >= 1000 ? Math.floor(bId / 1000) : bId) === origId;
  });

  const totalChars = parts.reduce((sum, p) => sum + p.text.length, 0);
  if (totalChars === 0) return 0;

  return totalDur * (sub.text.length / totalChars);
}

