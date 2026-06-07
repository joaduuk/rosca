import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function readingTime(content) {
  const words = content?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0;
  return Math.max(1, Math.round(words / 200));
}

function PostCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="blog-card">
      {post.cover_image_url && (
        <div className="blog-card-image">
          <img src={post.cover_image_url} alt={post.title} />
          {post.tag && <span className="blog-tag">{post.tag}</span>}
        </div>
      )}
      {!post.cover_image_url && post.tag && (
        <div className="blog-card-image blog-card-image--placeholder">
          <div className="blog-placeholder-icon">✦</div>
          <span className="blog-tag">{post.tag}</span>
        </div>
      )}
      <div className="blog-card-body">
        <h2 className="blog-card-title">{post.title}</h2>
        {post.excerpt && <p className="blog-card-excerpt">{post.excerpt}</p>}
        <div className="blog-card-meta">
          <span className="blog-meta-author">
            <span className="blog-meta-avatar">
              {post.author_name?.[0]?.toUpperCase() || "R"}
            </span>
            {post.author_name || "RoscaApp Team"}
          </span>
          <span className="blog-meta-divider">·</span>
          <span className="blog-meta-read">{readingTime(post.content)} min read</span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState("All");

  useEffect(() => {
    fetch(`${API_BASE}/api/blog/posts?published=true`)
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => { setError("Could not load posts."); setLoading(false); });
  }, []);

  const tags = ["All", ...Array.from(new Set(posts.map((p) => p.tag).filter(Boolean)))];
  const filtered = activeTag === "All" ? posts : posts.filter((p) => p.tag === activeTag);
  const [featured, ...rest] = filtered;

  return (
    <>
      <style>{`
        .blog-page {
          min-height: 100vh;
          background: #f9f7f4;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Hero ── */
        .blog-hero {
          background: var(--color-primary, #1a6b4a);
          padding: 80px 24px 64px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .blog-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 70% 50%, rgba(240,165,0,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .blog-hero-label {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--color-gold, #f0a500);
          margin-bottom: 16px;
        }
        .blog-hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(2rem, 5vw, 3.5rem);
          color: #fff;
          margin: 0 0 16px;
          line-height: 1.15;
        }
        .blog-hero p {
          color: rgba(255,255,255,0.75);
          font-size: 1.1rem;
          max-width: 520px;
          margin: 0 auto;
          line-height: 1.6;
        }

        /* ── Tag Filter ── */
        .blog-tags-bar {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
          padding: 32px 24px 0;
          max-width: 900px;
          margin: 0 auto;
        }
        .blog-tag-btn {
          padding: 6px 18px;
          border-radius: 999px;
          border: 1.5px solid #ddd;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          transition: all 0.18s;
          font-family: 'DM Sans', sans-serif;
        }
        .blog-tag-btn:hover {
          border-color: var(--color-primary, #1a6b4a);
          color: var(--color-primary, #1a6b4a);
        }
        .blog-tag-btn.active {
          background: var(--color-primary, #1a6b4a);
          border-color: var(--color-primary, #1a6b4a);
          color: #fff;
        }

        /* ── Layout ── */
        .blog-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }

        /* ── Featured Post ── */
        .blog-featured {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          margin-bottom: 48px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .blog-featured:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.12);
        }
        .blog-featured-image {
          position: relative;
          min-height: 320px;
          background: linear-gradient(135deg, #1a6b4a 0%, #0d4a33 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .blog-featured-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }
        .blog-featured-placeholder {
          font-size: 64px;
          opacity: 0.3;
        }
        .blog-featured-body {
          padding: 48px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .blog-featured-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--color-gold, #f0a500);
          margin-bottom: 16px;
        }
        .blog-featured-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.4rem, 2.5vw, 2rem);
          color: #111;
          line-height: 1.25;
          margin: 0 0 16px;
        }
        .blog-featured-excerpt {
          color: #666;
          line-height: 1.7;
          font-size: 0.95rem;
          margin: 0 0 24px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-featured-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #888;
        }
        .blog-featured-cta {
          margin-top: 24px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          font-size: 14px;
          color: var(--color-primary, #1a6b4a);
        }

        /* ── Grid ── */
        .blog-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 24px;
        }
        .blog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 28px;
        }
        .blog-card {
          background: #fff;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .blog-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 32px rgba(0,0,0,0.12);
        }
        .blog-card-image {
          height: 180px;
          background: linear-gradient(135deg, #1a6b4a 0%, #0d4a33 100%);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .blog-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          position: absolute;
          inset: 0;
        }
        .blog-placeholder-icon {
          font-size: 40px;
          color: rgba(255,255,255,0.2);
        }
        .blog-tag {
          position: absolute;
          top: 12px;
          left: 12px;
          background: var(--color-gold, #f0a500);
          color: #1a1a1a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .blog-card-body {
          padding: 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .blog-card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.15rem;
          color: #111;
          line-height: 1.3;
          margin: 0 0 10px;
        }
        .blog-card-excerpt {
          color: #777;
          font-size: 0.875rem;
          line-height: 1.65;
          margin: 0 0 16px;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .blog-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #999;
          margin-top: auto;
        }
        .blog-meta-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--color-primary, #1a6b4a);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          margin-right: 4px;
        }
        .blog-meta-author {
          display: flex;
          align-items: center;
          font-weight: 500;
          color: #555;
        }
        .blog-meta-divider { color: #ddd; }

        /* ── Empty / Loading ── */
        .blog-empty {
          text-align: center;
          padding: 80px 24px;
          color: #aaa;
        }
        .blog-empty h3 {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: #ccc;
          margin-bottom: 8px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .blog-featured {
            grid-template-columns: 1fr;
          }
          .blog-featured-image { min-height: 200px; }
          .blog-featured-body { padding: 28px 24px; }
        }
      `}</style>

      <div className="blog-page">
        <div className="blog-hero">
          <span className="blog-hero-label">The ROSCA Journal</span>
          <h1>Resources & Insights</h1>
          <p>Learn how rotating savings groups work, tips for running them well, and stories from communities around the world.</p>
        </div>

        {tags.length > 1 && (
          <div className="blog-tags-bar">
            {tags.map((tag) => (
              <button
                key={tag}
                className={`blog-tag-btn${activeTag === tag ? " active" : ""}`}
                onClick={() => setActiveTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="blog-content">
          {loading && <div className="blog-empty"><p>Loading posts…</p></div>}
          {error && <div className="blog-empty"><p>{error}</p></div>}

          {!loading && !error && filtered.length === 0 && (
            <div className="blog-empty">
              <h3>No posts yet</h3>
              <p>Check back soon — we're writing.</p>
            </div>
          )}

          {!loading && !error && featured && (
            <Link to={`/blog/${featured.slug}`} className="blog-featured">
              <div className="blog-featured-image">
                {featured.cover_image_url
                  ? <img src={featured.cover_image_url} alt={featured.title} />
                  : <span className="blog-featured-placeholder">✦</span>
                }
              </div>
              <div className="blog-featured-body">
                {featured.tag && <div className="blog-featured-label">{featured.tag}</div>}
                <h2 className="blog-featured-title">{featured.title}</h2>
                {featured.excerpt && <p className="blog-featured-excerpt">{featured.excerpt}</p>}
                <div className="blog-featured-meta">
                  <span className="blog-meta-avatar">{featured.author_name?.[0]?.toUpperCase() || "R"}</span>
                  <span>{featured.author_name || "RoscaApp Team"}</span>
                  <span className="blog-meta-divider">·</span>
                  <span>{readingTime(featured.content)} min read</span>
                </div>
                <span className="blog-featured-cta">Read article →</span>
              </div>
            </Link>
          )}

          {!loading && !error && rest.length > 0 && (
            <>
              <div className="blog-section-label">More Articles</div>
              <div className="blog-grid">
                {rest.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
