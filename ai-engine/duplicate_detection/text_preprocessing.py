"""
MPLADS AI Engine: Duplicate Text Preprocessing
"""
import re

STOPWORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "for", "with", "on", "at",
    "by", "from", "as", "is", "was", "are", "construction", "repair", "installation"
}

def tokenize_and_clean(text: str) -> list:
    """Cleans, lowercases, and strips common boilerplate domain stopwords."""
    if not text:
        return []
    text = text.lower()
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = [t.strip() for t in text.split() if t.strip()]
    return [t for t in tokens if t not in STOPWORDS]
