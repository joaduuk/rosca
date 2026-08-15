# backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from typing import Any
import secrets

from app.core.database import get_db
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.email import send_welcome_email, send_password_reset_email, send_verification_email
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, TokenResponse, ResetPasswordRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

RESET_TOKEN_EXPIRE_HOURS = 1
VERIFICATION_TOKEN_EXPIRE_MINUTES = 30
VERIFICATION_RESEND_COOLDOWN_SECONDS = 60


def _generate_invite_code(db) -> str:
    """Generate a unique invite code like RC-A3K7PQ"""
    import secrets, string
    chars = string.ascii_uppercase + string.digits
    while True:
        code = 'RC-' + ''.join(secrets.choice(chars) for _ in range(6))
        exists = db.query(User).filter(User.invite_code == code).first()
        if not exists:
            return code


def _issue_verification_token(user: User) -> str:
    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES)
    user.verification_sent_at = datetime.utcnow()
    return token


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
        invite_code=_generate_invite_code(db),
        is_verified=False,
        email_valid=True,
    )
    token = _issue_verification_token(new_user)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Send verification email only — no welcome email until confirmed
    try:
        send_verification_email(new_user.email, new_user.full_name, token)
    except Exception as e:
        print(f"[EMAIL] Verification email failed: {e}")

    return new_user


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Confirm an email address using the token from the verification email."""
    user = db.query(User).filter(User.verification_token == token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    if not user.verification_token_expires or datetime.utcnow() > user.verification_token_expires:
        raise HTTPException(status_code=400, detail="Verification link has expired. Please request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.commit()

    # Now that the address is confirmed, send the welcome email
    try:
        send_welcome_email(user.email, user.full_name)
    except Exception as e:
        print(f"[EMAIL] Welcome email failed: {e}")

    return {"message": "Email verified successfully. You can now log in."}


@router.post("/resend-verification")
def resend_verification(email: str, db: Session = Depends(get_db)):
    """Request a new verification email. Always returns 200 to avoid email enumeration."""
    user = db.query(User).filter(User.email == email).first()

    if user and not user.is_verified and user.email_valid:
        if user.verification_sent_at and \
           (datetime.utcnow() - user.verification_sent_at).total_seconds() < VERIFICATION_RESEND_COOLDOWN_SECONDS:
            raise HTTPException(status_code=429, detail="Please wait a bit before requesting another email.")

        token = _issue_verification_token(user)
        db.commit()

        try:
            send_verification_email(user.email, user.full_name, token)
        except Exception as e:
            print(f"[EMAIL] Verification resend failed: {e}")

    return {"message": "If that email needs verifying, a new link has been sent."}


@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in. Check your inbox or request a new link.")

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

    if user and user.email_valid:
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
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid token."""
    user = db.query(User).filter(User.reset_token == payload.token).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if not user.reset_token_expires or datetime.utcnow() > user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.hashed_password = get_password_hash(payload.new_password)
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