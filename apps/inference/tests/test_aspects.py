import pytest

from app.aspects import _ASPECTS, tag_aspects


def test_taxonomy_keys_clean_and_have_prototypes():
    keys = list(_ASPECTS)
    assert all(key == key.strip().lower() for key in keys), "keys are short lowercase chips"
    assert all(len(phrases) >= 1 for phrases in _ASPECTS.values()), "every aspect needs prototype phrases"


def test_blank_text_returns_no_tags():
    # Must not touch the model — guards the empty/whitespace short-circuit.
    assert tag_aspects("") == []
    assert tag_aspects("   ") == []


@pytest.mark.integration
def test_tags_real_review_aspects():
    tags = tag_aspects("The flat was spotless and right in the centre, but the street was very noisy at night.")
    assert "cleanliness" in tags
    assert "location" in tags
    assert "noise" in tags
    assert len(tags) <= 4


@pytest.mark.integration
def test_per_clause_recovers_co_topics():
    # A concrete clause ("WiFi was slow") must not drown out a weaker co-topic in another
    # clause ("near the beach") — per-clause tagging recovers both.
    tags = tag_aspects("Great location near the beach, WiFi was a touch slow.")
    assert "wifi" in tags
    assert "beach" in tags


@pytest.mark.integration
def test_single_word_clause_after_connective_is_kept():
    # "noisy" is a one-word clause after "but" — it must still tag noise.
    assert "noise" in tag_aspects("Bed was comfortable but noisy.")


@pytest.mark.integration
def test_bulgarian_review_tags_aspects():
    # Bulgarian is a first-class input; same-language prototypes must let it tag aspects.
    tags = tag_aspects("Апартаментът беше чист, но климатикът не работеше и Wi-Fi беше бавен.")
    assert "cleanliness" in tags
    assert "wifi" in tags or "air-conditioning" in tags


@pytest.mark.integration
def test_offtopic_text_yields_few_or_no_tags():
    tags = tag_aspects("I've got nothing to say, just testing how this thing works.")
    assert len(tags) <= 1
