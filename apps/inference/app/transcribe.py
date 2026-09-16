from functools import lru_cache
from app.config import settings


@lru_cache(maxsize=1)
def _model():
    from faster_whisper import WhisperModel
    return WhisperModel(
        settings.whisper_model,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


def _words(text: str) -> list[str]:
    return [w for w in (t.strip(".,!?;:\"'") for t in text.lower().split()) if w]


def _looks_like_prompt_echo(text: str, prompt: str) -> bool:
    """On non-speech audio Whisper can regurgitate the initial_prompt verbatim. If
    nearly all of the transcript's words come from the prompt, it's an echo, not speech."""
    t_words = _words(text)
    if not t_words:
        return True
    p_words = set(_words(prompt))
    overlap = sum(1 for w in t_words if w in p_words) / len(t_words)
    return overlap >= 0.8


def run_whisper(audio_path: str, prompt: str | None = None) -> str:
    # vad_filter strips non-speech (silence, background/car noise) BEFORE decoding, so
    # the model can't hallucinate text — including echoing back the initial_prompt.
    try:
        segments, _info = _model().transcribe(
            audio_path,
            initial_prompt=prompt or None,
            vad_filter=True,
        )
        parts = []
        for seg in segments:
            # Drop segments the model itself flags as likely non-speech.
            if getattr(seg, "no_speech_prob", 0.0) > 0.6:
                continue
            parts.append(seg.text.strip())
        text = " ".join(p for p in parts if p).strip()
    except ValueError:
        # faster-whisper raises "max() arg is an empty sequence" when vad_filter
        # removes ALL audio (i.e. there is no speech at all). Treat it as empty —
        # the backend then rejects the submission as unintelligible.
        return ""

    # Belt-and-suspenders: if VAD let some noise through and the model echoed the
    # prompt, drop it rather than return a fake "review".
    if prompt and text and _looks_like_prompt_echo(text, prompt):
        return ""
    return text
