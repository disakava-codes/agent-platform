# APIRouter: για ομαδοποίηση endpoints σχετικών με documents
# UploadFile / File: για file uploads μέσω multipart/form-data
# HTTPException: για σωστά HTTP errors
from fastapi import APIRouter, UploadFile, File, HTTPException

# Path: ασφαλής διαχείριση paths (cross-platform)
from pathlib import Path

import os
import uuid


# Router για όλα τα document-related endpoints
router = APIRouter(tags=["documents"])


# Root directory όπου αποθηκεύονται τα uploads
# Π.χ. uploads/<tenant_id>/<file>
UPLOAD_ROOT = Path("uploads")

# Δημιουργούμε τον φάκελο αν δεν υπάρχει
UPLOAD_ROOT.mkdir(exist_ok=True)


# -------------------------
# MVP in-memory metadata store
# -------------------------
# Δομή:
# {
#   tenant_id: [
#       {doc1 metadata},
#       {doc2 metadata},
#   ]
# }
#
# ⚠️ Σε production → database (Postgres)
DOCS = {}  # tenant_id -> list of docs


# -------------------------
# Upload document για συγκεκριμένο tenant
# -------------------------
@router.post("/tenants/{tenant_id}/documents")
async def upload_document(
    tenant_id: str,
    file: UploadFile = File(...)
):
    """
    Ανεβάζει ένα document για συγκεκριμένο tenant.

    Ροή:
    1. Έλεγχος ότι υπάρχει filename
    2. Δημιουργία φακέλου tenant (uploads/<tenant_id>)
    3. Δημιουργία ασφαλούς μοναδικού filename
    4. Αποθήκευση αρχείου στο filesystem
    5. Αποθήκευση metadata στο in-memory store
    """

    # Αν για κάποιο λόγο δεν υπάρχει filename → bad request
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename")

    # Φάκελος tenant (ένα "sandbox" ανά οργανισμό)
    tenant_dir = UPLOAD_ROOT / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)

    # Παίρνουμε την επέκταση του αρχείου (π.χ. .pdf, .txt)
    ext = os.path.splitext(file.filename)[1].lower()

    # Δημιουργούμε ασφαλές filename (UUID)
    # → αποφεύγουμε collisions & κακόβουλα filenames
    safe_name = f"{uuid.uuid4()}{ext}"

    # Πλήρες path αποθήκευσης
    out_path = tenant_dir / safe_name

    # Διαβάζουμε το περιεχόμενο του αρχείου (async)
    content = await file.read()

    # Αποθηκεύουμε το αρχείο στο filesystem
    out_path.write_bytes(content)

    # Αποθήκευση metadata (MVP)
    DOCS.setdefault(tenant_id, []).append({
        "id": safe_name,                 # internal document id
        "original_name": file.filename,  # όνομα όπως το ανέβασε ο χρήστης
        "path": str(out_path),           # path στο filesystem
        "size": len(content),            # μέγεθος σε bytes
    })

    # Επιστρέφουμε το document που μόλις ανέβηκε
    return {
        "ok": True,
        "doc": DOCS[tenant_id][-1]
    }


# -------------------------
# Λίστα documents για tenant
# -------------------------
@router.get("/tenants/{tenant_id}/documents")
def list_documents(tenant_id: str):
    """
    Επιστρέφει όλα τα documents που ανήκουν σε συγκεκριμένο tenant.
    """

    # Αν δεν υπάρχει tenant → επιστρέφει κενή λίστα
    return DOCS.get(tenant_id, [])
