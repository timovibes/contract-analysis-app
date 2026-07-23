import { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/me").then((res) => {
      setMe(res.data);
    });
  }, []);

  if (!me) return <p className="upload-status">Loading…</p>;

  const memberSince = new Date(me.created_at).toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="doc-card">
      <p className="eyebrow">Account</p>
      <h1>{me.display_name || me.username}</h1>

      {error && <p className="error-text">{error}</p>}

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
    </div>
  );
}