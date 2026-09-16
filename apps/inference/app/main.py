import os
import tempfile
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.config import settings
from app.classifier import classify
from app.summary import summarize
from app.relevance import is_review
from app.aspects import tag_aspects
from app import transcribe

app = FastAPI(title="Staylark Inference Service")

@app.middleware("http")
async def require_api_key(request: Request, call_next):
    if request.url.path != "/health" and settings.inference_api_key:
        if request.headers.get("X-Inference-Key") != settings.inference_api_key:
            return JSONResponse(status_code=401, content={"detail": "invalid inference key"})
    return await call_next(request)

@app.get("/health")
def health():
    return {"status": "ok"}

class TextIn(BaseModel):
    text: str

class ClassifyOut(BaseModel):
    sentiment: str
    score: int

@app.post("/classify", response_model=ClassifyOut)
def classify_route(body: TextIn):
    return classify(body.text)

class SummaryOut(BaseModel):
    summary: str | None

@app.post("/summarize", response_model=SummaryOut)
def summarize_route(body: TextIn):
    return {"summary": summarize(body.text)}

class RelevanceOut(BaseModel):
    isReview: bool
    score: float

@app.post("/relevance", response_model=RelevanceOut)
def relevance_route(body: TextIn):
    return is_review(body.text)

class AspectsOut(BaseModel):
    topics: list[str]

@app.post("/aspects", response_model=AspectsOut)
def aspects_route(body: TextIn):
    """Multi-label zero-shot aspect tags for a single review transcript."""
    return {"topics": tag_aspects(body.text)}

class TranscribeOut(BaseModel):
    text: str

@app.post("/transcribe", response_model=TranscribeOut)
async def transcribe_route(file: UploadFile = File(...), prompt: Optional[str] = Form(None)):
    data = await file.read()
    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(data)
        tmp.flush()
        text = transcribe.run_whisper(tmp.name, prompt=prompt)
    return {"text": text}
