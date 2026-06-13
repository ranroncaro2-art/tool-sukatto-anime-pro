import { VisualStyle } from './styles';

/**
 * ============================================================================
 * PHASE 1
 * GLOBAL CINEMATIC ASSET EXTRACTION
 * ============================================================================
 */

export const generateAssetPrompt = (
  compactData: any[],
  style: VisualStyle,
  activeRulesText?: string
): string => {
  return `
✅ CINEMATIC VISUAL BIBLE EXTRACTION SYSTEM

${
  activeRulesText ? `
============================================================================
🎯 ADDITIONAL SYSTEM RULES & GUIDELINES (ULTRA HIGH PRIORITY)
============================================================================
You MUST strictly follow these additional requirements:
- ${activeRulesText}
` : ""
}

============================================================================
🎯 SYSTEM OBJECTIVE
============================================================================

Analyze the screenplay and build a CINEMATIC VISUAL BIBLE for a grounded Japanese television drama with emotional realism.

The goal is NOT:
- anime fantasy
- stylized idol aesthetics
- exaggerated cinematic glamour

The goal IS:
- believable Japanese domestic realism
- emotional authenticity
- production continuity
- reusable cinematic assets
- sequential storytelling consistency
- subtle emotional atmosphere

Think like:
- production designer
- costume supervisor
- cinematographer
- Japanese TV drama art director

============================================================================
🧠 CHARACTER DESIGN PHILOSOPHY
============================================================================

Characters must feel like REAL PEOPLE from grounded Japanese television dramas.

AVOID:
- perfect anime beauty
- fantasy proportions
- colorful unrealistic hair
- idol aesthetics
- game character energy
- excessive makeup glamour
- exaggerated facial symmetry

PRIORITIZE:
- natural facial asymmetry
- believable Japanese styling
- realistic hair texture
- subtle fatigue
- emotional wear visible through posture
- restrained realism
- believable age details
- realistic fabric behavior
- quiet emotional exhaustion

============================================================================
🧠 JAPANESE SOCIAL REALISM (CRITICAL)
============================================================================

Characters should visually reflect Japanese social behavior.

Prioritize:
- emotional restraint
- subtle posture hierarchy
- polite body language
- indirect emotional expression
- social fatigue
- emotional suppression
- realistic domestic modesty

Avoid:
- aggressive western emotional acting
- theatrical posing
- exaggerated confidence
- overly expressive gestures

============================================================================
🧠 CHARACTER APPEARANCE RULES
============================================================================

1. USE ROMAJI NAMES ONLY

Examples:
- Aoi
- Kenji
- Misaki

2. CONTEXT-AWARE DESIGN

Analyze:
- occupation
- class
- stress level
- social status
- relationship condition
- emotional exhaustion
- living conditions

Then describe:
- age
- hairstyle
- hair texture
- facial structure
- posture
- clothing fit
- accessories
- emotional impression

3. WOMEN WARDROBE RULE

Women age 20-40 may appear:
- elegant
- attractive
- stylish

BUT ONLY if justified by story context.

Examples:
- office worker → refined fashion acceptable
- antagonist → sharper styling acceptable
- housewife under stress → practical realism required
- exhausted mother → emotional wear must show visually

NEVER glamorize suffering unrealistically.

============================================================================
🧠 CHARACTER VARIANT SYSTEM (CRITICAL)
============================================================================

If wardrobe or context changes significantly:
- create separate variants

Format:
- Aoi_Home
- Aoi_Office
- Kenji_Casual
- Misaki_Formal

CRITICAL:
- facial structure MUST remain identical
- hairstyle MUST remain identical
- body proportions MUST remain identical
- ONLY wardrobe/context changes

============================================================================
🧠 CHARACTER CONSISTENCY
============================================================================

Every character variant MUST preserve:
- identical face
- identical hair
- identical age
- identical body proportions
- identical ethnic realism

============================================================================
🧠 CHARACTER SHEET FORMAT
============================================================================

MUST FOLLOW EXACTLY:

Character Sheet of [Name], 3-view reference sheet (front, side, back), full body, white background, modern present-day Japan (year 2026) realism, avoiding retro Shouwa-era appearance, grounded Japanese TV drama realism, ${style.characterSuffix}, [detailed physical description], modern fashionable Japanese clothing, restrained emotional presence, natural standing posture, neutral facial expression, realistic fabric folds, cinematic realism, production design reference sheet.

============================================================================
🧠 ENVIRONMENT DESIGN RULES
============================================================================

1. MULTI-ANGLE COVERAGE

Every location MUST have multiple cinematic angles.

Examples:
- LivingRoom_Night_1
- LivingRoom_Night_2
- Kitchen_Evening_1
- Hallway_Night_1

2. ROOM GEOGRAPHY & MATERIAL CONSISTENCY (CRITICAL FOR CONTINUITY)

Every opposing angle inside the same scene MUST share identical materials, colors, textures, and physical layout descriptions:
- Key objects visible in both angles (e.g., dining table, sofa, shelves) MUST have matching descriptors. Example: if Angle 1 specifies "a smooth dark brown wooden dining table", the opposing Angle 2 MUST also explicitly specify "a smooth dark brown wooden dining table".
- Entrances, windows, and walls must maintain identical architectural properties (e.g., "frosted glass office door", "beige wallpaper").
- Room proportions and structural details must remain identical.

3. LIGHTING & COLOR CONTINUITY

Every opposing angle MUST maintain absolute lighting and atmosphere continuity:
- Identical time of day and weather (e.g., "warm golden afternoon sunlight").
- Identical light sources and direction (e.g., "sunlight streaming from the left-side glass window", "harsh white fluorescent overhead light").
- Same color temperature, practical light fixtures, and emotional atmosphere.
- Reiterate these identical light properties in all angles of the scene to force the image generator to maintain visual continuity.

NO RANDOM LIGHTING, MATERIAL, OR COLOR CHANGES.

4. CONFLICT-BASED MULTI-ANGLE COVERAGE (CRITICAL)

If the screenplay contains a conflict, argument, or emotional pressure between characters:
- You MUST analyze the screenplay context first to identify the Focal Character (the character facing emotional tension, crying, or receiving emotional pressure) and the Opposing Character (the character confronting, demanding, or driving the tension).
- You MUST design distinct background locations with clear faction suffixes matching their roles:
  - Angle_1 (Focal Character Side): Suffix must be "_Protagonist" (e.g., KateiSaibansho_Lobby_Day_1_Protagonist). This describes the physical space behind the focal character's position (what is behind them when looking at them). Focus on symbolic, open, or lonely elements (e.g., window looking out to the city, curtains, or vast empty space).
  - Angle_2 (Opposing Character Side): Suffix must be "_Antagonist" (e.g., KateiSaibansho_Lobby_Day_1_Antagonist). This describes the physical space behind the opposing character's position. Focus on domestic, oppressive, or closed elements (e.g., heavy sofa, television, shut doors, or cluttered kitchen cabinets).
- NEVER output only a single generic location if a conflict exists. Always output BOTH _Protagonist and _Antagonist variants for the same bối cảnh.

⚠️ CRITICAL: ZERO CHARACTER REFERENCE IN BACKGROUND PLATE DESCRIPTIONS
- All background descriptions (both the "angle" and "prompt" fields of backgrounds) MUST describe ONLY empty spaces, walls, furniture, windows, and environment.
- ABSOLUTELY FORBIDDEN to include characters, names of characters (e.g., "Shiori", "Kenta"), or camera descriptions referring to characters (e.g., "behind protagonist", "facing antagonist", "over-the-shoulder shot", "OTS", "POV of Shiori").
- Keep descriptions 100% empty, as if no human has ever entered the room.
- Example GOOD angle: "Facing a large city-view window with sheer white curtains"
- Example BAD angle: "Over-the-shoulder shot from behind protagonist, focusing on the space behind the antagonists"

============================================================================
🧠 PROP DESIGN RULES (CRITICAL)
============================================================================

Identify key physical props or objects that are central to the narrative, characters, or actions in the script (e.g. letters, old diary, teacup, violin, key, envelope, phone).
Only extract props that hold visual importance. Limit list to maximum 5 props. If no key props are present, return an empty array.

For each prop, describe:
- "name": Simple name in English (e.g., "Violin", "Letter", "TeaCup").
- "appearance": A brief physical description of the prop (e.g., "An old brown leather diary with worn edges").
- "prompt": The complete drawing prompt.

PROP SHEET FORMAT (MUST FOLLOW EXACTLY):
Prop Sheet of [Prop_Name], solo item, isolated on white background, modern present-day Japan (year 2026) realism, ${style.backgroundSuffix}, [detailed physical description of the prop], studio product photography, commercial product shot, clean background, sharp focus.

============================================================================
🧠 ENVIRONMENTAL EMOTIONAL STORYTELLING
============================================================================

The environment should quietly reflect emotional deterioration.

Examples:
- untouched dinner
- cooling tea
- clutter accumulation
- unpaid bills
- dim fluorescent lighting
- worn apartment textures
- half-folded laundry
- realistic domestic fatigue
- subtle loneliness

Avoid:
- overly decorative interiors
- unrealistic luxury
- cinematic over-stylization

============================================================================
🧠 BACKGROUND FORMAT
============================================================================

MUST FOLLOW EXACTLY:

Background layout sheet of [Location_Name_X], 4-camera-angle sheet showing 4 different viewpoints/angles (front, reverse, left side, right side) of the same scene in a 2x2 grid layout, empty scene, no people, modern present-day Japan (year 2026) apartment realism, contemporary metropolitan Japanese design, avoiding retro Shouwa-era aesthetics, ${style.backgroundSuffix}, [detailed environment description showing consistent furniture and layout across all 4 angles], realistic practical lighting, subtle emotional atmosphere, believable lived-in details, cinematic depth, production-ready environment design reference sheet.

============================================================================
🧠 STORY SITUATIONS / SCENARIOS EXTRACTION (CRITICAL)
============================================================================

Analyze the entire screenplay chronologically and split it into sequential, major visual "situations" (scenarios / tình huống) to ensure narrative, character, and visual continuity.
A "situation" is defined as a continuous sequence of dialogue lines occurring at the same location, involving the same main characters, and expressing a singular core dramatic event/topic.

For each situation, you MUST output:
- "id": A sequential integer starting from 1.
- "timeRange": The start time to end time of this situation (e.g. "00:00 - 01:15" or "01:16 - 02:40"). If there are no clear times, estimate realistic times starting from 00:00.
- "location": The general location name (e.g., "Kitchen", "Living Room", "School Entrance").
- "summary": A concise Vietnamese summary describing what happens in this situation (e.g., "Cuộc tranh cãi nảy lửa giữa Shiori và mẹ về việc dọn dẹp nhà cửa").
- "characterNames": A comma-separated string listing characters present in this situation.
  ⚠️ CRITICAL CONTINUITY RULE: You MUST write the EXACT character variant name (with its wardrobe/context suffix, e.g. "Shiori_Home", "Teacher_Formal") matching the names extracted in the global "characters" list.
  Costume variants represent distinct reference images (ảnh tham chiếu) for character visuals, NOT just names.
  You MUST pre-populate (sắp xếp sẵn) these precise variant names in the cell/slot in advance so the user only has to approve (duyệt) or edit (edit nếu sai).
- "backgroundNames": A comma-separated string listing background locations used (e.g., "LivingRoom_Night_1_Protagonist, LivingRoom_Night_2_Antagonist"). These must match the locations defined in the "backgrounds" list.
- "propNames": A comma-separated string listing props present in this situation (e.g., "Diary"). These must match the props defined in the "props" list.

============================================================================
⚠️ CHARACTER, BACKGROUND & PROP FIELD DEFINITIONS
============================================================================
You MUST strictly follow these field assignments:
- For "characters":
  - "appearance": A brief physical summary of the character's clothing and basic appearance for this variant (e.g., "17-year-old Japanese high school girl, short black hair, wearing relaxed home pajamas.").
  - "prompt": The complete, highly detailed character sheet drawing prompt, constructed exactly according to the 🧠 CHARACTER SHEET FORMAT, containing all consistency keywords and the style suffix '${style.characterSuffix}'.
- For "backgrounds":
  - "angle": General camera angle description (e.g., "Facing window with sheer curtains, empty background").
  - "prompt": The complete, highly detailed environment plate drawing prompt, constructed exactly according to the 🧠 BACKGROUND FORMAT, containing all details and the style suffix '${style.backgroundSuffix}'.
- For "props":
  - "appearance": A brief physical summary of the prop (e.g., "An old brown leather diary with worn edges.").
  - "prompt": The complete, highly detailed prop drawing prompt, constructed exactly according to the 🧠 PROP SHEET FORMAT, containing the style suffix '${style.backgroundSuffix}'.

============================================================================
⚠️ STRICT OUTPUT RULES
============================================================================

1. VALID JSON ONLY
2. NO markdown formatting
3. NO trailing commas
4. NO line breaks inside JSON values
5. Use single quotes instead of double quotes inside text
6. Return RAW JSON ONLY

============================================================================
INPUT DATA
============================================================================

${JSON.stringify(compactData, null, 2)}

============================================================================
OUTPUT FORMAT
============================================================================

{
  "characters": [
    {
      "name": "Shiori_Home",
      "appearance": "17-year-old Japanese high school girl, short black hair, wearing relaxed home pajamas.",
      "prompt": "Character Sheet of Shiori_Home, 3-view reference sheet (front, side, back), full body, white background, grounded Japanese TV drama realism, ${style.characterSuffix}, 17-year-old Japanese high school girl, short black hair, wearing relaxed home pajamas, neutral facial expression, realistic fabric folds, production design reference sheet."
    },
    {
      "name": "Teacher_Formal",
      "appearance": "45-year-old Japanese male teacher, neat black hair, wire-rimmed glasses, wearing a professional formal dark suit.",
      "prompt": "Character Sheet of Teacher_Formal, 3-view reference sheet (front, side, back), full body, white background, grounded Japanese TV drama realism, ${style.characterSuffix}, 45-year-old Japanese male teacher, neat black hair, wire-rimmed glasses, wearing a professional formal dark suit, neutral facial expression, realistic fabric folds, production design reference sheet."
    }
  ],
  "backgrounds": [
    {
      "location": "LivingRoom_Night_1_Protagonist",
      "angle": "4-camera-angle sheet (front, reverse, left, right) in a 2x2 grid",
      "prompt": "Background layout sheet of LivingRoom_Night_1_Protagonist, 4-camera-angle sheet showing 4 different viewpoints/angles (front, reverse, left side, right side) of the same scene in a 2x2 grid layout, empty scene, no people, grounded Japanese apartment realism, ${style.backgroundSuffix}, dim practical lighting, cooling tea on small wooden table, consistent layout and details across all 4 angles, subtle emotional fatigue, realistic apartment textures, cinematic depth, production-ready environment design reference sheet."
    },
    {
      "location": "LivingRoom_Night_2_Antagonist",
      "angle": "4-camera-angle sheet (front, reverse, left, right) in a 2x2 grid",
      "prompt": "Background layout sheet of LivingRoom_Night_2_Antagonist, 4-camera-angle sheet showing 4 different viewpoints/angles (front, reverse, left side, right side) of the same scene in a 2x2 grid layout, empty scene, no people, grounded Japanese apartment realism, ${style.backgroundSuffix}, harsh white lighting casting sharp shadows, heavy cluttered shelves, consistent layout and details across all 4 angles, oppressive claustrophobic atmosphere, cinematic depth, production-ready environment design reference sheet."
    }
  ],
  "props": [
    {
      "name": "Diary",
      "appearance": "An old brown leather diary with worn edges.",
      "prompt": "Prop Sheet of Diary, solo item, isolated on white background, modern present-day Japan (year 2026) realism, ${style.backgroundSuffix}, an old brown leather diary with worn edges, studio product photography, commercial product shot, clean background, sharp focus."
    }
  ],
  "situations": [
    {
      "id": 1,
      "timeRange": "00:00 - 01:15",
      "location": "Phòng khách",
      "summary": "Cuộc đối thoại căng thẳng giữa Shiori và Giáo viên về kết quả học tập",
      "characterNames": "Shiori_Home, Teacher_Formal",
      "backgroundNames": "LivingRoom_Night_1_Protagonist, LivingRoom_Night_2_Antagonist",
      "propNames": "Diary"
    }
  ]
}
`;
};

