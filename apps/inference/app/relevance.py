from app.config import settings
from app.zero_shot import classifier

# Zero-shot candidate labels (set "C" — chosen empirically for the widest gap between
# genuine reviews and off-topic/test rambling, across English + Bulgarian).
_REVIEW_LABEL = "a guest describing their experience at a place they stayed"
_OFFTOPIC_LABEL = "someone testing the system or talking about something unrelated"


def is_review(text: str) -> dict:
    """Decide whether a transcript is genuine property feedback vs off-topic content."""
    result = classifier()(
        text[:1000],
        [_REVIEW_LABEL, _OFFTOPIC_LABEL],
        hypothesis_template="This text is {}.",
    )
    score = result["scores"][result["labels"].index(_REVIEW_LABEL)]
    return {"isReview": score >= settings.relevance_threshold, "score": round(float(score), 3)}
