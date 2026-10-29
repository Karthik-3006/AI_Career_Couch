import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.services.subscription_service import (
    get_payment_settings, 
    admin_update_subscription, 
    is_subscription_enforced,
    is_bypass_all_active,
    TRIAL_DURATION_DAYS
)

router = APIRouter(prefix="/subscription", tags=["Subscription Management"])

@router.get("/status")
def get_subscription_status():
    """
    Returns whether subscription requirement is active, trial settings, and bypass all state.
    """
    enforced = is_subscription_enforced()
    bypass_all = is_bypass_all_active()
    return {
        "subscription_enforced": enforced,
        "free_mode": not enforced or bypass_all,
        "bypass_all": bypass_all,
        "trial_duration_days": TRIAL_DURATION_DAYS,
        "message": "Bypass All is active. All features are free." if bypass_all else ("Paid subscription is enforced." if enforced else "All features are free for all users.")
    }

@router.get("/settings")
def get_student_payment_settings(current_user: dict = Depends(get_current_user)):
    """
    Returns active plans and UPI ID for students to subscribe.
    """
    return get_payment_settings()

@router.post("/subscribe")
def subscribe_auto(
    plan_id: str = Body(..., embed=True),
    utr: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Simulates a secure payment gateway verification. Validates the UTR, marks the payment as Approved,
    and automatically upgrades the user to Premium immediately.
    """
    import re
    # 1. Strict UTR format check: exactly 12 numeric digits
    utr_clean = str(utr).strip()
    if not re.match(r"^\d{12}$", utr_clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid Transaction ID format. Must be exactly 12 numeric digits."
        )

    db = get_db()
    
    # 2. Strict check: ensure this UTR hasn't been processed yet
    existing_utr = db.payments.find_one({"utr": utr_clean})
    if existing_utr:
        raise HTTPException(
            status_code=400,
            detail="This Transaction Reference Number (UTR) has already been processed."
        )

    # 3. Fetch the lifetime plan details
    try:
        plan = db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Plan ID.")
        
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    # 4. Fetch gateway settings
    settings = db.system_settings.find_one({"_id": "global_settings"})
    upi_id = settings.get("upi_id", "careercoach@upi") if settings else "careercoach@upi"

    # 5. Save the transaction log immediately as Approved
    payment_doc = {
        "user_id": str(current_user["_id"]),
        "email": current_user["email"],
        "plan_id": plan_id,
        "plan_name": plan.get("name"),
        "price": plan.get("price"),
        "upi_id": upi_id,
        "utr": utr_clean,
        "status": "Approved", # Auto-Approved securely!
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    }
    db.payments.insert_one(payment_doc)

    # 6. Upgrade user to Premium (Lifetime)
    duration_months = plan.get("duration_months", 999)
    result = admin_update_subscription(current_user["email"], duration_months)

    return {
        "success": True,
        "message": f"Payment verified successfully! Your account is now Premium.",
        "subscription_expires_at": result["subscription_expires_at"]
    }

@router.post("/request")
def request_subscription(
    plan_id: str = Body(..., embed=True),
    utr: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a payment verification request for a plan with a strict 12-digit UPI UTR.
    """
    import re
    # 1. Strict UTR format validation: exactly 12 numeric digits
    utr_clean = str(utr).strip()
    if not re.match(r"^\d{12}$", utr_clean):
        raise HTTPException(
            status_code=400,
            detail="Invalid Transaction ID format. Must be exactly 12 numeric digits."
        )

    db = get_db()
    
    # 2. Strict double-spend/duplicate check: UTR must be globally unique
    existing_utr = db.payments.find_one({"utr": utr_clean})
    if existing_utr:
        raise HTTPException(
            status_code=400,
            detail="This Transaction Reference Number (UTR) has already been submitted."
        )

    # 3. Check for existing pending request for this user to avoid spam
    existing_pending = db.payments.find_one({
        "user_id": str(current_user["_id"]),
        "status": "Pending"
    })
    if existing_pending:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending payment verification request. Please wait for the admin to approve it."
        )

    # 4. Fetch the selected plan
    try:
        plan = db.subscription_plans.find_one({"_id": ObjectId(plan_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Plan ID.")

    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")

    # 5. Fetch global settings for UPI ID
    settings = db.system_settings.find_one({"_id": "global_settings"})
    upi_id = settings.get("upi_id", "careercoach@upi") if settings else "careercoach@upi"

    # 6. Insert payment document
    payment_doc = {
        "user_id": str(current_user["_id"]),
        "email": current_user["email"],
        "plan_id": plan_id,
        "plan_name": plan.get("name"),
        "price": plan.get("price"),
        "upi_id": upi_id,
        "utr": utr_clean,
        "status": "Pending",
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    }
    db.payments.insert_one(payment_doc)
    
    return {
        "success": True,
        "message": "Payment verification request submitted successfully. Premium access will be granted once the administrator verifies the UTR."
    }

@router.get("/requests")
def get_user_payment_requests(current_user: dict = Depends(get_current_user)):
    """
    Returns payment history and pending verification requests for the student.
    """
    db = get_db()
    requests = list(db.payments.find({"user_id": str(current_user["_id"])}).sort("created_at", -1))
    for r in requests:
        r["_id"] = str(r["_id"])
        if "created_at" in r and isinstance(r["created_at"], datetime.datetime):
            r["created_at"] = r["created_at"].isoformat()
        if "updated_at" in r and isinstance(r["updated_at"], datetime.datetime):
            r["updated_at"] = r["updated_at"].isoformat()
    return requests

