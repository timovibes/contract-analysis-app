import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = [
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const statusTagClass = {
  pending: "status-tag status-tag-pending",
  processing: "status-tag status-tag-processing",
  completed: "status-tag status-tag-completed",
  failed: "status-tag status-tag-failed",
};

const bulkStatusTag = {
  invalid: "status-tag status-tag-failed",
  duplicate: "status-tag status-tag-duplicate",
  queued: "status-tag status-tag-pending",
  uploading: "status-tag status-tag-processing",
  processing: "status-tag status-tag-processing",
  completed: "status-tag status-tag-completed",
  failed: "status-tag status-tag-failed",
};

const bulkStatusLabel = {
  invalid: "Invalid",
  duplicate: "Duplicate — skipped",
  queued: "Queued",
  uploading: "Uploading",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

function validationError(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "Unsupported file type";
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Too large (max ${MAX_SIZE_MB}MB)`;
  }
  return null;
}

export default function Upload() {
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const isBulkBusy = bulkFiles.some((f) => f.status === "uploading" || f.status === "processing");

  const patchBulkRow = (id, patch) => {
    setBulkFiles((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const pollRowUntilDone = (id, contractId) => {
    const interval = setInterval(async () => {
      const { data } = await api.get(`/contracts/${contractId}`);
      if (data.status === "completed") {
        clearInterval(interval);
        patchBulkRow(id, { status: "completed" });
      } else if (data.status === "failed") {
        clearInterval(interval);
        patchBulkRow(id, { status: "failed", error: data.error_message || "Analysis failed" });
      }
    }, 3000);
  };

  const runBulkUpload = async (rows) => {
    for (const row of rows) {
      if (row.status !== "queued") continue;

      patchBulkRow(row.id, { status: "uploading", progress: 0 });

      const formData = new FormData();
      formData.append("filename", row.file.name);
      formData.append("file_url", row.file);

      try {
        const { data } = await api.post("/contracts", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) patchBulkRow(row.id, { progress: Math.round((e.loaded / e.total) * 100) });
          },
        });
        patchBulkRow(row.id, { status: "processing", contractId: data.id, progress: null });
        pollRowUntilDone(row.id, data.id);
      } catch (err) {
        patchBulkRow(row.id, {
          status: "failed",
          progress: null,
          error: err.response?.data?.detail || "Upload failed",
        });
      }
    }
  };

  const startBulk = async (files) => {
    setStatus("");
    const rows = files.map((file, i) => {
      const err = validationError(file);
      return {
        id: `${Date.now()}-${i}`,
        file,
        name: file.name,
        status: err ? "invalid" : "queued",
        error: err,
        progress: null,
        contractId: null,
      };
    });

    const { data: existing } = await api.get("/contracts");
    const existingNames = new Set(existing.map((c) => c.filename));
    const finalRows = rows.map((r) =>
      r.status === "queued" && existingNames.has(r.name)
        ? { ...r, status: "duplicate" }
        : r
    );

    setBulkFiles(finalRows);
    runBulkUpload(finalRows);
  };

  const validateAndHandle = async (file) => {
    if (!file) return;

    const err = validationError(file);
    if (err) {
      setStatus(err === "Unsupported file type"
        ? "Invalid file type. Upload a PDF, Word (.docx), or plain text file."
        : `File too large. Max size is ${MAX_SIZE_MB}MB.`);
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

  const handleFilesSelected = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setBulkFiles([]);
    if (files.length === 1) {
      validateAndHandle(files[0]);
    } else {
      startBulk(files);
    }
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
    if (isBulkBusy) return;
    handleFilesSelected(e.dataTransfer.files);
  };

  const doneCount = bulkFiles.filter((f) => f.status === "completed").length;
  const failedCount = bulkFiles.filter((f) => f.status === "failed" || f.status === "invalid").length;
  const skippedCount = bulkFiles.filter((f) => f.status === "duplicate").length;

  return (
    <div className="doc-card">
      <p className="eyebrow">Upload</p>
      <h1>Upload contract</h1>

      <div
        className={`dropzone${isDragging ? " dropzone-active" : ""}`}
        onClick={() => !isBulkBusy && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isBulkBusy) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={isBulkBusy ? { opacity: 0.6, pointerEvents: "none" } : undefined}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="dropzone-icon" style={{ margin: "0 auto" }}>
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p style={{ margin: "10px 0 0", fontWeight: 500 }}>Drag contracts here, or click to browse</p>
        <p className="dropzone-hint">PDF, Word (.docx), or plain text, up to {MAX_SIZE_MB}MB each — select multiple to bulk upload</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx"
          style={{ display: "none" }}
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
      </div>

      {uploadProgress !== null && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {status && <p className="upload-status">{status}</p>}

      {bulkFiles.length > 0 && (
        <>
          <div className="bulk-file-list">
            {bulkFiles.map((row) => (
              <div className="bulk-file-row" key={row.id}>
                <div className="bulk-file-row-top">
                  {row.status === "completed" && row.contractId ? (
                    <Link to={`/contracts/${row.contractId}`} className="bulk-file-name">{row.name}</Link>
                  ) : (
                    <span className="bulk-file-name">{row.name}</span>
                  )}
                  <span className={bulkStatusTag[row.status]}>{bulkStatusLabel[row.status]}</span>
                </div>
                {row.status === "uploading" && row.progress !== null && (
                  <div className="bulk-file-progress">
                    <div className="bulk-file-progress-fill" style={{ width: `${row.progress}%` }} />
                  </div>
                )}
                {row.error && <p className="bulk-file-error">{row.error}</p>}
              </div>
            ))}
          </div>
          {!isBulkBusy && (
            <p className="bulk-summary">
              {doneCount} completed · {skippedCount} duplicate{skippedCount === 1 ? "" : "s"} skipped · {failedCount} failed
            </p>
          )}
        </>
      )}

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