/**
 * ============================================================================
 * PHASE 2
 * ============================================================================
 */

export const generateShotPrompt = (
  chunkData: any[],
  assets: {
    characters: string[];
    backgrounds: string[];
  },
  activeRulesText?: string,
  situations?: any[]
): string => {
  return `
✅ CINEMATIC SHOT DIRECTION SYSTEM

${
  situations && situations.length > 0 ? `
============================================================================
🎯 APPROVED STORY SITUATIONS MAP (ULTRA HIGH PRIORITY CONTINUITY GUIDE)
============================================================================
The story has been structured into the following approved chronological situations.
You MUST strictly align your shot direction with these situations. For each dialogue line/shot, 
determine which time range it falls into based on its timestamp, and strictly use the location, characters, 
and backgrounds specified for that situation. Do not introduce characters or locations not defined for that time block.

${JSON.stringify(situations, null, 2)}
` : ""
}

${activeRulesText ? `
============================================================================
🎯 ADDITIONAL SYSTEM RULES & GUIDELINES (ULTRA HIGH PRIORITY)
============================================================================
You MUST strictly follow these additional requirements:
- ${activeRulesText}
` : ""}

============================================================================
🎯 SYSTEM OBJECTIVE
============================================================================

Act as:
- film director
- cinematographer
- storyboard supervisor
- emotional visual storyteller
- Japanese TV drama director

Generate CINEMATIC SHOT PROMPTS for every dialogue line.

The goal is:
- emotional progression
- cinematic continuity
- believable Japanese social realism
- restrained dramatic tension
- realistic behavioral acting

NOT:
- flashy cinematic overload
- music video aesthetics
- exaggerated western drama

============================================================================
🧠 SCENE MEMORY SYSTEM (CRITICAL)
============================================================================

Every shot exists inside an emotional progression.

You MUST maintain awareness of:
- previous emotional damage
- tension escalation
- power imbalance
- emotional exhaustion
- camera progression
- pacing evolution

Every scene should evolve through emotional stages.

Examples:
1. restrained discomfort
2. passive tension
3. emotional pressure
4. humiliation
5. emotional fracture
6. reversal
7. catharsis

Each shot MUST feel connected to the previous emotional state.

============================================================================
🧠 SHOT PURPOSE SYSTEM (CRITICAL)
============================================================================

Every shot MUST have ONE dominant emotional purpose.

Examples:
- emotional pressure
- humiliation
- silent accusation
- emotional withdrawal
- emotional collapse
- realization
- dominance
- shame isolation
- emotional exhaustion
- reversal

Camera language and blocking MUST support this PRIMARY purpose.

DO NOT overload shots with multiple competing emotional ideas.

============================================================================
🧠 JAPANESE SOCIAL REALISM
============================================================================

Prioritize:
- emotional suppression
- indirect confrontation
- passive aggression
- restrained delivery
- forced politeness
- uncomfortable silence
- subtle humiliation
- social hierarchy
- emotional restraint

Avoid:
- theatrical screaming
- exaggerated emotional acting
- western confrontation energy
- melodramatic posing

============================================================================
🧠 CHARACTER PRESENCE RULES
============================================================================

1. STRICT CHARACTER LIMITS

- ONLY include explicitly named characters
- ABSOLUTELY NO extras
- MAXIMUM 2 characters per shot
- Strongly prefer SINGLE CHARACTER SHOTS

2. CHARACTER FIELD RULE

Every visible character MUST appear in:
"character" (a comma-separated string)

CRITICAL: In the comma-separated string, you MUST list the primary/active character of the shot first.
- The primary character is the one performing the main action, speaking, reacting, or who is the focal point of the camera in the shot.
- The secondary character (e.g. listener, target of speech, or the shoulder character in OTS shots) MUST be listed second.

Examples:
- "Aoi_Home"
- "Aoi_Home, Kenji_Casual" (with Aoi_Home being the main active character)
- "Kenji_Casual, Aoi_Home" (with Kenji_Casual being the main active character)

3. FULL VARIANT NAMES ONLY

NEVER shorten character names.

BAD:
- Aoi looks away

GOOD:
- Aoi_Home looks away

4. FACTION-BACKGROUND ALIGNMENT (CRITICAL)

You MUST map the "scene" field of each shot to the correct faction's background plate generated in Phase 1:
- If a shot focuses on or is from the perspective of the Protagonist (e.g., Aoi), you MUST assign the protagonist-side background (e.g., "LivingRoom_Night_1_Protagonist") in the "scene" field.
- If a shot focuses on or is from the perspective of the Antagonist (e.g., Kenji), you MUST assign the antagonist-side background (e.g., "LivingRoom_Night_2_Antagonist") in the "scene" field.
- The description in "prompt" must match this camera perspective.

============================================================================
============================================================================
🧠 SHOT COVERAGE RHYTHM & OTS DIVERSITY
============================================================================

1. DIVERSE OVER-THE-SHOULDER (OTS) VARIATIONS

NEVER repeat the exact same static OTS shot scale or angle across multiple shots. You MUST actively vary the framing, distance, and behavior of the character whose shoulder is in the foreground:
- Tight OTS (Chặt): High emotional proximity. The foreground shoulder is very close, creating a tight framing of the target character. (e.g., "tight over-the-shoulder shot from behind Shiori_Home, her dark hair slightly out of focus...")
- Wide OTS (Góc rộng): Spatial context. Frame a wider angle showing the room layout and the distance between characters. (e.g., "wide over-the-shoulder shot from behind Kenta_Casual, showing the space between them and the room environment...")
- Active Shoulder OTS (Nhân vật kê vai có biểu cảm/hành động): The character in the foreground (whose shoulder we look over) is NOT a passive statue. They MUST have micro-behaviors, gestures, or head turns:
  - Examples: "over-the-shoulder shot from behind Kenta_Casual who is tilting his head in silent anger...", "over-the-shoulder shot from behind Shiori_Home, her shoulder tensing up as she slightly turns her profile view..."
- Alternate OTS Sides: Ensure you switch sides periodically (looking over character A's shoulder, then over character B's shoulder) to reflect the conversational ping-pong dynamics naturally.

2. SHOT SCALES & COMPOSITION VARIETY

Prioritize a rich mix of:
- isolated reaction shots (Medium Close-Up, Close-Up)
- listener-focused reaction shots
- wider environmental shots showing the emotional distance (Wide Shot, Medium Wide)
- asymmetrical conversational rhythm

Avoid repetitive:
- shot scales (e.g., executing 5 consecutive tight OTS shots of the same character is strictly forbidden)
- symmetrical dialogue coverage
- constant emotional intensity

============================================================================
🧠 CAMERA LANGUAGE RULES
============================================================================

IMPORTANT:
Each shot should contain ONLY:
- 1 dominant visual idea
- maximum 2 cinematic modifiers

GOOD:
- static compressed isolation framing
- handheld emotional instability
- restrained medium close-up

BAD:
- handheld 85mm asymmetrical shallow DOF negative space doorway framing all together

Choose simplicity over cinematic overload.

============================================================================
🧠 CAMERA EMOTION RULES
============================================================================

CALM:
- stable framing
- balanced composition
- softer visual energy

PRESSURE:
- compressed framing
- slight instability
- subtle off-center balance

HUMILIATION:
- static oppressive framing
- negative space
- emotional isolation

EMOTIONAL COLLAPSE:
- stillness
- visual emptiness
- exhausted framing

============================================================================
🧠 BLOCKING & STAGING
============================================================================

Avoid meaningless movement.

HOWEVER:
emotional stillness and uncomfortable silence are strongly encouraged.

Characters may:
- avoid eye contact
- slowly withdraw
- remain frozen under pressure
- sit in defeated silence
- hesitate before speaking
- maintain social politeness while emotionally collapsing

============================================================================
🧠 ENVIRONMENTAL STORYTELLING
============================================================================

Use objects emotionally:
- untouched dinner
- cooling tea
- salary envelope
- half-finished chores
- apartment silence
- fluorescent hum
- clutter accumulation

Environment should quietly reflect emotional deterioration.

============================================================================
🧠 DIALOGUE RULES
============================================================================

1. USE EXACT JAPANESE

Never translate dialogue.

2. SPOKEN DIALOGUE

If enclosed in:
- 「 」
- ＜ ＞

Then:
- remove brackets
- shorten to under 25 Japanese characters

Format naturally like:

- Quiet restrained Japanese delivery: '...'
- Soft exhausted Japanese delivery: '...'
- Cold controlled Japanese tone: '...'

3. INNER THOUGHTS

If NOT enclosed in brackets:
- lips remain closed
- character is NOT speaking

Format:
- Inner thought, lips firmly closed.

4. PREVENT SUBTITLES

ALWAYS ADD:
- NO text on screen
- NO subtitles
- NO typography

============================================================================
🧠 PERFORMANCE RULES
============================================================================

Characters must feel physically alive.

Examples:
- subtle blinking
- interrupted breathing
- grip tightening
- posture collapse
- rubbing fingers
- shifting weight
- forced smile fading
- restrained swallowing
- avoiding eye contact

Avoid theatrical acting.

============================================================================
🧠 EDITING RHYTHM LOGIC
============================================================================

- Hold reaction shots longer after emotional damage
- Delay cuts during humiliation
- Use silence before reversals
- Prioritize listener reactions
- Avoid symmetrical pacing
- Emotional escalation should evolve gradually

============================================================================
🎬 SHOT PROMPT FORMAT
============================================================================

[Specific_Background_Name_From_Global_Assets_With_Faction_Suffix], [Current emotional stage and shot purpose]. [Character blocking and physical behavior]. [Natural Japanese dialogue behavior OR inner thought rule]. [Micro-behavior and emotional subtext]. [Environmental emotional interaction]. STRICTLY ONLY specified characters, NO extra people. NO text on screen, NO subtitles, clean frame. Camera: [single dominant cinematic idea, framing behavior, lighting tone, emotional mood].

============================================================================
⚠️ STRICT JSON RULES
============================================================================

1. VALID JSON ONLY
2. NO markdown formatting
3. NO trailing commas
4. NO line breaks inside JSON values
5. Use single quotes inside text
6. Return RAW JSON ONLY

============================================================================
GLOBAL ASSETS
============================================================================

Characters:
${JSON.stringify(assets.characters)}

Backgrounds:
${JSON.stringify(assets.backgrounds)}

============================================================================
INPUT DATA
============================================================================

${JSON.stringify(chunkData, null, 2)}

============================================================================
OUTPUT FORMAT
============================================================================

{
  "shots": [
    {
      "id": 1,
      "time": "00:00:00,000",
      "scene_stage": "humiliation",
      "shot_purpose": "emotional withdrawal",
      "tension_level": 7,
      "character": "Aoi_Home",
      "scene": "LivingRoom_Night_1_Protagonist",
      "prompt": "LivingRoom_Night_1_Protagonist, Aoi_Home sits quietly..."
    }
  ]
}
`;
};

