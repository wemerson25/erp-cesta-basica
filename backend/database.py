import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

if TURSO_DATABASE_URL:
    from turso_dbapi import connect as _turso_connect

    def _creator():
        return _turso_connect(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)

    engine = create_engine("sqlite+pysqlite://", creator=_creator, poolclass=NullPool)
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./erp_cesta.db")
    connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
    engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
