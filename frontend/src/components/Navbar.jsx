import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">Contract analysis pro</Link>
      <div className="navbar-links">
        <Link to="/dashboard">Contracts</Link>
        <Link to="/profile">Profile</Link>
        <button onClick={handleLogout} className="navbar-logout">Log out</button>
      </div>
    </nav>
  );
}