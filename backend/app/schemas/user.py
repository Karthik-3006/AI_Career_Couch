from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import List, Optional, Dict
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    roles: List[str] = Field(default=["student"])
    college: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    target_role: Optional[str] = "Software Engineer"
    experience_level: Optional[str] = "Entry Level (0-2 years)"
    skills: List[str] = Field(default=[])
    interests: List[str] = Field(default=[])
    is_subscriber: bool = Field(default=False)
    subscription_expires_at: Optional[datetime] = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("college", "degree", mode="before")
    @classmethod
    def clean_optional_strings(cls, v):
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v

    @field_validator("graduation_year", mode="before")
    @classmethod
    def clean_graduation_year(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            trimmed = v.strip()
            return int(trimmed) if trimmed else None
        return v

class UserRegister(UserBase):
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    degree: Optional[str] = None
    graduation_year: Optional[int] = None
    target_role: Optional[str] = None
    experience_level: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[List[str]] = None

    @field_validator("name", mode="before")
    @classmethod
    def clean_name(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("college", "degree", mode="before")
    @classmethod
    def clean_optional_strings(cls, v):
        if isinstance(v, str):
            trimmed = v.strip()
            return trimmed if trimmed else None
        return v

    @field_validator("graduation_year", mode="before")
    @classmethod
    def clean_graduation_year(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            trimmed = v.strip()
            return int(trimmed) if trimmed else None
        return v

class UserResponse(UserBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={
            datetime: lambda v: v.isoformat()
        }
    )
    id: str = Field(..., alias="_id")
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class TokenData(BaseModel):
    email: Optional[str] = None
    roles: List[str] = []
