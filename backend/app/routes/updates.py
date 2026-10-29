import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict
from bson import ObjectId
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/updates", tags=["Updates Board"])

@router.get("")
def list_updates(current_user: dict = Depends(get_current_user)):
    """
    Retrieves all updates/notes shared by the administrator.
    """
    db = get_db()
    updates = list(db.updates.find({}).sort("created_at", -1))
    for u in updates:
        u["_id"] = str(u["_id"])
    return updates

@router.post("", dependencies=[Depends(get_admin_user)])
def publish_update(
    title: str = Body(...),
    content: str = Body(...),
    category: str = Body("General Note"), # e.g. "Placement Idea", "Academic Note"
    attachments: List[Dict] = Body(None)  # list of {"filename": str, "file_data": str, "file_type": str}
):
    """
    Publishes a new note or announcement for students.
    """
    db = get_db()
    update_doc = {
        "title": title,
        "content": content,
        "category": category,
        "attachments": attachments or [],
        "created_at": datetime.datetime.utcnow()
    }
    result = db.updates.insert_one(update_doc)
    update_doc["_id"] = str(result.inserted_id)
    return update_doc

@router.delete("/{id}", dependencies=[Depends(get_admin_user)])
def delete_update(id: str):
    """
    Deletes an announcement/update.
    """
    db = get_db()
    try:
        result = db.updates.delete_one({"_id": ObjectId(id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Update ID.")
        
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Update not found.")
        
    return {"success": True, "message": "Announcement deleted successfully."}
