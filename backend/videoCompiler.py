import sys
import os
import json
import urllib.request
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from concurrent.futures import ThreadPoolExecutor, as_completed

# Reconfigure stdout and stderr to use UTF-8 encoding to prevent UnicodeEncodeError in subprocesses
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def log(message):
    try:
        print(message)
    except UnicodeEncodeError:
        try:
            enc = (sys.stdout.encoding if sys.stdout else None) or 'utf-8'
            print(str(message).encode(enc, errors='replace').decode(enc))
        except Exception:
            pass
    if sys.stdout:
        try:
            sys.stdout.flush()
        except Exception:
            pass

def parse_time_to_seconds(time_str):
    try:
        if "-->" in time_str:
            time_str = time_str.split("-->")[0].strip()
        cleaned = time_str.replace(",", ".")
        parts = cleaned.split(":")
        if len(parts) < 3:
            return 0.0
        hours = float(parts[0])
        minutes = float(parts[1])
        seconds = float(parts[2])
        return hours * 3600 + minutes * 60 + seconds
    except Exception:
        return 0.0

def get_shot_duration(time_range):
    if not time_range:
        return 4.0
    parts = time_range.split("-->")
    if len(parts) < 2:
        return 4.0
    start = parse_time_to_seconds(parts[0].strip())
    end = parse_time_to_seconds(parts[1].strip())
    return max(0.5, end - start)

def parse_bgm_time_range(range_str):
    try:
        parts = range_str.split("-")
        if len(parts) < 2:
            return 0.0, 99999.0
        
        def parse_time_part(t):
            t = t.strip()
            if ":" in t:
                t_parts = t.split(":")
                if len(t_parts) == 2:
                    return float(t_parts[0]) * 60 + float(t_parts[1])
                elif len(t_parts) == 3:
                    return float(t_parts[0]) * 3600 + float(t_parts[1]) * 60 + float(t_parts[2])
            return float(t)
            
        start = parse_time_part(parts[0])
        end = parse_time_part(parts[1])
        return start, max(0.0, end - start)
    except Exception:
        return 0.0, 4.0

