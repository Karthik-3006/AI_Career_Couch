import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

import bcrypt

# JWT Config
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_jwt_signature_key_change_me_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against its hash using native bcrypt."""
    try:
        if not plain_password or not hashed_password:
            return False
        # Bcrypt has a hard 72-byte input limit
        plain_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8") if isinstance(hashed_password, str) else hashed_password
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Generate a password hash using native bcrypt."""
    salt = bcrypt.gensalt()
    # Bcrypt has a hard 72-byte input limit
    truncated_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(truncated_bytes, salt)
    return hashed.decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a JWT access token containing the user payload."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token, returning the payload if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
