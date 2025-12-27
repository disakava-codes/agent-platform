"""
main.py

Κεντρικό entrypoint της FastAPI εφαρμογής.
- Δημιουργεί το FastAPI app
- Ρυθμίζει CORS
- Δημιουργεί DB tables (SQLite)
- Συνδέει όλους τους routers
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.db import engine
from app.models import Base

# Routers
from app.routes.auth import router as auth_router
from app.routes.tenants import router as tenants_router
from app.routes.documents import router as documents_router
from app.routes.decision import router as decision_router


# -------------------------
# DB init (MVP)
# -------------------------
# Δημιουργεί τα tables αν δεν υπάρχουν
Base.metadata.create_all(bind=engine)


def get_allowed_origins() -> list[str]:
    """
    Διαβάζει τα επιτρεπόμενα origins για CORS από environment variable.
    """
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


# -------------------------
# FastAPI app
# -------------------------
app = FastAPI(title="Agent Platform MVP", version="0.1.0")


# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Health check
# -------------------------
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "agent-platform"}


# -------------------------
# Routers
# -------------------------
API_PREFIX = "/api"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(tenants_router, prefix=API_PREFIX)
app.include_router(documents_router, prefix=API_PREFIX)
app.include_router(decision_router, prefix=API_PREFIX)