/**
 * ============================================================================
 * PHASE 3
 * PROJECT LOGIC
 * ============================================================================
 */

export const generateProjectPrompt = (
  mergedData: any[],
  maxDuration: number
): string => {
  return `
✅ CINEMATIC PROJECT LOGIC SYSTEM

============================================================================
🎯 PROJECT TYPE
============================================================================

Grounded Japanese television drama with:
- emotional realism
- restrained cinematic tension
- Japanese social behavior realism
- domestic emotional storytelling
- cinematic continuity

============================================================================
🎯 PROJECT DIRECTING PHILOSOPHY
============================================================================

The project should feel like:
- Japanese revenge drama
- grounded Netflix relationship drama
- emotional TV Asahi melodrama
- realistic live-action manga adaptation

NOT:
- flashy anime spectacle
- western overacting
- hyper-cinematic music video editing

============================================================================
🧠 GLOBAL EMOTIONAL ARC
============================================================================

The entire story should emotionally progress through:

1. emotional restraint
2. passive discomfort
3. pressure accumulation
4. humiliation
5. emotional fracture
6. reversal
7. catharsis

============================================================================
🧠 CINEMATIC EVOLUTION
============================================================================

As tension escalates:
- framing becomes tighter
- emotional isolation increases
- pacing becomes more uncomfortable
- reaction shots become longer
- silence becomes heavier

============================================================================
🧠 CHARACTER PERFORMANCE PHILOSOPHY
============================================================================

Characters should:
- suppress emotions before exploding
- maintain social politeness under tension
- communicate through behavior more than dialogue
- emotionally deteriorate gradually

============================================================================
🧠 ENVIRONMENTAL STORYTELLING
============================================================================

The environment should subtly decay emotionally over time through:
- clutter
- lighting fatigue
- silence
- unfinished domestic details
- emotional emptiness

============================================================================
TARGET DURATION
============================================================================

${maxDuration} seconds

============================================================================
PROJECT DATA
============================================================================

${JSON.stringify(mergedData, null, 2)}
`;
};

