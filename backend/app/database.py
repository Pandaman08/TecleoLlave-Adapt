from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


def normalize_database_url(url):
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


database_url = normalize_database_url(settings.DATABASE_URL)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite:") else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=settings.DEBUG
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name != "sqlite":
        return

    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(mobile_study_samples)"))
            cols = [row[1] for row in result.fetchall()]
            if cols and "client_event_id" not in cols:
                conn.execute(text("ALTER TABLE mobile_study_samples ADD COLUMN client_event_id VARCHAR(64)"))
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_mobile_study_samples_client_event_id ON mobile_study_samples (client_event_id)"))
                conn.commit()
    except Exception:
        pass