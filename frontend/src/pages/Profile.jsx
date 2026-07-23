import { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/me").then((res) => {
      setMe(res.data);
      setDisplayName(res.data.display_name || res.data.username);
    });
  }, []);

  const handleSave = async () => {
    setError("");
    setSaved(false);
    try {
      const { data } = await api.patch("/me", { display_name: displayName });
      setMe(data);
      setIsEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
    }
  };

  const handleCancel = () => {
    setDisplayName(me.display_name || me.username);
    setIsEditing(false);
  };

  if (!me) return <p className="upload-status">Loading…</p>;

  const memberSince = new Date(me.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="doc-card">
      <p className="eyebrow">Account</p>
      <h1>Your profile</h1>

      <dl>
        <div className="profile-row">
          <dt>Email</dt>
          <dd>{me.email}</dd>
        </div>
        <div className="profile-row">
          <dt>Role</dt>
          <dd><span className={`stamp stamp-${me.role === "admin" ? "completed" : "pending"}`}>{me.role}</span></dd>
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

      {error && <p className="error-text">{error}</p>}

      <div className="field" style={{ marginTop: 20 }}>
        <label>Display name</label>
        {!isEditing ? (
          <div className="profile-edit-row">
            <span>{displayName}</span>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(true)}>
              Edit
            </button>
          </div>
        ) : (
          <div className="profile-edit-row">
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
              autoFocus
            />
            <button type="button" className="btn btn-secondary" onClick={handleSave}>Save</button>
            <button type="button" className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
          </div>
        )}
      </div>

      {saved && <p className="save-confirmed">Saved.</p>}
    </div>
  );
}