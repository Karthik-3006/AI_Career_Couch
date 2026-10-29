import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.dependencies import get_current_user
from backend.app.schemas.user import UserRegister, UserLogin, UserResponse, Token, UserProfileUpdate

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_data: UserRegister):
    """
    Registers a new user account, hashes password, and saves details to MongoDB.
    """
    db = get_db()
    
    # Check if user already exists
    existing = db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
        
    hashed_pwd = get_password_hash(user_data.password)
    
    user_dict = user_data.dict()
    # Remove password and insert hashed password
    user_dict.pop("password", None)
    user_dict.update({
        "password_hash": hashed_pwd,
        "is_active": True,
        "is_subscriber": False,
        "subscription_expires_at": None,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    })
    
    try:
        result = db.users.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        return user_dict
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin):
    """
    Logs in a user, returning a secure JWT token on success.
    """
    db = get_db()
    user = db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user["email"], "roles": user.get("roles", ["student"])})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the currently authenticated user's profile details.
    """
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """
    Updates the authenticated user's profile fields.
    """
    db = get_db()
    update_dict = {k: v for k, v in profile_data.dict(exclude_unset=True).items() if v is not None}
    
    if not update_dict:
        return current_user
        
    update_dict["updated_at"] = datetime.datetime.utcnow()
    
    db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_dict}
    )
    
    updated_user = db.users.find_one({"_id": ObjectId(current_user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    return updated_user
