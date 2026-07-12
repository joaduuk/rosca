import { useState, useEffect, useRef } from "react";
import API from "../services/api";

const TAGS = ["How-To", "Community", "Finance", "News", "Case Study", "Tips"];

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  author_name: "",
  cover_image_url: "",
  tag: "",
  is_published: false,
};

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Minimal rich-text toolbar (bold, italic, h2, h3, ul, ol, blockquote, link)
function Toolbar({ onFormat }) {
  const buttons = [
    { label: "B", title: "Bold", cmd: "bold" },
    { label: "I", title: "Italic", cmd: "italic" },
    { label: "H2", title: "Heading 2", cmd: "h2" },
    { label: "H3", title: "Heading 3", cmd: "h3" },
    { label: "UL", title: "Bullet List", cmd: "ul" },
    { label: "OL", title: "Numbered List", cmd: "ol" },
    { label: '❝', title: "Blockquote", cmd: "blockquote" },
    { label: "🔗", title: "Link", cmd: "link" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", padding: "8px 12px", borderBottom: "1px solid #eee", background: "#fafafa", borderRadius: "8px 8px 0 0" }}>
      {buttons.map((b) => (
        <button
          key={b.cmd}
          title={b.title}
          type="button"
          onClick={() => onFormat(b.cmd)}
          style={{
            padding: "4px 10px",
            border: "1px solid #ddd",
            borderRadius: 6,
            background: "#fff",
            fontSize: b.cmd === "h2" || b.cmd === "h3" ? 11 : 13,
            fontWeight: 600,
            cursor: "pointer",
            color: "#444",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

function RichEditor({ value, onChange }) {
  const editorRef = useRef(null);

  // Sync incoming value when switching posts
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function handleFormat(cmd) {
    editorRef.current.focus();
    if (cmd === "bold") document.execCommand("bold", false, null);
    else if (cmd === "italic") document.execCommand("italic", false, null);
    else if (cmd === "h2") document.execCommand("formatBlock", false, "H2");
    else if (cmd === "h3") document.execCommand("formatBlock", false, "H3");
    else if (cmd === "ul") document.execCommand("insertUnorderedList", false, null);
    else if (cmd === "ol") document.execCommand("insertOrderedList", false, null);
    else if (cmd === "blockquote") document.execCommand("formatBlock", false, "BLOCKQUOTE");
    else if (cmd === "link") {
      const url = prompt("Enter URL:");
      if (url) document.execCommand("createLink", false, url);
    }
    onChange(editorRef.current.innerHTML);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
      <Toolbar onFormat={handleFormat} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current.innerHTML)}
        style={{
          minHeight: 320,
          padding: "20px 24px",
          outline: "none",
          fontSize: "0.95rem",
          lineHeight: 1.75,
          color: "#333",
          fontFamily: "'DM Sans', sans-serif",
          background: "#fff",
        }}
      />
    </div>
  );
}

export default function AdminBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [view, setView] = useState("list"); // "list" | "editor"

  function showFeedback(msg, type = "success") {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  }

  async function fetchPosts() {
    setLoading(true);
    try {
      // Admin-only endpoint — returns drafts too. Never use the public
      // /blog/posts endpoint here, it deliberately omits unpublished posts.
      const res = await API.get("/blog/admin/posts");
      setPosts(res.data);
    } catch {
      showFeedback("Failed to load posts.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPosts(); }, []);

  function startNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setView("editor");
  }

  function startEdit(post) {
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      author_name: post.author_name || "",
      cover_image_url: post.cover_image_url || "",
      tag: post.tag || "",
      is_published: post.is_published || false,
    });
    setEditingId(post.id);
    setView("editor");
  }

  function handleTitleChange(e) {
    const title = e.target.value;
    setForm((f) => ({
      ...f,
      title,
      slug: editingId ? f.slug : slugify(title), // auto-slug only for new
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) return showFeedback("Title is required.", "error");
    if (!form.slug.trim()) return showFeedback("Slug is required.", "error");
    setSaving(true);
    try {
      if (editingId) {
        await API.put(`/blog/posts/${editingId}`, form);
      } else {
        await API.post("/blog/posts", form);
      }
      showFeedback(editingId ? "Post updated!" : "Post created!");
      await fetchPosts();
      setView("list");
    } catch (e) {
      showFeedback(e.response?.data?.detail || "Save failed.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await API.delete(`/blog/posts/${id}`);
      showFeedback("Post deleted.");
      await fetchPosts();
    } catch {
      showFeedback("Delete failed.", "error");
    } finally {
      setDeleting(null);
    }
  }

  async function handleTogglePublish(post) {
    try {
      await API.put(`/blog/posts/${post.id}`, { ...post, is_published: !post.is_published });
      showFeedback(post.is_published ? "Post unpublished." : "Post published!");
      await fetchPosts();
    } catch {
      showFeedback("Update failed.", "error");
    }
  }

  const s = {
    page: { fontFamily: "'DM Sans', sans-serif", background: '#f8faf9', minHeight: '100vh', padding: '2rem 1.5rem' },
    wrap: { maxWidth: 1100, margin: '0 auto', color: "#222" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    heading: { fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", margin: 0, color: "#111" },
    btnPrimary: {
      background: "var(--color-primary, #1a6b4a)", color: "#fff",
      border: "none", borderRadius: 8, padding: "9px 20px",
      fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    },
    btnGhost: {
      background: "transparent", color: "#555",
      border: "1.5px solid #ddd", borderRadius: 8, padding: "8px 18px",
      fontWeight: 500, fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    },
    btnDanger: {
      background: "transparent", color: "#c0392b",
      border: "1.5px solid #f5c6c2", borderRadius: 8, padding: "6px 14px",
      fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    th: { textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa", borderBottom: "2px solid #f0f0f0" },
    td: { padding: "14px", fontSize: 14, borderBottom: "1px solid #f5f5f5", verticalAlign: "middle" },
    badge: (pub) => ({
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: pub ? "#e8f5ee" : "#fdf3dc",
      color: pub ? "#1a6b4a" : "#b07a00",
    }),
    field: { marginBottom: 20 },
    label: { display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 },
    input: {
      width: "100%", padding: "10px 14px", border: "1px solid #ddd",
      borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
      color: "#222", background: "#fff", boxSizing: "border-box",
      outline: "none",
    },
    select: {
      width: "100%", padding: "10px 14px", border: "1px solid #ddd",
      borderRadius: 8, fontSize: 14, fontFamily: "'DM Sans', sans-serif",
      color: "#222", background: "#fff", boxSizing: "border-box",
    },
    twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    feedback: (type) => ({
      padding: "12px 18px", borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 20,
      background: type === "error" ? "#fdf2f2" : "#e8f5ee",
      color: type === "error" ? "#c0392b" : "#1a6b4a",
      border: `1px solid ${type === "error" ? "#f5c6c2" : "#b2dfcc"}`,
    }),
  };

  // ── List view ──
  if (view === "list") return (
    <div style={s.page}>
      <div style={s.wrap}>
        {feedback && <div style={s.feedback(feedback.type)}>{feedback.msg}</div>}
        <div style={s.topBar}>
          <h2 style={s.heading}>Blog Posts</h2>
          <button style={s.btnPrimary} onClick={startNew}>+ New Post</button>
        </div>

        {loading ? (
          <p style={{ color: "#aaa" }}>Loading…</p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
            <p style={{ fontSize: "2rem", marginBottom: 8 }}>✦</p>
            <p>No blog posts yet. Create your first one!</p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Title</th>
                  <th style={s.th}>Tag</th>
                  <th style={s.th}>Author</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, color: "#111", marginBottom: 2 }}>{post.title}</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>/blog/{post.slug}</div>
                    </td>
                    <td style={s.td}>
                      {post.tag ? <span style={{ ...s.badge(false), background: "#f5f5f5", color: "#666" }}>{post.tag}</span> : "—"}
                    </td>
                    <td style={{ ...s.td, color: "#666" }}>{post.author_name || "—"}</td>
                    <td style={s.td}>
                      <span style={s.badge(post.is_published)}>
                        {post.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td style={{ ...s.td, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={s.btnGhost} onClick={() => startEdit(post)}>Edit</button>
                        <button
                          style={{ ...s.btnGhost, color: post.is_published ? "#b07a00" : "#1a6b4a", borderColor: post.is_published ? "#f5e6c2" : "#b2dfcc" }}
                          onClick={() => handleTogglePublish(post)}
                        >
                          {post.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          style={s.btnDanger}
                          disabled={deleting === post.id}
                          onClick={() => handleDelete(post.id)}
                        >
                          {deleting === post.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── Editor view ──
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {feedback && <div style={s.feedback(feedback.type)}>{feedback.msg}</div>}
        <div style={s.topBar}>
          <h2 style={s.heading}>{editingId ? "Edit Post" : "New Post"}</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={s.btnGhost} onClick={() => setView("list")}>← Back</button>
            <button style={s.btnPrimary} disabled={saving} onClick={handleSave}>
              {saving ? "Saving…" : "Save Post"}
            </button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, padding: "32px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={s.field}>
            <label style={s.label}>Title *</label>
            <input style={s.input} value={form.title} onChange={handleTitleChange} placeholder="Enter post title…" />
          </div>

          <div style={s.twoCol}>
            <div style={s.field}>
              <label style={s.label}>Slug (URL) *</label>
              <input
                style={{ ...s.input, fontFamily: "monospace", fontSize: 13 }}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                placeholder="my-post-slug"
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Tag / Category</label>
              <select style={s.select} value={form.tag} onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}>
                <option value="">— None —</option>
                {TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={s.twoCol}>
            <div style={s.field}>
              <label style={s.label}>Author Name</label>
              <input style={s.input} value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} placeholder="e.g. John Doe" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Cover Image URL</label>
              <input style={s.input} value={form.cover_image_url} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Excerpt (shown on listing page)</label>
            <textarea
              style={{ ...s.input, minHeight: 72, resize: "vertical" }}
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              placeholder="A short summary of the post…"
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Content *</label>
            <RichEditor
              value={form.content}
              onChange={(html) => setForm((f) => ({ ...f, content: html }))}
            />
            <div style={{ fontSize: 12, color: "#bbb", marginTop: 6 }}>
              Supports bold, italic, headings, lists, blockquotes, and links.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0", borderTop: "1px solid #f0f0f0" }}>
            <input
              type="checkbox"
              id="pub-toggle"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: "#1a6b4a", cursor: "pointer" }}
            />
            <label htmlFor="pub-toggle" style={{ fontSize: 14, fontWeight: 600, color: "#333", cursor: "pointer" }}>
              Publish immediately
            </label>
            <span style={{ fontSize: 12, color: "#aaa" }}>(uncheck to save as draft)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
