"""
MPLADS AI Engine: TF-IDF Lexical Similarity
"""
from typing import List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def compute_tfidf_similarity(corpus: List[str], target_index: int) -> List[Tuple[int, float]]:
    """Calculates cosine similarity between a target document and all others in the corpus."""
    if len(corpus) < 2:
        return []

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
    tfidf_matrix = vectorizer.fit_transform(corpus)

    similarities = cosine_similarity(tfidf_matrix[target_index], tfidf_matrix).flatten()
    results = []
    for idx, sim in enumerate(similarities):
        if idx != target_index:
            results.append((idx, float(sim)))

    return sorted(results, key=lambda x: x[1], reverse=True)
