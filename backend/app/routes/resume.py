import datetime
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.services.resume_service import validate_file, extract_text
from backend.app.services.ai_service import parse_resume_profile, analyze_resume
from backend.app.services.subscription_service import enforce_access_limit

router = APIRouter(prefix="/resume", tags=["Resume"])

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts resume file upload, extracts text (with OCR fallback for images/scanned PDFs),
    and parses candidate profile details using Granite or heuristic fallbacks.
    """
    enforce_access_limit(current_user, "resume")
    file_bytes = await file.read()
    validate_file(file.filename, len(file_bytes), file.content_type)
    
    try:
        text = extract_text(file_bytes, file.filename)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc))
        
    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from this file. Please paste your text manually."
        )
        
    parsed_profile = parse_resume_profile(text)
    
    # Save the raw text and filename to user's resume collection
    db = get_db()
    db.resume_profiles.update_one(
        {"user_id": current_user["_id"]},
        {
            "$set": {
                "user_id": current_user["_id"],
                "filename": file.filename,
                "raw_text": text,
                "parsed_profile": parsed_profile,
                "updated_at": datetime.datetime.utcnow()
            }
        },
        upsert=True
    )
    
    return {
        "filename": file.filename,
        "raw_text": text,
        "parsed_profile": parsed_profile
    }

@router.post("/analyze")
def analyze_resume_endpoint(
    job_role: str = Form(...),
    experience: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyzes the user's stored resume against a target role and experience level.
    Saves analysis score, strengths, and suggestions to MongoDB.
    """
    enforce_access_limit(current_user, "resume")
    db = get_db()
    profile = db.resume_profiles.find_one({"user_id": current_user["_id"]})
    if not profile or not profile.get("raw_text"):
        raise HTTPException(
            status_code=400,
            detail="No uploaded resume found. Please upload your resume first."
        )
        
    raw_text = profile["raw_text"]
    analysis_result = analyze_resume(raw_text, job_role, experience)
    
    # Update profile in DB with latest analysis
    db.resume_profiles.update_one(
        {"user_id": current_user["_id"]},
        {
            "$set": {
                "target_role": job_role,
                "target_experience": experience,
                "analysis": analysis_result,
                "updated_at": datetime.datetime.utcnow()
            }
        }
    )
    
    return analysis_result

@router.get("/analysis")
def get_resume_analysis(current_user: dict = Depends(get_current_user)):
    """
    Fetches the user's latest resume and its analysis report.
    """
    db = get_db()
    profile = db.resume_profiles.find_one({"user_id": current_user["_id"]})
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No resume profile found."
        )
    profile["_id"] = str(profile["_id"])
    return profile
