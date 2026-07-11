import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function Report() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [version, setVersion] = useState(null);

  const load = (v) => {
    const url = v ? `/contracts/${id}/analysis?version=${v}` : `/contracts/${id}/analysis`;
    api.get(url).then((res) => {
      setAnalysis(res.data);
      setVersion(res.data.version);
    });
  };

  useEffect(() => { load(); }, [id]);

  const rerun = async () => {
    await api.post("/contracts", {}); // re-triggers the same backend flow for this contract
    setTimeout(() => load(), 4000);
  };

  if (!analysis) return <p>Loading...</p>;

  return (
    <div>
      <h2>Analysis — v{analysis.version}</h2>
      <p>Risk score: {analysis.overall_risk_score}</p>
      <h3>Non-compete</h3>
      <pre>{JSON.stringify(analysis.non_compete, null, 2)}</pre>
      <h3>Dates</h3>
      <pre>{JSON.stringify(analysis.dates, null, 2)}</pre>
      <h3>Liability</h3>
      <pre>{JSON.stringify(analysis.liability, null, 2)}</pre>
      {analysis.report_url && <a href={analysis.report_url}>Download PDF</a>}
      <div>
        <button onClick={rerun}>Re-run analysis</button>
        <label>
          Version: <input type="number" value={version || ""} onChange={(e) => setVersion(e.target.value)} onBlur={() => load(version)} />
        </label>
      </div>
    </div>
  );
}