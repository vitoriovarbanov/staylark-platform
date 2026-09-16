import re
from functools import lru_cache

from app.config import settings
from app.embeddings import embed

# Fixed property-review aspect taxonomy (fine-grained). Each aspect is defined by prototype
# phrases — in BOTH English and Bulgarian — that get averaged into one prototype vector. A
# review is split into clauses; each clause is embedded and compared (cosine) to every
# prototype, and the aspects whose best clause-similarity clears the threshold are tagged.
#
# Bilingual prototypes matter: the MiniLM is multilingual, but cross-lingual similarity runs
# lower than same-language similarity, so an English-only prototype under-scores Bulgarian
# clauses and they fall below the threshold. Same-language Bulgarian phrases let real
# Bulgarian reviews clear the bar.
#
# Why per-clause: a whole-sentence embedding gets captured by its most concrete clause
# ("WiFi was slow" -> wifi) and drowns out weaker co-topics ("near the beach" -> beach).
# Tagging each clause and unioning recovers them.
#
# Why embeddings (not zero-shot NLI): NLI entailment measures topical *plausibility*, so it
# rated every stay review "about location/value" ~1.0 regardless of the words. Embedding
# similarity grounds on what the text actually says.
_ASPECTS: dict[str, list[str]] = {
    "cleanliness": ["the place was clean", "dirty and dusty", "spotless and tidy", "апартаментът беше чист", "мръсно и прашно"],
    "location": ["great location and neighbourhood", "central and walkable", "close to everything", "страхотна локация", "близо до центъра"],
    "beach": ["close to the beach", "the seafront and the sea", "a short walk to the beach", "близо до плажа", "морето и плажа"],
    "view": ["an amazing view", "sea view from the balcony", "beautiful scenery", "невероятна гледка", "морска гледка"],
    "noise": ["it was noisy at night", "quiet and peaceful", "loud street and thin walls", "беше шумно през нощта", "тихо и спокойно"],
    "communication": ["the host was responsive", "hard to reach the landlord", "good communication with the host", "домакинът беше отзивчив", "комуникацията с домакина"],
    "value": ["good value for money", "too expensive for what you get", "worth the price", "добра стойност за парите", "твърде скъпо"],
    "comfort": ["a comfortable bed", "uncomfortable mattress", "cozy and spacious", "удобно легло", "неудобен матрак"],
    "wifi": ["the wifi", "internet connection", "the wifi was slow", "интернетът", "вай-фай беше бавен"],
    "kitchen": ["the kitchen", "a well equipped kitchen", "cooking facilities", "кухнята", "добре оборудвана кухня"],
    "parking": ["parking the car", "a place to park", "parking was a nightmare", "паркиране", "място за паркиране"],
    "air-conditioning": ["the air conditioning", "the heating", "too hot or too cold", "климатикът", "отоплението не работеше"],
    "check-in": ["easy check-in", "the check-in process", "arrival and key pickup", "настаняване", "настаняването беше лесно"],
    "accuracy": ["the photos were misleading", "not as described in the listing", "matched the description", "снимките бяха подвеждащи", "не както е описано"],
    "maintenance": ["the hot water broke", "plumbing problems", "broken and needed repair", "топлата вода спря", "нещо беше счупено"],
    "amenities": ["the facilities", "pool gym and spa", "washing machine and extras", "съоръженията", "пералня и екстри"],
}

# Split on sentence punctuation + common clause connectives (English AND Bulgarian), so
# "near the beach, WiFi slow" / "близо до плажа, но беше шумно" become independent clauses.
_CLAUSE_SPLIT = re.compile(
    r"[.!?;,]|\b(?:but|and|though|however|which|so|но|и|а|защото|обаче)\b",
    re.IGNORECASE,
)


def _clauses(text: str) -> list[str]:
    parts = _CLAUSE_SPLIT.split(text)
    # Keep every non-empty fragment (including single words like "noisy" after a connective —
    # dropping those silently lost terse co-topics such as "comfortable but noisy" -> noise).
    clauses = [p.strip() for p in parts if p and p.strip()]
    return clauses or [text.strip()]


@lru_cache(maxsize=1)
def _prototypes():
    """(keys, prototype-matrix). Each aspect's prototype = mean of its phrase embeddings."""
    import torch
    import torch.nn.functional as F

    keys = list(_ASPECTS)
    protos = torch.stack([embed(_ASPECTS[k]).mean(0) for k in keys])
    return keys, F.normalize(protos, p=2, dim=1)


def tag_aspects(text: str) -> list[str]:
    """Aspect tags for one review. Each clause is compared (cosine) to every aspect
    prototype; an aspect is kept if its best clause clears `aspect_threshold`. Results are
    ordered by similarity and capped at `aspect_max`. Empty list for blank or off-topic
    text (nothing clears the bar) — never a fabricated topic."""
    if not text or not text.strip():
        return []

    keys, protos = _prototypes()
    clauses = _clauses(text)
    # One batched forward pass for all clauses (rows), then cosine vs every prototype.
    sims = embed(clauses) @ protos.T  # [n_clauses, n_aspects]
    best_per_aspect = sims.max(dim=0).values  # strongest clause score per aspect

    scored = [
        (keys[i], float(best_per_aspect[i]))
        for i in range(len(keys))
        if float(best_per_aspect[i]) >= settings.aspect_threshold
    ]
    scored.sort(key=lambda kv: kv[1], reverse=True)
    return [key for key, _ in scored[: settings.aspect_max]]
