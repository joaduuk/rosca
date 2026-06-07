# RoscaApp Blog — Integration Checklist
# ========================================

## 1. Backend

### a) Add the model
Copy `BlogPost` class from `blog_backend.py` into:
  `backend/models/blog_post.py`   (or wherever your models live)

Make sure it's imported in the file where you call `Base.metadata.create_all()`
so Alembic / SQLAlchemy picks it up.

### b) Generate & run the migration
```bash
alembic revision --autogenerate -m "add blog_posts table"
alembic upgrade head
```

### c) Register the router
In `main.py`, add:
```python
from routers import blog
app.include_router(blog.router)
```

### d) Adjust imports in blog_backend.py
- `from database import Base, get_db`  → match your project's path
- `from routers.auth import get_current_admin_user`  → your existing auth guard


## 2. Frontend

### a) Copy components
```
src/pages/BlogPage.jsx
src/pages/BlogPostPage.jsx
src/components/admin/AdminBlogTab.jsx
```

### b) Add routes in App.jsx (or your router file)
```jsx
import BlogPage     from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";

// Inside your <Routes>:
<Route path="/blog"      element={<BlogPage />} />
<Route path="/blog/:slug" element={<BlogPostPage />} />
```

### c) Wire AdminBlogTab into your existing admin panel
Find where you render admin tabs (e.g. AdminPanel.jsx) and add:

```jsx
import AdminBlogTab from "./admin/AdminBlogTab";

// In your tab list:
{ key: "blog", label: "Blog" }

// In your tab content switch:
case "blog":
  return <AdminBlogTab token={token} />;
```

### d) Add fonts (if not already in index.html)
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```


## 3. Footer — add Blog link

Find your Footer component and add to the nav links section:

```jsx
<a href="/blog">Blog</a>
```

Or if you're using React Router:
```jsx
import { Link } from "react-router-dom";
<Link to="/blog">Blog</Link>
```


## 4. Alembic migration (SQL reference)

If you prefer raw SQL:
```sql
CREATE TABLE blog_posts (
    id            SERIAL PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL UNIQUE,
    excerpt       TEXT,
    content       TEXT NOT NULL DEFAULT '',
    author_name   VARCHAR(100),
    cover_image_url VARCHAR(500),
    tag           VARCHAR(50),
    is_published  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ
);
CREATE INDEX ix_blog_posts_slug ON blog_posts(slug);
```


## 5. Notes

- The admin list_posts route (`GET /api/blog/posts` without `?published=true`)
  returns ALL posts. The AdminBlogTab calls this with the auth token.
  The public BlogPage calls it with `?published=true`.

- Content is stored as HTML (from the rich text editor). It's rendered with
  `dangerouslySetInnerHTML` in BlogPostPage — make sure only admins can create posts
  (which your auth guard already ensures).

- Cover images: the editor accepts an image URL. For self-hosted uploads you'd
  need a separate file upload endpoint — out of scope here but easy to add later.

- SEO: add `react-helmet-async` and set `<title>` and `<meta name="description">`
  in BlogPage and BlogPostPage using `post.title` and `post.excerpt`.
