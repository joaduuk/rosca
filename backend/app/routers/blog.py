from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.api.dependencies.auth import require_super_admin
from app.models.user import User
from app.models.blog_post import BlogPost
from app.schemas.blog import BlogPostCreate, BlogPostUpdate, BlogPostResponse

router = APIRouter(prefix="/blog", tags=["Blog"])


# ── Public routes ─────────────────────────────────────────────────────────

@router.get("/posts", response_model=List[BlogPostResponse])
def list_posts(
    published: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    """Public: pass ?published=true for the public blog listing.
    Without the filter this would return drafts too, so this route is
    intentionally NOT used by the admin tab — see /admin/posts below."""
    query = db.query(BlogPost)
    if published is True:
        query = query.filter(BlogPost.is_published == True)
    return query.order_by(BlogPost.created_at.desc()).all()


@router.get("/posts/{slug}", response_model=BlogPostResponse)
def get_post(slug: str, db: Session = Depends(get_db)):
    post = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if not post or not post.is_published:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


# ── Admin routes (protected) ──────────────────────────────────────────────

@router.get("/admin/posts", response_model=List[BlogPostResponse])
def admin_list_posts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    """Admin-only: returns ALL posts, including drafts."""
    return db.query(BlogPost).order_by(BlogPost.created_at.desc()).all()


@router.post("/posts", response_model=BlogPostResponse, status_code=201)
def create_post(
    payload: BlogPostCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    existing = db.query(BlogPost).filter(BlogPost.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="A post with this slug already exists.")
    post = BlogPost(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/posts/{post_id}", response_model=BlogPostResponse)
def update_post(
    post_id: UUID,
    payload: BlogPostUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
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
    post_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(require_super_admin),
):
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()