from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HealthResponse(BaseModel):
    status: str
    db: str
    version: str = "1.0.0"

    class Config:
        orm_mode = True


class ErrorResponse(BaseModel):
    detail: str

    class Config:
        orm_mode = True