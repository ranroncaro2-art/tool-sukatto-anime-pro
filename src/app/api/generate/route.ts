export const dynamic = "force-static";
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, apiKey, model } = body;

    const keyToUse = apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!keyToUse) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 400 });
    }

    const modelToUse = model || 'gemini-2.5-flash';

    if (mode === 'bgm_suggestions') {
      const { sceneMapping } = body;
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

      let resultText = "";
      if (modelToUse.includes("gemini")) {
        const ai = new GoogleGenAI({ apiKey: keyToUse.trim() });
        const res = await ai.models.generateContent({
          model: modelToUse,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json" }
        });
        resultText = res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (modelToUse.includes("gpt")) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keyToUse}` },
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
          })
        });
        const data = await response.json();
        resultText = data.choices?.[0]?.message?.content || "";
      } else if (modelToUse.includes("claude")) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyToUse,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: modelToUse,
            max_tokens: 4000,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        resultText = data.content?.[0]?.text || "";
      }

      if (!resultText) {
        throw new Error("Empty AI response");
      }

      const parsed = JSON.parse(resultText);
      return NextResponse.json(parsed);
      
    } else if (mode === 'regenerate_bgm_prompt') {
      const { genre, instrument, tone } = body;
      const prompt = `Based on the following music attributes, generate a high-quality Suno AI tag-style prompt in English:
Genre: ${genre}
Instrument: ${instrument}
Tone: ${tone}

Output format must be a comma-separated list of lowercase tags (e.g. "melancholic piano, ambient, slow tempo").
Return ONLY the tags string, nothing else.`;

      let resultText = "";
      if (modelToUse.includes("gemini")) {
        const ai = new GoogleGenAI({ apiKey: keyToUse.trim() });
        const res = await ai.models.generateContent({
          model: modelToUse,
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        });
        resultText = res.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else if (modelToUse.includes("gpt")) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${keyToUse}` },
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        resultText = data.choices?.[0]?.message?.content || "";
      } else if (modelToUse.includes("claude")) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": keyToUse,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: modelToUse,
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const data = await response.json();
        resultText = data.content?.[0]?.text || "";
      }

      const cleanPrompt = resultText.trim().replace(/^`+|`+$/g, "");
      return NextResponse.json({ sunoPrompt: cleanPrompt });
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in generate route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
