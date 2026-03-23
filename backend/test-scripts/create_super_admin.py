# C:\proof\rosca\backend\scripts\create_super_admin.py

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from uuid import uuid4
from datetime import datetime

def create_super_admin():
    db = SessionLocal()
    
    super_admin_email = "admin@rosca.com"
    
    # Check if already exists
    existing = db.query(User).filter(User.email == super_admin_email).first()
    
    if existing:
        print(f"✅ Super admin already exists with email: {super_admin_email}")
        print(f"Current role: {existing.role}")
        return existing
    
    # Create new super admin
    super_admin = User(
        id=uuid4(),
        email=super_admin_email,
        full_name="Super Admin",
        phone="+1234567890",
        hashed_password=get_password_hash("Admin123!"),  # Change this in production!
        is_active=True,
        role="SUPER_ADMIN",  # Using the new enum value
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(super_admin)
    db.commit()
    db.refresh(super_admin)
    
    print("✅ Super Admin created successfully!")
    print(f"Email: {super_admin_email}")
    print(f"Password: Admin123! (CHANGE THIS IN PRODUCTION!)")
    print(f"Role: {super_admin.role}")
    
    db.close()
    return super_admin

if __name__ == "__main__":
    create_super_admin()