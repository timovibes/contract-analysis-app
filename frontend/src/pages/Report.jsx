import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

function riskTier(score) {
  if (score >= 70) return "risk-high";
  if (score >= 40) return "risk-medium";
  return "risk-low";
}

function riskLabel(score) {
  if (score >= 70) return "High risk";
  if (score >= 40) return "Medium risk";
  return "Low risk";
}

const SECTIONS = [
  { id: "non-compete", label: "Non-compete", keywords: ["non-compete", "noncompete", "compete"] },
  { id: "dates", label: "Dates", keywords: ["date"] },
  { id: "liability", label: "Liability", keywords: ["liability"] },
  { id: "termination", label: "Termination", keywords: ["terminat"] },
  { id: "indemnification", label: "Indemnification", keywords: ["indemnif"] },
  { id: "governing-law", label: "Governing law", keywords: ["governing", "jurisdiction", "dispute"] },
  { id: "auto-renewal", label: "Auto-renewal", keywords: ["renew"] },
];

function isUnknownText(text) {
  if (!text) return false;
  const t = text.trim().toLowerCase();
  if (t === "unknown") return true;
  return /could not be determined|unreadable|could not be extracted|corrupt(ed)?|not readable|no readable|unable to (read|determine|extract)/.test(t);
}

function sectionTexts(id, analysis) {
  switch (id) {
    case "non-compete": return [analysis.non_compete?.details];
    case "dates": return [analysis.dates?.effective_date, analysis.dates?.expiration_date, analysis.dates?.renewal_terms];
    case "liability": return [analysis.liability?.details];
    case "termination": return [analysis.termination?.notice_period, analysis.termination?.for_cause, analysis.termination?.for_convenience];
    case "indemnification": return [analysis.indemnification?.who_indemnifies, analysis.indemnification?.scope];
    case "governing-law": return [analysis.governing_law?.jurisdiction, analysis.governing_law?.dispute_resolution];
    case "auto-renewal": return [analysis.auto_renewal?.details];
    default: return [];
  }
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

  const redFlags = analysis.red_flags || [];
  const sectionHasFlag = (keywords) =>
    redFlags.some((f) => keywords.some((k) => (f.clause || "").toLowerCase().includes(k)));
  const sectionIsUnknown = (id) => sectionTexts(id, analysis).some(isUnknownText);

  const allKeywords = SECTIONS.flatMap((s) => s.keywords);
  const unmatchedFlags = redFlags.filter(
    (f) => !allKeywords.some((k) => (f.clause || "").toLowerCase().includes(k))
  );

  const tier = riskTier(analysis.overall_risk_score);

  return (
    <div className="doc-card">
      <div className="report-header">
        <div className="report-header-top">
          <div>
            <p className="eyebrow">Version {analysis.version}</p>
            <h1>{analysis.filename}</h1>
          </div>
          {analysis.report_url && (
            <a href={analysis.report_url} className="btn btn-secondary">Download PDF</a>
          )}
        </div>

        <div className="risk-meter">
          <div className="risk-meter-track">
            <div
              className={`risk-meter-fill ${tier}`}
              style={{ width: `${analysis.overall_risk_score}%` }}
            />
          </div>
          <span className={`risk-meter-score ${tier}`}>
            {analysis.overall_risk_score}% — {riskLabel(analysis.overall_risk_score)}
          </span>
        </div>
      </div>

      <div className="report-layout">
        <nav className="report-nav">
          {SECTIONS.map((s) => {
            const flagged = sectionHasFlag(s.keywords);
            const unknown = !flagged && sectionIsUnknown(s.id);
            const dotState = flagged ? " has-flag" : unknown ? " unknown" : "";
            const title = flagged ? "Issue found" : unknown ? "Could not be determined" : "No issues found";
            return (
              <a key={s.id} href={`#${s.id}`} className="report-nav-item">
                <span className={`report-nav-dot${dotState}`} title={title} />
                {s.label}
              </a>
            );
          })}
          {unmatchedFlags.length > 0 && (
            <a href="#issues" className="report-nav-item">
              <span className="report-nav-dot has-flag" />
              Other ({unmatchedFlags.length})
            </a>
          )}
        </nav>

        <div>
          {redFlags.length > 0 && (
            <div className="issues-panel" id="issues">
              <h2>{redFlags.length} issue{redFlags.length > 1 ? "s" : ""} to review</h2>
              {redFlags.map((flag, i) => (
                <div key={i} className="issue-card">
                  <div>
                    <p className="issue-card-title">{flag.clause}</p>
                    <p className="issue-card-reason">{flag.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div id="non-compete" className="clause-group">
            <h2>Non-compete</h2>
            <dl>
              <div className="clause-row">
                <dt>Present</dt>
                <dd>{analysis.non_compete.present ? "Yes" : "No"}</dd>
              </div>
              <div className="clause-row">
                <dt>Details</dt>
                <dd className="clause-quote">{analysis.non_compete.details}</dd>
              </div>
            </dl>
          </div>

          <div id="dates" className="clause-group">
            <h2>Dates</h2>
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
                <dd className="clause-quote">{analysis.dates.renewal_terms}</dd>
              </div>
            </dl>
          </div>

          <div id="liability" className="clause-group">
            <h2>Liability</h2>
            <dl>
              <div className="clause-row">
                <dt>Cap present</dt>
                <dd>{analysis.liability.cap_present ? "Yes" : "No"}</dd>
              </div>
              <div className="clause-row">
                <dt>Details</dt>
                <dd className="clause-quote">{analysis.liability.details}</dd>
              </div>
            </dl>
          </div>

          <div id="termination" className="clause-group">
            <h2>Termination</h2>
            <dl>
              <div className="clause-row">
                <dt>Notice period</dt>
                <dd>{analysis.termination?.notice_period || "Not specified"}</dd>
              </div>
              <div className="clause-row">
                <dt>For cause</dt>
                <dd className="clause-quote">{analysis.termination?.for_cause || "Not specified"}</dd>
              </div>
              <div className="clause-row">
                <dt>For convenience</dt>
                <dd className="clause-quote">{analysis.termination?.for_convenience || "Not specified"}</dd>
              </div>
            </dl>
          </div>

          <div id="indemnification" className="clause-group">
            <h2>Indemnification</h2>
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
                <dd className="clause-quote">{analysis.indemnification?.scope || "Not specified"}</dd>
              </div>
            </dl>
          </div>

          <div id="governing-law" className="clause-group">
            <h2>Governing law</h2>
            <dl>
              <div className="clause-row">
                <dt>Jurisdiction</dt>
                <dd>{analysis.governing_law?.jurisdiction || "Not specified"}</dd>
              </div>
              <div className="clause-row">
                <dt>Dispute resolution</dt>
                <dd className="clause-quote">{analysis.governing_law?.dispute_resolution || "Not specified"}</dd>
              </div>
            </dl>
          </div>

          <div id="auto-renewal" className="clause-group">
            <h2>Auto-renewal</h2>
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
                <dd className="clause-quote">{analysis.auto_renewal?.details || "Not specified"}</dd>
              </div>
            </dl>
          </div>

          {error && <p className="error-text">{error}</p>}
          {rerunDone && <p className="save-confirmed">Re-run complete — showing latest results.</p>}

          <div className="report-actions">
            <button onClick={rerun} className="btn btn-secondary" disabled={rerunning}>
              {rerunning ? "Re-running…" : "Re-run analysis"}
            </button>
            <span className="version-field">Version {analysis.version}</span>
          </div>
        </div>
      </div>
    </div>
  );
}