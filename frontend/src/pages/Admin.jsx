import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function Admin() {
  const [me, setMe] = useState(null);
  const [userId, setUserId] = useState("");
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersLoading, setAllUsersLoading] = useState(true);

  useEffect(() => {
    api.get("/me").then((res) => setMe(res.data));
  }, []);

  useEffect(() => {
    if (me && me.role === "admin") {
      loadPending();
      loadAllUsers();
    }
  }, [me]);

  const loadPending = async () => {
    setPendingLoading(true);
    const { data } = await api.get("/admin/users/pending");
    setPending(data);
    setPendingLoading(false);
  };

  const loadAllUsers = async () => {
    setAllUsersLoading(true);
    const { data } = await api.get("/admin/users");
    setAllUsers(data);
    setAllUsersLoading(false);
  };

  const handleApprove = async (id) => {
    await api.post(`/admin/users/${id}/approve`);
    setPending((prev) => prev.filter((u) => u.id !== id));
    loadAllUsers();
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this user? They will not be able to access the app.")) return;
    await api.post(`/admin/users/${id}/reject`);
    setPending((prev) => prev.filter((u) => u.id !== id));
    loadAllUsers();
  };

  if (me && me.role !== "admin") return <Navigate to="/dashboard" />;
  if (!me) return <p className="upload-status">Loading…</p>;

  const handleDelete = async (id) => {
    const targetId = id ?? userId;
    if (!targetId) return;
    if (!window.confirm(`Delete user ${targetId}? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${targetId}`);
    alert("User deleted.");
    setUserId("");
    loadAllUsers();
  };

  return (
    <div className="doc-card">
      <p className="eyebrow">Admin</p>
      <h1>User management</h1>

      <h2 style={{ marginTop: 24 }}>Pending approvals</h2>
      {pendingLoading ? (
        <p className="upload-status">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="empty-state">No users awaiting approval.</p>
      ) : (
        <ul className="contract-list" style={{ marginBottom: 24 }}>
          {pending.map((u) => (
            <li key={u.id} className="contract-row">
              <div>
                <div style={{ fontWeight: 500 }}>{u.display_name || u.username}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{u.email} · ID {u.id}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => handleApprove(u.id)} className="btn btn-primary">Approve</button>
                <button onClick={() => handleReject(u.id)} className="btn btn-danger">Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: 24 }}>All users</h2>
      {allUsersLoading ? (
        <p className="upload-status">Loading…</p>
      ) : allUsers.length === 0 ? (
        <p className="empty-state">No users found.</p>
      ) : (
        <ul className="contract-list" style={{ marginBottom: 24 }}>
          {allUsers.map((u) => (
            <li key={u.id} className="contract-row">
              <div>
                <div style={{ fontWeight: 500 }}>
                  {u.display_name || u.username} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· ID {u.id}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {u.email} · {u.role} · {u.status}
                </div>
              </div>
              <button onClick={() => handleDelete(u.id)} className="btn btn-danger">Delete</button>
            </li>
          ))}
        </ul>
      )}

      <h2>Delete user</h2>
      <p className="admin-warning">Deleting a user permanently removes their contracts, analyses, and reports.</p>
      <div className="field">
        <label>Target user ID</label>
        <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} />
      </div>
      <button onClick={() => handleDelete()} className="btn btn-danger">Delete user</button>
    </div>
  );
}