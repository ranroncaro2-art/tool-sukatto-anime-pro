export interface VisualStyle {
  id: string;
  name: string;
  description: string;
  characterSuffix: string;
  backgroundSuffix: string;
}

export const defaultStyles: VisualStyle[] = [
  {
    id: "modern-anime",
    name: "Modern Colored Manga",
    description: "Modern high-quality colored manga style, clean lines, vibrant colors.",
    characterSuffix: "modern colored manga style, high quality, clean lines, vibrant colors",
    backgroundSuffix: "modern colored manga style, cinematic lighting, high quality"
  },
  {
    id: "cinematic-photo",
    name: "Cinematic Realistic",
    description: "Photorealistic cinematic style, high detail, 8k, professional lighting.",
    characterSuffix: "hyper-realistic cinematic photo, 8k, highly detailed skin texture, professional studio lighting",
    backgroundSuffix: "photorealistic cinematic background, 8k resolution, realistic lighting and shadows"
  },
  {
    id: "classic-anime",
    name: "90s Retro Anime",
    description: "Classic 90s hand-drawn anime aesthetic, cel-shaded, nostalgic vibes.",
    characterSuffix: "90s retro anime style, cel-shaded, hand-drawn aesthetic, vintage grain",
    backgroundSuffix: "90s retro anime background, cel-shaded, nostalgic watercolor style"
  }
];
