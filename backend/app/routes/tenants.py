"""
routes/tenants.py

Tenants endpoints.

Μετάβαση από in-memory dict -> SQLite DB.

Γιατί:
- Να μην χάνονται τα tenants με restart
- Να μπορείς να κάνεις stable auth + tenant management
- Να "δέσει" σωστά το frontend (λίστα tenants κλπ)
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Tenant

router = APIRouter(tags=["tenants"])


# -------------------------
# Pydantic model για CREATE tenant
# -------------------------
class TenantCreate(BaseModel):
    # Όνομα οργανισμού (π.χ. "Demo College")
    name: str

    # Τύπος οργανισμού (π.χ. "college", "clinic", "law_firm")
    org_type: str


# -------------------------
# Δημιουργία νέου tenant (DB)
# -------------------------
@router.post("/tenants")
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db)):
    """
    Δημιουργεί έναν νέο tenant (οργανισμό) και τον αποθηκεύει στη DB.

    Ροή:
    1) FastAPI κάνει parse/validation του JSON σε TenantCreate
    2) Δημιουργούμε ORM object Tenant
    3) db.add + db.commit για να γραφτεί στη SQLite
    4) db.refresh για να έχουμε τα τελικά πεδία (π.χ. id)
    5) Επιστρέφουμε JSON-friendly dict
    """

    tenant = Tenant(name=payload.name, org_type=payload.org_type)

    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    return {
        "id": tenant.id,
        "name": tenant.name,
        "org_type": tenant.org_type,
    }


# -------------------------
# Λίστα όλων των tenants (DB)
# -------------------------
@router.get("/tenants")
def list_tenants(db: Session = Depends(get_db)):
    """
    Επιστρέφει όλους τους tenants από τη DB.
    """

    tenants = db.query(Tenant).all()
    return [
        {"id": t.id, "name": t.name, "org_type": t.org_type}
        for t in tenants
    ]
