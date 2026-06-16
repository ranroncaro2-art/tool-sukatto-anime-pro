export interface SRTBlock {
  index: string;
  time: string;
  text: string;
}

export interface ScriptLine {
  character: string;
  dialogue: string;
  emotion?: string;
  type?: 'spoken' | 'shouted' | 'thought' | 'narration';
}

export interface Character {
  name: string;
  appearance: string;
  prompt: string;
  imageUrl?: string;
  mediaId?: string;
  accountId?: string;
  referenceImages?: ShotRefImage[];
  appearanceInstruction?: string;
}

export interface Background {
  location: string;
  angle: string;
  prompt: string;
  imageUrl?: string;
  mediaId?: string;
  accountId?: string;
  referenceImages?: ShotRefImage[];
  appearanceInstruction?: string;
}

export interface ShotRefImage {
  url: string;
  mediaId?: string;
  accountId?: string;
  name?: string;
}

export interface Shot {
  id: number;
  time: string;
  scene: string;
  prompt: string;
  character: string;
  imageUrl?: string;
  videoUrl?: string;
  videoError?: string;
  range?: string;
  referenceImages?: ShotRefImage[];
  mediaId?: string;
  accountId?: string;
  excludedCharacters?: string[];
  excludedBackgrounds?: string[];
}

export interface Situation {
  id: number;
  timeRange: string;
  location: string;
  summary: string;
  characterNames: string;
  backgroundNames: string;
  propNames: string;
}

export interface Prop {
  name: string;
  appearance: string;
  prompt: string;
  imageUrl?: string;
  mediaId?: string;
  accountId?: string;
  referenceImages?: ShotRefImage[];
  appearanceInstruction?: string;
}

export interface BgmSuggestion {
  timeRange: string;
  genre: string;
  instrument: string;
  tone: string;
  sunoPrompt: string;
  description: string;
  audioFile?: string;
  volumeDb?: number;
}

export interface ProjectData {
  characters: Character[];
  backgrounds: Background[];
  props?: Prop[];
  situations: Situation[];
  shots: Shot[];
  bgmSuggestions?: BgmSuggestion[];
  introSubIndex?: string;
  hiddenSrtIndexes?: string[];
  useAiDirector?: boolean;
}

export interface PromptRule {
  id: string;
  text: string;
  enabled: boolean;
}
