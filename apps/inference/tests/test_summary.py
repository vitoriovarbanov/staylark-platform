from app.summary import needs_summary

def test_short_text_skips_summary():
    assert needs_summary("It was great.") is False

def test_long_text_needs_summary():
    text = "The flat was clean. The location was perfect. WiFi was slow. " \
           "Parking was hard. Staff were friendly. Would return."
    assert needs_summary(text) is True

import pytest
@pytest.mark.integration
def test_summarize_long_returns_subset():
    from app.summary import summarize
    text = ("The apartment was spotless and modern. The location near the old town was ideal. "
            "However the WiFi kept dropping during calls. Parking was a real struggle every night. "
            "The host responded quickly to messages. We would happily stay again next year.")
    out = summarize(text)
    assert out and len(out) < len(text)


@pytest.mark.integration
def test_summarize_bulgarian_returns_subset():
    # Embedding-centroid summary is language-agnostic — a Cyrillic transcript must summarise
    # (the old LexRank/English-tokenizer path degraded here).
    from app.summary import summarize
    text = ("Апартаментът беше чист и модерен. Локацията близо до стария град беше идеална. "
            "Но Wi-Fi прекъсваше постоянно. Паркирането беше кошмар всяка вечер. "
            "Домакинът отговаряше бързо. Бихме отседнали отново.")
    out = summarize(text)
    assert out and len(out) < len(text)
