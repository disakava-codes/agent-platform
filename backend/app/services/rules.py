"""
rules.py

Rule engine για MVP:
- Φορτώνει ruleset JSON ανά org_type
- Κάνει match με match_any / match_all
- Επιστρέφει structured απόφαση: decision, answer, actions, rule_id, confidence
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

RULESETS_DIR = Path(__file__).resolve().parent.parent / "rulesets"


def _load_ruleset(org_type: str) -> Dict[str, Any]:
    path = RULESETS_DIR / f"{org_type}_v1.json"
    if not path.exists():
        return {"version": "1.0", "org_type": org_type, "rules": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _norm(text: str) -> str:
    return (text or "").strip().lower()


def decide(org_type: str, question: str) -> Dict[str, Any]:
    q = _norm(question)
    ruleset = _load_ruleset(org_type)
    rules: List[Dict[str, Any]] = ruleset.get("rules", [])

    for rule in rules:
        match_any = [_norm(x) for x in rule.get("match_any", [])]
        match_all = [_norm(x) for x in rule.get("match_all", [])]

        any_ok = True
        if match_any:
            any_ok = any(k and k in q for k in match_any)

        all_ok = True
        if match_all:
            all_ok = all(k and k in q for k in match_all)

        if any_ok and all_ok:
            # ✅ υποστηρίζουμε και intent και decision
            decision = rule.get("decision") or rule.get("intent") or rule.get("id")

            return {
                "decision": decision,
                "rule_id": rule.get("id"),
                "confidence": rule.get("confidence", 0.8),
                "answer": rule.get("answer", ""),
                "actions": rule.get("actions", []),
            }

    # fallback
    return {
        "decision": "UNKNOWN",
        "rule_id": None,
        "confidence": 0.2,
        "answer": "Δεν υπάρχει καταγεγραμμένος κανόνας για αυτό το αίτημα.",
        "actions": [],
    }