export const generateThumbnailAnalysisPrompt = (storyText: string, titlesText: string): string => {
  return `
# CÔNG CỤ TẠO ẢNH THU NHỎ CHO MANGA NHẬT BẢN CÓ TỶ LỆ NHẤN CAO (PHIÊN BẢN CAO CẤP)

Bạn là một nhà thiết kế ảnh thu nhỏ chuyên nghiệp cho YouTube về manga Nhật Bản, chuyên về:
* Ảnh thu nhỏ trả thù Sukatto
* Ảnh thu nhỏ đảo ngược tình thế
* Ảnh thu nhỏ cao trào cảm xúc
* Ảnh thu nhỏ tiết lộ danh tính bí mật
* Ảnh thu nhỏ từ nhục nhã đến thống trị
* Ảnh thu nhỏ phim truyền hình Nhật Bản
* Ảnh thu nhỏ cảm xúc có tỷ lệ nhấp chuột cao
* Ảnh thu nhỏ đối đầu chia màn hình
* Ảnh thu nhỏ dễ đọc trên thiết bị di động

Nhiệm vụ của bạn:

Người dùng sẽ cung cấp ở cuối yêu cầu này:
* 3 tựa phim YouTube tiếng Nhật
* 1 câu chuyện/kịch bản hoàn chỉnh

Bạn phải phân tích sâu sắc:
* Cấu trúc câu chuyện
* Hành trình cảm xúc của nhân vật chính
* Cảnh nhục nhã
* Khoảnh khắc đảo ngược
* Sự thật ẩn giấu
* Cảnh cao trào cảm xúc
* Sự sụp đổ của nhân vật phản diện
* Căng thẳng trong mối quan hệ
* Khoảnh khắc đối đầu mạnh mẽ nhất
* Khoảnh khắc gây sốc cảm xúc cao nhất
* Khoảnh khắc trả thù thỏa mãn nhất

Sau đó tạo ra:
BA ẢNH THU NHỎ RIÊNG BIỆT Các gợi ý tạo ảnh thu nhỏ (3 distinct thumbnail versions in JSON format).
Mỗi ảnh thu nhỏ phải tương ứng với MỘT tiêu đề cụ thể theo thứ tự:
* Version 1 ứng với Tiêu đề 1 (Focus: Sự sỉ nhục, nỗi đau tinh thần) -> Cảm xúc: "Họ đã đối xử với người này thật tệ hại."
* Version 2 ứng với Tiêu đề 2 (Focus: Sự thật gây sốc được hé lộ, danh tính bí mật) -> Cảm xúc: "Khoan… Họ thực sự là AI?"
* Version 3 ứng với Tiêu đề 3 (Focus: Sự sụp đổ của kẻ phản diện, sự hối hận) -> Cảm xúc: "Họ đã hoàn toàn thất bại."

Mỗi phiên bản ảnh thu nhỏ phải mang lại cảm giác:
* khác biệt về mặt hình ảnh
* khác biệt về mặt cảm xúc
* tập trung vào các điểm nhấn cảm xúc khác nhau
* tối ưu hóa tỷ lệ nhấp chuột (CTR) tối đa
* dễ đọc trên thiết bị di động
trong khi vẫn trung thực với CÙNG một câu chuyện.

---

# QUY TẮC VỀ CẤU TRÚC ẢNH THU NHỎ
Bố cục PHẢI sử dụng:
CẤU TRÚC CHIA MÀN HÌNH ẤN TƯỢNG (SPLIT-SCREEN).

Sự phân chia PHẢI thể hiện rõ ràng hai thế giới đối lập:
TRẠNG THÁI BAN ĐẦU vs TRẠNG THÁI ĐẢO NGƯỢC
YẾU ĐUỐI vs MẠNH MẼ
BỊ NHỤC NHƯỢC vs ÁP ĐẢO

Bố cục phân chia nên tạo cảm giác:
kịch tính
bùng nổ cảm xúc

⚠️ TUYỆT ĐỐI KHÔNG DÙNG NHÃN CHỮ TIẾNG ANH (BEFORE, AFTER, v.v.):
Không được phép sinh ra hoặc mô tả các từ tiếng Anh như "BEFORE", "AFTER", "PREVIOUS", "NEXT", "V1", "V2", "LEFT", "RIGHT", "panel" hoặc bất kỳ văn bản/nhãn chữ Latinh nào khác ở góc hình hay trên toàn bộ bức ảnh. Sự tương phản TRƯỚC và SAU chỉ được thể hiện bằng hình ảnh (biểu cảm khóc/cười, tư thế chịu đựng/thống trị, ánh sáng ấm/lạnh, bối cảnh nghèo/giàu). Tuyệt đối KHÔNG viết nhãn chữ so sánh!

---

# BÊN PHẢI = TRẠNG THÁI BAN ĐẦU (STARTING CONFLICT - BÊN PHẢI)
Thể hiện:
* Phe phản diện thể hiện sự kiêu ngạo tột cùng, nói những câu nói độc địa hoặc có hành động thô bạo, hạ nhục nhân vật chính. Nhân vật chính im lặng chịu nhịn, cúi đầu nhẫn nhục hoặc nói câu vâng lời cam chịu, hoặc có bóng mây nội tâm lo lắng, kiềm chế.
* Tương tác vật lý: Phe phản diện rướn người hung hăng, chỉ tay ra lệnh hoặc chế giễu áp sát; nhân vật chính đứng chịu nhịn, biểu cảm buồn bã hoặc cúi đầu cam chịu, tạo độ tương phản động lực rõ ràng.
* Thoại: Phải có đủ 2 yếu tố thoại ở bên này: \`villainBubble\` (thoại mắng mỏ hung hăng chủ đạo của phản diện) và \`heroResponseBubble\` (thoại cam chịu nhẫn nhịn hoặc bóng mây nội tâm phụ của nhân vật chính).

Tâm trạng:
* tối tăm hơn
* ấm áp hơn
* căng thẳng
* ngột ngạt
* đau đớn về mặt cảm xúc

Ánh sáng:
* màu cam đậm
* bóng đỏ
* tông màu ấm áp kịch tính
* độ tương phản cao hơn

---

# BÊN TRÁI = TRẠNG THÁI SAU ĐẢO NGƯỢC (RESOLUTION CONFRONTATION - BÊN TRÁI)
Thể hiện:
* Khoảnh khắc Phe chính diện / nhân vật chính nói hoặc hành động phản đòn chốt hạ, vạch trần bộ mặt thật của phản diện, khiến hắn rơi vào trạng thái sợ hãi cực độ, sụp đổ tinh thần hoàn toàn.
* ⚠️ TUYỆT ĐỐI NGHIÊM CẤM TƯ THẾ ĐỨNG NHÌN VÔ HỒN VÀO CAMERA (ảnh thẻ). Các nhân vật phải tương tác động lực trực tiếp với nhau trong không gian 3D:
  - Nhân vật chính (Hero) phải nghiêng người dũng mãnh, chỉ tay đanh thép cáo buộc hoặc giơ bằng chứng (điện thoại, hợp đồng, tài liệu) hướng thẳng về phía phản diện. Thần thái của Hero phải tự tin, điềm tĩnh thống trị, hoặc nở một nụ cười đắc thắng đanh thép hướng vào phản diện.
  - Nhân vật phản diện (Villain) phải còng lưng cowering, quỳ sụp xuống ôm đầu tuyệt vọng, hoặc ngã ngửa ra sau hoảng loạn, mồ hôi vã ra như mưa, mắt trợn trừng kinh hãi nhìn chằm chằm vào Hero hoặc bằng chứng.
* Thoại: Phải có đủ 2 yếu tố thoại ở bên này: \`heroBubble\` (thoại kết liễu đanh thép chủ đạo của nhân vật chính) và \`villainReactionBubble\` (thoại phụ run sợ hoảng hốt kiểu "C-Cái gì?!", "K-Không thể nào..." của phản diện).

Tâm trạng:
* Sáng sủa hơn
* Mát mẻ hơn
* Sạch sẽ hơn
* Chiến thắng
* Thỏa mãn về mặt cảm xúc

Ánh sáng:
* Ánh sáng trắng mát mẻ
* Điểm nhấn màu xanh lam
* Độ rõ nét cao hơn
* Độ tương phản rõ ràng hơn

---

# QUY TẮC NHÂN VẬT CHÍNH (QUAN TRỌNG)
NHÂN VẬT CHÍNH phải nổi bật rõ ràng trên hình thu nhỏ.
Khán giả phải hiểu ngay lập tức:
“ĐÂY là nhân vật chính.”

Nhân vật chính phải trở thành:
* trung tâm cảm xúc
* điểm nhấn thị giác
* tiêu điểm khuôn mặt mạnh nhất
* yếu tố đáng nhớ nhất

Nhân vật chính nên:
* xuất hiện gần máy quay nhất
* nhận được sự nhấn mạnh thị giác mạnh nhất
* vẫn nổi bật ngay cả khi có nhiều nhân vật khác

Tránh:
* bố cục nhóm
* cân bằng thị giác đồng đều
* nhân vật chính bị che khuất trong nền
* nhân vật chính nhỏ

---

# QUY TẮC KÍCH THƯỚC NHÂN VẬT
Nhân vật PHẢI chiếm:
khoảng 1/2 đến 2/3 chiều cao hình thu nhỏ.

Nhân vật nên xuất hiện:
* cường điệu cảm xúc
* cận cảnh hoặc cận cảnh trung bình
* dễ đọc trên thiết bị di động
* nổi bật về mặt thị giác
Tránh: khoảng trống quá nhiều

---

# QUY TẮC TƯƠNG TÁC NHÂN VẬT (RẤT QUAN TRỌNG)
Hình thu nhỏ PHẢI tạo cảm giác:
“Một cuộc đối đầu trong manga được đóng băng ở khoảnh khắc cảm xúc cao trào.”
Các nhân vật PHẢI tương tác tích cực.

KHÔNG:
* Chân dung riêng lẻ
* Tư thế tạo dáng rời rạc
* Đứng im lặng không biểu lộ cảm xúc
* nhân vật không được nhìn vào ống kính như đang chụp ảnh.

Các nhân vật PHẢI tương tác thông qua:
* Giao tiếp bằng mắt
* la hét
* Tranh cãi
* Chỉ trỏ
* Chế nhạo
* Phơi bày bằng chứng
* Suy sụp tinh thần
* Tư thế hung hăng
* Ngôn ngữ cơ thể thể hiện sự thống trị

Nhân vật chính:
* Thanh lịch
* Uy quyền
* Mạnh mẽ hơn về mặt thị giác
* Bình tĩnh về mặt cảm xúc
* Dáng đứng thẳng
* Sự thống trị điềm tĩnh
* Nụ cười tự tin
* Sự tự tin lạnh lùng
* Sự vượt trội về mặt cảm xúc
* Sự thỏa mãn khi trả thù

Khán giả phải nhận ra ngay lập tức:
“Đây là CÙNG một người trước và sau.”

---

# QUY TẮC BIẾN ĐỔI NHÂN VẬT PHẢN DIỆN
## TRẠNG THÁI PHẢN DIỆN BAN ĐẦU (RIGHT SIDE)
Ngoại hình/Biểu cảm:
* Kiêu ngạo
* Hung hăng
* Áp đặt
* Kiểm soát
* Chế nhạo
* Cười nhếch mép
* Khinh miệt
* Trêu chọc
* Sự vượt trội. Sự vượt trội

Ngôn ngữ cơ thể:
* chỉ tay
* nghiêng người một cách hung hăng
* tư thế la hét
* xâm phạm không gian cá nhân của nhân vật chính

## PHẢN DIỆN SỤP ĐỔ (LEFT SIDE)
Ngoại hình/Biểu cảm:
* đổ mồ hôi
* hoảng loạn
* suy sụp tinh thần
* sốc
* sợ hãi
* không tin vào mắt mình. 
* hối hận
* xấu hổ
* hoảng sợ
* mặt tối sầm
* làm hành động gì đó trong run sợ

Ngôn ngữ cơ thể:
* run rẩy
* quỳ xuống
* ngã ngửa ra sau
* đứng chết lặng vì sốc
* tư thế xin lỗi tuyệt vọng

---

# QUY TẮC VỀ BỐI CẢNH DỰA TRÊN CÂU CHUYỆN
Bối cảnh PHẢI được lấy trực tiếp từ các cảnh trong câu chuyện.
Bối cảnh CHỈ tồn tại để hỗ trợ việc kể chuyện bằng cảm xúc.
Phông nền cần truyền tải ngay lập tức:
* Nơi xảy ra xung đột
* Bối cảnh xã hội
* Động lực mối quan hệ
* Bầu không khí cảm xúc

## VÍ DỤ PHÔNG NỀN BAN ĐẦU (RIGHT SIDE)
* Bếp căn hộ
* Phòng làm việc cá nhân
* Lớp học
* Phòng ăn gia đình
* Nơi làm việc
* Hành lang trường học
* Cửa hàng tiện lợi
* Hành lang bệnh viện
Đặc trưng của phông nền: Bối cảnh chỉ vẽ đơn giản. Mang tone màu sáng – hơi màu be sáng 1 chút.

## VÍ DỤ PHÔNG NỀN SAU ĐẢO NGƯỢC (LEFT SIDE)
* Văn phòng giám đốc điều hành
* Phòng họp hội đồng quản trị
* Sảnh chờ sang trọng
* Phòng xử án
* Môi trường quyền lực
* Phòng hội nghị công ty
* Địa điểm công khai

---

# QUY TẮC LÀM MỜ PHÔNG NỀN (RẤT QUAN TRỌNG)
Phông nền PHẢI:
* Hơi mờ
* Làm mềm
* Giảm chi tiết
* Hình ảnh phụ

Mục đích:
* Tập trung vào nhân vật
* Cải thiện khả năng đọc trên thiết bị di động
* Nhấn mạnh biểu cảm khuôn mặt
* Nhấn mạnh bong bóng thoại
* Tránh rối mắt

Các yếu tố sắc nét nhất là điều BẮT BUỘC:
1. Khuôn mặt nhân vật chính
2. Biểu cảm cảm xúc
3. Văn bản thu hút sự chú ý ở giữa
4. Bong bóng thoại
(KHÔNG phải nền. Tránh cảnh quan quá chi tiết, nội thất rối mắt, bố cục hình nền).

---

# QUY TẮC VĂN BẢN Ở GIỮA (PHONG CÁCH ĐẶC TRƯNG)
Văn bản thu hút sự chú ý lớn ở giữa PHẢI xuất hiện bên trong:
HỘP CHỮ NHẬT DỌC CAO.

Bảng văn bản dọc nên:
* Chiếm gần hết chiều cao của hình thu nhỏ
* Nằm chính giữa hai phía TRƯỚC và SAU
* Chồng lên cả hai thế giới cảm xúc
* Chồng một phần lên các nhân vật
* Chiều rộng bảng: khoảng 10%–20% chiều rộng hình thu nhỏ.

## KIỂU NỀN BẢNG TRUNG TÂM
Bảng dọc nên sử dụng:
* nền đen
* chuyển màu đỏ đậm
* họa tiết manga
* họa tiết grunge tinh tế
* hào quang từ đen sang đỏ
* hiệu ứng đường tốc độ
* độ tương phản mạnh mẽ

---

# QUY TẮC VĂN BẢN TRUNG TÂM (YẾU TỐ QUAN TRỌNG NHẤT CỦA BẢNG TRUNG TÂM)
Văn bản tiếng Nhật dọc cỡ lớn PHẢI xuất phát từ TIÊU ĐỀ CỦA NGƯỜI DÙNG.
Văn bản phải trở thành: MỘT CÂU MÓC KÍCH THÍCH BẰNG TIẾNG NHẬT GÂY SỐC HOÀN CHỈNH.

⚠️ QUY TẮC NGẮT DÒNG CHO TIÊU ĐỀ/VĂN BẢN DỌC Ở GIỮA (CENTER HOOK):
- Đối với câu văn tiếng Nhật dọc cỡ lớn ở giữa (centerHook.fullText), bạn phải chủ động NGẮT DÒNG bằng ký tự xuống dòng "\n" trong chuỗi JSON để tối ưu hóa bố cục dọc.
- Phân tách câu thành 2 đến 3 dòng ngắn gọn, mỗi dòng khoảng 6-12 ký tự Nhật Bản để đảm bảo chữ to rõ ràng, không bị ngắt dòng lung tung.
- Ví dụ: Thay vì viết một chuỗi dài "俺名義の家から追い出した元夫が土下座号泣", hãy phân tách thành: "俺名義の家から\n追い出した元夫が\n土下座号泣".

Câu văn cần thể hiện:
* Có đối tượng nhân vật phản diện đã làm điều gì gây hấn, gây sốc cho nhân vật chính.
* Cú ngoặt cảm xúc mạnh mẽ
* Sự tiết lộ lớn nhất
* Yếu tố gây tò mò cao nhất
* Sự trả thù mãn nhãn nhất
* Khoảnh khắc gây sốc nhất trong câu chuyện

## KIỂU CHỮ Ở GIỮA
Câu mở đầu ở giữa PHẢI:
* Xuất hiện theo chiều dọc
* Chiếm ưu thế trong bố cục trung tâm
* Chồng lấn mạnh đường phân chia
* Trở thành điểm nhấn thị giác chính
* Dễ đọc.
* Cụm từ chính cần nổi bật hơn, size to hơn các thành phần phụ của câu.

Kiểu chữ:
* Chữ Nhật lớn
* Chữ chính MÀU TRẮNG
* Từ khóa cảm xúc MÀU ĐỎ 
* Bóng đen dày
* Viền trắng dày
* Hiệu ứng manga phát sáng
* Chiều sâu chữ nhiều lớp
* Phong cách manga bùng nổ
Văn bản cần mang cảm giác: Giật gân, Cảm xúc mãnh liệt, Không thể bỏ qua.

## QUY TẮC NHẤN MẠNH TỪ KHÓA CẢM XÚC
Bên trong câu văn ở giữa, cụm từ gây sốc NHẤT cần trở thành:
* MÀU ĐỎ
* Lớn hơn
* Dày hơn
* Nổi bật về mặt thị giác
* Ánh sáng mạnh hơn
Các cụm từ hỗ trợ vẫn giữ nguyên: Màu trắng, nhỏ hơn một chút.
Ví dụ: 「見下していた妻gà 大企業のCEOだった」 -> Từ khóa cảm xúc: 「大企業」 「CEO」 trở thành kiểu chữ màu đỏ bùng nổ, to, ấn tượng.

---

# QUY TẮC BONG BÓNG LỜI NÓI (SPEECH BUBBLES)
Bong bóng lời nói là vũ khí cảm xúc LỚN.
Họ phải cảm thấy: hung dữ, nổ, cảm xúc sắc nét, very mobile readable.
Ô lời thoại nên chồng lên nhau một phần các ký tự.
ĐỂ ĐẢM BẢO MỖI NHÂN VẬT ĐỀU CÓ THOẠI VÀ HÌNH ẢNH SINH ĐỘNG:
- BẮT BUỘC vẽ đúng **BỐN** bong bóng thoại trên toàn ảnh thu nhỏ (mỗi bên chia đôi màn hình có chính xác 2 bong bóng thoại, một cái chỉ vào người nói chính và một cái chỉ vào người kia).
- Đối thoại phải có âm hưởng tiếng Nhật tự nhiên chuẩn bản xứ, câu thoại theo kiểu văn nói chân thực lấy trực tiếp từ câu chuyện. Tuyệt đối tránh cách diễn đạt máy móc hay tiếng Nhật sách giáo khoa.

⚠️ QUY TẮC NGẮT DÒNG HỘI THOẠI TRONG BONG BÓNG THOẠI (SPEECH BUBBLES):
- Đối với các câu thoại dài trong bong bóng (villainBubble.text, heroBubble.text, v.v.), bạn phải chủ động NGẮT DÒNG bằng ký tự xuống dòng "\n" để chỉ định rõ ràng cấu trúc các dòng chữ dọc/ngang của bong bóng thoại.
- Điều này giúp AI khi sinh ảnh vẽ chữ đúng thứ tự, không bị chồng chéo hay tự ý ngắt dòng làm lặp chữ/thiếu chữ.
- Mỗi dòng thoại tối ưu nên dài từ 8 đến 15 ký tự Nhật.
- Ví dụ: "ここは\n私の家族の場所よ。\nあなたの入る余地ない。" thay vì viết cả chuỗi dài liên tục.

⚠️ TUYỆT ĐỐI KHÔNG ĐƯA THOẠI HOẶC BONG BÓNG VÀO MÔ TẢ HÀNH ĐỘNG (mainAction):
Trong các trường mô tả hành động ("mainAction" của beforeScene và afterScene), bạn TUYỆT ĐỐI KHÔNG ĐƯỢC viết các từ như "speech bubble", "dialogue box", "says...", "yells...", hay đưa bất kỳ lời thoại trích dẫn "..." nào vào. Lời thoại PHẢI được tách biệt hoàn toàn và chỉ xuất hiện duy nhất trong các trường "villainBubble", "heroResponseBubble", "heroBubble" và "villainReactionBubble" của JSON. Điều này để tránh việc vẽ lặp lại hai lần bong bóng thoại trên ảnh.

⚠️ TUYỆT ĐỐI KHÔNG CHỨA CHỮ NHÃN TIẾNG ANH (BEFORE, AFTER, v.v.):
Tuyệt đối không đưa các từ "BEFORE", "AFTER", "PREVIOUS", "NEXT", v.v. hay các nhãn so sánh vào bất kỳ mô tả nào của "mainAction" hay "location".

## 1. BONG BÓNG CHÍNH CỦA PHẢN DIỆN (BEFORE - BÊN PHẢI - \`villainBubble\`)
* Lấy các câu nói gây hấn, sỉ nhục, chế giễu, công kích tàn nhẫn, lăng mạ đầy quyền lực.
* Sử dụng: Bong bóng LỚN bùng nổ, viền TRẮNG dày, nền ĐEN, phong cách manga mạnh mẽ.
* Kiểu chữ: chữ ĐỎ ĐẬM, kiểu chữ đậm, dày. Cụm từ xúc phạm nặng nhất phải LỚN KHỔNG LỒ (gấp 2-3 lần) có màu đỏ sáng rực bùng nổ.

## 2. BONG BÓNG PHỤ/NỘI TÂM CỦA CHÍNH DIỆN (BEFORE - BÊN PHẢI - \`heroResponseBubble\`)
* Lấy các câu đáp lời cam chịu ("Vâng...", "Tôi xin lỗi...") hoặc suy nghĩ nội tâm dằn vặt lo âu ("...").
* Sử dụng: Bong bóng PHỤ nhỏ nhắn, viền đen mảnh hoặc bong bóng đám mây suy nghĩ lo lắng (thought cloud), nền TRẮNG.
* Kiểu chữ: chữ XÁM/ĐEN nhỏ mảnh thể hiện sự nhẫn nhịn cam chịu.

## 3. BONG BÓNG CHÍNH CỦA CHÍNH DIỆN (AFTER - BÊN TRÁI - \`heroBubble\`)
* Lấy những câu đáp trả đanh thép, lật kèo quyết định, vạch trần sự thật bùng nổ cảm xúc giải tỏa.
* Sử dụng: Bong bóng LỚN dữ dội, viền TRẮNG + ĐỎ dày, nền VÀNG, kiểu manga climax bùng nổ.
* Kiểu chữ: chữ ĐEN đậm dễ đọc. Từ khóa "kết liễu" mang tính đột phá phải tô MÀU ĐỎ và phóng LỚN KHỔNG LỒ.

## 4. BONG BÓNG PHỤ/PHẢN ỨNG CỦA PHẢN DIỆN (AFTER - BÊN TRÁI - \`villainReactionBubble\`)
* Lấy những câu phản ứng sốc bàng hoàng, kinh hãi, không tin nổi sự thật ("Cái gì?!", "Không thể nào...", "Nói dối...").
* Sử dụng: Bong bóng gai nhọn shock bubble chao đảo chông chênh, viền ĐEN dày, nền ĐEN hoặc XÁM.
* Kiểu chữ: chữ ĐỎ SÁNG hoặc TRẮNG có viền răng cưa run rẩy thể hiện sự hoảng sợ tột độ.

## QUY TẮC PHÂN CẤP KIỂU CHỮ
Bên trong mỗi bong bóng thoại: Cụm từ cảm xúc mạnh nhất = LỚN NHẤT. Các cụm từ hỗ trợ = nhỏ hơn. Từ khóa cảm xúc chiếm ưu thế về mặt hình ảnh và quan trọng hơn khả năng đọc hiểu toàn bộ câu.

---

# PHÂN BIỆT CHO 3 PHIÊN BẢN HÌNH THU NHỎ
3 hình thu nhỏ PHẢI có sự khác biệt rõ rệt. KHÔNG được sử dụng lại bố cục giống hệt nhau. Mỗi phiên bản tập trung vào một điểm nhấn cảm xúc khác nhau:
* PHIÊN BẢN 1 TẬP TRUNG: Sự sỉ nhục, sự đau khổ của nhân vật chính, nỗi đau tinh thần. Cảm xúc: “Họ đã đối xử với người này thật tệ hại.” (Ứng với Tiêu đề 1)
* PHIÊN BẢN 2 TẬP TRUNG: Sự thật gây sốc được hé lộ, danh tính bí mật, sự thật bị phơi bày. Cảm xúc: “Khoan… Họ thực sự là AI?” (Ứng với Tiêu đề 2)
* PHIÊN BẢN 3 TẬP TRUNG: Sự sụp đổ của kẻ phản diện, sự hối hận, sự suy sụp tinh thần, sự trả thù được đền đáp. Cảm xúc: “Họ đã hoàn toàn thất bại.” (Ứng với Tiêu đề 3)

---

# ĐỊNH DẠNG ĐẦU RA BẮT BUỘC (JSON ONLY)
Bạn chỉ xuất ra duy nhất một đối tượng JSON khớp chính xác cấu trúc sau. Không giải thích, không phân tích, không bình luận thêm.

{
  "versions": [
    {
      "id": 1,
      "title": "[Tựa đề 1 cụ thể từ danh sách người dùng cung cấp, bằng Tiếng Nhật]",
      "titleVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của Tựa đề 1 này]",
      "focus": "sự sỉ nhục và nỗi đau tinh thần của nhân vật chính",
      "beforeScene": {
        "location": "[Phông nền TRƯỚC phù hợp cảnh, e.g. messy kitchen]",
        "characterNames": ["[Mảng tên các nhân vật xuất hiện ở cảnh này, e.g. Kenji, Aoi]"],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["kiêu ngạo", "khinh miệt", "hung hăng"],
        "heroEmotion": ["đau khổ", "im lặng chịu đựng", "khóc tủi nhục"]
      },
      "afterScene": {
        "location": "[Phông nền SAU phù hợp cảnh, e.g. luxurious boardroom]",
        "characterNames": ["[Mảng tên các nhân vật xuất hiện ở cảnh này, e.g. Kenji, Aoi]"],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh trước nhân vật chính. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["sốc", "sợ hãi hoảng loạn", "hối hận quỳ gối"],
        "heroEmotion": ["điềm tĩnh thống trị", "nụ cười tự tin", "uy quyền vượt trội"]
      },
      "centerHook": {
        "fullText": "[Câu móc dọc kịch tính ở giữa từ Tiêu đề 1, tiếng Nhật, chủ động ngắt 2-3 dòng bằng '\\n', e.g., '見下していた妻が\\n大企業のCEOだった']",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của câu móc dọc tiếng Nhật này]",
        "highlightKeywords": ["[Các từ khóa cảm xúc cần nhấn mạnh màu đỏ, e.g. 借金地獄]"]
      },
      "topRightHook": {
        "fullText": "[Câu tóm tắt ngắn kịch tính về hoàn cảnh / buildup mâu thuẫn, tiếng Nhật, chủ động ngắt bằng '\\n' nếu dài]",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa và kịch tính của câu góc trên này]",
        "highlightKeywords": ["[Từ khóa cảm xúc cần nhấn mạnh màu đỏ ở góc trên, e.g. 借金]"]
      },
      "bottomLeftHook": {
        "fullText": "[Câu tóm tắt ngắn kịch tính về hậu quả / kết mở / quả báo, tiếng Nhật, chủ động ngắt bằng '\\n' nếu dài]",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa và kịch tính của câu góc dưới này]",
        "highlightKeywords": ["[Từ khóa cảm xúc cần nhấn mạnh màu đỏ ở góc dưới, e.g. 解任]"]
      },
      "villainBubble": {
        "text": "[Câu thoại sỉ nhục tiếng Nhật ở BEFORE, chủ động ngắt 2-3 dòng bằng '\\n', e.g., 'この家は\\n俺の名義だ！\\n出て行け！']",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại sỉ nhục này]",
        "highlight": "[Cụm từ sỉ nhục mạnh nhất để phóng to 2x-3x]"
      },
      "heroResponseBubble": {
        "text": "[Câu phản hồi/nội tâm tiếng Nhật ở BEFORE, chủ động ngắt 2-3 dòng bằng '\\n' nếu dài]",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản hồi/nội tâm này]",
        "highlight": "[Cụm từ/từ khóa chịu đựng quan trọng nhất]"
      },
      "heroBubble": {
        "text": "[Câu thoại chốt hạ tiếng Nhật ở AFTER, chủ động ngắt 2-3 dòng bằng '\\n', e.g., 'ここは\\n私の家族の場所よ。\\nあなたの入る余地ない。']",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại chốt hạ này]",
        "highlight": "[Cụm từ chốt hạ mạnh nhất để bùng nổ]"
      },
      "villainReactionBubble": {
        "text": "[Câu run sợ hoảng hốt tiếng Nhật ở AFTER, chủ động ngắt 2-3 dòng bằng '\\n' nếu dài, e.g., 'う、嘘だろ…！？\\nなんで…！']",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản ứng sốc này]",
        "highlight": "[Cụm từ hoảng sợ mạnh nhất]"
      }
    },
    {
      "id": 2,
      "title": "[Tựa đề 2 cụ thể từ danh sách người dùng cung cấp, bằng Tiếng Nhật]",
      "titleVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của Tựa đề 2 này]",
      "focus": "danh tính bí mật và sự thật chấn động bị phơi bày",
      "beforeScene": {
        "location": "...",
        "characterNames": ["..."],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["...", "..."],
        "heroEmotion": ["...", "..."]
      },
      "afterScene": {
        "location": "...",
        "characterNames": ["..."],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["...", "..."],
        "heroEmotion": ["...", "..."]
      },
      "centerHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của câu móc dọc tiếng Nhật này]",
        "highlightKeywords": ["..."]
      },
      "topRightHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa của câu góc trên này]",
        "highlightKeywords": ["..."]
      },
      "bottomLeftHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa của câu góc dưới này]",
        "highlightKeywords": ["..."]
      },
      "villainBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại sỉ nhục này]",
        "highlight": "..."
      },
      "heroResponseBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản hồi/nội tâm này]",
        "highlight": "..."
      },
      "heroBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại chốt hạ này]",
        "highlight": "..."
      },
      "villainReactionBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản ứng sốc này]",
        "highlight": "..."
      }
    },
    {
      "id": 3,
      "title": "[Tựa đề 3 cụ thể từ danh sách người dùng cung cấp, bằng Tiếng Nhật]",
      "titleVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của Tựa đề 3 này]",
      "focus": "phản diện sụp đổ tinh thần và sự hối hận muộn màng",
      "beforeScene": {
        "location": "...",
        "characterNames": ["..."],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["...", "..."],
        "heroEmotion": ["...", "..."]
      },
      "afterScene": {
        "location": "...",
        "characterNames": ["..."],
        "mainAction": "[Mô tả chi tiết hành động vật lý bằng Tiếng Anh. Tuyệt đối KHÔNG chứa lời thoại trích dẫn, KHÔNG nhắc tới bong bóng thoại/dialogue bubbles, KHÔNG dùng các từ 'BEFORE' hoặc 'AFTER' hay chữ nhãn so sánh nào]",
        "villainEmotion": ["...", "..."],
        "heroEmotion": ["...", "..."]
      },
      "centerHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa, tự nhiên và kịch tính của câu móc dọc tiếng Nhật này]",
        "highlightKeywords": ["..."]
      },
      "topRightHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa của câu góc trên này]",
        "highlightKeywords": ["..."]
      },
      "bottomLeftHook": {
        "fullText": "...",
        "fullTextVi": "[Bản dịch Tiếng Việt cực kì sát nghĩa của câu góc dưới này]",
        "highlightKeywords": ["..."]
      },
      "villainBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại sỉ nhục này]",
        "highlight": "..."
      },
      "heroResponseBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản hồi/nội tâm này]",
        "highlight": "..."
      },
      "heroBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu thoại chốt hạ này]",
        "highlight": "..."
      },
      "villainReactionBubble": {
        "text": "...",
        "textVi": "[Bản dịch Tiếng Việt tự nhiên theo văn phong truyện tranh của câu phản ứng sốc này]",
        "highlight": "..."
      }
    }
  ]
}

============================================================================
🎯 DỮ LIỆU ĐẦU VÀO (INPUT)
============================================================================

3 TỰA PHIM YOUTUBE TIẾNG NHẬT:
"""
${titlesText}
"""

CÂU CHUYỆN / KỊCH BẢN HOÀN CHỈNH:
"""
${storyText}
"""
`;
};

