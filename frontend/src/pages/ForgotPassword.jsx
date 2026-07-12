import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendPasswordResetEmail(auth, email);
    setSent(true);
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Contract analysis pro</p>
        <h1>Reset password</h1>
        {sent ? (
          <p>Check your email for a reset link.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary">Send reset email</button>
          </form>
        )}
        <p className="auth-links">
          <Link to="/">Back to log in</Link>
        </p>
      </div>
    </div>
  );
}