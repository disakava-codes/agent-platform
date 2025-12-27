Τέλεια. Σου αφήνω **έτοιμο περιεχόμενο** που μπορείς να κάνεις copy-paste σε 2 αρχεία:

* `README.md` (για “πώς τρέχουμε/δοκιμάζουμε”)
* `MANUAL.md` (για “τι φτιάξαμε, πώς δουλεύει, checklist done/todo”)

---

## README.md (step-by-step run & test)

````md
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
````

> Σημείωση: Αν στο Kali/WSL δεν λειτουργεί `code`, χρησιμοποίησε το Windows VS Code Remote όπως ήδη κάνεις.

---

## 4) Backend setup & run

### 4.1 Δημιουργία virtualenv

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

### 4.2 Εγκατάσταση dependencies

```bash
pip install -r requirements.txt
```

> Αν δεν έχεις requirements.txt, τυπικά θες:

```bash
pip install fastapi uvicorn python-multipart "python-jose[cryptography]" passlib[bcrypt] pydantic
```

### 4.3 Run backend (development)

```bash
uvicorn app.main:app --reload
```

### 4.4 Swagger / Docs

Άνοιξε:

* `http://127.0.0.1:8000/docs`

---
Mock Business Data Layer

The system includes a mock business data provider (mock_db.py) used during MVP and demo phases.
This layer simulates real operational data (students, absences, financial status, policy limits) and allows the decision engine to operate without integration to external systems.

The mock provider follows the same schema as future real data providers (database or ERP).
As a result, decision rules and agent logic remain unchanged when switching from mock data to production systems.

Authentication, tenants and users are never stored in mock data and always rely on a real database.
## 5) Frontend setup & run

```bash
cd frontend
npm install
npm run dev
```

Συνήθως ανοίγει στο:

* `http://localhost:5173`

---

## 6) Πρώτη δοκιμή (Happy path)

### 6.1 Signup (δημιουργεί tenant + admin user)

* `POST /api/auth/signup`
* Body (JSON):

```json
{
  "org_name": "Demo Org",
  "org_type": "college",
  "email": "admin@demo.gr",
  "password": "12345678"
}
```

### 6.2 Login (παίρνεις JWT token)

* `POST /api/auth/login` (form)

  * username: `admin@demo.gr`
  * password: `12345678`

### 6.3 Authorize στο Swagger

* Πάτα “Authorize”
* Βάλε: `Bearer <access_token>`

### 6.4 Upload document (tenant isolated)

* `POST /api/tenants/{tenant_id}/documents`
* form-data: `file`

### 6.5 Decision

* `POST /api/tenants/{tenant_id}/decision`
* Body:

```json
{ "question": "Θέλω να υποβάλω ημερήσιο report" }
```

---

## 7) Σημαντικές σημειώσεις

* Τα uploads αποθηκεύονται σε `uploads/<tenant_id>/...` (MVP).
* Τα metadata αποθηκεύονται προσωρινά in-memory (θα πάνε σε DB).
* Με auth ενεργό, τα protected endpoints θέλουν `Authorization: Bearer ...`.

---

## 8) Troubleshooting

### 8.1 Backend δεν ξεκινά (ImportError / ModuleNotFound)

* Έλεγξε ότι υπάρχουν:

  * `app/routes/__init__.py`
  * `app/services/__init__.py`

### 8.2 401/403 στα endpoints

* Δεν έχεις token ή δεν έκανες Authorize.
* Ή προσπαθείς να καλέσεις endpoint για άλλο `tenant_id` από αυτό του token.

### 8.3 Το frontend δεν “βλέπει” backend

* Έλεγξε CORS στο `main.py`
* Έλεγξε ότι το frontend στέλνει Authorization header.

---

````

---

## MANUAL.md (τι φτιάξαμε + πώς δουλεύει + checklist)

