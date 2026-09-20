import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["application/pdf", "text/plain"];

const statusTagClass = {
  pending: "status-tag status-tag-pending",
  processing: "status-tag status-tag-processing",
  completed: "status-tag status-tag-completed",
  failed: "status-tag status-tag-failed",
};

export default function Upload() {
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const validateAndHandle = async (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setStatus("Invalid file type. Upload a PDF or plain text file.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setStatus(`File too large. Max size is ${MAX_SIZE_MB}MB.`);
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
    setUploadProgress(0);
    const formData = new FormData();
    formData.append("filename", file.name);
    formData.append("file_url", file);

    const { data } = await api.post("/contracts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      },
    });

    setUploadProgress(null);
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndHandle(e.dataTransfer.files[0]);
  };

  return (
    <div className="doc-card">
      <p className="eyebrow">Upload</p>
      <h1>Upload contract</h1>

      <div
        className={`dropzone${isDragging ? " dropzone-active" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="dropzone-icon" style={{ margin: "0 auto" }}>
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ margin: "10px 0 0", fontWeight: 500 }}>Drag a contract here, or click to browse</p>
        <p className="dropzone-hint">PDF or plain text, up to {MAX_SIZE_MB}MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          style={{ display: "none" }}
          onChange={(e) => validateAndHandle(e.target.files[0])}
        />
      </div>

      {uploadProgress !== null && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {status && <p className="upload-status">{status}</p>}

      {duplicate && (
        <div className="modal-overlay">
          <div className="modal-card">
            <p style={{ marginBottom: 6 }}>
              You already have a contract named <strong>{duplicate.filename}</strong>
            </p>
            <span className={statusTagClass[duplicate.status]}>{duplicate.status}</span>

            <p style={{ marginTop: 18, color: "var(--muted)", fontSize: 13.5 }}>
              Rerun analysis on the existing contract, or upload this as a separate one.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ width: "auto" }} onClick={handleRerunExisting}>
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
        </div>
      )}
    </div>
  );
}