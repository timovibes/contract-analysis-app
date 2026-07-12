import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function Admin() {
  const [me, setMe] = useState(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    api.get("/me").then((res) => setMe(res.data));
  }, []);

  if (me && me.role !== "admin") return <Navigate to="/dashboard" />;
  if (!me) return <p className="upload-status">Loading…</p>;

  const handleDelete = async () => {
    if (!window.confirm(`Delete user ${userId}? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${userId}`);
    alert("User deleted.");
    setUserId("");
  };

  return (
    <div className="doc-card">
      <p className="eyebrow">Admin</p>
      <h1>User management</h1>
      <p className="admin-warning">Deleting a user permanently removes their contracts, analyses, and reports.</p>
      <div className="field">
        <label>Target user ID</label>
        <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} />
      </div>
      <button onClick={handleDelete} className="btn btn-danger">Delete user</button>
    </div>
  );
}