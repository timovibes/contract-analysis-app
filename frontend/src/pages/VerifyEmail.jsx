import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import api from "../api";

export default function VerifyEmail() {
  const [resent, setResent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleResend = async () => {
    setError("");
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
      });
      setResent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleContinue = async () => {
    setError("");
    setChecking(true);
    try {
      await auth.currentUser.reload();

      if (!auth.currentUser.emailVerified) {
        setError("Still not verified — click the link in your email first, then try again.");
        setChecking(false);
        return;
      }

      const { data: me } = await api.get("/me");

      if (me.role === "admin") {
        navigate("/admin");
      } else if (me.status === "pending") {
        navigate("/pending-approval");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
      setChecking(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">Contract analysis pro</p>
        <h1>Verify your email</h1>
        <p className="empty-state">
          We sent a verification link to <strong>{auth.currentUser?.email}</strong>. Click it, then come
          back and press continue below.
        </p>
        {error && <p className="error-text">{error}</p>}
        {resent && <p className="upload-status">Verification email resent.</p>}
        <button onClick={handleContinue} className="btn btn-primary" disabled={checking}>
          {checking ? "Checking…" : "I've verified — continue"}
        </button>
        <button onClick={handleResend} className="btn btn-secondary" style={{ marginTop: 10 }}>
          Resend email
        </button>
      </div>
    </div>
  );
}