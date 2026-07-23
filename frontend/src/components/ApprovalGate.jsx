import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function ApprovalGate({ children }) {
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

  return children;
}