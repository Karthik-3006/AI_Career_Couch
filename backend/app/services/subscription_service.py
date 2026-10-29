import datetime
from bson import ObjectId
from fastapi import HTTPException
from backend.app.core.database import get_db

def is_user_subscriber(user: dict) -> bool:
    """
    Checks if a user has an active premium subscription.
    """
    if not user.get("is_subscriber", False):
        return False
        
    expiry = user.get("subscription_expires_at")
    if expiry:
        if isinstance(expiry, str):
            try:
                expiry = datetime.datetime.fromisoformat(expiry)
            except ValueError:
                return False
        if expiry < datetime.datetime.utcnow():
            return False
            
    return True

def enforce_access_limit(user: dict, action_type: str) -> bool:
    """
    Enforces the updated subscription rules:
    - Non-subscribers get ZERO access to academic courses (tests) and the coding compiler.
    - Non-subscribers get exactly ONE resume analysis and ONE mock interview run.
    - Subscribers have unlimited access.
    """
    is_sub = is_user_subscriber(user)
    db = get_db()
    user_id = str(user["_id"])
    
    if action_type in ["compiler", "academics"]:
        if not is_sub:
            raise HTTPException(
                status_code=403,
                detail=f"Access Denied. You must purchase a subscription to access the {action_type} system."
            )
            
    elif action_type == "resume":
        if not is_sub:
            # Check if there is already an analyzed resume
            count = db.resume_profiles.count_documents({"user_id": user_id, "analysis": {"$exists": True}})
            if count >= 1:
                raise HTTPException(
                    status_code=403,
                    detail="Free limit reached. You can only analyze your resume once. Subscribe to unlock unlimited resume matching."
                )
                
    elif action_type == "interview":
        if not is_sub:
            # Check if there is already an interview session
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
    Returns global system settings including UPI ID, QR code, and the single lifetime plan.
    """
    db = get_db()
    settings = db.system_settings.find_one({"_id": "global_settings"})
    if not settings:
        settings = {
            "_id": "global_settings",
            "upi_id": "careercoach@upi",
            "qr_code": None,
            "updated_at": datetime.datetime.utcnow()
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
            "created_at": datetime.datetime.utcnow()
        }
        res = db.subscription_plans.insert_one(lifetime_plan)
        lifetime_plan["_id"] = str(res.inserted_id)
    else:
        lifetime_plan["_id"] = str(lifetime_plan["_id"])

    return {
        "upi_id": settings.get("upi_id"),
        "qr_code": settings.get("qr_code"),
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
        update_data["updated_at"] = datetime.datetime.utcnow()
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
    db.subscription_plans.update_one(
        {"type": "lifetime"},
        {
            "$set": {
                "name": name,
                "price": price,
                "duration_months": duration_months,
                "updated_at": datetime.datetime.utcnow()
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
    now = datetime.datetime.utcnow()
    
    if current_expiry and current_expiry > now:
        new_expiry = current_expiry + datetime.timedelta(days=months * 30)
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
