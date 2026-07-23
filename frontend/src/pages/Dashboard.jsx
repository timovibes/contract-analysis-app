import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const stampClass = {
  pending: "stamp stamp-pending",
  processing: "stamp stamp-processing",
  completed: "stamp stamp-completed",
  failed: "stamp stamp-failed",
};

export default function Dashboard() {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    api.get("/contracts").then((res) => setContracts(res.data));
  }, []);

  const formatDateTime = (value) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  return (
    <div>
      <div className="dashboard-header">
        <h1>Your contracts</h1>
        <Link to="/upload" className="btn btn-secondary">Upload contract</Link>
      </div>

      {contracts.length === 0 ? (
        <div className="contract-list">
          <p className="empty-state">No contracts yet. Upload one to get started.</p>
        </div>
      ) : (
        <ul className="contract-list">
          {contracts.map((c) => (
            <li key={c.id} className="contract-row">
              <Link to={`/contracts/${c.id}`}>{c.filename}</Link>
              <div className="contract-meta">
                {(c.status === "completed" || c.status === "failed") && (
                  <span className="contract-timestamp">{formatDateTime(c.updated_at)}</span>
                )}
                <span className={stampClass[c.status]}>{c.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}