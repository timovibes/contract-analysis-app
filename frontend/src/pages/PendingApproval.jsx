export default function PendingApproval() {
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <p className="eyebrow">Account status</p>
        <h1>Awaiting approval</h1>
        <p style={{ color: "var(--color-muted)", fontSize: 14 }}>
          Your account has been created and your email is verified. An admin needs to approve
          your access before you can use the app. Check back soon.
        </p>
      </div>
    </div>
  );
}