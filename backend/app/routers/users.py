# backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
# from app.core.security import get_current_user
from app.api.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all users (for adding to groups)"""
    query = db.query(User)
    
    if search:
        query = query.filter(
            (User.email.contains(search)) | 
            (User.full_name.contains(search))
        )
    
    users = query.offset(skip).limit(limit).all()
    return users

@router.get("/search")
def search_users_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search users by email to add to groups"""
    users = db.query(User).filter(
        User.email.ilike(f"%{email}%")
    ).limit(10).all()
    
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone
        }
        for user in users
    ]