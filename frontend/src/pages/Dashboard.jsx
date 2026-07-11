import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

const badgeColor = { pending: "gray", processing: "orange", completed: "green", failed: "red" };

export default function Dashboard() {
  const [contracts, setContracts] = useState([]);

  useEffect(() => {
    api.get("/contracts").then((res) => setContracts(res.data));
  }, []);

  return (
    <div>
      <h2>Your Contracts</h2>
      <Link to="/upload">Upload a contract</Link>
      <ul>
        {contracts.map((c) => (
          <li key={c.id}>
            <Link to={`/contracts/${c.id}`}>{c.filename}</Link>{" "}
            <span style={{ color: badgeColor[c.status] }}>[{c.status}]</span>
          </li>
        ))}
      </ul>
    </div>
  );
}