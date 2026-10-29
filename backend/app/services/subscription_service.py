import datetime
from bson import ObjectId
from fastapi import HTTPException
from backend.app.core.database import get_db

TRIAL_DURATION_DAYS = 3

def to_utc(dt):
    """Normalize datetime or ISO string to UTC timezone-aware datetime."""
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None
    if isinstance(dt, datetime.datetime):
        if dt.tzinfo is not None:
            return dt.astimezone(datetime.timezone.utc)
        return dt.replace(tzinfo=datetime.timezone.utc)
    return None

def is_bypass_all_active() -> bool:
    """
    Checks if administrator has enabled 'Bypass All', making all features free for everyone.
    """
    db = get_db()
    settings = db.system_settings.find_one({"_id": "global_settings"})
    if not settings:
        return False
    return bool(settings.get("bypass_all", False))

def set_bypass_all(bypass: bool) -> dict:
    """
    Enables or disables the 'Bypass All' override platform-wide.
    """
    db = get_db()
    now = datetime.datetime.now(datetime.timezone.utc)
    db.system_settings.update_one(
        {"_id": "global_settings"},
        {
            "$set": {
                "bypass_all": bool(bypass),
                "subscription_enforced": not bool(bypass),
                "updated_at": now
            }
        },
        upsert=True
    )
    return {
        "success": True,
        "bypass_all": bool(bypass),
        "message": (
            "Bypass All activated: All platform features are now unlocked for everyone."
            if bypass else
            "Bypass All deactivated: Standard 3-day free trial and auto-subscription rules are active."
        )
    }

def get_user_trial_status(user: dict) -> dict:
    """
    Calculates whether the user's 3-day free trial is currently active.
    Every new user gets 3 days of free access starting from account registration.
    """
    bypass = is_bypass_all_active()
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Check trial expiry date
    trial_exp = to_utc(user.get("trial_expires_at"))
    if not trial_exp:
        created_at = to_utc(user.get("created_at")) or now
        trial_exp = created_at + datetime.timedelta(days=TRIAL_DURATION_DAYS)
        
    is_active = (now < trial_exp) or bypass
    time_diff = trial_exp - now
    seconds_left = max(0, int(time_diff.total_seconds()))
    days_left = max(0, (seconds_left + 86399) // 86400) if is_active else 0
    hours_left = max(0, seconds_left // 3600) if is_active else 0

    return {
        "is_trial_active": is_active,
        "trial_expires_at": trial_exp,
        "trial_days_left": days_left,
        "trial_hours_left": hours_left,
        "bypass_all": bypass
    }

def is_user_subscriber(user: dict) -> bool:
    """
    Determines whether the user currently has access to platform features:
    1. If Admin has enabled 'Bypass All', access is granted.
    2. If user is an Admin, access is granted.
    3. If user has an active paid subscription, access is granted.
    4. If user is within their 3-day free trial period, access is granted.
    5. After 3 days, trial expires and auto-subscription mode activates.
    """
    if is_bypass_all_active():
        return True

    roles = user.get("roles") or []
    if "admin" in roles:
        return True

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Check paid subscription status
    is_paid = bool(user.get("is_subscriber", False))
    if is_paid:
        sub_exp = to_utc(user.get("subscription_expires_at"))
        if sub_exp and sub_exp > now:
            return True
        elif not sub_exp:
            # Lifetime subscription without expiration date
            return True

    # 2. Check 3-day free trial status
    trial_status = get_user_trial_status(user)
    if trial_status["is_trial_active"]:
        return True

    # Trial expired and not paid -> restricted
    return False

def enforce_access_limit(user: dict, action_type: str) -> bool:
    """
    Enforces access limits:
    - During the 3-day trial, user has full free access to any feature.
    - If admin enabled Bypass All, user has full free access.
    - If paid subscriber, user has full access.
    - Otherwise (trial expired), auto-subscription mode blocks access.
    """
    if is_user_subscriber(user):
        return True

    raise HTTPException(
        status_code=403,
        detail=f"Your 3-day free trial has expired. Auto-subscription mode is now active. Please subscribe to continue using {action_type}."
    )

# Admin UPI & Plan settings functions

def get_payment_settings() -> dict:
    """
    Returns global system settings including UPI ID, QR code, bypass status, and the single lifetime plan.
    """
    db = get_db()
    settings = db.system_settings.find_one({"_id": "global_settings"})
    now = datetime.datetime.now(datetime.timezone.utc)
    if not settings:
        settings = {
            "_id": "global_settings",
            "upi_id": "careercoach@upi",
            "qr_code": None,
            "bypass_all": False,
            "trial_days": TRIAL_DURATION_DAYS,
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
        "bypass_all": is_bypass_all_active(),
        "trial_days": TRIAL_DURATION_DAYS,
        "subscription_enforced": not is_bypass_all_active(),
        "plans": [lifetime_plan]
    }

def update_payment_settings(upi_id: str = None, qr_code: str = None) -> dict:
    """
    Updates administrator UPI ID and/or QR code for student payments.
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
    Saves/Updates the lifetime subscription plan price (handled by admin).
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
    Admin command to grant or extend subscription for a student.
    """
    db = get_db()
    clean_email = email.strip().lower()
    user = db.users.find_one({"email": clean_email})
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found.")
        
    current_expiry = to_utc(user.get("subscription_expires_at"))
    now = datetime.datetime.now(datetime.timezone.utc)
    
    if current_expiry and current_expiry > now:
        new_expiry = current_expiry + datetime.timedelta(days=months * 30)
    else:
        new_expiry = now + datetime.timedelta(days=months * 30)
        
    db.users.update_one(
        {"email": clean_email},
        {
            "$set": {
                "is_subscriber": True,
                "subscription_expires_at": new_expiry,
                "updated_at": now
            }
        }
    )
    
    return {
        "email": clean_email,
        "is_subscriber": True,
        "subscription_expires_at": new_expiry.isoformat()
    }
