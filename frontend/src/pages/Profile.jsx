import { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [username, setUsername] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/me").then((res) => {
      setMe(res.data);
      setUsername(res.data.username);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    try {
      const { data } = await api.patch("/me", { username });
      setMe(data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message);
    }
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
      </dl>

      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSave}>
        <div className="field" style={{ marginTop: 20 }}>
          <label>Display name</label>
          <div className="profile-edit-row">
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setSaved(false); }}
            />
            <button type="submit" className="btn btn-secondary">Save</button>
          </div>
        </div>
      </form>

      {saved && <p className="save-confirmed">Saved.</p>}
    </div>
  );
}