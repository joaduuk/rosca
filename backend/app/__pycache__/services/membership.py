# C:\proof\rosca\backend\app\services\membership.py

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List, Optional
from uuid import UUID

from app.models.membership import Membership
from app.models.user import User
from app.models.group import Group

class MembershipService:
    """Service layer for membership operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def add_member(
        self,
        group_id: UUID,
        user_id: UUID,
        is_admin: bool = False,
        guarantor_id: Optional[UUID] = None
    ) -> Membership:
        """Add a member to a group"""
        
        # Check if group exists and is active
        group = self.db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        # Check if user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already a member
        existing = self.db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.user_id == user_id,
            Membership.is_active == True
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="User is already an active member")
        
        # Check group capacity
        current_members = self.db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.is_active == True
        ).count()
        
        if current_members >= group.member_count:
            raise HTTPException(status_code=400, detail="Group has reached maximum capacity")
        
        # Calculate payout order
        # If this is the last member, we might want to randomize later
        payout_order = current_members + 1
        
        # Create membership
        membership = Membership(
            user_id=user_id,
            group_id=group_id,
            is_admin=is_admin,
            is_active=True,
            guarantor_id=guarantor_id,
            payout_order=payout_order
        )
        
        try:
            self.db.add(membership)
            self.db.commit()
            self.db.refresh(membership)
            return membership
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Could not add member to group")
    
    def remove_member(self, group_id: UUID, user_id: UUID) -> bool:
        """Remove (soft delete) a member from a group"""
        membership = self.db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.user_id == user_id,
            Membership.is_active == True
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Active membership not found")
        
        membership.is_active = False
        self.db.commit()
        return True
    
    def get_group_members(self, group_id: UUID) -> List[dict]:
        """Get all members of a group with user details"""
        members = self.db.query(
            Membership, User.email, User.full_name, User.phone
        ).join(
            User, User.id == Membership.user_id
        ).filter(
            Membership.group_id == group_id,
            Membership.is_active == True
        ).order_by(Membership.payout_order).all()
        
        result = []
        for membership, email, full_name, phone in members:
            # Get guarantor info if exists
            guarantor_info = None
            if membership.guarantor_id:
                guarantor = self.db.query(User).filter(
                    User.id == membership.guarantor_id
                ).first()
                if guarantor:
                    guarantor_info = {
                        "id": guarantor.id,
                        "name": guarantor.full_name,
                        "email": guarantor.email
                    }
            
            result.append({
                "membership_id": membership.id,
                "user_id": membership.user_id,
                "email": email,
                "name": full_name,
                "phone": phone,
                "is_admin": membership.is_admin,
                "joined_at": membership.joined_at,
                "payout_order": membership.payout_order,
                "guarantor": guarantor_info
            })
        
        return result
    
    def set_guarantor(self, membership_id: UUID, guarantor_id: UUID) -> Membership:
        """Set a guarantor for a member"""
        membership = self.db.query(Membership).filter(
            Membership.id == membership_id,
            Membership.is_active == True
        ).first()
        
        if not membership:
            raise HTTPException(status_code=404, detail="Membership not found")
        
        # Verify guarantor is in same group
        guarantor = self.db.query(Membership).filter(
            Membership.user_id == guarantor_id,
            Membership.group_id == membership.group_id,
            Membership.is_active == True
        ).first()
        
        if not guarantor:
            raise HTTPException(status_code=404, detail="Guarantor not found in this group")
        
        membership.guarantor_id = guarantor_id
        self.db.commit()
        self.db.refresh(membership)
        return membership
    
    def randomize_payout_order(self, group_id: UUID) -> bool:
        """Randomize payout order for fair rotation"""
        import random
        
        members = self.db.query(Membership).filter(
            Membership.group_id == group_id,
            Membership.is_active == True
        ).all()
        
        # Shuffle the members
        random.shuffle(members)
        
        # Assign new order
        for idx, member in enumerate(members):
            member.payout_order = idx + 1
        
        self.db.commit()
        return True