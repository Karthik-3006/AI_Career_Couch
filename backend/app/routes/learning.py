import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Optional, List, Dict
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, require_role
from backend.app.services.learning_service import (
    list_subjects,
    get_subject_details,
    get_topic_test,
    submit_test_answers,
    get_student_progress
)
from backend.app.services.subscription_service import enforce_access_limit

router = APIRouter(prefix="/learning", tags=["Learning & Subject System"])

@router.get("/subjects")
def get_subjects(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    Lists all active subjects, categorized (e.g. Core CS, Programming, Placement Prep).
    """
    enforce_access_limit(current_user, "academics")
    return list_subjects(category)

@router.get("/subjects/{id}")
def get_subject(id: str, current_user: dict = Depends(get_current_user)):
    """
    Retrieves topics and detailed syllabus details for a given subject.
    """
    enforce_access_limit(current_user, "academics")
    return get_subject_details(id)

@router.get("/topics/{topic_id}/test")
def get_test(topic_id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetches the 30 MCQ / compiler coding practice test for a topic.
    """
    enforce_access_limit(current_user, "academics")
    return get_topic_test(topic_id)

@router.post("/topics/{topic_id}/test/submit")
def submit_test(
    topic_id: str,
    submissions: List[Dict] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Submits a user's test solutions. Evaluates correctness, updates the progress metrics in MongoDB,
    and returns immediate feedback.
    """
    enforce_access_limit(current_user, "academics")
    return submit_test_answers(current_user["_id"], topic_id, submissions)

@router.get("/progress")
def get_progress(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the user's score metrics, completed modules, and weak areas.
    """
    enforce_access_limit(current_user, "academics")
    return get_student_progress(current_user["_id"])

@router.get("/recommendations")
def get_learning_recommendations(current_user: dict = Depends(get_current_user)):
    """
    Generates personalized study plans by combining:
    1. Weak topics from placement/academic quizzes.
    2. Skills missing in their resume analysis.
    3. Weaknesses detected in mock interviews.
    """
    db = get_db()
    user_id = current_user["_id"]
    
    # 1. Fetch weak topics from quizzes
    weak_topics = []
    progress_records = db.learning_progress.find({"user_id": user_id})
    for prog in progress_records:
        for wt_id in prog.get("weak_topics", []):
            topic = db.topics.find_one({"_id": ObjectId(wt_id)})
            if topic:
                weak_topics.append({
                    "type": "Quiz Practice",
                    "subject": db.subjects.find_one({"_id": ObjectId(topic["subject_id"])})["name"],
                    "name": topic["name"],
                    "reason": "Scored under 60% on this topic's test."
                })
                
    # 2. Fetch missing skills from resume
    missing_skills = []
    resume = db.resume_profiles.find_one({"user_id": user_id})
    if resume and resume.get("analysis"):
        for skill in resume["analysis"].get("missing_skills", []):
            missing_skills.append({
                "type": "Resume Gap",
                "subject": resume.get("target_role", "Career"),
                "name": skill,
                "reason": "Missing skill identified for your target career role."
            })
            
    # 3. Fetch interview weakness alerts
    interview_weaknesses = []
    last_interview = db.interviews.find_one({"user_id": user_id, "status": "completed"}, sort=[("created_at", -1)])
    if last_interview:
        # Extract lower-scoring questions/concepts
        for ans in last_interview.get("answers", []):
            if ans.get("score", 10) < 6:
                for w in ans.get("weaknesses", []):
                    interview_weaknesses.append({
                        "type": "Interview Weakness",
                        "subject": last_interview.get("job_role"),
                        "name": w,
                        "reason": f"Flagged in mock interview on question: '{ans.get('question')[:40]}...'"
                    })
                    
    # Combine recommendations
    recommendations = weak_topics[:3] + missing_skills[:3] + interview_weaknesses[:3]
    
    # Static fallbacks if nothing is tracked yet
    if not recommendations:
        recommendations = [
            {"type": "General Path", "subject": "Core CS", "name": "Data Structures & Algorithms", "reason": "Essential foundation for placement prep."},
            {"type": "General Path", "subject": "Programming", "name": "Python Language Basics", "reason": "Top coding language requested by tech recruiters."}
        ]
        
    return recommendations

@router.get("/certificate")
def get_certificate_eligibility(current_user: dict = Depends(get_current_user)):
    """
    Checks if the user has completed all topics for all enabled academic subjects with a passing grade.
    """
    db = get_db()
    user_id = current_user["_id"]
    
    subjects = list(db.subjects.find({"is_enabled": True}))
    if not subjects:
        return {
            "eligible": False,
            "reason": "No academic subjects are currently configured on the platform.",
            "completed_subjects": 0,
            "total_subjects": 0
        }
        
    total_subjects = len(subjects)
    completed_subjects_count = 0
    subjects_status = []
    
    for s in subjects:
        subj_id = str(s["_id"])
        topics = list(db.topics.find({"subject_id": subj_id}))
        total_topics = len(topics)
        
        progress = db.learning_progress.find_one({"user_id": user_id, "subject_id": subj_id})
        completed_topics = progress.get("completed_topics", []) if progress else []
        
        # Check if all topic IDs are completed
        all_completed = total_topics > 0 and all(str(t["_id"]) in completed_topics for t in topics)
        
        if all_completed:
            completed_subjects_count += 1
            
        subjects_status.append({
            "subject_name": s["name"],
            "completed_topics": len(completed_topics),
            "total_topics": total_topics,
            "status": "completed" if all_completed else "in_progress"
        })
        
    eligible = (completed_subjects_count == total_subjects)
    
    # Generate unique credential ID based on user ID
    credential_id = f"CR-2026-{(abs(hash(str(user_id))) % 90000) + 10000}"
    
    return {
        "eligible": eligible,
        "username": current_user["name"],
        "completed_subjects": completed_subjects_count,
        "total_subjects": total_subjects,
        "subjects_status": subjects_status,
        "issue_date": datetime.datetime.utcnow().strftime("%B %Y").upper(), # e.g. "AUGUST 2026"
        "credential_id": credential_id
    }

@router.get("/mock-test")
def get_mixed_mock_test(current_user: dict = Depends(get_current_user)):
    """
    Fetches 30 mixed MCQ questions from all subjects and topics combined.
    """
    enforce_access_limit(current_user, "academics")
    db = get_db()
    questions = list(db.quizzes.find({"type": "mcq"}))
    import random
    if len(questions) > 30:
        questions = random.sample(questions, 30)
    else:
        random.shuffle(questions)
    for q in questions:
        q["_id"] = str(q["_id"])
    return questions

@router.post("/mock-test/submit")
def submit_mixed_mock_test(
    submissions: List[Dict] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Submits mixed mock test solutions, evaluates correctness, and returns feedback.
    """
    enforce_access_limit(current_user, "academics")
    db = get_db()
    
    q_ids = []
    for sub in submissions:
        if sub.get("question_id"):
            try:
                q_ids.append(ObjectId(sub.get("question_id")))
            except Exception:
                pass
                
    questions = {str(q["_id"]): q for q in db.quizzes.find({"_id": {"$in": q_ids}})}
    
    total = len(submissions)
    correct_count = 0
    results = []
    
    for sub in submissions:
        q_id = sub.get("question_id")
        user_ans = sub.get("answer")
        
        q_obj = questions.get(q_id)
        if q_obj:
            is_correct = q_obj.get("correct_answer") == user_ans
            if is_correct:
                correct_count += 1
            results.append({
                "question_id": q_id,
                "question": q_obj.get("question"),
                "is_correct": is_correct,
                "correct_answer": q_obj.get("correct_answer"),
                "user_answer": user_ans,
                "explanation": q_obj.get("explanation")
            })
            
    score_pct = int((correct_count / total) * 100) if total > 0 else 0
    passed = score_pct >= 60
    
    db.learning_progress.update_one(
        {"user_id": current_user["_id"], "subject_id": "mixed_mock_test"},
        {
            "$set": {
                "user_id": current_user["_id"],
                "subject_id": "mixed_mock_test",
                "scores": {"mock_test": score_pct},
                "updated_at": datetime.datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {
        "score_percentage": score_pct,
        "correct_count": correct_count,
        "total_count": total,
        "passed": passed,
        "results": results
    }
