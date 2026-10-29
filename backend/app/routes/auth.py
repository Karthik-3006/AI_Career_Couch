import re
from datetime import datetime, timezone
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
    email = user_data.email.strip().lower()
    
    # Check if user already exists (case-insensitive check)
    existing = db.users.find_one({
        "$or": [
            {"email": email},
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email is already registered."
        )
        
    hashed_pwd = get_password_hash(user_data.password)
    
    dump_fn = getattr(user_data, "model_dump", getattr(user_data, "dict", None))
    user_dict = dump_fn()
    # Remove plain password and insert hashed password
    user_dict.pop("password", None)
    
    from backend.app.services.subscription_service import get_user_trial_status, is_user_subscriber, TRIAL_DURATION_DAYS
    now = datetime.now(timezone.utc)
    trial_exp = now + datetime.timedelta(days=TRIAL_DURATION_DAYS)
    user_dict.update({
        "email": email,
        "name": user_data.name.strip(),
        "password_hash": hashed_pwd,
        "roles": user_dict.get("roles") or ["student"],
        "is_active": True,
        "is_subscriber": False,
        "subscription_expires_at": None,
        "trial_expires_at": trial_exp,
        "created_at": now,
        "updated_at": now
    })
    
    try:
        result = db.users.insert_one(user_dict)
        user_dict["_id"] = str(result.inserted_id)
        
        trial_status = get_user_trial_status(user_dict)
        user_dict["is_trial_active"] = trial_status["is_trial_active"]
        user_dict["trial_days_left"] = trial_status["trial_days_left"]
        user_dict["trial_expires_at"] = trial_status["trial_expires_at"]
        user_dict["bypass_all"] = trial_status["bypass_all"]
        user_dict["has_access"] = is_user_subscriber(user_dict)
        user_dict["is_subscriber"] = bool(user_dict.get("is_subscriber", False))
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
    email = login_data.email.strip().lower()
    user = db.users.find_one({
        "$or": [
            {"email": email},
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}}
        ]
    })
    if not user or not verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has been deactivated."
        )

    canonical_email = user.get("email", email).strip().lower()
    roles = user.get("roles") or ["student"]
    access_token = create_access_token(data={"sub": canonical_email, "roles": roles})
    
    from backend.app.services.subscription_service import is_user_subscriber, get_user_trial_status
    user_resp = {**user, "_id": str(user["_id"])}
    user_resp.pop("password_hash", None)
    if "roles" not in user_resp or not user_resp["roles"]:
        user_resp["roles"] = ["student"]
        
    trial_status = get_user_trial_status(user)
    user_resp["is_trial_active"] = trial_status["is_trial_active"]
    user_resp["trial_days_left"] = trial_status["trial_days_left"]
    user_resp["trial_expires_at"] = trial_status["trial_expires_at"]
    user_resp["bypass_all"] = trial_status["bypass_all"]
    user_resp["has_access"] = is_user_subscriber(user)
    user_resp["is_subscriber"] = bool(user.get("is_subscriber", False))

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_resp
    }

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
    dump_fn = getattr(profile_data, "model_dump", getattr(profile_data, "dict", None))
    update_dict = {k: v for k, v in dump_fn(exclude_unset=True).items() if v is not None}
    
    if not update_dict:
        return current_user
        
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$set": update_dict}
    )
    
    updated_user = db.users.find_one({"_id": ObjectId(current_user["_id"])})
    if updated_user:
        updated_user["_id"] = str(updated_user["_id"])
        if not updated_user.get("roles"):
            updated_user["roles"] = ["student"]
        from backend.app.services.subscription_service import is_user_subscriber, get_user_trial_status
        trial_status = get_user_trial_status(updated_user)
        updated_user["is_trial_active"] = trial_status["is_trial_active"]
        updated_user["trial_days_left"] = trial_status["trial_days_left"]
        updated_user["trial_expires_at"] = trial_status["trial_expires_at"]
        updated_user["bypass_all"] = trial_status["bypass_all"]
        updated_user["has_access"] = is_user_subscriber(updated_user)
        updated_user["is_subscriber"] = bool(updated_user.get("is_subscriber", False))
        return updated_user
    return current_user
