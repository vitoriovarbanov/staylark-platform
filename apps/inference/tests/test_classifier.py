import pytest
from app.classifier import star_to_sentiment, label_to_score

@pytest.mark.parametrize("label,score", [
    ("1 star", 1), ("2 stars", 2), ("3 stars", 3), ("4 stars", 4), ("5 stars", 5),
])
def test_label_to_score(label, score):
    assert label_to_score(label) == score

@pytest.mark.parametrize("score,sentiment", [
    (1, "NEGATIVE"), (2, "NEGATIVE"), (3, "NEUTRAL"), (4, "POSITIVE"), (5, "POSITIVE"),
])
def test_star_to_sentiment(score, sentiment):
    assert star_to_sentiment(score) == sentiment

@pytest.mark.integration
def test_classify_real_negative():
    from app.classifier import classify
    out = classify("Everything was broken and dirty, terrible stay, never again.")
    assert out["sentiment"] == "NEGATIVE"
    assert 1 <= out["score"] <= 2
