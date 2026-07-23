import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["application/pdf", "text/plain"];

const stampClass = {
  pending: "stamp stamp-pending",
  processing: "stamp stamp-processing",
  completed: "stamp stamp-completed",
  failed: "stamp stamp-failed",
};

export default function Upload() {
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const navigate = useNavigate();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("Invalid file type.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus("File too large.");
      return;
    }

    setStatus("Checking for existing contract...");
    const { data: existing } = await api.get("/contracts");
    const match = existing.find((c) => c.filename === file.name);

    if (match) {
      setDuplicate(match);
      setPendingFile(file);
      setStatus("");
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("filename", file.name);
    formData.append("file_url", file);

    const { data } = await api.post("/contracts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    pollUntilDone(data.id);
  };

  const handleRerunExisting = async () => {
    setStatus("Reprocessing existing contract...");
    await api.post(`/contracts/${duplicate.id}/reprocess`);
    setDuplicate(null);
    pollUntilDone(duplicate.id);
  };

  const handleUploadAnyway = async () => {
    const file = pendingFile;
    setDuplicate(null);
    setPendingFile(null);
    await uploadFile(file);
  };

  const handleCancel = () => {
    setDuplicate(null);
    setPendingFile(null);
    navigate("/dashboard");
  };

  const pollUntilDone = (id) => {
    setStatus("Processing...");
    const interval = setInterval(async () => {
      const { data } = await api.get(`/contracts/${id}`);
      if (data.status === "completed" || data.status === "failed") {
        clearInterval(interval);
        navigate(`/contracts/${id}`);
      }
    }, 3000);
  };

  return (
    <div className="doc-card">
      <p className="eyebrow">Upload</p>
      <h1>Upload contract</h1>

      {duplicate ? (
        <div>
          <p style={{ marginBottom: 6 }}>
            You already have a contract named <strong>{duplicate.filename}</strong>
          </p>
          <span className={stampClass[duplicate.status]}>{duplicate.status}</span>

          <p style={{ marginTop: 18, color: "var(--color-muted)", fontSize: 13.5 }}>
            Rerun analysis on the existing contract, or upload this as a separate one.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleRerunExisting}>
              Rerun existing
            </button>
            <button className="btn btn-secondary" onClick={handleUploadAnyway}>
              Upload anyway
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="field">
            <label>Contract file</label>
            <input type="file" onChange={handleFile} />
          </div>
          {status && <p className="upload-status">{status}</p>}
        </>
      )}
    </div>
  );
}