```md
# Manual – Agent Platform MVP
(Τεκμηρίωση “τι χτίσαμε μέχρι τώρα”, πώς δουλεύει και τι μένει)

---

## 1) Στόχος προϊόντος (με μία πρόταση)
Decision-first ψηφιακός βοηθός για οργανισμούς (multi-tenant) που λειτουργεί με κανόνες/ροές, με δυνατότητα (προαιρετικά) AI/LLM μόνο για βοήθεια, όχι για “αλήθεια”.

---

## 2) Βασικές έννοιες (γλωσσάρι)
- **Tenant**: Ο οργανισμός/πελάτης (κλινική, ΙΕΚ, γραφείο κλπ). Όλα τα δεδομένα έχουν `tenant_id`.
- **User**: Λογαριασμός που ανήκει σε tenant.
- **Auth (JWT)**: Με login παίρνεις token. Με token “κλειδώνει” η πρόσβαση.
- **Documents**: Αρχεία που ανήκουν σε tenant (uploads + metadata).
- **Decision**: Δομημένη απόφαση από rule engine (όχι chatbot response).

---

## 3) Τι endpoints έχουμε (μέχρι τώρα)

### 3.1 Auth
- `POST /api/auth/signup` → δημιουργεί tenant + admin user (MVP self-serve)
- `POST /api/auth/login` → επιστρέφει JWT token
- `GET /api/auth/me` → ποιος είμαι / σε ποιο tenant ανήκω

### 3.2 Tenants (MVP)
- `POST /api/tenants` → create tenant (προσωρινό, όταν περνάμε σε controlled onboarding μπορεί να κλειδώσει)
- `GET /api/tenants` → list tenants (debug/MVP)

### 3.3 Documents
- `POST /api/tenants/{tenant_id}/documents` → upload file για tenant
- `GET /api/tenants/{tenant_id}/documents` → list docs για tenant

### 3.4 Decision
- `POST /api/tenants/{tenant_id}/decision` → καλεί `decide(org_type, question)` και επιστρέφει result + metadata

---

## 4) Tenant isolation (ασφάλεια)
Κανόνας: Ο user μπορεί να δει/κάνει πράξεις **μόνο** για τον tenant που αναγράφει το token του.

- Σε κάθε protected endpoint:
  - `user = Depends(get_current_user)`
  - `if user["tenant_id"] != tenant_id: raise 403`

Αυτό είναι το foundation για multi-tenant SaaS.

---

## 5) Πώς δουλεύει ο “Agent” τώρα (χωρίς LLM)
- Ο agent είναι το σύνολο:
  - endpoints + auth + tenant isolation
  - document storage
  - rule engine (`decide`)
- Το LLM (όταν μπει) θα είναι προαιρετικό helper:
  - drafting / summarization / extraction
  - ΟΧΙ source of truth.

---

## 6) Τι έχουμε κάνει (Checklist DONE)
- [x] FastAPI app skeleton + routers
- [x] Tenants router (MVP in-memory)
- [x] Documents upload + tenant folders
- [x] Decision endpoint που καλεί rule engine
- [x] Signup/login flow με JWT
- [x] Tenant isolation (403 αν πας σε άλλο tenant)
- [x] Swagger testing flow (signup → login → authorize → calls)

---

## 7) Τι ΜΕΝΕΙ (Checklist TODO – επόμενα βήματα)
### Α. Ασφάλεια / Παραγωγή
- [ ] SECRET_KEY σε env (όχι hardcoded)
- [ ] Password policy / reset password
- [ ] Email verification ή controlled onboarding (request/approve)
- [ ] Rate limiting / basic abuse protection

### Β. Database (μετάβαση από in-memory)
- [ ] Postgres schema:
  - tenants, users, documents, decisions, rules, audit_logs
- [ ] Migrations (Alembic)
- [ ] Storage σε S3-compatible (ή managed), όχι τοπικό filesystem

### Γ. Rules / Workflows (προϊόν)
- [ ] `rules.py` να επιστρέφει **δομημένα** results (decision_type, next_action, required_fields)
- [ ] Manual rules editor (UI) για admins
- [ ] Routines / approval workflows (daily report → manager approve → central submit)
- [ ] Audit log: ποιος έκανε τι και πότε

### Δ. Document intelligence (προαιρετικά)
- [ ] PDF text extraction + cleanup
- [ ] Chunking + indexing
- [ ] (προαιρετικά) embeddings/RAG για “αναζήτηση στο κανονισμό”
- [ ] (προαιρετικά) LLM extraction για προτεινόμενους κανόνες με admin review

### Ε. Frontend
- [ ] Login page + token storage
- [ ] Tenant-aware UI (user → tenant)
- [ ] Upload documents UI
- [ ] Decision UI (question → structured result)
- [ ] Admin panel: rules, users, approvals

---

## 8) Κανόνες ανάπτυξης (Team rules)
- Κάθε feature σε δικό του router
- Κάθε endpoint να είναι tenant-safe
- Decision responses να είναι **structured** (όχι “κουβέντα”)
- Οτιδήποτε αλλάζει κανόνες/flows να γράφεται στο manual


Τέλειο timing. Αυτό που ζητάς είναι **ακριβώς αυτό που κάνουν οι σοβαρές ομάδες**:
πρώτα **high-level manual** (να ξέρεις *τι υπάρχει και γιατί*), και **αργότερα full technical manual** (γραμμή-γραμμή).

Παρακάτω σου δίνω **ένα “Manual v0.1”**, έτοιμο να μπει στο repo ως `docs/MANUAL.md`.
Είναι **σύντομο**, **καθαρό**, και σε βοηθά:

* να μην ξεχάσεις τι έφτιαξες
* να εξηγήσεις το project σε άλλον
* να συνεχίσουμε χωρίς χάος

---

# 📘 Agent Platform – Manual (v0.1 – Overview)

## 1. Τι είναι το Agent Platform

Το Agent Platform είναι ένα **decision-first backend σύστημα** που:

* δέχεται αιτήματα χρηστών (questions)
* εφαρμόζει **ρητούς κανόνες (rules)**
* εκτελεί **ενέργειες (actions)** πάνω σε δεδομένα
* επιστρέφει **εξηγήσιμη απόφαση**, όχι απλό chatbot reply

Η φιλοσοφία είναι:

> *Απόφαση πρώτα → απάντηση μετά.*

---

## 2. Αρχιτεκτονική (σε υψηλό επίπεδο)

```text
Frontend (React/Vite)
        |
        v
