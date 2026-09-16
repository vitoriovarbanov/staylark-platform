from functools import lru_cache
from app.config import settings

def label_to_score(label: str) -> int:
    """nlptown labels look like '4 stars' / '1 star'. Extract the leading int."""
    return int(label.strip().split()[0])

def star_to_sentiment(score: int) -> str:
    if score <= 2:
        return "NEGATIVE"
    if score == 3:
        return "NEUTRAL"
    return "POSITIVE"

@lru_cache(maxsize=1)
def _pipeline():
    import torch
    from transformers import pipeline
    pipe = pipeline("sentiment-analysis", model=settings.classifier_model)
    # Dynamic int8 quantization of the Linear layers ~halves the model's resident
    # memory and speeds up CPU inference. Star scores are integers, so the tiny
    # numeric drift from quantization effectively never changes the output label.
    pipe.model = torch.quantization.quantize_dynamic(
        pipe.model, {torch.nn.Linear}, dtype=torch.qint8
    )
    return pipe

def classify(text: str) -> dict:
    # Let the tokenizer truncate by TOKENS (model max 512 ≈ ~2000 chars) instead of
    # slicing 512 characters — the old char-slice fed the model only the first ~40%
    # of a long review, dropping the strongest signal in the conclusion.
    result = _pipeline()(text, truncation=True, max_length=512)[0]
    score = label_to_score(result["label"])
    return {"sentiment": star_to_sentiment(score), "score": score}