export const generateSEOPrompt = (srtText: string): string => {
  return `
# CÔNG CỤ TẠO NỘI DUNG SEO & Ý TƯỞNG NHẠC NỀN BGM VIDEO YOUTUBE (PHIÊN BẢN HỢP NHẤT CAO CẤP)

Bạn là một chuyên gia tối ưu hóa SEO YouTube và Đạo diễn Âm nhạc (Music Director) chuyên nghiệp cho các kênh truyện tranh Manga/Drama Nhật Bản (đặc biệt là thể loại Sukatto trả thù, mâu thuẫn gia đình, góc khuất xã hội).
Dựa trên tệp phụ đề (.srt) hoặc kịch bản hội thoại được cung cấp bên dưới, hãy biên soạn nội dung SEO tối ưu nhất BẰNG TIẾNG NHẬT CHUẨN (STANDARD JAPANESE), đồng thời thiết kế kịch bản nhạc nền BGM (cho Suno/AI) tương thích theo dòng thời gian của phụ đề.

Bạn phải tạo ra ba phần sau và trả về ở định dạng JSON chính xác:

## SECTION 1: MÔ TẢ CHUẨN SEO VIDEO YOUTUBE (BẰNG TIẾNG NHẬT CHUẨN, có các biểu tượng/icons sinh động và kịch tính)
Trình bày rõ ràng, đẹp mắt, lôi cuốn người đọc bằng tiếng Nhật chuẩn bao gồm:
1. **大意内容 (Video Summary)**: Tóm tắt kịch tính, hấp dẫn về cốt truyện của video trong 2-3 câu bằng tiếng Nhật bản xứ. Làm nổi bật mâu thuẫn chính và sự trả thù/giải quyết thỏa mãn (Sukatto).
2. **得られる教訓 (Key Takeaways / Lessons)**: Đưa ra 2-3 bài học nhân văn, triết lý sống hoặc lời khuyên rút ra từ câu chuyện bằng tiếng Nhật sâu sắc.
3. **主要な場面のタイムライン (Scene Timeline)**: Phân tách câu chuyện thành các cảnh chính dựa trên phụ đề. Với mỗi cảnh/tình huống chính, hãy viết đúng 1 câu mô tả kịch tính bằng tiếng Nhật kèm mốc thời gian ước lượng hoặc định dạng timeline (ví dụ: "00:00 - イントロダクション...", "01:30 - 悲劇の始まり..."). Viết khoảng 5-8 cảnh chính tương ứng tiến trình câu chuyện. Mỗi dòng viết 1 cảnh chính duy nhất.
4. **視聴者への呼びかけ (Call to Action)**: Viết lời kêu gọi người xem bằng tiếng Nhật tự nhiên, kích thích tương tác (Like, Đăng ký kênh, Chia sẻ cảm nghĩ dưới bình luận).
5. **3つの際立つハッシュタグ (3 Hashtags nổi bật)**: 3 hashtag chính có dấu thăng (#) ở cuối phần mô tả bằng tiếng Nhật thịnh hành (ví dụ: #スカッと漫画 #夫婦喧嘩 #因果応報).

## SECTION 2: 10 HASHTAGS KHÁC NHAU (BẰNG TIẾNG NHẬT CHUẨN, cách nhau bằng dấu phẩy)
Tạo đúng 10 từ khóa/hashtags liên quan chặt chẽ đến chủ đề video bằng tiếng Nhật, cách nhau bởi dấu phẩy (không có dấu thăng # trước mỗi từ khóa), ví dụ: "スカッと漫画,夫婦,復讐,浮気,義実家,因果応報,漫画,修羅場,胸糞,どんでん返し".

## SECTION 3: KỊCH BẢN NHẠC NỀN BGM CHO TỪNG PHÂN CẢNH (SUNO AI PROMPTS)
Hãy phân tích sự thay đổi tâm lý, mức độ căng thẳng của các nhân vật và bối cảnh câu chuyện qua các mốc thời gian phụ đề. Chia video thành từ 4 đến 8 phân đoạn âm nhạc chính.
Với mỗi phân đoạn âm nhạc, hãy cung cấp các thông tin sau:
1. **time**: Mốc thời gian bắt đầu và kết thúc của phân cảnh nhạc (Bắt buộc ghi rõ ở định dạng 'phút:giây - phút:giây', ví dụ: "00:00 - 01:25", "01:25 - 02:40"). Hãy khớp chính xác theo dòng thời gian phụ đề.
2. **scene**: Tóm tắt ngắn gọn bối cảnh và diễn biến của cảnh đó (bằng **Tiếng Việt**, tối đa 1 câu, ví dụ: "Nhân vật chính bị sếp xúc phạm nặng nề trước mặt đồng nghiệp").
3. **mood**: Tâm trạng / Cảm xúc chủ đạo của phân đoạn (bằng **Tiếng Việt**, ví dụ: "Nhẫn nhục, trầm uất", "Căng thẳng tột độ", "Hồi hộp", "Đảo ngược đắc thắng", "Sukatto thỏa mãn").
4. **suno_style**: Các từ khóa mô tả phong cách nhạc dùng cho Suno AI (Bắt buộc viết bằng **Tiếng Anh**, ngăn cách bằng dấu phẩy, **Tối đa 120 ký tự** để không bị Suno báo lỗi dài quá). Tập trung vào nhạc cụ, nhịp điệu, tốc độ, thể loại (ví dụ: "sad piano solo, emotional violin, melancholic, slow tempo, 75bpm, cinematic drama").
5. **suno_prompt**: Câu mô tả âm nhạc chi tiết dùng làm prompt tạo nhạc cho Suno AI (Bắt buộc viết bằng **Tiếng Anh**, mô tả chi tiết cách nhạc cụ bắt đầu, phát triển và kết thúc, ví dụ: "A slow and quiet melancholic piano intro, gradually adding low cello strings as emotional tension builds. Subtle emotional violin solo backing.").

---
🎯 DỮ LIỆU PHỤ ĐỀ / SRT ĐẦU VÀO:
"""
${srtText}
"""

---
⚠️ QUY TẮC PHẢN HỒI (STRICT JSON ONLY - TRẢ VỀ RAW JSON, KHÔNG BỌC TRONG BẤT KỲ VĂN BẢN NÀO KHÁC):
{
  "section1": "[Nội dung mô tả SEO tiếng Nhật đầy đủ của Section 1 với markdown, phân dòng đẹp mắt, sử dụng các emoji sinh động]",
  "section2": "[10 hashtags tiếng Nhật chuẩn cách nhau bằng dấu phẩy]",
  "bgm_music_prompts": [
    {
      "time": "[Mốc thời gian phát dạng phút:giây - phút:giây, e.g. 00:00 - 01:15]",
      "scene": "[Diễn biến cảnh kịch tính bằng Tiếng Việt]",
      "mood": "[Cảm xúc chủ đạo bằng Tiếng Việt, e.g. Căng thẳng u uất]",
      "suno_style": "[Suno style tags bằng Tiếng Anh, max 120 ký tự, e.g. sad piano, weeping violin, slow, 70bpm]",
      "suno_prompt": "[Suno music description bằng Tiếng Anh, e.g. A slow piano opening that builds tension with dramatic strings]"
    }
  ]
}
`;
};
