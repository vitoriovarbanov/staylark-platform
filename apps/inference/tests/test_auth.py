import app.config as config
from fastapi.testclient import TestClient
from app.main import app

def test_classify_requires_key(monkeypatch):
    monkeypatch.setattr(config.settings, "inference_api_key", "secret")
    client = TestClient(app)
    res = client.post("/classify", json={"text": "hi"})
    assert res.status_code == 401

def test_health_no_key_needed(monkeypatch):
    monkeypatch.setattr(config.settings, "inference_api_key", "secret")
    client = TestClient(app)
    assert client.get("/health").status_code == 200
