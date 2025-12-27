"""
rules.py

Rule engine για MVP (αναβαθμισμένο):
- Φορτώνει ruleset JSON ανά org_type από app/rulesets/{org_type}_v1.json
- Κάνει robust matching:
  1) normalization (πεζά, χωρίς τόνους, χωρίς στίξη)
  2) strict match (substring) σε match_any / match_all
  3) fuzzy fallback (τυπογραφικά) για match_any
- Επιστρέφει structured απόφαση: decision, answer, actions, rule_id, confidence
"""

from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

from rapidfuzz import fuzz

RULESETS_DIR = Path(__file__).resolve().parent.parent / "rulesets"

# simple cache: org_type -> ruleset dict
_RULESET_CACHE: Dict[str, Dict[str, Any]] = {}


def _load_ruleset(org_type: str) -> Dict[str, Any]:
    """
    Φορτώνει ruleset από: app/rulesets/{org_type}_v1.json
    Με caching για να μην διαβάζουμε συνέχεια δίσκο.
    """
    org_type = (org_type or "").strip().lower()

    if org_type in _RULESET_CACHE:
        return _RULESET_CACHE[org_type]

    path = RULESETS_DIR / f"{org_type}_v1.json"
    if not path.exists():
        rs = {"version": "1.0", "org_type": org_type, "rules": []}
        _RULESET_CACHE[org_type] = rs
        return rs

    rs = json.loads(path.read_text(encoding="utf-8"))
    _RULESET_CACHE[org_type] = rs
    return rs


def clear_ruleset_cache() -> None:
    """Χρήσιμο σε dev αν αλλάζεις rulesets και δεν κάνεις restart."""
    _RULESET_CACHE.clear()


def _norm(text: str) -> str:
    """
    Normalization για ελληνικά:
    - lower
    - remove tonos/diacritics
    - remove punctuation
    - collapse whitespace

    Έτσι: "Αλλαγή Τμήματος!!!" == "αλλαγη τμηματος"
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


def _contains_all(q: str, terms: List[str]) -> bool:
    return all(t in q for t in terms)


def _contains_any(q: str, terms: List[str]) -> bool:
    return any(t in q for t in terms)


def _fuzzy_any(q: str, terms: List[str], threshold: int = 78) -> bool:
    """
    Fuzzy matching για να πιάνει μικρά λάθη:
    - "απουσιεσ" ~ "απουσιες"
    Χρησιμοποιούμε partial_ratio γιατί δουλεύει καλά όταν το keyword
    βρίσκεται μέσα σε μεγαλύτερη πρόταση.
    """
    for t in terms:
        if not t:
            continue
        if fuzz.partial_ratio(q, t) >= threshold:
            return True
    return False


def decide(org_type: str, question: str) -> Dict[str, Any]:
    """
    Returns:
    {
      "decision": "...",
      "rule_id": "...",
      "confidence": 0.9,
      "answer": "...",
      "actions": [...],
    }
    """
    q_raw = question or ""
    q = _norm(q_raw)

    ruleset = _load_ruleset(org_type)
    rules: List[Dict[str, Any]] = ruleset.get("rules", [])

    best_rule: Optional[Dict[str, Any]] = None
    best_score = -1
    best_conf = 0.0
    best_debug: Dict[str, Any] = {}

    for rule in rules:
        match_any = [_norm(x) for x in rule.get("match_any", []) if str(x).strip()]
        match_all = [_norm(x) for x in rule.get("match_all", []) if str(x).strip()]

        # Hard gate: match_all πρέπει να περνάει (αν υπάρχει)
        all_ok = (not match_all) or _contains_all(q, match_all)

        # match_any μπορεί να περάσει strict ή fuzzy
        any_strict_ok = (not match_any) or _contains_any(q, match_any)
        any_fuzzy_ok = False
        if not any_strict_ok and match_any:
            any_fuzzy_ok = _fuzzy_any(q, match_any, threshold=78)

        eligible = all_ok and (any_strict_ok or any_fuzzy_ok)
        if not eligible:
            continue

        # Score: ώστε να επιλέγουμε το πιο σχετικό rule όταν πολλά ταιριάζουν
        score = 0
        # match_all => πιο ισχυρό
        if match_all:
            score += 40
            score += 10 * sum(1 for t in match_all if t in q)

        # match_any => επίσης σημαντικό
        if match_any:
            score += 30
            score += 5 * sum(1 for t in match_any if t in q)
            if any_fuzzy_ok:
                score += 10  # bonus για fuzzy hit

        # confidence tie-breaker
        conf = float(rule.get("confidence", 0.8))

        if score > best_score or (score == best_score and conf > best_conf):
            best_score = score
            best_conf = conf
            best_rule = rule
            best_debug = {
                "normalized_question": q,
                "match_any": match_any,
                "match_all": match_all,
                "all_ok": all_ok,
                "any_strict_ok": any_strict_ok,
                "any_fuzzy_ok": any_fuzzy_ok,
                "score": score,
            }

    if best_rule:
        decision = best_rule.get("decision") or best_rule.get("intent") or best_rule.get("id")

        return {
            "decision": decision,
            "rule_id": best_rule.get("id"),
            "confidence": best_rule.get("confidence", 0.8),
            "answer": best_rule.get("answer", ""),
            "actions": best_rule.get("actions", []),
            # dev-only (αν σε ενοχλεί, σβήσ’το)
            "_debug": best_debug,
        }

    return {
        "decision": "UNKNOWN",
        "rule_id": None,
        "confidence": 0.2,
        "answer": "Δεν υπάρχει καταγεγραμμένος κανόνας για αυτό το αίτημα.",
        "actions": [],
        "_debug": {"normalized_question": q, "org_type": (org_type or "").strip().lower(), "rules_loaded": len(rules)},
    }
