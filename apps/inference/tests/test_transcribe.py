from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_transcribe_returns_text():
    with patch("app.transcribe.run_whisper", return_value="hello world"):
        res = client.post(
            "/transcribe",
            files={"file": ("clip.webm", b"\x00\x01", "audio/webm")},
        )
    assert res.status_code == 200
    assert res.json()["text"] == "hello world"


import os, pytest
@pytest.mark.integration
def test_transcribe_real_clip():
    from app.transcribe import run_whisper
    path = os.path.join(os.path.dirname(__file__), "fixtures", "sample.wav")
    text = run_whisper(path)
    assert isinstance(text, str) and len(text) > 0
