from functools import lru_cache

from app.config import settings


@lru_cache(maxsize=1)
def classifier():
    """Single shared zero-shot-classification pipeline.

    Both the relevance gate and aspect tagging run on the SAME mDeBERTa model, so we
    load it exactly once here (lru_cache) rather than once per caller — otherwise the
    ~560 MB weights would sit in memory twice. Heavy import stays inside the function
    so unit tests can patch this without pulling in transformers/torch.
    """
    from transformers import pipeline

    return pipeline("zero-shot-classification", model=settings.zero_shot_model)
