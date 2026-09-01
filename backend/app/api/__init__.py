from app.api.health import router as health_router
from app.api.typing import router as typing_router
from app.api.auth import router as auth_router
from app.api.ml import router as ml_router
from app.api.adaptive import router as adaptive_router
from app.api.dashboard import router as dashboard_router
from app.api.experiment import router as experiment_router

__all__ = ["health_router", "typing_router", "auth_router", "ml_router", "adaptive_router", "dashboard_router", "experiment_router"]