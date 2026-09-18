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
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.get("/contracts").then((res) => setContracts(res.data));
  }, []);

  const formatDateTime = (value) =>
    new Date(value).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const handleDelete = async (id, filename) => {
    if (!window.confirm(`Delete "${filename}"? This can't be undone.`)) return;

    setDeletingId(id);
    try {
      await api.delete(`/contracts/${id}`);
      setContracts((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Couldn't delete this contract. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

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
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={deletingId === c.id}
                  onClick={() => handleDelete(c.id, c.filename)}
                  aria-label={`Delete ${c.filename}`}
                >
                  {deletingId === c.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}