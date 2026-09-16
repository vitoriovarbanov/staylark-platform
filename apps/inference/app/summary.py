import re

from app.config import settings
from app.embeddings import embed


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def needs_summary(text: str) -> bool:
    """Only summarise when the transcript is long enough to be worth it."""
    return len(_sentences(text)) >= settings.summary_min_sentences


def summarize(text: str) -> str | None:
    """Extractive summary: pick the sentences closest to the transcript's centroid in
    multilingual embedding space, returned in their original order.

    Language-agnostic — works on Bulgarian and English alike — and reuses the aspect-tagging
    embedding model, so it needs no English-only NLP tooling (the previous LexRank/sumy path
    hardcoded an English tokenizer and degraded on Cyrillic input)."""
    sentences = _sentences(text)
    if len(sentences) < settings.summary_min_sentences:
        return None
    if len(sentences) <= settings.summary_sentences:
        return text.strip() or None

    import torch.nn.functional as F

    embeddings = embed(sentences)
    centroid = F.normalize(embeddings.mean(0, keepdim=True), p=2, dim=1)
    scores = (embeddings @ centroid.T).squeeze(1)
    ranked = sorted(range(len(sentences)), key=lambda i: float(scores[i]), reverse=True)
    chosen = sorted(ranked[: settings.summary_sentences])
    return " ".join(sentences[i] for i in chosen) or None
