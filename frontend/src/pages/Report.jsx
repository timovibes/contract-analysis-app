import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

function riskTier(score) {
  if (score >= 70) return "risk-high";
  if (score >= 40) return "risk-medium";
  return "risk-low";
}

export default function Report() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [rerunning, setRerunning] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/contracts/${id}/analysis`).then((res) => {
      setAnalysis(res.data);
    });
  };

  useEffect(() => { load(); }, [id]);

  const rerun = async () => {
    setError("");
    setRerunning(true);
    await api.post(`/contracts/${id}/reprocess`);

    const interval = setInterval(async () => {
      const { data } = await api.get(`/contracts/${id}`);
      if (data.status === "completed") {
        clearInterval(interval);
        setRerunning(false);
        load();
      } else if (data.status === "failed") {
        clearInterval(interval);
        setRerunning(false);
        setError("Re-run failed: " + (data.error_message || "unknown error"));
      }
    }, 3000);
  };

  if (!analysis) return <p className="upload-status">Loading…</p>;

  return (
    <div className="doc-card">
      <div className="report-header">
        <div>
          <p className="eyebrow">Version {analysis.version}</p>
          <h1>Analysis report</h1>
        </div>
        <div className={`risk-badge ${riskTier(analysis.overall_risk_score)}`}>
          <span className="risk-number">{analysis.overall_risk_score + "%"}</span>
          <span className="risk-label">Risk</span>
        </div>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Non-compete</p>
        <dl>
          <div className="clause-row">
            <dt>Present</dt>
            <dd>{analysis.non_compete.present ? "Yes" : "No"}</dd>
          </div>
          <div className="clause-row">
            <dt>Details</dt>
            <dd>{analysis.non_compete.details}</dd>
          </div>
        </dl>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Dates</p>
        <dl>
          <div className="clause-row">
            <dt>Effective</dt>
            <dd>{analysis.dates.effective_date}</dd>
          </div>
          <div className="clause-row">
            <dt>Expiration</dt>
            <dd>{analysis.dates.expiration_date}</dd>
          </div>
          <div className="clause-row">
            <dt>Renewal</dt>
            <dd>{analysis.dates.renewal_terms}</dd>
          </div>
        </dl>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Liability</p>
        <dl>
          <div className="clause-row">
            <dt>Cap present</dt>
            <dd>{analysis.liability.cap_present ? "Yes" : "No"}</dd>
          </div>
          <div className="clause-row">
            <dt>Details</dt>
            <dd>{analysis.liability.details}</dd>
          </div>
        </dl>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="report-actions">
        {analysis.report_url && (
          <a href={analysis.report_url} className="btn btn-secondary">Download PDF</a>
        )}
        <button onClick={rerun} className="btn btn-secondary" disabled={rerunning}>
          {rerunning ? "Re-running…" : "Re-run analysis"}
        </button>
        <span className="version-field">Version {analysis.version}</span>
      </div>
    </div>
  );
}