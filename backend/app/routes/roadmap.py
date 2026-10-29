import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.services.ai_service import generate_roadmap

router = APIRouter(prefix="/roadmap", tags=["Personalized Career Roadmap"])

@router.post("/generate")
def generate_user_roadmap(
    domain: str = Body(..., embed=True),
    level: str = Body("Complete Beginner", embed=True),
    goal: str = Body("", embed=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Generates a structured career roadmap based on target domain, current level,
    and ultimate career goals. Stores result in MongoDB.
    """
    roadmap_data = generate_roadmap(domain, level, goal)
    
    db = get_db()
    db.roadmaps.update_one(
        {"user_id": current_user["_id"]},
        {
            "$set": {
                "user_id": current_user["_id"],
                "domain": domain,
                "level": level,
                "goal": goal,
                "overview": roadmap_data.get("overview"),
                "phases": roadmap_data.get("phases"),
                "weekly_plan": roadmap_data.get("weekly_plan"),
                "books": roadmap_data.get("books"),
                "videos": roadmap_data.get("videos"),
                "tips": roadmap_data.get("tips"),
                "updated_at": datetime.datetime.utcnow()
            }
        },
        upsert=True
    )
    
    # Retrieve updated document
    saved = db.roadmaps.find_one({"user_id": current_user["_id"]})
    saved["_id"] = str(saved["_id"])
    return saved

@router.get("/me")
def get_my_roadmap(current_user: dict = Depends(get_current_user)):
    """
    Fetches the authenticated user's current learning roadmap.
    """
    db = get_db()
    roadmap = db.roadmaps.find_one({"user_id": current_user["_id"]})
    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="No career roadmap generated yet. Please generate a roadmap first."
        )
    roadmap["_id"] = str(roadmap["_id"])
    return roadmap