FastAPI Backend
        |
        +--> Auth & Tenants (DB)
        |
        +--> Decision Engine
        |       |
        |       +--> Rulesets (JSON)
        |       +--> Actions
        |               |
        |               +--> Mock Business Data (mock_db.py)
        |
        +--> Documents (uploads)
```

---

## 3. Πώς τρέχει το σύστημα (Backend)

### Προαπαιτούμενα

* Python 3.11+
* virtualenv
* Linux / WSL / macOS

### Εκκίνηση backend

```bash
cd ~/agent-platform/backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

Το API τρέχει στο:

```
http://127.0.0.1:8000
```

Swagger UI:

```
http://127.0.0.1:8000/docs
```

---

## 4. Authentication & Tenants (τρέχουσα κατάσταση)

### Τι υπάρχει

* Signup endpoint: δημιουργεί **tenant + admin user**
* Login endpoint: επιστρέφει JWT token
* `/auth/me`: επιστρέφει πληροφορίες χρήστη & tenant

### Σημαντικό

⚠️ Προς το παρόν:

* users & tenants αποθηκεύονται **στη μνήμη**
* με restart χάνονται

➡️ **Επόμενο βήμα:** μετάβαση σε SQLite DB (planned)

---

## 5. Τι είναι “Tenant”

Tenant = οργανισμός / πελάτης του συστήματος.

