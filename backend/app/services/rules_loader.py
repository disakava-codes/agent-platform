import json
from pathlib import Path
from typing import Any, Dict, List

RULESETS_DIR = Path(__file__).resolve().parent.parent / "rulesets"

def load_ruleset(org_type: str) -> Dict[str, Any]:
    """
    Φορτώνει ruleset JSON ανά org_type.
    Π.χ. org_type='college' => app/rulesets/college_v1.json
    """
    path = RULESETS_DIR / f"{org_type}_v1.json"
    if not path.exists():
        raise FileNotFoundError(f"Ruleset not found for org_type='{org_type}' at {path}")
    return json.loads(path.read_text(encoding="utf-8"))

def get_rules(org_type: str) -> List[Dict[str, Any]]:
    rs = load_ruleset(org_type)
    return rs.get("rules", [])
