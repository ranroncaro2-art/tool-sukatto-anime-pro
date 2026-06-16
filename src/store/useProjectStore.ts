import { useState, useEffect } from "react";
import { BgmSuggestion } from "../types";

class ProjectStore {
  private listeners = new Set<() => void>();
  private state = {
    bgmSuggestions: [] as BgmSuggestion[],
    localBgmFiles: [] as string[],
    isScanning: false,
    isGenerating: false,
  };

  getState() {
    return this.state;
  }

  setState(nextState: Partial<typeof this.state>) {
    this.state = { ...this.state, ...nextState };
    this.listeners.forEach(l => l());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
}

const store = new ProjectStore();

const callAiDirectClientSide = async (
  prompt: string,
  apiKey: string,
  model: string,
  jsonMode = false
): Promise<string> => {
  if (model.includes("gemini")) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
      })
    });
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else if (model.includes("gpt")) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: jsonMode ? { type: "json_object" } : undefined
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } else {
    throw new Error(`Unsupported model for client-side fallback: ${model}`);
  }
};

export const useProjectStore = () => {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    return store.subscribe(() => setState(store.getState()));
  }, []);

  const setBgmSuggestions = (suggestions: BgmSuggestion[]) => {
    store.setState({ bgmSuggestions: suggestions });
  };

  const generateBgmSuggestions = async (
    sceneMapping: any[],
    apiKey: string,
    model: string,
    apiBaseUrl: string
  ): Promise<BgmSuggestion[]> => {
    store.setState({ isGenerating: true });
    try {
      let resultText = "";
      let fetchedOk = false;

      // Try local Next.js API first
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "bgm_suggestions",
            sceneMapping,
            apiKey,
            model
          })
        });

        if (res.ok) {
          const data = await res.json();
          resultText = JSON.stringify(data);
          fetchedOk = true;
        }
      } catch (localErr) {
        console.warn("Local API generate suggestions failed, using client-side direct API fallback:", localErr);
      }

      if (!fetchedOk) {
        // Fallback: direct AI call from client-side
        const prompt = `Bạn là một đạo diễn âm nhạc chuyên nghiệp cho video.
Hãy phân tích kịch bản phân cảnh (sceneMapping) được cung cấp dưới đây và đề xuất phân chia video thành từ 2 đến 5 đoạn nhạc nền (BGM) hợp lý.
Đối với mỗi đoạn nhạc nền, hãy cung cấp các thông tin sau:
1. timeRange: Khoảng thời gian tương ứng (ví dụ: "00:00 - 00:30"). Đảm bảo các khoảng thời gian này liên tục, không chồng chéo và bao phủ toàn bộ video.
2. genre: Thể loại nhạc (ví dụ: "Ambient", "Epic", "Cinematic").
3. instrument: Nhạc cụ chính (ví dụ: "Piano", "Violin", "Synthesizer").
4. tone: Tông nhạc / Cảm xúc đề xuất (ví dụ: "Melancholic", "Tense", "Uplifting").
5. sunoPrompt: Các từ khóa (tag) tiếng Anh chất lượng để người dùng nhập vào Suno AI tạo nhạc nền (ví dụ: "melancholic piano, ambient, slow tempo").
6. description: Lý do/lập luận lựa chọn phân đoạn nhạc đó bằng tiếng Việt.

Kịch bản phân cảnh (sceneMapping):
${JSON.stringify(sceneMapping, null, 2)}

Định dạng đầu ra PHẢI là một đối tượng JSON hợp lệ có cấu trúc chính xác như sau:
{
  "bgmSuggestions": [
    {
      "timeRange": "00:00 - 00:30",
      "genre": "...",
      "instrument": "...",
      "tone": "...",
      "sunoPrompt": "...",
      "description": "..."
    }
  ]
}`;
        resultText = await callAiDirectClientSide(prompt, apiKey, model, true);
      }

      const parsed = JSON.parse(resultText);
      const suggestions = parsed.bgmSuggestions || [];
      store.setState({ bgmSuggestions: suggestions });
      return suggestions;
    } catch (error) {
      console.error("Failed to generate BGM suggestions:", error);
      throw error;
    } finally {
      store.setState({ isGenerating: false });
    }
  };

  const scanLocalBgmFiles = async (
    projectPath: string,
    apiBaseUrl: string
  ): Promise<BgmSuggestion[]> => {
    store.setState({ isScanning: true });
    try {
      const isElectron = typeof window !== "undefined" && (window as any).electronAPI !== undefined;
      let files: string[] = [];

      if (isElectron && (window as any).electronAPI.scanBgm) {
        const data = await (window as any).electronAPI.scanBgm(projectPath);
        if (data.error) {
          throw new Error(data.error);
        }
        files = data.files || [];
      } else {
        const res = await fetch("/api/scan-bgm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectPath })
        });

        if (!res.ok) {
          throw new Error("Failed to scan BGM files");
        }

        const data = await res.json();
        files = data.files || [];
      }
      const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));

      // Auto-pairing logic
      const updated = store.getState().bgmSuggestions.map((sugg, index) => {
        const segmentIndex = index + 1;
        let pairedFile = "";

        // Step 2: Pattern Matching first
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
          // Step 1: Sequential pairing fallback
          pairedFile = sortedFiles[index];
        }

        return {
          ...sugg,
          audioFile: pairedFile
        };
      });

      store.setState({ bgmSuggestions: updated, localBgmFiles: files });
      return updated;
    } catch (error) {
      console.error("Failed to scan local BGM files:", error);
      throw error;
    } finally {
      store.setState({ isScanning: false });
    }
  };

  const regenerateBgmPrompt = async (
    index: number,
    updatedFields: { genre: string; instrument: string; tone: string },
    apiKey: string,
    model: string,
    apiBaseUrl: string
  ): Promise<string> => {
    try {
      let newPrompt = "";
      let fetchedOk = false;

      // Try local Next.js API first
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "regenerate_bgm_prompt",
            genre: updatedFields.genre,
            instrument: updatedFields.instrument,
            tone: updatedFields.tone,
            apiKey,
            model
          })
        });

        if (res.ok) {
          const data = await res.json();
          newPrompt = data.sunoPrompt || "";
          fetchedOk = true;
        }
      } catch (localErr) {
        console.warn("Local API regenerate prompt failed, using client-side direct API fallback:", localErr);
      }

      if (!fetchedOk) {
        // Fallback: direct AI call from client-side
        const prompt = `Based on the following music attributes, generate a high-quality Suno AI tag-style prompt in English:
Genre: ${updatedFields.genre}
Instrument: ${updatedFields.instrument}
Tone: ${updatedFields.tone}

Output format must be a comma-separated list of lowercase tags (e.g. "melancholic piano, ambient, slow tempo").
Return ONLY the tags string, nothing else.`;
        const resultText = await callAiDirectClientSide(prompt, apiKey, model, false);
        newPrompt = resultText.trim().replace(/^`+|`+$/g, "");
      }

      const updated = [...store.getState().bgmSuggestions];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          ...updatedFields,
          sunoPrompt: newPrompt
        };
        store.setState({ bgmSuggestions: updated });
      }
      return newPrompt;
    } catch (error) {
      console.error("Failed to regenerate BGM prompt:", error);
      throw error;
    }
  };

  const runAiDirector = async (
    srtText: string,
    apiKey: string,
    model: string
  ): Promise<string[]> => {
    store.setState({ isGenerating: true });
    try {
      let resultText = "";
      let fetchedOk = false;

      // Try local Next.js API first
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "ai_director",
            srtText,
            apiKey,
            model
          })
        });

        if (res.ok) {
          const data = await res.json();
          resultText = JSON.stringify(data);
          fetchedOk = true;
        }
      } catch (localErr) {
        console.warn("Local API AI Director failed, using client-side direct API fallback:", localErr);
      }

      if (!fetchedOk) {
        // Fallback: direct AI call from client-side
        const prompt = `Bạn là một đạo diễn phim chuyên nghiệp. Nhiệm vụ của bạn là đọc file phụ đề SRT và phân loại các câu phụ đề thành hai loại:
1. Câu thoại của nhân vật hoặc suy nghĩ nội tâm của nhân vật (thường nằm trong ngoặc đơn như (ふu...) hoặc đi kèm tên nhân vật nói). Những câu này CẦN GIỮ LẠI phụ đề và thuyết minh giọng đọc.
2. Câu dẫn chuyện (narrator/narration) mô tả hành động nhân vật, mô tả bối cảnh, mô tả chuyển động của tự nhiên, không phải là lời nói trực tiếp hay suy nghĩ nội tâm của nhân vật. Những câu này CẦN ẨN phụ đề và không cần xuất thuyết minh giọng đọc (bỏ qua tiếng đọc).

Hãy liệt kê các số thứ tự (index) của các câu phụ đề thuộc loại 2 (câu dẫn chuyện) để chúng không xuất hiện trên video xuất ra và tắt giọng thuyết minh của chúng.

Ví dụ:
SRT:
1
00:00:00,000 --> 00:00:03,040
（ふう、今日もノルマ達成だな）
2
00:00:03,320 --> 00:00:08,760
高級外車ポルシェのマカンを走らせながら,豊島はハンドルを軽く叩いた。
3
00:00:09,050 --> 00:00:15,130
フロントガラス của 向こうには、彼が通う高級会員制スポーツジムのネオンが見えている。
4
00:00:15,390 --> 00:00:22,270
（相変わらずジムの駐車場は満車か。併用コインパーキングも１時間千円。高えんだよな……）

Đầu ra JSON đề xuất:
{
  "hiddenSrtIndexes": ["2", "3"]
}

Hãy phân tích toàn bộ phụ đề SRT sau đây và trả về đối tượng JSON chính xác có cấu trúc:
{
  "hiddenSrtIndexes": [...]
}
Không thêm bất kỳ giải thích nào khác ngoài JSON hợp lệ.

SRT cần phân tích:
${srtText}`;
        resultText = await callAiDirectClientSide(prompt, apiKey, model, true);
      }

      const parsed = JSON.parse(resultText);
      const hiddenSrtIndexes = parsed.hiddenSrtIndexes || [];
      return hiddenSrtIndexes;
    } catch (error) {
      console.error("Failed to run AI Director:", error);
      throw error;
    } finally {
      store.setState({ isGenerating: false });
    }
  };

  return {
    ...state,
    setBgmSuggestions,
    generateBgmSuggestions,
    scanLocalBgmFiles,
    regenerateBgmPrompt,
    runAiDirector,
  };
};
