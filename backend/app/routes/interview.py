from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional
from backend.app.core.dependencies import get_current_user
from backend.app.core.database import get_db
from backend.app.services.interview_service import (
    create_interview_session,
    submit_interview_answer,
    generate_interview_report,
    get_interview_session
)
from backend.app.services.subscription_service import enforce_access_limit

router = APIRouter(prefix="/interviews", tags=["Mock Interviews"])

@router.post("/start")
def start_interview_endpoint(
    name: str = Body(...),
    job_role: str = Body(...),
    experience: str = Body(...),
    interview_type: str = Body("Mixed"),
    topic: Optional[str] = Body(None),
    use_resume: bool = Body(False),
    current_user: dict = Depends(get_current_user)
):
    """
    Starts a new interview session. Optionally personalizes using the candidate's uploaded resume,
    and supports focus on a specific topic/subject.
    """
    enforce_access_limit(current_user, "interview")
    resume_text = ""
    if use_resume:
        db = get_db()
        profile = db.resume_profiles.find_one({"user_id": current_user["_id"]})
        if profile:
            resume_text = profile.get("raw_text", "")
            
    session = create_interview_session(
        user_id=current_user["_id"],
        name=name,
        job_role=job_role,
        experience=experience,
        interview_type=interview_type,
        topic=topic,
        resume_text=resume_text
    )
    
    return {
        "interview_id": session["_id"],
        "total_questions": len(session["questions"]),
        "question": session["questions"][0],
        "question_number": 1
    }

@router.post("/{id}/answer")
def submit_answer_endpoint(
    id: str,
    answer: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Submits an answer to the current question, evaluates it, and advances the session.
    """
    return submit_answer_endpoint_impl(id, answer, current_user)

def submit_answer_endpoint_impl(id: str, answer: str, current_user: dict):
    if not answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty.")
    return submit_interview_answer(id, current_user["_id"], answer)

@router.get("/{id}/report")
def get_report_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetches the final scoring evaluation report for a completed mock interview.
    """
    return generate_interview_report(id, current_user["_id"])

@router.get("/history")
def get_history_endpoint(current_user: dict = Depends(get_current_user)):
    """
    Retrieves a list of all mock interviews taken by the authenticated user.
    """
    db = get_db()
    interviews = list(db.interviews.find({"user_id": current_user["_id"]}).sort("created_at", -1))
    for item in interviews:
        item["_id"] = str(item["_id"])
    return interviews
