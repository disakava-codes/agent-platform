# Agent Platform MVP (FastAPI + Frontend)

## 1) Προαπαιτούμενα
- Python 3.10+ (ιδανικά 3.11)
- Node.js 18+ (ή 20+)
- (προαιρετικά) VS Code + Remote (WSL/SSH)

---

## 2) Project structure (high-level)
- `backend/` → FastAPI API (tenants, auth, documents, decision)
- `frontend/` → UI (React/Vite) για login, upload, decision, κλπ
- `uploads/` → αποθήκευση αρχείων ανά tenant (MVP)

---

## 3) Άνοιγμα project στο VS Code (2 τρόποι)

### A) Από Windows VS Code (Remote σε WSL/Kali)
1. Άνοιξε VS Code στα Windows
2. `Remote Explorer` → σύνδεση στο WSL/Kali (ή “Remote - WSL”)
3. Open Folder → επέλεξε τον φάκελο project (π.χ. `~/agent-platform`)

### B) Από Linux terminal (αν έχεις `code` command)
Από τον φάκελο project:
```bash
code .

cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
 
 mini rule for debugging
 export TENANT="..."
export TOKEN="..."
set +o histexpand
