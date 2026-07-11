import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = ["application/pdf", "text/plain"];

export default function Upload() {
  const [status, setStatus] = useState("");
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

    setStatus("Uploading...");
    const formData = new FormData();
    formData.append("filename", file.name);
    formData.append("file_url", file); // the actual file — Django saves it to disk

    const { data } = await api.post("/contracts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    pollUntilDone(data.id);
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
      <input type="file" onChange={handleFile} />
      <p>{status}</p>
    </div>
  );
}