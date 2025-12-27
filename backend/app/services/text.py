# app/services/text.py
import re
import unicodedata

def normalize_el(text: str) -> str:
    """
    Normalization για ελληνικά:
    - lower
    - remove tonos/diacritics
    - remove punctuation
    - collapse whitespace
    """
    if not text:
        return ""

    t = text.strip().lower()

    # remove diacritics/tonos
    t = unicodedata.normalize("NFD", t)
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Mn")
    t = unicodedata.normalize("NFC", t)

    # keep letters/numbers/spaces
    t = re.sub(r"[^0-9a-zα-ω\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t
