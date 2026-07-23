import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function ApprovalGate({ children, adminOnly = false }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/me")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="upload-status">Loading…</p>;

  if (!me) return <Navigate to="/" replace />;

  if (me.status === "pending") return <Navigate to="/pending-approval" replace />;

  if (me.status === "rejected") return <Navigate to="/" replace />;

  // Route wants an admin, but this user isn't one
  if (adminOnly && me.role !== "admin") return <Navigate to="/dashboard" replace />;

  // Route is for regular users, but an admin is trying to view it
  if (!adminOnly && me.role === "admin") return <Navigate to="/admin" replace />;

  return children;
}