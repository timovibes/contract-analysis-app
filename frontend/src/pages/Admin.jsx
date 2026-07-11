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
  if (!me) return <p>Loading...</p>;

  const handleDelete = async () => {
    if (!window.confirm(`Delete user ${userId}? This cannot be undone.`)) return;
    await api.delete(`/admin/users/${userId}`);
    alert("User deleted.");
    setUserId("");
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <input placeholder="Target user ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
      <button onClick={handleDelete}>Delete user</button>
    </div>
  );
}