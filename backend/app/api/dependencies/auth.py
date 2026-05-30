# app/api/dependencies/auth.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import UUID4

from app.models.user import User, UserRole
from app.core.database import get_db
from app.core.security import SECRET_KEY, ALGORITHM

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


class RoleChecker:
    """Dependency to check if user has required platform-level roles"""
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {[r.value for r in self.allowed_roles]}"
            )
        return user


# -----------------------------
# Platform-level role dependencies
# -----------------------------
require_super_admin = RoleChecker([UserRole.SUPER_ADMIN])
require_authenticated_user = RoleChecker([UserRole.USER, UserRole.SUPER_ADMIN])


# -----------------------------
# Group-level permission checkers
# -----------------------------
def check_group_admin_or_super_admin(
    group_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> bool:
    """Check if user is admin of the group or super admin"""
    from app.models.group import Group
    from app.models.membership import Membership

    # Super admin has access to everything
    if current_user.role == UserRole.SUPER_ADMIN:
        return True

    # Check if user is the group creator
    group = db.query(Group).filter(Group.id == group_id).first()
    if group and group.created_by == current_user.id:
        return True

    # Check if user is a group admin via membership
    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_active == True,
        Membership.is_admin == True
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You don't have admin access to this group")

    return True


def check_group_member(
    group_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> bool:
    """Check if user is a member of the group"""
    from app.models.membership import Membership

    # Super admin bypass
    if current_user.role == UserRole.SUPER_ADMIN:
        return True

    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    return True


def get_group_role(
    group_id: UUID4,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> str:
    """Get user's role in a group ('admin', 'member', or None)"""
    from app.models.membership import Membership

    if current_user.role == UserRole.SUPER_ADMIN:
        return "admin"

    membership = db.query(Membership).filter(
        Membership.group_id == group_id,
        Membership.user_id == current_user.id,
        Membership.is_active == True
    ).first()

    if not membership:
        return None

    return "admin" if membership.is_admin else "member"