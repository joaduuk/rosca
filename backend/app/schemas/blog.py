from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


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


class BlogPostResponse(BaseModel):
    id: UUID
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