"""
actions.py

Action runner: εκτελεί actions που επιστρέφει ο rule engine.

Οι κανόνες (JSON) λένε *τι* actions χρειάζονται.
Οι action handlers (Python) υλοποιούν *πώς* τα κάνουμε (DB, APIs, κλπ).
"""

from typing import Any, Dict, List, Callable, TypedDict
from app.services.mock_db import get_tenant_db

class ActionOutput(TypedDict, total=False):
    ok: bool
    data: Dict[str, Any]
    error: str

ActionFn = Callable[[str, Dict[str, Any]], ActionOutput]

def _need_student_id(ctx: Dict[str, Any]) -> str | None:
    return (ctx.get("fields") or {}).get("student_id")

def action_check_student_status(tenant_id: str, ctx: Dict[str, Any]) -> ActionOutput:
    db = get_tenant_db(tenant_id)
    student_id = _need_student_id(ctx)
    if not student_id:
        return {"ok": False, "error": "Missing fields.student_id"}

    student = db["students"].get(student_id)
    if not student:
        return {"ok": False, "error": f"Student not found: {student_id}"}

    return {"ok": True, "data": {"student": {"id": student_id, **student}}}

def action_check_financial_clearance(tenant_id: str, ctx: Dict[str, Any]) -> ActionOutput:
    db = get_tenant_db(tenant_id)
    student_id = _need_student_id(ctx)
    if not student_id:
        return {"ok": False, "error": "Missing fields.student_id"}

    fin = db["finance"].get(student_id, {"balance_eur": 0})
    is_clear = fin.get("balance_eur", 0) <= 0

    return {"ok": True, "data": {"finance": fin, "is_financially_clear": is_clear}}

def action_get_absences(tenant_id: str, ctx: Dict[str, Any]) -> ActionOutput:
    db = get_tenant_db(tenant_id)
    student_id = _need_student_id(ctx)
    if not student_id:
        return {"ok": False, "error": "Missing fields.student_id"}

    abs_info = db["absences"].get(student_id, {"total": 0})
    return {"ok": True, "data": {"absences": abs_info}}

def action_check_absence_limits(tenant_id: str, ctx: Dict[str, Any]) -> ActionOutput:
    db = get_tenant_db(tenant_id)
    absences = (ctx.get("runtime_data") or {}).get("absences", {})
    total = absences.get("total")

    if total is None:
        return {"ok": False, "error": "Absences not loaded yet (run get_absences first)"}

    limit = db["limits"]["max_absences"]
    over_limit = total >= limit
    return {"ok": True, "data": {"absence_limit": limit, "over_absence_limit": over_limit}}

# Registry: string -> function
ACTIONS: Dict[str, ActionFn] = {
    "check_student_status": action_check_student_status,
    "check_financial_clearance": action_check_financial_clearance,
    "get_absences": action_get_absences,
    "check_absence_limits": action_check_absence_limits,
}

def run_actions(tenant_id: str, action_names: List[str], ctx: Dict[str, Any]) -> Dict[str, Any]:
    """
    Εκτελεί actions με σειρά.
    Μαζεύει:
    - action_results: status ανά action
    - data: merged data από actions

    Επιπλέον κρατά runtime_data στο ctx για να μπορεί ένα action να βασιστεί σε προηγούμενο.
    """
    results: List[Dict[str, Any]] = []
    merged_data: Dict[str, Any] = {}

    ctx.setdefault("runtime_data", {})  # για chaining μεταξύ actions

    for name in action_names:
        fn = ACTIONS.get(name)
        if not fn:
            results.append({"name": name, "ok": False, "error": "Unknown action"})
            continue

        out = fn(tenant_id, ctx)
        ok = bool(out.get("ok"))
        results.append({"name": name, **out})

        if ok and isinstance(out.get("data"), dict):
            merged_data.update(out["data"])
            # runtime_data κρατάει τα τελευταία δεδομένα για chaining
            ctx["runtime_data"].update(out["data"])

    return {"data": merged_data, "action_results": results}
