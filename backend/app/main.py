from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.api.health import router as health_router
from app.api.typing import router as typing_router
from app.api.auth import router as auth_router
from app.api.ml import router as ml_router
from app.api.adaptive import router as adaptive_router
from app.api.dashboard import router as dashboard_router
from app.api.experiment import router as experiment_router
from app.api.reports import router as reports_router

app = FastAPI(
    title=settings.APP_NAME,
    description="TECLEOLLAVE-ADAPT - Adaptive Keystroke Dynamics Authentication",
    version="1.0.0",
    debug=settings.DEBUG
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(typing_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(adaptive_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(experiment_router, prefix="/api")
app.include_router(reports_router, prefix="/api")


@app.on_event("startup")
async def startup_event():
    init_db()
    # Check if database has users, if empty auto-seed demo user
    from app.database import SessionLocal
    from app.models import User
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            print("🌱 Auto-seeding default demo user...")
            from demo_setup import run_demo_setup
            run_demo_setup(
                username="demo_user",
                password="demo123456",
                n_enroll=10,
                n_auth_sessions=12,
                drift_profile="gradual"
            )
    except Exception as e:
        print(f"⚠️ Error auto-seeding db: {e}")
    finally:
        db.close()


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "phase": "7 - Experiments"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)