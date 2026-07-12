import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../services/api";

function readingTime(content) {
  const words = content?.replace(/<[^>]+>/g, "").split(/\s+/).length || 0;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    API.get(`/blog/posts/${slug}`)
      .then((res) => {
        const data = res.data;
        setPost(data);
        setLoading(false);
        // Fetch related posts (same tag, exclude current)
        API.get("/blog/posts?published=true")
          .then((r) => {
            const rel = r.data
              .filter((p) => p.slug !== slug && (!data.tag || p.tag === data.tag))
              .slice(0, 3);
            setRelated(rel);
          })
          .catch(() => {});
      })
      .catch(() => {
        setError("Post not found.");
        setLoading(false);
      });
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", color: "#999" }}>
      Loading…
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", gap: 16 }}>
      <p style={{ color: "#aaa", fontSize: "1.1rem" }}>Post not found.</p>
      <Link to="/blog" style={{ color: "#1a6b4a", fontWeight: 600 }}>← Back to Blog</Link>
    </div>
  );

  return (
    <>
      <style>{`
        .post-page {
          min-height: 100vh;
          background: #f9f7f4;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Hero ── */
        .post-hero {
          background: var(--color-primary, #1a6b4a);
          padding: 64px 24px 80px;
          position: relative;
          overflow: hidden;
        }
        .post-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 80% 20%, rgba(240,165,0,0.18) 0%, transparent 55%);
          pointer-events: none;
        }
        .post-hero-inner {
          max-width: 760px;
          margin: 0 auto;
          position: relative;
        }
        .post-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: rgba(255,255,255,0.6);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 28px;
          transition: color 0.15s;
        }
        .post-back:hover { color: #fff; }
        .post-tag-pill {
          display: inline-block;
          background: var(--color-gold, #f0a500);
          color: #1a1a1a;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 20px;
        }
        .post-hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          color: #fff;
          line-height: 1.2;
          margin: 0 0 24px;
        }
        .post-hero-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .post-hero-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }
        .post-hero-author { color: rgba(255,255,255,0.9); font-weight: 500; font-size: 14px; }
        .post-hero-dot { color: rgba(255,255,255,0.3); }
        .post-hero-read { color: rgba(255,255,255,0.6); font-size: 13px; }

        /* ── Cover image ── */
        .post-cover {
          max-width: 900px;
          margin: -40px auto 0;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }
        .post-cover img {
          width: 100%;
          max-height: 440px;
          object-fit: cover;
          border-radius: 16px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.18);
          display: block;
        }

        /* ── Article body ── */
        .post-body-wrap {
          max-width: 760px;
          margin: 0 auto;
          padding: 56px 24px 80px;
        }
        .post-content {
          background: #fff;
          border-radius: 16px;
          padding: 48px 52px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06);
          font-size: 1.05rem;
          line-height: 1.8;
          color: #333;
        }
        .post-content h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 1.6rem;
          color: #111;
          margin: 2em 0 0.6em;
          line-height: 1.25;
        }
        .post-content h3 {
          font-family: 'DM Serif Display', serif;
          font-size: 1.25rem;
          color: #222;
          margin: 1.6em 0 0.5em;
        }
        .post-content p { margin: 0 0 1.3em; }
        .post-content ul, .post-content ol {
          margin: 0 0 1.3em 1.4em;
        }
        .post-content li { margin-bottom: 0.4em; }
        .post-content strong { color: #111; font-weight: 600; }
        .post-content a { color: var(--color-primary, #1a6b4a); text-decoration: underline; }
        .post-content blockquote {
          border-left: 3px solid var(--color-gold, #f0a500);
          margin: 1.5em 0;
          padding: 12px 24px;
          background: #fffbf0;
          border-radius: 0 8px 8px 0;
          color: #555;
          font-style: italic;
        }
        .post-content code {
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.9em;
        }

        /* ── Share strip ── */
        .post-share {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 40px;
          padding-top: 32px;
          border-top: 1px solid #eee;
          flex-wrap: wrap;
        }
        .post-share-label { font-size: 13px; color: #aaa; font-weight: 500; }
        .post-share-btn {
          padding: 7px 18px;
          border-radius: 999px;
          border: 1.5px solid #ddd;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.15s;
          color: #555;
        }
        .post-share-btn:hover {
          border-color: var(--color-primary, #1a6b4a);
          color: var(--color-primary, #1a6b4a);
        }

        /* ── Related Posts ── */
        .post-related {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px 80px;
        }
        .post-related-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #aaa;
          margin-bottom: 24px;
        }
        .post-related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        .post-related-card {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          text-decoration: none;
          color: inherit;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .post-related-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.1);
        }
        .post-related-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-gold, #f0a500);
          margin-bottom: 8px;
        }
        .post-related-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1rem;
          color: #111;
          line-height: 1.3;
          margin: 0 0 8px;
        }
        .post-related-read { font-size: 12px; color: #bbb; }

        @media (max-width: 640px) {
          .post-content { padding: 28px 20px; font-size: 1rem; }
          .post-cover { margin-top: -24px; }
        }
      `}</style>

      <div className="post-page">
        <div className="post-hero">
          <div className="post-hero-inner">
            <Link to="/blog" className="post-back">← Back to Blog</Link>
            {post.tag && <div className="post-tag-pill">{post.tag}</div>}
            <h1>{post.title}</h1>
            <div className="post-hero-meta">
              <div className="post-hero-avatar">
                {post.author_name?.[0]?.toUpperCase() || "R"}
              </div>
              <span className="post-hero-author">{post.author_name || "RoscaApp Team"}</span>
              <span className="post-hero-dot">·</span>
              <span className="post-hero-read">{readingTime(post.content)} min read</span>
            </div>
          </div>
        </div>

        {post.cover_image_url && (
          <div className="post-cover">
            <img src={post.cover_image_url} alt={post.title} />
          </div>
        )}

        <div className="post-body-wrap" style={{ marginTop: post.cover_image_url ? "40px" : "0" }}>
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div className="post-share">
            <span className="post-share-label">Share:</span>
            <button
              className="post-share-btn"
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert("Link copied!"))}
            >
              Copy Link
            </button>
            <button
              className="post-share-btn"
              onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.title)}`, "_blank")}
            >
              Share on X
            </button>
            <button
              className="post-share-btn"
              onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank")}
            >
              LinkedIn
            </button>
          </div>
        </div>

        {related.length > 0 && (
          <div className="post-related">
            <div className="post-related-label">More Articles</div>
            <div className="post-related-grid">
              {related.map((r) => (
                <Link key={r.id} to={`/blog/${r.slug}`} className="post-related-card">
                  {r.tag && <div className="post-related-tag">{r.tag}</div>}
                  <div className="post-related-title">{r.title}</div>
                  <div className="post-related-read">{readingTime(r.content)} min read</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
