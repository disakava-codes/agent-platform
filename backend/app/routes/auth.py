from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Tenant, User
from app.services.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# -------------------------
# Schemas
# -------------------------
class SignupRequest(BaseModel):
    org_name: str
    org_type: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    user_id: str
    email: EmailStr
    tenant_id: str
    org_type: str


# -------------------------
# Signup
# -------------------------
@router.post("/auth/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):

    # Check if user exists
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create tenant
    tenant = Tenant(name=payload.org_name, org_type=payload.org_type)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    # Create admin user
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        tenant_id=tenant.id,
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create token
    token = create_access_token({
        "sub": user.id,
        "tenant_id": tenant.id,
        "role": user.role,
    })

    return {
        "tenant": {
            "id": tenant.id,
            "name": tenant.name,
            "org_type": tenant.org_type,
        },
        "token": {"access_token": token, "token_type": "bearer"},
    }


# -------------------------
# Login
# -------------------------
@router.post("/auth/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
    })

    return TokenResponse(access_token=token)


# -------------------------
# Current user
# -------------------------
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token user")

    return user


# -------------------------
# /auth/me
# -------------------------
@router.get("/auth/me", response_model=MeResponse)
def me(user = Depends(get_current_user), db: Session = Depends(get_db)):

    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant not found")

    return MeResponse(
        user_id=user.id,
        email=user.email,
        tenant_id=tenant.id,
        org_type=tenant.org_type,
    )
