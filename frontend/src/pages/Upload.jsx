import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["application/pdf", "text/plain"];

export default function Upload() {
  const [status, setStatus] = useState("");
  const [duplicate, setDuplicate] = useState(null); // holds existing contract if a name match is found
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
    <div>
      <h2>Upload Contract</h2>

      {duplicate ? (
        <div className="doc-card">
          <p>
            You already uploaded a contract named <strong>{duplicate.filename}</strong> (status: {duplicate.status}).
          </p>
          <p>Rerun analysis on the existing one instead of uploading a duplicate?</p>
          <button className="btn btn-primary" onClick={handleRerunExisting}>
            Rerun existing
          </button>
          <button className="btn btn-secondary" onClick={handleUploadAnyway}>
            Upload as new anyway
          </button>
        </div>
      ) : (
        <input type="file" onChange={handleFile} />
      )}

      <p>{status}</p>
    </div>
  );
}