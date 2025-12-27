from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Tenant, User
from app.routes.auth import get_current_user
from app.services.rules import decide
from app.services.actions import run_actions

router = APIRouter(tags=["decision"])


class DecisionRequest(BaseModel):
    question: str
    fields: Optional[Dict[str, Any]] = None


@router.post("/tenants/{tenant_id}/decision")
def decision(
    tenant_id: str,
    payload: DecisionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Decision endpoint (Decision-first):
    - Επιτρέπει κλήση μόνο από χρήστη του ίδιου tenant
    - Κάνει match σε JSON ruleset (χωρίς LLM)
    - Τρέχει actions (mock providers) και επιστρέφει structured αποτέλεσμα
    """

    # 1) Authorization
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Forbidden: tenant access denied")

    # 2) Tenant lookup (DB)
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # 3) Decide based on org_type + question
    result = decide(tenant.org_type, payload.question)

    # 4) Build context for actions
    ctx = {
        "question": payload.question,
        "fields": payload.fields or {},
        "user": {"email": user.email, "role": user.role},
        "tenant": {"id": tenant_id, "org_type": tenant.org_type},
    }

    # 5) Run actions + attach results
    exec_out = run_actions(tenant_id, result.get("actions", []), ctx)
    result["data"] = exec_out.get("data", {})
    result["action_results"] = exec_out.get("action_results", [])

    # 6) Add metadata
    result.update(
        {
            "tenant_id": tenant_id,
            "org_type": tenant.org_type,
            "requested_by": user.email,
        }
    )

    return result
