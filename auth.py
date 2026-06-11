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

    return "admin" if membership.is_admin else "member"# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Any
import secrets

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.email import send_welcome_email, send_password_reset_email
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_TOKEN_EXPIRE_HOURS = 1


def _generate_invite_code(db) -> str:
    """Generate a unique invite code like RC-A3K7PQ"""
    import secrets, string
    chars = string.ascii_uppercase + string.digits
    while True:
        code = 'RC-' + ''.join(secrets.choice(chars) for _ in range(6))
        exists = db.query(User).filter(User.invite_code == code).first()
        if not exists:
            return code


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone,
        hashed_password=get_password_hash(user_data.password),
        role=UserRole.USER.value,
        invite_code=_generate_invite_code(db)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send welcome email (non-blocking — failure won't break registration)
    try:
        send_welcome_email(new_user.email, new_user.full_name)
    except Exception as e:
        print(f"[EMAIL] Welcome email failed: {e}")

    return new_user


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role}
    )

    return TokenResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role
    )


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    """Request a password reset link. Always returns 200 to prevent email enumeration."""
    user = db.query(User).filter(User.email == email).first()

    if user:
        # Generate a secure random token
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        db.commit()

        try:
            send_password_reset_email(user.email, user.full_name, token)
        except Exception as e:
            print(f"[EMAIL] Reset email failed: {e}")

    # Always return success to avoid leaking whether email exists
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
def reset_password(token: str, new_password: str, db: Session = Depends(get_db)):
    """Reset password using a valid token."""
    user = db.query(User).filter(User.reset_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not user.reset_token_expires or datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.hashed_password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}


@router.get("/verify-reset-token")
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Check if a reset token is still valid (used by frontend before showing reset form)."""
    user = db.query(User).filter(User.reset_token == token).first()

    if not user or not user.reset_token_expires or datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    return {"valid": True, "email": user.email}
