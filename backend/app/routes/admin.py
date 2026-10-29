import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, List, Dict
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_admin_user
from backend.app.services.subscription_service import (
    admin_update_subscription, 
    create_subscription_plan, 
    update_payment_settings,
    set_subscription_enforcement,
    is_subscription_enforced
)

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.post("/subscription/toggle-enforcement", dependencies=[Depends(get_admin_user)])
def toggle_subscription_enforcement(enforced: bool = Body(..., embed=True)):
    """
    Toggles whether paid subscription is enforced platform-wide.
    If False, all features are free for all students.
    If True, paid subscription paywalls and limits are enforced.
    """
    return set_subscription_enforcement(enforced)

@router.post("/subscription/grant", dependencies=[Depends(get_admin_user)])
def grant_user_subscription(
    email: str = Body(..., embed=True),
    months: int = Body(1, embed=True)
):
    """
    Grants or extends an active premium subscription for a student.
    Enables unlimited compiler access, resources, and tests.
    """
    return admin_update_subscription(email, months)

@router.post("/subjects", dependencies=[Depends(get_admin_user)])
def create_subject(
    name: str = Body(...),
    category: str = Body(...),
    description: str = Body(...)
):
    """
    Creates a new learning/placement subject.
    """
    db = get_db()
    existing = db.subjects.find_one({"name": name})
    if existing:
        raise HTTPException(status_code=400, detail="Subject with this name already exists.")
        
    subj_doc = {
        "name": name,
        "category": category,
        "description": description,
        "is_enabled": True,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    }
    result = db.subjects.insert_one(subj_doc)
    subj_doc["_id"] = str(result.inserted_id)
    return subj_doc

@router.post("/subjects/{subject_id}/topics", dependencies=[Depends(get_admin_user)])
def add_topic(
    subject_id: str,
    name: str = Body(...),
    description: str = Body(...),
    order: int = Body(0)
):
    """
    Adds a syllabus topic to a specific subject and auto-generates 30 MCQ test questions.
    """
    db = get_db()
    topic_doc = {
        "subject_id": subject_id,
        "name": name,
        "description": description,
        "order": order,
        "created_at": datetime.datetime.utcnow()
    }
    result = db.topics.insert_one(topic_doc)
    topic_id_str = str(result.inserted_id)
    topic_doc["_id"] = topic_id_str
    
    # Auto-generate 30 MCQ questions for the topic
    mcqs = []
    for q_idx in range(1, 31):
        mcqs.append({
            "subject_id": subject_id,
            "topic_id": topic_id_str,
            "type": "mcq",
            "question": f"Question {q_idx}: Which of the following best describes the core concept or protocol in {name}?",
            "options": [
                f"Option A: Baseline standard/model definition for {name}.",
                f"Option B: Optimized process design for {name}.",
                f"Option C: Performance analysis and constraints of {name}.",
                f"Option D: All of the above."
            ],
            "correct_answer": "Option D: All of the above.",
            "explanation": f"Explanation: Option D is correct as it describes a comprehensive set of concepts related to {name}.",
            "difficulty": "medium" if q_idx % 2 == 0 else "easy",
            "created_at": datetime.datetime.utcnow()
        })
    db.quizzes.insert_many(mcqs)
    
    return topic_doc

@router.post("/topics/{topic_id}/quizzes", dependencies=[Depends(get_admin_user)])
def add_quiz_question(
    topic_id: str,
    question_type: str = Body(..., alias="type"), # mcq or coding
    question: str = Body(...),
    options: Optional[List[str]] = Body(None),
    correct_answer: Optional[str] = Body(None),
    explanation: Optional[str] = Body(None),
    starter_code: Optional[str] = Body(None),
    test_cases: Optional[List[Dict]] = Body(None),
    difficulty: str = Body("medium")
):
    """
    Creates a new MCQ or coding problem for a syllabus topic.
    """
    db = get_db()
    topic = db.topics.find_one({"_id": ObjectId(topic_id)})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found.")
        
    quiz_doc = {
        "subject_id": str(topic["subject_id"]),
        "topic_id": topic_id,
        "type": question_type,
        "question": question,
        "difficulty": difficulty,
        "created_at": datetime.datetime.utcnow()
    }
    
    if question_type == "mcq":
        if not options or not correct_answer:
            raise HTTPException(status_code=400, detail="MCQs require options and correct_answer.")
        quiz_doc.update({
            "options": options,
            "correct_answer": correct_answer,
            "explanation": explanation
        })
    elif question_type == "coding":
        if not starter_code or not test_cases:
            raise HTTPException(status_code=400, detail="Coding tasks require starter_code and test_cases.")
        quiz_doc.update({
            "starter_code": starter_code,
            "test_cases": test_cases
        })
        
    result = db.quizzes.insert_one(quiz_doc)
    quiz_doc["_id"] = str(result.inserted_id)
    return quiz_doc

@router.post("/subscription/plans", dependencies=[Depends(get_admin_user)])
def add_subscription_plan(
    name: str = Body(...),
    price: float = Body(...),
    duration_months: int = Body(...)
):
    """
    Creates a new subscription plan option.
    """
    return create_subscription_plan(name, price, duration_months)

