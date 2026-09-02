from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str
    samples: Optional[List[Any]] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[int] = None
    username: Optional[str] = None