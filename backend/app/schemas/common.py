from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Any


class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    career: Optional[str] = None
    student_code: Optional[str] = None


class UserCreate(UserBase):
    password: str
    confirm_password: Optional[str] = None
    samples: Optional[List[Any]] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    is_active: bool
    role: str = "user"

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: Optional[int] = None
    username: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "user"