import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, List, Dict
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.services.subscription_service import enforce_access_limit
from backend.app.utils.sandbox import execute_python_code
from backend.app.services.code_review_service import review_student_code

router = APIRouter(prefix="/coding", tags=["Coding Practice & Sandbox"])

@router.get("/problems")
def get_coding_problems(current_user: dict = Depends(get_current_user)):
    """
    Lists all available coding practice questions with completed status.
    """
    enforce_access_limit(current_user, "compiler")
    db = get_db()
    
    # Fetch all completed problem IDs for the current user
    completed_ids = {
        str(cp["problem_id"]) 
        for cp in db.completed_problems.find({"user_id": str(current_user["_id"])})
    }
    
    problems = list(db.quizzes.find({"type": "coding"}))
    for p in problems:
        p["_id"] = str(p["_id"])
        p["completed"] = p["_id"] in completed_ids
        p["language"] = p.get("language", "Python")
        p["topic"] = p.get("topic", "General")
    return problems

@router.get("/problems/{id}")
def get_coding_problem(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves starter code, examples, and description for a specific coding problem.
    """
    enforce_access_limit(current_user, "compiler")
    db = get_db()
    try:
        problem = db.quizzes.find_one({"_id": ObjectId(id), "type": "coding"})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid problem ID.")
        
    if not problem:
        raise HTTPException(status_code=404, detail="Coding problem not found.")
        
    is_completed = db.completed_problems.count_documents({"user_id": str(current_user["_id"]), "problem_id": id}) >= 1
    
    problem["_id"] = str(problem["_id"])
    return {
        "_id": problem["_id"],
        "title": problem["title"],
        "question": problem["question"],
        "starter_code": problem["starter_code"],
        "difficulty": problem["difficulty"],
        "language": problem.get("language", "Python"),
        "topic": problem.get("topic", "General"),
        "completed": is_completed,
        "subject_id": problem.get("subject_id"),
        "topic_id": problem.get("topic_id")
    }

@router.post("/problems/{id}/submit")
def submit_code_endpoint(
    id: str,
    code: str = Body(..., embed=True),
    language: str = Body("Python", embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Enforces daily compiler usage limits for non-subscribers.
    Compiles and tests solutions in a secure sandbox, logs results,
    and returns a full AI Code Review (complexity, bugs, suggestions).
    """
    # 1. Enforce subscription access limits
    enforce_access_limit(current_user, "compiler")
    
    db = get_db()
    try:
        problem = db.quizzes.find_one({"_id": ObjectId(id), "type": "coding"})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid problem ID.")
        
    if not problem:
        raise HTTPException(status_code=404, detail="Coding problem not found.")
        
    # 2. Run compiler sandbox
    test_cases = problem.get("test_cases", [])
    exec_results = execute_python_code(code, test_cases, language)
    
    # 3. Log submission in MongoDB
    now = datetime.datetime.utcnow()
    passed = len(exec_results) > 0 and all(tc.get("passed", False) for tc in exec_results)
    
    submission_doc = {
        "user_id": str(current_user["_id"]),
        "problem_id": id,
        "language": language,
        "code": code,
        "results": exec_results,
        "passed": passed,
        "created_at": now
    }
    db.coding_submissions.insert_one(submission_doc)
    
    # Log completion if passed
    if passed:
        db.completed_problems.update_one(
            {"user_id": str(current_user["_id"]), "problem_id": id},
            {"$set": {"completed_at": now, "language": language}},
            upsert=True
        )
        
    # 4. Generate AI review
    ai_review = review_student_code(code, problem["title"], problem["difficulty"])
    
    return {
        "submission_id": str(submission_doc["_id"]),
        "passed": passed,
        "results": exec_results,
        "ai_review": ai_review
    }
