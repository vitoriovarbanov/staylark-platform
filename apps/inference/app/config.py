import os

class Settings:
    inference_api_key: str = os.getenv("INFERENCE_API_KEY", "")
    whisper_model: str = os.getenv("WHISPER_MODEL", "base")
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute_type: str = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
    classifier_model: str = os.getenv(
        "CLASSIFIER_MODEL", "nlptown/bert-base-multilingual-uncased-sentiment"
    )
    summary_min_sentences: int = int(os.getenv("SUMMARY_MIN_SENTENCES", "4"))
    summary_sentences: int = int(os.getenv("SUMMARY_SENTENCES", "2"))
    # Relevance gate: multilingual zero-shot NLI model deciding whether a transcript is
    # actually a property review (vs off-topic / test rambling). Conservative threshold so
    # genuine — even terse or negative — reviews pass. (Embeddings can't separate this:
    # an off-topic ramble can out-score a terse real review — NLI entailment does.)
    # RELEVANCE_MODEL is honoured as a fallback for back-compat with earlier deploys.
    zero_shot_model: str = os.getenv(
        "ZERO_SHOT_MODEL",
        os.getenv("RELEVANCE_MODEL", "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"),
    )
    relevance_threshold: float = float(os.getenv("RELEVANCE_THRESHOLD", "0.3"))
    # Aspect tagging: a review is embedded with a multilingual sentence model and compared
    # (cosine) to per-aspect prototype vectors. Tag aspects above the threshold, capped at
    # max. Embeddings ground on what the text actually says, where zero-shot NLI did not
    # (it rated every stay review "about location" ~1.0 regardless of content).
    aspect_model: str = os.getenv(
        "ASPECT_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    aspect_threshold: float = float(os.getenv("ASPECT_THRESHOLD", "0.42"))
    aspect_max: int = int(os.getenv("ASPECT_MAX", "4"))

settings = Settings()
