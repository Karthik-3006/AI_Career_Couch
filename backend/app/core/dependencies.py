from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
import os
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to get the currently authenticated user from the database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
        
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
        
    db = get_db()
    user = db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
        
    # Convert ObjectId to string for Pydantic compatibility
    user["_id"] = str(user["_id"])
    return user

def require_role(roles: list[str]):
    """
    Dependency generator to check if the current user has at least one of the required roles.
    """
    def dependency(user: dict = Depends(get_current_user)):
        user_roles = user.get("roles", [])
        if not any(role in user_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource"
            )
        return user
    return dependency

# Helper dependencies
get_student_user = require_role(["student"])
get_creator_user = require_role(["creator"])
get_admin_user = require_role(["admin"])