def download_file(url, local_path):
    log(f"Downloading {url} to {local_path}...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response, open(local_path, 'wb') as out_file:
            out_file.write(response.read())
        return True
    except Exception as e:
        log(f"Error downloading {url}: {e}")
        return False

def contains_cjk(text):
    for char in text:
        cp = ord(char)
        # Hiragana, Katakana, Kanji, Hangul
        if (0x3040 <= cp <= 0x309F) or (0x30A0 <= cp <= 0x30FF) or (0x4E00 <= cp <= 0x9FFF) or (0xAC00 <= cp <= 0xD7AF):
            return True
    return False

def is_shot_sub_hidden(shot, idx, hidden_srt_indexes):
    if not hidden_srt_indexes:
        return False
    shot_range = shot.get('range', '')
    if not shot_range:
        shot_id = str(shot.get('id', ''))
        shot_idx = str(idx + 1)
        return shot_idx in hidden_srt_indexes or shot_id in hidden_srt_indexes
        
    try:
        parts = shot_range.split("-")
        start_idx = int(parts[0].strip())
        end_idx = int(parts[1].strip()) if len(parts) > 1 else start_idx
        for i in range(start_idx, end_idx + 1):
            if str(i) in hidden_srt_indexes:
                return True
    except Exception:
        pass
    return False

def wrap_text(text, max_line_len=40):
    if contains_cjk(text):
        # Japanese/cjk character by character split
        lines = []
        for i in range(0, len(text), max_line_len):
            lines.append(text[i:i+max_line_len])
        return lines
        
    words = text.split(" ")
    lines = []
    curr_line = ""
    for w in words:
        if len(curr_line) + len(w) + 1 <= max_line_len:
            curr_line = curr_line + " " + w if curr_line else w
        else:
            lines.append(curr_line)
            curr_line = w
    if curr_line:
        lines.append(curr_line)
    return lines

def hex_to_rgb(hex_str, default=(255, 255, 255)):
    if not hex_str:
        return default
    hex_str = hex_str.lstrip('#')
    try:
        if len(hex_str) == 3:
            hex_str = ''.join([c*2 for c in hex_str])
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return default

_font_cache = {}

def get_fallback_font(text, size=24, font_family='sans-serif'):
    has_cjk = contains_cjk(text)
    cache_key = (has_cjk, size, font_family)
    if cache_key in _font_cache:
        return _font_cache[cache_key]

    # Resolve executable or script directory
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(sys.executable)
        local_font_dir = os.path.join(exe_dir, "fonts")
    else:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        # In dev, check resources/fonts under project root first
        root_dir = os.path.dirname(script_dir)
        dev_fonts = os.path.join(root_dir, "resources", "fonts")
        if os.path.exists(dev_fonts):
            local_font_dir = dev_fonts
        else:
            local_font_dir = os.path.join(script_dir, "fonts")
    
    log(f"[Font] Resolving font family='{font_family}', size={size}, has_cjk={has_cjk}")
    log(f"[Font] Local font directory: {local_font_dir} (exists: {os.path.exists(local_font_dir)})")
    
    font_dirs = []
    if os.path.exists(local_font_dir):
        font_dirs.append(local_font_dir)
        
    font_dirs.extend([
        "C:\\Windows\\Fonts",
        os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts')
    ])

    family_fonts = []
    if font_family == 'serif':
        family_fonts = ["times.ttf", "georgia.ttf"]
    elif font_family == 'monospace':
        family_fonts = ["cour.ttf", "consol.ttf"]
    elif font_family == 'cursive':
        family_fonts = ["comic.ttf"]
    elif font_family == 'msgothic':
        family_fonts = ["msgothic.ttc"]
    elif font_family == 'meiryo':
        family_fonts = ["meiryo.ttc"]
    elif font_family == 'msmincho':
        family_fonts = ["msmincho.ttc"]
    elif font_family == 'yugothic':
        family_fonts = ["YuGothR.ttc", "YuGothM.ttc", "YuGothB.ttc"]
    elif font_family == 'yumin':
        family_fonts = ["yumin.ttf", "yumindb.ttf"]
    elif font_family == 'bizudgothic':
        # BIZ-UDGothic is the system name. Bundled files are BIZUDPGothic-Regular.ttf / BIZUDPGothic-Bold.ttf
        family_fonts = ["BIZUDPGothic-Regular.ttf", "BIZUDPGothic-Bold.ttf", "BIZ-UDGothicR.ttc", "BIZ-UDGothicB.ttc"]
    elif font_family == 'bizudmincho':
        family_fonts = ["BIZ-UDMinchoM.ttc"]
    elif font_family == 'togegothic':
        family_fonts = [
            "TogeGothic-Bold.otf", "TogeGothic-Bold.ttf",
            "TogeGothic-Bd.otf", "TogeGothic-Bd.ttf",
            "TogeGothicBd.otf", "TogeGothicBd.ttf"
        ]
    else: # sans-serif
        if font_family.lower().endswith(('.ttf', '.otf', '.ttc')):
            family_fonts = [font_family]
        else:
            family_fonts = ["arial.ttf", "calibri.ttf", "segoeui.ttf"]

    # Categorize family_fonts into CJK and non-CJK to prioritize properly
    cjk_fonts = []
    non_cjk_fonts = []
    for f in family_fonts:
        f_lower = f.lower()
        if any(cjk in f_lower for cjk in ['gothic', 'mincho', 'meiryo', 'yugoth', 'yumin', 'msmincho', 'msgothic', 'toge', 'mochiy', 'noto', 'zen', 'rocknroll']):
            cjk_fonts.append(f)
        elif f_lower.endswith(('.ttf', '.otf', '.ttc')) and font_family.lower().endswith(('.ttf', '.otf', '.ttc')):
            # Explicitly requested custom font file
            cjk_fonts.append(f)
        else:
            non_cjk_fonts.append(f)

    font_paths = []
    
    if has_cjk:
        # 1. First search user's requested CJK fonts
        for d in font_dirs:
            for f in cjk_fonts:
                path = os.path.join(d, f)
                if path not in font_paths:
                    font_paths.append(path)
                    
        # 2. Next search all available local CJK fonts
        local_cjk_fallbacks = []
        if os.path.exists(local_font_dir):
            try:
                for f in os.listdir(local_font_dir):
                    if f.lower().endswith(('.ttf', '.otf', '.ttc')):
                        local_cjk_fallbacks.append(f)
            except Exception as e:
                log(f"[Font Warning] Failed to list local fonts: {e}")
                
        # 3. Next search standard system CJK fonts
        cjk_fallbacks = local_cjk_fallbacks + [
            "msgothic.ttc", "meiryo.ttc", "msmincho.ttc", 
            "YuGothR.ttc", "yumin.ttf", "BIZ-UDGothicR.ttc"
        ]
        for cf in cjk_fallbacks:
            for d in font_dirs:
                path = os.path.join(d, cf)
                if path not in font_paths:
                    font_paths.append(path)
                    
        # 4. Only as a last resort, search non-CJK fonts
        for d in font_dirs:
            for f in non_cjk_fonts:
                path = os.path.join(d, f)
                if path not in font_paths:
                    font_paths.append(path)
    else:
        # Non-CJK text: prioritize requested fonts, then system defaults
        for d in font_dirs:
            for f in family_fonts:
                path = os.path.join(d, f)
                if path not in font_paths:
                    font_paths.append(path)

    # General system fallbacks
    general_fallbacks = ["arial.ttf", "calibri.ttf", "segoeui.ttf", "times.ttf"]
    for gf in general_fallbacks:
        for d in font_dirs:
            path = os.path.join(d, gf)
            if path not in font_paths:
                font_paths.append(path)

    font_obj = None
    resolved_path = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                font_obj = ImageFont.truetype(path, size)
                resolved_path = path
                break
            except Exception:
                continue
                
    if font_obj is None:
        font_obj = ImageFont.load_default()
        log("[Font] Failed to load any custom/system fonts, falling back to default PIL font.")
    else:
        log(f"[Font] Successfully loaded font from: {resolved_path}")
        
    _font_cache[cache_key] = font_obj
    return font_obj

def draw_subtitles(frame_bgr, text, font_size=24, font_family='sans-serif', position='bottom', bg_opacity=0.6, outline_width=2, outline_color=(0, 0, 0), text_color=(255, 255, 255), max_line_len=38):
    # Convert OpenCV BGR to Pillow RGBA directly to work with alpha blending
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    img_pil = Image.fromarray(frame_rgb).convert('RGBA')
    draw = ImageDraw.Draw(img_pil)
    
    width, height = img_pil.size
    
    # Scale font size based on video width
    font_size_scaled = int(font_size * (width / 800))
    font_size_scaled = max(1, font_size_scaled)
    
    font = get_fallback_font(text, font_size_scaled, font_family)
    # Let's wrap by characters first (respecting user choice)
    initial_lines = wrap_text(text, max_line_len=max_line_len)
    
    # Let's wrap by pixel width to guarantee no overflow!
    max_pixel_width = int(width * 0.90) # 90% of screen width
    
    def wrap_by_pixel_width(line_text, font, max_w):
        if not line_text:
            return []
        is_cjk = contains_cjk(line_text)
        if is_cjk:
            # For CJK, wrap char-by-char
            lines = []
            curr = ""
            for char in line_text:
                test_line = curr + char
                try:
                    bbox = draw.textbbox((0, 0), test_line, font=font)
                    w = bbox[2] - bbox[0]
                except Exception:
                    w = len(test_line) * font.size
                if w <= max_w:
                    curr = test_line
                else:
                    if curr:
                        lines.append(curr)
                    curr = char
            if curr:
                lines.append(curr)
            return lines
        else:
            # For Latin, wrap word-by-word
            words = line_text.split(" ")
            lines = []
            curr = ""
            for w in words:
                test_line = curr + " " + w if curr else w
                try:
                    bbox = draw.textbbox((0, 0), test_line, font=font)
                    w_pixels = bbox[2] - bbox[0]
                except Exception:
                    w_pixels = len(test_line) * (font.size // 2)
                if w_pixels <= max_w:
                    curr = test_line
                else:
                    if curr:
                        lines.append(curr)
                    curr = w
            if curr:
                lines.append(curr)
            return lines

    lines = []
    for line in initial_lines:
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_w = bbox[2] - bbox[0]
        except Exception:
            line_w = len(line) * font.size
        if line_w <= max_pixel_width:
            lines.append(line)
        else:
            lines.extend(wrap_by_pixel_width(line, font, max_pixel_width))
    
    # Calculate text height for all lines
    line_heights = []
    for line in lines:
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            line_heights.append(bbox[3] - bbox[1])
        except Exception:
            line_heights.append(font_size_scaled)
            
    spacing = int(6 * (width / 800))
    spacing = max(2, spacing)
    total_text_height = sum(line_heights) + spacing * (len(lines) - 1)
    
    # Determine Y start position
    if position == 'top':
        start_y = int(height * 0.12)
    elif position == 'center':
        start_y = (height - total_text_height) // 2
    else: # bottom
        start_y = int(height * 0.88) - total_text_height
        
    curr_y = start_y
    for idx, line in enumerate(lines):
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
        except Exception:
            w = len(line) * (font_size_scaled // 2)
            h = font_size_scaled
            
        x = (width - w) // 2
        
        # Draw transparent background box
        if bg_opacity > 0:
            pad_x = int(20 * (width / 800))
            pad_y = int(8 * (width / 800))
            rect_x1 = x - pad_x
            rect_y1 = curr_y - pad_y
            rect_x2 = x + w + pad_x
            rect_y2 = curr_y + h + pad_y
            
            box_w = rect_x2 - rect_x1
            box_h = rect_y2 - rect_y1
            if box_w > 0 and box_h > 0:
                # Create a small transparent overlay just for the box
                box_img = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0))
                box_draw = ImageDraw.Draw(box_img)
                if hasattr(box_draw, 'rounded_rectangle'):
                    box_draw.rounded_rectangle(
                        [0, 0, box_w, box_h],
                        radius=12,
                        fill=(0, 0, 0, int(255 * bg_opacity))
                    )
                else:
                    box_draw.rectangle(
                        [0, 0, box_w, box_h],
                        fill=(0, 0, 0, int(255 * bg_opacity))
                    )
                # Paste the small box using its own alpha channel as mask
                img_pil.paste(box_img, (rect_x1, rect_y1), box_img)
            
        # Draw text outline (8 directions is much faster and cleaner than 25)
        if outline_width > 0:
            offsets = [
                (-outline_width, -outline_width), (-outline_width, 0), (-outline_width, outline_width),
                (0, -outline_width),                                    (0, outline_width),
                (outline_width, -outline_width),  (outline_width, 0),  (outline_width, outline_width)
            ]
            for dx, dy in offsets:
                draw.text((x + dx, curr_y + dy), line, font=font, fill=outline_color)
                        
        draw.text((x, curr_y), line, font=font, fill=text_color)
        curr_y += h + spacing
        
    return cv2.cvtColor(np.array(img_pil.convert('RGB')), cv2.COLOR_RGB2BGR)

def create_subtitle_overlay(width, height, text, font_size=24, font_family='sans-serif', position='bottom', bg_opacity=0.6, outline_width=2, outline_color=(0, 0, 0), text_color=(255, 255, 255), max_line_len=38, bg_full_width=False, bg_height=80, bottom_margin=24, bg_color=(0, 0, 0)):
    # Create transparent RGBA image
    img_pil = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img_pil)
    
    # Scale font size based on video width
    font_size_scaled = int(font_size * (width / 800))
    font_size_scaled = max(1, font_size_scaled)
    
    # Scale background height and bottom margin
    bg_height_scaled = int(bg_height * (width / 800))
    bottom_margin_scaled = int(bottom_margin * (width / 800))
    
    # Wrap by pixel width
    max_pixel_width = int(width * 0.85)
    
    def wrap_by_pixel_width(line_text, font, max_w):
        if not line_text:
            return []
        is_cjk = contains_cjk(line_text)
        if is_cjk:
            lines = []
            curr = ""
            for char in line_text:
                test_line = curr + char
                try:
                    bbox = draw.textbbox((0, 0), test_line, font=font)
                    w = bbox[2] - bbox[0]
                except Exception:
                    w = len(test_line) * font.size
                if w <= max_w:
                    curr = test_line
                else:
                    if curr:
                        lines.append(curr)
                    curr = char
            if curr:
                lines.append(curr)
            return lines
        else:
            words = line_text.split(" ")
            lines = []
            curr = ""
            for w in words:
                test_line = curr + " " + w if curr else w
                try:
                    bbox = draw.textbbox((0, 0), test_line, font=font)
                    w_pixels = bbox[2] - bbox[0]
                except Exception:
                    w_pixels = len(test_line) * (font.size // 2)
                if w_pixels <= max_w:
                    curr = test_line
                else:
                    if curr:
                        lines.append(curr)
                    curr = w
            if curr:
                lines.append(curr)
            return lines

    # Auto scale down font size if it exceeds the background box height in full-width mode
    curr_font_size = font_size_scaled
    spacing = int(6 * (width / 800))
    spacing = max(2, spacing)
    
    while curr_font_size > 8:
        font = get_fallback_font(text, curr_font_size, font_family)
        initial_lines = wrap_text(text, max_line_len=max_line_len)
        
        lines = []
        for line in initial_lines:
            try:
                bbox = draw.textbbox((0, 0), line, font=font)
                line_w = bbox[2] - bbox[0]
            except Exception:
                line_w = len(line) * font.size
            if line_w <= max_pixel_width:
                lines.append(line)
            else:
                lines.extend(wrap_by_pixel_width(line, font, max_pixel_width))
                
        line_heights = []
        for line in lines:
            try:
                bbox = draw.textbbox((0, 0), line, font=font)
                line_heights.append(bbox[3] - bbox[1])
            except Exception:
                line_heights.append(curr_font_size)
                
        total_text_height = sum(line_heights) + spacing * (len(lines) - 1)
        
        # Check if height is fine (leave vertical padding inside the box)
        pad_y = int(height * 0.015)
        max_text_h = bg_height_scaled - 2 * pad_y
        
        if not bg_full_width or total_text_height <= max_text_h or len(lines) <= 1:
            break
            
        curr_font_size -= 2
        
    font_size_scaled = curr_font_size
    font = get_fallback_font(text, font_size_scaled, font_family)

    # Draw full width background if enabled (touches screen edges)
    if bg_full_width and bg_opacity > 0:
        if position == 'top':
            box_y1 = 0
            box_y2 = bg_height_scaled
        elif position == 'center':
            box_y1 = (height - bg_height_scaled) // 2
            box_y2 = box_y1 + bg_height_scaled
        else: # bottom (touches the absolute bottom edge of the frame)
            box_y2 = height
            box_y1 = height - bg_height_scaled
            
        # Draw full-width background rectangle
        box_draw = ImageDraw.Draw(img_pil)
        box_draw.rectangle(
            [0, box_y1, width, box_y2],
            fill=bg_color + (int(255 * bg_opacity),)
        )
        
        # Center the text inside this background
        start_y = box_y1 + (bg_height_scaled - total_text_height) // 2
    else:
        # Calculate Y start position for wrapped text line-by-line
        if position == 'top':
            start_y = int(height * 0.12)
        elif position == 'center':
            start_y = (height - total_text_height) // 2
        else: # bottom
            if bottom_margin != 24:
                start_y = height - bottom_margin_scaled - total_text_height
            else:
                start_y = int(height * 0.88) - total_text_height
            
    curr_y = start_y
    for idx, line in enumerate(lines):
        try:
            bbox = draw.textbbox((0, 0), line, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
        except Exception:
            w = len(line) * (font_size_scaled // 2)
            h = font_size_scaled
            
        x = (width - w) // 2
        
        # Draw inline background boxes ONLY if NOT full-width background
        if not bg_full_width and bg_opacity > 0:
            pad_x = int(width * 0.02)
            pad_y = int(height * 0.015)
            rect_x1 = x - pad_x
            rect_y1 = curr_y - pad_y
            rect_x2 = x + w + pad_x
            rect_y2 = curr_y + h + pad_y
            
            if hasattr(draw, 'rounded_rectangle'):
                draw.rounded_rectangle(
                    [rect_x1, rect_y1, rect_x2, rect_y2],
                    radius=12,
                    fill=bg_color + (int(255 * bg_opacity),)
                )
            else:
                draw.rectangle(
                    [rect_x1, rect_y1, rect_x2, rect_y2],
                    fill=bg_color + (int(255 * bg_opacity),)
                )
                
        if outline_width > 0:
            offsets = [
                (-outline_width, -outline_width), (-outline_width, 0), (-outline_width, outline_width),
                (0, -outline_width),                                    (0, outline_width),
                (outline_width, -outline_width),  (outline_width, 0),  (outline_width, outline_width)
            ]
            out_color_rgba = outline_color + (255,)
            for dx, dy in offsets:
                draw.text((x + dx, curr_y + dy), line, font=font, fill=out_color_rgba)
                
        text_color_rgba = text_color + (255,)
        draw.text((x, curr_y), line, font=font, fill=text_color_rgba)
        curr_y += h + spacing
        
    overlay_np = np.array(img_pil)
    alpha = overlay_np[:, :, 3] / 255.0
    alpha_3d = np.expand_dims(alpha, axis=2)
    overlay_rgb = overlay_np[:, :, :3]
    overlay_bgr = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
    
    if bg_full_width and bg_opacity > 0:
        y_min = box_y1
        y_max = box_y2
    else:
        pad_y = int(height * 0.015) if bg_opacity > 0 else 0
        y_min = start_y - pad_y - outline_width
        y_max = curr_y + pad_y + outline_width
        
    y_min = int(max(0, y_min))
    y_max = int(min(height, y_max))
    if y_min >= y_max:
        y_min = 0
        y_max = height
        
    return overlay_bgr, alpha_3d, y_min, y_max


def create_ken_burns_video(image_path, duration, output_path, width=1280, height=720, fps=24):
    log(f"Generating Ken Burns clip: {image_path} ({duration:.1f}s)")
    try:
        img_pil = Image.open(image_path)
    except Exception as e:
        log(f"[Warning] Failed to load image {image_path}: {e}. Creating placeholder frame.")
        img_pil = Image.new('RGB', (width, height), color=(0, 0, 0))

    img_w, img_h = img_pil.size
    total_frames = int(duration * fps)

    # Crop to match target aspect ratio
    target_ratio = width / height
    current_ratio = img_w / img_h
    
    if current_ratio > target_ratio:
        new_w = int(img_h * target_ratio)
        offset_x = (img_w - new_w) // 2
        img_cropped = img_pil.crop((offset_x, 0, offset_x + new_w, img_h))
    else:
        new_h = int(img_w / target_ratio)
        offset_y = (img_h - new_h) // 2
        img_cropped = img_pil.crop((0, offset_y, img_w, offset_y + new_h))
        
    cropped_w, cropped_h = img_cropped.size
    
    # Convert cropped PIL image to numpy BGR once to avoid converting every frame
    img_np = cv2.cvtColor(np.array(img_cropped), cv2.COLOR_RGB2BGR)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Zoom-in: 1.0 to 1.05
    for i in range(total_frames):
        t = i / float(total_frames - 1) if total_frames > 1 else 0
        zoom_factor = 1.0 + 0.05 * t
        scale = 1.0 / zoom_factor
        
        w = int(cropped_w * scale)
        h = int(cropped_h * scale)
        
        x1 = (cropped_w - w) // 2
        y1 = (cropped_h - h) // 2
        x2 = x1 + w
        y2 = y1 + h
        
        # Crop using numpy slicing
        crop = img_np[y1:y2, x1:x2]
        
        # Resize using OpenCV (extremely fast, multi-threaded/SIMD vectorized)
        frame_cv = cv2.resize(crop, (width, height), interpolation=cv2.INTER_LINEAR)
        out.write(frame_cv)

    out.release()

def process_video_clip(video_path, target_duration, output_path, width=1280, height=720, fps=24):
    log(f"Processing video clip: {video_path} (target duration: {target_duration:.1f}s)")
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise Exception("Cannot open video")
            
        target_frames = int(target_duration * fps)
        if target_frames <= 0:
            target_frames = 1
            
        if target_duration < 8.0:
            # Trim/pad to maintain original speed: O(1) memory
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            last_frame = None
            for f_idx in range(target_frames):
                ret, frame = cap.read()
                if ret:
                    last_frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
                
                if last_frame is not None:
                    out.write(last_frame)
                else:
                    raise Exception("Empty video clip or read failure")
            out.release()
            cap.release()
            return True
        else:
            # Interpolation speed stretch: O(1) memory
            n_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if n_video <= 0:
                # Count frames manually if metadata is missing
                n_video = 0
                while True:
                    ret, _ = cap.read()
                    if not ret:
                        break
                    n_video += 1
                cap.release()
                cap = cv2.VideoCapture(video_path)
                
            if n_video <= 0:
                raise Exception("Empty video clip or cannot determine frame count")
                
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            current_frame = None
            current_src_idx = -1
            
            for f_idx in range(target_frames):
                needed_src_idx = int(f_idx * (n_video / target_frames))
                needed_src_idx = min(needed_src_idx, n_video - 1)
                
                # Advance source read pointer sequentially
                while current_src_idx < needed_src_idx:
                    ret, frame = cap.read()
                    if not ret:
                        break
                    current_src_idx += 1
                    current_frame = cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
                
                if current_frame is not None:
                    out.write(current_frame)
                else:
                    raise Exception("Empty video clip or read failure")
            out.release()
            cap.release()
            return True
    except Exception as e:
        log(f"[Error] process_video_clip failed: {e}")
        return False

def parse_srt_content(content):
    blocks = []
    raw_blocks = content.strip().split("\n\n")
    if len(raw_blocks) <= 1:
        raw_blocks = content.strip().split("\r\n\r\n")
        
    for rb in raw_blocks:
        lines = [l.strip() for l in rb.split("\n") if l.strip()]
        if len(lines) < 2:
            continue
        index = lines[0]
        time_line = lines[1]
        text = " ".join(lines[2:])
        
        time_parts = time_line.split("-->")
        if len(time_parts) < 2:
            continue
            
        start = parse_time_to_seconds(time_parts[0].strip())
        end = parse_time_to_seconds(time_parts[1].strip())
        blocks.append({
            'index': index,
            'start': start,
            'end': end,
            'text': text
        })
    return blocks

def find_local_asset(output_dir, stt, asset_type):
    """
    Finds a local asset (image or video) for a scene with 1-based index `stt`.
    asset_type: 'images' or 'videos'
    """
    folder = os.path.join(output_dir, asset_type)
    if not os.path.exists(folder):
        return None
        
    padded = f"{stt:02d}"
    unpadded = str(stt)
    
    if asset_type == 'images':
        prefixes = [
            f"shot_{padded}", f"shot_{unpadded}",
            f"segment_{padded}", f"segment_{unpadded}",
            padded, unpadded
        ]
        extensions = ['.png', '.jpg', '.jpeg', '.webp']
    else: # videos
        prefixes = [
            f"segment_{padded}", f"segment_{unpadded}",
            f"shot_{padded}", f"shot_{unpadded}",
            padded, unpadded
        ]
        extensions = ['.mp4', '.avi', '.mov', '.webm']
        
    for f in os.listdir(folder):
        name, ext = os.path.splitext(f)
        if ext.lower() in extensions:
            if name.lower() in [p.lower() for p in prefixes]:
                return os.path.join(folder, f)
                
    return None

def check_nvenc(ffmpeg_path):
    try:
        # Run a test encoding of 1 frame with h264_nvenc to verify GPU availability
        cmd = [
            ffmpeg_path, '-y',
            '-f', 'lavfi', '-i', 'color=c=black:s=1280x720:d=0.1',
            '-c:v', 'h264_nvenc',
            '-f', 'null', '-'
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=2)
        return res.returncode == 0
    except Exception:
        return False

def get_audio_duration(file_path, ffmpeg_path='ffmpeg'):
    if not file_path:
        return 0.0
    try:
        cmd = [ffmpeg_path, '-i', file_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8', errors='ignore')
        for line in result.stderr.split('\n'):
            if "Duration:" in line:
                parts = line.split("Duration:")
                if len(parts) > 1:
                    dur_str = parts[1].split(",")[0].strip()
                    h, m, s = dur_str.split(":")
                    return float(h) * 3600 + float(m) * 60 + float(s)
    except Exception as e:
        log(f"[Warning] Failed to get duration for {file_path}: {e}")
    return 0.0

def extract_audio(video_path, output_wav_path, ffmpeg_path='ffmpeg'):
    try:
        cmd = [
            ffmpeg_path, '-y', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
            output_wav_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        if res.returncode == 0 and os.path.exists(output_wav_path) and os.path.getsize(output_wav_path) > 0:
            return True
    except Exception as e:
        log(f"[Warning] Failed to extract audio from {video_path}: {e}")
    if os.path.exists(output_wav_path):
        try:
            os.remove(output_wav_path)
        except Exception:
            pass
    return False

def extract_natural_audio(video_path, target_duration, output_wav_path, ffmpeg_path='ffmpeg'):
    try:
        orig_dur = get_audio_duration(video_path, ffmpeg_path)
        if orig_dur <= 0:
            return False
            
        if target_duration < 8.0:
            # Trim/pad to maintain original speed
            cmd = [
                ffmpeg_path, '-y', '-i', video_path,
                '-vn', '-filter_complex', f"[0:a]atrim=0:{target_duration:.3f},apad[aout]",
                '-map', '[aout]', '-t', f"{target_duration:.3f}",
                '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
                output_wav_path
            ]
        else:
            # Speed stretch using atempo
            speed = orig_dur / target_duration
            filters = []
            temp_speed = speed
            while temp_speed > 2.0:
                filters.append("atempo=2.0")
                temp_speed /= 2.0
            while temp_speed < 0.5:
                filters.append("atempo=0.5")
                temp_speed /= 0.5
            filters.append(f"atempo={temp_speed:.4f}")
            filter_str = ",".join(filters)
            
            cmd = [
                ffmpeg_path, '-y', '-i', video_path,
                '-vn', '-filter_complex', f"[0:a]{filter_str}[aout]",
                '-map', '[aout]', '-t', f"{target_duration:.3f}",
                '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2',
                output_wav_path
            ]
            
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
        if res.returncode == 0 and os.path.exists(output_wav_path) and os.path.getsize(output_wav_path) > 0:
            return True
    except Exception as e:
        log(f"[Warning] Failed to extract natural audio from {video_path}: {e}")
    if os.path.exists(output_wav_path):
        try:
            os.remove(output_wav_path)
        except Exception:
            pass
    return False

def compile_project(config_path, srt_path, output_dir):
    log("=== VEO3 Compiler Version 1.1.1 ===")
    log(f"Config path: {config_path}")
    log(f"SRT path: {srt_path}")
    log(f"Output directory: {output_dir}")

    ffmpeg_path = 'ffmpeg'
    local_ffmpeg = os.path.join(os.path.dirname(sys.executable), 'ffmpeg.exe')
    if os.path.exists(local_ffmpeg):
        ffmpeg_path = local_ffmpeg
        log(f"Using bundled FFmpeg: {ffmpeg_path}")

    try:
        temp_intro_clip = None
        temp_outro_clip = None
        with open(config_path, 'r', encoding='utf-8') as f:
            project = json.load(f)
    except Exception as e:
        log(f"FATAL: Cannot read config file: {e}")
        return 1

    use_ai_director = project.get('useAiDirector', True)
    if not use_ai_director:
        hidden_srt_indexes = []
        log("[AI Director] Disabled by user config. Forcing hiddenSrtIndexes to empty list so all subtitles are shown and all voice files are generated/played.")
    else:
        hidden_srt_indexes = [str(x) for x in project.get('hiddenSrtIndexes', [])]
        log(f"[AI Director] Enabled. Active hidden SRT indexes: {hidden_srt_indexes}")
    export_mode = project.get('exportMode', 'mixed')
    burn_subtitles = project.get('style', {}).get('burnSubtitles', True)

    subtitle_style = project.get('style', {})
    font_size = subtitle_style.get('fontSize', 24)
    font_family = subtitle_style.get('fontFamily', 'sans-serif')
    text_color = hex_to_rgb(subtitle_style.get('textColor', '#ffffff'), (255, 255, 255))
    outline_color = hex_to_rgb(subtitle_style.get('outlineColor', '#000000'), (0, 0, 0))
    outline_width = subtitle_style.get('outlineWidth', 2)
    vertical_align = subtitle_style.get('verticalAlign', 'bottom')
    bg_opacity = subtitle_style.get('bgOpacity', 0.4)
    max_line_length = subtitle_style.get('maxLineLength', 38)
    bg_full_width = subtitle_style.get('bgFullWidth', False)
    bg_height = subtitle_style.get('bgHeight', 80)
    bottom_margin = subtitle_style.get('bottomMargin', 24)
    bg_color = hex_to_rgb(subtitle_style.get('bgColor', '#000000'), (0, 0, 0))

    shots_raw = project.get('shots', [])
    if not shots_raw:
        log("FATAL: No shots found in configuration.")
        return 1

    # Load and parse subtitles early
    srt_blocks = []
    if os.path.exists(srt_path):
        try:
            with open(srt_path, 'r', encoding='utf-8') as sf:
                srt_blocks = parse_srt_content(sf.read())
        except Exception as e:
            log(f"[Warning] Failed to read SRT: {e}")

    # Process srt blocks to map split subtitles and set orig_id
    for block in srt_blocks:
        try:
            import re
            match = re.match(r'^(\d+)', block['index'])
            if match:
                idx_val = int(match.group(1))
                block['orig_id'] = idx_val // 1000 if idx_val >= 1000 else idx_val
            else:
                block['orig_id'] = 0
        except Exception:
            block['orig_id'] = 0

    # Calculate target durations dynamically based on consecutive original shot timestamps
    original_shots = list(shots_raw)
    start_times = [parse_time_to_seconds(shot.get('time', '')) for shot in original_shots]

    max_subtitle_end = 0.0
    if srt_blocks:
        max_subtitle_end = max(block['end'] for block in srt_blocks)

    orig_shot_durations = []
    num_orig_shots = len(original_shots)
    for i in range(num_orig_shots):
        if i < num_orig_shots - 1:
            dur = start_times[i+1] - start_times[i]
        else:
            if max_subtitle_end > start_times[i]:
                dur = (max_subtitle_end - start_times[i]) + 2.0
            else:
                dur = 6.0
        dur = max(0.5, dur)
        orig_shot_durations.append(dur)

    # Process Hooks
    hooks = project.get('hooks', [])
    prepended_shots = []
    prepended_durations = []
    hooks_dur = 0.0
    hooks_count = len(hooks)

    def find_shot_for_sub_index(sub_idx_str):
        try:
            sub_idx_val = int(sub_idx_str)
            orig_id = sub_idx_val // 1000 if sub_idx_val >= 1000 else sub_idx_val
            for shot in original_shots:
                shot_range = shot.get('range')
                if shot_range:
                    parts = shot_range.split("-")
                    start_idx = int(parts[0])
                    end_idx = int(parts[1]) if len(parts) > 1 else start_idx
                    if orig_id >= start_idx and orig_id <= end_idx:
                        return shot
                elif shot.get('id') == orig_id:
                    return shot
        except Exception:
            pass
        return None

    prepended_srt_blocks = []
    if hooks:
        shot_dur_map = {shot.get('id'): orig_shot_durations[idx] for idx, shot in enumerate(original_shots)}
        
        acc_time = 0.0
        for h_idx, sub_idx in enumerate(hooks):
            h_shot = find_shot_for_sub_index(sub_idx)
            if h_shot:
                copy_shot = dict(h_shot)
                copy_shot['is_hook'] = True
                copy_shot['original_id'] = h_shot.get('id')
                prepended_shots.append(copy_shot)
                
                dur = shot_dur_map.get(h_shot.get('id'), 4.0)
                prepended_durations.append(dur)
                hooks_dur += dur
                
                # Clone and align subtitle blocks for hooks
                try:
                    sub_idx_val = int(sub_idx)
                    orig_id = sub_idx_val // 1000 if sub_idx_val >= 1000 else sub_idx_val
                    
                    orig_shot_idx = original_shots.index(h_shot)
                    orig_shot_start = start_times[orig_shot_idx]
                    
                    matching_blocks = [b for b in srt_blocks if b.get('orig_id') == orig_id]
                    for block in matching_blocks:
                        copy_block = dict(block)
                        rel_start = block['start'] - orig_shot_start
                        rel_end = block['end'] - orig_shot_start
                        
                        copy_block['start'] = acc_time + rel_start
                        copy_block['end'] = acc_time + rel_end
                        copy_block['index'] = f"hook_{h_idx}_{block['index']}"
                        copy_block['is_hook'] = True
                        
                        prepended_srt_blocks.append(copy_block)
                except Exception as e:
                    log(f"[Warning] Error copying srt block for hook {sub_idx}: {e}")
                
                acc_time += dur

        # Shift original subtitles by hooks_dur
        for block in srt_blocks:
            block['start'] += hooks_dur
            block['end'] += hooks_dur

        if project.get('introSubIndex') == 'hooks':
            project['introSubIndex'] = str(hooks_count)

    shots = prepended_shots + original_shots
    shot_durations = prepended_durations + orig_shot_durations
    srt_blocks = prepended_srt_blocks + srt_blocks

    # Scan for intro/outro and check insert position
    intro_video_path = None
    outro_video_path = None
    intro_dur = 0.0
    outro_dur = 0.0
    intro_insert_idx = None
    insert_time_offset = 0.0

    intro_dir = os.path.join(output_dir, 'intro')
    outro_dir = os.path.join(output_dir, 'outro')

    if os.path.exists(intro_dir):
        for f in os.listdir(intro_dir):
            if os.path.splitext(f)[1].lower() in ['.mp4', '.avi', '.mov', '.webm']:
                intro_video_path = os.path.join(intro_dir, f)
                break

    if os.path.exists(outro_dir):
        for f in os.listdir(outro_dir):
            if os.path.splitext(f)[1].lower() in ['.mp4', '.avi', '.mov', '.webm']:
                outro_video_path = os.path.join(outro_dir, f)
                break

    if intro_video_path:
        intro_dur = get_audio_duration(intro_video_path, ffmpeg_path)
        log(f"Found intro video: {intro_video_path} (duration: {intro_dur:.2f}s)")
        if project.get('introSubIndex'):
            try:
                intro_sub_idx_val = int(project.get('introSubIndex'))
                if 0 < intro_sub_idx_val <= len(shots):
                    intro_insert_idx = intro_sub_idx_val
                    insert_time_offset = sum(shot_durations[:intro_sub_idx_val])
                    log(f"Intro video will be inserted after shot {intro_sub_idx_val} at timeline offset {insert_time_offset:.2f}s")
                else:
                    log(f"[Warning] Invalid introSubIndex: {intro_sub_idx_val}. Ignoring intro video.")
            except Exception as e:
                log(f"[Warning] Failed to parse introSubIndex: {e}")
        
    if outro_video_path:
        outro_dur = get_audio_duration(outro_video_path, ffmpeg_path)
        log(f"Found outro video: {outro_video_path} (duration: {outro_dur:.2f}s)")

    # Shift subtitles starting from insert_time_offset
    if intro_dur > 0 and intro_insert_idx is not None:
        for block in srt_blocks:
            if block['start'] >= insert_time_offset:
                block['start'] += intro_dur
                block['end'] += intro_dur

    # Step 1: Scan first video clip to find resolution metadata
    target_width = 1280
    target_height = 720
    target_fps = 24
    
    first_video_source = None
    # Prioritize scanning local files to avoid network delay
    for idx, shot in enumerate(shots):
        asset_stt = shot.get('original_id') if shot.get('is_hook') else (idx + 1)
        local_cand = find_local_asset(output_dir, asset_stt, 'videos')
        if local_cand and os.path.exists(local_cand):
            first_video_source = local_cand
            break

    if not first_video_source:
        # Fallback to absolute paths or single download check
        for shot in shots[:3]:
            video_url = shot.get('videoUrl')
            if video_url:
                if os.path.exists(video_url):
                    first_video_source = video_url
                    break
                elif video_url.startswith('http'):
                    local_temp_check = os.path.join(output_dir, "temp_check.mp4")
                    if download_file(video_url, local_temp_check):
                        first_video_source = local_temp_check
                        break

    if first_video_source and os.path.exists(first_video_source):
        try:
            cap = cv2.VideoCapture(first_video_source)
            if cap.isOpened():
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                f = cap.get(cv2.CAP_PROP_FPS)
                if w > 0 and h > 0:
                    target_width = w
                    target_height = h
                if f > 0:
                    target_fps = int(round(f))
            cap.release()
        except Exception as e:
            log(f"[Warning] Failed to read video metadata: {e}")
        finally:
            if "temp_check.mp4" in first_video_source and os.path.exists(first_video_source):
                os.remove(first_video_source)
                
    log(f"Resolution selected: {target_width}x{target_height} @ {target_fps} fps")

    def process_single_shot(idx_shot_tuple):
        idx, shot = idx_shot_tuple
        stt = idx + 1
        duration = shot_durations[idx]
        clip_name = f"shot_{idx:03d}.mp4"
        temp_clip_path = os.path.join(output_dir, clip_name)

        video_url = shot.get('videoUrl')
        image_url = shot.get('imageUrl')

        video_source = None
        image_source = None

        # Try to resolve local assets according to flexible naming rules
        asset_stt = shot.get('original_id') if shot.get('is_hook') else stt
        if export_mode == 'videos_only':
            video_source = find_local_asset(output_dir, asset_stt, 'videos')
        elif export_mode == 'images_only':
            image_source = find_local_asset(output_dir, asset_stt, 'images')
        else: # mixed
            video_source = find_local_asset(output_dir, asset_stt, 'videos')
            if not video_source:
                image_source = find_local_asset(output_dir, asset_stt, 'images')

        # Fallback to URLs if local not found
        if not video_source and not image_source:
            if video_url:
                if video_url.startswith('http'):
                    local_raw_video = os.path.join(output_dir, f"raw_video_{idx:03d}.mp4")
                    if download_file(video_url, local_raw_video):
                        video_source = local_raw_video
                elif os.path.exists(video_url):
                    video_source = video_url
                else:
                    cand = os.path.join(output_dir, video_url)
                    if os.path.exists(cand):
                        video_source = cand

            if not video_source and image_url:
                if image_url.startswith('http'):
                    local_raw_image = os.path.join(output_dir, f"raw_image_{idx:03d}.jpg")
                    if download_file(image_url, local_raw_image):
                        image_source = local_raw_image
                elif os.path.exists(image_url):
                    image_source = image_url
                else:
                    cand = os.path.join(output_dir, image_url)
                    if os.path.exists(cand):
                        image_source = cand

        # Render clip
        if video_source and os.path.exists(video_source):
            if process_video_clip(video_source, duration, temp_clip_path, target_width, target_height, target_fps):
                if "raw_video_" in video_source and os.path.exists(video_source):
                    try:
                        os.remove(video_source)
                    except Exception:
                        pass
                return idx, temp_clip_path

        if image_source and os.path.exists(image_source):
            create_ken_burns_video(image_source, duration, temp_clip_path, target_width, target_height, target_fps)
            if "raw_image_" in image_source and os.path.exists(image_source):
                try:
                    os.remove(image_source)
                except Exception:
                    pass
            return idx, temp_clip_path

        # Placeholder fallback
        img = np.zeros((target_height, target_width, 3), dtype=np.uint8)
        text_label = f"Hook: Shot {asset_stt}" if shot.get('is_hook') else f"No Media: Shot {stt}"
        cv2.putText(img, text_label, (target_width // 4, target_height // 2), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_clip_path, fourcc, target_fps, (target_width, target_height))
        for _ in range(int(duration * target_fps)):
            out.write(img)
        out.release()
        return idx, temp_clip_path

    # Compile shots in parallel using thread pool
    temp_video_clips = [None] * len(shots)
    max_workers = min(8, os.cpu_count() or 4)
    log(f"Processing shots in parallel with {max_workers} worker threads...")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(process_single_shot, (idx, shot)): idx for idx, shot in enumerate(shots)}
        
        completed_count = 0
        for future in as_completed(futures):
            idx = futures[future]
            try:
                _, temp_clip_path = future.result()
                temp_video_clips[idx] = temp_clip_path
            except Exception as e:
                log(f"[Error] Failed processing shot {idx + 1}: {e}")
                # Safe fallback black video
                stt = idx + 1
                duration = shot_durations[idx]
                clip_name = f"shot_{idx:03d}.mp4"
                temp_clip_path = os.path.join(output_dir, clip_name)
                
                img = np.zeros((target_height, target_width, 3), dtype=np.uint8)
                cv2.putText(img, f"Error Shot {stt}", (target_width // 4, target_height // 2), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                fourcc = cv2.VideoWriter_fourcc(*'mp4v')
                out = cv2.VideoWriter(temp_clip_path, fourcc, target_fps, (target_width, target_height))
                for _ in range(int(duration * target_fps)):
                    out.write(img)
                out.release()
                temp_video_clips[idx] = temp_clip_path

            completed_count += 1
            percent = int((completed_count / len(shots)) * 60)
            log(f"PROGRESS: {percent}")
            log(f"Finished Shot {idx + 1}/{len(shots)}")

    # Stitch video segments
    log("PROGRESS: 65")
    log("Stitching video segments together...")

    # Process intro/outro video clips to normalize them (Silent video write)
    temp_intro_clip = None
    if intro_video_path and intro_insert_idx is not None and intro_dur > 0:
        temp_intro_clip = os.path.join(output_dir, "temp_intro_processed.mp4")
        log(f"Processing intro video to match project settings...")
        if not process_video_clip(intro_video_path, intro_dur, temp_intro_clip, target_width, target_height, target_fps):
            log("[Warning] Failed to process intro video clip.")
            temp_intro_clip = None

    temp_outro_clip = None
    if outro_video_path and outro_dur > 0:
        temp_outro_clip = os.path.join(output_dir, "temp_outro_processed.mp4")
        log(f"Processing outro video to match project settings...")
        if not process_video_clip(outro_video_path, outro_dur, temp_outro_clip, target_width, target_height, target_fps):
            log("[Warning] Failed to process outro video clip.")
            temp_outro_clip = None

    concat_video_path = os.path.join(output_dir, "stitched_silent.mp4")
    
    list_path = os.path.join(output_dir, "concat_list.txt")
    with open(list_path, 'w', encoding='utf-8') as lf:
        for idx, clip in enumerate(temp_video_clips):
            # Insert intro before clip if index matches
            if temp_intro_clip and idx == intro_insert_idx:
                escaped_intro = temp_intro_clip.replace('\\', '/').replace("'", "'\\''")
                lf.write(f"file '{escaped_intro}'\n")
            
            escaped = clip.replace('\\', '/').replace("'", "'\\''")
            lf.write(f"file '{escaped}'\n")
            
        # If intro is at the very end
        if temp_intro_clip and intro_insert_idx == len(temp_video_clips):
            escaped_intro = temp_intro_clip.replace('\\', '/').replace("'", "'\\''")
            lf.write(f"file '{escaped_intro}'\n")
            
        # Append outro
        if temp_outro_clip:
            escaped_outro = temp_outro_clip.replace('\\', '/').replace("'", "'\\''")
            lf.write(f"file '{escaped_outro}'\n")

    concat_cmd = [
        ffmpeg_path, '-y', '-f', 'concat', '-safe', '0', '-i', list_path,
        '-c', 'copy', concat_video_path
    ]
    try:
        subprocess.run(concat_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        log(f"FATAL: Video concatenation failed: {e}")
        return 1
    finally:
        if os.path.exists(list_path):
            os.remove(list_path)

    for clip in temp_video_clips:
        if os.path.exists(clip):
            os.remove(clip)

    downloaded_temps = []
    mixed_audio_path = os.path.join(output_dir, "mixed_audio.mp3")

    try:
        # Step 3: Audio Mixing (Voices chunking and multi-segment BGM suggestions)
        log("PROGRESS: 75")
        log("Processing audio overlays (Voices and Multi-segment BGM)...")

        # Calculate total time
        total_time_accumulated = sum(shot_durations) + intro_dur + outro_dur
     
        # srt_blocks is already parsed and mapped early
        unique_orig_ids = sorted(list(set(b['orig_id'] for b in srt_blocks)))
     
        # Get naturally sorted local voice files
        voice_dir = os.path.join(output_dir, 'voice')
        local_voice_files = []
        if os.path.exists(voice_dir):
            for f in os.listdir(voice_dir):
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac']:
                    local_voice_files.append(os.path.join(voice_dir, f))
     
        import re
        def natural_sort_key(filepath):
            filename = os.path.basename(filepath)
            match = re.search(r'\d+', filename)
            if match:
                return (int(match.group()), filename)
            return (float('inf'), filename)
     
        local_voice_files.sort(key=natural_sort_key)
     
        voiceover_files = []
     
        if local_voice_files:
            log(f"Found {len(local_voice_files)} voice files in voice/. Mapping using intelligent ID search.")
            
            # Helper to find voice file for a given orig_id
            def find_voice_file_for_id(orig_id):
                for vf in local_voice_files:
                    filename = os.path.basename(vf)
                    digits = re.findall(r'\d+', filename)
                    if digits and int(digits[0]) == orig_id:
                        return vf
                # Fallback to index-based if not found by name digits
                try:
                    idx = unique_orig_ids_original.index(orig_id)
                    if idx < len(local_voice_files):
                        return local_voice_files[idx]
                except Exception:
                    pass
                return None

            # Find unique original IDs from the main story (non-hook blocks)
            story_blocks = [b for b in srt_blocks if not str(b['index']).startswith('hook_')]
            unique_orig_ids_original = sorted(list(set(b['orig_id'] for b in story_blocks)))

            # Map voiceover files
            mapped_keys = set()
            for block in srt_blocks:
                orig_id = block.get('orig_id')
                is_hook_block = str(block['index']).startswith('hook_')
                
                # Check if this original ID is hidden
                if str(orig_id) in hidden_srt_indexes:
                    continue
                
                # We identify each occurrence (hook vs story) using a unique key
                key = f"hook_{orig_id}" if is_hook_block else f"story_{orig_id}"
                if key in mapped_keys:
                    continue
                
                # Find matching blocks for this occurrence
                if is_hook_block:
                    matching = [b for b in srt_blocks if str(b['index']).startswith('hook_') and b.get('orig_id') == orig_id]
                else:
                    matching = [b for b in srt_blocks if not str(b['index']).startswith('hook_') and b.get('orig_id') == orig_id]
                
                if not matching:
                    continue
                
                first_block = min(matching, key=lambda b: b['start'])
                start_time = first_block['start']
                
                voice_file = find_voice_file_for_id(orig_id)
                if voice_file and os.path.exists(voice_file):
                    voiceover_files.append((voice_file, int(start_time * 1000)))
                    mapped_keys.add(key)
                    log(f"Mapped voice file {os.path.basename(voice_file)} to {key} at start time {start_time:.2f}s")
        else:
            # Fallback to shot-based voice files if voice/ folder is empty
            log("[Warning] No voice files found in voice/ directory. Falling back to shot voice configurations.")
            accumulated = 0.0
            for idx, shot in enumerate(shots):
                duration = shot_durations[idx]
                voice_file = shot.get('voiceUrl') or shot.get('voicePath')
                if not voice_file:
                    local_cand_mp3 = os.path.join(output_dir, "voice", f"voice_{shot.get('id')}.mp3")
                    local_cand_wav = os.path.join(output_dir, "voice", f"voice_{shot.get('id')}.wav")
                    if os.path.exists(local_cand_mp3):
                        voice_file = local_cand_mp3
                    elif os.path.exists(local_cand_wav):
                        voice_file = local_cand_wav
     
                if voice_file:
                    v_start_time = accumulated
                    if intro_insert_idx is not None and idx >= intro_insert_idx:
                        v_start_time += intro_dur
                    
                    # Check if this shot covers a hidden subtitle block
                    if is_shot_sub_hidden(shot, idx, hidden_srt_indexes):
                        log(f"Skipping fallback voice file for hidden shot {idx+1}")
                        accumulated += duration
                        continue
                    
                    if voice_file.startswith('http'):
                        local_voice = os.path.join(output_dir, f"voice_temp_{idx:03d}.mp3")
                        if download_file(voice_file, local_voice):
                            voiceover_files.append((local_voice, int(v_start_time * 1000)))
                            downloaded_temps.append(local_voice)
                    elif os.path.exists(voice_file):
                        voiceover_files.append((voice_file, int(v_start_time * 1000)))
                accumulated += duration

        # Extract and mix natural audio for hidden video segments
        log("Processing natural audio overlays for hidden narration clips...")
        accumulated = 0.0
        for idx, shot in enumerate(shots):
            duration = shot_durations[idx]
            
            # Check if shot's subtitle is hidden
            is_hidden = is_shot_sub_hidden(shot, idx, hidden_srt_indexes)
            
            if is_hidden:
                # Find original video source
                asset_stt = shot.get('original_id') if shot.get('is_hook') else (idx + 1)
                video_source = find_local_asset(output_dir, asset_stt, 'videos')
                if not video_source:
                    video_url = shot.get('videoUrl')
                    if video_url:
                        if video_url.startswith('http'):
                            video_source = os.path.join(output_dir, f"raw_video_{idx:03d}.mp4")
                        elif os.path.exists(video_url):
                            video_source = video_url
                        else:
                            cand = os.path.join(output_dir, video_url)
                            if os.path.exists(cand):
                                video_source = cand
                
                # If video_source exists, extract natural audio
                if video_source and os.path.exists(video_source):
                    v_start_time = accumulated
                    if intro_insert_idx is not None and idx >= intro_insert_idx:
                        v_start_time += intro_dur
                    
                    natural_wav = os.path.join(output_dir, f"temp_natural_{idx}.wav")
                    if extract_natural_audio(video_source, duration, natural_wav, ffmpeg_path):
                        voiceover_files.append((natural_wav, int(v_start_time * 1000)))
                        downloaded_temps.append(natural_wav)
                        log(f"Extracted and queued natural audio for shot {idx+1} at {v_start_time:.2f}s")
                        
            accumulated += duration

        # Extract and mix in intro/outro audio if available
        intro_audio_wav = None
        if intro_video_path and intro_dur > 0 and intro_insert_idx is not None:
            wav_path = os.path.join(output_dir, "temp_intro_audio.wav")
            if extract_audio(intro_video_path, wav_path, ffmpeg_path):
                intro_audio_wav = wav_path
                voiceover_files.append((intro_audio_wav, int(insert_time_offset * 1000)))
                downloaded_temps.append(intro_audio_wav)
                log(f"Extracted and queued intro audio for mixing at {insert_time_offset:.2f}s")
     
        outro_audio_wav = None
        if outro_video_path and outro_dur > 0:
            wav_path = os.path.join(output_dir, "temp_outro_audio.wav")
            if extract_audio(outro_video_path, wav_path, ffmpeg_path):
                outro_audio_wav = wav_path
                voiceover_files.append((outro_audio_wav, int((sum(shot_durations) + intro_dur) * 1000)))
                downloaded_temps.append(outro_audio_wav)
                log(f"Extracted and queued outro audio for mixing at {(sum(shot_durations) + intro_dur):.2f}s")
     
        # Parse BGM suggestions
        bgm_suggestions = project.get('bgmSuggestions', [])
        valid_bgm_inputs = []
        
        for sugg in bgm_suggestions:
            audio_file = sugg.get('audioFile')
            if audio_file:
                bgm_path = os.path.join(output_dir, "bgm", audio_file)
                if os.path.exists(bgm_path):
                    start_sec, dur_sec = parse_bgm_time_range(sugg.get('timeRange', ''))
                    
                    # Shift BGM suggestions by hooks duration
                    start_sec += hooks_dur
                    
                    # Shift BGM suggestions if intro is inserted
                    if intro_insert_idx is not None and intro_dur > 0:
                        if start_sec >= insert_time_offset:
                            start_sec += intro_dur
                        elif start_sec < insert_time_offset and (start_sec + dur_sec) > insert_time_offset:
                            dur_sec += intro_dur
                    
                    # Extend BGM suggestion if outro is present and this segment ends at the very end
                    if outro_dur > 0 and (start_sec + dur_sec) >= (sum(shot_durations) + intro_dur - 0.1):
                        dur_sec += outro_dur
     
                    valid_bgm_inputs.append({
                        'path': bgm_path,
                        'start_ms': int(start_sec * 1000),
                        'dur_sec': dur_sec,
                        'volume_db': sugg.get('volumeDb', -18)
                    })
     
        # Fallback to single BGM path if suggestions are empty
        if not valid_bgm_inputs and project.get('bgmPath'):
            bgm_path = project.get('bgmPath')
            if os.path.exists(bgm_path):
                valid_bgm_inputs.append({
                    'path': bgm_path,
                    'start_ms': 0,
                    'dur_sec': total_time_accumulated,
                    'volume_db': -18
                })

        audio_mix_ok = False

        if voiceover_files or valid_bgm_inputs:
            # Group voices if count > 50 to avoid WinError 206
            chunk_files = []
            if len(voiceover_files) > 50:
                voice_chunks = [voiceover_files[i:i+50] for i in range(0, len(voiceover_files), 50)]
                for chunk_idx, chunk in enumerate(voice_chunks):
                    chunk_wave_path = os.path.join(output_dir, f"temp_voice_chunk_{chunk_idx}.wav")
                    chunk_inputs = ['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo']
                    chunk_filter = ""
                    for v_idx, (v_path, delay) in enumerate(chunk):
                        chunk_inputs.extend(['-i', v_path])
                        chunk_filter += f"[{v_idx+1}:a]aresample=44100,adelay={delay}|{delay}[v{v_idx}];"
                    
                    chunk_mix_str = "[0:a]"
                    for v_idx in range(len(chunk)):
                        chunk_mix_str += f"[v{v_idx}]"
                    chunk_filter += f"{chunk_mix_str}amix=inputs={len(chunk)+1}:duration=first:dropout_transition=2:normalize=0[aout]"
                    
                    chunk_cmd = [ffmpeg_path, '-y'] + chunk_inputs + [
                        '-filter_complex', chunk_filter,
                        '-map', '[aout]',
                        '-t', f"{total_time_accumulated:.3f}",
                        chunk_wave_path
                    ]
                    
                    subprocess.run(chunk_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    chunk_files.append(chunk_wave_path)
            
            # Merge voice chunks and BGM suggestion inputs
            audio_inputs = []
            filter_complex = ""
            mix_inputs = 0
            
            audio_inputs.extend(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo'])
            
            if len(voiceover_files) > 50:
                for idx, c_path in enumerate(chunk_files):
                    audio_inputs.extend(['-i', c_path])
                    filter_complex += f"[{idx+1}:a]aresample=44100[c{idx}];"
                    mix_inputs += 1
            else:
                for idx, (v_path, delay) in enumerate(voiceover_files):
                    audio_inputs.extend(['-i', v_path])
                    filter_complex += f"[{idx+1}:a]aresample=44100,adelay={delay}|{delay}[v{idx}];"
                    mix_inputs += 1
                    
            # Add multiple BGM suggestion inputs
            bgm_labels = []
            for idx, bgm_in in enumerate(valid_bgm_inputs):
                bgm_input_idx = mix_inputs + 1
                audio_inputs.extend(['-stream_loop', '-1', '-i', bgm_in['path']])
                filter_complex += f"[{bgm_input_idx}:a]atrim=0:{bgm_in['dur_sec']:.3f},adelay={bgm_in['start_ms']}|{bgm_in['start_ms']},volume={bgm_in['volume_db']}dB[bgm{idx}];"
                bgm_labels.append(f"[bgm{idx}]")
                mix_inputs += 1

            # Mix strings
            mix_str = "[0:a]"
            if len(voiceover_files) > 50:
                for idx in range(len(chunk_files)):
                    mix_str += f"[c{idx}]"
            else:
                for idx in range(len(voiceover_files)):
                    mix_str += f"[v{idx}]"
            
            for idx in range(len(valid_bgm_inputs)):
                mix_str += f"[bgm{idx}]"
                
            filter_complex += f"{mix_str}amix=inputs={mix_inputs+1}:duration=first:dropout_transition=2:normalize=0[aout]"
            
            audio_mix_cmd = [ffmpeg_path, '-y'] + audio_inputs + [
                '-filter_complex', filter_complex,
                '-map', '[aout]',
                '-t', f"{total_time_accumulated:.3f}",
                mixed_audio_path
            ]
            
            try:
                subprocess.run(audio_mix_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                audio_mix_ok = True
            except Exception as e:
                log(f"[Warning] Audio mixing failed: {e}")
                if os.path.exists(mixed_audio_path):
                    os.remove(mixed_audio_path)
            finally:
                # Cleanup temp voice chunks
                for c_path in chunk_files:
                    if os.path.exists(c_path):
                        os.remove(c_path)

        # Step 4: Burn in subtitles and merge video & audio in a single pass
        log("PROGRESS: 85")
        final_output_path = os.path.join(output_dir, "final_compiled_video.mp4")

        if not burn_subtitles:
            log("burnSubtitles is False. Skipping subtitle rendering. Merging directly...")
            # Check for NVIDIA NVENC hardware acceleration support
            use_nvenc = check_nvenc(ffmpeg_path)
            if use_nvenc:
                log("GPU Hardware Acceleration (h264_nvenc) is available. Using GPU for final compilation.")
                v_codec = ['-c:v', 'h264_nvenc']
            else:
                log("GPU acceleration not available or failed testing. Using CPU encoding with optimized fast preset.")
                v_codec = ['-c:v', 'libx264', '-preset', 'veryfast']

            merge_cmd = [ffmpeg_path, '-y', '-i', concat_video_path]
            if audio_mix_ok:
                merge_cmd.extend(['-i', mixed_audio_path])
                merge_cmd.extend(['-map', '0:v', '-map', '1:a'] + v_codec + ['-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k'])
            else:
                merge_cmd.extend(v_codec + ['-pix_fmt', 'yuv420p'])

            merge_cmd.extend(['-shortest', final_output_path])
            
            try:
                subprocess.run(merge_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            except Exception as e:
                log(f"FATAL: Final video compilation failed: {e}")
                return 1
        else:
            log("Burning subtitles and encoding final video in a single pass...")
            cap = cv2.VideoCapture(concat_video_path)
            if not cap.isOpened():
                log("FATAL: Cannot open concatenated video.")
                return 1
                
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS) or target_fps
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Check for NVIDIA NVENC hardware acceleration support
            use_nvenc = check_nvenc(ffmpeg_path)
            if use_nvenc:
                log("GPU Hardware Acceleration (h264_nvenc) is available. Using GPU for final compilation.")
                v_codec = ['-c:v', 'h264_nvenc']
            else:
                log("GPU acceleration not available or failed testing. Using CPU encoding with optimized fast preset.")
                v_codec = ['-c:v', 'libx264', '-preset', 'veryfast']
                
            # Build FFmpeg command for piped input
            ffmpeg_cmd = [
                ffmpeg_path, '-y',
                '-f', 'rawvideo',
                '-vcodec', 'rawvideo',
                '-pix_fmt', 'bgr24',
                '-s', f"{width}x{height}",
                '-r', f"{fps}",
                '-i', '-',  # Read video from stdin
            ]
            if audio_mix_ok:
                ffmpeg_cmd.extend(['-i', mixed_audio_path])
                ffmpeg_cmd.extend(['-map', '0:v', '-map', '1:a'] + v_codec + ['-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k'])
            else:
                ffmpeg_cmd.extend(v_codec + ['-pix_fmt', 'yuv420p'])
                
            ffmpeg_cmd.extend(['-shortest', final_output_path])
            
            # Open log file to avoid pipe blocking on stderr
            ffmpeg_log_path = os.path.join(output_dir, "ffmpeg_burn_log.txt")
            log_file = open(ffmpeg_log_path, 'wb')
            
            try:
                # Start FFmpeg subprocess
                process = subprocess.Popen(
                    ffmpeg_cmd,
                    stdin=subprocess.PIPE,
                    stdout=log_file,
                    stderr=log_file
                )
            except Exception as e:
                log(f"FATAL: Failed to start FFmpeg subprocess: {e}")
                log_file.close()
                cap.release()
                return 1
                
            # Precompute O(1) active_texts list
            max_possible_frames = max(total_frames, int(total_time_accumulated * fps) + 1000)
            active_texts = [""] * max_possible_frames
            
            # Sort srt_blocks by start time just to be sure
            srt_blocks.sort(key=lambda x: x['start'])
            
            for block in srt_blocks:
                orig_id_str = str(block.get('orig_id', ''))
                block_idx_str = str(block['index'])
                if orig_id_str in hidden_srt_indexes or block_idx_str in hidden_srt_indexes:
                    continue
                    
                start_frame = max(0, int(block['start'] * fps))
                end_frame = min(max_possible_frames - 1, int(block['end'] * fps))
                for f in range(start_frame, end_frame + 1):
                    active_texts[f] = block['text']
                    
            frame_idx = 0
            current_overlay_text = None
            current_overlay_bgr = None
            current_overlay_alpha = None
            current_y_min = 0
            current_y_max = height
            
            try:
                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break
                        
                    active_text = ""
                    if frame_idx < len(active_texts):
                        active_text = active_texts[frame_idx]
                        
                    if active_text:
                        if active_text != current_overlay_text:
                            current_overlay_text = active_text
                            current_overlay_bgr, current_overlay_alpha, current_y_min, current_y_max = create_subtitle_overlay(
                                width, height,
                                active_text,
                                font_size=font_size,
                                font_family=font_family,
                                position=vertical_align,
                                bg_opacity=bg_opacity,
                                outline_width=outline_width,
                                outline_color=outline_color,
                                text_color=text_color,
                                max_line_len=max_line_length,
                                bg_full_width=bg_full_width,
                                bg_height=bg_height,
                                bottom_margin=bottom_margin,
                                bg_color=bg_color
                            )
                        # Sliced NumPy blending for maximum speed
                        frame_slice = frame[current_y_min:current_y_max, :]
                        overlay_slice = current_overlay_bgr[current_y_min:current_y_max, :]
                        alpha_slice = current_overlay_alpha[current_y_min:current_y_max, :]
                        
                        frame[current_y_min:current_y_max, :] = (
                            frame_slice * (1.0 - alpha_slice) + overlay_slice * alpha_slice
                        ).astype(np.uint8)
                    else:
                        current_overlay_text = None
                        current_overlay_bgr = None
                        current_overlay_alpha = None
                        
                    # Write raw frame bytes to FFmpeg stdin
                    process.stdin.write(frame.tobytes())
                    frame_idx += 1
                    
                    if total_frames > 0 and frame_idx % 30 == 0:
                        percent = int(85 + (frame_idx / total_frames) * 10)
                        log(f"PROGRESS: {percent}")
            except Exception as e:
                log(f"Error during subtitle burning / writing: {e}")
                try:
                    process.kill()
                except Exception:
                    pass
                log_file.close()
                cap.release()
                return 1
                
            cap.release()
            
            # Close stdin and wait for FFmpeg to finish encoding
            try:
                process.stdin.close()
            except Exception:
                pass
                
            exit_code = process.wait()
            log_file.close()
            
            if exit_code != 0:
                log(f"FATAL: FFmpeg encoding failed with exit code {exit_code}")
                try:
                    if os.path.exists(ffmpeg_log_path):
                        with open(ffmpeg_log_path, 'r', encoding='utf-8', errors='ignore') as lf:
                            lines = lf.readlines()
                            log("--- FFmpeg Subprocess Errors ---")
                            for line in lines[-20:]:
                                log(line.strip())
                except Exception:
                    pass
                return 1
            else:
                try:
                    if os.path.exists(ffmpeg_log_path):
                        os.remove(ffmpeg_log_path)
                except Exception:
                    pass

    finally:
        if os.path.exists(concat_video_path):
            os.remove(concat_video_path)
        if os.path.exists(mixed_audio_path):
            try:
                os.remove(mixed_audio_path)
            except Exception:
                pass
        for temp_f in downloaded_temps:
            if os.path.exists(temp_f):
                try:
                    os.remove(temp_f)
                except Exception:
                    pass
        for clip in temp_video_clips:
            if clip and os.path.exists(clip):
                try:
                    os.remove(clip)
                except Exception:
                    pass
        if temp_intro_clip and os.path.exists(temp_intro_clip):
            try:
                os.remove(temp_intro_clip)
            except Exception:
                pass
        if temp_outro_clip and os.path.exists(temp_outro_clip):
            try:
                os.remove(temp_outro_clip)
            except Exception:
                pass

    log("PROGRESS: 100")
    log(f"Success! Final video output: {final_output_path}")
    return 0

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python videoCompiler.py <config.json> <subtitles.srt> <output_dir>")
        sys.exit(1)
    
    c_path = sys.argv[1]
    s_path = sys.argv[2]
    out_dir = sys.argv[3]
    
    code = compile_project(c_path, s_path, out_dir)
    sys.exit(code)
