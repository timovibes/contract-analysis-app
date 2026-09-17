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
  const [rerunDone, setRerunDone] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    api.get(`/contracts/${id}/analysis`).then((res) => {
      setAnalysis(res.data);
    });
  };

  useEffect(() => { load(); }, [id]);

  const rerun = async () => {
    setError("");
    setRerunDone(false);
    setRerunning(true);
    await api.post(`/contracts/${id}/reprocess`);

    const interval = setInterval(async () => {
      const { data } = await api.get(`/contracts/${id}`);
      if (data.status === "completed") {
        clearInterval(interval);
        setRerunning(false);
        setRerunDone(true);
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
          <h1>Analysis report for {analysis.filename}</h1>
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

      <div className="clause-group">
        <p className="eyebrow">Termination</p>
        <dl>
          <div className="clause-row">
            <dt>Notice period</dt>
            <dd>{analysis.termination?.notice_period || "Not specified"}</dd>
          </div>
          <div className="clause-row">
            <dt>For cause</dt>
            <dd>{analysis.termination?.for_cause || "Not specified"}</dd>
          </div>
          <div className="clause-row">
            <dt>For convenience</dt>
            <dd>{analysis.termination?.for_convenience || "Not specified"}</dd>
          </div>
        </dl>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Indemnification</p>
        <dl>
          <div className="clause-row">
            <dt>Present</dt>
            <dd>{analysis.indemnification?.present ? "Yes" : "No"}</dd>
          </div>
          <div className="clause-row">
            <dt>Who indemnifies</dt>
            <dd>{analysis.indemnification?.who_indemnifies || "Not specified"}</dd>
          </div>
          <div className="clause-row">
            <dt>Scope</dt>
            <dd>{analysis.indemnification?.scope || "Not specified"}</dd>
          </div>
        </dl>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Governing law</p>
        <dl>
          <div className="clause-row">
            <dt>Jurisdiction</dt>
            <dd>{analysis.governing_law?.jurisdiction || "Not specified"}</dd>
          </div>
          <div className="clause-row">
            <dt>Dispute resolution</dt>
            <dd>{analysis.governing_law?.dispute_resolution || "Not specified"}</dd>
          </div>
        </dl>
      </div>

      <div className="clause-group">
        <p className="eyebrow">Auto-renewal</p>
        <dl>
          <div className="clause-row">
            <dt>Present</dt>
            <dd>{analysis.auto_renewal?.present ? "Yes" : "No"}</dd>
          </div>
          <div className="clause-row">
            <dt>Opt-out deadline</dt>
            <dd>{analysis.auto_renewal?.opt_out_deadline || "Not specified"}</dd>
          </div>
          <div className="clause-row">
            <dt>Details</dt>
            <dd>{analysis.auto_renewal?.details || "Not specified"}</dd>
          </div>
        </dl>
      </div>

      {analysis.red_flags && analysis.red_flags.length > 0 && (
        <div className="clause-group">
          <p className="eyebrow">Red flags</p>
          <ul>
            {analysis.red_flags.map((flag, i) => (
              <li key={i} className="clause-row">
                <strong>{flag.clause}</strong> — {flag.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {rerunDone && <p className="save-confirmed">Re-run complete — showing latest results.</p>}

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