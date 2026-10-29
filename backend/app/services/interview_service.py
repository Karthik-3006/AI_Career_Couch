import datetime
from bson import ObjectId
from typing import Optional, List, Dict
from fastapi import HTTPException
from backend.app.core.database import get_db
from backend.app.services.ai_service import evaluate_answer, generate_suggested_answer, generate_questions
from questions import get_questions as get_fallback_questions

def create_interview_session(
    user_id: str,
    name: str,
    job_role: str,
    experience: str,
    interview_type: str,
    topic: Optional[str] = None,
    resume_text: str = ""
) -> Dict:
    """
    Starts a mock interview session. Tailors questions based on the selected target role,
    experience level, type, and optional specific topic (e.g. Data Structures, React, Operating Systems).
    Saves the session state to MongoDB.
    """
    db = get_db()
    
    # 1. Tailor the request domain if a topic/subject is selected
    target_subject = topic if topic else job_role
    
    # 2. Try Granite first, or fall back to questions.py static list
    questions_list = []
    
    # Format a prompt extension for topics if specified
    industry_context = f"{job_role} - focusing on topic: {topic}" if topic else job_role
    
    try:
        # Generate 5-7 questions
        questions_list = generate_questions(
            job_role=job_role,
            experience=experience,
            interview_type=interview_type,
            count=7,
            resume_text=resume_text,
            industry=industry_context
        )
    except Exception:
        pass
        
    if not questions_list or len(questions_list) < 5:
        # Use fallback static pools
        questions_list = get_fallback_questions(
            job_role=job_role,
            experience=experience,
            interview_type=interview_type,
            count=7,
            resume_text=resume_text,
            industry=target_subject
        )
        
    session_data = {
        "user_id": user_id,
        "name": name,
        "job_role": job_role,
        "experience": experience,
        "interview_type": interview_type,
        "topic": topic,
        "questions": questions_list,
        "current_index": 0,
        "answers": [],
        "scores": [],
        "status": "started",
        "resume_text": resume_text,
        "created_at": datetime.datetime.utcnow(),
        "updated_at": datetime.datetime.utcnow()
    }
    
    result = db.interviews.insert_one(session_data)
    session_data["_id"] = str(result.inserted_id)
    return session_data

def get_interview_session(interview_id: str, user_id: str) -> Dict:
    """
    Retrieves the interview session from MongoDB, verifying user ownership.
    """
    db = get_db()
    try:
        session = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid interview ID format.")
        
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
        
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="You do not have access to this interview session.")
        
    session["_id"] = str(session["_id"])
    return session

def submit_interview_answer(interview_id: str, user_id: str, answer: str) -> Dict:
    """
    Evaluates the user's answer against the current question, saves results, and returns next question.
    """
    db = get_db()
    session = get_interview_session(interview_id, user_id)
    
    if session.get("status") == "completed":
        raise HTTPException(status_code=400, detail="This interview has already been completed.")
        
    current_index = session["current_index"]
    questions = session["questions"]
    
    if current_index >= len(questions):
        raise HTTPException(status_code=400, detail="All questions have already been answered.")
        
    current_question = questions[current_index]
    
    # Evaluate via AI / Granite
    evaluation = evaluate_answer(
        question=current_question,
        answer=answer,
        job_role=session["job_role"],
        experience=session["experience"]
    )
    
    suggested = generate_suggested_answer(
        question=current_question,
        job_role=session["job_role"],
        experience=session["experience"]
    )
    
    answer_item = {
        "question": current_question,
        "answer": answer,
        "score": evaluation.get("score", 0),
        "feedback": evaluation.get("feedback", ""),
        "strengths": evaluation.get("strengths", []),
        "weaknesses": evaluation.get("weaknesses", []),
        "suggested_answer": suggested
    }
    
    new_index = current_index + 1
    status = "completed" if new_index >= len(questions) else "started"
    
    # Update session in database
    db.interviews.update_one(
        {"_id": ObjectId(interview_id)},
        {
            "$push": {
                "answers": answer_item,
                "scores": evaluation.get("score", 0)
            },
            "$set": {
                "current_index": new_index,
                "status": status,
                "updated_at": datetime.datetime.utcnow()
            }
        }
    )
    
    # Get updated session
    session = get_interview_session(interview_id, user_id)
    
    response = {
        "evaluation": evaluation,
        "suggested_answer": suggested,
        "question_number": current_index + 1,
        "is_last": status == "completed",
    }
    
    if status == "started":
        response["next_question"] = questions[new_index]
        response["next_question_number"] = new_index + 1
        
    return response

def generate_interview_report(interview_id: str, user_id: str) -> Dict:
    """
    Generates a summary analysis score and weakness list from the completed interview session.
    """
    session = get_interview_session(interview_id, user_id)
    scores = session.get("scores", [])
    overall = round(sum(scores) / len(scores), 1) if scores else 0
    
    # Extract weakness areas to feed back to the learning engine
    detected_weaknesses = []
    for ans in session.get("answers", []):
        if ans.get("score", 10) < 6:
            detected_weaknesses.extend(ans.get("weaknesses", []))
            
    return {
        "interview_id": interview_id,
        "name": session["name"],
        "job_role": session["job_role"],
        "topic": session.get("topic"),
        "overall_score": overall,
        "answers": session["answers"],
        "detected_weaknesses": list(set(detected_weaknesses))[:5], # Unique top 5 weaknesses
        "status": session["status"],
        "created_at": session["created_at"]
    }
