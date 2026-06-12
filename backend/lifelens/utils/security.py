import re
import logging
from better_profanity import profanity
from nudenet import NudeDetector

logger = logging.getLogger(__name__)

# Initialize better_profanity
profanity.load_censor_words()

# Initialize NudeNet detector lazily to avoid overhead if not used
_nude_detector = None

def get_nude_detector():
    global _nude_detector
    if _nude_detector is None:
        logger.info("Initializing NudeNet detector...")
        _nude_detector = NudeDetector()
    return _nude_detector

# Common prompt injection patterns
PROMPT_INJECTION_PATTERNS = [
    r"\bignore\s+(all\s+)?(previous\s+)?instructions\b",
    r"\bdisregard\s+(all\s+)?(previous\s+)?instructions\b",
    r"\byou\s+are\s+now\b",
    r"\bsystem\s+override\b",
    r"\bforget\s+(all\s+)?(previous\s+)?instructions\b",
    r"\bprint\s+your\s+(initial\s+)?prompt\b",
    r"\bdo\s+not\s+obey\b",
    r"\bbypass\b.*\bfilters\b",
]

PROMPT_INJECTION_REGEX = re.compile("|".join(PROMPT_INJECTION_PATTERNS), re.IGNORECASE)

def contains_prompt_injection(text: str) -> bool:
    """Check if the text contains common prompt injection patterns."""
    if not text:
        return False
    return bool(PROMPT_INJECTION_REGEX.search(text))

def contains_profanity(text: str) -> bool:
    """Check if the text contains profanity."""
    if not text:
        return False
    return profanity.contains_profanity(text)

def censor_profanity(text: str) -> str:
    """Censor profanity in the text."""
    if not text:
        return text
    return profanity.censor(text)

def check_image_nudity(image_path: str) -> bool:
    """
    Check an image for explicit nudity.
    Returns True if explicit nudity is detected.
    """
    detector = get_nude_detector()
    try:
        # NudeNet returns a list of dictionaries with 'class' and 'score'
        detections = detector.detect(image_path)
        
        # We consider these classes as explicit/inappropriate for our context
        explicit_classes = {
            "BUTTOCKS_EXPOSED", 
            "FEMALE_BREAST_EXPOSED", 
            "FEMALE_GENITALIA_EXPOSED", 
            "MALE_BREAST_EXPOSED", 
            "ANUS_EXPOSED",
            "MALE_GENITALIA_EXPOSED"
        }
        
        for detection in detections:
            if detection.get("class") in explicit_classes and detection.get("score", 0) > 0.5:
                logger.warning(f"Nudity detected: {detection.get('class')} with score {detection.get('score')}")
                return True
        return False
    except Exception as e:
        logger.error(f"Nudity detection failed: {e}")
        # Fail open or closed? Better to fail open if the detector crashes to not block all uploads
        # But for strictly safe, we could return True or raise. Let's return False and log.
        return False

# Magic byte signatures for common file types
# Format: {mime_type: [list_of_byte_signatures]}
MAGIC_BYTES = {
    "image/jpeg": [b"\xFF\xD8\xFF"],
    "image/png": [b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A"],
    "image/gif": [b"\x47\x49\x46\x38\x37\x61", b"\x47\x49\x46\x38\x39\x61"],
    "image/webp": [b"RIFF"], # Technically starts with RIFF, then 4 bytes size, then WEBP
    "audio/mpeg": [b"\xFF\xFB", b"\x49\x44\x33"], # ID3 or frame sync
    "audio/wav": [b"RIFF"], # Starts with RIFF, then size, then WAVE
    "audio/ogg": [b"\x4F\x67\x67\x53"],
    "audio/flac": [b"\x66\x4C\x61\x43"],
    "audio/webm": [b"\x1A\x45\xDF\xA3"] # Matroska/WebM
}

def validate_file_mime(file_bytes: bytes, expected_mimes: list[str]) -> bool:
    """
    Validate the file bytes against a list of expected MIME types using magic bytes.
    """
    if not file_bytes or len(file_bytes) < 12:
        return False

    for mime in expected_mimes:
        signatures = MAGIC_BYTES.get(mime, [])
        for sig in signatures:
            if file_bytes.startswith(sig):
                if mime in ["image/webp", "audio/wav"]:
                    # Additional check for RIFF-based formats
                    if len(file_bytes) >= 12:
                        format_sig = file_bytes[8:12]
                        if mime == "image/webp" and format_sig == b"WEBP":
                            return True
                        if mime == "audio/wav" and format_sig == b"WAVE":
                            return True
                else:
                    return True
                    
    # Note: we might be missing some edge cases or newer formats (e.g. HEIC, WebM, etc)
    # If the user uploads something that is an image/audio but not caught by our simple list,
    # it will be rejected. This is safer.
    return False
