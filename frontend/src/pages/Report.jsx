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
  const [version, setVersion] = useState("");

  const load = (v) => {
    const url = v ? `/contracts/${id}/analysis?version=${v}` : `/contracts/${id}/analysis`;
    api.get(url).then((res) => {
      setAnalysis(res.data);
      setVersion(String(res.data.version));
    });
  };

  useEffect(() => { load(); }, [id]);

  const rerun = async () => {
    await api.post("/contracts", {});
    setTimeout(() => load(), 4000);
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

      <div className="report-actions">
        {analysis.report_url && (
          <a href={analysis.report_url} className="btn btn-secondary">Download PDF</a>
        )}
        <button onClick={rerun} className="btn btn-secondary">Re-run analysis</button>
        <label className="version-field">
          Version
          <input
            type="number"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            onBlur={() => load(version)}
          />
        </label>
      </div>
    </div>
  );
}