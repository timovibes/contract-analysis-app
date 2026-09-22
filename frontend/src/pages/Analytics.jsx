import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

function riskColor(score) {
  if (score >= 70) return "var(--risk-high)";
  if (score >= 40) return "var(--risk-med)";
  return "var(--risk-low)";
}

function riskLabel(score) {
  if (score >= 70) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Show every date when there aren't many points; thin them out otherwise
// so labels don't collide. Always keeps the first and last point labeled.
function shouldLabel(i, total) {
  if (total <= 6) return true;
  if (i === 0 || i === total - 1) return true;
  const step = Math.ceil(total / 5);
  return i % step === 0;
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get("/analytics/summary")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="upload-status">Loading…</p>;

  if (error) {
    return (
      <div className="doc-card">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary" onClick={load}>Retry</button>
      </div>
    );
  }

  if (!data || data.total_analyzed === 0) {
    return (
      <div className="doc-card">
        <p className="eyebrow">Analytics</p>
        <h1>Nothing to analyze yet</h1>
        <p className="upload-status">Upload a contract to start seeing risk trends and clause insights here.</p>
        <Link to="/upload" className="btn btn-primary" style={{ width: "auto", display: "inline-block" }}>
          Upload a contract
        </Link>
      </div>
    );
  }

  const { total_analyzed, average_risk_score, risk_distribution, clause_presence, risk_trend } = data;
  const distTotal = risk_distribution.low + risk_distribution.medium + risk_distribution.high || 1;

  const clauseLabels = {
    non_compete: "Non-compete",
    indemnification: "Indemnification",
    auto_renewal: "Auto-renewal",
    liability_cap: "Liability cap",
  };

  const w = 600;
  const h = 140;
  const yAxisWidth = 28;
  const points = risk_trend.map((r, i) => {
    const x = risk_trend.length > 1 ? (i / (risk_trend.length - 1)) * w : 0;
    const y = h - (r.risk_score / 100) * h;
    return { ...r, x, y };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const recent = [...risk_trend].reverse().slice(0, 5);

  return (
    <div>
      <p className="eyebrow">Analytics</p>
      <h1>Portfolio overview</h1>

      <div className="analytics-stat-row">
        <div className="analytics-stat-card">
          <p className="analytics-stat-label">Contracts analyzed</p>
          <p className="analytics-stat-value">{total_analyzed}</p>
        </div>
        <div className="analytics-stat-card">
          <p className="analytics-stat-label">Average risk score</p>
          <p className="analytics-stat-value" style={{ color: riskColor(average_risk_score) }}>
            {average_risk_score}
            <span className="analytics-stat-sub"> / 100 · {riskLabel(average_risk_score)}</span>
          </p>
        </div>
      </div>

      <div className="doc-card">
        <h2>Risk distribution</h2>
        {["low", "medium", "high"].map((tier) => (
          <div className="analytics-bar-row" key={tier}>
            <span className="analytics-bar-label">{tier}</span>
            <div className="analytics-bar-track">
              <div
                className="analytics-bar-fill"
                style={{
                  width: `${(risk_distribution[tier] / distTotal) * 100}%`,
                  background: riskColor(tier === "low" ? 0 : tier === "medium" ? 50 : 90),
                }}
              />
            </div>
            <span className="analytics-bar-count">{risk_distribution[tier]}</span>
          </div>
        ))}
      </div>

      <div className="doc-card">
        <h2>Clause presence</h2>
        {Object.entries(clause_presence).map(([key, pct]) => (
          <div className="analytics-bar-row" key={key}>
            <span className="analytics-bar-label">{clauseLabels[key] || key}</span>
            <div className="analytics-bar-track">
              <div className="analytics-bar-fill" style={{ width: `${pct}%`, background: "var(--ink)" }} />
            </div>
            <span className="analytics-bar-count">{pct}%</span>
          </div>
        ))}
      </div>

      <div className="doc-card">
        <h2>Risk trend</h2>
        {points.length > 1 ? (
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  width: yAxisWidth,
                  height: h,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                  flexShrink: 0,
                }}
              >
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>

              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="analytics-trend-svg"
                preserveAspectRatio="none"
                style={{ height: h, flex: 1, marginBottom: 0 }}
              >
                <line x1="0" y1="0" x2={w} y2="0" className="analytics-grid-line" />
                <line x1="0" y1={h / 2} x2={w} y2={h / 2} className="analytics-grid-line" />
                <line x1="0" y1={h} x2={w} y2={h} className="analytics-grid-line" />
                <polyline points={polylinePoints} fill="none" stroke="var(--ink)" strokeWidth="2" />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="3" fill={riskColor(p.risk_score)}>
                    <title>{`${p.contract_filename}: ${p.risk_score} — ${formatDate(p.date)}`}</title>
                  </circle>
                ))}
              </svg>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginLeft: yAxisWidth + 8,
                marginTop: 6,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--muted)",
              }}
            >
              {points.map((p, i) => (
                <span key={i}>{shouldLabel(i, points.length) ? formatDate(p.date) : ""}</span>
              ))}
            </div>
          </div>
        ) : (
          <p className="upload-status">Analyze at least two contracts to see a trend.</p>
        )}

        <ul className="analytics-recent-list">
          {recent.map((r, i) => (
            <li key={i}>
              <span>{r.contract_filename}</span>
              <span style={{ color: riskColor(r.risk_score) }}>{r.risk_score}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}