@router.delete("/subscription/plans/{plan_id}", dependencies=[Depends(get_admin_user)])
def delete_subscription_plan(plan_id: str):
    """
    Deletes an existing subscription plan option.
    """
    db = get_db()
    try:
        result = db.subscription_plans.delete_one({"_id": ObjectId(plan_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Plan ID format.")
        
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")
        
    return {"success": True, "message": "Subscription plan deleted successfully."}

@router.put("/subscription/payment-settings", dependencies=[Depends(get_admin_user)])
def update_payment_settings_endpoint(
    upi_id: Optional[str] = Body(None),
    qr_code: Optional[str] = Body(None)
):
    """
    Updates the global UPI ID and/or QR code (base64 string) for payment setup.
    """
    return update_payment_settings(upi_id=upi_id, qr_code=qr_code)

@router.get("/payments", dependencies=[Depends(get_admin_user)])
def get_all_payments():
    """
    Returns a list of all payment verification requests (pending and completed).
    """
    db = get_db()
    payments = list(db.payments.find({}).sort("created_at", -1))
    for p in payments:
        p["_id"] = str(p["_id"])
        if "created_at" in p and isinstance(p["created_at"], datetime.datetime):
            p["created_at"] = p["created_at"].isoformat()
        if "updated_at" in p and isinstance(p["updated_at"], datetime.datetime):
            p["updated_at"] = p["updated_at"].isoformat()
    return payments

@router.post("/payments/{payment_id}/approve", dependencies=[Depends(get_admin_user)])
def approve_student_payment(payment_id: str):
    """
    Approves a pending payment request and upgrades the student user to premium.
    """
    db = get_db()
    try:
        payment = db.payments.find_one({"_id": ObjectId(payment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Payment ID format.")
        
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")
        
    if payment["status"] != "Pending":
        raise HTTPException(status_code=400, detail=f"This payment has already been {payment['status'].lower()}.")
        
    # Get plan duration
    try:
        plan = db.subscription_plans.find_one({"_id": ObjectId(payment["plan_id"])})
    except Exception:
        plan = None
        
    duration_months = plan.get("duration_months", 1) if plan else 1
    
    # Update user's subscription
    admin_update_subscription(payment["email"], duration_months)
    
    # Update payment record
    db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"status": "Approved", "updated_at": datetime.datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Payment verified and subscription activated successfully."}

@router.post("/payments/{payment_id}/reject", dependencies=[Depends(get_admin_user)])
def reject_student_payment(payment_id: str):
    """
    Rejects a pending payment request.
    """
    db = get_db()
    try:
        payment = db.payments.find_one({"_id": ObjectId(payment_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Payment ID format.")
        
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found.")
        
    if payment["status"] != "Pending":
        raise HTTPException(status_code=400, detail=f"This payment has already been {payment['status'].lower()}.")
        
    db.payments.update_one(
        {"_id": ObjectId(payment_id)},
        {"$set": {"status": "Rejected", "updated_at": datetime.datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Payment request has been rejected."}

@router.post("/subjects/{subject_id}/notes", dependencies=[Depends(get_admin_user)])
def add_subject_note(subject_id: str, title: str = Body(...), content: str = Body(...)):
    """
    Adds a lecture/reference note to a subject.
    """
    db = get_db()
    import uuid
    note_id = str(uuid.uuid4())
    note_doc = {
        "id": note_id,
        "title": title,
        "content": content,
        "created_at": datetime.datetime.utcnow().isoformat(),
        "updated_at": datetime.datetime.utcnow().isoformat()
    }
    
    try:
        res = db.subjects.update_one(
            {"_id": ObjectId(subject_id)},
            {"$push": {"notes": note_doc}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Subject ID format.")
        
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found.")
        
    return {"success": True, "note": note_doc}

@router.put("/subjects/{subject_id}/notes/{note_id}", dependencies=[Depends(get_admin_user)])
def edit_subject_note(subject_id: str, note_id: str, title: str = Body(...), content: str = Body(...)):
    """
    Edits an existing note for a subject.
    """
    db = get_db()
    try:
        subject = db.subjects.find_one({"_id": ObjectId(subject_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Subject ID format.")
        
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
        
    notes = subject.get("notes", [])
    note_found = False
    for n in notes:
        if n.get("id") == note_id:
            n["title"] = title
            n["content"] = content
            n["updated_at"] = datetime.datetime.utcnow().isoformat()
            note_found = True
            break
            
    if not note_found:
        raise HTTPException(status_code=404, detail="Note not found.")
        
    db.subjects.update_one(
        {"_id": ObjectId(subject_id)},
        {"$set": {"notes": notes}}
    )
    return {"success": True}

@router.delete("/subjects/{subject_id}/notes/{note_id}", dependencies=[Depends(get_admin_user)])
def delete_subject_note(subject_id: str, note_id: str):
    """
    Deletes a note from a subject.
    """
    db = get_db()
    try:
        res = db.subjects.update_one(
            {"_id": ObjectId(subject_id)},
            {"$pull": {"notes": {"id": note_id}}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Subject ID format.")
        
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found.")
        
    return {"success": True}


