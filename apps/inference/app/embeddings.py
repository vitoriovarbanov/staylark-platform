from functools import lru_cache

from app.config import settings


@lru_cache(maxsize=1)
def _model():
    """Cached multilingual sentence-embedding model (tokenizer + encoder).

    Loaded once on first use. Heavy imports stay inside the function so unit tests that
    don't touch embeddings run without torch/transformers installed.
    """
    from transformers import AutoModel, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(settings.aspect_model)
    model = AutoModel.from_pretrained(settings.aspect_model)
    model.eval()
    return tokenizer, model


def embed(texts: list[str]):
    """Mean-pooled, L2-normalised sentence embeddings for a list of texts.

    Mean pooling over token embeddings (mask-weighted) is the standard pooling for the
    sentence-transformers MiniLM family; normalising lets cosine similarity be a dot product.
    """
    import torch
    import torch.nn.functional as F

    tokenizer, model = _model()
    batch = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        output = model(**batch)
    mask = batch["attention_mask"].unsqueeze(-1).float()
    pooled = (output.last_hidden_state * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
    return F.normalize(pooled, p=2, dim=1)
