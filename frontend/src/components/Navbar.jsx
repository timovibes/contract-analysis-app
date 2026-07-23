import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import api from "../api";

export default function Navbar() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    api.get("/me").then((res) => setRole(res.data.role)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to={role === "admin" ? "/admin" : "/dashboard"} className="navbar-brand">
        Contract analysis pro
      </Link>
      <div className="navbar-links">
        {role === "admin" ? (
          <Link to="/admin">Admin</Link>
        ) : (
          <>
            <Link to="/dashboard">Contracts</Link>
            <Link to="/profile">Profile</Link>
          </>
        )}
        <button onClick={handleLogout} className="navbar-logout">Log out</button>
      </div>
    </nav>
  );
}