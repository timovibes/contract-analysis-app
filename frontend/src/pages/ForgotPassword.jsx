import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendPasswordResetEmail(auth, email);
    setSent(true); // Firebase hosts the actual reset page — nothing else to build here
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Password</h2>
      {sent ? (
        <p>Check your email for a reset link.</p>
      ) : (
        <>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit">Send reset email</button>
        </>
      )}
    </form>
  );
}