Παραδείγματα:

* ΙΕΚ / Κολλέγιο
* Κλινική
* Γραφείο
* Εταιρεία

Κάθε tenant έχει:

* δικούς του χρήστες
* δικό του org_type (π.χ. `college`)
* δικούς του κανόνες (ruleset)

---

## 6. Decision Engine (καρδιά του συστήματος)

### Τι κάνει

Η συνάρτηση `decide()`:

1. Παίρνει:

   * `org_type`
   * `question`
2. Φορτώνει το αντίστοιχο ruleset (JSON)
3. Κάνει matching:

   * `match_any`
   * `match_all`
4. Αν βρεθεί κανόνας:

   * επιστρέφει decision
   * εκτελεί actions
   * συγκεντρώνει data
5. Αν όχι:

   * επιστρέφει `UNKNOWN`

---

## 7. Rulesets (JSON κανόνες)

Παράδειγμα αρχείου:

```
app/rulesets/college_v1.json
```

Κάθε rule περιέχει:

* `id`
* `intent`
* `match_any`
* `match_all`
* `answer`
* `actions`
* `confidence`

Οι κανόνες είναι:

* **στατικοί**
* **εξηγήσιμοι**
* **ελεγχόμενοι**
* **χωρίς LLM εξάρτηση**

---

## 8. Actions & Mock Business Data

### Actions

Τα actions είναι μικρές συναρτήσεις που:

* “τραβάνε” δεδομένα
* ελέγχουν συνθήκες
* επιστρέφουν structured results

Παραδείγματα:

* `get_absences`
* `check_absence_limits`
* `get_financial_status`

### Mock Business Data (`mock_db.py`)

Το αρχείο:

```
app/services/mock_db.py
```

Χρησιμοποιείται για:

* demo
* testing
* simulation

❗ Δεν χρησιμοποιείται για:

* users
* passwords
* auth

Υπάρχει fallback dataset:

```python
"DEFAULT"
```

ώστε ο agent να λειτουργεί πάντα.

---

## 9. Documents module

Υπάρχει endpoint για:

* upload εγγράφων ανά tenant
* αποθήκευση στο filesystem
* καταγραφή metadata (προς το παρόν in-memory)

Μελλοντικά:

* αποθήκευση metadata σε DB
* χρήση documents για rules / RAG / validation

---

## 10. Πώς χρησιμοποιείται το σύστημα (σήμερα)

### Για κανονική χρήση

➡️ **Frontend** (υπό ανάπτυξη)

### Για debugging / testing

➡️ `curl` από terminal

Παράδειγμα decision:

```bash
curl -X POST http://127.0.0.1:8000/api/tenants/{TENANT_ID}/decision \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"question":"Θέλω ενημέρωση απουσιών","fields":{"student_id":"STU-002"}}'
```

---

## 11. Τι έχουμε φτιάξει μέχρι τώρα (Checklist)

✅ FastAPI backend
✅ JWT auth (signup/login/me)
✅ Tenants
✅ Decision engine
✅ JSON rulesets
✅ Action runner
✅ Mock business data
✅ Documents upload
⬜ SQLite DB (next)
⬜ Frontend UI
⬜ Admin panel
⬜ Rule editor / approval
⬜ LLM (optional, later)

---

## 12. Σημαντική φιλοσοφία

* ❌ Δεν είναι chatbot
* ❌ Δεν είναι “AI που λέει ό,τι να ’ναι”
* ✅ Είναι **controlled decision system**
* ✅ Με audit, explainability και κανόνες

---

### Τέλος Manual v0.1

---

👉 **Επόμενο βήμα (διάλεξε):**

1. 🗄️ **SQLite DB integration** (users/tenants/auth)
2. 🖥️ **Frontend MVP (login + ask agent)**
3. 📄 **Full technical manual (ανά αρχείο / function)**

Πες μου ποιο θες να πιάσουμε πρώτο και προχωράμε.
