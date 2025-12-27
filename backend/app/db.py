from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent  # .../backend
DB_URL = f"sqlite:///{BASE_DIR / 'app.db'}"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},  # SQLite requirement
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
