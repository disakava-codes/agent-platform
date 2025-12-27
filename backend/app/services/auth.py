from datetime import datetime, timedelta, timezone
from typing import Dict, Any
import os

from jose import jwt, JWTError
from passlib.context import CryptContext


# -------------------------
# JWT settings
# -------------------------
# ✅ Σε production ΠΑΝΤΑ από env (ποτέ hardcoded)
# π.χ. export SECRET_KEY="super-long-random-string"
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_SUPER_SECRET")

# HS256: συμμετρικό signing (ίδιο secret για sign/verify)
ALGORITHM = "HS256"

# default διάρκεια access token (12 ώρες)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(60 * 12)))


# -------------------------
# Password hashing
# -------------------------
# bcrypt: ασφαλές hashing για passwords (όχι encryption)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Παίρνει plain password και επιστρέφει bcrypt hash.
    Το hash αποθηκεύεται στη DB (ή τώρα στο USERS dict).
    """
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """
    Ελέγχει αν το plain password ταιριάζει με το stored hash.
    """
    return pwd_context.verify(plain, hashed)


# -------------------------
# Token creation / validation
# -------------------------
def create_access_token(data: Dict[str, Any], expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """
    Δημιουργεί JWT access token.

    data: ό,τι claims θέλεις να “κουβαλάει” το token,
          π.χ. {"sub": user_id, "tenant_id": "...", "role": "admin"}

    expires_minutes: σε πόσα λεπτά θα λήξει.
    """
    to_encode = data.copy()

    # ✅ timezone-aware datetime (πιο σωστό από utcnow)
    expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)

    # exp claim: το standard JWT expiration field
    to_encode.update({"exp": expire})

    # encode/sign
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Κάνει verify + decode το JWT.
    Αν είναι invalid/expired → πετάει ValueError.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        # JWTError καλύπτει:
        # - invalid signature
        # - expired token
        # - malformed token
        raise ValueError("Invalid token") from e
