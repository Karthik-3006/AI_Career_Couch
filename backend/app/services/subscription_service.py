import datetime
from bson import ObjectId
from fastapi import HTTPException
from backend.app.core.database import get_db

def is_subscription_enforced() -> bool:
    """
    Checks if paid subscription enforcement is currently active platform-wide.
    If False (default), all platform features are completely free for all users.
    Only when the admin toggles/raises the subscription requirement does it return True.
    """
    db = get_db()
    settings = db.system_settings.find_one({"_id": "global_settings"})
    if not settings:
        return False
    return bool(settings.get("subscription_enforced", False))

def set_subscription_enforcement(enforced: bool) -> dict:
    """
    Enables or disables subscription requirement platform-wide.
    """
    db = get_db()
    now = datetime.datetime.now(datetime.timezone.utc)
    db.system_settings.update_one(
        {"_id": "global_settings"},
        {"$set": {"subscription_enforced": bool(enforced), "updated_at": now}},
        upsert=True
    )
    return {
        "success": True,
        "subscription_enforced": bool(enforced),
        "message": (
            "Paid subscription requirement is now raised and enforced."
            if enforced else
            "Subscription removed! All platform features are now completely free for all users."
        )
    }

def is_user_subscriber(user: dict) -> bool:
    """
    Checks if a user has active subscriber privileges.
    If subscription enforcement is not active, ALL users are automatically granted subscriber privileges.
    """
    if not is_subscription_enforced():
        return True

    if not user.get("is_subscriber", False):
        return False
        
    expiry = user.get("subscription_expires_at")
    if expiry:
        if isinstance(expiry, str):
            try:
                expiry = datetime.datetime.fromisoformat(expiry)
            except ValueError:
                return False
        # Handle timezone-aware vs naive UTC
        if expiry.tzinfo is not None:
            now = datetime.datetime.now(datetime.timezone.utc)
        else:
            now = datetime.datetime.utcnow()
        if expiry < now:
            return False
            
    return True

def enforce_access_limit(user: dict, action_type: str) -> bool:
    """
    Enforces access limits based on subscription status:
    - If subscription enforcement is disabled (free mode), all access is unconditionally permitted.
    - If subscription enforcement is enabled:
        - Non-subscribers get blocked from compiler and academics.
        - Non-subscribers get 1 resume and 1 interview.
        - Subscribers get unlimited access.
    """
    if not is_subscription_enforced():
        return True

    is_sub = is_user_subscriber(user)
    if is_sub:
        return True

    db = get_db()
    user_id = str(user["_id"])
    
    if action_type in ["compiler", "academics"]:
        raise HTTPException(
            status_code=403,
            detail=f"Access Denied. You must purchase a subscription to access the {action_type} system."
        )
            
    elif action_type == "resume":
        count = db.resume_profiles.count_documents({"user_id": user_id, "analysis": {"$exists": True}})
        if count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Free limit reached. You can only analyze your resume once. Subscribe to unlock unlimited resume matching."
            )
                
    elif action_type == "interview":
        count = db.interviews.count_documents({"user_id": user_id})
        if count >= 1:
            raise HTTPException(
                status_code=403,
                detail="Free limit reached. You can only take 1 mock interview for free. Subscribe to unlock unlimited AI interviews."
            )
                
    return True

# Admin UPI & Plan settings functions

def get_payment_settings() -> dict:
    """
    Returns global system settings including UPI ID, QR code, subscription enforcement status, and the single lifetime plan.
    """
    db = get_db()
    settings = db.system_settings.find_one({"_id": "global_settings"})
    now = datetime.datetime.now(datetime.timezone.utc)
    if not settings:
        settings = {
            "_id": "global_settings",
            "upi_id": "careercoach@upi",
            "qr_code": None,
            "subscription_enforced": False,
            "updated_at": now
        }
        db.system_settings.insert_one(settings)
        
    # Get the single lifetime plan
    lifetime_plan = db.subscription_plans.find_one({"type": "lifetime"})
    if not lifetime_plan:
        lifetime_plan = {
            "type": "lifetime",
            "name": "Lifetime Unlimited Premium Access",
            "price": 2999.00,
            "duration_months": 999,  # Represents lifetime
            "created_at": now
        }
        res = db.subscription_plans.insert_one(lifetime_plan)
        lifetime_plan["_id"] = str(res.inserted_id)
    else:
        lifetime_plan["_id"] = str(lifetime_plan["_id"])

    return {
        "upi_id": settings.get("upi_id"),
        "qr_code": settings.get("qr_code"),
        "subscription_enforced": is_subscription_enforced(),
        "plans": [lifetime_plan]
    }

def update_payment_settings(upi_id: str = None, qr_code: str = None) -> dict:
    """
    Updates the administrator UPI ID and/or QR code (base64 string) for student payments.
    """
    db = get_db()
    update_data = {}
    if upi_id is not None:
        update_data["upi_id"] = upi_id
    if qr_code is not None:
        update_data["qr_code"] = qr_code
        
    if update_data:
        update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc)
        db.system_settings.update_one(
            {"_id": "global_settings"},
            {"$set": update_data},
            upsert=True
        )
    return {"success": True}

def create_subscription_plan(name: str, price: float, duration_months: int) -> dict:
    """
    Saves/Updates the single lifetime subscription plan price.
    """
    db = get_db()
    now = datetime.datetime.now(datetime.timezone.utc)
    db.subscription_plans.update_one(
        {"type": "lifetime"},
        {
            "$set": {
                "name": name,
                "price": price,
                "duration_months": duration_months,
                "updated_at": now
            }
        },
        upsert=True
    )
    plan_doc = db.subscription_plans.find_one({"type": "lifetime"})
    plan_doc["_id"] = str(plan_doc["_id"])
    return plan_doc

def admin_update_subscription(email: str, months: int) -> dict:
    """
    Admin command to grant or extend subscription.
    """
    db = get_db()
    user = db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")
        
    current_expiry = user.get("subscription_expires_at")
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if current_expiry:
        if current_expiry.tzinfo is None:
            current_expiry = current_expiry.replace(tzinfo=datetime.timezone.utc)
        if current_expiry > now:
            new_expiry = current_expiry + datetime.timedelta(days=months * 30)
        else:
            new_expiry = now + datetime.timedelta(days=months * 30)
    else:
        new_expiry = now + datetime.timedelta(days=months * 30)
        
    db.users.update_one(
        {"email": email},
        {
            "$set": {
                "is_subscriber": True,
                "subscription_expires_at": new_expiry,
                "updated_at": now
            }
        }
    )
    
    return {
        "email": email,
        "is_subscriber": True,
        "subscription_expires_at": new_expiry.isoformat()
    }
