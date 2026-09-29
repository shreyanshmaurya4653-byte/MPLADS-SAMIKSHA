"""
MPLADS AI Engine: Semantic Jaccard Similarity
"""
from typing import List

try:
    from .text_preprocessing import tokenize_and_clean
except Exception:
    from duplicate_detection.text_preprocessing import tokenize_and_clean

def compute_jaccard_from_sets(set_a: set, set_b: set) -> float:
    """Calculates Jaccard similarity directly from pre-tokenized sets with zero re-allocation."""
    if not set_a or not set_b:
        return 0.0
    inter = len(set_a & set_b)
    if inter == 0:
        return 0.0
    union = len(set_a) + len(set_b) - inter
    return round(inter / union, 3)

def compute_jaccard_similarity(text_a: str, text_b: str) -> float:
    set_a = set(tokenize_and_clean(text_a))
    set_b = set(tokenize_and_clean(text_b))
    return compute_jaccard_from_sets(set_a, set_b)

