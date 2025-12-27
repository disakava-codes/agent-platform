"""
mock_db.py

Fake database για demo/MVP.
Σκοπός: να φαίνεται ότι ο agent "τραβάει" πραγματικά δεδομένα
χωρίς να έχουμε ακόμα Postgres.

Αργότερα αυτό αντικαθίσταται με κανονικά DB queries.
"""

from typing import Dict, Any

# tenant_id -> dataset
MOCK_DB: Dict[str, Dict[str, Any]] = {
    "DEFAULT": {
        "students": {
            "STU-001": {"name": "Nikos Papadopoulos", "status": "active"},
            "STU-002": {"name": "Maria Ioannou", "status": "inactive"},
        },
        "finance": {
            "STU-001": {"balance_eur": 0},
            "STU-002": {"balance_eur": 120},
        },
        "absences": {
            "STU-001": {"total": 2},
            "STU-002": {"total": 18},
        },
        "limits": {
            "max_absences": 20
        }
    }
}

def get_tenant_db(tenant_id: str) -> Dict[str, Any]:
    """
    Επιστρέφει τα δεδομένα του tenant.
    Αν δεν έχουμε ειδικό dataset, χρησιμοποιούμε DEFAULT.
    """
    return MOCK_DB.get(tenant_id, MOCK_DB["DEFAULT"])
