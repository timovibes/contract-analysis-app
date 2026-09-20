import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function Profile() {
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMe = () => {
    api.get("/me").then((res) => {
      setMe(res.data);
      setDisplayName(res.data.display_name || "");
      setTitle(res.data.title || "");
    });
  };

  useEffect(() => {
    loadMe();
    api.get("/analytics/summary").then((res) => setStats(res.data)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch("/me", { display_name: displayName, title });
      setMe(data);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!me) return <p className="upload-status">Loading…</p>;

  const memberSince = new Date(me.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });
  const nameForAvatar = me.display_name || me.username;

  return (
    <div>
      <div className="profile-hero">
        <div className="profile-avatar">{initials(nameForAvatar)}</div>
        <div>
          <p className="eyebrow">Account</p>
          <h1>{nameForAvatar}</h1>
          {me.title && <p className="profile-title-line">{me.title}</p>}
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="doc-card">
        {!editing ? (
          <>
            <dl>
              <div className="profile-row">
                <dt>Email</dt>
                <dd>{me.email}</dd>
              </div>
              <div className="profile-row">
                <dt>Role</dt>
                <dd><span className={`status-tag ${me.role === "admin" ? "status-tag-completed" : "status-tag-pending"}`}>{me.role}</span></dd>
              </div>
              <div className="profile-row">
                <dt>Title</dt>
                <dd>{me.title || <span className="profile-empty">Not set</span>}</dd>
              </div>
              <div className="profile-row">
                <dt>Member since</dt>
                <dd>{memberSince}</dd>
              </div>
              <div className="profile-row">
                <dt>Contracts analyzed</dt>
                <dd>{me.contracts_count}</dd>
              </div>
            </dl>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Edit profile</button>
          </>
        ) : (
          <form onSubmit={handleSave}>
            <div className="field">
              <label>Display name</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Title</label>
              <input
                type="text"
                placeholder="e.g. Contracts Manager"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="profile-edit-actions">
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: "auto" }}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setDisplayName(me.display_name || "");
                  setTitle(me.title || "");
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {stats && stats.total_analyzed > 0 && (
        <div className="doc-card">
          <h2>Your risk snapshot</h2>
          <div className="analytics-stat-row">
            <div className="analytics-stat-card">
              <p className="analytics-stat-label">Contracts analyzed</p>
              <p className="analytics-stat-value">{stats.total_analyzed}</p>
            </div>
            <div className="analytics-stat-card">
              <p className="analytics-stat-label">Average risk score</p>
              <p className="analytics-stat-value">{stats.average_risk_score}</p>
            </div>
          </div>
          <Link to="/analytics" className="profile-analytics-link">View full analytics →</Link>
        </div>
      )}
    </div>
  );
}