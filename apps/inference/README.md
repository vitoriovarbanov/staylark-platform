# Staylark Inference Service

Self-hosted Python (FastAPI) microservice that provides the AI primitives for the
feedback pipeline: speech-to-text transcription, sentiment/score classification,
extractive summarization, an off-topic relevance gate, and embedding-based aspect (topic)
tagging. It replaces the third-party OpenAI dependency with self-hosted open-source
models. The relevance gate uses a multilingual zero-shot NLI model (mDeBERTa); aspect
tagging uses multilingual sentence embeddings (MiniLM) compared to per-aspect prototypes.

This service is consumed by the Node backend (`apps/backend`) over HTTP, secured by
a shared secret.

## Endpoints

- `GET /health` — liveness probe, returns `{ "status": "ok" }`.

- `POST /classify` — `{text}` → `{sentiment, score}`.
- `POST /summarize` — `{text}` → `{summary|null}` (length-gated).
- `POST /transcribe` — audio file → `{text}`.
- `POST /relevance` — `{text}` → `{isReview, score}` (off-topic gate).
- `POST /aspects` — `{text}` → `{topics:[...]}` (embedding aspect tags, per clause).

All non-health endpoints require the `X-Inference-Key` header.

## Running locally

The full `requirements.txt` pulls in heavy ML dependencies (torch, transformers,
faster-whisper) and is intended for the Docker image / production. For
everyday local development and running the default (non-integration) test suite you
only need the lightweight web dependencies.

### Lightweight dev/test setup

```bash
cd apps/inference
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi 'uvicorn[standard]' pydantic pytest httpx python-multipart
```

### Full setup (heavy ML deps, for model-backed endpoints / Docker)

```bash
cd apps/inference
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
cd apps/inference
.venv/bin/python -m pytest -v
```

`pytest.ini` excludes tests marked `@pytest.mark.integration` by default (those load
real models and are slow), so the default run needs only the lightweight deps.
To include the model-backed integration tests:

```bash
.venv/bin/python -m pytest -m integration -v
```

## Environment variables

All are optional and have defaults (see `app/config.py`):

| Variable                | Default                                                       | Purpose                                   |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `INFERENCE_API_KEY`     | `""`                                                          | Shared secret for authenticating callers. |
| `WHISPER_MODEL`         | `base`                                                        | faster-whisper model size.                |
| `WHISPER_DEVICE`        | `cpu`                                                         | Compute device for Whisper.               |
| `WHISPER_COMPUTE_TYPE`  | `int8`                                                        | Quantization / compute type for Whisper.  |
| `CLASSIFIER_MODEL`      | `nlptown/bert-base-multilingual-uncased-sentiment`            | Sentiment/score classifier model.         |
| `ZERO_SHOT_MODEL`       | `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`   | Relevance-gate NLI model.                 |
| `ASPECT_MODEL`          | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Aspect-tagging embedding model.           |
| `SUMMARY_MIN_SENTENCES` | `4`                                                           | Minimum sentences before summarizing.     |
| `SUMMARY_SENTENCES`     | `2`                                                           | Number of sentences in a summary.         |
| `RELEVANCE_THRESHOLD`   | `0.3`                                                         | Off-topic gate cutoff (lower = lenient).  |
| `ASPECT_THRESHOLD`      | `0.42`                                                        | Min cosine similarity for an aspect tag.  |

## Deploy (Railway)

The service is deployed as its **own Railway service**, separate from the Node
backend and frontend.

1. **Create a new Railway service** in the same project as the backend.
2. **Build from the root `Dockerfile.inference`.** Like `Dockerfile.backend` and
   `Dockerfile.frontend`, it lives at the repo root and uses the repository root as
   its build context (its `COPY` paths are `apps/inference/requirements.txt` and
   `apps/inference/app`). Set the service's Dockerfile path to `Dockerfile.inference`.
3. **Enable private networking** on the service. The Node backend reaches it over the
   internal Railway network (e.g. `http://<service>.railway.internal:8000`) rather than
   the public internet, so the inference service does not need a public domain.
4. **Set environment variables:**

    | Variable                | Required | Notes                                                                                                   |
    | ----------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
    | `INFERENCE_API_KEY`     | **Yes**  | Shared secret; must match the backend's `INFERENCE_API_KEY`.                                            |
    | `WHISPER_MODEL`         | No       | faster-whisper model size (default `base`).                                                             |
    | `WHISPER_COMPUTE_TYPE`  | No       | Whisper quantization / compute type (default `int8`).                                                   |
    | `SUMMARY_MIN_SENTENCES` | No       | Minimum sentences before summarizing (default `4`).                                                     |
    | `RELEVANCE_THRESHOLD`   | No       | Off-topic gate cutoff (default `0.3`).                                                                  |
    | `ASPECT_THRESHOLD`      | No       | Min cosine similarity for an aspect tag (default `0.42`).                                               |
    | `CLASSIFIER_MODEL`      | No       | Sentiment/score classifier model (default `nlptown/...`).                                               |
    | `ZERO_SHOT_MODEL`       | No       | Relevance-gate NLI model (default `MoritzLaurer/mDeBERTa-...`).                                         |
    | `ASPECT_MODEL`          | No       | Aspect-tagging embedding model (default `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`). |

    The container listens on `$PORT` (defaults to `8000`); Railway injects `PORT`
    automatically.

### Cold starts and model loading

Model weights **are baked into the image** at build time (`Dockerfile.inference`), so
there is no download on first request. The first call to a given endpoint after a
deploy or restart still pays a one-time in-process model _load_ (a few seconds); the
model then stays resident.

### Topics

Aspect tags are produced **synchronously per review** by `/aspects` when the backend
submits feedback — there is no batch refit and no minimum corpus. The backend exposes
an admin `POST /api/feedback/backfill` to re-tag existing rows on demand (e.g. after a
transient outage, or to re-tag history); see `docs/inference-service-guide.md`.
