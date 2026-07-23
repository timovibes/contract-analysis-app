import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../api";

export default function ApprovalGate({ children }) {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let attempts = 0;

    const tryFetch = () => {
      api.get("/me")
        .then((res) => {
          setMe(res.data);
          setLoading(false);
        })
        .catch(() => {
          attempts += 1;
          if (attempts < 3) {
            setTimeout(tryFetch, 800); // retry, likely a token-timing race right after login
          } else {
            setFailed(true);
            setLoading(false);
          }
        });
    };

    tryFetch();
  }, []);

  if (loading) return <p className="upload-status">Loading…</p>;

  if (failed) return <Navigate to="/" replace />;

  if (me.status === "pending") return <Navigate to="/pending-approval" replace />;

  if (me.status === "rejected") return <Navigate to="/" replace />;

  return children;
}