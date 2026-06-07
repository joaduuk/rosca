# =============================================================================
# models/blog_post.py
# Add this model to your SQLAlchemy models (or paste into your existing models file)
# =============================================================================

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base  # adjust import to match your project


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    excerpt = Column(Text, nullable=True)
    content = Column(Text, nullable=False, default="")
    author_name = Column(String(100), nullable=True)
    cover_image_url = Column(String(500), nullable=True)
    tag = Column(String(50), nullable=True)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# =============================================================================
# routers/blog.py
# Register this router in main.py:  app.include_router(blog.router)
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import get_db          # adjust to your project
from models.blog_post import BlogPost
from routers.auth import get_current_admin_user  # adjust to your auth dependency

router = APIRouter(prefix="/api/blog", tags=["blog"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str = ""
    author_name: Optional[str] = None
    cover_image_url: Optional[str] = None
    tag: Optional[str] = None
    is_published: bool = False


class BlogPostUpdate(BlogPostCreate):
    pass


class BlogPostOut(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str]
    content: str
    author_name: Optional[str]
    cover_image_url: Optional[str]
    tag: Optional[str]
    is_published: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Public routes ─────────────────────────────────────────────────────────────

@router.get("/posts", response_model=list[BlogPostOut])
def list_posts(
    published: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Public: pass ?published=true to get only published posts.
    Admin (no filter): returns all posts (drafts + published).
    """
    query = db.query(BlogPost)
    if published is True:
        query = query.filter(BlogPost.is_published == True)
    return query.order_by(BlogPost.created_at.desc()).all()


@router.get("/posts/{slug}", response_model=BlogPostOut)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if not post.is_published:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


# ── Admin routes (protected) ──────────────────────────────────────────────────

@router.get("/admin/posts", response_model=list[BlogPostOut])
def admin_list_posts(
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    return db.query(BlogPost).order_by(BlogPost.created_at.desc()).all()


@router.post("/posts", response_model=BlogPostOut, status_code=201)
def create_post(
    payload: BlogPostCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    # Check slug uniqueness
    existing = db.query(BlogPost).filter(BlogPost.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A post with this slug already exists.")
    post = BlogPost(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/posts/{post_id}", response_model=BlogPostOut)
def update_post(
    post_id: int,
    payload: BlogPostUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    # Check slug uniqueness (exclude self)
    conflict = db.query(BlogPost).filter(
        BlogPost.slug == payload.slug,
        BlogPost.id != post_id,
    ).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Slug already used by another post.")
    for field, value in payload.model_dump().items():
        setattr(post, field, value)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_admin_user),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
